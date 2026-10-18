import React,{useEffect,useState} from 'react'
import {Link} from 'react-router-dom'
import {supabase} from '../lib/supabase'
const money=n=>Number(n||0).toLocaleString('en-US',{style:'currency',currency:'USD'})
export default function BuyerOfferSummary({user}){
 const [offers,setOffers]=useState([]),[error,setError]=useState('')
 useEffect(()=>{if(!user?.id)return;let active=true;supabase.from('buyer_bid_drafts').select('id,case_number,offer_price,status,created_at').eq('buyer_id',user.id).order('created_at',{ascending:false}).then(({data,error})=>{if(!active)return;if(error)setError(error.message);else setOffers(data||[])});return()=>{active=false}},[user?.id])
 return <section className="bg-white rounded-xl shadow p-6 mb-8"><h2 className="text-2xl font-bold mb-2">My HUD Offers</h2><p className="text-gray-600 mb-4">Review your saved proposals here. Open the property to prepare or revise an offer.</p>{error&&<p role="alert">{error}</p>}{offers.length===0?<p>No offers saved yet. Browse properties to prepare an offer.</p>:<div className="space-y-3">{offers.map(o=><div key={o.id} className="border rounded-lg p-3 flex flex-wrap justify-between gap-3"><div><strong>HUD {o.case_number}</strong><p>{money(o.offer_price)} · {o.status.replaceAll('_',' ')}</p></div><Link className="text-blue-700 underline font-semibold" to={`/property/${encodeURIComponent(o.case_number)}?offer=${o.id}`}>Review on property</Link></div>)}</div>}</section>
}
