#!/bin/bash
# Initialize RDS PostgreSQL database with schema

echo "🔧 Preparing to initialize RDS database..."

DB_HOST="thenilekart-postgres.cr808sek6c09.me-central-1.rds.amazonaws.com"
DB_PORT="5432"
DB_NAME="thenilekart"
DB_USER="thenilekart_admn"
DB_PASSWORD="YAm786123"

export PGPASSWORD="$DB_PASSWORD"

echo "🔗 Testing RDS connection with correct password..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "postgres" -c "SELECT 1;" 2>&1

if [ $? -ne 0 ]; then
  echo "❌ Cannot connect to RDS. Check security group rules and credentials."
  exit 1
fi

echo "✅ Connection successful!"

echo "🗄️ Creating database if not exists..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "postgres" -c "CREATE DATABASE IF NOT EXISTS $DB_NAME;" 2>&1

echo "📂 Running schema migration..."

cd /home/ubuntu/var/www/thenilekart/TheNileKart/database

# Run schema
echo "  ├─ Running: schema.sql"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f schema.sql 2>&1 | tail -5

# Run migration files in order
for file in add_addresses_table.sql add_banners_and_offers.sql add_cod_eligibility.sql add_market_price.sql add_metrics_tracking.sql add_order_edit_tracking.sql add_other_details.sql add_other_profit_loss.sql add_payment_methods.sql add_sample_products_new_categories.sql add_sizes_support.sql add_trending_products.sql enhance_products_table.sql fix_sizes_view.sql migrate_categories.sql migrate_size_level_cod.sql organize_product_categories.sql; do
  if [ -f "$file" ]; then
    echo "  ├─ Running: $file"
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$file" 2>&1 | grep -E "CREATE|ALTER|INSERT" | head -1 || true
  fi
done

echo ""
echo "✅ Database initialization complete!"
echo ""
echo "🔍 Verifying tables..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;" 2>&1 | head -20

unset PGPASSWORD
