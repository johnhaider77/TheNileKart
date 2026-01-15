#!/bin/bash

# TheNileKart Metrics Tracking Setup Script
echo "🚀 Setting up Live Metrics Tracking System for TheNileKart..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    print_error "Please run this script from the TheNileKart root directory"
    exit 1
fi

print_status "Setting up metrics tracking system..."

# Install backend dependencies
print_status "Installing backend dependencies..."
cd backend
if npm install socket.io uuid; then
    print_success "Backend dependencies installed successfully"
else
    print_error "Failed to install backend dependencies"
    exit 1
fi
cd ..

# Install frontend dependencies
print_status "Installing frontend dependencies..."
cd frontend
if npm install socket.io-client uuid; then
    print_success "Frontend dependencies installed successfully"
else
    print_error "Failed to install frontend dependencies"
    exit 1
fi
cd ..

# Check if PostgreSQL is available
print_status "Checking database connection..."
if command -v psql &> /dev/null; then
    print_success "PostgreSQL client found"
    
    # Prompt for database setup
    echo
    print_warning "Database setup required!"
    echo "The metrics tracking system requires additional database tables."
    echo "Please ensure your PostgreSQL database is running and accessible."
    echo
    echo "To set up the database tables, run:"
    echo "psql -d thenilekart -f database/add_metrics_tracking.sql"
    echo
    read -p "Do you want to run the database migration now? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_status "Running database migration..."
        if psql -d thenilekart -f database/add_metrics_tracking.sql; then
            print_success "Database migration completed successfully"
        else
            print_error "Database migration failed. Please check your database connection and try again."
            echo "You can run the migration manually later with:"
            echo "psql -d thenilekart -f database/add_metrics_tracking.sql"
        fi
    else
        print_warning "Database migration skipped. Please run it manually when ready:"
        echo "psql -d thenilekart -f database/add_metrics_tracking.sql"
    fi
else
    print_warning "PostgreSQL client not found. Please install it or run the database migration manually:"
    echo "psql -d thenilekart -f database/add_metrics_tracking.sql"
fi

echo
print_success "Setup completed!"
echo
echo "📊 Live Metrics Tracking System is now ready!"
echo
echo "🔧 What was installed:"
echo "  ✅ Backend: socket.io, uuid"
echo "  ✅ Frontend: socket.io-client, uuid"
echo "  ✅ Database schema (if you ran the migration)"
echo
echo "📝 What's included in this system:"
echo "  📊 Real-time customer activity tracking"
echo "  🏠 Homepage visitor counting"
echo "  📂 Category page engagement"
echo "  🎉 Offer page tracking"
echo "  🛒 Checkout process monitoring"
echo "  💳 Payment activity tracking"
echo "  ❌ Detailed payment error tracking"
echo "  🔄 WebSocket real-time updates"
echo "  📈 Live seller dashboard"
echo
echo "🚀 To start using the system:"
echo "  1. Start your backend server (it now includes WebSocket support)"
echo "  2. Start your frontend (it now includes automatic tracking)"
echo "  3. Visit the Seller Dashboard to see live metrics"
echo
echo "📖 For detailed documentation, see:"
echo "  📄 METRICS_TRACKING_README.md"
echo
echo "🎯 Key Features for Sellers:"
echo "  • See live customer counts on each page"
echo "  • Monitor checkout abandonment in real-time"
echo "  • Get instant alerts for payment errors"
echo "  • Track customer details for failed payments"
echo "  • View comprehensive metrics dashboard"
echo
print_status "Happy tracking! 🚀"