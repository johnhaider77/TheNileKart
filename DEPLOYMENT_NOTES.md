# Deployment Instructions

## Changes Made:

### 1. **Toast Notification Component** (`frontend/src/components/Toast.tsx`)
   - Created new reusable Toast component for displaying notifications
   - Supports 4 types: success (green), error (red), warning (orange), info (blue)
   - Auto-dismisses after 4 seconds (configurable)
   - Slide-in animation with proper styling

### 2. **Updated ZiinaPayment Component** (`frontend/src/components/ZiinaPayment.tsx`)
   - Added back button to allow users to cancel payment
   - Stores checkout state in sessionStorage before redirecting to Ziina
   - Back button has proper styling and hover effects

### 3. **Updated CheckoutPage Component** (`frontend/src/pages/CheckoutPage.tsx`)
   - Added Toast component import and rendering
   - Added payment return detection via URL query parameters:
     - `payment_status=success` → Redirect to thank-you page
     - `payment_status=failure` or `cancelled` → Show error toast, return to payment step
   - Added helper functions `addToast()` and `removeToast()`
   - Detects `orderId` from URL parameters for order tracking

### 4. **Backend Ziina Routes** (Already configured in `backend/routes/ziina.js`)
   - Sends proper redirect URLs with query parameters to Ziina
   - Success URL: `{FRONTEND_URL}/payment-success?orderId={orderId}`
   - Failure URL: `{FRONTEND_URL}/payment-failure?orderId={orderId}`
   - Cancel URL: `{FRONTEND_URL}/payment-cancel?orderId={orderId}`

## Deployment Steps:

### Option 1: Manual SSH Deployment
```bash
# SSH to EC2
ssh -i your-key.pem ec2-user@40.172.190.250

# Navigate to project
cd TheNileKart

# Pull latest changes
git pull origin main

# Kill existing processes
pkill -f "node server.js" || true
pkill -f "npm start" || true
sleep 2

# Install backend dependencies
cd backend && npm install && node server.js &

# In another terminal:
cd frontend && npm install && BROWSER=none npm start &
```

### Option 2: Using SCP (recommended if SSH key issues persist)
```bash
# Copy build folder to EC2
scp -i ~/.ssh/thenilekart-key.pem -r frontend/build ec2-user@40.172.190.250:~/TheNileKart/frontend/

# Copy backend changes
scp -i ~/.ssh/thenilekart-key.pem -r backend/ ec2-user@40.172.190.250:~/TheNileKart/

# Then SSH and restart servers
```

### Option 3: Direct EC2 Console
1. SSH to EC2 using AWS Console
2. Navigate to `/home/ec2-user/TheNileKart`
3. Run: `git pull origin main`
4. Run: `./start-dev.sh` (or the appropriate startup script)

## Testing the Payment Flow:

1. Go to checkout page
2. Add items to cart
3. Enter shipping address
4. Select Ziina payment option
5. Click "Pay Now" button
6. Complete payment in Ziina iframe (or click back)
7. Verify:
   - ✅ On success: Redirects to thank-you page with toast notification
   - ✅ On failure/cancel: Returns to payment step with error toast
   - ✅ Back button: Returns to checkout page

## Environment Variables Required:
```
FRONTEND_URL=https://thenilekart.com  # or http://localhost:3000 for dev
ZIINA_API_KEY=your-api-key
ZIINA_MERCHANT_ID=your-merchant-id
DATABASE_URL=postgres://user:pass@rds-endpoint:5432/dbname
```

## Troubleshooting:

### Toast notifications not showing
- Check that Toast component is imported in CheckoutPage
- Verify CSS file (Toast.css) has proper z-index (should be 9999)
- Check browser console for any errors

### Payment return not working
- Verify `FRONTEND_URL` environment variable is set correctly
- Check backend logs for Ziina API responses
- Ensure query parameters are being passed correctly

### Back button not working
- Clear browser cache
- Check that `useNavigate` hook is properly imported
- Verify sessionStorage has checkout data

## Current Status:

✅ All code changes completed and tested locally
✅ Frontend builds successfully without errors
✅ Toast component fully functional
✅ Payment detection logic implemented
✅ Ready for EC2 deployment

## Files Modified:

1. `frontend/src/components/Toast.tsx` (NEW)
2. `frontend/src/components/ZiinaPayment.tsx`
3. `frontend/src/pages/CheckoutPage.tsx`
4. `backend/routes/ziina.js` (Already had proper configs)

All changes are backward compatible and don't affect existing functionality.
