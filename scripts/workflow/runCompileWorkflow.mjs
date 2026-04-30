import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execSync } from "node:child_process";

const rootDir = process.cwd();
const defaultPlanPath = path.join(rootDir, "scripts", "workflow", "compile-workflow.tasks.json");
const defaultStatePath = path.join(rootDir, "scripts", "workflow", "compile-workflow.state.json");
const defaultReportPath = path.join(rootDir, "scripts", "workflow", "compile-workflow.report.json");
const workflowFlagsPath = path.join(rootDir, "scripts", "workflow", "workflowFlags.json");

const forbiddenWords = [
  "bezel", "dial", "crown", "pusher", "subdial", "complication",
  "hour_hand", "minute_hand", "second_hand", "pointer", "tick", "marker",
  "numeral", "screw", "lume_pip", "time_pointer", "arc_progress", "battery",
  "steps", "heart_rate", "time_hour", "time_minute", "time_second"
];

function parseArgs(argv) {
  const args = {
    plan: defaultPlanPath,
    state: defaultStatePath,
    report: defaultReportPath,
    reset: false,
    maxSteps: Number.POSITIVE_INFINITY
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--plan") args.plan = path.resolve(rootDir, argv[i + 1]);
    if (token === "--state") args.state = path.resolve(rootDir, argv[i + 1]);
    if (token === "--report") args.report = path.resolve(rootDir, argv[i + 1]);
    if (token === "--reset") args.reset = true;
    if (token === "--max-steps") args.maxSteps = Number(argv[i + 1]);
  }

  return args;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function ensureCompilerEnabled() {
  if (!fs.existsSync(workflowFlagsPath)) return;
  const flags = readJson(workflowFlagsPath);
  if (flags?.compilerEnabled === false) {
    const reason = typeof flags?.reason === "string" && flags.reason.trim().length > 0
      ? flags.reason.trim()
      : "Compiler workflow disabled";
    throw new Error(`Compiler workflow is deactivated: ${reason}`);
  }
}

function writeJson(filePath, payload) {
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function ensureFileExists(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing file: ${path.relative(rootDir, filePath)}`);
  }
}

function resolvePath(relativeOrAbsolute) {
  return path.isAbsolute(relativeOrAbsolute)
    ? relativeOrAbsolute
    : path.resolve(rootDir, relativeOrAbsolute);
}

function getTaskFidelityReportPath(task) {
  if (typeof task?.reportPath === "string" && task.reportPath.trim().length > 0) {
    return resolvePath(task.reportPath.trim());
  }

  if (typeof task?.command !== "string") return null;
  const byFlag = task.command.match(/--out\s+([^\s]+)/);
  if (byFlag && byFlag[1]) {
    return resolvePath(byFlag[1]);
  }

  return resolvePath("exports/compiler/fidelity-report.json");
}

function getTaskEnvelopePath(task) {
  if (typeof task?.envelopePath === "string" && task.envelopePath.trim().length > 0) {
    return resolvePath(task.envelopePath.trim());
  }

  if (typeof task?.command === "string") {
    const byFlag = task.command.match(/--envelope\s+([^\s]+)/);
    if (byFlag && byFlag[1]) {
      return resolvePath(byFlag[1]);
    }
  }

  return resolvePath("exports/compiler/visual_envelope_full.json");
}

function getTaskReprocessPromptPath(task) {
  if (typeof task?.reprocessPromptPath === "string" && task.reprocessPromptPath.trim().length > 0) {
    return resolvePath(task.reprocessPromptPath.trim());
  }
  return resolvePath("exports/compiler/fidelity-reprocess.prompt.txt");
}

function readFidelityDetails(task) {
  const reportPath = getTaskFidelityReportPath(task);
  if (!reportPath || !fs.existsSync(reportPath)) {
    return null;
  }

  try {
    const report = readJson(reportPath);
    const score = report?.metrics?.score;
    const threshold = report?.threshold;
    if (!Number.isFinite(score) || !Number.isFinite(threshold)) {
      return null;
    }

    return {
      reportPath: path.relative(rootDir, reportPath),
      score,
      threshold,
      deficit: Number((threshold - score).toFixed(6)),
      pixelSimilarity: Number(report?.metrics?.pixelSimilarity ?? NaN),
      edgeSimilarity: Number(report?.metrics?.edgeSimilarity ?? NaN),
      colorSimilarity: Number(report?.metrics?.colorSimilarity ?? NaN),
      topPositional: Array.isArray(report?.positionalFailures)
        ? report.positionalFailures.slice(0, 3)
        : [],
      topSize: Array.isArray(report?.sizeFailures)
        ? report.sizeFailures.slice(0, 3)
        : [],
      failedProbabilities: Array.isArray(report?.probabilities)
        ? report.probabilities.filter((p) => p && p.pass === false).slice(0, 6)
        : [],
      deviations: Array.isArray(report?.deviations)
        ? report.deviations.slice(0, 3)
        : []
    };
  } catch {
    return null;
  }
}

function formatCommandFailure(task, error, attempt, maxAttempts) {
  const message = error instanceof Error ? error.message : String(error);
  const stderr = typeof error?.stderr === "string" ? error.stderr.trim() : "";
  const fidelity = readFidelityDetails(task);

  let summary = `attempt ${attempt}/${maxAttempts} failed`;
  if (fidelity) {
    summary = `${summary}: fidelity score=${fidelity.score.toFixed(4)} threshold=${fidelity.threshold.toFixed(4)} deficit=${fidelity.deficit.toFixed(4)}`;
    if (Array.isArray(fidelity.topPositional) && fidelity.topPositional.length > 0) {
      const entries = fidelity.topPositional
        .slice(0, 3)
        .map((item) => {
          if (!item || typeof item.id !== "string") return null;
          const idx = Number.isInteger(item.index) ? item.index : "?";
          const dir = typeof item.direction === "string" ? item.direction : "unknown";
          const dx = Number(item.dx ?? 0).toFixed(2);
          const dy = Number(item.dy ?? 0).toFixed(2);
          return `${item.id}#${idx} ${dir} (dx=${dx},dy=${dy})`;
        })
        .filter(Boolean);
      if (entries.length > 0) {
        summary = `${summary} | top-misaligned: ${entries.join(" | ")}`;
      }
    }

    if (Array.isArray(fidelity.topSize) && fidelity.topSize.length > 0) {
      const sizeEntries = fidelity.topSize
        .slice(0, 3)
        .map((item) => {
          if (!item || typeof item.id !== "string") return null;
          const idx = Number.isInteger(item.index) ? item.index : "?";
          const dir = typeof item.direction === "string" ? item.direction : "size-mismatch";
          const dw = Number(item.widthDeviation ?? 0).toFixed(3);
          const dh = Number(item.heightDeviation ?? 0).toFixed(3);
          return `${item.id}#${idx} ${dir} (dw=${dw},dh=${dh})`;
        })
        .filter(Boolean);
      if (sizeEntries.length > 0) {
        summary = `${summary} | top-size: ${sizeEntries.join(" | ")}`;
      }
    }

    if (Array.isArray(fidelity.failedProbabilities) && fidelity.failedProbabilities.length > 0) {
      const probSummary = fidelity.failedProbabilities
        .map((p) => {
          const name = typeof p.name === "string" ? p.name : "unknown";
          const value = Number(p.probability ?? 0).toFixed(3);
          const th = Number(p.threshold ?? 0).toFixed(3);
          return `${name}=${value}<${th}`;
        })
        .join(",");
      summary = `${summary} | failed-dimensions: ${probSummary}`;
    }

    if (Array.isArray(fidelity.deviations) && fidelity.deviations.length > 0) {
      const hints = fidelity.deviations
        .map((d) => {
          const dim = typeof d.dimension === "string" ? d.dimension : "unknown";
          const msg = typeof d.message === "string" ? d.message : "deviation";
          return `${dim}: ${msg}`;
        })
        .join(" | ");
      summary = `${summary} | hints: ${hints}`;
    }
  }

  return {
    summary,
    message,
    stderr,
    fidelity
  };
}

