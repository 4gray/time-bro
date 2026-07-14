// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { JiraTicket } from "../../shared/types";
import { useActiveWorkDrag, type DropTarget } from "./useActiveWorkDrag";

// Opt in to React's act() support outside of a renderer-provided test setup.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const TICKET = { key: "ABC-1", summary: "Drag me" } as unknown as JiraTicket;
const DAY_KEY = "2026-06-23";

// A test harness that exposes the hook's grab handler on a button. The parent
// passes in fresh isDroppable/onDrop callbacks on every render so we can simulate
// the host app's churn (it rebuilds week state — and therefore these callbacks —
// constantly, even mid-drag).
function Harness({
  isDroppable,
  onDrop
}: {
  isDroppable: (d: string, startedMinutes?: number, hours?: number, timelineEndMinutes?: number) => boolean;
  onDrop: (t: DropTarget) => void;
}) {
  const { beginGrab, dragging } = useActiveWorkDrag({ isDroppable, onDrop });
  return (
    <button data-testid="card" onMouseDown={(event) => beginGrab(TICKET, event)}>
      {dragging ? "dragging" : "idle"}
    </button>
  );
}

let container: HTMLDivElement;
let root: Root;
let dayLane: HTMLElement;

const mouse = (type: string, x: number, y: number, target: EventTarget) =>
  target.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 }));

const flushRaf = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  // jsdom has no rAF by default; the hook uses it only to position the ghost.
  globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) =>
    setTimeout(() => cb(0), 0)) as unknown as typeof requestAnimationFrame;
  globalThis.cancelAnimationFrame = ((id: number) => clearTimeout(id)) as unknown as typeof cancelAnimationFrame;

  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);

  // A stand-in for a drop lane inside a droppable day column. Real lanes carry
  // both data-drop-day and data-drop-hours. jsdom does no layout, so we hand the
  // hook this element directly via elementFromPoint.
  dayLane = document.createElement("div");
  dayLane.setAttribute("data-drop-day", DAY_KEY);
  dayLane.setAttribute("data-drop-hours", "2");
  document.body.appendChild(dayLane);
  dayLane.getBoundingClientRect = () =>
    ({ left: 100, top: 100, width: 200, height: 300, right: 300, bottom: 400, x: 100, y: 100, toJSON() {} }) as DOMRect;
  // jsdom does no layout, so elementFromPoint is absent — define it to hand the
  // hook our droppable lane regardless of coordinates.
  (document as Document & { elementFromPoint: (x: number, y: number) => Element | null }).elementFromPoint = () => dayLane;
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  dayLane.remove();
  vi.restoreAllMocks();
});

// Run a full grab -> threshold -> hover -> release gesture. `rerenderBeforeDrop`
// lets a test swap the parent's callbacks mid-drag to reproduce the regression.
const performDrag = async (
  initial: {
    isDroppable: (d: string, startedMinutes?: number, hours?: number, timelineEndMinutes?: number) => boolean;
    onDrop: (t: DropTarget) => void;
  },
  rerenderBeforeDrop?: {
    isDroppable: (d: string, startedMinutes?: number, hours?: number, timelineEndMinutes?: number) => boolean;
    onDrop: (t: DropTarget) => void;
  },
  dropY = 150
) => {
  await act(async () => {
    root.render(<Harness isDroppable={initial.isDroppable} onDrop={initial.onDrop} />);
  });
  const card = container.querySelector('[data-testid="card"]') as HTMLElement;

  await act(async () => {
    mouse("mousedown", 10, 10, card);
  });
  // Move past the 4px threshold to promote the armed card into a real drag.
  await act(async () => {
    mouse("mousemove", 30, 30, document);
    await flushRaf();
  });

  if (rerenderBeforeDrop) {
    // The host app re-renders with brand-new callback identities while the drag
    // is in flight. This used to trip the hook's cleanup effect and tear the
    // document listeners off, freezing the gesture.
    await act(async () => {
      root.render(<Harness isDroppable={rerenderBeforeDrop.isDroppable} onDrop={rerenderBeforeDrop.onDrop} />);
    });
  }

  // Move over the droppable lane, then release.
  await act(async () => {
    mouse("mousemove", 150, dropY, document);
  });
  await act(async () => {
    mouse("mouseup", 150, dropY, document);
  });
};

