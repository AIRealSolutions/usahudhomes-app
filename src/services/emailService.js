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
