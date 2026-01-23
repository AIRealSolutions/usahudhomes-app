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

  // Refresh data from localStorage (call this when returning to dashboard)
  refreshData() {
    this.customers = this.loadCustomers();
    this.consultations = this.loadConsultations();
    this.leads = this.loadLeads();
    return true;
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
    // Refresh from localStorage to ensure latest data
    this.customers = this.loadCustomers();
    return this.customers.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  // Get all consultations
  getAllConsultations() {
    // Refresh from localStorage to ensure latest data
    this.consultations = this.loadConsultations();
    return this.consultations.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  // Get all leads
  getAllLeads() {
    // Refresh from localStorage to ensure latest data
    this.leads = this.loadLeads();
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

  // Lead status management
  updateLeadStatus(leadId, newStatus, notes = '') {
    const lead = this.consultations.find(c => c.id === leadId);
    if (lead) {
      const oldStatus = lead.status;
      lead.status = newStatus;
      lead.updatedAt = new Date().toISOString();
      
      // Add status change to interaction history
      this.addLeadInteraction(leadId, {
        type: 'status_change',
        message: `Status changed from ${oldStatus} to ${newStatus}`,
        notes: notes,
        timestamp: new Date().toISOString(),
        user: 'Marc Spencer'
      });
      
      this.saveConsultations();
      return lead;
    }
    return null;
  }

  // Lead interaction tracking
  addLeadInteraction(leadId, interaction) {
    const interactions = JSON.parse(localStorage.getItem('usahud_interactions') || '{}');
    if (!interactions[leadId]) {
      interactions[leadId] = [];
    }
    
    const newInteraction = {
      id: this.generateId(),
      leadId,
      ...interaction,
      timestamp: interaction.timestamp || new Date().toISOString()
    };
    
    interactions[leadId].unshift(newInteraction);
    localStorage.setItem('usahud_interactions', JSON.stringify(interactions));
    return newInteraction;
  }

  getLeadInteractions(leadId) {
    const interactions = JSON.parse(localStorage.getItem('usahud_interactions') || '{}');
    return interactions[leadId] || [];
  }

  // Lead task management
  addLeadTask(leadId, task) {
    const tasks = JSON.parse(localStorage.getItem('usahud_tasks') || '{}');
    if (!tasks[leadId]) {
      tasks[leadId] = [];
    }
    
    const newTask = {
      id: this.generateId(),
      leadId,
      ...task,
      createdAt: new Date().toISOString(),
      completed: false
    };
    
    tasks[leadId].unshift(newTask);
    localStorage.setItem('usahud_tasks', JSON.stringify(tasks));
    return newTask;
  }

  getLeadTasks(leadId) {
    const tasks = JSON.parse(localStorage.getItem('usahud_tasks') || '{}');
    return tasks[leadId] || [];
  }

  updateLeadTask(leadId, taskId, updates) {
    const tasks = JSON.parse(localStorage.getItem('usahud_tasks') || '{}');
    if (tasks[leadId]) {
      const taskIndex = tasks[leadId].findIndex(t => t.id === taskId);
      if (taskIndex !== -1) {
        tasks[leadId][taskIndex] = {
          ...tasks[leadId][taskIndex],
          ...updates,
          updatedAt: new Date().toISOString()
        };
        localStorage.setItem('usahud_tasks', JSON.stringify(tasks));
        return tasks[leadId][taskIndex];
      }
    }
    return null;
  }

  // Lead scoring and analytics
  calculateLeadScore(leadId) {
    const lead = this.consultations.find(c => c.id === leadId);
    if (!lead) return 0;
    
    let score = 50; // Base score
    
    // Engagement factors
    const interactions = this.getLeadInteractions(leadId);
    score += Math.min(interactions.length * 5, 30); // Up to 30 points for interactions
    
    // Recency factor
    const daysSinceCreated = (Date.now() - new Date(lead.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceCreated < 1) score += 20;
    else if (daysSinceCreated < 7) score += 10;
    else if (daysSinceCreated > 30) score -= 10;
    
    // Property interest factor
    if (lead.propertyId) score += 15;
    if (lead.consultationType === 'financing') score += 10;
    if (lead.consultationType === 'bidding') score += 15;
    
    // Contact information completeness
    if (lead.phone) score += 10;
    if (lead.email) score += 5;
    
    return Math.max(0, Math.min(100, score));
  }

  // Lead workflow automation
  getLeadsByStatus(status) {
    return this.consultations.filter(c => c.status === status);
  }

  getOverdueLeads() {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    return this.consultations.filter(c => 
      c.status === 'pending' && new Date(c.createdAt) < threeDaysAgo
    );
  }

  getHighPriorityLeads() {
    return this.consultations.filter(c => 
      c.priority === 'high' || this.calculateLeadScore(c.id) > 80
    );
  }

  // Delete lead
  deleteLead(leadId) {
    const leadIndex = this.leads.findIndex(lead => lead.id === leadId);
    if (leadIndex !== -1) {
      this.leads.splice(leadIndex, 1);
      this.saveLeads();
      
      // Also clean up related data
      const interactions = JSON.parse(localStorage.getItem('usahud_interactions') || '{}');
      delete interactions[leadId];
      localStorage.setItem('usahud_interactions', JSON.stringify(interactions));
      
      const tasks = JSON.parse(localStorage.getItem('usahud_tasks') || '{}');
      delete tasks[leadId];
      localStorage.setItem('usahud_tasks', JSON.stringify(tasks));
      
      return true;
    }
    return false;
  }
}

// Lead status workflow definitions
const statusWorkflow = {
  'pending': {
    label: 'New Lead',
    color: 'bg-blue-100 text-blue-800',
    nextSteps: ['contacted', 'qualified'],
    autoActions: ['send_welcome_email', 'assign_to_agent']
  },
  'contacted': {
    label: 'Contacted',
    color: 'bg-yellow-100 text-yellow-800',
    nextSteps: ['qualified', 'not_interested'],
    autoActions: ['schedule_follow_up']
  },
  'qualified': {
    label: 'Qualified',
    color: 'bg-green-100 text-green-800',
    nextSteps: ['proposal', 'viewing_scheduled'],
    autoActions: ['send_property_matches']
  },
  'proposal': {
    label: 'Proposal Sent',
    color: 'bg-purple-100 text-purple-800',
    nextSteps: ['closed', 'negotiating'],
    autoActions: ['schedule_follow_up_call']
  },
  'viewing_scheduled': {
    label: 'Viewing Scheduled',
    color: 'bg-indigo-100 text-indigo-800',
    nextSteps: ['proposal', 'qualified'],
    autoActions: ['send_viewing_reminder']
  },
  'negotiating': {
    label: 'Negotiating',
    color: 'bg-orange-100 text-orange-800',
    nextSteps: ['closed', 'lost'],
    autoActions: ['prepare_contracts']
  },
  'closed': {
    label: 'Closed Won',
    color: 'bg-green-100 text-green-800',
    nextSteps: [],
    autoActions: ['send_congratulations', 'request_review']
  },
  'lost': {
    label: 'Closed Lost',
    color: 'bg-red-100 text-red-800',
    nextSteps: [],
    autoActions: ['send_feedback_request']
  },
  'not_interested': {
    label: 'Not Interested',
    color: 'bg-gray-100 text-gray-800',
    nextSteps: [],
    autoActions: ['add_to_nurture_campaign']
  },
  'referred': {
    label: 'Referred',
    color: 'bg-orange-100 text-orange-800',
    nextSteps: [],
    autoActions: ['notify_referring_broker']
  }
};

// Create singleton instance
const customerDB = new CustomerDatabase();
customerDB.statusWorkflow = statusWorkflow;

export default customerDB;
