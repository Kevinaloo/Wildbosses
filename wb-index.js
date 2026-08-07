/* Wildbosses index page */

/* ── COUNTDOWNS (hero card + section) ── */
var DEADLINE=new Date('2026-08-13T23:59:00+03:00');
function pad(n){return String(Math.floor(n)).padStart(2,'0');}
function ticks(){
  var d=DEADLINE-new Date();if(d<0)d=0;
  var IDs=[['hcD','cdD'],['hcH','cdH'],['hcM','cdM'],['hcS','cdS']];
  var vals=[d/864e5,(d%864e5)/36e5,(d%36e5)/6e4,(d%6e4)/1e3];
  IDs.forEach(function(pair,i){
    pair.forEach(function(id){var el=document.getElementById(id);if(el)el.textContent=pad(vals[i]);});
  });
}
ticks(); setInterval(ticks,1000);

/* ── NAV scroll ── */
var nav=document.getElementById('nav');
window.addEventListener('scroll',function(){nav.classList.toggle('scrolled',window.scrollY>50);},{passive:true});

/* ── Mobile menu ── */
function openMM(){document.getElementById('mm').classList.add('open');document.body.style.overflow='hidden';}
function closeMM(){document.getElementById('mm').classList.remove('open');document.body.style.overflow='';}

/* ── Stars ── */
var sc=document.getElementById('heroStars');
for(var i=0;i<65;i++){
  var s=document.createElement('div');s.className='star';
  var sz=Math.random()*2+.6;
  s.style.cssText='width:'+sz+'px;height:'+sz+'px;top:'+Math.random()*100+'%;left:'+Math.random()*100+'%;animation-duration:'+(2+Math.random()*4.5)+'s;animation-delay:'+Math.random()*5+'s;';
  sc.appendChild(s);
}

/* ── Marquee ── */
var MQ=['🦁 Big Five Safari','🏔 Kilimanjaro Trek','🌊 Diani Dhow Cruise','🐘 Amboseli Elephants','🚴 Hell Gate Cycling','🏝 Zanzibar Spice Tour','🦏 Ol Pejeta Rhinos','🐆 Serengeti Migration','🦅 Nakuru Flamingos','🌋 Mount Kenya Climb','🤿 Watamu Marine Park','🏛 Nairobi City Walk'];
var tr=document.getElementById('mqTrack');
var db=[...MQ,...MQ];
tr.innerHTML=db.map(function(x){return'<div class="mq-item"><span class="mq-gem"></span>'+x+'</div>';}).join('');

/* ── Tags ── */
function pickTag(el,dest){
  document.querySelectorAll('.htag').forEach(function(t){t.classList.remove('on');});
  el.classList.add('on');
  var sel=document.getElementById('selDest');
  if(sel)sel.value=dest;
}
function syncTag(){
  var v=document.getElementById('selDest').value;
  document.querySelectorAll('.htag').forEach(function(t){
    t.classList.toggle('on',t.getAttribute('onclick')&&t.getAttribute('onclick').indexOf("'"+v+"'")>-1);
  });
}

/* ── Search ── */
function doSearch(){
  var dest=document.getElementById('selDest').value;
  window.location.href='tours.html'+(dest?'?dest='+encodeURIComponent(dest):'');
}

