const db = require('./config/database');

/**
 * Migration: Create portal_status table for maintenance mode
 * Allows control of customer and seller portal availability
 */

async function createPortalStatusTable() {
  const client = await db.getClient();
  
  try {
    console.log('🚀 Creating portal_status table...\n');
    
    // Check if table exists
    const tableExists = await client.query(
      `SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'portal_status'
      )`
    );
    
    if (tableExists.rows[0].exists) {
      console.log('ℹ️  portal_status table already exists');
      client.release();
      process.exit(0);
    }
    
    // Create the table
    await client.query(`
      CREATE TABLE portal_status (
        id SERIAL PRIMARY KEY,
        customer_portal_available BOOLEAN DEFAULT true,
        seller_portal_available BOOLEAN DEFAULT true,
        maintenance_message TEXT DEFAULT 'The site is currently under maintenance. Please check back soon.',
        last_updated_by VARCHAR(255),
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('✅ Created portal_status table');
    
    // Insert default record
    await client.query(`
      INSERT INTO portal_status (customer_portal_available, seller_portal_available, last_updated_by)
      VALUES (true, true, 'system')
    `);
    
    console.log('✅ Inserted default portal status record');
    console.log('\n🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    client.release();
    process.exit(0);
  }
}

// Run the migration
createPortalStatusTable();
