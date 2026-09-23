const { createClient } = window.supabase;
const sb = createClient(window.KTBS_SUPABASE_URL, window.KTBS_SUPABASE_ANON_KEY);

const STATUS=['New Enquiry','Quotation','Confirmed','Partially Paid','Fully Paid','In Progress','COMPLETED','Cancelled'];
let page='dashboard', me=null, profile=null;
let cache={clients:[],quotations:[],quotation_items:[],bookings:[],suppliers:[],hotels:[],services:[],history:[],expenses:[],payments:[],supplierPayments:[],profiles:[]};

const $=id=>document.getElementById(id);
const money=n=>'KES '+Number(n||0).toLocaleString('en-KE');
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const today=()=>new Date().toISOString().slice(0,10);
const isAdmin=()=>String(profile?.role||'').toLowerCase()==='admin';
const profileName=id=>cache.profiles.find(p=>p.id===id)?.full_name||'—';
const clientById=id=>cache.clients.find(c=>c.id===id);
const quoteById=id=>cache.quotations.find(q=>q.id===id);
const bookingById=id=>cache.bookings.find(b=>b.id===id);
function badge(s){const x=String(s||'—');let c=/PENDING|DRAFT|QUOTATION/i.test(x)?'warn':/CANCEL/i.test(x)?'red':'info';return `<span class="badge ${c}">${esc(x)}</span>`}
function openModal(title,body){$('modalTitle').textContent=title;$('modalBody').innerHTML=body;$('modal').classList.remove('hidden')}
function closeModal(){$('modal').classList.add('hidden')}
function go(p){page=p;render()}
function tableWrap(html){return `<div class="page-card">${html}</div>`}
function stat(label,value,note=''){return `<div class="card"><div class="stat-label">${esc(label)}</div><div class="stat-value">${value}</div><div class="stat-note">${esc(note)}</div></div>`}

async function q(table,select='*'){const {data,error}=await sb.from(table).select(select);if(error)throw error;return data||[]}
async function loadData(){
 const [clients,quotations,quotation_items,bookings,suppliers,hotels,services,history,expenses,payments,supplierPayments]=await Promise.all([
  q('clients'),q('quotations'),q('quotation_items'),q('bookings'),q('suppliers'),q('hotels'),q('services'),q('travel_history'),q('expenses'),q('client_payments'),q('supplier_payments')
 ]);
 let profiles=[];
try{
  profiles=await q('profiles');
}catch(e){
  profiles=[];
}
 cache={clients,quotations,quotation_items,bookings,suppliers,hotels,services,history,expenses,payments,supplierPayments,profiles};
}
async function refresh(){await loadData();render()}

function sumsForBooking(id){
 const cp=cache.payments.filter(p=>p.booking_id===id).reduce((a,p)=>a+Number(p.amount||0),0);
 const sp=cache.supplierPayments.filter(p=>p.booking_id===id).reduce((a,p)=>a+Number(p.amount||0),0);
 return {clientPaid:cp,supplierPaid:sp};
}
function financeForBooking(b){const s=sumsForBooking(b.id),selling=Number(b.selling_amount||0),cost=Number(b.supplier_cost||0),exp=Number(b.other_expenses||0);return {...s,selling,cost,exp,balance:selling-s.clientPaid,supplierPending:cost-s.supplierPaid,gross:selling-cost,net:selling-cost-exp}}
function render(){
 document.querySelectorAll('#nav button').forEach(b=>b.classList.toggle('active',b.dataset.page===page));
 $('pageTitle').textContent=page==='history'?'Travel History':page[0].toUpperCase()+page.slice(1);
 const fn=window[page+'Page'];if(fn)fn();
}

function dashboardPage(){
 const rows=cache.bookings.map(financeForBooking);const sales=rows.reduce((a,b)=>a+b.selling,0),paid=rows.reduce((a,b)=>a+b.clientPaid,0),cost=rows.reduce((a,b)=>a+b.cost,0),exp=rows.reduce((a,b)=>a+b.exp,0);
 const upcoming=cache.bookings.filter(b=>b.departure&&b.departure>=today()&&!['Cancelled','COMPLETED'].includes(b.status)).length;
 $('content').innerHTML=`<div class="welcome"><div><h1>Welcome, ${esc(profile?.full_name||me?.email||'Kulu Team')}</h1><p>Live Kulu Travels business overview.</p></div><div class="date"><b>${new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</b><br>Curated journeys. Seamless operations.</div></div>
 <div class="grid stats">
 ${stat('Total Clients',cache.clients.length,'Live client master')}${stat('Active Bookings',cache.bookings.filter(b=>!['Cancelled','COMPLETED'].includes(b.status)).length,'Current bookings')}${stat('Upcoming Travel',upcoming,'Future departures')}${stat('Client Payments Outstanding',money(sales-paid),'Selling less client payments')}${stat('Supplier Balances',money(cost-rows.reduce((a,b)=>a+b.supplierPaid,0)),'Supplier cost less paid')}${stat('Revenue (YTD)',money(sales),'From bookings')}${stat('Gross Profit (YTD)',money(sales-cost),'Selling less supplier cost')}${stat('Net Profit (YTD)',money(sales-cost-exp),'Gross profit less other expenses')}
 </div>
 <div class="hero"><h2>Extraordinary <span class="script">Journeys</span><br>Begin Here</h2><p>More than travel. A better way to see the world.</p></div>
 <div class="grid two"><div class="card"><div class="section-head"><h3>Recent Bookings</h3><button class="link-btn" onclick="go('bookings')">View All</button></div>${bookingTable(5)}</div><div class="card"><div class="section-head"><h3>Quick Actions</h3></div><div class="grid quick"><button onclick="newClient()">＋ Add New Client</button><button onclick="newQuotation()">▤ Create Quotation</button><button onclick="newBooking()">▣ New Booking</button><button onclick="recordPayment()">▣ Record Client Payment</button><button onclick="recordSupplierPayment()">◇ Supplier Payment</button><button onclick="newSupplier()">＋ Add Supplier</button><button style="grid-column:1/-1" onclick="go('reports')">▥ View Reports</button></div></div></div>`;
}

function clientTable(arr=cache.clients){
 const count={};cache.history.forEach(h=>count[h.client_id]=(count[h.client_id]||0)+1);
 return `<table><thead><tr><th>Client</th><th>Client ID</th><th>Contact</th><th>Destination</th><th>Kulu Travel History</th><th>Consultant</th><th>Status</th><th></th></tr></thead><tbody>${arr.map(c=>`<tr><td><b>${esc(c.name)}</b><br><small>${esc(c.email||'')}</small></td><td>${esc(c.client_code||'—')}</td><td>${esc(c.phone||'')}</td><td>${esc(c.destination||'—')}</td><td><b>${count[c.id]||0} trip${(count[c.id]||0)===1?'':'s'}</b></td><td>${esc(profileName(c.consultant_id))}</td><td>${badge(c.status)}</td><td><button class="link-btn" onclick="openClient('${c.id}')">Open</button></td></tr>`).join('')}</tbody></table>`;
}
function clientsPage(){$('content').innerHTML=`<div class="toolbar"><input id="clientFilter" placeholder="Search client name, ID, phone or destination…" oninput="filterClient()"><button class="primary" onclick="newClient()">+ New Client</button></div>${tableWrap(`<div id="clientTable">${clientTable()}</div>`)}`}
function filterClient(){const v=($('clientFilter')?.value||'').toLowerCase();$('clientTable').innerHTML=clientTable(cache.clients.filter(c=>Object.values(c).join(' ').toLowerCase().includes(v)))}

