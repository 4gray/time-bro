import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Display } from "electron";
import { afterEach, describe, expect, it } from "vitest";
import {
  DEFAULT_WINDOW_HEIGHT,
  DEFAULT_WINDOW_WIDTH,
  getWindowStateOptions,
  MIN_WINDOW_HEIGHT,
  MIN_WINDOW_WIDTH,
  WINDOW_STATE_FILE
} from "./windowState";

const displays = [
  {
    workArea: {
      x: 0,
      y: 0,
      width: 1920,
      height: 1080
    }
  }
] as Display[];

let tempUserDataPaths: string[] = [];

const createUserDataPath = () => {
  const userDataPath = mkdtempSync(path.join(os.tmpdir(), "timebro-window-state-"));
  tempUserDataPaths.push(userDataPath);
  return userDataPath;
};

const writeSavedState = (userDataPath: string, state: unknown) => {
  const rawState = typeof state === "string" ? state : JSON.stringify(state);
  writeFileSync(path.join(userDataPath, WINDOW_STATE_FILE), rawState);
};

afterEach(() => {
  for (const tempUserDataPath of tempUserDataPaths) {
    rmSync(tempUserDataPath, { recursive: true, force: true });
  }

  tempUserDataPaths = [];
});

describe("window state options", () => {
  it("uses the default size when no saved state exists", () => {
    const userDataPath = createUserDataPath();

    expect(getWindowStateOptions(userDataPath, displays)).toEqual({
      width: DEFAULT_WINDOW_WIDTH,
      height: DEFAULT_WINDOW_HEIGHT
    });
  });

  it("restores saved bounds when they fit an available display", () => {
    const userDataPath = createUserDataPath();
    writeSavedState(userDataPath, {
      x: 120,
      y: 90,
      width: 1280,
      height: 820
    });

    expect(getWindowStateOptions(userDataPath, displays)).toEqual({
      x: 120,
      y: 90,
      width: 1280,
      height: 820
    });
  });

  it("falls back to centered size when saved bounds are off-screen", () => {
    const userDataPath = createUserDataPath();
    writeSavedState(userDataPath, {
      x: 3000,
      y: 90,
      width: 1280,
      height: 820
    });

    expect(getWindowStateOptions(userDataPath, displays)).toEqual({
      width: 1280,
      height: 820
    });
  });

  it("keeps restored windows within the current work area", () => {
    const userDataPath = createUserDataPath();
    writeSavedState(userDataPath, {
      x: 100,
      y: 100,
      width: 3000,
      height: 2000
    });

    expect(getWindowStateOptions(userDataPath, displays)).toEqual({
      x: 0,
      y: 0,
      width: 1920,
      height: 1080
    });
  });

  it("ignores unreadable state files", () => {
    const userDataPath = createUserDataPath();
    writeSavedState(userDataPath, "{");

    expect(getWindowStateOptions(userDataPath, displays)).toEqual({
      width: DEFAULT_WINDOW_WIDTH,
      height: DEFAULT_WINDOW_HEIGHT
    });
  });

  it("enforces the app minimum size", () => {
    const userDataPath = createUserDataPath();
    writeSavedState(userDataPath, {
      x: 120,
      y: 90,
      width: 400,
      height: 300
    });

    expect(getWindowStateOptions(userDataPath, displays)).toEqual({
      x: 120,
      y: 90,
      width: MIN_WINDOW_WIDTH,
      height: MIN_WINDOW_HEIGHT
    });
  });
});
