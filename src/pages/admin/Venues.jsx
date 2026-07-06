import CrudManager from '../../components/common/CrudManager'
import { TABLES } from '../../supabase/tables'

const fields = [
  { name: 'venue_name', label: 'Venue Name', type: 'text', required: true }
]

export default function Venues() {
  return (
    <CrudManager
      title="Venues"
      table={TABLES.VENUES}
      fields={fields}
      columns={['venue_name']}
      disableEdit={true}
    />
  )
}
