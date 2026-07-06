import CrudManager from '../../components/common/CrudManager'
import { TABLES } from '../../supabase/tables'

const fields = [
  { name: 'title', label: 'Rule Title (e.g. Eligibility)', type: 'text', required: true },
  { name: 'points', label: 'Guidelines / Bullet Points (one per line)', type: 'textarea', required: true },
]

export default function Rules() {
  return (
    <CrudManager
      title="Common Rules & Guidelines"
      table={TABLES.RULES}
      fields={fields}
      columns={['title', 'created_at']}
    />
  )
}
