function initSweep() {
    const runSweepBtn = document.getElementById('runSweepBtn');
    const sweepGrid = document.getElementById('sweepGrid');
    const sweepPromptInput = document.getElementById('sweepPrompt');
    const sweepParamSelect = document.getElementById('sweepParam');
    const sweepValuesInput = document.getElementById('sweepValues');

    if (!runSweepBtn) return;

    runSweepBtn.addEventListener('click', async () => {
        const promptText = sweepPromptInput.value.trim();
        const sweepParam = sweepParamSelect.value;
        const rawValues = sweepValuesInput.value.split(',').map(v => v.trim()).filter(v => v !== '');

        if (!promptText) {
            if (typeof showToast !== 'undefined') showToast('Please enter a prompt to sweep', 'error');
            return;
        }

        if (rawValues.length === 0) {
            if (typeof showToast !== 'undefined') showToast('Please enter at least one value to sweep', 'error');
            return;
        }

        // Convert values to numbers if needed (temp, top_p, max_tokens)
        const sweepValues = rawValues.map(v => {
            const num = parseFloat(v);
            return isNaN(num) ? v : num;
        });

        // Prepare payload
        const payload = {
            prompt: {
                user_prompt: promptText,
                system_prompt: "You are a helpful assistant.", // Default or could be retrieved from playground
                provider: 'groq',
                model: 'llama-3.1-8b-instant'
            },
            sweep_param: sweepParam,
            sweep_values: sweepValues
        };

        // UI State: Loading
        sweepGrid.innerHTML = '';
        runSweepBtn.disabled = true;
        runSweepBtn.innerHTML = '<div class="loading-spinner" style="width:16px;height:16px;"></div> Running Sweep...';

        try {
            const response = await sweepParams(payload); // from api.js
            
            sweepGrid.innerHTML = '';
            response.results.forEach(result => {
                const card = document.createElement('div');
                card.className = 'sweep-card glass';
                
                const header = document.createElement('div');
                header.className = 'sweep-card-header';
                header.innerHTML = `
                    <span class="sweep-badge">${sweepParam}: ${result.sweep_value}</span>
                    <span class="sweep-latency">${result.latency_ms}ms</span>
                `;
                
                const content = document.createElement('div');
                content.className = 'sweep-card-content';
                
                if (typeof renderOutput !== 'undefined') {
                    renderOutput(content, result);
                } else {
                    content.textContent = result.output;
                }
                
                card.appendChild(header);
                card.appendChild(content);
                sweepGrid.appendChild(card);
            });

            if (typeof showToast !== 'undefined') showToast(`Successfully ran sweep across ${response.results.length} values`, 'success');

        } catch (error) {
            sweepGrid.innerHTML = `<div class="error-state"><i class="fas fa-exclamation-circle"></i> ${error.message}</div>`;
            if (typeof showToast !== 'undefined') showToast('Sweep failed: ' + error.message, 'error');
        } finally {
            runSweepBtn.disabled = false;
            runSweepBtn.innerHTML = '<i class="fas fa-play"></i> Run Sweep';
        }
    });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initSweep);
