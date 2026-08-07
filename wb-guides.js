/* Wildbosses guides page */

const GUIDES=[
  {id:1,name:'James Mwangi',init:'J',loc:'Nairobi, Kenya',role:'City & Cultural Guide',specialty:['walking','culture'],exp:15,rating:4.96,reviews:1240,tours:['Nairobi City Walking Tour','Nairobi After Dark Walk','Markets Deep Dive'],bio:'Born and raised in Westlands, James has guided in Nairobi CBD for 15 years. His encyclopaedic knowledge of the city\'s history and architecture has been featured in Lonely Planet and The Guardian Travel. He speaks fluent Swahili, English and French.',langs:['EN','SW','FR'],certs:['Kenya Tourism Board','GuruWalk Elite 2025'],cover:'https://images.unsplash.com/photo-1611348524140-53c9a25263d6?w=800&q=80',
  reviews:[{text:'James knows every doorway, every story, every face. An absolute maestro.',author:'Sophie R., London',stars:5},{text:'Booked James twice. Will keep coming back every time I visit Nairobi.',author:'Luca M., Milan',stars:5}]},
  {id:2,name:'Grace Wanjiku',init:'G',loc:'Naivasha / Amboseli',role:'Wildlife Safari & Photography',specialty:['safari','photo'],exp:12,rating:4.95,reviews:891,tours:['Amboseli Elephants Safari','Mara Photography Drive','Hell Gate Day Trip'],bio:'Former Kenya Wildlife Service ranger, Grace has spent 12 years tracking wildlife across Kenya\'s major parks. Her photography safari expertise is unmatched — she knows where every leopard hides before dawn.',langs:['EN','SW'],certs:['KWS Certified Guide','National Geographic Partner'],cover:'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=800&q=80',
  reviews:[{text:'Grace positioned us for the most incredible leopard shot I have ever taken.',author:'Amara J., Toronto',stars:5},{text:'Her knowledge of the Amboseli elephant families is genuinely scientific.',author:'Felix H., Berlin',stars:5}]},
  {id:3,name:'Ali Hassan',init:'A',loc:'Zanzibar, Tanzania',role:'Cultural Immersion Specialist',specialty:['culture','walking'],exp:10,rating:4.91,reviews:623,tours:['Stone Town & Spice Farm','Zanzibar Dhow Sail','Jozani Forest Walk'],bio:'Born in Stone Town to a family of dhow sailors, Ali speaks Swahili, Arabic, English and Italian. He leads immersive cultural walks through UNESCO-listed Stone Town and spice farms that engage every sense.',langs:['EN','SW','AR','IT'],certs:['Tanzania Tourism Board','Stone Town Heritage Guide'],cover:'https://images.unsplash.com/photo-1516117172878-fd2c41f4a759?w=800&q=80',
  reviews:[{text:'Ali brought every alley and carved door to life with stories his grandfather told him.',author:'Priya R., Singapore',stars:5},{text:'The spice farm was extraordinary — vanilla, cloves and cinnamon growing wild.',author:'Daniel O., Lagos',stars:5}]},
  {id:4,name:'Ismael Nzioka',init:'I',loc:'Nairobi, Kenya',role:'Naturalist & Birding Expert',specialty:['walking','birding'],exp:7,rating:4.98,reviews:156,tours:['Karura Forest Walk','Nairobi Dawn Bird Walk','Ngong Hills Trail'],bio:'A passionate ornithologist, Ismael has documented 387 bird species in Nairobi alone. His Karura Forest walk holds a near-perfect 4.98 rating. He holds a Kenya Birding Guide certification and a naturalist certificate from KWS.',langs:['EN','SW'],certs:['Kenya Birding Guide','KWS Naturalist Certificate'],cover:'https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&q=80',
  reviews:[{text:'Ismael spotted a Hartlaub\'s Turaco from 80m. I barely knew what I was looking for.',author:'Sarah K., London',stars:5},{text:'A secret world inside Nairobi that most Nairobians don\'t know. The waterfall alone is worth it.',author:'Mohammed A., Dubai',stars:5}]},
  {id:5,name:'Felix Massawe',init:'F',loc:'Moshi, Tanzania',role:'Mountain Guide — Kilimanjaro',specialty:['mountain'],exp:18,rating:4.94,reviews:389,tours:['Kilimanjaro Marangu Route 6D','Kilimanjaro Lemosho 8D','Mt Meru 4D'],bio:'Summit success rate of 89% on Kilimanjaro — the highest of any independent guide registered with KINAPA. Felix has led over 400 successful ascents and written a wilderness first aid manual for altitude mountaineering.',langs:['EN','SW','DE'],certs:['KINAPA Certified Mountain Guide','Wilderness First Aid Instructor'],cover:'https://images.unsplash.com/photo-1519923834699-ef0b7cde4712?w=800&q=80',
  reviews:[{text:'Felix got me to Uhuru Peak when I was ready to turn back at Stella Point. Life-changing.',author:'Yuki T., Tokyo',stars:5},{text:'His altitude knowledge is almost medical. I felt completely safe throughout.',author:'Marcus B., Cape Town',stars:5}]},
  {id:6,name:'Omar Salim',init:'O',loc:'Diani Beach, Kenya',role:'Marine & Dhow Specialist',specialty:['marine','walking'],exp:14,rating:4.85,reviews:298,tours:['Diani Dhow Sunset Cruise','Wasini Island & Kisite','Diani Snorkel & Beach'],bio:'Third-generation fisherman and PADI-certified dive master, Omar leads the finest dhow experiences on the Kenyan Coast. His family has sailed these waters for 80 years.',langs:['EN','SW','AR'],certs:['PADI Divemaster','Kenya Coast Tourism Authority'],cover:'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&q=80',
  reviews:[{text:'The dolphins surfed the dhow\'s bow wave for 20 minutes. Omar knew exactly where they\'d be.',author:'Clara F., Barcelona',stars:5},{text:'Family trip with three kids. Omar was brilliant with them. Absolute gem.',author:'Paul D., Sydney',stars:5}]},
  {id:7,name:'Njoro Gitau',init:'N',loc:'Masai Mara, Kenya',role:'Photography Safari Guide',specialty:['safari','photo'],exp:10,rating:5.0,reviews:78,tours:['Mara Photography Safari','Big Five Private Drive'],bio:'Wildlife photographer and guide with National Geographic exhibition credits. Njoro\'s photography safaris are designed around golden-hour light and predator behaviour patterns. Maximum 4 guests per vehicle, always.',langs:['EN','SW'],certs:['KPSGA Member','National Geographic Certified'],cover:'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=800&q=80',
  reviews:[{text:'5/5 is not enough. Njoro sees the bush differently. My shots look like magazine covers.',author:'Anna L., Stockholm',stars:5},{text:'A cheetah family hunting sequence at 6am. Still the best morning of my life.',author:'Kenji M., Osaka',stars:5}]},
  {id:8,name:'Emmanuel Maro',init:'E',loc:'Arusha, Tanzania',role:'Serengeti Safari Specialist',specialty:['safari'],exp:20,rating:4.97,reviews:556,tours:['Serengeti Migration 4 Days','Ngorongoro Crater Day','Tarangire Elephants'],bio:'Born into a Maasai family on the edge of the Serengeti, Emmanuel has tracked the Great Migration for 20 years. His ability to read wildebeest and predator behaviour borders on the supernatural.',langs:['EN','SW'],certs:['TWMA Certified','Arusha Safari Guides Association'],cover:'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800&q=80',
  reviews:[{text:'We saw 3 river crossings in one day. Emmanuel had tracked the column for hours to position us.',author:'Carlos R., Madrid',stars:5},{text:'20 years of knowledge in every sentence. The definitive Serengeti guide.',author:'Helen T., Melbourne',stars:5}]},
];

