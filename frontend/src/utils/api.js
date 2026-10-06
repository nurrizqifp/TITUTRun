const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
  throw new Error('VITE_API_URL wajib dikonfigurasi melalui environment frontend.');
}

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
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
    throw new Error(body?.error || `Permintaan gagal (${response.status}).`);
  }
  return body;
}

export const getLogs = () => request('/api/logs');
export const saveLog = (metrics) => request('/api/logs', {
  method: 'POST',
  body: JSON.stringify(metrics),
});
export const generateSchedule = (preferences) => request('/api/schedule/generate', {
  method: 'POST',
  body: JSON.stringify(preferences),
});
