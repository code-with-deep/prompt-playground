const PromptLabAuth = (() => {
    const VIEW_IDS = {
        landing: 'landing-wrapper',
        auth: 'auth-wrapper',
        app: 'app-wrapper'
    };

    function setView(viewName) {
        Object.entries(VIEW_IDS).forEach(([key, id]) => {
            const element = document.getElementById(id);
            if (!element) return;
            element.style.display = key === viewName
                ? (key === 'app' ? 'flex' : 'block')
                : 'none';
        });
    }

    function setAuthMode(mode) {
        document.querySelectorAll('.auth-tab').forEach((tab) => {
            tab.classList.toggle('active', tab.dataset.authMode === mode);
        });
        const loginBlock = document.getElementById('loginFormBlock');
        const signupBlock = document.getElementById('signupFormBlock');
        if (loginBlock) loginBlock.classList.toggle('active', mode === 'login');
        if (signupBlock) signupBlock.classList.toggle('active', mode === 'signup');
    }

    function updateEntryButtons(user) {
        const authNavBtn = document.getElementById('authNavBtn');
        const launchHeroBtn = document.getElementById('launchHeroBtn');
        const landingUserSection = document.getElementById('landingUserSection');
        const landingUserName = document.getElementById('landingUserName');

        if (authNavBtn) authNavBtn.style.display = user ? 'none' : 'inline-flex';
        if (landingUserSection) landingUserSection.style.display = user ? 'flex' : 'none';
        if (landingUserName && user) landingUserName.textContent = user.name || 'User';

        if (launchHeroBtn) launchHeroBtn.textContent = user ? 'Open Workspace' : 'Start Engineering';
    }

    function updateSidebarUser(user) {
        const userCard = document.getElementById('sidebarUserCard');
        const logoutBtn = document.getElementById('logoutBtn');
        const nameEl = document.getElementById('sidebarUserName');
        const emailEl = document.getElementById('sidebarUserEmail');

        if (!userCard || !logoutBtn || !nameEl || !emailEl) return;

        if (user) {
            nameEl.textContent = user.name || 'PromptLab User';
            emailEl.textContent = user.email || '';
            userCard.style.display = 'flex';
            logoutBtn.style.display = 'inline-flex';
        } else {
            userCard.style.display = 'none';
            logoutBtn.style.display = 'none';
        }
    }

    function updateAuthUI(user = getStoredAuthUser()) {
        updateEntryButtons(user);
        updateSidebarUser(user);
    }

    async function handleAuthSuccess(result, successMessage) {
        saveAuthSession(result.token, result.user);
        updateAuthUI(result.user);
        setView('app');
        window.dispatchEvent(new Event('resize'));
        if (typeof showToast === 'function') {
            showToast(successMessage, 'success');
        }
    }

    async function restoreSession() {
        const token = getStoredAuthToken();
        if (!token) {
            updateAuthUI(null);
            return false;
        }

        try {
            const result = await fetchCurrentUser();
            saveAuthSession(token, result.user);
            updateAuthUI(result.user);
            return true;
        } catch (error) {
            clearAuthSession();
            updateAuthUI(null);
            return false;
        }
    }

    function openHome() {
        setView('landing');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function openAuth(mode = 'login') {
        setAuthMode(mode);
        setView('auth');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function openProtectedApp() {
        const hasSession = !!(getStoredAuthToken() && getStoredAuthUser());
        if (hasSession) {
            updateAuthUI(getStoredAuthUser());
            setView('app');
            window.dispatchEvent(new Event('resize'));
            return;
        }
        openAuth('login');
    }

    async function handleLogout() {
        try {
            if (getStoredAuthToken()) {
                await logoutUser();
            }
        } catch (error) {
            // Clear the local session even if the backend session has already expired.
        }

        clearAuthSession();
        updateAuthUI(null);
        openHome();
        if (typeof showToast === 'function') {
            showToast('Logged out successfully', 'success');
        }
    }

    function initAuthForms() {
        document.querySelectorAll('.auth-tab').forEach((tab) => {
            tab.addEventListener('click', () => setAuthMode(tab.dataset.authMode));
        });

        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', async (event) => {
                event.preventDefault();
                const submitBtn = loginForm.querySelector('button[type="submit"]');
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<div class="loading-spinner" style="width:16px;height:16px;"></div> Logging in...';

                try {
                    const result = await loginUser({
                        email: document.getElementById('loginEmail').value.trim(),
                        password: document.getElementById('loginPassword').value
                    });
                    loginForm.reset();
                    await handleAuthSuccess(result, 'Welcome back');
                } catch (error) {
                    if (typeof showToast === 'function') {
                        showToast(error.message, 'error');
                    }
                } finally {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = 'Login <i class="fas fa-arrow-right"></i>';
                }
            });
        }

        const signupForm = document.getElementById('signupForm');
        if (signupForm) {
            signupForm.addEventListener('submit', async (event) => {
                event.preventDefault();
                const submitBtn = signupForm.querySelector('button[type="submit"]');
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<div class="loading-spinner" style="width:16px;height:16px;"></div> Creating account...';

                try {
                    const result = await signupUser({
                        name: document.getElementById('signupName').value.trim(),
                        email: document.getElementById('signupEmail').value.trim(),
                        password: document.getElementById('signupPassword').value
                    });
                    signupForm.reset();
                    await handleAuthSuccess(result, 'Account created successfully');
                } catch (error) {
                    if (typeof showToast === 'function') {
                        showToast(error.message, 'error');
                    }
                } finally {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = 'Create Account <i class="fas fa-user-plus"></i>';
                }
            });
        }
    }

    function initAuthNavigation() {
        const authNavBtn = document.getElementById('authNavBtn');
        const authBackHomeBtn = document.getElementById('authBackHomeBtn');
        const logoutBtn = document.getElementById('logoutBtn');
        const landingLogoutBtn = document.getElementById('landingLogoutBtn');

        if (authNavBtn) {
            authNavBtn.addEventListener('click', (event) => {
                event.preventDefault();
                const user = getStoredAuthUser();
                user ? openProtectedApp() : openAuth('login');
            });
        }

        if (authBackHomeBtn) {
            authBackHomeBtn.addEventListener('click', (event) => {
                event.preventDefault();
                openHome();
            });
        }

        const handleLogoutClick = async () => {
            await handleLogout();
        };

        if (logoutBtn) logoutBtn.addEventListener('click', handleLogoutClick);
        if (landingLogoutBtn) landingLogoutBtn.addEventListener('click', handleLogoutClick);
    }

    function initUnauthorizedHandler() {
        window.addEventListener('promptlab:unauthorized', () => {
            clearAuthSession();
            updateAuthUI(null);
            openAuth('login');
            if (typeof showToast === 'function') {
                showToast('Please log in to continue', 'error');
            }
        });
    }

    function init() {
        initAuthForms();
        initAuthNavigation();
        initUnauthorizedHandler();
        updateAuthUI();
    }

    return {
        init,
        openHome,
        openAuth,
        openProtectedApp,
        restoreSession,
        updateAuthUI
    };
})();
