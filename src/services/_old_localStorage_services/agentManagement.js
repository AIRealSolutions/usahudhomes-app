// Agent/Broker Management Service for USAhudHomes.com
// Handles CRUD operations for agents and brokers in the network

class AgentManagement {
  constructor() {
    this.agents = this.loadAgents();
  }

  // Load agents from localStorage
  loadAgents() {
    const stored = localStorage.getItem('usahud_agents');
    if (stored) {
      return JSON.parse(stored);
    }
    
    // Initialize with default agent (Marc Spencer)
    return this.getDefaultAgents();
  }

  // Save agents to localStorage
  saveAgents() {
    localStorage.setItem('usahud_agents', JSON.stringify(this.agents));
  }

  // Get default agents
  getDefaultAgents() {
    return [
      {
        id: 'agent_marc_spencer',
        name: 'Marc Spencer',
        email: 'marcspencer28461@gmail.com',
        phone: '(910) 363-6147',
        company: 'Lightkeeper Realty',
        licenseNumber: 'NC-HUD-REGISTERED',
        states: ['NC', 'TN'],
        specialties: ['HUD Homes', 'FHA 203k Loans', 'First-Time Buyers'],
        yearsExperience: 25,
        status: 'active',
        isAdmin: true,
        bio: 'HUD home specialist with 25+ years of experience helping people buy HUD homes. Registered HUD Buyer\'s Agency.',
        profileImage: null,
        address: {
          street: '',
          city: '',
          state: 'NC',
          zipCode: ''
        },
        stats: {
          totalSales: 0,
          activeListings: 5,
          closedDeals: 0,
          averageResponseTime: '2 hours'
        },
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: new Date().toISOString()
      }
    ];
  }

  // Generate unique ID
  generateId() {
    return 'agent_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // Get all agents
  getAllAgents() {
    // Refresh from localStorage to ensure latest data
    this.agents = this.loadAgents();
    return this.agents.sort((a, b) => a.name.localeCompare(b.name));
  }

  // Get active agents only
  getActiveAgents() {
    return this.getAllAgents().filter(agent => agent.status === 'active');
  }

  // Get agent by ID
  getAgentById(id) {
    this.agents = this.loadAgents();
    return this.agents.find(agent => agent.id === id);
  }

  // Add new agent
  addAgent(agentData) {
    const agent = {
      id: this.generateId(),
      ...agentData,
      status: agentData.status || 'active',
      isAdmin: agentData.isAdmin || false,
      stats: {
        totalSales: 0,
        activeListings: 0,
        closedDeals: 0,
        averageResponseTime: 'N/A'
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.agents.push(agent);
    this.saveAgents();

    return agent;
  }

  // Update agent
  updateAgent(id, updates) {
    const agentIndex = this.agents.findIndex(agent => agent.id === id);
    
    if (agentIndex !== -1) {
      this.agents[agentIndex] = {
        ...this.agents[agentIndex],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      this.saveAgents();
      return this.agents[agentIndex];
    }
    
    return null;
  }

  // Delete agent
  deleteAgent(id) {
    // Prevent deletion of Marc Spencer (primary agent)
    const agent = this.getAgentById(id);
    if (agent && agent.id === 'agent_marc_spencer') {
      throw new Error('Cannot delete primary agent');
    }

    const agentIndex = this.agents.findIndex(agent => agent.id === id);
    
    if (agentIndex !== -1) {
      const deletedAgent = this.agents.splice(agentIndex, 1)[0];
      this.saveAgents();
      return deletedAgent;
    }
    
    return null;
  }

  // Search agents
  searchAgents(query) {
    const lowercaseQuery = query.toLowerCase();
    return this.agents.filter(agent => 
      agent.name.toLowerCase().includes(lowercaseQuery) ||
      agent.email.toLowerCase().includes(lowercaseQuery) ||
      agent.phone.includes(query) ||
      agent.company.toLowerCase().includes(lowercaseQuery) ||
      agent.states.some(state => state.toLowerCase().includes(lowercaseQuery))
    );
  }

  // Filter agents by state
  getAgentsByState(state) {
    return this.agents.filter(agent => 
      agent.states.includes(state) && agent.status === 'active'
    );
  }

  // Filter agents by specialty
  getAgentsBySpecialty(specialty) {
    return this.agents.filter(agent => 
      agent.specialties.includes(specialty) && agent.status === 'active'
    );
  }

  // Update agent stats
  updateAgentStats(id, stats) {
    const agent = this.getAgentById(id);
    if (agent) {
      agent.stats = {
        ...agent.stats,
        ...stats
      };
      this.saveAgents();
      return agent;
    }
    return null;
  }

  // Get agent statistics
  getAgentStats() {
    return {
      total: this.agents.length,
      active: this.agents.filter(a => a.status === 'active').length,
      inactive: this.agents.filter(a => a.status === 'inactive').length,
      byState: this.agents.reduce((acc, agent) => {
        agent.states.forEach(state => {
          acc[state] = (acc[state] || 0) + 1;
        });
        return acc;
      }, {}),
      totalListings: this.agents.reduce((sum, agent) => sum + (agent.stats.activeListings || 0), 0),
      totalSales: this.agents.reduce((sum, agent) => sum + (agent.stats.totalSales || 0), 0)
    };
  }

  // Export agents for backup
  exportAgents() {
    return {
      agents: this.agents,
      exportDate: new Date().toISOString(),
      count: this.agents.length
    };
  }

  // Import agents from backup
  importAgents(data) {
    if (data.agents && Array.isArray(data.agents)) {
      this.agents = data.agents;
      this.saveAgents();
      return true;
    }
    return false;
  }

  // Assign lead to agent
  assignLeadToAgent(agentId, leadId) {
    const agent = this.getAgentById(agentId);
    if (agent) {
      if (!agent.assignedLeads) {
        agent.assignedLeads = [];
      }
      if (!agent.assignedLeads.includes(leadId)) {
        agent.assignedLeads.push(leadId);
        this.saveAgents();
      }
      return agent;
    }
    return null;
  }

  // Get agent's assigned leads
  getAgentLeads(agentId) {
    const agent = this.getAgentById(agentId);
    return agent ? (agent.assignedLeads || []) : [];
  }
}

// Create singleton instance
const agentManagement = new AgentManagement();

export default agentManagement;
