import { useCallback, useEffect, useRef, useState } from "react";
import type { JiraTicket } from "../../shared/types";

export interface DragHoverRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface DropTarget {
  ticket: JiraTicket;
  dateKey: string;
  hours: number;
  /** Exact local start picked on Week's shared timeline. */
  startedMinutes?: number;
}

interface UseActiveWorkDragOptions {
  /** Returns true when a day column can accept a dropped ticket. */
  isDroppable: (dateKey: string) => boolean;
  /** Fired on a successful release over a droppable day. */
  onDrop: (target: DropTarget) => void;
}

const DRAG_THRESHOLD_PX = 4;

/**
 * Pointer-driven drag machine for the active-work dock. A card is "armed" on
 * mousedown and only promoted to a real drag once the pointer moves past a small
 * threshold, so plain clicks never start a drag. While dragging we hit-test the
 * cursor against day columns (`data-drop-day`) and hour lanes (`data-drop-hours`)
 * and surface the hovered target for the overlay UI.
 *
 * Every handler below is identity-stable for the lifetime of the hook: the
 * volatile inputs (`isDroppable`/`onDrop`) are read through refs rather than
 * captured in `useCallback` deps. This matters because the host app rebuilds its
 * week state on a steady cadence, so the consumer re-renders frequently — even
 * mid-drag. If our handlers changed identity on those renders, the cleanup
 * effect would fire and rip the `mousemove`/`mouseup` listeners off `document`
 * while a drag was in flight, freezing the ghost and dropping the gesture. Stable
 * handlers + a mount-only cleanup keep the listeners attached until the drag (or
 * the component) actually ends.
 */
