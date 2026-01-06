// Email Service for USAhudHomes.com
// Handles email notifications for new client registrations and consultations

class EmailService {
  constructor() {
    this.emailEndpoint = '/api/send-email'; // In production, this would be your email API
    this.defaultRecipient = 'marcspencer28461@gmail.com';
  }

  // Send email notification for new customer registration
  async sendNewCustomerNotification(customerData) {
    const emailData = {
      to: this.defaultRecipient,
      subject: `🏠 New Customer Registration - ${customerData.name}`,
      html: this.generateCustomerEmailHTML(customerData),
      text: this.generateCustomerEmailText(customerData)
    };

    return this.sendEmail(emailData);
  }

  // Send email notification for new consultation request
  async sendConsultationNotification(consultationData) {
    const priority = this.calculatePriority(consultationData);
    const urgencyIcon = priority === 'high' ? '🚨' : priority === 'medium' ? '⚡' : '📋';
    
    const emailData = {
      to: this.defaultRecipient,
      subject: `${urgencyIcon} New Consultation Request - ${consultationData.name} (${priority.toUpperCase()} Priority)`,
      html: this.generateConsultationEmailHTML(consultationData, priority),
      text: this.generateConsultationEmailText(consultationData, priority)
    };

    return this.sendEmail(emailData);
  }

  // Send email notification for new lead capture
  async sendLeadNotification(leadData) {
    const emailData = {
      to: this.defaultRecipient,
      subject: `🎯 New Lead Captured - ${leadData.name}`,
      html: this.generateLeadEmailHTML(leadData),
      text: this.generateLeadEmailText(leadData)
    };

    return this.sendEmail(emailData);
  }

  // Calculate consultation priority
  calculatePriority(consultationData) {
    if (consultationData.propertyId && consultationData.propertyId.includes('PRICE REDUCED')) {
      return 'high';
    }
    if (consultationData.consultationType === 'bidding' || consultationData.consultationType === 'urgent') {
      return 'high';
    }
    if (consultationData.consultationType === 'financing' || consultationData.consultationType === '203k') {
      return 'medium';
    }
    return 'normal';
  }

  // Generate HTML email for customer registration
  generateCustomerEmailHTML(customerData) {
    return `
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
                <p><strong>Name:</strong> ${customerData.name}</p>
                <p><strong>Email:</strong> <a href="mailto:${customerData.email}">${customerData.email}</a></p>
                <p><strong>Phone:</strong> <a href="tel:${customerData.phone}">${customerData.phone}</a></p>
                <p><strong>State of Interest:</strong> ${customerData.state || 'Not specified'}</p>
                <p><strong>Property Interest:</strong> ${customerData.propertyId || 'General inquiry'}</p>
                <p><strong>Registration Date:</strong> ${new Date(customerData.createdAt || Date.now()).toLocaleString()}</p>
                <p><strong>Customer ID:</strong> ${customerData.id}</p>
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
                <a href="tel:${customerData.phone}" class="button">📞 Call Customer Now</a>
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
    `;
  }

  // Generate text email for customer registration
  generateCustomerEmailText(customerData) {
    return `
🏠 USAhudHomes.com - New Customer Registration

⏰ ACTION REQUIRED - Follow up within 2 hours

A new customer has registered on USAhudHomes.com:

👤 Customer Details:
- Name: ${customerData.name}
- Email: ${customerData.email}
- Phone: ${customerData.phone}
- State of Interest: ${customerData.state || 'Not specified'}
- Property Interest: ${customerData.propertyId || 'General inquiry'}
- Registration Date: ${new Date(customerData.createdAt || Date.now()).toLocaleString()}
- Customer ID: ${customerData.id}

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
    `;
  }

