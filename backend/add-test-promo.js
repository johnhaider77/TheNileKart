const db = require('./config/database');
const path = require('path');
const dotenv = require('dotenv');

// Load environment
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
dotenv.config({ path: path.join(__dirname, envFile) });

async function addTestPromoCode() {
  try {
    console.log('📝 Adding test promo code FARVA10...');
    
    // First, get the seller ID (using ID 1, or we can hardcode the known seller)
    const sellerResult = await db.query(
      `SELECT id FROM users WHERE user_type = 'seller' LIMIT 1`
    );

    if (sellerResult.rows.length === 0) {
      console.log('❌ No sellers found in database');
      process.exit(1);
    }

    const sellerId = sellerResult.rows[0].id;
    console.log('📦 Using seller ID:', sellerId);
    
    // Calculate dates
    const now = new Date();
    const startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // Yesterday
    const expiryDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

    const result = await db.query(
      `INSERT INTO promo_codes (
        seller_id,
        code, 
        description, 
        percent_off, 
        flat_off, 
        max_off, 
        min_purchase_value, 
        max_uses_per_user, 
        eligible_users, 
        eligible_categories,
        start_date_time, 
        expiry_date_time, 
        is_active
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
      ) RETURNING id, seller_id, code, percent_off, start_date_time, expiry_date_time, is_active`,
      [
        sellerId,                            // seller_id
        'FARVA10',                           // code
        '10% discount on all items',         // description
        10,                                  // percent_off
        null,                                // flat_off
        null,                                // max_off
        0,                                   // min_purchase_value
        null,                                // max_uses_per_user
        null,                                // eligible_users (null = for all users)
        null,                                // eligible_categories (null = all categories)
        startDate,                           // start_date_time
        expiryDate,                          // expiry_date_time
        true                                 // is_active
      ]
    );

    console.log('✅ Promo code created successfully:', result.rows[0]);
    console.log('\nPromo Code Details:');
    console.log('- Code: FARVA10');
    console.log('- Seller ID:', sellerId);
    console.log('- Description: 10% discount on all items');
    console.log('- Discount: 10% off');
    console.log('- Start Date:', startDate.toISOString());
    console.log('- Expiry Date:', expiryDate.toISOString());
    console.log('- Active: true');
    console.log('- Applicable to: All users, all categories');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding promo code:', error.message);
    process.exit(1);
  }
}

addTestPromoCode();
