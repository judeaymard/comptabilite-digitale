const BASE_URL = '/api';

function getAuthToken() {
  try {
    return localStorage.getItem('compta_token') || sessionStorage.getItem('compta_token') || '';
  } catch {
    return '';
  }
}

function getActiveUserName() {
  try {
    const raw = localStorage.getItem('compta_user') || sessionStorage.getItem('compta_user');
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed.name || 'Jude';
    }
  } catch {}
  return 'Jude';
}

async function authFetch(url, options = {}) {
  const token = getAuthToken();
  const headers = {
    ...(options.headers || {}),
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    'X-User': getActiveUserName(),
  };
  return fetch(url, { ...options, headers });
}

async function handleResponse(res) {
  if (!res.ok) {
    let errMessage = `Erreur HTTP ${res.status}`;
    try {
      const data = await res.json();
      if (data && (data.error || data.message)) errMessage = data.error || data.message;
    } catch {}

    if (res.status === 401) {
      // Session expirée ou invalide
      try {
        localStorage.removeItem('compta_token');
        sessionStorage.removeItem('compta_token');
        localStorage.removeItem('compta_user');
        sessionStorage.removeItem('compta_user');
      } catch {}
    }

    throw new Error(errMessage);
  }
  return res.json();
}

export const api = {
  // Auth
  async login(email, password, rememberMe = true) {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, rememberMe }),
    });
    return handleResponse(res);
  },

  async getMe() {
    const res = await authFetch(`${BASE_URL}/auth/me`);
    return handleResponse(res);
  },

  async logout(user) {
    const res = await authFetch(`${BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user }),
    });
    return handleResponse(res);
  },

  async getUsers() {
    const res = await authFetch(`${BASE_URL}/auth/users`);
    return handleResponse(res);
  },

  // Records (Journal)
  async getRecords(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await authFetch(`${BASE_URL}/records${query ? `?${query}` : ''}`);
    return handleResponse(res);
  },

  async getKPIs(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await authFetch(`${BASE_URL}/records/kpis${query ? `?${query}` : ''}`);
    return handleResponse(res);
  },

  async createRecord(payload) {
    const res = await authFetch(`${BASE_URL}/records`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  async updateRecord(id, payload) {
    const res = await authFetch(`${BASE_URL}/records/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  async deleteRecord(id, reason = '') {
    const res = await authFetch(`${BASE_URL}/records/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    return handleResponse(res);
  },


  async clearRecords(reason = '') {
    const res = await authFetch(`${BASE_URL}/records/clear`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    return handleResponse(res);
  },

  // Ads
  async getAds(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await authFetch(`${BASE_URL}/ads${query ? `?${query}` : ''}`);
    return handleResponse(res);
  },

  async getAdsSummary() {
    const res = await authFetch(`${BASE_URL}/ads/summary`);
    return handleResponse(res);
  },

  async getAdsByDate(date) {
    const res = await authFetch(`${BASE_URL}/ads/by-date/${date}`);
    return handleResponse(res);
  },

  async createAd(payload) {
    const res = await authFetch(`${BASE_URL}/ads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  async deleteAd(id) {
    const res = await authFetch(`${BASE_URL}/ads/${id}`, {
      method: 'DELETE',
    });
    return handleResponse(res);
  },

  // Settings
  async getSettings() {
    const res = await authFetch(`${BASE_URL}/settings`);
    return handleResponse(res);
  },

  async updateSettings(payload) {
    const res = await authFetch(`${BASE_URL}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  // Audit
  async getAuditLogs(params = 100) {
    let query = '';
    if (typeof params === 'number') {
      query = `limit=${params}`;
    } else if (typeof params === 'object') {
      query = new URLSearchParams(params).toString();
    }
    const res = await authFetch(`${BASE_URL}/audit${query ? `?${query}` : ''}`);
    return handleResponse(res);
  },

  // Import / Export
  async previewImport(rows) {
    const res = await authFetch(`${BASE_URL}/export-import/preview-import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows }),
    });
    return handleResponse(res);
  },

  async confirmImport(payload) {
    const res = await authFetch(`${BASE_URL}/export-import/confirm-import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  // Multi-Devises & Taux de Change
  async getCurrencyRates() {
    const res = await authFetch(`${BASE_URL}/currency/rates`);
    return handleResponse(res);
  },

  async refreshCurrencyRates() {
    const res = await authFetch(`${BASE_URL}/currency/refresh`, {
      method: 'POST',
    });
    return handleResponse(res);
  },

  async convertCurrency(amount, from = 'USD', to = 'FCFA', rate = null) {
    const res = await authFetch(`${BASE_URL}/currency/convert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, from, to, rate }),
    });
    return handleResponse(res);
  },

  async updateCustomCurrencyRate(customUsdRate, customEurRate) {
    const res = await authFetch(`${BASE_URL}/currency/custom-rate`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customUsdRate, customEurRate }),
    });
    return handleResponse(res);
  },
};
