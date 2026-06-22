import { AlertTriangle, CheckCircle2, X } from "lucide-react";
import { useEffect } from "react";

export type SnackbarKind = "success" | "error";

export interface SnackbarNotification {
  id: number;
  kind: SnackbarKind;
  message: string;
}

interface SnackbarStackProps {
  notifications: SnackbarNotification[];
  onDismiss: (id: number) => void;
  durationMs?: number;
}

interface SnackbarItemProps {
  notification: SnackbarNotification;
  onDismiss: (id: number) => void;
  durationMs: number;
}

const SnackbarItem = ({ notification, onDismiss, durationMs }: SnackbarItemProps) => {
  useEffect(() => {
    const timer = window.setTimeout(() => onDismiss(notification.id), durationMs);
    return () => window.clearTimeout(timer);
  }, [durationMs, notification.id, onDismiss]);

  const Icon = notification.kind === "success" ? CheckCircle2 : AlertTriangle;

  return (
    <div className={`snackbar ${notification.kind}`} role={notification.kind === "error" ? "alert" : "status"}>
      <Icon className="snackbar-icon" size={17} />
      <span className="snackbar-message">{notification.message}</span>
      <button
        className="snackbar-dismiss"
        type="button"
        aria-label="Dismiss notification"
        onClick={() => onDismiss(notification.id)}
      >
        <X size={14} />
      </button>
    </div>
  );
};

export const SnackbarStack = ({ notifications, onDismiss, durationMs = 4200 }: SnackbarStackProps) => {
  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="snackbar-stack" aria-label="Notifications" aria-live="polite">
      {notifications.map((notification) => (
        <SnackbarItem
          durationMs={durationMs}
          key={notification.id}
          notification={notification}
          onDismiss={onDismiss}
        />
      ))}
    </div>
  );
};
