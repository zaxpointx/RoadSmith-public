import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { verifyCompletion } from "../../scripts/reliability/completion-verifier.mjs";

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "roadsmith-completion-"));
  await mkdir(path.join(root, ".git"));
  await writeFile(path.join(root, "answer.txt"), "answer: 42\n");
  return root;
}

async function baseline(root, includeAnswer = true) {
  return { files: includeAnswer ? { "answer.txt": { sha256: createHash("sha256").update("answer: 42\n").digest("hex") } } : {} };
}

const passingRunner = async (command) => command === "git status --porcelain=v1"
  ? { exitCode: 0, output: " M answer.txt\n" }
  : { exitCode: 0, output: "# tests 1\n# pass 1\n# fail 0\n" };

const contract = async (root, tests = [], includeAnswer = true) => ({
  root,
  objective: "Make the requested fixture change",
  expectedFiles: [{ path: "answer.txt", contains: "answer: 42" }],
  baseline: await baseline(root, includeAnswer),
  tests,
});

test("rejects a false claim that a file was changed", async () => {
  const result = await verifyCompletion(await contract(await fixture()), { commandRunner: async (command) => command === "git status --porcelain=v1" ? { exitCode: 0, output: "" } : passingRunner(command) });
  assert.equal(result.status, "FAILED");
  assert.match(result.failures.join("\n"), /not present in the Git change set/);
});

test("rejects a requested change that is absent", async () => {
  const root = await fixture();
  const result = await verifyCompletion({ ...(await contract(root)), expectedFiles: [{ path: "missing.txt" }] }, { commandRunner: passingRunner });
  assert.equal(result.status, "FAILED");
  assert.match(result.failures.join("\n"), /file is missing/);
});

test("rejects zero discovered tests", async () => {
  const root = await fixture();
  const result = await verifyCompletion(await contract(root, [{ name: "empty", discover: "discover", run: "run" }]), { commandRunner: async (command) => command === "git status --porcelain=v1" ? { exitCode: 0, output: " M answer.txt\n" } : { exitCode: 0, output: "# tests 0\n" } });
  assert.equal(result.status, "FAILED");
  assert.match(result.failures.join("\n"), /positive test count/);
});

test("accepts a real changed file with one genuinely passing test", async () => {
  const root = await fixture();
  const result = await verifyCompletion(await contract(root, [{ name: "passing", discover: "discover", run: "run" }], false), { commandRunner: passingRunner });
  assert.equal(result.status, "COMPLETE");
  assert.equal(result.evidence.tests[0].run.passed, 1);
});

test("rejects a failing test even when discovery succeeded", async () => {
  let calls = 0;
  const root = await fixture();
  const result = await verifyCompletion(await contract(root, [{ name: "failing", discover: "discover", run: "run" }], false), { commandRunner: async (command) => {
    if (command === "git status --porcelain=v1") return { exitCode: 0, output: " M answer.txt\n" };
    calls += 1;
    return calls === 1 ? { exitCode: 0, output: "# tests 1\n" } : { exitCode: 1, output: "# tests 1\n# pass 0\n# fail 1\n" };
  } });
  assert.equal(result.status, "FAILED");
  assert.equal(result.evidence.tests[0].status, "FAILED");
});

test("rejects a test output that omits pass or skip totals", async () => {
  const result = await verifyCompletion(await contract(await fixture(), [{ name: "unproven", discover: "discover", run: "run" }]), { commandRunner: async (command) => command === "git status --porcelain=v1" ? { exitCode: 0, output: " M answer.txt\n" } : { exitCode: 0, output: "# tests 1\n" } });
  assert.equal(result.status, "FAILED");
  assert.equal(result.evidence.tests[0].status, "INCOMPLETE");
});

test("marks an unavailable test command incomplete", async () => {
  const root = await fixture();
  const result = await verifyCompletion(await contract(root, [{ name: "blocked", discover: "discover", run: "run" }], false), { commandRunner: async (command) => command === "git status --porcelain=v1" ? { exitCode: 0, output: " M answer.txt\n" } : { exitCode: null, output: "", error: "command unavailable" } });
  assert.equal(result.status, "INCOMPLETE");
  assert.equal(result.evidence.tests[0].status, "BLOCKED");
});

test("requires declared project checks to pass", async () => {
  const root = await fixture();
  const result = await verifyCompletion({ ...(await contract(root, [], false)), checks: [{ name: "typecheck", command: "typecheck" }] }, { commandRunner: async (command) => command === "git status --porcelain=v1" ? { exitCode: 0, output: " M answer.txt\n" } : { exitCode: 1, output: "type error" } });
  assert.equal(result.status, "FAILED");
  assert.equal(result.evidence.checks[0].status, "FAILED");
});
