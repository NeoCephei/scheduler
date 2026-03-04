const express = require('express');
const { db } = require('../db');
const { workers, workerCapabilities, absences, assignments, traineeOperations } = require('../db/schema');
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
    const { name, category, fixedProfileId, substituteType, notes, capabilities = [], requiredHours = 0, shiftId, trainingStartTime, trainingEndTime, tutorName, tutorContact, practicumStartDate, practicumEndDate } = req.body;
    
    if (!name || !category) return res.status(400).json({ error: 'name and category are required' });
    if (!WORKER_CATEGORIES.includes(category)) return res.status(400).json({ error: 'Invalid category' });
    if (category === 'FIJO' && !fixedProfileId) return res.status(400).json({ error: 'fixedProfileId is required for FIJO workers' });
    if (category === 'SUPLENTE' && !substituteType) return res.status(400).json({ error: 'substituteType is required for SUPLENTE workers' });
    if (category === 'SUPLENTE' && substituteType && !SUBSTITUTE_TYPES.includes(substituteType)) return res.status(400).json({ error: 'Invalid substituteType for SUPLENTE' });
    
    const result = db.transaction((tx) => {
      const newWorker = tx.insert(workers).values({
        name,
        category,
        fixedProfileId: category === 'FIJO' ? fixedProfileId : null,
        substituteType: category === 'SUPLENTE' || category === 'ESTUDIANTE' ? substituteType : null,
        requiredHours: category === 'ESTUDIANTE' ? Number(requiredHours) : 0,
        shiftId: category === 'ESTUDIANTE' && shiftId ? Number(shiftId) : null,
        trainingStartTime: category === 'ESTUDIANTE' ? trainingStartTime : null,
        trainingEndTime: category === 'ESTUDIANTE' ? trainingEndTime : null,
        tutorName: category === 'ESTUDIANTE' ? tutorName : null,
        tutorContact: category === 'ESTUDIANTE' ? tutorContact : null,
        practicumStartDate: category === 'ESTUDIANTE' ? practicumStartDate : null,
        practicumEndDate: category === 'ESTUDIANTE' ? practicumEndDate : null,
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
    const { name, category, fixedProfileId, substituteType, isActive, notes, capabilities, requiredHours, shiftId, trainingStartTime, trainingEndTime, tutorName, tutorContact, practicumStartDate, practicumEndDate } = req.body;
    
    const result = db.transaction((tx) => {
      // Build safe update object removing undefined and explicit null checks for missing fields
      const updateData = {};
      if (name !== undefined) updateData.name = name;
      if (category !== undefined) {
        updateData.category = category;
        updateData.fixedProfileId = category === 'FIJO' ? fixedProfileId : null;
        updateData.substituteType = category === 'SUPLENTE' || category === 'ESTUDIANTE' ? substituteType : null;
        updateData.requiredHours = category === 'ESTUDIANTE' ? Number(requiredHours || 0) : 0;
        updateData.shiftId = category === 'ESTUDIANTE' && shiftId ? Number(shiftId) : null;
        updateData.trainingStartTime = category === 'ESTUDIANTE' ? trainingStartTime : null;
        updateData.trainingEndTime = category === 'ESTUDIANTE' ? trainingEndTime : null;
        updateData.tutorName = category === 'ESTUDIANTE' ? tutorName : null;
        updateData.tutorContact = category === 'ESTUDIANTE' ? tutorContact : null;
        updateData.practicumStartDate = category === 'ESTUDIANTE' ? practicumStartDate : null;
        updateData.practicumEndDate = category === 'ESTUDIANTE' ? practicumEndDate : null;
      }
      if (isActive !== undefined) updateData.isActive = isActive;
      if (notes !== undefined) updateData.notes = notes;

      // Always execute update if there are fields, otherwise skip to capabilities
      let updated;
      if (Object.keys(updateData).length > 0) {
        updated = tx.update(workers).set(updateData).where(eq(workers.id, workerId)).returning().get();
      } else {
        updated = tx.select().from(workers).where(eq(workers.id, workerId)).get();
      }
      
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

// DELETE worker (Soft delete for STAFF, Hard delete for ESTUDIANTE)
router.delete('/:id', (req, res) => {
  try {
    const workerId = Number(req.params.id);
    const worker = db.select().from(workers).where(eq(workers.id, workerId)).get();
    
    if (!worker) return res.status(404).json({ error: 'Worker not found' });
    
    if (worker.category === 'ESTUDIANTE') {
      db.transaction((tx) => {
        tx.delete(workerCapabilities).where(eq(workerCapabilities.workerId, workerId)).run();
        tx.delete(absences).where(eq(absences.workerId, workerId)).run();
        tx.delete(assignments).where(eq(assignments.workerId, workerId)).run();
        tx.delete(traineeOperations).where(eq(traineeOperations.workerId, workerId)).run();
        tx.delete(workers).where(eq(workers.id, workerId)).run();
      });
      res.json({ success: true, hardDeleted: true });
    } else {
      db.update(workers)
        .set({ isDeleted: true, isActive: false })
        .where(eq(workers.id, workerId))
        .run();
      res.json({ success: true, softDeleted: true });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
