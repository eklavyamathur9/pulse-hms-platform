import React, { createContext, useContext, useState, useCallback } from 'react';

const NotificationContext = createContext();

export const useNotification = () => useContext(NotificationContext);

let notifId = 0;

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  const addNotification = useCallback((message, type = 'info') => {
    const id = ++notifId;
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 4000);
  }, []);

  const notify = {
    success: (msg) => addNotification(msg, 'success'),
    error: (msg) => addNotification(msg, 'error'),
    info: (msg) => addNotification(msg, 'info'),
    warning: (msg) => addNotification(msg, 'warning'),
  };

  return (
    <NotificationContext.Provider value={notify}>
      {children}
      
      {/* Toast Container */}
      <div style={{
        position: 'fixed',
        top: '1.5rem',
        right: '1.5rem',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        pointerEvents: 'none'
      }}>
        {notifications.map(n => (
          <Toast key={n.id} notification={n} onDismiss={() => setNotifications(prev => prev.filter(x => x.id !== n.id))} />
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

function Toast({ notification, onDismiss }) {
  const colorMap = {
    success: { bg: '#f0fdf4', border: '#22c55e', color: '#15803d', icon: '✓' },
    error:   { bg: '#fef2f2', border: '#ef4444', color: '#b91c1c', icon: '✕' },
    info:    { bg: '#eff6ff', border: '#3b82f6', color: '#1d4ed8', icon: 'ℹ' },
    warning: { bg: '#fffbeb', border: '#f59e0b', color: '#b45309', icon: '⚠' },
  };
  
  const c = colorMap[notification.type] || colorMap.info;

  return (
    <div
      style={{
        background: c.bg,
        border: `1px solid ${c.border}`,
        borderLeft: `4px solid ${c.border}`,
        color: c.color,
        padding: '1rem 1.25rem',
        borderRadius: '0.75rem',
        boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        minWidth: '320px',
        maxWidth: '420px',
        pointerEvents: 'auto',
        animation: 'toastSlideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        fontWeight: 500,
        fontSize: '0.9rem',
        cursor: 'pointer'
      }}
      onClick={onDismiss}
    >
      <span style={{ fontSize: '1.2rem', fontWeight: 700, lineHeight: 1 }}>{c.icon}</span>
      <span style={{ flex: 1 }}>{notification.message}</span>
    </div>
  );
}
