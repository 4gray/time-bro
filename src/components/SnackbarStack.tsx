import { AlertTriangle, CheckCircle2, Download, ExternalLink, FileText, Info, X } from "lucide-react";
import { useEffect } from "react";

export type SnackbarKind = "success" | "error" | "info";
export type SnackbarActionIcon = "download" | "external" | "notes";

export interface SnackbarAction {
  label: string;
  onAction: () => void;
  icon?: SnackbarActionIcon;
}

export interface SnackbarNotification {
  id: number;
  kind: SnackbarKind;
  message: string;
  actions?: SnackbarAction[];
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
  const actions =
    notification.actions ??
    (notification.actionLabel && notification.onAction
      ? [
          {
            label: notification.actionLabel,
            onAction: notification.onAction,
            icon: "external" as const
          }
        ]
      : []);

  return (
    <div className={`snackbar ${notification.kind}`} role={notification.kind === "error" ? "alert" : "status"}>
      <Icon className="snackbar-icon" size={17} />
      <span className="snackbar-message">{notification.message}</span>
      {actions.length > 0 && (
        <div className="snackbar-actions">
          {actions.map((action) => {
            const ActionIcon =
              action.icon === "download" ? Download : action.icon === "notes" ? FileText : ExternalLink;

            return (
              <button className="snackbar-action" type="button" onClick={action.onAction} key={action.label}>
                <ActionIcon size={14} />
                {action.label}
              </button>
            );
          })}
        </div>
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
