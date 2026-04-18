const fs = require('node:fs');
const path = require('node:path');
const { GoogleAuth } = require('google-auth-library');

const projectRoot = path.resolve(__dirname, '..');
const firebasercPath = path.join(projectRoot, '.firebaserc');
const defaultServiceAccountFile = 'indian-heritage-gallery-firebase-adminsdk-fbsvc-1c3ae1c07a.json';
const frontendEnvPath = path.join(projectRoot, 'frontend', '.env');

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return [];
  }

  return fs.readFileSync(filePath, 'utf8')
    .split('\n')
    .map((line) => line.replace(/\r$/, ''))
    .filter(Boolean)
    .map((line) => {
      const equalsIndex = line.indexOf('=');
      if (equalsIndex <= 0) {
        return { raw: line };
      }
      return {
        key: line.slice(0, equalsIndex),
        value: line.slice(equalsIndex + 1),
      };
    });
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function resolveProjectId() {
  if (process.env.VITE_FIREBASE_PROJECT_ID) {
    return process.env.VITE_FIREBASE_PROJECT_ID;
  }

  if (!fs.existsSync(firebasercPath)) {
    throw new Error('Missing .firebaserc, cannot resolve Firebase project id.');
  }

  const firebaserc = readJson(firebasercPath);
  const projectId = firebaserc.projects?.default;
  if (!projectId) {
    throw new Error('Default Firebase project is not defined in .firebaserc.');
  }

  return projectId;
}

function resolveServiceAccountPath() {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return process.env.GOOGLE_APPLICATION_CREDENTIALS;
  }

  const explicitPath = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_PATH;
  if (explicitPath) {
    return path.resolve(projectRoot, explicitPath);
  }

  return path.join(projectRoot, defaultServiceAccountFile);
}

async function requestJson(client, url) {
  const response = await client.request({ url });
  return response.data;
}

async function fetchWebAppConfig(projectId, serviceAccountPath) {
  if (!fs.existsSync(serviceAccountPath)) {
    throw new Error(`Firebase service account not found at ${serviceAccountPath}`);
  }

  const auth = new GoogleAuth({
    keyFilename: serviceAccountPath,
    scopes: ['https://www.googleapis.com/auth/cloud-platform', 'https://www.googleapis.com/auth/firebase'],
  });

  const client = await auth.getClient();
  const appList = await requestJson(
    client,
    `https://firebase.googleapis.com/v1beta1/projects/${projectId}/webApps`,
  );

  const activeApp = (appList.apps ?? []).find((app) => app.state === 'ACTIVE');
  if (!activeApp?.appId) {
    throw new Error(`No active Firebase web app found for project "${projectId}".`);
  }

  const config = await requestJson(
    client,
    `https://firebase.googleapis.com/v1beta1/projects/-/webApps/${encodeURIComponent(activeApp.appId)}/config`,
  );

  return { activeApp, config };
}

function toEnvFile(config, serviceAccountPath, envFilePath = frontendEnvPath) {
  const relativeServiceAccountPath = path.relative(projectRoot, serviceAccountPath) || defaultServiceAccountFile;
  const managedEntries = new Map([
    ['VITE_FIREBASE_API_KEY', config.apiKey ?? ''],
    ['VITE_FIREBASE_AUTH_DOMAIN', config.authDomain ?? ''],
    ['VITE_FIREBASE_PROJECT_ID', config.projectId ?? ''],
    ['VITE_FIREBASE_STORAGE_BUCKET', config.storageBucket ?? ''],
    ['VITE_FIREBASE_MESSAGING_SENDER_ID', config.messagingSenderId ?? ''],
    ['VITE_FIREBASE_APP_ID', config.appId ?? ''],
    ['VITE_FIREBASE_MEASUREMENT_ID', config.measurementId ?? ''],
    ['FIREBASE_SERVICE_ACCOUNT_KEY_PATH', relativeServiceAccountPath],
  ]);

  const preservedLines = [];
  const seenKeys = new Set();

  parseEnvFile(envFilePath).forEach((entry) => {
    if (!entry.key) {
      preservedLines.push(entry.raw);
      return;
    }

    if (managedEntries.has(entry.key)) {
      preservedLines.push(`${entry.key}=${managedEntries.get(entry.key)}`);
      seenKeys.add(entry.key);
      return;
    }

    preservedLines.push(`${entry.key}=${entry.value}`);
    seenKeys.add(entry.key);
  });

  managedEntries.forEach((value, key) => {
    if (!seenKeys.has(key)) {
      preservedLines.push(`${key}=${value}`);
    }
  });

  return `${preservedLines.join('\n')}\n`;
}

async function syncFirebaseWebEnv() {
  const projectId = resolveProjectId();
  const serviceAccountPath = resolveServiceAccountPath();
  const { activeApp, config } = await fetchWebAppConfig(projectId, serviceAccountPath);

  fs.writeFileSync(frontendEnvPath, toEnvFile(config, serviceAccountPath), 'utf8');

  return {
    envPath: frontendEnvPath,
    projectId,
    appId: activeApp.appId,
  };
}

async function main() {
  const result = await syncFirebaseWebEnv();
  console.log(
    JSON.stringify(
      {
        synced: true,
        projectId: result.projectId,
        appId: result.appId,
        envPath: result.envPath,
      },
      null,
      2,
    ),
  );
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = { syncFirebaseWebEnv, parseEnvFile, toEnvFile };
