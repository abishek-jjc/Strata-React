import CrudManager from '../../components/common/CrudManager'
import { TABLES } from '../../supabase/tables'

const fields = [
  { name: 'name', label: 'Admin Name', type: 'text', required: true },
  { name: 'email', label: 'Google Account Email Address', type: 'text', required: true },
]

export default function Admins() {
  return (
    <CrudManager
      title="Administrators"
      table={TABLES.ADMINS}
      fields={fields}
      columns={['name', 'email', 'created_at']}
    />
  )
}
