import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const workflowFlagsPath = path.join(rootDir, "scripts", "workflow", "workflowFlags.json");

function parseArgs(argv) {
  const args = {
    report: "exports/compiler/fidelity-report.json",
    envelope: "exports/compiler/visual_envelope_full.json",
    prompt: "exports/compiler/fidelity-reprocess.prompt.txt",
    attempt: 1,
    maxAttempts: 1,
    positionGain: 0.35,
    sizeGain: 0.45,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    const next = argv[i + 1];
    if (token === "--report" && next) args.report = next;
    if (token === "--envelope" && next) args.envelope = next;
    if (token === "--prompt" && next) args.prompt = next;
    if (token === "--attempt" && next) args.attempt = Number(next);
    if (token === "--max-attempts" && next) args.maxAttempts = Number(next);
    if (token === "--position-gain" && next) args.positionGain = Number(next);
    if (token === "--size-gain" && next) args.sizeGain = Number(next);
  }

  return args;
}

function isFiniteNumber(n) {
  return typeof n === "number" && Number.isFinite(n);
}

function resolvePath(p) {
  return path.isAbsolute(p) ? p : path.resolve(rootDir, p);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, payload) {
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function getCenter(geom) {
  if (isFiniteNumber(geom.cx) && isFiniteNumber(geom.cy)) return { cx: geom.cx, cy: geom.cy };
  if (isFiniteNumber(geom.centerX) && isFiniteNumber(geom.centerY)) return { cx: geom.centerX, cy: geom.centerY };
  if (isFiniteNumber(geom.x) && isFiniteNumber(geom.y) && isFiniteNumber(geom.w) && isFiniteNumber(geom.h)) {
    return { cx: geom.x + geom.w / 2, cy: geom.y + geom.h / 2 };
  }
  if (isFiniteNumber(geom.x1) && isFiniteNumber(geom.y1) && isFiniteNumber(geom.x2) && isFiniteNumber(geom.y2)) {
    return { cx: (geom.x1 + geom.x2) / 2, cy: (geom.y1 + geom.y2) / 2 };
  }
  if (isFiniteNumber(geom.posX) && isFiniteNumber(geom.posY)) return { cx: geom.posX, cy: geom.posY };
  return null;
}

function translateGeometry(geom, dx, dy) {
  let changed = false;
  const pairs = [
    ["x", "y"],
    ["cx", "cy"],
    ["centerX", "centerY"],
    ["posX", "posY"],
    ["x1", "y1"],
    ["x2", "y2"],
  ];

  for (const [kx, ky] of pairs) {
    if (isFiniteNumber(geom[kx])) {
      geom[kx] += dx;
      changed = true;
    }
    if (isFiniteNumber(geom[ky])) {
      geom[ky] += dy;
      changed = true;
    }
  }

  if (Array.isArray(geom.points)) {
    for (const p of geom.points) {
      if (Array.isArray(p) && p.length >= 2 && isFiniteNumber(p[0]) && isFiniteNumber(p[1])) {
        p[0] += dx;
        p[1] += dy;
        changed = true;
      } else if (p && isFiniteNumber(p.x) && isFiniteNumber(p.y)) {
        p.x += dx;
        p.y += dy;
        changed = true;
      }
    }
  }

  return changed;
}

function scalePointAround(geom, keyX, keyY, cx, cy, sx, sy) {
  if (isFiniteNumber(geom[keyX])) geom[keyX] = cx + (geom[keyX] - cx) * sx;
  if (isFiniteNumber(geom[keyY])) geom[keyY] = cy + (geom[keyY] - cy) * sy;
}

function scaleGeometry(geom, sx, sy) {
  const center = getCenter(geom);
  if (!center) return false;

  let changed = false;
  const { cx, cy } = center;

  scalePointAround(geom, "x", "y", cx, cy, sx, sy);
  if (isFiniteNumber(geom.w)) {
    geom.w *= sx;
    changed = true;
  }
  if (isFiniteNumber(geom.h)) {
    geom.h *= sy;
    changed = true;
  }

  scalePointAround(geom, "x1", "y1", cx, cy, sx, sy);
  scalePointAround(geom, "x2", "y2", cx, cy, sx, sy);
  scalePointAround(geom, "cx", "cy", cx, cy, sx, sy);
  scalePointAround(geom, "centerX", "centerY", cx, cy, sx, sy);

  if (isFiniteNumber(geom.radius)) {
    geom.radius *= (sx + sy) / 2;
    changed = true;
  }
  if (isFiniteNumber(geom.r)) {
    geom.r *= (sx + sy) / 2;
    changed = true;
  }
  if (isFiniteNumber(geom.rInner)) {
    geom.rInner *= (sx + sy) / 2;
    changed = true;
  }
  if (isFiniteNumber(geom.rOuter)) {
    geom.rOuter *= (sx + sy) / 2;
    changed = true;
  }
  if (isFiniteNumber(geom.rx)) {
    geom.rx *= sx;
    changed = true;
  }
  if (isFiniteNumber(geom.ry)) {
    geom.ry *= sy;
    changed = true;
  }

  if (Array.isArray(geom.points)) {
    for (const p of geom.points) {
      if (Array.isArray(p) && p.length >= 2 && isFiniteNumber(p[0]) && isFiniteNumber(p[1])) {
        p[0] = cx + (p[0] - cx) * sx;
        p[1] = cy + (p[1] - cy) * sy;
        changed = true;
      } else if (p && isFiniteNumber(p.x) && isFiniteNumber(p.y)) {
        p.x = cx + (p.x - cx) * sx;
        p.y = cy + (p.y - cy) * sy;
        changed = true;
      }
    }
  }

  return changed;
}

function main() {
  if (fs.existsSync(workflowFlagsPath)) {
    const flags = JSON.parse(fs.readFileSync(workflowFlagsPath, "utf8"));
    if (flags?.compilerEnabled === false) {
      const reason = typeof flags?.reason === "string" && flags.reason.trim().length > 0
        ? flags.reason.trim()
        : "Compiler workflow disabled";
      throw new Error(`Compiler workflow is deactivated: ${reason}`);
    }
  }

  const args = parseArgs(process.argv.slice(2));
  const reportPath = resolvePath(args.report);
  const envelopePath = resolvePath(args.envelope);

  if (!fs.existsSync(reportPath)) {
    throw new Error(`Missing report file: ${reportPath}`);
  }
  if (!fs.existsSync(envelopePath)) {
    throw new Error(`Missing envelope file: ${envelopePath}`);
  }

  const report = readJson(reportPath);
  const env = readJson(envelopePath);

  if (!Array.isArray(env.geometry)) {
    throw new Error("Envelope geometry array missing");
  }

  const byId = new Map();
  for (const g of env.geometry) {
    if (g && typeof g.id === "string") byId.set(g.id, g);
  }

  let moved = 0;
  let scaled = 0;

  const positional = Array.isArray(report.positionalFailures) ? report.positionalFailures.slice(0, 12) : [];
  for (const f of positional) {
    const id = typeof f?.id === "string" ? f.id : null;
    const geom = id ? byId.get(id) : null;
    if (!geom) continue;
    const dx = Number(f.dx ?? 0) * args.positionGain;
    const dy = Number(f.dy ?? 0) * args.positionGain;
    if (!isFiniteNumber(dx) || !isFiniteNumber(dy)) continue;
    if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) continue;
    if (translateGeometry(geom, dx, dy)) moved += 1;
  }

  const size = Array.isArray(report.sizeFailures) ? report.sizeFailures.slice(0, 12) : [];
  for (const f of size) {
    const id = typeof f?.id === "string" ? f.id : null;
    const geom = id ? byId.get(id) : null;
    if (!geom) continue;
    const dw = Number(f.widthDeviation ?? 0);
    const dh = Number(f.heightDeviation ?? 0);
    if (!isFiniteNumber(dw) || !isFiniteNumber(dh)) continue;
    const sx = Math.max(0.35, Math.min(2.5, 1 - dw * args.sizeGain));
    const sy = Math.max(0.35, Math.min(2.5, 1 - dh * args.sizeGain));
    if (Math.abs(sx - 1) < 0.01 && Math.abs(sy - 1) < 0.01) continue;
    if (scaleGeometry(geom, sx, sy)) scaled += 1;
  }

  writeJson(envelopePath, env);

  process.stdout.write(
    `reprocess applied: moved=${moved}, scaled=${scaled}, attempt=${args.attempt}/${args.maxAttempts}, prompt=${args.prompt}\n`
  );
}

main();