/* ── TOURS DATA ── */
var TOURS=[
  {id:'migration',cat:'Safari',dest:'Masai Mara',img:'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=700&q=80',name:'Masai Mara Great Migration Safari — 7 Days',dur:'7 days · 6 nights',group:'Max 8',rating:4.98,reviews:156,price:95000,deposit:28500,spots:2,total:8,
   tags:['Great Migration','Private 4×4','Luxury Camp','Big Five'],badge:'urgent',badgeLabel:'🔴 2 spots left',
   desc:'The greatest wildlife spectacle on earth. 1.5 million wildebeest crossing the Mara River, predators in pursuit, private vehicle at first light. Six nights luxury tented camp, full board, guided morning and evening drives.',
   includes:['All park & conservancy fees','Luxury tented camp × 6 nights','Full board throughout','Private 4×4 + expert guide','All internal transfers','Sundowners daily'],
   itinerary:['Day 1: Nairobi → Masai Mara, afternoon drive','Days 2–6: Full-day game drives, migration tracking','Day 5: Maasai village + cultural dinner','Day 7: Morning drive, return Nairobi']},
  {id:'mara-big5',cat:'Safari',dest:'Masai Mara',img:'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=700&q=80',name:'Masai Mara Big Five Game Drive',dur:'Full day · 10h',group:'Max 6',rating:4.97,reviews:312,price:12500,deposit:3750,spots:3,total:6,
   tags:['Big Five','Private 4×4','Sunrise Start','Bush Lunch'],badge:'soon',badgeLabel:'3 spots left',
   desc:'A private sunrise game drive through the Mara Triangle. We track lion, elephant, leopard, buffalo and rhino. Lunch in the bush, sundowner on the plains.',
   includes:['Private 4×4 + guide','Park entry fees','Bush lunch & drinks','Sundowner','Return Nairobi transfer'],
   itinerary:['3:30am — Nairobi pickup','6am — Enter Mara at golden hour','Morning — Big Five tracking','12pm — Bush lunch','5:30pm — Sundowner','7pm — Return']},
  {id:'nairobi-walk',cat:'Walking',dest:'Nairobi',img:'https://images.unsplash.com/photo-1611348524140-53c9a25263d6?w=700&q=80',name:'Nairobi City Walking Tour',dur:'2h 30m',group:'Max 16',rating:4.96,reviews:1240,price:0,deposit:0,spots:12,total:16,
   tags:['History','Culture','Markets','Parliament'],badge:'open',badgeLabel:'Daily departures',
   desc:'Nairobi\'s essential walk. Parliament, KICC, Jamia Mosque, City Market, August 7th Memorial and Maasai Market — led by our resident city guide.',
   includes:['Expert Wildbosses guide','Walking route map','Photography stops','Maasai Market visit'],
   itinerary:['9am — Dedan Kimathi Statue','9:30am — Parliament & KICC','10am — Jamia Mosque & City Market','10:30am — August 7th Memorial','11am — Maasai Market']},
  {id:'amboseli',cat:'Safari',dest:'Amboseli',img:'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=700&q=80',name:'Amboseli Elephants & Kilimanjaro Views',dur:'2 days · 1 night',group:'Max 8',rating:4.93,reviews:412,price:28000,deposit:8400,spots:3,total:8,
   tags:['Elephants','Kilimanjaro','Overnight','Photography'],badge:'soon',badgeLabel:'3 spots left',
   desc:'The most photogenic safari in Kenya. Elephant herds crossing the Amboseli flats with Kilimanjaro above them at dawn. Overnight in a classic tented camp at the park boundary.',
   includes:['Return Nairobi transfer','All park fees','Tented camp × 1 night','Full board × 2 days','Sunrise & sunset drives'],
   itinerary:['Day 1: Nairobi → Amboseli, afternoon game drive, overnight camp','Day 2: Pre-dawn Kilimanjaro sunrise, brunch, return']},
  {id:'zanzibar',cat:'Culture',dest:'Zanzibar',img:'https://images.unsplash.com/photo-1516117172878-fd2c41f4a759?w=700&q=80',name:'Zanzibar Stone Town & Spice Farm',dur:'Full day · 8h',group:'Max 12',rating:4.91,reviews:623,price:9500,deposit:2850,spots:8,total:12,
   tags:['UNESCO','Spices','History','Seafood Lunch'],badge:'open',badgeLabel:'Open for booking',
   desc:'Arab architecture, carved doors, Swahili cuisine. The spice farm awakens every sense. We finish with a seafood lunch and a dhow trip to Prison Island.',
   includes:['Local guide','Stone Town walk (3h)','Spice Farm','Prison Island dhow trip','Seafood lunch'],
   itinerary:['9am — Stone Town walk','12pm — Forodhani Gardens lunch','2pm — Spice Farm','4pm — Prison Island','6pm — Return']},
  {id:'kilimanjaro',cat:'Adventure',dest:'Kilimanjaro',img:'https://images.unsplash.com/photo-1519923834699-ef0b7cde4712?w=700&q=80',name:'Kilimanjaro — Marangu Route 6 Days',dur:'6 days · 5 nights',group:'Max 8',rating:4.94,reviews:389,price:185000,deposit:55500,spots:6,total:8,
   tags:['Summit 5,895m','89% Success Rate','All meals','Porters'],badge:'open',badgeLabel:'Sep 2026 departure',
   desc:'Africa\'s highest peak. Our Marangu route has an 89% summit success rate. We provide everything — porters, all meals, acclimatisation days, and a certified guide with 400+ successful summits.',
   includes:['All park & conservation fees','Hut accommodation × 5 nights','All meals on mountain','Porters × 2 per climber','Certified guide','Summit certificate'],
   itinerary:['Days 1–2: Moshi, briefing & gear','Day 3: Mandara Huts 2,720m','Day 4: Horombo Huts 3,720m','Day 5: Kibo Huts 4,700m','Day 6: Uhuru Peak 5,895m & descent']},
];

