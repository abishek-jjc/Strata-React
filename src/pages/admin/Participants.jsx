import { useState, useMemo } from 'react'
import CrudManager from '../../components/common/CrudManager'
import { TABLES } from '../../supabase/tables'
import { useTable } from '../../hooks/useTable'

const baseFields = [
  { name: 'student_name', label: 'Student Name', type: 'text', required: true },
  {
    name: 'gender',
    label: 'Gender',
    type: 'select',
    options: [
      { value: 'Male', label: 'Male' },
      { value: 'Female', label: 'Female' },
      { value: 'Other', label: 'Other' },
      { value: '-', label: 'Unspecified' },
    ]
  },
  { name: 'roll_no', label: 'Roll Number', type: 'text' },
  { name: 'department', label: 'Department', type: 'text' },
  { name: 'year', label: 'Year', type: 'text' },
  { name: 'email', label: 'Email', type: 'text' },
  { name: 'food_type', label: 'Food Preference', type: 'text' },
  { name: 'certificate_status', label: 'Certificate Status', type: 'text' },
  { name: 'event_id', label: 'Event', type: 'select', options: [] },
  { name: 'college_id', label: 'College', type: 'select', options: [] },
]

export default function Participants() {
  const { data: dbStudents } = useTable(TABLES.STUDENTS)
  const { data: events } = useTable(TABLES.EVENTS)
  const { data: colleges } = useTable(TABLES.COLLEGES)
  const { data: registrations } = useTable(TABLES.REGISTRATIONS)

  const students = useMemo(() => dbStudents || [], [dbStudents])

  const [selectedEventId, setSelectedEventId] = useState('')
  const [selectedCollegeId, setSelectedCollegeId] = useState('')

  const registeredColleges = useMemo(() => {
    if (!colleges) return []
    const regSet = new Set([
      ...(registrations || []).map((r) => r.college_id),
      ...students.map((s) => s.college_id)
    ].filter(Boolean))
    return colleges.filter((c) => regSet.has(c.id))
  }, [colleges, registrations, students])

  const fields = useMemo(() => {
    return baseFields.map((f) => {
      if (f.name === 'event_id') return { ...f, options: events.map((e) => ({ value: e.id, label: e.event_name })) }
      if (f.name === 'college_id') return { ...f, options: registeredColleges.map((c) => ({ value: c.id, label: c.department ? `${c.college} (${c.department})` : c.college })) }
      return f
    })
  }, [events, registeredColleges])

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchEvent = selectedEventId ? s.event_id === selectedEventId : true
      const matchCollege = selectedCollegeId ? s.college_id === selectedCollegeId : true
      return matchEvent && matchCollege
    })
  }, [students, selectedEventId, selectedCollegeId])

  return (
    <CrudManager
      title="Participants"
      table={TABLES.STUDENTS}
      fields={fields}
      columns={['student_name', 'gender', 'roll_no', 'event_id', 'college_id']}
      disableAdd={true}
      disableDelete={true}
      readOnlyView={true}
      customData={filteredStudents}
      renderExtraHeaderActions={() => (
        <>
          <select
            className="input"
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            style={{
              padding: '8px 12px',
              fontSize: '0.9rem',
              minWidth: '150px'
            }}
          >
            <option value="">All Events</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>{e.event_name}</option>
            ))}
          </select>

          <select
            className="input"
            value={selectedCollegeId}
            onChange={(e) => setSelectedCollegeId(e.target.value)}
            style={{
              padding: '8px 12px',
              fontSize: '0.9rem',
              minWidth: '150px'
            }}
          >
            <option value="">All Colleges</option>
            {registeredColleges.map((c) => (
              <option key={c.id} value={c.id}>{c.department ? `${c.college} (${c.department})` : c.college}</option>
            ))}
          </select>
        </>
      )}
    />
  )
}
