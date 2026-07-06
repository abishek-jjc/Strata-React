// Single source of truth for Postgres table names.
export const TABLES = {
  PROFILES: 'profiles',
  ADMINS: 'admins',
  EVENTS: 'events',
  COLLEGES: 'colleges',
  STUDENT_LEADERS: 'student_leaders',
  ACCOUNTANTS: 'accountants',
  INCHARGES: 'incharges',
  LOTS: 'lots',
  REGISTRATIONS: 'registrations',
  STUDENTS: 'students',
  PAYMENTS: 'payments',
  CERTIFICATES: 'certificates',
  LEADERS: 'leaders',
  RULES: 'rules',
  SETTINGS: 'settings',
}

// Registration status pipeline — mirrors the CHECK constraint on
// registrations.status in schema.sql. Nothing skips a step.
export const REGISTRATION_STATUS = {
  PENDING: 'pending',
  LOT_ASSIGNED: 'lot_assigned',
  PAID: 'paid',
  APPROVED: 'approved',
  REJECTED: 'rejected',
}
