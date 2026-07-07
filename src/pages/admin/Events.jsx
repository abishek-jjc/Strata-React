import { useTable } from '../../hooks/useTable'
import CrudManager from '../../components/common/CrudManager'
import { TABLES } from '../../supabase/tables'

const baseFields = [
  { name: 'event_name', label: 'Event name', type: 'text', required: true },
  { name: 'category', label: 'Category / Theme', type: 'text' },
  { name: 'description', label: 'Detailed Description', type: 'textarea' },
  { name: 'staff_incharge', label: 'Staff Incharge', type: 'select', options: [] },
  { name: 'team_size', label: 'Team Size (Exact count)', type: 'number', required: true },
  { name: 'prelims_venue', label: 'Prelims Venue', type: 'select', options: [] },
  { name: 'preliminary', label: 'Preliminary Round Time', type: 'time' },
  { name: 'mains_venue', label: 'Mains Venue', type: 'select', options: [] },
  { name: 'mains', label: 'Mains Round Time', type: 'time' },
  { name: 'rules', label: 'Rules & Guidelines', type: 'textarea' },
  { name: 'status', label: 'Status', type: 'select', options: ['active', 'inactive'] },
]

export default function Events() {
  const { data: venues } = useTable(TABLES.VENUES)
  const { data: incharges } = useTable(TABLES.INCHARGES)

  const fields = baseFields.map((f) => {
    if (f.name === 'prelims_venue' || f.name === 'mains_venue') {
      return { ...f, options: venues.map((v) => ({ value: v.id, label: v.venue_name })) }
    }
    if (f.name === 'staff_incharge') {
      return { ...f, options: incharges.map((i) => ({ value: i.id, label: i.name })) }
    }
    return f
  })

  return (
    <CrudManager
      title="Events"
      table={TABLES.EVENTS}
      fields={fields}
      columns={['event_name', 'category', 'team_size', 'status']}
    />
  )
}
