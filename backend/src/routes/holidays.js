const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { holidays } = require('../db/schema');
const { eq } = require('drizzle-orm');

// Get all holidays
router.get('/', (req, res) => {
  try {
    const allHolidays = db.select().from(holidays).all();
    res.json(allHolidays);
  } catch (error) {
    console.error('Error fetching holidays:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create a holiday
router.post('/', (req, res) => {
  try {
    const { date, name } = req.body;
    if (!date || !name) {
      return res.status(400).json({ error: 'Date and name are required' });
    }

    const newHoliday = db.insert(holidays).values({ date, name }).returning().get();
    res.status(201).json(newHoliday);
  } catch (error) {
    console.error('Error creating holiday:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update a holiday
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { date, name } = req.body;
    
    if (!date || !name) {
      return res.status(400).json({ error: 'Date and name are required' });
    }

    const updatedHoliday = db.update(holidays)
      .set({ date, name })
      .where(eq(holidays.id, Number(id)))
      .returning().get();
      
    if (!updatedHoliday) {
      return res.status(404).json({ error: 'Holiday not found' });
    }
    
    res.json(updatedHoliday);
  } catch (error) {
    console.error('Error updating holiday:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete a holiday
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const deletedHoliday = db.delete(holidays).where(eq(holidays.id, Number(id))).returning().get();
    
    if (!deletedHoliday) {
      return res.status(404).json({ error: 'Holiday not found' });
    }
    
    res.json({ success: true, message: 'Holiday deleted successfully' });
  } catch (error) {
    console.error('Error deleting holiday:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
