/* ══════════════════════════════════════════════
   Lorex - AI Provider Services Engine
   Handles WebLLM, OpenAI, Anthropic, Gemini, Ollama
   ══════════════════════════════════════════════ */

export const STORAGE = {
    HISTORY: 'lorex_history',
    THEME: 'lorex_theme',
    SETTINGS: 'lorex_provider_settings',
};

export const PROVIDER_INFO = {
    simulated: { label: 'Local Simulated', color: '#6b7280' },
    webllm: { label: 'Web-LLM (Browser)', color: '#8b5cf6' },
    openai: { label: 'OpenAI', color: '#10a37f' },
    anthropic: { label: 'Anthropic', color: '#d97706' },
    google: { label: 'Google Gemini', color: '#4285f4' },
    ollama: { label: 'Ollama', color: '#f97316' },
    custom: { label: 'Custom API', color: '#8b5cf6' },
};

export const DEFAULT_SETTINGS = {
    provider: 'simulated',
    apiKey: '',
    model: '',
    endpoint: '',
    temperature: 0.7,
    maxTokens: 2048,
    systemPrompt: 'You are a helpful, friendly AI assistant named Lorex.',
};

export const PROVIDER_CONFIG = {
    simulated: {
        models: [], defaultModel: '', fields: [], endpointHint: '',
        getEndpoint: () => null,
    },
    webllm: {
        models: ['gemma-2-2b-it-q4f16_1-MLC', 'Llama-3.2-1B-Instruct-q4f16_1-MLC', 'Phi-3.5-mini-instruct-q4f16_1-MLC'],
        defaultModel: 'gemma-2-2b-it-q4f16_1-MLC',
        fields: ['model'],
        endpointHint: 'Runs GGUF models directly in your browser via WebGPU.',
        getEndpoint: () => null,
    },
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
        models: ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'],
        defaultModel: 'gemini-2.0-flash', fields: ['apiKey', 'model'], endpointHint: '',
        getEndpoint: (model, key) => `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${key}`,
    },
    ollama: {
        models: ['llama3.2', 'llama3.1', 'mistral', 'gemma2', 'qwen2.5', 'codellama'],
        defaultModel: 'llama3.2', fields: ['endpoint', 'model'],
        endpointHint: 'Default: http://localhost:11434',
        getEndpoint: (s) => `${s.endpoint || 'http://localhost:11434'}/api/chat`,
    },
    custom: {
        models: [], defaultModel: '', fields: ['endpoint', 'apiKey', 'model'],
        endpointHint: 'Must be an OpenAI-compatible /v1/chat/completions endpoint',
        getEndpoint: (s) => s.endpoint,
    },
};
