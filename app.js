/* ══════════════════════════════════════════════
   Lorex - AI Chat Application
   Supports: Simulated, OpenAI, Anthropic Claude,
   Google Gemini, Ollama, Custom OpenAI-compatible
   Fully accessible with ARIA, keyboard nav, focus mgmt
   ══════════════════════════════════════════════ */

// ─── Constants ─────────────────────────────────
const STORAGE = {
    HISTORY: 'lorex_history',
    THEME: 'lorex_theme',
    SETTINGS: 'lorex_provider_settings',
};

const PROVIDER_INFO = {
    simulated: { label: 'Local Simulated', color: '#6b7280' },
    webllm: { label: 'Web-LLM (Browser)', color: '#8b5cf6' },
    openai: { label: 'OpenAI', color: '#10a37f' },
    anthropic: { label: 'Anthropic', color: '#d97706' },
    google: { label: 'Google Gemini', color: '#4285f4' },
    ollama: { label: 'Ollama', color: '#f97316' },
    custom: { label: 'Custom API', color: '#8b5cf6' },
};

const DEFAULT_SETTINGS = {
    provider: 'simulated',
    apiKey: '',
    model: '',
    endpoint: '',
    temperature: 0.7,
    maxTokens: 2048,
    systemPrompt: 'You are a helpful, friendly AI assistant named Lorex.',
};

