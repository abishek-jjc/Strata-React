import { useState, useMemo } from 'react'
import CrudManager from '../../components/common/CrudManager'
import { TABLES } from '../../supabase/tables'
import { useTable } from '../../hooks/useTable'

const baseFields = [
  { name: 'student_name', label: 'Name', type: 'text', required: true },
  { name: 'year', label: 'Class (Year)', type: 'select', options: ['1st', '2nd', '3rd'], required: true },
  { name: 'email', label: 'Email', type: 'text' },
  { name: 'event_id', label: 'Event', type: 'select', options: [] },
  { name: 'winner_place', label: 'Winner Place', type: 'select', options: ['', '1st Place', '2nd Place', '3rd Place'] },
  { name: 'department', label: 'Department', type: 'text' },
  { name: 'gender', label: 'Gender', type: 'select', options: ['Male', 'Female', 'Other'] },
]

export default function Participants() {
  const { data: dbStudents } = useTable(TABLES.STUDENTS)
  const { data: events } = useTable(TABLES.EVENTS)
  const { data: colleges } = useTable(TABLES.COLLEGES)

  const students = useMemo(() => dbStudents || [], [dbStudents])

  const [selectedEventId, setSelectedEventId] = useState('')
  const [selectedCollegeId, setSelectedCollegeId] = useState('')

  const fields = useMemo(() => {
    return baseFields.map((f) =>
      f.name === 'event_id'
        ? { ...f, options: events.map((e) => ({ value: e.id, label: e.event_name })) }
        : f
    )
  }, [events])

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
      columns={['student_name', 'year', 'email', 'event_id', 'winner_place']}
      disableAdd={true}
      customData={filteredStudents}
      renderExtraHeaderActions={() => (
        <>
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            style={{
              padding: '8px 12px',
              fontSize: '0.9rem',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--border)',
              background: 'var(--bg-card)',
              color: 'var(--text)',
              minWidth: '150px'
            }}
          >
            <option value="">All Events</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>{e.event_name}</option>
            ))}
          </select>

          <select
            value={selectedCollegeId}
            onChange={(e) => setSelectedCollegeId(e.target.value)}
            style={{
              padding: '8px 12px',
              fontSize: '0.9rem',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--border)',
              background: 'var(--bg-card)',
              color: 'var(--text)',
              minWidth: '150px'
            }}
          >
            <option value="">All Colleges</option>
            {colleges.map((c) => (
              <option key={c.id} value={c.id}>{c.college}</option>
            ))}
          </select>
        </>
      )}
    />
  )
}
