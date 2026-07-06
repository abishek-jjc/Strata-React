import CrudManager from '../../components/common/CrudManager'
import { TABLES } from '../../supabase/tables'
import { supabase } from '../../supabase/client'
import { useTable } from '../../hooks/useTable'

const baseFields = [
  { name: 'name', label: 'Name', type: 'text', required: true },
  { name: 'phone', label: 'Phone', type: 'text', required: true },
  { name: 'email', label: 'Email', type: 'text', required: true },
  { name: 'password', label: 'Temp password (new leaders only)', type: 'text', persist: false },
  { name: 'department', label: 'Department', type: 'text' },
  { name: 'college_id', label: 'College', type: 'select', options: [] },
  { name: 'status', label: 'Status', type: 'select', options: ['active', 'inactive'] },
]

// New leader → calls the create-user Edge Function, which creates the
// Supabase Auth account and the profiles row server-side (see
// supabase/functions/create-user/index.ts for why this can't safely
// happen directly from the browser).
async function provisionLeaderAuth(form, rowId) {
  if (!form.password) return // editing an existing leader, no new account needed
  const { error } = await supabase.functions.invoke('create-user', {
    body: {
      email: form.email,
      password: form.password,
      role: 'leader',
      name: form.name,
      ref_id: rowId,
      college_id: form.college_id,
    },
  })
  if (error) throw error
}

export default function StudentLeaders() {
  const { data: colleges } = useTable(TABLES.COLLEGES)
  const fields = baseFields.map((f) =>
    f.name === 'college_id'
      ? { ...f, options: colleges.map((c) => ({ value: c.id, label: c.college_name })) }
      : f
  )

  return (
    <CrudManager
      title="Student leaders"
      table={TABLES.STUDENT_LEADERS}
      fields={fields}
      columns={['name', 'email', 'department', 'status']}
      onAfterSave={provisionLeaderAuth}
    />
  )
}