const PROVIDER_CONFIG = {
    simulated: {
        models: [], defaultModel: '', fields: [], endpointHint: '',
        getEndpoint: () => null,
    },
    webllm: (() => {
        const models = window.WebLLMProvider?.models?.map?.(m => m.id) || [];
        return {
            models,
            defaultModel: 'gemma-2-2b-it-q4f16_1-MLC',
            fields: ['model'],
            endpointHint: 'Runs GGUF models directly in your browser via WebGPU.',
            getEndpoint: () => null,
        };
    })(),
    openai: {
        models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'],
        defaultModel: 'gpt-4o-mini', fields: ['apiKey', 'model'], endpointHint: '',
        getEndpoint: () => 'https://api.openai.com/v1/chat/completions',
    },
    anthropic: {
        models: ['claude-sonnet-4-20250514', 'claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229'],
        defaultModel: 'claude-sonnet-4-20250514', fields: ['apiKey', 'model'], endpointHint: '',
        getEndpoint: () => 'https://api.anthropic.com/v1/messages',
    },
    google: {
        models: ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-pro', 'gemini-1.5-flash'],
        defaultModel: 'gemini-2.0-flash', fields: ['apiKey', 'model'], endpointHint: '',
        getEndpoint: (model) => `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    },
    ollama: {
        models: ['llama3.2', 'llama3.1', 'mistral', 'mixtral', 'codellama', 'gemma2'],
        defaultModel: 'llama3.2', fields: ['model', 'endpoint'],
        endpointHint: 'e.g. http://localhost:11434',
        getEndpoint: (_, ep) => `${ep.replace(/\/+$/, '')}/api/chat`,
    },
    custom: {
        models: [], defaultModel: '', fields: ['apiKey', 'model', 'endpoint'],
        endpointHint: 'OpenAI-compatible endpoint, e.g. https://api.myendpoint.com/v1/chat/completions',
        getEndpoint: (_, ep) => ep,
    },
};

// ─── State ──────────────────────────────────────
let chatHistory = [];
let isProcessing = false;
let isListening = false;
let recognition = null;
let providerSettings = { ...DEFAULT_SETTINGS };
let previousFocus = null; // For focus trap management

// ─── DOM References ─────────────────────────────
const chatBox = document.getElementById('chat-box');
const inputElement = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const themeToggle = document.getElementById('theme-toggle');
const themeIcon = document.getElementById('theme-icon');
const clearBtn = document.getElementById('clear-chat');
const settingsToggle = document.getElementById('settings-toggle');
const settingsModal = document.getElementById('settings-modal');
const modalClose = document.getElementById('modal-close');
const providerSelect = document.getElementById('provider-select');
const dynamicSettings = document.getElementById('dynamic-settings');
const tempRange = document.getElementById('param-temperature');
const tempValue = document.getElementById('temp-value');
const maxTokensInput = document.getElementById('param-max-tokens');
const systemPromptInput = document.getElementById('param-system-prompt');
const saveBtn = document.getElementById('settings-save');
const testBtn = document.getElementById('settings-test');
const providerLabel = document.getElementById('provider-label');
const micBtn = document.getElementById('mic-btn');
const micIcon = document.getElementById('mic-icon');
const confirmDialog = document.getElementById('confirm-dialog');
const confirmOk = document.getElementById('confirm-ok');
const confirmCancel = document.getElementById('confirm-cancel');
const confirmClose = document.getElementById('confirm-close');
const announcer = document.getElementById('sr-announcer');
const progressBar = document.getElementById('model-progress');
const progressFill = document.getElementById('progress-fill');
const progressLabel = document.getElementById('progress-label');
const progressDetail = document.getElementById('progress-detail');
const progressCancel = document.getElementById('progress-cancel');

// ═══════════════════════════════════════════════
// SCREEN READER ANNOUNCER
// ═══════════════════════════════════════════════

function announce(message) {
    if (announcer) {
        announcer.textContent = ''; // Clear first to re-trigger
        requestAnimationFrame(() => {
            announcer.textContent = message;
        });
    }
}

// ═══════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════

function getTimestamp() {
    const now = new Date();
    return String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
}

function getFullTimestamp() {
    return new Date().toISOString();
}

function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ═══════════════════════════════════════════════
// THEME
// ═══════════════════════════════════════════════

function getPreferredTheme() {
    const stored = localStorage.getItem(STORAGE.THEME);
    if (stored === 'dark' || stored === 'light') return stored;
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
    return 'light';
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
    localStorage.setItem(STORAGE.THEME, theme);
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    announce(`Theme changed to ${next} mode.`);
}

if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem(STORAGE.THEME)) {
            applyTheme(e.matches ? 'dark' : 'light');
        }
    });
}

// ═══════════════════════════════════════════════
// PROVIDER SETTINGS
// ═══════════════════════════════════════════════

function saveSettings() {
    try { localStorage.setItem(STORAGE.SETTINGS, JSON.stringify(providerSettings)); }
    catch (e) { console.warn('Failed to save settings:', e); }
}

function loadSettings() {
    try {
        const stored = localStorage.getItem(STORAGE.SETTINGS);
        if (stored) {
            const parsed = JSON.parse(stored);
            providerSettings = { ...DEFAULT_SETTINGS, ...parsed };
            return;
        }
    } catch (e) { console.warn('Failed to load settings:', e); }
    providerSettings = { ...DEFAULT_SETTINGS };
}

function updateProviderLabel() {
    const info = PROVIDER_INFO[providerSettings.provider] || PROVIDER_INFO.simulated;
    providerLabel.textContent = info.label;
}

// ═══════════════════════════════════════════════
// CHAT HISTORY
// ═══════════════════════════════════════════════

function saveHistory() {
    try { localStorage.setItem(STORAGE.HISTORY, JSON.stringify(chatHistory)); }
    catch (e) { console.warn('Failed to save history:', e); }
}

function loadHistory() {
    try {
        const stored = localStorage.getItem(STORAGE.HISTORY);
        if (stored) { const p = JSON.parse(stored); if (Array.isArray(p)) return p; }
    } catch (e) { console.warn('Failed to load history:', e); }
    return [];
}

function clearHistory() {
    chatHistory = [];
    localStorage.removeItem(STORAGE.HISTORY);
    renderChat();
}

// ═══════════════════════════════════════════════
// FOCUS MANAGEMENT & KEYBOARD TRAP
// ═══════════════════════════════════════════════

function trapFocus(container, e) {
    const focusable = container.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.key === 'Tab') {
        if (e.shiftKey) {
            if (document.activeElement === first) {
                e.preventDefault();
                last.focus();
            }
        } else {
            if (document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        }
    }
}

function openModal(modal) {
    previousFocus = document.activeElement;
    modal.classList.remove('hidden');
    // Focus first focusable element
    const firstFocusable = modal.querySelector('button, [href], input, select, textarea');
    if (firstFocusable) {
        requestAnimationFrame(() => firstFocusable.focus());
    }
    // Trap focus
    const handler = (e) => trapFocus(modal, e);
    modal._trapHandler = handler;
    document.addEventListener('keydown', handler);
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
}

function closeModal(modal) {
    modal.classList.add('hidden');
    // Remove trap
    if (modal._trapHandler) {
        document.removeEventListener('keydown', modal._trapHandler);
        delete modal._trapHandler;
    }
    // Restore focus
    if (previousFocus) {
        previousFocus.focus();
        previousFocus = null;
    }
    document.body.style.overflow = '';
}

// ═══════════════════════════════════════════════
// SETTINGS MODAL
// ═══════════════════════════════════════════════

function openSettings() {
    providerSelect.value = providerSettings.provider;
    tempRange.value = providerSettings.temperature;
    tempValue.textContent = providerSettings.temperature;
    maxTokensInput.value = providerSettings.maxTokens;
    systemPromptInput.value = providerSettings.systemPrompt;
    renderDynamicFields();
    openModal(settingsModal);
}

function closeSettings() {
    closeModal(settingsModal);
    document.querySelectorAll('.test-result').forEach(el => el.remove());
}

function renderDynamicFields() {
    const provider = providerSelect.value;
    const config = PROVIDER_CONFIG[provider];
    if (!config) return;

    let html = '';

    // Web-LLM special: show model cards with size/ram info
    if (provider === 'webllm') {
        if (window.WebLLMProvider && window.WebLLMProvider.models) {
            const modelOptions = window.WebLLMProvider.models.map(m => {
                const selected = providerSettings.model === m.id ? 'selected' : '';
                const webllmDefault = m.id === 'gemma-2-2b-it-q4f16_1-MLC' && !providerSettings.model ? 'selected' : '';
                return `<option value="${m.id}" ${selected || webllmDefault}>${m.label} (RAM: ${m.ram})</option>`;
            }).join('');
            html += `
                <div class="setting-group">
                    <label for="setting-model">GGUF Model</label>
                    <select id="setting-model">${modelOptions}</select>
                    <span class="field-hint">Models are downloaded from HuggingFace and cached locally. First load requires download.</span>
                </div>
            `;
            if (window.WebLLMProvider && !window.WebLLMProvider.isSupported) {
                html += `<div class="test-result error">⚠️ WebGPU not detected. Web-LLM requires a browser with WebGPU support (Chrome 113+, Edge 113+).</div>`;
            }
        } else {
            html += `<div class="test-result loading-test">⏳ Loading model list...</div>`;
        }
        dynamicSettings.innerHTML = html || '<p style="color:var(--text-muted);text-align:center;padding:10px 0;">Select a model above.</p>';
        return;
    }

    if (config.fields.includes('apiKey')) {
        const val = escapeHTML(providerSettings.apiKey);
        html += `
            <div class="setting-group">
                <label for="setting-apikey">API Key</label>
                <input type="password" id="setting-apikey" value="${val}" placeholder="sk-..." autocomplete="off" />
            </div>
        `;
    }

    if (config.fields.includes('model')) {
        if (config.models && config.models.length > 0) {
            const opts = config.models.map(m =>
                `<option value="${m}" ${providerSettings.model === m ? 'selected' : ''}>${m}</option>`
            ).join('');
            html += `
                <div class="setting-group">
                    <label for="setting-model">Model</label>
                    <select id="setting-model">${opts}</select>
                </div>
            `;
        } else {
            html += `
                <div class="setting-group">
                    <label for="setting-model">Model</label>
                    <input type="text" id="setting-model" value="${escapeHTML(providerSettings.model)}" placeholder="Enter model name..." />
                </div>
            `;
        }
    }

    if (config.fields.includes('endpoint')) {
        const hint = config.endpointHint ? `<span class="field-hint">${config.endpointHint}</span>` : '';
        html += `
            <div class="setting-group">
                <label for="setting-endpoint">API Endpoint</label>
                <input type="text" id="setting-endpoint" value="${escapeHTML(providerSettings.endpoint)}" placeholder="https://..." />
                ${hint}
            </div>
        `;
    }

    if (!html) {
        html = '<p style="color:var(--text-muted);font-size:0.9rem;text-align:center;padding:20px 0;">No configuration needed.</p>';
    }

    dynamicSettings.innerHTML = html;
}

function collectSettingsFromForm() {
    const provider = providerSelect.value;
    const config = PROVIDER_CONFIG[provider] || PROVIDER_CONFIG.simulated;

    const settings = {
        provider,
        apiKey: '',
        model: '',
        endpoint: '',
        temperature: parseFloat(tempRange.value) || 0.7,
        maxTokens: parseInt(maxTokensInput.value, 10) || 2048,
        systemPrompt: systemPromptInput.value.trim() || '',
    };

    if (config.fields.includes('apiKey')) {
        const el = document.getElementById('setting-apikey');
        if (el) settings.apiKey = el.value.trim();
    }
    if (config.fields.includes('model') || provider === 'webllm') {
        const el = document.getElementById('setting-model');
        if (el) settings.model = el.value.trim();
    }
    if (config.fields.includes('endpoint')) {
        const el = document.getElementById('setting-endpoint');
        if (el) settings.endpoint = el.value.trim();
    }
    if (!settings.model && config.defaultModel) settings.model = config.defaultModel;

    return settings;
}

function applySettings(settings) {
    providerSettings = { ...providerSettings, ...settings };
    saveSettings();
    updateProviderLabel();
    const info = PROVIDER_INFO[settings.provider] || PROVIDER_INFO.simulated;
    announce(`Provider changed to ${info.label}. Settings saved.`);
    closeSettings();
}

// ═══════════════════════════════════════════════
// CUSTOM CONFIRM DIALOG
// ═══════════════════════════════════════════════

function showConfirmDialog(title, message) {
    return new Promise((resolve) => {
        document.getElementById('confirm-title').textContent = title;
        document.getElementById('confirm-desc').textContent = message;
        openModal(confirmDialog);

        function cleanup() {
            confirmOk.removeEventListener('click', onOk);
            confirmCancel.removeEventListener('click', onCancel);
            confirmClose.removeEventListener('click', onCancel);
            document.removeEventListener('keydown', onKey);
        }

        function onOk() {
            cleanup();
            closeModal(confirmDialog);
            resolve(true);
        }

        function onCancel() {
            cleanup();
            closeModal(confirmDialog);
            resolve(false);
        }

        function onKey(e) {
            if (e.key === 'Escape') onCancel();
        }

        confirmOk.addEventListener('click', onOk);
        confirmCancel.addEventListener('click', onCancel);
        confirmClose.addEventListener('click', onCancel);
        document.addEventListener('keydown', onKey);
    });
}

// ═══════════════════════════════════════════════
// MESSAGE COPY
// ═══════════════════════════════════════════════

function showCopyToast() {
    const toast = document.createElement('div');
    toast.className = 'copy-toast';
    toast.textContent = '✓ Copied to clipboard';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2200);
}

async function copyMessage(text, btn) {
    try {
        await navigator.clipboard.writeText(text);
        showCopyToast();
        announce('Message copied to clipboard.');
        btn.textContent = '✓';
        setTimeout(() => { btn.textContent = '📋'; }, 1500);
    } catch {
        // Fallback
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        showCopyToast();
        announce('Message copied to clipboard.');
    }
}

function addCopyButtonToMessage(msgEl, text) {
    const actions = document.createElement('div');
    actions.className = 'message-actions';
    const btn = document.createElement('button');
    btn.className = 'msg-action-btn';
    btn.textContent = '📋';
    btn.setAttribute('aria-label', 'Copy message text');
    btn.setAttribute('title', 'Copy message');
    btn.addEventListener('click', () => copyMessage(text, btn));
    actions.appendChild(btn);
    msgEl.appendChild(actions);
}

// ═══════════════════════════════════════════════
// RENDERING
// ═══════════════════════════════════════════════

function renderChat() {
    chatBox.innerHTML = '';
    if (chatHistory.length === 0) {
        renderEmptyState();
        return;
    }
    for (const entry of chatHistory) {
        appendMessageToDOM(entry.role, entry.content, entry.timestamp, false);
    }
    scrollToBottom();
}

function renderEmptyState() {
    chatBox.innerHTML = `
        <div class="empty-state">
            <div class="empty-state-icon">💬</div>
            <h2>Welcome to Lorex</h2>
            <p>Send a message to start a conversation with your local AI assistant.</p>
        </div>
    `;
}

function appendMessageToDOM(sender, message, timestamp, animate = true) {
    const emptyState = chatBox.querySelector('.empty-state');
    if (emptyState) emptyState.remove();

    const msgEl = document.createElement('div');
    msgEl.classList.add('message', `${sender}-message`);
    if (!animate) msgEl.style.animation = 'none';

    // Use textContent for XSS safety, then add timestamp
    const textSpan = document.createElement('span');
    textSpan.textContent = message;
    const tsSpan = document.createElement('span');
    tsSpan.className = 'timestamp';
    tsSpan.textContent = timestamp || getTimestamp();

    msgEl.appendChild(textSpan);
    msgEl.appendChild(tsSpan);

    // Add copy button
    addCopyButtonToMessage(msgEl, message);

    chatBox.appendChild(msgEl);
    scrollToBottom();
}

function scrollToBottom() {
    requestAnimationFrame(() => {
        chatBox.scrollTop = chatBox.scrollHeight;
    });
}

// ─── Loading ────────────────────────────────────

function showLoading() {
    const el = document.createElement('div');
    el.classList.add('message', 'bot-message', 'loading');
    el.id = 'loading-indicator';
    el.setAttribute('aria-label', 'Lorex is thinking');
    el.innerHTML = `
        <div class="loading-dots" aria-hidden="true"><span></span><span></span><span></span></div>
        <span class="loading-label">Lorex is thinking...</span>
    `;
    chatBox.appendChild(el);
    scrollToBottom();
}

function removeLoading() {
    const el = document.getElementById('loading-indicator');
    if (el) el.remove();
}

// ─── Error Banner ───────────────────────────────

function showError(message) {
    document.querySelectorAll('.error-banner').forEach(el => el.remove());
    const banner = document.createElement('div');
    banner.className = 'error-banner';
    banner.setAttribute('role', 'alert');
    banner.innerHTML = `
        <span>⚠️ ${escapeHTML(message)}</span>
        <button onclick="this.parentElement.remove()" aria-label="Dismiss error">✕</button>
    `;
    chatBox.parentNode.insertBefore(banner, chatBox);
    announce(`Error: ${message}`);
    scrollToBottom();
}

function clearError() {
    document.querySelectorAll('.error-banner').forEach(el => el.remove());
}

// ═══════════════════════════════════════════════
// WEB-LLM (GGUF in-browser) HELPER FUNCTIONS
// ═══════════════════════════════════════════════

function showProgressBar(data) {
    if (!progressBar) return;
    progressBar.classList.remove('hidden');
    progressFill.style.width = `${data.percent || 0}%`;
    progressLabel.textContent = data.label || 'Loading...';
    progressDetail.textContent = data.detail || '';
    progressBar.setAttribute('aria-valuenow', data.percent || 0);
    progressLabel.setAttribute('aria-live', 'polite');
}

function hideProgressBar() {
    if (!progressBar) return;
    progressBar.classList.add('hidden');
}

async function callWebLLM(message, settings) {
    const provider = window.WebLLMProvider;
    if (!provider) {
        throw new Error('Web-LLM provider not loaded. Please refresh and try again.');
    }

    // Check if WebGPU is supported
    if (!provider.isSupported) {
        throw new Error('WebGPU is not supported in this browser. Please use Chrome 113+ or Edge 113+.');
    }

    const modelId = settings.model || 'gemma-2-2b-it-q4f16_1-MLC';
    const status = provider.getStatus();

    // If a different model is requested than what's loaded, load it
    if (status.modelId !== modelId || !status.isLoaded) {
        await provider.init(modelId, {
            onProgress: (progress) => {
                showProgressBar(progress);
                if (progress.status === 'ready') {
                    announce(`${progress.label}. You can now chat.`);
                    setTimeout(hideProgressBar, 1500);
                }
                if (progress.status === 'error') {
                    hideProgressBar();
                }
            },
            onError: (error) => {
                hideProgressBar();
                throw error;
            },
        });
    }

    // Chat with the model
    const response = await provider.chat(message, chatHistory, {
        temperature: settings.temperature,
        maxTokens: settings.maxTokens,
        systemPrompt: settings.systemPrompt,
    });

    return response;
}

// ═══════════════════════════════════════════════
// SPEECH TO TEXT (Web Speech API)
// ═══════════════════════════════════════════════

function initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        micBtn.style.display = 'none';
        return;
    }

    recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        inputElement.value = transcript;
        autoResizeTextarea();
        announce(`Voice input recognized: ${transcript}`);
        isListening = false;
        micBtn.classList.remove('listening');
        micBtn.setAttribute('aria-label', 'Start voice input');
        // Auto-send after voice input
        sendMessage();
    };

    recognition.onerror = (event) => {
        console.warn('Speech recognition error:', event.error);
        isListening = false;
        micBtn.classList.remove('listening');
        micBtn.setAttribute('aria-label', 'Start voice input');

        if (event.error === 'not-allowed') {
            showError('Microphone access denied. Please allow microphone permissions in your browser settings.');
        } else if (event.error === 'no-speech') {
            announce('No speech detected. Please try again.');
        } else {
            announce(`Speech recognition error: ${event.error}`);
        }
    };

    recognition.onend = () => {
        if (isListening) {
            // If still flagged as listening but ended (e.g., timeout), reset
            isListening = false;
            micBtn.classList.remove('listening');
            micBtn.setAttribute('aria-label', 'Start voice input');
        }
    };
}

function toggleMic() {
    if (!recognition) {
        showError('Speech recognition is not supported in this browser. Try Chrome or Edge.');
        return;
    }

    if (isListening) {
        recognition.stop();
        isListening = false;
        micBtn.classList.remove('listening');
        micBtn.setAttribute('aria-label', 'Start voice input');
        announce('Voice input stopped.');
        return;
    }

    // Check microphone permission
    navigator.mediaDevices?.getUserMedia({ audio: true })
        .then((stream) => {
            stream.getTracks().forEach(t => t.stop()); // Stop immediately, we just needed permission
            isListening = true;
            micBtn.classList.add('listening');
            micBtn.setAttribute('aria-label', 'Listening... Click to stop');
            announce('Listening... Speak your message.');
            recognition.start();
        })
        .catch((err) => {
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                showError('Microphone access denied. Please allow microphone permissions in your browser settings.');
            } else {
                showError('Could not access microphone: ' + err.message);
            }
        });
}

// ═══════════════════════════════════════════════
// LLM API CALLS
// ═══════════════════════════════════════════════

async function callOpenAI(message, settings) {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${settings.apiKey}`,
        },
        body: JSON.stringify({
            model: settings.model || 'gpt-4o-mini',
            messages: [
                ...(settings.systemPrompt ? [{ role: 'system', content: settings.systemPrompt }] : []),
                ...chatHistory.slice(-20).map(h => ({ role: h.role === 'user' ? 'user' : 'assistant', content: h.content })),
                { role: 'user', content: message },
            ],
            temperature: settings.temperature,
            max_tokens: settings.maxTokens,
        }),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || `OpenAI returned ${res.status}`);
    }
    const data = await res.json();
    return data.choices?.[0]?.message?.content || 'No response content.';
}

