const db = require('./config/database');
const path = require('path');
const dotenv = require('dotenv');

// Load environment
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
dotenv.config({ path: path.join(__dirname, envFile) });

async function checkPromoCode() {
  try {
    console.log('🔍 Checking promo code FARVA10...');
    
    const result = await db.query(
      `SELECT id, seller_id, code, description, percent_off, flat_off, max_off, 
              min_purchase_value, max_uses_per_user, is_active, 
              start_date_time, expiry_date_time, created_at, updated_at
       FROM promo_codes 
       WHERE UPPER(code) = UPPER($1)`,
      ['FARVA10']
    );

    if (result.rows.length === 0) {
      console.log('❌ Promo code not found');
      process.exit(1);
    }

    const promo = result.rows[0];
    const now = new Date();
    const startDate = new Date(promo.start_date_time);
    const expiryDate = new Date(promo.expiry_date_time);

    console.log('\n📋 Promo Code Details:');
    console.log('- ID:', promo.id);
    console.log('- Code:', promo.code);
    console.log('- Description:', promo.description);
    console.log('- Seller ID:', promo.seller_id);
    console.log('- Is Active:', promo.is_active);
    console.log('- Percent Off:', promo.percent_off);
    console.log('- Flat Off:', promo.flat_off);
    console.log('- Max Off:', promo.max_off);
    console.log('- Min Purchase:', promo.min_purchase_value);
    console.log('- Max Uses Per User:', promo.max_uses_per_user);
    console.log('\n⏰ Date Information:');
    console.log('- Current Time:', now.toISOString());
    console.log('- Start Date:', startDate.toISOString());
    console.log('- Expiry Date:', expiryDate.toISOString());
    console.log('- Created At:', promo.created_at);
    console.log('- Updated At:', promo.updated_at);
    console.log('\n✅ Date Checks:');
    console.log('- Is Active Now:', promo.is_active ? 'YES' : 'NO');
    console.log('- Started:', now >= startDate ? 'YES' : 'NO');
    console.log('- Not Expired:', now < expiryDate ? 'YES' : 'NO');
    console.log('- Can Use:', promo.is_active && now >= startDate && now < expiryDate ? 'YES ✅' : 'NO ❌');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error checking promo code:', error.message);
    process.exit(1);
  }
}

checkPromoCode();
