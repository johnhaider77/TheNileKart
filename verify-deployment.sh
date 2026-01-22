#!/bin/bash

echo "=== TheNileKart Deployment Verification ==="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check EC2 connection
echo "1. Checking EC2 connection..."
if ssh -i ~/.ssh/thenilekart-key.pem -o ConnectTimeout=10 ubuntu@40.172.190.250 'echo "✓ Connected"' 2>/dev/null; then
    echo -e "${GREEN}✓ EC2 connection OK${NC}"
else
    echo -e "${RED}✗ Cannot reach EC2 instance${NC}"
    exit 1
fi

echo ""
echo "2. Checking backend process..."
BACKEND_COUNT=$(ssh -i ~/.ssh/thenilekart-key.pem ubuntu@40.172.190.250 'ps aux | grep "node server" | grep -v grep | wc -l' 2>/dev/null)
if [ "$BACKEND_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✓ Backend running (${BACKEND_COUNT} processes)${NC}"
else
    echo -e "${RED}✗ Backend not running${NC}"
fi

echo ""
echo "3. Checking backend API..."
if ssh -i ~/.ssh/thenilekart-key.pem ubuntu@40.172.190.250 'curl -s http://localhost:5000/api | grep -q "Endpoint"' 2>/dev/null; then
    echo -e "${GREEN}✓ Backend API responding${NC}"
else
    echo -e "${RED}✗ Backend API not responding${NC}"
fi

echo ""
echo "4. Checking FRONTEND_URL setting..."
FRONTEND_URL=$(ssh -i ~/.ssh/thenilekart-key.pem ubuntu@40.172.190.250 'grep "FRONTEND_URL" /var/www/thenilekart/TheNileKart/backend/.env' 2>/dev/null)
if echo "$FRONTEND_URL" | grep -q "www.thenilekart.com"; then
    echo -e "${GREEN}✓ FRONTEND_URL correctly set to: $FRONTEND_URL${NC}"
else
    echo -e "${RED}✗ FRONTEND_URL incorrect: $FRONTEND_URL${NC}"
fi

echo ""
echo "5. Checking JWT settings..."
JWT_EXPIRES=$(ssh -i ~/.ssh/thenilekart-key.pem ubuntu@40.172.190.250 'grep "JWT_EXPIRES_IN" /var/www/thenilekart/TheNileKart/backend/.env' 2>/dev/null)
echo -e "${GREEN}✓ JWT Setting: $JWT_EXPIRES${NC}"

echo ""
echo "=== Deployment Verification Complete ==="
echo ""
echo "Next Steps:"
echo "1. Log in to https://www.thenilekart.com with fresh credentials"
echo "2. Test COD order placement"
echo "3. Test Ziina card payment (verify redirect to www.thenilekart.com/payment-success)"
