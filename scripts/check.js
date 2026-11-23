const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.resolve(__dirname, "..");

const commonJsFiles = [
  "server.js",
  "electron-main.js",
  "lib/app-server.js",
  "scripts/check.js"
];

const publicJsDir = path.join(root, "public", "js");
const esmFiles = fs.existsSync(publicJsDir)
  ? fs.readdirSync(publicJsDir).filter((f) => f.endsWith(".js")).map((f) => path.join("public", "js", f))
  : [];

let hasError = false;

for (const rel of commonJsFiles) {
  const full = path.join(root, rel);
  const res = spawnSync(process.execPath, ["--check", full], { encoding: "utf8" });
  if (res.status !== 0) {
    console.error(`Syntax check failed for ${rel}:\n${res.stderr}`);
    hasError = true;
  }
}

for (const rel of esmFiles) {
  const full = path.join(root, rel);
  const code = fs.readFileSync(full, "utf8");
  const res = spawnSync(
    process.execPath,
    ["--input-type=module", "--check"],
    { input: code, encoding: "utf8" }
  );
  if (res.status !== 0) {
    console.error(`ESM syntax check failed for ${rel}:\n${res.stderr}`);
    hasError = true;
  }
}

for (const requiredFile of ["public/index.html", "public/styles.css"]) {
  if (!fs.existsSync(path.join(root, requiredFile))) {
    console.error(`Missing required static asset: ${requiredFile}`);
    hasError = true;
  }
}

if (hasError) {
  process.exit(1);
}

console.log(`Checked ${commonJsFiles.length} server files and ${esmFiles.length} browser ES modules successfully.`);
