import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const assetsRoot = path.join(appRoot, 'dist', 'assets');
const limits = {
  largestJavaScriptBytes: 425 * 1024,
  totalJavaScriptBytes: 750 * 1024,
  largestCssBytes: 140 * 1024,
};

const files = readdirSync(assetsRoot).map((name) => ({
  name,
  bytes: statSync(path.join(assetsRoot, name)).size,
}));
const javascript = files.filter(({ name }) => name.endsWith('.js'));
const css = files.filter(({ name }) => name.endsWith('.css'));
const largestJavaScript = javascript.toSorted((a, b) => b.bytes - a.bytes)[0];
const largestCss = css.toSorted((a, b) => b.bytes - a.bytes)[0];
const totalJavaScriptBytes = javascript.reduce((total, file) => total + file.bytes, 0);

const failures = [];
if (!largestJavaScript || largestJavaScript.bytes > limits.largestJavaScriptBytes) {
  failures.push(`largest JavaScript chunk: ${largestJavaScript?.bytes ?? 0} bytes`);
}
if (totalJavaScriptBytes > limits.totalJavaScriptBytes) {
  failures.push(`total JavaScript: ${totalJavaScriptBytes} bytes`);
}
if (!largestCss || largestCss.bytes > limits.largestCssBytes) {
  failures.push(`largest CSS asset: ${largestCss?.bytes ?? 0} bytes`);
}

if (failures.length) {
  throw new Error(`Public bundle size gate failed (${failures.join('; ')})`);
}

console.log(JSON.stringify({
  largestJavaScript,
  totalJavaScriptBytes,
  largestCss,
  limits,
}, null, 2));
