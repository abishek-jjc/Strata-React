// Normalizes a student name for uniqueness comparison: trims and
// lowercases so "Ravi Kumar" and " ravi kumar " collide correctly.
export function normalizeName(name) {
  return (name || '').trim().toLowerCase().replace(/\s+/g, ' ')
}

export function validateParticipantCount(count, min, max) {
  if (min === max) {
    if (count !== min) return `Team size must be exactly ${min} participants — currently ${count}.`
    return null
  }
  if (count < min) return `Needs at least ${min} participants — currently ${count}.`
  if (count > max) return `Maximum ${max} participants allowed — currently ${count}.`
  return null
}

export function hasDuplicateNamesWithinTeam(names) {
  const normalized = names.map(normalizeName)
  return new Set(normalized).size !== normalized.length
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '')
}
