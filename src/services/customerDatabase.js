// Customer Database Service for USAhudHomes.com
// Manages client registrations, consultations, and lead tracking

class CustomerDatabase {
  constructor() {
    this.customers = this.loadCustomers();
    this.consultations = this.loadConsultations();
    this.leads = this.loadLeads();
  }

  // Load data from localStorage (simulating database)
  loadCustomers() {
    const stored = localStorage.getItem('usahud_customers');
    return stored ? JSON.parse(stored) : [];
  }

  loadConsultations() {
    const stored = localStorage.getItem('usahud_consultations');
    return stored ? JSON.parse(stored) : [];
  }

  loadLeads() {
    const stored = localStorage.getItem('usahud_leads');
    return stored ? JSON.parse(stored) : [];
  }

  // Save data to localStorage
  saveCustomers() {
    localStorage.setItem('usahud_customers', JSON.stringify(this.customers));
  }

  saveConsultations() {
    localStorage.setItem('usahud_consultations', JSON.stringify(this.consultations));
  }

  saveLeads() {
    localStorage.setItem('usahud_leads', JSON.stringify(this.leads));
  }

  // Generate unique ID
  generateId() {
    return 'cust_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // Add new customer
  addCustomer(customerData) {
    const customer = {
      id: this.generateId(),
      ...customerData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'new',
      source: 'website',
      notes: []
    };

    this.customers.push(customer);
    this.saveCustomers();

    // Send email notification
    this.sendNewCustomerNotification(customer);

    return customer;
  }

  // Add consultation request
  addConsultation(consultationData) {
    const consultation = {
      id: this.generateId(),
      ...consultationData,
      createdAt: new Date().toISOString(),
      status: 'pending',
      priority: this.calculatePriority(consultationData)
    };

    this.consultations.push(consultation);
    this.saveConsultations();

    // Send email notification
    this.sendConsultationNotification(consultation);

    return consultation;
  }

  // Add lead capture
  addLead(leadData) {
    const lead = {
      id: this.generateId(),
      ...leadData,
      createdAt: new Date().toISOString(),
      status: 'new',
      source: 'lead_form'
    };

    this.leads.push(lead);
    this.saveLeads();

    // Send email notification
    this.sendLeadNotification(lead);

    return lead;
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

  // Get all customers
  getAllCustomers() {
    return this.customers.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  // Get all consultations
  getAllConsultations() {
    return this.consultations.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  // Get all leads
  getAllLeads() {
    return this.leads.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  // Get customer by ID
  getCustomerById(id) {
    return this.customers.find(customer => customer.id === id);
  }

  // Update customer
  updateCustomer(id, updates) {
    const customerIndex = this.customers.findIndex(customer => customer.id === id);
    if (customerIndex !== -1) {
      this.customers[customerIndex] = {
        ...this.customers[customerIndex],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      this.saveCustomers();
      return this.customers[customerIndex];
    }
    return null;
  }

  // Add note to customer
  addCustomerNote(customerId, note) {
    const customer = this.getCustomerById(customerId);
    if (customer) {
      customer.notes.push({
        id: this.generateId(),
        text: note,
        createdAt: new Date().toISOString(),
        createdBy: 'Marc Spencer'
      });
      this.saveCustomers();
      return customer;
    }
    return null;
  }

  // Get dashboard statistics
  getDashboardStats() {
    const today = new Date().toISOString().split('T')[0];
    const thisWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const thisMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    return {
      totalCustomers: this.customers.length,
      newCustomersToday: this.customers.filter(c => c.createdAt.startsWith(today)).length,
      newCustomersThisWeek: this.customers.filter(c => c.createdAt >= thisWeek).length,
      newCustomersThisMonth: this.customers.filter(c => c.createdAt >= thisMonth).length,
      totalConsultations: this.consultations.length,
      pendingConsultations: this.consultations.filter(c => c.status === 'pending').length,
      highPriorityConsultations: this.consultations.filter(c => c.priority === 'high' && c.status === 'pending').length,
      totalLeads: this.leads.length,
      newLeadsToday: this.leads.filter(l => l.createdAt.startsWith(today)).length
    };
  }

  // Email notification functions
  sendNewCustomerNotification(customer) {
    const emailData = {
      to: 'marcspencer28461@gmail.com',
      subject: `New Customer Registration - ${customer.name}`,
      body: `
New customer has registered on USAhudHomes.com:

Customer Details:
- Name: ${customer.name}
- Email: ${customer.email}
- Phone: ${customer.phone}
- State of Interest: ${customer.state || 'Not specified'}
- Property Interest: ${customer.propertyId || 'General inquiry'}
- Registration Date: ${new Date(customer.createdAt).toLocaleString()}

Customer ID: ${customer.id}

Please follow up within 2 hours as promised on the website.

Best regards,
USAhudHomes.com System
      `
    };

    // Simulate email sending (in production, integrate with email service)
    console.log('Email notification sent:', emailData);
    
    // Store email log
    this.logEmail(emailData);
  }

  sendConsultationNotification(consultation) {
    const emailData = {
      to: 'marcspencer28461@gmail.com',
      subject: `New Consultation Request - ${consultation.name} (${consultation.priority.toUpperCase()} Priority)`,
      body: `
New consultation request received on USAhudHomes.com:

Client Details:
- Name: ${consultation.name}
- Email: ${consultation.email}
- Phone: ${consultation.phone}
- Consultation Type: ${consultation.consultationType}
- Property: ${consultation.propertyId || 'General consultation'}
- Priority: ${consultation.priority.toUpperCase()}
- Message: ${consultation.message || 'No additional message'}
- Request Date: ${new Date(consultation.createdAt).toLocaleString()}

Consultation ID: ${consultation.id}

${consultation.priority === 'high' ? 'HIGH PRIORITY - Please respond immediately!' : 'Please respond within 2 hours.'}

Best regards,
USAhudHomes.com System
      `
    };

    console.log('Consultation email sent:', emailData);
    this.logEmail(emailData);
  }

  sendLeadNotification(lead) {
    const emailData = {
      to: 'marcspencer28461@gmail.com',
      subject: `New Lead Captured - ${lead.name}`,
      body: `
New lead captured on USAhudHomes.com:

Lead Details:
- Name: ${lead.name}
- Email: ${lead.email}
- Phone: ${lead.phone}
- State of Interest: ${lead.state}
- Property Case #: ${lead.propertyCase || 'Not specified'}
- Lead Date: ${new Date(lead.createdAt).toLocaleString()}

Lead ID: ${lead.id}

Please follow up within 2 hours.

Best regards,
USAhudHomes.com System
      `
    };

    console.log('Lead email sent:', emailData);
    this.logEmail(emailData);
  }

  // Log email for tracking
  logEmail(emailData) {
    const emails = JSON.parse(localStorage.getItem('usahud_emails') || '[]');
    emails.push({
      ...emailData,
      sentAt: new Date().toISOString(),
      id: this.generateId()
    });
    localStorage.setItem('usahud_emails', JSON.stringify(emails));
  }

  // Get email logs
  getEmailLogs() {
    return JSON.parse(localStorage.getItem('usahud_emails') || '[]');
  }

  // Search customers
  searchCustomers(query) {
    const lowercaseQuery = query.toLowerCase();
    return this.customers.filter(customer => 
      customer.name.toLowerCase().includes(lowercaseQuery) ||
      customer.email.toLowerCase().includes(lowercaseQuery) ||
      customer.phone.includes(query) ||
      (customer.state && customer.state.toLowerCase().includes(lowercaseQuery))
    );
  }

  // Export data for backup
  exportData() {
    return {
      customers: this.customers,
      consultations: this.consultations,
      leads: this.leads,
      emails: this.getEmailLogs(),
      exportDate: new Date().toISOString()
    };
  }

  // Import data from backup
  importData(data) {
    if (data.customers) {
      this.customers = data.customers;
      this.saveCustomers();
    }
    if (data.consultations) {
      this.consultations = data.consultations;
      this.saveConsultations();
    }
    if (data.leads) {
      this.leads = data.leads;
      this.saveLeads();
    }
  }
}

// Create singleton instance
const customerDB = new CustomerDatabase();

export default customerDB;
