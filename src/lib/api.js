import { supabase } from './supabase';

const API_URL = (
  import.meta.env.VITE_API_URL ||
  'https://nisqa-bot.vercel.app/api'
).replace(/\/+$/, '');

function normalizePath(path) {
  if (!path) return '/';

  const value = String(path);

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  return value.startsWith('/') ? value : `/${value}`;
}

function clampLimit(path) {
  const normalizedPath = normalizePath(path);

  if (/^https?:\/\//i.test(normalizedPath)) {
    return normalizedPath;
  }

  try {
    const url = new URL(normalizedPath, `${API_URL}/`);

    if (url.searchParams.has('limit')) {
      const rawLimit = Number(url.searchParams.get('limit'));

      if (Number.isFinite(rawLimit)) {
        url.searchParams.set(
          'limit',
          String(Math.min(Math.max(rawLimit, 1), 50))
        );
      }
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return normalizedPath;
  }
}

async function parseResponse(response) {
  const result = await response.json().catch(() => null);

  if (!response.ok || result?.success === false) {
    const message =
      result?.message ||
      result?.error ||
      result?.detail ||
      `Request gagal (${response.status}).`;

    const error = new Error(message);

    error.status = response.status;
    error.data = result;

    throw error;
  }

  return result;
}

function buildHeaders(options = {}, accessToken = null) {
  const headers = new Headers(options.headers || {});
  const isFormData = options.body instanceof FormData;

  if (options.body != null && !isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }

  return headers;
}

async function request(path, options = {}, accessToken = null) {
  const originalPath = normalizePath(path);
  const normalizedPath = clampLimit(originalPath);

  const url = /^https?:\/\//i.test(originalPath)
    ? originalPath
    : `${API_URL}${normalizedPath}`;

  const response = await fetch(url, {
    ...options,
    cache: 'no-store',
    headers: buildHeaders(options, accessToken)
  });

  return parseResponse(response);
}

export async function publicFetch(path, options = {}) {
  return request(path, options);
}

export async function apiFetch(path, options = {}) {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw new Error('Gagal membaca session Supabase.');
  }

  const accessToken = data.session?.access_token;

  if (!accessToken) {
    throw new Error('Session tidak ditemukan. Silakan login kembali.');
  }

  return request(path, options, accessToken);
}

export async function apiFetchWithFallback(paths, options = {}) {
  const candidates = Array.isArray(paths)
    ? paths.filter(Boolean)
    : [paths];

  let lastError = null;

  for (const path of candidates) {
    try {
      return await apiFetch(path, options);
    } catch (error) {
      lastError = error;

      if (error.status !== 404) {
        throw error;
      }
    }
  }

  throw lastError || new Error('API endpoint tidak ditemukan.');
}