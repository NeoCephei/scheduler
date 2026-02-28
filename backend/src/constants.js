/**
 * Application-wide constants.
 * IMPORTANT: These arrays drive both backend validation and frontend UI rendering.
 * Add or remove values here only — no code elsewhere needs to change.
 */

const WORKER_CATEGORIES = ['FIJO', 'SUPLENTE'];

const SUBSTITUTE_TYPES = [
  'EXTERNO',
  'INTERNO',
  'EVENTUAL',
  'INTERINO'
];

const ABSENCE_TYPES = [
  'VACACIONES',
  'BAJA_MEDICA',
  'LIBRE_DISPOSICION',
  'COMPENSATORIA',
  'EXCEDENCIA',
  'DOCENCIA',
  'PERMISO_SINDICAL',
  'MATERNIDAD_PATERNIDAD',
  'OTRO'
];

const ABSENCE_COVERAGE_STATUS = {
  UNCOVERED: 'UNCOVERED',
  PARTIAL: 'PARTIAL',
  COVERED: 'COVERED'
};

const ASSIGNMENT_ROLES = ['MAIN', 'COVER', 'TRAINEE'];

module.exports = {
  WORKER_CATEGORIES,
  SUBSTITUTE_TYPES,
  ABSENCE_TYPES,
  ABSENCE_COVERAGE_STATUS,
  ASSIGNMENT_ROLES
};
