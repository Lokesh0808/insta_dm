import { create } from 'zustand';
import { get as apiGet, post as apiPost } from '@/services/api';
import type { AppNotification } from '@/types';

interface NotificationState {
  notifications: AppNotification[];
  unreadCount: number;
  isLoading: boolean;
  fetch: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  push: (notification: Partial<AppNotification> & { id?: string }) => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,

  fetch: async () => {
    set({ isLoading: true });
    try {
      const response = await apiGet<{ notifications: AppNotification[] }>('/notifications');
      const notifications = response.data.notifications ?? [];
      set({
        notifications,
        unreadCount: notifications.filter((n) => !n.readAt).length,
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }
  },

  markRead: async (id) => {
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, readAt: new Date().toISOString() } : n,
      ),
    }));
    try {
      await apiPost(`/notifications/${id}/read`);
    } catch {
      /* ignore */
    }
    set({ unreadCount: get().notifications.filter((n) => !n.readAt).length });
  },

  markAllRead: async () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })),
      unreadCount: 0,
    }));
    try {
      await apiPost('/notifications/read-all');
    } catch {
      /* ignore */
    }
  },

  push: (notification) => {
    const id = notification.id ?? `local_${Date.now()}`;
    set((state) => ({
      notifications: [
        {
          id,
          type: notification.type ?? 'system',
          title: notification.title ?? '',
          message: notification.message ?? '',
          severity: notification.severity ?? 'info',
          link: notification.link,
          createdAt: new Date().toISOString(),
        },
        ...state.notifications,
      ],
      unreadCount: get().unreadCount + 1,
    }));
  },
}));