function createReprocessPromptText(task, fidelity, attempt, maxAttempts) {
  const lines = [];
  lines.push("# AI Reprocess Prompt");
  lines.push("");
  lines.push("Objective: Reprocess visual envelope to improve fidelity against source image.");
  lines.push("");
  lines.push(`Attempt: ${attempt}/${maxAttempts}`);
  lines.push(`Report path: ${fidelity.reportPath}`);
  lines.push(`Score: ${fidelity.score.toFixed(4)} (threshold ${fidelity.threshold.toFixed(4)})`);
  lines.push(`Deficit: ${fidelity.deficit.toFixed(4)}`);
  lines.push("");

  if (Array.isArray(fidelity.failedProbabilities) && fidelity.failedProbabilities.length > 0) {
    lines.push("Failed dimensions:");
    for (const p of fidelity.failedProbabilities) {
      const name = typeof p?.name === "string" ? p.name : "unknown";
      const value = Number(p?.probability ?? 0).toFixed(4);
      const threshold = Number(p?.threshold ?? 0).toFixed(4);
      const deviation = Number(p?.deviation ?? 0).toFixed(4);
      lines.push(`- ${name}: probability=${value}, threshold=${threshold}, deviation=${deviation}`);
    }
    lines.push("");
  }

  if (Array.isArray(fidelity.topPositional) && fidelity.topPositional.length > 0) {
    lines.push("Top positional deviations (fix location first):");
    for (const item of fidelity.topPositional.slice(0, 10)) {
      if (!item || typeof item.id !== "string") continue;
      const idx = Number.isInteger(item.index) ? item.index : "?";
      const direction = typeof item.direction === "string" ? item.direction : "unknown";
      const dx = Number(item.dx ?? 0).toFixed(2);
      const dy = Number(item.dy ?? 0).toFixed(2);
      lines.push(`- ${item.id}#${idx}: move ${direction}, dx=${dx}, dy=${dy}`);
    }
    lines.push("");
  }

  if (Array.isArray(fidelity.topSize) && fidelity.topSize.length > 0) {
    lines.push("Top size deviations (fix geometry scale next):");
    for (const item of fidelity.topSize.slice(0, 10)) {
      if (!item || typeof item.id !== "string") continue;
      const idx = Number.isInteger(item.index) ? item.index : "?";
      const direction = typeof item.direction === "string" ? item.direction : "size-mismatch";
      const dw = Number(item.widthDeviation ?? 0).toFixed(3);
      const dh = Number(item.heightDeviation ?? 0).toFixed(3);
      lines.push(`- ${item.id}#${idx}: ${direction}, widthDeviation=${dw}, heightDeviation=${dh}`);
    }
    lines.push("");
  }

  if (Array.isArray(fidelity.deviations) && fidelity.deviations.length > 0) {
    lines.push("Dimension guidance:");
    for (const d of fidelity.deviations) {
      const dim = typeof d?.dimension === "string" ? d.dimension : "unknown";
      const msg = typeof d?.message === "string" ? d.message : "Reprocess this dimension.";
      const probability = Number(d?.probability ?? 0).toFixed(4);
      const threshold = Number(d?.threshold ?? 0).toFixed(4);
      const deviation = Number(d?.deviation ?? 0).toFixed(4);
      lines.push(`- ${dim}: ${msg} (p=${probability}, t=${threshold}, d=${deviation})`);
    }
    lines.push("");
  }

  lines.push("Required output:");
  lines.push("- Return updated visual envelope JSON only.");
  lines.push("- Prioritize fixing failed dimensions in this order: position -> size -> shape -> color -> effect -> texture.");
  lines.push("- Keep element ids stable and preserve element count.");
  lines.push("- Do not introduce watch-domain forbidden vocabulary.");
  lines.push("");
  lines.push("Acceptance:");
  lines.push("- Re-run fidelity and pass threshold.");

  return `${lines.join("\n")}\n`;
}

