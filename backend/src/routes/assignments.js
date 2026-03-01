const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { assignments } = require('../db/schema');
const { eq, and } = require('drizzle-orm');

// Create or update an override assignment
router.post('/', (req, res) => {
  try {
    const { profileId, date, workerId } = req.body;
    
    if (!profileId || !date) {
      return res.status(400).json({ error: 'profileId and date are required' });
    }

    // Check if assignment exists for this profile and date
    const existing = db.select().from(assignments).where(
      and(eq(assignments.profileId, profileId), eq(assignments.date, date))
    ).get();

    let result;
    if (existing) {
      // Update
      result = db.update(assignments)
        .set({ workerId: workerId || null }) // null means forced UNCOVERED
        .where(eq(assignments.id, existing.id))
        .returning().get();
    } else {
      // Insert
      result = db.insert(assignments).values({
        profileId,
        date,
        workerId: workerId || null,
        role: 'COVER' // Default manual override role
      }).returning().get();
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Error saving assignment:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete an override (revert to computed value)
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const deleted = db.delete(assignments).where(eq(assignments.id, Number(id))).returning().get();
    
    if (!deleted) {
      return res.status(404).json({ error: 'Assignment not found' });
    }
    
    res.json({ success: true, message: 'Assignment reverted' });
  } catch (error) {
    console.error('Error deleting assignment:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
