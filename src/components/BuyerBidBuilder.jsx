import React, { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { Link, useSearchParams } from 'react-router-dom'

const initial = { case_number:'', asking_price:'', offer_price:'', occupancy:'', financing:'fha', closing_cost_percent:0, earnest_money:1000, notes:'', referral_consent:false }
const percent = n => Math.max(0, Math.min(100, Number(n) || 0))
const money = n => Number(n || 0).toLocaleString('en-US',{style:'currency',currency:'USD'})
const median = values => { const a=values.filter(Number.isFinite).sort((x,y)=>x-y);if(!a.length)return null;const m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2 }
const pct = n => Number.isFinite(n)?(n*100).toFixed(1)+'%':'—'
export default function BuyerBidBuilder({ user, property }) {
 const [searchParams,setSearchParams]=useSearchParams()
 const [historical,setHistorical]=useState([])
 const [statsError,setStatsError]=useState('')
 const [statsLoading,setStatsLoading]=useState(false)
 const [listing,setListing]=useState(null)
 const [secure,setSecure]=useState({deed_legal_name:'',deed_mailing_address:'',preferred_closing_agent_id:''})
 const [agents,setAgents]=useState([])
 const [documents,setDocuments]=useState([])
 const [secureBusy,setSecureBusy]=useState(false)
 const [secureMessage,setSecureMessage]=useState('')
 const offerId=searchParams.get('offer')
 const editingRef=useRef(null)
 const [commission,setCommission]=useState({listing:3,buyer:3}), [form,setForm]=useState(initial), [bids,setBids]=useState([]), [busy,setBusy]=useState(false), [message,setMessage]=useState('')
 useEffect(()=>{supabase.from('closing_agents').select('id,company_name,city,state').eq('active',true).order('company_name').limit(500).then(({data})=>setAgents(data||[]))},[])
 useEffect(()=>{
  if(!form.id||!user?.id){setSecure({deed_legal_name:'',deed_mailing_address:'',preferred_closing_agent_id:''});setDocuments([]);return}
  let active=true
  Promise.all([
   supabase.from('buyer_offer_secure_details').select('deed_legal_name,deed_mailing_address,preferred_closing_agent_id').eq('offer_id',form.id).maybeSingle(),
   supabase.storage.from('buyer-offer-private').list(user.id+'/'+form.id,{limit:100})
  ]).then(([details,files])=>{if(!active)return;if(details.data)setSecure({deed_legal_name:details.data.deed_legal_name||'',deed_mailing_address:details.data.deed_mailing_address||'',preferred_closing_agent_id:details.data.preferred_closing_agent_id||''});setDocuments(files.data||[])}).catch(e=>{if(active)setSecureMessage(e.message)})
  return()=>{active=false}
 },[form.id,user?.id])
 const saveSecure=async()=>{
  if(!form.id||!user?.id)return
  setSecureBusy(true);setSecureMessage('')
  const {error}=await supabase.from('buyer_offer_secure_details').upsert({offer_id:form.id,buyer_id:user.id,deed_legal_name:secure.deed_legal_name.trim(),deed_mailing_address:secure.deed_mailing_address.trim(),preferred_closing_agent_id:secure.preferred_closing_agent_id||null,updated_at:new Date().toISOString()},{onConflict:'offer_id'})
  setSecureBusy(false);setSecureMessage(error?error.message:'Private buyer details saved.')
 }
 const uploadDocument=async(event,kind)=>{
  const file=event.target.files?.[0];event.target.value=''
  if(!file||!form.id||!user?.id)return
  if(!['application/pdf','image/jpeg','image/png'].includes(file.type)||file.size>10485760){setSecureMessage('Use PDF, JPG or PNG files up to 10 MB.');return}
  setSecureBusy(true);setSecureMessage('')
  const path=user.id+'/'+form.id+'/'+kind+'-'+crypto.randomUUID()+'.'+(file.type==='application/pdf'?'pdf':file.type==='image/png'?'png':'jpg')
  const {error}=await supabase.storage.from('buyer-offer-private').upload(path,file,{contentType:file.type,upsert:false})
  if(!error){const result=await supabase.storage.from('buyer-offer-private').list(user.id+'/'+form.id,{limit:100});setDocuments(result.data||[])}
  setSecureBusy(false);setSecureMessage(error?error.message:'Document uploaded to private storage.')
 }
 const removeDocument=async(name)=>{
  if(!form.id||!user?.id||!window.confirm('Delete this uploaded document permanently?'))return
  setSecureBusy(true)
  const {error}=await supabase.storage.from('buyer-offer-private').remove([user.id+'/'+form.id+'/'+name])
  setSecureBusy(false);setSecureMessage(error?error.message:'Document removed.')
  if(!error)setDocuments(old=>old.filter(x=>x.name!==name))
 }
 const change=(key,value)=>setForm(old=>({...old,[key]:value}))
 const chooseBuyerType=(type)=>{
  if(!['owner','investor'].includes(type))return
  setForm(old=>({...old,occupancy:type,financing:type==='investor'&&['fha','203k'].includes(old.financing)?'cash':old.financing,closing_cost_percent:type==='investor'?0:old.closing_cost_percent}))
  setMessage('')
 }
 const load=async()=>{ if(!user?.id)return; const {data,error}=await supabase.from('buyer_bid_drafts').select('*').eq('buyer_id',user.id).order('created_at',{ascending:false}); if(error)setMessage(error.message);else setBids(data||[]) }
 useEffect(()=>{load()},[user?.id])
 const editDraft=(draft)=>{
  if(!['draft','changes_requested'].includes(draft.status)){setMessage('This proposal can no longer be edited.');return}
  editingRef.current=draft.id
  setForm({...initial,...draft,case_number:draft.case_number,notes:(draft.notes||'').replace(/\\n?\\[HUD net estimate\\][^\\n]*/g,''),referral_consent:!!draft.referral_consent})
  const match=(draft.notes||'').match(/\\[HUD net estimate\\] Listing commission: ([\\d.]+)%; buyer broker commission: ([\\d.]+)%/)
  setCommission(match?{listing:Number(match[1]),buyer:Number(match[2])}:{listing:3,buyer:3})
  setMessage('Editing saved draft. Your changes will update this proposal.')
 }
 useEffect(()=>{
  if(!property?.case_number)return
  if(editingRef.current||offerId)return
  setForm(old=>old.case_number===property.case_number?old:{...initial,case_number:property.case_number,asking_price:property.price??'',offer_price:property.price??''})
 },[property?.case_number,property?.price,offerId])
 useEffect(()=>{
  if(!offerId||!bids.length)return
  const selected=bids.find(b=>String(b.id)===offerId)
  if(!selected){setMessage('Saved offer not found for this account.');return}
  if(selected.case_number!==property?.case_number)return
  if(editingRef.current!==selected.id)editDraft(selected)
 },[offerId,bids,property?.case_number])
 useEffect(()=>{
  if(!property?.case_number)return
  let active=true;setStatsLoading(true);setStatsError('');setHistorical([]);setListing(null)
  Promise.all([
   supabase.from('properties').select('case_number,city,county,state,price').eq('case_number',property.case_number).maybeSingle(),
   supabase.from('accepted_offers').select('case_number,city,county,state,net_to_hud,list_price_used,list_price_at_acceptance,original_list_price,purchaser_type').limit(1000)
  ]).then(([p,a])=>{if(!active)return;setStatsLoading(false);if(p.error||a.error){setStatsError(p.error?.message||a.error?.message);return}setListing(p.data);setHistorical(a.data||[])}).catch(e=>{if(active){setStatsLoading(false);setStatsError(e.message)}})
  return()=>{active=false}
 },[property?.case_number])
 const state=String(listing?.state||property?.state||'').toUpperCase()
 const city=String(listing?.city||property?.city||'').trim().toLowerCase()
 const county=String(listing?.county||property?.county||'').trim().toLowerCase()
 const valid=historical.filter(x=>x.case_number!==form.case_number&&Number(x.net_to_hud)>0&&Number(x.list_price_used||x.list_price_at_acceptance||x.original_list_price)>0)
 const stateMatches=valid.filter(x=>String(x.state||'').toUpperCase()===state)
 const typeMatches=rows=>rows.filter(x=>{
  const type=String(x.purchaser_type||'').toLowerCase().replace(/[^a-z]/g,'')
  return form.occupancy==='owner'?['owneroccupant','owner','owneroccupied'].includes(type):form.occupancy==='investor'?['investor','nonowneroccupant'].includes(type):false
 })
 const cohorts=[
  {name:'City',rows:city?typeMatches(stateMatches.filter(x=>String(x.city||'').trim().toLowerCase()===city)):[]},
  {name:'County',rows:county?typeMatches(stateMatches.filter(x=>String(x.county||'').trim().toLowerCase()===county)):[]},
  {name:'State',rows:typeMatches(stateMatches)}
 ]
 const comparison=cohorts.find(x=>x.rows.length>=5)||cohorts.find(x=>x.rows.length>0)
 const ratios=(comparison?.rows||[]).map(x=>Number(x.net_to_hud)/Number(x.list_price_used||x.list_price_at_acceptance||x.original_list_price)).filter(x=>Number.isFinite(x)&&x>0&&x<3)
 const historicalMedian=median(ratios)
 const asking=Number(listing?.price||form.asking_price||property?.price)||0
 const offerAmount=Number(form.offer_price)||0
 const assistance=offerAmount*percent(form.closing_cost_percent)/100
 const listingCommission=offerAmount*percent(commission.listing)/100
 const buyerCommission=offerAmount*percent(commission.buyer)/100
 const hudNet=offerAmount-assistance-listingCommission-buyerCommission
 const netRatio=asking>0?hudNet/asking:null
 const percentile=netRatio!==null&&ratios.length?Math.round(100*ratios.filter(x=>x<=netRatio).length/ratios.length):null
 const assessment=ratios.length<5||netRatio===null?'Insufficient comparable data':percentile>=65?'Above historical median':percentile>=35?'Near historical median':'Below historical median'
 const save=async(status)=>{
  if(!user?.id)return setMessage('Please sign in to save an offer.')
  if(!['owner','investor'].includes(form.occupancy))return setMessage('Choose owner occupant or investor before continuing.')
  if(!/^\d{3}-\d{6}$/.test(form.case_number.trim()))return setMessage('Enter a valid HUD case number (000-000000).')
  if(!(Number(form.offer_price)>0))return setMessage('Enter an offer greater than zero.')
  if([commission.listing,commission.buyer].some(v=>!Number.isFinite(Number(v))||Number(v)<0||Number(v)>100))return setMessage('Commission rates must be between 0 and 100%.')
  if(form.occupancy==='investor'&&Number(form.closing_cost_percent)!==0)return setMessage('Investor offers cannot request HUD-paid closing cost assistance.')
  if(form.occupancy==='investor'&&['fha','203k'].includes(form.financing))return setMessage('Investor offers cannot use owner-occupant FHA financing.')
  if(Number(form.closing_cost_percent)<0||Number(form.closing_cost_percent)>3)return setMessage('Closing assistance must be between 0 and 3%.')
  setBusy(true);setMessage('')
  const {id,created_at,updated_at,submitted_at,buyer_id,consultation_id,assigned_broker_id,status:oldStatus,...offerFields}=form
  const commissionSummary=`\n[HUD net estimate] Listing commission: ${percent(commission.listing)}%; buyer broker commission: ${percent(commission.buyer)}%; closing assistance: ${percent(form.closing_cost_percent)}%; estimated HUD net: ${money(hudNet)}. Broker to verify.`
  const payload={...offerFields,notes:(form.notes||'').replace(/\n?\[HUD net estimate\][^\n]*/g,'')+commissionSummary,case_number:form.case_number,buyer_id:user.id,asking_price:form.asking_price===''?null:Number(form.asking_price),offer_price:Number(form.offer_price),closing_cost_percent:Number(form.closing_cost_percent),earnest_money:Number(form.earnest_money),status,submitted_at:status==='submitted'?new Date().toISOString():null,updated_at:new Date().toISOString()}
  const {error}=form.id?await supabase.from('buyer_bid_drafts').update(payload).eq('id',form.id).eq('buyer_id',user.id):await supabase.from('buyer_bid_drafts').insert(payload)
  setBusy(false)
  if(error)return setMessage(error.message)
  setMessage(status==='submitted'?'Offer proposal submitted for review. This is NOT a bid to HUD.':'Draft saved.')
  editingRef.current=null
  setSearchParams(old=>{const next=new URLSearchParams(old);next.delete('offer');return next},{replace:true})
  setForm({...initial,case_number:property.case_number,asking_price:property.price??'',offer_price:property.price??''});await load()
 }
 const deleteDraft=async(draft)=>{
  if(draft.status!=='draft'||!user?.id||busy)return
  if(!window.confirm('Permanently delete this draft offer for HUD '+draft.case_number+'? This cannot be undone.'))return
  setBusy(true);setMessage('')
  const {data,error}=await supabase.from('buyer_bid_drafts').delete().eq('id',draft.id).eq('buyer_id',user.id).eq('status','draft').select('id')
  setBusy(false)
  if(error){setMessage(error.message);return}
  if(!data?.length){setMessage('Draft could not be deleted. Refresh and check its status.');return}
  setBids(old=>old.filter(b=>b.id!==draft.id))
  if(form.id===draft.id){editingRef.current=null;setSearchParams(old=>{const next=new URLSearchParams(old);next.delete('offer');return next},{replace:true});setForm({...initial,case_number:property.case_number,asking_price:property.price??'',offer_price:property.price??''})}
  setMessage('Draft deleted.')
 }
 const field=(label,key,type='text')=><label className="block text-sm font-medium text-gray-700">{label}<input className="mt-1 w-full border rounded-lg p-2" type={type} value={form[key]} onChange={e=>change(key,e.target.value)} /></label>
 return <section className="bg-white rounded-xl shadow p-6 mb-8 space-y-5">
  <div><h2 className="text-2xl font-bold">{form.id?'Edit Draft Offer':'My HUD Offers'}</h2><p className="text-gray-600">Prepare an offer for broker review. Only a HUD-authorized broker can submit an official HUD bid.</p></div>
  {form.id&&<button type="button" className="text-blue-700 underline text-sm" onClick={()=>{editingRef.current=null;setSearchParams(old=>{const next=new URLSearchParams(old);next.delete('offer');return next},{replace:true});setForm({...initial,case_number:property.case_number,asking_price:property.price??'',offer_price:property.price??''});setCommission({listing:3,buyer:3});setMessage('Edit cancelled.')}}>Cancel editing</button>}
  <fieldset className="border rounded-xl p-4 space-y-3">
   <legend className="font-bold text-lg px-1">1. Are you buying this HUD home to live in or as an investment?</legend>
   <div className="grid sm:grid-cols-2 gap-3">
    <button type="button" aria-pressed={form.occupancy==='owner'} onClick={()=>chooseBuyerType('owner')} className={`rounded-xl border-2 p-4 text-left ${form.occupancy==='owner'?'border-blue-700 bg-blue-50':'border-gray-200 hover:border-blue-300'}`}><strong className="block">Owner Occupant</strong><span className="text-sm text-gray-600">I plan to live in the property as my primary residence. FHA financing and eligible owner-occupant incentives may be available.</span></button>
    <button type="button" aria-pressed={form.occupancy==='investor'} onClick={()=>chooseBuyerType('investor')} className={`rounded-xl border-2 p-4 text-left ${form.occupancy==='investor'?'border-blue-700 bg-blue-50':'border-gray-200 hover:border-blue-300'}`}><strong className="block">Investor</strong><span className="text-sm text-gray-600">I am purchasing for investment. No HUD-paid closing assistance or owner-occupant FHA incentives; eligibility depends on the listing period.</span></button>
   </div>
  </fieldset>
  {['owner','investor'].includes(form.occupancy)&&<>
  <h3 className="font-bold text-lg">2. {form.occupancy==='owner'?'Owner-occupant offer details':'Investor offer details'}</h3>
  <div className="grid md:grid-cols-2 gap-4">
   <div className="text-sm font-medium text-gray-700">HUD case number<div className="mt-1 rounded-lg border bg-gray-50 p-2">{property?.case_number}</div></div>
   <div className="text-sm font-medium text-gray-700">Current asking price<div className="mt-1 rounded-lg border bg-gray-50 p-2">{money(property?.price)}</div></div>
   {field('Your offer ($)','offer_price','number')}
   {field('Earnest money ($)','earnest_money','number')}
   <label className="text-sm font-medium">Financing<select className="block border rounded-lg p-2 w-full mt-1" value={form.financing} onChange={e=>change('financing',e.target.value)}>{form.occupancy==='owner'&&<><option value="fha">FHA</option><option value="203k">FHA 203(k)</option></>}<option value="conventional">Conventional</option><option value="cash">Cash</option></select></label>
   {form.occupancy==='owner'?field('Requested HUD closing assistance (%)','closing_cost_percent','number'):<div className="text-sm text-gray-600 rounded-lg bg-gray-50 border p-3">HUD-paid closing assistance: <strong>0% for investor offers</strong></div>}
   <label className="block text-sm font-medium text-gray-700">Listing / seller broker commission (%)<input className="mt-1 w-full border rounded-lg p-2" type="number" min="0" max="100" step="0.1" value={commission.listing} onChange={e=>setCommission(v=>({...v,listing:e.target.value}))} /></label>
   <label className="block text-sm font-medium text-gray-700">Buyer broker commission (%)<input className="mt-1 w-full border rounded-lg p-2" type="number" min="0" max="100" step="0.1" value={commission.buyer} onChange={e=>setCommission(v=>({...v,buyer:e.target.value}))} /></label>
  </div>
  <label className="block text-sm font-medium">Notes for broker<textarea className="block w-full border rounded-lg p-2 mt-1" value={form.notes} onChange={e=>change('notes',e.target.value)} /></label>
  <div className="bg-blue-50 p-4 rounded-lg space-y-1"><p>Gross offer: <strong>{money(offerAmount)}</strong></p><p>Less requested closing assistance ({percent(form.closing_cost_percent)}%): −{money(assistance)}</p><p>Less listing commission ({percent(commission.listing)}%): −{money(listingCommission)}</p><p>Less buyer broker commission ({percent(commission.buyer)}%): −{money(buyerCommission)}</p><p className="border-t border-blue-200 pt-2 font-bold">Estimated net to HUD: {money(hudNet)}</p><p className="text-xs mt-2">Illustrative calculation only. All percentages are based on gross offer price. Commissions and assistance must be approved and may be subject to HUD limits; broker must verify actual bid amounts and other deductions.</p></div>
  <div className="border rounded-xl p-4 space-y-3">
   <h3 className="text-lg font-bold">Offer competitiveness &amp; statistics</h3>
   <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
    <div><p className="text-gray-500">Asking price</p><strong>{asking?money(asking):'Unavailable'}</strong></div>
    <div><p className="text-gray-500">Estimated net to HUD</p><strong>{money(hudNet)}</strong></div>
    <div><p className="text-gray-500">Your net / asking</p><strong>{netRatio!==null?pct(netRatio):'Unavailable'}</strong></div>
    <div><p className="text-gray-500">Historical median net / list</p><strong>{historicalMedian!==null?pct(historicalMedian):'Unavailable'}</strong></div>
   </div>
   {statsLoading?<p>Loading historical statistics…</p>:statsError?<p role="status">Statistics unavailable: {statsError}</p>:<>
    <p className="font-semibold">{assessment}</p>
    <p className="text-sm">{comparison?<>Comparison: {ratios.length} accepted offers matched by {comparison.name.toLowerCase()}. {percentile!==null&&ratios.length>=5?<>Your net-to-list ratio is at or above {percentile}% of this accepted-offer sample.</>:null}</>:'No comparable accepted offers found.'}</p>
   </>}
   <p className="text-xs text-gray-500">Owner-occupant and investor samples are never mixed. Historical accepted offers only; not an acceptance probability. Matches prioritize city, county, then state and purchaser type where recorded. Competing bids, eligibility, listing period and HUD decisions are unknown. Commission and closing assistance assumptions must be verified by a HUD-authorized broker.</p>
  </div>
  {message&&<p role="status" className="text-blue-800">{message}</p>}
  <label className="flex gap-2 items-start text-sm"><input type="checkbox" checked={!!form.referral_consent} onChange={e=>change("referral_consent",e.target.checked)} /> If no broker is assigned, I authorize USAHUDhomes to share a limited, non-identifying offer summary with eligible brokers for referral matching. Buyer contact information stays private until assignment.</label>
  <div className="flex flex-wrap gap-3"><button disabled={busy} onClick={()=>save('draft')} className="bg-gray-800 text-white rounded-lg px-4 py-2 disabled:opacity-50">{form.id?'Update draft':'Save draft'}</button><button disabled={busy} onClick={()=>save('submitted')} className="bg-blue-700 text-white rounded-lg px-4 py-2 disabled:opacity-50">Send proposal for review</button></div>
  </>}
  {['owner','investor'].includes(form.occupancy)&&<div className="border rounded-xl p-4 space-y-4">
   <h3 className="text-lg font-bold">Private buyer details &amp; supporting documents</h3>
   <p className="text-sm text-gray-600">Enter deed details now. Save your offer as a draft before saving these private details or uploading documents. Only the signed-in buyer can access this section.</p>
   {!form.id&&<p className="text-sm rounded-lg bg-amber-50 p-3 text-amber-900">First click <strong>Save draft</strong> above. Then return to this section to save private details and upload documents.</p>}
   <label className="block text-sm font-medium">Full legal name(s) exactly as title should be vested on the deed<input className="mt-1 w-full border rounded-lg p-2" value={secure.deed_legal_name} onChange={e=>setSecure(old=>({...old,deed_legal_name:e.target.value}))} placeholder="Full legal name(s) — confirm with closing attorney" /></label>
   <label className="block text-sm font-medium">Deed mailing address<textarea className="mt-1 w-full border rounded-lg p-2" value={secure.deed_mailing_address} onChange={e=>setSecure(old=>({...old,deed_mailing_address:e.target.value}))} placeholder="Street, city, state, ZIP" /></label>
   <label className="block text-sm font-medium">Preferred closing attorney<select className="mt-1 w-full border rounded-lg p-2" value={secure.preferred_closing_agent_id} onChange={e=>setSecure(old=>({...old,preferred_closing_agent_id:e.target.value}))}><option value="">No preference / select later</option>{agents.map(a=><option key={a.id} value={a.id}>{a.company_name} — {a.city}, {a.state}</option>)}</select></label>
   <button type="button" disabled={secureBusy||!form.id||!['draft','changes_requested'].includes(form.status)} onClick={saveSecure} className="bg-gray-800 text-white rounded-lg px-4 py-2 disabled:opacity-50">Save private details</button>
   <div className="grid sm:grid-cols-2 gap-4">
    <label className="block border rounded-lg p-3 text-sm font-medium">Prequalification letter / proof of funds<input type="file" accept=".pdf,.jpg,.jpeg,.png" disabled={secureBusy||!form.id||!['draft','changes_requested'].includes(form.status)} onChange={e=>uploadDocument(e,'financing')} className="mt-2 block w-full text-sm" /></label>
    <label className="block border rounded-lg p-3 text-sm font-medium">Earnest money check copy<input type="file" accept=".pdf,.jpg,.jpeg,.png" disabled={secureBusy} onChange={e=>uploadDocument(e,'earnest')} className="mt-2 block w-full text-sm" /><span className="block mt-2 text-xs text-amber-700">Redact bank account and routing numbers before uploading.</span></label>
   </div>
   {documents.length>0&&<div className="space-y-2"><h4 className="font-semibold text-sm">Private uploads</h4>{documents.map(d=><div key={d.name} className="flex justify-between gap-2 text-sm border-b pb-2"><span className="break-all">{d.name}</span><button type="button" disabled={secureBusy} className="text-red-700 underline" onClick={()=>removeDocument(d.name)}>Delete</button></div>)}</div>}
   <p className="text-xs text-amber-800">Do not enter or upload Social Security numbers, tax identification numbers, unredacted checks, or tax returns here. Your assigned closing attorney should request tax IDs through a separate verified secure intake process. These documents are not automatically shared with brokers or attorneys.</p>
   {secureMessage&&<p role="status" className="text-sm">{secureMessage}</p>}
  </div>}
  <div className="border-t pt-4"><h3 className="font-bold mb-3">Your saved proposals</h3>{bids.length===0?<p className="text-gray-500">No proposals yet.</p>:<div className="space-y-2">{bids.filter(b=>b.case_number===property?.case_number).map(b=><div key={b.id} className="border rounded-lg p-3 flex justify-between items-center gap-3"><div><Link className="text-blue-700 font-semibold" to={`/property/${b.case_number}`}>{b.case_number}</Link><p>{money(b.offer_price)} · {b.status.replaceAll('_',' ')}</p></div><div className="flex gap-3 items-center">{['draft','changes_requested'].includes(b.status)&&<button className="text-blue-700 underline" onClick={()=>{editDraft(b);setSearchParams(old=>{const next=new URLSearchParams(old);next.set('offer',b.id);return next},{replace:true})}}>Edit</button>}{b.status==='draft'&&<button type="button" disabled={busy} className="text-red-700 underline disabled:opacity-50" onClick={()=>deleteDraft(b)}>Delete</button>}</div></div>)}</div>}</div>
 </section>
}
