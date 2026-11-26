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
      <div className="audit-cell audit-cell--action">
        <span className={`audit-cell__dot audit-cell__dot--${log.tone}`} aria-hidden="true" />
        <div className="audit-cell">
          <span className="audit-cell__action">{log.actionLabel}</span>
          <span className="audit-cell__secondary">
            {log.areaLabel} · {formatDateTime(log.createdAt)}
          </span>
        </div>
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
      <div className="audit-cell">
        <span>
          {log.entityLabel}
          {log.entityId && <span className="audit-cell__secondary"> #{log.entityId}</span>}
        </span>
        {log.reference && <span className="audit-cell__ref">{log.reference}</span>}
      </div>
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
          label={`Ver el detalle: ${log.actionLabel} · ${log.entityLabel}${log.entityId ? ` #${log.entityId}` : ""}`}
          onClick={() => onView(log)}
        />
      </RowActions>
    )}
  />
);

export default AuditTable;
