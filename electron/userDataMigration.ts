import fs from "node:fs";
import path from "node:path";

export const LEGACY_USER_DATA_DIRECTORY_NAMES = ["timebro", "jira-week-tracker"] as const;
export const MIGRATED_PROFILE_ENTRIES = ["IndexedDB", "Local Storage", "window-state.json"] as const;

type MigrationStatus = "current" | "migrated" | "legacy-fallback" | "snap-bypass";

export interface UserDataMigrationResult {
  status: MigrationStatus;
  userDataPath: string;
  sourcePath?: string;
  error?: Error;
}

interface UserDataMigrationOptions {
  appDataPath: string;
  currentUserDataPath: string;
  env: NodeJS.ProcessEnv;
  copyEntry?: (sourcePath: string, destinationPath: string) => void;
}

const isDirectory = (candidatePath: string) => {
  try {
    return fs.statSync(candidatePath).isDirectory();
  } catch {
    return false;
  }
};

const isNonEmptyDirectory = (candidatePath: string) => {
  try {
    return fs.readdirSync(candidatePath).length > 0;
  } catch {
    return false;
  }
};

const hasMigratableData = (candidatePath: string) => {
  return (
    isDirectory(candidatePath) &&
    MIGRATED_PROFILE_ENTRIES.some((entryName) => fs.existsSync(path.join(candidatePath, entryName)))
  );
};

const isSnapEnvironment = (env: NodeJS.ProcessEnv) => {
  return Boolean(env.SNAP || env.SNAP_NAME || env.SNAP_USER_DATA || env.SNAP_USER_COMMON);
};

const removeEmptyDirectory = (candidatePath: string) => {
  if (isDirectory(candidatePath) && !isNonEmptyDirectory(candidatePath)) {
    fs.rmdirSync(candidatePath);
  }
};

export const migrateLegacyUserData = ({
  appDataPath,
  currentUserDataPath,
  env,
  copyEntry = (sourcePath, destinationPath) => {
    fs.cpSync(sourcePath, destinationPath, { recursive: true, errorOnExist: true });
  }
}: UserDataMigrationOptions): UserDataMigrationResult => {
  if (isSnapEnvironment(env)) {
    return {
      status: "snap-bypass",
      userDataPath: currentUserDataPath
    };
  }

  if (isNonEmptyDirectory(currentUserDataPath)) {
    return {
      status: "current",
      userDataPath: currentUserDataPath
    };
  }

  const sourcePath = LEGACY_USER_DATA_DIRECTORY_NAMES.map((directoryName) =>
    path.join(appDataPath, directoryName)
  ).find(hasMigratableData);

  if (!sourcePath) {
    return {
      status: "current",
      userDataPath: currentUserDataPath
    };
  }

  const temporaryPath = `${currentUserDataPath}.migration`;

  try {
    fs.rmSync(temporaryPath, { recursive: true, force: true });
    fs.mkdirSync(temporaryPath, { recursive: true });

    for (const entryName of MIGRATED_PROFILE_ENTRIES) {
      const sourceEntryPath = path.join(sourcePath, entryName);

      if (fs.existsSync(sourceEntryPath)) {
        copyEntry(sourceEntryPath, path.join(temporaryPath, entryName));
      }
    }

    fs.writeFileSync(
      path.join(temporaryPath, ".yesterlog-profile-migration.json"),
      JSON.stringify(
        {
          sourceDirectory: path.basename(sourcePath),
          migratedAt: new Date().toISOString()
        },
        null,
        2
      ),
      "utf8"
    );

    if (isNonEmptyDirectory(currentUserDataPath)) {
      fs.rmSync(temporaryPath, { recursive: true, force: true });
      return {
        status: "current",
        userDataPath: currentUserDataPath
      };
    }

    removeEmptyDirectory(currentUserDataPath);
    fs.renameSync(temporaryPath, currentUserDataPath);

    return {
      status: "migrated",
      userDataPath: currentUserDataPath,
      sourcePath
    };
  } catch (cause) {
    fs.rmSync(temporaryPath, { recursive: true, force: true });
    return {
      status: "legacy-fallback",
      userDataPath: sourcePath,
      sourcePath,
      error: cause instanceof Error ? cause : new Error(String(cause))
    };
  }
};
