const DBKEY='ktbs_v2_data';
const seed={clients:[{id:'CL000001',leadId:'LD000001',dateCreated:'2026-09-07',name:'Test Client',phone:'712345678',email:'test@kulu.co.ke',nationality:'Kenyan',passport:'TEST12345',destination:'Zanzibar',departure:'2026-09-20',returnDate:'2026-09-25',adults:2,children:0,budget:200000,leadSource:'Website',consultant:'Ann Mulwa',status:'NEW ENQUIRY',remarks:'',travelStatus:'PENDING'}],
quotations:[{no:'KT/2609/002',date:'2026-09-14',validUntil:'2026-09-21',consultant:'Ann Mulwa',clientId:'CL000001',clientName:'Test Client',destination:'Zanzibar',departure:'2026-09-20',returnDate:'2026-09-25',adults:2,children:0,supplier:'Hotel',items:[{service:'Accommodation',description:'',qty:1,unit:200000}],discount:0,deposit:0,status:'Draft'}],
bookings:[{no:'BK/2609/001',quote:'KT/2609/001',clientId:'CL000001',clientName:'Test Client',consultant:'Ann Mulwa',destination:'Zanzibar',departure:'2026-09-20',returnDate:'2026-09-25',supplier:'Hotel',status:'Quotation',selling:200000,paid:0,supplierCost:0,supplierPaid:0,reference:'',notes:'Created from quotation KT/2609/001',bookingDate:'2026-09-07'}],
suppliers:[],hotels:[]};
let data=JSON.parse(localStorage.getItem(DBKEY)||'null')||seed;
(function removeDemoClient(){
  if(!data||!Array.isArray(data.clients))return;
  const ids=new Set(data.clients.filter(c=>String(c.name).trim().toLowerCase()==='test client').map(c=>c.id));
  if(!ids.size)return;
  data.clients=data.clients.filter(c=>!ids.has(c.id));
  data.quotations=(data.quotations||[]).filter(q=>!ids.has(q.clientId)&&String(q.clientName).trim().toLowerCase()!=='test client');
  data.bookings=(data.bookings||[]).filter(b=>!ids.has(b.clientId)&&String(b.clientName).trim().toLowerCase()!=='test client');
  data.history=(data.history||[]).filter(h=>!ids.has(h.clientId)&&String(h.clientName).trim().toLowerCase()!=='test client');
  save();
})();
let page='dashboard';
if(!data.history)data.history=[]; if(!data._historySig)data._historySig=null; if(!data.clients)data.clients=[]; if(!data.bookings)data.bookings=[]; if(!data.quotations)data.quotations=[];
function save(){localStorage.setItem(DBKEY,JSON.stringify(data))}
const money=n=>'KES '+Number(n||0).toLocaleString();
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
function go(p){page=p;render()}
function badge(s){let c=/UNPAID|PENDING|DRAFT|QUOTATION/i.test(s)?'warn':/FOLLOW|CANCEL/i.test(s)?'red':'info';return `<span class="badge ${c}">${esc(s||'—')}</span>`}
function render(){document.querySelectorAll('#nav button').forEach(b=>b.classList.toggle('active',b.dataset.page===page));document.getElementById('pageTitle').textContent=page[0].toUpperCase()+page.slice(1);window[page+'Page']?.()}
function dashboardPage(){
 const sales=data.bookings.reduce((a,b)=>a+Number(b.selling||0),0),paid=data.bookings.reduce((a,b)=>a+Number(b.paid||0),0),cost=data.bookings.reduce((a,b)=>a+Number(b.supplierCost||0),0);
 document.getElementById('content').innerHTML=`<div class="welcome"><div><h1>Welcome, Ann</h1><p>Here’s what’s happening at Kulu Travels today.</p></div><div class="date"><b>Monday, 14 September 2026</b><br>Make it a day for new destinations</div></div>
 <div class="grid stats"><div class="card"><div class="stat-label">Total Clients</div><div class="stat-value">${data.clients.length}</div><div class="stat-note">Live client master</div></div><div class="card"><div class="stat-label">New Enquiries</div><div class="stat-value">${data.clients.filter(c=>c.status==='NEW ENQUIRY').length}</div><div class="stat-note">Current pipeline</div></div><div class="card"><div class="stat-label">Active Bookings</div><div class="stat-value">${data.bookings.length}</div><div class="stat-note">Current bookings</div></div><div class="card"><div class="stat-label">Upcoming Travel</div><div class="stat-value">${data.bookings.filter(b=>b.departure>='2026-09-14').length}</div><div class="stat-note">Future departures</div></div>
 <div class="card"><div class="stat-label">Client Payments Outstanding</div><div class="stat-value">${money(sales-paid)}</div><div class="stat-note">Calculated live</div></div><div class="card"><div class="stat-label">Supplier Balances</div><div class="stat-value">${money(data.bookings.reduce((a,b)=>a+Number(b.supplierCost||0)-Number(b.supplierPaid||0),0))}</div><div class="stat-note">Calculated live</div></div><div class="card"><div class="stat-label">Revenue (YTD)</div><div class="stat-value">${money(sales)}</div><div class="stat-note">From bookings</div></div><div class="card"><div class="stat-label">Gross Profit (YTD)</div><div class="stat-value">${money(sales-cost)}</div><div class="stat-note">Selling less supplier cost</div></div><div class="card"><div class="stat-label">Net Profit (YTD)</div><div class="stat-value">${money(sales-cost-data.bookings.reduce((a,b)=>a+Number(b.otherExpenses||0),0))}</div><div class="stat-note">Gross profit less other expenses</div></div></div>
 <div class="hero"><h2>Extraordinary <span class="script">Journeys</span><br>Begin Here</h2><p>More than travel. A better way to see the world.</p></div>
 <div class="grid two"><div class="card"><div class="section-head"><h3>Recent Bookings</h3><button class="link-btn" onclick="go('bookings')">View All</button></div>${bookingTable(5)}</div>
 <div class="card"><div class="section-head"><h3>Quick Actions</h3></div><div class="grid quick"><button onclick="newClient()">＋ Add New Client</button><button onclick="newQuotation()">▤ Create Quotation</button><button onclick="newBooking()">▣ New Booking</button><button onclick="go('history')">✈ Add Travel History</button><button onclick="recordPayment()">▣ Record Payment</button><button onclick="newSupplier()">◇ Add Supplier</button><button style="grid-column:1/-1" onclick="go('reports')">▥ View Reports</button></div></div></div>`;
}

