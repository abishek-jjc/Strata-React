/**
 * Helper to deduplicate student records by college_id + roll_no (or student_name).
 * Merges event_ids array and food_type preference across duplicate records.
 */
export function getUniqueStudents(students) {
  if (!students || !Array.isArray(students)) return []
  const map = new Map()

  students.forEach((s) => {
    if (!s) return
    const roll = s.roll_no ? s.roll_no.trim().toLowerCase() : ''
    const name = (s.student_name || '').trim().toLowerCase()
    const collegeId = s.college_id || 'unknown'

    // Key by college_id + roll_no if valid roll_no exists, otherwise college_id + student_name
    const key = (roll && roll !== '-' && roll !== '—')
      ? `${collegeId}_${roll}`
      : `${collegeId}_${name}`

    const evList = Array.isArray(s.event_ids) && s.event_ids.length > 0
      ? s.event_ids
      : s.event_id ? [s.event_id] : []

    if (!map.has(key)) {
      map.set(key, {
        ...s,
        event_ids: Array.from(new Set(evList.filter(Boolean)))
      })
    } else {
      const existing = map.get(key)
      const combinedEvents = Array.from(new Set([
        ...(existing.event_ids || (existing.event_id ? [existing.event_id] : [])),
        ...evList
      ].filter(Boolean)))

      map.set(key, {
        ...existing,
        event_ids: combinedEvents,
        food_type: (s.food_type === 'Non-Veg' || existing.food_type === 'Non-Veg') ? 'Non-Veg' : (existing.food_type || s.food_type || 'Veg')
      })
    }
  })

  return Array.from(map.values())
}
