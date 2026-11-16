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
    rows.map(x=>'<tr><td><b>'+esc(x.title)+'</b></td><td>'+esc((C().cache?.clients||[]).find(c=>c.id===x.client_id)?.name||'—')+'</td><td>'+esc(x.destination||'—')+'</td><td>'+dateLabel(x.start_date)+' – '+dateLabel(x.end_date)+'</td><td>'+((x.days||[]).length)+'</td><td>'+esc(x.status)+'</td><td><button class="link-btn" onclick="openItineraryEditor(\''+x.id+'\')">Edit</button></td></tr>').join('')+
    '</tbody></table></div>';
  }
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
  }
  window.openItineraryEditor=async function(id){
    let draft;
    if(id){
      const r=await C().sb.from('itineraries').select('*').eq('id',id).single();
      if(r.error)return alert(r.error.message);
      draft={...r.data,days:Array.isArray(r.data.days)?r.data.days.map(day=>({...day,images:Array.isArray(day.images)?day.images:[]})):[]};
    }else draft={id:uid(),title:'',client_id:'',booking_id:'',destination:'',start_date:'',end_date:'',status:'Draft',introduction:'',days:[freshDay(0)]};
    window.ktbsItineraryDraft=draft;
    window.ktbsItineraryOriginalImages=new Set(draft.days.flatMap(x=>x.images||[]));
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
      '<div class="section-head itinerary-days-title"><h3>Daily itinerary</h3><button type="button" class="secondary" onclick="addItineraryDay()">＋ Add day</button></div>'+
      '<div id="itineraryDays">'+renderDays(draft)+'</div><div class="actions"><button type="button" class="secondary" onclick="cancelItineraryEditor()">Cancel</button><button class="primary">Save Itinerary</button></div></form>');
    $('itineraryForm').elements.client_id.onchange=e=>{$('itineraryForm').elements.booking_id.innerHTML=bookingOptions(e.target.value,'');};
    $('itineraryForm').oninput=e=>{
      const d=window.ktbsItineraryDraft;if(!d)return;
      if(e.target.dataset.day){const day=d.days.find(x=>x.id===e.target.dataset.day);if(day)day[e.target.dataset.field]=e.target.value;}
    };
    $('itineraryForm').onchange=async e=>{
      if(e.target.dataset.uploadDay){await uploadItineraryImages(e.target.dataset.uploadDay,e.target.files);e.target.value='';}
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
    const payload={organization_id:org().id,title:x.title.trim(),client_id:x.client_id||null,booking_id:x.booking_id||null,destination:x.destination||'',start_date:x.start_date||null,end_date:x.end_date||null,status:x.status,introduction:x.introduction||'',days:d.days,updated_by:user().id};
    let r;
    if(d.created_at)r=await C().sb.from('itineraries').update(payload).eq('id',d.id);
    else r=await C().sb.from('itineraries').insert({...payload,id:d.id,created_by:user().id});
    if(r.error)return alert('Could not save itinerary: '+r.error.message);
    const current=new Set(d.days.flatMap(day=>day.images||[]));
    const removed=[...(window.ktbsItineraryOriginalImages||[])].filter(path=>!current.has(path));
    if(removed.length){const cleanup=await C().sb.storage.from('itinerary-images').remove(removed);if(cleanup.error)console.warn('Some removed itinerary images could not be deleted:',cleanup.error.message);}
    window.ktbsItineraryDraft=null;window.ktbsItineraryNewUploads=[];C().closeModal();await window.itinerariesPage();
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