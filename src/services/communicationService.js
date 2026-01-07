/**
 * Multi-Channel Communication Service
 * Handles email, SMS, and social media messaging for brokers
 */

import emailService from './emailService'

export const communicationService = {
  /**
   * Send message via specified channel
   */
  async sendMessage(channel, messageData) {
    switch (channel) {
      case 'email':
        return await this.sendEmail(messageData)
      case 'sms':
        return await this.sendSMS(messageData)
      case 'facebook':
        return await this.sendFacebookMessage(messageData)
      case 'instagram':
        return await this.sendInstagramDM(messageData)
      case 'whatsapp':
        return await this.sendWhatsApp(messageData)
      default:
        throw new Error(`Unsupported channel: ${channel}`)
    }
  },

  /**
   * Send Email
   */
  async sendEmail(messageData) {
    try {
      const { to, subject, body, leadId, brokerId } = messageData

      // Use existing email service
      const result = await emailService.sendEmail({
        to,
        subject,
        html: this.formatEmailHTML(body),
        from: messageData.from || 'noreply@usahudhomes.com',
        replyTo: messageData.replyTo
      })

      // Log the communication
      await this.logCommunication({
        leadId,
        brokerId,
        channel: 'email',
        subject,
        content: body,
        status: 'sent',
        sentAt: new Date().toISOString()
      })

      return {
        success: true,
        messageId: result.messageId,
        channel: 'email'
      }
    } catch (error) {
      console.error('Error sending email:', error)
      return {
        success: false,
        error: error.message
      }
    }
  },

  /**
   * Send SMS
   */
  async sendSMS(messageData) {
    try {
      const { to, body, leadId, brokerId } = messageData

      // Call SMS API endpoint
      const response = await fetch('/api/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to,
          message: body,
          from: messageData.from || process.env.TWILIO_PHONE_NUMBER
        })
      })

      const result = await response.json()

      // Log the communication
      await this.logCommunication({
        leadId,
        brokerId,
        channel: 'sms',
        content: body,
        status: result.success ? 'sent' : 'failed',
        sentAt: new Date().toISOString()
      })

      return {
        success: result.success,
        messageId: result.messageId,
        channel: 'sms'
      }
    } catch (error) {
      console.error('Error sending SMS:', error)
      return {
        success: false,
        error: error.message
      }
    }
  },

  /**
   * Send Facebook Messenger message
   */
  async sendFacebookMessage(messageData) {
    try {
      const { to, body, leadId, brokerId } = messageData

      // Call Facebook Messenger API
      const response = await fetch('/api/send-facebook-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientId: to,
          message: body
        })
      })

      const result = await response.json()

      await this.logCommunication({
        leadId,
        brokerId,
        channel: 'facebook',
        content: body,
        status: result.success ? 'sent' : 'failed',
        sentAt: new Date().toISOString()
      })

      return {
        success: result.success,
        messageId: result.messageId,
        channel: 'facebook'
      }
    } catch (error) {
      console.error('Error sending Facebook message:', error)
      return {
        success: false,
        error: error.message
      }
    }
  },

  /**
   * Send Instagram DM
   */
  async sendInstagramDM(messageData) {
    try {
      const { to, body, leadId, brokerId } = messageData

      // Call Instagram API
      const response = await fetch('/api/send-instagram-dm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientId: to,
          message: body
        })
      })

      const result = await response.json()

      await this.logCommunication({
        leadId,
        brokerId,
        channel: 'instagram',
        content: body,
        status: result.success ? 'sent' : 'failed',
        sentAt: new Date().toISOString()
      })

      return {
        success: result.success,
        messageId: result.messageId,
        channel: 'instagram'
      }
    } catch (error) {
      console.error('Error sending Instagram DM:', error)
      return {
        success: false,
        error: error.message
      }
    }
  },

  /**
   * Send WhatsApp message
   */
  async sendWhatsApp(messageData) {
    try {
      const { to, body, leadId, brokerId } = messageData

      // Call WhatsApp Business API
      const response = await fetch('/api/send-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to,
          message: body
        })
      })

      const result = await response.json()

      await this.logCommunication({
        leadId,
        brokerId,
        channel: 'whatsapp',
        content: body,
        status: result.success ? 'sent' : 'failed',
        sentAt: new Date().toISOString()
      })

      return {
        success: result.success,
        messageId: result.messageId,
        channel: 'whatsapp'
      }
    } catch (error) {
      console.error('Error sending WhatsApp:', error)
      return {
        success: false,
        error: error.message
      }
    }
  },

  /**
   * Format email body as HTML
   */
  formatEmailHTML(body) {
    // Convert plain text to HTML with proper formatting
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .content {
            white-space: pre-wrap;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            font-size: 12px;
            color: #666;
          }
        </style>
      </head>
      <body>
        <div class="content">${body.replace(/\n/g, '<br>')}</div>
        <div class="footer">
          <p>This message was sent via USA HUD Homes</p>
          <p>© ${new Date().getFullYear()} USA HUD Homes. All rights reserved.</p>
        </div>
      </body>
      </html>
    `
  },

  /**
   * Log communication to database
   */
  async logCommunication(logData) {
    try {
      // Store in local storage for now (would be database in production)
      const logs = JSON.parse(localStorage.getItem('communication_logs') || '[]')
      logs.push({
        id: Date.now().toString(),
        ...logData,
        createdAt: new Date().toISOString()
      })
      localStorage.setItem('communication_logs', JSON.stringify(logs))
      
      return { success: true }
    } catch (error) {
      console.error('Error logging communication:', error)
      return { success: false, error: error.message }
    }
  },

  /**
   * Get communication history for a lead
   */
  async getCommunicationHistory(leadId) {
    try {
      const logs = JSON.parse(localStorage.getItem('communication_logs') || '[]')
      return logs.filter(log => log.leadId === leadId)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    } catch (error) {
      console.error('Error getting communication history:', error)
      return []
    }
  },

  /**
   * Schedule a message for later
   */
  async scheduleMessage(channel, messageData, scheduledFor) {
    try {
      const scheduledMessages = JSON.parse(localStorage.getItem('scheduled_messages') || '[]')
      
      scheduledMessages.push({
        id: Date.now().toString(),
        channel,
        messageData,
        scheduledFor,
        status: 'pending',
        createdAt: new Date().toISOString()
      })
      
      localStorage.setItem('scheduled_messages', JSON.stringify(scheduledMessages))
      
      return {
        success: true,
        message: 'Message scheduled successfully'
      }
    } catch (error) {
      console.error('Error scheduling message:', error)
      return {
        success: false,
        error: error.message
      }
    }
  },

  /**
   * Get scheduled messages
   */
  async getScheduledMessages(brokerId) {
    try {
      const scheduledMessages = JSON.parse(localStorage.getItem('scheduled_messages') || '[]')
      return scheduledMessages.filter(msg => 
        msg.status === 'pending' && 
        msg.messageData.brokerId === brokerId
      )
    } catch (error) {
      console.error('Error getting scheduled messages:', error)
      return []
    }
  },

  /**
   * Cancel scheduled message
   */
  async cancelScheduledMessage(messageId) {
    try {
      const scheduledMessages = JSON.parse(localStorage.getItem('scheduled_messages') || '[]')
      const updated = scheduledMessages.map(msg => 
        msg.id === messageId ? { ...msg, status: 'cancelled' } : msg
      )
      localStorage.setItem('scheduled_messages', JSON.stringify(updated))
      
      return { success: true }
    } catch (error) {
      console.error('Error cancelling scheduled message:', error)
      return { success: false, error: error.message }
    }
  }
}

export default communicationService
