/**
 * USAHUDhomes read-only MCP endpoint.
 * Stateless JSON-RPC over HTTP. No customer data or service-role key exposed.
 */
const VERSION = '2025-03-26';
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_KEY;
const ORIGIN = 'https://www.usahudhomes.com';
const tools = [
 {name:'search_hud_homes',description:'Find HUD-owned homes for sale across the United States by state, city, county, budget, bedrooms and buyer occupancy. Useful for homebuyers seeking a primary residence, HUD owner-occupant exclusive listings, FHA-insurable properties and price reductions. Returns listing links and case numbers. Data may be stale; verify with HUD Home Store.',inputSchema:{type:'object',properties:{state:{type:'string',description:'Two-letter state abbreviation'},city:{type:'string'},county:{type:'string'},max_price:{type:'number',minimum:0},min_beds:{type:'integer',minimum:0},limit:{type:'integer',minimum:1,maximum:20},owner_occupant_only:{type:'boolean',description:'Only properties in the Exclusive or Extended listing periods, which may be available to eligible owner-occupants; does not confirm bid eligibility'},listing_period:{type:'string',enum:['Exclusive','Extended']},fha_insurable_only:{type:'boolean',description:'Only IN or IE FHA classification; lender approval still required'}},additionalProperties:false}},
 {name:'get_property_details',description:'Get a HUD home by its case number with price, size, location, FHA classification, listing period, and direct USAHUDhomes and HUD Home Store links. Confirm availability and bidding deadlines with HUD Home Store.',inputSchema:{type:'object',properties:{case_number:{type:'string'}},required:['case_number'],additionalProperties:false}}
];
function response(id,result){return {jsonrpc:'2.0',id,result}}
function error(id,code,message){return {jsonrpc:'2.0',id,error:{code,message}}}
function clean(p){return {case_number:p.case_number,city:p.city,state:p.state,county:p.county,price:p.price,beds:p.beds,baths:p.baths,sq_ft:p.sq_ft,status:p.status,listing_period:p.listing_period,fha_financing:p.fha_financing,bid_deadline:p.bid_deadline,updated_at:p.updated_at,property_url:`${ORIGIN}/property/${encodeURIComponent(p.case_number)}`,hud_url:p.hud_url}}
async function query(args,detail){
 if(!SUPABASE_URL||!KEY)throw Error('Property search is temporarily unavailable');
 const u=new URL(`${SUPABASE_URL}/rest/v1/properties`);
 u.searchParams.set('select','case_number,city,state,county,price,beds,baths,sq_ft,status,listing_period,fha_financing,bid_deadline,updated_at,hud_url');
 u.searchParams.set('limit',detail?'1':String(Math.min(20,Math.max(1,Number(args.limit)||10))));
 if(detail){
  if(typeof args.case_number!=='string'||!/^\d{3}-\d{6}$/.test(args.case_number))throw Error('Invalid HUD case number');
  u.searchParams.set('case_number',`eq.${args.case_number}`);
 }else{
  u.searchParams.set('is_active','eq.true');
  for(const field of ['state','city','county']){
   if(args[field]!==undefined){
    if(typeof args[field]!=='string'||! /^[a-zA-Z .'-]{2,60}$/.test(args[field]))throw Error(`Invalid ${field}`);
    u.searchParams.set(field,`ilike.${args[field].replace(/[%,()*]/g,'')}`);
   }
  }
  if(args.max_price!==undefined){if(!Number.isFinite(args.max_price)||args.max_price<0)throw Error('Invalid max_price');u.searchParams.set('price',`lte.${args.max_price}`)}
  if(args.min_beds!==undefined){if(!Number.isInteger(args.min_beds)||args.min_beds<0)throw Error('Invalid min_beds');u.searchParams.set('beds',`gte.${args.min_beds}`)}
  if(args.owner_occupant_only!==undefined && typeof args.owner_occupant_only!=='boolean')throw Error('Invalid owner_occupant_only');
  if(args.listing_period!==undefined){if(!['Exclusive','Extended'].includes(args.listing_period))throw Error('Invalid listing_period');u.searchParams.set('listing_period',`eq.${args.listing_period}`)}
  else if(args.owner_occupant_only)u.searchParams.set('listing_period','in.(Exclusive,Extended)');
  if(args.fha_insurable_only!==undefined && typeof args.fha_insurable_only!=='boolean')throw Error('Invalid fha_insurable_only');
  if(args.fha_insurable_only)u.searchParams.set('or','(fha_financing.ilike.IN*,fha_financing.ilike.IE*)');
  u.searchParams.set('order','updated_at.desc');
 }
 const r=await fetch(u,{headers:{apikey:KEY,Authorization:`Bearer ${KEY}`},signal:AbortSignal.timeout(8000)});
 if(!r.ok)throw Error('Property database request failed');
 return (await r.json()).map(clean);
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method==='GET')return res.status(405).json({error:'Use MCP JSON-RPC POST'});
 if(req.method!=='POST')return res.status(405).end();
 const body=req.body||{},id=body.id??null;
 if(body.jsonrpc!=='2.0'||typeof body.method!=='string')return res.status(400).json(error(id,-32600,'Invalid JSON-RPC request'));
 if(body.method==='notifications/initialized')return res.status(202).end();
 if(body.method==='initialize')return res.status(200).json(response(id,{protocolVersion:VERSION,capabilities:{tools:{listChanged:false}},serverInfo:{name:'usahudhomes',version:'0.1.0'}}));
 if(body.method==='ping')return res.status(200).json(response(id,{}));
 if(body.method==='tools/list')return res.status(200).json(response(id,{tools}));
 if(body.method==='tools/call'){
  const {name,arguments:args={}}=body.params||{};
  if(!tools.some(t=>t.name===name))return res.status(200).json(error(id,-32602,'Unknown tool'));
  try{
   const records=await query(args,name==='get_property_details');
   return res.status(200).json(response(id,{content:[{type:'text',text:JSON.stringify({properties:records,retrieved_at:new Date().toISOString(),notice:'Records are informational, not a guarantee of current HUD availability, FHA eligibility, or bidding deadlines. Verify with HUD Home Store.'})}]}));
  }catch(e){return res.status(200).json(response(id,{isError:true,content:[{type:'text',text:e.message}]}))}
 }
 return res.status(200).json(error(id,-32601,'Method not found'));
}
