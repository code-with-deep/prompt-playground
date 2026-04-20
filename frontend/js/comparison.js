function initComparison() {
    ['A', 'B'].forEach(side => {
        const slider = document.getElementById(`temp${side}`);
        const display = document.getElementById(`temp${side}Value`);
        if (slider) slider.addEventListener('input', () => display.textContent = slider.value);
    });
    document.getElementById('runBothBtn').addEventListener('click', async () => {
        const payload = {
            prompt_a: {
                system_prompt: document.getElementById('compareSystemA').value,
                user_prompt: document.getElementById('comparePromptA').value,
                temperature: parseFloat(document.getElementById('tempA').value),
                technique: document.getElementById('techniqueA').value,
                provider: document.getElementById('providerSelector').value,
                max_tokens: 1024
            },
            prompt_b: {
                system_prompt: document.getElementById('compareSystemB').value,
                user_prompt: document.getElementById('comparePromptB').value,
                temperature: parseFloat(document.getElementById('tempB').value),
                technique: document.getElementById('techniqueB').value,
                provider: document.getElementById('providerSelector').value,
                max_tokens: 1024
            }
        };
        if (!payload.prompt_a.user_prompt || !payload.prompt_b.user_prompt) {
            if (typeof showToast !== 'undefined') showToast('Enter prompts for both sides', 'error');
            return;
        }
        document.getElementById('compareOutputA').innerHTML = '<div class="loading-state"><div class="loading-spinner"></div></div>';
        document.getElementById('compareOutputB').innerHTML = '<div class="loading-state"><div class="loading-spinner"></div></div>';
        document.getElementById('runBothBtn').disabled = true;
        try {
            const result = await comparePrompts(payload);
            const outputA = document.getElementById('compareOutputA');
            outputA.innerHTML = '';
            if (typeof renderOutput !== 'undefined') {
                renderOutput(outputA, result.result_a);
            } else {
                outputA.textContent = result.result_a.output;
            }
            const outputB = document.getElementById('compareOutputB');
            outputB.innerHTML = '';
            if (typeof renderOutput !== 'undefined') {
                renderOutput(outputB, result.result_b);
            } else {
                outputB.textContent = result.result_b.output;
            }
            document.getElementById('compareMetricsA').innerHTML =
                formatMetrics(result.result_a);
            document.getElementById('compareMetricsB').innerHTML =
                formatMetrics(result.result_b);
        } catch (error) {
            document.getElementById('compareOutputA').textContent = 'Error: ' + error.message;
            document.getElementById('compareOutputB').textContent = 'Error: ' + error.message;
        } finally {
            document.getElementById('runBothBtn').disabled = false;
        }
    });
}
function formatMetrics(result) {
    return `
        <span>⏱ ${result.latency_ms}ms</span>
        <span>🔢 ${result.input_tokens + result.output_tokens} tokens</span>
        <span>💵 $${result.estimated_cost?.toFixed(6) || '0.000000'}</span>
    `;
}
document.addEventListener('DOMContentLoaded', initComparison);