import CrudManager from '../../components/common/CrudManager'
import { TABLES } from '../../supabase/tables'

const fields = [
  { name: 'name', label: 'Leader Name', type: 'text', required: true },
  { name: 'position', label: 'Position (e.g. Principal / HOD)', type: 'text', required: true },
  { name: 'description', label: 'Greeting Message / Description', type: 'textarea', required: true },
  { name: 'image_url', label: 'Leader Image', type: 'image' },
]

export default function Leaders() {
  return (
    <CrudManager
      title="Greetings & Visionary Leaders"
      table={TABLES.LEADERS}
      fields={fields}
      columns={['image_url', 'name', 'position', 'created_at']}
    />
  )
}
