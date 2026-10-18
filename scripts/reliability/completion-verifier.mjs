#!/usr/bin/env node

// Dependency-free completion gate. The agent narrative is never its source of truth.
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import path from "node:path";

function runCommand(command, cwd) {
  return new Promise((resolve) => {
    const child = spawn(command, { cwd, shell: true, env: process.env });
    let output = "";
    child.stdout?.on("data", (chunk) => { output += chunk; });
    child.stderr?.on("data", (chunk) => { output += chunk; });
    child.on("error", (error) => resolve({ exitCode: null, output, error: error.message }));
    child.on("close", (exitCode) => resolve({ exitCode, output }));
  });
}

function projectRelative(root, candidate) {
  const absolute = path.resolve(root, candidate);
  const relative = path.relative(root, absolute);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Path is outside the project root: ${candidate}`);
  }
  return { absolute, relative };
}

function changedFiles(statusOutput) {
  return statusOutput.split(/\r?\n/).filter(Boolean).map((line) => {
    const value = line.slice(3);
    return value.includes(" -> ") ? value.split(" -> ").at(-1) : value;
  });
}

async function sha256(file) {
  return createHash("sha256").update(await readFile(file)).digest("hex");
}

async function loadBaseline(contract, root) {
  if (!contract.baseline) return null;
  if (typeof contract.baseline === "object") return contract.baseline;
  const { absolute } = projectRelative(root, contract.baseline);
  return JSON.parse(await readFile(absolute, "utf8"));
}

export function parseTestEvidence(output) {
  const number = (pattern) => {
    const match = output.match(pattern);
    return match ? Number(match[1]) : null;
  };
  const discovered = number(/(?:^|\n)#?\s*tests\s+(\d+)/i);
  const passed = number(/(?:^|\n)#?\s*pass(?:ed)?\s+(\d+)/i);
  const failed = number(/(?:^|\n)#?\s*fail(?:ed|ures?)?\s+(\d+)/i);
  const skipped = number(/(?:^|\n)#?\s*skipped\s+(\d+)/i);
  const ran = number(/Ran\s+(\d+)\s+tests?/i);
  const unittestFailed = /FAILED\s*\((?:failures|errors)=\d+/i.test(output);
  const unittestOk = /(?:^|\n)OK\s*$/m.test(output);
  return {
    discovered: discovered ?? ran,
    started: ran ?? (discovered !== null ? discovered : null),
    passed: passed ?? (unittestOk && ran !== null ? ran : null),
    failed: failed ?? (unittestFailed ? 1 : null),
    skipped,
  };
}

function executionStatus(evidence, exitCode) {
  if (exitCode === null) return "BLOCKED";
  if (evidence.discovered === null || evidence.discovered === 0) return "INCOMPLETE";
  if (evidence.started === null || evidence.started !== evidence.discovered) return "FAILED";
  if (evidence.failed > 0 || exitCode !== 0) return "FAILED";
  if (evidence.passed === null) return "INCOMPLETE";
  if (evidence.passed + (evidence.skipped ?? 0) !== evidence.started) return "INCOMPLETE";
  return "COMPLETE";
}

export async function verifyCompletion(contract, { commandRunner = runCommand } = {}) {
  const root = path.resolve(contract.root ?? process.cwd());
  const failures = [];
  const evidence = { files: [], tests: [], checks: [], git: null };
  if (!contract.objective?.trim()) failures.push("Original objective is missing.");
  if (!Array.isArray(contract.expectedFiles) || contract.expectedFiles.length === 0) failures.push("Exact expected files are required.");
  const baseline = await loadBaseline(contract, root).catch(() => null);
  if (!baseline) failures.push("A baseline captured before implementation is required.");

  const git = await commandRunner("git status --porcelain=v1", root);
  evidence.git = { exitCode: git.exitCode, changedFiles: changedFiles(git.output) };
  if (git.exitCode !== 0) failures.push("Git status could not be verified.");

  for (const expected of contract.expectedFiles ?? []) {
    try {
      const { absolute, relative } = projectRelative(root, expected.path);
      const exists = existsSync(absolute);
      const changed = evidence.git.changedFiles.some((entry) => entry === relative || (entry.endsWith("/") && relative.startsWith(entry)));
      let contentMatches = true;
      if (exists && expected.contains !== undefined) contentMatches = (await readFile(absolute, "utf8")).includes(expected.contains);
      const baselineFile = baseline?.files?.[relative];
      const currentHash = exists ? await sha256(absolute) : null;
      const changedSinceBaseline = Boolean(baselineFile ? baselineFile.sha256 !== currentHash : exists);
   files.push({ path: relative, exists, changed, changedSinceBaseline, contentMatches });
      if (!exists) failures.push(`Expected file is missing: ${relative}`);
      if (!changed) failures.push(`Expected file is not present in the Git change set: ${relative}`);
      if (!changedSinceBaseline) failures.push(`Expected file did not change after the captured baseline: ${relative}`);
      if (!contentMatches) failures.push(`Expected content is missing from: ${relative}`);
    } catch (error) {
      failures.push(error.message);
    }
  }

  for (const test of contract.tests ?? []) {
    const name = test.name ?? "unnamed";
    if (!test.discover || !test.run) {
      failures.push(`Test contract is incomplete: ${name}`);
      continue;
    }
    const discovery = await commandRunner(test.discover, root);
    const discoveryEvidence = parseTestEvidence(discovery.output);
    const item = { name, discover: discoveryEvidence, run: null, status: null };
    if (discovery.exitCode === null) {
      item.status = "BLOCKED";
      failures.push(`Test discovery is blocked: ${name}`);
    } else if (discovery.exitCode !== 0) {
      item.status = "FAILED";
      failures.push(`Test discovery failed: ${name}`);
    } else if (discoveryEvidence.discovered === null || discoveryEvidence.discovered === 0) {
      item.status = "INCOMPLETE";
      failures.push(`Test discovery did not prove a positive test count: ${name}`);
    } else {
      const execution = await commandRunner(test.run, root);
      item.run = parseTestEvidence(execution.output);
      item.status = executionStatus(item.run, execution.exitCode);
      if (item.status !== "COMPLETE") failures.push(`Test execution is ${item.status}: ${name}`);
    }
 tests.push(item);
  }
  for (const check of contract.checks ?? []) {
    const name = check.name ?? "unnamed";
    if (!check.command) {
   checks.push({ name, status: "INCOMPLETE", exitCode: null });
      failures.push(`Verification check is incomplete: ${name}`);
      continue;
    }
    const result = await commandRunner(check.command, root);
    const status = result.exitCode === null ? "BLOCKED" : result.exitCode === 0 ? "COMPLETE" : "FAILED";
 checks.push({ name, command: check.command, status, exitCode: result.exitCode });
    if (status !== "COMPLETE") failures.push(`Verification check is ${status}: ${name}`);
  }
  const blocked = evidence.tests.some((item) => item.status === "BLOCKED") || evidence.checks.some((item) => item.status === "BLOCKED");
  const status = failures.length ? (blocked ? "INCOMPLETE" : "FAILED") : "COMPLETE";
  return { status, objective: contract.objective ?? null, expectedFiles: contract.expectedFiles ?? [], evidence, failures };
}

async function main() {
  const contractPath = process.argv[2];
  if (!contractPath) {
    console.error("Usage: node scripts/reliability/completion-verifier.mjs <contract.json>");
    process.exitCode = 2;
    return;
  }
  const result = await verifyCompletion(JSON.parse(await readFile(contractPath, "utf8")));
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.status === "COMPLETE" ? 0 : 1;
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