async function openClient(id){
  const c=clientById(id);
  if(!c)return;

  const hs=cache.history
    .filter(h=>h.client_id===id)
    .sort((a,b)=>String(b.departure||'').localeCompare(String(a.departure||'')));

  const bs=cache.bookings.filter(b=>b.client_id===id);

  const financials=bs.map(financeForBooking);

  const paidToKulu=financials.reduce((n,f)=>n+Number(f.clientPaid||0),0);

  const bookedValue=financials.reduce((n,f)=>n+Number(f.selling||0),0);

  const outstandingBalance=financials.reduce((n,f)=>n+Number(f.balance||0),0);

  openModal('Client Profile',`
    <div class="card" style="box-shadow:none">
      <div class="kicker">${esc(c.client_code||'')}</div>

      <h2>${esc(c.name)}</h2>

     <p>${esc(c.phone||'')} · ${esc(c.email||'')}</p>

<div class="card" style="margin:12px 0;box-shadow:none">
  <div class="kicker">ACCOUNTABILITY</div>

  <b>Assigned Consultant</b>
  <div style="margin-top:4px">
    ${esc(profileName(c.consultant_id))}
  </div>

  <div style="margin-top:12px">
    <b>Last Updated By</b>
    <div style="margin-top:4px">
      ${esc(profileName(c.updated_by))}
    </div>
  </div>
</div>

<div class="form-grid">

        <div>
          <b>Trips with Kulu</b>
          <div class="big-number">${hs.length}</div>
        </div>

        <div>
          <b>Paid to Kulu</b>
          <div class="big-number">${money(paidToKulu)}</div>
        </div>

        <div>
          <b>Booked Value</b>
          <div class="big-number">${money(bookedValue)}</div>
        </div>

        <div>
          <b>Outstanding Balance</b>
          <div class="big-number">${money(outstandingBalance)}</div>
        </div>

        <div>
          <b>Last Destination</b>
          <div>${esc(hs[0]?.destination||'—')}</div>
        </div>

      </div>
    </div>

    <div class="page-card">
      <h3>Travel History</h3>
      ${hs.length
        ? historyTable('',hs)
        : '<p>No completed Kulu journeys yet. Completed bookings appear here automatically.</p>'
      }
    </div>

    <div class="page-card">
      <h3>Current Kulu Activity</h3>
      <p>Bookings: <b>${bs.length}</b></p>
    </div>

    ${isAdmin()
      ? `<div class="actions">
          <button onclick="editClient('${id}')">Edit Client</button>
          <button onclick="deleteClient('${id}')">Delete Client</button>
        </div>`
      : ''
    }
  `);
}
async function nextClientCode(){const rows=await q('clients','client_code');let max=0;rows.forEach(x=>{const m=String(x.client_code||'').match(/(\d+)$/);if(m)max=Math.max(max,+m[1])});return 'CL'+String(max+1).padStart(6,'0')}
async function nextDoc(prefix,table,col){const rows=await q(table,col);let max=0;rows.forEach(x=>{const m=String(x[col]||'').match(/(\d+)$/);if(m)max=Math.max(max,+m[1])});const ym=new Date().toISOString().slice(2,7).replace('-','');return `${prefix}/${ym}/${String(max+1).padStart(3,'0')}`}

async function newClient(existing=null){
 const c=existing||{name:'',phone:'',email:'',nationality:'Kenyan',passport:'',destination:'',departure:'',return_date:'',adults:1,children:0,budget:0,lead_source:'Website',consultant_id:me?.id||'',status:'New Enquiry',remarks:''};
 const consultantOpts=(cache.profiles||[]).map(p=>`<option value="${p.id}" ${p.id===c.consultant_id?'selected':''}>${esc(p.full_name||p.id)}</option>`).join('');
 openModal(existing?'Edit Client':'Register Client',`<form id="clientForm"><div class="form-grid"><label>Client Name<input name="name" value="${esc(c.name)}" required></label><label>Phone Number<input name="phone" value="${esc(c.phone||'')}" required></label><label>Email Address<input name="email" value="${esc(c.email||'')}"></label><label>Nationality<input name="nationality" value="${esc(c.nationality||'')}"></label><label>Passport Number<input name="passport" value="${esc(c.passport||'')}"></label><label>Destination<input name="destination" value="${esc(c.destination||'')}"></label><label>Departure Date<input type="date" name="departure" value="${c.departure||''}"></label><label>Return Date<input type="date" name="return_date" value="${c.return_date||''}"></label><label>Adults<input type="number" min="1" name="adults" value="${c.adults||1}"></label><label>Children<input type="number" min="0" name="children" value="${c.children||0}"></label><label>Budget (KES)<input type="number" min="0" name="budget" value="${c.budget||0}"></label><label>Lead Source<select name="lead_source">${['Website','Referral','Social Media','Walk-in','Other'].map(x=>`<option ${c.lead_source===x?'selected':''}>${x}</option>`).join('')}</select></label><label>Consultant<select name="consultant_id">${consultantOpts||`<option value="${me?.id||''}">${esc(profile?.full_name||me?.email||'Current User')}</option>`}</select></label><label>Status<select name="status">${STATUS.map(x=>`<option ${c.status===x?'selected':''}>${x}</option>`).join('')}</select></label><label class="wide">Remarks<textarea name="remarks">${esc(c.remarks||'')}</textarea></label></div><div class="actions"><button type="button" onclick="closeModal()">Cancel</button><button class="primary">Save Client</button></div></form>`);
 $('clientForm').onsubmit=async e=>{e.preventDefault();if(existing&&!isAdmin())return alert('Only an administrator can edit saved clients.');const f=Object.fromEntries(new FormData(e.target));const payload={...f,departure:f.departure||null,return_date:f.return_date||null,adults:+f.adults||1,children:+f.children||0,budget:+f.budget||0,consultant_id:f.consultant_id||null,updated_by:me.id};if(existing){const r=await sb.from('clients').update(payload).eq('id',existing.id);if(r.error)return alert(r.error.message)}else{payload.client_code=await nextClientCode();payload.created_by=me.id;const r=await sb.from('clients').insert(payload);if(r.error)return alert(r.error.message)}await refresh();closeModal();go('clients')}
}
function editClient(id){const c=clientById(id);if(c)newClient(c)}
async function deleteClient(id){if(!isAdmin())return alert('Only an administrator can delete clients.');if(!confirm('Delete this client? This is permanent.'))return;const r=await sb.from('clients').delete().eq('id',id);if(r.error)return alert(r.error.message);await refresh();closeModal();go('clients')}

