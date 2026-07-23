// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { migrateBrandStorage } from "./migrateBrandStorage";

describe("migrateBrandStorage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("moves legacy values to their Yesterlog keys", () => {
    localStorage.setItem("timebro-theme", "dark");
    localStorage.setItem("timebro-week-view-mode", "timeline");

    const result = migrateBrandStorage(localStorage);

    expect(localStorage.getItem("yesterlog-theme")).toBe("dark");
    expect(localStorage.getItem("yesterlog-week-view-mode")).toBe("timeline");
    expect(localStorage.getItem("timebro-theme")).toBeNull();
    expect(localStorage.getItem("timebro-week-view-mode")).toBeNull();
    expect(result.migrated).toEqual(["timebro-theme", "timebro-week-view-mode"]);
  });

  it("preserves an existing Yesterlog value and removes the stale key", () => {
    localStorage.setItem("yesterlog-theme", "light");
    localStorage.setItem("timebro-theme", "dark");

    const result = migrateBrandStorage(localStorage);

    expect(localStorage.getItem("yesterlog-theme")).toBe("light");
    expect(localStorage.getItem("timebro-theme")).toBeNull();
    expect(result.preserved).toEqual(["yesterlog-theme"]);
  });

  it("keeps the legacy key when writing the new value fails", () => {
    const values = new Map<string, string>([["timebro-theme", "dark"]]);
    const failingStorage = {
      get length() {
        return values.size;
      },
      clear: () => values.clear(),
      getItem: (key: string) => values.get(key) ?? null,
      key: (index: number) => [...values.keys()][index] ?? null,
      removeItem: (key: string) => {
        values.delete(key);
      },
      setItem: () => {
        throw new Error("storage unavailable");
      }
    } satisfies Storage;

    const result = migrateBrandStorage(failingStorage);

    expect(values.get("timebro-theme")).toBe("dark");
    expect(result.failed).toEqual(["timebro-theme"]);
  });
});
