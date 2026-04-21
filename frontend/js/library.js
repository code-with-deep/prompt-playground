async function loadLibrary() {
    const grid = document.getElementById('libraryGrid');
    grid.innerHTML = '<div class="loading-state"><div class="loading-spinner"></div></div>';
    try {
        const search = document.getElementById('librarySearch')?.value || '';
        const category = document.getElementById('categoryFilter')?.value || '';
        const result = await fetchPrompts({ search, category, include_builtin: 'true' });
        if (result.prompts.length === 0) {
            grid.innerHTML = '<div style="color: var(--text-muted); padding: 40px; text-align: center;">No prompts found</div>';
            return;
        }
        grid.innerHTML = '';
        result.prompts.forEach(prompt => {
            grid.appendChild(createPromptCard(prompt));
        });
    } catch (error) {
        grid.innerHTML = `<div style="color: var(--accent-red); padding: 20px;">Failed to load library: ${error.message}</div>`;
    }
}
function createPromptCard(prompt) {
    const card = document.createElement('div');
    card.className = 'prompt-card';
    const tags = Array.isArray(prompt.tags) ? prompt.tags : [];
    card.innerHTML = `
        ${prompt.is_builtin ? '<span class="builtin-badge">BUILT-IN</span>' : ''}
        <div class="prompt-card-header">
            <span class="prompt-card-name">${escapeHtml(prompt.name)}</span>
            <span class="prompt-card-category">${escapeHtml(prompt.category)}</span>
        </div>
        <p class="prompt-card-desc">${escapeHtml(prompt.description || 'No description')}</p>
        <div class="prompt-card-tags">
            ${tags.slice(0, 4).map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('')}
        </div>
        <div class="prompt-card-actions">
            <button class="btn btn-sm btn-primary" onclick="loadPromptIntoPlayground(${prompt.id})">
                <i class="fas fa-arrow-right"></i> Load
            </button>
            ${!prompt.is_builtin ? `
                <button class="btn btn-sm" onclick="handleDeletePrompt(${prompt.id}, this)">
                    <i class="fas fa-trash"></i>
                </button>
            ` : ''}
        </div>
    `;
    return card;
}
async function loadPromptIntoPlayground(promptId) {
    try {
        const prompt = await apiFetch(`/prompts/${promptId}`);
        document.querySelector('[data-screen="playground"]').click();
        document.getElementById('systemPrompt').value = prompt.system_prompt || '';
        document.getElementById('userPrompt').value = prompt.user_prompt || '';
        if (prompt.recommended_temperature !== undefined) {
            document.getElementById('temperature').value = prompt.recommended_temperature;
            document.getElementById('tempValue').textContent = prompt.recommended_temperature;
        }
        if (prompt.recommended_max_tokens) {
            document.getElementById('maxTokens').value = prompt.recommended_max_tokens;
            document.getElementById('maxTokensValue').textContent = prompt.recommended_max_tokens;
        }
        if (prompt.technique) {
            const selector = document.getElementById('techniqueSelector');
            if (selector) selector.value = prompt.technique;
        }
        document.getElementById('userPrompt').dispatchEvent(new Event('input'));
        if (typeof showToast !== 'undefined') {
            showToast(`Loaded: ${prompt.name}`, 'success');
        }
    } catch (error) {
        if (typeof showToast !== 'undefined') {
            showToast('Failed to load prompt: ' + error.message, 'error');
        }
    }
}
async function handleDeletePrompt(id, btn) {
    if (!confirm('Delete this prompt?')) return;
    try {
        await deletePrompt(id);
        btn.closest('.prompt-card').remove();
        if (typeof showToast !== 'undefined') showToast('Prompt deleted', 'success');
    } catch (error) {
        if (typeof showToast !== 'undefined') showToast('Delete failed: ' + error.message, 'error');
    }
}
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
}
document.addEventListener('DOMContentLoaded', () => {
    let searchTimer;
    const searchInput = document.getElementById('librarySearch');
    const categoryFilter = document.getElementById('categoryFilter');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            clearTimeout(searchTimer);
            searchTimer = setTimeout(loadLibrary, 400);
        });
    }
    if (categoryFilter) {
        categoryFilter.addEventListener('change', loadLibrary);
    }
    const exportBtn = document.getElementById('exportPromptsBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', async () => {
            window.location.href = `${API_BASE}/export`;
        });
    }
    const importFile = document.getElementById('importFile');
    if (importFile) {
        importFile.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const text = await file.text();
            try {
                const data = JSON.parse(text);
                await apiFetch('/import', { method: 'POST', body: JSON.stringify(data) });
                if (typeof showToast !== 'undefined') showToast('Prompts imported!', 'success');
                loadLibrary();
            } catch (err) {
                if (typeof showToast !== 'undefined') showToast('Import failed: ' + err.message, 'error');
            }
        });
    }
    // NOTE: runSweepBtn is handled exclusively by sweep.js — no duplicate listener here
});
async function runParameterSweep() {
    const promptText = document.getElementById('sweepPrompt')?.value?.trim();
    const sweepParam = document.getElementById('sweepParam')?.value;
    const valuesText = document.getElementById('sweepValues')?.value;
    if (!promptText) {
        if (typeof showToast !== 'undefined') showToast('Enter a prompt first', 'error');
        return;
    }
    const sweepValues = valuesText.split(',').map(v => parseFloat(v.trim())).filter(v => !isNaN(v));
    const grid = document.getElementById('sweepGrid');
    grid.innerHTML = '<div class="loading-state"><div class="loading-spinner"></div><p>Running sweep...</p></div>';
    document.getElementById('runSweepBtn').disabled = true;
    try {
        const result = await sweepParams({
            prompt: {
                user_prompt: promptText,
                provider: document.getElementById('providerSelector').value
            },
            sweep_param: sweepParam,
            sweep_values: sweepValues
        });
        grid.innerHTML = '';
        result.results.forEach(r => {
            const card = document.createElement('div');
            card.className = 'sweep-card';
            card.innerHTML = `
                <div class="sweep-card-header">
                    <span>${sweepParam}</span>
                    <span class="sweep-param-badge">${r.sweep_value}</span>
                </div>
                <div class="sweep-output">${escapeHtml(r.output?.substring(0, 300) + (r.output?.length > 300 ? '...' : ''))}</div>
                <div class="compare-metrics" style="margin-top:8px;">
                    <span>⏱ ${r.latency_ms}ms</span>
                    <span>🔢 ${(r.input_tokens || 0) + (r.output_tokens || 0)} tokens</span>
                </div>
            `;
            grid.appendChild(card);
        });
    } catch (error) {
        grid.innerHTML = `<div style="color: var(--accent-red); padding: 20px;">Sweep failed: ${error.message}</div>`;
    } finally {
        document.getElementById('runSweepBtn').disabled = false;
    }
}
async function loadHistory() {
    const list = document.getElementById('historyList');
    list.innerHTML = '<div class="loading-state"><div class="loading-spinner"></div></div>';
    try {
        const technique = document.getElementById('techniqueFilter')?.value || '';
        const result = await fetchHistory({ technique, limit: 30 });
        if (result.history.length === 0) {
            list.innerHTML = '<div style="color: var(--text-muted); padding: 40px; text-align: center;">No history yet. Run some prompts!</div>';
            return;
        }
        list.innerHTML = '';
        result.history.forEach(entry => {
            const item = document.createElement('div');
            item.className = 'history-item';
            item.innerHTML = `
                <div class="history-header">
                    <span class="history-technique">${entry.technique}</span>
                    <span class="history-time">${new Date(entry.created_at).toLocaleString()}</span>
                </div>
                <div class="history-prompt">${escapeHtml(entry.user_prompt)}</div>
                <div class="history-output-preview">${escapeHtml((entry.output || '').substring(0, 150))}${(entry.output || '').length > 150 ? '...' : ''}</div>
                <div class="history-metrics">
                    <span>⏱ ${entry.latency_ms}ms</span>
                    <span>🔢 ${(entry.input_tokens || 0) + (entry.output_tokens || 0)} tokens</span>
                    <span>💵 $${(entry.estimated_cost || 0).toFixed(6)}</span>
                    ${entry.rating ? `<span>⭐ ${entry.rating}/5</span>` : ''}
                </div>
                <div class="history-actions">
                    <button class="btn btn-sm" onclick="reRunFromHistory(${entry.id})">
                        <i class="fas fa-redo"></i> Re-run
                    </button>
                </div>
            `;
            list.appendChild(item);
        });
    } catch (error) {
        list.innerHTML = `<div style="color: var(--accent-red); padding: 20px;">Failed to load history: ${error.message}</div>`;
    }
}
async function reRunFromHistory(historyId) {
    try {
        // Fetch the specific entry by ID — avoids missing entries beyond page 1
        const entry = await getHistoryEntry(historyId);
        document.querySelector('[data-screen="playground"]').click();
        document.getElementById('systemPrompt').value = entry.system_prompt || '';
        document.getElementById('userPrompt').value = entry.user_prompt_full || entry.user_prompt || '';
        if (typeof showToast !== 'undefined') showToast('Loaded into playground', 'success');
    } catch (e) {
        if (typeof showToast !== 'undefined') showToast('Failed to load entry', 'error');
    }
}