const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { settings } = require('../db/schema');
const { eq } = require('drizzle-orm');

// Get all settings
router.get('/', (req, res) => {
  try {
    const allSettings = db.select().from(settings).all();
    // Return as a nice object instead of an array of {id, value}
    const settingsMap = {};
    allSettings.forEach(s => {
      settingsMap[s.id] = s.value;
    });
    res.json(settingsMap);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update or set a setting
router.post('/', (req, res) => {
  try {
    const { id, value } = req.body;
    if (!id || value === undefined) {
      return res.status(400).json({ error: 'id and value are required' });
    }

    const existing = db.select().from(settings).where(eq(settings.id, id)).get();
    
    if (existing) {
      db.update(settings).set({ value: String(value) }).where(eq(settings.id, id)).run();
    } else {
      db.insert(settings).values({ id, value: String(value) }).run();
    }
    
    res.json({ id, value: String(value) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
