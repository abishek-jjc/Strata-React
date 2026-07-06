import CrudManager from '../../components/common/CrudManager'
import { TABLES } from '../../supabase/tables'
import { supabase } from '../../supabase/client'

const fields = [
  { name: 'name', label: 'Name', type: 'text', required: true },
  { name: 'phone', label: 'Phone', type: 'text', required: true },
  { name: 'email', label: 'Email', type: 'text', required: true },
  { name: 'password', label: 'Temp password (new accountants only)', type: 'text', persist: false },
]

async function provisionAccountantAuth(form, rowId) {
  if (!form.password) return
  const { error } = await supabase.functions.invoke('create-user', {
    body: {
      email: form.email,
      password: form.password,
      role: 'accountant',
      name: form.name,
      ref_id: rowId,
    },
  })
  if (error) throw error
}

export default function Accountants() {
  return (
    <CrudManager
      title="Accountants"
      table={TABLES.ACCOUNTANTS}
      fields={fields}
      columns={['name', 'email', 'phone']}
      onAfterSave={provisionAccountantAuth}
    />
  )
}
