const request = require('supertest');
const app = require('../../server');
const { db } = require('../db');
const { areas, shifts, profiles, profileTimeSlots } = require('../db/schema');

describe('CRUD API Integrations', () => {
  let createdAreaId;
  let createdShiftId;
  let createdProfileId;

  // Cleanup before tests
  beforeAll(async () => {
    await db.delete(profileTimeSlots).run();
    await db.delete(profiles).run();
    await db.delete(shifts).run();
    await db.delete(areas).run();
  });

  // Areas
  it('should create a new area', async () => {
    const res = await request(app).post('/api/areas').send({ name: 'Urgencias', color: '#ff0000' });
    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.name).toBe('Urgencias');
    createdAreaId = res.body.id;
  });

  // Shifts
  it('should create a new shift', async () => {
    const res = await request(app).post('/api/shifts').send({ name: 'Mañana', startTime: '08:00', endTime: '15:00' });
    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.name).toBe('Mañana');
    createdShiftId = res.body.id;
  });

  // Profiles
  it('should create a new profile with timeslots', async () => {
    const payload = {
      name: 'Enfermero 1',
      areaId: createdAreaId,
      isActive: true,
      shiftId: createdShiftId,
      minBackupWorkers: 2,
      timeSlots: [
        { dayOfWeek: 1, startTime: '08:00', endTime: '15:00' },
        { dayOfWeek: 2, startTime: '08:00', endTime: '15:00' }
      ]
    };
    const res = await request(app).post('/api/profiles').send(payload);
    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('id');
    createdProfileId = res.body.id;
  });

  it('should get all profiles including their nested timeslots', async () => {
    const res = await request(app).get('/api/profiles');
    expect(res.statusCode).toEqual(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0].timeSlots.length).toBe(2);
  });
});
