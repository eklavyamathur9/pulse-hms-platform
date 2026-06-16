import { describe, it, expect, vi, beforeEach } from 'vitest';
import useNotificationStore, { notify } from '../stores/useNotificationStore';

beforeEach(() => {
  useNotificationStore.setState({ notifications: [] });
});

describe('useNotificationStore', () => {
  it('starts with empty notifications', () => {
    const state = useNotificationStore.getState();
    expect(state.notifications).toEqual([]);
  });

  it('adds a notification', () => {
    useNotificationStore.getState().addNotification('Test message', 'info');
    const state = useNotificationStore.getState();
    expect(state.notifications).toHaveLength(1);
    expect(state.notifications[0].message).toBe('Test message');
    expect(state.notifications[0].type).toBe('info');
  });

  it('dismisses a notification', () => {
    useNotificationStore.getState().addNotification('Dismiss me');
    const id = useNotificationStore.getState().notifications[0].id;
    useNotificationStore.getState().dismissNotification(id);
    expect(useNotificationStore.getState().notifications).toHaveLength(0);
  });

  it('adds success notification via notify convenience export', () => {
    notify.success('All good');
    const state = useNotificationStore.getState();
    expect(state.notifications).toHaveLength(1);
    expect(state.notifications[0].type).toBe('success');
  });

  it('adds error notification via notify convenience export', () => {
    notify.error('Something broke');
    const state = useNotificationStore.getState();
    expect(state.notifications[0].type).toBe('error');
  });

  it('adds warning notification via notify convenience export', () => {
    notify.warning('Be careful');
    const state = useNotificationStore.getState();
    expect(state.notifications[0].type).toBe('warning');
  });

  it('auto-dismisses after 4 seconds', async () => {
    vi.useFakeTimers();
    useNotificationStore.getState().addNotification('Auto dismiss');
    expect(useNotificationStore.getState().notifications).toHaveLength(1);
    vi.advanceTimersByTime(4000);
    expect(useNotificationStore.getState().notifications).toHaveLength(0);
    vi.useRealTimers();
  });
});
