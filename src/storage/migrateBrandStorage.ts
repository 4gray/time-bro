export const BRAND_STORAGE_KEY_MIGRATIONS = [
  ["timebro-theme", "yesterlog-theme"],
  ["sprintf-theme", "yesterlog-theme"],
  ["timebro-update-info", "yesterlog-update-info"],
  ["timebro.reportTab", "yesterlog.reportTab"],
  ["timebro-recap-preferences", "yesterlog-recap-preferences"],
  ["timebro-ticket-picker-sort", "yesterlog-ticket-picker-sort"],
  ["timebro-ticket-picker-assigned-only", "yesterlog-ticket-picker-assigned-only"],
  ["timebro-active-dock", "yesterlog-active-dock"],
  ["timebro-week-view-mode", "yesterlog-week-view-mode"]
] as const;

interface BrandStorageMigrationResult {
  migrated: string[];
  preserved: string[];
  failed: string[];
}

export const migrateBrandStorage = (storage: Storage): BrandStorageMigrationResult => {
  const result: BrandStorageMigrationResult = {
    migrated: [],
    preserved: [],
    failed: []
  };

  for (const [legacyKey, currentKey] of BRAND_STORAGE_KEY_MIGRATIONS) {
    try {
      const legacyValue = storage.getItem(legacyKey);

      if (legacyValue === null) {
        continue;
      }

      if (storage.getItem(currentKey) === null) {
        storage.setItem(currentKey, legacyValue);
        result.migrated.push(legacyKey);
      } else {
        result.preserved.push(currentKey);
      }

      storage.removeItem(legacyKey);
    } catch {
      result.failed.push(legacyKey);
    }
  }

  return result;
};
