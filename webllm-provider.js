/**
 * Web-LLM Provider Module
 * Runs GGUF-based models directly in the browser via WebGPU using @mlc-ai/web-llm.
 * 
 * Models run in MLC format (pre-converted from GGUF). For raw GGUF files,
 * use the Ollama provider (see settings) — it runs any GGUF locally.
 * 
 * MLC-converted models can be served locally via a URL after conversion
 * using the MLC conversion pipeline (mlc-ai package).
 * 
 * Exposes: WebLLMProvider object with init(), chat(), unload(), getModelStatus()
 */

// ─── Web-LLM State ────────────────────────────
let mlcEngine = null;
let isModelLoaded = false;
let isLoading = false;
let cancelRequested = false;
let currentModelId = '';
let currentModelUrl = '';

// Progress callback (set by app.js)
let onProgress = null;

// Pre-built MLC models available from HuggingFace CDN
const WEB_LLM_MODELS = [
    {
        id: 'gemma-2-2b-it-q4f16_1-MLC',
        label: 'Gemma 2 2B (Q4, ~1.5GB)',
        size: '~1.5 GB',
        ram: '4 GB+',
        quality: 'Good',
        source: 'HuggingFace CDN',
    },
    {
        id: 'gemma-2-9b-it-q4f16_1-MLC',
        label: 'Gemma 2 9B (Q4, ~5.5GB)',
        size: '~5.5 GB',
        ram: '8 GB+',
        quality: 'Excellent',
        source: 'HuggingFace CDN',
    },
    {
        id: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
        label: 'Llama 3.2 1B (Q4, ~0.8GB)',
        size: '~0.8 GB',
        ram: '2 GB+',
        quality: 'Fair',
        source: 'HuggingFace CDN',
    },
    {
        id: 'Llama-3.2-3B-Instruct-q4f16_1-MLC',
        label: 'Llama 3.2 3B (Q4, ~2GB)',
        size: '~2 GB',
        ram: '4 GB+',
        quality: 'Good',
        source: 'HuggingFace CDN',
    },
    {
        id: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC',
        label: 'Qwen 2.5 1.5B (Q4, ~1GB)',
        size: '~1 GB',
        ram: '2 GB+',
        quality: 'Fair',
        source: 'HuggingFace CDN',
    },
    {
        id: 'Qwen2.5-3B-Instruct-q4f16_1-MLC',
        label: 'Qwen 2.5 3B (Q4, ~2GB)',
        size: '~2 GB',
        ram: '4 GB+',
        quality: 'Good',
        source: 'HuggingFace CDN',
    },
    {
        id: 'Phi-3-mini-4k-instruct-q4f16_1-MLC',
        label: 'Phi-3 Mini 3.8B (Q4, ~2.5GB)',
        size: '~2.5 GB',
        ram: '4 GB+',
        quality: 'Good',
        source: 'HuggingFace CDN',
    },
];

export { WEB_LLM_MODELS };

// ─── Progress Handler ──────────────────────────

function setupProgress(modelId) {
    if (typeof mlcEngine !== 'undefined' && mlcEngine?.setInitProgressCallback) {
        mlcEngine.setInitProgressCallback((progress) => {
            const pct = Math.round(progress * 100);
            if (onProgress) onProgress({
                status: 'downloading',
                percent: pct,
                label: `Loading ${getModelLabel(modelId)}...`,
                detail: pct < 100
                    ? `Downloading model files... ${pct}%`
                    : 'Loading model into GPU memory...',
                modelId,
            });
        });
    }
}

function getModelLabel(modelId) {
    const found = WEB_LLM_MODELS.find(m => m.id === modelId);
    return found ? found.label : modelId;
}

// ─── Public API ─────────────────────────────────

/**
 * Initialize the Web-LLM engine and load a model.
 * @param {string} modelId - Model identifier from WEB_LLM_MODELS or a custom URL
 * @param {object} callbacks - { onProgress, onDone, onError }
 * @param {string} modelUrl - Optional custom URL for local MLC models
 */
