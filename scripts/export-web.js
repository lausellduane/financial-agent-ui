/**
 * Production web export.
 * - Applies the react-native-css patch in strict mode (fails the export, not install).
 * - Empty or "/" EXPO_PUBLIC_API_URL means same-origin /api/* on the web.
 * - Any other value must be an absolute http(s) origin. Trailing slashes are removed.
 * - Always exports with a clear Metro cache.
 */
const { spawnSync } = require("child_process");
const path = require("path");

const root = path.join(__dirname, "..");

function fail(message) {
  console.error(message);
  process.exit(1);
}

function normalizeApiOrigin(raw) {
  if (raw == null) return "";
  const trimmed = String(raw).trim();
  if (trimmed === "" || trimmed === "/") return "";
  let url;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (url.username || url.password || url.search || url.hash) return null;
  if (url.pathname !== "/" && url.pathname !== "") return null;
  return url.origin;
}

const patch = spawnSync(
  process.execPath,
  [path.join(__dirname, "patch-react-native-css-web.js"), "--strict"],
  { cwd: root, stdio: "inherit" },
);
if (patch.error) fail(patch.error.message);
if (patch.status !== 0) process.exit(patch.status ?? 1);

const normalized = normalizeApiOrigin(process.env.EXPO_PUBLIC_API_URL);
if (normalized == null) {
  fail(
    "EXPO_PUBLIC_API_URL must be empty or \"/\" for same-origin /api, or an absolute http(s) origin with no path, query, or trailing slash. Example: https://finance.example.com",
  );
}

const env = { ...process.env };
if (normalized === "") {
  delete env.EXPO_PUBLIC_API_URL;
  console.log("EXPO_PUBLIC_API_URL is empty: web bundle will call same-origin /api/*.");
} else {
  env.EXPO_PUBLIC_API_URL = normalized;
  console.log(`EXPO_PUBLIC_API_URL normalized to ${normalized}`);
}

const expoCli = require.resolve("expo/bin/cli", { paths: [root] });
const result = spawnSync(
  process.execPath,
  [expoCli, "export", "--platform", "web", "--clear"],
  { cwd: root, stdio: "inherit", env },
);
if (result.error) fail(result.error.message);
process.exit(result.status ?? 1);
