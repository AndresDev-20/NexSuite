import { useMemo, useState } from "react";
import Select from "../../../components/forms/Select/Select";
import SearchInput from "../../../components/forms/SearchInput/SearchInput";
import StateMessage from "../../../components/feadback/StateMessage/StateMessage";
import DataTable from "../../../components/tables/DataTable/DataTable";
import Pagination from "../../../components/tables/Pagination/Pagination";

const PAGE_SIZE = 15;

/**
 * Tabla del balance que aguanta muchos datos: búsqueda, orden y páginas de 15, con los totales al
 * pie (de todas las filas que cumplen la búsqueda, no solo de la página).
 *
 * columns: [{ key, header, render(row), primary?, sortValue?(row) }] — las que tienen sortValue
 *   se pueden elegir en "Ordenar por" (números de mayor a menor, textos de la A a la Z).
 * searchText(row): texto donde buscar (sin él, no hay búsqueda).
 * totals(rows): [{ label, value }] para el pie.
 */
const BalanceTable = ({ caption, columns, rows, getRowKey, searchText, totals, defaultSort, emptyText, label = "filas" }) => {
  const sortable = columns.filter((column) => column.sortValue);
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState(defaultSort ?? sortable[0]?.key ?? "");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const found = needle && searchText ? rows.filter((row) => searchText(row).toLowerCase().includes(needle)) : rows;
    const column = sortable.find((candidate) => candidate.key === sortKey);
    if (!column) return found;
    return [...found].sort((a, b) => {
      const left = column.sortValue(a);
      const right = column.sortValue(b);
      return typeof left === "number" ? right - left : String(left).localeCompare(String(right), "es");
    });
  }, [rows, query, searchText, sortable, sortKey]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const shown = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  return (
    <div className="balance-table">
      {(searchText || sortable.length > 1) && rows.length > 0 && (
        <div className="balance-table__tools">
          {searchText && (
            <SearchInput
              value={query}
              placeholder="Buscar…"
              onChange={(value) => {
                setQuery(value);
                setPage(1);
              }}
            />
          )}
          {sortable.length > 1 && (
            <Select
              label="Ordenar por"
              options={sortable.map((column) => ({ value: column.key, label: column.header }))}
              value={sortKey}
              onChange={(event) => {
                setSortKey(event.target.value);
                setPage(1);
              }}
            />
          )}
        </div>
      )}

      {filtered.length === 0 ? (
        <StateMessage icon="search" title={rows.length === 0 ? "Sin datos" : "Nada coincide"} text={rows.length === 0 ? emptyText : "Prueba con otra búsqueda."} />
      ) : (
        <>
          <DataTable caption={caption} columns={columns} rows={shown} getRowKey={getRowKey} />
          {totals && (
            <dl className="balance-table__totals">
              {totals(filtered).map((item) => (
                <div key={item.label}>
                  <dt>{item.label}</dt>
                  <dd>{item.value}</dd>
                </div>
              ))}
            </dl>
          )}
          <Pagination page={current} pages={pages} total={filtered.length} label={label} onChange={setPage} />
        </>
      )}
    </div>
  );
};

export default BalanceTable;
