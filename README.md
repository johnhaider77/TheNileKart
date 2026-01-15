# TheNileKart E-commerce Platform

A full-stack e-commerce platform built with React.js, Node.js, Express, and PostgreSQL.

## Features

### Customer Portal
- User authentication (login/register)
- Product listing with search and filters
- Shopping cart functionality
- Checkout with address and COD payment
- Order confirmation and thank you page

### Seller Portal
- Seller authentication
- Product inventory management (create/update)
- Order queue management
- Sales analytics dashboard

## Technology Stack

- **Frontend**: React.js with responsive design
- **Backend**: Node.js with Express.js
- **Database**: PostgreSQL
- **Authentication**: JWT-based
- **Styling**: CSS3 with Flexbox/Grid for mobile responsiveness

## Project Structure

```
TheNileKart/
├── frontend/          # React.js application
├── backend/           # Express.js API server
├── database/          # PostgreSQL schema and migrations
├── ios-app/          # iOS application
└── README.md
```

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd TheNileKart
```

2. Install backend dependencies
```bash
cd backend
npm install
```

3. Install frontend dependencies
```bash
cd ../frontend
npm install
```

4. Set up PostgreSQL database
```bash
cd ../database
psql -U postgres -f schema.sql
```

5. Start the backend server
```bash
cd ../backend
npm start
```

6. Start the frontend development server
```bash
cd ../frontend
npm start
```

## Mobile Responsiveness

The application is designed to be fully responsive and optimized for mobile webview apps with:
- Touch-friendly interface
- Responsive breakpoints
- Mobile-first design approach
- Optimized performance for mobile devices

## Environment Variables

Create `.env` files in both frontend and backend directories with appropriate configuration.

## License

MIT License