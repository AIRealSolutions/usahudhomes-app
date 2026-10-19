import {createClient} from '@supabase/supabase-js'
const clean=v=>String(v||'').trim()
export default async function handler(req,res){
 if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'})
 const state=clean(req.query.state).toUpperCase(),city=clean(req.query.city),zip=clean(req.query.zip).slice(0,5)
 if(!/^[A-Z]{2}$/.test(state)||(!city&&!/^\d{5}$/.test(zip)))return res.status(400).json({error:'Valid state and city or ZIP required'})
 if(!process.env.SUPABASE_SERVICE_KEY)return res.status(503).json({error:'Directory unavailable'})
 const db=createClient(process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL,process.env.SUPABASE_SERVICE_KEY,{auth:{persistSession:false}})
 const {data,error}=await db.from('closing_agents').select('id,company_name,contact_name,address,city,state,zip,phone,email,hud_status,source_url').eq('active',true).eq('state',state).limit(1500)
 if(error)return res.status(500).json({error:'Directory query failed'})
 const ranked=(data||[]).map(a=>({...a,rank:zip&&clean(a.zip).slice(0,5)===zip?0:city&&clean(a.city).toLowerCase()===city.toLowerCase()?1:2})).filter(a=>a.rank<2).sort((a,b)=>a.rank-b.rank||a.company_name.localeCompare(b.company_name)).slice(0,50)
 res.setHeader('Cache-Control','public, max-age=60, s-maxage=300')
 return res.status(200).json({results:ranked.map(({rank,...a})=>({...a,match:rank===0?'exact_zip':'same_city'})),count:ranked.length,notice:'Listings are directory options; confirm current HUD eligibility before selecting a closing agent.'})
}