/* ── Render featured tours ── */
var favs=JSON.parse(localStorage.getItem('wb_favs')||'[]');
function savFavs(){localStorage.setItem('wb_favs',JSON.stringify(favs));}
var badgeCls={urgent:'badge-urgent',soon:'badge-soon',open:'badge-open'};

document.getElementById('featuredTours').innerHTML=TOURS.map(function(t){
  var isFree=t.price===0,isSaved=favs.indexOf(t.id)>-1;
  var isUrgent=t.spots<=2&&t.spots>0;
  return '<div class="tour-card reveal" onclick="openTourModal(\''+t.id+'\')" tabindex="0" role="button" aria-label="'+t.name+'">'+
    '<div class="tc-img">'+
      '<img src="'+t.img+'" alt="'+t.name+' — Wildbosses Kenya" loading="lazy"/>'+
      '<div class="tc-overlay"></div>'+
      '<div class="tc-badge '+badgeCls[t.badge]+'">'+t.badgeLabel+'</div>'+
      '<button class="tc-fav'+(isSaved?' saved':'')+'" onclick="event.stopPropagation();toggleFav(this,\''+t.id+'\')" aria-label="Save">'+
        (isSaved?'♥':'♡')+'</button>'+
      '<div class="tc-rating">★ '+t.rating+' <span style="opacity:.45;">('+t.reviews.toLocaleString()+')</span></div>'+
    '</div>'+
    '<div class="tc-body">'+
      '<div class="tc-cat">'+t.cat+' · '+t.dest+'</div>'+
      '<div class="tc-name">'+t.name+'</div>'+
      '<div class="tc-meta">'+
        '<span class="tc-pill">⏱ '+t.dur+'</span>'+
        '<span class="tc-pill">👥 '+t.group+'</span>'+
        (isUrgent?'<span class="tc-pill hot">🔴 '+t.spots+' spot'+(t.spots>1?'s':'')+' left</span>':'')+
      '</div>'+
      '<div class="tc-foot">'+
        '<div>'+
          '<div class="tc-price-lbl">'+(isFree?'Pay what you want':'From')+'</div>'+
          '<div class="tc-price'+(isFree?' free':'')+'">'+
            (isFree?'Free':'KES '+t.price.toLocaleString())+
          '</div>'+
          (!isFree?'<div class="tc-per">/person</div>'+(t.deposit?'<div class="tc-dep">Deposit KES '+t.deposit.toLocaleString()+'</div>':''):'')+
        '</div>'+
        '<button class="tc-cta'+(isUrgent&&!isFree?' dep':'')+'" onclick="event.stopPropagation();openTourModal(\''+t.id+'\')">'+(isFree?'Reserve spot':isUrgent?'Pay deposit':'Book now')+'</button>'+
      '</div>'+
    '</div>'+
  '</div>';
}).join('');

/* ── Favs ── */
function toggleFav(btn,id){
  var i=favs.indexOf(id);
  if(i>-1){favs.splice(i,1);btn.classList.remove('saved');btn.textContent='♡';}
  else{favs.push(id);btn.classList.add('saved');btn.textContent='♥';}
  savFavs();
  if(window.wbToast)window.wbToast(i>-1?'Removed from wishlist':'Saved to wishlist ♥');
}

