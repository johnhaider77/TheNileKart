# Database Setup Instructions

## Prerequisites
- PostgreSQL (v12 or higher) installed on your system
- PostgreSQL user with database creation privileges

## Setup Steps

### 1. Create Database
```bash
# Connect to PostgreSQL as superuser
psql -U postgres

# Create database
CREATE DATABASE thenilekart;

# Create a dedicated user for the application (optional but recommended)
CREATE USER thenilekart_user WITH PASSWORD 'your_secure_password';

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE thenilekart TO thenilekart_user;

# Exit PostgreSQL
\q
```

### 2. Run Schema
```bash
# Connect to the database and run the schema
psql -U postgres -d thenilekart -f schema.sql

# Or if using the dedicated user:
psql -U thenilekart_user -d thenilekart -f schema.sql
```

### 3. Verify Installation
```bash
# Connect to database
psql -U postgres -d thenilekart

# List tables
\dt

# Check sample data
SELECT * FROM users;
SELECT * FROM products LIMIT 5;

# Exit
\q
```

## Environment Configuration

Make sure to update your backend `.env` file with the correct database credentials:

```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=thenilekart
DB_USER=thenilekart_user
DB_PASSWORD=your_secure_password
```

## Default Test Users

The schema includes sample users for testing:

### Customer Account
- Email: `customer@example.com`
- Password: `password123`
- Type: Customer

### Seller Accounts
- Email: `seller@example.com`
- Password: `password123`
- Type: Seller

- Email: `seller2@example.com`
- Password: `password123`
- Type: Seller

## Database Schema Overview

### Tables:
- **users**: Customer and seller accounts
- **products**: Product catalog managed by sellers
- **orders**: Customer orders with shipping information
- **order_items**: Individual items within orders
- **cart_items**: Persistent shopping cart items

### Features:
- Automatic timestamp updates
- Foreign key constraints for data integrity
- Indexes for optimized query performance
- ENUM types for status management
- JSON storage for flexible shipping addresses