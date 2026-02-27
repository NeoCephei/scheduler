const { sqliteTable, text, integer } = require('drizzle-orm/sqlite-core');

const areas = sqliteTable('areas', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  color: text('color').notNull(),
  isDeleted: integer('is_deleted', { mode: 'boolean' }).notNull().default(false)
});

const shifts = sqliteTable('shifts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  startTime: text('start_time').notNull(), // HH:MM format
  endTime: text('end_time').notNull(),      // HH:MM format
  isDeleted: integer('is_deleted', { mode: 'boolean' }).notNull().default(false)
});

const holidays = sqliteTable('holidays', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  date: text('date').notNull(),            // YYYY-MM-DD
  name: text('name').notNull()
});

const profiles = sqliteTable('profiles', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  areaId: integer('area_id').notNull().references(() => areas.id),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  isDeleted: integer('is_deleted', { mode: 'boolean' }).notNull().default(false),
  shiftId: integer('shift_id').references(() => shifts.id),
  minBackupWorkers: integer('min_backup_workers').notNull().default(0)
});

const profileTimeSlots = sqliteTable('profile_time_slots', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  profileId: integer('profile_id').notNull().references(() => profiles.id),
  dayOfWeek: integer('day_of_week').notNull(), // 1=Mon...7=Sun, 8=Holiday
  startTime: text('start_time').notNull(),
  endTime: text('end_time').notNull()
});

const workers = sqliteTable('workers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  category: text('category').notNull(), // 'FIJO', 'SUPLENTE'
  fixedProfileId: integer('fixed_profile_id').references(() => profiles.id),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true)
});

const workerCapabilities = sqliteTable('worker_capabilities', {
  workerId: integer('worker_id').notNull().references(() => workers.id),
  profileId: integer('profile_id').notNull().references(() => profiles.id)
});

const absences = sqliteTable('absences', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  workerId: integer('worker_id').notNull().references(() => workers.id),
  dateStart: text('date_start').notNull(),
  dateEnd: text('date_end').notNull()
});

const assignments = sqliteTable('assignments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  profileId: integer('profile_id').notNull().references(() => profiles.id),
  workerId: integer('worker_id').notNull().references(() => workers.id),
  date: text('date').notNull(),
  role: text('role').notNull(), // 'MAIN', 'COVER', 'TRAINEE'
  isOverride: integer('is_override', { mode: 'boolean' }).notNull().default(false)
});

module.exports = {
  areas,
  shifts,
  holidays,
  profiles,
  profileTimeSlots,
  workers,
  workerCapabilities,
  absences,
  assignments
};