function quotationTable(){return `<table><thead><tr><th>Quotation</th><th>Client</th><th>Destination</th><th>Consultant</th><th>Total</th><th>Status</th><th></th></tr></thead><tbody>${cache.quotations.map(q=>{const c=clientById(q.client_id);return `<tr><td><b>${esc(q.quotation_no)}</b><br><small>${q.date||''}</small></td><td>${esc(c?.name||'—')}</td><td>${esc(q.destination||'')}</td><td>${esc(profileName(q.consultant_id))}</td><td>${money(q.total)}</td><td>${badge(q.status)}</td><td><button class="link-btn" onclick="openQuotation('${q.id}')">Open</button></td></tr>`}).join('')}</tbody></table>`}
function quotationsPage(){$('content').innerHTML=`<div class="toolbar"><button class="primary" onclick="newQuotation()">+ New Quotation</button></div>${tableWrap(quotationTable())}`}
function quoteItemsFor(qid){return cache.quotation_items.filter(i=>i.quotation_id===qid)}
function serviceOptions(selected=''){return cache.services.filter(s=>s.active!==false).map(s=>`<option value="${s.id}" data-name="${esc(s.name)}" ${s.id===selected?'selected':''}>${esc(s.name)}</option>`).join('')}
function quoteRow(item={}){return `<div class="form-grid quote-row"><label>Service / Travel Item<select name="service_id">${serviceOptions(item.service_id)}<option value="">Other</option></select></label><label>Service Name<input name="service_name" value="${esc(item.service_name||'')}" placeholder="Or type a new item"></label><label>Description<input name="description" value="${esc(item.description||'')}" placeholder="Details"></label><label>Qty<input type="number" name="qty" value="${item.qty||1}" min="1"></label><label>Amount (KES)<input type="number" name="unit_amount" value="${item.unit_amount||0}" min="0"></label></div>`}
function calcQuote(){const rows=[...document.querySelectorAll('.quote-row')];const sub=rows.reduce((s,r)=>s+(+r.querySelector('[name=qty]').value||0)*(+r.querySelector('[name=unit_amount]').value||0),0),dis=+(document.querySelector('[name=discount]')?.value||0);if($('qSubtotal'))$('qSubtotal').textContent=money(sub);if($('qDiscount'))$('qDiscount').textContent=money(dis);if($('qTotal'))$('qTotal').textContent=money(Math.max(0,sub-dis))}
function addQuoteItem(){const d=document.createElement('div');d.innerHTML=quoteRow();$('quoteItems').appendChild(d.firstElementChild);calcQuote()}
function fillQuoteClient(){const c=clientById($('qClientId').value);if(!c)return;$('qClientIdText').value=c.client_code||'';$('qPhone').value=c.phone||'';$('qEmail').value=c.email||'';$('qDestination').value=c.destination||'';$('qDeparture').value=c.departure||'';$('qReturn').value=c.return_date||'';$('qAdults').value=c.adults||1;$('qChildren').value=c.children||0;$('selectedClient').style.display='block';$('selectedClient').innerHTML=`<b>${esc(c.name)}</b> · ${esc(c.client_code||'')}<br><small>${esc(c.phone||'')} · ${esc(c.email||'')}</small>`}
async function saveServiceFromQuote(){const name=($('quoteNewService')?.value||'').trim();if(!name)return alert('Enter a service or travel item name first.');const exists=cache.services.some(s=>s.name.toLowerCase()===name.toLowerCase());if(exists)return alert('That service already exists.');const r=await sb.from('services').insert({name,active:true,created_by:me.id,updated_by:me.id});if(r.error)return alert(r.error.message);await loadData();$('quoteItems').insertAdjacentHTML('beforeend',quoteRow({service_name:name}));$('quoteNewService').value='';alert('Service saved to the master list and added to this quotation.');calcQuote()}
async function newQuotation(existing=null){
 if(existing&&!isAdmin())return alert('Only an administrator can edit saved quotations.');
 const q=existing||{};const clients=cache.clients.map(c=>`<option value="${c.id}" ${c.id===q.client_id?'selected':''}>${esc(c.name)} — ${esc(c.client_code||'')}</option>`).join('');const items=existing?quoteItemsFor(existing.id):[{}];
 openModal(existing?'Edit Quotation':'Create Quotation',`<form id="qForm"><div class="form-grid"><label>Client <select name="client_id" id="qClientId"><option value="">Select existing client…</option>${clients}</select></label><label>Client ID <input id="qClientIdText" readonly></label><label>Phone <input id="qPhone" readonly></label><label>Email <input id="qEmail" readonly></label><label>Destination <input name="destination" id="qDestination" value="${esc(q.destination||'')}"></label><label>Consultant <select name="consultant_id">${(cache.profiles.length?cache.profiles:[profile]).map(p=>`<option value="${p?.id||''}" ${p?.id===q.consultant_id?'selected':''}>${esc(p?.full_name||me?.email||'')}</option>`).join('')}</select></label><label>Departure Date <input type="date" name="departure" id="qDeparture" value="${q.departure||''}"></label><label>Return Date <input type="date" name="return_date" id="qReturn" value="${q.return_date||''}"></label><label>Adults <input type="number" min="1" name="adults" id="qAdults" value="${q.adults||1}"></label><label>Children <input type="number" min="0" name="children" id="qChildren" value="${q.children||0}"></label></div><div id="selectedClient" class="card selected-client"></div><h4>Services / Hotels / Travel Items</h4><div id="quoteItems">${items.map(quoteRow).join('')}</div><div class="inline-add"><input id="quoteNewService" placeholder="New service / travel item"><button type="button" onclick="saveServiceFromQuote()">＋ Save to Services</button><button type="button" onclick="addQuoteItem()">＋ Add another item</button></div><div class="form-grid" style="margin-top:12px"><label>Discount (KES)<input type="number" name="discount" value="${q.discount||0}" min="0"></label><label>Deposit Required (KES)<input type="number" name="deposit" value="${q.deposit||0}" min="0"></label><label>Status<select name="status">${STATUS.map(x=>`<option ${q.status===x?'selected':''}>${x}</option>`).join('')}</select></label></div><div class="card total-box"><div><b>Subtotal</b><b id="qSubtotal">KES 0</b></div><div><b>Discount</b><b id="qDiscount">KES 0</b></div><div><b>Total</b><b id="qTotal">KES 0</b></div></div><div class="actions"><button type="button" onclick="closeModal()">Cancel</button><button class="primary">${existing?'Save Quotation':'Save Quotation → Create Booking'}</button></div></form>`);
 if(q.client_id)fillQuoteClient();$('qClientId').onchange=fillQuoteClient;$('qForm').addEventListener('input',calcQuote);calcQuote();
 $('qForm').onsubmit=async e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.target)),c=clientById(f.client_id);if(!c)return alert('Please select a client.');const rows=[...document.querySelectorAll('.quote-row')].map(r=>{const sel=r.querySelector('[name=service_id]'),name=r.querySelector('[name=service_name]').value.trim()||sel.selectedOptions[0]?.textContent||'Other';return {service_id:sel.value||null,service_name:name,description:r.querySelector('[name=description]').value,qty:+r.querySelector('[name=qty]').value||1,unit_amount:+r.querySelector('[name=unit_amount]').value||0}});const subtotal=rows.reduce((s,x)=>s+x.qty*x.unit_amount,0),total=Math.max(0,subtotal-(+f.discount||0));
  if(existing){const r=await sb.from('quotations').update({client_id:c.id,consultant_id:f.consultant_id||null,destination:f.destination,departure:f.departure||null,return_date:f.return_date||null,adults:+f.adults||1,children:+f.children||0,discount:+f.discount||0,deposit:+f.deposit||0,total,status:f.status,updated_by:me.id}).eq('id',existing.id);if(r.error)return alert(r.error.message);const d=await sb.from('quotation_items').delete().eq('quotation_id',existing.id);if(d.error)return alert(d.error.message);const ir=await sb.from('quotation_items').insert(rows.map(x=>({...x,quotation_id:existing.id})));if(ir.error)return alert(ir.error.message);const br=await sb.from('bookings').update({client_id:c.id,consultant_id:f.consultant_id||null,destination:f.destination,departure:f.departure||null,return_date:f.return_date||null,selling_amount:total,status:f.status}).eq('quotation_id',existing.id);if(br.error)return alert(br.error.message);
  }else{const no=await nextDoc('KT','quotations','quotation_no');const r=await sb.from('quotations').insert({quotation_no:no,client_id:c.id,consultant_id:f.consultant_id||me.id,date:today(),valid_until:new Date(Date.now()+7*86400000).toISOString().slice(0,10),destination:f.destination,departure:f.departure||null,return_date:f.return_date||null,adults:+f.adults||1,children:+f.children||0,discount:+f.discount||0,deposit:+f.deposit||0,total,status:'Quotation',created_by:me.id}).select().single();if(r.error)return alert(r.error.message);const ir=await sb.from('quotation_items').insert(rows.map(x=>({...x,quotation_id:r.data.id})));if(ir.error)return alert(ir.error.message);const bno=await nextDoc('BK','bookings','booking_no');const br=await sb.from('bookings').insert({booking_no:bno,quotation_id:r.data.id,client_id:c.id,consultant_id:f.consultant_id||me.id,destination:f.destination,departure:f.departure||null,return_date:f.return_date||null,status:'Quotation',selling_amount:total,supplier_cost:0,other_expenses:0,booking_date:today(),created_by:me.id});if(br.error)return alert(br.error.message);await sb.from('clients').update({status:'Quotation'}).eq('id',c.id);}
  await refresh();closeModal();go(existing?'quotations':'bookings');
 }
}
function openQuotation(id){const q=quoteById(id);if(!q)return;newQuotation(q)}
function editQuotation(id){openQuotation(id)}

