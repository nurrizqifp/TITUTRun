const rawApiUrl = import.meta.env.VITE_API_URL;
const API_URL = rawApiUrl ? rawApiUrl.replace(/\/+$/, '') : '';

let unauthorizedHandler = null;

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
}

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
  } catch {
    throw new Error('Tidak dapat terhubung ke server. Pastikan backend TITUT Run sedang berjalan.');
  }

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401 && unauthorizedHandler && !path.startsWith('/api/auth/')) {
      unauthorizedHandler();
    }
    const error = new Error(body?.error || `Permintaan gagal (${response.status}).`);
    error.status = response.status;
    throw error;
  }
  return body;
}

export function formatPace(durationMinutes, distanceKm) {
  if (!distanceKm || distanceKm <= 0) return '—';
  const totalSeconds = Math.round((durationMinutes / distanceKm) * 60);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export const getMe = () => request('/api/auth/me');
export const loginUser = (credentials) => request('/api/auth/login', {
  method: 'POST',
  body: JSON.stringify(credentials),
});
export const registerUser = (payload) => request('/api/auth/register', {
  method: 'POST',
  body: JSON.stringify(payload),
});
export const logoutUser = () => request('/api/auth/logout', { method: 'POST' });

export const getLogs = () => request('/api/logs');
export const saveLog = (metrics) => request('/api/logs', {
  method: 'POST',
  body: JSON.stringify(metrics),
});
export const generateSchedule = (preferences) => request('/api/schedule/generate', {
  method: 'POST',
  body: JSON.stringify(preferences),
});
export const getSavedSchedule = () => request('/api/schedule');
export const saveSchedule = (plan) => request('/api/schedule/save', {
  method: 'POST',
  body: JSON.stringify(plan),
});
