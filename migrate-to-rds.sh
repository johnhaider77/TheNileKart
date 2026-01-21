#!/bin/bash
# Initialize RDS database with schema from EC2

echo "🔧 Installing PostgreSQL client..."
sudo apt-get update -qq && sudo apt-get install -y postgresql-client libpq5 > /dev/null 2>&1

echo "📦 Preparing to migrate database to RDS..."

DB_HOST="thenilekart-postgres.cr808sek6c09.me-central-1.rds.amazonaws.com"
DB_PORT="5432"
DB_NAME="thenilekart"
DB_USER="thenilekart_admn"
DB_PASSWORD="YAm@786123"

export PGPASSWORD="$DB_PASSWORD"

echo "🔗 Testing RDS connection..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" 2>&1

if [ $? -ne 0 ]; then
  echo "❌ Cannot connect to RDS. Database may not exist or credentials are wrong."
  echo "Trying to create database first..."
  
  # Try connecting to the default postgres database to create our database
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "postgres" << EOF
CREATE DATABASE IF NOT EXISTS "$DB_NAME";
EOF
fi

echo "📂 Running schema migration..."

# Get the database file location
cd /home/ubuntu/var/www/thenilekart/TheNileKart/database

# Run all SQL files in order
for file in schema.sql add_*.sql enhance_*.sql fix_*.sql migrate_*.sql organize_*.sql remove_*.sql; do
  if [ -f "$file" ]; then
    echo "  ├─ Running: $file"
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$file" 2>&1 | grep -E "CREATE|ALTER|INSERT|ERROR" | head -3 || true
  fi
done

echo "✅ Database migration complete!"
unset PGPASSWORD
