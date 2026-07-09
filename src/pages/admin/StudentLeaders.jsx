import CrudManager from '../../components/common/CrudManager'
import { TABLES } from '../../supabase/tables'
import { supabase } from '../../supabase/client'
import { useTable } from '../../hooks/useTable'

const baseFields = [
  { name: 'name', label: 'Name', type: 'text', required: true },
  { name: 'phone', label: 'Phone', type: 'text', required: true },
  { name: 'email', label: 'Email', type: 'text', required: true },
  { name: 'password', label: 'Temp password (defaults to phone)', type: 'text', persist: false },
  { name: 'department', label: 'Department', type: 'text' },
  { name: 'college_id', label: 'College', type: 'select', options: [] },
  { name: 'status', label: 'Status', type: 'select', options: ['active', 'inactive'] },
]

// Provision student leader auth account and link it to the profiles table
async function provisionLeaderAuth(form, rowId) {
  // Check if profile already exists for this leader
  const { data: profile } = await supabase
    .from(TABLES.PROFILES)
    .select('id')
    .eq('ref_id', rowId)
    .maybeSingle()

  if (profile) return

  const password = form.password || form.phone
  if (!password) return

  const { error } = await supabase.functions.invoke('create-user', {
    body: {
      email: form.email,
      password: password,
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
  const { data: profiles } = useTable(TABLES.PROFILES)

  const fields = baseFields.map((f) =>
    f.name === 'college_id'
      ? {
          ...f,
          options: colleges.map((c) => ({
            value: c.id,
            label: c.department ? `${c.college} (${c.department})` : c.college
          }))
        }
      : f
  )

  const hasProfile = (leaderId) => profiles.some((p) => p.ref_id === leaderId)

  return (
    <CrudManager
      title="Student leaders"
      table={TABLES.STUDENT_LEADERS}
      fields={fields}
      columns={['name', 'email', 'college_id', 'department', 'status']}
      onAfterSave={provisionLeaderAuth}
      disableAdd={true}
      renderExtraActions={(row) => {
        if (hasProfile(row.id)) return null
        return (
          <button
            className="link"
            onClick={async () => {
              if (!confirm(`Provision auth account for ${row.name} (using phone as password)?`)) return
              try {
                await provisionLeaderAuth(row, row.id)
                alert(`Successfully provisioned auth account for ${row.name}`)
              } catch (err) {
                alert(`Failed to provision account: ${err.message}`)
              }
            }}
          >
            Provision
          </button>
        )
      }}
    />
  )
}

