/**
 * Lorex - Local development server
 * 
 * Serves static files with proper CORS and MIME types for ES modules.
 * 
 * Usage: node server.js
 * Then open: http://localhost:3000
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 5178;

// MIME types for proper ES module support
const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.wasm': 'application/wasm',
};

// The root this server is allowed to serve. Resolving against the process
// CWD meant that launching the server from the wrong folder (e.g.
// `node Lorex/server.js` from G:/RZL APPS) served the ENTIRE workspace --
// including other apps' .env files. It must always be Lorex's own folder.
const ROOT_DIR = __dirname;
const server = http.createServer((req, res) => {
    // Handle root path
    let filePath = req.url === '/' ? './index.html' : '.' + req.url;

    // Security: prevent directory traversal
    filePath = path.normalize(filePath).replace(/^(\.\.(\/|\\|$))+/, '');

    // Resolve against ROOT_DIR (never the CWD) and refuse anything that
    // escapes it.
    const resolved = path.resolve(ROOT_DIR, filePath);
    const rootWithSep = ROOT_DIR.endsWith(path.sep) ? ROOT_DIR : ROOT_DIR + path.sep;
    if (resolved !== ROOT_DIR && !resolved.startsWith(rootWithSep)) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('403 Forbidden');
        return;
    }
    filePath = resolved;

    const ext = path.extname(filePath);
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    // Cross-Origin Isolation headers required for WebGPU / SharedArrayBuffer.
    // This server is local-only and serves its own assets, so it does not need CORS.
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');

    // Handle preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    fs.readFile(filePath, (err, data) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('404 Not Found');
            } else {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('500 Internal Server Error');
            }
            return;
        }

        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    });
});

server.listen(PORT, '127.0.0.1', () => {
    console.log('╔═══════════════════════════════════════╗');
    console.log('║        Lorex - Local Server           ║');
    console.log('╠═══════════════════════════════════════╣');
    console.log(`║  🚀  http://localhost:${PORT}           ║`);
    console.log(`║  🌐  http://127.0.0.1:${PORT}           ║`);
    console.log('║                                       ║');
    console.log('║  Press Ctrl+C to stop                  ║');
    console.log('╚═══════════════════════════════════════╝');
});