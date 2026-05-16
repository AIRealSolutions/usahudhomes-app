import{r as g,j as a,K as C,L as j,N as P,M as O,G as L,S as D,Z as E,O as T,Q as B,x as _}from"./index-CrmKjufW.js";import{O as q}from"./client-BkvFTCli.js";import{customerService as F}from"./customerService-DsegsV5V.js";import{c as H}from"./consultationService-Dmzm_tdQ.js";import{S as Y}from"./sparkles-cmnjzkgF.js";import{L as v}from"./loader-circle-bTgjlnBZ.js";import"./agentService-zXzbyhNT.js";let x=null;function f(){var e,n;if(!x){const t=((n=(e=import.meta)==null?void 0:e.env)==null?void 0:n.VITE_OPENAI_API_KEY)||"";if(!t)return null;x=new q({apiKey:t,dangerouslyAllowBrowser:!0})}return x}const h={async getCustomerContext(e){try{const n=await H.getConsultationsByProperty(e.case_number),t=[...new Set(n.map(s=>s.customer_id).filter(Boolean))],r=(await Promise.all(t.map(s=>F.getCustomerById(s)))).filter(Boolean),c={totalInterested:n.length,uniqueCustomers:r.length,consultationTypes:[...new Set(n.map(s=>s.consultation_type))],customerStates:[...new Set(r.map(s=>s.state).filter(Boolean))],averageEngagement:n.filter(s=>s.status==="completed").length,pendingConsultations:n.filter(s=>s.status==="pending").length,commonQuestions:n.map(s=>s.message).filter(Boolean)};return{success:!0,consultations:n,customers:r,insights:c}}catch(n){return console.error("Error fetching customer context:",n),{success:!1,error:n.message,consultations:[],customers:[],insights:null}}},async generateSocialPost(e,n,t=null){var m,p;const l={facebook:{maxLength:500,tone:"friendly and engaging",features:"Use emojis, ask questions, encourage sharing",callToAction:"Learn more or schedule a showing"},twitter:{maxLength:280,tone:"concise and punchy",features:"Use hashtags, keep it brief, include key details",callToAction:"Click to view details"},linkedin:{maxLength:700,tone:"professional and informative",features:"Focus on investment opportunity, market data, ROI potential",callToAction:"Contact us for more information"},email:{maxLength:1e3,tone:"professional yet warm",features:"Include all details, structured format, clear sections",callToAction:"Schedule a consultation or request more information"}},r=l[n]||l.facebook;let c="";if(t&&t.insights){const u=t.insights;c=`

Customer Interest Data:
- ${u.totalInterested} people have shown interest in this property
- ${u.uniqueCustomers} unique customers
- ${u.pendingConsultations} pending consultations
- Common interests: ${u.consultationTypes.join(", ")}
- Interested buyers from: ${u.customerStates.join(", ")}

Use this data to create urgency and social proof in your post.`}const s=`Generate a ${n} post for this HUD home property:

Property Details:
- Address: ${e.address}, ${e.city}, ${e.state}
- Case Number: ${e.case_number}
- Price: $${(m=e.price)==null?void 0:m.toLocaleString()}
- Bedrooms: ${e.bedrooms||"N/A"}
- Bathrooms: ${e.bathrooms||"N/A"}
- Square Feet: ${((p=e.sqft)==null?void 0:p.toLocaleString())||"N/A"}
- Year Built: ${e.yearBuilt||"N/A"}
- Status: ${e.status}
- County: ${e.county||"N/A"}
- FHA Insurable: ${e.fhaInsurable?"Yes":"No"}${c}

Platform Guidelines:
- Maximum length: ${r.maxLength} characters
- Tone: ${r.tone}
- Features: ${r.features}
- Call to action: ${r.callToAction}

Generate an engaging ${n} post that highlights the property's best features and encourages potential buyers to take action. Include relevant details and make it compelling.`;try{const u=f();if(!u)return{success:!1,error:"OpenAI API key not configured"};const b=await u.chat.completions.create({model:"gpt-4.1-mini",messages:[{role:"system",content:"You are a professional real estate marketing expert specializing in HUD homes and government foreclosures. You create compelling, accurate, and platform-optimized marketing content."},{role:"user",content:s}],temperature:.7,max_tokens:500});return{success:!0,content:b.choices[0].message.content,platform:n,usage:b.usage}}catch(u){return console.error("OpenAI API error:",u),{success:!1,error:u.message}}},async generateDescription(e,n="standard"){var r,c;const t={standard:"professional and informative",luxury:"upscale and sophisticated",family:"warm and family-focused",investor:"ROI-focused and analytical"},l=`Write a compelling property description for this HUD home:

Property Details:
- Address: ${e.address}, ${e.city}, ${e.state}
- Price: $${(r=e.price)==null?void 0:r.toLocaleString()}
- Bedrooms: ${e.bedrooms||"N/A"}
- Bathrooms: ${e.bathrooms||"N/A"}
- Square Feet: ${((c=e.sqft)==null?void 0:c.toLocaleString())||"N/A"}
- Year Built: ${e.yearBuilt||"N/A"}
- County: ${e.county||"N/A"}
- Lot Size: ${e.lotSize||"N/A"}

Style: ${t[n]||t.standard}

Write a 150-200 word description that:
1. Highlights the property's best features
2. Mentions the HUD opportunity and potential savings
3. Describes the location and neighborhood
4. Creates urgency and excitement
5. Includes a call to action

Make it engaging and persuasive while remaining factual and professional.`;try{const s=f();if(!s)return{success:!1,error:"OpenAI API key not configured"};const m=await s.chat.completions.create({model:"gpt-4.1-mini",messages:[{role:"system",content:"You are a professional real estate copywriter specializing in HUD homes. You write compelling, accurate property descriptions that convert browsers into buyers."},{role:"user",content:l}],temperature:.7,max_tokens:400});return{success:!0,content:m.choices[0].message.content,style:n,usage:m.usage}}catch(s){return console.error("OpenAI API error:",s),{success:!1,error:s.message}}},async generateSEO(e){var t;const n=`Generate SEO-optimized content for this HUD home property:

Property: ${e.address}, ${e.city}, ${e.state}
Price: $${(t=e.price)==null?void 0:t.toLocaleString()}
Case Number: ${e.case_number}

Generate:
1. SEO Title (60 characters max)
2. Meta Description (155 characters max)
3. 5 relevant keywords
4. H1 heading
5. 3 H2 subheadings for content sections

Focus on:
- HUD homes, government foreclosures
- Location-specific keywords (${e.city}, ${e.state}, ${e.county})
- Property features
- Affordability and opportunity

Format as JSON.`;try{const l=f();if(!l)return{success:!1,error:"OpenAI API key not configured"};const r=await l.chat.completions.create({model:"gpt-4.1-mini",messages:[{role:"system",content:"You are an SEO expert specializing in real estate. You create optimized content that ranks well in search engines while remaining natural and user-friendly."},{role:"user",content:n}],temperature:.5,max_tokens:500}),c=r.choices[0].message.content;try{return{success:!0,data:JSON.parse(c),usage:r.usage}}catch{return{success:!0,content:c,usage:r.usage}}}catch(l){return console.error("OpenAI API error:",l),{success:!1,error:l.message}}},async chat(e,n,t=null){var r,c;const l=`You are a professional real estate marketing assistant specializing in HUD homes and government foreclosures. You help agents and brokers create effective marketing content, answer questions about property marketing strategies, and provide expert advice.

Current Property Context:
- Address: ${e.address}, ${e.city}, ${e.state}
- Case Number: ${e.case_number}
- Price: $${(r=e.price)==null?void 0:r.toLocaleString()}
- Bedrooms: ${e.bedrooms||"N/A"}
- Bathrooms: ${e.bathrooms||"N/A"}
- Square Feet: ${((c=e.sqft)==null?void 0:c.toLocaleString())||"N/A"}
- Status: ${e.status}

Customer Interest Data:
${t&&t.insights?`
- ${t.insights.totalInterested} people interested
- ${t.insights.uniqueCustomers} unique customers
- ${t.insights.pendingConsultations} pending consultations
- Interested from: ${t.insights.customerStates.join(", ")}
- Consultation types: ${t.insights.consultationTypes.join(", ")}

You can use this customer data to create personalized, targeted marketing content that addresses real buyer interest and creates urgency.`:"- No customer interest data available yet"}

You can help with:
- Generating social media posts
- Writing property descriptions
- Creating email campaigns
- SEO optimization
- Marketing strategy advice
- Answering questions about HUD homes
- Suggesting improvements to marketing materials

Be helpful, professional, and provide actionable advice.`;try{const s=f();if(!s)return{success:!1,error:"OpenAI API key not configured"};const m=await s.chat.completions.create({model:"gpt-4.1-mini",messages:[{role:"system",content:l},...n],temperature:.7,max_tokens:800});return{success:!0,message:m.choices[0].message,usage:m.usage}}catch(s){return console.error("OpenAI API error:",s),{success:!1,error:s.message}}},async generateCampaign(e,n="comprehensive"){var l;const t=`Create a ${n} marketing campaign for this HUD home:

Property: ${e.address}, ${e.city}, ${e.state}
Price: $${(l=e.price)==null?void 0:l.toLocaleString()}
Features: ${e.bedrooms} bed, ${e.bathrooms} bath, ${e.sqft} sqft

Generate a complete marketing campaign including:
1. Campaign theme/angle
2. Target audience description
3. Key messaging points (3-5 bullets)
4. Facebook post
5. Twitter post
6. Email subject line and preview text
7. Recommended hashtags
8. Best times to post
9. Follow-up strategy

Make it actionable and ready to implement.`;try{const r=f();if(!r)return{success:!1,error:"OpenAI API key not configured"};const c=await r.chat.completions.create({model:"gpt-4.1-mini",messages:[{role:"system",content:"You are a marketing strategist specializing in real estate campaigns. You create comprehensive, multi-channel marketing plans that drive results."},{role:"user",content:t}],temperature:.7,max_tokens:1200});return{success:!0,content:c.choices[0].message.content,campaignType:n,usage:c.usage}}catch(r){return console.error("OpenAI API error:",r),{success:!1,error:r.message}}}};function J({property:e}){const[n,t]=g.useState([{role:"assistant",content:`Hi! I'm your AI marketing assistant. I can help you create compelling marketing content for ${e.address}. What would you like to create today?`}]),[l,r]=g.useState(""),[c,s]=g.useState(!1),[m,p]=g.useState(null),[u,b]=g.useState(null),[z,k]=g.useState(!0),w=g.useRef(null);g.useEffect(()=>{async function i(){k(!0);const o=await h.getCustomerContext(e);b(o),k(!1),o.success&&o.insights&&o.insights.totalInterested>0&&t([{role:"assistant",content:`Hi! I'm your AI marketing assistant. I can help you create compelling marketing content for ${e.address}.

📊 **Customer Interest**: ${o.insights.totalInterested} people have shown interest in this property! I can use this data to create personalized, targeted marketing content. What would you like to create today?`}])}i()},[e]);const A=()=>{var i;(i=w.current)==null||i.scrollIntoView({behavior:"smooth"})};g.useEffect(()=>{A()},[n]);const $=async()=>{if(!l.trim()||c)return;const i={role:"user",content:l};t(o=>[...o,i]),r(""),s(!0);try{const o=await h.chat(e,[...n,i],u);o.success?t(d=>[...d,o.message]):t(d=>[...d,{role:"assistant",content:`Sorry, I encountered an error: ${o.error}. Please try again.`}])}catch{t(d=>[...d,{role:"assistant",content:"Sorry, something went wrong. Please try again."}])}finally{s(!1)}},I=async i=>{s(!0);let o;try{switch(i){case"facebook":o=await h.generateSocialPost(e,"facebook",u);break;case"twitter":o=await h.generateSocialPost(e,"twitter",u);break;case"linkedin":o=await h.generateSocialPost(e,"linkedin",u);break;case"email":o=await h.generateSocialPost(e,"email",u);break;case"description":o=await h.generateDescription(e,"standard");break;case"seo":o=await h.generateSEO(e);break;case"campaign":o=await h.generateCampaign(e,"comprehensive");break;default:return}if(o.success){const d=o.content||JSON.stringify(o.data,null,2);t(y=>[...y,{role:"assistant",content:d}])}else t(d=>[...d,{role:"assistant",content:`Error: ${o.error}`}])}catch{t(y=>[...y,{role:"assistant",content:"Sorry, something went wrong. Please try again."}])}finally{s(!1)}},S=(i,o)=>{navigator.clipboard.writeText(i),p(o),setTimeout(()=>p(null),2e3)},N=[{id:"facebook",icon:C,label:"Facebook Post",color:"bg-blue-600 hover:bg-blue-700"},{id:"twitter",icon:j,label:"Twitter Post",color:"bg-sky-500 hover:bg-sky-600"},{id:"linkedin",icon:P,label:"LinkedIn Post",color:"bg-blue-700 hover:bg-blue-800"},{id:"email",icon:O,label:"Email Content",color:"bg-gray-600 hover:bg-gray-700"},{id:"description",icon:L,label:"Description",color:"bg-green-600 hover:bg-green-700"},{id:"seo",icon:D,label:"SEO Content",color:"bg-purple-600 hover:bg-purple-700"},{id:"campaign",icon:E,label:"Full Campaign",color:"bg-orange-600 hover:bg-orange-700"}];return a.jsxs("div",{className:"bg-white rounded-lg shadow-sm border border-gray-200 h-[600px] flex flex-col",children:[a.jsxs("div",{className:"p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50",children:[a.jsxs("div",{className:"flex items-center gap-2",children:[a.jsx(Y,{className:"h-5 w-5 text-blue-600"}),a.jsx("h3",{className:"text-lg font-semibold text-gray-900",children:"AI Marketing Assistant"})]}),a.jsx("p",{className:"text-sm text-gray-600 mt-1",children:"Generate marketing content, get strategy advice, and optimize your listings"})]}),a.jsxs("div",{className:"p-4 border-b border-gray-200 bg-gray-50",children:[a.jsx("p",{className:"text-xs font-medium text-gray-700 mb-2",children:"Quick Actions:"}),a.jsx("div",{className:"flex flex-wrap gap-2",children:N.map(i=>a.jsxs("button",{onClick:()=>I(i.id),disabled:c,className:`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-medium transition-colors ${i.color} disabled:opacity-50 disabled:cursor-not-allowed`,children:[a.jsx(i.icon,{className:"h-3.5 w-3.5"}),i.label]},i.id))})]}),a.jsxs("div",{className:"flex-1 overflow-y-auto p-4 space-y-4",children:[n.map((i,o)=>a.jsx("div",{className:`flex ${i.role==="user"?"justify-end":"justify-start"}`,children:a.jsxs("div",{className:`max-w-[80%] rounded-lg p-3 ${i.role==="user"?"bg-blue-600 text-white":"bg-gray-100 text-gray-900"}`,children:[a.jsx("div",{className:"whitespace-pre-wrap break-words",children:i.content}),i.role==="assistant"&&a.jsx("button",{onClick:()=>S(i.content,o),className:"mt-2 inline-flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900",children:m===o?a.jsxs(a.Fragment,{children:[a.jsx(T,{className:"h-3 w-3"}),"Copied!"]}):a.jsxs(a.Fragment,{children:[a.jsx(B,{className:"h-3 w-3"}),"Copy"]})})]})},o)),c&&a.jsx("div",{className:"flex justify-start",children:a.jsx("div",{className:"bg-gray-100 rounded-lg p-3",children:a.jsx(v,{className:"h-5 w-5 text-gray-600 animate-spin"})})}),a.jsx("div",{ref:w})]}),a.jsxs("div",{className:"p-4 border-t border-gray-200",children:[a.jsxs("div",{className:"flex gap-2",children:[a.jsx("input",{type:"text",value:l,onChange:i=>r(i.target.value),onKeyPress:i=>i.key==="Enter"&&$(),placeholder:"Ask me to create marketing content, give advice, or answer questions...",disabled:c,className:"flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"}),a.jsx("button",{onClick:$,disabled:c||!l.trim(),className:"px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors",children:c?a.jsx(v,{className:"h-5 w-5 animate-spin"}):a.jsx(_,{className:"h-5 w-5"})})]}),a.jsx("p",{className:"text-xs text-gray-500 mt-2",children:'💡 Tip: Try asking "Create a Facebook post" or "Generate a property description"'})]})]})}export{J as default};
