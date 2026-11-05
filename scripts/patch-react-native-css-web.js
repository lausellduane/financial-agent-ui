/**
 * react-native-css@3.0.7 rewrites react-native-web's own imports onto its CSS
 * wrappers. That cycle crashes the web bundle before React renders.
 * Upstream: https://github.com/nativewind/react-native-css/issues/380
 *
 * Install (postinstall) never fails the install: a missing package, a different
 * version, or source that does not match is a warning and exit 0. No file is
 * written unless every edit matches. `export:web` runs this with --strict and
 * fails the export instead.
 */
const fs = require("fs");
const path = require("path");

const strict = process.argv.includes("--strict");
const projectRoot = path.join(__dirname, "..");
const EXPECTED_VERSION = "3.0.7";

const patches = [
  {
    file: "dist/commonjs/babel/import-plugin.js",
    from: `function isFromThisModule(filename) {
    return filename.startsWith(thisModuleDist) || filename.startsWith(thisModuleSrc);
  }`,
    to: `function isFromThisModule(filename) {
    return filename.startsWith(thisModuleDist) || filename.startsWith(thisModuleSrc) || filename.includes(_path.sep + "react-native-web" + _path.sep);
  }`,
  },
  {
    file: "dist/module/babel/import-plugin.js",
    from: `import { resolve } from "path";`,
    to: `import { resolve, sep } from "path";`,
  },
  {
    file: "dist/module/babel/import-plugin.js",
    from: `function isFromThisModule(filename) {
    return filename.startsWith(thisModuleDist) || filename.startsWith(thisModuleSrc);
  }`,
    to: `function isFromThisModule(filename) {
    return filename.startsWith(thisModuleDist) || filename.startsWith(thisModuleSrc) || filename.includes(sep + "react-native-web" + sep);
  }`,
  },
  {
    file: "dist/commonjs/metro/resolver.js",
    from: `  isFromThisModule(context.originModulePath) ||
  // Only operate on source files`,
    to: `  isFromThisModule(context.originModulePath) ||
  // react-native-web internals must keep their raw imports.
  context.originModulePath.includes(\`\${_nodePath.sep}react-native-web\${_nodePath.sep}\`) ||
  // Only operate on source files`,
  },
  {
    file: "dist/module/metro/resolver.js",
    from: `  isFromThisModule(context.originModulePath) ||
  // Only operate on source files`,
    to: `  isFromThisModule(context.originModulePath) ||
  // react-native-web internals must keep their raw imports.
  context.originModulePath.includes(\`\${sep}react-native-web\${sep}\`) ||
  // Only operate on source files`,
  },
];

function finish(message) {
  console.warn(message);
  process.exit(strict ? 1 : 0);
}

let packageJsonPath;
try {
  packageJsonPath = require.resolve("react-native-css/package.json", {
    paths: [projectRoot],
  });
} catch {
  finish(
    "react-native-css was not found. Skipping the web-crash patch. npm run export:web will fail until 3.0.7 is installed.",
  );
}

const packageRoot = path.dirname(packageJsonPath);
const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
if (pkg.version !== EXPECTED_VERSION) {
  finish(
    `react-native-css@${pkg.version} is installed; the web-crash patch matches only ${EXPECTED_VERSION}. Skipping. npm run export:web will fail.`,
  );
}

const original = new Map();
for (const patch of patches) {
  if (original.has(patch.file)) continue;
  const absolute = path.join(packageRoot, patch.file);
  if (!fs.existsSync(absolute)) {
    finish(
      `react-native-css@${EXPECTED_VERSION} is missing ${patch.file}. Skipping the web-crash patch.`,
    );
  }
  original.set(patch.file, fs.readFileSync(absolute, "utf8"));
}

const next = new Map(original);
for (const patch of patches) {
  let text = next.get(patch.file);
  if (text.includes(patch.to)) continue;
  if (!text.includes(patch.from)) {
    finish(
      `react-native-css@${EXPECTED_VERSION} ${patch.file} does not match the expected source. No files were changed.`,
    );
  }
  next.set(patch.file, text.replace(patch.from, patch.to));
}

function writeAtomic(dest, text) {
  const tmp = `${dest}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, text);
  try {
    fs.renameSync(tmp, dest);
  } catch (err) {
    try {
      fs.unlinkSync(tmp);
    } catch {
      // The original file is unchanged. Leave the temp file only if unlink fails.
    }
    throw err;
  }
}

for (const [file, text] of next) {
  if (text === original.get(file)) {
    console.log(`already patched ${file}`);
    continue;
  }
  writeAtomic(path.join(packageRoot, file), text);
  console.log(`patched ${file}`);
}
