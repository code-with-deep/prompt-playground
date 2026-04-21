let currentHistoryId = null;  
function initNavigation() {
    document.querySelectorAll('.nav-item').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const screenName = link.dataset.screen;
            if (!screenName) return;
            document.querySelectorAll('.nav-item').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
            const targetScreen = document.getElementById(`screen-${screenName}`);
            if (targetScreen) targetScreen.classList.add('active');
            if (screenName === 'library') loadLibrary();
            if (screenName === 'history') loadHistory();
        });
    });
}
async function runPrompt() {
    const params = getEditorParams();
    if (!params.user_prompt.trim()) {
        showToast('Please enter a prompt first', 'error');
        return;
    }
    const outputContent = document.getElementById('outputContent');
    const loadingState = document.getElementById('loadingState');
    const runBtn = document.getElementById('runBtn');
    loadingState.style.display = 'flex';
    outputContent.style.display = 'none';
    document.getElementById('ratingPanel').style.display = 'none';
    document.getElementById('metricsBar').style.display = 'none';
    runBtn.disabled = true;
    runBtn.innerHTML = '<div class="loading-spinner" style="width:16px;height:16px;"></div> Running...';
    try {
        const result = await generatePrompt(params);
        loadingState.style.display = 'none';
        outputContent.style.display = 'block';
        renderOutput(outputContent, result);
        renderMetrics(result);
        currentHistoryId = result.history_id;
        document.getElementById('ratingPanel').style.display = 'flex';
    } catch (error) {
        loadingState.style.display = 'none';
        outputContent.style.display = 'block';
        outputContent.innerHTML = `
            <div style="color: var(--accent-red); padding: 20px;">
                <i class="fas fa-exclamation-circle"></i>
                <strong>Error:</strong> ${error.message}
            </div>
        `;
        showToast(error.message, 'error');
    } finally {
        runBtn.disabled = false;
        runBtn.innerHTML = '<i class="fas fa-play"></i> Run <span class="shortcut">Ctrl+↵</span>';
    }
}
function initSaveModal() {
    document.getElementById('savePromptBtn').addEventListener('click', () => {
        document.getElementById('saveModal').style.display = 'flex';
    });
    document.getElementById('closeSaveModal').addEventListener('click', () => {
        document.getElementById('saveModal').style.display = 'none';
    });
    document.getElementById('cancelSave').addEventListener('click', () => {
        document.getElementById('saveModal').style.display = 'none';
    });
    document.getElementById('confirmSave').addEventListener('click', async () => {
        const name = document.getElementById('savePromptName').value.trim();
        if (!name) { showToast('Please enter a prompt name', 'error'); return; }
        const params = getEditorParams();
        try {
            await savePrompt({
                name,
                description: document.getElementById('savePromptDesc').value,
                category: document.getElementById('savePromptCategory').value,
                tags: document.getElementById('savePromptTags').value.split(',').map(t => t.trim()),
                ...params
            });
            document.getElementById('saveModal').style.display = 'none';
            showToast('Prompt saved to library!', 'success');
        } catch (error) {
            showToast('Failed to save: ' + error.message, 'error');
        }
    });
    document.getElementById('saveModal').addEventListener('click', (e) => {
        if (e.target.id === 'saveModal') {
            document.getElementById('saveModal').style.display = 'none';
        }
    });
}
function initRating() {
    const stars = document.querySelectorAll('.star-rating i');
    stars.forEach(star => {
        star.addEventListener('click', async () => {
            const rating = parseInt(star.dataset.rating);
            stars.forEach((s, i) => {
                s.classList.toggle('active', i < rating);
            });
            if (currentHistoryId) {
                try {
                    await rateExecution(currentHistoryId, rating);
                    showToast(`Rated ${rating} star${rating > 1 ? 's' : ''}`, 'success');
                } catch (e) {
                    showToast('Rating failed', 'error');
                }
            }
        });
    });
}
function initTheme() {
    const toggle = document.getElementById('themeToggle');
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    toggle.querySelector('i').className = savedTheme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
    toggle.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
        toggle.querySelector('i').className = next === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
    });
}
function initShortcuts() {
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            const activeScreen = document.querySelector('.screen.active');
            if (activeScreen?.id === 'screen-playground') runPrompt();
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            const activeScreen = document.querySelector('.screen.active');
            if (activeScreen?.id === 'screen-playground') {
                document.getElementById('saveModal').style.display = 'flex';
            }
        }
    });
}
function initCopyOutput() {
    document.getElementById('copyOutputBtn').addEventListener('click', () => {
        const container = document.getElementById('outputContent');
        const content = container.dataset.raw ? decodeURIComponent(container.dataset.raw) : container.innerText;
        navigator.clipboard.writeText(content);
        showToast('Output copied to clipboard', 'success');
    });
    document.getElementById('clearOutputBtn').addEventListener('click', () => {
        document.getElementById('outputContent').innerHTML = `
            <div class="output-placeholder">
                <i class="fas fa-magic"></i>
                <p>Your AI output will appear here</p>
            </div>
        `;
        document.getElementById('metricsBar').style.display = 'none';
        document.getElementById('ratingPanel').style.display = 'none';
    });
}
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    setTimeout(() => {
        toast.className = 'toast';
    }, 3000);
}
function initLandingPage() {
    const landingWrapper = document.getElementById('landing-wrapper');
    const appWrapper = document.getElementById('app-wrapper');
    const launchBtns = [document.getElementById('launchHeroBtn'), document.getElementById('launchNavBtn')];
    launchBtns.forEach(btn => {
        if (btn) {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                landingWrapper.style.display = 'none';
                appWrapper.style.display = 'flex';
                window.dispatchEvent(new Event('resize'));
            });
        }
    });
    const returnBtn = document.getElementById('navReturnHome');
    if (returnBtn) {
        returnBtn.addEventListener('click', (e) => {
            e.preventDefault();
            appWrapper.style.display = 'none';
            landingWrapper.style.display = 'flex';
        });
    }
    const contactForm = document.getElementById('landingContactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            contactForm.reset();
            showToast('Message sent! We will get back to you soon.', 'success');
        });
    }
}
document.addEventListener('DOMContentLoaded', () => {
    initLandingPage();
    initNavigation();
    initEditor();          
    initSaveModal();
    initRating();
    initTheme();
    initShortcuts();
    initCopyOutput();
    document.getElementById('runBtn').addEventListener('click', runPrompt);
    console.log('✅ Prompt Engineering Playground loaded');
});