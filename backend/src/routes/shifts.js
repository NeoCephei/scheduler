const express = require('express');
const { db } = require('../db');
const { shifts } = require('../db/schema');
const { eq } = require('drizzle-orm');

const router = express.Router();

// GET all shifts
router.get('/', (req, res) => {
  try {
    const allShifts = db.select().from(shifts).all();
    res.json(allShifts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CREATE shift
router.post('/', (req, res) => {
  try {
    const { name, startTime, endTime } = req.body;
    if (!name || !startTime || !endTime) return res.status(400).json({ error: 'Missing required fields' });
    
    const result = db.insert(shifts).values({ name, startTime, endTime }).returning().get();
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE shift
router.put('/:id', (req, res) => {
  try {
    const { name, startTime, endTime } = req.body;
    const result = db.update(shifts)
      .set({ name, startTime, endTime })
      .where(eq(shifts.id, Number(req.params.id)))
      .returning()
      .get();
      
    if (!result) return res.status(404).json({ error: 'Shift not found' });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE shift (Soft Delete)
router.delete('/:id', (req, res) => {
  try {
    const result = db.delete(shifts)
      .where(eq(shifts.id, Number(req.params.id)))
      .returning()
      .get();
      
    if (!result) return res.status(404).json({ error: 'Shift not found' });
    res.json({ success: true, deleted: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
