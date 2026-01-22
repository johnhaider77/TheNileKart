// Script to add payment status enum values
const db = require('./config/database');

async function addPaymentStatusEnum() {
  try {
    console.log('🔄 Adding payment_failed and payment_cancelled to order_status_enum...');
    
    // PostgreSQL ADD VALUE is idempotent in newer versions, but we can also check first
    const queries = [
      "ALTER TYPE order_status_enum ADD VALUE 'payment_failed' BEFORE 'cancelled'",
      "ALTER TYPE order_status_enum ADD VALUE 'payment_cancelled' BEFORE 'cancelled'"
    ];

    for (const query of queries) {
      try {
        await db.query(query);
        console.log('✅ Executed:', query);
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log('⚠️  Enum value already exists (this is OK)');
        } else {
          throw error;
        }
      }
    }

    // Verify the enum values
    const result = await db.query(`
      SELECT enum_range(NULL::order_status_enum) as enum_values
    `);
    
    console.log('📋 Current order status enum values:', result.rows[0].enum_values);
    console.log('✅ Migration complete!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

addPaymentStatusEnum();
