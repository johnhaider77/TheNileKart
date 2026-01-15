const twilio = require('twilio');
require('dotenv').config();

// SMS service for sending OTP to mobile numbers
class SMSService {
  constructor() {
    this.client = null;
    this.isInitialized = false;
    this.initialize();
  }

  async initialize() {
    try {
      // Check if Twilio credentials are configured
      if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
        this.client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        console.log('📱 SMS service initialized with Twilio credentials');
        this.isInitialized = true;
        return;
      }

      // For development, use console fallback with clear instructions
      console.log('📱 SMS service running in development mode');
      console.log('📱 To enable real SMS sending, set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER in .env file');
      console.log('📱 OTP codes will be displayed in console');
      
      this.client = null;
      this.isInitialized = true;

    } catch (error) {
      console.error('Failed to initialize SMS service:', error.message);
      this.client = null;
      this.isInitialized = true;
    }
  }

  // Format phone number to international format for UAE
  formatUAEPhoneNumber(phone) {
    // Remove any non-digit characters
    const cleanPhone = phone.replace(/\D/g, '');
    
    // UAE country code is +971
    if (cleanPhone.startsWith('971')) {
      return '+' + cleanPhone;
    } else if (cleanPhone.startsWith('0') && cleanPhone.length === 10) {
      // Convert local format (0505523717) to international (+971505523717)
      return '+971' + cleanPhone.substring(1);
    } else if (cleanPhone.length === 9) {
      // Assume it's a local number without leading 0 (505523717)
      return '+971' + cleanPhone;
    }
    
    // Return as is if already in correct format or unknown format
    return phone.startsWith('+') ? phone : '+' + cleanPhone;
  }

  // Validate UAE phone number
  isValidUAEPhoneNumber(phone) {
    const clean = phone.replace(/\D/g, '');
    
    // UAE mobile numbers can be:
    // - 0505523717 (10 digits starting with 05, 06, 07, 09)
    // - 505523717 (9 digits starting with 5, 6, 7, 9)
    // - +971505523717 (starting with +971)
    // - 971505523717 (starting with 971)
    
    // Check different valid UAE phone formats
    if (clean.startsWith('971') && clean.length === 12) {
      // +971XXXXXXXXX format
      const localPart = clean.substring(3);
      return /^[56789]\d{8}$/.test(localPart);
    } else if (clean.startsWith('0') && clean.length === 10) {
      // 05XXXXXXXX format  
      return /^0[56789]\d{8}$/.test(clean);
    } else if (clean.length === 9) {
      // 5XXXXXXXX format (without leading 0)
      return /^[56789]\d{8}$/.test(clean);
    }
    
    return false;
  }

  async sendOTP(phoneNumber, code) {
    try {
      // Validate UAE phone number
      if (!this.isValidUAEPhoneNumber(phoneNumber)) {
        throw new Error('Invalid UAE phone number format. Please use format: +971XXXXXXXXX or 05XXXXXXXX');
      }

      const formattedPhone = this.formatUAEPhoneNumber(phoneNumber);

      if (!this.client) {
        return this.consoleFallback(formattedPhone, code, 'Development mode - SMS displayed in console');
      }

      if (!process.env.TWILIO_PHONE_NUMBER) {
        return this.consoleFallback(formattedPhone, code, 'TWILIO_PHONE_NUMBER not configured');
      }

      const message = `Your TheNileKart password reset code is: ${code}. This code expires in 15 minutes. Do not share this code with anyone.`;

      const result = await this.client.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: formattedPhone
      });

      console.log(`📱 OTP SMS sent to ${formattedPhone}`);
      console.log(`📱 Message SID: ${result.sid}`);
      console.log(`📱 Status: ${result.status}`);

      return {
        success: true,
        messageId: result.sid,
        status: result.status,
        to: formattedPhone
      };

    } catch (error) {
      console.error('Failed to send OTP SMS:', error.message);
      
      // Still provide fallback for development
      const formattedPhone = this.formatUAEPhoneNumber(phoneNumber);
      return this.consoleFallback(formattedPhone, code, `SMS sending failed: ${error.message}`);
    }
  }

  consoleFallback(phoneNumber, code, reason) {
    console.log('\n' + '='.repeat(60));
    console.log('📱 OTP SMS FOR: ' + phoneNumber.toUpperCase());
    console.log('🔑 VERIFICATION CODE: ' + code);
    console.log('⏰ EXPIRES IN: 15 minutes');
    console.log('📋 REASON: ' + reason);
    console.log('📱 MESSAGE: Your TheNileKart password reset code is: ' + code + '. This code expires in 15 minutes. Do not share this code with anyone.');
    console.log('='.repeat(60) + '\n');
    
    return {
      success: true,
      messageId: 'console-fallback',
      fallback: true,
      code: code, // Include code in response for development
      reason: reason,
      to: phoneNumber
    };
  }

  // Get message status (useful for checking delivery)
  async getMessageStatus(messageId) {
    try {
      if (!this.client || messageId === 'console-fallback') {
        return { status: 'development-mode', delivered: true };
      }

      const message = await this.client.messages(messageId).fetch();
      
      return {
        status: message.status,
        errorCode: message.errorCode,
        errorMessage: message.errorMessage,
        delivered: ['delivered', 'sent'].includes(message.status)
      };
      
    } catch (error) {
      console.error('Failed to get message status:', error.message);
      return { status: 'unknown', delivered: false, error: error.message };
    }
  }

  // Test connection (useful for setup verification)
  async testConnection() {
    try {
      if (!this.client) {
        return { success: false, message: 'SMS service not configured (development mode)' };
      }

      // Try to fetch account info as a connection test
      const account = await this.client.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();
      
      return {
        success: true,
        message: 'SMS service connected successfully',
        account: {
          sid: account.sid,
          status: account.status,
          friendlyName: account.friendlyName
        }
      };
      
    } catch (error) {
      return {
        success: false,
        message: `SMS service connection failed: ${error.message}`
      };
    }
  }
}

// Export singleton instance
module.exports = new SMSService();