import { useMemo, useState, useEffect } from 'react'
import { supabase } from '../../supabase/client'
import { useTable } from '../../hooks/useTable'
import { exportToExcel } from '../../utils/excelExport'

// Config-driven CRUD table + modal form against a Postgres table.
export default function CrudManager({
  title,
  table,
  fields,
  columns,
  onAfterSave,
  renderExtraActions,
  renderExtraHeaderActions,
  disableEdit = false,
  disableDelete = false,
  disableAdd = false,
  readOnlyView = false,
  customData = null,
}) {
  const { data: dbData, loading } = useTable(table)
  const data = customData || dbData
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [viewingRow, setViewingRow] = useState(null)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const [selectedIds, setSelectedIds] = useState([])

  useEffect(() => {
    setCurrentPage(1)
    setSelectedIds([])
  }, [search, customData, table])

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
  }, [data, search, visibleColumns])

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
    const initialForm = { ...row }
    fields.forEach((f) => {
      if (f.name === 'has_prelims') {
        initialForm.has_prelims = !!(row.prelims_venue || row.preliminary)
      }
    })
    setForm(initialForm)
    setEditing(row)
    setError('')
    setModalOpen(true)
  }

  function openView(row) {
    setViewingRow(row)
    setViewModalOpen(true)
  }

  function toggleSelectRow(id) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  function toggleSelectAll() {
    const pageIds = paginatedData.map((item) => item.id)
    const allSelectedOnPage = pageIds.every((id) => selectedIds.includes(id))

    if (allSelectedOnPage) {
      setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)))
    } else {
      setSelectedIds((prev) => {
        const next = [...prev]
        pageIds.forEach((id) => {
          if (!next.includes(id)) next.push(id)
        })
        return next
      })
    }
  }

  async function handleBulkDelete() {
    if (!confirm(`Are you sure you want to delete ${selectedIds.length} selected items?`)) return
    try {
      const { error: err } = await supabase
        .from(table)
        .delete()
        .in('id', selectedIds)
      if (err) throw err
      setSelectedIds([])
    } catch (err) {
      alert('Failed to delete selected items: ' + err.message)
    }
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
      const isVisible = !f.showIf || f.showIf(form)
      if (isVisible && f.required && !form[f.name] && form[f.name] !== 0) {
        setError(`${f.label} is required.`)
        return
      }
    }
    setSaving(true)
    try {
      const payload = {}
      fields.forEach((f) => {
        if (f.persist === false) return
        let val = form[f.name]

        if (form.has_prelims === false && (f.name === 'prelims_venue' || f.name === 'preliminary')) {
          val = null
        }

        if (f.type === 'number' && val !== '' && val !== null && val !== undefined) {
          val = Number(val)
        }
        if (val === '') {
          val = null
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
          {!disableDelete && selectedIds.length > 0 && (
            <button
              type="button"
              className="btn"
              onClick={handleBulkDelete}
              style={{ borderColor: 'var(--danger)', color: 'var(--danger)', fontWeight: '600' }}
            >
              Delete Selected ({selectedIds.length})
            </button>
          )}
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
          {!disableAdd && !readOnlyView && (
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
                  {!disableDelete && (
                    <th style={{ width: '40px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={paginatedData.length > 0 && paginatedData.every((item) => selectedIds.includes(item.id))}
                        onChange={toggleSelectAll}
                      />
                    </th>
                  )}
                  {visibleColumns.map((c) => (
                    <th key={c}>{fields.find((f) => f.name === c)?.label || c}</th>
                  ))}
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((row) => (
                  <tr key={row.id}>
                    {!disableDelete && (
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(row.id)}
                          onChange={() => toggleSelectRow(row.id)}
                        />
                      </td>
                    )}
                    {visibleColumns.map((c) => {
                      const field = fields.find((f) => f.name === c)
                      let val = row[c]
                      if (field && field.type === 'select' && field.options) {
                        const opt = field.options.find((o) => (o.value ?? o) === val)
                        if (opt) val = opt.label ?? opt
                      }
                      if (field && field.type === 'image') {
                        return (
                          <td key={c}>
                            {val ? (
                              <img 
                                src={val} 
                                alt="preview" 
                                style={{ width: '40px', height: '40px', borderRadius: '4px', objectFit: 'cover', display: 'block' }} 
                              />
                            ) : (
                              '—'
                            )}
                          </td>
                        )
                      }
                      return <td key={c}>{String(val ?? '—')}</td>
                    })}
                    <td className="row-actions">
                      {readOnlyView ? (
                        <button className="link" onClick={() => openView(row)}>
                          View
                        </button>
                      ) : (
                        <>
                          {!disableEdit && (
                            <button className="link" onClick={() => openEdit(row)}>
                              Edit
                            </button>
                          )}
                          {!disableDelete && (
                            <button className="link danger" onClick={() => handleDelete(row)}>
                              Delete
                            </button>
                          )}
                        </>
                      )}
                      {renderExtraActions && renderExtraActions(row)}
                    </td>
                  </tr>
                ))}
                {paginatedData.length === 0 && (
                  <tr>
                    <td colSpan={visibleColumns.length + (disableDelete ? 1 : 2)} className="muted" style={{ textAlign: 'center', padding: '20px' }}>
                      No records found.
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

      {/* Read Only Detail Modal */}
      {viewModalOpen && viewingRow && (
        <div className="modal-backdrop" onClick={() => setViewModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px', width: '100%' }}>
            <h3 style={{ margin: '0 0 16px 0', borderBottom: '1px solid var(--border)', paddingBottom: '12px', color: 'var(--text-primary)' }}>
              Detail View: {title}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '60vh', overflowY: 'auto', fontSize: '0.92rem' }}>
              {fields.map((f) => {
                let rawVal = viewingRow[f.name]
                let displayVal = rawVal ?? '—'
                if (f.type === 'select' && f.options) {
                  const opt = f.options.find((o) => (o.value ?? o) === rawVal)
                  if (opt) displayVal = opt.label ?? opt
                }
                if (f.type === 'image' && rawVal) {
                  return (
                    <div key={f.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                      <span className="muted">{f.label}:</span>
                      <img src={rawVal} alt={f.label} style={{ maxWidth: '100px', maxHeight: '100px', borderRadius: '8px', objectFit: 'cover' }} />
                    </div>
                  )
                }
                return (
                  <div key={f.name} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                    <span className="muted">{f.label}:</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{String(displayVal)}</strong>
                  </div>
                )
              })}

              {viewingRow.created_at && (
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                  <span className="muted">Created At:</span>
                  <strong style={{ color: 'var(--text-primary)' }}>{new Date(viewingRow.created_at).toLocaleString()}</strong>
                </div>
              )}
            </div>

            <div className="modal-actions" style={{ marginTop: '20px' }}>
              <button type="button" className="btn btn-primary" onClick={() => setViewModalOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit / Add Modal */}
      {modalOpen && (
        <div className="modal-backdrop" onClick={() => setModalOpen(false)}>
          <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={handleSave}>
            <h3>{editing ? 'Edit' : 'Add'} {title}</h3>
            {fields.filter((f) => !f.showIf || f.showIf(form)).map((f) => (
              <label key={f.name} className="field">
                <span>{f.label}{f.required ? ' *' : ''}</span>
                {f.type === 'textarea' ? (
                  <textarea
                    value={form[f.name] || ''}
                    onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
                  />
                ) : f.type === 'image' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        setError('')
                        setSaving(true)
                        try {
                          const fileName = `leader_${Date.now()}_${file.name.replace(/\s+/g, '_')}`
                          const { data, error: uploadError } = await supabase.storage
                            .from('assets')
                            .upload(fileName, file, { upsert: true })

                          if (uploadError) throw uploadError

                          const { data: { publicUrl } } = supabase.storage
                            .from('assets')
                            .getPublicUrl(fileName)

                          setForm({ ...form, [f.name]: publicUrl })
                        } catch (err) {
                          setError('Failed to upload image: ' + err.message)
                        } finally {
                          setSaving(false)
                        }
                      }}
                    />
                    {form[f.name] && (
                      <img 
                        src={form[f.name]} 
                        alt="Preview" 
                        style={{ maxWidth: '120px', maxHeight: '120px', borderRadius: '8px', border: '1px solid var(--border)', objectFit: 'cover' }} 
                      />
                    )}
                  </div>
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                    <input
                      type="checkbox"
                      id={`toggle-${f.name}`}
                      checked={!!form[f.name]}
                      onChange={(e) => setForm({ ...form, [f.name]: e.target.checked })}
                      style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--accent, #f9c20a)' }}
                    />
                  </div>
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
