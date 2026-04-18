const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { syncFirebaseWebEnv } = require('./sync-firebase-web-env.cjs');

const projectRoot = path.resolve(__dirname, '..');
const frontendRoot = path.join(projectRoot, 'frontend');

function resolvePackageBin(packageName, relativeBinPath) {
  const packageJsonPath = require.resolve(`${packageName}/package.json`, {
    paths: [frontendRoot, projectRoot],
  });

  return path.join(path.dirname(packageJsonPath), relativeBinPath);
}

function runNodeScript(scriptPath, args = [], cwd = projectRoot) {
  const result = spawnSync(process.execPath, [scriptPath, ...args], {
    cwd,
    env: process.env,
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    throw new Error(`Command failed: node ${scriptPath} ${args.join(' ')}`.trim());
  }
}

async function main() {
  await syncFirebaseWebEnv();

  runNodeScript(resolvePackageBin('typescript', 'bin/tsc'), ['-b'], frontendRoot);
  runNodeScript(resolvePackageBin('vite', 'bin/vite.js'), ['build'], frontendRoot);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