  // Generate HTML email for consultation request
  generateConsultationEmailHTML(consultationData, priority) {
    const priorityColor = priority === 'high' ? '#dc2626' : priority === 'medium' ? '#f59e0b' : '#2563eb';
    const urgencyMessage = priority === 'high' ? 'URGENT - Respond immediately!' : 'Please respond within 2 hours';
    
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>New Consultation Request</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: ${priorityColor}; color: white; padding: 20px; text-align: center; }
        .content { background: #f8fafc; padding: 20px; }
        .info-box { background: white; padding: 15px; margin: 10px 0; border-left: 4px solid: ${priorityColor}; }
        .urgent { background: #fef2f2; border-left-color: #dc2626; }
        .footer { background: #1e293b; color: white; padding: 15px; text-align: center; }
        .button { background: ${priorityColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; }
        .priority { background: ${priorityColor}; color: white; padding: 8px 16px; border-radius: 20px; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏠 USAhudHomes.com</h1>
            <h2>New Consultation Request</h2>
            <span class="priority">${priority.toUpperCase()} PRIORITY</span>
        </div>
        
        <div class="content">
            <div class="info-box urgent">
                <h3>⏰ ${urgencyMessage}</h3>
                <p>A new consultation request has been submitted with ${priority} priority.</p>
            </div>
            
            <div class="info-box">
                <h3>👤 Client Information</h3>
                <p><strong>Name:</strong> ${consultationData.name}</p>
                <p><strong>Email:</strong> <a href="mailto:${consultationData.email}">${consultationData.email}</a></p>
                <p><strong>Phone:</strong> <a href="tel:${consultationData.phone}">${consultationData.phone}</a></p>
                <p><strong>Consultation Type:</strong> ${consultationData.consultationType}</p>
                <p><strong>Property:</strong> ${consultationData.propertyId || 'General consultation'}</p>
                <p><strong>Priority:</strong> <span style="color: ${priorityColor}; font-weight: bold;">${priority.toUpperCase()}</span></p>
                <p><strong>Request Date:</strong> ${new Date(consultationData.createdAt || Date.now()).toLocaleString()}</p>
                <p><strong>Consultation ID:</strong> ${consultationData.id}</p>
            </div>
            
            ${consultationData.message ? `
            <div class="info-box">
                <h3>💬 Client Message</h3>
                <p>"${consultationData.message}"</p>
            </div>
            ` : ''}
            
            <div style="text-align: center; margin: 20px 0;">
                <a href="tel:${consultationData.phone}" class="button">📞 Call Client Now</a>
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
    `;
  }

  // Generate text email for consultation request
  generateConsultationEmailText(consultationData, priority) {
    const urgencyMessage = priority === 'high' ? 'URGENT - Respond immediately!' : 'Please respond within 2 hours';
    
    return `
🏠 USAhudHomes.com - New Consultation Request

⏰ ${urgencyMessage}

New consultation request received with ${priority.toUpperCase()} priority:

👤 Client Details:
- Name: ${consultationData.name}
- Email: ${consultationData.email}
- Phone: ${consultationData.phone}
- Consultation Type: ${consultationData.consultationType}
- Property: ${consultationData.propertyId || 'General consultation'}
- Priority: ${priority.toUpperCase()}
- Request Date: ${new Date(consultationData.createdAt || Date.now()).toLocaleString()}
- Consultation ID: ${consultationData.id}

${consultationData.message ? `💬 Client Message: "${consultationData.message}"` : ''}

${priority === 'high' ? '🚨 HIGH PRIORITY - Please respond immediately!' : 'Please respond within 2 hours as promised.'}

Best regards,
USAhudHomes.com System
Lightkeeper Realty - Registered HUD Buyer's Agency
Marc Spencer: (910) 363-6147
    `;
  }

  // Generate HTML email for lead capture
  generateLeadEmailHTML(leadData) {
    return `
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
                <p><strong>Name:</strong> ${leadData.name}</p>
                <p><strong>Email:</strong> <a href="mailto:${leadData.email}">${leadData.email}</a></p>
                <p><strong>Phone:</strong> <a href="tel:${leadData.phone}">${leadData.phone}</a></p>
                <p><strong>State of Interest:</strong> ${leadData.state}</p>
                <p><strong>Property Case #:</strong> ${leadData.propertyCase || 'Not specified'}</p>
                <p><strong>Lead Date:</strong> ${new Date(leadData.createdAt || Date.now()).toLocaleString()}</p>
                <p><strong>Lead ID:</strong> ${leadData.id}</p>
            </div>
            
            <div style="text-align: center; margin: 20px 0;">
                <a href="tel:${leadData.phone}" class="button">📞 Call Lead Now</a>
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
    `;
  }

  // Generate text email for lead capture
  generateLeadEmailText(leadData) {
    return `
🏠 USAhudHomes.com - New Lead Captured

🎯 Lead Details:
- Name: ${leadData.name}
- Email: ${leadData.email}
- Phone: ${leadData.phone}
- State of Interest: ${leadData.state}
- Property Case #: ${leadData.propertyCase || 'Not specified'}
- Lead Date: ${new Date(leadData.createdAt || Date.now()).toLocaleString()}
- Lead ID: ${leadData.id}

Please follow up within 2 hours as promised.

Best regards,
USAhudHomes.com System
Lightkeeper Realty - Registered HUD Buyer's Agency
Marc Spencer: (910) 363-6147
    `;
  }

  // Send email (simulated - in production, integrate with email service like SendGrid, Mailgun, etc.)
  async sendEmail(emailData) {
    try {
      // Simulate email sending
      console.log('📧 Email sent:', emailData);
      
      // Log email for tracking
      this.logEmail(emailData);
      
      // In production, replace with actual email service:
      // const response = await fetch(this.emailEndpoint, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(emailData)
      // });
      // return response.json();
      
      return { success: true, messageId: 'sim_' + Date.now() };
    } catch (error) {
      console.error('Email sending failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Log email for tracking
  logEmail(emailData) {
    const emails = JSON.parse(localStorage.getItem('usahud_emails') || '[]');
    emails.push({
      ...emailData,
      sentAt: new Date().toISOString(),
      id: 'email_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
    });
    localStorage.setItem('usahud_emails', JSON.stringify(emails));
  }

  // Get email logs
  getEmailLogs() {
    return JSON.parse(localStorage.getItem('usahud_emails') || '[]')
      .sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt));
  }

  // ============================================
  // AGENT ONBOARDING EMAIL METHODS
  // ============================================

  // Send email verification to new agent applicant
  async sendAgentVerificationEmail(applicationData, verificationToken) {
    const verificationUrl = `${window.location.origin}/agent/verify-email?token=${verificationToken}`;
    
    const emailData = {
      to: applicationData.email,
      subject: '✅ Verify Your Email - USA HUD Homes Agent Application',
      html: this.generateAgentVerificationEmailHTML(applicationData, verificationUrl),
      text: this.generateAgentVerificationEmailText(applicationData, verificationUrl)
    };

    return this.sendEmail(emailData);
  }

  // Resend verification email
  async resendAgentVerificationEmail(applicationData, verificationToken) {
    return this.sendAgentVerificationEmail(applicationData, verificationToken);
  }

  // Send approval notification to agent
  async sendAgentApprovalEmail(applicationData, credentials) {
    const emailData = {
      to: applicationData.email,
      subject: '🎉 Congratulations! Your Agent Application Has Been Approved',
      html: this.generateAgentApprovalEmailHTML(applicationData, credentials),
      text: this.generateAgentApprovalEmailText(applicationData, credentials)
    };

    return this.sendEmail(emailData);
  }

  // Send rejection notification to agent
  async sendAgentRejectionEmail(applicationData, reason) {
    const emailData = {
      to: applicationData.email,
      subject: 'Update on Your Agent Application - USA HUD Homes',
      html: this.generateAgentRejectionEmailHTML(applicationData, reason),
      text: this.generateAgentRejectionEmailText(applicationData, reason)
    };

    return this.sendEmail(emailData);
  }

  // Generate HTML for agent verification email
  generateAgentVerificationEmailHTML(applicationData, verificationUrl) {
    return `
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
                <h3>Hi ${applicationData.first_name},</h3>
                <p>Thank you for applying to become a USA HUD Homes partner agent!</p>
                <p>To complete your application, please verify your email address by clicking the button below:</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="${verificationUrl}" class="button">✅ Verify Email Address</a>
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
                <p style="word-break: break-all; color: #2563eb;">${verificationUrl}</p>
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
    `;
  }

  // Generate text for agent verification email
  generateAgentVerificationEmailText(applicationData, verificationUrl) {
    return `
🏠 USA HUD Homes - Verify Your Email Address

Hi ${applicationData.first_name},

Thank you for applying to become a USA HUD Homes partner agent!

To complete your application, please verify your email address by visiting:
${verificationUrl}

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
    `;
  }

  // Generate HTML for agent approval email
  generateAgentApprovalEmailHTML(applicationData, credentials) {
    return `
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
                <h3>✅ Welcome to USA HUD Homes, ${applicationData.first_name}!</h3>
                <p>We're excited to have you join our network of professional real estate agents specializing in HUD homes.</p>
            </div>
            
            <div class="info-box">
                <h3>🔑 Your Login Credentials</h3>
                <div class="credentials">
                    <p><strong>Email:</strong> ${applicationData.email}</p>
                    <p><strong>Password:</strong> ${credentials?.temporaryPassword || 'Check your email'}</p>
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
                <p><strong>States:</strong> ${applicationData.states_covered?.join(', ') || 'Not specified'}</p>
                <p><strong>Specialties:</strong> ${applicationData.specialties?.join(', ') || 'Not specified'}</p>
                <p><strong>Referral Fee:</strong> ${applicationData.referral_fee_percentage || 25}%</p>
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
    `;
  }

  // Generate text for agent approval email
  generateAgentApprovalEmailText(applicationData, credentials) {
    return `
🎉 Congratulations! Your Application Has Been Approved

✅ Welcome to USA HUD Homes, ${applicationData.first_name}!

We're excited to have you join our network of professional real estate agents specializing in HUD homes.

🔑 Your Login Credentials:
Email: ${applicationData.email}
Password: ${credentials?.temporaryPassword || 'Check your email'}

⚠️ Important: Please change your password after your first login.

📋 Next Steps:
1. Log in to your broker dashboard at: ${window.location.origin}/broker-dashboard
2. Complete your profile with additional details
3. Review your referral agreement (25% referral fee)
4. Start receiving leads in your covered states

💼 Your Coverage:
States: ${applicationData.states_covered?.join(', ') || 'Not specified'}
Specialties: ${applicationData.specialties?.join(', ') || 'Not specified'}
Referral Fee: ${applicationData.referral_fee_percentage || 25}%

📞 Need Help?
If you have any questions or need assistance getting started, please contact:
Marc Spencer
Phone: (910) 363-6147
Email: marcspencer28461@gmail.com

Best regards,
USA HUD Homes Team
Lightkeeper Realty - Registered HUD Buyer's Agency
    `;
  }

  // Generate HTML for agent rejection email
  generateAgentRejectionEmailHTML(applicationData, reason) {
    return `
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
                <h3>Hi ${applicationData.first_name},</h3>
                <p>Thank you for your interest in becoming a USA HUD Homes partner agent.</p>
                <p>After careful review, we regret to inform you that we are unable to approve your application at this time.</p>
            </div>
            
            ${reason ? `
            <div class="info-box">
                <h3>📋 Reason</h3>
                <p>${reason}</p>
            </div>
            ` : ''}
            
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
    `;
  }

  // Generate text for agent rejection email
  generateAgentRejectionEmailText(applicationData, reason) {
    return `
🏠 USA HUD Homes - Update on Your Application

Hi ${applicationData.first_name},

Thank you for your interest in becoming a USA HUD Homes partner agent.

After careful review, we regret to inform you that we are unable to approve your application at this time.

${reason ? `📋 Reason:
${reason}
` : ''}
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
    `;
  }

  // Test email functionality
  async testEmail() {
    const testData = {
      name: 'Test Customer',
      email: 'test@example.com',
      phone: '(555) 123-4567',
      state: 'NC',
      propertyId: '387-111612',
      createdAt: new Date().toISOString(),
      id: 'test_' + Date.now()
    };

    return this.sendNewCustomerNotification(testData);
  }
}

// Create singleton instance
const emailService = new EmailService();

export default emailService;
