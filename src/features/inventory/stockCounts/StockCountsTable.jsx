import DataTable from "../../../components/tables/DataTable/DataTable";
import { RowAction, RowActions } from "../../../components/tables/RowActions/RowActions";
import { formatDateTime } from "../../administration/audit/auditOptions";
import CountStatusBadge from "./CountStatusBadge";
import "./stockCounts.css";

const columns = [
  {
    key: "number",
    header: "Conteo",
    primary: true,
    render: (count) => (
      <div className="count-cell">
        <strong className="count-cell__number">{count.number}</strong>
        <span className="count-cell__secondary">{formatDateTime(count.createdAt)}</span>
      </div>
    ),
  },
  {
    key: "scope",
    header: "Qué se cuenta",
    render: (count) => (
      <div className="count-cell">
        <span>{count.branchName}</span>
        <span className="count-cell__secondary">{count.categoryName || "Toda la sucursal"}</span>
      </div>
    ),
  },
  {
    key: "progress",
    header: "Avance",
    render: (count) => (
      <div className="count-cell">
        <span>
          {count.progress.counted} de {count.progress.total} contados
        </span>
        {count.differences > 0 && (
          <span className="count-cell__secondary count-cell__alert">
            {count.differences} {count.differences === 1 ? "diferencia" : "diferencias"}
          </span>
        )}
      </div>
    ),
  },
  { key: "status", header: "Estado", render: (count) => <CountStatusBadge status={count.status} /> },
  { key: "user", header: "Creado por", render: (count) => count.createdBy ?? "—" },
];

const StockCountsTable = ({ counts, onOpen }) => (
  <DataTable
    caption="Conteos de inventario"
    columns={columns}
    rows={counts}
    getRowKey={(count) => count.id}
    renderActions={(count) => (
      <RowActions>
        <RowAction
          icon={count.status === "en_conteo" ? "edit" : "eye"}
          label={count.status === "en_conteo" ? `Contar ${count.number}` : `Ver ${count.number}`}
          onClick={() => onOpen(count)}
        />
      </RowActions>
    )}
  />
);

export default StockCountsTable;
