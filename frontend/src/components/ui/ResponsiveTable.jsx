import './ResponsiveTable.scss';

/**
 * Tabela que renderiza como <table> tradicional no desktop e
 * como uma lista de cards no mobile, reaproveitando os mesmos dados.
 *
 * columns: [{ key, header, render?(row), primary?: bool }]
 * primary: a coluna que vira o "título" do card no mobile.
 */
export function ResponsiveTable({ columns, rows, rowKey = 'id', onRowClick, emptyLabel = 'Nenhum registro encontrado.' }) {
  if (!rows || rows.length === 0) {
    return <div className="rtable__empty">{emptyLabel}</div>;
  }

  const primaryCol = columns.find((c) => c.primary) || columns[0];
  const restCols = columns.filter((c) => c !== primaryCol);

  return (
    <div className="rtable">
      {/* Desktop */}
      <div className="rtable__scroll">
        <table className="rtable__table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key}>{col.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row[rowKey]}
                className={onRowClick ? 'rtable__row--clickable' : ''}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map((col) => (
                  <td key={col.key}>{col.render ? col.render(row) : row[col.key]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <div className="rtable__cards">
        {rows.map((row) => (
          <div
            key={row[rowKey]}
            className={`rtable__card ${onRowClick ? 'rtable__card--clickable' : ''}`}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
          >
            <div className="rtable__card-primary">
              {primaryCol.render ? primaryCol.render(row) : row[primaryCol.key]}
            </div>
            <div className="rtable__card-grid">
              {restCols.map((col) => (
                <div key={col.key} className="rtable__card-field">
                  <span className="rtable__card-label">{col.header}</span>
                  <span className="rtable__card-value">{col.render ? col.render(row) : row[col.key]}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
