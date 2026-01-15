# Live Metrics Tracking System

A comprehensive real-time customer activity tracking system for TheNileKart that allows sellers to monitor live user engagement across the website.

## 🚀 Features

### Live Customer Tracking
- **Homepage**: Track active users on the main homepage
- **Category Pages**: Monitor users browsing specific product categories
- **Offer Pages**: Track engagement with promotional offers
- **Checkout Process**: Monitor users in the checkout flow
- **Payment Process**: Track payment page activity
- **Payment Errors**: Detailed tracking of payment failures with customer details

### Real-time Updates
- WebSocket-based live updates
- 30-second automatic session cleanup
- Auto-refresh metrics dashboard
- Connection status indicators

### Detailed Error Tracking
For payment errors, the system captures:
- Customer email and phone (if available)
- Checkout items and total amount
- Payment method used
- Error codes and messages
- IP address and browser information
- Timestamp of error occurrence

## 📊 Metrics Dashboard

The seller dashboard now includes a comprehensive live metrics section showing:

### Main Metrics
- **Live users on Homepage**: Real-time count
- **Category Page Activity**: Breakdown by category with user counts
- **Offer Page Engagement**: Active users per offer
- **Checkout Activity**: Users currently in checkout
- **Payment Process**: Users on payment pages
- **Payment Errors**: Users experiencing payment issues

### Payment Error Details Table
- Error timestamp
- Customer contact information
- Order details and amount
- Error messages and codes
- Browser and IP information

## 🛠 Implementation

### Backend Components

#### Database Schema
```sql
-- User session tracking
user_sessions
- session_id (unique identifier)
- user_id (optional, for logged-in users)
- email, phone (contact info)
- ip_address, user_agent
- is_active, last_activity

-- Page visit tracking
page_visits
- session_id, page_type, page_identifier
- entered_at, exited_at, duration_seconds
- is_active

-- Checkout session tracking
checkout_sessions
- session_id, user details
- checkout_items (JSON), total_amount
- payment_method, status
- error_details (JSON for payment errors)

-- Live metrics summary
live_metrics
- metric_type, metric_identifier
- active_users_count, last_updated
```

#### API Endpoints
```
POST /api/metrics/session/start          # Start new session
POST /api/metrics/track/page-visit       # Track page visits
POST /api/metrics/track/checkout-start   # Track checkout initiation
POST /api/metrics/track/payment-start    # Track payment start
POST /api/metrics/track/payment-error    # Track payment errors
POST /api/metrics/track/payment-success  # Track successful payments
POST /api/metrics/session/end            # End session

GET  /api/metrics/live-metrics           # Get current metrics
GET  /api/metrics/payment-errors         # Get payment error details
```

#### WebSocket Events
```
connect                    # Client connects
join-seller-dashboard      # Seller joins dashboard room
metrics-update             # Real-time metrics broadcast
payment-errors-update      # Payment error updates
metrics-heartbeat          # Periodic cleanup trigger
```

### Frontend Components

#### Automatic Tracking Hook
```typescript
// useMetrics hook for automatic page tracking
const { 
  trackHomePage,
  trackCategoryPage,
  trackOfferPage,
  trackCheckoutPage,
  trackPaymentPage,
  trackPaymentErrorPage,
  trackCheckoutStart,
  trackPaymentStart,
  trackPaymentError,
  trackPaymentSuccess 
} = useMetrics({ pageType: 'homepage' });
```

#### Manual Tracking Service
```typescript
// Direct service usage
import metricsService from '../services/metricsService';

// Track page visit
metricsService.trackPageVisit({
  pageType: 'category',
  pageIdentifier: 'electronics',
  pageUrl: '/category/electronics'
});

// Track checkout start
metricsService.trackCheckoutStart({
  checkoutItems: cartItems,
  totalAmount: 129.99,
  paymentMethod: 'paypal'
});

// Track payment error
metricsService.trackPaymentError({
  errorCode: 'CARD_DECLINED',
  errorMessage: 'Your card was declined',
  errorDetails: { ... }
});
```

#### HOC for Component Tracking
```typescript
// Wrap components with automatic tracking
import { withHomePageTracking, withCategoryPageTracking } from '../components/MetricsTracking';

const HomePage = withHomePageTracking(MyHomePage);
const CategoryPage = withCategoryPageTracking(MyCategoryPage, 'electronics');
```

