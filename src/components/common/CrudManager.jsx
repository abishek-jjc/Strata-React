import { useMemo, useState } from 'react'
import { supabase } from '../../supabase/client'
import { useTable } from '../../hooks/useTable'
import { exportToExcel } from '../../utils/excelExport'

// Config-driven CRUD table + modal form against a Postgres table.
// `fields` describes the schema: [{ name, label, type, required, options }]
// `name` must match the actual Postgres column name (snake_case).
//
// onAfterSave(formData, rowId) — optional hook for side effects, e.g.
// Colleges uses this to generate + store the QR code after insert.
export default function CrudManager({
  title,
  table,
  fields,
  columns,
  onAfterSave,
  renderExtraActions,
}) {
  const { data, loading } = useTable(table)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const visibleColumns = columns || fields.map((f) => f.name)

  const filtered = useMemo(() => {
    if (!search.trim()) return data
    const q = search.toLowerCase()
    return data.filter((row) =>
      visibleColumns.some((col) => String(row[col] ?? '').toLowerCase().includes(q))
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, search])

  function openAdd() {
    const blank = {}
    fields.forEach((f) => (blank[f.name] = f.type === 'toggle' ? false : ''))
    setForm(blank)
    setEditing(null)
    setError('')
    setModalOpen(true)
  }

  function openEdit(row) {
    setForm(row)
    setEditing(row)
    setError('')
    setModalOpen(true)
  }

  async function handleDelete(row) {
    if (!confirm(`Delete "${row[fields[0].name]}"? This can't be undone.`)) return
    await supabase.from(table).delete().eq('id', row.id)
  }

  async function handleSave(e) {
    e.preventDefault()
    setError('')
    for (const f of fields) {
      if (f.required && !form[f.name] && form[f.name] !== 0) {
        setError(`${f.label} is required.`)
        return
      }
    }
    setSaving(true)
    try {
      // Only send columns this form actually knows about — avoids
      // accidentally writing back stray fields (id, created_at) that
      // came along for the ride when `form` was seeded from a row.
      const payload = {}
      fields.forEach((f) => {
        if (f.persist === false) return
        payload[f.name] = form[f.name]
      })

      if (editing) {
        const { error: err } = await supabase.from(table).update(payload).eq('id', editing.id)
        if (err) throw err
        onAfterSave && (await onAfterSave(form, editing.id))
      } else {
        const { data: inserted, error: err } = await supabase
          .from(table)
          .insert(payload)
          .select()
          .single()
        if (err) throw err
        onAfterSave && (await onAfterSave(form, inserted.id))
      }
      setModalOpen(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="crud-manager">
      <div className="crud-header">
        <h2>{title}</h2>
        <div className="crud-actions">
          <input
            className="input"
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="btn" onClick={() => exportToExcel(filtered, table)}>
            Export Excel
          </button>
          <button className="btn btn-primary" onClick={openAdd}>
            Add
          </button>
        </div>
      </div>

      {loading ? (
        <p className="muted">Loading…</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              {visibleColumns.map((c) => (
                <th key={c}>{fields.find((f) => f.name === c)?.label || c}</th>
              ))}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={row.id}>
                {visibleColumns.map((c) => (
                  <td key={c}>{String(row[c] ?? '')}</td>
                ))}
                <td className="row-actions">
                  <button className="link" onClick={() => openEdit(row)}>
                    Edit
                  </button>
                  <button className="link danger" onClick={() => handleDelete(row)}>
                    Delete
                  </button>
                  {renderExtraActions && renderExtraActions(row)}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={visibleColumns.length + 1} className="muted">
                  No records yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      {modalOpen && (
        <div className="modal-backdrop" onClick={() => setModalOpen(false)}>
          <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={handleSave}>
            <h3>{editing ? 'Edit' : 'Add'} {title}</h3>
            {fields.map((f) => (
              <label key={f.name} className="field">
                <span>{f.label}{f.required ? ' *' : ''}</span>
                {f.type === 'textarea' ? (
                  <textarea
                    value={form[f.name] || ''}
                    onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
                  />
                ) : f.type === 'select' ? (
                  <select
                    value={form[f.name] || ''}
                    onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
                  >
                    <option value="">Select…</option>
                    {f.options.map((o) => (
                      <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>
                    ))}
                  </select>
                ) : f.type === 'toggle' ? (
                  <input
                    type="checkbox"
                    checked={!!form[f.name]}
                    onChange={(e) => setForm({ ...form, [f.name]: e.target.checked })}
                  />
                ) : (
                  <input
                    type={f.type || 'text'}
                    value={form[f.name] || ''}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        [f.name]: f.type === 'number' ? Number(e.target.value) : e.target.value,
                      })
                    }
                  />
                )}
              </label>
            ))}
            {error && <p className="error">{error}</p>}
            <div className="modal-actions">
              <button type="button" className="btn" onClick={() => setModalOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
