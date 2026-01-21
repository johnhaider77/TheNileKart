#!/bin/bash

# TheNileKart Domain & SSL Setup Script
# This script sets up Nginx reverse proxy with SSL for www.thenilekart.com

set -e

DOMAIN="${1:-www.thenilekart.com}"
EMAIL="${2:-admin@thenilekart.com}"

echo "🔧 Setting up Domain & SSL for $DOMAIN"
echo "======================================"
echo ""

# Update system
echo "📦 Updating system packages..."
sudo apt update
sudo apt upgrade -y

# Install Nginx
echo "🌐 Installing Nginx..."
sudo apt install nginx -y

# Install Certbot
echo "🔐 Installing Certbot for SSL..."
sudo apt install certbot python3-certbot-nginx -y

# Create Nginx configuration for the domain
echo "⚙️  Configuring Nginx..."
sudo tee /etc/nginx/sites-available/thenilekart > /dev/null <<EOF
upstream backend {
    server 127.0.0.1:5000;
}

server {
    listen 80;
    server_name www.thenilekart.com thenilekart.com;

    location / {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    location /socket.io {
        proxy_pass http://backend/socket.io;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }
}
EOF

# Enable the site
echo "🔗 Enabling Nginx site..."
sudo ln -sf /etc/nginx/sites-available/thenilekart /etc/nginx/sites-enabled/thenilekart
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
echo "✅ Testing Nginx configuration..."
sudo nginx -t

# Start Nginx
echo "🚀 Starting Nginx..."
sudo systemctl start nginx
sudo systemctl enable nginx

echo ""
echo "⏳ Nginx is running on port 80"
echo ""
echo "🔐 Setting up SSL certificate..."
echo "   Domain: www.thenilekart.com"
echo "   Email: $EMAIL"
echo ""
echo "⚠️  IMPORTANT: Make sure your DNS records are set up FIRST:"
echo "   1. Point A record to: $(curl -s https://checkip.amazonaws.com)"
echo "   2. Add CNAME for www (if needed)"
echo ""
echo "   Then run:"
echo "   sudo certbot --nginx -d www.thenilekart.com -d thenilekart.com -m $EMAIL"
echo ""

# Get SSL certificate (interactive)
echo "Getting SSL certificate..."
sudo certbot --nginx \
    -d www.thenilekart.com \
    -d thenilekart.com \
    -m "$EMAIL" \
    --agree-tos \
    --redirect \
    --non-interactive \
    --renew-by-default || echo "Certificate setup incomplete - verify DNS records"

# Verify SSL
echo ""
echo "✅ SSL Configuration Summary:"
echo "   Frontend: https://www.thenilekart.com"
echo "   Backend API: https://www.thenilekart.com/api"
echo "   Nginx proxy: 127.0.0.1:5000"
echo ""

# Create renewal cronjob
echo "📅 Setting up certificate auto-renewal..."
sudo systemctl enable certbot.timer || true
sudo systemctl start certbot.timer || true

echo ""
echo "✅ Domain & SSL setup complete!"
echo ""
echo "Next steps:"
echo "1. Update frontend .env.production with: REACT_APP_API_URL=https://www.thenilekart.com/api"
echo "2. Rebuild frontend: cd frontend && npm run build"
echo "3. Redeploy frontend"
echo "4. Restart backend: cd backend && node server.js"
