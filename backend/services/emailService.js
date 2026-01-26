const nodemailer = require('nodemailer');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env.production if NODE_ENV is production
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
dotenv.config({ path: path.join(__dirname, '..', envFile) });

// Email service for sending password reset codes
class EmailService {
  constructor() {
    this.transporter = null;
    this.isInitialized = false;
    this.initialize();
  }

  async initialize() {
    try {
      // Debug: Log environment variables
      console.log('📧 EMAIL_USER:', process.env.EMAIL_USER ? '✅ SET' : '❌ NOT SET');
      console.log('📧 EMAIL_PASS:', process.env.EMAIL_PASS ? '✅ SET' : '❌ NOT SET');
      console.log('📧 EMAIL_HOST:', process.env.EMAIL_HOST || 'NOT SET');
      console.log('📧 NODE_ENV:', process.env.NODE_ENV || 'NOT SET');
      
      // Try to use environment variables first (for production)
      if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        this.transporter = nodemailer.createTransport({
          service: process.env.EMAIL_SERVICE || 'outlook',
          host: process.env.EMAIL_HOST || 'smtp-mail.outlook.com',
          port: parseInt(process.env.EMAIL_PORT) || 587,
          secure: false,
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
          },
        });
        
        console.log('📧 Email service initialized with configured credentials');
        console.log('📧 Using email service:', process.env.EMAIL_SERVICE || 'outlook');
        this.isInitialized = true;
        return;
      }

      // For development, use console fallback with clear instructions
      console.log('📧 Email service running in development mode');
      console.log('📧 To enable real email sending, set EMAIL_USER and EMAIL_PASS in .env file');
      console.log('📧 Verification codes will be displayed in console');
      
      this.transporter = null;
      this.isInitialized = true;

    } catch (error) {
      console.error('Failed to initialize email service:', error.message);
      this.transporter = null;
      this.isInitialized = true;
    }
  }

  async sendPasswordResetCode(email, code) {
    try {
      if (!this.transporter) {
        return this.consoleFallback(email, code, 'Development mode - email displayed in console');
      }

      const mailOptions = {
        from: process.env.EMAIL_FROM || '"TheNileKart" <no-reply@thenilekart.com>',
        to: email,
        subject: 'Password Reset Code - TheNileKart',
        html: this.getEmailTemplate(code),
        text: `Your password reset code is: ${code}. This code will expire in 15 minutes.`
      };

      const info = await this.transporter.sendMail(mailOptions);
      
      console.log(`📧 Password reset email sent to ${email}`);
      console.log(`📧 Message ID: ${info.messageId}`);

      return {
        success: true,
        messageId: info.messageId,
        previewUrl: null
      };

    } catch (error) {
      console.error('Failed to send password reset email:', error.message);
      return this.consoleFallback(email, code, error.message);
    }
  }

  consoleFallback(email, code, reason) {
    console.log('\n' + '='.repeat(60));
    console.log('📧 PASSWORD RESET CODE FOR: ' + email.toUpperCase());
    console.log('🔑 VERIFICATION CODE: ' + code);
    console.log('⏰ EXPIRES IN: 15 minutes');
    console.log('📋 REASON: ' + reason);
    console.log('='.repeat(60) + '\n');
    
    return {
      success: true,
      messageId: 'console-fallback',
      previewUrl: null,
      fallback: true,
      code: code, // Include code in response for development
      reason: reason
    };
  }

  async sendOTPEmail(email, otp, type = 'signup') {
    try {
      if (!this.transporter) {
        return this.consoleFallbackOTP(email, otp, type, 'Development mode - OTP displayed in console');
      }

      const subject = type === 'signup' ? 'Signup OTP - TheNileKart' : 'OTP Code - TheNileKart';
      const mailOptions = {
        from: process.env.EMAIL_FROM || '"TheNileKart" <no-reply@thenilekart.com>',
        to: email,
        subject: subject,
        html: this.getOTPEmailTemplate(otp, type),
        text: `Your OTP code is: ${otp}. This code will expire in 5 minutes.`
      };

      const info = await this.transporter.sendMail(mailOptions);
      
      console.log(`📧 OTP email sent to ${email}`);
      console.log(`📧 Message ID: ${info.messageId}`);

      return {
        success: true,
        messageId: info.messageId,
        previewUrl: null
      };

    } catch (error) {
      console.error('Failed to send OTP email:', error.message);
      return this.consoleFallbackOTP(email, otp, type, error.message);
    }
  }

  consoleFallbackOTP(email, otp, type, reason) {
    const typeLabel = type === 'signup' ? 'SIGNUP OTP' : 'OTP CODE';
    console.log('\n' + '='.repeat(60));
    console.log(`📧 ${typeLabel} FOR: ` + email.toUpperCase());
    console.log('🔑 OTP CODE: ' + otp);
    console.log('⏰ EXPIRES IN: 5 minutes');
    console.log('📋 REASON: ' + reason);
    console.log('='.repeat(60) + '\n');
    
    return {
      success: true,
      messageId: 'console-fallback',
      previewUrl: null,
      fallback: true,
      otp: otp,
      reason: reason
    };
  }

  getOTPEmailTemplate(otp, type = 'signup') {
    const title = type === 'signup' ? 'Verify Your Email' : 'Verify Your Identity';
    const description = type === 'signup' 
      ? 'Use this code to verify your email and complete your signup process.'
      : 'Use this code to verify your identity.';

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
          <h1 style="color: #007bff; margin: 0;">TheNileKart</h1>
        </div>
        <div style="padding: 30px 20px; background-color: white;">
          <h2 style="color: #333; margin-bottom: 20px;">${title}</h2>
          <p style="color: #666; font-size: 16px; line-height: 1.5;">
            ${description}
          </p>
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <h1 style="font-size: 48px; color: #007bff; margin: 0; letter-spacing: 4px;">${otp}</h1>
          </div>
          <p style="color: #666; font-size: 14px; line-height: 1.5;">
            This code will expire in <strong>5 minutes</strong>. Do not share this code with anyone.
          </p>
          <p style="color: #999; font-size: 12px; line-height: 1.5;">
            If you didn't request this code, please ignore this email.
          </p>
        </div>
        <div style="background-color: #f8f9fa; padding: 15px 20px; text-align: center; color: #999; font-size: 12px;">
          <p style="margin: 0;">This is an automated message from TheNileKart. Please do not reply to this email.</p>
        </div>
      </div>
    `;
  }

  getEmailTemplate(code) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
          <h1 style="color: #007bff; margin: 0;">TheNileKart</h1>
        </div>
        <div style="padding: 30px 20px; background-color: white;">
          <h2 style="color: #333; margin-bottom: 20px;">Password Reset Request</h2>
          <p style="color: #666; font-size: 16px; line-height: 1.5;">
            You have requested to reset your password. Please use the verification code below:
          </p>
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <h1 style="font-size: 36px; color: #007bff; margin: 0; letter-spacing: 3px;">${code}</h1>
          </div>
          <p style="color: #666; font-size: 14px; line-height: 1.5;">
            This code will expire in <strong>15 minutes</strong>. If you didn't request this password reset, please ignore this email.
          </p>
          <p style="color: #666; font-size: 14px; line-height: 1.5;">
            For security reasons, please do not share this code with anyone.
          </p>
        </div>
        <div style="background-color: #f8f9fa; padding: 15px 20px; text-align: center; color: #999; font-size: 12px;">
          <p style="margin: 0;">This is an automated message from TheNileKart. Please do not reply to this email.</p>
        </div>
      </div>
    `;
  }
}

// Create a singleton instance
const emailService = new EmailService();

module.exports = emailService;