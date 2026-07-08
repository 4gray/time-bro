import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import {
  ceilingForStart,
  clampMinute,
  DEFAULT_DRAFT_MINUTES,
  DEFAULT_SNAP_MINUTES,
  fitMove,
  fitResizeEnd,
  fitResizeStart,
  floorForEnd,
  MIN_ITEM_MINUTES,
  MINUTES_PER_DAY,
  overlapsCommitted,
  snapMinute,
  yToMinute,
  type CalendarItem,
  type DayLayout,
  type Range
} from "../domain/dayCalendar";

export type DragKind = "create" | "move" | "resize-start" | "resize-end";

/** The in-progress gesture geometry the calendar renders as a live preview. */
export interface DragDraft {
  kind: DragKind;
  itemId?: string;
  range: Range;
}

interface InternalDrag {
  kind: DragKind;
  item?: CalendarItem;
  durationMin: number;
  grabOffsetMin: number;
  anchorMin: number;
  startClientY: number;
  moved: boolean;
  range: Range;
}

interface UseDayCalendarInteractionArgs {
  layout: DayLayout;
  items: CalendarItem[];
  trackRef: RefObject<HTMLDivElement | null>;
  snap?: number;
  onCreate: (range: Range) => void;
  onCommitMove: (item: CalendarItem, range: Range) => void;
  onSelect: (item: CalendarItem) => void;
}

const MOVE_THRESHOLD_PX = 4;

/**
 * Pointer state machine for the day calendar: drag empty space to size a new block,
 * drag a block to move it, drag its edges to resize. All geometry snaps to the grid and
 * clamps into free space via the pure `fit*` helpers, so the strict non-overlapping lane
 * is enforced during the gesture. A gesture that doesn't cross the movement threshold is
 * treated as a click (create-default / select-to-edit) so taps still work.
 */
