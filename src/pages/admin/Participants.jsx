import { useState, useMemo } from 'react'
import CrudManager from '../../components/common/CrudManager'
import { TABLES } from '../../supabase/tables'
import { useTable } from '../../hooks/useTable'
import { getUniqueStudents } from '../../utils/studentUtils'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { Download } from 'lucide-react'
import { useSettings } from '../../context/SettingsContext'
import { loadLogoWithOpacity, addWatermarkToAllPages } from '../../utils/pdfBackground'

const baseFields = [
  { name: 'student_name', label: 'Student Name', type: 'text', required: true },
  {
    name: 'gender',
    label: 'Gender',
    type: 'select',
    options: [
      { value: 'Male', label: 'Male' },
      { value: 'Female', label: 'Female' },
      { value: 'Other', label: 'Other' },
      { value: '-', label: 'Unspecified' },
    ]
  },
  { name: 'roll_no', label: 'Roll Number', type: 'text' },
  { name: 'department', label: 'Department', type: 'text' },
  { name: 'year', label: 'Year', type: 'text' },
  { name: 'email', label: 'Email', type: 'text' },
  { name: 'food_type', label: 'Food Preference', type: 'text' },
  { name: 'certificate_status', label: 'Certificate Status', type: 'text' },
  { name: 'display_events', label: 'Event', type: 'text' },
  { name: 'college_id', label: 'College', type: 'select', options: [] },
]

export default function Participants() {
  const { settings } = useSettings()
  const logoUrl = settings?.event_logo_url

  const { data: dbStudents } = useTable(TABLES.STUDENTS)
  const { data: events } = useTable(TABLES.EVENTS) || { data: [] }
  const { data: colleges } = useTable(TABLES.COLLEGES) || { data: [] }
  const { data: registrations } = useTable(TABLES.REGISTRATIONS) || { data: [] }

  const students = useMemo(() => getUniqueStudents(dbStudents || []), [dbStudents])

  const [selectedEventId, setSelectedEventId] = useState('')
  const [selectedCollegeId, setSelectedCollegeId] = useState('')

  const collegeName = (id) => {
    const c = (colleges || []).find((col) => col.id === id)
    if (!c) return '—'
    return c.department ? `${c.college} (${c.department})` : c.college
  }

  const registeredColleges = useMemo(() => {
    if (!colleges) return []
    const regSet = new Set([
      ...(registrations || []).map((r) => r.college_id),
      ...students.map((s) => s.college_id)
    ].filter(Boolean))
    return colleges.filter((c) => regSet.has(c.id))
  }, [colleges, registrations, students])

  const fields = useMemo(() => {
    return baseFields.map((f) => {
      if (f.name === 'college_id') return { ...f, options: registeredColleges.map((c) => ({ value: c.id, label: c.department ? `${c.college} (${c.department})` : c.college })) }
      return f
    })
  }, [registeredColleges])

  // Filtered Students list (Filtered by selected Event & College)
  const filteredStudents = useMemo(() => {
    const list = students.filter((s) => {
      const matchEvent = selectedEventId 
        ? (s.event_id === selectedEventId || (Array.isArray(s.event_ids) && s.event_ids.includes(selectedEventId)))
        : true
      const matchCollege = selectedCollegeId ? s.college_id === selectedCollegeId : true
      return matchEvent && matchCollege
    })

    return list.map((s) => {
      const allEvIds = Array.isArray(s.event_ids) && s.event_ids.length > 0
        ? s.event_ids
        : s.event_id ? [s.event_id] : []

      const eventNames = allEvIds
        .map((id) => (events || []).find((e) => e.id === id)?.event_name)
        .filter(Boolean)

      return {
        ...s,
        display_events: eventNames.length > 0 ? eventNames.join(', ') : '—'
      }
    })
  }, [students, events, selectedEventId, selectedCollegeId])

  // Export PDF function (Exports ONLY filtered participants according to active filters!)
  const handleExportPdf = async () => {
    if (filteredStudents.length === 0) return alert('No participant records match the current filter.')

    const doc = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait' })
    const imgData = logoUrl ? await loadLogoWithOpacity(logoUrl, 0.15) : null

    // Title & Header
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(15)
    doc.text('Strata 2K26 — Participants List Report', 40, 45)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)

    const evObj = (events || []).find((e) => e.id === selectedEventId)
    const colObj = (colleges || []).find((c) => c.id === selectedCollegeId)

    let filterSummary = 'Filter: All Participants'
    if (evObj) filterSummary += ` | Event: ${evObj.event_name}`
    if (colObj) filterSummary += ` | College: ${colObj.department ? `${colObj.college} (${colObj.department})` : colObj.college}`

    doc.text(filterSummary, 40, 60)
    doc.text(`Generated on: ${new Date().toLocaleString()} | Total Records Exported: ${filteredStudents.length}`, 40, 72)

    const tableRows = filteredStudents.map((s) => [
      s.student_name || '—',
      s.roll_no || '—',
      s.gender || '—',
      s.department || '—',
      s.display_events || '—',
      collegeName(s.college_id),
      s.food_type || 'Veg'
    ])

    doc.autoTable({
      startY: 85,
      head: [['Participant Name', 'Roll No', 'Gender', 'Department', 'Event(s)', 'College', 'Food']],
      body: tableRows,
      margin: { left: 40, right: 40 },
      theme: 'grid',
      headStyles: { fillColor: [0, 229, 255], textColor: [0, 0, 0], fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 5 }
    })

    if (imgData) {
      addWatermarkToAllPages(doc, imgData)
    }

    doc.save(`Strata_Participants_${new Date().toISOString().slice(0, 10)}.pdf`)
  }

  return (
    <CrudManager
      title="Participants"
      table={TABLES.STUDENTS}
      fields={fields}
      columns={['student_name', 'gender', 'roll_no', 'display_events', 'college_id']}
      disableAdd={true}
      disableDelete={true}
      readOnlyView={true}
      customData={filteredStudents}
      renderExtraHeaderActions={() => (
        <>
          <select
            className="input"
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            style={{
              padding: '8px 12px',
              fontSize: '0.9rem',
              minWidth: '150px'
            }}
          >
            <option value="">All Events</option>
            {(events || []).map((e) => (
              <option key={e.id} value={e.id}>{e.event_name}</option>
            ))}
          </select>

          <select
            className="input"
            value={selectedCollegeId}
            onChange={(e) => setSelectedCollegeId(e.target.value)}
            style={{
              padding: '8px 12px',
              fontSize: '0.9rem',
              minWidth: '150px'
            }}
          >
            <option value="">All Colleges</option>
            {(registeredColleges || []).map((c) => (
              <option key={c.id} value={c.id}>{c.department ? `${c.college} (${c.department})` : c.college}</option>
            ))}
          </select>

          <button
            className="btn btn-primary"
            onClick={handleExportPdf}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', padding: '8px 14px' }}
          >
            <Download size={15} /> Export PDF ({filteredStudents.length})
          </button>
        </>
      )}
    />
  )
}
