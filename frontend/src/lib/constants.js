// Frontend mirror of backend/src/constants.js
// Keep both in sync if you add/remove values.

export const WORKER_CATEGORIES = ['FIJO', 'SUPLENTE', 'ESTUDIANTE'];

export const SUBSTITUTE_TYPES = [
  'EXTERNO',
  'INTERNO',
  'EVENTUAL',
  'INTERINO'
];

export const ABSENCE_TYPES = [
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

export const ABSENCE_TYPE_LABELS = {
  VACACIONES: 'Vacaciones',
  BAJA_MEDICA: 'Baja Médica',
  LIBRE_DISPOSICION: 'Libre Disposición',
  COMPENSATORIA: 'Compensatoria',
  EXCEDENCIA: 'Excedencia',
  DOCENCIA: 'Docencia',
  PERMISO_SINDICAL: 'Permiso Sindical',
  MATERNIDAD_PATERNIDAD: 'Maternidad / Paternidad',
  OTRO: 'Otro'
};

export const SUBSTITUTE_TYPE_LABELS = {
  EXTERNO: 'Externo',
  INTERNO: 'Interno',
  EVENTUAL: 'Eventual',
  INTERINO: 'Interino'
};
