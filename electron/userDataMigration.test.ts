import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { migrateLegacyUserData } from "./userDataMigration";

const temporaryDirectories: string[] = [];

const createWorkspace = () => {
  const workspacePath = fs.mkdtempSync(path.join(os.tmpdir(), "yesterlog-migration-"));
  temporaryDirectories.push(workspacePath);
  return workspacePath;
};

const writeProfileEntry = (profilePath: string, entryName: string, contents: string) => {
  const entryPath = path.join(profilePath, entryName);
  fs.mkdirSync(path.dirname(entryPath), { recursive: true });
  fs.writeFileSync(entryPath, contents, "utf8");
};

afterEach(() => {
  for (const temporaryDirectory of temporaryDirectories.splice(0)) {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  }
});

describe("migrateLegacyUserData", () => {
  it("chooses the primary legacy profile without merging the fallback profile", () => {
    const appDataPath = createWorkspace();
    const currentUserDataPath = path.join(appDataPath, "yesterlog");
    writeProfileEntry(path.join(appDataPath, "timebro"), "IndexedDB/primary.txt", "primary");
    writeProfileEntry(path.join(appDataPath, "jira-week-tracker"), "Local Storage/fallback.txt", "fallback");

    const result = migrateLegacyUserData({
      appDataPath,
      currentUserDataPath,
      env: {}
    });

    expect(result.status).toBe("migrated");
    expect(fs.readFileSync(path.join(currentUserDataPath, "IndexedDB/primary.txt"), "utf8")).toBe("primary");
    expect(fs.existsSync(path.join(currentUserDataPath, "Local Storage/fallback.txt"))).toBe(false);
  });

  it("uses the fallback profile when the primary profile has no migratable data", () => {
    const appDataPath = createWorkspace();
    const currentUserDataPath = path.join(appDataPath, "yesterlog");
    fs.mkdirSync(path.join(appDataPath, "timebro"), { recursive: true });
    writeProfileEntry(path.join(appDataPath, "jira-week-tracker"), "window-state.json", "{\"width\":1200}");

    const result = migrateLegacyUserData({
      appDataPath,
      currentUserDataPath,
      env: {}
    });

    expect(result.status).toBe("migrated");
    expect(result.sourcePath).toBe(path.join(appDataPath, "jira-week-tracker"));
    expect(fs.readFileSync(path.join(currentUserDataPath, "window-state.json"), "utf8")).toBe(
      "{\"width\":1200}"
    );
  });

  it("does not overwrite an existing Yesterlog profile on repeated runs", () => {
    const appDataPath = createWorkspace();
    const currentUserDataPath = path.join(appDataPath, "yesterlog");
    writeProfileEntry(currentUserDataPath, "IndexedDB/current.txt", "current");
    writeProfileEntry(path.join(appDataPath, "timebro"), "IndexedDB/legacy.txt", "legacy");

    const result = migrateLegacyUserData({
      appDataPath,
      currentUserDataPath,
      env: {}
    });

    expect(result.status).toBe("current");
    expect(fs.readFileSync(path.join(currentUserDataPath, "IndexedDB/current.txt"), "utf8")).toBe("current");
    expect(fs.existsSync(path.join(currentUserDataPath, "IndexedDB/legacy.txt"))).toBe(false);
  });

  it("falls back to the selected legacy profile if copying fails", () => {
    const appDataPath = createWorkspace();
    const sourcePath = path.join(appDataPath, "timebro");
    const currentUserDataPath = path.join(appDataPath, "yesterlog");
    writeProfileEntry(sourcePath, "IndexedDB/legacy.txt", "legacy");

    const result = migrateLegacyUserData({
      appDataPath,
      currentUserDataPath,
      env: {},
      copyEntry: () => {
        throw new Error("disk full");
      }
    });

    expect(result.status).toBe("legacy-fallback");
    expect(result.userDataPath).toBe(sourcePath);
    expect(result.error?.message).toBe("disk full");
    expect(fs.existsSync(currentUserDataPath)).toBe(false);
  });

  it("bypasses migration entirely inside Snap", () => {
    const appDataPath = createWorkspace();
    const currentUserDataPath = path.join(appDataPath, "yesterlog");
    writeProfileEntry(path.join(appDataPath, "timebro"), "IndexedDB/legacy.txt", "legacy");

    const result = migrateLegacyUserData({
      appDataPath,
      currentUserDataPath,
      env: { SNAP: "/snap/yesterlog/current" }
    });

    expect(result.status).toBe("snap-bypass");
    expect(fs.existsSync(currentUserDataPath)).toBe(false);
  });
});
