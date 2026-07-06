import CrudManager from '../../components/common/CrudManager'
import { TABLES } from '../../supabase/tables'

const fields = [
  { name: 'event_name', label: 'Event name', type: 'text', required: true },
  { name: 'category', label: 'Category / Theme', type: 'text' },
  { name: 'details', label: 'Location / Time Details', type: 'text' },
  { name: 'team_size', label: 'Team Size Description', type: 'text' },
  { name: 'description', label: 'Detailed Description', type: 'textarea' },
  { name: 'staff_incharge', label: 'Staff Incharge', type: 'text' },
  { name: 'registration_fee', label: 'Registration fee', type: 'number', required: true },
  { name: 'minimum_participants', label: 'Minimum participants', type: 'number', required: true },
  { name: 'maximum_participants', label: 'Maximum participants', type: 'number', required: true },
  { name: 'prelims_date', label: 'Prelims date', type: 'date' },
  { name: 'prelims_venue', label: 'Prelims venue', type: 'text' },
  { name: 'mains_date', label: 'Mains date', type: 'date' },
  { name: 'mains_venue', label: 'Mains venue', type: 'text' },
  { name: 'rules', label: 'Rules & Guidelines', type: 'textarea' },
  { name: 'winner_count', label: 'Number of winners', type: 'number' },
  { name: 'status', label: 'Status', type: 'select', options: ['active', 'inactive'] },
]

export default function Events() {
  return (
    <CrudManager
      title="Events"
      table={TABLES.EVENTS}
      fields={fields}
      columns={['event_name', 'category', 'registration_fee', 'minimum_participants', 'maximum_participants', 'status']}
    />
  )
}
