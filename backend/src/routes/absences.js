const express = require('express');
const { db } = require('../db');
const { absences } = require('../db/schema');
const { eq } = require('drizzle-orm');
const { ABSENCE_TYPES } = require('../constants');

const router = express.Router();

// Helper: check for overlapping absences for a worker
function hasOverlap(workerId, dateStart, dateEnd, excludeId = null) {
  const existing = db.select().from(absences).where(eq(absences.workerId, workerId)).all();
  return existing.some(a => {
    if (excludeId && a.id === excludeId) return false;
    // Overlap: new start < existing end AND new end > existing start
    return dateStart <= a.dateEnd && dateEnd >= a.dateStart;
  });
}

// GET all absences
router.get('/', (req, res) => {
  try {
    const result = db.select().from(absences).all();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET absences groups for a specific worker
router.get('/worker/:workerId', (req, res) => {
  try {
    const now = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const allAbsences = db.select().from(absences)
      .where(eq(absences.workerId, Number(req.params.workerId)))
      .all();

    const result = {
      active: allAbsences.filter(a => a.dateStart <= now && a.dateEnd >= now),
      future: allAbsences.filter(a => a.dateStart > now),
      past: allAbsences.filter(a => a.dateEnd < now)
    };
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CREATE absence
router.post('/', (req, res) => {
  try {
    const { workerId, type, dateStart, dateEnd, note } = req.body;
    
    if (!workerId || !type || !dateStart || !dateEnd) {
      return res.status(400).json({ error: 'workerId, type, dateStart and dateEnd are required' });
    }
    if (!ABSENCE_TYPES.includes(type)) {
      return res.status(400).json({ error: `Invalid type. Must be one of: ${ABSENCE_TYPES.join(', ')}` });
    }
    if (dateStart > dateEnd) {
      return res.status(400).json({ error: 'dateStart cannot be after dateEnd' });
    }
    if (hasOverlap(Number(workerId), dateStart, dateEnd)) {
      return res.status(409).json({ error: 'This ausencia solapa con otra existente para este trabajador' });
    }
    
    const newAbsence = db.insert(absences).values({ workerId: Number(workerId), type, dateStart, dateEnd, note }).returning().get();
    res.status(201).json(newAbsence);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE absence
router.put('/:id', (req, res) => {
  try {
    const { type, dateStart, dateEnd, note } = req.body;
    const id = Number(req.params.id);

    // Fetch existing to get workerId
    const existingAbsence = db.select().from(absences).where(eq(absences.id, id)).get();
    if (!existingAbsence) {
      return res.status(404).json({ error: 'Absence not found' });
    }

    if (!type || !dateStart || !dateEnd) {
      return res.status(400).json({ error: 'type, dateStart and dateEnd are required' });
    }
    if (!ABSENCE_TYPES.includes(type)) {
      return res.status(400).json({ error: `Invalid type. Must be one of: ${ABSENCE_TYPES.join(', ')}` });
    }
    if (dateStart > dateEnd) {
      return res.status(400).json({ error: 'dateStart cannot be after dateEnd' });
    }
    if (hasOverlap(existingAbsence.workerId, dateStart, dateEnd, id)) {
      return res.status(409).json({ error: 'This ausencia solapa con otra existente para este trabajador' });
    }
    
    db.update(absences)
      .set({ type, dateStart, dateEnd, note })
      .where(eq(absences.id, id))
      .run();
      
    const updated = db.select().from(absences).where(eq(absences.id, id)).get();
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE absence (hard delete — operational data)
router.delete('/:id', (req, res) => {
  try {
    const result = db.delete(absences).where(eq(absences.id, Number(req.params.id))).returning().get();
    if (!result) return res.status(404).json({ error: 'Absence not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
