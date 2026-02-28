const express = require('express');
const { db } = require('../db');
const { profiles, profileTimeSlots, workerCapabilities, workers } = require('../db/schema');
const { eq } = require('drizzle-orm');

const router = express.Router();

// GET all profiles with their timeslots
router.get('/', (req, res) => {
  try {
    const allProfiles = db.select().from(profiles).all();
    const allSlots = db.select().from(profileTimeSlots).all();
    
    // Group slots by profileId
    const profilesWithSlots = allProfiles.map(profile => ({
      ...profile,
      timeSlots: allSlots.filter(s => s.profileId === profile.id)
    }));
    
    res.json(profilesWithSlots);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CREATE profile with timeslots
router.post('/', (req, res) => {
  try {
    const { name, areaId, isActive, shiftId, minBackupWorkers, timeSlots } = req.body;
    if (!name || !areaId) return res.status(400).json({ error: 'Missing name or areaId' });
    
    const result = db.transaction((tx) => {
      const newProfile = tx.insert(profiles).values({
        name,
        areaId,
        isActive: isActive !== undefined ? isActive : true,
        shiftId,
        minBackupWorkers: minBackupWorkers || 0
      }).returning().get();
      
      if (timeSlots && timeSlots.length > 0) {
        const slotsToInsert = timeSlots.map(slot => ({
          profileId: newProfile.id,
          dayOfWeek: slot.dayOfWeek,
          startTime: slot.startTime,
          endTime: slot.endTime
        }));
        tx.insert(profileTimeSlots).values(slotsToInsert).run();
        newProfile.timeSlots = slotsToInsert;
      } else {
        newProfile.timeSlots = [];
      }
      
      return newProfile;
    });
    
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE profile and recreate timeslots
router.put('/:id', (req, res) => {
  try {
    const profileId = Number(req.params.id);
    const { name, areaId, isActive, shiftId, minBackupWorkers, timeSlots } = req.body;
    
    const result = db.transaction((tx) => {
      const updatedProfile = tx.update(profiles).set({
        name,
        areaId,
        isActive,
        shiftId,
        minBackupWorkers
      }).where(eq(profiles.id, profileId)).returning().get();
      
      if (!updatedProfile) {
        tx.rollback();
        return null;
      }
      
      // Recreate timeslots
      tx.delete(profileTimeSlots).where(eq(profileTimeSlots.profileId, profileId)).run();
      
      if (timeSlots && timeSlots.length > 0) {
        const slotsToInsert = timeSlots.map(slot => ({
          profileId,
          dayOfWeek: slot.dayOfWeek,
          startTime: slot.startTime,
          endTime: slot.endTime
        }));
        tx.insert(profileTimeSlots).values(slotsToInsert).run();
        updatedProfile.timeSlots = slotsToInsert;
      } else {
        updatedProfile.timeSlots = [];
      }
      
      return updatedProfile;
    });
    
    if (!result) return res.status(404).json({ error: 'Profile not found' });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE profile (Soft Delete)
router.delete('/:id', (req, res) => {
  try {
    const profileId = Number(req.params.id);
    const result = db.transaction((tx) => {
      tx.delete(profileTimeSlots).where(eq(profileTimeSlots.profileId, profileId)).run();
      tx.delete(workerCapabilities).where(eq(workerCapabilities.profileId, profileId)).run();
      tx.update(workers).set({ fixedProfileId: null }).where(eq(workers.fixedProfileId, profileId)).run();
      return tx.delete(profiles).where(eq(profiles.id, profileId)).returning().get();
    });
      
    if (!result) return res.status(404).json({ error: 'Profile not found' });
    res.json({ success: true, deleted: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
