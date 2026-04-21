const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:5000/api'
    : 'https://prompt-playground-s7fz.onrender.com/api';
async function apiFetch(endpoint, options = {}) {
    const response = await fetch(`${API_BASE}${endpoint}`, {
        headers: { 'Content-Type': 'application/json' },
        ...options
    });
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
    }
    return data;
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