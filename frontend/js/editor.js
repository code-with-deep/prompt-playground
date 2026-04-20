const TECHNIQUE_INFO = {
    'zero-shot': {
        label: 'Direct instruction, no examples',
        hint: 'Best for simple, clear tasks where the model already understands the domain.'
    },
    'few-shot': {
        label: '2-5 examples before the task',
        hint: 'Show the model the pattern you want. Great for classification, formatting, style matching.'
    },
    'chain-of-thought': {
        label: 'Step-by-step reasoning',
        hint: 'Prefix with "Let\'s think step by step." Forces the model to reason before answering. Best for math, logic.'
    },
    'role-based': {
        label: 'Persona/role assignment',
        hint: 'Tell the model who it is. "You are a senior Python developer" changes output style and depth.'
    },
    'output-format': {
        label: 'Format-constrained output',
        hint: 'Specify exact output format (JSON, CSV, Markdown table). Include schema or example in prompt.'
    },
    'negative-prompting': {
        label: 'Specify what NOT to do',
        hint: 'Add constraints: "Do not use jargon", "Never exceed 3 sentences". Reduces unwanted outputs.'
    },
    'self-consistency': {
        label: 'Run N times → majority vote',
        hint: 'Run the same prompt multiple times and pick the most consistent answer. Great for factual queries.'
    }
};
function getTemperatureHint(temp) {
    if (temp <= 0.1) return '🔒 Deterministic — same input = same output every time';
    if (temp <= 0.4) return '📊 Focused — factual, predictable, conservative';
    if (temp <= 0.7) return '⚖️ Balanced — good for most tasks';
    if (temp <= 1.0) return '✨ Creative — varied, imaginative responses';
    if (temp <= 1.5) return '🎨 Very creative — diverse but may be less coherent';
    return '🌀 Chaotic — highly varied, unpredictable';
}
function updateVariables(promptText) {
    const regex = /\{\{(\w+)\}\}/g;
    const matches = [...promptText.matchAll(regex)];
    const vars = [...new Set(matches.map(m => m[1]))];
    const panel = document.getElementById('variablesPanel');
    const inputs = document.getElementById('variableInputs');
    if (vars.length === 0) {
        panel.style.display = 'none';
        return;
    }
    panel.style.display = 'block';
    inputs.innerHTML = '';
    vars.forEach(varName => {
        const group = document.createElement('div');
        group.className = 'variable-input-group';
        group.innerHTML = `
            <label>{{${varName}}}</label>
            <input type="text"
                   id="var_${varName}"
                   class="input-styled"
                   placeholder="Value for ${varName}"
                   style="flex:1;">
        `;
        inputs.appendChild(group);
    });
}
function resolveVariables(promptText) {
    const regex = /\{\{(\w+)\}\}/g;
    return promptText.replace(regex, (match, varName) => {
        const input = document.getElementById(`var_${varName}`);
        return input ? input.value || match : match;
    });
}
function initEditor() {
    const techniqueSelector = document.getElementById('techniqueSelector');
    const techniqueBadge = document.getElementById('techniqueBadge');
    const selfConsistencyPanel = document.getElementById('selfConsistencyPanel');
    techniqueSelector.addEventListener('change', () => {
        const technique = techniqueSelector.value;
        const info = TECHNIQUE_INFO[technique];
        techniqueBadge.textContent = info ? info.label : '';
        selfConsistencyPanel.style.display =
            technique === 'self-consistency' ? 'block' : 'none';
    });
    const paramMap = {
        'temperature': { display: 'tempValue', hint: 'tempHint' },
        'topP': { display: 'topPValue' },
        'maxTokens': { display: 'maxTokensValue' },
        'freqPenalty': { display: 'freqPenValue' },
        'presPenalty': { display: 'presPenValue' }
    };
    Object.entries(paramMap).forEach(([inputId, config]) => {
        const slider = document.getElementById(inputId);
        const display = document.getElementById(config.display);
        slider.addEventListener('input', () => {
            display.textContent = slider.value;
            if (config.hint) {
                document.getElementById(config.hint).textContent =
                    getTemperatureHint(parseFloat(slider.value));
            }
        });
    });
    const userPrompt = document.getElementById('userPrompt');
    let debounceTimer;
    userPrompt.addEventListener('input', () => {
        updateVariables(userPrompt.value);
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(async () => {
            try {
                const fullText = document.getElementById('systemPrompt').value +
                                ' ' + userPrompt.value;
                const result = await countTokens(fullText);
                document.getElementById('tokenCounter').innerHTML =
                    `<i class="fas fa-coins"></i> ${result.tokens} tokens`;
            } catch (e) {
                const words = userPrompt.value.split(' ').length;
                document.getElementById('tokenCounter').innerHTML =
                    `<i class="fas fa-coins"></i> ~${Math.ceil(words * 1.3)} tokens`;
            }
        }, 500);  // Wait 500ms after user stops typing
    });
}
function getEditorParams() {
    return {
        system_prompt: document.getElementById('systemPrompt').value,
        user_prompt: resolveVariables(document.getElementById('userPrompt').value),
        provider: document.getElementById('providerSelector').value,
        technique: document.getElementById('techniqueSelector').value,
        temperature: parseFloat(document.getElementById('temperature').value),
        top_p: parseFloat(document.getElementById('topP').value),
        max_tokens: parseInt(document.getElementById('maxTokens').value),
        frequency_penalty: parseFloat(document.getElementById('freqPenalty').value),
        presence_penalty: parseFloat(document.getElementById('presPenalty').value),
        stop_sequences: document.getElementById('stopSequences').value
            .split(',').map(s => s.trim()).filter(Boolean)
    };
}