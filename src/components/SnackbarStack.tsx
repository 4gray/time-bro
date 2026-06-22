import { AlertTriangle, CheckCircle2, ExternalLink, Info, X } from "lucide-react";
import { useEffect } from "react";

export type SnackbarKind = "success" | "error" | "info";

export interface SnackbarNotification {
  id: number;
  kind: SnackbarKind;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  autoDismiss?: boolean;
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
    if (notification.autoDismiss === false) {
      return undefined;
    }

    const timer = window.setTimeout(() => onDismiss(notification.id), durationMs);
    return () => window.clearTimeout(timer);
  }, [durationMs, notification.autoDismiss, notification.id, onDismiss]);

  const Icon =
    notification.kind === "success" ? CheckCircle2 : notification.kind === "error" ? AlertTriangle : Info;

  return (
    <div className={`snackbar ${notification.kind}`} role={notification.kind === "error" ? "alert" : "status"}>
      <Icon className="snackbar-icon" size={17} />
      <span className="snackbar-message">{notification.message}</span>
      {notification.actionLabel && notification.onAction && (
        <button className="snackbar-action" type="button" onClick={notification.onAction}>
          <ExternalLink size={14} />
          {notification.actionLabel}
        </button>
      )}
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