function bookingTable(n=999,status=''){const arr=cache.bookings.filter(b=>!status||b.status===status);return `<table><thead><tr><th>Booking</th><th>Client / ID</th><th>Destination</th><th>Travel Date</th><th>Selling</th><th>Client Paid</th><th>Balance</th><th>Supplier Cost</th><th>Supplier Paid</th><th>Supplier Pending</th><th>Gross Profit</th>
<th>Net Profit</th>
<th>Consultant</th>
<th>Booking Status</th>
<th>Action</th></tr></thead><tbody>${arr.slice(0,n).map(b=>{const c=clientById(b.client_id),f=financeForBooking(b);return `<tr><td><b>${esc(b.booking_no)}</b><br><small>${esc(quoteById(b.quotation_id)?.quotation_no||'')}</small></td><td>${esc(c?.name||'—')}<br><small>${esc(c?.client_code||'')}</small></td><td>${esc(b.destination||'')}</td><td>${esc(b.departure||'—')}</td><td>${money(f.selling)}</td><td>${money(f.clientPaid)}</td><td>${money(f.balance)}</td><td>${money(f.cost)}</td><td>${money(f.supplierPaid)}</td><td>${money(f.supplierPending)}</td><td>${money(f.gross)}</td><td>${money(f.net)}</td><td>${esc(profileName(b.consultant_id))}</td>
<td>${badge(b.status)}</td>
<td><button class="link-btn" onclick="openBooking('${b.id}')">Open</button></td></tr>`}).join('')}</tbody></table>`}
function bookingsPage(){$('content').innerHTML=`<div class="toolbar"><button class="primary" onclick="newBooking()">+ New Booking</button><select id="bookingStatus" onchange="filterBookings()"><option value="">All statuses</option>${STATUS.map(x=>`<option>${x}</option>`).join('')}</select></div>${tableWrap(`<div id="bookingTable">${bookingTable()}</div>`)}`}
function filterBookings(){$('bookingTable').innerHTML=bookingTable(999,$('bookingStatus').value)}
function partnerOptions(list,selected){return list.map(x=>`<option value="${x.id}" ${x.id===selected?'selected':''}>${esc(x.name)}</option>`).join('')}
async function savePartnerFromBooking(type){const name=($(type==='supplier'?'bookingSupplierNew':'bookingHotelNew')?.value||'').trim();if(!name)return alert(`Enter a ${type} name first.`);const table=type==='supplier'?'suppliers':'hotels';const exists=cache[table].find(x=>x.name.toLowerCase()===name.toLowerCase());if(exists){$(type==='supplier'?'bookingSupplierId':'bookingHotelId').value=exists.id;return}const payload=type==='supplier'?{name,type:'Travel Supplier',created_by:me.id}:{name,destination:'',created_by:me.id};const r=await sb.from(table).insert(payload).select().single();if(r.error)return alert(r.error.message);await loadData();$(type==='supplier'?'bookingSupplierId':'bookingHotelId').value=r.data.id;alert(`${type[0].toUpperCase()+type.slice(1)} saved to the master list.`)}
async function openBooking(id){const b=bookingById(id);if(!b)return;await editBooking(b)}
async function editBooking(b){
  const c=clientById(b.client_id);
  const f=financeForBooking(b);

  openModal('Booking '+b.booking_no,`
    <form id="editBook">

      <div class="form-grid">

        <label>
          Client
          <input value="${esc(c?.name||'')} — ${esc(c?.client_code||'')}" readonly>
        </label>
        <label>
  Assigned Consultant
  <input value="${esc(profileName(b.consultant_id))}" readonly>
</label>

        <label>
          Quotation
          <input value="${esc(quoteById(b.quotation_id)?.quotation_no||'')}" readonly>
        </label>

        <label>
          Destination
          <input value="${esc(b.destination||'')}" readonly>
        </label>

        <label>
          Travel Date
          <input value="${esc(b.departure||'')}" readonly>
        </label>

        <label>
          Selling Amount
          <input type="number"
                 name="selling_amount"
                 value="${b.selling_amount||0}"
                 min="0">
        </label>

        <label>
          Client Paid
          <input type="number"
                 name="client_paid"
                 value="${f.clientPaid||0}"
                 min="0">
        </label>

        <label>
          Supplier Cost
          <input type="number"
                 name="supplier_cost"
                 value="${b.supplier_cost||0}"
                 min="0">
        </label>

        <label>
          Supplier Paid
          <input type="number"
                 name="supplier_paid"
                 value="${f.supplierPaid||0}"
                 min="0">
        </label>

        <label>
          Other Expenses
          <input type="number"
                 name="other_expenses"
                 value="${b.other_expenses||0}"
                 min="0">
        </label>

        <label>
          Supplier
          <select name="supplier_id" id="bookingSupplierId">
            <option value="">Select supplier…</option>
            ${partnerOptions(cache.suppliers,b.supplier_id)}
          </select>

          <input id="bookingSupplierNew"
                 placeholder="Or type new supplier">

          <button type="button"
                  onclick="savePartnerFromBooking('supplier')">
            ＋ Save New Supplier
          </button>
        </label>

        <label>
          Hotel
          <select name="hotel_id" id="bookingHotelId">
            <option value="">Select hotel…</option>
            ${partnerOptions(cache.hotels,b.hotel_id)}
          </select>

          <input id="bookingHotelNew"
                 placeholder="Or type new hotel">

          <button type="button"
                  onclick="savePartnerFromBooking('hotel')">
            ＋ Save New Hotel
          </button>
        </label>

        <label>
          Booking Status
          <select name="status">
            ${STATUS.map(x=>`
              <option ${b.status===x?'selected':''}>${x}</option>
            `).join('')}
          </select>
        </label>

        <label>
          Booking Reference
          <input name="reference"
                 value="${esc(b.reference||'')}">
        </label>

        <label class="wide">
          Notes
          <textarea name="notes">${esc(b.notes||'')}</textarea>
        </label>

      </div>

      <div class="card total-box">

        <div>
          <b>Client Balance</b>
          <b id="ebalance">${money(f.balance)}</b>
        </div>

        <div>
          <b>Supplier Pending</b>
          <b id="esbalance">${money(f.supplierPending)}</b>
        </div>

        <div>
          <b>Gross Profit</b>
          <b id="eprofit">${money(f.gross)}</b>
        </div>

        <div>
          <b>Net Profit</b>
          <b id="enprofit">${money(f.net)}</b>
        </div>

      </div>

      <div class="actions">
        <button type="button" onclick="closeModal()">Cancel</button>
        <button class="primary" type="submit">
          Save Booking
        </button>
      </div>

    </form>
  `);

  $('editBook').addEventListener('input',()=>{

    const x=Object.fromEntries(
      new FormData($('editBook'))
    );

    const selling=Number(x.selling_amount)||0;
    const clientPaid=Number(x.client_paid)||0;
    const supplierCost=Number(x.supplier_cost)||0;
    const supplierPaid=Number(x.supplier_paid)||0;
    const expenses=Number(x.other_expenses)||0;
  

 

    $('ebalance').textContent=
      money(selling-clientPaid);

    $('esbalance').textContent=
      money(supplierCost-supplierPaid);

    $('eprofit').textContent=
      money(selling-supplierCost);

    $('enprofit').textContent=
      money(selling-supplierCost-expenses);
  });

  $('editBook').onsubmit=async e=>{

    e.preventDefault();

    const x=Object.fromEntries(
      new FormData(e.target)
    );

    const selling=Number(x.selling_amount)||0;
    const clientPaid=Number(x.client_paid)||0;
    const supplierCost=Number(x.supplier_cost)||0;
    const supplierPaid=Number(x.supplier_paid)||0;
    const expenses=Number(x.other_expenses)||0;
  

const paymentStatus =
  selling>0
    ? (clientPaid<=0 ? 'Quotation' : clientPaid>=selling ? 'Fully Paid' : 'Partially Paid')
    : (clientPaid>0 ? 'Partially Paid' : 'Quotation');

const requestedStatus =
  ['Quotation','Partially Paid','Fully Paid'].includes(x.status)
    ? paymentStatus
    : x.status;

const validation=validateBookingStatus({
  requested:requestedStatus,
  current:b.status,
  clientPaid,
  selling,
  supplierCost,
  supplierPaid,
  supplierId:x.supplier_id,
  hotelId:x.hotel_id,
  returnDate:b.return_date,
  quotation:quoteById(b.quotation_id)
});

if(!validation.ok){
  alert(validation.message);
  return;
}

const finalStatus=validation.status;

    /*
      Save the main booking information.
    */
    const r=await sb
      .from('bookings')
      .update({
        selling_amount:selling,
        supplier_cost:supplierCost,
        other_expenses:expenses,
        updated_by:me.id,
        supplier_id:x.supplier_id||null,
        supplier_name:
          cache.suppliers.find(s=>s.id===x.supplier_id)?.name||null,
        hotel_id:x.hotel_id||null,
        hotel_name:
          cache.hotels.find(h=>h.id===x.hotel_id)?.name||null,
        status:finalStatus,
        reference:x.reference||'',
        notes:x.notes||''
      })
      .eq('id',b.id);

    if(r.error){
      alert(r.error.message);
      return;
    }

    /*
      Save Client Payment.
      We keep the payment table as the financial record.
    */
    const oldClientPaid=f.clientPaid||0;

    if(clientPaid!==oldClientPaid){

      const difference=clientPaid-oldClientPaid;

      if(difference>0){

        const payment=await sb
          .from('client_payments')
          .insert({
            booking_id:b.id,
            amount:difference,
            payment_date:today(),
            reference:'Booking payment entry',
            notes:'Entered from booking screen',
            created_by:me.id
          });

        if(payment.error){
          alert(payment.error.message);
          return;
        }

      }else if(difference<0){

        const payments=await sb
          .from('client_payments')
          .select('*')
          .eq('booking_id',b.id)
          .order('payment_date',{ascending:false});

        if(payments.error){
          alert(payments.error.message);
          return;
        }

        let remaining=Math.abs(difference);

        for(const p of payments.data||[]){

          if(remaining<=0) break;

          const amount=Number(p.amount||0);

          if(amount<=remaining){

            const del=await sb
              .from('client_payments')
              .delete()
              .eq('id',p.id);

            if(del.error){
              alert(del.error.message);
              return;
            }

            remaining-=amount;

          }else{

            const upd=await sb
              .from('client_payments')
              .update({
                amount:amount-remaining
              })
              .eq('id',p.id);

            if(upd.error){
              alert(upd.error.message);
              return;
            }

            remaining=0;
          }
        }
      }
    }

    /*
      Save Supplier Payment.
    */
    const oldSupplierPaid=f.supplierPaid||0;

    if(supplierPaid!==oldSupplierPaid){

      const difference=supplierPaid-oldSupplierPaid;

      if(difference>0){

        const payment=await sb
          .from('supplier_payments')
          .insert({
            booking_id:b.id,
            amount:difference,
            payment_date:today(),
            reference:'Booking supplier payment',
            notes:'Entered from booking screen',
            created_by:me.id
          });

        if(payment.error){
          alert(payment.error.message);
          return;
        }

      }else if(difference<0){

        const payments=await sb
          .from('supplier_payments')
          .select('*')
          .eq('booking_id',b.id)
          .order('payment_date',{ascending:false});

        if(payments.error){
          alert(payments.error.message);
          return;
        }

        let remaining=Math.abs(difference);

        for(const p of payments.data||[]){

          if(remaining<=0) break;

          const amount=Number(p.amount||0);

          if(amount<=remaining){

            const del=await sb
              .from('supplier_payments')
              .delete()
              .eq('id',p.id);

            if(del.error){
              alert(del.error.message);
              return;
            }

            remaining-=amount;

          }else{

            const upd=await sb
              .from('supplier_payments')
              .update({
                amount:amount-remaining
              })
              .eq('id',p.id);

            if(upd.error){
              alert(upd.error.message);
              return;
            }

            remaining=0;
          }
        }
      }
    }

    /*
      Synchronise Client, Quotation and Travel History.
    */
   const sync=await syncClientStatus(b.client_id,finalStatus,b.quotation_id);

if(!sync.ok){
  alert('Booking was saved, but Client Master and Quotation status could not be synchronized. Please retry.\n\n'+(sync.error?.message||'Unknown synchronization error'));
  await refresh();
  return;
}

await syncHistory(b.id);

    await refresh();

    closeModal();
    go('bookings');

    alert('Booking saved successfully.');
  };
}
function validateBookingStatus({requested,current,clientPaid,selling,supplierCost,supplierPaid,supplierId,hotelId,returnDate,quotation}){
  const paid=Number(clientPaid)||0;
  const sale=Number(selling)||0;
  const deposit=Number(quotation?.deposit)||0;
  const hasClientPayment=paid>0;
  const fullyPaid=sale>0 && paid>=sale;
  const depositMet=deposit<=0 ? hasClientPayment : paid>=deposit;
  const supplierReady=!!supplierId;
const hotelReady=!!hotelId;
const operationalReady=supplierReady || hotelReady || Number(supplierCost||0)<=0;
  const travelEnded=!!returnDate && String(returnDate)<=today();

  if(requested==='New Enquiry'){
    return {
      ok:false,
      status:current,
      message:'A booking cannot be moved back to New Enquiry. New Enquiry belongs to the enquiry stage before quotation/booking.'
    };
  }

  if(requested==='Quotation'){
    if(hasClientPayment){
      return {
        ok:false,
        status:current,
        message:'Quotation status is not allowed after a client payment has been received. KTBS will use Partially Paid or Fully Paid automatically.'
      };
    }
    return {ok:true,status:'Quotation'};
  }

  if(requested==='Confirmed'){
    if(!hasClientPayment){
      return {
        ok:false,
        status:current,
        message:'Cannot change to Confirmed until a client payment has been received.'
      };
    }

    if(!depositMet){
      return {
        ok:false,
        status:current,
        message:'Cannot change to Confirmed yet. The required deposit has not been received.'
      };
    }

    return {ok:true,status:'Confirmed'};
  }

  if(requested==='Partially Paid'){
    if(!hasClientPayment){
      return {
        ok:false,
        status:current,
        message:'Partially Paid requires a client payment greater than KES 0.'
      };
    }

    if(fullyPaid){
      return {
        ok:false,
        status:current,
        message:'The client has paid the full selling amount. KTBS will use Fully Paid automatically.'
      };
    }

    return {ok:true,status:'Partially Paid'};
  }

  if(requested==='Fully Paid'){
    if(!fullyPaid){
      return {
        ok:false,
        status:current,
        message:'Cannot change to Fully Paid until the client has paid the full selling amount.'
      };
    }

    return {ok:true,status:'Fully Paid'};
  }

  if(requested==='In Progress'){
    if(!fullyPaid){
      return {
        ok:false,
        status:current,
        message:'Cannot change to In Progress until the client has paid the full selling amount.'
      };
    }

   if(!operationalReady){
  return {
    ok:false,
    status:current,
    message:'Cannot change to In Progress until a supplier or hotel is selected.'
  };
}

    if(Number(supplierCost)>0 && Number(supplierPaid)<Number(supplierCost)){
      return {
        ok:false,
        status:current,
        message:'Cannot change to In Progress while a supplier balance is still outstanding.'
      };
    }

   

    return {ok:true,status:'In Progress'};
  }

  if(requested==='COMPLETED'){
    if(!fullyPaid){
      return {
        ok:false,
        status:current,
        message:'Cannot mark a booking COMPLETED until the client has paid the full selling amount.'
      };
    }

    if(!travelEnded){
      return {
        ok:false,
        status:current,
        message:'Cannot mark a booking COMPLETED before its return date.'
      };
    }

    return {ok:true,status:'COMPLETED'};
  }

  if(requested==='Cancelled'){
    if(!isAdmin()){
      return {
        ok:false,
        status:current,
        message:'Only an administrator can cancel a booking.'
      };
    }

    if(!confirm('Cancel this booking?')){
      return {
        ok:false,
        status:current,
        message:'Cancellation was not confirmed.'
      };
    }

    return {ok:true,status:'Cancelled'};
  }

  return {ok:true,status:current||'Quotation'};
}
async function syncClientStatus(clientId,status,quotationId=null){
  if(!clientId)return {ok:true};

  const qid=quotationId||cache.bookings.find(b=>b.client_id===clientId)?.quotation_id;

  const r=await sb.rpc('sync_booking_status',{
    p_client_id:clientId,
    p_quotation_id:qid||null,
    p_status:status
  });

  if(r.error){
    console.error('Status sync failed:',r.error);
    return {ok:false,error:r.error};
  }

  return {ok:true,data:r.data};
}
async function syncHistory(bookingId){
  const fresh=await sb
    .from('bookings')
    .select('*')
    .eq('id',bookingId)
    .maybeSingle();

  if(fresh.error){
    console.warn(fresh.error.message);
    return;
  }

  const b=fresh.data;
  if(!b)return;

  if(b.status!=='COMPLETED'){
    const d=await sb
      .from('travel_history')
      .delete()
      .eq('booking_id',bookingId);

    if(d.error)console.warn(d.error.message);
    return;
  }

  const items=cache.quotation_items
    .filter(i=>i.quotation_id===b.quotation_id);

  const services=items
    .map(i=>i.service_name)
    .filter(Boolean)
    .join(', ');

  const supplier=[
    b.hotel_name,
    b.supplier_name
  ].filter(Boolean).join(' · ');

  const r=await sb
    .from('travel_history')
    .upsert({
      booking_id:b.id,
      client_id:b.client_id,
      destination:b.destination,
      departure:b.departure,
      return_date:b.return_date,
      services,
      hotel_supplier:supplier,
      travel_value:b.selling_amount||0,
      completed_date:b.return_date||today()
    },{
      onConflict:'booking_id'
    });

  if(r.error)alert(r.error.message);
}
async function newBooking(){if(!cache.quotations.length)return alert('Create a quotation first.');const qs=cache.quotations.map(q=>{const c=clientById(q.client_id);return `<option value="${q.id}">${esc(q.quotation_no)} — ${esc(c?.name||'')}</option>`}).join('');openModal('New Booking',`<form id="bForm"><div class="form-grid"><label>Quotation<select name="quotation_id">${qs}</select></label><label>
  Booking Status
  <input value="Quotation" readonly>
  <input type="hidden" name="status" value="Quotation">
</label><label>Selling Amount<input type="number" name="selling_amount" required></label><label>Supplier Cost<input type="number" name="supplier_cost" value="0"></label><label>Other Expenses<input type="number" name="other_expenses" value="0"></label><label>Supplier<select name="supplier_id"><option value="">Select supplier…</option>${partnerOptions(cache.suppliers,'')}</select></label><label>Hotel<select name="hotel_id"><option value="">Select hotel…</option>${partnerOptions(cache.hotels,'')}</select></label><label>Booking Reference<input name="reference"></label><label class="wide">Notes<textarea name="notes"></textarea></label></div><div class="actions"><button type="button" onclick="closeModal()">Cancel</button><button class="primary">Save Booking</button></div></form>`);$('bForm').onsubmit=async e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.target)),q=quoteById(f.quotation_id);if(!q)return;const c=clientById(q.client_id),bno=await nextDoc('BK','bookings','booking_no');const sup=cache.suppliers.find(s=>s.id===f.supplier_id),hot=cache.hotels.find(h=>h.id===f.hotel_id);const r=await sb.from('bookings').insert({booking_no:bno,quotation_id:q.id,client_id:c.id,consultant_id:q.consultant_id||me.id,destination:q.destination,departure:q.departure,return_date:q.return_date,supplier_id:f.supplier_id||null,supplier_name:sup?.name||null,hotel_id:f.hotel_id||null,hotel_name:hot?.name||null,status:f.status,selling_amount:+f.selling_amount||0,supplier_cost:+f.supplier_cost||0,other_expenses:+f.other_expenses||0,reference:f.reference||'',notes:f.notes||'',booking_date:today(),created_by:me.id,updated_by:me.id});if(r.error)return alert(r.error.message);if(isAdmin()){const sync=await syncClientStatus(c.id,f.status,q.id);

if(!sync.ok){
  alert('Booking was created, but Client Master and Quotation status could not be synchronized. Please retry.\n\n'+(sync.error?.message||'Unknown synchronization error'));
  await refresh();
  return;
}}await refresh();closeModal();go('bookings')}
}

