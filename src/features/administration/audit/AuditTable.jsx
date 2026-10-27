import DataTable from "../../../components/tables/DataTable/DataTable";
import { RowAction, RowActions } from "../../../components/tables/RowActions/RowActions";
import { formatDateTime } from "./auditOptions";
import "./auditTable.css";

const EMPTY = "—";

const columns = [
  {
    key: "action",
    header: "Acción",
    primary: true,
    render: (log) => (
      <div className="audit-cell">
        <span className={`audit-cell__badge audit-cell__badge--${log.tone}`}>{log.actionLabel}</span>
        <span className="audit-cell__secondary">{formatDateTime(log.createdAt)}</span>
      </div>
    ),
  },
  {
    key: "user",
    header: "Usuario",
    render: (log) =>
      log.userName ? (
        <div className="audit-cell">
          <span>{log.userName}</span>
          {log.ip && <span className="audit-cell__secondary">IP {log.ip}</span>}
        </div>
      ) : (
        <span className="audit-cell__secondary">Sin sesión</span>
      ),
  },
  {
    key: "record",
    header: "Registro",
    render: (log) => (
      <span>
        {log.entityLabel}
        {log.entityId && <span className="audit-cell__secondary"> #{log.entityId}</span>}
      </span>
    ),
  },
  { key: "branch", header: "Sucursal", render: (log) => log.branchName || EMPTY },
];

const AuditTable = ({ logs, onView }) => (
  <DataTable
    caption="Registros de auditoría"
    columns={columns}
    rows={logs}
    getRowKey={(log) => log.id}
    renderActions={(log) => (
      <RowActions>
        <RowAction
          icon="eye"
          label={`Ver el detalle: ${log.actionLabel} · ${log.entityLabel}`}
          onClick={() => onView(log)}
        />
      </RowActions>
    )}
  />
);

export default AuditTable;
