/**
 * Workflow Automation Service
 * Automates client maintenance workflows for brokers
 */

import { WORKFLOW_PRESETS } from '../data/aiAgentWorkflows'
import communicationService from './communicationService'
import propertyRecommendationService from './propertyRecommendationService'

export const workflowAutomationService = {
  /**
   * Start an automated workflow for a lead
   */
  async startWorkflow(workflowId, leadData, brokerId) {
    try {
      const workflow = Object.values(WORKFLOW_PRESETS).find(w => w.id === workflowId)
      
      if (!workflow) {
        throw new Error(`Workflow not found: ${workflowId}`)
      }

      // Create workflow instance
      const workflowInstance = {
        id: Date.now().toString(),
        workflowId,
        leadId: leadData.id,
        brokerId,
        status: 'active',
        currentStep: 0,
        steps: workflow.steps.map((step, index) => ({
          ...step,
          status: index === 0 ? 'pending' : 'waiting',
          scheduledFor: this.calculateScheduleTime(step.delay),
          completedAt: null
        })),
        startedAt: new Date().toISOString(),
        completedAt: null
      }

      // Save workflow instance
      await this.saveWorkflowInstance(workflowInstance)

      // Execute first step
      await this.executeWorkflowStep(workflowInstance, 0, leadData)

      return {
        success: true,
        workflowInstance
      }
    } catch (error) {
      console.error('Error starting workflow:', error)
      return {
        success: false,
        error: error.message
      }
    }
  },

  /**
   * Execute a specific workflow step
   */
  async executeWorkflowStep(workflowInstance, stepIndex, leadData) {
    try {
      const step = workflowInstance.steps[stepIndex]
      
      if (!step) {
        throw new Error('Step not found')
      }

      // Update step status
      step.status = 'executing'
      await this.updateWorkflowInstance(workflowInstance)

      // Execute step action
      let result
      switch (step.action) {
        case 'send_welcome_email':
          result = await this.sendWelcomeEmail(leadData, workflowInstance.brokerId)
          break
        case 'schedule_call':
          result = await this.scheduleDiscoveryCall(leadData, workflowInstance.brokerId)
          break
        case 'send_sms_reminder':
          result = await this.sendSMSReminder(leadData, workflowInstance.brokerId)
          break
        case 'analyze_preferences':
          result = await this.analyzeClientPreferences(leadData)
          break
        case 'find_properties':
          result = await this.findMatchingProperties(leadData)
          break
        case 'share_properties':
          result = await this.sharePropertiesWithClient(leadData, workflowInstance.brokerId)
          break
        case 'follow_up':
          result = await this.sendFollowUp(leadData, workflowInstance.brokerId)
          break
        default:
          result = { success: true, message: 'Step executed' }
      }

      // Update step status
      step.status = result.success ? 'completed' : 'failed'
      step.completedAt = new Date().toISOString()
      step.result = result

      // Schedule next step if exists
      if (stepIndex + 1 < workflowInstance.steps.length) {
        const nextStep = workflowInstance.steps[stepIndex + 1]
        nextStep.status = 'pending'
        nextStep.scheduledFor = this.calculateScheduleTime(nextStep.delay)
        
        // If no delay, execute immediately
        if (!nextStep.delay || nextStep.delay === 0) {
          await this.executeWorkflowStep(workflowInstance, stepIndex + 1, leadData)
        }
      } else {
        // Workflow completed
        workflowInstance.status = 'completed'
        workflowInstance.completedAt = new Date().toISOString()
      }

      await this.updateWorkflowInstance(workflowInstance)

      return result
    } catch (error) {
      console.error('Error executing workflow step:', error)
      return {
        success: false,
        error: error.message
      }
    }
  },

  /**
   * Calculate scheduled time based on delay
   */
  calculateScheduleTime(delayHours) {
    if (!delayHours) return new Date().toISOString()
    
    const scheduledTime = new Date()
    scheduledTime.setHours(scheduledTime.getHours() + delayHours)
    return scheduledTime.toISOString()
  },

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(leadData, brokerId) {
    const messageData = {
      to: leadData.email,
      subject: `Welcome to USA HUD Homes, ${leadData.name}!`,
      body: `Hi ${leadData.name},\n\nThank you for your interest in HUD properties! I'm excited to help you find your perfect home.\n\nI've reviewed your consultation request and I'd love to schedule a quick 15-minute call to understand your needs better.\n\nBest regards,\n[Your Name]`,
      leadId: leadData.id,
      brokerId
    }

    return await communicationService.sendEmail(messageData)
  },

  /**
   * Schedule discovery call
   */
  async scheduleDiscoveryCall(leadData, brokerId) {
    const messageData = {
      to: leadData.email,
      subject: `Let's Schedule Your HUD Home Discovery Call`,
      body: `Hi ${leadData.name},\n\nI wanted to follow up on your interest in HUD properties. I have some exciting options that match what you're looking for!\n\nCould we schedule a brief 15-minute call?\n\nBest regards,\n[Your Name]`,
      leadId: leadData.id,
      brokerId
    }

    return await communicationService.sendEmail(messageData)
  },

  /**
   * Send SMS reminder
   */
  async sendSMSReminder(leadData, brokerId) {
    if (!leadData.phone) {
      return { success: false, error: 'No phone number available' }
    }

    const messageData = {
      to: leadData.phone,
      body: `Hi ${leadData.name}! Quick reminder about our call today to discuss HUD properties. Looking forward to it!`,
      leadId: leadData.id,
      brokerId
    }

    return await communicationService.sendSMS(messageData)
  },

  /**
   * Analyze client preferences
   */
  async analyzeClientPreferences(leadData) {
    // Extract preferences from lead data
    const preferences = {
      budget: leadData.budget || leadData.maxPrice,
      minBedrooms: leadData.bedrooms || leadData.minBedrooms,
      location: leadData.preferredLocation || leadData.city,
      propertyType: leadData.propertyType || 'Single Family'
    }

    return {
      success: true,
      preferences
    }
  },

  /**
   * Find matching properties
   */
  async findMatchingProperties(leadData) {
    const preferences = {
      budget: leadData.budget || leadData.maxPrice || 300000,
      minBedrooms: leadData.bedrooms || 3,
      location: leadData.preferredLocation || leadData.city,
      propertyType: leadData.propertyType
    }

    return await propertyRecommendationService.findMatchingProperties(preferences)
  },

  /**
   * Share properties with client
   */
  async sharePropertiesWithClient(leadData, brokerId) {
    // First find properties
    const propertiesResult = await this.findMatchingProperties(leadData)
    
    if (!propertiesResult.success || propertiesResult.properties.length === 0) {
      return {
        success: false,
        error: 'No matching properties found'
      }
    }

    // Share top 5 properties
    const topProperties = propertiesResult.properties.slice(0, 5)
    
    return await propertyRecommendationService.shareProperties({
      leadId: leadData.id,
      brokerId,
      properties: topProperties,
      channel: 'email',
      clientEmail: leadData.email,
      clientName: leadData.name
    })
  },

  /**
   * Send follow-up
   */
  async sendFollowUp(leadData, brokerId) {
    const messageData = {
      to: leadData.email,
      subject: `Following up on HUD properties`,
      body: `Hi ${leadData.name},\n\nI wanted to check in and see if you had a chance to review the properties I sent over.\n\nDo any of them interest you? I'd be happy to schedule showings or answer any questions.\n\nBest regards,\n[Your Name]`,
      leadId: leadData.id,
      brokerId
    }

    return await communicationService.sendEmail(messageData)
  },

  /**
   * Save workflow instance
   */
  async saveWorkflowInstance(workflowInstance) {
    try {
      const workflows = JSON.parse(localStorage.getItem('workflow_instances') || '[]')
      workflows.push(workflowInstance)
      localStorage.setItem('workflow_instances', JSON.stringify(workflows))
      return { success: true }
    } catch (error) {
      console.error('Error saving workflow instance:', error)
      return { success: false, error: error.message }
    }
  },

  /**
   * Update workflow instance
   */
  async updateWorkflowInstance(workflowInstance) {
    try {
      const workflows = JSON.parse(localStorage.getItem('workflow_instances') || '[]')
      const index = workflows.findIndex(w => w.id === workflowInstance.id)
      
      if (index !== -1) {
        workflows[index] = workflowInstance
        localStorage.setItem('workflow_instances', JSON.stringify(workflows))
      }
      
      return { success: true }
    } catch (error) {
      console.error('Error updating workflow instance:', error)
      return { success: false, error: error.message }
    }
  },

  /**
   * Get active workflows for a lead
   */
  async getLeadWorkflows(leadId) {
    try {
      const workflows = JSON.parse(localStorage.getItem('workflow_instances') || '[]')
      return workflows.filter(w => w.leadId === leadId)
        .sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt))
    } catch (error) {
      console.error('Error getting lead workflows:', error)
      return []
    }
  },

  /**
   * Pause workflow
   */
  async pauseWorkflow(workflowId) {
    try {
      const workflows = JSON.parse(localStorage.getItem('workflow_instances') || '[]')
      const workflow = workflows.find(w => w.id === workflowId)
      
      if (workflow) {
        workflow.status = 'paused'
        workflow.pausedAt = new Date().toISOString()
        localStorage.setItem('workflow_instances', JSON.stringify(workflows))
      }
      
      return { success: true }
    } catch (error) {
      console.error('Error pausing workflow:', error)
      return { success: false, error: error.message }
    }
  },

  /**
   * Resume workflow
   */
  async resumeWorkflow(workflowId) {
    try {
      const workflows = JSON.parse(localStorage.getItem('workflow_instances') || '[]')
      const workflow = workflows.find(w => w.id === workflowId)
      
      if (workflow) {
        workflow.status = 'active'
        workflow.resumedAt = new Date().toISOString()
        localStorage.setItem('workflow_instances', JSON.stringify(workflows))
      }
      
      return { success: true }
    } catch (error) {
      console.error('Error resuming workflow:', error)
      return { success: false, error: error.message }
    }
  },

  /**
   * Cancel workflow
   */
  async cancelWorkflow(workflowId) {
    try {
      const workflows = JSON.parse(localStorage.getItem('workflow_instances') || '[]')
      const workflow = workflows.find(w => w.id === workflowId)
      
      if (workflow) {
        workflow.status = 'cancelled'
        workflow.cancelledAt = new Date().toISOString()
        localStorage.setItem('workflow_instances', JSON.stringify(workflows))
      }
      
      return { success: true }
    } catch (error) {
      console.error('Error cancelling workflow:', error)
      return { success: false, error: error.message }
    }
  },

  /**
   * Process scheduled workflows
   * This should be called periodically (e.g., every minute) to check for pending steps
   */
  async processScheduledWorkflows() {
    try {
      const workflows = JSON.parse(localStorage.getItem('workflow_instances') || '[]')
      const now = new Date()
      
      for (const workflow of workflows) {
        if (workflow.status !== 'active') continue
        
        // Find pending steps that are due
        for (let i = 0; i < workflow.steps.length; i++) {
          const step = workflow.steps[i]
          
          if (step.status === 'pending' && new Date(step.scheduledFor) <= now) {
            // Get lead data (would come from database in production)
            const leadData = { id: workflow.leadId } // Simplified
            
            await this.executeWorkflowStep(workflow, i, leadData)
            break // Process one step at a time
          }
        }
      }
      
      return { success: true }
    } catch (error) {
      console.error('Error processing scheduled workflows:', error)
      return { success: false, error: error.message }
    }
  }
}

export default workflowAutomationService
