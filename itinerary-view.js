(() => {
  const C=()=>window.KTBSContext||{};
  const esc=v=>C().esc?C().esc(v):String(v??'');
  const dateLabel=v=>v?new Date(v+'T12:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'}):'Dates to be confirmed';
  const clientName=id=>(C().cache?.clients||[]).find(x=>x.id===id)?.name||'Guest';
  const bookingName=id=>(C().cache?.bookings||[]).find(x=>x.id===id)?.booking_no||'';
  const splitActivities=value=>String(value||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  const timeAndText=line=>{
    const m=line.match(/^((?:\d{1,2}(?::\d{2})?\s?(?:AM|PM)?|\d{1,2}:\d{2}))\s*(?:\||·|—|–|-)\s*(.+)$/i);
    return m?{time:m[1],text:m[2]}:{time:'',text:line};
  };
  async function signed(path){
    const r=await C().sb.storage.from('itinerary-images').createSignedUrl(path,3600);
    return r.error?'':r.data?.signedUrl||'';
  }
  window.viewItinerary=async function(id){
    const r=await C().sb.from('itineraries').select('*').eq('id',id).single();
    if(r.error)return alert('Could not open itinerary: '+r.error.message);
    const item=r.data,days=Array.isArray(item.days)?item.days:[];
    const allPaths=days.flatMap(d=>(Array.isArray(d.images)?d.images:[]));
    const urls={};
    await Promise.all(allPaths.map(async p=>{urls[p]=await signed(p);}));
    const cover=days.flatMap(d=>(d.images||[])).find(p=>urls[p])||'';
    const overlay=document.createElement('div');
    overlay.className='ktbs-itinerary-view';
    overlay.innerHTML='<div class="ktbs-itinerary-toolbar"><button type="button" class="secondary" data-close>← Back to itineraries</button><div><button type="button" class="secondary" data-print>Print / Save PDF</button><button type="button" class="primary" data-close>Close Preview</button></div></div>'+
      '<article class="ktbs-itinerary-document">'+
      '<header class="ktbs-itinerary-cover" '+(cover?'style="background-image:linear-gradient(90deg,rgba(3,42,47,.84),rgba(3,42,47,.15)),url(&quot;'+esc(urls[cover])+'&quot;)"':'')+'>'+
      '<div class="ktbs-itinerary-brand"><img src="kulu-logo.png" alt="Kulu Travels"><span>KULU TRAVELS <i>SEAMLESS TRAVEL</i></span></div>'+
      '<div class="ktbs-itinerary-cover-copy"><span class="ktbs-itinerary-kicker">YOUR JOURNEY, BEAUTIFULLY CURATED</span><h1>'+esc(item.title||'Your Journey')+'</h1><p>'+esc(item.destination||'')+'</p><div class="ktbs-itinerary-meta"><span>'+esc(dateLabel(item.start_date))+' – '+esc(dateLabel(item.end_date))+'</span><span>'+days.length+' DAYS</span></div></div></header>'+
      '<section class="ktbs-itinerary-intro"><span class="ktbs-itinerary-kicker">A NOTE FROM KULU TRAVELS</span><h2>Every journey deserves to be extraordinary.</h2><p>'+esc(item.introduction||'We are delighted to share your travel itinerary. Each detail has been thoughtfully planned to help you make the most of every moment.')+'</p><div class="ktbs-itinerary-client"><span>PREPARED FOR</span><strong>'+esc(clientName(item.client_id))+'</strong>'+(bookingName(item.booking_id)?'<small>Booking '+esc(bookingName(item.booking_id))+'</small>':'')+'</div></section>'+
      '<section class="ktbs-itinerary-days"><div class="ktbs-itinerary-section-head"><span class="ktbs-itinerary-kicker">THE EXPERIENCE</span><h2>Your journey at a glance</h2></div>'+
      (days.length?days.map((d,i)=>{
        const images=(d.images||[]).filter(p=>urls[p]).map(p=>'<img src="'+esc(urls[p])+'" alt="Day '+(i+1)+' experience">').join('');
        const activities=splitActivities(d.activities);
        const timeline=activities.length?'<div class="ktbs-itinerary-timeline">'+activities.map(line=>{const a=timeAndText(line);return '<div class="ktbs-itinerary-stop">'+(a.time?'<time>'+esc(a.time)+'</time>':'<time class="ktbs-time-dot">•</time>')+'<p>'+esc(a.text)+'</p></div>';}).join('')+'</div>':'<p class="ktbs-itinerary-muted">Activities and timings will be shared in your final travel plan.</p>';
        return '<section class="ktbs-itinerary-day"><div class="ktbs-day-label"><span>DAY '+String(i+1).padStart(2,'0')+'</span><small>'+esc(dateLabel(d.date))+'</small></div><div class="ktbs-day-content"><h3>'+esc(d.title||('Day '+(i+1)))+'</h3>'+(d.description?'<p class="ktbs-day-overview">'+esc(d.description)+'</p>':'')+timeline+(images?'<div class="ktbs-day-gallery">'+images+'</div>':'')+'</div></section>';
      }).join(''):'<p class="ktbs-itinerary-muted">No day details have been added yet.</p>')+
      '</section><footer class="ktbs-itinerary-footer"><span>KULU TRAVELS</span><h2>Travel beautifully. Travel seamlessly.</h2><p>Thank you for choosing Kulu Travels to be part of your journey.</p></footer></article>';
    document.body.appendChild(overlay);
    const close=()=>overlay.remove();
    overlay.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',close));
    overlay.querySelector('[data-print]').addEventListener('click',()=>window.print());
    overlay.addEventListener('keydown',e=>{if(e.key==='Escape')close();});
  };
})();