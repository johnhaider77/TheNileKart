import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { sendPushNotification, sendBulkPushNotifications } from '../services/pushNotificationService';
import '../styles/SendNotificationsPage.css';

interface Customer {
  id: number;
  full_name: string;
  email: string;
  phone: string;
}

const SendNotificationsPage: React.FC = () => {
  const { user } = useAuth();
  const token = localStorage.getItem('token');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCustomers, setSelectedCustomers] = useState<number[]>([]);
  const [heading, setHeading] = useState('');
  const [message, setMessage] = useState('');
  const [actionType, setActionType] = useState('home');
  const [sendMessage, setSendMessage] = useState('');
  const [sendStatus, setSendStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [selectAll, setSelectAll] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch customers when component mounts
  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${process.env.REACT_APP_API_URL}/seller/customers`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCustomers(data.customers || []);
      } else {
        setSendMessage('Failed to load customers');
        setSendStatus('error');
      }
    } catch (error: any) {
      setSendMessage(`Error loading customers: ${error.message}`);
      setSendStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter(c =>
    c.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedCustomers([]);
    } else {
      setSelectedCustomers(filteredCustomers.map(c => c.id));
    }
    setSelectAll(!selectAll);
  };

  const handleSelectCustomer = (customerId: number) => {
    setSelectedCustomers(prev => {
      if (prev.includes(customerId)) {
        return prev.filter(id => id !== customerId);
      } else {
        return [...prev, customerId];
      }
    });
  };

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!heading.trim() || !message.trim()) {
      setSendMessage('Please enter both heading and message');
      setSendStatus('error');
      return;
    }

    if (selectedCustomers.length === 0) {
      setSendMessage('Please select at least one customer');
      setSendStatus('error');
      return;
    }

    try {
      setLoading(true);
      setSendMessage('');
      setSendStatus('idle');

      let result;

      if (selectedCustomers.length === 1) {
        // Send to single customer
        result = await sendPushNotification(
          selectedCustomers[0],
          heading,
          message,
          actionType,
          {},
          token!
        );
      } else {
        // Send to multiple customers
        result = await sendBulkPushNotifications(
          selectedCustomers,
          heading,
          message,
          actionType,
          {},
          token!
        );
      }

      if (result.success) {
        setSendMessage(
          `✅ Notification sent successfully! Delivered to ${result.devicesSent || selectedCustomers.length} device(s).`
        );
        setSendStatus('success');

        // Reset form
        setHeading('');
        setMessage('');
        setActionType('home');
        setSelectedCustomers([]);
        setSelectAll(false);
      } else {
        setSendMessage(`❌ Failed to send notification: ${result.error || 'Unknown error'}`);
        setSendStatus('error');
      }
    } catch (error: any) {
      setSendMessage(`❌ Error: ${error.message}`);
      setSendStatus('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="send-notifications-page">
      <div className="container">
        <div className="page-header">
          <h1>📱 Send Push Notifications</h1>
          <p>Send real-time notifications to your customers on their mobile apps</p>
        </div>

        <div className="notifications-container">
          <div className="form-section">
            <h2>Compose Notification</h2>
            <form onSubmit={handleSendNotification}>
              <div className="form-group">
                <label htmlFor="heading">
                  Notification Heading <span className="required">*</span>
                </label>
                <input
                  id="heading"
                  type="text"
                  placeholder="e.g., Special Offer Available!"
                  value={heading}
                  onChange={(e) => setHeading(e.target.value)}
                  maxLength={255}
                  required
                />
                <small className="char-count">{heading.length}/255 characters</small>
              </div>

              <div className="form-group">
                <label htmlFor="message">
                  Notification Message <span className="required">*</span>
                </label>
                <textarea
                  id="message"
                  placeholder="e.g., Get 30% off on all winter collection items. Tap to shop now!"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={5}
                  required
                />
                <small className="char-count">{message.length} characters</small>
              </div>

              <div className="form-group">
                <label htmlFor="actionType">Action on Click</label>
                <select
                  id="actionType"
                  value={actionType}
                  onChange={(e) => setActionType(e.target.value)}
                >
                  <option value="home">Open Home Page</option>
                  <option value="product">Go to Product Page</option>
                  <option value="order">Go to Orders</option>
                  <option value="seller">Go to Dashboard</option>
                </select>
              </div>

              <div className="preview-section">
                <h3>Preview</h3>
                <div className="notification-preview">
                  <div className="preview-header">
                    <div className="preview-app-icon">📱</div>
                    <div className="preview-app-name">TheNileKart</div>
                  </div>
                  <div className="preview-content">
                    <div className="preview-heading">{heading || 'Notification Heading'}</div>
                    <div className="preview-message">{message || 'Notification message goes here'}</div>
                  </div>
                </div>
              </div>

              {sendMessage && (
                <div className={`alert alert-${sendStatus}`}>
                  {sendMessage}
                </div>
              )}

              <button
                type="submit"
                className="btn-primary"
                disabled={loading || selectedCustomers.length === 0 || !heading.trim() || !message.trim()}
              >
                {loading ? 'Sending...' : `Send to ${selectedCustomers.length} Customer${selectedCustomers.length !== 1 ? 's' : ''}`}
              </button>
            </form>
          </div>

          <div className="customers-section">
            <h2>Select Recipients ({selectedCustomers.length} selected)</h2>

            <div className="search-box">
              <input
                type="text"
                placeholder="Search customers by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="select-all-box">
              <label>
                <input
                  type="checkbox"
                  checked={selectAll && filteredCustomers.length > 0}
                  onChange={handleSelectAll}
                />
                {selectAll && filteredCustomers.length > 0
                  ? `Deselect All (${filteredCustomers.length})`
                  : `Select All (${filteredCustomers.length})`}
              </label>
            </div>

            {loading && !customers.length ? (
              <div className="loading">Loading customers...</div>
            ) : customers.length === 0 ? (
              <div className="empty-state">
                <p>No customers found</p>
              </div>
            ) : (
              <div className="customers-list">
                {filteredCustomers.map((customer) => (
                  <div key={customer.id} className="customer-item">
                    <input
                      type="checkbox"
                      checked={selectedCustomers.includes(customer.id)}
                      onChange={() => handleSelectCustomer(customer.id)}
                    />
                    <div className="customer-info">
                      <div className="customer-name">{customer.full_name}</div>
                      <div className="customer-email">{customer.email}</div>
                      {customer.phone && <div className="customer-phone">{customer.phone}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SendNotificationsPage;
