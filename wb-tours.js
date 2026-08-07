/* Wildbosses tours page */

/* ── DATA ── */
const TOURS=[
  {id:'migration',cat:'safari',dest:'masai-mara',name:'Masai Mara Great Migration Safari — 7 Days',dur:'7 days · 6 nights',group:'Max 8',rating:4.98,reviews:156,price:95000,deposit:28500,spotsLeft:2,totalSpots:8,deadline:'2026-08-13T23:59:00+03:00',
   img:'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=800&q=80',
   tags:['Great Migration','Private 4×4','Luxury Camp','Big Five'],
   desc:'The greatest wildlife spectacle on earth. 1.5 million wildebeest crossing the Mara River, predators in pursuit, and you in a private vehicle at first light. Six nights in a luxury tented camp with full board, guided morning and evening drives every day.',
   includes:['All park & conservancy fees','Luxury tented camp × 6 nights','Full board throughout','Private 4×4 + expert guide','All internal transfers','Sundowners daily'],
   itinerary:['Day 1: Nairobi → Masai Mara, afternoon drive','Day 2–6: Full-day game drives, migration tracking','Day 5: Maasai village visit + cultural dinner','Day 7: Morning drive, return to Nairobi']},
  {id:'mara-big5',cat:'safari',dest:'masai-mara',name:'Masai Mara Big Five Game Drive',dur:'Full day · 10h',group:'Max 6',rating:4.97,reviews:312,price:12500,deposit:3750,spotsLeft:3,totalSpots:6,deadline:'2026-08-14T23:59:00+03:00',
   img:'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=800&q=80',
   tags:['Big Five','Private 4×4','Sunrise Start','Bush Lunch'],
   desc:'A private sunrise game drive through the Mara Triangle. We track lion, elephant, leopard, buffalo and rhino across open savanna. Lunch in the bush, sundowner on the plains, back to Nairobi by nightfall.',
   includes:['Private 4×4 + driver-guide','Park entry fees','Bush lunch & drinks','Sundowner','Return Nairobi transfer'],
   itinerary:['3:30am — Nairobi pickup','6am — Enter Mara at golden hour','Morning — Big Five tracking','12pm — Bush lunch','Afternoon — Continue game drive','5:30pm — Sundowner','7pm — Return drive']},
  {id:'nairobi-walk',cat:'walking',dest:'nairobi',name:'Nairobi City Walking Tour',dur:'2h 30m',group:'Max 16',rating:4.96,reviews:1240,price:0,deposit:0,spotsLeft:12,totalSpots:16,deadline:null,
   img:'https://images.unsplash.com/photo-1611348524140-53c9a25263d6?w=800&q=80',
   tags:['History','Culture','Markets','Parliament'],
   desc:'Nairobi\'s essential walk. Parliament, KICC, Jamia Mosque, City Market, the August 7th Memorial Park and Maasai Market. Led by our resident city guide, this reveals the full character of Kenya\'s capital.',
   includes:['Expert Wildbosses guide','Walking route map','Photography stops','Maasai Market visit'],
   itinerary:['9am — Dedan Kimathi Statue','9:30am — Parliament & KICC','10am — Jamia Mosque & City Market','10:30am — August 7th Memorial','11am — Maasai Market']},
  {id:'amboseli',cat:'safari',dest:'amboseli',name:'Amboseli Elephants & Kilimanjaro Views',dur:'2 days · 1 night',group:'Max 8',rating:4.93,reviews:412,price:28000,deposit:8400,spotsLeft:3,totalSpots:8,deadline:'2026-08-20T23:59:00+03:00',
   img:'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800&q=80',
   tags:['Elephants','Kilimanjaro Views','Overnight','Photography'],
   desc:'The most photogenic safari in Kenya. Elephant herds crossing the Amboseli flats with Kilimanjaro towering above at dawn. We stay overnight in a classic tented camp at the park boundary and shoot at first light.',
   includes:['Return Nairobi transfer','All park fees','Tented camp × 1 night','Full board × 2 days','Sunrise & sunset drives'],
   itinerary:['Day 1: Nairobi → Amboseli, afternoon game drive, overnight camp','Day 2: Pre-dawn Kilimanjaro sunrise drive, brunch, return Nairobi']},
  {id:'zanzibar',cat:'culture',dest:'zanzibar',name:'Zanzibar Stone Town & Spice Farm',dur:'Full day · 8h',group:'Max 12',rating:4.91,reviews:623,price:9500,deposit:2850,spotsLeft:8,totalSpots:12,deadline:null,
   img:'https://images.unsplash.com/photo-1516117172878-fd2c41f4a759?w=800&q=80',
   tags:['UNESCO','Spices','History','Seafood Lunch'],
   desc:'A full immersion into Zanzibar\'s layered history — Arab architecture, carved doors, Swahili cuisine. The spice farm is an awakening of every sense. We finish with a seafood lunch and a dhow trip to Prison Island.',
   includes:['Local guide','Stone Town walk (3h)','Spice Farm','Prison Island dhow trip','Seafood lunch'],
   itinerary:['9am — Stone Town walk','12pm — Forodhani Gardens lunch','2pm — Spice Farm','4pm — Prison Island','6pm — Return']},
  {id:'diani',cat:'beach',dest:'diani',name:'Diani Dhow Sunset Cruise & Dolphins',dur:'3h',group:'Max 14',rating:4.85,reviews:298,price:5500,deposit:1650,spotsLeft:6,totalSpots:14,deadline:null,
   img:'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&q=80',
   tags:['Sunset','Dhow','Dolphins','Reef Snorkel'],
   desc:'Drift across the Indian Ocean on a traditional dhow. We chase spinner dolphins, snorkel the coral reef, and drift home as the sun sets in fire. Fresh coconut and sundowners on board.',
   includes:['Dhow charter','Snorkel gear','Life jackets','Drinks & coconut','Dolphin spotting'],
   itinerary:['4pm — Diani jetty','4:30pm — Dolphin encounter','5pm — Reef snorkel','6pm — Sundowner sail','7pm — Return']},
  {id:'kilimanjaro',cat:'adventure',dest:'kilimanjaro',name:'Kilimanjaro — Marangu Route 6 Days',dur:'6 days · 5 nights',group:'Max 8',rating:4.94,reviews:389,price:185000,deposit:55500,spotsLeft:6,totalSpots:8,deadline:'2026-09-10T23:59:00+03:00',
   img:'https://images.unsplash.com/photo-1519923834699-ef0b7cde4712?w=800&q=80',
   tags:['Summit 5,895m','89% Success Rate','All meals','Porters included'],
   desc:'Africa\'s highest peak. Our Marangu route has an 89% summit success rate. We provide everything — porters, all meals, acclimatisation days, and a certified mountain guide who has stood on Uhuru Peak over 400 times.',
   includes:['All park & conservation fees','Hut accommodation × 5 nights','All meals on mountain','Porters × 2 per climber','Certified Wildbosses mountain guide','Summit certificate'],
   itinerary:['Day 1–2: Moshi, briefing & gear','Day 3: Mandara Huts 2,720m','Day 4: Horombo Huts 3,720m','Day 5: Kibo Huts 4,700m','Day 6: Uhuru Peak 5,895m & descent']},
  {id:'naivasha',cat:'adventure',dest:'naivasha',name:'Hell Gate Cycling & Lake Naivasha',dur:'Full day · 9h',group:'Max 12',rating:4.86,reviews:647,price:8500,deposit:2550,spotsLeft:10,totalSpots:12,deadline:null,
   img:'https://images.unsplash.com/photo-1538970272646-f61fabb3bda3?w=800&q=80',
   tags:['Cycling','Gorge Walk','Boat Safari','Wildlife'],
   desc:'Kenya\'s most exhilarating day out. Cycle through Hell Gate Gorge past grazing zebra and giraffe, descend into dramatic red-rock gorge walls, then take a motorboat safari on Lake Naivasha spotting hippos and 350+ bird species.',
   includes:['Return Nairobi transfer','Bike hire','Park & boat fees','Packed lunch'],
   itinerary:['6am — Nairobi departure','9am — Hell Gate cycling (3h)','12pm — Gorge descent walk','1:30pm — Lunch at lakeside','2:30pm — Lake Naivasha boat safari','5pm — Return Nairobi']},
  {id:'nakuru-birds',cat:'birding',dest:'naivasha',name:'Lake Nakuru Flamingo & Rhino Safari',dur:'Full day · 10h',group:'Max 8',rating:4.92,reviews:234,price:11500,deposit:3450,spotsLeft:6,totalSpots:8,deadline:null,
   img:'https://images.unsplash.com/photo-1535081143840-a09e58c2e08b?w=800&q=80',
   tags:['Flamingos','Rhinos','450+ Bird Species','Lake'],
   desc:'Up to 1 million flamingos colour Lake Nakuru vivid pink. Plus white and black rhino in the sanctuary, Rothschild\'s giraffe, and 450+ recorded bird species — with Kenya\'s most qualified birding guide.',
   includes:['Return Nairobi transfer','Park entry fees','Binoculars loan','Bird checklist','Packed lunch'],
   itinerary:['6am — Nairobi departure','9am — Flamingo shoreline walk','11am — Rhino sanctuary drive','1pm — Clifftop viewpoint lunch','2pm — Eastern wetlands birding','5pm — Return Nairobi']},
  {id:'ngong',cat:'adventure',dest:'nairobi',name:'Ngong Hills Sunrise Hike',dur:'Half day · 5h',group:'Max 12',rating:4.82,reviews:192,price:3500,deposit:0,spotsLeft:10,totalSpots:12,deadline:null,
   img:'https://images.unsplash.com/photo-1508193638397-1c4234db14d8?w=800&q=80',
   tags:['Sunrise','Rift Valley Views','Beginner Friendly','City Escape'],
   desc:'Leave Nairobi before dawn and reach the Ngong Hills ridge as the sun cracks open the Great Rift Valley. Simultaneous views of Nairobi and the Rift Valley. Gentle enough for beginners, spectacular enough for anyone.',
   includes:['Return Nairobi transport','Certified guide','Headlamp','Bush breakfast on summit'],
   itinerary:['3:30am — Nairobi pickup','5am — Ngong trailhead','6am — Summit ridge','6:15am — Sunrise over the Rift Valley','7am — Ridge walk & breakfast','9am — Return Nairobi']},
  {id:'mara-photo',cat:'photo',dest:'masai-mara',name:'Mara Photography Safari — Golden Light',dur:'Full day · 11h',group:'Max 4',rating:5.0,reviews:78,price:22000,deposit:6600,spotsLeft:1,totalSpots:4,deadline:'2026-08-15T23:59:00+03:00',
   img:'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=800&q=80',
   tags:['Golden Hour','Private Vehicle','Max 4 Guests','Expert Guide'],
   desc:'Designed for serious photographers. Our photography guide positions the vehicle for perfect blue-hour and golden-hour light. Maximum 4 guests. Includes an evening editing session and RAW workflow tips.',
   includes:['Private 4×4 with roof hatch','Photography-expert guide','All meals in field','Evening editing session','Park fees'],
   itinerary:['3am — Nairobi departure','5:30am — Blue hour position','6am — Golden hour shoots','8am — Bush breakfast','Midday — Edit in camp','4pm — Afternoon golden hour','8pm — Return Nairobi']},
  {id:'mara-night',cat:'night',dest:'masai-mara',name:'Masai Mara Night Game Drive',dur:'3h · Dusk to 10pm',group:'Max 6',rating:4.89,reviews:122,price:9500,deposit:2850,spotsLeft:4,totalSpots:6,deadline:null,
   img:'https://images.unsplash.com/photo-1489749798305-4fea3ae63d43?w=800&q=80',
   tags:['Spotlight Drive','Nocturnal Wildlife','Leopard','Conservancy'],
   desc:'The Mara after dark is a completely different world. Spotlighting hyenas, leopards, aardvarks, civets and nocturnal birds across the conservancy. Our guide has 15 years of night-drive experience.',
   includes:['Spotlight vehicle','Conservation levy','Bush sundowner','Expert guide'],
   itinerary:['5:30pm — Sundowner on the plains','6:30pm — Night drive begins','7:30pm — Stargazing break','9:30pm — Return to camp']},
  {id:'kibera',cat:'culture',dest:'nairobi',name:'Kibera Community Experience',dur:'2h 30m',group:'Max 6',rating:4.90,reviews:308,price:0,deposit:0,spotsLeft:5,totalSpots:6,deadline:null,
   img:'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',
   tags:['Community','Authentic','Social Enterprise','Local Life'],
   desc:'An authentic community experience in Kibera — not poverty tourism, but real storytelling from people building their own future. Every tour funds community projects directly. The most moving experience in our catalogue.',
   includes:['Community guide','Local foundation visit','Tea with a family','Social enterprise tour'],
   itinerary:['Ayany Estate meeting point','Kibera Arts District','Community School','Foundation visit','Local tea & debrief']},
  {id:'serengeti',cat:'safari',dest:'serengeti',name:'Serengeti Great Migration 4 Days',dur:'4 days · 3 nights',group:'Max 6',rating:4.97,reviews:556,price:195000,deposit:58500,spotsLeft:2,totalSpots:6,deadline:'2026-08-25T23:59:00+03:00',
   img:'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800&q=80',
   tags:['Great Migration','Serengeti','Ngorongoro','Balloon Option'],
   desc:'The greatest wildlife spectacle on earth. 1.5 million wildebeest and 200,000 zebra thunder across the Serengeti. We track the migration across four days with Tanzania\'s most experienced safari guide.',
   includes:['All park fees','Accommodation × 3 nights','Full board','Return Arusha transfers','Expert naturalist guide'],
   itinerary:['Day 1: Arusha → Central Serengeti','Day 2: Full day migration area','Day 3: Ngorongoro Crater','Day 4: Return Arusha']},
];

