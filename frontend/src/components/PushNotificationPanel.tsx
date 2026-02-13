import React, { useState, useEffect } from 'react';
import {
  sendPushNotification,
  sendBulkPushNotifications,
  getNotificationHistory,
  markNotificationAsRead,
  getUnreadNotificationCount
} from '../services/pushNotificationService';
import './PushNotificationPanel.css';

interface Notification {
  id: number;
  seller_id: number;
  heading: string;
  message: string;
  action_type: string;
  action_data: any;
  sent_at: string;
  read_at: string | null;
  status: string;
  created_at: string;
}

interface PushNotificationPanelProps {
  userToken: string;
  userId: number;
  userType: 'seller' | 'customer';
}

export const PushNotificationPanel: React.FC<PushNotificationPanelProps> = ({
  userToken,
  userId,
  userType
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showPanel, setShowPanel] = useState(false);
  const [loading, setLoading] = useState(false);

  // For sending notifications (sellers only)
  const [sendForm, setSendForm] = useState({
    recipientUserId: '',
    heading: '',
    message: '',
    actionType: 'home'
  });
  const [sendLoading, setSendLoading] = useState(false);
  const [sendMessage, setSendMessage] = useState('');

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const data = await getNotificationHistory(20, 0, userToken);
      setNotifications(data.notifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch unread count
  const fetchUnreadCount = async () => {
    try {
      const data = await getUnreadNotificationCount(userToken);
      setUnreadCount(data.unreadCount);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  // Initial load
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [userToken]);

  // Load notifications when panel opens
  useEffect(() => {
    if (showPanel) {
      fetchNotifications();
    }
  }, [showPanel]);

  // Handle marking notification as read
  const handleMarkAsRead = async (notificationId: number) => {
    try {
      await markNotificationAsRead(notificationId, userToken);
      setNotifications(
        notifications.map(n =>
          n.id === notificationId ? { ...n, read_at: new Date().toISOString() } : n
        )
      );
      fetchUnreadCount();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Handle sending notification (for sellers)
  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!sendForm.recipientUserId || !sendForm.heading || !sendForm.message) {
      setSendMessage('Please fill in all required fields');
      return;
    }

    try {
      setSendLoading(true);
      setSendMessage('');

      const result = await sendPushNotification(
        parseInt(sendForm.recipientUserId),
        sendForm.heading,
        sendForm.message,
        sendForm.actionType,
        {},
        userToken
      );

      if (result.success) {
        setSendMessage(`✅ Notification sent successfully to ${result.devicesSent} device(s)`);
        setSendForm({
          recipientUserId: '',
          heading: '',
          message: '',
          actionType: 'home'
        });
      } else {
        setSendMessage(`❌ Failed to send notification: ${result.error}`);
      }
    } catch (error: any) {
      setSendMessage(`❌ Error: ${error.message}`);
    } finally {
      setSendLoading(false);
    }
  };

  return (
    <div className="push-notification-panel">
      {/* Notification Bell Icon */}
      <div className="notification-bell" onClick={() => setShowPanel(!showPanel)}>
        <span className="bell-icon">🔔</span>
        {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
      </div>

      {/* Notification Dropdown Panel */}
      {showPanel && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <h3>Notifications</h3>
            <button
              className="close-btn"
              onClick={() => setShowPanel(false)}
            >
              ✕
            </button>
          </div>

          {/* Send Notification Form (for sellers) */}
          {userType === 'seller' && (
            <div className="send-notification-form">
              <h4>Send Notification</h4>
              <form onSubmit={handleSendNotification}>
                <input
                  type="number"
                  placeholder="Recipient User ID"
                  value={sendForm.recipientUserId}
                  onChange={(e) =>
                    setSendForm({ ...sendForm, recipientUserId: e.target.value })
                  }
                  required
                />
                <input
                  type="text"
                  placeholder="Heading (max 255 chars)"
                  value={sendForm.heading}
                  onChange={(e) =>
                    setSendForm({ ...sendForm, heading: e.target.value })
                  }
                  maxLength={255}
                  required
                />
                <textarea
                  placeholder="Message"
                  value={sendForm.message}
                  onChange={(e) =>
                    setSendForm({ ...sendForm, message: e.target.value })
                  }
                  required
                />
                <select
                  value={sendForm.actionType}
                  onChange={(e) =>
                    setSendForm({ ...sendForm, actionType: e.target.value })
                  }
                >
                  <option value="home">Go to Home</option>
                  <option value="product">Go to Product</option>
                  <option value="order">Go to Orders</option>
                  <option value="seller">Go to Dashboard</option>
                </select>
                <button type="submit" disabled={sendLoading}>
                  {sendLoading ? 'Sending...' : 'Send Notification'}
                </button>
              </form>
              {sendMessage && (
                <div className={`message ${sendMessage.includes('✅') ? 'success' : 'error'}`}>
                  {sendMessage}
                </div>
              )}
              <hr />
            </div>
          )}

          {/* Notifications List */}
          <div className="notifications-list">
            {loading ? (
              <p className="loading">Loading notifications...</p>
            ) : notifications.length === 0 ? (
              <p className="empty">No notifications yet</p>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`notification-item ${notification.read_at ? 'read' : 'unread'}`}
                >
                  <div className="notification-content">
                    <h5>{notification.heading}</h5>
                    <p>{notification.message}</p>
                    <small className="timestamp">
                      {new Date(notification.sent_at).toLocaleString()}
                    </small>
                  </div>
                  {!notification.read_at && (
                    <button
                      className="mark-read-btn"
                      onClick={() => handleMarkAsRead(notification.id)}
                      title="Mark as read"
                    >
                      ✓
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <button
              className="load-more-btn"
              onClick={fetchNotifications}
            >
              Refresh
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default PushNotificationPanel;
