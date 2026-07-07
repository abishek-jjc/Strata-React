import CrudManager from '../../components/common/CrudManager'
import { TABLES } from '../../supabase/tables'
import { useTable } from '../../hooks/useTable'

const baseFields = [
  { name: 'student_name', label: 'Name', type: 'text', required: true },
  { name: 'year', label: 'Class (Year)', type: 'text', required: true },
  { name: 'email', label: 'Email', type: 'text' },
  { name: 'event_id', label: 'Event', type: 'select', options: [] },
  { name: 'winner_place', label: 'Winner Place', type: 'select', options: ['', '1st Place', '2nd Place', '3rd Place'] },
  { name: 'department', label: 'Department', type: 'text' },
  { name: 'gender', label: 'Gender', type: 'select', options: ['Male', 'Female', 'Other'] },
]

export default function Participants() {
  const { data: events } = useTable(TABLES.EVENTS)

  const fields = baseFields.map((f) =>
    f.name === 'event_id'
      ? { ...f, options: events.map((e) => ({ value: e.id, label: e.event_name })) }
      : f
  )

  return (
    <CrudManager
      title="Participants"
      table={TABLES.STUDENTS}
      fields={fields}
      columns={['student_name', 'year', 'email', 'event_id', 'winner_place']}
      disableAdd={true}
    />
  )
}
