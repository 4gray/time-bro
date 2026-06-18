import { existsSync } from "node:fs";
import { mkdir, rm, copyFile, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import sharp from "sharp";
import pngToIcoModule from "png-to-ico";

const execFileAsync = promisify(execFile);
const pngToIco = pngToIcoModule.default ?? pngToIcoModule;
const source = new URL("../assets/app-icon.svg", import.meta.url);
const sourcePath = fileURLToPath(source);
const buildDir = new URL("../build/", import.meta.url);
const rendererAssetsDir = new URL("../src/assets/", import.meta.url);
const iconsetDir = new URL("../build/icon.iconset/", import.meta.url);
const icoPngDir = new URL("../build/ico-png/", import.meta.url);

const renderPng = async (size, outputUrl) => {
  await sharp(sourcePath)
    .resize(size, size, {
      fit: "contain"
    })
    .png()
    .toFile(fileURLToPath(outputUrl));
};

await mkdir(buildDir, { recursive: true });
await mkdir(rendererAssetsDir, { recursive: true });
await mkdir(iconsetDir, { recursive: true });
await mkdir(icoPngDir, { recursive: true });

await renderPng(1024, new URL("../build/icon.png", import.meta.url));
await renderPng(256, new URL("../src/assets/app-icon.png", import.meta.url));
await copyFile(source, new URL("../src/assets/app-icon.svg", import.meta.url));

const iconsetSizes = [
  [16, "icon_16x16.png"],
  [32, "icon_16x16@2x.png"],
  [32, "icon_32x32.png"],
  [64, "icon_32x32@2x.png"],
  [128, "icon_128x128.png"],
  [256, "icon_128x128@2x.png"],
  [256, "icon_256x256.png"],
  [512, "icon_256x256@2x.png"],
  [512, "icon_512x512.png"],
  [1024, "icon_512x512@2x.png"]
];

for (const [size, filename] of iconsetSizes) {
  await renderPng(size, new URL(filename, iconsetDir));
}

if (existsSync("/usr/bin/iconutil")) {
  await execFileAsync("iconutil", [
    "-c",
    "icns",
    fileURLToPath(iconsetDir),
    "-o",
    fileURLToPath(new URL("../build/icon.icns", import.meta.url))
  ]);
} else {
  console.warn("iconutil not found; skipping build/icon.icns generation.");
}

const icoSizes = [16, 24, 32, 48, 64, 128, 256];
const icoPngPaths = [];

for (const size of icoSizes) {
  const output = new URL(`icon-${size}.png`, icoPngDir);
  await renderPng(size, output);
  icoPngPaths.push(fileURLToPath(output));
}

const icoBuffer = await pngToIco(icoPngPaths);
await writeFile(new URL("../build/icon.ico", import.meta.url), icoBuffer);

await rm(iconsetDir, { recursive: true, force: true });
await rm(icoPngDir, { recursive: true, force: true });

console.log("Generated Electron and renderer icons.");
