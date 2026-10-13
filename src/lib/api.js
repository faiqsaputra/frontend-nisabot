import { supabase } from './supabase';

const API_URL = (
  import.meta.env.VITE_API_URL || 'https://nusa-bot-backend.vercel.app/api'
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

  if (!response.ok) {
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

  if (result?.success === false) {
    const error = new Error(
      result.message || result.error || 'Request gagal.'
    );

    error.status = response.status;
    error.data = result;

    throw error;
  }

  return result;
}

function buildHeaders(options = {}, accessToken = null) {
  const headers = new Headers(options.headers || {});

  if (
    !(options.body instanceof FormData) &&
    !headers.has('Content-Type')
  ) {
    headers.set('Content-Type', 'application/json');
  }

  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  return headers;
}

async function request(path, options = {}, accessToken = null) {
  const normalizedPath = clampLimit(path);

  const url = /^https?:\/\//i.test(normalizePath(path))
    ? normalizePath(path)
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
    throw new Error('Gagal membaca session.');
  }

  const accessToken = data.session?.access_token;

  if (!accessToken) {
    throw new Error('Session tidak ditemukan.');
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

      if (error?.status !== 404) {
        throw error;
      }
    }
  }

  throw lastError || new Error('API endpoint not found.');
}