async function initWebLLM(modelId, callbacks = {}, modelUrl = '') {
    if (isLoading) {
        throw new Error('A model is already loading. Please wait or cancel.');
    }
    if (isModelLoaded && currentModelId === modelId && mlcEngine) {
        return; // Already loaded
    }

    onProgress = callbacks.onProgress || null;
    cancelRequested = false;
    isLoading = true;
    currentModelId = modelId;
    currentModelUrl = modelUrl;

    try {
        // Dynamic import from the CDN (via importmap)
        const webllm = await import('@mlc-ai/web-llm');

        // Create the engine
        mlcEngine = new webllm.MLCEngine();

        // Set progress callback
        setupProgress(modelId);

        if (onProgress) {
            onProgress({
                status: 'initializing',
                percent: 0,
                label: `Initializing Web-LLM...`,
                detail: 'Preparing runtime...',
                modelId,
            });
        }

        // If a custom model URL was provided, use it as the model lib URL
        if (modelUrl) {
            // Register custom model config
            const customModel = webllm.prebuiltAppConfig.model_list?.find(
                m => m.model_id === modelId
            );
            if (customModel) {
                customModel.model_lib = modelUrl;
            }
        }

        // Reload the model
        await mlcEngine.reload(modelId);

        isModelLoaded = true;

        if (onProgress) {
            onProgress({
                status: 'ready',
                percent: 100,
                label: `${getModelLabel(modelId)} ready`,
                detail: 'Model loaded. You can now chat.',
                modelId,
            });
        }

        if (callbacks.onDone) callbacks.onDone();

    } catch (error) {
        isModelLoaded = false;
        mlcEngine = null;
        currentModelId = '';
        currentModelUrl = '';
        if (onProgress) {
            onProgress({
                status: 'error',
                percent: 0,
                label: 'Failed to load model',
                detail: error.message,
                modelId,
            });
        }
        if (callbacks.onError) callbacks.onError(error);
        throw error;
    } finally {
        isLoading = false;
    }
}

/**
 * Send a chat message using the loaded model.
 * @param {string} message - User message
 * @param {Array} history - Previous chat history [{role, content}]
 * @param {object} options - { temperature, maxTokens, systemPrompt }
 * @returns {Promise<string>} Model response
 */
async function chatWebLLM(message, history, options = {}) {
    if (!mlcEngine || !isModelLoaded) {
        throw new Error('No model loaded. Please load a model first.');
    }

    const {
        temperature = 0.7,
        maxTokens = 2048,
        systemPrompt = 'You are a helpful, friendly AI assistant named Lorex.',
    } = options;

    // Build conversation messages
    const messages = [];

    // System prompt
    if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
    }

    // History (last 20)
    const recentHistory = history.slice(-20);
    for (const h of recentHistory) {
        messages.push({ role: h.role === 'user' ? 'user' : 'assistant', content: h.content });
    }

    // Current message
    messages.push({ role: 'user', content: message });

    // Generate response with streaming
    let fullResponse = '';
    const asyncChunkGenerator = await mlcEngine.chat.completions.create({
        messages,
        temperature,
        max_tokens: maxTokens,
        stream: true,
        stream_options: { include_usage: true },
    });

    for await (const chunk of asyncChunkGenerator) {
        const delta = chunk.choices?.[0]?.delta?.content;
        if (delta) {
            fullResponse += delta;
        }
    }

    return fullResponse || 'No response generated.';
}

/**
 * Check if the model is loaded and get status info.
 */
function getModelStatus() {
    return {
        isLoaded: isModelLoaded,
        isLoading,
        modelId: currentModelId,
        modelLabel: getModelLabel(currentModelId),
    };
}

/**
 * Unload the current model to free GPU memory.
 */
async function unloadWebLLM() {
    if (mlcEngine) {
        try {
            await mlcEngine.unload();
        } catch (e) {
            console.warn('Error unloading model:', e);
        }
        mlcEngine = null;
    }
    isModelLoaded = false;
    currentModelId = '';
}

/**
 * Cancel an ongoing model load.
 */
function cancelLoad() {
    cancelRequested = true;
    isLoading = false;
    if (mlcEngine) {
        try { mlcEngine.unload(); } catch (e) { /* ignore */ }
        mlcEngine = null;
    }
    isModelLoaded = false;
    currentModelId = '';
}

// Export for use by app.js
window.WebLLMProvider = {
    init: initWebLLM,
    chat: chatWebLLM,
    unload: unloadWebLLM,
    cancel: cancelLoad,
    getStatus: getModelStatus,
    models: WEB_LLM_MODELS,
    isSupported: typeof navigator !== 'undefined' && 'gpu' in navigator && !!navigator.gpu,
};