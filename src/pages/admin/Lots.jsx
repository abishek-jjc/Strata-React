import CrudManager from '../../components/common/CrudManager'
import { TABLES } from '../../supabase/tables'
import { useTable } from '../../hooks/useTable'

export default function Lots() {
  const { data: events } = useTable(TABLES.EVENTS)
  const fields = [
    { name: 'lot_name', label: 'Lot name', type: 'text', required: true },
    {
      name: 'event_id',
      label: 'Event',
      type: 'select',
      required: true,
      options: events.map((e) => ({ value: e.id, label: e.event_name })),
    },
  ]
  return (
    <CrudManager
      title="Lots"
      table={TABLES.LOTS}
      fields={fields}
      columns={['lot_name', 'event_id']}
    />
  )
}
