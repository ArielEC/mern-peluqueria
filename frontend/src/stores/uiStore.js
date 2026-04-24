import { create } from 'zustand';

const useUIStore = create((set) => ({
  // Sidebar
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  // Modal global
  modal: {
    isOpen: false,
    title: '',
    content: null,
  },
  openModal: (title, content) =>
    set({
      modal: { isOpen: true, title, content },
    }),
  closeModal: () =>
    set({
      modal: { isOpen: false, title: '', content: null },
    }),

  // Loading global
  isLoading: false,
  setLoading: (loading) => set({ isLoading: loading }),

  // Notificaciones/Toast
  notifications: [],
  addNotification: (notification) =>
    set((state) => ({
      notifications: [
        ...state.notifications,
        {
          id: notification.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          type: notification.type ?? 'info',
          duration: notification.duration ?? 4000,
          ...notification,
        },
      ],
    })),
  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),
  clearNotifications: () => set({ notifications: [] }),

  // Tema
  theme: 'system', // 'light' | 'dark' | 'system'
  setTheme: (theme) => set({ theme }),
}));

export default useUIStore;
