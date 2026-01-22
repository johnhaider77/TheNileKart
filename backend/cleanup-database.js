#!/usr/bin/env node

/**
 * Database Cleanup Script - Fresh Start
 * Keeps only specified users and their products/banners/offers
 * All other seller data is deleted
 * 
 * This script uses the environment configuration from the backend
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment configuration (same as backend)
const env = process.env.NODE_ENV || 'development';
console.log('🔧 Loading database config for environment:', env);

// Try .env first (most common), then .env.production
let envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
    envPath = path.join(__dirname, '.env.production');
}

console.log('📂 Loading from:', envPath);
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
} else {
    console.warn('⚠️  No .env file found, using environment variables only');
}

// Database configuration from environment
const dbConfig = {
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'thenilekart'
};

// Check if using RDS (enable SSL for RDS)
const isRDS = (dbConfig.host || '').includes('rds.amazonaws.com') || (dbConfig.host || '').includes('rds');
if (isRDS) {
    dbConfig.ssl = { rejectUnauthorized: false };
    console.log('🔒 RDS detected, SSL enabled');
}

console.log('📊 Database Config:');
console.log(`   Host: ${dbConfig.host}`);
console.log(`   Database: ${dbConfig.database}`);
console.log(`   User: ${dbConfig.user}`);
console.log(`   Port: ${dbConfig.port}`);
console.log(`   SSL: ${dbConfig.ssl ? 'YES' : 'NO'}\n`);

const USERS_TO_KEEP = [
    'johnhader77@gmail.com',
    'maryam.zaidi2904@gmail.com'
];

async function runCleanup() {
    const client = new Client(dbConfig);
    
    try {
        console.log('🔗 Connecting to database...');
        await client.connect();
        console.log('✅ Connected to database');
        
        console.log('\n📋 Starting database cleanup...');
        console.log(`Users to keep: ${USERS_TO_KEEP.join(', ')}\n`);
        
        // Get the user IDs to keep
        const keepUsersQuery = `
            SELECT id, email FROM users WHERE email = ANY($1)
        `;
        const keepUsersResult = await client.query(keepUsersQuery, [USERS_TO_KEEP]);
        
        if (keepUsersResult.rows.length === 0) {
            console.log('⚠️  Warning: No users found with specified emails');
            console.log('Users in database:');
            const allUsersResult = await client.query('SELECT id, email, user_type FROM users LIMIT 10');
            allUsersResult.rows.forEach(user => {
                console.log(`   - ID: ${user.id}, Email: ${user.email}, Type: ${user.user_type}`);
            });
            return;
        }
        
        const userIdsToKeep = keepUsersResult.rows.map(u => u.id);
        console.log(`✅ Found users to keep:`);
        keepUsersResult.rows.forEach(user => {
            console.log(`   - ID: ${user.id}, Email: ${user.email}`);
        });
        console.log('');
        
        // Step 1: Delete product_offers for products NOT owned by these users
        console.log('🗑️  Deleting product_offers for other sellers products...');
        const deleteProductOffersResult = await client.query(`
            DELETE FROM product_offers
            WHERE product_id IN (
                SELECT id FROM products 
                WHERE seller_id NOT IN (${userIdsToKeep.join(',')})
            )
        `);
        console.log(`   Deleted ${deleteProductOffersResult.rowCount} product_offers`);
        
        // Step 2: Delete order_items for products NOT owned by these users
        console.log('🗑️  Deleting order_items for other sellers products...');
        const deleteOrderItemsResult = await client.query(`
            DELETE FROM order_items
            WHERE product_id IN (
                SELECT id FROM products 
                WHERE seller_id NOT IN (${userIdsToKeep.join(',')})
            )
        `);
        console.log(`   Deleted ${deleteOrderItemsResult.rowCount} order_items`);
        
        // Step 3: Delete orphaned orders (orders with no items)
        console.log('🗑️  Deleting orphaned orders...');
        const deleteOrdersResult = await client.query(`
            DELETE FROM orders
            WHERE id NOT IN (
                SELECT DISTINCT order_id FROM order_items
            )
        `);
        console.log(`   Deleted ${deleteOrdersResult.rowCount} orphaned orders`);
        
        // Step 4: Delete cart items for products NOT owned by these users
        console.log('🗑️  Deleting cart_items for other sellers products...');
        const deleteCartItemsResult = await client.query(`
            DELETE FROM cart_items
            WHERE product_id IN (
                SELECT id FROM products 
                WHERE seller_id NOT IN (${userIdsToKeep.join(',')})
            )
        `);
        console.log(`   Deleted ${deleteCartItemsResult.rowCount} cart_items`);
        
        // Step 5: Delete products NOT owned by these users
        console.log('🗑️  Deleting products by other sellers...');
        const deleteProductsResult = await client.query(`
            DELETE FROM products
            WHERE seller_id NOT IN (${userIdsToKeep.join(',')})
        `);
        console.log(`   Deleted ${deleteProductsResult.rowCount} products`);
        
        // Step 6: Delete banners created by other sellers
        console.log('🗑️  Deleting banners by other sellers...');
        const deleteBannersResult = await client.query(`
            DELETE FROM banners
            WHERE created_by NOT IN (${userIdsToKeep.join(',')})
        `);
        console.log(`   Deleted ${deleteBannersResult.rowCount} banners`);
        
        // Step 7: Delete offers created by other sellers
        console.log('🗑️  Deleting product_offers for other sellers offers...');
        const deleteOfferProductsResult = await client.query(`
            DELETE FROM product_offers
            WHERE offer_code IN (
                SELECT offer_code FROM offers 
                WHERE created_by NOT IN (${userIdsToKeep.join(',')})
            )
        `);
        console.log(`   Deleted ${deleteOfferProductsResult.rowCount} product_offers for offers`);
        
        console.log('🗑️  Deleting offers by other sellers...');
        const deleteOffersResult = await client.query(`
            DELETE FROM offers
            WHERE created_by NOT IN (${userIdsToKeep.join(',')})
        `);
        console.log(`   Deleted ${deleteOffersResult.rowCount} offers`);
        
        // Step 8: Delete seller accounts except the two specified
        console.log('🗑️  Deleting seller accounts (keeping specified users)...');
        const deleteSellersResult = await client.query(`
            DELETE FROM users
            WHERE user_type = 'seller' 
            AND id NOT IN (${userIdsToKeep.join(',')})
        `);
        console.log(`   Deleted ${deleteSellersResult.rowCount} seller accounts`);
        
        // Summary
        console.log('\n✅ Database cleanup completed successfully!\n');
        console.log('📊 Summary:');
        console.log(`   - Product offers deleted: ${deleteProductOffersResult.rowCount}`);
        console.log(`   - Order items deleted: ${deleteOrderItemsResult.rowCount}`);
        console.log(`   - Orders deleted: ${deleteOrdersResult.rowCount}`);
        console.log(`   - Cart items deleted: ${deleteCartItemsResult.rowCount}`);
        console.log(`   - Products deleted: ${deleteProductsResult.rowCount}`);
        console.log(`   - Banners deleted: ${deleteBannersResult.rowCount}`);
        console.log(`   - Offers deleted: ${deleteOffersResult.rowCount}`);
        console.log(`   - Seller accounts deleted: ${deleteSellersResult.rowCount}`);
        
        console.log('\n✅ Kept data from users:');
        keepUsersResult.rows.forEach(user => {
            console.log(`   - ${user.email}`);
        });
        
    } catch (error) {
        console.error('❌ Error during cleanup:', error.message);
        process.exit(1);
    } finally {
        await client.end();
        console.log('\n🔌 Database connection closed');
    }
}

// Run the cleanup
runCleanup();
