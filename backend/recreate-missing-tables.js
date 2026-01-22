#!/usr/bin/env node

/**
 * Recreate missing tables after database reset
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment from current directory
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
}

const dbConfig = {
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'thenilekart'
};

const isRDS = (dbConfig.host || '').includes('rds');
if (isRDS) {
    dbConfig.ssl = { rejectUnauthorized: false };
}

async function recreateTables() {
    const client = new Client(dbConfig);
    
    try {
        console.log('🔗 Connecting to database...');
        await client.connect();
        console.log('✅ Connected\n');
        
        console.log('📋 Creating user_sessions table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS user_sessions (
                id SERIAL PRIMARY KEY,
                session_id VARCHAR(50) UNIQUE NOT NULL,
                user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                email VARCHAR(255),
                phone VARCHAR(20),
                ip_address VARCHAR(50),
                user_agent TEXT,
                is_active BOOLEAN DEFAULT true,
                last_activity TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(session_id)
            )
        `);
        console.log('✅ user_sessions table created');
        
        console.log('📋 Creating metrics_tracking table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS metrics_tracking (
                id SERIAL PRIMARY KEY,
                session_id VARCHAR(50) REFERENCES user_sessions(session_id) ON DELETE CASCADE,
                page VARCHAR(100),
                action VARCHAR(100),
                product_id INTEGER,
                order_id INTEGER,
                timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ metrics_tracking table created');
        
        console.log('📋 Creating indexes...');
        await client.query('CREATE INDEX IF NOT EXISTS idx_user_sessions_id ON user_sessions(session_id)');
        await client.query('CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id)');
        await client.query('CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(is_active)');
        await client.query('CREATE INDEX IF NOT EXISTS idx_metrics_session ON metrics_tracking(session_id)');
        await client.query('CREATE INDEX IF NOT EXISTS idx_metrics_page ON metrics_tracking(page)');
        await client.query('CREATE INDEX IF NOT EXISTS idx_metrics_product ON metrics_tracking(product_id)');
        console.log('✅ Indexes created');
        
        console.log('\n✅ All missing tables recreated successfully!');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    } finally {
        await client.end();
        console.log('🔌 Connection closed');
    }
}

recreateTables();
