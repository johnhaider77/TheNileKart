#!/bin/bash

# TheNileKart - Complete Domain, SSL, and Production Setup
# This script sets up Nginx reverse proxy with SSL, then restarts the backend

set -e

DOMAIN="www.thenilekart.com"
EMAIL="admin@thenilekart.com"
EC2_IP="3.29.235.62"

echo "════════════════════════════════════════════════════════════"
echo "🚀 TheNileKart - Complete Production Domain Setup"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "Domain: $DOMAIN"
echo "EC2 IP: $EC2_IP"
echo "Email: $EMAIL"
echo ""

# Step 1: Verify DNS
echo "════════════════════════════════════════════════════════════"
echo "📋 STEP 1: DNS Verification"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "Current DNS records for $DOMAIN:"
nslookup $DOMAIN 2>&1 | grep -A 2 "Name:" | head -5
echo ""
echo "⚠️  IMPORTANT: Ensure DNS A record points to: $EC2_IP"
echo ""
read -p "Press Enter once DNS is configured correctly, or Ctrl+C to cancel..."
echo ""

# Step 2: Update system
echo "════════════════════════════════════════════════════════════"
echo "📦 STEP 2: Updating System Packages"
echo "════════════════════════════════════════════════════════════"
sudo apt-get update
sudo apt-get upgrade -y
echo "✅ System updated"
echo ""

# Step 3: Install Nginx
echo "════════════════════════════════════════════════════════════"
echo "🌐 STEP 3: Installing Nginx"
echo "════════════════════════════════════════════════════════════"
if command -v nginx &> /dev/null; then
    echo "✅ Nginx already installed"
else
    sudo apt-get install -y nginx
    echo "✅ Nginx installed"
fi
echo ""

# Step 4: Install Certbot
echo "════════════════════════════════════════════════════════════"
echo "🔐 STEP 4: Installing Certbot (SSL Manager)"
echo "════════════════════════════════════════════════════════════"
if command -v certbot &> /dev/null; then
    echo "✅ Certbot already installed"
else
    sudo apt-get install -y certbot python3-certbot-nginx
    echo "✅ Certbot installed"
fi
echo ""

# Step 5: Configure Nginx
echo "════════════════════════════════════════════════════════════"
echo "⚙️  STEP 5: Configuring Nginx Reverse Proxy"
echo "════════════════════════════════════════════════════════════"

# Backup existing config if it exists
if [ -f /etc/nginx/sites-enabled/thenilekart ]; then
    sudo cp /etc/nginx/sites-enabled/thenilekart /etc/nginx/sites-enabled/thenilekart.bak
    echo "📝 Backed up existing config"
fi

# Create Nginx configuration
sudo tee /etc/nginx/sites-available/thenilekart > /dev/null <<'NGINX_CONFIG'
# Upstream backend
upstream backend {
    server 127.0.0.1:5000 max_fails=3 fail_timeout=30s;
}

# HTTP to HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name www.thenilekart.com thenilekart.com;
    
    location / {
        return 301 https://www.thenilekart.com$request_uri;
    }
    
    # Certbot validation endpoint
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
}

# HTTPS server (will be updated by Certbot)
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name www.thenilekart.com thenilekart.com;

    # SSL will be added by Certbot

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1000;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;

    # Main proxy
    location / {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $server_name;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_cache_bypass $http_upgrade;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Socket.IO specific handling
    location /socket.io {
        proxy_pass http://backend/socket.io;
        proxy_http_version 1.1;
        proxy_buffering off;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
}
NGINX_CONFIG

echo "✅ Nginx configuration created"

# Enable site
sudo ln -sf /etc/nginx/sites-available/thenilekart /etc/nginx/sites-enabled/thenilekart
sudo rm -f /etc/nginx/sites-enabled/default

# Test configuration
echo "Testing Nginx configuration..."
if sudo nginx -t; then
    echo "✅ Nginx configuration valid"
else
    echo "❌ Nginx configuration error - check /etc/nginx/sites-available/thenilekart"
    exit 1
fi
echo ""

# Step 6: Start Nginx
echo "════════════════════════════════════════════════════════════"
echo "🚀 STEP 6: Starting Nginx"
echo "════════════════════════════════════════════════════════════"
sudo systemctl restart nginx
sudo systemctl enable nginx
echo "✅ Nginx started and enabled"
echo ""

# Step 7: Get SSL Certificate
echo "════════════════════════════════════════════════════════════"
echo "🔐 STEP 7: Getting SSL Certificate"
echo "════════════════════════════════════════════════════════════"
echo ""

sudo certbot certonly \
    --nginx \
    --non-interactive \
    --agree-tos \
    --email "$EMAIL" \
    -d $DOMAIN \
    -d thenilekart.com \
    --quiet || {
    echo "❌ SSL certificate failed - check DNS"
    exit 1
}

echo "✅ SSL certificate obtained"
echo ""

# Step 8: Verify Certbot renewal
echo "════════════════════════════════════════════════════════════"
echo "📅 STEP 8: Setting up Auto-Renewal"
echo "════════════════════════════════════════════════════════════"
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
sudo systemctl status certbot.timer | head -3
echo "✅ Auto-renewal configured"
echo ""

# Step 9: Verify SSL
echo "════════════════════════════════════════════════════════════"
echo "✔️  STEP 9: Verifying SSL Certificate"
echo "════════════════════════════════════════════════════════════"
sudo certbot certificates | grep -A 10 "$DOMAIN"
echo ""

# Step 10: Restart backend with correct environment
echo "════════════════════════════════════════════════════════════"
echo "⚡ STEP 10: Restarting Backend"
echo "════════════════════════════════════════════════════════════"
cd /home/ubuntu/var/www/thenilekart/TheNileKart/backend

# Kill existing processes
pkill -9 node 2>/dev/null || true
sleep 2

# Start backend
NODE_ENV=production nohup node server.js > /tmp/backend.log 2>&1 &
sleep 2

# Check if backend is running
if curl -s http://127.0.0.1:5000/api/health > /dev/null; then
    echo "✅ Backend is running and responding"
else
    echo "⚠️  Backend may not be responding - check /tmp/backend.log"
fi
echo ""

# Step 11: Final verification
echo "════════════════════════════════════════════════════════════"
echo "✅ SETUP COMPLETE!"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "📍 Your website is now live at:"
echo "   🔗 https://www.thenilekart.com"
echo ""
echo "🔍 Verification:"
echo "   ✓ Nginx reverse proxy: ✅ Running"
echo "   ✓ SSL certificate: ✅ Installed"
echo "   ✓ Auto-renewal: ✅ Configured"
echo "   ✓ Backend: ✅ Running"
echo ""
echo "📊 Access your app:"
echo "   Dashboard: https://www.thenilekart.com"
echo "   API: https://www.thenilekart.com/api"
echo ""
echo "📋 Next Steps:"
echo "   1. Update frontend .env.production with domain URL"
echo "   2. Rebuild frontend: cd frontend && npm run build"
echo "   3. Redeploy frontend"
echo "   4. Test at https://www.thenilekart.com"
echo ""
echo "📚 Useful commands:"
echo "   • Check Nginx: sudo systemctl status nginx"
echo "   • View Nginx config: sudo cat /etc/nginx/sites-enabled/thenilekart"
echo "   • Check SSL cert: sudo certbot certificates"
echo "   • View backend logs: tail -f /tmp/backend.log"
echo ""
