import useNotificationStore from '../stores/useNotificationStore';

interface Notification {
  id: number;
  message: string;
  type: string;
}

const colorMap: Record<string, { bg: string; border: string; color: string; icon: string }> = {
  success: { bg: '#f0fdf4', border: '#22c55e', color: '#15803d', icon: '✓' },
  error:   { bg: '#fef2f2', border: '#ef4444', color: '#b91c1c', icon: '✕' },
  info:    { bg: '#eff6ff', border: '#3b82f6', color: '#1d4ed8', icon: 'ℹ' },
  warning: { bg: '#fffbeb', border: '#f59e0b', color: '#b45309', icon: '⚠' },
};

interface ToastProps {
  notification: Notification;
  onDismiss: () => void;
}

function Toast({ notification, onDismiss }: ToastProps) {
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

export default function NotificationRenderer() {
  const notifications = useNotificationStore((s) => s.notifications);
  const dismiss = useNotificationStore((s) => s.dismissNotification);

  if (!notifications.length) return null;

  return (
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
      {notifications.map((n) => (
        <Toast key={n.id} notification={n} onDismiss={() => dismiss(n.id)} />
      ))}
    </div>
  );
}
