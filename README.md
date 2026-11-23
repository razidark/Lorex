# Lorex AI Chat

> Run large language models **locally and offline** on your own Windows PC.
> A desktop chat client that talks to whatever backend you have — Ollama, LM Studio,
> OpenAI, Anthropic, Gemini, or any OpenAI-compatible server.

Nothing leaves your machine unless you point it at a hosted provider.

---

## Features

- **Multiple providers** — simulated, OpenAI, Anthropic Claude, Google Gemini,
  Ollama, and custom OpenAI-compatible endpoints
- **Fully offline** — run against a local model with no network access at all
- **Accessible** — ARIA labels, full keyboard navigation and focus management
- **Conversation history** — persisted locally in `localStorage`
- **Themes** — light and dark

## Tech stack

| | |
|---|---|
| Shell | Electron |
| Renderer | Vanilla JavaScript (`app.js`), CSS (`styles.css`) |
| Local inference | WebLLM (`webllm-provider.js`) |
| Server | Node (`server.js`) — serves the static files |

## Requirements

- Node.js 20+
- npm
- *Optional:* [Ollama](https://ollama.com) or another local inference server

## Getting started

```bash
npm install
npm run server     # serve the app on http://localhost:5178
```

Then open <http://localhost:5178>.

### Desktop

```bash
npm start          # run in Electron
npm run dev        # same, in development mode
npm run build:exe  # package a portable Windows .exe
```

## Security note

The static file server is pinned to this app's own folder and refuses to serve
anything outside it. Launching it from a different working directory no longer
exposes sibling directories on your disk.

## Configuration

Pick a provider in the app's settings:

| Provider | Setup |
|---|---|
| Ollama | install and run `ollama serve`, then pick a model |
| Custom / OpenAI-compatible | point at any local or hosted server URL |
| OpenAI / Anthropic / Gemini | paste your API key in Settings — it is stored only in `localStorage` on your machine |

## Credits

Built by **RZL Apps**.
