(() => {
  const C=()=>window.KTBSContext||{};
  const $=id=>document.getElementById(id);
  const esc=v=>C().esc?C().esc(v):String(v??'');
  const uid=()=>crypto.randomUUID();
  const org=()=>C().organization;
  const user=()=>C().me;
  const admin=()=>C().isAdmin&&C().isAdmin();
  const dateOnly=d=>{const x=new Date(d);return x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0')};
  const localDateTime=(date,time)=>new Date(date+'T'+(time||'09:00')).toISOString();
  const dateLabel=v=>v?new Date(v+'T12:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}):'—';
  const timeLabel=v=>v?new Date(v).toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):'—';
  const clientOptions=(selected='')=>'<option value="">'+(admin()?'No client linked':'Select your assigned client')+'</option>'+(C().cache?.clients||[]).map(x=>'<option value="'+x.id+'" '+(x.id===selected?'selected':'')+'>'+esc(x.name)+' · '+esc(x.client_code||'')+'</option>').join('');
  const bookingOptions=(clientId='',selected='')=>'<option value="">No booking linked</option>'+(C().cache?.bookings||[]).filter(x=>!clientId||x.client_id===clientId).map(x=>'<option value="'+x.id+'" '+(x.id===selected?'selected':'')+'>'+esc(x.booking_no)+' · '+esc(x.destination||'')+'</option>').join('');
  async function staffOptions(selected=''){
    let rows=[];
    if(admin()){
      const r=await C().sb.rpc('admin_list_workspace_staff');
      if(!r.error){rows=(r.data||[]).filter(x=>x.active!==false && x.membership_active!==false);C().cache.profiles=rows.map(x=>({id:x.user_id||x.id,full_name:x.full_name,role:x.role,active:x.active}));}
    }else rows=[{user_id:user().id,full_name:C().profile?.full_name||'Me',active:true}];
    return rows.map(x=>{const id=x.user_id||x.id;return '<option value="'+id+'" '+(id===selected?'selected':'')+'>'+esc(x.full_name||'Staff member')+'</option>';}).join('');
  }
  function empty(text){return '<div class="empty">'+text+'</div>';}
  function scheduleTable(value,mode='preview'){
    const lines=String(value||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
    const rows=[];
    for(const line of lines){
      if(/^time\s*(?:\||\/|and)?\s*activity$/i.test(line))continue;
      const match=line.match(/^((?:(?:0?[1-9]|1[0-2]):[0-5]\d\s*[AP]M)|(?:(?:0?[1-9]|1[0-2])\s*[AP]M)|(?:[01]?\d|2[0-3]):[0-5]\d)\s*(?:[-–|]\s*)?(.+)$/i);
      if(match)rows.push({time:match[1].replace(/\s+/g,' ').toUpperCase(),activity:match[2].trim()});
      else if(rows.length && !/^(?:notes?|remarks?)\s*:/i.test(line))rows[rows.length-1].activity+=' '+line;
      else rows.push({time:'—',activity:line.replace(/^(?:notes?|remarks?)\s*:\s*/i,'')});
    }
    if(!rows.length)return '';
    return '<div class="schedule-wrap '+mode+'"><table class="schedule-table"><thead><tr><th scope="col">TIME</th><th scope="col">ACTIVITY</th></tr></thead><tbody>'+
      rows.map(row=>'<tr><td class="schedule-time">'+esc(row.time)+'</td><td class="schedule-activity">'+esc(row.activity)+'</td></tr>').join('')+
      '</tbody></table></div>';
  }
  function tableCard(title,body){return '<div class="page-card"><div class="section-head"><h3>'+title+'</h3></div>'+body+'</div>';}

  async function loadItineraries(){
    const r=await C().sb.from('itineraries').select('*').order('created_at',{ascending:false});
    if(r.error)throw r.error;return r.data||[];
  }
  window.itinerariesPage=async function(){
    const root=$('content');root.innerHTML='<div class="page-card">Loading itineraries…</div>';
    try{
      const rows=await loadItineraries();
      root.innerHTML='<div class="welcome"><div><h1>Itinerary Builder</h1><p>Create polished, day-by-day travel plans with photos and client details.</p></div><button class="primary" onclick="openItineraryEditor()">＋ New Itinerary</button></div>'+
      '<div class="toolbar"><input id="itinerarySearch" placeholder="Search itinerary, client or destination…"><select id="itineraryStatus"><option value="">All statuses</option><option>Draft</option><option>Ready</option><option>Shared</option><option>Archived</option></select></div>'+
      '<div id="itineraryList">'+renderItineraryList(rows)+'</div>';
      $('itinerarySearch').oninput=()=>filterItineraries(rows);
      $('itineraryStatus').onchange=()=>filterItineraries(rows);
    }catch(e){root.innerHTML='<div class="page-card"><h3>Could not load itineraries</h3><p>'+esc(e.message)+'</p></div>';}
  };
  function renderItineraryList(rows){
    if(!rows.length)return empty('No itineraries yet. Create your first itinerary to start planning a journey.');
    return '<div class="table-scroll"><table class="planner-table"><thead><tr><th>Itinerary</th><th>Client</th><th>Destination</th><th>Travel dates</th><th>Days</th><th>Status</th><th>Action</th></tr></thead><tbody>'+
    rows.map(x=>'<tr><td><b>'+esc(x.title)+'</b></td><td>'+esc((C().cache?.clients||[]).find(c=>c.id===x.client_id)?.name||'—')+'</td><td>'+esc(x.destination||'—')+'</td><td>'+dateLabel(x.start_date)+' – '+dateLabel(x.end_date)+'</td><td>'+((x.days||[]).length)+'</td><td>'+esc(x.status)+'</td><td><button class="link-btn" data-id="'+x.id+'" onclick="viewItinerary(this.dataset.id)">View</button> <button class="link-btn" onclick="openItineraryEditor(\''+x.id+'\')">Edit</button> <button class="link-btn" data-id="'+x.id+'" onclick="exportItineraryPdf(this.dataset.id)">Save PDF</button></td></tr>').join('')+
    '</tbody></table></div>';
  }
  window.viewItinerary=async function(id){
    try{
      const r=await C().sb.from('itineraries').select('*').eq('id',id).single();
      if(r.error)throw r.error;
      const item=r.data,days=Array.isArray(item.days)?item.days:[];
      const client=(C().cache?.clients||[]).find(x=>x.id===item.client_id);
      const booking=(C().cache?.bookings||[]).find(x=>x.id===item.booking_id);
      const imageUrls={};
      for(const path of [...(item.cover_image_path?[item.cover_image_path]:[]),...days.flatMap(day=>Array.isArray(day.images)?day.images:[])]){
        const signed=await C().sb.storage.from('itinerary-images').createSignedUrl(path,3600);
        if(!signed.error&&signed.data?.signedUrl)imageUrls[path]=signed.data.signedUrl;
      }
      const safe=v=>esc(v==null?'':String(v)).replace(/\n/g,'<br>');
      const coverPath=item.cover_image_path||days.flatMap(day=>Array.isArray(day.images)?day.images:[])[0]||null;
      const logoUrl=window.location.origin+'/kulu-logo.png';
      const coverPhoto=coverPath&&imageUrls[coverPath]?'<img src="'+imageUrls[coverPath]+'" alt="Itinerary cover" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">':'';
      const coverHtml='<section style="position:relative;isolation:isolate;overflow:hidden;min-height:640px;height:min(78vh,900px);border-radius:10px;background:linear-gradient(145deg,#073e49,#168a91);color:#fff;display:flex;flex-direction:column;justify-content:space-between;text-align:center;padding:28px 24px 38px;margin-bottom:20px">'+coverPhoto+'<div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,34,42,.2),rgba(0,39,45,.12) 42%,rgba(0,31,37,.78));z-index:0"></div><div style="position:relative;z-index:1;display:flex;justify-content:center"><img src="'+logoUrl+'" alt="Kulu Travels logo" style="width:190px;max-height:70px;object-fit:contain;filter:drop-shadow(0 2px 8px rgba(0,0,0,.2))"></div><div style="position:relative;z-index:1;margin:auto 0 0"><div style="font-size:10px;letter-spacing:3px;font-weight:700;margin-bottom:12px">YOUR JOURNEY, BEAUTIFULLY CURATED</div><h2 style="font:32px Georgia,serif;line-height:1.15;color:#fff;text-align:center;margin:0 auto 12px;max-width:650px">'+safe(item.title||'Travel Itinerary')+'</h2><div style="font-size:13px;letter-spacing:1.5px;text-transform:uppercase">'+safe(item.destination||'')+'</div><div style="font-size:11px;letter-spacing:1px;margin-top:12px">'+((item.start_date||item.end_date)?safe(dateLabel(item.start_date)+' – '+dateLabel(item.end_date)):'')+'</div></div></section>';
      const dayHtml=days.map((day,index)=>{
        const photos=(day.images||[]).filter(path=>imageUrls[path]).map(path=>'<img src="'+imageUrls[path]+'" alt="Itinerary photo" style="width:100%;max-width:320px;max-height:220px;object-fit:cover;border-radius:8px;margin:8px 8px 0 0">').join('');
        return '<section class="page-card" style="margin:12px 0;text-align:center"><div class="muted" style="font-weight:700;letter-spacing:2px">DAY '+(index+1)+'</div><h3 style="text-align:center">'+safe(day.title||('Day '+(index+1)))+'</h3>'+(day.date?'<p class="muted">'+dateLabel(day.date)+'</p>':'')+(day.description?'<p>'+safe(day.description)+'</p>':'')+scheduleTable(day.activities,'preview')+(photos?'<div style="display:flex;flex-wrap:wrap;justify-content:center">'+photos+'</div>':'')+'</section>';
      }).join('');
      C().openModal('Itinerary Preview',
        '<div class="page-card">'+coverHtml+'<div style="text-align:center"><div class="muted" style="font-weight:700;letter-spacing:2px">KULU TRAVELS · SEAMLESS TRAVEL</div><p>'+safe(item.destination)+(item.start_date||item.end_date?' · '+safe(dateLabel(item.start_date)+' – '+dateLabel(item.end_date)):'')+'</p></div><div class="grid"><div><small>Prepared for</small><br><b>'+safe(client?.name||'—')+'</b></div><div><small>Booking reference</small><br><b>'+safe(booking?.booking_no||'—')+'</b></div><div><small>Status</small><br><b>'+safe(item.status)+'</b></div></div>'+(item.introduction?'<hr><p style="text-align:center">'+safe(item.introduction)+'</p>':'')+'</div>'+dayHtml+
        '<div class="actions"><button class="secondary" type="button" onclick="closeModal()">Close</button><button class="secondary" type="button" data-id="'+id+'" onclick="exportItineraryPdf(this.dataset.id)">Print / Save PDF</button></div>');
    }catch(e){alert('Could not open itinerary: '+e.message);}
  };
  window.exportItineraryPdf=async function(id){
    const win=window.open('about:blank','_blank');
    if(!win)return alert('Please allow pop-ups for KTBS, then select Print / Save PDF again.');
    win.document.open();
    win.document.write('<!doctype html><html><head><title>Preparing itinerary</title></head><body style="font:16px Arial;padding:32px">Preparing your itinerary…</body></html>');
    win.document.close();
    try{
      const r=await C().sb.from('itineraries').select('*').eq('id',id).single();
      if(r.error)throw r.error;
      const item=r.data,days=Array.isArray(item.days)?item.days:[];
      const client=(C().cache?.clients||[]).find(x=>x.id===item.client_id);
      const booking=(C().cache?.bookings||[]).find(x=>x.id===item.booking_id);
      const range=(item.start_date||item.end_date)?dateLabel(item.start_date)+' – '+dateLabel(item.end_date):'';
      const paths=[...(item.cover_image_path?[item.cover_image_path]:[]),...days.flatMap(day=>Array.isArray(day.images)?day.images:[])];
      const imageUrls={};
      for(const path of [...new Set(paths)]){
        const signed=await C().sb.storage.from('itinerary-images').createSignedUrl(path,3600);
        if(!signed.error&&signed.data?.signedUrl)imageUrls[path]=signed.data.signedUrl;
      }
      const safe=v=>esc(v==null?'':String(v)).replace(/\n/g,'<br>');
      const logoUrl=window.location.origin+'/kulu-logo.png';
      const coverPath=item.cover_image_path||days.flatMap(day=>Array.isArray(day.images)?day.images:[])[0]||null;
      const coverPhoto=coverPath&&imageUrls[coverPath]?'<img class="cover-image" src="'+imageUrls[coverPath]+'" alt="Itinerary cover">':'';
      const coverHero='<section class="cover"><div class="cover-bg">'+coverPhoto+'</div><div class="cover-shade"></div><div class="cover-logo-wrap"><img class="cover-logo" src="'+logoUrl+'" alt="Kulu Travels logo"></div><div class="cover-copy"><div class="cover-kicker">YOUR JOURNEY, BEAUTIFULLY CURATED</div><h1>'+safe(item.title||'Travel Itinerary')+'</h1><div class="cover-destination">'+safe(item.destination||'')+'</div><div class="cover-dates">'+safe(range)+'</div></div></section>';
      const dayHtml=days.map((day,index)=>{
        const photos=(day.images||[]).filter(path=>imageUrls[path]).map(path=>'<img class="day-photo" src="'+imageUrls[path]+'" alt="Itinerary photo">').join('');
        return '<section class="day"><div class="day-kicker">DAY '+(index+1)+'</div><h2>'+safe(day.title||('Day '+(index+1)))+'</h2>'+(day.date?'<div class="day-date">'+dateLabel(day.date)+'</div>':'')+(day.description?'<p class="overview">'+safe(day.description)+'</p>':'')+scheduleTable(day.activities,'print')+(photos?'<div class="photos">'+photos+'</div>':'')+'</section>';
      }).join('');
      const html='<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+safe(item.title||'Travel Itinerary')+'</title><style>'+
        '@page{size:A4;margin:0}*{box-sizing:border-box}html,body{margin:0;padding:0}body{font-family:Arial,Helvetica,sans-serif;color:#203536;font-size:11pt;line-height:1.55;-webkit-print-color-adjust:exact;print-color-adjust:exact}.print-actions{position:sticky;top:0;z-index:10;background:#fff;padding:12px;text-align:right;border-bottom:1px solid #ddd}.print-actions button{background:#0aaeb8;color:#fff;border:0;border-radius:6px;padding:12px 20px;font-size:14px;font-weight:700;cursor:pointer}.print-status{font-size:12px;color:#587071;margin-right:12px}.cover{height:297mm;width:210mm;position:relative;overflow:hidden;page-break-after:always;break-after:page;color:#fff;background:#07545a;text-align:center}.cover-bg,.cover-shade{position:absolute;inset:0}.cover-image{width:100%;height:100%;object-fit:cover}.cover-shade{background:linear-gradient(180deg,rgba(0,38,46,.22),rgba(0,42,48,.12) 42%,rgba(0,30,37,.8))}.cover-logo-wrap{position:absolute;top:18mm;left:0;right:0;display:flex;justify-content:center}.cover-logo{width:58mm;max-height:25mm;object-fit:contain;filter:drop-shadow(0 2px 8px rgba(0,0,0,.25))}.cover-copy{position:absolute;left:16mm;right:16mm;bottom:22mm;text-align:center}.cover-kicker{font-size:8pt;letter-spacing:3px;font-weight:700;margin-bottom:7mm}.cover-copy h1{font:30pt Georgia,serif;line-height:1.15;color:#fff;margin:0 auto 5mm;max-width:175mm;text-align:center}.cover-destination{font-size:10pt;letter-spacing:2px;text-transform:uppercase}.cover-dates{font-size:8pt;letter-spacing:1.5px;margin-top:7mm}.cover:not(:has(.cover-image)){background:linear-gradient(145deg,#063d49,#168a91)}.day{width:182mm;margin:0 auto;padding:16mm 0 12mm;break-inside:avoid-page;border-bottom:1px solid #cbdcda;text-align:center}.day-kicker{font-size:9pt;letter-spacing:2px;color:#078b91;font-weight:bold}.day h2{font:20pt Georgia,serif;margin:4mm 0;color:#183f40;text-align:center}.day-date{font-size:9pt;color:#607778;margin-bottom:8px}.overview{font-weight:600}.activities{white-space:pre-wrap}.schedule-wrap{width:100%;max-width:760px;margin:18px auto 8px;text-align:left}.schedule-table{width:100%;border-collapse:separate;border-spacing:0;border:1px solid #d7e5e4;border-radius:9px;overflow:hidden;background:#fff;font-size:10.5pt}.schedule-table thead th{background:#eaf5f4;color:#12666a;font-size:8.5pt;letter-spacing:1.5px;font-weight:700;padding:11px 14px;border-bottom:1px solid #cbdcda;text-align:left}.schedule-table thead th:first-child{width:27%;text-align:center}.schedule-table tbody td{padding:11px 14px;border-bottom:1px solid #e6eeee;vertical-align:top}.schedule-table tbody tr:last-child td{border-bottom:0}.schedule-table .schedule-time{width:27%;white-space:nowrap;text-align:center;font-weight:700;color:#176b70;font-variant-numeric:tabular-nums;background:#f7fbfa}.schedule-table .schedule-activity{text-align:left;color:#263f40;line-height:1.5}.schedule-wrap.print{max-width:100%;margin:8mm auto}.schedule-wrap.print .schedule-table{font-size:9.5pt;break-inside:auto}.schedule-wrap.print .schedule-table tr{break-inside:avoid;page-break-inside:avoid}.schedule-wrap.print .schedule-table thead{display:table-header-group}.schedule-wrap.print .schedule-table thead th{padding:8px 10px}.schedule-wrap.print .schedule-table tbody td{padding:8px 10px}.photos{display:flex;flex-wrap:wrap;justify-content:center;gap:10px;margin-top:12px}.day-photo{width:calc(50% - 5px);max-height:230px;object-fit:cover;border-radius:6px;break-inside:avoid}.content-header{width:182mm;margin:16mm auto 8mm;text-align:center;border-bottom:3px solid #18b9c3;padding-bottom:8mm}.content-header .brand{font-size:10pt;letter-spacing:3px;color:#078b91;font-weight:700}.content-header h2{font:24pt Georgia,serif;margin:4mm 0;text-align:center}.summary{display:flex;justify-content:center;gap:20px;flex-wrap:wrap;background:#f0f8f7;padding:12px}.intro{width:182mm;margin:10mm auto;text-align:center}@media print{.print-actions{display:none!important}.day{break-inside:avoid-page}}'+
        '</style></head><body><div class="print-actions"><span class="print-status" id="printStatus">Your itinerary is ready.</span><button id="printButton" type="button">Print / Save as PDF</button></div>'+coverHero+
        '<header class="content-header"><div class="brand">KULU TRAVELS · SEAMLESS TRAVEL</div><h2>'+safe(item.title||'Travel Itinerary')+'</h2><div>'+safe(item.destination||'')+(range?' · '+safe(range):'')+'</div><div class="summary">'+(client?'<span><b>Prepared for</b><br>'+safe(client.name)+'</span>':'')+(booking?'<span><b>Booking reference</b><br>'+safe(booking.booking_no)+'</span>':'')+'<span><b>Itinerary status</b><br>'+safe(item.status||'Draft')+'</span></div></header>'+(item.introduction?'<div class="intro">'+safe(item.introduction)+'</div>':'')+dayHtml+
        '<script>(function(){var button=document.getElementById("printButton");button.addEventListener("click",function(){window.focus();window.print();});window.addEventListener("load",function(){var imgs=Array.from(document.images);Promise.all(imgs.map(function(img){if(img.complete&&img.naturalWidth>0)return Promise.resolve();return new Promise(function(resolve){img.onload=resolve;img.onerror=resolve;});})).then(function(){document.getElementById("printStatus").textContent="Ready. Choose your printer or Save as PDF.";});});})();</script></body></html>';
      win.document.open();win.document.write(html);win.document.close();win.focus();
    }catch(e){
      try{win.document.body.innerHTML='<p style="font:16px Arial;color:#a00;padding:24px">Could not prepare PDF: '+esc(e.message)+'</p>';}catch(_){}
      console.error('KTBS itinerary PDF export failed:',e);
    }
  };
  function filterItineraries(rows){
    const q=($('itinerarySearch')?.value||'').toLowerCase(),s=$('itineraryStatus')?.value||'';
    $('itineraryList').innerHTML=renderItineraryList(rows.filter(x=>(!s||x.status===s)&&[x.title,x.destination,(C().cache?.clients||[]).find(c=>c.id===x.client_id)?.name].join(' ').toLowerCase().includes(q)));
  }
  function freshDay(n,start){
    const d=new Date((start||dateOnly(new Date()))+'T12:00:00');d.setDate(d.getDate()+n);
    return {id:uid(),title:'Day '+(n+1),date:dateOnly(d),description:'',activities:'',images:[]};
  }
  function renderDays(draft){
    return draft.days.map((d,i)=>'<section class="day-editor"><div class="day-head"><div><span class="day-number">DAY '+(i+1)+'</span><input data-day="'+d.id+'" data-field="title" value="'+esc(d.title)+'" aria-label="Day title"></div><button type="button" class="link-btn danger-text" onclick="removeItineraryDay(\''+d.id+'\')">Remove day</button></div>'+
      '<label>Date<input type="date" data-day="'+d.id+'" data-field="date" value="'+esc(d.date||'')+'"></label>'+
      '<label>Day overview<textarea data-day="'+d.id+'" data-field="description" rows="2" placeholder="Describe the daily experience">'+esc(d.description||'')+'</textarea></label>'+
      '<label>Activities and schedule<textarea data-day="'+d.id+'" data-field="activities" rows="4" placeholder="Add activities, timings, transfers and meal details">'+esc(d.activities||'')+'</textarea></label>'+
      '<label class="upload-label">Photos for this day<input type="file" accept="image/jpeg,image/png,image/webp" multiple data-upload-day="'+d.id+'"><small>Upload JPG, PNG or WebP images up to 8 MB each.</small></label>'+
      '<div class="itinerary-images">'+(d.images||[]).map((path,j)=>'<div class="itinerary-image" data-image="'+esc(path)+'"><img alt="Itinerary photo" data-storage-path="'+esc(path)+'"><button type="button" onclick="removeItineraryImage(\''+d.id+'\','+j+')">×</button></div>').join('')+'</div></section>').join('');
  }
  async function signItineraryImages(draft){
    for(const d of draft.days||[])for(const path of d.images||[]){
      const el=document.querySelector('img[data-storage-path="'+CSS.escape(path)+'"]');if(!el)continue;
      const r=await C().sb.storage.from('itinerary-images').createSignedUrl(path,3600);
      if(!r.error&&r.data?.signedUrl)el.src=r.data.signedUrl;
    }
    const coverPath=draft.cover_image_path||(draft.days||[]).flatMap(d=>d.images||[])[0]||null;
    const coverEl=draft.cover_image_path?document.querySelector('img[data-cover-path="'+CSS.escape(draft.cover_image_path)+'"]'):null;
    const preview=$('itineraryCoverPreview');
    if(coverPath&&preview){
      const r=await C().sb.storage.from('itinerary-images').createSignedUrl(coverPath,3600);
      if(!r.error&&r.data?.signedUrl){
        if(coverEl)coverEl.src=r.data.signedUrl;
        else if(!draft.cover_image_path)preview.innerHTML='<img src="'+r.data.signedUrl+'" alt="Automatic itinerary cover" style="width:100%;max-height:220px;object-fit:cover;border-radius:8px"><small class="muted">Using the first daily photo as the cover</small>';
      }
    }
  }
  window.openItineraryEditor=async function(id){
    let draft;
    if(id){
      const r=await C().sb.from('itineraries').select('*').eq('id',id).single();
      if(r.error)return alert(r.error.message);
      draft={...r.data,days:Array.isArray(r.data.days)?r.data.days.map(day=>({...day,images:Array.isArray(day.images)?day.images:[]})):[]};
    }else draft={id:uid(),title:'',client_id:'',booking_id:'',destination:'',start_date:'',end_date:'',status:'Draft',introduction:'',days:[freshDay(0)]};
    window.ktbsItineraryDraft=draft;
    window.ktbsItineraryOriginalImages=new Set([...draft.days.flatMap(x=>x.images||[]),...(draft.cover_image_path?[draft.cover_image_path]:[])]);
    window.ktbsItineraryNewUploads=[];
    C().openModal('Build Itinerary','<form id="itineraryForm"><div class="form-grid">'+
      '<label class="wide">Itinerary title<input name="title" required maxlength="180" value="'+esc(draft.title)+'" placeholder="e.g. 5-Day Maasai Mara Luxury Safari"></label>'+
      '<label>Client<select name="client_id" '+(!admin()?'required':'')+'>'+clientOptions(draft.client_id)+'</select></label>'+
      '<label>Booking<select name="booking_id">'+bookingOptions(draft.client_id,draft.booking_id)+'</select></label>'+
      '<label>Destination<input name="destination" value="'+esc(draft.destination||'')+'" placeholder="Destination"></label>'+
      '<label>Status<select name="status">'+['Draft','Ready','Shared','Archived'].map(s=>'<option '+(draft.status===s?'selected':'')+'>'+s+'</option>').join('')+'</select></label>'+
      '<label>Start date<input name="start_date" type="date" value="'+esc(draft.start_date||'')+'"></label>'+
      '<label>End date<input name="end_date" type="date" value="'+esc(draft.end_date||'')+'"></label>'+
      '<label class="wide">Introduction<textarea name="introduction" rows="2" placeholder="A warm introduction to the journey">'+esc(draft.introduction||'')+'</textarea></label></div>'+
      '<div class="page-card cover-editor"><h3>First-page cover image</h3><p class="muted">Upload a dedicated cover photo, or leave it empty to automatically use the first photo from your daily itinerary.</p><label class="upload-label">Cover photo<input id="itineraryCoverUpload" type="file" accept="image/jpeg,image/png,image/webp"><small>JPG, PNG or WebP up to 8 MB. Landscape photos work best.</small></label><div id="itineraryCoverPreview">'+(draft.cover_image_path?'<img data-cover-path="'+esc(draft.cover_image_path)+'" alt="Itinerary cover" style="width:100%;max-height:220px;object-fit:cover;border-radius:8px">':'<p class="muted">Automatic cover: first available day photo</p>')+'</div>'+(draft.cover_image_path?'<button type="button" class="link-btn danger-text" onclick="removeItineraryCover()">Remove cover photo</button>':'')+'</div>'+
      '<div class="section-head itinerary-days-title"><h3>Daily itinerary</h3><button type="button" class="secondary" onclick="addItineraryDay()">＋ Add day</button></div>'+
      '<div id="itineraryDays">'+renderDays(draft)+'</div><div class="actions"><button type="button" class="secondary" onclick="cancelItineraryEditor()">Cancel</button><button class="primary">Save Itinerary</button></div></form>');
    $('itineraryForm').elements.client_id.onchange=e=>{$('itineraryForm').elements.booking_id.innerHTML=bookingOptions(e.target.value,'');};
    $('itineraryForm').oninput=e=>{
      const d=window.ktbsItineraryDraft;if(!d)return;
      if(e.target.dataset.day){const day=d.days.find(x=>x.id===e.target.dataset.day);if(day)day[e.target.dataset.field]=e.target.value;}
    };
    $('itineraryForm').onchange=async e=>{
      if(e.target.dataset.uploadDay){await uploadItineraryImages(e.target.dataset.uploadDay,e.target.files);e.target.value='';}
      if(e.target.id==='itineraryCoverUpload'){await uploadItineraryCover(e.target.files?.[0]);e.target.value='';}
      if(e.target.name==='start_date'||e.target.name==='end_date')syncItineraryDates();
    };
    $('itineraryForm').onsubmit=saveItinerary;
    await signItineraryImages(draft);
  };
  window.addItineraryDay=function(){
    const d=window.ktbsItineraryDraft;if(!d)return;
    d.days.push(freshDay(d.days.length,$('itineraryForm').elements.start_date.value||d.start_date));
    $('itineraryDays').innerHTML=renderDays(d);signItineraryImages(d);
  };
  window.removeItineraryDay=function(id){
    const d=window.ktbsItineraryDraft;if(!d)return;
    if(d.days.length===1)return alert('An itinerary must contain at least one day.');
    d.days=d.days.filter(x=>x.id!==id);$('itineraryDays').innerHTML=renderDays(d);signItineraryImages(d);
  };
  window.removeItineraryImage=function(dayId,index){
    const d=window.ktbsItineraryDraft?.days.find(x=>x.id===dayId);if(!d)return;
    d.images.splice(index,1);$('itineraryDays').innerHTML=renderDays(window.ktbsItineraryDraft);signItineraryImages(window.ktbsItineraryDraft);
  };
  window.cancelItineraryEditor=async function(){
    const added=window.ktbsItineraryNewUploads||[];if(added.length)await C().sb.storage.from('itinerary-images').remove(added);
    window.ktbsItineraryDraft=null;window.ktbsItineraryNewUploads=[];C().closeModal();
  };
  function syncItineraryDates(){
    const f=$('itineraryForm');if(!f)return;
    const start=f.elements.start_date.value,end=f.elements.end_date.value;
    window.ktbsItineraryDraft.start_date=start;window.ktbsItineraryDraft.end_date=end;
    window.ktbsItineraryDraft.days.forEach((d,i)=>{if(!d.date||i>0){const x=new Date((start||dateOnly(new Date()))+'T12:00:00');x.setDate(x.getDate()+i);d.date=dateOnly(x);}});
    $('itineraryDays').innerHTML=renderDays(window.ktbsItineraryDraft);signItineraryImages(window.ktbsItineraryDraft);
  }
  async function uploadItineraryCover(file){
    if(!file)return;
    if(!/^image\/(jpeg|png|webp)$/.test(file.type)||file.size>8*1024*1024)return alert('Use JPG, PNG or WebP up to 8 MB.');
    const d=window.ktbsItineraryDraft;if(!d)return;
    const path=org().id+'/'+user().id+'/'+d.id+'/cover/'+uid()+'-'+file.name.replace(/[^a-zA-Z0-9._-]/g,'_');
    const r=await C().sb.storage.from('itinerary-images').upload(path,file,{contentType:file.type,upsert:false});
    if(r.error)return alert('Could not upload cover photo: '+r.error.message);
    if(d.cover_image_path&&window.ktbsItineraryNewUploads.includes(d.cover_image_path)){await C().sb.storage.from('itinerary-images').remove([d.cover_image_path]);window.ktbsItineraryNewUploads=window.ktbsItineraryNewUploads.filter(x=>x!==d.cover_image_path);}
    d.cover_image_path=path;window.ktbsItineraryNewUploads.push(path);
    const signed=await C().sb.storage.from('itinerary-images').createSignedUrl(path,3600);
    const preview=$('itineraryCoverPreview');if(preview)preview.innerHTML=signed.data?.signedUrl?'<img src="'+signed.data.signedUrl+'" alt="Itinerary cover" style="width:100%;max-height:220px;object-fit:cover;border-radius:8px">':'';
    if(!document.querySelector('.cover-editor .danger-text'))preview?.insertAdjacentHTML('afterend','<button type="button" class="link-btn danger-text" onclick="removeItineraryCover()">Remove cover photo</button>');
  }
  window.removeItineraryCover=function(){
    const d=window.ktbsItineraryDraft;if(!d)return;
    if(d.cover_image_path&&window.ktbsItineraryNewUploads.includes(d.cover_image_path)){C().sb.storage.from('itinerary-images').remove([d.cover_image_path]);window.ktbsItineraryNewUploads=window.ktbsItineraryNewUploads.filter(x=>x!==d.cover_image_path);}
    d.cover_image_path=null;
    const p=$('itineraryCoverPreview');if(p)p.innerHTML='<p class="muted">Automatic cover: first available day photo</p>';
    document.querySelector('.cover-editor .danger-text')?.remove();
  };
  async function uploadItineraryImages(dayId,fileList){
    const files=Array.from(fileList||[]);if(!files.length)return;
    const d=window.ktbsItineraryDraft?.days.find(x=>x.id===dayId);if(!d)return;
    for(const file of files){
      if(!/^image\/(jpeg|png|webp)$/.test(file.type)||file.size>8*1024*1024){alert(file.name+' was skipped. Use JPG, PNG or WebP up to 8 MB.');continue;}
      const path=org().id+'/'+user().id+'/'+window.ktbsItineraryDraft.id+'/'+dayId+'/'+uid()+'-'+file.name.replace(/[^a-zA-Z0-9._-]/g,'_');
      const r=await C().sb.storage.from('itinerary-images').upload(path,file,{contentType:file.type,upsert:false});
      if(r.error){alert('Could not upload '+file.name+': '+r.error.message);continue;}
      d.images.push(path);window.ktbsItineraryNewUploads.push(path);
    }
    $('itineraryDays').innerHTML=renderDays(window.ktbsItineraryDraft);await signItineraryImages(window.ktbsItineraryDraft);
  }
  async function saveItinerary(e){
    e.preventDefault();const f=e.target,d=window.ktbsItineraryDraft,x=Object.fromEntries(new FormData(f));
    if(!admin()&&!x.client_id)return alert('Select a client assigned to your account.');
    if(x.end_date&&x.start_date&&x.end_date<x.start_date)return alert('End date cannot be before the start date.');
    const payload={organization_id:org().id,title:x.title.trim(),client_id:x.client_id||null,booking_id:x.booking_id||null,destination:x.destination||'',start_date:x.start_date||null,end_date:x.end_date||null,status:x.status,introduction:x.introduction||'',cover_image_path:d.cover_image_path||null,days:d.days,updated_by:user().id};
    let r;
    if(d.created_at)r=await C().sb.from('itineraries').update(payload).eq('id',d.id);
    else r=await C().sb.from('itineraries').insert({...payload,id:d.id,created_by:user().id});
    if(r.error)return alert('Could not save itinerary: '+r.error.message);
    const current=new Set([...d.days.flatMap(day=>day.images||[]),...(d.cover_image_path?[d.cover_image_path]:[])]);
    const removed=[...(window.ktbsItineraryOriginalImages||[])].filter(path=>!current.has(path));
    if(removed.length){const cleanup=await C().sb.storage.from('itinerary-images').remove(removed);if(cleanup.error)console.warn('Some removed itinerary images could not be deleted:',cleanup.error.message);}
    window.ktbsItineraryDraft=null;window.ktbsItineraryNewUploads=[];C().closeModal();await window.itinerariesPage();await window.viewItinerary(d.id);
  }

  async function loadTasks(){
    const r=await C().sb.from('tasks').select('*').order('due_at',{ascending:true});
    if(r.error)throw r.error;return r.data||[];
  }
  window.tasksPage=async function(){
    const root=$('content');root.innerHTML='<div class="page-card">Loading tasks…</div>';
    try{
      const rows=await loadTasks(),today=new Date();today.setHours(0,0,0,0);
      const open=rows.filter(x=>!['Completed','Cancelled'].includes(x.status));
      const overdue=open.filter(x=>x.due_at&&new Date(x.due_at)<today);
      root.innerHTML='<div class="welcome"><div><h1>Tasks</h1><p>Assign follow-ups, booking actions and operational deadlines.</p></div><button class="primary" onclick="openTaskEditor()">＋ New Task</button></div>'+
      '<div class="grid stats">'+C().stat('Open Tasks',open.length,'Not yet completed')+C().stat('Overdue',overdue.length,'Past their due date')+C().stat('Due Today',open.filter(x=>x.due_at&&dateOnly(x.due_at)===dateOnly(new Date())).length,'Needs attention')+C().stat('Completed',rows.filter(x=>x.status==='Completed').length,'Finished tasks')+'</div>'+
      '<div class="toolbar"><select id="taskStatusFilter"><option value="">All statuses</option><option>Open</option><option>In Progress</option><option>Completed</option><option>Cancelled</option></select><select id="taskPriorityFilter"><option value="">All priorities</option><option>Urgent</option><option>High</option><option>Normal</option><option>Low</option></select></div><div id="taskList">'+renderTaskList(rows)+'</div>';
      const filter=()=>{$('taskList').innerHTML=renderTaskList(rows.filter(x=>(!$('taskStatusFilter').value||x.status===$('taskStatusFilter').value)&&(!$('taskPriorityFilter').value||x.priority===$('taskPriorityFilter').value)));};
      $('taskStatusFilter').onchange=filter;$('taskPriorityFilter').onchange=filter;
    }catch(e){root.innerHTML='<div class="page-card"><h3>Could not load tasks</h3><p>'+esc(e.message)+'</p></div>';}
  };
  function renderTaskList(rows){
    if(!rows.length)return empty('No tasks have been created yet.');
    const profiles=C().cache?.profiles||[];
    return '<div class="page-card"><div class="table-scroll"><table class="planner-table"><thead><tr><th>Task</th><th>Client / Booking</th><th>Assigned to</th><th>Due</th><th>Priority</th><th>Status</th><th>Action</th></tr></thead><tbody>'+
      rows.map(x=>{const cl=(C().cache?.clients||[]).find(c=>c.id===x.client_id),bk=(C().cache?.bookings||[]).find(b=>b.id===x.booking_id),p=profiles.find(y=>y.id===x.assigned_to),canEdit=admin()||x.assigned_to===user().id;return '<tr><td><b>'+esc(x.title)+'</b><br><small>'+esc(x.category)+'</small></td><td>'+esc(cl?.name||'—')+'<br><small>'+esc(bk?.booking_no||'')+'</small></td><td>'+esc(p?.full_name||(x.assigned_to===user().id?'You':'Team member'))+'</td><td>'+timeLabel(x.due_at)+'</td><td>'+esc(x.priority)+'</td><td>'+esc(x.status)+'</td><td>'+(canEdit?'<button class="link-btn" onclick="openTaskEditor(\''+x.id+'\')">Edit</button> '+(x.status!=='Completed'?'<button class="link-btn" onclick="setTaskStatus(\''+x.id+'\',\'Completed\')">Complete</button>':''):'<span class="muted">Assigned to colleague</span>')+'</td></tr>';}).join('')+
      '</tbody></table></div></div>';
  }
  window.openTaskEditor=async function(id){
    let t={title:'',description:'',category:'Client Follow-up',priority:'Normal',status:'Open',assigned_to:user().id,client_id:'',booking_id:'',due_at:''};
    if(id){const r=await C().sb.from('tasks').select('*').eq('id',id).single();if(r.error)return alert(r.error.message);t=r.data;}
    const staff=await staffOptions(t.assigned_to),dt=t.due_at?new Date(t.due_at):null;
    C().openModal(id?'Edit Task':'New Task','<form id="taskForm"><div class="form-grid"><label class="wide">Task title<input name="title" required maxlength="180" value="'+esc(t.title)+'"></label><label>Category<select name="category">'+['Client Follow-up','Supplier Confirmation','Hotel Reservation','Payment Deadline','Travel Documents','Flights & Transfers','Visa / Passport','Post-Travel Follow-up','General'].map(x=>'<option '+(t.category===x?'selected':'')+'>'+x+'</option>').join('')+'</select></label><label>Assigned to<select name="assigned_to" '+(!admin()?'disabled':'')+'>'+staff+'</select></label><label>Priority<select name="priority">'+['Low','Normal','High','Urgent'].map(x=>'<option '+(t.priority===x?'selected':'')+'>'+x+'</option>').join('')+'</select></label><label>Status<select name="status">'+['Open','In Progress','Completed','Cancelled'].map(x=>'<option '+(t.status===x?'selected':'')+'>'+x+'</option>').join('')+'</select></label><label>Due date<input name="due_date" type="date" value="'+(dt?dateOnly(dt):'')+'"></label><label>Due time<input name="due_time" type="time" value="'+(dt?String(dt.getHours()).padStart(2,'0')+':'+String(dt.getMinutes()).padStart(2,'0'):'09:00')+'"></label><label>Client<select name="client_id">'+clientOptions(t.client_id)+'</select></label><label>Booking<select name="booking_id">'+bookingOptions(t.client_id,t.booking_id)+'</select></label><label class="wide">Description<textarea name="description" rows="3">'+esc(t.description||'')+'</textarea></label></div><div class="actions"><button type="button" class="secondary" onclick="closeModal()">Cancel</button><button class="primary">Save Task</button></div></form>');
    const f=$('taskForm');f.elements.client_id.onchange=e=>f.elements.booking_id.innerHTML=bookingOptions(e.target.value,'');
    f.onsubmit=async e=>{e.preventDefault();const x=Object.fromEntries(new FormData(f));const payload={organization_id:org().id,title:x.title.trim(),description:x.description||'',category:x.category,priority:x.priority,status:x.status,assigned_to:admin()?x.assigned_to:user().id,client_id:x.client_id||null,booking_id:x.booking_id||null,due_at:x.due_date?localDateTime(x.due_date,x.due_time):null,updated_by:user().id};
      if(id){const r=await C().sb.from('tasks').update({...payload,completed_at:x.status==='Completed'?(t.completed_at||new Date().toISOString()):null}).eq('id',id);if(r.error)return alert(r.error.message);}
      else{const r=await C().sb.from('tasks').insert({...payload,created_by:user().id});if(r.error)return alert(r.error.message);}
      C().closeModal();await window.tasksPage();
    };
  };
  window.setTaskStatus=async function(id,status){
    const r=await C().sb.from('tasks').update({status,completed_at:status==='Completed'?new Date().toISOString():null,updated_by:user().id}).eq('id',id);
    if(r.error)return alert(r.error.message);await window.tasksPage();
  };

  window.ktbsCalendarMonth=new Date(new Date().getFullYear(),new Date().getMonth(),1);
  window.calendarPage=async function(){
    const root=$('content');root.innerHTML='<div class="page-card">Loading calendar…</div>';
    try{
      const [tasks,events]=await Promise.all([loadTasks(),C().sb.from('calendar_events').select('*').order('start_at')]);
      if(events.error)throw events.error;
      const m=window.ktbsCalendarMonth,year=m.getFullYear(),month=m.getMonth(),first=new Date(year,month,1),last=new Date(year,month+1,0),offset=(first.getDay()+6)%7;
      const cells=[];for(let i=0;i<offset;i++)cells.push(null);for(let d=1;d<=last.getDate();d++)cells.push(new Date(year,month,d));
      const items=[...tasks.filter(x=>x.due_at).map(x=>({id:x.id,date:dateOnly(x.due_at),title:x.title,type:'task',status:x.status,priority:x.priority})),...(events.data||[]).map(x=>({id:x.id,date:dateOnly(x.start_at),title:x.title,type:'event',status:x.event_type})),...(C().cache?.bookings||[]).filter(x=>x.departure).map(x=>({id:x.id,date:x.departure,title:(x.booking_no||'Booking')+' · '+(x.destination||'Departure'),type:'booking',status:x.status}))];
      root.innerHTML='<div class="welcome"><div><h1>Calendar</h1><p>See tasks, operational events and client departures in one place.</p></div><button class="primary" onclick="openCalendarEventEditor()">＋ Add Event</button></div>'+
      '<div class="page-card calendar-card"><div class="calendar-toolbar"><button class="secondary" onclick="shiftCalendar(-1)">‹</button><h3>'+m.toLocaleDateString('en-GB',{month:'long',year:'numeric'})+'</h3><button class="secondary" onclick="shiftCalendar(1)">›</button><button class="link-btn" onclick="resetCalendar()">Today</button></div><div class="calendar-grid">'+['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(x=>'<div class="calendar-weekday">'+x+'</div>').join('')+cells.map(d=>{if(!d)return '<div class="calendar-cell blank"></div>';const day=dateOnly(d),list=items.filter(x=>x.date===day);return '<div class="calendar-cell"><span class="calendar-date '+(day===dateOnly(new Date())?'today':'')+'">'+d.getDate()+'</span><div class="calendar-items">'+list.slice(0,4).map(x=>'<div class="calendar-item '+x.type+'" title="'+esc(x.title)+'">'+esc(x.title)+'</div>').join('')+(list.length>4?'<small>+'+(list.length-4)+' more</small>':'')+'</div></div>';}).join('')+'</div></div>'+
      '<div class="grid two calendar-lists"><div class="page-card"><h3>Upcoming tasks</h3>'+renderTaskList(tasks.filter(x=>x.due_at&&x.status!=='Completed').sort((a,b)=>new Date(a.due_at)-new Date(b.due_at)).slice(0,8))+'</div><div class="page-card"><h3>Upcoming events</h3>'+renderEventList(events.data||[])+'</div></div>';
    }catch(e){root.innerHTML='<div class="page-card"><h3>Could not load calendar</h3><p>'+esc(e.message)+'</p></div>';}
  };
  function renderEventList(rows){return rows.length?'<ul class="event-list">'+rows.slice(0,8).map(x=>'<li><div><b>'+esc(x.title)+'</b><span>'+timeLabel(x.start_at)+'</span></div>'+(admin()||x.assigned_to===user().id?'<button class="link-btn" onclick="openCalendarEventEditor(\''+x.id+'\')">Edit</button>':'<span class="muted">Assigned</span>')+'</li>').join('')+'</ul>':empty('No calendar events yet.');}
  window.shiftCalendar=function(n){const d=window.ktbsCalendarMonth;window.ktbsCalendarMonth=new Date(d.getFullYear(),d.getMonth()+n,1);window.calendarPage();};
  window.resetCalendar=function(){window.ktbsCalendarMonth=new Date(new Date().getFullYear(),new Date().getMonth(),1);window.calendarPage();};
  window.openCalendarEventEditor=async function(id){
    let ev={title:'',description:'',event_type:'Other',start_at:'',end_at:'',all_day:false,assigned_to:user().id,client_id:'',booking_id:''};
    if(id){const r=await C().sb.from('calendar_events').select('*').eq('id',id).single();if(r.error)return alert(r.error.message);ev=r.data;}
    const staff=await staffOptions(ev.assigned_to),dt=ev.start_at?new Date(ev.start_at):new Date();
    C().openModal('Add Calendar Event','<form id="eventForm"><div class="form-grid"><label class="wide">Event title<input name="title" required value="'+esc(ev.title)+'"></label><label>Event type<select name="event_type">'+['Departure','Hotel Check-in','Hotel Check-out','Supplier Deadline','Payment Due','Visa / Passport','Meeting','Other'].map(x=>'<option '+(ev.event_type===x?'selected':'')+'>'+x+'</option>').join('')+'</select></label><label>Assigned to<select name="assigned_to" '+(!admin()?'disabled':'')+'>'+staff+'</select></label><label>Date<input type="date" name="date" required value="'+dateOnly(dt)+'"></label><label>Time<input type="time" name="time" value="'+String(dt.getHours()).padStart(2,'0')+':'+String(dt.getMinutes()).padStart(2,'0')+'"></label><label>Client<select name="client_id">'+clientOptions(ev.client_id)+'</select></label><label>Booking<select name="booking_id">'+bookingOptions(ev.client_id,ev.booking_id)+'</select></label><label class="wide">Notes<textarea name="description">'+esc(ev.description||'')+'</textarea></label></div><div class="actions"><button type="button" class="secondary" onclick="closeModal()">Cancel</button><button class="primary">Save Event</button></div></form>');
    const f=$('eventForm');f.elements.client_id.onchange=e=>f.elements.booking_id.innerHTML=bookingOptions(e.target.value,'');
    f.onsubmit=async e=>{e.preventDefault();const x=Object.fromEntries(new FormData(f)),payload={organization_id:org().id,title:x.title.trim(),description:x.description||'',event_type:x.event_type,start_at:localDateTime(x.date,x.time),end_at:null,all_day:false,assigned_to:admin()?x.assigned_to:user().id,client_id:x.client_id||null,booking_id:x.booking_id||null,updated_by:user().id};
      const r=id?await C().sb.from('calendar_events').update(payload).eq('id',id):await C().sb.from('calendar_events').insert({...payload,created_by:user().id});
      if(r.error)return alert(r.error.message);C().closeModal();await window.calendarPage();
    };
  };
})();