(function(){
 const C=()=>window.KTBSContext;
 const esc=s=>C().esc(s);
 const edgeUrl=()=>window.KTBS_SUPABASE_URL+'/functions/v1/ktbs-public-itinerary';
 window.shareItinerary=async function(id){
  try{
   const ctx=C();const q=await ctx.sb.from('itineraries').select('id,title,client_id').eq('id',id).single();if(q.error)throw q.error;
   const client=(ctx.cache.clients||[]).find(x=>x.id===q.data.client_id);
   const active=await ctx.sb.from('itinerary_shares').select('id,expires_at,view_count,last_viewed_at').eq('itinerary_id',id).is('revoked_at',null).order('created_at',{ascending:false}).limit(1);
   const old=active.data&&active.data[0];
   ctx.openModal('Share itinerary online','<p>Create a private, no-login link for your client. You can revoke it at any time.</p><div class="field"><label>Link expiry</label><select id="portalExpiry"><option value="0">No expiry</option><option value="7">7 days</option><option value="30" selected>30 days</option><option value="90">90 days</option></select></div>'+(old?'<p class="muted">Current link: '+(old.view_count||0)+' views. Last viewed: '+(old.last_viewed_at?new Date(old.last_viewed_at).toLocaleString():'Not viewed yet')+'. Creating a replacement revokes the current link.</p><button class="secondary" onclick="revokeItineraryShare(\''+old.id+'\')">Revoke current link</button>':'')+'<div class="actions"><button class="primary" data-id="'+id+'" onclick="createItineraryShare(this.dataset.id)">Create private link</button></div>');
  }catch(e){alert('Could not load sharing options: '+e.message);}
 };
 window.createItineraryShare=async function(id){
  try{
   const ctx=C(),raw=Array.from(crypto.getRandomValues(new Uint8Array(32))).map(x=>x.toString(16).padStart(2,'0')).join('');
   const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(raw)))).map(x=>x.toString(16).padStart(2,'0')).join('');
   const it=await ctx.sb.from('itineraries').select('id,organization_id,title,client_id').eq('id',id).single();if(it.error)throw it.error;
   const days=Number(document.getElementById('portalExpiry').value||30),expires=days?new Date(Date.now()+days*86400000).toISOString():null;
   const previous=await ctx.sb.from('itinerary_shares').update({revoked_at:new Date().toISOString()}).eq('itinerary_id',id).is('revoked_at',null);
   if(previous.error)throw previous.error;
   const ins=await ctx.sb.from('itinerary_shares').insert({organization_id:it.data.organization_id,itinerary_id:id,token_hash:hash,expires_at:expires,created_by:ctx.me.id});
   if(ins.error)throw ins.error;
   const link=location.origin+'/itinerary.html?t='+raw,client=(ctx.cache.clients||[]).find(x=>x.id===it.data.client_id);
   const message='Hello '+(client?.name||'')+', your Kulu Travels itinerary "'+it.data.title+'" is ready. View it here: '+link+'\n\nKulu Travels · Travel beautifully. Travel seamlessly.';
   const email=client?.email||'',mail=email?'mailto:'+encodeURIComponent(email)+'?subject='+encodeURIComponent('Your Kulu Travels Itinerary')+'&body='+encodeURIComponent(message):'';
   ctx.openModal('Private link ready','<p>Your client can view this itinerary without creating an account.</p><div class="field"><label>Private link</label><input id="portalLink" readonly value="'+esc(link)+'"></div><p class="muted">Expiry: '+(expires?new Date(expires).toLocaleDateString():'No expiry')+'.</p><div class="actions"><button class="secondary" onclick="navigator.clipboard.writeText(document.getElementById(\'portalLink\').value)">Copy link</button><button class="primary" onclick="window.open(\'https://wa.me/?text='+encodeURIComponent(message)+'\',\'_blank\')">WhatsApp</button>'+(mail?'<a class="secondary" href="'+esc(mail)+'">Email</a>':'')+'</div>');
  }catch(e){alert('Could not create link: '+e.message);}
 };
 window.revokeItineraryShare=async function(id){
  if(!confirm('Revoke this private link? It will stop working immediately.'))return;
  const r=await C().sb.from('itinerary_shares').update({revoked_at:new Date().toISOString()}).eq('id',id);
  if(r.error){alert(r.error.message);return;}C().closeModal();alert('Private link revoked.');
 };
})();