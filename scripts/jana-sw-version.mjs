import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";

let hash;
try {
  hash = execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim();
} catch {
  hash = Date.now().toString(36);
}

const versi = `mspo-audit-${hash}`;
writeFileSync("public/sw-version.js", `self.__SW_VERSION="${versi}";\n`);
console.log(`SW version: ${versi}`);
