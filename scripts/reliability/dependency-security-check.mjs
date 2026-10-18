import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const expected = new Set(["@next/eslint-plugin-next", "braces", "eslint-config-next", "fast-glob", "micromatch"]);
const lock = JSON.parse(readFileSync("package-lock.json", "utf8"));
const audit = spawnSync("npm", ["audit", "--json"], { encoding: "utf8" });

let report;
try {
  report = JSON.parse(audit.stdout || "{}");
} catch {
  console.error("Dependency security check could not parse npm audit output.");
  process.exit(1);
}

const findings = new Set(Object.keys(report.vulnerabilities || {}));
const unexpected = [...findings].filter((name) => !expected.has(name));
const missing = [...expected].filter((name) => !findings.has(name));
const production = [...findings].filter((name) => lock.packages[`node_modules/${name}`]?.dev !== true);

console.log(`npm audit exit: ${audit.status ?? "signal"}`);
console.log(`Observed high-chain packages: ${[...findings].sort().join(", ") || "none"}`);

if (unexpected.length || production.length || missing.length) {
  console.error(`Unexpected dependency-security state. unexpected=${unexpected.join(",") || "none"} production=${production.join(",") || "none"} missing=${missing.join(",") || "none"}`);
  process.exit(1);
}

console.log("Accepted external debt: the exact known findings are development-only tooling findings in the Next ESLint chain.");
console.log("This check fails when the finding set changes or a production dependency becomes affected; it does not suppress npm audit output.");
