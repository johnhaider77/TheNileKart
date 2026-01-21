const bcrypt = require("bcryptjs");
const db = require("./config/database");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, ".env.production") });

async function fix() {
  try {
    const email1 = "maryam.zaidi2904@gmail.com";
    const email2 = "maryamzaidi2904@gmail.com";
    const password = "Maryam@123456";
    
    console.log("Resetting both accounts...");
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Reset first account
    let result = await db.query(
      "UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE email = $2 RETURNING id, email, full_name",
      [hashedPassword, email1]
    );
    console.log(`✅ Updated: ${result.rows[0]?.full_name} (${email1})`);
    
    // Reset second account
    result = await db.query(
      "UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE email = $2 RETURNING id, email, full_name",
      [hashedPassword, email2]
    );
    console.log(`✅ Updated: ${result.rows[0]?.full_name} (${email2})`);
    
    console.log("\n✅ Both accounts reset with password: Maryam@123456");
    process.exit(0);
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}
fix();
