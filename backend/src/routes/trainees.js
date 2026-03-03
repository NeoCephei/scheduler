const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { traineeOperations } = require('../db/schema');
const { eq } = require('drizzle-orm');

// GET all trainee operations
router.get('/', async (req, res) => {
  try {
    const ops = await db.select().from(traineeOperations)
      .where(eq(traineeOperations.isDeleted, false));
    res.json(ops);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST new trainee operation
router.post('/', async (req, res) => {
  const { workerId, targetProfileId, startDate, endDate, notes } = req.body;
  try {
    const result = await db.insert(traineeOperations).values({
      workerId,
      targetProfileId,
      startDate,
      endDate,
      notes,
      status: 'ACTIVE'
    }).returning();
    res.status(201).json(result[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT update trainee operation (Pause, Edit dates, Complete)
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  try {
    const result = await db.update(traineeOperations)
      .set(updates)
      .where(eq(traineeOperations.id, parseInt(id, 10)))
      .returning();
    if (result.length === 0) return res.status(404).json({ error: 'Trainee operation not found' });
    res.json(result[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE (soft delete) trainee operation
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.update(traineeOperations)
      .set({ isDeleted: true })
      .where(eq(traineeOperations.id, parseInt(id, 10)));
    res.status(204).end();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
