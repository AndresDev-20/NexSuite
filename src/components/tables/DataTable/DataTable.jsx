import "./dataTable.css";

/**
 * Tabla reutilizable: en móvil cada fila es una tarjeta; desde 768px es una tabla.
 *
 * columns: [{ key, header, render(row), primary? }]
 *   · primary marca la celda principal (el nombre), que en móvil va arriba sin etiqueta.
 * renderActions(row): opcional. Contenido de la última columna (usa <RowActions>).
 */
const DataTable = ({ caption, columns, rows, getRowKey, renderActions, actionsLabel = "Acciones" }) => (
  <div className="data-table">
    <table className="data-table__element">
      <caption className="data-table__sr">{caption}</caption>

      <thead>
        <tr>
          {columns.map((column) => (
            <th key={column.key}>{column.header}</th>
          ))}
          {renderActions && (
            <th>
              <span className="data-table__sr">{actionsLabel}</span>
            </th>
          )}
        </tr>
      </thead>

      <tbody>
        {rows.map((row, index) => (
          <tr className="data-table__row" key={getRowKey(row)} style={{ "--i": index }}>
            {columns.map((column) => (
              <td
                key={column.key}
                className={`data-table__cell ${column.primary ? "data-table__cell--primary" : ""}`.trim()}
                data-label={column.header}
              >
                {column.render(row)}
              </td>
            ))}
            {renderActions && (
              <td className="data-table__cell data-table__cell--actions">{renderActions(row)}</td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default DataTable;