let _filter='all';
function setFilter(k,el){_filter=k;document.querySelectorAll('.fchip').forEach(c=>c.classList.remove('on'));el.classList.add('on');render();}

function render(){
  const q=(document.getElementById('searchInput')?.value||'').toLowerCase();
  const sort=document.getElementById('sortSel')?.value||'rating';
  let list=GUIDES.filter(g=>{
    const matchSpec=_filter==='all'||g.specialty.includes(_filter);
    const matchQ=!q||g.name.toLowerCase().includes(q)||g.loc.toLowerCase().includes(q)||g.role.toLowerCase().includes(q)||g.bio.toLowerCase().includes(q);
    return matchSpec&&matchQ;
  });
  switch(sort){
    case 'rating':list.sort((a,b)=>b.rating-a.rating);break;
    case 'reviews':list.sort((a,b)=>b.reviews-a.reviews);break;
    case 'experience':list.sort((a,b)=>b.exp-a.exp);break;
  }
  document.getElementById('resultCount').textContent=list.length;
  const grid=document.getElementById('guideGrid');
  grid.innerHTML=list.map((g,i)=>`
    <div class="guide-card" onclick="openDrawer(${g.id})" style="transition-delay:${Math.min(i*40,320)}ms" tabindex="0" role="button">
      <div class="gc-cover">
        <img src="${g.cover}" alt="${g.name}" loading="lazy"/>
        <div class="gc-cover-grad"></div>
        <div class="gc-verified"><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>Verified</div>
      </div>
      <div class="gc-body">
        <div class="gc-header">
          <div class="gc-avatar">${g.init}</div>
          <div class="gc-langs">${g.langs.map(l=>`<span class="gc-lang">${l}</span>`).join('')}</div>
        </div>
        <div class="gc-name">${g.name}</div>
        <div class="gc-role"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/></svg>${g.loc}<span class="gc-role-dot"></span>${g.exp} yrs</div>
        <div class="gc-rating"><span class="gc-stars">${'★'.repeat(Math.round(g.rating)).slice(0,5)}</span><span class="gc-rating-num">${g.rating}</span><span class="gc-reviews">(${g.reviews.toLocaleString()})</span></div>
        <div class="gc-bio">${g.bio}</div>
        <div class="gc-specs">${g.specialty.map(s=>`<span class="gc-spec">${s.charAt(0).toUpperCase()+s.slice(1)}</span>`).join('')}${g.certs.slice(0,1).map(c=>`<span class="gc-spec" style="color:var(--forest);border-color:rgba(11,61,32,.18);background:rgba(11,61,32,.06)">${c}</span>`).join('')}</div>
        <div class="gc-foot">
          <div class="gc-count"><strong>${g.tours.length}</strong> tours</div>
          <button class="gc-btn">View profile</button>
        </div>
      </div>
    </div>`).join('');
  requestAnimationFrame(()=>document.querySelectorAll('.guide-card').forEach((c,i)=>setTimeout(()=>c.classList.add('in'),i*35)));
}

