const db = require('./config/database');

/**
 * Database Cleanup Script
 * Removes test data created during development:
 * 1. All orders for johnhaider77@gmail.com
 * 2. All products with names starting with TestProduct
 * 3. All customer users who signed up today
 */

async function cleanupTestData() {
  const client = await db.getClient();
  
  try {
    await client.query('BEGIN');
    
    console.log('🧹 Starting database cleanup...\n');
    
    // 1. Delete orders for johnhaider77@gmail.com
    console.log('1️⃣  Deleting orders for johnhaider77@gmail.com...');
    
    const userResult = await client.query(
      'SELECT id FROM users WHERE email = $1',
      ['johnhaider77@gmail.com']
    );
    
    if (userResult.rows.length > 0) {
      const userId = userResult.rows[0].id;
      console.log(`   Found user ID: ${userId}`);
      
      // Get order IDs to delete
      const ordersResult = await client.query(
        'SELECT id FROM orders WHERE customer_id = $1',
        [userId]
      );
      
      const orderCount = ordersResult.rows.length;
      
      if (orderCount > 0) {
        const orderIds = ordersResult.rows.map(r => r.id);
        
        // Delete order_items first
        await client.query(
          'DELETE FROM order_items WHERE order_id = ANY($1)',
          [orderIds]
        );
        
        // Delete orders
        await client.query(
          'DELETE FROM orders WHERE customer_id = $1',
          [userId]
        );
        
        console.log(`   ✅ Deleted ${orderCount} orders and their items`);
      } else {
        console.log('   ℹ️  No orders found for this user');
      }
    } else {
      console.log('   ℹ️  User not found');
    }
    
    // 2. Delete products with names starting with TestProduct
    console.log('\n2️⃣  Deleting products with names starting with TestProduct...');
    
    const productsResult = await client.query(
      `SELECT id FROM products WHERE name LIKE $1 OR product_id LIKE $2`,
      ['TestProduct%', 'TestProduct%']
    );
    
    const productCount = productsResult.rows.length;
    
    if (productCount > 0) {
      const productIds = productsResult.rows.map(r => r.id);
      
      // Delete order_items that reference these products
      await client.query(
        'DELETE FROM order_items WHERE product_id = ANY($1)',
        [productIds]
      );
      
      // Delete products
      await client.query(
        'DELETE FROM products WHERE id = ANY($1)',
        [productIds]
      );
      
      console.log(`   ✅ Deleted ${productCount} test products and their order references`);
    } else {
      console.log('   ℹ️  No test products found');
    }
    
    // 3. Delete customer users who signed up today
    console.log('\n3️⃣  Deleting customer users who signed up today...');
    
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    
    const customersResult = await client.query(
      `SELECT id FROM users WHERE user_type = $1 AND created_at >= $2 AND created_at < $3`,
      ['customer', todayStart, todayEnd]
    );
    
    const customerCount = customersResult.rows.length;
    
    if (customerCount > 0) {
      const customerIds = customersResult.rows.map(r => r.id);
      
      // Delete their orders and order_items
      const customerOrdersResult = await client.query(
        'SELECT id FROM orders WHERE customer_id = ANY($1)',
        [customerIds]
      );
      
      if (customerOrdersResult.rows.length > 0) {
        const orderIds = customerOrdersResult.rows.map(r => r.id);
        await client.query(
          'DELETE FROM order_items WHERE order_id = ANY($1)',
          [orderIds]
        );
        await client.query(
          'DELETE FROM orders WHERE id = ANY($1)',
          [orderIds]
        );
      }
      
      // Delete their addresses
      await client.query(
        'DELETE FROM user_addresses WHERE user_id = ANY($1)',
        [customerIds]
      );
      
      // Delete the customers
      await client.query(
        'DELETE FROM users WHERE id = ANY($1)',
        [customerIds]
      );
      
      console.log(`   ✅ Deleted ${customerCount} customer users and their related data`);
    } else {
      console.log('   ℹ️  No customers signed up today');
    }
    
    await client.query('COMMIT');
    
    console.log('\n✅ Database cleanup completed successfully!\n');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Cleanup failed:', error.message);
    console.error('All changes have been rolled back.');
    process.exit(1);
  } finally {
    client.release();
    process.exit(0);
  }
}

// Run the cleanup
cleanupTestData();
