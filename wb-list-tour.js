/* Wildbosses list-tour page */

let currentStep = 1;
let selectedCat = '';
let selectedPriceType = 'paid';
const stops = [];
const uploadedPhotos = [];

/* ── STEP NAVIGATION ── */
function goStep(n) {
  if (n > currentStep && !validateStep(currentStep)) return;
  document.getElementById(`step${currentStep}`).classList.remove('active');
  currentStep = n;
  const s = document.getElementById(`step${n}`);
  if (s) { s.classList.add('active'); window.scrollTo({top:0,behavior:'smooth'}); }
  updateProgress();
}

function updateProgress() {
  for (let i = 1; i <= 4; i++) {
    const el = document.getElementById(`tpS${i}`);
    const line = document.getElementById(`tpL${i}`);
    if (i < currentStep) { el.className='tp-step done'; el.innerHTML='<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>'; if(line) line.className='tp-line done'; }
    else if (i === currentStep) { el.className='tp-step active'; el.textContent=i; }
    else { el.className='tp-step pending'; el.textContent=i; if(line) line.className='tp-line'; }
  }
}

/* ── VALIDATION ── */
function validateStep(n) {
  let ok = true;
  if (n === 1) {
    ok = checkField('firstName','fFirstName') & checkField('lastName','fLastName') & checkEmail() & checkField('phone','fPhone') & checkSelect('location','fLocation') & checkBio();
  }
  if (n === 2) {
    ok = checkField('tourName','fTourName') & checkCat() & checkDesc();
  }
  if (n === 4) {
    if (!document.getElementById('agreeTerms').checked) { showToast('Please agree to the Guide Terms to continue'); return false; }
  }
  return ok;
}
function checkField(id, wrapId) {
  const v = document.getElementById(id).value.trim();
  const w = document.getElementById(wrapId);
  if (!v) { w.classList.add('has-error'); return false; }
  w.classList.remove('has-error'); return true;
}
function checkEmail() {
  const v = document.getElementById('email').value.trim();
  const w = document.getElementById('fEmail');
  if (!v || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { w.classList.add('has-error'); return false; }
  w.classList.remove('has-error'); return true;
}
function checkSelect(id, wrapId) {
  const v = document.getElementById(id).value;
  const w = document.getElementById(wrapId);
  if (!v) { w.classList.add('has-error'); return false; }
  w.classList.remove('has-error'); return true;
}
function checkBio() {
  const v = document.getElementById('bio').value.trim();
  const w = document.getElementById('fBio');
  if (v.length < 80) { w.classList.add('has-error'); return false; }
  w.classList.remove('has-error'); return true;
}
function checkCat() {
  const w = document.getElementById('fCategory');
  if (!selectedCat) { w.classList.add('has-error'); return false; }
  w.classList.remove('has-error'); return true;
}
function checkDesc() {
  const v = document.getElementById('description').value.trim();
  const w = document.getElementById('fDescription');
  if (v.length < 150) { w.classList.add('has-error'); return false; }
  w.classList.remove('has-error'); return true;
}

/* ── CAT SELECT ── */
function selectCat(el, val) {
  document.querySelectorAll('.cat-opt').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
  selectedCat = val;
  updatePreview();
}

/* ── PRICE TYPE ── */
function selectPriceType(el, val) {
  document.querySelectorAll('.pt-opt').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
  selectedPriceType = val;
  const pf = document.getElementById('priceFields');
  pf.style.display = val === 'paid' ? '' : 'none';
  updatePreview();
}

/* ── TOGGLES ── */
function toggleChip(el) { el.classList.toggle('selected'); }
function toggleInc(el) { el.classList.toggle('checked'); }

/* ── ITINERARY ── */
function addStop() {
  const inp = document.getElementById('stopInput');
  const v = inp.value.trim();
  if (!v) return;
  stops.push(v);
  inp.value = '';
  renderStops();
}
function removeStop(i) { stops.splice(i, 1); renderStops(); }
function renderStops() {
  document.getElementById('itinList').innerHTML = stops.map((s,i) => `
    <div class="itin-stop">
      <div class="itin-stop-num">${i+1}</div>
      <div class="itin-stop-text">${s}</div>
      <button class="itin-stop-del" onclick="removeStop(${i})"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
    </div>`).join('');
}

/* ── FILE UPLOAD ── */
function handleFiles(files) {
  Array.from(files).slice(0, 6).forEach(f => {
    const reader = new FileReader();
    reader.onload = e => {
      uploadedPhotos.push(e.target.result);
      renderPreviews();
      // update sidebar preview with first photo
      if (uploadedPhotos.length === 1) {
        document.getElementById('previewImg').innerHTML = `<img src="${e.target.result}" alt="Tour photo"/>`;
      }
    };
    reader.readAsDataURL(f);
  });
}
function handleDrop(e) {
  e.preventDefault();
  handleFiles(e.dataTransfer.files);
}
function renderPreviews() {
  document.getElementById('uploadPreviews').innerHTML = uploadedPhotos.map((src,i) => `
    <div class="upload-preview">
      <img src="${src}" alt="Photo ${i+1}"/>
      <div class="upload-preview-remove" onclick="removePhoto(${i})">✕</div>
    </div>`).join('');
}
function removePhoto(i) {
  uploadedPhotos.splice(i,1);
  renderPreviews();
  if (!uploadedPhotos.length) {
    document.getElementById('previewImg').innerHTML = `<div class="preview-img-placeholder"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:36px;height:36px;margin-bottom:8px;"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg><span>Add a photo</span></div>`;
  } else {
    document.getElementById('previewImg').innerHTML = `<img src="${uploadedPhotos[0]}" alt="Tour photo"/>`;
  }
}

/* ── LIVE PREVIEW ── */
const catMeta = { safari:'🦁 Safari', walk:'🚶 Walking', culture:'🎭 Culture', adventure:'⛰️ Adventure', beach:'🌊 Beach', bird:'🦅 Birding', photo:'📷 Photo', food:'🍽️ Food', night:'🌙 Night' };
function updatePreview() {
  const name = document.getElementById('tourName')?.value || '';
  const fname = document.getElementById('firstName')?.value || '';
  const lname = document.getElementById('lastName')?.value || '';
  const dur = document.getElementById('duration')?.value || '';
  const group = document.getElementById('groupSize')?.value || '';
  const price = document.getElementById('price')?.value || '';

  document.getElementById('previewName').textContent = name || 'Your tour name…';
  document.getElementById('previewName').style.color = name ? 'var(--ink)' : 'var(--ink-faint)';
  document.getElementById('previewMeta').textContent = [dur, group].filter(Boolean).join(' · ') || 'Duration · Group size';
  document.getElementById('previewGuide').textContent = [fname, lname].filter(Boolean).join(' ') || 'Your name';

  if (selectedCat) {
    document.getElementById('previewBadge').textContent = catMeta[selectedCat] || '🗺️ Tour';
    document.getElementById('previewTags').innerHTML = `<span class="preview-tag">${catMeta[selectedCat]}</span>`;
  }

  if (selectedPriceType === 'free') {
    document.getElementById('previewPrice').innerHTML = '<span class="free" style="color:var(--forest-3);font-family:var(--font-d);font-weight:700;font-size:19px;">Free</span>';
  } else if (selectedPriceType === 'payown') {
    document.getElementById('previewPrice').innerHTML = '<span style="font-family:var(--font-d);font-weight:700;font-size:16px;color:var(--ink);">Pay what you want</span>';
  } else if (price) {
    document.getElementById('previewPrice').innerHTML = `<span style="font-family:var(--font-d);font-weight:700;font-size:19px;color:var(--ink);">KES ${Number(price).toLocaleString()}</span><span style="font-size:11px;color:var(--ink-faint);margin-left:3px;">/person</span>`;
  } else {
    document.getElementById('previewPrice').innerHTML = '<span style="color:var(--ink-faint);">Enter price</span>';
  }
}

/* ── SUBMIT — saves to Supabase wb_tours ── */
const SB_URL = 'https://gfwgbgdvxtocwhilrtdw.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdmd2diZ2R2eHRvY3doaWxydGR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1MTE2NjMsImV4cCI6MjA5NzA4NzY2M30.U8JClv06YsNAwq9qsPb3lQ4SIPeRPjKMzsYxVfcmujw';

async function submitListing() {
  if (!validateStep(4)) return;
  const btn = document.querySelector('.btn-submit');
  btn.disabled = true;
  btn.innerHTML = '<svg class="spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Saving tour…';

  const name       = document.getElementById('tourName')?.value.trim() || '';
  const fname      = document.getElementById('firstName')?.value.trim() || '';
  const lname      = document.getElementById('lastName')?.value.trim() || '';
  const email      = document.getElementById('email')?.value.trim() || '';
  const phone      = document.getElementById('phone')?.value.trim() || '';
  const location   = document.getElementById('location')?.value || '';
  const experience = document.getElementById('experience')?.value || '';
  const bio        = document.getElementById('bio')?.value.trim() || '';
  const duration   = document.getElementById('duration')?.value || '';
  const groupSize  = document.getElementById('groupSize')?.value || '';
  const price      = document.getElementById('price')?.value || '0';
  const description= document.getElementById('description')?.value.trim() || '';
  const meetingPt  = document.getElementById('meetingPoint')?.value.trim() || '';
  const notes      = document.getElementById('notes')?.value.trim() || '';

  const destMap = {
    'nairobi':'nairobi','masai mara':'masai-mara','mombasa':'mombasa',
    'diani':'diani','naivasha':'naivasha','amboseli':'amboseli',
    'arusha':'arusha','zanzibar':'zanzibar','dar':'dar-es-salaam','kilimanjaro':'kilimanjaro',
  };
  const locLower = location.toLowerCase();
  const destination = Object.keys(destMap).find(k => locLower.includes(k)) || 'nairobi';
  const country = locLower.includes('tanzania') ? 'Tanzania' : 'Kenya';

  const priceKes = selectedPriceType === 'free' || selectedPriceType === 'payown'
    ? 0 : (parseInt(price) || 0);
  const depositKes = Math.round(priceKes * 0.30);
  const groupMax = parseInt(groupSize) || 999;
  const slug = 'wb-' + name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,48) + '-' + Date.now().toString(36);

  const row = {
    id: slug, slug, name,
    subtitle: '',
    category: selectedCat || 'safari',
    destination: destMap[destination] || destination,
    country,
    duration,
    group_max: groupMax, group_min: 1,
    price_kes: priceKes, deposit_kes: depositKes, deposit_pct: 30,
    spots_total: groupMax, spots_left: groupMax,
    rating: 0, reviews: 0,
    departure_date: null, return_date: null, booking_deadline: null,
    status: 'open', urgency: 'normal', featured: true,
    photos: uploadedPhotos.slice(),
    image: uploadedPhotos[0] || '',
    tags: [selectedCat || 'tour'],
    guide: [fname, lname].filter(Boolean).join(' '),
    guide_email: email, guide_phone: phone, guide_bio: bio,
    guide_experience: experience, guide_rating: 0,
    description, meeting_point: meetingPt, notes,
    includes_list: [], excludes_list: [], itinerary: [],
    is_active: true, source: 'wildbosses-list-tour',
    created_at: new Date().toISOString(),
  };

  try {
    const res = await fetch(SB_URL + '/rest/v1/wb_tours', {
      method: 'POST',
      headers: {
        'apikey': SB_KEY,
        'Authorization': 'Bearer ' + SB_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(row),
    });
    if (!res.ok) throw new Error(await res.text());

    const waMsg = [
      '🌿 *NEW TOUR LISTED — Wildbosses*','',
      '📋 Tour: ' + name,'🗺 Destination: ' + location,
      '🏷 Category: ' + (selectedCat || 'safari'),'⏱ Duration: ' + duration,
      '👥 Group: up to ' + groupMax,
      '💰 Price: ' + (priceKes === 0 ? 'Free' : 'KES ' + priceKes.toLocaleString()),'',
      '👤 Guide: ' + [fname,lname].filter(Boolean).join(' '),
      '📞 Phone: ' + phone,'📧 Email: ' + email,'',
      '✅ Live on Cabana & Wildbosses instantly',
    ].filter(Boolean).join('\n');
    const iframe = document.createElement('iframe');
    iframe.style.display='none';
    iframe.src='https://wa.me/254796818671?text='+encodeURIComponent(waMsg);
    document.body.appendChild(iframe);
    setTimeout(()=>iframe.parentNode?.removeChild(iframe),3000);

    document.getElementById('formArea').innerHTML = '';
    const s = document.getElementById('successScreen');
    s.classList.add('show');
    document.getElementById('formArea').appendChild(s);
    s.style.display = 'block';
    document.getElementById('tbProgress').style.display = 'none';
    window.scrollTo({top:0,behavior:'smooth'});

  } catch(e) {
    console.error('[list-tour] save failed:', e);
    btn.disabled = false;
    btn.innerHTML = 'Submit listing';
    showToast('Save failed — check your connection and try again');
  }
}

/* ── TOAST ── */
function showToast(m) { const t=document.getElementById('toast');t.textContent=m;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),3500); }

/* ── SPIN ANIM ── */
const style = document.createElement('style');
style.textContent = '.spin{animation:spin .8s linear infinite;}@keyframes spin{to{transform:rotate(360deg);}}';
document.head.appendChild(style);