function suppliersPage(){$('content').innerHTML=`<div class="toolbar"><button class="primary" onclick="newSupplier()">+ New Supplier</button></div>${tableWrap(cache.suppliers.length?`<table><thead><tr><th>Supplier</th><th>Contact</th><th>Type</th><th></th></tr></thead><tbody>${cache.suppliers.map(s=>`<tr><td>${esc(s.name)}</td><td>${esc(s.contact||'')}</td><td>${esc(s.type||'')}</td><td>${isAdmin()?`<button class="link-btn" onclick="deleteMaster('suppliers','${s.id}')">Delete</button>`:''}</td></tr>`).join('')}</tbody></table>`:'<div class="empty">No supplier records yet.</div>')}`}
function hotelsPage(){$('content').innerHTML=`<div class="toolbar"><button class="primary" onclick="newHotel()">+ New Hotel</button></div>${tableWrap(cache.hotels.length?`<table><thead><tr><th>Hotel</th><th>Destination</th><th>Contact</th><th></th></tr></thead><tbody>${cache.hotels.map(h=>`<tr><td>${esc(h.name)}</td><td>${esc(h.destination||'')}</td><td>${esc(h.contact||'')}</td><td>${isAdmin()?`<button class="link-btn" onclick="deleteMaster('hotels','${h.id}')">Delete</button>`:''}</td></tr>`).join('')}</tbody></table>`:'<div class="empty">No hotel records yet.</div>')}`}
function servicesPage(){$('content').innerHTML=`<div class="toolbar"><button class="primary" onclick="newService()">+ New Service / Travel Item</button></div>${tableWrap(cache.services.length?`<table><thead><tr><th>Service / Item</th><th>Category</th><th>Destination</th><th>Active</th><th></th></tr></thead><tbody>${cache.services.map(s=>`<tr><td>${esc(s.name)}</td><td>${esc(s.category||'')}</td><td>${esc(s.destination||'')}</td><td>${s.active?'Yes':'No'}</td><td>${isAdmin()?`<button class="link-btn" onclick="deleteMaster('services','${s.id}')">Delete</button>`:''}</td></tr>`).join('')}</tbody></table>`:'<div class="empty">No services yet.</div>')}`}
async function newSupplier(){openModal('Add Supplier',`<form id="sForm"><label>Supplier Name<input name="name" required></label><label>Contact<input name="contact"></label><label>Type<input name="type" placeholder="Safari, Flight, Transfer…"></label><div class="actions"><button type="button" onclick="closeModal()">Cancel</button><button class="primary">Save Supplier</button></div></form>`);$('sForm').onsubmit=async e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.target));f.created_by=me.id;const r=await sb.from('suppliers').insert(f);if(r.error)return alert(r.error.message);await refresh();closeModal();go('suppliers')}}
async function newHotel(){openModal('Add Hotel',`<form id="hForm"><label>Hotel Name<input name="name" required></label><label>Destination<input name="destination"></label><label>Contact<input name="contact"></label><div class="actions"><button type="button" onclick="closeModal()">Cancel</button><button class="primary">Save Hotel</button></div></form>`);$('hForm').onsubmit=async e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.target));f.created_by=me.id;const r=await sb.from('hotels').insert(f);if(r.error)return alert(r.error.message);await refresh();closeModal();go('hotels')}}
async function newService(){openModal('Add Service / Travel Item',`<form id="svForm"><label>Service Name<input name="name" required></label><label>Category<input name="category" placeholder="Flights, Safari, Accommodation…"></label><label>Destination<input name="destination"></label><label>Default Amount (KES)<input type="number" name="default_amount" value="0"></label><div class="actions"><button type="button" onclick="closeModal()">Cancel</button><button class="primary">Save Service</button></div></form>`);$('svForm').onsubmit=async e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.target));f.default_amount=+f.default_amount||0;f.created_by=me.id;const r=await sb.from('services').insert(f);if(r.error)return alert(r.error.message);await refresh();closeModal();go('services')}}
async function deleteMaster(table,id){if(!isAdmin())return;if(!confirm('Delete this master item?'))return;const r=await sb.from(table).delete().eq('id',id);if(r.error)return alert(r.error.message);await refresh();render()}

