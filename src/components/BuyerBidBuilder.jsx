import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Link, useSearchParams } from 'react-router-dom'

const initial = { case_number:'', asking_price:'', offer_price:'', occupancy:'owner', financing:'fha', closing_cost_percent:0, earnest_money:1000, notes:'', referral_consent:false }
const money = n => Number(n || 0).toLocaleString('en-US',{style:'currency',currency:'USD'})
export default function BuyerBidBuilder({ user, property }) {
 const [searchParams]=useSearchParams()
 const [form,setForm]=useState(initial), [bids,setBids]=useState([]), [busy,setBusy]=useState(false), [message,setMessage]=useState('')
 const change=(key,value)=>setForm(old=>({...old,[key]:value}))
 const load=async()=>{ if(!user?.id)return; const {data,error}=await supabase.from('buyer_bid_drafts').select('*').eq('buyer_id',user.id).order('created_at',{ascending:false}); if(error)setMessage(error.message);else setBids(data||[]) }
 useEffect(()=>{load()},[user?.id])
 useEffect(()=>{ if(!property?.case_number)return; setForm(old=>({...initial,case_number:property.case_number,asking_price:property.price??'',offer_price:property.price??''}));setMessage('Property details loaded. Verify bidding eligibility with your broker.') },[property?.case_number,property?.price])
 useEffect(()=>{const selected=bids.find(b=>b.id===searchParams.get('offer')&&b.case_number===property?.case_number);if(selected&&['draft','changes_requested'].includes(selected.status))setForm({...selected,asking_price:property.price??''})},[bids,searchParams,property?.case_number,property?.price])
 const save=async(status)=>{
  if(!user?.id)return setMessage('Please sign in to save an offer.')
  if(!/^\d{3}-\d{6}$/.test(form.case_number.trim()))return setMessage('Enter a valid HUD case number (000-000000).')
  if(!(Number(form.offer_price)>0))return setMessage('Enter an offer greater than zero.')
  if(Number(form.closing_cost_percent)<0||Number(form.closing_cost_percent)>3)return setMessage('Closing assistance must be between 0 and 3%.')
  setBusy(true);setMessage('')
  const {id,created_at,updated_at,submitted_at,buyer_id,consultation_id,assigned_broker_id,status:oldStatus,...offerFields}=form
  const payload={...offerFields,case_number:property.case_number,buyer_id:user.id,asking_price:form.asking_price===''?null:Number(form.asking_price),offer_price:Number(form.offer_price),closing_cost_percent:Number(form.closing_cost_percent),earnest_money:Number(form.earnest_money),status,submitted_at:status==='submitted'?new Date().toISOString():null,updated_at:new Date().toISOString()}
  const {error}=form.id?await supabase.from('buyer_bid_drafts').update(payload).eq('id',form.id).eq('buyer_id',user.id):await supabase.from('buyer_bid_drafts').insert(payload)
  setBusy(false)
  if(error)return setMessage(error.message)
  setMessage(status==='submitted'?'Offer proposal submitted for review. This is NOT a bid to HUD.':'Draft saved.')
  setForm({...initial,case_number:property.case_number,asking_price:property.price??'',offer_price:property.price??''});await load()
 }
 const field=(label,key,type='text')=><label className="block text-sm font-medium text-gray-700">{label}<input className="mt-1 w-full border rounded-lg p-2" type={type} value={form[key]} onChange={e=>change(key,e.target.value)} /></label>
 return <section className="bg-white rounded-xl shadow p-6 mb-8 space-y-5">
  <div><h2 className="text-2xl font-bold">My HUD Offers</h2><p className="text-gray-600">Prepare an offer for broker review. Only a HUD-authorized broker can submit an official HUD bid.</p></div>
  <div className="grid md:grid-cols-2 gap-4">
   <div className="text-sm font-medium text-gray-700">HUD case number<div className="mt-1 rounded-lg border bg-gray-50 p-2">{property?.case_number}</div></div>
   <div className="text-sm font-medium text-gray-700">Current asking price<div className="mt-1 rounded-lg border bg-gray-50 p-2">{money(property?.price)}</div></div>
   {field('Your offer ($)','offer_price','number')}
   {field('Earnest money ($)','earnest_money','number')}
   <label className="text-sm font-medium">Purchase type<select className="block border rounded-lg p-2 w-full mt-1" value={form.occupancy} onChange={e=>change('occupancy',e.target.value)}><option value="owner">Owner occupant</option><option value="investor">Investor</option><option value="other">Other eligible purchaser</option></select></label>
   <label className="text-sm font-medium">Financing<select className="block border rounded-lg p-2 w-full mt-1" value={form.financing} onChange={e=>change('financing',e.target.value)}><option value="fha">FHA</option><option value="203k">FHA 203(k)</option><option value="conventional">Conventional</option><option value="cash">Cash</option></select></label>
   {field('Requested closing assistance (%)','closing_cost_percent','number')}
  </div>
  <label className="block text-sm font-medium">Notes for broker<textarea className="block w-full border rounded-lg p-2 mt-1" value={form.notes} onChange={e=>change('notes',e.target.value)} /></label>
  <div className="bg-blue-50 p-4 rounded-lg"><p>Offer: <strong>{money(form.offer_price)}</strong></p><p>Requested closing assistance: {money(Number(form.offer_price)*Number(form.closing_cost_percent)/100)}</p><p>Illustrative HUD net before commissions and other deductions: <strong>{money(Number(form.offer_price)*(1-Number(form.closing_cost_percent)/100))}</strong></p><p className="text-xs mt-2">Estimates only. Broker must verify eligibility, commissions, bid deadlines and HUD net.</p></div>
  {message&&<p role="status" className="text-blue-800">{message}</p>}
  <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={!!form.referral_consent} onChange={e=>change('referral_consent',e.target.checked)} /> If I do not have an assigned broker, I authorize USAHUDhomes to share a limited, non-identifying summary of this offer with qualified HUD brokers for referral matching. My contact details remain private until assignment. </label>
  <div className="flex flex-wrap gap-3"><button disabled={busy} onClick={()=>save('draft')} className="bg-gray-800 text-white rounded-lg px-4 py-2 disabled:opacity-50">Save draft</button><button disabled={busy} onClick={()=>save('submitted')} className="bg-blue-700 text-white rounded-lg px-4 py-2 disabled:opacity-50">Send proposal for review</button></div>
  <div className="border-t pt-4"><h3 className="font-bold mb-3">Your saved proposals</h3>{bids.length===0?<p className="text-gray-500">No proposals yet.</p>:<div className="space-y-2">{bids.filter(b=>b.case_number===property?.case_number).map(b=><div key={b.id} className="border rounded-lg p-3 flex justify-between items-center gap-3"><div><Link className="text-blue-700 font-semibold" to={`/property/${b.case_number}`}>{b.case_number}</Link><p>{money(b.offer_price)} · {b.status.replaceAll('_',' ')}</p></div>{['draft','changes_requested'].includes(b.status)&&<button className="text-blue-700 underline" onClick={()=>{setForm({...b,case_number:property.case_number,asking_price:property.price??''});setMessage('Editing saved draft')}}>Edit</button>}</div>)}</div>}</div>
 </section>
}
