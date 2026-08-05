// Single source of truth for Postgres table names.
// Ordered strictly by Foreign Key dependency DAG (Parent tables before Child tables)
export const TABLES = {
  // Independent / Base Tables (Level 1)
  VENUES: 'venues',
  COLLEGES: 'colleges',
  LOTS: 'lots',
  ADMINS: 'admins',
  ACCOUNTANTS: 'accountants',
  LEADERS: 'leaders',
  RULES: 'rules',
  SETTINGS: 'settings',
  PAYMENT_POLLS: 'payment_polls',

  // Level 2 Tables (depend on Level 1)
  EVENTS: 'events',                   // FK -> venues
  STUDENT_LEADERS: 'student_leaders', // FK -> colleges
  PAYMENTS: 'payments',               // FK -> colleges
  PAYMENT_LOGS: 'payment_logs',       // FK -> payment_polls

  // Level 3 Tables (depend on Level 1 & 2)
  INCHARGES: 'incharges',             // FK -> events
  REGISTRATIONS: 'registrations',     // FK -> colleges, student_leaders, events, lots
  FEEDBACKS: 'feedbacks',             // FK -> student_leaders, colleges
  WINNERS: 'winners',                 // FK -> events
  REVIEW_TITLES: 'review_titles',     // Admin created review aspects/titles
  LEADER_REVIEWS: 'leader_reviews',   // Student leader reviews & ratings

  // Level 4 Tables (depend on Level 3)
  STUDENTS: 'students',               // FK -> registrations, colleges, events, student_leaders

  // Level 5 Tables (depend on Level 4)
  CERTIFICATES: 'certificates',       // FK -> students, events

  // Level 6 Tables (auth dependent)
  PROFILES: 'profiles',               // FK -> auth.users
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
