import { access } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const script = new URL('./reportlab_pdf_service.py', import.meta.url);
const scriptPath = fileURLToPath(script);
const configured = process.env.STRUCTURECO_PYTHON;
const bundled = process.platform === 'win32'
  ? join(homedir(), '.cache', 'codex-runtimes', 'codex-primary-runtime', 'dependencies', 'python', 'python.exe')
  : '';

const exists = async (path) => {
  if (!path) return false;
  try { await access(path); return true; } catch { return false; }
};

const candidates = [
  ...(configured ? [{ command: configured, prefix: [] }] : []),
  ...((await exists(bundled)) ? [{ command: bundled, prefix: [] }] : []),
  ...(process.platform === 'win32' ? [{ command: 'py', prefix: ['-3'] }] : []),
  { command: 'python3', prefix: [] },
  { command: 'python', prefix: [] },
];

const args = process.argv.slice(2);
let child;
for (const candidate of candidates) {
  child = spawn(candidate.command, [...candidate.prefix, scriptPath, ...args], { stdio: 'inherit' });
  const started = await new Promise((resolve) => {
    child.once('spawn', () => resolve(true));
    child.once('error', () => resolve(false));
  });
  if (started) break;
}

if (!child?.pid) {
  console.error('No se encontro Python. Defina STRUCTURECO_PYTHON con la ruta de python.exe.');
  process.exit(1);
}

child.once('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exitCode = code ?? 1;
});
