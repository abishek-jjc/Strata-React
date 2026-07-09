import { useState, useMemo } from 'react'
import CrudManager from '../../components/common/CrudManager'
import { TABLES } from '../../supabase/tables'
import { useTable } from '../../hooks/useTable'

const baseFields = [
  { name: 'student_name', label: 'Name', type: 'text', required: true },
  { name: 'roll_no', label: 'Roll Number', type: 'text' },
  { name: 'event_id', label: 'Event', type: 'select', options: [] },
  { name: 'college_id', label: 'College', type: 'select', options: [] },
]

export default function Participants() {
  const { data: dbStudents } = useTable(TABLES.STUDENTS)
  const { data: events } = useTable(TABLES.EVENTS)
  const { data: colleges } = useTable(TABLES.COLLEGES)

  const students = useMemo(() => dbStudents || [], [dbStudents])

  const [selectedEventId, setSelectedEventId] = useState('')
  const [selectedCollegeId, setSelectedCollegeId] = useState('')

  const fields = useMemo(() => {
    return baseFields.map((f) => {
      if (f.name === 'event_id') return { ...f, options: events.map((e) => ({ value: e.id, label: e.event_name })) }
      if (f.name === 'college_id') return { ...f, options: colleges.map((c) => ({ value: c.id, label: c.department ? `${c.college} (${c.department})` : c.college })) }
      return f
    })
  }, [events, colleges])

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
      columns={['student_name', 'roll_no', 'event_id', 'college_id']}
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
              <option key={c.id} value={c.id}>{c.department ? `${c.college} (${c.department})` : c.college}</option>
            ))}
          </select>
        </>
      )}
    />
  )
}
