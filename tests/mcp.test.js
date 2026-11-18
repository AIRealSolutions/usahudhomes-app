import test from 'node:test';
import assert from 'node:assert/strict';
process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'test-key';
const {default:handler} = await import('../api/mcp.js');

function request(method, params) {
  const req = {method:'POST',body:{jsonrpc:'2.0',id:1,method,params}};
  const res = {statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v;return this;},status(n){this.statusCode=n;return this;},json(v){this.body=v;return this;},end(){return this;}};
  return handler(req,res).then(()=>res);
}
function payload(res){return JSON.parse(res.body.result.content[0].text);}
const originalFetch = globalThis.fetch;
test.after(()=>{globalThis.fetch=originalFetch;});

test('MCP initialize and tool discovery',async()=>{
  const init=await request('initialize');
  assert.equal(init.body.result.serverInfo.name,'usahudhomes');
  const list=await request('tools/list');
  const search=list.body.result.tools.find(t=>t.name==='search_hud_homes');
  assert.ok(search);
  for(const key of ['owner_occupant_only','listing_period','fha_insurable_only']) assert.ok(search.inputSchema.properties[key]);
  assert.ok(list.body.result.tools.some(t=>t.name==='get_property_details'));
});
test('MCP search filters are sent to Supabase and results have timestamp',async()=>{
  let url;
  globalThis.fetch=async input=>{
    url=new URL(input);
    return {ok:true,json:async()=>[{case_number:'381-123456',state:'NC',listing_period:'Exclusive',fha_financing:'IN (Insured)'}]};
  };
  const res=await request('tools/call',{name:'search_hud_homes',arguments:{state:'NC',max_price:200000,owner_occupant_only:true,fha_insurable_only:true}});
  assert.equal(res.body.result.isError,undefined);
  assert.equal(url.searchParams.get('listing_period'),'in.(Exclusive,Extended)');
  assert.equal(url.searchParams.get('or'),'(fha_financing.ilike.IN*,fha_financing.ilike.IE*)');
  assert.equal(url.searchParams.get('price'),'lte.200000');
  assert.equal(payload(res).properties[0].property_url,'https://www.usahudhomes.com/property/381-123456');
  assert.ok(!Number.isNaN(Date.parse(payload(res).retrieved_at)));
});
test('explicit listing period and case number lookup',async()=>{
  let url;
  globalThis.fetch=async input=>{url=new URL(input);return {ok:true,json:async()=>[]};};
  await request('tools/call',{name:'search_hud_homes',arguments:{listing_period:'Extended'}});
  assert.equal(url.searchParams.get('listing_period'),'eq.Extended');
  await request('tools/call',{name:'get_property_details',arguments:{case_number:'381-123456'}});
  assert.equal(url.searchParams.get('case_number'),'eq.381-123456');
});
test('invalid inputs fail without querying database',async()=>{
  globalThis.fetch=async()=>{throw Error('Unexpected database access');};
  for(const args of [{owner_occupant_only:'yes'},{listing_period:'Unknown'},{fha_insurable_only:1}]){
    const res=await request('tools/call',{name:'search_hud_homes',arguments:args});
    assert.equal(res.body.result.isError,true);
  }
  const res=await request('tools/call',{name:'get_property_details',arguments:{case_number:'bad'}});
  assert.equal(res.body.result.isError,true);
});