/* ── STATE ── */
let _filter='all', _favs=JSON.parse(localStorage.getItem('wb_favs')||'[]');
const savFavs=()=>localStorage.setItem('wb_favs',JSON.stringify(_favs));

/* ── COUNTDOWN ── */
function tick(){
  const d=new Date('2026-08-13T23:59:00+03:00')-new Date();
  if(d<0){['tD','tH','tM','tS'].forEach(id=>document.getElementById(id).textContent='00');return;}
  const pad=n=>String(Math.floor(n)).padStart(2,'0');
  document.getElementById('tD').textContent=pad(d/864e5);
  document.getElementById('tH').textContent=pad((d%864e5)/36e5);
  document.getElementById('tM').textContent=pad((d%36e5)/6e4);
  document.getElementById('tS').textContent=pad((d%6e4)/1e3);
}
tick(); setInterval(tick,1000);

/* ── FILTER ── */
function setFilter(k,el){
  _filter=k;
  document.querySelectorAll('.fchip').forEach(c=>c.classList.remove('on'));
  el.classList.add('on');
  render();
}

/* ── RENDER ── */
function render(){
  const q=(document.getElementById('searchInput')?.value||'').toLowerCase().trim();
  const dest=document.getElementById('destSel')?.value||'';
  const sort=document.getElementById('sortSel')?.value||'rec';

  let list=TOURS.filter(t=>{
    const matchCat=_filter==='all'||(_filter==='free'?t.price===0:t.cat===_filter);
    const matchDest=!dest||t.dest===dest;
    const matchQ=!q||t.name.toLowerCase().includes(q)||t.dest.toLowerCase().includes(q)||t.tags.some(x=>x.toLowerCase().includes(q))||t.cat.toLowerCase().includes(q);
    return matchCat&&matchDest&&matchQ;
  });

  switch(sort){
    case 'rating': list.sort((a,b)=>b.rating-a.rating); break;
    case 'price-asc': list.sort((a,b)=>a.price-b.price); break;
    case 'price-desc': list.sort((a,b)=>b.price-a.price); break;
    case 'reviews': list.sort((a,b)=>b.reviews-a.reviews); break;
    case 'spots': list.sort((a,b)=>a.spotsLeft-b.spotsLeft); break;
  }

  document.getElementById('resultCount').textContent=list.length;
  const grid=document.getElementById('toursGrid');

  if(!list.length){
    grid.innerHTML=`<div class="empty"><div class="empty-emoji">🌍</div><div class="empty-title">No experiences found</div><div class="empty-sub">Try different filters or search terms</div><button class="empty-reset" onclick="resetAll()">Clear all filters</button></div>`;
    return;
  }

  const badgeMap={
    urgent:{cls:'badge-urgent',dot:'🔴'},
    soon:{cls:'badge-soon',dot:'🟡'},
    open:{cls:'badge-open',dot:'🟢'},
    full:{cls:'badge-full',dot:'⚫'},
  };
  const urgencyPct=(t)=>t.spotsLeft===0?0:Math.round((t.totalSpots-t.spotsLeft)/t.totalSpots*100);
  const getStatus=(t)=>{
    if(t.spotsLeft===0) return {key:'full',label:'Fully booked'};
    if(t.spotsLeft<=2) return {key:'urgent',label:`🔴 ${t.spotsLeft} spot${t.spotsLeft>1?'s':''} left`};
    if(t.spotsLeft<=4) return {key:'soon',label:`${t.spotsLeft} spots left`};
    return {key:'open',label:'Open for booking'};
  };
  const fillCls={urgent:'fill-urgent',soon:'fill-soon',open:'fill-open',full:'fill-open'};

  grid.innerHTML=list.map((t,i)=>{
    const isFree=t.price===0;
    const isSaved=_favs.includes(t.id);
    const st=getStatus(t);
    const pct=urgencyPct(t);
    return `<div class="tour-card" onclick="openModal('${t.id}')" style="transition-delay:${Math.min(i*45,350)}ms;" tabindex="0" data-id="${t.id}">
      <div class="tc-img">
        <img src="${t.img}" alt="${t.name}" loading="lazy"/>
        <div class="tc-overlay"></div>
        <div class="tc-badge ${badgeMap[st.key].cls}">${st.label}</div>
        <button class="tc-fav${isSaved?' saved':''}" onclick="event.stopPropagation();toggleFav(this,'${t.id}')" aria-label="Save">${isSaved?'♥':'♡'}</button>
        <div class="tc-rating">★ ${t.rating} <span style="opacity:.45;">(${t.reviews.toLocaleString()})</span></div>
        <div class="tc-urgency"><div class="tc-urgency-fill ${fillCls[st.key]}" style="width:${pct}%"></div></div>
      </div>
      <div class="tc-body">
        <div class="tc-cat">${t.cat.charAt(0).toUpperCase()+t.cat.slice(1)} · ${t.dest.replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}</div>
        <div class="tc-name">${t.name}</div>
        <div class="tc-meta">
          <span class="tc-pill">⏱ ${t.dur}</span>
          <span class="tc-pill">👥 ${t.group}</span>
          ${t.spotsLeft<=3&&t.spotsLeft>0?`<span class="tc-pill hot">🔴 Only ${t.spotsLeft} left</span>`:''}
        </div>
        <div class="tc-foot">
          <div>
            <div class="tc-price-note">${isFree?'Pay what you want':'From'}</div>
            <div class="tc-price-val${isFree?' free':''}">${isFree?'Free':'KES '+t.price.toLocaleString()}</div>
            ${!isFree?`<div class="tc-price-per">/person</div>${t.deposit?`<div class="tc-deposit">Deposit: KES ${t.deposit.toLocaleString()}</div>`:''}`:``}
          </div>
          <button class="tc-cta${!isFree&&t.spotsLeft<=3?' deposit-btn':''}" onclick="event.stopPropagation();openModal('${t.id}')">
            ${isFree?'Reserve spot':t.spotsLeft<=3&&t.spotsLeft>0?'Pay deposit':'Book now'}
          </button>
        </div>
      </div>
    </div>`;
  }).join('');

  // stagger animation
  requestAnimationFrame(()=>{
    document.querySelectorAll('.tour-card').forEach((c,i)=>setTimeout(()=>c.classList.add('in'),i*40));
  });
}

