import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const distDir = join(rootDir, "dist");
const failures = [];

const expectedExerciseFiles = [
  "barbell-squat.png",
  "bench-press.png",
  "deadlift.png",
  "face-pull.png",
  "front-squat.png",
  "horizontal-row.png",
  "hyperextension-leg-curl.png",
  "incline-dumbbell-press.png",
  "lat-pulldown.png",
  "lateral-raise-abs.png",
  "leg-press-lunge.png",
  "overhead-press.png",
  "plank.png",
  "pull-up.png",
  "romanian-deadlift.png",
];

for (const file of [
  "index.html",
  "manifest.webmanifest",
  "registerSW.js",
  "sw.js",
  "_headers",
  "pwa-192x192.png",
  "pwa-512x512.png",
]) {
  assertFile(file);
}

const manifest = readJson("manifest.webmanifest");
assertEqual(manifest.name, "Gym Tracker", "manifest name");
assertEqual(manifest.short_name, "Gym", "manifest short_name");
assertEqual(manifest.id, ".", "manifest id");
assertEqual(manifest.scope, ".", "manifest scope");
assertEqual(manifest.lang, "ru", "manifest lang");
assertEqual(manifest.display, "standalone", "manifest display");
assertEqual(manifest.orientation, "portrait", "manifest orientation");
assertEqual(manifest.start_url, ".", "manifest start_url");
assertEqual(manifest.theme_color, "#1f6f68", "manifest theme_color");

const iconSizes = new Set((manifest.icons ?? []).map((icon) => icon.sizes));
for (const size of ["192x192", "512x512"]) {
  if (!iconSizes.has(size)) {
    failures.push(`manifest icon ${size} is missing`);
  }
}

const exerciseDir = join(distDir, "exercises");
if (!existsSync(exerciseDir)) {
  failures.push("dist/exercises directory is missing");
} else {
  const actualExerciseFiles = readdirSync(exerciseDir)
    .filter((file) => file.endsWith(".png"))
    .sort();

  assertEqual(actualExerciseFiles.length, expectedExerciseFiles.length, "exercise PNG count");

  for (const file of expectedExerciseFiles) {
    assertFile(join("exercises", file), 1024);
  }
}

const serviceWorker = readText("sw.js");
for (const file of [
  "index.html",
  "manifest.webmanifest",
  "pwa-192x192.png",
  "pwa-512x512.png",
  ...expectedExerciseFiles.map((file) => `exercises/${file}`),
]) {
  if (!serviceWorker.includes(`url:"${file}"`)) {
    failures.push(`service worker precache does not include ${file}`);
  }
}

const indexHtml = readText("index.html");
for (const fragment of ["manifest.webmanifest", "registerSW.js", "theme-color"]) {
  if (!indexHtml.includes(fragment)) {
    failures.push(`index.html does not include ${fragment}`);
  }
}

const headers = readText("_headers");
for (const fragment of ["Cache-Control: no-cache", "/assets/*", "/exercises/*"]) {
  if (!headers.includes(fragment)) {
    failures.push(`_headers does not include ${fragment}`);
  }
}

if (failures.length > 0) {
  console.error("Production smoke check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Production smoke check passed: ${expectedExerciseFiles.length} exercise images, manifest, and service worker.`);

function assertFile(relativePath, minBytes = 1) {
  const absolutePath = join(distDir, relativePath);

  if (!existsSync(absolutePath)) {
    failures.push(`${relativePath} is missing`);
    return;
  }

  const { size } = statSync(absolutePath);
  if (size < minBytes) {
    failures.push(`${relativePath} is too small (${size} bytes)`);
  }
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    failures.push(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function readJson(relativePath) {
  try {
    return JSON.parse(readText(relativePath));
  } catch (error) {
    failures.push(`${relativePath} is not valid JSON: ${formatError(error)}`);
    return {};
  }
}

function readText(relativePath) {
  const absolutePath = join(distDir, relativePath);

  try {
    return readFileSync(absolutePath, "utf8");
  } catch (error) {
    failures.push(`cannot read ${relativePath}: ${formatError(error)}`);
    return "";
  }
}

function formatError(error) {
  return error instanceof Error ? error.message : String(error);
}