function financePage(){const rows=cache.bookings.map(financeForBooking),sales=rows.reduce((a,b)=>a+b.selling,0),paid=rows.reduce((a,b)=>a+b.clientPaid,0),cost=rows.reduce((a,b)=>a+b.cost,0),sp=rows.reduce((a,b)=>a+b.supplierPaid,0),ex=rows.reduce((a,b)=>a+b.exp,0);$('content').innerHTML=`<div class="grid stats">${stat('Selling Amount',money(sales),'Live bookings')}${stat('Client Paid',money(paid),'Receipts recorded')}${stat('Client Balance',money(sales-paid),'Outstanding')}${stat('Supplier Cost',money(cost),'Committed cost')}${stat('Supplier Paid',money(sp),'Paid to suppliers')}${stat('Supplier Pending',money(cost-sp),'Outstanding')}${stat('Gross Profit',money(sales-cost),'Selling less supplier cost')}${stat('Net Profit',money(sales-cost-ex),'After other expenses')}</div>${tableWrap(`<div class="section-head"><h3>Booking Finance</h3><div><button class="primary" onclick="recordPayment()">+ Client Payment</button> <button onclick="recordSupplierPayment()">+ Supplier Payment</button></div></div>${bookingTable()}`)}`}
async function recordPayment(){if(!cache.bookings.length)return alert('No bookings available.');openModal('Record Client Payment',`<form id="pForm"><label>Booking<select name="booking_id">${cache.bookings.map(b=>`<option value="${b.id}">${esc(b.booking_no)} — ${esc(clientById(b.client_id)?.name||'')}</option>`).join('')}</select></label><label>Payment Amount (KES)<input name="amount" type="number" min="0" required></label><label>Payment Date<input name="payment_date" type="date" value="${today()}"></label><label>Reference<input name="reference"></label><label>Notes<textarea name="notes"></textarea></label><div class="actions"><button type="button" onclick="closeModal()">Cancel</button><button class="primary">Record Payment</button></div></form>`);$('pForm').onsubmit=async e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.target));const r=await sb.from('client_payments').insert({...f,amount:+f.amount||0,created_by:me.id});if(r.error)return alert(r.error.message);await refresh();closeModal();go('finance')}}
async function recordSupplierPayment(){if(!cache.bookings.length)return alert('No bookings available.');openModal('Record Supplier Payment',`<form id="spForm"><label>Booking<select name="booking_id">${cache.bookings.map(b=>`<option value="${b.id}">${esc(b.booking_no)} — ${esc(clientById(b.client_id)?.name||'')}</option>`).join('')}</select></label><label>Payment Amount (KES)<input name="amount" type="number" min="0" required></label><label>Payment Date<input name="payment_date" type="date" value="${today()}"></label><label>Reference<input name="reference"></label><label>Notes<textarea name="notes"></textarea></label><div class="actions"><button type="button" onclick="closeModal()">Cancel</button><button class="primary">Record Payment</button></div></form>`);$('spForm').onsubmit=async e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.target));const r=await sb.from('supplier_payments').insert({...f,amount:+f.amount||0,created_by:me.id});if(r.error)return alert(r.error.message);await refresh();closeModal();go('finance')}}

