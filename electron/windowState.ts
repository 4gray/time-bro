import fs from "node:fs";
import path from "node:path";
import type { BrowserWindow, BrowserWindowConstructorOptions, Display, Rectangle } from "electron";

export const WINDOW_STATE_FILE = "window-state.json";
export const DEFAULT_WINDOW_WIDTH = 1440;
export const DEFAULT_WINDOW_HEIGHT = 960;
export const MIN_WINDOW_WIDTH = 1040;
export const MIN_WINDOW_HEIGHT = 720;

const SAVE_DELAY_MS = 250;

type PersistedWindowState = {
  x?: number;
  y?: number;
  width: number;
  height: number;
};

const getWindowStatePath = (userDataPath: string) => {
  return path.join(userDataPath, WINDOW_STATE_FILE);
};

const isFiniteNumber = (value: unknown): value is number => {
  return typeof value === "number" && Number.isFinite(value);
};

const clamp = (value: number, min: number, max: number) => {
  return Math.min(Math.max(value, min), max);
};

const normalizeDimension = (value: unknown, min: number, fallback: number) => {
  if (!isFiniteNumber(value)) {
    return fallback;
  }

  return Math.max(min, Math.round(value));
};

const normalizeWindowState = (value: unknown): PersistedWindowState | undefined => {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const candidate = value as Partial<PersistedWindowState>;
  const width = normalizeDimension(candidate.width, MIN_WINDOW_WIDTH, DEFAULT_WINDOW_WIDTH);
  const height = normalizeDimension(candidate.height, MIN_WINDOW_HEIGHT, DEFAULT_WINDOW_HEIGHT);
  const state: PersistedWindowState = { width, height };

  if (isFiniteNumber(candidate.x) && isFiniteNumber(candidate.y)) {
    state.x = Math.round(candidate.x);
    state.y = Math.round(candidate.y);
  }

  return state;
};

const readWindowState = (userDataPath: string): PersistedWindowState | undefined => {
  try {
    const rawState = fs.readFileSync(getWindowStatePath(userDataPath), "utf8");
    return normalizeWindowState(JSON.parse(rawState));
  } catch {
    return undefined;
  }
};

const writeWindowState = (userDataPath: string, bounds: Rectangle) => {
  const state = normalizeWindowState(bounds);

  if (!state || !isFiniteNumber(bounds.x) || !isFiniteNumber(bounds.y)) {
    return;
  }

  const filePath = getWindowStatePath(userDataPath);
  const serializedState = JSON.stringify({ ...state, x: Math.round(bounds.x), y: Math.round(bounds.y) }, null, 2);

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${serializedState}\n`);
};

const rectanglesIntersect = (left: Rectangle, right: Rectangle) => {
  return (
    left.x < right.x + right.width &&
    left.x + left.width > right.x &&
    left.y < right.y + right.height &&
    left.y + left.height > right.y
  );
};

const getLargestWorkArea = (displays: Display[]) => {
  return displays
    .map((display) => display.workArea)
    .sort((left, right) => right.width * right.height - left.width * left.height)[0];
};

const getMatchingWorkArea = (bounds: Rectangle, displays: Display[]) => {
  return displays.find((display) => rectanglesIntersect(bounds, display.workArea))?.workArea;
};

const clampBoundsToWorkArea = (bounds: Required<PersistedWindowState>, workArea: Rectangle) => {
  const width = clamp(bounds.width, MIN_WINDOW_WIDTH, Math.max(MIN_WINDOW_WIDTH, workArea.width));
  const height = clamp(bounds.height, MIN_WINDOW_HEIGHT, Math.max(MIN_WINDOW_HEIGHT, workArea.height));
  const maxX = Math.max(workArea.x, workArea.x + workArea.width - width);
  const maxY = Math.max(workArea.y, workArea.y + workArea.height - height);

  return {
    x: clamp(bounds.x, workArea.x, maxX),
    y: clamp(bounds.y, workArea.y, maxY),
    width,
    height
  };
};

const clampSizeToWorkArea = (bounds: PersistedWindowState, workArea?: Rectangle) => {
  if (!workArea) {
    return {
      width: bounds.width,
      height: bounds.height
    };
  }

  return {
    width: clamp(bounds.width, MIN_WINDOW_WIDTH, Math.max(MIN_WINDOW_WIDTH, workArea.width)),
    height: clamp(bounds.height, MIN_WINDOW_HEIGHT, Math.max(MIN_WINDOW_HEIGHT, workArea.height))
  };
};

export const getWindowStateOptions = (userDataPath: string, displays: Display[]): BrowserWindowConstructorOptions => {
  const savedState = readWindowState(userDataPath) ?? {
    width: DEFAULT_WINDOW_WIDTH,
    height: DEFAULT_WINDOW_HEIGHT
  };
  const largestWorkArea = getLargestWorkArea(displays);
  const size = clampSizeToWorkArea(savedState, largestWorkArea);

  if (isFiniteNumber(savedState.x) && isFiniteNumber(savedState.y)) {
    const savedBounds = {
      x: savedState.x,
      y: savedState.y,
      width: size.width,
      height: size.height
    };
    const workArea = getMatchingWorkArea(savedBounds, displays);

    if (workArea) {
      return clampBoundsToWorkArea(savedBounds, workArea);
    }
  }

  return size;
};

const getPersistableBounds = (window: BrowserWindow) => {
  if (window.isDestroyed() || window.isMinimized()) {
    return undefined;
  }

  if (window.isFullScreen() || window.isMaximized()) {
    return window.getNormalBounds();
  }

  return window.getBounds();
};

export const saveWindowState = (window: BrowserWindow, userDataPath: string) => {
  const bounds = getPersistableBounds(window);

  if (bounds) {
    writeWindowState(userDataPath, bounds);
  }
};

export const trackWindowState = (window: BrowserWindow, userDataPath: string) => {
  let saveTimer: NodeJS.Timeout | undefined;

  const scheduleSave = () => {
    if (saveTimer) {
      clearTimeout(saveTimer);
    }

    saveTimer = setTimeout(() => {
      saveTimer = undefined;
      saveWindowState(window, userDataPath);
    }, SAVE_DELAY_MS);
  };

  const saveImmediately = () => {
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = undefined;
    }

    saveWindowState(window, userDataPath);
  };

  window.on("resize", scheduleSave);
  window.on("move", scheduleSave);
  window.on("close", saveImmediately);
};
