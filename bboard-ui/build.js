import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const dist = path.resolve("dist");
if (fs.existsSync(dist)) {
  fs.rmSync(dist, { recursive: true, force: true });
}

console.log("Running tsc...");
execSync("npx tsc", { stdio: "inherit" });

console.log("Running vite build...");
const mode = process.argv[2] || "preprod";
execSync(`npx vite build --mode ${mode}`, { stdio: "inherit" });

console.log("Copying keys and zkir assets...");
fs.mkdirSync(path.join(dist, "keys"), { recursive: true });
fs.mkdirSync(path.join(dist, "zkir"), { recursive: true });

const managedDir = path.resolve("../contract/src/managed/tipjar");
if (fs.existsSync(path.join(managedDir, "keys"))) {
  fs.cpSync(path.join(managedDir, "keys"), path.join(dist, "keys"), { recursive: true });
}
if (fs.existsSync(path.join(managedDir, "zkir"))) {
  fs.cpSync(path.join(managedDir, "zkir"), path.join(dist, "zkir"), { recursive: true });
}

console.log("UI Build completed successfully!");
