#!/usr/bin/env node
// Fails if any relative Markdown link in tracked .md files points to a missing file.
// Dependency-free. Run: npm run check:docs
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readFileSync } from "node:fs";
import { dirname, join, normalize } from "node:path";

const files = execFileSync("git", ["ls-files", "*.md"], { encoding: "utf8" })
  .split("\n")
  .filter((f) => f && !f.startsWith("node_modules/"));

const linkRe = /\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
const broken = [];

for (const file of files) {
  const text = readFileSync(file, "utf8").replace(/```[\s\S]*?```/g, "");
  for (const m of text.matchAll(linkRe)) {
    const raw = m[1];
    if (/^(https?:|mailto:|tel:|#|<)/.test(raw)) continue;
    const target = decodeURIComponent(raw.split("#")[0].split("?")[0]);
    if (!target) continue;
    const resolved = target.startsWith("/")
      ? normalize(join(".", target))
      : normalize(join(dirname(file), target));
    if (!existsSync(resolved)) broken.push(`${file}: ${raw}`);
  }
}

if (broken.length) {
  console.error(`Broken docs links (${broken.length}):\n  ` + broken.join("\n  "));
  process.exit(1);
}
console.log(`Docs links OK (${files.length} Markdown files checked).`);
