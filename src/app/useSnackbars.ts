import { useCallback, useRef, useState } from "react";
import type { SnackbarKind, SnackbarNotification } from "../components/SnackbarStack";

export const DEFAULT_MAX_SNACKBARS = 4;

export type SnackbarOptions = Pick<SnackbarNotification, "actionLabel" | "actions" | "onAction" | "autoDismiss">;

export const useSnackbars = (maxSnackbars = DEFAULT_MAX_SNACKBARS) => {
  const [snackbars, setSnackbars] = useState<SnackbarNotification[]>([]);
  const snackbarIdRef = useRef(0);

  const dismissSnackbar = useCallback((id: number) => {
    setSnackbars((current) => current.filter((notification) => notification.id !== id));
  }, []);

  const showSnackbar = useCallback(
    (kind: SnackbarKind, message: string, options: SnackbarOptions = {}) => {
      const trimmedMessage = message.trim();
      if (!trimmedMessage) {
        return;
      }

      snackbarIdRef.current += 1;
      const notification: SnackbarNotification = {
        id: snackbarIdRef.current,
        kind,
        message: trimmedMessage,
        ...options
      };

      setSnackbars((current) => [...current, notification].slice(-maxSnackbars));
    },
    [maxSnackbars]
  );

  const showSuccess = useCallback((message: string) => showSnackbar("success", message), [showSnackbar]);
  const showError = useCallback((message: string) => showSnackbar("error", message), [showSnackbar]);
  const showInfo = useCallback((message: string) => showSnackbar("info", message), [showSnackbar]);

  return {
    snackbars,
    dismissSnackbar,
    showSnackbar,
    showSuccess,
    showError,
    showInfo
  };
};
