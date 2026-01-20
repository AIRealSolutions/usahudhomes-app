import{s as n}from"./index-CIDKC3gD.js";class d{constructor(){this.emailEndpoint="/api/send-email",this.defaultRecipient="marcspencer28461@gmail.com"}async sendNewCustomerNotification(e){const t={to:this.defaultRecipient,subject:`🏠 New Customer Registration - ${e.name}`,html:this.generateCustomerEmailHTML(e),text:this.generateCustomerEmailText(e)};return this.sendEmail(t)}async sendConsultationNotification(e){const t=this.calculatePriority(e),i=t==="high"?"🚨":t==="medium"?"⚡":"📋",o={to:this.defaultRecipient,subject:`${i} New Consultation Request - ${e.name} (${t.toUpperCase()} Priority)`,html:this.generateConsultationEmailHTML(e,t),text:this.generateConsultationEmailText(e,t)};return this.sendEmail(o)}async sendLeadNotification(e){const t={to:this.defaultRecipient,subject:`🎯 New Lead Captured - ${e.name}`,html:this.generateLeadEmailHTML(e),text:this.generateLeadEmailText(e)};return this.sendEmail(t)}calculatePriority(e){return e.propertyId&&e.propertyId.includes("PRICE REDUCED")||e.consultationType==="bidding"||e.consultationType==="urgent"?"high":e.consultationType==="financing"||e.consultationType==="203k"?"medium":"normal"}generateCustomerEmailHTML(e){return`
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>New Customer Registration</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
        .content { background: #f8fafc; padding: 20px; }
        .info-box { background: white; padding: 15px; margin: 10px 0; border-left: 4px solid #2563eb; }
        .urgent { background: #fef2f2; border-left-color: #dc2626; }
        .footer { background: #1e293b; color: white; padding: 15px; text-align: center; }
        .button { background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏠 USAhudHomes.com</h1>
            <h2>New Customer Registration</h2>
        </div>
        
        <div class="content">
            <div class="info-box urgent">
                <h3>⏰ Action Required - Follow up within 2 hours</h3>
                <p>A new customer has registered on USAhudHomes.com and is expecting your response within 2 hours as promised on the website.</p>
            </div>
            
            <div class="info-box">
                <h3>👤 Customer Information</h3>
                <p><strong>Name:</strong> ${e.name}</p>
                <p><strong>Email:</strong> <a href="mailto:${e.email}">${e.email}</a></p>
                <p><strong>Phone:</strong> <a href="tel:${e.phone}">${e.phone}</a></p>
                <p><strong>State of Interest:</strong> ${e.state||"Not specified"}</p>
                <p><strong>Property Interest:</strong> ${e.propertyId||"General inquiry"}</p>
                <p><strong>Registration Date:</strong> ${new Date(e.createdAt||Date.now()).toLocaleString()}</p>
                <p><strong>Customer ID:</strong> ${e.id}</p>
            </div>
            
            <div class="info-box">
                <h3>📞 Recommended Next Steps</h3>
                <ul>
                    <li>Call the customer within 2 hours</li>
                    <li>Send a welcome email with your contact information</li>
                    <li>Schedule a consultation if they're interested in a specific property</li>
                    <li>Add them to your CRM system</li>
                </ul>
            </div>
            
            <div style="text-align: center; margin: 20px 0;">
                <a href="tel:${e.phone}" class="button">📞 Call Customer Now</a>
            </div>
        </div>
        
        <div class="footer">
            <p>USAhudHomes.com Customer Management System</p>
            <p>Lightkeeper Realty - Registered HUD Buyer's Agency</p>
            <p>Marc Spencer: (910) 363-6147</p>
        </div>
    </div>
</body>
</html>
    `}generateCustomerEmailText(e){return`
🏠 USAhudHomes.com - New Customer Registration

⏰ ACTION REQUIRED - Follow up within 2 hours

A new customer has registered on USAhudHomes.com:

👤 Customer Details:
- Name: ${e.name}
- Email: ${e.email}
- Phone: ${e.phone}
- State of Interest: ${e.state||"Not specified"}
- Property Interest: ${e.propertyId||"General inquiry"}
- Registration Date: ${new Date(e.createdAt||Date.now()).toLocaleString()}
- Customer ID: ${e.id}

📞 Recommended Next Steps:
1. Call the customer within 2 hours
2. Send a welcome email with your contact information
3. Schedule a consultation if they're interested in a specific property
4. Add them to your CRM system

Please follow up immediately as promised on the website.

Best regards,
USAhudHomes.com System
Lightkeeper Realty - Registered HUD Buyer's Agency
Marc Spencer: (910) 363-6147
    `}generateConsultationEmailHTML(e,t){const i=t==="high"?"#dc2626":t==="medium"?"#f59e0b":"#2563eb",o=t==="high"?"URGENT - Respond immediately!":"Please respond within 2 hours";return`
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>New Consultation Request</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: ${i}; color: white; padding: 20px; text-align: center; }
        .content { background: #f8fafc; padding: 20px; }
        .info-box { background: white; padding: 15px; margin: 10px 0; border-left: 4px solid: ${i}; }
        .urgent { background: #fef2f2; border-left-color: #dc2626; }
        .footer { background: #1e293b; color: white; padding: 15px; text-align: center; }
        .button { background: ${i}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; }
        .priority { background: ${i}; color: white; padding: 8px 16px; border-radius: 20px; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏠 USAhudHomes.com</h1>
            <h2>New Consultation Request</h2>
            <span class="priority">${t.toUpperCase()} PRIORITY</span>
        </div>
        
        <div class="content">
            <div class="info-box urgent">
                <h3>⏰ ${o}</h3>
                <p>A new consultation request has been submitted with ${t} priority.</p>
            </div>
            
            <div class="info-box">
                <h3>👤 Client Information</h3>
                <p><strong>Name:</strong> ${e.name}</p>
                <p><strong>Email:</strong> <a href="mailto:${e.email}">${e.email}</a></p>
                <p><strong>Phone:</strong> <a href="tel:${e.phone}">${e.phone}</a></p>
                <p><strong>Consultation Type:</strong> ${e.consultationType}</p>
                <p><strong>Property:</strong> ${e.propertyId||"General consultation"}</p>
                <p><strong>Priority:</strong> <span style="color: ${i}; font-weight: bold;">${t.toUpperCase()}</span></p>
                <p><strong>Request Date:</strong> ${new Date(e.createdAt||Date.now()).toLocaleString()}</p>
                <p><strong>Consultation ID:</strong> ${e.id}</p>
            </div>
            
            ${e.message?`
            <div class="info-box">
                <h3>💬 Client Message</h3>
                <p>"${e.message}"</p>
            </div>
            `:""}
            
            <div style="text-align: center; margin: 20px 0;">
                <a href="tel:${e.phone}" class="button">📞 Call Client Now</a>
            </div>
        </div>
        
        <div class="footer">
            <p>USAhudHomes.com Consultation System</p>
            <p>Lightkeeper Realty - Registered HUD Buyer's Agency</p>
            <p>Marc Spencer: (910) 363-6147</p>
        </div>
    </div>
</body>
</html>
    `}generateConsultationEmailText(e,t){return`
🏠 USAhudHomes.com - New Consultation Request

⏰ ${t==="high"?"URGENT - Respond immediately!":"Please respond within 2 hours"}

New consultation request received with ${t.toUpperCase()} priority:

👤 Client Details:
- Name: ${e.name}
- Email: ${e.email}
- Phone: ${e.phone}
- Consultation Type: ${e.consultationType}
- Property: ${e.propertyId||"General consultation"}
- Priority: ${t.toUpperCase()}
- Request Date: ${new Date(e.createdAt||Date.now()).toLocaleString()}
- Consultation ID: ${e.id}

${e.message?`💬 Client Message: "${e.message}"`:""}

${t==="high"?"🚨 HIGH PRIORITY - Please respond immediately!":"Please respond within 2 hours as promised."}

Best regards,
USAhudHomes.com System
Lightkeeper Realty - Registered HUD Buyer's Agency
Marc Spencer: (910) 363-6147
    `}generateLeadEmailHTML(e){return`
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>New Lead Captured</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #059669; color: white; padding: 20px; text-align: center; }
        .content { background: #f8fafc; padding: 20px; }
        .info-box { background: white; padding: 15px; margin: 10px 0; border-left: 4px solid #059669; }
        .footer { background: #1e293b; color: white; padding: 15px; text-align: center; }
        .button { background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏠 USAhudHomes.com</h1>
            <h2>New Lead Captured</h2>
        </div>
        
        <div class="content">
            <div class="info-box">
                <h3>🎯 Lead Information</h3>
                <p><strong>Name:</strong> ${e.name}</p>
                <p><strong>Email:</strong> <a href="mailto:${e.email}">${e.email}</a></p>
                <p><strong>Phone:</strong> <a href="tel:${e.phone}">${e.phone}</a></p>
                <p><strong>State of Interest:</strong> ${e.state}</p>
                <p><strong>Property Case #:</strong> ${e.propertyCase||"Not specified"}</p>
                <p><strong>Lead Date:</strong> ${new Date(e.createdAt||Date.now()).toLocaleString()}</p>
                <p><strong>Lead ID:</strong> ${e.id}</p>
            </div>
            
            <div style="text-align: center; margin: 20px 0;">
                <a href="tel:${e.phone}" class="button">📞 Call Lead Now</a>
            </div>
        </div>
        
        <div class="footer">
            <p>USAhudHomes.com Lead Management System</p>
            <p>Lightkeeper Realty - Registered HUD Buyer's Agency</p>
            <p>Marc Spencer: (910) 363-6147</p>
        </div>
    </div>
</body>
</html>
    `}generateLeadEmailText(e){return`
🏠 USAhudHomes.com - New Lead Captured

🎯 Lead Details:
- Name: ${e.name}
- Email: ${e.email}
- Phone: ${e.phone}
- State of Interest: ${e.state}
- Property Case #: ${e.propertyCase||"Not specified"}
- Lead Date: ${new Date(e.createdAt||Date.now()).toLocaleString()}
- Lead ID: ${e.id}

Please follow up within 2 hours as promised.

Best regards,
USAhudHomes.com System
Lightkeeper Realty - Registered HUD Buyer's Agency
Marc Spencer: (910) 363-6147
    `}async sendEmail(e){try{console.log("📧 Sending email:",{to:e.to,subject:e.subject}),this.logEmail(e);const i=await(await fetch("/api/send-agent-email",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({type:e.type||"notification",to:e.to,subject:e.subject,html:e.html,text:e.text})})).json();if(!i.success)throw new Error(i.error||"Failed to send email");return console.log("✅ Email sent successfully:",i.messageId),{success:!0,messageId:i.messageId}}catch(t){return console.error("❌ Email sending failed:",t),{success:!1,error:t.message}}}logEmail(e){const t=JSON.parse(localStorage.getItem("usahud_emails")||"[]");t.push({...e,sentAt:new Date().toISOString(),id:"email_"+Date.now()+"_"+Math.random().toString(36).substr(2,9)}),localStorage.setItem("usahud_emails",JSON.stringify(t))}getEmailLogs(){return JSON.parse(localStorage.getItem("usahud_emails")||"[]").sort((e,t)=>new Date(t.sentAt)-new Date(e.sentAt))}async sendAgentVerificationEmail(e,t){const i=`${window.location.origin}/agent/verify-email?token=${t}`,o={type:"verification",to:e.email,subject:"✅ Verify Your Email - USA HUD Homes Agent Application",html:this.generateAgentVerificationEmailHTML(e,i),text:this.generateAgentVerificationEmailText(e,i)};return this.sendEmail(o)}async resendAgentVerificationEmail(e,t){return this.sendAgentVerificationEmail(e,t)}async sendAgentApprovalEmail(e,t){const i={type:"approval",to:e.email,subject:"🎉 Congratulations! Your Agent Application Has Been Approved",html:this.generateAgentApprovalEmailHTML(e,t),text:this.generateAgentApprovalEmailText(e,t)};return this.sendEmail(i)}async sendAgentRejectionEmail(e,t){const i={type:"rejection",to:e.email,subject:"Update on Your Agent Application - USA HUD Homes",html:this.generateAgentRejectionEmailHTML(e,t),text:this.generateAgentRejectionEmailText(e,t)};return this.sendEmail(i)}generateAgentVerificationEmailHTML(e,t){return`
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Verify Your Email</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2563eb; color: white; padding: 30px 20px; text-align: center; }
        .content { background: #f8fafc; padding: 30px 20px; }
        .info-box { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #2563eb; }
        .button { background: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; }
        .footer { background: #1e293b; color: white; padding: 20px; text-align: center; }
        .warning { background: #fef3c7; border-left-color: #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏠 USA HUD Homes</h1>
            <h2>Verify Your Email Address</h2>
        </div>
        
        <div class="content">
            <div class="info-box">
                <h3>Hi ${e.first_name},</h3>
                <p>Thank you for applying to become a USA HUD Homes partner agent!</p>
                <p>To complete your application, please verify your email address by clicking the button below:</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="${t}" class="button">✅ Verify Email Address</a>
            </div>
            
            <div class="warning">
                <p><strong>⏰ Important:</strong> This verification link will expire in 24 hours.</p>
            </div>
            
            <div class="info-box">
                <h3>📋 What Happens Next?</h3>
                <ol>
                    <li>Click the verification button above</li>
                    <li>Your application will move to "Under Review"</li>
                    <li>Our team will review your application within 1-2 business days</li>
                    <li>You'll receive an email with the decision</li>
                </ol>
            </div>
            
            <div class="info-box">
                <h3>🔗 Can't Click the Button?</h3>
                <p>Copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #2563eb;">${t}</p>
            </div>
        </div>
        
        <div class="footer">
            <p>USA HUD Homes - Agent Partnership Program</p>
            <p>Lightkeeper Realty - Registered HUD Buyer's Agency</p>
            <p>Marc Spencer: (910) 363-6147</p>
            <p style="font-size: 12px; margin-top: 15px; color: #94a3b8;">If you didn't apply to become an agent, please ignore this email.</p>
        </div>
    </div>
</body>
</html>
    `}generateAgentVerificationEmailText(e,t){return`
🏠 USA HUD Homes - Verify Your Email Address

Hi ${e.first_name},

Thank you for applying to become a USA HUD Homes partner agent!

To complete your application, please verify your email address by visiting:
${t}

⏰ Important: This verification link will expire in 24 hours.

📋 What Happens Next?
1. Click the verification link above
2. Your application will move to "Under Review"
3. Our team will review your application within 1-2 business days
4. You'll receive an email with the decision

If you didn't apply to become an agent, please ignore this email.

Best regards,
USA HUD Homes Team
Lightkeeper Realty - Registered HUD Buyer's Agency
Marc Spencer: (910) 363-6147
    `}generateAgentApprovalEmailHTML(e,t){var i,o;return`
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Application Approved!</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #10b981; color: white; padding: 30px 20px; text-align: center; }
        .content { background: #f8fafc; padding: 30px 20px; }
        .info-box { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #10b981; }
        .success-box { background: #d1fae5; border-left-color: #10b981; padding: 20px; margin: 20px 0; border-radius: 8px; }
        .button { background: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; }
        .credentials { background: #1e293b; color: white; padding: 15px; border-radius: 6px; font-family: monospace; }
        .footer { background: #1e293b; color: white; padding: 20px; text-align: center; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 Congratulations!</h1>
            <h2>Your Application Has Been Approved</h2>
        </div>
        
        <div class="content">
            <div class="success-box">
                <h3>✅ Welcome to USA HUD Homes, ${e.first_name}!</h3>
                <p>We're excited to have you join our network of professional real estate agents specializing in HUD homes.</p>
            </div>
            
            <div class="info-box">
                <h3>🔑 Your Login Credentials</h3>
                <div class="credentials">
                    <p><strong>Email:</strong> ${e.email}</p>
                    <p><strong>Password:</strong> ${(t==null?void 0:t.temporaryPassword)||"Check your email"}</p>
                </div>
                <p style="margin-top: 15px;"><strong>⚠️ Important:</strong> Please change your password after your first login.</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="${window.location.origin}/broker-dashboard" class="button">🚀 Access Your Dashboard</a>
            </div>
            
            <div class="info-box">
                <h3>📋 Next Steps</h3>
                <ol>
                    <li><strong>Log in</strong> to your broker dashboard</li>
                    <li><strong>Complete your profile</strong> with additional details</li>
                    <li><strong>Review your referral agreement</strong> (25% referral fee)</li>
                    <li><strong>Start receiving leads</strong> in your covered states</li>
                </ol>
            </div>
            
            <div class="info-box">
                <h3>💼 Your Coverage</h3>
                <p><strong>States:</strong> ${((i=e.states_covered)==null?void 0:i.join(", "))||"Not specified"}</p>
                <p><strong>Specialties:</strong> ${((o=e.specialties)==null?void 0:o.join(", "))||"Not specified"}</p>
                <p><strong>Referral Fee:</strong> ${e.referral_fee_percentage||25}%</p>
            </div>
            
            <div class="info-box">
                <h3>📞 Need Help?</h3>
                <p>If you have any questions or need assistance getting started, please contact:</p>
                <p><strong>Marc Spencer</strong><br>
                Phone: (910) 363-6147<br>
                Email: marcspencer28461@gmail.com</p>
            </div>
        </div>
        
        <div class="footer">
            <p>USA HUD Homes - Agent Partnership Program</p>
            <p>Lightkeeper Realty - Registered HUD Buyer's Agency</p>
            <p>Marc Spencer: (910) 363-6147</p>
        </div>
    </div>
</body>
</html>
    `}generateAgentApprovalEmailText(e,t){var i,o;return`
🎉 Congratulations! Your Application Has Been Approved

✅ Welcome to USA HUD Homes, ${e.first_name}!

We're excited to have you join our network of professional real estate agents specializing in HUD homes.

🔑 Your Login Credentials:
Email: ${e.email}
Password: ${(t==null?void 0:t.temporaryPassword)||"Check your email"}

⚠️ Important: Please change your password after your first login.

📋 Next Steps:
1. Log in to your broker dashboard at: ${window.location.origin}/broker-dashboard
2. Complete your profile with additional details
3. Review your referral agreement (25% referral fee)
4. Start receiving leads in your covered states

💼 Your Coverage:
States: ${((i=e.states_covered)==null?void 0:i.join(", "))||"Not specified"}
Specialties: ${((o=e.specialties)==null?void 0:o.join(", "))||"Not specified"}
Referral Fee: ${e.referral_fee_percentage||25}%

📞 Need Help?
If you have any questions or need assistance getting started, please contact:
Marc Spencer
Phone: (910) 363-6147
Email: marcspencer28461@gmail.com

Best regards,
USA HUD Homes Team
Lightkeeper Realty - Registered HUD Buyer's Agency
    `}generateAgentRejectionEmailHTML(e,t){return`
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Application Update</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #6b7280; color: white; padding: 30px 20px; text-align: center; }
        .content { background: #f8fafc; padding: 30px 20px; }
        .info-box { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #6b7280; }
        .button { background: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; }
        .footer { background: #1e293b; color: white; padding: 20px; text-align: center; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏠 USA HUD Homes</h1>
            <h2>Update on Your Application</h2>
        </div>
        
        <div class="content">
            <div class="info-box">
                <h3>Hi ${e.first_name},</h3>
                <p>Thank you for your interest in becoming a USA HUD Homes partner agent.</p>
                <p>After careful review, we regret to inform you that we are unable to approve your application at this time.</p>
            </div>
            
            ${t?`
            <div class="info-box">
                <h3>📋 Reason</h3>
                <p>${t}</p>
            </div>
            `:""}
            
            <div class="info-box">
                <h3>🔄 Reapply in the Future</h3>
                <p>You're welcome to reapply in the future if your circumstances change or if you'd like to address the concerns mentioned above.</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="${window.location.origin}/agent/register" class="button">Apply Again</a>
            </div>
            
            <div class="info-box">
                <h3>📞 Questions?</h3>
                <p>If you have any questions about this decision, please feel free to contact us:</p>
                <p><strong>Marc Spencer</strong><br>
                Phone: (910) 363-6147<br>
                Email: marcspencer28461@gmail.com</p>
            </div>
        </div>
        
        <div class="footer">
            <p>USA HUD Homes - Agent Partnership Program</p>
            <p>Lightkeeper Realty - Registered HUD Buyer's Agency</p>
            <p>Marc Spencer: (910) 363-6147</p>
        </div>
    </div>
</body>
</html>
    `}generateAgentRejectionEmailText(e,t){return`
🏠 USA HUD Homes - Update on Your Application

Hi ${e.first_name},

Thank you for your interest in becoming a USA HUD Homes partner agent.

After careful review, we regret to inform you that we are unable to approve your application at this time.

${t?`📋 Reason:
${t}
`:""}
🔄 Reapply in the Future:
You're welcome to reapply in the future if your circumstances change or if you'd like to address the concerns mentioned above.

Apply again at: ${window.location.origin}/agent/register

📞 Questions?
If you have any questions about this decision, please feel free to contact us:
Marc Spencer
Phone: (910) 363-6147
Email: marcspencer28461@gmail.com

Best regards,
USA HUD Homes Team
Lightkeeper Realty - Registered HUD Buyer's Agency
    `}async testEmail(){const e={name:"Test Customer",email:"test@example.com",phone:"(555) 123-4567",state:"NC",propertyId:"387-111612",createdAt:new Date().toISOString(),id:"test_"+Date.now()};return this.sendNewCustomerNotification(e)}}const l=new d,p={async submitApplication(r){try{const e=Math.random().toString(36).substring(2)+Date.now().toString(36),t={first_name:r.firstName,last_name:r.lastName,legal_name:r.legalName,email:r.email.toLowerCase(),phone:r.phone,company:r.company||null,license_number:r.licenseNumber,license_state:r.licenseState,years_experience:r.yearsExperience||0,bio:r.bio||null,states_covered:r.statesCovered,specialties:r.specialties,referral_fee_percentage:r.referralFeePercentage||25,agreed_to_terms:r.agreedToTerms,signature:r.signature,signature_date:new Date().toISOString(),terms_agreed_at:new Date().toISOString(),terms_version:"v1.0",email_verification_token:e,email_verified:!1,status:"pending"},{data:i,error:o}=await n.from("agent_applications").insert([t]).select().single();if(o)throw o;return await this.logVerificationAction(i.id,null,"application_submitted","Application submitted by agent"),await this.sendVerificationEmail(i.id,r.email,e,r.firstName),{success:!0,data:{id:i.id,email:i.email,status:i.status}}}catch(e){return console.error("Error submitting application:",e),{success:!1,error:e.message||"Failed to submit application"}}},async sendVerificationEmail(r,e,t,i){try{const{data:o}=await n.from("agent_applications").select("*").eq("id",r).single();if(!o)throw new Error("Application not found");const a=await l.sendAgentVerificationEmail(o,t);return await this.logVerificationAction(r,null,"verification_email_sent",`Verification email sent to ${e}`),a}catch(o){return console.error("Error sending verification email:",o),{success:!1,error:o.message}}},async verifyEmail(r){try{const{data:e,error:t}=await n.from("agent_applications").select("*").eq("email_verification_token",r).eq("email_verified",!1).single();if(t||!e)return{success:!1,error:"Invalid or expired verification token"};const i=new Date(e.created_at);if((new Date-i)/(1e3*60*60)>24)return{success:!1,error:"Verification link has expired. Please request a new one."};const{error:s}=await n.from("agent_applications").update({email_verified:!0,email_verified_at:new Date().toISOString(),email_verification_token:null,status:"under_review"}).eq("id",e.id);if(s)throw s;return await this.logVerificationAction(e.id,null,"email_verified","Email address verified successfully"),await this.notifyAdminsOfNewApplication(e),{success:!0,data:{id:e.id,email:e.email,firstName:e.first_name}}}catch(e){return console.error("Error verifying email:",e),{success:!1,error:e.message||"Failed to verify email"}}},async resendVerificationEmail(r){try{const{data:e,error:t}=await n.from("agent_applications").select("*").eq("email",r.toLowerCase()).eq("email_verified",!1).eq("status","pending").single();if(t||!e)return{success:!1,error:"No pending application found for this email"};const i=Math.random().toString(36).substring(2)+Date.now().toString(36);return await n.from("agent_applications").update({email_verification_token:i}).eq("id",e.id),await this.sendVerificationEmail(e.id,r,i,e.first_name),{success:!0}}catch(e){return console.error("Error resending verification email:",e),{success:!1,error:e.message}}},async getApplication(r){try{const{data:e,error:t}=await n.from("agent_applications").select("*").eq("id",r).single();if(t)throw t;return{success:!0,data:e}}catch(e){return console.error("Error getting application:",e),{success:!1,error:e.message}}},async getPendingApplications(){try{const{data:r,error:e}=await n.from("agent_applications").select("*").in("status",["under_review","pending"]).order("created_at",{ascending:!1});if(e)throw e;return{success:!0,data:r}}catch(r){return console.error("Error getting pending applications:",r),{success:!1,error:r.message}}},async approveApplication(r,e){try{const{data:t,error:i}=await n.from("agent_applications").select("*").eq("id",r).single();if(i)throw i;const o={first_name:t.first_name,last_name:t.last_name,email:t.email,phone:t.phone,company:t.company,license_number:t.license_number,license_state:t.license_state,years_experience:t.years_experience,bio:t.bio,states_covered:t.states_covered,specialties:t.specialties,referral_fee_percentage:t.referral_fee_percentage,application_id:r,is_admin:!1,is_active:!0,onboarding_completed:!0,onboarding_completed_at:new Date().toISOString()},{data:a,error:s}=await n.from("agents").insert([o]).select().single();if(s)throw s;return await this.createReferralAgreement(a.id,t),await n.from("agent_applications").update({status:"approved",reviewed_by:e,reviewed_at:new Date().toISOString()}).eq("id",r),await this.logVerificationAction(r,a.id,"approved","Application approved by admin",e),await this.sendApprovalEmail(t,a.id),{success:!0,data:a}}catch(t){return console.error("Error approving application:",t),{success:!1,error:t.message}}},async rejectApplication(r,e,t){try{await n.from("agent_applications").update({status:"rejected",reviewed_by:e,reviewed_at:new Date().toISOString(),rejection_reason:t}).eq("id",r),await this.logVerificationAction(r,null,"rejected",`Application rejected: ${t}`,e);const{data:i}=await this.getApplication(r);return i&&await this.sendRejectionEmail(i,t),{success:!0}}catch(i){return console.error("Error rejecting application:",i),{success:!1,error:i.message}}},async createReferralAgreement(r,e){try{const t={agent_id:r,application_id:e.id,referral_fee_percentage:e.referral_fee_percentage,states_covered:e.states_covered,agreement_version:e.terms_version,agreement_text:`Full agreement text for ${e.first_name} ${e.last_name}`,agent_signature:`${e.first_name} ${e.last_name}`,agent_ip_address:e.ip_address||null,signed_at:e.terms_agreed_at,status:"active",effective_date:new Date().toISOString().split("T")[0]},{data:i,error:o}=await n.from("referral_agreements").insert([t]).select().single();if(o)throw o;return await n.from("agents").update({referral_agreement_id:i.id}).eq("id",r),{success:!0,data:i}}catch(t){return console.error("Error creating referral agreement:",t),{success:!1,error:t.message}}},async logVerificationAction(r,e,t,i,o=null){try{return await n.from("agent_verification_logs").insert([{application_id:r,agent_id:e,action_type:t,performed_by:o,notes:i}]),{success:!0}}catch(a){return console.error("Error logging verification action:",a),{success:!1}}},async notifyAdminsOfNewApplication(r){console.log("New application ready for review:",r.id)},async sendApprovalEmail(r,e){const t=Math.random().toString(36).slice(-8),i={email:r.email,temporaryPassword:t};return await l.sendAgentApprovalEmail(r,i)},async sendRejectionEmail(r,e){return await l.sendAgentRejectionEmail(r,e)}};export{p as agentApplicationService,n as supabase};
