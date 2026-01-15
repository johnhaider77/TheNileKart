# TheNileKart Setup Guide

## Quick Start Instructions

### 1. Install Dependencies

Install the main project dependencies:
```bash
cd TheNileKart
npm install
```

Install backend dependencies:
```bash
cd backend
npm install
```

Install frontend dependencies:
```bash
cd ../frontend
npm install
```

### 2. Database Setup

Make sure PostgreSQL is installed and running on your system.

Create the database and tables:
```bash
cd ../database
psql -U postgres
```

In PostgreSQL shell:
```sql
CREATE DATABASE thenilekart;
\c thenilekart;
\q
```

Run the schema:
```bash
psql -U postgres -d thenilekart -f schema.sql
```

### 3. Environment Configuration

Backend environment:
```bash
cd ../backend
cp .env.example .env
```

Edit `.env` file with your database credentials:
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=thenilekart
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your_super_secret_jwt_key_here
```

Frontend environment:
```bash
cd ../frontend
cp .env.example .env
```

The frontend `.env` should contain:
```
REACT_APP_API_URL=http://localhost:5000/api
```

### 4. Start the Application

Option 1 - Start both servers with one command (from project root):
```bash
npm start
```

Option 2 - Start individually:

Start backend server:
```bash
cd backend
npm start
```

Start frontend development server (in another terminal):
```bash
cd frontend
npm start
```

### 5. Access the Application

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## Test Accounts

The database comes with sample test accounts:

### Customer Account
- Email: `customer@example.com`
- Password: `password123`

### Seller Accounts
- Email: `seller@example.com`
- Password: `password123`

- Email: `seller2@example.com`
- Password: `password123`

## Features Overview

### Customer Portal
- ✅ User registration and login
- ✅ Product browsing with search and filters
- ✅ Shopping cart functionality
- ✅ Checkout with shipping address
- ✅ Cash on Delivery payment
- ✅ Order confirmation page
- ✅ Mobile responsive design

### Seller Portal
- ✅ Seller registration and login
- ✅ Dashboard with sales overview
- ✅ Product inventory management
- ✅ Order queue management
- ✅ Create and update products
- ✅ Mobile responsive design

### Backend API
- ✅ JWT-based authentication
- ✅ PostgreSQL database integration
- ✅ RESTful API endpoints
- ✅ File upload support for product images
- ✅ Input validation and error handling
- ✅ CORS and security middleware

## Mobile Responsiveness

The application is fully optimized for mobile devices and webview apps:

- Touch-friendly interface with proper touch targets (44px minimum)
- Mobile-first responsive design
- Optimized navigation for small screens
- Fast loading and smooth animations
- Support for high-DPI displays
- Safe area support for iOS devices with notches

## API Endpoints

### Authentication
- POST `/api/auth/register` - User registration
- POST `/api/auth/login` - User login
- GET `/api/auth/profile` - Get user profile

### Products
- GET `/api/products` - Get products with filters
- GET `/api/products/:id` - Get product by ID
- GET `/api/products/categories/list` - Get categories

### Orders (Customer)
- POST `/api/orders` - Create order
- GET `/api/orders` - Get customer orders
- GET `/api/orders/:id` - Get order by ID

### Seller Management
- POST `/api/seller/products` - Create product
- GET `/api/seller/products` - Get seller products
- PUT `/api/seller/products/:id` - Update product
- GET `/api/seller/orders` - Get seller orders
- PATCH `/api/seller/orders/:id/status` - Update order status

## Development Notes

### Technology Stack
- **Frontend**: React 18 with TypeScript
- **Backend**: Node.js with Express.js
- **Database**: PostgreSQL
- **Authentication**: JWT tokens
- **File Upload**: Multer middleware
- **Styling**: Custom CSS with CSS Grid and Flexbox

### Mobile Optimization
- Viewport meta tag configured for mobile
- CSS breakpoints for responsive design
- Touch-friendly buttons and form controls
- Optimized images and performance

### Security Features
- Password hashing with bcrypt
- JWT token authentication
- Input validation and sanitization
- Rate limiting on API endpoints
- CORS configuration
- SQL injection protection

## Troubleshooting

### Common Issues

1. **Database connection error**
   - Check PostgreSQL is running
   - Verify database credentials in `.env`
   - Ensure database exists

2. **Port already in use**
   - Change PORT in backend `.env` file
   - Update REACT_APP_API_URL in frontend `.env`

3. **CORS issues**
   - Check FRONTEND_URL in backend `.env`
   - Ensure both servers are running on correct ports

4. **Image upload not working**
   - Check `backend/uploads/products` folder exists
   - Verify file permissions

## Next Steps

To extend the application, consider implementing:

- Payment gateway integration
- Email notifications
- Advanced search and filtering
- Product reviews and ratings
- Order tracking
- Admin panel
- Analytics dashboard
- Push notifications for mobile apps