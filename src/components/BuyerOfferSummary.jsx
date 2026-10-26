import React,{useEffect,useState} from 'react'
import {Link} from 'react-router-dom'
import {supabase} from '../lib/supabase'
import {DealMeterChip} from './DealMeter'
const money=n=>Number(n||0).toLocaleString('en-US',{style:'currency',currency:'USD'})
export default function BuyerOfferSummary({user}){
 const [offers,setOffers]=useState([]),[error,setError]=useState(''),[deleting,setDeleting]=useState(null)
 const deleteDraft=async(o)=>{
  if(o.status!=='draft'||!user?.id)return
  if(!window.confirm('Permanently delete this draft offer for HUD '+o.case_number+'? This cannot be undone.'))return
  setDeleting(o.id);setError('')
  const {data,error}=await supabase.from('buyer_bid_drafts').delete().eq('id',o.id).eq('buyer_id',user.id).eq('status','draft').select('id')
  setDeleting(null)
  if(error){setError(error.message);return}
  if(!data?.length){setError('Draft could not be deleted. Refresh and check its status.');return}
  setOffers(old=>old.filter(x=>x.id!==o.id))
 }
 useEffect(()=>{if(!user?.id)return;let active=true;supabase.from('buyer_bid_drafts').select('id,case_number,offer_price,status,created_at,est_net_to_hud,net_to_list,deal_meter_score').eq('buyer_id',user.id).order('created_at',{ascending:false}).then(({data,error})=>{if(!active)return;if(error)setError(error.message);else setOffers(data||[])});return()=>{active=false}},[user?.id])
 return <section className="bg-white rounded-xl shadow p-6 mb-8"><h2 className="text-2xl font-bold mb-2">My HUD Offers</h2><p className="text-gray-600 mb-4">Review your saved proposals here. Open the property to prepare or revise an offer.</p>{error&&<p role="alert">{error}</p>}{offers.length===0?<p>No offers saved yet. Browse properties to prepare an offer.</p>:<div className="space-y-3">{offers.map(o=><div key={o.id} className="border rounded-lg p-3 flex flex-wrap justify-between gap-3"><div><strong>HUD {o.case_number}</strong><p>{money(o.offer_price)} · {o.status.replaceAll('_',' ')}</p>{o.est_net_to_hud!=null&&<p className="text-sm text-gray-600">Est. net to HUD {money(o.est_net_to_hud)}{o.net_to_list!=null&&<> ({(o.net_to_list*100).toFixed(1)}% of asking)</>}</p>}<DealMeterChip score={o.deal_meter_score} /></div><div className="flex items-center gap-4"><Link className="text-blue-700 underline font-semibold" to={`/property/${encodeURIComponent(o.case_number)}?offer=${o.id}`}>Review on property</Link>{o.status==='draft'&&<button type="button" disabled={deleting===o.id} className="text-red-700 underline font-semibold disabled:opacity-50" onClick={()=>deleteDraft(o)}>{deleting===o.id?'Deleting…':'Delete draft'}</button>}</div></div>)}</div>}</section>
}
