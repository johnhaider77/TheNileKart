#!/usr/bin/env node

/**
 * Complete Database Reset Script
 * Deletes ALL data: users, products, banners, offers, orders, addresses, cart items
 * Fresh start - empty database ready for new data
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

async function runCompleteReset() {
    const client = new Client(dbConfig);
    
    try {
        console.log('🔗 Connecting to database...');
        await client.connect();
        console.log('✅ Connected to database\n');
        
        console.log('⚠️  WARNING: COMPLETE DATABASE RESET IN PROGRESS');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        
        // Disable foreign key checks temporarily
        await client.query('SET session_replication_role = replica');
        console.log('✅ Disabled foreign key constraints temporarily\n');
        
        // Delete all data in order of dependencies (reverse of creation)
        const tables = [
            'product_offers',
            'trending_products',
            'order_items',
            'orders',
            'cart_items',
            'product_images',
            'product_sizes',
            'products',
            'addresses',
            'banners',
            'offers',
            'users',
            'metrics_tracking'
        ];
        
        let totalRowsDeleted = 0;
        
        console.log('🗑️  Deleting data from tables...\n');
        
        for (const table of tables) {
            try {
                const result = await client.query(`TRUNCATE TABLE ${table} CASCADE`);
                const deletedRows = result.rowCount || 0;
                totalRowsDeleted += deletedRows;
                console.log(`   ✓ ${table.padEnd(25)} - truncated`);
            } catch (error) {
                if (error.message.includes('does not exist')) {
                    console.log(`   ⊘ ${table.padEnd(25)} - table not found (skipped)`);
                } else {
                    console.error(`   ✗ ${table.padEnd(25)} - ERROR: ${error.message}`);
                }
            }
        }
        
        // Re-enable foreign key checks
        await client.query('SET session_replication_role = default');
        console.log('\n✅ Re-enabled foreign key constraints');
        
        // Verify all tables are empty
        console.log('\n📋 Verification - Checking table counts:\n');
        
        let allEmpty = true;
        for (const table of tables) {
            try {
                const countResult = await client.query(`SELECT COUNT(*) as count FROM ${table}`);
                const count = parseInt(countResult.rows[0].count);
                const status = count === 0 ? '✓ EMPTY' : `⚠️  ${count} rows`;
                console.log(`   ${table.padEnd(25)} - ${status}`);
                if (count > 0) allEmpty = false;
            } catch (error) {
                // Table might not exist, skip
            }
        }
        
        console.log('\n' + '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        if (allEmpty) {
            console.log('\n✅ COMPLETE DATABASE RESET SUCCESSFUL!\n');
            console.log('📝 Summary:');
            console.log('   - All users deleted ✓');
            console.log('   - All products deleted ✓');
            console.log('   - All banners deleted ✓');
            console.log('   - All offers deleted ✓');
            console.log('   - All orders deleted ✓');
            console.log('   - All order items deleted ✓');
            console.log('   - All addresses deleted ✓');
            console.log('   - All cart items deleted ✓');
            console.log('   - All product images deleted ✓');
            console.log('   - All product sizes deleted ✓');
            console.log('   - All metrics data deleted ✓');
            console.log('\n✨ Database is now completely empty and ready for fresh data!');
        } else {
            console.log('\n⚠️  WARNING: Some tables still contain data');
        }
        
    } catch (error) {
        console.error('❌ Error during reset:', error.message);
        process.exit(1);
    } finally {
        await client.end();
        console.log('\n🔌 Database connection closed');
    }
}

// Run the complete reset
runCompleteReset();
