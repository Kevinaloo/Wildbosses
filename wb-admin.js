/* ═══════════════════════════════════════════════════════════════════
   WILDBOSSES · ADMIN
   ─────────────────────────────────────────────────────────────────
   Real Supabase Auth. Signing in is not enough on its own — the row
   level security also checks the admins table, so an account that
   isn't on the roster can sign in here and still change nothing.
   That check is enforced in the database, not in this file; the UI
   only mirrors it so the client gets a clear message instead of a
   silent failure.
   ═══════════════════════════════════════════════════════════════════ */
(function (W, D) {
  'use strict';

  var sb = null, ME = null;

  function $(id) { return D.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c];
    });
  }
  function toast(msg, bad) {
    var t = $('toast');
    t.textContent = msg;
    t.className = 'adm-toast show' + (bad ? ' bad' : '');
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { t.className = 'adm-toast'; }, 3400);
  }
  function money(n) { return n ? Number(n).toLocaleString('en-KE') : '0'; }
  function dateOnly(v) { return v ? String(v).slice(0, 10) : ''; }

  /* ── auth ─────────────────────────────────────────────── */
  function boot() {
    sb = W.WB.client();
    if (!sb) { toast('Could not reach the database', true); return; }

    sb.auth.getSession().then(function (r) {
      if (r.data && r.data.session) enter(r.data.session);
    });

    $('loginForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = $('loginBtn'); btn.disabled = true; btn.textContent = 'Signing in…';
      $('loginMsg').textContent = '';
      sb.auth.signInWithPassword({
        email: $('email').value.trim(),
        password: $('password').value
      }).then(function (r) {
        btn.disabled = false; btn.textContent = 'Sign in';
        if (r.error) { $('loginMsg').textContent = r.error.message; return; }
        enter(r.data.session);
      });
    });

    $('signOut').addEventListener('click', function () {
      sb.auth.signOut().then(function () { location.reload(); });
    });

    $('tabs').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-tab]'); if (!b) return;
      Array.prototype.forEach.call($('tabs').children, function (x) { x.classList.remove('on'); });
      b.classList.add('on');
      Array.prototype.forEach.call(D.querySelectorAll('.adm-pane'), function (p) {
        p.classList.toggle('on', p.dataset.pane === b.dataset.tab);
      });
    });

    $('addRail').addEventListener('click', function () { railEditor(null); });
    $('addTour').addEventListener('click', function () { tourEditor(null); });
    $('modal').addEventListener('click', function (e) {
      if (e.target === $('modal')) closeModal();
    });
  }

  function enter(session) {
    ME = session.user;
    // confirm the roster, so an off-roster account gets told why
    sb.rpc('is_admin').then(function (r) {
      if (r.error || r.data !== true) {
        $('loginMsg').textContent =
          'This account is signed in but is not on the admin roster.';
        sb.auth.signOut();
        return;
      }
      $('gate').hidden = true;
      $('app').hidden = false;
      $('who').textContent = ME.email;
      loadRail(); loadTours(); loadBookings(); loadBrand();
    });
  }

  /* ── modal ────────────────────────────────────────────── */
  function openModal(html) { $('modalBox').innerHTML = html; $('modal').hidden = false; }
  function closeModal() { $('modal').hidden = true; $('modalBox').innerHTML = ''; }
  W.admClose = closeModal;

  function field(label, name, val, type, hint) {
    return '<label>' + esc(label) +
      (hint ? '<em>' + esc(hint) + '</em>' : '') +
      '<input name="' + name + '" type="' + (type || 'text') +
      '" value="' + esc(val == null ? '' : val) + '"/></label>';
  }

  /* ── hero videos ──────────────────────────────────────── */
  function loadRail() {
    sb.from('hero_videos').select('*').order('sort_order').then(function (r) {
      var rows = r.data || [];
      var el = $('railList');
      if (!rows.length) {
        el.innerHTML = '<div class="adm-empty">No hero cards yet. Add one to fill the homepage rail.</div>';
        return;
      }
      el.innerHTML = rows.map(function (v) {
        var film = v.video_url && v.video_url.trim();
        return '<div class="adm-card adm-row">' +
          '<div class="adm-thumb"' + (v.poster_url ? ' style="background-image:url(' + esc(v.poster_url) + ')"' : '') + '></div>' +
          '<div class="adm-row-main">' +
            '<b>' + esc(v.title) + '</b>' +
            '<span>' + esc(v.subtitle || '—') + '</span>' +
            '<span class="adm-pill' + (film ? ' ok' : '') + '">' +
              (film ? 'Video uploaded' : 'Poster only — no video yet') + '</span>' +
            (v.active ? '' : '<span class="adm-pill">Hidden</span>') +
          '</div>' +
          '<div class="adm-row-act">' +
            '<button class="adm-btn adm-btn-ghost" data-edit-rail="' + v.id + '">Edit</button>' +
            '<button class="adm-btn adm-btn-bad" data-del-rail="' + v.id + '">Delete</button>' +
          '</div></div>';
      }).join('');
      el.querySelectorAll('[data-edit-rail]').forEach(function (b) {
        b.onclick = function () {
          railEditor(rows.filter(function (x) { return x.id === b.dataset.editRail; })[0]);
        };
      });
      el.querySelectorAll('[data-del-rail]').forEach(function (b) {
        b.onclick = function () {
          if (!confirm('Delete this hero card?')) return;
          sb.from('hero_videos').delete().eq('id', b.dataset.delRail).then(function (r) {
            if (r.error) return toast(r.error.message, true);
            toast('Hero card deleted'); loadRail();
          });
        };
      });
    });
  }

  function railEditor(v) {
    v = v || {};
    sb.from('tours').select('id,name,slug').order('name').then(function (r) {
      var tours = r.data || [];
      var opts = '<option value="">— not linked —</option>' + tours.map(function (t) {
        return '<option value="' + t.id + '"' + (v.tour_id === t.id ? ' selected' : '') + '>' +
          esc(t.name) + '</option>';
      }).join('');

      openModal(
        '<h3>' + (v.id ? 'Edit hero card' : 'New hero card') + '</h3>' +
        '<form id="railForm" class="adm-form">' +
          field('Title', 'title', v.title, 'text', 'Shown big on the card, e.g. MAASAI MARA') +
          field('Subtitle', 'subtitle', v.subtitle, 'text', 'One short line under the title') +
          '<label>Linked tour<em>The countdown uses this tour\u2019s departure date</em>' +
            '<select name="tour_id">' + opts + '</select></label>' +
          '<label>Video<em>MP4 or WebM. Leave empty and the poster drifts instead.</em>' +
            '<input type="file" id="vidFile" accept="video/mp4,video/webm,video/quicktime"/></label>' +
          field('Video URL', 'video_url', v.video_url, 'text', 'Filled automatically after upload') +
          '<label>Poster image<em>Shown while the video loads, and when there is no video</em>' +
            '<input type="file" id="posFile" accept="image/*"/></label>' +
          field('Poster URL', 'poster_url', v.poster_url, 'text') +
          field('Order', 'sort_order', v.sort_order == null ? 0 : v.sort_order, 'number') +
          '<label class="adm-check"><input type="checkbox" name="active"' +
            (v.active === false ? '' : ' checked') + '/> Show on the homepage</label>' +
          '<div class="adm-modal-act">' +
            '<button type="button" class="adm-btn adm-btn-ghost" onclick="admClose()">Cancel</button>' +
            '<button class="adm-btn adm-btn-go" type="submit">Save</button>' +
          '</div>' +
          '<p class="adm-up" id="upMsg"></p>' +
        '</form>'
      );

      wireUpload('vidFile', 'hero-videos', 'video_url');
      wireUpload('posFile', 'tour-photos', 'poster_url');

      $('railForm').addEventListener('submit', function (e) {
        e.preventDefault();
        var f = e.target;
        var row = {
          title: f.title.value.trim(),
          subtitle: f.subtitle.value.trim() || null,
          tour_id: f.tour_id.value || null,
          video_url: f.video_url.value.trim(),
          poster_url: f.poster_url.value.trim() || null,
          sort_order: parseInt(f.sort_order.value, 10) || 0,
          active: f.active.checked
        };
        if (!row.title) return toast('A title is needed', true);
        var q = v.id
          ? sb.from('hero_videos').update(row).eq('id', v.id)
          : sb.from('hero_videos').insert(row);
        q.then(function (r) {
          if (r.error) return toast(r.error.message, true);
          toast('Hero card saved'); closeModal(); loadRail();
        });
      });
    });
  }

  /* ── uploads ──────────────────────────────────────────── */
  function wireUpload(inputId, bucket, targetName) {
    var input = $(inputId); if (!input) return;
    input.addEventListener('change', function () {
      var file = input.files && input.files[0]; if (!file) return;
      var msg = $('upMsg');
      msg.textContent = 'Uploading ' + file.name + '…';
      var path = Date.now() + '-' + file.name.replace(/[^\w.\-]/g, '_');
      sb.storage.from(bucket).upload(path, file, { cacheControl: '31536000', upsert: false })
        .then(function (r) {
          if (r.error) { msg.textContent = 'Upload failed: ' + r.error.message; return; }
          var url = sb.storage.from(bucket).getPublicUrl(path).data.publicUrl;
          var field = D.querySelector('[name="' + targetName + '"]');
          if (field) field.value = url;
          msg.textContent = 'Uploaded. Press Save to publish it.';
        });
    });
  }

  /* ── tours ────────────────────────────────────────────── */
  function loadTours() {
    sb.from('tours').select('*').order('departure_date').then(function (r) {
      var rows = r.data || [], el = $('tourList');
      if (!rows.length) {
        el.innerHTML = '<div class="adm-empty">No tours yet. Add one and it appears on the site immediately.</div>';
        return;
      }
      el.innerHTML = rows.map(function (t) {
        return '<div class="adm-card adm-row">' +
          '<div class="adm-thumb"' + (t.image ? ' style="background-image:url(' + esc(t.image) + ')"' : '') + '></div>' +
          '<div class="adm-row-main">' +
            '<b>' + esc(t.name) + '</b>' +
            '<span>' + esc(t.destination || '') + ' · ' + esc(dateOnly(t.departure_date) || 'no date') + '</span>' +
            '<span class="adm-pill' + (t.status === 'open' ? ' ok' : '') + '">' + esc(t.status) + '</span>' +
            '<span class="adm-pill">KES ' + money(t.price_kes) + '</span>' +
            '<span class="adm-pill">' + t.spots_left + '/' + t.spots_total + ' left</span>' +
          '</div>' +
          '<div class="adm-row-act">' +
            '<button class="adm-btn adm-btn-ghost" data-edit-tour="' + t.id + '">Edit</button>' +
            '<button class="adm-btn adm-btn-bad" data-del-tour="' + t.id + '">Delete</button>' +
          '</div></div>';
      }).join('');
      el.querySelectorAll('[data-edit-tour]').forEach(function (b) {
        b.onclick = function () {
          tourEditor(rows.filter(function (x) { return x.id === b.dataset.editTour; })[0]);
        };
      });
      el.querySelectorAll('[data-del-tour]').forEach(function (b) {
        b.onclick = function () {
          if (!confirm('Delete this tour? Bookings against it will block the delete.')) return;
          sb.from('tours').delete().eq('id', b.dataset.delTour).then(function (r) {
            if (r.error) return toast(r.error.message, true);
            toast('Tour deleted'); loadTours();
          });
        };
      });
    });
  }

  function tourEditor(t) {
    t = t || {};
    var stat = ['draft','open','full','closed','cancelled'].map(function (s) {
      return '<option' + (t.status === s ? ' selected' : '') + '>' + s + '</option>';
    }).join('');
    var cat = ['safari','walking','culture','adventure','beach','birding','photo','night'].map(function (c) {
      return '<option' + (t.category === c ? ' selected' : '') + '>' + c + '</option>';
    }).join('');

    openModal(
      '<h3>' + (t.id ? 'Edit tour' : 'New tour') + '</h3>' +
      '<form id="tourForm" class="adm-form">' +
        field('Name', 'name', t.name) +
        field('Web address', 'slug', t.slug, 'text', 'Lowercase with hyphens, e.g. maasai-mara-migration') +
        field('Subtitle', 'subtitle', t.subtitle) +
        '<label>Description<textarea name="description" rows="4">' + esc(t.description || '') + '</textarea></label>' +
        field('Destination', 'destination', t.destination) +
        field('Duration', 'duration', t.duration, 'text', 'e.g. 7 days · 6 nights') +
        '<label>Category<select name="category">' + cat + '</select></label>' +
        field('Price (KES)', 'price_kes', t.price_kes == null ? 0 : t.price_kes, 'number', '0 means pay what you want') +
        field('Places total', 'spots_total', t.spots_total == null ? 8 : t.spots_total, 'number') +
        field('Places left', 'spots_left', t.spots_left == null ? 8 : t.spots_left, 'number') +
        field('Departure date', 'departure_date', dateOnly(t.departure_date), 'date') +
        field('Return date', 'return_date', dateOnly(t.return_date), 'date') +
        '<label>Status<em>Only "open" and "full" are visible on the site</em>' +
          '<select name="status">' + stat + '</select></label>' +
        '<label>Photo<input type="file" id="tourImg" accept="image/*"/></label>' +
        field('Photo URL', 'image', t.image) +
        '<label class="adm-check"><input type="checkbox" name="featured"' +
          (t.featured ? ' checked' : '') + '/> Feature this trip</label>' +
        '<div class="adm-modal-act">' +
          '<button type="button" class="adm-btn adm-btn-ghost" onclick="admClose()">Cancel</button>' +
          '<button class="adm-btn adm-btn-go" type="submit">Save</button>' +
        '</div><p class="adm-up" id="upMsg"></p>' +
      '</form>'
    );
    wireUpload('tourImg', 'tour-photos', 'image');

    $('tourForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var f = e.target;
      var row = {
        name: f.name.value.trim(),
        slug: f.slug.value.trim().toLowerCase().replace(/[^a-z0-9\-]/g, '-'),
        subtitle: f.subtitle.value.trim() || null,
        description: f.description.value.trim() || null,
        destination: f.destination.value.trim(),
        duration: f.duration.value.trim() || null,
        category: f.category.value,
        price_kes: parseInt(f.price_kes.value, 10) || 0,
        spots_total: parseInt(f.spots_total.value, 10) || 0,
        spots_left: parseInt(f.spots_left.value, 10) || 0,
        departure_date: f.departure_date.value || null,
        return_date: f.return_date.value || null,
        status: f.status.value,
        image: f.image.value.trim() || null,
        featured: f.featured.checked
      };
      if (!row.name || !row.slug || !row.destination)
        return toast('Name, web address and destination are needed', true);
      if (row.spots_left > row.spots_total)
        return toast('Places left cannot exceed places total', true);
      var q = t.id ? sb.from('tours').update(row).eq('id', t.id) : sb.from('tours').insert(row);
      q.then(function (r) {
        if (r.error) return toast(r.error.message, true);
        toast('Tour saved'); closeModal(); loadTours(); loadRail();
      });
    });
  }

  /* ── bookings ─────────────────────────────────────────── */
  function loadBookings() {
    sb.from('bookings').select('*').order('created_at', { ascending: false }).limit(200)
      .then(function (r) {
        var rows = r.data || [], el = $('bookList');
        if (!rows.length) {
          el.innerHTML = '<div class="adm-empty">No bookings yet.</div>';
          return;
        }
        el.innerHTML = rows.map(function (b) {
          return '<div class="adm-card adm-row">' +
            '<div class="adm-row-main">' +
              '<b>' + esc(b.guest_name) + ' · ' + esc(b.tour_name) + '</b>' +
              '<span>' + esc(b.guest_phone) + (b.guest_email ? ' · ' + esc(b.guest_email) : '') + '</span>' +
              '<span>' + b.guests + ' guest' + (b.guests === 1 ? '' : 's') +
                ' · KES ' + money(b.total_amount) + ' · ' + esc(b.booking_ref) + '</span>' +
              '<span class="adm-pill' + (b.status === 'confirmed' ? ' ok' : '') + '">' + esc(b.status) + '</span>' +
              '<span class="adm-pill' + (b.payment_status === 'paid' ? ' ok' : '') + '">' + esc(b.payment_status) + '</span>' +
            '</div>' +
            '<div class="adm-row-act">' +
              (b.status !== 'confirmed'
                ? '<button class="adm-btn adm-btn-go" data-confirm="' + b.id + '">Confirm</button>' : '') +
              (b.payment_status !== 'paid'
                ? '<button class="adm-btn adm-btn-ghost" data-paid="' + b.id + '">Mark paid</button>' : '') +
              '<button class="adm-btn adm-btn-bad" data-cancel="' + b.id + '">Cancel</button>' +
            '</div></div>';
        }).join('');

        function patch(id, obj, note) {
          sb.from('bookings').update(obj).eq('id', id).then(function (r) {
            if (r.error) return toast(r.error.message, true);
            toast(note); loadBookings();
          });
        }
        el.querySelectorAll('[data-confirm]').forEach(function (b) {
          b.onclick = function () { patch(b.dataset.confirm, { status: 'confirmed' }, 'Booking confirmed'); };
        });
        el.querySelectorAll('[data-paid]').forEach(function (b) {
          b.onclick = function () { patch(b.dataset.paid, { payment_status: 'paid' }, 'Marked paid'); };
        });
        el.querySelectorAll('[data-cancel]').forEach(function (b) {
          b.onclick = function () {
            if (!confirm('Cancel this booking?')) return;
            patch(b.dataset.cancel, { status: 'cancelled' }, 'Booking cancelled');
          };
        });
      });
  }

  /* ── brand ────────────────────────────────────────────── */
  function loadBrand() {
    sb.from('site_settings').select('*').then(function (r) {
      var s = {};
      (r.data || []).forEach(function (row) { s[row.key] = row.value; });
      var b = s.brand || {}, c = s.contact || {};
      $('brandForm').innerHTML =
        '<form id="brandFm" class="adm-form">' +
          '<label>Logo<em>Square works best. Appears beside the wordmark.</em>' +
            '<input type="file" id="logoFile" accept="image/*"/></label>' +
          field('Logo URL', 'logo_url', b.logo_url) +
          field('Business name', 'name', b.name || 'Wild Bosses Adventures') +
          field('Phone', 'phone', c.phone) +
          field('WhatsApp', 'whatsapp', c.whatsapp, 'text', 'Digits only, e.g. 254796818671') +
          field('Email', 'email', c.email, 'email') +
          field('Instagram', 'instagram', c.instagram) +
          '<div class="adm-modal-act">' +
            '<button class="adm-btn adm-btn-go" type="submit">Save</button>' +
          '</div><p class="adm-up" id="upMsg"></p>' +
        '</form>';
      wireUpload('logoFile', 'brand', 'logo_url');

      $('brandFm').addEventListener('submit', function (e) {
        e.preventDefault();
        var f = e.target;
        Promise.all([
          sb.from('site_settings').upsert({
            key: 'brand',
            value: { name: f.name.value.trim(), logo_url: f.logo_url.value.trim(),
                     wordmark: 'WILD BOSSES', tagline: 'ADVENTURES' }
          }),
          sb.from('site_settings').upsert({
            key: 'contact',
            value: { phone: f.phone.value.trim(), whatsapp: f.whatsapp.value.trim(),
                     email: f.email.value.trim(), instagram: f.instagram.value.trim() }
          })
        ]).then(function (rs) {
          var bad = rs.filter(function (x) { return x.error; })[0];
          if (bad) return toast(bad.error.message, true);
          toast('Brand saved');
        });
      });
    });
  }

  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', boot);
  else boot();

})(window, document);