/* ── Modal ── */
function openTourModal(id){
  var t=TOURS.find(function(x){return x.id===id;});
  if(!t)return;
  var isFree=t.price===0,isSaved=favs.indexOf(t.id)>-1,isUrgent=t.spots>0&&t.spots<=4;
  document.getElementById('mBox').innerHTML=
    '<div class="m-img">'+
      '<img src="'+t.img+'" alt="'+t.name+'" loading="eager"/>'+
      '<div class="m-img-grad"></div>'+
      '<button class="m-x" onclick="closeModal()"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg></button>'+
    '</div>'+
    '<div class="m-body">'+
      '<div class="m-eye">'+t.cat+' · '+t.dest+'</div>'+
      '<div class="m-title">'+t.name+'</div>'+
      '<div class="m-quick">'+
        '<div class="mq"><div class="mq-l">Duration</div><div class="mq-v">'+t.dur+'</div></div>'+
        '<div class="mq"><div class="mq-l">Group</div><div class="mq-v">'+t.group+'</div></div>'+
        '<div class="mq"><div class="mq-l">Rating</div><div class="mq-v" style="color:#C48A00">★ '+t.rating+' <span style="font-size:10px;color:#96B09A">('+t.reviews.toLocaleString()+')</span></div></div>'+
      '</div>'+
      (isUrgent?'<div class="m-alert"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><p>Only '+t.spots+' spot'+(t.spots>1?'s':'')+' remaining — this departure is almost full</p></div>':'')+
      '<div class="m-desc">'+t.desc+'</div>'+
      (t.itinerary?'<div class="m-sh">What you\'ll do</div><div class="m-stops">'+t.itinerary.map(function(s,i){return'<div class="m-stop"><div class="m-sn">'+(i+1)+'</div><div class="m-st">'+s+'</div></div>';}).join('')+'</div>':'')+
      (t.includes?'<div class="m-sh" style="margin-top:16px">What\'s included</div><div class="m-incs">'+t.includes.map(function(x){return'<div class="m-inc"><svg class="m-chk" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>'+x+'</div>';}).join('')+'</div>':'')+
      '<div class="m-cta-box">'+
        '<div class="m-top-row">'+
          '<div>'+
            '<div class="m-plbl">'+(isFree?'This tour is free':'From')+'</div>'+
            '<span class="m-price'+(isFree?' free':'')+'">'+(isFree?'Free':'KES '+t.price.toLocaleString())+'</span>'+
            (!isFree?'<span class="m-pper"> /person</span>':'')+
            (!isFree&&t.deposit?'<div class="m-dep-note">30% deposit = KES '+t.deposit.toLocaleString()+' secures your spot</div>':'')+
          '</div>'+
          '<div class="m-rat">★ <strong>'+t.rating+'</strong><br><span>'+t.reviews.toLocaleString()+' reviews</span></div>'+
        '</div>'+
        '<div class="m-btns">'+
          '<button class="m-book'+(isUrgent&&!isFree?' dep':'')+'" onclick="bookTour(\''+t.id+'\')">'+
            (isFree?'Reserve a spot':isUrgent?'Pay deposit — secure your spot':'Book this tour')+
          '</button>'+
          '<button class="m-save'+(isSaved?' saved':'')+'" onclick="toggleFavM(this,\''+t.id+'\')">'+(isSaved?'♥':'♡')+'</button>'+
        '</div>'+
      '</div>'+
    '</div>';
  document.getElementById('mOverlay').classList.add('open');
  document.body.style.overflow='hidden';
}
function closeModal(){document.getElementById('mOverlay').classList.remove('open');document.body.style.overflow='';}
function toggleFavM(btn,id){
  var i=favs.indexOf(id);
  if(i>-1){favs.splice(i,1);btn.classList.remove('saved');btn.textContent='♡';}
  else{favs.push(id);btn.classList.add('saved');btn.textContent='♥';}
  savFavs();
  var card=document.querySelector('[data-id="'+id+'"] .tc-fav');
  if(card){card.classList.toggle('saved',i===-1);card.textContent=i===-1?'♥':'♡';}
  if(window.wbToast)window.wbToast(i>-1?'Removed from wishlist':'Saved ♥');
}
function bookTour(id){
  var t=TOURS.find(function(x){return x.id===id;});
  window.open('https://wa.me/254796818671?text='+encodeURIComponent('Hi Wildbosses! I\'d like to book "'+( t?t.name:'a tour')+'".'),'_blank');
}