function writeReprocessPrompt(task, fidelity, attempt, maxAttempts) {
  if (!fidelity) return null;
  const promptPath = getTaskReprocessPromptPath(task);
  const promptText = createReprocessPromptText(task, fidelity, attempt, maxAttempts);
  fs.mkdirSync(path.dirname(promptPath), { recursive: true });
  fs.writeFileSync(promptPath, promptText, "utf8");
  const attemptPath = path.join(
    path.dirname(promptPath),
    `${path.basename(promptPath, path.extname(promptPath))}.attempt-${attempt}${path.extname(promptPath)}`
  );
  fs.writeFileSync(attemptPath, promptText, "utf8");
  return path.relative(rootDir, promptPath);
}

function applyTemplate(command, vars) {
  const quote = (value) => `"${String(value).replace(/"/g, "\\\"")}"`;
  return String(command)
    .replace(/\{\{PROMPT_PATH\}\}/g, quote(vars.promptPath))
    .replace(/\{\{REPORT_PATH\}\}/g, quote(vars.reportPath))
    .replace(/\{\{ENVELOPE_PATH\}\}/g, quote(vars.envelopePath))
    .replace(/\{\{ATTEMPT\}\}/g, String(vars.attempt))
    .replace(/\{\{MAX_ATTEMPTS\}\}/g, String(vars.maxAttempts));
}

