import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Pin the workspace root to this repo. Vercel build workers were hanging
  // in 'Building…' state because the Next.js inferred root resolved to
  // the parent workspace (due to an orphan package-lock.json outside this repo),
  // which made output-file tracing get stuck on an unrelated monorepo.
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
