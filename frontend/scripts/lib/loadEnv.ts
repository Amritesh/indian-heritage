import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

function stripWrappingQuotes(value: string) {
  if (
    (value.startsWith('"') && value.endsWith('"'))
    || (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function parseEnvLine(line: string) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return null;

  const normalized = trimmed.startsWith('export ') ? trimmed.slice('export '.length).trim() : trimmed;
  const separatorIndex = normalized.indexOf('=');
  if (separatorIndex === -1) return null;

  const key = normalized.slice(0, separatorIndex).trim();
  const rawValue = normalized.slice(separatorIndex + 1).trim();
  if (!key) return null;

  return {
    key,
    value: stripWrappingQuotes(rawValue),
  };
}

export function loadWorkspaceEnv(projectRoot: string) {
  const envPaths = [
    path.resolve(projectRoot, '.env.local'),
    path.resolve(projectRoot, '.env'),
    path.resolve(projectRoot, 'frontend', '.env.local'),
    path.resolve(projectRoot, 'frontend', '.env'),
    path.resolve(projectRoot, 'frontend', '.env.example'),
  ];

  envPaths.forEach((envPath) => {
    if (!fs.existsSync(envPath)) return;

    for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
      const parsed = parseEnvLine(line);
      if (!parsed) continue;
      if (!process.env[parsed.key] && parsed.value) {
        process.env[parsed.key] = parsed.value;
      }
    }
  });
}