function syncTravelHistory(){
  if(!Array.isArray(data.history)) data.history=[];
  const completed=(data.bookings||[]).filter(b=>['COMPLETED','Completed'].includes(String(b.status)));
  const ids=new Set(completed.map(b=>'HIST-'+b.no));
  data.history=data.history.filter(h=>ids.has(h.id));
  completed.forEach(b=>{
    const q=(data.quotations||[]).find(q=>q.no===b.quote);
    const h={id:'HIST-'+b.no,bookingNo:b.no,clientId:b.clientId||'',clientName:b.clientName||'',destination:b.destination||'',departure:b.departure||'',returnDate:b.returnDate||'',services:(q?.items||[]).map(x=>x.service).filter(Boolean).join(', '),supplier:b.supplier||b.hotel||'',selling:Number(b.selling||0),completedDate:b.returnDate||b.departure||b.bookingDate||''};
    const old=data.history.find(x=>x.id===h.id); if(old) Object.assign(old,h); else data.history.push(h);
  });
}
function clientHistory(id){syncTravelHistory();return (data.history||[]).filter(h=>h.clientId===id).sort((a,b)=>(b.departure||'').localeCompare(a.departure||''));}
function openClient(id){
  const c=data.clients.find(x=>x.id===id);if(!c)return;
  const hs=clientHistory(id),bs=data.bookings.filter(b=>b.clientId===id),spend=hs.reduce((n,h)=>n+Number(h.selling||0),0);
  openModal('Client Profile',`<div class="card" style="box-shadow:none"><div class="kicker">${esc(c.id)}</div><h2>${esc(c.name)}</h2><p>${esc(c.phone||'')} · ${esc(c.email||'')}</p><div class="form-grid"><div><b>Trips with Kulu</b><div style="font-size:20px">${hs.length}</div></div><div><b>Total Travel Value</b><div style="font-size:20px">${money(spend)}</div></div><div><b>Last Destination</b><div>${esc(hs[0]?.destination||'—')}</div></div></div></div><div class="page-card"><h3>Travel History</h3>${hs.length?`<table><thead><tr><th>Date</th><th>Destination</th><th>Experiences / Services</th><th>Hotel / Supplier</th><th>Booking</th><th>Value</th></tr></thead><tbody>${hs.map(h=>`<tr><td>${esc(h.departure||'—')}</td><td>${esc(h.destination||'—')}</td><td>${esc(h.services||'—')}</td><td>${esc(h.supplier||'—')}</td><td>${esc(h.bookingNo)}</td><td>${money(h.selling)}</td></tr>`).join('')}</tbody></table>`:`<p>No completed Kulu journeys yet. Completed bookings appear here automatically.</p>`}</div><div class="page-card"><h3>Current Kulu Activity</h3><p>Bookings: <b>${bs.length}</b></p></div>`);
}
function clientTable(arr=data.clients){
 syncTravelHistory();const hc={},latest={};(data.history||[]).forEach(h=>{hc[h.clientId]=(hc[h.clientId]||0)+1;if(!latest[h.clientId]||(h.departure||'')>(latest[h.clientId].departure||''))latest[h.clientId]=h;});
 return `<table><thead><tr><th>Client</th><th>Client ID</th><th>Contact</th><th>Current Destination</th><th>Kulu Travel History</th><th>Consultant</th><th>Status</th><th></th></tr></thead><tbody>${arr.map(c=>{let h=latest[c.id],n=hc[c.id]||0;return `<tr><td><b>${esc(c.name)}</b><br><small>${esc(c.email||'')}</small></td><td>${esc(c.id)}</td><td>${esc(c.phone||'')}</td><td>${esc(c.destination||'—')}</td><td><b>${n} trip${n===1?'':'s'}</b><br><small>${esc(h?.destination||'No completed trips yet')}</small></td><td>${esc(c.consultant||'')}</td><td>${badge(c.status)}</td><td><button class="link-btn" onclick="openClient('${c.id}')">Open</button></td></tr>`}).join('')}</tbody></table>`;
}
function clientsPage(){document.getElementById('content').innerHTML=`<div class="toolbar"><input id="clientFilter" placeholder="Search client name, ID, phone or destination…" oninput="filterClient()"><select id="clientStatus" onchange="filterClient()"><option value="">All statuses</option><option>NEW ENQUIRY</option><option>QUALIFIED</option><option>BOOKED</option><option>COMPLETED</option></select><button class="primary" onclick="newClient()">+ New Client</button></div><div class="page-card" id="clientTable">${clientTable()}</div>`}
function filterClient(){let q=(document.getElementById('clientFilter').value||'').toLowerCase(),s=document.getElementById('clientStatus').value;let a=data.clients.filter(c=>Object.values(c).join(' ').toLowerCase().includes(q)&&(s===''||c.status===s));document.getElementById('clientTable').innerHTML=clientTable(a)}
function leadsPage(){let a=data.clients.filter(c=>c.status==='NEW ENQUIRY'||c.status==='QUALIFIED');document.getElementById('content').innerHTML=`<div class="toolbar"><button class="primary" onclick="newClient()">+ New Lead / Client</button></div><div class="page-card"><div class="section-head"><h3>Lead Pipeline</h3><span class="kicker">${a.length} active</span></div>${clientTable(a)}</div>`}
function quotationTotal(q){return q.items.reduce((a,i)=>a+Number(i.qty||0)*Number(i.unit||0),0)-Number(q.discount||0)}
function quotationTable(){return `<table><thead><tr><th>Quotation</th><th>Client</th><th>Destination</th><th>Consultant</th><th>Total</th><th>Status</th><th></th></tr></thead><tbody>${data.quotations.map(q=>`<tr><td><b>${q.no}</b><br><small>${q.date}</small></td><td>${esc(q.clientName)}</td><td>${esc(q.destination)}</td><td>${esc(q.consultant)}</td><td>${money(quotationTotal(q))}</td><td>${badge((data.bookings.find(b=>b.quote===q.no)||{}).status||q.status)}</td><td><button class="link-btn" onclick="editQuotation('${q.no}')">Open</button></td></tr>`).join('')}</tbody></table>`}
function quotationsPage(){document.getElementById('content').innerHTML=`<div class="toolbar"><button class="primary" onclick="newQuotation()">+ New Quotation</button></div><div class="page-card">${quotationTable()}</div>`}
function bookingTable(n=999){return `<table><thead><tr><th>Booking</th><th>Client</th><th>Destination</th><th>Travel Date</th><th>Selling</th><th>Balance</th><th>Status</th></tr></thead><tbody>${data.bookings.slice(0,n).map(b=>`<tr><td><b>${b.no}</b><br><small>${b.quote}</small></td><td>${esc(b.clientName)}<br><small>${b.clientId}</small></td><td>${esc(b.destination)}</td><td>${b.departure}</td><td>${money(b.selling)}</td><td>${money(Number(b.selling)-Number(b.paid))}</td><td>${badge(b.status)}</td></tr>`).join('')}</tbody></table>`}
function bookingsPage(){document.getElementById('content').innerHTML=`<div class="toolbar"><button class="primary" onclick="newBooking()">+ New Booking</button><select id="bookingStatus" onchange="filterBookings()"><option value="">All statuses</option>${['Quotation','Confirmed','Partially Paid','Fully Paid','In Progress','COMPLETED','Cancelled'].map(x=>`<option>${x}</option>`).join('')}</select></div><div class="page-card" id="bookingTable">${bookingTable()}</div>`}
function filterBookings(){let s=document.getElementById('bookingStatus').value;document.getElementById('bookingTable').innerHTML=bookingTable(999,s)}
function bookingTable(n=999,status=''){let arr=data.bookings.filter(b=>!status||b.status===status);return `<table><thead><tr><th>Booking</th><th>Client / ID</th><th>Destination</th><th>Travel Date</th><th>Selling</th><th>Client Paid</th><th>Balance</th><th>Supplier Cost</th><th>Supplier Paid</th><th>Supplier Pending</th><th>Gross Profit</th><th>Other Expenses</th><th>Net Profit</th><th>Status</th><th></th></tr></thead><tbody>${arr.slice(0,n).map(b=>`<tr><td><b>${b.no}</b><br><small>${b.quote||''}</small></td><td>${esc(b.clientName)}<br><small>${b.clientId}</small></td><td>${esc(b.destination)}</td><td>${b.departure||'—'}</td><td>${money(b.selling)}</td><td>${money(b.paid)}</td><td>${money(+b.selling-(+b.paid||0))}</td><td>${money(b.supplierCost)}</td><td>${money(b.supplierPaid)}</td><td>${money(+b.supplierCost-(+b.supplierPaid||0))}</td><td>${money(+b.selling-(+b.supplierCost||0))}</td><td>${money(b.otherExpenses||0)}</td><td>${money(+b.selling-(+b.supplierCost||0)-(+b.otherExpenses||0))}</td><td>${badge(b.status)}</td><td><button class="link-btn" onclick="editBooking('${b.no}')">Open</button></td></tr>`).join('')}</tbody></table>`}
function saveInlinePartner(type,mode=''){
 const input=document.getElementById(mode==='new'?(type==='supplier'?'newBookingSupplier':'newBookingHotel'):(type==='supplier'?'bookingSupplier':'bookingHotel'));
 const name=(input?.value||'').trim();
 if(!name){alert(`Enter a ${type} name first.`);return;}
 if(type==='supplier'){
   if(!Array.isArray(data.suppliers))data.suppliers=[];
   if(!data.suppliers.some(x=>String(x.name).trim().toLowerCase()===name.toLowerCase()))data.suppliers.push({id:'SUP-'+Date.now(),name,contact:'',type:'Travel Supplier'});
   const sel=document.getElementById(mode==='new'?'newBookingSupplierSelect':'bookingSupplierSelect'); if(sel)sel.value=name;
 }else{
   if(!Array.isArray(data.hotels))data.hotels=[];
   if(!data.hotels.some(x=>String(x.name).trim().toLowerCase()===name.toLowerCase()))data.hotels.push({id:'HOT-'+Date.now(),name,destination:'',contact:''});
   const sel=document.getElementById(mode==='new'?'newBookingHotelSelect':'bookingHotelSelect'); if(sel)sel.value=name;
 }
 save(); alert(`${type.charAt(0).toUpperCase()+type.slice(1)} saved and added to the ${type}s list.`);
}
function bindPartnerSelects(mode=''){
 const suffix=mode==='new'?'newBooking':'booking';
 const ss=document.getElementById(suffix+'SupplierSelect'), si=document.getElementById(suffix+'Supplier');
 const hs=document.getElementById(suffix+'HotelSelect'), hi=document.getElementById(suffix+'Hotel');
 if(ss&&si)ss.onchange=()=>{if(ss.value)si.value=ss.value};
 if(hs&&hi)hs.onchange=()=>{if(hs.value)hi.value=hs.value};
}
function editBooking(no){
 let b=data.bookings.find(x=>x.no===no);if(!b)return;
 const supplierOpts=(data.suppliers||[]).map(s=>`<option ${b.supplier===s.name?'selected':''}>${esc(s.name)}</option>`).join('');
 const hotelOpts=(data.hotels||[]).map(h=>`<option ${b.hotel===h.name?'selected':''}>${esc(h.name)}</option>`).join('');
 openModal('Booking '+b.no,`<form id="editBook"><div class="form-grid">
 <label>Client<input value="${esc(b.clientName)} — ${b.clientId}" readonly></label><label>Quotation<input value="${esc(b.quote||'')}" readonly></label>
 <label>Destination<input value="${esc(b.destination)}" readonly></label><label>Travel Date<input value="${b.departure||''}" readonly></label>
 <label>Selling Amount<input type="number" name="selling" value="${b.selling||0}"></label><label>Amount Paid by Client<input type="number" name="paid" value="${b.paid||0}"></label>
 <label>Supplier<div class="inline-select"><select id="bookingSupplierSelect"><option value="">Select saved supplier…</option>${supplierOpts}</select><input name="supplier" id="bookingSupplier" value="${esc(b.supplier||'')}" placeholder="Or type a new supplier"><button type="button" onclick="saveInlinePartner('supplier')">＋ Save</button></div></label>
 <label>Hotel<div class="inline-select"><select id="bookingHotelSelect"><option value="">Select saved hotel…</option>${hotelOpts}</select><input name="hotel" id="bookingHotel" value="${esc(b.hotel||'')}" placeholder="Or type a new hotel"><button type="button" onclick="saveInlinePartner('hotel')">＋ Save</button></div></label>
 <label>Supplier Cost<input type="number" name="supplierCost" value="${b.supplierCost||0}"></label>
 <label>Supplier Paid Amount<input type="number" name="supplierPaid" value="${b.supplierPaid||0}"></label>
 <label>Other Expenses<input type="number" name="otherExpenses" value="${b.otherExpenses||0}" min="0"></label>
 <label>Booking Status<select name="status">${['Quotation','Confirmed','Partially Paid','Fully Paid','In Progress','COMPLETED','Cancelled'].map(x=>`<option ${b.status===x?'selected':''}>${x}</option>`).join('')}</select></label>
 <label>Booking Reference<input name="reference" value="${esc(b.reference||'')}"></label><label class="wide">Notes<textarea name="notes">${esc(b.notes||'')}</textarea></label></div>
 <div class="card" style="box-shadow:none;background:#f8fdfe;margin-top:12px"><div class="form-grid">
 <div><b>Client Balance (Selling − Paid)</b><div id="ebalance">${money((b.selling||0)-(b.paid||0))}</div></div>
 <div><b>Supplier Pending Payment</b><div id="esbalance">${money((b.supplierCost||0)-(b.supplierPaid||0))}</div></div>
 <div><b>Gross Profit</b><div id="eprofit">${money((b.selling||0)-(b.supplierCost||0))}</div></div>
 <div><b>Net Profit</b><div id="enprofit">${money((b.selling||0)-(b.supplierCost||0)-(b.otherExpenses||0))}</div></div>
 </div></div>
 <div class="actions"><button type="button" onclick="closeModal()">Cancel</button><button class="primary" type="submit">Save Booking</button></div></form>`);
 bindPartnerSelects();
 document.getElementById('editBook').addEventListener('input',()=>{
  let f=new FormData(editBook),s=+f.get('selling')||0,p=+f.get('paid')||0,c=+f.get('supplierCost')||0,sp=+f.get('supplierPaid')||0,e=+f.get('otherExpenses')||0;
  ebalance.textContent=money(s-p);esbalance.textContent=money(c-sp);eprofit.textContent=money(s-c);enprofit.textContent=money(s-c-e);
 });
 document.getElementById('editBook').onsubmit=e=>{
  e.preventDefault();
  let f=Object.fromEntries(new FormData(e.target));
  Object.assign(b,{selling:+f.selling||0,paid:Number(f.paid)||0,supplier:(f.supplier||document.getElementById('bookingSupplierSelect')?.value||''),hotel:(f.hotel||document.getElementById('bookingHotelSelect')?.value||''),supplierCost:Number(f.supplierCost)||0,supplierPaid:Number(f.supplierPaid)||0,otherExpenses:Number(f.otherExpenses)||0,status:f.status,reference:f.reference||'',notes:f.notes||''}); data._historySig=null;
  // Keep linked records synchronized.
  let qq=data.quotations.find(q=>q.no===b.quote);if(qq)qq.status=b.status;
  let cc=data.clients.find(c=>c.id===b.clientId);if(cc)cc.status=b.status;
  syncTravelHistory();data._historySig=null;syncTravelHistory();save();closeModal();go('bookings');
 };
}
function suppliersPage(){document.getElementById('content').innerHTML=`<div class="toolbar"><button class="primary" onclick="newSupplier()">+ New Supplier</button></div><div class="page-card">${data.suppliers.length?`<table><thead><tr><th>Supplier</th><th>Contact</th><th>Type</th></tr></thead><tbody>${data.suppliers.map(s=>`<tr><td>${esc(s.name)}</td><td>${esc(s.contact)}</td><td>${esc(s.type)}</td></tr>`).join('')}</tbody></table>`:'<div class="empty">No supplier records yet.</div>'}</div>`}
function hotelsPage(){document.getElementById('content').innerHTML=`<div class="toolbar"><button class="primary" onclick="newHotel()">+ New Hotel</button></div><div class="page-card">${data.hotels.length?`<table><thead><tr><th>Hotel</th><th>Destination</th><th>Contact</th></tr></thead><tbody>${data.hotels.map(h=>`<tr><td>${esc(h.name)}</td><td>${esc(h.destination)}</td><td>${esc(h.contact)}</td></tr>`).join('')}</tbody></table>`:'<div class="empty">No hotel records yet.</div>'}</div>`}
function financePage(){
 let sales=data.bookings.reduce((a,b)=>a+Number(b.selling||0),0),
 paid=data.bookings.reduce((a,b)=>a+Number(b.paid||0),0),
 cost=data.bookings.reduce((a,b)=>a+Number(b.supplierCost||0),0),
 supplierPaid=data.bookings.reduce((a,b)=>a+Number(b.supplierPaid||0),0),
 expenses=data.bookings.reduce((a,b)=>a+Number(b.otherExpenses||0),0);
 document.getElementById('content').innerHTML=`<div class="grid stats">
 <div class="card"><div class="stat-label">Selling Amount</div><div class="stat-value">${money(sales)}</div></div>
 <div class="card"><div class="stat-label">Client Paid</div><div class="stat-value">${money(paid)}</div></div>
 <div class="card"><div class="stat-label">Client Balance</div><div class="stat-value">${money(sales-paid)}</div></div>
 <div class="card"><div class="stat-label">Supplier Cost</div><div class="stat-value">${money(cost)}</div></div>
 <div class="card"><div class="stat-label">Supplier Paid</div><div class="stat-value">${money(supplierPaid)}</div></div>
 <div class="card"><div class="stat-label">Supplier Pending</div><div class="stat-value">${money(cost-supplierPaid)}</div></div>
 <div class="card"><div class="stat-label">Gross Profit</div><div class="stat-value">${money(sales-cost)}</div></div>
 <div class="card"><div class="stat-label">Net Profit</div><div class="stat-value">${money(sales-cost-expenses)}</div></div>
 </div>
 <div class="page-card" style="margin-top:16px"><div class="section-head"><h3>Booking Finance</h3><button class="primary" onclick="recordPayment()">+ Record Payment</button></div>${bookingTable()}</div>`;
}
function historyPage(){syncTravelHistory();document.getElementById('content').innerHTML=`<div class="toolbar"><input placeholder="Search client, destination or booking…" oninput="filterHistory(this.value)"></div><div class="page-card" id="historyTable">${historyTable()}</div>`}
function historyTable(filter=''){const f=String(filter||'').toLowerCase(),arr=(data.history||[]).filter(h=>!f||[h.clientName,h.clientId,h.destination,h.bookingNo,h.services,h.supplier].join(' ').toLowerCase().includes(f));return `<table><thead><tr><th>Client</th><th>Destination</th><th>Travel Date</th><th>Experiences / Services</th><th>Hotel / Supplier</th><th>Booking</th><th>Value</th></tr></thead><tbody>${arr.map(h=>`<tr><td><b>${esc(h.clientName)}</b><br><small>${esc(h.clientId)}</small></td><td>${esc(h.destination||'—')}</td><td>${esc(h.departure||'—')}</td><td>${esc(h.services||'—')}</td><td>${esc(h.supplier||'—')}</td><td>${esc(h.bookingNo)}</td><td>${money(h.selling)}</td></tr>`).join('')}</tbody></table>`}
function filterHistory(v){document.getElementById('historyTable').innerHTML=historyTable(v)}

