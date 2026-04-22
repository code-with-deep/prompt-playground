const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:5000/api'
    : 'https://prompt-playground-s7fz.onrender.com/api';

const AUTH_TOKEN_KEY = 'promptlab_auth_token';
const AUTH_USER_KEY = 'promptlab_auth_user';

function getStoredAuthToken() {
    return localStorage.getItem(AUTH_TOKEN_KEY);
}

function getStoredAuthUser() {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    if (!raw) return null;
    try {
        return JSON.parse(raw);
    } catch (error) {
        localStorage.removeItem(AUTH_USER_KEY);
        return null;
    }
}

function saveAuthSession(token, user) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

function clearAuthSession() {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
}

async function apiFetch(endpoint, options = {}) {
    const headers = new Headers(options.headers || {});
    const isFormData = options.body instanceof FormData;

    if (!headers.has('Content-Type') && !isFormData) {
        headers.set('Content-Type', 'application/json');
    }

    const token = getStoredAuthToken();
    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers
    });

    const contentType = response.headers.get('content-type') || '';
    const data = contentType.includes('application/json')
        ? await response.json()
        : { message: await response.text() };

    if (!response.ok) {
        if (response.status === 401 && data.error === 'Authentication required') {
            window.dispatchEvent(new CustomEvent('promptlab:unauthorized', {
                detail: { endpoint }
            }));
        }
        throw new Error(data.error || data.message || `HTTP ${response.status}`);
    }

    return data;
}

async function signupUser(payload) {
    return apiFetch('/auth/signup', { method: 'POST', body: JSON.stringify(payload) });
}

async function loginUser(payload) {
    return apiFetch('/auth/login', { method: 'POST', body: JSON.stringify(payload) });
}

async function fetchCurrentUser() {
    return apiFetch('/auth/me');
}

async function logoutUser() {
    return apiFetch('/auth/logout', { method: 'POST' });
}

async function generatePrompt(payload) {
    return apiFetch('/generate', { method: 'POST', body: JSON.stringify(payload) });
}

async function comparePrompts(payload) {
    return apiFetch('/compare', { method: 'POST', body: JSON.stringify(payload) });
}

async function sweepParams(payload) {
    return apiFetch('/sweep', { method: 'POST', body: JSON.stringify(payload) });
}

async function countTokens(text) {
    return apiFetch('/count-tokens', { method: 'POST', body: JSON.stringify({ text }) });
}

async function fetchTemplates(params = {}) {
    const query = new URLSearchParams(params).toString();
    return apiFetch(`/templates${query ? '?' + query : ''}`);
}

async function fetchTemplate(id) {
    return apiFetch(`/templates/${id}`);
}

async function fetchPrompts(params = {}) {
    const query = new URLSearchParams(params).toString();
    return apiFetch(`/prompts${query ? '?' + query : ''}`);
}

async function savePrompt(data) {
    return apiFetch('/prompts', { method: 'POST', body: JSON.stringify(data) });
}

async function deletePrompt(id) {
    return apiFetch(`/prompts/${id}`, { method: 'DELETE' });
}

async function fetchHistory(params = {}) {
    const query = new URLSearchParams(params).toString();
    return apiFetch(`/history${query ? '?' + query : ''}`);
}

async function rateExecution(historyId, rating) {
    return apiFetch(`/history/${historyId}/rate`, {
        method: 'POST',
        body: JSON.stringify({ rating })
    });
}

async function getHistoryEntry(historyId) {
    return apiFetch(`/history/${historyId}`);
}