function openDrawer(id){
  const g=GUIDES.find(x=>x.id===id);
  if(!g)return;
  document.getElementById('drawer').innerHTML=`
    <div class="dr-cover">
      <img src="${g.cover}" alt="${g.name}"/>
      <div class="dr-cover-grad"></div>
      <button class="dr-close" onclick="closeDrawer()"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
    </div>
    <div class="dr-body">
      <div class="dr-header">
        <div class="dr-avatar">${g.init}</div>
        <div>
          <div class="dr-name">${g.name}</div>
          <div class="dr-meta">${g.loc} · ${g.exp} years experience</div>
          <div class="dr-badge"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>Verified Wildbosses Guide</div>
        </div>
      </div>
      <div class="dr-stats">
        <div class="ds"><div class="ds-num gold">★ ${g.rating}</div><div class="ds-lbl">Rating</div></div>
        <div class="ds"><div class="ds-num">${g.reviews.toLocaleString()}</div><div class="ds-lbl">Reviews</div></div>
        <div class="ds"><div class="ds-num">${g.tours.length}</div><div class="ds-lbl">Tours</div></div>
      </div>
      <div class="dr-section">
        <div class="dr-section-h">About ${g.name.split(' ')[0]}</div>
        <div class="dr-bio">${g.bio}</div>
      </div>
      <div class="dr-section">
        <div class="dr-section-h">Tours led by ${g.name.split(' ')[0]}</div>
        <div class="dr-tours">${g.tours.map((t,i)=>`
          <div class="dr-tour-item" onclick="window.location.href='tours.html'">
            <div class="dr-tour-ico">${['🗺','🦁','🏔','🌊','🎭','📷'][i%6]}</div>
            <div><div class="dr-tour-name">${t}</div><div class="dr-tour-meta">Click to view & book</div></div>
            <svg style="margin-left:auto;flex-shrink:0;color:var(--forest)" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M7 17 17 7M7 7h10v10"/></svg>
          </div>`).join('')}
        </div>
      </div>
      <div class="dr-section">
        <div class="dr-section-h">What guests say</div>
        <div class="dr-reviews">${g.reviews.map(r=>`
          <div class="dr-review">
            <div class="dr-review-stars">${'★'.repeat(r.stars)}</div>
            <div class="dr-review-text">"${r.text}"</div>
            <div class="dr-review-author">— ${r.author}</div>
          </div>`).join('')}
        </div>
      </div>
      <div class="dr-section">
        <div class="dr-section-h">Languages & Certifications</div>
        <div class="dr-tags">${g.langs.map(l=>`<span class="dr-tag">${l}</span>`).join('')}${g.certs.map(c=>`<span class="dr-tag" style="background:rgba(11,61,32,.07)">${c}</span>`).join('')}</div>
      </div>
    </div>
    <div class="dr-cta">
      <div class="dr-cta-btns">
        <button class="dr-cta-primary" onclick="window.location.href='tours.html'">See tours by ${g.name.split(' ')[0]}</button>
        <button class="dr-cta-wa" onclick="window.open('https://wa.me/254796818671?text='+encodeURIComponent('Hi! I\'d like to enquire about tours with ${g.name}.'),'_blank')">WhatsApp</button>
      </div>
    </div>`;
  document.getElementById('drawerOverlay').classList.add('open');
  document.getElementById('drawer').classList.add('open');
  document.body.style.overflow='hidden';
}
function closeDrawer(){document.getElementById('drawerOverlay').classList.remove('open');document.getElementById('drawer').classList.remove('open');document.body.style.overflow='';}
function showToast(m){if(window.wbToast)window.wbToast(m);}
render();

