import EmptyState from './EmptyState'
import LoadingState from './LoadingState'

export default function DataTable({
  columns = [],
  data = [],
  loading = false,
  emptyTitle = 'No records found',
  emptyDescription = 'There are no records to display.',
  emptyIcon,
  keyExtractor = (row, i) => i,
  onRowClick,
}) {
  if (loading) return <LoadingState />

  if (!data || data.length === 0) {
    return (
      <EmptyState
        icon={emptyIcon}
        title={emptyTitle}
        description={emptyDescription}
      />
    )
  }

  return (
    <div className="data-table-wrapper">
      <table className="data-table" role="table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key || col.header} scope="col" style={col.headerStyle}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr
              key={keyExtractor(row, i)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              style={onRowClick ? { cursor: 'pointer' } : undefined}
              tabIndex={onRowClick ? 0 : undefined}
              onKeyDown={onRowClick ? (e) => { if (e.key === 'Enter') onRowClick(row) } : undefined}
            >
              {columns.map((col) => (
                <td key={col.key || col.header} style={col.cellStyle}>
                  {col.render ? col.render(row[col.key], row, i) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
