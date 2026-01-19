#!/bin/bash
# Remove Fashion Forward banner and fashion30 offer from the database

# Database connection details
DB_HOST=${1:-localhost}
DB_PORT=${2:-5432}
DB_USER=${3:-thenilekart_user}
DB_PASSWORD=${4:-thenilekart_password}
DB_NAME=${5:-thenilekart}

echo "Connecting to database to remove Fashion Forward banner..."

PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME << 'EOF'

-- Remove product-offer relationships for fashion30 offer
DELETE FROM product_offers WHERE offer_code = 'fashion30';

-- Remove the Fashion Forward banner
DELETE FROM banners WHERE offer_page_url = 'fashion30';

-- Remove the fashion30 offer
DELETE FROM offers WHERE offer_code = 'fashion30';

SELECT 'Fashion Forward banner and fashion30 offer removed successfully!' as status;
EOF

echo "✅ Fashion Forward banner removed from database"
