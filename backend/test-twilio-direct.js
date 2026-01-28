const twilio = require('twilio');
require('dotenv').config();

async function testTwilio() {
  console.log('\n🔍 Testing Twilio Configuration...\n');

  // Check environment variables
  console.log('📋 Environment Variables:');
  console.log(`  TWILIO_ACCOUNT_SID: ${process.env.TWILIO_ACCOUNT_SID ? process.env.TWILIO_ACCOUNT_SID.substring(0, 8) + '...' : 'MISSING'}`);
  console.log(`  TWILIO_AUTH_TOKEN: ${process.env.TWILIO_AUTH_TOKEN ? process.env.TWILIO_AUTH_TOKEN.substring(0, 8) + '...' : 'MISSING'}`);
  console.log(`  TWILIO_PHONE_NUMBER: ${process.env.TWILIO_PHONE_NUMBER || 'MISSING'}`);

  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    console.error('❌ Missing Twilio credentials!');
    process.exit(1);
  }

  try {
    // Initialize client
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    console.log('\n✅ Twilio client initialized');

    // Test account access
    console.log('\n🔍 Testing account access...');
    const account = await client.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();
    console.log(`  ✅ Account Status: ${account.status}`);
    console.log(`  ✅ Account Name: ${account.friendlyName}`);

    // Test available phone numbers
    console.log('\n🔍 Testing phone numbers...');
    const phoneNumbers = await client.incomingPhoneNumbers.list({ limit: 5 });
    console.log(`  ✅ Found ${phoneNumbers.length} phone numbers:`);
    phoneNumbers.forEach(pn => {
      console.log(`    - ${pn.phoneNumber} (${pn.friendlyName})`);
    });

    // Test sending SMS to the test number
    console.log('\n🔍 Attempting test SMS...');
    const testPhone = '+971505523717';
    const testCode = '123456';
    
    try {
      const message = await client.messages.create({
        body: `Test OTP: ${testCode}`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: testPhone
      });

      console.log(`✅ SMS sent successfully!`);
      console.log(`  Message SID: ${message.sid}`);
      console.log(`  Status: ${message.status}`);
      console.log(`  To: ${message.to}`);
      console.log(`  From: ${message.from}`);
    } catch (smsError) {
      console.error(`❌ SMS send failed!`);
      console.error(`  Error Code: ${smsError.code}`);
      console.error(`  Message: ${smsError.message}`);
      console.error(`  Full Error:`, smsError);
    }

  } catch (error) {
    console.error('❌ Twilio test failed:');
    console.error(`  Error: ${error.message}`);
    console.error(`  Code: ${error.code}`);
    console.error(`  Status: ${error.status}`);
    console.error('\n📝 Full Error:');
    console.error(error);
    process.exit(1);
  }
}

testTwilio();
