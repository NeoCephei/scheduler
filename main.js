const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

function setupDatabase() {
  const userDataPath = app.getPath('userData');
  const configPath = path.join(userDataPath, 'db-config.json');
  let dbDir = userDataPath;

  try {
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (config.customDbPath && fs.existsSync(config.customDbPath)) {
        dbDir = config.customDbPath;
      }
    }
  } catch (err) {
    console.error('Failed to read db config:', err);
  }

  process.env.DB_DIR = dbDir;
  return path.join(dbDir, 'database.sqlite');
}

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 768,
    icon: path.join(__dirname, 'icon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    title: "Scheduler"
  });

  mainWindow.setMenuBarVisibility(false);
  
  // Open directly pointing to our internally spawned backend server
  mainWindow.loadURL('http://localhost:3001');

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // 1. Setup Persistent User DB
  const dbPath = setupDatabase();
  process.env.DB_FILE = dbPath; 
  process.env.NODE_ENV = 'production';

  // 2. Start Backend Express Server
  const serverApp = require('./backend/server'); // Returns the Express App
  const express = require('express');
  
  // Bind Frontend Dist statically to the backend
  const frontendDistPath = path.join(__dirname, 'frontend', 'dist');
  serverApp.use(express.static(frontendDistPath));
  
  // React Router fallback for SPA navigation
  serverApp.use((req, res) => {
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });

  // Start internal listener
  const PORT = 3001;
  serverApp.listen(PORT, '127.0.0.1', () => {
    // 3. Open UI Window
    createWindow();
  });

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
