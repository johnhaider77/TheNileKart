const db = require('./config/database');

async function testDatabaseConnection() {
  console.log('🔍 Testing database connection...');
  console.log('Environment:', process.env.NODE_ENV || 'development');
  
  try {
    // Test basic connection
    const result = await db.query('SELECT NOW() as current_time, version() as pg_version');
    console.log('✅ Database connection successful!');
    console.log('📅 Current time:', result.rows[0].current_time);
    console.log('🐘 PostgreSQL version:', result.rows[0].pg_version);
    
    // Test if database exists and has tables
    const tablesResult = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('📋 Available tables:');
    tablesResult.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    
    if (tablesResult.rows.length === 0) {
      console.log('⚠️  No tables found. You may need to run database migrations.');
    }
    
    // Test user count (if users table exists)
    try {
      const userCount = await db.query('SELECT COUNT(*) as count FROM users');
      console.log(`👥 Total users: ${userCount.rows[0].count}`);
    } catch (error) {
      console.log('ℹ️  Users table not found or not accessible');
    }
    
    console.log('🎉 Database test completed successfully!');
    
  } catch (error) {
    console.error('❌ Database connection failed:');
    console.error('Error:', error.message);
    console.error('Code:', error.code);
    
    if (error.code === 'ENOTFOUND') {
      console.error('💡 Check your database host configuration');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('💡 Check if database is running and security groups allow connection');
    } else if (error.code === '28P01') {
      console.error('💡 Check your database username and password');
    }
  } finally {
    process.exit(0);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT. Closing database connection...');
  process.exit(0);
});

testDatabaseConnection();