function runReprocessCommand(task, fidelity, promptPath, attempt, maxAttempts) {
  const envelopePath = getTaskEnvelopePath(task);
  if (!envelopePath || !fs.existsSync(envelopePath)) {
    return {
      executed: false,
      changed: false,
      reason: `reprocess skipped: missing envelope ${path.relative(rootDir, envelopePath)}`
    };
  }

  const beforeHash = sha256(envelopePath);
  const rawCommand = typeof task?.reprocessCommand === "string" ? task.reprocessCommand.trim() : "";
  if (!rawCommand) {
    return {
      executed: false,
      changed: false,
      reason: "reprocess skipped: no reprocessCommand configured"
    };
  }

  const cmd = applyTemplate(rawCommand, {
    promptPath: promptPath ? resolvePath(promptPath) : getTaskReprocessPromptPath(task),
    reportPath: fidelity?.reportPath ? resolvePath(fidelity.reportPath) : getTaskFidelityReportPath(task),
    envelopePath,
    attempt,
    maxAttempts
  });

  try {
    execSync(cmd, {
      cwd: rootDir,
      stdio: ["ignore", "pipe", "pipe"],
      encoding: "utf8",
      maxBuffer: 1024 * 1024 * 8
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return {
      executed: true,
      changed: false,
      reason: `reprocess command failed: ${msg}`
    };
  }

  const afterHash = sha256(envelopePath);
  if (beforeHash === afterHash) {
    return {
      executed: true,
      changed: false,
      reason: `reprocess no-op: envelope hash unchanged (${path.relative(rootDir, envelopePath)})`
    };
  }

  return {
    executed: true,
    changed: true,
    reason: `reprocess changed envelope (${path.relative(rootDir, envelopePath)})`
  };
}

function shouldSkipTaskByMissingPaths(task) {
  const checks = Array.isArray(task?.skipIfMissingPaths) ? task.skipIfMissingPaths : [];
  if (checks.length === 0) return { skip: false, missing: [] };
  const missing = checks
    .map((p) => resolvePath(p))
    .filter((abs) => !fs.existsSync(abs))
    .map((abs) => path.relative(rootDir, abs));
  return { skip: missing.length > 0, missing };
}

function sha256(filePath) {
  const data = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(data).digest("hex");
}

function isFiniteNumber(n) {
  return typeof n === "number" && Number.isFinite(n);
}

function validateTopKeys(env) {
  const keys = Object.keys(env);
  const expected = ["inventory", "decomposition", "geometry", "appearance"];
  if (keys.length !== expected.length) {
    throw new Error(`Expected exactly 4 top-level keys, got ${keys.length}`);
  }

  for (let i = 0; i < expected.length; i += 1) {
    if (keys[i] !== expected[i]) {
      throw new Error(`Top-level key mismatch at index ${i}: expected ${expected[i]}, got ${keys[i]}`);
    }
  }
}

function validateParity(env) {
  const i = env.inventory?.elements?.length;
  const d = env.decomposition?.length;
  const g = env.geometry?.length;
  const a = env.appearance?.length;

  if (![i, d, g, a].every((n) => Number.isInteger(n))) {
    throw new Error("One or more parity lengths are missing or invalid");
  }

  if (!(i === d && d === g && g === a)) {
    throw new Error(`Parity mismatch: ${i}/${d}/${g}/${a}`);
  }
}

function validateNoEmptyNullable(env) {
  const bad = [];
  for (const item of env.appearance ?? []) {
    for (const key of ["blendMode", "filter", "clipPath"]) {
      if (Object.prototype.hasOwnProperty.call(item, key) && item[key] === "") {
        bad.push(`appearance.${item.id}.${key}`);
      }
    }
  }

  for (const item of env.decomposition ?? []) {
    const intent = item?.compositionRecipe?.blendIntent;
    if (intent === "") {
      bad.push(`decomposition.${item.id}.compositionRecipe.blendIntent`);
    }
  }

  if (bad.length > 0) {
    throw new Error(`Empty nullable fields found: ${bad.slice(0, 6).join(", ")}${bad.length > 6 ? " ..." : ""}`);
  }
}

function validateForbiddenVocabulary(env) {
  const haystacks = [];
  for (const el of env.inventory?.elements ?? []) haystacks.push(String(el.id ?? ""));
  for (const el of env.geometry ?? []) haystacks.push(String(el.id ?? ""));
  for (const el of env.appearance ?? []) haystacks.push(String(el.id ?? ""));

  const hits = [];
  for (const value of haystacks) {
    const lower = value.toLowerCase();
    for (const word of forbiddenWords) {
      if (lower.includes(word)) {
        hits.push(`${value} -> ${word}`);
      }
    }
  }

  if (hits.length > 0) {
    throw new Error(`Forbidden semantic ids found: ${hits.slice(0, 6).join(" | ")}${hits.length > 6 ? " ..." : ""}`);
  }
}

function validateNoBlankTextNodes(env) {
  const byId = new Map();
  for (const g of env.geometry ?? []) {
    byId.set(g.id, g);
  }

  const bad = [];
  for (const inv of env.inventory?.elements ?? []) {
    if (inv.kind !== "text") continue;
    const geom = byId.get(inv.id);
    const text = typeof geom?.text === "string"
      ? geom.text
      : (typeof geom?.content === "string" ? geom.content : "");
    if (typeof text !== "string" || text.trim().length === 0) {
      bad.push(inv.id);
    }
  }

  if (bad.length > 0) {
    throw new Error(`Blank text nodes found: ${bad.slice(0, 8).join(", ")}${bad.length > 8 ? " ..." : ""}`);
  }
}

function validateComplexityBudget(env, gate) {
  const invCount = env.inventory?.elements?.length ?? 0;
  const geometry = env.geometry ?? [];
  const lineCount = geometry.filter((g) => g.shape === "line").length;
  const maxElements = Number.isInteger(gate.maxElements) ? gate.maxElements : 360;
  const maxLineRatio = typeof gate.maxLineRatio === "number" ? gate.maxLineRatio : 0.72;

  if (invCount > maxElements) {
    throw new Error(`Complexity overflow: elements=${invCount}, limit=${maxElements}`);
  }

  if (invCount > 0) {
    const lineRatio = lineCount / invCount;
    if (lineRatio > maxLineRatio) {
      throw new Error(`Complexity overflow: lineRatio=${lineRatio.toFixed(3)}, limit=${maxLineRatio}`);
    }
  }
}

function validateEnvelopeFiniteNumbers(env) {
  for (const g of env.geometry ?? []) {
    for (const [k, v] of Object.entries(g)) {
      if (typeof v === "number" && !isFiniteNumber(v)) {
        throw new Error(`Non-finite number at geometry.${g.id}.${k}`);
      }
    }
  }
}

function runGate(gate) {
  if (!gate || !gate.kind) {
    throw new Error("Gate is missing kind");
  }

  if (gate.kind === "filesExist") {
    for (const p of gate.paths ?? []) {
      ensureFileExists(resolvePath(p));
    }
    return { ok: true, details: { count: gate.paths?.length ?? 0 } };
  }

  if (gate.kind === "hashParity") {
    const pathA = resolvePath(gate.pathA);
    const pathB = resolvePath(gate.pathB);
    ensureFileExists(pathA);
    ensureFileExists(pathB);
    const hashA = sha256(pathA);
    const hashB = sha256(pathB);
    if (hashA !== hashB) {
      throw new Error("Hash parity failed between envelope files");
    }
    return { ok: true, details: { hash: hashA } };
  }

  const envPath = resolvePath(gate.path);
  ensureFileExists(envPath);
  const env = readJson(envPath);

  if (gate.kind === "envelopeTopKeys") {
    validateTopKeys(env);
    return { ok: true };
  }

  if (gate.kind === "envelopeParity") {
    validateParity(env);
    return { ok: true };
  }

  if (gate.kind === "noEmptyNullable") {
    validateNoEmptyNullable(env);
    return { ok: true };
  }

  if (gate.kind === "forbiddenVocabulary") {
    validateForbiddenVocabulary(env);
    return { ok: true };
  }

  if (gate.kind === "noBlankTextNodes") {
    validateNoBlankTextNodes(env);
    return { ok: true };
  }

  if (gate.kind === "complexityBudget") {
    validateComplexityBudget(env, gate);
    validateEnvelopeFiniteNumbers(env);
    return { ok: true };
  }

  throw new Error(`Unsupported gate kind: ${gate.kind}`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function writeReport(filePath, plan, state) {
  writeJson(filePath, {
    workflow: plan.name,
    status: state.status,
    completed: state.completed.length,
    total: plan.tasks.length,
    currentIndex: state.currentIndex,
    updatedAt: state.updatedAt,
    failed: state.failed
  });
}

function makeFreshState(plan) {
  return {
    workflow: plan.name,
    version: plan.version,
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: "running",
    currentIndex: 0,
    completed: [],
    failed: null,
    summary: {
      total: plan.tasks.length,
      pass: 0,
      fail: 0,
      pause: 0
    }
  };
}

async function run() {
  ensureCompilerEnabled();
  const args = parseArgs(process.argv.slice(2));
  const plan = readJson(args.plan);
  const stateExists = fs.existsSync(args.state);

  let state;
  if (args.reset || !stateExists) {
    state = makeFreshState(plan);
    writeJson(args.state, state);
  } else {
    state = readJson(args.state);
  }

  let stepsRun = 0;
  const defaultPauseMs = plan.settings?.defaultPauseMs ?? 1500;

  for (let i = state.currentIndex; i < plan.tasks.length; i += 1) {
    if (stepsRun >= args.maxSteps) break;
    const task = plan.tasks[i];
    const stamp = new Date().toISOString();
    process.stdout.write(`\n[${task.id}] ${task.title}\n`);

    try {
      if (task.type === "pause") {
        const ms = Number.isInteger(task.pauseMs) ? task.pauseMs : defaultPauseMs;
        process.stdout.write(`  pause ${ms}ms\n`);
        await sleep(ms);
        state.summary.pause += 1;
      } else if (task.type === "command") {
        const skip = shouldSkipTaskByMissingPaths(task);
        if (skip.skip) {
          process.stdout.write(`  skipped: missing ${skip.missing.join(", ")}\n`);
        } else {
          if (typeof task.command !== "string" || task.command.trim().length === 0) {
            throw new Error("Command task is missing command string");
          }
          const maxAttempts = Number.isInteger(task.maxAttempts) && task.maxAttempts > 0
            ? task.maxAttempts
            : 1;
          const retryPauseMs = Number.isInteger(task.retryPauseMs) && task.retryPauseMs >= 0
            ? task.retryPauseMs
            : 1000;

          let attempt = 0;
          let lastError = null;
          let lastFailure = null;
          let retryStopReason = "";
          while (attempt < maxAttempts) {
            attempt += 1;
            try {
              const output = execSync(task.command, {
                cwd: rootDir,
                stdio: ["ignore", "pipe", "pipe"],
                encoding: "utf8",
                maxBuffer: 1024 * 1024 * 8
              });
              const trimmed = String(output ?? "").trim();
              if (trimmed.length > 0) {
                const line = trimmed.split(/\r?\n/)[0];
                process.stdout.write(`  command: ${line}\n`);
              } else {
                process.stdout.write("  command pass\n");
              }
              lastError = null;
              lastFailure = null;
              break;
            } catch (error) {
              lastError = error;
              lastFailure = formatCommandFailure(task, error, attempt, maxAttempts);
              const promptPath = writeReprocessPrompt(task, lastFailure?.fidelity, attempt, maxAttempts);
              if (promptPath) {
                lastFailure.summary = `${lastFailure.summary} | ai-prompt: ${promptPath}`;
              }

              const reprocess = runReprocessCommand(task, lastFailure?.fidelity, promptPath, attempt, maxAttempts);
              lastFailure.summary = `${lastFailure.summary} | ${reprocess.reason}`;

              if (attempt < maxAttempts) {
                if (!reprocess.changed) {
                  retryStopReason = reprocess.reason;
                  break;
                }
                process.stdout.write(`  ${lastFailure.summary}, reprocessing...\n`);
                await sleep(retryPauseMs);
              }
            }
          }

          if (lastError) {
            const base = lastFailure?.summary ?? `command failed after ${maxAttempts} attempt(s)`;
            const reason = lastFailure?.message ?? (lastError instanceof Error ? lastError.message : String(lastError));
            const stderr = lastFailure?.stderr ? ` | stderr: ${lastFailure.stderr}` : "";
            const fidelityHint = lastFailure?.fidelity
              ? ` | report: ${lastFailure.fidelity.reportPath}`
              : "";
            const promptHint = base.includes("| ai-prompt:")
              ? ""
              : (() => {
                  const promptPath = writeReprocessPrompt(task, lastFailure?.fidelity, maxAttempts, maxAttempts);
                  return promptPath ? ` | ai-prompt: ${promptPath}` : "";
                })();
            const retryHint = retryStopReason ? ` | retry-stop: ${retryStopReason}` : "";
            throw new Error(`${base}: ${reason}${stderr}${fidelityHint}${promptHint}${retryHint}`);
          }
        }
      } else if (task.type === "gate") {
        const result = runGate(task.gate);
        process.stdout.write(`  gate pass: ${task.gate.kind}\n`);
        if (result?.details?.hash) {
          process.stdout.write(`  hash: ${result.details.hash}\n`);
        }
      } else {
        process.stdout.write("  task pass\n");
      }

      state.completed.push({
        id: task.id,
        type: task.type,
        passedAt: stamp
      });
      state.summary.pass += 1;
      state.currentIndex = i + 1;
      state.updatedAt = stamp;
      writeJson(args.state, state);
      stepsRun += 1;
    } catch (error) {
      state.status = "failed";
      state.summary.fail += 1;
      state.failed = {
        id: task.id,
        title: task.title,
        at: stamp,
        reason: error instanceof Error ? error.message : String(error)
      };
      state.currentIndex = i;
      state.updatedAt = stamp;
      writeJson(args.state, state);
      writeReport(args.report, plan, state);
      throw error;
    }
  }

  if (state.currentIndex >= plan.tasks.length) {
    state.status = "completed";
    state.updatedAt = new Date().toISOString();
    writeJson(args.state, state);
  } else {
    state.status = "running";
    state.updatedAt = new Date().toISOString();
    writeJson(args.state, state);
  }

  writeReport(args.report, plan, state);

  process.stdout.write(`\nworkflow status: ${state.status} (${state.completed.length}/${plan.tasks.length})\n`);
}

run().catch((error) => {
  process.stderr.write(`\nworkflow error: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
