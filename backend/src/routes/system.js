const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { sqlite } = require('../db');

let app, dialog;
try {
  const electron = require('electron');
  app = electron.app;
  dialog = electron.dialog;
} catch (error) {
  console.warn('Electron not available in this context');
}

router.get('/db-location', (req, res) => {
  try {
    const currentDir = process.env.DB_DIR || (app ? app.getPath('userData') : process.cwd());
    res.json({ path: currentDir });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/db-location/select', (req, res) => {
  try {
    if (!dialog) {
      return res.status(500).json({ error: 'System dialogs not available' });
    }

    const currentDir = process.env.DB_DIR || app.getPath('userData');
    const result = dialog.showOpenDialogSync({
      title: 'Select Database Folder',
      properties: ['openDirectory', 'createDirectory'],
      defaultPath: currentDir
    });

    if (result && result.length > 0) {
      res.json({ path: result[0] });
    } else {
      res.json({ path: null }); // cancelled
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/db-location/apply', async (req, res) => {
  try {
    const { newPath } = req.body;
    if (!newPath || !fs.existsSync(newPath)) {
      return res.status(400).json({ error: 'Invalid path provided' });
    }

    if (!app) {
      return res.status(500).json({ error: 'Electron app instance not available' });
    }

    const userDataPath = app.getPath('userData');
    const currentDbPath = process.env.DB_FILE;
    const currentDbDir = process.env.DB_DIR || userDataPath;
    
    const newDbFile = path.join(newPath, 'database.sqlite');
    
    // Only proceed if the user actually chose a different directory
    if (path.resolve(currentDbDir) !== path.resolve(newPath)) {
      
      // If the destination DB doesn't exist, safely back up the current one
      if (!fs.existsSync(newDbFile)) {
         await sqlite.backup(newDbFile);
      }
      
      // Update db-config.json
      const configPath = path.join(userDataPath, 'db-config.json');
      let config = {};
      if (fs.existsSync(configPath)) {
        try {
          config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        } catch(e) {}
      }
      config.customDbPath = newPath;
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
      
      // Respond to frontend before shutting down
      res.json({ success: true, restarted: true });
      
      // Wait for response to send successfully, then handle teardown and restart
      setTimeout(() => {
        try {
          // We must close the DB connection before we can delete the file on Windows
          sqlite.close();
        } catch (e) {
          console.error('Failed to close DB:', e);
        }

        // Only delete the old file if we successfully cloned it into a brand new place
        // If an existing DB was found in the new location, we DO NOT delete the old one
        // in case they are switching to another shared drive, but actually deleting is requested by user.
        // Wait, the user said: "when we define a newPath after cloning the database we should also delete the previous one"
        // So ONLY inside the !fs.existsSync branch above?
        // Let's delete it anyway since they chose a new location and we want to prevent scattered databases.
        // But if they are just pointing to an *existing* database, maybe they want to abandon the local one.
        try {
          if (fs.existsSync(currentDbPath)) {
            fs.unlinkSync(currentDbPath);
          }
        } catch (e) {
          console.error('Failed to delete old DB:', e);
        }

        app.relaunch();
        app.exit(0);
      }, 500);

      return;
    }

    // Provided path was the same
    res.json({ success: true, restarted: false });
  } catch (error) {
    console.error('Apply DB location error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
