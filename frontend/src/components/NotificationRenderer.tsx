import useNotificationStore from '../stores/useNotificationStore';

interface Notification {
  id: number;
  message: string;
  type: string;
}

const colorMap: Record<string, { bg: string; border: string; color: string; icon: string }> = {
  success: { bg: 'var(--success-bg)', border: 'var(--chart-2)', color: 'var(--status-active)', icon: '✓' },
  error:   { bg: 'var(--danger-bg)', border: 'var(--chart-4)', color: 'var(--status-inactive)', icon: '✕' },
  info:    { bg: 'var(--role-patient-bg)', border: 'var(--chart-1)', color: 'var(--chart-1)', icon: 'ℹ' },
  warning: { bg: 'var(--warning-bg)', border: 'var(--chart-3)', color: 'var(--chart-3)', icon: '⚠' },
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
        boxShadow: 'var(--shadow-lg)',
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