export const useActiveWorkDrag = ({ isDroppable, onDrop }: UseActiveWorkDragOptions) => {
  const [dragging, setDragging] = useState<JiraTicket | null>(null);
  const [hoverDay, setHoverDay] = useState<string | null>(null);
  const [hoverHours, setHoverHours] = useState<number | null>(null);
  const [hoverRect, setHoverRect] = useState<DragHoverRect | null>(null);
  const [hoverStartedMinutes, setHoverStartedMinutes] = useState<number | null>(null);
  const [hoverSlotRect, setHoverSlotRect] = useState<DragHoverRect | null>(null);

  const ghostRef = useRef<HTMLDivElement | null>(null);
  const armedRef = useRef<{ ticket: JiraTicket; x: number; y: number } | null>(null);
  // Mirrors of the latest state so global listeners read fresh values without
  // re-subscribing on every pointer move.
  const draggingRef = useRef<JiraTicket | null>(null);
  const hoverDayRef = useRef<string | null>(null);
  const hoverHoursRef = useRef<number | null>(null);
  const hoverStartedMinutesRef = useRef<number | null>(null);

  // Latest-ref mirrors of the per-render callbacks. Updated every render so the
  // stable handlers always invoke the freshest `isDroppable`/`onDrop` without
  // taking them as `useCallback` deps (see the hook doc comment above).
  const isDroppableRef = useRef(isDroppable);
  const onDropRef = useRef(onDrop);
  isDroppableRef.current = isDroppable;
  onDropRef.current = onDrop;

  const moveGhost = useCallback((x: number, y: number) => {
    const ghost = ghostRef.current;
    if (ghost) {
      ghost.style.transform = `translate(${x + 16}px, ${y + 12}px)`;
    }
  }, []);

  const endDrag = useCallback(() => {
    draggingRef.current = null;
    hoverDayRef.current = null;
    hoverHoursRef.current = null;
    hoverStartedMinutesRef.current = null;
    setDragging(null);
    setHoverDay(null);
    setHoverHours(null);
    setHoverRect(null);
    setHoverStartedMinutes(null);
    setHoverSlotRect(null);
    try {
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    } catch {
      /* ignore */
    }
  }, []);

  const handleDragMove = useCallback(
    (event: MouseEvent) => {
      moveGhost(event.clientX, event.clientY);
      const element = document.elementFromPoint(event.clientX, event.clientY);
      let dateKey: string | null = null;
      let hours: number | null = null;
      let startedMinutes: number | null = null;
      let slotRect: DragHoverRect | null = null;

      if (element) {
        const laneEl = element.closest<HTMLElement>("[data-drop-hours]");
        const timelineEl = element.closest<HTMLElement>("[data-drop-timeline]");
        const dayEl = element.closest<HTMLElement>("[data-drop-day]");
        if (laneEl) {
          const parsed = Number.parseFloat(laneEl.getAttribute("data-drop-hours") ?? "");
          if (Number.isFinite(parsed)) {
            hours = parsed;
          }
        }
        if (dayEl) {
          dateKey = dayEl.getAttribute("data-drop-day");
          if (dateKey && (hoverDayRef.current !== dateKey || timelineEl)) {
            const box = dayEl.getBoundingClientRect();
            setHoverRect({ left: box.left, top: box.top, width: box.width, height: box.height });
          }
        }
        if (timelineEl) {
          const box = timelineEl.getBoundingClientRect();
          const startMin = Number(timelineEl.getAttribute("data-timeline-start"));
          const endMin = Number(timelineEl.getAttribute("data-timeline-end"));
          if (Number.isFinite(startMin) && Number.isFinite(endMin) && endMin > startMin && box.height > 0) {
            const ratio = Math.max(0, Math.min(1, (event.clientY - box.top) / box.height));
            const rawMinute = startMin + ratio * (endMin - startMin);
            const lastFullSlotStart = Math.max(startMin, endMin - 60);
            startedMinutes = Math.max(startMin, Math.min(lastFullSlotStart, Math.round(rawMinute / 15) * 15));
            const slotTop = box.top + ((startedMinutes - startMin) / (endMin - startMin)) * box.height;
            const slotHeight = Math.max(18, (60 / (endMin - startMin)) * box.height);
            slotRect = { left: box.left + 4, top: slotTop, width: Math.max(0, box.width - 14), height: slotHeight };
            hours = 1;
          }
        }
      }

      if (!dateKey) {
        setHoverRect(null);
      }

      if (dateKey !== hoverDayRef.current) {
        hoverDayRef.current = dateKey;
        setHoverDay(dateKey);
      }
      if (hours !== hoverHoursRef.current) {
        hoverHoursRef.current = hours;
        setHoverHours(hours);
      }
      if (startedMinutes !== hoverStartedMinutesRef.current) {
        hoverStartedMinutesRef.current = startedMinutes;
        setHoverStartedMinutes(startedMinutes);
      }
      setHoverSlotRect(slotRect);
    },
    [moveGhost]
  );

  const handleDragUp = useCallback(() => {
    document.removeEventListener("mousemove", handleDragMove);
    document.removeEventListener("mouseup", handleDragUp);

    const ticket = draggingRef.current;
    const dateKey = hoverDayRef.current;
    const hours = hoverHoursRef.current;
    const startedMinutes = hoverStartedMinutesRef.current;
    endDrag();

    if (ticket && dateKey && isDroppableRef.current(dateKey)) {
      onDropRef.current({ ticket, dateKey, hours: hours ?? 1, ...(startedMinutes == null ? {} : { startedMinutes }) });
    }
  }, [endDrag, handleDragMove]);

  const startDrag = useCallback(
    (ticket: JiraTicket, event: MouseEvent) => {
      try {
        document.body.style.userSelect = "none";
        document.body.style.cursor = "grabbing";
      } catch {
        /* ignore */
      }
      draggingRef.current = ticket;
      setDragging(ticket);
      setHoverDay(null);
      setHoverHours(null);
      setHoverRect(null);
      setHoverStartedMinutes(null);
      setHoverSlotRect(null);
      document.addEventListener("mousemove", handleDragMove);
      document.addEventListener("mouseup", handleDragUp);
      // Position the ghost immediately so it does not flash at the origin.
      requestAnimationFrame(() => moveGhost(event.clientX, event.clientY));
    },
    [handleDragMove, handleDragUp, moveGhost]
  );

  const handlePreMove = useCallback(
    (event: MouseEvent) => {
      const armed = armedRef.current;
      if (!armed) {
        return;
      }
      if (Math.hypot(event.clientX - armed.x, event.clientY - armed.y) > DRAG_THRESHOLD_PX) {
        armedRef.current = null;
        document.removeEventListener("mousemove", handlePreMove);
        document.removeEventListener("mouseup", handlePreUp);
        startDrag(armed.ticket, event);
      }
    },
    [startDrag]
  );

  const handlePreUp = useCallback(() => {
    armedRef.current = null;
    document.removeEventListener("mousemove", handlePreMove);
    document.removeEventListener("mouseup", handlePreUp);
  }, [handlePreMove]);

  const beginGrab = useCallback(
    (ticket: JiraTicket, event: React.MouseEvent) => {
      if (event.button !== 0) {
        return;
      }
      event.preventDefault();
      armedRef.current = { ticket, x: event.clientX, y: event.clientY };
      document.addEventListener("mousemove", handlePreMove);
      document.addEventListener("mouseup", handlePreUp);
    },
    [handlePreMove, handlePreUp]
  );

  // Safety net for unmount-while-dragging only. The handlers are identity-stable,
  // so empty deps keep this from re-running on the consumer's frequent re-renders
  // — re-running mid-drag is exactly what used to tear the live listeners off and
  // freeze the gesture. Active-drag teardown is handled imperatively in
  // handleDragUp / handlePreUp instead.
  useEffect(() => {
    return () => {
      document.removeEventListener("mousemove", handlePreMove);
      document.removeEventListener("mouseup", handlePreUp);
      document.removeEventListener("mousemove", handleDragMove);
      document.removeEventListener("mouseup", handleDragUp);
      try {
        document.body.style.userSelect = "";
        document.body.style.cursor = "";
      } catch {
        /* ignore */
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isHoverBlocked = Boolean(hoverDay && !isDroppable(hoverDay));

  return {
    dragging,
    hoverDay,
    hoverHours,
    hoverRect,
    hoverStartedMinutes,
    hoverSlotRect,
    isHoverBlocked,
    ghostRef,
    beginGrab
  };
};
