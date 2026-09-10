const { app, BrowserWindow, shell, ipcMain } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'UNAI PM CRM — Paperless Project & Task Management',
    icon: path.join(__dirname, '../assets/unai-logo.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
    autoHideMenuBar: true,
    backgroundColor: '#0f172a',
    show: false,
  });

  const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production';
  const startUrl = process.env.ELECTRON_START_URL || 'http://localhost:5173';

  if (isDev) {
    const loadURLWithRetry = (url, attempts = 10) => {
      mainWindow.loadURL(url).catch((err) => {
        console.log(`[Electron] Connecting to ${url}... (${attempts} retries left)`);
        if (attempts > 0) {
          setTimeout(() => loadURLWithRetry(url, attempts - 1), 800);
        }
      });
    };

    loadURLWithRetry(startUrl);

    mainWindow.webContents.on('did-fail-load', (e, code, desc, url) => {
      console.log(`[Electron] Page failed to load (${desc}), retrying in 1s...`);
      setTimeout(() => mainWindow.loadURL(url), 1000);
    });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Open external links in user's browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Custom Protocol registration for UNAI PM CRM (unaipmcrm://)
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('unaipmcrm', process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient('unaipmcrm');
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

