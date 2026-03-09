const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { assignments } = require('../db/schema');
const { eq, and } = require('drizzle-orm');

// Create or update an override assignment (Single date or Range)
router.post('/', (req, res) => {
  try {
    const { profileId, date, dateEnd, workerId } = req.body;
    
    if (!profileId || !date) {
      return res.status(400).json({ error: 'profileId and date are required' });
    }

    const processAssignment = (targetDate) => {
      // 1. Clear this worker from any OTHER profile on this date to maintain integrity
      if (workerId) {
        db.delete(assignments).where(
          and(
            eq(assignments.workerId, workerId),
            eq(assignments.date, targetDate),
            // Don't delete the one we are about to update if it exists
            // because processAssignment handles update/insert below
          )
        ).run();
      }

      // 2. Check if assignment exists for THIS profile and date
      const existing = db.select().from(assignments).where(
        and(eq(assignments.profileId, profileId), eq(assignments.date, targetDate))
      ).get();

      if (existing) {
        return db.update(assignments)
          .set({ workerId: workerId || null })
          .where(eq(assignments.id, existing.id))
          .returning().get();
      } else {
        return db.insert(assignments).values({
          profileId,
          date: targetDate,
          workerId: workerId || null,
          role: 'COVER'
        }).returning().get();
      }
    };

    let result;
    if (dateEnd && dateEnd !== date) {
      // Handle range
      const dates = [];
      let current = new Date(date);
      const end = new Date(dateEnd);
      
      while (current <= end) {
        dates.push(current.toISOString().split('T')[0]);
        current.setDate(current.getDate() + 1);
      }

      db.transaction((tx) => {
        result = dates.map(d => processAssignment(d));
      });
    } else {
      // Single date
      result = processAssignment(date);
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
