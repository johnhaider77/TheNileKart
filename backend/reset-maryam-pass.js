const bcrypt = require("bcryptjs");
const db = require("./config/database");
const path = require("path");
const dotenv = require("dotenv");

// Load production env
dotenv.config({ path: path.join(__dirname, ".env.production") });

async function resetPassword() {
  try {
    const email = "maryam.zaidi2904@gmail.com";
    const newPassword = "Maryam@123456";
    
    console.log("🔄 Resetting password for:", email);
    
    // Hash password with same rounds as registration
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    const result = await db.query(
      "UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE email = $2 RETURNING id, email, full_name",
      [hashedPassword, email]
    );
    
    if (result.rows.length === 0) {
      console.log("❌ User not found");
      process.exit(1);
    }
    
    console.log("✅ Password reset successfully!");
    console.log("📧 Email:", email);
    console.log("🔑 Password:", newPassword);
    console.log("👤 User:", result.rows[0].full_name);
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

resetPassword();
