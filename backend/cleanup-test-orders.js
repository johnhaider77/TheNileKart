#!/usr/bin/env node

/**
 * Cleanup Script - Remove all test orders from database
 * This clears the Financial Outlay section in seller dashboard
 */

const db = require('./config/database');

async function cleanupTestOrders() {
  let client;
  try {
    client = await db.getClient();

    console.log('🗑️  Cleaning up test orders from database...\n');

    // Get current order count
    const beforeCount = await client.query('SELECT COUNT(*) as count FROM orders');
    console.log(`📊 Current orders in database: ${beforeCount.rows[0].count}`);

    // Delete all orders and their items (CASCADE will handle it)
    const deleteResult = await client.query('DELETE FROM orders');
    console.log(`✅ Deleted ${deleteResult.rowCount} orders`);

    // Reset order ID sequence to start fresh
    await client.query('ALTER SEQUENCE orders_id_seq RESTART WITH 1');
    console.log('✅ Reset order ID sequence');

    // Verify deletion
    const afterCount = await client.query('SELECT COUNT(*) as count FROM orders');
    console.log(`📊 Orders after cleanup: ${afterCount.rows[0].count}`);

    // Also verify order_items is empty
    const itemsCount = await client.query('SELECT COUNT(*) as count FROM order_items');
    console.log(`📊 Order items after cleanup: ${itemsCount.rows[0].count}`);

    console.log('\n✅ ✅ ✅ All test orders have been successfully removed!');
    console.log('Financial Outlay section will now be empty.\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error cleaning up test orders:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    if (client) {
      client.release();
    }
  }
}

cleanupTestOrders();