function historyTable(filter='',arr=cache.history){const f=String(filter||'').toLowerCase(),a=arr.filter(h=>!f||[h.destination,h.services,h.hotel_supplier].join(' ').toLowerCase().includes(f));return `<table class="booking-table"><thead><tr><th>Client</th><th>Destination</th><th>Travel Date</th><th>Experiences / Services</th><th>Hotel / Supplier</th><th>Booking</th><th>Value</th></tr></thead><tbody>${a.map(h=>`<tr><td><b>${esc(clientById(h.client_id)?.name||'—')}</b><br><small>${esc(clientById(h.client_id)?.client_code||'')}</small></td><td>${esc(h.destination||'—')}</td><td>${esc(h.departure||'—')}</td><td>${esc(h.services||'—')}</td><td>${esc(h.hotel_supplier||'—')}</td><td>${esc(bookingById(h.booking_id)?.booking_no||'—')}</td><td>${money(h.travel_value)}</td></tr>`).join('')}</tbody></table>`}
function historyPage(){$('content').innerHTML=`<div class="toolbar"><input placeholder="Search client, destination or experience…" oninput="$('historyTable').innerHTML=historyTable(this.value)"></div>${tableWrap(`<div id="historyTable">${historyTable()}</div>`)}`}
function reportsPage(){
  const rows=cache.bookings.map(financeForBooking);

  const gp=rows.reduce((a,b)=>a+b.gross,0);
  const np=rows.reduce((a,b)=>a+b.net,0);

  const consultants=[...new Set(
    [
      ...cache.clients.map(c=>c.consultant_id),
      ...cache.quotations.map(q=>q.consultant_id),
      ...cache.bookings.map(b=>b.consultant_id)
    ].filter(Boolean)
  )];

  const activity=consultants.map(id=>{
    const clients=cache.clients.filter(c=>c.consultant_id===id);

    const quotations=cache.quotations.filter(
      q=>q.consultant_id===id
    );

    const bookings=cache.bookings.filter(
      b=>b.consultant_id===id
    );

    const finances=bookings.map(financeForBooking);

    const bookingValue=finances.reduce(
      (a,b)=>a+b.selling,
      0
    );

    const clientPaid=finances.reduce(
      (a,b)=>a+b.clientPaid,
      0
    );

    const grossProfit=finances.reduce(
      (a,b)=>a+b.gross,
      0
    );

    const netProfit=finances.reduce(
      (a,b)=>a+b.net,
      0
    );

    return {
      id,
      name:profileName(id),
      clients:clients.length,
      quotations:quotations.length,
      bookings:bookings.length,
      bookingValue,
      clientPaid,
      grossProfit,
      netProfit
    };
  });

  $('content').innerHTML=`
    <div class="grid stats">
      ${stat(
        'Clients',
        cache.clients.length,
        'Master records'
      )}

      ${stat(
        'Quotations',
        cache.quotations.length,
        'Live quotations'
      )}

      ${stat(
        'Bookings',
        cache.bookings.length,
        'Live bookings'
      )}

      ${stat(
        'Completed Trips',
        cache.bookings.filter(
          b=>b.status==='COMPLETED'
        ).length,
        'Feeds travel history'
      )}

      ${stat(
        'Gross Profit',
        money(gp),
        'All bookings'
      )}

      ${stat(
        'Net Profit',
        money(np),
        'All bookings'
      )}
    </div>

    ${tableWrap(`
      <div class="section-head">
        <div>
          <h3>Consultant Activity</h3>
          <p class="muted">
            Client, quotation and booking activity by assigned consultant.
          </p>
        </div>
      </div>

      ${
        activity.length
        ? `
          <table>
            <thead>
              <tr>
                <th>Consultant</th>
                <th>Clients</th>
                <th>Quotations</th>
                <th>Bookings</th>
                <th>Booking Value</th>
                <th>Client Paid</th>
                <th>Gross Profit</th>
                <th>Net Profit</th>
              </tr>
            </thead>

            <tbody>
              ${activity.map(x=>`
                <tr>
                  <td><b>${esc(x.name)}</b></td>
                  <td>${x.clients}</td>
                  <td>${x.quotations}</td>
                  <td>${x.bookings}</td>
                  <td>${money(x.bookingValue)}</td>
                  <td>${money(x.clientPaid)}</td>
                  <td>${money(x.grossProfit)}</td>
                  <td>${money(x.netProfit)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `
        : '<p class="empty">No consultant activity yet.</p>'
      }
    `)}
  `;
}
function settingsPage(){$('content').innerHTML=`<div class="page-grid"><div class="page-card"><h3>Current User</h3><p><b>${esc(profile?.full_name||'')}</b><br>${esc(me?.email||'')}<br>${badge(profile?.role?.toUpperCase())}</p></div><div class="page-card"><h3>Permissions</h3><p>
  Consultants can create clients, quotations and operational records.
  Saved client and quotation records are protected from consultant
  editing and deletion. Booking updates remain available to consultants
  for day-to-day operations.
</p>

<p>
  Administrators have full management access, including staff accounts,
  master data, client records and quotation records.
</p></div><div class="page-card"><h3>Staff Accounts</h3><p>Login accounts are managed by Supabase Authentication. KTBS profiles store staff roles.</p>${isAdmin()?`<button class="primary" onclick="showStaff()">View Staff & Roles</button>`:'<p>Admin only.</p>'}</div></div>`}
 async function showStaff(){
  const rows=await q('profiles');

  openModal('KTBS Staff & Roles',`
    <div class="page-card">
      <div class="section-head">
        <div>
          <h3>Staff Accounts</h3>
          <p class="muted">
            Manage consultant and administrator access to KTBS.
          </p>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Staff Member</th>
            <th>Role</th>
            <th>Status</th>
            <th>Access</th>
          </tr>
        </thead>

        <tbody>
          ${rows.map(x=>`
            <tr>
              <td>
                <b>${esc(x.full_name||'')}</b>
                ${x.id===me?.id
                  ? '<br><small>Current user</small>'
                  : ''
                }
              </td>

              <td>
                ${badge(String(x.role||'').toUpperCase())}
              </td>

              <td>
                ${x.active
                  ? '<span class="badge info">ACTIVE</span>'
                  : '<span class="badge red">INACTIVE</span>'
                }
              </td>

              <td>
                <div class="actions">

                  <button
                    class="link-btn"
                    onclick="changeRole(
                      '${x.id}',
                      '${x.role==='admin'?'consultant':'admin'}'
                    )">
                    Make ${x.role==='admin'?'Consultant':'Admin'}
                  </button>

                  ${x.id!==me?.id
                    ? `
                      <button
                        class="link-btn"
                        onclick="toggleStaffStatus(
                          '${x.id}',
                          ${x.active}
                        )">
                        ${x.active?'Deactivate':'Activate'}
                      </button>
                    `
                    : ''
                  }

                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="page-card" style="margin-top:16px">
        <h4>New Staff Account</h4>

        <p>
          New login accounts are created through
          <b>Supabase Authentication → Users → Invite user</b>.
          After the account is created, add its KTBS profile and assign
          the appropriate role.
        </p>

        <p class="muted">
          Deactivated staff remain in the system and their existing
          client, quotation and booking records are preserved.
        </p>
      </div>
    </div>
  `);
}
async function toggleStaffStatus(id,current){
  if(!isAdmin())return;

  if(id===me?.id){
    return alert('You cannot deactivate your own administrator account.');
  }

  const next=!current;

  const message=next
    ? 'Activate this staff account?'
    : 'Deactivate this staff account?';

  if(!confirm(message))return;

  const r=await sb
    .from('profiles')
    .update({active:next})
    .eq('id',id);

  if(r.error)return alert(r.error.message);

  await refresh();
  showStaff();
}
async function changeRole(id,role){if(!isAdmin())return;const r=await sb.from('profiles').update({role}).eq('id',id);if(r.error)return alert(r.error.message);await refresh();showStaff()}

