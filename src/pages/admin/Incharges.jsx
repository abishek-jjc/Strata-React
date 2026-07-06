import CrudManager from '../../components/common/CrudManager'
import { TABLES } from '../../supabase/tables'
import { useTable } from '../../hooks/useTable'

const fields = [
  { name: 'name', label: 'Staff Incharge Name', type: 'text', required: true },
]

export default function Incharges() {
  const { data: incharges } = useTable(TABLES.INCHARGES)
  const { data: events } = useTable(TABLES.EVENTS)

  // Map each incharge to their assigned event dynamically (non-editable, determined by events table)
  const mappedIncharges = incharges.map((inch) => {
    const assignedEvent = events.find((e) => e.staff_incharge === inch.id)
    return {
      ...inch,
      event: assignedEvent ? assignedEvent.event_name : '—',
    }
  })

  return (
    <CrudManager
      title="Staff Incharges"
      table={TABLES.INCHARGES}
      fields={fields}
      columns={['name', 'event']}
      customData={mappedIncharges}
    />
  )
}
