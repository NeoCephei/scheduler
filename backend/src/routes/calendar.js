const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { profiles, profileTimeSlots, workers, workerCapabilities, absences, holidays, assignments, publishedMonths, traineeOperations } = require('../db/schema');
const { gte, lte, and, eq, inArray, isNull } = require('drizzle-orm');

// Helper to check if a date string 'YYYY-MM-DD' is between two date strings
const isDateBetween = (date, start, end) => {
  return date >= start && date <= end;
};

// Main Generator Algorithm for Calendar
router.get('/', async (req, res) => {
  try {
    const { start, end } = req.query; // YYYY-MM-DD
    if (!start || !end) {
      return res.status(400).json({ error: 'start and end dates are required' });
    }

    // Parse start and end to Date objects for iteration
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    // 1. Fetch theoretical base
    const allProfiles = db.select().from(profiles).all();
    const allTimeSlots = db.select().from(profileTimeSlots).all();
    const allHolidays = db.select().from(holidays).where(
      and(gte(holidays.date, start), lte(holidays.date, end))
    ).all();
    const holidayDates = new Set(allHolidays.map(h => h.date));
    
    // 2. Fetch people
    const allWorkers = db.select().from(workers).all();
    // 3. Fetch absences
    const activeAbsences = db.select().from(absences).where(
      and(lte(absences.dateStart, end), gte(absences.dateEnd, start))
    ).all();
    
    // 4. Fetch assignments (overrides and snapshots)
    const existingAssignments = db.select().from(assignments).where(
      and(gte(assignments.date, start), lte(assignments.date, end))
    ).all();
    
    // 5. Build lookup maps
    const assignmentsMap = {}; // "profileId-date" -> assignment
    existingAssignments.forEach(a => {
      assignmentsMap[`${a.profileId}-${a.date}`] = a;
    });

    // 4.1. Fetch Trainees and their absences
    const activeTrainees = db.select().from(traineeOperations).where(
      and(
        eq(traineeOperations.status, 'ACTIVE'),
        eq(traineeOperations.isDeleted, false),
        lte(traineeOperations.startDate, end),
        gte(traineeOperations.endDate, start)
      )
    ).all();

    // Removed traineeAbsences fetch as all trainees are now workers and their absences are in the standard activeAbsences block

    const fixedWorkersMap = {}; // profileId -> worker
    allWorkers.forEach(w => {
      if (w.fixedProfileId && w.isActive && !w.isDeleted) {
        fixedWorkersMap[w.fixedProfileId] = w;
      }
    });

    const result = [];
    
    // Iterate day by day
    let currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const jsDayOfWeek = currentDate.getDay(); // 0 Sunday, 1 Monday, ... 6 Saturday
      let dbDayOfWeek = jsDayOfWeek === 0 ? 7 : jsDayOfWeek; // Make it 1 (Mon) to 7 (Sun)
      
      const isHoliday = holidayDates.has(dateStr);
      if (isHoliday) {
        dbDayOfWeek = 8; // Special holiday timeslots map to 8
      }

      // Track trainees already placed today to respect the 1 per slot rule
      const traineesPlacedToday = {}; // profileId -> true/false

      for (const profile of allProfiles) {
        if (!profile.isActive) continue;

        // Check assigned timeslot for this profile today
        const slot = allTimeSlots.find(ts => ts.profileId === profile.id && ts.dayOfWeek === dbDayOfWeek);
        if (!slot) continue; // Profile does not work today

        let status = 'COVERED';
        let allocatedWorker = null;
        let isOverride = false;
        let trainee = null;
        
        // Find if any trainee is learning this profile today
        // Find if any trainee is learning this profile today
        // Trainees do not work on weekends (jsDayOfWeek 0 = Sunday, 6 = Saturday) or holidays
        if (!isHoliday && jsDayOfWeek !== 0 && jsDayOfWeek !== 6) {
          const activeTraineeForProfile = activeTrainees.find(t => 
            t.targetProfileId === profile.id && 
            isDateBetween(dateStr, t.startDate, t.endDate) &&
            !traineesPlacedToday[profile.id] // Ensure max 1
          );

          if (activeTraineeForProfile) {
            // Check if this trainee is absent today using standard activeAbsences
            const isTraineeAbsent = activeAbsences.some(a => 
              a.workerId === activeTraineeForProfile.workerId && 
              isDateBetween(dateStr, a.dateStart, a.dateEnd)
            );

            if (!isTraineeAbsent) {
              const traineeWorker = allWorkers.find(w => w.id === activeTraineeForProfile.workerId);
              trainee = {
                id: activeTraineeForProfile.id,
                name: traineeWorker ? traineeWorker.name : 'Desconocido',
                isInternal: traineeWorker ? traineeWorker.category !== 'ESTUDIANTE' : false
              };
              // Record placement
              traineesPlacedToday[profile.id] = true;
            }
          }
        }
        
        // Step A: Theoretical Assignee
        let theoreticalWorker = fixedWorkersMap[profile.id] || null;
        
        // Check Absence or if Worker is currently a Trainee elsewhere
        if (theoreticalWorker) {
          const hasAbsence = activeAbsences.some(abs => 
            abs.workerId === theoreticalWorker.id && 
            isDateBetween(dateStr, abs.dateStart, abs.dateEnd)
          );
          
          const isTrainingElsewhere = activeTrainees.some(t => 
            t.workerId === theoreticalWorker.id &&
            isDateBetween(dateStr, t.startDate, t.endDate)
          );

          if (hasAbsence || isTrainingElsewhere) {
            theoreticalWorker = null; // Theoretical is gone due to absence or being extracted for training
          }
        }
        
        allocatedWorker = theoreticalWorker;
        if (!allocatedWorker) {
          status = 'UNCOVERED';
        }

        // Step B: Manual Assignments (Overrides)
        const override = assignmentsMap[`${profile.id}-${dateStr}`];
        if (override) {
          isOverride = true;
          if (override.workerId) {
            allocatedWorker = allWorkers.find(w => w.id === override.workerId);
            status = 'COVERED';
          } else {
            allocatedWorker = null;
            status = 'UNCOVERED';
          }
        }

        // Publish to output stream
        result.push({
          date: dateStr,
          profileId: profile.id,
          profileName: profile.name,
          shiftId: profile.shiftId,
          areaId: profile.areaId,
          timeSlot: { startTime: slot.startTime, endTime: slot.endTime },
          allocatedWorkerId: allocatedWorker ? allocatedWorker.id : null,
          allocatedWorkerName: allocatedWorker ? allocatedWorker.name : null,
          status,
          isOverride,
          overrideId: override ? override.id : null, // ID from the Assignments table
          trainee // Attached trainee object if present
        });
      }

      // Increment day
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error generating calendar data:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