describe("useActiveWorkDrag", () => {
  it("logs a drop on a droppable day after a normal drag", async () => {
    const onDrop = vi.fn();
    await performDrag({ isDroppable: () => true, onDrop });

    expect(onDrop).toHaveBeenCalledTimes(1);
    expect(onDrop).toHaveBeenCalledWith({ ticket: TICKET, dateKey: DAY_KEY, hours: 2 });
  });

  it("snaps a timeline drop to an exact local start time", async () => {
    dayLane.setAttribute("data-drop-timeline", "true");
    dayLane.setAttribute("data-timeline-start", "420");
    dayLane.setAttribute("data-timeline-end", "1200");
    const onDrop = vi.fn();

    await performDrag({ isDroppable: () => true, onDrop });

    // y=150 is one sixth into the 07:00–20:00 track: 550m, snapped to 09:15.
    expect(onDrop).toHaveBeenCalledWith({
      ticket: TICKET,
      dateKey: DAY_KEY,
      hours: 1,
      startedMinutes: 555,
      timelineEndMinutes: 1200
    });
  });

  it("keeps a one-hour timeline drop inside the visible day window", async () => {
    dayLane.setAttribute("data-drop-timeline", "true");
    dayLane.setAttribute("data-timeline-start", "420");
    dayLane.setAttribute("data-timeline-end", "1200");
    const onDrop = vi.fn();

    await performDrag({ isDroppable: () => true, onDrop }, undefined, 399);

    expect(onDrop).toHaveBeenCalledWith({
      ticket: TICKET,
      dateKey: DAY_KEY,
      hours: 1,
      startedMinutes: 1140,
      timelineEndMinutes: 1200
    });
  });

  it("blocks a timeline drop when its exact interval is occupied", async () => {
    dayLane.setAttribute("data-drop-timeline", "true");
    dayLane.setAttribute("data-timeline-start", "420");
    dayLane.setAttribute("data-timeline-end", "1200");
    const onDrop = vi.fn();
    const isDroppable = vi.fn((_dateKey: string, startedMinutes?: number) => startedMinutes !== 555);

    await performDrag({ isDroppable, onDrop });

    expect(isDroppable).toHaveBeenCalledWith(DAY_KEY, 555, 1, 1200);
    expect(onDrop).not.toHaveBeenCalled();
  });

  // Regression: a re-render mid-drag (new isDroppable/onDrop identities) must not
  // kill the in-flight gesture, and the drop must reach the LATEST onDrop.
  it("survives a re-render mid-drag and drops via the latest onDrop", async () => {
    const staleOnDrop = vi.fn();
    const freshOnDrop = vi.fn();

    await performDrag(
      { isDroppable: () => true, onDrop: staleOnDrop },
      { isDroppable: () => true, onDrop: freshOnDrop }
    );

    expect(staleOnDrop).not.toHaveBeenCalled();
    expect(freshOnDrop).toHaveBeenCalledTimes(1);
    expect(freshOnDrop).toHaveBeenCalledWith({ ticket: TICKET, dateKey: DAY_KEY, hours: 2 });
  });

  // The droppability check must also reflect the freshest callback, not the one
  // captured when the drag started.
  it("respects the latest isDroppable when releasing", async () => {
    const onDrop = vi.fn();
    await performDrag(
      { isDroppable: () => true, onDrop },
      { isDroppable: () => false, onDrop } // day became non-droppable mid-drag
    );

    expect(onDrop).not.toHaveBeenCalled();
  });
});
