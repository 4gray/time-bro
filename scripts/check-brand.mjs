import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const legacyNameTail = "bro";
const legacyRecapCopy = ["Bro", "read"].join(" ");
const LEGACY_BRAND_PATTERN = new RegExp(
  `time(?:[-_ ]?${legacyNameTail}|(?:<[^>]+>)+${legacyNameTail})|\\bt${legacyNameTail}\\b|\\btb-[a-z]|${legacyRecapCopy}`,
  "gi"
);
const LEGACY_MIGRATION_FILES = new Set([
  "electron/userDataMigration.ts",
  "electron/userDataMigration.test.ts",
  "src/storage/migrateBrandStorage.ts",
  "src/storage/migrateBrandStorage.test.ts"
]);

const fileNames = execFileSync(
  "git",
  ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
  { encoding: "utf8" }
)
  .split("\0")
  .filter(Boolean);

const violations = [];

for (const fileName of fileNames) {
  let contents;

  try {
    contents = readFileSync(fileName, "utf8");
  } catch {
    continue;
  }

  if (contents.includes("\0")) {
    continue;
  }

  for (const [index, line] of contents.split(/\r?\n/u).entries()) {
    LEGACY_BRAND_PATTERN.lastIndex = 0;
    const matches = [...line.matchAll(LEGACY_BRAND_PATTERN)];

    for (const match of matches) {
      const allowedMigrationReference = LEGACY_MIGRATION_FILES.has(fileName);
      const allowedPackageMetadata =
        fileName === "package.json" &&
        new RegExp(`^\\s*"--(?:replaces|conflicts)=time${legacyNameTail}",?\\s*$`, "u").test(line);

      if (!allowedMigrationReference && !allowedPackageMetadata) {
        violations.push(`${fileName}:${index + 1}: ${match[0]}`);
      }
    }
  }
}

if (violations.length > 0) {
  console.error("Legacy brand references found outside the migration allowlist:");
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exitCode = 1;
} else {
  console.log("Brand audit passed: legacy references are confined to migration compatibility code.");
}
