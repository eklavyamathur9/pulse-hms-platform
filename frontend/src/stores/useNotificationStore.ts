import { create } from 'zustand';

type NotificationType = 'success' | 'error' | 'info' | 'warning';

interface Notification {
  id: number;
  message: string;
  type: NotificationType;
}

interface NotificationState {
  notifications: Notification[];
  addNotification: (message: string, type?: NotificationType) => void;
  dismissNotification: (id: number) => void;
}

let notifId = 0;

const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  addNotification: (message: string, type: NotificationType = 'info') => {
    const id = ++notifId;
    set((state) => ({ notifications: [...state.notifications, { id, message, type }] }));
    setTimeout(() => {
      set((state) => ({ notifications: state.notifications.filter((n) => n.id !== id) }));
    }, 4000);
  },
  dismissNotification: (id: number) => {
    set((state) => ({ notifications: state.notifications.filter((n) => n.id !== id) }));
  },
}));

const addNotification = (message: string, type: NotificationType) => {
  useNotificationStore.getState().addNotification(message, type);
};

export const notify = {
  success: (msg: string) => addNotification(msg, 'success'),
  error: (msg: string) => addNotification(msg, 'error'),
  info: (msg: string) => addNotification(msg, 'info'),
  warning: (msg: string) => addNotification(msg, 'warning'),
};

export default useNotificationStore;