function reportsPage(){document.getElementById('content').innerHTML=`<div class="grid stats"><div class="card"><div class="stat-label">Clients</div><div class="stat-value">${data.clients.length}</div></div><div class="card"><div class="stat-label">Quotations</div><div class="stat-value">${data.quotations.length}</div></div><div class="card"><div class="stat-label">Bookings</div><div class="stat-value">${data.bookings.length}</div></div><div class="card"><div class="stat-label">Completed Trips</div><div class="stat-value">${data.bookings.filter(b=>b.status==='COMPLETED').length}</div></div></div><div class="page-card" style="margin-top:16px"><h3>Consultant Activity</h3><p>Ann Mulwa: ${data.bookings.filter(b=>b.consultant==='Ann Mulwa').length} booking(s)</p></div>`}
function settingsPage(){document.getElementById('content').innerHTML=`<div class="page-grid"><div class="page-card"><h3>Numbering</h3><p>Client: CL000001 format</p><p>Lead: LD000001 format</p><p>Quotation: KT/YYMM/###</p><p>Booking: BK/YYMM/###</p></div><div class="page-card"><h3>Current User</h3><p><b>Ann</b><br>Administrator</p><p>Production version will add staff accounts and permissions.</p></div><div class="page-card"><h3>Local Data</h3><button class="primary" onclick="exportData()">Export Backup</button> <button onclick="resetData()">Reset Demo Data</button></div></div>`}
function pageGrid(){return null}
function openModal(title,body){document.getElementById('modalTitle').textContent=title;document.getElementById('modalBody').innerHTML=body;document.getElementById('modal').classList.remove('hidden')}
function closeModal(){document.getElementById('modal').classList.add('hidden')}
function nextId(prefix,key){let max=data[key].reduce((m,x)=>{let n=Number(String(x.id||'').replace(/\D/g,''));return Math.max(m,n)},0);return prefix+String(max+1).padStart(6,'0')}
function newClient(existing=null){
 let c=existing||{id:'',leadId:'',name:'',phone:'',email:'',nationality:'Kenyan',passport:'',destination:'',departure:'',returnDate:'',adults:1,children:0,budget:'',leadSource:'Website',consultant:'Ann Mulwa',status:'NEW ENQUIRY',remarks:'',travelStatus:'PENDING'};
 openModal(existing?'Edit Client':'Register Client',`<form id="clientForm"><div class="form-grid">
 <label>Client Name<input name="name" value="${esc(c.name)}" required></label><label>Phone Number<input name="phone" value="${esc(c.phone)}" required></label>
 <label>Email Address<input name="email" value="${esc(c.email)}"></label><label>Nationality<input name="nationality" value="${esc(c.nationality)}"></label>
 <label>Passport Number<input name="passport" value="${esc(c.passport)}"></label><label>Destination<input name="destination" value="${esc(c.destination)}"></label>
 <label>Departure Date<input type="date" name="departure" value="${c.departure}"></label><label>Return Date<input type="date" name="returnDate" value="${c.returnDate}"></label>
 <label>Adults<input type="number" min="1" name="adults" value="${c.adults}"></label><label>Children<input type="number" min="0" name="children" value="${c.children}"></label>
 <label>Budget (KES)<input type="number" min="0" name="budget" value="${c.budget}"></label><label>Lead Source<select name="leadSource">${['Website','Referral','Social Media','Walk-in','Other'].map(x=>`<option ${c.leadSource===x?'selected':''}>${x}</option>`).join('')}</select></label>
 <label>Consultant<input name="consultant" value="${esc(c.consultant)}"></label><label>Status<select name="status">${['NEW ENQUIRY','QUALIFIED','BOOKED','COMPLETED','CANCELLED'].map(x=>`<option ${c.status===x?'selected':''}>${x}</option>`).join('')}</select></label>
 <label class="wide">Remarks<textarea name="remarks">${esc(c.remarks)}</textarea></label></div><div class="actions"><button type="button" onclick="closeModal()">Cancel</button><button class="primary">Save Client</button></div></form>`);
 document.getElementById('clientForm').onsubmit=e=>{e.preventDefault();let f=new FormData(e.target),o=Object.fromEntries(f);o.adults=+o.adults;o.children=+o.children;o.budget=+o.budget;o.dateCreated=existing?.dateCreated||new Date().toISOString().slice(0,10);o.travelStatus=existing?.travelStatus||'PENDING';if(existing){Object.assign(existing,o)}else{Object.assign(o,{id:nextId('CL','clients'),leadId:nextId('LD','clients')});data.clients.push(o)}save();closeModal();go('clients')}
}
function editClient(id){let c=data.clients.find(x=>x.id===id);newClient(c)}
function newQuotation(){
 let q={no:'',date:new Date().toISOString().slice(0,10),validUntil:'',consultant:'Ann Mulwa',clientId:'',clientName:'',destination:'',departure:'',returnDate:'',adults:1,children:0,supplier:'',items:[{service:'',description:'',qty:1,unit:0}],discount:0,deposit:0,status:'Quotation'};
 const clients=data.clients||[];
 const opts=clients.map(c=>`<option value="${c.id}">${esc(c.name)} — ${c.id}</option>`).join('');
 openModal('Create Quotation',`<form id="qForm">
 <div class="form-grid">
 <label>Client <select name="clientId" id="qClientId"><option value="">Select existing client…</option>${opts}</select></label>
 <label>Client ID <input id="qClientIdText" readonly></label>
 <label>Phone <input id="qPhone" readonly></label><label>Email <input id="qEmail" readonly></label>
 <label>Destination <input name="destination" id="qDestination"></label><label>Consultant <input name="consultant" value="Ann Mulwa"></label>
 <label>Departure Date <input type="date" name="departure" id="qDeparture"></label><label>Return Date <input type="date" name="returnDate" id="qReturn"></label>
 <label>Adults <input type="number" min="1" name="adults" id="qAdults" value="1"></label><label>Children <input type="number" min="0" name="children" id="qChildren" value="0"></label>
 </div>
 <div id="selectedClient" class="card" style="display:none;box-shadow:none;background:#f8fdfe;margin:12px 0"></div>
 <h4>Services / Hotels / Travel Items</h4>
 <div id="quoteItems">${quoteRow()}</div>
 <button type="button" onclick="addQuoteItem()" style="margin-top:8px">+ Add another item</button>
 <div class="form-grid" style="margin-top:12px"><label>Discount (KES)<input type="number" name="discount" value="0" min="0"></label><label>Deposit Required (KES)<input type="number" name="deposit" value="0" min="0"></label></div>
 <div class="card" style="margin-top:15px;box-shadow:none;background:#f8fdfe"><div style="display:flex;justify-content:space-between"><b>Subtotal</b><b id="qSubtotal">KES 0</b></div><div style="display:flex;justify-content:space-between;margin-top:7px"><b>Discount</b><b id="qDiscount">KES 0</b></div><div style="display:flex;justify-content:space-between;margin-top:9px;font-size:17px"><b>Total</b><b id="qTotal">KES 0</b></div></div>
 <div class="actions"><button type="button" onclick="closeModal()">Cancel</button><button class="primary">Save Quotation → Create Booking</button></div>
 </form>`);
 qClientId.onchange=fillQuoteClient; document.getElementById('qForm').addEventListener('input',calcQuote); calcQuote();
 document.getElementById('qForm').onsubmit=e=>{
  e.preventDefault();let f=Object.fromEntries(new FormData(e.target)),c=data.clients.find(x=>x.id===f.clientId);if(!c){alert('Please select a client from Client Master.');return}
  let rows=[...document.querySelectorAll('.quote-row')].map(r=>({service:r.querySelector('[name=service]').value,description:r.querySelector('[name=description]').value,qty:+r.querySelector('[name=qty]').value||0,unit:+r.querySelector('[name=unit]').value||0}));
  let qno=`KT/${new Date().toISOString().slice(2,7).replace('-','')}/${String(data.quotations.length+1).padStart(3,'0')}`,total=rows.reduce((s,x)=>s+x.qty*x.unit,0)-(+f.discount||0);
  q={no:qno,date:f.date||new Date().toISOString().slice(0,10),validUntil:new Date(Date.now()+7*86400000).toISOString().slice(0,10),consultant:f.consultant,clientId:c.id,clientName:c.name,destination:f.destination,departure:f.departure,returnDate:f.returnDate,adults:+f.adults,children:+f.children,supplier:'',items:rows,discount:+f.discount||0,deposit:+f.deposit||0,total:Math.max(0,total),status:'Quotation'};
  data.quotations.push(q);
  let bno=`BK/${new Date().toISOString().slice(2,7).replace('-','')}/${String(data.bookings.length+1).padStart(3,'0')}`;
  data.bookings.push({no:bno,quote:q.no,clientId:c.id,clientName:c.name,consultant:q.consultant,destination:q.destination,departure:q.departure,returnDate:q.returnDate,status:'Quotation',selling:q.total,paid:0,supplierCost:0,supplierPaid:0,reference:'',notes:'Automatically created from '+q.no,bookingDate:q.date});
  data._historySig=null;syncTravelHistory();save();closeModal();go('bookings');alert(`Quotation ${q.no} saved and linked Booking ${bno} created.`);
 };
}
function quoteCatalog(){
 const defaults=["Air Ticketing","Hotel Accommodation","Safari Experience","Kigali City Tour","Akagera National Park Safari","Lamu Old Town Tour","Lamu Sunset Dhow Cruise","Private Charter","Airport Transfer","Ground Transportation","Car Hire","Visa Processing","Family Vacation","Honeymoon Package","Excursion","Travel Insurance","Meet & Greet","Custom Bespoke Itinerary","Other"];
 if(!Array.isArray(data.quoteCatalog)) data.quoteCatalog=[];
 return [...new Set([...defaults,...data.quoteCatalog.map(x=>x.name||x)].filter(Boolean))];
}
function quoteRow(){
 const services=quoteCatalog();
 return `<div class="form-grid quote-row"><label>Service / Hotel<div class="inline-select"><select name="service">${services.map(s=>`<option>${esc(s)}</option>`).join('')}</select><button type="button" onclick="addQuoteCatalogItem(this)">＋ Add New</button></div></label><label>Description<input name="description" placeholder="Details"></label><label>Qty<input type="number" name="qty" value="1" min="1"></label><label>Amount (KES)<input type="number" name="unit" value="0" min="0"></label></div>`;
}
function addQuoteCatalogItem(btn){
 openModal('Add New Service / Hotel / Travel Item',`<form id="catalogForm"><div class="form-grid">
 <label>Item Name<input name="name" required placeholder="e.g. Medina Palms Watamu"></label>
 <label>Category<select name="category"><option>Service</option><option>Hotel</option><option>Excursion</option><option>Transport</option><option>Flight</option><option>Safari</option><option>Other</option></select></label>
 <label>Destination<input name="destination" placeholder="e.g. Watamu"></label>
 <label>Default Amount (KES)<input name="amount" type="number" min="0" value="0"></label>
 </div>
 <p class="kicker">Once saved, this item will permanently appear in future quotations on this browser.</p>
 <div class="actions"><button type="button" onclick="closeModal()">Cancel</button><button class="primary">Save Item</button></div></form>`);
 document.getElementById('catalogForm').onsubmit=e=>{
   e.preventDefault();
   const f=Object.fromEntries(new FormData(e.target));
   const name=String(f.name||'').trim();
   if(!name){alert('Enter an item name.');return;}
   if(!Array.isArray(data.quoteCatalog))data.quoteCatalog=[];
   let item=data.quoteCatalog.find(x=>String(x.name||'').trim().toLowerCase()===name.toLowerCase());
   if(item){
     Object.assign(item,{category:f.category||item.category,destination:f.destination||item.destination,amount:Number(f.amount)||item.amount||0});
   }else{
     item={id:'ITEM-'+Date.now(),name,category:f.category||'Service',destination:f.destination||'',amount:Number(f.amount)||0};
     data.quoteCatalog.push(item);
   }
   save();
   closeModal();
   const row=btn.closest('.quote-row');
   const sel=row?.querySelector('[name=service]');
   if(sel){
     sel.innerHTML=quoteCatalog().map(s=>`<option>${esc(s)}</option>`).join('');
     sel.value=name;
   }
   if(row && item.amount) row.querySelector('[name=unit]').value=item.amount;
   calcQuote();
   alert(`${name} has been saved and added to the quotation dropdown.`);
 };
}
function fillQuoteClient(){
 let c=data.clients.find(x=>x.id===qClientId.value); if(!c)return;
 qClientIdText.value=c.id||'';qPhone.value=c.phone||'';qEmail.value=c.email||'';qDestination.value=c.destination||'';qDeparture.value=c.departure||'';qReturn.value=c.returnDate||'';qAdults.value=c.adults||1;qChildren.value=c.children||0;
 selectedClient.style.display='block';selectedClient.innerHTML=`<b>${esc(c.name)}</b> · ${esc(c.id)}<br><small>${esc(c.phone||'')} · ${esc(c.email||'')} · ${esc(c.destination||'')}</small>`;
}
function addQuoteItem(){const d=document.createElement('div');d.innerHTML=quoteRow();document.getElementById('quoteItems').appendChild(d.firstElementChild);}
function calcQuote(){const rows=[...document.querySelectorAll('.quote-row')];let sub=rows.reduce((s,r)=>s+(+(r.querySelector('[name=qty]')?.value||0))*(+(r.querySelector('[name=unit]')?.value||0)),0),dis=+(document.querySelector('[name=discount]')?.value||0);document.getElementById('qSubtotal').textContent=money(sub);document.getElementById('qDiscount').textContent=money(dis);document.getElementById('qTotal').textContent=money(Math.max(0,sub-dis));}