async function callAnthropic(message, settings) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': settings.apiKey,
            'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
            model: settings.model || 'claude-sonnet-4-20250514',
            max_tokens: settings.maxTokens,
            system: settings.systemPrompt || undefined,
            messages: [
                ...chatHistory.slice(-20).map(h => ({ role: h.role === 'user' ? 'user' : 'assistant', content: h.content })),
                { role: 'user', content: message },
            ],
            temperature: settings.temperature,
        }),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || `Anthropic returned ${res.status}`);
    }
    const data = await res.json();
    return data.content?.[0]?.text || 'No response content.';
}

async function callGoogle(message, settings) {
    const model = settings.model || 'gemini-2.0-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${settings.apiKey}`;
    const contents = [
        ...chatHistory.slice(-20).map(h => ({
            role: h.role === 'user' ? 'user' : 'model',
            parts: [{ text: h.content }],
        })),
        { role: 'user', parts: [{ text: message }] },
    ];
    const body = { contents, generationConfig: { temperature: settings.temperature, maxOutputTokens: settings.maxTokens } };
    if (settings.systemPrompt) body.systemInstruction = { parts: [{ text: settings.systemPrompt }] };

    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || `Gemini returned ${res.status}`);
    }
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response content.';
}

async function callOllama(message, settings) {
    const baseUrl = settings.endpoint || 'http://localhost:11434';
    const url = `${baseUrl.replace(/\/+$/, '')}/api/chat`;
    const messages = [
        ...(settings.systemPrompt ? [{ role: 'system', content: settings.systemPrompt }] : []),
        ...chatHistory.slice(-20).map(h => ({ role: h.role, content: h.content })),
        { role: 'user', content: message },
    ];
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: settings.model || 'llama3.2', messages, options: { temperature: settings.temperature, num_predict: settings.maxTokens }, stream: false }),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Ollama returned ${res.status}`);
    }
    const data = await res.json();
    return data.message?.content || 'No response content.';
}

async function callCustom(message, settings) {
    if (!settings.endpoint) throw new Error('Custom endpoint URL is required.');
    const res = await fetch(settings.endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(settings.apiKey ? { 'Authorization': `Bearer ${settings.apiKey}` } : {}),
        },
        body: JSON.stringify({
            model: settings.model || undefined,
            messages: [
                ...(settings.systemPrompt ? [{ role: 'system', content: settings.systemPrompt }] : []),
                ...chatHistory.slice(-20).map(h => ({ role: h.role === 'user' ? 'user' : 'assistant', content: h.content })),
                { role: 'user', content: message },
            ],
            temperature: settings.temperature,
            max_tokens: settings.maxTokens,
        }),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || `Custom API returned ${res.status}`);
    }
    const data = await res.json();
    return data.choices?.[0]?.message?.content
        || data.content?.[0]?.text
        || data.candidates?.[0]?.content?.parts?.[0]?.text
        || data.message?.content
        || data.response
        || 'No response content.';
}

// ═══════════════════════════════════════════════
// SIMULATED RESPONSES
// ═══════════════════════════════════════════════

async function getSimulatedResponse(message) {
    await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 700));
    const lower = message.toLowerCase();
    if (lower.includes('hello') || lower.includes('hi')) {
        return "Hello! I am Lorex, your AI assistant. How can I help you today?";
    } else if (lower.includes('how are you')) {
        return "I am a language model, so I don't have feelings, but I am functioning perfectly and ready to chat!";
    } else if (lower.includes('name')) {
        return "My name is Lorex.";
    } else if (lower.includes('weather') || lower.includes('forecast')) {
        const last = chatHistory.length > 0 ? chatHistory[chatHistory.length - 1].content.toLowerCase() : '';
        if (last.includes('london')) return "Simulated Weather Report for London: It is currently 55°F and cloudy.";
        return "Simulated Weather Report: The current forecast for your location is 75°F and partly cloudy.";
    } else if (lower.includes('bye') || lower.includes('exit')) return null;
    else if (lower.includes('help')) {
        return "I can respond to greetings, answer questions about my name, provide simulated weather reports, and have general conversations. Try connecting a real local LLM in Settings!";
    } else {
        const responses = [
            "That's an interesting point. Can you tell me more?",
            "I need a little more information to answer that.",
            "Let's explore that topic further!",
            "Could you rephrase your question?",
            "I'm here to help! What would you like to know?",
            "Interesting! Tell me more about that.",
        ];
        return responses[Math.floor(Math.random() * responses.length)];
    }
}

// ═══════════════════════════════════════════════
// MAIN AI DISPATCHER
// ═══════════════════════════════════════════════

async function getAIResponse(message) {
    if (providerSettings.provider === 'simulated') return getSimulatedResponse(message);

    const provider = providerSettings.provider;
    const settings = { ...providerSettings };

    if (!settings.apiKey && provider !== 'ollama' && provider !== 'simulated') {
        throw new Error(`API key is required for ${PROVIDER_INFO[provider]?.label || provider}. Configure it in Settings.`);
    }

    switch (provider) {
        case 'webllm': return callWebLLM(message, settings);
        case 'openai': return callOpenAI(message, settings);
        case 'anthropic': return callAnthropic(message, settings);
        case 'google': return callGoogle(message, settings);
        case 'ollama': return callOllama(message, settings);
        case 'custom': return callCustom(message, settings);
        default: return getSimulatedResponse(message);
    }
}

// ═══════════════════════════════════════════════
// TEST CONNECTION
// ═══════════════════════════════════════════════

async function testConnection() {
    const settings = collectSettingsFromForm();
    const container = document.getElementById('test-result-container');
    container.innerHTML = '<div class="test-result loading-test">⏳ Testing connection...</div>';
    testBtn.disabled = true;

    try {
        let response;
        const testMsg = 'Hello! Reply with just the word "OK" if you can read this.';

        if (settings.provider === 'simulated') {
            response = await getSimulatedResponse(testMsg);
        } else if (settings.provider === 'webllm') {
            response = await callWebLLM(testMsg, settings);
        } else {
            switch (settings.provider) {
                case 'openai': response = await callOpenAI(testMsg, settings); break;
                case 'anthropic': response = await callAnthropic(testMsg, settings); break;
                case 'google': response = await callGoogle(testMsg, settings); break;
                case 'ollama': response = await callOllama(testMsg, settings); break;
                case 'custom': response = await callCustom(testMsg, settings); break;
                default: throw new Error('Unknown provider');
            }
        }

        const truncated = response.substring(0, 120);
        container.innerHTML = `<div class="test-result success">✅ Connection successful! Response: "${escapeHTML(truncated)}${response.length > 120 ? '...' : ''}"</div>`;
        announce('Connection test successful.');
    } catch (error) {
        container.innerHTML = `<div class="test-result error">❌ Connection failed: ${escapeHTML(error.message)}</div>`;
        announce(`Connection test failed: ${error.message}`);
    } finally {
        testBtn.disabled = false;
    }
}

// ═══════════════════════════════════════════════
// SEND MESSAGE
// ═══════════════════════════════════════════════

async function sendMessage() {
    if (isProcessing) return;

    const userMessage = inputElement.value.trim();
    if (userMessage === '') return;

    clearError();
    isProcessing = true;
    inputElement.disabled = true;
    sendBtn.disabled = true;

    const timestamp = getTimestamp();

    appendMessageToDOM('user', userMessage, timestamp);
    chatHistory.push({ role: 'user', content: userMessage, timestamp: getFullTimestamp() });
    saveHistory();

    inputElement.value = '';
    autoResizeTextarea();

    // Handle exit (simulated only)
    const lower = userMessage.toLowerCase();
    if ((lower.includes('bye') || lower.includes('exit')) && providerSettings.provider === 'simulated') {
        const botTs = getTimestamp();
        appendMessageToDOM('bot', 'Goodbye! It was nice chatting with you.', botTs);
        chatHistory.push({ role: 'bot', content: 'Goodbye! It was nice chatting with you.', timestamp: getFullTimestamp() });
        saveHistory();
        announce('Goodbye from Lorex!');
        inputElement.disabled = true;
        sendBtn.disabled = true;
        isProcessing = false;
        return;
    }

    showLoading();
    announce('Waiting for AI response...');

    try {
        const aiResponse = await getAIResponse(userMessage);
        removeLoading();

        if (aiResponse !== null) {
            const botTs = getTimestamp();
            appendMessageToDOM('bot', aiResponse, botTs);
            chatHistory.push({ role: 'bot', content: aiResponse, timestamp: getFullTimestamp() });
            saveHistory();
            announce('New response received from Lorex.');
        }
    } catch (error) {
        removeLoading();
        showError(`Failed to get response: ${error.message}. Check Settings or try again.`);
        console.error('Error:', error);
    } finally {
        isProcessing = false;
        inputElement.disabled = false;
        sendBtn.disabled = false;
        inputElement.focus();
    }
}

// ─── Auto-resize Textarea ───────────────────────

function autoResizeTextarea() {
    inputElement.style.height = 'auto';
    inputElement.style.height = Math.min(inputElement.scrollHeight, 120) + 'px';
}

// ═══════════════════════════════════════════════
// EVENT LISTENERS
// ═══════════════════════════════════════════════

// Enter to send, Shift+Enter for newline
inputElement.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

inputElement.addEventListener('input', autoResizeTextarea);

// Theme toggle
themeToggle.addEventListener('click', toggleTheme);

// Clear chat with custom confirm
clearBtn.addEventListener('click', async () => {
    if (chatHistory.length === 0) return;
    const confirmed = await showConfirmDialog(
        '🗑️ Clear All Messages?',
        'This will permanently delete all messages in this conversation. This action cannot be undone.'
    );
    if (confirmed) {
        clearHistory();
        renderEmptyState();
        inputElement.disabled = false;
        sendBtn.disabled = false;
        inputElement.focus();
        announce('Chat history cleared.');
    }
});

// Settings modal
settingsToggle.addEventListener('click', openSettings);
modalClose.addEventListener('click', closeSettings);
settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) closeSettings();
});

providerSelect.addEventListener('change', () => {
    renderDynamicFields();
    // Focus first dynamic field
    const firstField = dynamicSettings.querySelector('input, select, textarea');
    if (firstField) firstField.focus();
});

tempRange.addEventListener('input', () => {
    tempValue.textContent = tempRange.value;
});

saveBtn.addEventListener('click', () => {
    const settings = collectSettingsFromForm();
    applySettings(settings);
});

testBtn.addEventListener('click', testConnection);

// Escape key closes modals globally
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (!settingsModal.classList.contains('hidden')) {
            closeSettings();
        }
    }
});

// Mic button
micBtn.addEventListener('click', toggleMic);

// Progress cancel button
progressCancel.addEventListener('click', () => {
    if (window.WebLLMProvider) {
        window.WebLLMProvider.cancel();
        hideProgressBar();
        announce('Model loading cancelled.');
    }
});

// ═══════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
    // Theme
    applyTheme(getPreferredTheme());

    // Load settings
    loadSettings();
    updateProviderLabel();

    // Init speech recognition
    initSpeechRecognition();

    // Load chat history
    chatHistory = loadHistory();

    if (chatHistory.length > 0) {
        renderChat();
    } else {
        renderEmptyState();
        const welcome = "Hello! I am Lorex, your AI assistant. How can I help you today?";
        const ts = getTimestamp();
        appendMessageToDOM('bot', welcome, ts);
        chatHistory.push({ role: 'bot', content: welcome, timestamp: getFullTimestamp() });
        saveHistory();
    }

    inputElement.focus();

    // If provider is webllm and model already saved, show status
    if (providerSettings.provider === 'webllm' && window.WebLLMProvider) {
        const status = window.WebLLMProvider.getStatus();
        if (status.isLoaded && status.modelId === providerSettings.model) {
            announce(`Web-LLM model ${status.modelLabel} is ready.`);
        } else if (status.isLoading) {
            showProgressBar({ status: 'loading', percent: 50, label: 'Resuming model load...', detail: 'Please wait...' });
        }
    }
});
