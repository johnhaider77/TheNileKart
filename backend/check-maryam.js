const db = require("./config/database");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, ".env.production") });

async function check() {
  try {
    // Check exact email in database
    const result = await db.query(
      "SELECT id, email, full_name FROM users WHERE email ILIKE $1",
      ["%maryam%"]
    );
    
    console.log("Users with maryam in email:");
    result.rows.forEach(row => {
      console.log(`ID: ${row.id}, Email: "${row.email}", Name: ${row.full_name}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}
check();
