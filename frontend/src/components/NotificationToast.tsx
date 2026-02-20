import React, { useState, useEffect } from 'react';
import '../styles/NotificationToast.css';

interface ToastNotification {
  id: string;
  title: string;
  body: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

// Global notification queue
let notificationQueue: ToastNotification[] = [];
let notificationListeners: ((notifications: ToastNotification[]) => void)[] = [];

export const showNotificationToast = (title: string, body: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
  const id = Date.now().toString();
  const notification: ToastNotification = { id, title, body, type };
  
  notificationQueue = [...notificationQueue, notification];
  console.log('🔔 Toast notification added:', { title, body, type });
  
  // Notify all listeners
  notificationListeners.forEach(listener => listener([...notificationQueue]));
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    removeNotificationToast(id);
  }, 5000);
};

export const removeNotificationToast = (id: string) => {
  notificationQueue = notificationQueue.filter(n => n.id !== id);
  notificationListeners.forEach(listener => listener([...notificationQueue]));
};

export const subscribeToNotifications = (listener: (notifications: ToastNotification[]) => void) => {
  notificationListeners.push(listener);
  return () => {
    notificationListeners = notificationListeners.filter(l => l !== listener);
  };
};

interface NotificationToastProps {
  onNotificationChange?: (notifications: ToastNotification[]) => void;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({ onNotificationChange }) => {
  const [notifications, setNotifications] = useState<ToastNotification[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeToNotifications((notifications) => {
      setNotifications(notifications);
      onNotificationChange?.(notifications);
    });

    return unsubscribe;
  }, [onNotificationChange]);

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="notification-toast-container">
      {notifications.map((notification) => (
        <div key={notification.id} className={`notification-toast notification-toast-${notification.type}`}>
          <div className="notification-toast-content">
            <div className="notification-toast-title">{notification.title}</div>
            <div className="notification-toast-body">{notification.body}</div>
          </div>
          <button
            className="notification-toast-close"
            onClick={() => removeNotificationToast(notification.id)}
            aria-label="Close notification"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
};

export default NotificationToast;
