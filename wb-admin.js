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

  function ago(iso) {
    if (!iso) return '';
    var m = Math.floor((Date.now() - new Date(iso)) / 60000);
    if (m < 1)    return 'just now';
    if (m < 60)   return m + ' min ago';
    if (m < 1440) return Math.floor(m / 60) + ' hr ago';
    var d = Math.floor(m / 1440);
    return d === 1 ? 'yesterday' : d + ' days ago';
  }
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
    $('addPhoto').addEventListener('click', function () { photoEditor(null); });
    $('modal').addEventListener('click', function (e) {
      if (e.target === $('modal')) closeModal();
    });
    D.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !$('modal').hidden) closeModal();
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
      loadRail(); loadTours(); loadPhotos(); loadBookings(); loadBrand();
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
      var noPoster = 0;
      el.innerHTML = rows.map(function (v) {
        var film   = !!(v.video_url && v.video_url.trim());
        var poster = !!(v.poster_url && v.poster_url.trim());
        if (film && !poster) noPoster++;

        var state = film && poster ? '<span class="adm-pill ok">Video + poster</span>'
          : film ? '<span class="adm-pill warn">Video, no poster</span>'
          : poster ? '<span class="adm-pill gold">Poster only</span>'
          : '<span class="adm-pill warn">Nothing to show</span>';

        return '<div class="adm-card adm-row">' +
          '<div class="adm-thumb"' +
            (poster ? ' style="background-image:url(' + esc(v.poster_url) + ')"' : '') + '>' +
            (poster ? '' : 'no image') + '</div>' +
          '<div class="adm-row-main">' +
            '<b>' + esc(v.title) + '</b>' +
            '<span class="adm-sub">' + esc(v.subtitle || 'No subtitle') + '</span>' +
            state +
            (v.tour_id ? '<span class="adm-pill">Linked to a tour</span>'
                       : '<span class="adm-pill warn">No countdown</span>') +
            (v.active ? '' : '<span class="adm-pill warn">Hidden</span>') +
          '</div>' +
          '<div class="adm-row-act">' +
            '<button class="adm-btn adm-btn-ghost" data-edit-rail="' + v.id + '">Edit</button>' +
            '<button class="adm-btn adm-btn-bad" data-del-rail="' + v.id + '">Delete</button>' +
          '</div></div>';
      }).join('');

      // the exact failure the owner just hit: film with no still behind it
      if (noPoster) {
        el.insertAdjacentHTML('afterbegin',
          '<div class="adm-card" style="border-color:var(--ember)">' +
          '<b style="color:var(--ember);font-size:13px">' + noPoster +
          ' card' + (noPoster === 1 ? '' : 's') + ' with no poster image</b>' +
          '<p style="margin:6px 0 0;font-size:13px;color:var(--ink-2);line-height:1.55">' +
          'Until the film has downloaded enough to play, the card shows its poster. ' +
          'Without one it shows nothing, which is why those cards look black on a ' +
          'slow connection. Add a still to each and they will always read.</p></div>');
      }
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
          '<label>Linked tour<em>The countdown on the card reads this tour\u2019s ' +
            'departure date. Without a linked tour the card shows no countdown.</em>' +
            '<select name="tour_id">' + opts + '</select></label>' +
          '<div class="adm-fieldset"><span class="adm-legend">The film</span>' +
            '<label>Video file<em>MP4 works everywhere. Keep it to a 10\u201320 second ' +
              'silent loop under 15 MB \u2014 anything heavier is slow for visitors on ' +
              'mobile data.</em>' +
              '<input type="file" id="vidFile" accept="video/mp4,video/webm,video/quicktime"/></label>' +
            '<p class="adm-up" id="vidMsg"></p><div class="adm-bar"><i></i></div>' +
            field('Video URL', 'video_url', v.video_url, 'text', 'Fills in by itself after upload') +
          '</div>' +
          '<div class="adm-fieldset"><span class="adm-legend">The poster \u2014 always add one</span>' +
            '<label>Poster image<em>This is what visitors see while the film downloads. ' +
              'A card with a film but no poster looks black until the video is ready.</em>' +
              '<input type="file" id="posFile" accept="image/*"/></label>' +
            '<p class="adm-up" id="posMsg"></p><div class="adm-bar"><i></i></div>' +
            field('Poster URL', 'poster_url', v.poster_url, 'text') +
            '<div class="adm-preview" id="posPrev"></div>' +
          '</div>' +
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

      wireUpload('vidFile', 'hero-videos', 'video_url', 'vidMsg');
      wireUpload('posFile', 'tour-photos', 'poster_url', 'posMsg');

      var pf = D.querySelector('[name="poster_url"]'), pv = $('posPrev');
      function drawPrev() {
        if (pf.value.trim()) { pv.style.backgroundImage = 'url(' + pf.value.trim() + ')'; pv.classList.add('on'); }
        else pv.classList.remove('on');
      }
      pf.addEventListener('input', drawPrev); drawPrev();

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
        if (!row.video_url && !row.poster_url)
          return toast('Add a video or a poster — the card would be blank', true);
        if (row.video_url && !row.poster_url &&
            !confirm('This card has a film but no poster.\n\nVisitors will see a blank ' +
                     'card until the video downloads. Save it anyway?')) return;
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
  function mb(n) { return (n / 1048576).toFixed(1) + ' MB'; }

  function wireUpload(inputId, bucket, targetName, msgId) {
    var input = $(inputId); if (!input) return;
    input.addEventListener('change', function () {
      var file = input.files && input.files[0]; if (!file) return;
      var msg = $(msgId || 'upMsg');
      var bar = msg && msg.parentNode.querySelector('.adm-bar i');

      // A phone recording can easily be 300MB. Say so before the upload
      // rather than after it fails on the bucket limit.
      var cap = bucket === 'hero-videos' ? 200 : 15;
      if (file.size > cap * 1048576) {
        msg.className = 'adm-up bad';
        msg.textContent = file.name + ' is ' + mb(file.size) + '. The limit is ' +
          cap + ' MB — please compress it first.';
        input.value = '';
        return;
      }
      if (bucket === 'hero-videos' && file.size > 40 * 1048576) {
        msg.className = 'adm-up bad';
        msg.textContent = 'Uploading ' + mb(file.size) + '. That is large — it will be ' +
          'slow for visitors. A 10–20 second clip under 15 MB looks best.';
      } else {
        msg.className = 'adm-up';
        msg.textContent = 'Uploading ' + file.name + ' (' + mb(file.size) + ')…';
      }
      if (bar) bar.style.width = '12%';

      var path = Date.now() + '-' + file.name.replace(/[^\w.\-]/g, '_').slice(-70);

      /* Decode the file in this browser before it is uploaded. A phone can
         play HEVC in hardware; desktop browsers largely cannot, and the file
         still arrives as a perfectly valid video/mp4 — so the mime type tells
         you nothing. The only honest test is whether it actually decodes. */
      function proceed() {
        sb.storage.from(bucket).upload(path, file, { cacheControl: '31536000', upsert: false })
          .then(function (r) {
            if (r.error) {
              msg.className = 'adm-up bad';
              msg.textContent = 'Upload failed: ' + r.error.message;
              if (bar) bar.style.width = '0';
              return;
            }
            var url = sb.storage.from(bucket).getPublicUrl(path).data.publicUrl;
            var fld = D.querySelector('[name="' + targetName + '"]');
            if (fld) { fld.value = url; fld.dispatchEvent(new Event('input')); }
            if (bar) bar.style.width = '100%';
            msg.className = 'adm-up';
            msg.textContent = 'Uploaded. Press Save to publish it.';
          });
      }

      if (bucket !== 'hero-videos') { proceed(); return; }

      var probe = D.createElement('video');
      probe.muted = true; probe.playsInline = true; probe.preload = 'auto';
      var blobUrl = URL.createObjectURL(file);
      var settled = false;

      function done(ok, why) {
        if (settled) return; settled = true;
        URL.revokeObjectURL(blobUrl);
        if (ok) { proceed(); return; }
        input.value = '';
        if (bar) bar.style.width = '0';
        msg.className = 'adm-up bad';
        msg.textContent = why;
      }

      probe.addEventListener('loadeddata', function () { done(true); });
      probe.addEventListener('error', function () {
        done(false, 'This browser cannot decode ' + file.name + '. It is most likely ' +
          'H.265/HEVC, which phones play but desktop browsers do not. Re-export it ' +
          'as H.264 MP4 and it will play everywhere.');
      });
      setTimeout(function () {
        done(probe.readyState >= 2, 'Could not decode ' + file.name + ' in time. ' +
          'If it was recorded on a phone, re-export it as H.264 MP4.');
      }, 6000);
      probe.src = blobUrl;
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
    wireUpload('tourImg', 'tour-photos', 'image', 'upMsg');

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

  /* ── photos ───────────────────────────────────────────── */
  function loadPhotos() {
    sb.from('photos').select('*').order('sort_order').order('created_at', { ascending: false })
      .then(function (r) {
        var rows = r.data || [], el = $('photoList');
        if (!rows.length) {
          el.innerHTML = '<div class="adm-empty"><b>No photos yet</b>' +
            'Add photos from past tours and they appear on the Gallery page and homepage strip.</div>';
          return;
        }
        el.innerHTML = rows.map(function (p) {
          var cap = p.caption || p.location || '—';
          return '<div class="adm-card adm-row">' +
            '<div class="adm-thumb"' +
              (p.url ? ' style="background-image:url(' + esc(p.url) + ')"' : '') + '>' +
              (p.url ? '' : 'no image') + '</div>' +
            '<div class="adm-row-main">' +
              '<b>' + esc(cap) + '</b>' +
              (p.location ? '<span class="adm-sub">' + esc(p.location) + '</span>' : '') +
              '<span class="adm-pill">Order: ' + (p.sort_order || 0) + '</span>' +
              (p.active ? '' : '<span class="adm-pill warn">Hidden</span>') +
            '</div>' +
            '<div class="adm-row-act">' +
              '<button class="adm-btn adm-btn-ghost" data-edit-photo="' + p.id + '">Edit</button>' +
              '<button class="adm-btn adm-btn-bad" data-del-photo="' + p.id + '">Delete</button>' +
            '</div></div>';
        }).join('');

        el.querySelectorAll('[data-edit-photo]').forEach(function (b) {
          b.onclick = function () {
            photoEditor(rows.filter(function (x) { return x.id === b.dataset.editPhoto; })[0]);
          };
        });
        el.querySelectorAll('[data-del-photo]').forEach(function (b) {
          b.onclick = function () {
            if (!confirm('Delete this photo?')) return;
            sb.from('photos').delete().eq('id', b.dataset.delPhoto).then(function (r) {
              if (r.error) return toast(r.error.message, true);
              toast('Photo deleted'); loadPhotos();
            });
          };
        });
      });
  }

  function photoEditor(p) {
    p = p || {};
    openModal(
      '<h3>' + (p.id ? 'Edit photo' : 'Add photo') + '</h3>' +
      '<p class="adm-modal-note">Photos appear on the Gallery page and scroll across the homepage. ' +
        'Add a caption and location so visitors know what they are looking at.</p>' +
      '<form id="photoForm" class="adm-form">' +
        '<label>Photo<em>Upload from your camera roll or computer.</em>' +
          '<input type="file" id="photoFile" accept="image/*"/></label>' +
        '<p class="adm-up" id="upMsg"></p><div class="adm-bar"><i></i></div>' +
        field('Photo URL', 'url', p.url, 'text', 'Fills in automatically after upload') +
        '<div class="adm-preview" id="photoPrev"></div>' +
        field('Caption', 'caption', p.caption, 'text', 'Short description e.g. "Sunrise over the Mara"') +
        field('Location', 'location', p.location, 'text', 'e.g. Maasai Mara, Amboseli') +
        field('Alt text', 'alt_text', p.alt_text, 'text', 'Describe the image for accessibility') +
        field('Order', 'sort_order', p.sort_order == null ? 0 : p.sort_order, 'number',
              'Lower numbers appear first') +
        '<label class="adm-check"><input type="checkbox" name="active"' +
          (p.active === false ? '' : ' checked') + '/> Show on the gallery &amp; homepage</label>' +
        '<div class="adm-modal-act">' +
          '<button type="button" class="adm-btn adm-btn-ghost" onclick="admClose()">Cancel</button>' +
          '<button class="adm-btn adm-btn-go" type="submit">Save</button>' +
        '</div>' +
      '</form>'
    );
    wireUpload('photoFile', 'tour-photos', 'url', 'upMsg');

    /* live preview */
    var urlFld = D.querySelector('[name="url"]'), prev = $('photoPrev');
    function drawPrev() {
      if (urlFld && urlFld.value.trim()) {
        prev.style.backgroundImage = 'url(' + urlFld.value.trim() + ')';
        prev.classList.add('on');
      } else {
        prev.classList.remove('on');
      }
    }
    if (urlFld) { urlFld.addEventListener('input', drawPrev); drawPrev(); }

    $('photoForm').addEventListener('submit', function (ev) {
      ev.preventDefault();
      var f = ev.target;
      var row = {
        url: f.url.value.trim(),
        caption: f.caption.value.trim() || null,
        location: f.location.value.trim() || null,
        alt_text: f.alt_text.value.trim() || null,
        sort_order: parseInt(f.sort_order.value, 10) || 0,
        active: f.active.checked
      };
      if (!row.url) return toast('A photo URL is needed — upload a photo first', true);
      var q = p.id ? sb.from('photos').update(row).eq('id', p.id) : sb.from('photos').insert(row);
      q.then(function (r) {
        if (r.error) return toast(r.error.message, true);
        toast('Photo saved'); closeModal(); loadPhotos();
      });
    });
  }

  /* ── bookings ─────────────────────────────────────────── */
  function loadBookings() {
    sb.from('bookings').select('*').order('created_at', { ascending: false }).limit(200)
      .then(function (r) {
        var rows = r.data || [], el = $('bookList');

        var pending = rows.filter(function (b) { return b.status === 'pending'; }).length;
        var unpaid  = rows.filter(function (b) { return b.payment_status !== 'paid'
                                                     && b.status !== 'cancelled'; }).length;
        var heads   = rows.filter(function (b) { return b.status === 'confirmed'; })
                          .reduce(function (a, b) { return a + (b.guests || 0); }, 0);

        var tab = D.querySelector('[data-tab="bookings"]');
        if (tab) {
          var old = tab.querySelector('.adm-badge');
          if (old) old.remove();
          if (pending) tab.insertAdjacentHTML('beforeend',
            '<span class="adm-badge">' + pending + '</span>');
        }

        var stats = '<div class="adm-stats">' +
          '<div class="adm-stat' + (pending ? ' warn' : '') + '"><b>' + pending + '</b>' +
            '<span>Awaiting reply</span></div>' +
          '<div class="adm-stat"><b>' + unpaid + '</b><span>Not yet paid</span></div>' +
          '<div class="adm-stat"><b>' + heads + '</b><span>Confirmed guests</span></div>' +
          '<div class="adm-stat"><b>' + rows.length + '</b><span>Total enquiries</span></div>' +
          '</div>';

        if (!rows.length) {
          el.innerHTML = stats +
            '<div class="adm-empty"><b>No enquiries yet</b>' +
            'Bookings made from the site land here the moment they are sent.</div>';
          return;
        }
        el.innerHTML = stats + rows.map(function (b) {
          return '<div class="adm-card adm-row">' +
            '<div class="adm-row-main">' +
              '<b>' + esc(b.guest_name) + ' &middot; ' + esc(b.tour_name) + '</b>' +
              '<span class="adm-sub">' + ago(b.created_at) + ' &middot; ' +
                b.guests + ' guest' + (b.guests === 1 ? '' : 's') +
                ' &middot; KES ' + money(b.total_amount) +
                ' &middot; ' + esc(b.booking_ref) + '</span>' +
              '<span class="adm-pill' + (b.status === 'confirmed' ? ' ok'
                : b.status === 'cancelled' ? '' : ' warn') + '">' + esc(b.status) + '</span>' +
              '<span class="adm-pill' + (b.payment_status === 'paid' ? ' ok' : ' warn') + '">' +
                esc(b.payment_status) + '</span>' +
              (b.notes ? '<span class="adm-sub" style="font-style:italic">&ldquo;' +
                esc(b.notes) + '&rdquo;</span>' : '') +
            '</div>' +
            '<div class="adm-row-act">' +
              '<a class="adm-btn adm-btn-go" target="_blank" rel="noopener" href="https://wa.me/' +
                esc(String(b.guest_phone).replace(/[^0-9]/g, '')) + '">WhatsApp</a>' +
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
      wireUpload('logoFile', 'brand', 'logo_url', 'upMsg');

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
