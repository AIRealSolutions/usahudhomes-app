const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/eventService-G-_F_oKk.js","assets/index-DPGjmwI3.js","assets/vendor-radix-BVNr7fM0.js","assets/vendor-react-DHVckhZd.js","assets/vendor-supabase-Bf3wVh6X.js","assets/vendor-charts-DkQUE1KZ.js","assets/index-CcUIY4Yv.css"])))=>i.map(i=>d[i]);
import{c as N}from"./vendor-supabase-Bf3wVh6X.js";import{j as a}from"./vendor-radix-BVNr7fM0.js";import{r as u}from"./vendor-react-DHVckhZd.js";import{u as T,M as H,X as I,S as E,j as P,c as B}from"./index-DPGjmwI3.js";import{S as k}from"./sparkles-Sk7rvjle.js";import"./vendor-charts-DkQUE1KZ.js";const M=({consultation:t,customer:i,property:e,onSend:w,onCancel:g})=>{const{profile:s,user:b}=T(),x=String((s==null?void 0:s.name)||"").trim().split(/\s+/).filter(Boolean),n={first:(s==null?void 0:s.first_name)||x[0]||"your agent",full:[s==null?void 0:s.first_name,s==null?void 0:s.last_name].filter(Boolean).join(" ")||x.join(" ")||"your agent",phone:(s==null?void 0:s.phone)||"",email:(s==null?void 0:s.email)||(b==null?void 0:b.email)||""};e={...e||{},case_number:(e==null?void 0:e.case_number)||(t==null?void 0:t.case_number)||(t==null?void 0:t.property_case_number)||"",address:(e==null?void 0:e.address)||(t==null?void 0:t.property_address)||""},i={...i||{},first_name:(i==null?void 0:i.first_name)||String((i==null?void 0:i.name)||(t==null?void 0:t.customer_name)||"").split(" ")[0]||"there"};const[o,f]=u.useState(""),[d,_]=u.useState(""),[$,p]=u.useState(""),[c,y]=u.useState(!1),j=[{id:"initial_contact",name:"Initial Contact",subject:`Re: Your Interest in ${e.case_number||"HUD Property"}`,body:`Hi ${i.first_name},

Thank you for your interest in the HUD property${e.case_number?` (Case #${e.case_number})`:""}${e.address?` located at ${e.address}`:""}.

I'm ${n.full}, a licensed real estate broker specializing in HUD homes in ${e.state||"your area"}. I'd be happy to help you with this property and answer any questions you may have.

Here's what I can help you with:
• Property showing and inspection
• Financing options and pre-approval guidance
• Bid preparation and submission
• Closing process assistance

${e.list_price?`The current list price is $${e.list_price.toLocaleString()}.`:""} ${e.bid_open_date?`Bids are open until ${new Date(e.bid_open_date).toLocaleDateString()}.`:""}

When would be a good time for a call to discuss your interest and next steps? I'm available [your availability here].

Best regards,
${n.full}
${n.phone}
${n.email}`},{id:"property_info",name:"Property Information",subject:`Property Details - ${e.case_number||"HUD Home"}`,body:`Hi ${i.first_name},

Here are the details for the HUD property you inquired about:

PROPERTY DETAILS:
${e.case_number?`• Case Number: ${e.case_number}`:""}
${e.address?`• Address: ${[e.address,e.city,[e.state,e.zip].filter(Boolean).join(" ")].filter(Boolean).join(", ")}`:""}
${e.list_price?`• List Price: $${e.list_price.toLocaleString()}`:""}
${e.bedrooms?`• Bedrooms: ${e.bedrooms}`:""}
${e.bathrooms?`• Bathrooms: ${e.bathrooms}`:""}
${e.sq_ft?`• Square Feet: ${e.sq_ft.toLocaleString()}`:""}
${e.year_built?`• Year Built: ${e.year_built}`:""}

${e.bid_open_date?`BID DEADLINE: ${new Date(e.bid_open_date).toLocaleDateString()}`:""}

This is a great opportunity! HUD homes are sold "as-is" but often represent excellent value. I can help you:
1. Schedule a showing
2. Arrange for a home inspection
3. Get pre-approved for financing
4. Submit a competitive bid

Would you like to schedule a showing or discuss your financing options?

Best regards,
${n.full}
${n.phone}
${n.email}`},{id:"follow_up",name:"Follow-Up",subject:`Following Up - ${e.case_number||"HUD Property"}`,body:`Hi ${i.first_name},

I wanted to follow up on your interest in the HUD property${e.case_number?` (Case #${e.case_number})`:""}. 

Have you had a chance to think about next steps? I'm here to help answer any questions you might have about:
• The property condition and features
• Financing options
• The bidding process
• Timeline and closing

${e.bid_open_date?`Please note that bids close on ${new Date(e.bid_open_date).toLocaleDateString()}, so we should move quickly if you're interested.`:""}

Let me know how I can help!

Best regards,
${n.full}
${n.phone}
${n.email}`},{id:"showing_scheduled",name:"Showing Scheduled",subject:`Property Showing Confirmed - ${e.case_number||"HUD Home"}`,body:`Hi ${i.first_name},

Great news! I've scheduled a showing for the HUD property${e.case_number?` (Case #${e.case_number})`:""}.

SHOWING DETAILS:
• Date: [Date]
• Time: [Time]
• Location: ${e.address||"[Property Address]"}
• Meet at: [Meeting Location]

WHAT TO BRING:
• Photo ID
• Questions about the property
• Measuring tape (if desired)
• Camera/phone for photos

WHAT TO EXPECT:
• Property is sold "as-is"
• We'll have about 30-45 minutes
• I'll explain the bidding process
• We can discuss financing options

Please let me know if you need to reschedule or have any questions before the showing.

Looking forward to showing you the property!

Best regards,
${n.full}
${n.phone}
${n.email}`},{id:"bid_preparation",name:"Bid Preparation",subject:`Ready to Submit Your Bid - ${e.case_number||"HUD Property"}`,body:`Hi ${i.first_name},

I'm ready to help you submit a competitive bid for the HUD property${e.case_number?` (Case #${e.case_number})`:""}.

TO SUBMIT A BID, I NEED:
1. Pre-approval letter from your lender
2. Earnest money deposit (typically 1-2% of bid amount)
3. Your maximum bid amount
4. Signed purchase agreement

${e.bid_open_date?`IMPORTANT: Bids must be submitted by ${new Date(e.bid_open_date).toLocaleDateString()}.`:""}

BIDDING STRATEGY:
${e.list_price?`• List price: $${e.list_price.toLocaleString()}`:""}
• HUD accepts bids at, above, or below list price
• Multiple bids are common
• Highest qualified bid typically wins

Let's schedule a time to finalize your bid. The sooner we submit, the better!

Best regards,
${n.full}
${n.phone}
${n.email}`}],v=r=>{const l=j.find(m=>m.id===r);l&&(f(l.subject),_(l.body),p(r))},S=async r=>{if(r.preventDefault(),!o.trim()||!d.trim()){alert("Please enter a subject and message");return}y(!0);try{const l=await P({to:i.email,subject:o,body:d});if(!l.success){alert("Email not sent: "+(l.error||"Unknown error"));return}const m=await B.logCommunication(t.id,s.id,"email_sent",{to:i.email,subject:o,body:d,template:$||"custom"});if(m.success){if(t.customer_id){const{eventService:D}=await N(async()=>{const{eventService:h}=await import("./eventService-G-_F_oKk.js");return{eventService:h}},__vite__mapDeps([0,1,2,3,4,5,6]));D.logEmailSent(t.customer_id,t.id,s.id,{to:i.email,subject:o,body:d}).catch(h=>console.error("Failed to log email event:",h))}}else console.error("Email sent but not logged:",m.error);alert(`Email sent to ${i.email}`),w()}catch(l){console.error("Error sending email:",l),alert("Failed to send email. Please try again.")}finally{y(!1)}};return a.jsx("div",{className:"fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4",children:a.jsxs("div",{className:"bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto",children:[a.jsxs("div",{className:"sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between",children:[a.jsxs("div",{className:"flex items-center gap-3",children:[a.jsx("div",{className:"w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center",children:a.jsx(H,{className:"w-6 h-6 text-blue-600"})}),a.jsxs("div",{children:[a.jsx("h2",{className:"text-xl font-bold text-gray-900",children:"Send Email"}),a.jsxs("p",{className:"text-sm text-gray-600",children:["To: ",i.email]})]})]}),a.jsx("button",{onClick:g,disabled:c,className:"text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50",children:a.jsx(I,{className:"w-6 h-6"})})]}),a.jsxs("form",{onSubmit:S,children:[a.jsxs("div",{className:"px-6 py-6 space-y-6",children:[a.jsxs("div",{children:[a.jsxs("label",{className:"block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2",children:[a.jsx(k,{className:"w-4 h-4"}),"Quick Templates"]}),a.jsxs("select",{value:$,onChange:r=>v(r.target.value),className:"w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent",children:[a.jsx("option",{value:"",children:"Select a template..."}),j.map(r=>a.jsx("option",{value:r.id,children:r.name},r.id))]})]}),a.jsxs("div",{children:[a.jsxs("label",{className:"block text-sm font-medium text-gray-700 mb-2",children:["Subject ",a.jsx("span",{className:"text-red-600",children:"*"})]}),a.jsx("input",{type:"text",value:o,onChange:r=>f(r.target.value),placeholder:"Email subject...",required:!0,className:"w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"})]}),a.jsxs("div",{children:[a.jsxs("label",{className:"block text-sm font-medium text-gray-700 mb-2",children:["Message ",a.jsx("span",{className:"text-red-600",children:"*"})]}),a.jsx("textarea",{value:d,onChange:r=>_(r.target.value),placeholder:"Type your message...",required:!0,rows:16,className:"w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-mono text-sm"}),a.jsx("p",{className:"text-xs text-gray-500 mt-1",children:"Tip: Personalize the template before sending"})]}),a.jsx("div",{className:"bg-blue-50 border border-blue-200 rounded-lg p-4",children:a.jsxs("p",{className:"text-sm text-blue-800",children:[a.jsx("strong",{children:"Note:"})," This will open your default email client. The email will be tracked in your activity log."]})})]}),a.jsxs("div",{className:"sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex flex-col-reverse sm:flex-row gap-3 sm:justify-end",children:[a.jsx("button",{type:"button",onClick:g,disabled:c,className:"px-6 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed",children:"Cancel"}),a.jsx("button",{type:"submit",disabled:c||!o.trim()||!d.trim(),className:"px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2",children:c?a.jsxs(a.Fragment,{children:[a.jsx("div",{className:"w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"}),a.jsx("span",{children:"Sending..."})]}):a.jsxs(a.Fragment,{children:[a.jsx(E,{className:"w-5 h-5"}),a.jsx("span",{children:"Send Email"})]})})]})]})]})})};export{M as default};
