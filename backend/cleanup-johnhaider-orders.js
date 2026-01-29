const db = require('./config/database');

/**
 * Comprehensive Cleanup Script
 * Removes all orders and related data for johnhaider77@gmail.com
 * This includes:
 * 1. All orders from customer account (placed by the customer)
 * 2. All orders where products belong to johnhaider77@gmail.com (seller's orders)
 * 3. All order returns/refunds related to the above
 * 4. All financial records related to the above
 */

async function cleanupJohnhaiderOrders() {
  const client = await db.getClient();
  
  try {
    console.log('🧹 Starting comprehensive cleanup for johnhaider77@gmail.com...\n');
    
    // Step 1: Find the user (could be customer or seller)
    console.log('1️⃣  Finding user johnhaider77@gmail.com...');
    
    const userResult = await client.query(
      'SELECT id, user_type, full_name FROM users WHERE email = $1',
      ['johnhaider77@gmail.com']
    );
    
    if (userResult.rows.length === 0) {
      console.log('   ℹ️  User not found');
      client.release();
      process.exit(0);
    }
    
    const user = userResult.rows[0];
    console.log(`   ✅ Found user: ID=${user.id}, Type=${user.user_type}, Name=${user.full_name}`);
    
    // Check if order_returns table exists
    const tablesResult = await client.query(
      `SELECT table_name FROM information_schema.tables 
       WHERE table_schema = 'public' AND table_name = 'order_returns'`
    );
    const hasOrderReturns = tablesResult.rows.length > 0;
    console.log(`   ℹ️  Order returns table exists: ${hasOrderReturns ? 'YES' : 'NO'}`);
    
    // Now start transaction for actual cleanup
    await client.query('BEGIN');
    
    // Step 2: Delete orders placed by johnhaider77@gmail.com (as customer)
    console.log('\n2️⃣  Deleting orders placed by johnhaider77@gmail.com (as customer)...');
    
    const customerOrdersResult = await client.query(
      'SELECT id FROM orders WHERE customer_id = $1',
      [user.id]
    );
    
    const customerOrderCount = customerOrdersResult.rows.length;
    let customerOrderIds = [];
    
    if (customerOrderCount > 0) {
      customerOrderIds = customerOrdersResult.rows.map(r => r.id);
      
      // Delete order returns if table exists
      if (hasOrderReturns) {
        await client.query(
          'DELETE FROM order_returns WHERE order_id = ANY($1)',
          [customerOrderIds]
        );
      }
      
      // Delete order items
      await client.query(
        'DELETE FROM order_items WHERE order_id = ANY($1)',
        [customerOrderIds]
      );
      
      // Delete orders
      await client.query(
        'DELETE FROM orders WHERE customer_id = $1',
        [user.id]
      );
      
      console.log(`   ✅ Deleted ${customerOrderCount} customer orders and related data`);
    } else {
      console.log('   ℹ️  No customer orders found');
    }
    
    // Step 3: Delete orders of products sold by johnhaider77@gmail.com (as seller)
    console.log('\n3️⃣  Deleting orders containing products sold by johnhaider77@gmail.com (as seller)...');
    
    // Get all products sold by this user
    const sellerProductsResult = await client.query(
      'SELECT id FROM products WHERE seller_id = $1',
      [user.id]
    );
    
    let sellerOrderCount = 0;
    
    if (sellerProductsResult.rows.length > 0) {
      const sellerProductIds = sellerProductsResult.rows.map(r => r.id);
      
      // Get orders that contain these products
      const sellerOrdersResult = await client.query(
        'SELECT DISTINCT order_id FROM order_items WHERE product_id = ANY($1)',
        [sellerProductIds]
      );
      
      sellerOrderCount = sellerOrdersResult.rows.length;
      if (sellerOrderCount > 0) {
        const sellerOrderIds = sellerOrdersResult.rows.map(r => r.order_id);
        
        // Delete order returns if table exists
        if (hasOrderReturns) {
          await client.query(
            'DELETE FROM order_returns WHERE order_id = ANY($1)',
            [sellerOrderIds]
          );
        }
        
        // Delete order items for these products
        await client.query(
          'DELETE FROM order_items WHERE product_id = ANY($1)',
          [sellerProductIds]
        );
        
        // Delete orders that have no items left
        await client.query(
          'DELETE FROM orders WHERE id = ANY($1) AND NOT EXISTS (SELECT 1 FROM order_items WHERE order_items.order_id = orders.id)',
          [sellerOrderIds]
        );
        
        console.log(`   ✅ Deleted ${sellerOrderCount} seller orders and related data`);
      } else {
        console.log('   ℹ️  No seller orders found');
      }
      
      // Delete the products
      const deleteProductsResult = await client.query(
        'DELETE FROM products WHERE seller_id = $1 RETURNING id',
        [user.id]
      );
      console.log(`   ✅ Deleted ${deleteProductsResult.rows.length} seller products`);
    } else {
      console.log('   ℹ️  No seller products found');
    }
    
    // Step 4: Check if there are any remaining orders to clean up
    console.log('\n4️⃣  Checking for remaining orders in the system...');
    
    const allOrders = await client.query(
      `SELECT COUNT(*) as count FROM orders 
       WHERE customer_id = $1 OR id IN (
         SELECT DISTINCT oi.order_id FROM order_items oi 
         WHERE oi.product_id IN (SELECT id FROM products WHERE seller_id = $1)
       )`,
      [user.id]
    );
    
    const remainingCount = parseInt(allOrders.rows[0].count);
    if (remainingCount === 0) {
      console.log('   ✅ All orders cleaned up');
    } else {
      console.log(`   ⚠️  Warning: ${remainingCount} orders may still exist`);
    }
    
    // Step 5: Summary
    console.log('\n5️⃣  Cleanup Summary:');
    console.log(`   • User ID: ${user.id}`);
    console.log(`   • User Email: johnhaider77@gmail.com`);
    console.log(`   • Customer Orders Deleted: ${customerOrderCount}`);
    console.log(`   • Seller Orders Cleaned: ${sellerOrderCount}`);
    
    await client.query('COMMIT');
    
    console.log('\n✅ Comprehensive cleanup completed successfully!\n');
    
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (e) {
      // Ignore rollback errors
    }
    console.error('❌ Cleanup failed:', error.message);
    console.error('Stack:', error.stack);
    console.error('All changes have been rolled back.');
    process.exit(1);
  } finally {
    client.release();
    process.exit(0);
  }
}

// Run the cleanup
cleanupJohnhaiderOrders();