export const useDayCalendarInteraction = ({
  layout,
  items,
  trackRef,
  snap = DEFAULT_SNAP_MINUTES,
  onCreate,
  onCommitMove,
  onSelect
}: UseDayCalendarInteractionArgs) => {
  const [draft, setDraft] = useState<DragDraft | null>(null);
  const dragRef = useRef<InternalDrag | null>(null);

  // Keep the latest inputs in a ref so the stable window listeners never go stale.
  const ctxRef = useRef({ layout, items, snap, onCreate, onCommitMove, onSelect, trackRef });
  ctxRef.current = { layout, items, snap, onCreate, onCommitMove, onSelect, trackRef };

  const readMinute = useCallback((clientY: number) => {
    const { trackRef: ref, layout: current } = ctxRef.current;
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) {
      return current.startMin;
    }
    return clampMinute(yToMinute(clientY - rect.top, current), 0, MINUTES_PER_DAY);
  }, []);

  const onWindowMove = useCallback(
    (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) {
        return;
      }
      const { items: currentItems, snap: currentSnap, layout: currentLayout } = ctxRef.current;
      const pointer = readMinute(event.clientY);
      if (Math.abs(event.clientY - drag.startClientY) > MOVE_THRESHOLD_PX) {
        drag.moved = true;
      }

      if (drag.kind === "create") {
        if (pointer >= drag.anchorMin) {
          const ceiling = ceilingForStart(drag.anchorMin, currentItems, undefined, currentLayout.endMin);
          const endMin = clampMinute(snapMinute(pointer, currentSnap), drag.anchorMin + MIN_ITEM_MINUTES, ceiling);
          drag.range = { startMin: drag.anchorMin, endMin };
        } else {
          const floor = floorForEnd(drag.anchorMin, currentItems, undefined, currentLayout.startMin);
          const startMin = clampMinute(snapMinute(pointer, currentSnap), floor, drag.anchorMin - MIN_ITEM_MINUTES);
          drag.range = { startMin, endMin: drag.anchorMin };
        }
      } else if (drag.kind === "move" && drag.item) {
        const desiredStart = snapMinute(pointer - drag.grabOffsetMin, currentSnap);
        const fit = fitMove(desiredStart, drag.durationMin, currentItems, drag.item.id, currentLayout.startMin, currentLayout.endMin);
        if (fit) {
          drag.range = fit;
        }
      } else if (drag.kind === "resize-end" && drag.item) {
        drag.range = fitResizeEnd(drag.item.startMin, pointer, currentItems, drag.item.id, currentSnap, currentLayout.endMin);
      } else if (drag.kind === "resize-start" && drag.item) {
        drag.range = fitResizeStart(pointer, drag.item.endMin, currentItems, drag.item.id, currentSnap, currentLayout.startMin);
      }

      setDraft({ kind: drag.kind, itemId: drag.item?.id, range: drag.range });
    },
    [readMinute]
  );

  const onWindowUp = useCallback(() => {
    window.removeEventListener("pointermove", onWindowMove);
    window.removeEventListener("pointerup", onWindowUp);
    document.body.classList.remove("cal-dragging");

    const drag = dragRef.current;
    dragRef.current = null;
    setDraft(null);
    if (!drag) {
      return;
    }
    const { items: currentItems, layout: currentLayout, onCreate: create, onCommitMove: commit, onSelect: select } = ctxRef.current;

    if (drag.kind === "create") {
      let range = drag.range;
      if (!drag.moved) {
        const ceiling = ceilingForStart(drag.anchorMin, currentItems, undefined, currentLayout.endMin);
        range = { startMin: drag.anchorMin, endMin: Math.min(drag.anchorMin + DEFAULT_DRAFT_MINUTES, ceiling) };
      }
      if (range.endMin - range.startMin >= MIN_ITEM_MINUTES) {
        create(range);
      }
    } else if (drag.item) {
      if (drag.moved) {
        commit(drag.item, drag.range);
      } else {
        select(drag.item);
      }
    }
  }, [onWindowMove]);

  const begin = useCallback(
    (drag: InternalDrag) => {
      dragRef.current = drag;
      setDraft({ kind: drag.kind, itemId: drag.item?.id, range: drag.range });
      document.body.classList.add("cal-dragging");
      window.addEventListener("pointermove", onWindowMove);
      window.addEventListener("pointerup", onWindowUp);
    },
    [onWindowMove, onWindowUp]
  );

  useEffect(
    () => () => {
      window.removeEventListener("pointermove", onWindowMove);
      window.removeEventListener("pointerup", onWindowUp);
      document.body.classList.remove("cal-dragging");
    },
    [onWindowMove, onWindowUp]
  );

  const startCreate = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (event.button !== 0) {
        return;
      }
      const anchor = clampMinute(snapMinute(readMinute(event.clientY), ctxRef.current.snap), layout.startMin, layout.endMin - MIN_ITEM_MINUTES);
      // Don't start a create inside/atop a committed block (e.g. a click in the thin
      // track gutter beside a worklog) — that would violate the non-overlapping lane.
      if (overlapsCommitted(anchor, anchor + MIN_ITEM_MINUTES, ctxRef.current.items)) {
        return;
      }
      begin({
        kind: "create",
        durationMin: DEFAULT_DRAFT_MINUTES,
        grabOffsetMin: 0,
        anchorMin: anchor,
        startClientY: event.clientY,
        moved: false,
        range: { startMin: anchor, endMin: anchor + DEFAULT_DRAFT_MINUTES }
      });
    },
    [begin, layout.endMin, layout.startMin, readMinute]
  );

  const startBlockDrag = useCallback(
    (event: ReactPointerEvent<HTMLElement>, item: CalendarItem, kind: DragKind) => {
      if (event.button !== 0) {
        return;
      }
      event.stopPropagation();
      begin({
        kind,
        item,
        durationMin: item.endMin - item.startMin,
        grabOffsetMin: readMinute(event.clientY) - item.startMin,
        anchorMin: item.startMin,
        startClientY: event.clientY,
        moved: false,
        range: { startMin: item.startMin, endMin: item.endMin }
      });
    },
    [begin, readMinute]
  );

  return { draft, startCreate, startBlockDrag };
};
