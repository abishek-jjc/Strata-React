import CrudManager from '../../components/common/CrudManager'
import { TABLES } from '../../supabase/tables'

const fields = [
  { name: 'name', label: 'Name', type: 'text', required: true },
  { name: 'phone', label: 'Phone', type: 'text', required: true },
  { name: 'department', label: 'Department', type: 'text' },
]

export default function Incharges() {
  return (
    <CrudManager
      title="Incharges"
      table={TABLES.INCHARGES}
      fields={fields}
      columns={['name', 'phone', 'department']}
    />
  )
}
