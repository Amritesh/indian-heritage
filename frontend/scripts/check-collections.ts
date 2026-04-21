import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadWorkspaceEnv } from './lib/loadEnv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

async function main() {
  loadWorkspaceEnv(projectRoot);
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;

  if (!url || !key) {
    console.error('Supabase credentials missing');
    return;
  }

  const response = await fetch(`${url}/rest/v1/collections?select=slug,title,status`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
  });

  if (!response.ok) {
    console.error('Error fetching collections:', response.status, await response.text());
    return;
  }

  const data = await response.json();
  console.log('Collections in Supabase:');
  console.log(JSON.stringify(data, null, 2));
}

main().catch(console.error);
