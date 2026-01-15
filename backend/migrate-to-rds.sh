#!/bin/bash
# Database Migration Script for RDS PostgreSQL
# Run this script to set up the database schema on RDS

echo "🚀 Starting database migration to RDS PostgreSQL..."

# Load environment variables
source .env.production

# Test connection first
echo "🔍 Testing database connection..."
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d postgres -c "SELECT version();"

if [ $? -eq 0 ]; then
    echo "✅ Database connection successful!"
else
    echo "❌ Database connection failed. Please check your credentials and security groups."
    exit 1
fi

# Create database if it doesn't exist
echo "📦 Creating database if it doesn't exist..."
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d postgres -c "CREATE DATABASE $DB_NAME;"

# Run schema migration
echo "🏗️  Running schema migration..."
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f ../database/schema.sql

if [ $? -eq 0 ]; then
    echo "✅ Schema migration completed successfully!"
else
    echo "❌ Schema migration failed."
    exit 1
fi

# Run additional migrations
echo "🔄 Running additional migrations..."
for migration_file in ../database/*.sql; do
    if [[ "$migration_file" != *"schema.sql"* ]]; then
        echo "Running: $migration_file"
        PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f "$migration_file"
    fi
done

echo "🎉 Database migration completed successfully!"
echo "🔗 Database is ready at: $DB_HOST:$DB_PORT/$DB_NAME"