const express = require('express');
const { db } = require('../db');
const { workers, workerCapabilities, absences } = require('../db/schema');
const { eq } = require('drizzle-orm');
const { WORKER_CATEGORIES, SUBSTITUTE_TYPES } = require('../constants');

const router = express.Router();

// GET all workers (non-deleted)
router.get('/', (req, res) => {
  try {
    const allWorkers = db.select().from(workers).where(eq(workers.isDeleted, false)).all();
    
    // Attach capabilities to each worker
    const allCaps = db.select().from(workerCapabilities).all();
    const result = allWorkers.map(w => ({
      ...w,
      capabilities: allCaps.filter(c => c.workerId === w.id).map(c => c.profileId)
    }));
    
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single worker with details
router.get('/:id', (req, res) => {
  try {
    const worker = db.select().from(workers).where(eq(workers.id, Number(req.params.id))).get();
    if (!worker || worker.isDeleted) return res.status(404).json({ error: 'Worker not found' });
    
    const caps = db.select().from(workerCapabilities).where(eq(workerCapabilities.workerId, worker.id)).all();
    const workerAbsences = db.select().from(absences).where(eq(absences.workerId, worker.id)).all();
    
    res.json({
      ...worker,
      capabilities: caps.map(c => c.profileId),
      absences: workerAbsences
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CREATE worker with capabilities
router.post('/', (req, res) => {
  try {
    const { name, category, fixedProfileId, substituteType, notes, capabilities = [] } = req.body;
    
    if (!name || !category) return res.status(400).json({ error: 'name and category are required' });
    if (!WORKER_CATEGORIES.includes(category)) return res.status(400).json({ error: 'Invalid category' });
    if (category === 'FIJO' && !fixedProfileId) return res.status(400).json({ error: 'fixedProfileId is required for FIJO workers' });
    if (category === 'SUPLENTE' && !substituteType) return res.status(400).json({ error: 'substituteType is required for SUPLENTE workers' });
    if (substituteType && !SUBSTITUTE_TYPES.includes(substituteType)) return res.status(400).json({ error: 'Invalid substituteType' });
    
    const result = db.transaction((tx) => {
      const newWorker = tx.insert(workers).values({
        name,
        category,
        fixedProfileId: category === 'FIJO' ? fixedProfileId : null,
        substituteType: category === 'SUPLENTE' ? substituteType : null,
        notes
      }).returning().get();
      
      if (capabilities.length > 0) {
        tx.insert(workerCapabilities).values(
          capabilities.map(profileId => ({ workerId: newWorker.id, profileId }))
        ).run();
      }
      
      return { ...newWorker, capabilities };
    });
    
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE worker (including capabilities replace)
router.put('/:id', (req, res) => {
  try {
    const workerId = Number(req.params.id);
    const { name, category, fixedProfileId, substituteType, isActive, notes, capabilities } = req.body;
    
    const result = db.transaction((tx) => {
      const updated = tx.update(workers).set({
        name,
        category,
        fixedProfileId: category === 'FIJO' ? fixedProfileId : null,
        substituteType: category === 'SUPLENTE' ? substituteType : null,
        isActive,
        notes
      }).where(eq(workers.id, workerId)).returning().get();
      
      if (!updated) return null;
      
      if (capabilities !== undefined) {
        tx.delete(workerCapabilities).where(eq(workerCapabilities.workerId, workerId)).run();
        if (capabilities.length > 0) {
          tx.insert(workerCapabilities).values(
            capabilities.map(profileId => ({ workerId, profileId }))
          ).run();
        }
      }
      
      const newCaps = tx.select().from(workerCapabilities).where(eq(workerCapabilities.workerId, workerId)).all();
      return { ...updated, capabilities: newCaps.map(c => c.profileId) };
    });
    
    if (!result) return res.status(404).json({ error: 'Worker not found' });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// TOGGLE isActive
router.patch('/:id/toggle-active', (req, res) => {
  try {
    const workerId = Number(req.params.id);
    const worker = db.select().from(workers).where(eq(workers.id, workerId)).get();
    if (!worker) return res.status(404).json({ error: 'Worker not found' });
    
    const updated = db.update(workers).set({ isActive: !worker.isActive }).where(eq(workers.id, workerId)).returning().get();
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SOFT DELETE worker
router.delete('/:id', (req, res) => {
  try {
    const result = db.update(workers)
      .set({ isDeleted: true, isActive: false })
      .where(eq(workers.id, Number(req.params.id)))
      .returning().get();
    if (!result) return res.status(404).json({ error: 'Worker not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
