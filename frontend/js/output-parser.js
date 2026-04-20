function renderOutput(container, result) {
    const parsedOutput = result.parsed_output || {};
    const rawText = result.output || '';
    container.innerHTML = '';
    container.dataset.raw = encodeURIComponent(rawText);
    const type = parsedOutput.type || 'text';
    if (type === 'json' && parsedOutput.is_valid_json) {
        const pre = document.createElement('pre');
        pre.className = 'json-output';
        pre.textContent = JSON.stringify(parsedOutput.parsed, null, 2);
        container.appendChild(pre);
    } else {
        const div = document.createElement('div');
        div.className = 'output-text';
        div.innerHTML = marked.parse(rawText);
        div.querySelectorAll('pre code').forEach(block => {
            const pre = block.parentElement;
            pre.style.position = 'relative';
            const copyBtn = document.createElement('button');
            copyBtn.className = 'copy-code-btn';
            copyBtn.textContent = 'Copy';
            copyBtn.onclick = () => {
                navigator.clipboard.writeText(block.textContent);
                copyBtn.textContent = 'Copied!';
                setTimeout(() => copyBtn.textContent = 'Copy', 2000);
            };
            pre.appendChild(copyBtn);
            Prism.highlightElement(block);
        });
        container.appendChild(div);
    }
}
function renderMetrics(result) {
    document.getElementById('latencyDisplay').textContent = result.latency_ms || 0;
    document.getElementById('tokensDisplay').textContent =
        `${result.input_tokens || 0} in / ${result.output_tokens || 0} out`;
    document.getElementById('costDisplay').textContent =
        (result.estimated_cost || 0).toFixed(6);
    document.getElementById('metricsBar').style.display = 'flex';
}