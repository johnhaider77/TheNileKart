import React, { useState, useEffect } from 'react';
// @ts-ignore
import { io } from 'socket.io-client';
import '../styles/LiveMetricsDashboard.css';

interface LiveMetrics {
  homepage: number;
  categories: { [key: string]: number };
  offers: { [key: string]: number };
  checkout: number;
  payment: number;
  paymentError: number;
  lastUpdated: string;
}

interface PaymentError {
  id: string;
  session_id: string;
  email: string | null;
  phone: string | null;
  checkout_items: any[];
  total_amount: number;
  payment_method: string | null;
  payment_error_at: string;
  error_details: any;
  ip_address: string | null;
  user_agent: string | null;
}

const LiveMetricsDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<LiveMetrics>({
    homepage: 0,
    categories: {},
    offers: {},
    checkout: 0,
    payment: 0,
    paymentError: 0,
    lastUpdated: new Date().toISOString()
  });
  const [paymentErrors, setPaymentErrors] = useState<PaymentError[]>([]);
  const [socket, setSocket] = useState<any | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initialize Socket.IO connection
    const newSocket = io('http://localhost:5000', {
      withCredentials: true
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      console.log('📊 Connected to metrics socket');
      
      // Join seller dashboard room (you can modify this based on seller ID)
      newSocket.emit('join-seller-dashboard', 'seller-1');
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      console.log('📊 Disconnected from metrics socket');
    });

    // Listen for real-time metrics updates
    newSocket.on('metrics-update', (updatedMetrics: LiveMetrics) => {
      setMetrics(updatedMetrics);
    });

    // Listen for payment errors updates
    newSocket.on('payment-errors-update', (errors: PaymentError[]) => {
      setPaymentErrors(errors);
    });

    // Listen for heartbeat
    newSocket.on('metrics-heartbeat', () => {
      fetchMetrics();
    });

    setSocket(newSocket);

    // Initial data fetch
    fetchMetrics();
    fetchPaymentErrors();

    // Cleanup on component unmount
    return () => {
      newSocket.disconnect();
    };
  }, []);

  const fetchMetrics = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/metrics/live-metrics', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setMetrics(data);
      }
    } catch (error) {
      console.error('Error fetching metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentErrors = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/metrics/payment-errors', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setPaymentErrors(data);
      }
    } catch (error) {
      console.error('Error fetching payment errors:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getTotalCategoryUsers = () => {
    return Object.values(metrics.categories).reduce((sum, count) => sum + count, 0);
  };

  const getTotalOfferUsers = () => {
    return Object.values(metrics.offers).reduce((sum, count) => sum + count, 0);
  };

  if (loading) {
    return (
      <div className="metrics-dashboard loading">
        <h2>Loading Live Metrics...</h2>
      </div>
    );
  }

  return (
    <div className="metrics-dashboard">
      <div className="dashboard-header">
        <h1>🚀 Live Customer Metrics Dashboard</h1>
        <div className="connection-status">
          <span className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
            {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
          </span>
          <span className="last-updated">
            Last Updated: {formatDate(metrics.lastUpdated)}
          </span>
        </div>
      </div>

      {/* Main Metrics Grid */}
      <div className="metrics-grid">
        <div className="metric-card homepage">
          <div className="metric-header">
            <h3>🏠 Homepage</h3>
          </div>
          <div className="metric-value">{metrics.homepage}</div>
          <div className="metric-label">Active Users</div>
        </div>

        <div className="metric-card categories">
          <div className="metric-header">
            <h3>📂 Category Pages</h3>
          </div>
          <div className="metric-value">{getTotalCategoryUsers()}</div>
          <div className="metric-label">Total Active Users</div>
          <div className="metric-breakdown">
            {Object.entries(metrics.categories)
              .filter(([category, count]) => count > 0)
              .map(([category, count]) => (
                <div key={category} className="breakdown-item">
                  <span className="category-name">{category}</span>
                  <span className="category-count">{count}</span>
                </div>
              ))
            }
            {getTotalCategoryUsers() === 0 && (
              <div className="no-active-users">
                <span className="no-users-message">No users currently browsing categories</span>
              </div>
            )}
          </div>
        </div>

        <div className="metric-card offers">
          <div className="metric-header">
            <h3>🎉 Offer Pages</h3>
          </div>
          <div className="metric-value">{getTotalOfferUsers()}</div>
          <div className="metric-label">Total Active Users</div>
          <div className="metric-breakdown">
            {Object.entries(metrics.offers)
              .filter(([offer, count]) => count > 0)
              .map(([offer, count]) => (
                <div key={offer} className="breakdown-item">
                  <span className="offer-name">{offer}</span>
                  <span className="offer-count">{count}</span>
                </div>
              ))
            }
            {getTotalOfferUsers() === 0 && (
              <div className="no-active-users">
                <span className="no-users-message">No users currently viewing offers</span>
              </div>
            )}
          </div>
        </div>

        <div className="metric-card checkout">
          <div className="metric-header">
            <h3>🛒 Checkout</h3>
          </div>
          <div className="metric-value">{metrics.checkout}</div>
          <div className="metric-label">Active Users</div>
        </div>

        <div className="metric-card payment">
          <div className="metric-header">
            <h3>💳 Payment</h3>
          </div>
          <div className="metric-value">{metrics.payment}</div>
          <div className="metric-label">Active Users</div>
        </div>

        <div className="metric-card payment-error">
          <div className="metric-header">
            <h3>❌ Payment Errors</h3>
          </div>
          <div className="metric-value error">{metrics.paymentError}</div>
          <div className="metric-label">Users with Errors</div>
        </div>
      </div>

      {/* Payment Error Details */}
      {paymentErrors.length > 0 && (
        <div className="payment-errors-section">
          <h2>🚨 Recent Payment Errors (Last Hour)</h2>
          <div className="errors-table">
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Customer Email</th>
                  <th>Phone</th>
                  <th>Amount</th>
                  <th>Payment Method</th>
                  <th>Items</th>
                  <th>Error Details</th>
                  <th>IP Address</th>
                </tr>
              </thead>
              <tbody>
                {paymentErrors.map((error) => (
                  <tr key={error.id}>
                    <td>{formatDate(error.payment_error_at)}</td>
                    <td>{error.email || 'N/A'}</td>
                    <td>{error.phone || 'N/A'}</td>
                    <td>${error.total_amount?.toFixed(2)}</td>
                    <td>{error.payment_method || 'N/A'}</td>
                    <td>
                      <div className="items-summary">
                        {error.checkout_items?.length || 0} item(s)
                        {error.checkout_items && error.checkout_items.length > 0 && (
                          <div className="items-details">
                            {error.checkout_items.slice(0, 3).map((item: any, index: number) => (
                              <div key={index} className="item">
                                {item.name} (x{item.quantity})
                              </div>
                            ))}
                            {error.checkout_items.length > 3 && (
                              <div className="more-items">
                                +{error.checkout_items.length - 3} more
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="error-details">
                        {error.error_details?.errorMessage && (
                          <div className="error-message">
                            {error.error_details.errorMessage}
                          </div>
                        )}
                        {error.error_details?.errorCode && (
                          <div className="error-code">
                            Code: {error.error_details.errorCode}
                          </div>
                        )}
                      </div>
                    </td>
                    <td>{error.ip_address || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};

export default LiveMetricsDashboard;