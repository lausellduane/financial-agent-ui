/**
 * react-native-css@3.0.7 rewrites react-native-web's own imports to its CSS
 * wrappers. That cycle crashes the web bundle at startup (FlatList default is
 * undefined) on every static host, including Cloudflare.
 * Upstream: https://github.com/nativewind/react-native-css/issues/380
 *
 * Keep react-native-web internals on the raw components. App imports of
 * react-native still receive the CSS wrappers.
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..", "node_modules", "react-native-css");
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));

if (pkg.version !== "3.0.7") {
  console.warn(
    `react-native-css@${pkg.version}: this web-crash patch was written for 3.0.7. Re-export the web bundle and confirm the page renders.`,
  );
}

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

for (const patch of patches) {
  const file = path.join(root, patch.file);
  const text = fs.readFileSync(file, "utf8");
  if (text.includes(patch.to)) {
    console.log(`already patched ${patch.file}`);
    continue;
  }
  if (!text.includes(patch.from)) {
    throw new Error(
      `Could not patch ${patch.file}. react-native-css@${pkg.version} no longer matches the expected source.`,
    );
  }
  fs.writeFileSync(file, text.replace(patch.from, patch.to));
  console.log(`patched ${patch.file}`);
}
