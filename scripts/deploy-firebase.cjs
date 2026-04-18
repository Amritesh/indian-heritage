const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { syncFirebaseWebEnv } = require('./sync-firebase-web-env.cjs');

const projectRoot = path.resolve(__dirname, '..');

function run(commandArgs, errorMessage) {
  const result = spawnSync(process.execPath, commandArgs, {
    cwd: projectRoot,
    env: process.env,
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    throw new Error(errorMessage);
  }
}

async function main() {
  await syncFirebaseWebEnv();
  run([path.join(projectRoot, 'scripts', 'firebase-predeploy.cjs')], 'Build failed before deploy.');
  run(
    [
      path.join(projectRoot, 'node_modules', 'firebase-tools', 'lib', 'bin', 'firebase.js'),
      'deploy',
      '--project',
      'indian-heritage-gallery',
      '--non-interactive',
    ],
    'Firebase deploy failed.',
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
