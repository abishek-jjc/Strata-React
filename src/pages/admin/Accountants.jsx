import CrudManager from '../../components/common/CrudManager'
import { TABLES } from '../../supabase/tables'

const fields = [
  { name: 'name',   label: 'Accountant Name',         type: 'text',   required: true },
  { name: 'email',  label: 'Google Account Email',     type: 'text',   required: true },
  { name: 'active', label: 'Active (can log in)',       type: 'toggle', required: false },
]

export default function Accountants() {
  return (
    <CrudManager
      title="Accountants (Payment Desk)"
      table={TABLES.ACCOUNTANTS}
      fields={fields}
      columns={['name', 'email', 'active', 'created_at']}
    />
  )
}
