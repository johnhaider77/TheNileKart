const bcrypt = require("bcryptjs");
const db = require("./config/database");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, ".env.production") });

async function testLogin() {
  try {
    const email = "maryam.zaidi2904@gmail.com";
    const password = "Maryam@123456";
    
    console.log("Testing login for:", email);
    
    // Simulate login flow
    const user = await db.query(
      "SELECT id, email, password_hash, full_name, user_type FROM users WHERE email = $1",
      [email]
    );
    
    if (user.rows.length === 0) {
      console.log("❌ User not found");
      process.exit(1);
    }
    
    console.log("✅ User found:", user.rows[0].full_name);
    
    const isValidPassword = await bcrypt.compare(password, user.rows[0].password_hash);
    console.log("🔐 Password match:", isValidPassword ? "✅ SUCCESS" : "❌ FAILED");
    
    if (!isValidPassword) {
      console.log("Password hash:", user.rows[0].password_hash.substring(0, 20) + "...");
      console.log("Password to test:", password);
    }
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

testLogin();
