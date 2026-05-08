import { spawn } from 'node:child_process';
import path from 'node:path';

const args = process.argv.slice(2);
const env = { ...process.env };

delete env.ELECTRON_RUN_AS_NODE;

const command = path.join(process.cwd(), 'node_modules', '.bin', process.platform === 'win32' ? 'cypress.cmd' : 'cypress');
const child = spawn(command, args, {
  env,
  shell: process.platform === 'win32',
  stdio: 'inherit',
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});

child.on('error', (error) => {
  console.error(error);
  process.exit(1);
});
