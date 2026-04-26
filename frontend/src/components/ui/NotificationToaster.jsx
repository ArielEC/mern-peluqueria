import * as Toast from '@radix-ui/react-toast';
import useUIStore from '@/stores/uiStore';

const NOTIFICATION_DURATION_MS = 5000;

const TOAST_STYLES = {
  success: {
    border: 'border-[#006e1c]/15',
    iconWrap: 'bg-[#d9f8e0] text-[#006e1c]',
    icon: 'check_circle',
  },
  error: {
    border: 'border-[#ba1a1a]/15',
    iconWrap: 'bg-[#ffdad6] text-[#ba1a1a]',
    icon: 'error',
  },
  info: {
    border: 'border-[#6b38d4]/15',
    iconWrap: 'bg-[#ede5ff] text-[#6b38d4]',
    icon: 'info',
  },
};

function ToastItem({ notification, onDismiss }) {
  const style = TOAST_STYLES[notification.type] ?? TOAST_STYLES.info;
  const hasDescription = Boolean(notification.description);

  return (
    <Toast.Root
      defaultOpen
      duration={NOTIFICATION_DURATION_MS}
      onOpenChange={(open) => {
        if (!open) onDismiss(notification.id);
      }}
      className={`pointer-events-auto rounded-2xl border bg-white/96 p-4 shadow-[0_18px_50px_-18px_rgba(19,27,46,0.35)] backdrop-blur-sm ${style.border}`}
    >
      <div className={`flex gap-3 ${hasDescription ? 'items-start' : 'items-center'}`}>
        <div className={`${hasDescription ? 'mt-0.5' : ''} flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${style.iconWrap}`}>
          <span className="material-symbols-outlined text-[20px]">{style.icon}</span>
        </div>

        <div className={`min-w-0 flex-1 ${hasDescription ? '' : 'flex min-h-10 items-center'}`}>
          <Toast.Title className={`text-[0.9rem] font-bold text-[#131b2e] ${hasDescription ? 'leading-tight' : 'leading-none'}`}>
            {notification.title}
          </Toast.Title>
          {notification.description && (
            <Toast.Description className="mt-1 text-[0.78rem] leading-relaxed text-[#494454]">
              {notification.description}
            </Toast.Description>
          )}
        </div>

        <Toast.Close
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[#494454] transition-colors hover:bg-[#f2f3ff]"
          aria-label="Cerrar notificación"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
        </Toast.Close>
      </div>
    </Toast.Root>
  );
}

export default function NotificationToaster() {
  const notifications = useUIStore((state) => state.notifications);
  const removeNotification = useUIStore((state) => state.removeNotification);

  return (
    <Toast.Provider swipeDirection="right">
      {notifications.map((notification) => (
        <ToastItem
          key={notification.id}
          notification={notification}
          onDismiss={removeNotification}
        />
      ))}

      <Toast.Viewport className="pointer-events-none fixed inset-x-3 bottom-3 z-[120] flex max-h-screen flex-col gap-3 outline-none sm:inset-x-auto sm:bottom-4 sm:right-4 sm:top-4 sm:w-full sm:max-w-sm" />
    </Toast.Provider>
  );
}
