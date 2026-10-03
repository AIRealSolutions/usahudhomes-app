import{j as n}from"./vendor-radix-BVNr7fM0.js";import{r as g}from"./vendor-react-DHVckhZd.js";import{s as C,c as N,a2 as j,M as P,V as O,m as L,a8 as T,q,S as D}from"./index-Bt1Hbjhi.js";import{customerService as B}from"./customerService-B3V8C4Gw.js";import{S as E}from"./sparkles-FrF49vTl.js";import{T as F,L as _}from"./twitter-xngSbtwA.js";import{C as H}from"./copy-BIwfnzIq.js";import{L as $}from"./loader-circle-C8AnxAby.js";import"./vendor-supabase-Bf3wVh6X.js";import"./vendor-charts-DkQUE1KZ.js";async function z(e){var o;const{data:{session:s}}=await C.auth.getSession(),t=await fetch("/api/ai",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${(s==null?void 0:s.access_token)||""}`},body:JSON.stringify(e)}),c=await t.json().catch(()=>({}));if(!t.ok)throw new Error(((o=c==null?void 0:c.error)==null?void 0:o.message)||`AI request failed (${t.status})`);return c}const Y={chat:{completions:{create:z}}};function U(){return Y}const f=U,h={async getCustomerContext(e){try{const s=await N.getConsultationsByProperty(e.case_number),t=[...new Set(s.map(a=>a.customer_id).filter(Boolean))],o=(await Promise.all(t.map(a=>B.getCustomerById(a)))).filter(Boolean),l={totalInterested:s.length,uniqueCustomers:o.length,consultationTypes:[...new Set(s.map(a=>a.consultation_type))],customerStates:[...new Set(o.map(a=>a.state).filter(Boolean))],averageEngagement:s.filter(a=>a.status==="completed").length,pendingConsultations:s.filter(a=>a.status==="pending").length,commonQuestions:s.map(a=>a.message).filter(Boolean)};return{success:!0,consultations:s,customers:o,insights:l}}catch(s){return console.error("Error fetching customer context:",s),{success:!1,error:s.message,consultations:[],customers:[],insights:null}}},async generateSocialPost(e,s,t=null){var m,p;const c={facebook:{maxLength:500,tone:"friendly and engaging",features:"Use emojis, ask questions, encourage sharing",callToAction:"Learn more or schedule a showing"},twitter:{maxLength:280,tone:"concise and punchy",features:"Use hashtags, keep it brief, include key details",callToAction:"Click to view details"},linkedin:{maxLength:700,tone:"professional and informative",features:"Focus on investment opportunity, market data, ROI potential",callToAction:"Contact us for more information"},email:{maxLength:1e3,tone:"professional yet warm",features:"Include all details, structured format, clear sections",callToAction:"Schedule a consultation or request more information"}},o=c[s]||c.facebook;let l="";if(t&&t.insights){const u=t.insights;l=`

Customer Interest Data:
- ${u.totalInterested} people have shown interest in this property
- ${u.uniqueCustomers} unique customers
- ${u.pendingConsultations} pending consultations
- Common interests: ${u.consultationTypes.join(", ")}
- Interested buyers from: ${u.customerStates.join(", ")}

Use this data to create urgency and social proof in your post.`}const a=`Generate a ${s} post for this HUD home property:

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
- FHA Insurable: ${e.fhaInsurable?"Yes":"No"}${l}

Platform Guidelines:
- Maximum length: ${o.maxLength} characters
- Tone: ${o.tone}
- Features: ${o.features}
- Call to action: ${o.callToAction}

Generate an engaging ${s} post that highlights the property's best features and encourages potential buyers to take action. Include relevant details and make it compelling.`;try{const u=f();if(!u)return{success:!1,error:"OpenAI API key not configured"};const b=await u.chat.completions.create({model:"gpt-4.1-mini",messages:[{role:"system",content:"You are a professional real estate marketing expert specializing in HUD homes and government foreclosures. You create compelling, accurate, and platform-optimized marketing content."},{role:"user",content:a}],temperature:.7,max_tokens:500});return{success:!0,content:b.choices[0].message.content,platform:s,usage:b.usage}}catch(u){return console.error("OpenAI API error:",u),{success:!1,error:u.message}}},async generateDescription(e,s="standard"){var o,l;const t={standard:"professional and informative",luxury:"upscale and sophisticated",family:"warm and family-focused",investor:"ROI-focused and analytical"},c=`Write a compelling property description for this HUD home:

Property Details:
- Address: ${e.address}, ${e.city}, ${e.state}
- Price: $${(o=e.price)==null?void 0:o.toLocaleString()}
- Bedrooms: ${e.bedrooms||"N/A"}
- Bathrooms: ${e.bathrooms||"N/A"}
- Square Feet: ${((l=e.sqft)==null?void 0:l.toLocaleString())||"N/A"}
- Year Built: ${e.yearBuilt||"N/A"}
- County: ${e.county||"N/A"}
- Lot Size: ${e.lotSize||"N/A"}

Style: ${t[s]||t.standard}

Write a 150-200 word description that:
1. Highlights the property's best features
2. Mentions the HUD opportunity and potential savings
3. Describes the location and neighborhood
4. Creates urgency and excitement
5. Includes a call to action

Make it engaging and persuasive while remaining factual and professional.`;try{const a=f();if(!a)return{success:!1,error:"OpenAI API key not configured"};const m=await a.chat.completions.create({model:"gpt-4.1-mini",messages:[{role:"system",content:"You are a professional real estate copywriter specializing in HUD homes. You write compelling, accurate property descriptions that convert browsers into buyers."},{role:"user",content:c}],temperature:.7,max_tokens:400});return{success:!0,content:m.choices[0].message.content,style:s,usage:m.usage}}catch(a){return console.error("OpenAI API error:",a),{success:!1,error:a.message}}},async generateSEO(e){var t;const s=`Generate SEO-optimized content for this HUD home property:

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

Format as JSON.`;try{const c=f();if(!c)return{success:!1,error:"OpenAI API key not configured"};const o=await c.chat.completions.create({model:"gpt-4.1-mini",messages:[{role:"system",content:"You are an SEO expert specializing in real estate. You create optimized content that ranks well in search engines while remaining natural and user-friendly."},{role:"user",content:s}],temperature:.5,max_tokens:500}),l=o.choices[0].message.content;try{return{success:!0,data:JSON.parse(l),usage:o.usage}}catch{return{success:!0,content:l,usage:o.usage}}}catch(c){return console.error("OpenAI API error:",c),{success:!1,error:c.message}}},async chat(e,s,t=null){var o,l;const c=`You are a professional real estate marketing assistant specializing in HUD homes and government foreclosures. You help agents and brokers create effective marketing content, answer questions about property marketing strategies, and provide expert advice.

Current Property Context:
- Address: ${e.address}, ${e.city}, ${e.state}
- Case Number: ${e.case_number}
- Price: $${(o=e.price)==null?void 0:o.toLocaleString()}
- Bedrooms: ${e.bedrooms||"N/A"}
- Bathrooms: ${e.bathrooms||"N/A"}
- Square Feet: ${((l=e.sqft)==null?void 0:l.toLocaleString())||"N/A"}
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

Be helpful, professional, and provide actionable advice.`;try{const a=f();if(!a)return{success:!1,error:"OpenAI API key not configured"};const m=await a.chat.completions.create({model:"gpt-4.1-mini",messages:[{role:"system",content:c},...s],temperature:.7,max_tokens:800});return{success:!0,message:m.choices[0].message,usage:m.usage}}catch(a){return console.error("OpenAI API error:",a),{success:!1,error:a.message}}},async generateCampaign(e,s="comprehensive"){var c;const t=`Create a ${s} marketing campaign for this HUD home:

Property: ${e.address}, ${e.city}, ${e.state}
Price: $${(c=e.price)==null?void 0:c.toLocaleString()}
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

Make it actionable and ready to implement.`;try{const o=f();if(!o)return{success:!1,error:"OpenAI API key not configured"};const l=await o.chat.completions.create({model:"gpt-4.1-mini",messages:[{role:"system",content:"You are a marketing strategist specializing in real estate campaigns. You create comprehensive, multi-channel marketing plans that drive results."},{role:"user",content:t}],temperature:.7,max_tokens:1200});return{success:!0,content:l.choices[0].message.content,campaignType:s,usage:l.usage}}catch(o){return console.error("OpenAI API error:",o),{success:!1,error:o.message}}}};function te({property:e}){const[s,t]=g.useState([{role:"assistant",content:`Hi! I'm your AI marketing assistant. I can help you create compelling marketing content for ${e.address}. What would you like to create today?`}]),[c,o]=g.useState(""),[l,a]=g.useState(!1),[m,p]=g.useState(null),[u,b]=g.useState(null),[M,x]=g.useState(!0),k=g.useRef(null);g.useEffect(()=>{async function i(){x(!0);const r=await h.getCustomerContext(e);b(r),x(!1),r.success&&r.insights&&r.insights.totalInterested>0&&t([{role:"assistant",content:`Hi! I'm your AI marketing assistant. I can help you create compelling marketing content for ${e.address}.

📊 **Customer Interest**: ${r.insights.totalInterested} people have shown interest in this property! I can use this data to create personalized, targeted marketing content. What would you like to create today?`}])}i()},[e]);const v=()=>{var i;(i=k.current)==null||i.scrollIntoView({behavior:"smooth"})};g.useEffect(()=>{v()},[s]);const w=async()=>{if(!c.trim()||l)return;const i={role:"user",content:c};t(r=>[...r,i]),o(""),a(!0);try{const r=await h.chat(e,[...s,i],u);r.success?t(d=>[...d,r.message]):t(d=>[...d,{role:"assistant",content:`Sorry, I encountered an error: ${r.error}. Please try again.`}])}catch{t(d=>[...d,{role:"assistant",content:"Sorry, something went wrong. Please try again."}])}finally{a(!1)}},A=async i=>{a(!0);let r;try{switch(i){case"facebook":r=await h.generateSocialPost(e,"facebook",u);break;case"twitter":r=await h.generateSocialPost(e,"twitter",u);break;case"linkedin":r=await h.generateSocialPost(e,"linkedin",u);break;case"email":r=await h.generateSocialPost(e,"email",u);break;case"description":r=await h.generateDescription(e,"standard");break;case"seo":r=await h.generateSEO(e);break;case"campaign":r=await h.generateCampaign(e,"comprehensive");break;default:return}if(r.success){const d=r.content||JSON.stringify(r.data,null,2);t(y=>[...y,{role:"assistant",content:d}])}else t(d=>[...d,{role:"assistant",content:`Error: ${r.error}`}])}catch{t(y=>[...y,{role:"assistant",content:"Sorry, something went wrong. Please try again."}])}finally{a(!1)}},S=(i,r)=>{navigator.clipboard.writeText(i),p(r),setTimeout(()=>p(null),2e3)},I=[{id:"facebook",icon:j,label:"Facebook Post",color:"bg-blue-600 hover:bg-blue-700"},{id:"twitter",icon:F,label:"Twitter Post",color:"bg-sky-500 hover:bg-sky-600"},{id:"linkedin",icon:_,label:"LinkedIn Post",color:"bg-blue-700 hover:bg-blue-800"},{id:"email",icon:P,label:"Email Content",color:"bg-gray-600 hover:bg-gray-700"},{id:"description",icon:O,label:"Description",color:"bg-green-600 hover:bg-green-700"},{id:"seo",icon:L,label:"SEO Content",color:"bg-purple-600 hover:bg-purple-700"},{id:"campaign",icon:T,label:"Full Campaign",color:"bg-orange-600 hover:bg-orange-700"}];return n.jsxs("div",{className:"bg-white rounded-lg shadow-sm border border-gray-200 h-[600px] flex flex-col",children:[n.jsxs("div",{className:"p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50",children:[n.jsxs("div",{className:"flex items-center gap-2",children:[n.jsx(E,{className:"h-5 w-5 text-blue-600"}),n.jsx("h3",{className:"text-lg font-semibold text-gray-900",children:"AI Marketing Assistant"})]}),n.jsx("p",{className:"text-sm text-gray-600 mt-1",children:"Generate marketing content, get strategy advice, and optimize your listings"})]}),n.jsxs("div",{className:"p-4 border-b border-gray-200 bg-gray-50",children:[n.jsx("p",{className:"text-xs font-medium text-gray-700 mb-2",children:"Quick Actions:"}),n.jsx("div",{className:"flex flex-wrap gap-2",children:I.map(i=>n.jsxs("button",{onClick:()=>A(i.id),disabled:l,className:`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-medium transition-colors ${i.color} disabled:opacity-50 disabled:cursor-not-allowed`,children:[n.jsx(i.icon,{className:"h-3.5 w-3.5"}),i.label]},i.id))})]}),n.jsxs("div",{className:"flex-1 overflow-y-auto p-4 space-y-4",children:[s.map((i,r)=>n.jsx("div",{className:`flex ${i.role==="user"?"justify-end":"justify-start"}`,children:n.jsxs("div",{className:`max-w-[80%] rounded-lg p-3 ${i.role==="user"?"bg-blue-600 text-white":"bg-gray-100 text-gray-900"}`,children:[n.jsx("div",{className:"whitespace-pre-wrap break-words",children:i.content}),i.role==="assistant"&&n.jsx("button",{onClick:()=>S(i.content,r),className:"mt-2 inline-flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900",children:m===r?n.jsxs(n.Fragment,{children:[n.jsx(q,{className:"h-3 w-3"}),"Copied!"]}):n.jsxs(n.Fragment,{children:[n.jsx(H,{className:"h-3 w-3"}),"Copy"]})})]})},r)),l&&n.jsx("div",{className:"flex justify-start",children:n.jsx("div",{className:"bg-gray-100 rounded-lg p-3",children:n.jsx($,{className:"h-5 w-5 text-gray-600 animate-spin"})})}),n.jsx("div",{ref:k})]}),n.jsxs("div",{className:"p-4 border-t border-gray-200",children:[n.jsxs("div",{className:"flex gap-2",children:[n.jsx("input",{type:"text",value:c,onChange:i=>o(i.target.value),onKeyPress:i=>i.key==="Enter"&&w(),placeholder:"Ask me to create marketing content, give advice, or answer questions...",disabled:l,className:"flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"}),n.jsx("button",{onClick:w,disabled:l||!c.trim(),className:"px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors",children:l?n.jsx($,{className:"h-5 w-5 animate-spin"}):n.jsx(D,{className:"h-5 w-5"})})]}),n.jsx("p",{className:"text-xs text-gray-500 mt-2",children:'💡 Tip: Try asking "Create a Facebook post" or "Generate a property description"'})]})]})}export{te as default};
