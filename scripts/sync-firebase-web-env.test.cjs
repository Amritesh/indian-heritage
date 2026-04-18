const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { toEnvFile } = require('./sync-firebase-web-env.cjs');

test('toEnvFile preserves Supabase and custom entries while refreshing Firebase values', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ahg-sync-env-'));
  const envPath = path.join(tempDir, '.env');
  fs.writeFileSync(
    envPath,
    [
      'VITE_FIREBASE_API_KEY=old-firebase-key',
      'VITE_SUPABASE_URL=https://example.supabase.co',
      'VITE_SUPABASE_ANON_KEY=anon-key',
      'CUSTOM_FLAG=enabled',
      '',
    ].join('\n'),
    'utf8',
  );

  const result = toEnvFile(
    {
      apiKey: 'new-firebase-key',
      authDomain: 'indian-heritage-gallery.firebaseapp.com',
      projectId: 'indian-heritage-gallery',
      storageBucket: 'indian-heritage-gallery.firebasestorage.app',
      messagingSenderId: '402165796669',
      appId: '1:402165796669:web:example',
      measurementId: 'G-EXAMPLE',
    },
    path.join(process.cwd(), 'indian-heritage-gallery-firebase-adminsdk-fbsvc-1c3ae1c07a.json'),
    envPath,
  );

  assert.match(result, /VITE_FIREBASE_API_KEY=new-firebase-key/);
  assert.match(result, /VITE_SUPABASE_URL=https:\/\/example\.supabase\.co/);
  assert.match(result, /VITE_SUPABASE_ANON_KEY=anon-key/);
  assert.match(result, /CUSTOM_FLAG=enabled/);
});
