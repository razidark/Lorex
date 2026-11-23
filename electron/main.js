const { app, BrowserWindow, Menu, dialog } = require('electron');
const path = require('path');

const isDev = !app.isPackaged;

let mainWindow = null;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 500,
        height: 780,
        minWidth: 380,
        minHeight: 520,
        title: 'Lorex',
        icon: path.join(__dirname, '..', 'assets', 'icon.png'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            webviewTag: false,
        },
        show: false,
    });

    // Load the web app
    mainWindow.loadFile(path.join(__dirname, '..', 'index.html'));

    // Show window when ready to avoid flash
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    // Open DevTools in dev mode
    if (isDev) {
        mainWindow.webContents.openDevTools({ mode: 'bottom' });
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// App menu
function buildMenu() {
    const template = [
        {
            label: 'File',
            submenu: [
                { role: 'quit', label: 'Exit Lorex' },
            ],
        },
        {
            label: 'Edit',
            submenu: [
                { role: 'undo' },
                { role: 'redo' },
                { type: 'separator' },
                { role: 'cut' },
                { role: 'copy' },
                { role: 'paste' },
                { role: 'selectAll' },
            ],
        },
        {
            label: 'View',
            submenu: [
                { role: 'reload' },
                { role: 'forceReload' },
                { role: 'toggleDevTools', visible: isDev },
                { type: 'separator' },
                { role: 'resetZoom' },
                { role: 'zoomIn' },
                { role: 'zoomOut' },
                { type: 'separator' },
                { role: 'togglefullscreen' },
            ],
        },
        {
            label: 'Help',
            submenu: [
                {
                    label: 'About Lorex',
                    click: () => {
                        dialog.showMessageBox(mainWindow, {
                            type: 'info',
                            title: 'About Lorex',
                            message: 'Lorex AI Chat',
                            detail: `Version ${app.getVersion()}\n\nRun LLMs locally and offline on your PC.\n\nSupports Web-LLM (in-browser via WebGPU) and Ollama (any GGUF model).`,
                        });
                    },
                },
            ],
        },
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

app.whenReady().then(() => {
    buildMenu();
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
