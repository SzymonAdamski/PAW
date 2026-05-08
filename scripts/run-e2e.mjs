import { spawn } from 'node:child_process';
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';

const mode = process.argv[2] === 'open' ? 'open' : 'run';
const host = '127.0.0.1';
const port = 5173;
const url = `http://${host}:${port}`;
const viteEntry = path.join(process.cwd(), 'node_modules', 'vite', 'bin', 'vite.js');
const nodeCommand = process.execPath;

let serverProcess;
let isShuttingDown = false;

function waitForServer(timeoutMs = 30000) {
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    const check = () => {
      const request = http.get(url, (response) => {
        response.resume();

        if (response.statusCode && response.statusCode >= 200 && response.statusCode < 500) {
          resolve();
          return;
        }

        retry();
      });

      request.on('error', retry);
      request.setTimeout(1000, () => {
        request.destroy();
        retry();
      });
    };

    const retry = () => {
      if (Date.now() - startedAt > timeoutMs) {
        reject(new Error(`Timed out waiting for ${url}`));
        return;
      }

      setTimeout(check, 250);
    };

    check();
  });
}

function assertPortFree() {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host, port });

    socket.on('connect', () => {
      socket.destroy();
      reject(new Error(`${url} is already in use. Stop the existing server before running e2e tests.`));
    });

    socket.on('error', () => {
      resolve();
    });

    socket.setTimeout(1000, () => {
      socket.destroy();
      resolve();
    });
  });
}

function spawnProcess(command, args) {
  return spawn(command, args, {
    cwd: process.cwd(),
    shell: false,
    stdio: 'inherit',
  });
}

function stopServer() {
  if (!serverProcess || serverProcess.killed || isShuttingDown) {
    return;
  }

  isShuttingDown = true;

  if (process.platform === 'win32') {
    spawn('taskkill', ['/pid', String(serverProcess.pid), '/T', '/F'], {
      stdio: 'ignore',
      windowsHide: true,
    });
    return;
  }

  serverProcess.kill('SIGTERM');
}

async function main() {
  await assertPortFree();

  serverProcess = spawnProcess(nodeCommand, [viteEntry, '--host', host, '--port', String(port), '--strictPort', '--mode', 'e2e']);

  serverProcess.on('exit', (code) => {
    if (!isShuttingDown && code !== 0) {
      process.exit(code ?? 1);
    }
  });

  await waitForServer();

  const cypressProcess = spawnProcess(nodeCommand, ['scripts/run-cypress.mjs', mode]);

  cypressProcess.on('exit', (code) => {
    stopServer();
    process.exit(code ?? 1);
  });

  cypressProcess.on('error', (error) => {
    console.error(error);
    stopServer();
    process.exit(1);
  });
}

process.on('SIGINT', () => {
  stopServer();
  process.exit(130);
});

process.on('SIGTERM', () => {
  stopServer();
  process.exit(143);
});

main().catch((error) => {
  console.error(error);
  stopServer();
  process.exit(1);
});
