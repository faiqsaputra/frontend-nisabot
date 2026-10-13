import { supabase } from './supabase.js';

const API_URL = (
  import.meta.env.VITE_API_URL || 'https://nusa-bot-backend.vercel.app/api'
).replace(/\/+$/, '');

function createApiError(message, status = 0, data = null) {
  const error = new Error(message || 'Request API gagal.');

  error.status = status;
  error.data = data;
  error.errors = data?.errors ?? null;

  return error;
}

async function getAccessToken(forceRefresh = false) {
  if (forceRefresh) {
    const { data, error } = await supabase.auth.refreshSession();

    if (error || !data?.session?.access_token) {
      throw createApiError(
        'Sesi login tidak valid. Silakan login kembali.',
        401
      );
    }

    return data.session.access_token;
  }

  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw createApiError(
      'Gagal memeriksa sesi login Supabase.',
      401,
      { message: error.message }
    );
  }

  let session = data?.session;

  if (!session?.access_token) {
    const { data: refreshed, error: refreshError } =
      await supabase.auth.refreshSession();

    if (refreshError || !refreshed?.session?.access_token) {
      throw createApiError(
        'Sesi login tidak ditemukan atau sudah berakhir. Silakan login kembali.',
        401
      );
    }

    session = refreshed.session;
  }

  const expiresAt = Number(session.expires_at ?? 0);
  const expiresSoon = expiresAt > 0 &&
    expiresAt * 1000 <= Date.now() + 30_000;

  if (expiresSoon) {
    const { data: refreshed, error: refreshError } =
      await supabase.auth.refreshSession();

    if (refreshError || !refreshed?.session?.access_token) {
      throw createApiError(
        'Sesi login sudah kedaluwarsa. Silakan login kembali.',
        401
      );
    }

    session = refreshed.session;
  }

  return session.access_token;
}

function buildUrl(path, params) {
  const url = new URL(
    `${API_URL}${path.startsWith('/') ? path : `/${path}`}`
  );

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null || value === '') continue;
      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}

async function sendRequest(url, options, token) {
  const headers = new Headers(options.headers ?? {});

  headers.set('Accept', 'application/json');

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const isFormData =
    typeof FormData !== 'undefined' && options.body instanceof FormData;

  if (options.body !== undefined && !isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  return fetch(url, {
    ...options,
    headers
  });
}

async function request(path, options = {}) {
  const {
    params,
    headers: customHeaders,
    ...fetchOptions
  } = options;

  const url = buildUrl(path, params);
  const headers = new Headers(customHeaders ?? {});

  const requestOptions = {
    ...fetchOptions,
    headers
  };

  let token = await getAccessToken();
  let response = await sendRequest(url, requestOptions, token);

  if (response.status === 401) {
    try {
      const refreshedToken = await getAccessToken(true);

      if (refreshedToken && refreshedToken !== token) {
        token = refreshedToken;
        response = await sendRequest(url, requestOptions, token);
      }
    } catch {
      // Respons HTTP pertama tetap dibaca agar error API tidak hilang.
    }
  }

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    const message = response.status === 401
      ? 'Sesi ditolak backend. Token Supabase mungkin tidak valid atau akun perlu login kembali.'
      : result?.message ||
        result?.error ||
        `Request gagal dengan status ${response.status}.`;

    throw createApiError(message, response.status, result);
  }

  return result ?? {};
}

function query(path, params = {}, options = {}) {
  return request(path, {
    ...options,
    params
  });
}

function encodeId(id) {
  if (id === undefined || id === null || id === '') {
    throw new Error('ID data tidak tersedia.');
  }

  return encodeURIComponent(String(id));
}

export const quizApi = {
  // Admin Quiz Hub
  list(params = {}, options = {}) {
    return query('/admin/quizzes', params, options);
  },

  stats(options = {}) {
    return request('/admin/quizzes/stats', options);
  },

  materials(options = {}) {
    return query(
      '/admin/materials',
      { page: 1, limit: 50 },
      options
    );
  },

  create(payload) {
    return request('/admin/quizzes', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  update(quizId, payload) {
    return request(`/admin/quizzes/${encodeId(quizId)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
  },

  remove(quizId) {
    return request(`/admin/quizzes/${encodeId(quizId)}`, {
      method: 'DELETE'
    });
  },

  // Quiz Studio / Question Canvas
  questions(quizId, options = {}) {
    return request(
      `/admin/quizzes/${encodeId(quizId)}/questions`,
      options
    );
  },

  getQuestion(quizId, questionId, options = {}) {
    return request(
      `/admin/quizzes/${encodeId(quizId)}/questions/${encodeId(questionId)}`,
      options
    );
  },

  createQuestion(quizId, payload) {
    return request(`/admin/quizzes/${encodeId(quizId)}/questions`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  updateQuestion(quizId, questionId, payload) {
    return request(
      `/admin/quizzes/${encodeId(quizId)}/questions/${encodeId(questionId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload)
      }
    );
  },

  deleteQuestion(quizId, questionId) {
    return request(
      `/admin/quizzes/${encodeId(quizId)}/questions/${encodeId(questionId)}`,
      {
        method: 'DELETE'
      }
    );
  },

  reorderQuestions(quizId, payload) {
    return request(
      `/admin/quizzes/${encodeId(quizId)}/questions/reorder`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload)
      }
    );
  },

  preview(quizId, options = {}) {
    return request(
      `/admin/quizzes/${encodeId(quizId)}/preview`,
      options
    );
  },

  validatePublish(quizId) {
    return request(
      `/admin/quizzes/${encodeId(quizId)}/validate-publish`,
      { method: 'POST' }
    );
  },

  publish(quizId) {
    return request(
      `/admin/quizzes/${encodeId(quizId)}/publish`,
      { method: 'POST' }
    );
  },

  unpublish(quizId) {
    return request(
      `/admin/quizzes/${encodeId(quizId)}/unpublish`,
      { method: 'POST' }
    );
  },

  archive(quizId) {
    return request(
      `/admin/quizzes/${encodeId(quizId)}/archive`,
      { method: 'POST' }
    );
  },

  // Public Quiz Mission
  publicList(params = {}, options = {}) {
    return query('/quizzes', params, options);
  },

  publicGet(quizId, options = {}) {
    return request(`/quizzes/${encodeId(quizId)}`, options);
  },

  // Endpoint percobaan harus tersedia di backend agar method ini berfungsi.
  startAttempt(quizId, payload = {}) {
    return request(`/quizzes/${encodeId(quizId)}/attempts`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  submitAnswer(attemptId, payload) {
    return request(
      `/quizzes/attempts/${encodeId(attemptId)}/answers`,
      {
        method: 'POST',
        body: JSON.stringify(payload)
      }
    );
  },

  completeAttempt(attemptId, payload = {}) {
    return request(
      `/quizzes/attempts/${encodeId(attemptId)}/complete`,
      {
        method: 'POST',
        body: JSON.stringify(payload)
      }
    );
  }
};