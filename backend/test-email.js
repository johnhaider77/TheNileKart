const nodemailer = require('nodemailer');
require('dotenv').config();

console.log('🔍 Email Environment Variables:');
console.log('EMAIL_USER:', process.env.EMAIL_USER);
console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? '[CONFIGURED]' : '[NOT SET]');
console.log('EMAIL_SERVICE:', process.env.EMAIL_SERVICE);
console.log('EMAIL_HOST:', process.env.EMAIL_HOST);
console.log('EMAIL_PORT:', process.env.EMAIL_PORT);

async function testEmailConnection() {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.log('❌ EMAIL_USER or EMAIL_PASS not configured in .env');
      return;
    }

    console.log('🔧 Creating email transporter...');
    const transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || 'gmail',
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    console.log('📧 Testing email connection...');
    await transporter.verify();
    console.log('✅ Email connection successful!');

    console.log('📤 Sending test email...');
    const result = await transporter.sendMail({
      from: process.env.EMAIL_FROM || '"TheNileKart" <no-reply@thenilekart.com>',
      to: 'johnhaider77@gmail.com',
      subject: 'Test Email - Password Reset Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Password Reset Code</h2>
          <p>Your verification code is: <strong style="font-size: 24px; color: #007bff;">123456</strong></p>
          <p>This is a test email to verify email functionality.</p>
          <p>Best regards,<br>TheNileKart Team</p>
        </div>
      `,
    });

    console.log('✅ Test email sent successfully!');
    console.log('Message ID:', result.messageId);

  } catch (error) {
    console.error('❌ Email test failed:', error.message);
    if (error.code === 'EAUTH') {
      console.log('🔑 Authentication failed. Please check:');
      console.log('   - Email address is correct');
      console.log('   - App password is correct (not regular password)');
      console.log('   - 2FA is enabled on Gmail account');
      console.log('   - App-specific password is generated');
    }
  }
}

testEmailConnection();