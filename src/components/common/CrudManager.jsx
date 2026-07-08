import { useMemo, useState, useEffect } from 'react'
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
  renderExtraHeaderActions,
  disableEdit = false,
  disableAdd = false,
  customData = null,
}) {
  const { data: dbData, loading } = useTable(table)
  const data = customData || dbData
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Reset page when search term or customData changes
  useEffect(() => {
    setCurrentPage(1)
  }, [search, customData])

  const [alertState, setAlertState] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
    onConfirm: null,
  })

  const visibleColumns = columns || fields.map((f) => f.name)

  const filtered = useMemo(() => {
    if (!search.trim()) return data
    const q = search.toLowerCase()
    return data.filter((row) =>
      visibleColumns.some((col) => String(row[col] ?? '').toLowerCase().includes(q))
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, search])

  const totalPages = Math.ceil(filtered.length / itemsPerPage)

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages)
    }
  }, [filtered, totalPages, currentPage])

  const paginatedData = useMemo(() => {
    return filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
  }, [filtered, currentPage])

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
    const targetName = row[fields[0].name] || row.college || row.college_name || 'this record'
    setAlertState({
      isOpen: true,
      title: 'Confirm Delete',
      message: `Are you sure you want to delete "${targetName}"? This action cannot be undone.`,
      type: 'danger',
      onConfirm: async () => {
        await supabase.from(table).delete().eq('id', row.id)
      }
    })
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
        let val = form[f.name]
        if (f.type === 'number' && val !== '' && val !== null && val !== undefined) {
          val = Number(val)
        }
        payload[f.name] = val
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
          {renderExtraHeaderActions && renderExtraHeaderActions(filtered)}
          <button className="btn" onClick={() => exportToExcel(filtered, table)}>
            Export Excel
          </button>
          {!disableAdd && (
            <button className="btn btn-primary" onClick={openAdd}>
              Add
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <p className="muted">Loading…</p>
      ) : (
        <>
          <div className="table-responsive">
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
                {paginatedData.map((row) => (
                  <tr key={row.id}>
                    {visibleColumns.map((c) => {
                      const field = fields.find((f) => f.name === c)
                      let val = row[c]
                      if (field && field.type === 'select' && field.options) {
                        const opt = field.options.find((o) => (o.value ?? o) === val)
                        if (opt) val = opt.label ?? opt
                      }
                      return <td key={c}>{String(val ?? '')}</td>
                    })}
                    <td className="row-actions">
                      {!disableEdit && (
                        <button className="link" onClick={() => openEdit(row)}>
                          Edit
                        </button>
                      )}
                      <button className="link danger" onClick={() => handleDelete(row)}>
                        Delete
                      </button>
                      {renderExtraActions && renderExtraActions(row)}
                    </td>
                  </tr>
                ))}
                {paginatedData.length === 0 && (
                  <tr>
                    <td colSpan={visibleColumns.length + 1} className="muted">
                      No records yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="pagination" style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '16px', alignItems: 'center' }}>
              <button
                type="button"
                className="btn"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                style={{ padding: '6px 12px', fontSize: '0.8rem', minHeight: 'auto' }}
              >
                First
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                style={{ padding: '6px 12px', fontSize: '0.8rem', minHeight: 'auto' }}
              >
                Prev
              </button>
              <span className="muted" style={{ fontSize: '0.85rem', margin: '0 8px' }}>
                Page <strong>{currentPage}</strong> of {totalPages} ({filtered.length} items)
              </span>
              <button
                type="button"
                className="btn"
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                style={{ padding: '6px 12px', fontSize: '0.8rem', minHeight: 'auto' }}
              >
                Next
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                style={{ padding: '6px 12px', fontSize: '0.8rem', minHeight: 'auto' }}
              >
                Last
              </button>
            </div>
          )}
        </>
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
                        [f.name]: e.target.value,
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
      {alertState.isOpen && (
        <div className="modal-backdrop" onClick={() => setAlertState({ ...alertState, isOpen: false })}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: '400px' }}>
            <h3 style={{ borderBottom: '1px solid var(--border)', paddingBottom: '10px', color: alertState.type === 'danger' ? 'var(--danger)' : 'var(--text-primary)' }}>
              {alertState.title}
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.5', margin: '15px 0' }}>
              {alertState.message}
            </p>
            <div className="modal-actions">
              {alertState.onConfirm ? (
                <>
                  <button type="button" className="btn" onClick={() => setAlertState({ ...alertState, isOpen: false })}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ backgroundColor: alertState.type === 'danger' ? 'var(--danger)' : 'var(--accent)', borderColor: alertState.type === 'danger' ? 'var(--danger)' : 'var(--accent)', color: alertState.type === 'danger' ? '#fff' : '#0c0e12' }}
                    onClick={() => {
                      alertState.onConfirm()
                      setAlertState({ ...alertState, isOpen: false })
                    }}
                  >
                    Confirm
                  </button>
                </>
              ) : (
                <button type="button" className="btn btn-primary" onClick={() => setAlertState({ ...alertState, isOpen: false })}>
                  OK
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

