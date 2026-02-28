const express = require('express');
const { db } = require('../db');
const { areas, profiles, profileTimeSlots, workerCapabilities, workers } = require('../db/schema');
const { eq } = require('drizzle-orm');

const router = express.Router();

// GET all areas
router.get('/', (req, res) => {
  try {
    const allAreas = db.select().from(areas).all();
    res.json(allAreas);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET area by id
router.get('/:id', (req, res) => {
  try {
    const result = db.select().from(areas).where(eq(areas.id, Number(req.params.id))).get();
    if (!result) return res.status(404).json({ error: 'Area not found' });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CREATE area
router.post('/', (req, res) => {
  try {
    const { name, color } = req.body;
    if (!name || !color) return res.status(400).json({ error: 'Missing name or color' });
    
    const result = db.insert(areas).values({ name, color }).returning().get();
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE area
router.put('/:id', (req, res) => {
  try {
    const { name, color } = req.body;
    const result = db.update(areas)
      .set({ name, color })
      .where(eq(areas.id, Number(req.params.id)))
      .returning()
      .get();
      
    if (!result) return res.status(404).json({ error: 'Area not found' });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE area (Soft Delete)
router.delete('/:id', (req, res) => {
  try {
    const areaId = Number(req.params.id);
    const result = db.transaction((tx) => {
      const areaProfiles = tx.select({ id: profiles.id }).from(profiles).where(eq(profiles.areaId, areaId)).all();
      
      for (const p of areaProfiles) {
        tx.delete(profileTimeSlots).where(eq(profileTimeSlots.profileId, p.id)).run();
        tx.delete(workerCapabilities).where(eq(workerCapabilities.profileId, p.id)).run();
        tx.update(workers).set({ fixedProfileId: null }).where(eq(workers.fixedProfileId, p.id)).run();
        tx.delete(profiles).where(eq(profiles.id, p.id)).run();
      }
      
      return tx.delete(areas).where(eq(areas.id, areaId)).returning().get();
    });
      
    if (!result) return res.status(404).json({ error: 'Area not found' });
    res.json({ success: true, deleted: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
