import { hasSupabaseEnv, supabaseConfig } from '@/shared/config/supabase';

type QueryValue = string | number | boolean | null | undefined;

function buildHeaders() {
  return {
    apikey: supabaseConfig.anonKey,
    Authorization: `Bearer ${supabaseConfig.anonKey}`,
    'Content-Type': 'application/json',
  };
}

function buildUrl(path: string, query?: Record<string, QueryValue>) {
  const url = new URL(`${supabaseConfig.url}/rest/v1/${path}`);
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value != null) {
        url.searchParams.set(key, String(value));
      }
    });
  }
  return url.toString();
}

export async function supabaseSelect<T>(path: string, query?: Record<string, QueryValue>): Promise<T[]> {
  if (!hasSupabaseEnv) return [];
  const response = await fetch(buildUrl(path, query), {
    headers: buildHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Supabase select failed (${response.status}) for ${path}`);
  }

  return (await response.json()) as T[];
}

export async function supabaseMaybeSingle<T>(path: string, query?: Record<string, QueryValue>): Promise<T | null> {
  const rows = await supabaseSelect<T>(path, query);
  return rows[0] ?? null;
}

export async function supabaseCount(path: string, query?: Record<string, QueryValue>): Promise<number> {
  if (!hasSupabaseEnv) return 0;

  const response = await fetch(buildUrl(path, query), {
    method: 'HEAD',
    headers: {
      ...buildHeaders(),
      Prefer: 'count=exact',
    },
  });

  if (!response.ok) {
    throw new Error(`Supabase count failed (${response.status}) for ${path}`);
  }

  const rangeHeader = response.headers.get('content-range') ?? '';
  const total = Number(rangeHeader.split('/')[1] ?? 0);
  return Number.isFinite(total) ? total : 0;
}
