// Admin-assisted collection: paste text copied from an authorized HUD closing-agent directory.
// Never labels imported data verified; approval requires independent confirmation.
import {stateCode} from './buyerProfile'
const trim=v=>String(v||'').trim()
const email=/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/
const phone=/(?:\+1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/
const zip=/\b\d{5}(?:-\d{4})?\b/
const stateZip=/\b([A-Z]{2})\s+(\d{5}(?:-\d{4})?)\b/i
export function parseClosingAgentText(text,{state='',source_url=''}={}){
 const chunks=trim(text).split(/\n\s*\n|\n(?=(?:Firm|Company|Closing Agent|Attorney)\s*:)/i).map(trim).filter(Boolean)
 return chunks.map((block,index)=>{
  const lines=block.split(/\n/).map(trim).filter(Boolean)
  const labeled=(names)=>{const r=lines.find(l=>new RegExp('^(?:'+names+')\\s*:', 'i').test(l));return r?r.replace(/^[^:]+:\s*/,''):''}
  const foundState=block.match(stateZip)
  const code=stateCode(labeled('State')||foundState?.[1]||state)
  const company_name=labeled('Firm|Company|Closing Agent|Office')||lines[0]?.replace(/^(?:Firm|Company|Closing Agent|Attorney)\s*:\s*/i,'')
  const contact_name=labeled('Contact|Attorney|Escrow Officer')
  const address=labeled('Address|Street')
  const city=labeled('City')
  const e=block.match(email)?.[0]||''
  const p=block.match(phone)?.[0]||''
  return {collection_index:index+1,company_name:trim(company_name),contact_name:trim(contact_name),address:trim(address),city:trim(city),state:code,zip:labeled('ZIP|Postal Code')||foundState?.[2]||block.match(zip)?.[0]||'',phone:p,email:e,source_url:trim(source_url),hud_status:'unverified',active:true}
 })
}
export const closingAgentKey=a=>[trim(a.company_name).toLowerCase().replace(/\W+/g,''),trim(a.city).toLowerCase(),stateCode(a.state)].join('|')