function resetAll(){
  _filter='all';
  document.getElementById('searchInput').value='';
  document.getElementById('destSel').value='';
  document.querySelectorAll('.fchip').forEach(c=>c.classList.remove('on'));
  document.querySelector('.fchip').classList.add('on');
  render();
}

/* ── FAV ── */
function toggleFav(btn,id){
  const idx=_favs.indexOf(id);
  if(idx>-1){_favs.splice(idx,1);btn.classList.remove('saved');btn.textContent='♡';}
  else{_favs.push(id);btn.classList.add('saved');btn.textContent='♥';}
  savFavs(); showToast(idx>-1?'Removed from wishlist':'Saved ♥');
}

/* ── MODAL ── */
function openModal(id){
  const t=TOURS.find(x=>x.id===id);
  if(!t)return;
  const isFree=t.price===0;
  const isSaved=_favs.includes(t.id);
  const st=getStatus2(t);
  document.getElementById('modalBox').innerHTML=`
    <div class="modal-img">
      <img src="${t.img}" alt="${t.name}"/>
      <div class="modal-img-grad"></div>
      <button class="modal-close" onclick="closeModal()"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
    </div>
    <div class="m-body">
      <div class="m-eyebrow">${t.cat.charAt(0).toUpperCase()+t.cat.slice(1)} · ${t.dest.replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}</div>
      <div class="m-title">${t.name}</div>
      <div class="m-quick">
        <div class="mq"><div class="mq-lbl">Duration</div><div class="mq-val">${t.dur}</div></div>
        <div class="mq"><div class="mq-lbl">Group</div><div class="mq-val">${t.group}</div></div>
        <div class="mq"><div class="mq-lbl">Rating</div><div class="mq-val" style="color:var(--gold)">★ ${t.rating} <span style="font-size:11px;color:var(--ink-ghost)">(${t.reviews.toLocaleString()})</span></div></div>
      </div>
      ${t.spotsLeft>0&&t.spotsLeft<=4?`<div class="m-alert"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><p>Only ${t.spotsLeft} spot${t.spotsLeft>1?'s':''} remaining — this ${t.spotsLeft<=2?'departure is almost full':'tour is selling fast'}</p></div>`:''}
      <div class="m-desc">${t.desc}</div>
      ${t.itinerary?`<div class="m-section-h">What you'll do</div><div class="m-itinerary">${t.itinerary.map((s,i)=>`<div class="m-stop"><div class="m-stop-n">${i+1}</div><div class="m-stop-t">${s}</div></div>`).join('')}</div>`:''}
      ${t.includes?`<div class="m-section-h" style="margin-top:18px">What's included</div><div class="m-includes">${t.includes.map(x=>`<div class="m-inc"><svg class="m-check" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>${x}</div>`).join('')}</div>`:''}
      <div class="m-cta">
        <div class="m-cta-top">
          <div>
            <div class="m-price-lbl">${isFree?'This tour is free':'Starting from'}</div>
            <span class="m-price-val${isFree?' free':''}">${isFree?'Free':'KES '+t.price.toLocaleString()}</span>
            ${!isFree?`<span class="m-price-per"> /person</span>`:''}
            ${!isFree&&t.deposit?`<div class="m-deposit-note">30% deposit = KES ${t.deposit.toLocaleString()} secures your spot</div>`:''}
          </div>
          <div class="m-rating">★ <strong>${t.rating}</strong><br><span style="font-size:11px">${t.reviews.toLocaleString()} reviews</span></div>
        </div>
        <div class="m-btns">
          <button class="m-btn-book${!isFree&&t.spotsLeft<=3?' deposit':''}" onclick="bookNow('${t.id}')">${isFree?'Reserve a spot':t.spotsLeft<=3&&t.spotsLeft>0?'Pay deposit — secure your spot':'Book this tour'}</button>
          <button class="m-btn-save${isSaved?' saved':''}" onclick="toggleFavModal(this,'${t.id}')">${isSaved?'♥':'♡'}</button>
        </div>
      </div>
    </div>`;
  document.getElementById('modalOverlay').classList.add('open');
  document.body.style.overflow='hidden';
}
function getStatus2(t){
  if(t.spotsLeft===0)return{key:'full',label:'Fully booked'};
  if(t.spotsLeft<=2)return{key:'urgent',label:`Only ${t.spotsLeft} spot${t.spotsLeft>1?'s':''} left`};
  if(t.spotsLeft<=4)return{key:'soon',label:`${t.spotsLeft} spots left`};
  return{key:'open',label:'Open for booking'};
}
function closeModal(){document.getElementById('modalOverlay').classList.remove('open');document.body.style.overflow='';}
function toggleFavModal(btn,id){
  const idx=_favs.indexOf(id);
  if(idx>-1){_favs.splice(idx,1);btn.classList.remove('saved');btn.textContent='♡';}
  else{_favs.push(id);btn.classList.add('saved');btn.textContent='♥';}
  savFavs(); showToast(idx>-1?'Removed from wishlist':'Saved ♥');
  const card=document.querySelector(`[data-id="${id}"] .tc-fav`);
  if(card){card.classList.toggle('saved',idx===-1);card.textContent=idx===-1?'♥':'♡';}
}
function bookNow(id){
  const t=TOURS.find(x=>x.id===id);
  window.open(`https://wa.me/254796818671?text=${encodeURIComponent(`Hi Wildbosses! I'd like to book "${t?.name||'a tour'}". Please send booking details.`)}`, '_blank');
}

/* ── TOAST ── */
function showToast(m){if(window.wbToast)window.wbToast(m);}

/* ── INIT ── */
render();
// Read URL params
(()=>{
  const p=new URLSearchParams(location.search);
  const cat=p.get('cat'), dest=p.get('dest');
  if(cat){const el=document.querySelector(`.fchip[onclick*="'${cat}'"]`);if(el)setFilter(cat,el);}
  if(dest){document.getElementById('destSel').value=dest;render();}
})();

