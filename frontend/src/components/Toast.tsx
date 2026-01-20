import React, { useEffect, useState } from 'react';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number; // milliseconds, 0 = indefinite
  onClose?: () => void;
}

const Toast: React.FC<ToastProps> = ({
  message,
  type,
  duration = 4000,
  onClose
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onClose?.();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  if (!isVisible) return null;

  const getStyles = () => {
    const baseStyle: React.CSSProperties = {
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      padding: '16px 24px',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      fontSize: '14px',
      fontWeight: '500',
      zIndex: 9999,
      animation: 'slideIn 0.3s ease-out',
      maxWidth: '400px',
      wordWrap: 'break-word'
    };

    const typeStyles: { [key: string]: React.CSSProperties } = {
      success: {
        ...baseStyle,
        backgroundColor: '#4caf50',
        color: 'white',
        borderLeft: '4px solid #45a049'
      },
      error: {
        ...baseStyle,
        backgroundColor: '#f44336',
        color: 'white',
        borderLeft: '4px solid #da190b'
      },
      warning: {
        ...baseStyle,
        backgroundColor: '#ff9800',
        color: 'white',
        borderLeft: '4px solid #f57c00'
      },
      info: {
        ...baseStyle,
        backgroundColor: '#2196f3',
        color: 'white',
        borderLeft: '4px solid #1976d2'
      }
    };

    return typeStyles[type] || typeStyles.info;
  };

  return (
    <>
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes slideOut {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(400px);
            opacity: 0;
          }
        }
      `}</style>
      <div style={getStyles()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {type === 'success' && '✓ '}
          {type === 'error' && '✕ '}
          {type === 'warning' && '⚠ '}
          {type === 'info' && 'ℹ '}
          {message}
        </div>
      </div>
    </>
  );
};

export default Toast;