async function startApp(){if(!window.KTBS_SUPABASE_URL||window.KTBS_SUPABASE_URL.includes('PASTE_')){$('loginMessage').textContent='Supabase connection is not configured.';return}const {data:{session}}=await sb.auth.getSession();if(session)await enterApp(session.user)}
async function enterApp(user){
  me=user;

  const r=await sb.rpc('get_my_profile');

  if(r.error || !r.data){
    return alert('Staff profile not found. Please ensure the Supabase profile exists for this login.');
  }

  profile=r.data;

  if(!profile.active){
    return alert('This staff account is inactive.');
  }

  $('login').classList.add('hidden');
  $('app').classList.remove('hidden');

  $('userName').textContent=profile.full_name||user.email||'Staff';
  $('avatar').textContent=(profile.full_name||user.email||'K').charAt(0).toUpperCase();
  $('roleBadge').textContent=(profile.role||'consultant').toUpperCase();

  await loadData();
  render();
}

 
$('loginForm').onsubmit=async e=>{e.preventDefault();$('loginMessage').textContent='Signing in…';const {data,error}=await sb.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});if(error){$('loginMessage').textContent=error.message;return}await enterApp(data.user)};
$('logout').onclick=async()=>{await sb.auth.signOut();location.reload()};
$('globalSearch').oninput=e=>{const v=e.target.value.trim();if(!v)return;const c=cache.clients.filter(x=>Object.values(x).join(' ').toLowerCase().includes(v.toLowerCase()));if(c.length){go('clients');setTimeout(()=>{if($('clientFilter')){$('clientFilter').value=v;filterClient()}},0)}};
document.querySelectorAll('#nav button').forEach(b=>b.onclick=()=>go(b.dataset.page));
sb.auth.onAuthStateChange((_event,session)=>{if(session&&!me)enterApp(session.user)});
startApp();