/* ── Testimonials ── */
var TESTIS=[
  {n:'Sarah K.',from:'London, UK',init:'S',stars:5,tour:'Masai Mara Big Five',q:'The guide spotted a leopard kill at sunrise that no other vehicle knew about. Professional, warm and genuinely passionate. Nothing I\'ve experienced in travel comes close.'},
  {n:'Luca M.',from:'Milan, Italy',init:'L',stars:5,tour:'Nairobi City Walk',q:'The most engaging two hours I\'ve spent in any city in the world. Every building, every story, every market brought to life. I booked the Mara safari the same afternoon.'},
  {n:'Amara J.',from:'Toronto, Canada',init:'A',stars:5,tour:'Amboseli Overnight',q:'Elephants moving across the Amboseli plains with Kilimanjaro above them at dawn. I wept. Wildbosses handled every single detail perfectly. Life-changing.'},
  {n:'Felix H.',from:'Berlin, Germany',init:'F',stars:5,tour:'Zanzibar Stone Town',q:'The spice farm alone justified the entire trip. Wildbosses didn\'t just show us Stone Town — they connected us to 200 years of history through stories that felt personal.'},
  {n:'Priya R.',from:'Singapore',init:'P',stars:5,tour:'Karura Forest Walk',q:'A secret world inside Nairobi — waterfalls, monkeys, ancient caves, incredible birds. The guide knew every call. We had no idea this existed 20 minutes from our hotel.'},
  {n:'Carlos R.',from:'Madrid, Spain',init:'C',stars:5,tour:'Serengeti Migration',q:'Three river crossings in one day. The guide had tracked the wildebeest column for hours to position us perfectly. The greatest natural spectacle on earth, perfectly guided.'},
];
document.getElementById('testiGrid').innerHTML=TESTIS.map(function(t){
  return '<div class="testi-card">'+
    '<div class="testi-stars">'+'★'.repeat(t.stars)+'</div>'+
    '<div class="testi-quote">"'+t.q+'"</div>'+
    '<div class="testi-author">'+
      '<div class="testi-av">'+t.init+'</div>'+
      '<div>'+
        '<div class="testi-name">'+t.n+'</div>'+
        '<div class="testi-meta">'+t.from+' · '+t.tour+'</div>'+
      '</div>'+
    '</div>'+
  '</div>';
}).join('');

/* ── Social proof ticker ── */
var TEVENTS=[
  {init:'S',name:'Sarah K.',action:'just booked Masai Mara Big Five',time:'2 mins ago'},
  {init:'L',name:'Luca M.',action:'reserved a spot on the Migration Safari',time:'5 mins ago'},
  {init:'A',name:'Amara J.',action:'booked Amboseli Elephants & Kilimanjaro',time:'8 mins ago'},
  {init:'F',name:'Felix H.',action:'enquired about Zanzibar Stone Town',time:'11 mins ago'},
  {init:'P',name:'Priya R.',action:'left a 5★ review for Karura Forest Walk',time:'14 mins ago'},
  {init:'C',name:'Carlos R.',action:'just paid deposit on Serengeti Safari',time:'18 mins ago'},
  {init:'Y',name:'Yuki T.',action:'booked Kilimanjaro Marangu Route',time:'22 mins ago'},
];
(function(){
  var ticker=document.createElement('div');ticker.id='wb-ticker';
  ticker.innerHTML='<div class="ticker-inner" id="tInner"></div>';
  document.body.appendChild(ticker);
  var idx=0;
  function show(){
    var e=TEVENTS[idx%TEVENTS.length];idx++;
    var inner=document.getElementById('tInner');if(!inner)return;
    inner.innerHTML='<div class="ticker-card">'+
      '<div class="tick-av">'+e.init+'</div>'+
      '<div style="flex:1;min-width:0">'+
        '<div class="tick-name">'+e.name+'</div>'+
        '<div class="tick-action">'+e.action+'</div>'+
      '</div>'+
      '<div class="tick-time">'+e.time+'</div>'+
    '</div>';
    ticker.classList.add('show');
    setTimeout(function(){ticker.classList.remove('show');},4600);
  }
  setTimeout(function(){show();setInterval(show,19000);},9000);
})();

/* ── Reveal observer ── */
if('IntersectionObserver' in window){
  var ro=new IntersectionObserver(function(entries){entries.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');ro.unobserve(e.target);}});},{threshold:.07,rootMargin:'0px 0px -44px 0px'});
  document.querySelectorAll('.reveal').forEach(function(el){ro.observe(el);});
}else{document.querySelectorAll('.reveal').forEach(function(e){e.classList.add('in');});}