## 🔧 Setup Instructions

### 1. Database Setup
```bash
# Run the metrics tracking schema
psql -d thenilekart -f database/add_metrics_tracking.sql
```

### 2. Backend Dependencies
```bash
cd backend
npm install socket.io uuid
```

### 3. Frontend Dependencies
```bash
cd frontend
npm install socket.io-client uuid
```

### 4. Environment Configuration
No additional environment variables needed. The system uses your existing database and server configuration.

## 📝 Usage Examples

### Basic Page Tracking
```typescript
// HomePage component
import { useMetrics } from '../hooks/useMetrics';

const HomePage = () => {
  // Automatic tracking
  useMetrics({ pageType: 'homepage' });
  
  return <div>Home Content</div>;
};
```

### Category Page Tracking
```typescript
// Category component
const CategoryPage = () => {
  const { categoryName } = useParams();
  
  // Track with category identifier
  useMetrics({ 
    pageType: 'category', 
    pageIdentifier: categoryName 
  });
  
  return <div>Category: {categoryName}</div>;
};
```

### Checkout Process Tracking
```typescript
// Checkout component
const CheckoutPage = () => {
  const { trackCheckoutStart, trackPaymentStart, trackPaymentError } = useMetrics({ 
    pageType: 'checkout' 
  });
  
  useEffect(() => {
    // Track when checkout starts
    trackCheckoutStart({
      checkoutItems: items,
      totalAmount: total,
      paymentMethod: 'paypal'
    });
  }, []);
  
  const handlePaymentError = (error) => {
    trackPaymentError({
      errorCode: error.code,
      errorMessage: error.message,
      errorDetails: error
    });
  };
  
  return <div>Checkout Form</div>;
};
```

## 🔍 Monitoring and Analytics

### Real-time Dashboard
Access the live metrics dashboard through:
- Seller Dashboard → Live Customer Metrics section
- Real-time updates via WebSocket
- Auto-refresh every 30 seconds

### Payment Error Monitoring
- Immediate alerts for payment failures
- Detailed error logs with customer context
- Retry tracking and success rates

### Session Analytics
- Average session duration per page
- User journey tracking
- Abandonment points identification

## 🚨 Maintenance

### Session Cleanup
- Automatic cleanup every 30 seconds
- Sessions inactive for 30+ minutes are marked as ended
- Manual cleanup endpoint available: `POST /api/metrics/cleanup-sessions`

### Data Retention
- Live metrics are updated in real-time
- Historical session data is preserved
- Consider implementing data archival for long-term storage

### Performance Considerations
- Metrics updates use lightweight JSON payloads
- WebSocket connections are managed automatically
- Database indexes optimize query performance

## 🔒 Privacy & Security

### Data Protection
- IP addresses are stored but can be anonymized
- Personal information is only stored for logged-in users
- Session data is automatically cleaned up

### GDPR Compliance
- Users can request session data deletion
- Minimal data collection approach
- Clear opt-out mechanisms available

## 🆘 Troubleshooting

### Common Issues

1. **Metrics not updating**
   - Check WebSocket connection status
   - Verify database connection
   - Check browser console for errors

2. **Session tracking not working**
   - Ensure session initialization on page load
   - Check network requests in browser dev tools
   - Verify CORS configuration

3. **Payment errors not tracked**
   - Ensure error tracking is in payment error handlers
   - Check payment integration error flows
   - Verify error data structure

### Debug Mode
Enable development logging:
```typescript
// In metricsService.ts
console.log('📊 Metrics session started:', sessionId);
console.log('📊 Page visit tracked:', pageType);
```

## 📈 Future Enhancements

### Planned Features
- Historical metrics reporting
- A/B testing integration
- Conversion funnel analysis
- Customer behavior heatmaps
- Mobile app metrics integration

### API Extensions
- Bulk metrics export
- Custom event tracking
- Third-party analytics integration
- Automated alerting system

## 🤝 Contributing

When adding new tracking points:
1. Use the existing `useMetrics` hook when possible
2. Follow the established error tracking format
3. Update this documentation
4. Test WebSocket connectivity
5. Verify database performance impact

## 📞 Support

For issues or questions about the metrics system:
- Check the troubleshooting section above
- Review browser console and server logs
- Test with different browsers and devices
- Verify WebSocket connection status