function editQuotation(){newQuotation()}
function newBooking(){
 const supplierOpts=(data.suppliers||[]).map(s=>`<option>${esc(s.name)}</option>`).join(''),hotelOpts=(data.hotels||[]).map(h=>`<option>${esc(h.name)}</option>`).join('');
 openModal('New Booking',`<form id="bForm"><div class="form-grid"><label>Quotation<select name="quote">${data.quotations.map(q=>`<option value="${q.no}">${q.no} — ${esc(q.clientName)}</option>`).join('')}</select></label><label>Status<select name="status">${['Quotation','Confirmed','Partially Paid','Fully Paid','In Progress','COMPLETED','Cancelled'].map(x=>`<option>${x}</option>`).join('')}</select></label><label>Selling Amount<input type="number" name="selling" required></label><label>Amount Paid by Client<input type="number" name="paid" value="0"></label><label>Supplier<div class="inline-select"><select id="newBookingSupplierSelect"><option value="">Select saved supplier…</option>${supplierOpts}</select><input name="supplier" id="newBookingSupplier" placeholder="Or type a new supplier"><button type="button" onclick="saveInlinePartner('supplier','new')">＋ Save</button></div></label><label>Hotel<div class="inline-select"><select id="newBookingHotelSelect"><option value="">Select saved hotel…</option>${hotelOpts}</select><input name="hotel" id="newBookingHotel" placeholder="Or type a new hotel"><button type="button" onclick="saveInlinePartner('hotel','new')">＋ Save</button></div></label><label>Supplier Cost<input type="number" name="supplierCost" value="0"></label><label>Supplier Paid Amount<input type="number" name="supplierPaid" value="0"></label><label>Other Expenses<input type="number" name="otherExpenses" value="0"></label><label>Booking Reference<input name="reference"></label><label class="wide">Notes<textarea name="notes"></textarea></label></div><div class="actions"><button type="button" onclick="closeModal()">Cancel</button><button class="primary" type="submit">Save Booking</button></div></form>`);
 bindPartnerSelects('new');
 document.getElementById('bForm').onsubmit=e=>{e.preventDefault();let f=Object.fromEntries(new FormData(e.target)),q=data.quotations.find(x=>x.no===f.quote),n=data.bookings.length+1;
 data.bookings.push({no:`BK/${new Date().toISOString().slice(2,7).replace('-','')}/${String(n).padStart(3,'0')}`,quote:f.quote,clientId:q?.clientId||'',clientName:q?.clientName||'',consultant:q?.consultant||'',destination:q?.destination||'',departure:q?.departure||'',returnDate:q?.returnDate||'',supplier:(f.supplier||document.getElementById('newBookingSupplierSelect')?.value||''),hotel:(f.hotel||document.getElementById('newBookingHotelSelect')?.value||''),status:f.status,selling:+f.selling||0,paid:+f.paid||0,supplierCost:Number(f.supplierCost)||0,supplierPaid:Number(f.supplierPaid)||0,otherExpenses:Number(f.otherExpenses)||0,reference:f.reference||'',notes:f.notes||'',bookingDate:new Date().toISOString().slice(0,10)});
 let b=data.bookings[data.bookings.length-1];data._historySig=null;if(q)q.status=b.status;let c=data.clients.find(x=>x.id===b.clientId);if(c)c.status=b.status;syncTravelHistory();data._historySig=null;syncTravelHistory();data._historySig=null;syncTravelHistory();save();closeModal();go('bookings');alert('Booking saved successfully. Finance, Reports and Client Travel History have been updated.');
 }
}
function recordPayment(){
 if(!data.bookings.length)return;
 openModal('Record Client Payment',`<form id="pForm"><label>Booking<select name="booking">${data.bookings.map(b=>`<option value="${b.no}">${b.no} — ${esc(b.clientName)} — ${money(b.selling)}</option>`).join('')}</select></label><label>Payment Amount (KES)<input name="amount" type="number" min="0" required></label><div class="actions"><button type="button" onclick="closeModal()">Cancel</button><button class="primary">Record Payment</button></div></form>`);
 document.getElementById('pForm').onsubmit=e=>{e.preventDefault();let f=Object.fromEntries(new FormData(e.target)),b=data.bookings.find(x=>x.no===f.booking);b.paid=Number(b.paid||0)+Number(f.amount||0);save();closeModal();go('finance')}
}
function newSupplier(){openModal('Add Supplier',`<form id="sForm"><label>Supplier Name<input name="name" required></label><label>Contact<input name="contact"></label><label>Type<input name="type" placeholder="Safari, Flight, Transfer…"></label><div class="actions"><button type="button" onclick="closeModal()">Cancel</button><button class="primary">Save Supplier</button></div></form>`);document.getElementById('sForm').onsubmit=e=>{e.preventDefault();data.suppliers=data.suppliers||[];data.suppliers.push(Object.fromEntries(new FormData(e.target)));save();closeModal();go('suppliers')}}
function newHotel(){openModal('Add Hotel',`<form id="hForm"><label>Hotel Name<input name="name" required></label><label>Destination<input name="destination"></label><label>Contact<input name="contact"></label><div class="actions"><button type="button" onclick="closeModal()">Cancel</button><button class="primary">Save Hotel</button></div></form>`);document.getElementById('hForm').onsubmit=e=>{e.preventDefault();data.hotels=data.hotels||[];data.hotels.push(Object.fromEntries(new FormData(e.target)));save();closeModal();go('hotels')}}
function globalSearch(q){if(!q){return}let s=q.toLowerCase();let c=data.clients.filter(x=>Object.values(x).join(' ').toLowerCase().includes(s));if(c.length){go('clients');setTimeout(()=>{document.getElementById('clientFilter').value=q;filterClient()},0)}}
function exportData(){let a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));a.download='KTBS_backup.json';a.click()}
function resetData(){if(confirm('Reset the local demo database?')){data=JSON.parse(JSON.stringify(seed));save();render()}}
document.querySelectorAll('#nav button').forEach(b=>b.onclick=()=>go(b.dataset.page));
document.getElementById('loginForm').onsubmit=e=>{e.preventDefault();if(username.value==='admin'&&password.value==='kulu123'){login.classList.add('hidden');app.classList.remove('hidden');render()}else alert('Invalid demo login.')};
document.getElementById('logout').onclick=()=>{app.classList.add('hidden');login.classList.remove('hidden')};
render();
