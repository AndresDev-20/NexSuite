import DataTable from "../../../components/tables/DataTable/DataTable";
import { RowAction, RowActions } from "../../../components/tables/RowActions/RowActions";
import { formatDateTime } from "../../administration/audit/auditOptions";
import "../cash.css";

const columns = [
  {
    key: "name",
    header: "Caja",
    primary: true,
    render: (register) => (
      <span className="cash-cell__name">
        <strong>{register.name}</strong>
        {!register.isActive && <span className="cash-tag">Inactiva</span>}
      </span>
    ),
  },
  { key: "branch", header: "Sucursal", render: (register) => register.branchName },
  {
    key: "session",
    header: "Turno",
    render: (register) =>
      register.openSession ? (
        <div className="cash-cell">
          <span className="cash-tag cash-tag--open">Abierta</span>
          <span className="cash-cell__secondary">
            {register.openSession.userName} · desde {formatDateTime(register.openSession.openedAt)}
          </span>
        </div>
      ) : (
        <span className="cash-cell__secondary">Sin turno abierto</span>
      ),
  },
];

/** Renombrar, activar/desactivar y eliminar (solo si nunca tuvo turnos). */
const RegistersTable = ({ registers, canManage, onEdit, onToggleActive, onDelete }) => (
  <DataTable
    caption="Cajas"
    columns={columns}
    rows={registers}
    getRowKey={(register) => register.id}
    renderActions={
      canManage
        ? (register) => (
            <RowActions>
              <RowAction icon="edit" label={`Renombrar ${register.name}`} onClick={() => onEdit(register)} />
              <RowAction
                icon={register.isActive ? "lock" : "check"}
                label={
                  register.isActive
                    ? register.openSession
                      ? `${register.name} tiene un turno abierto: no se puede desactivar`
                      : `Desactivar ${register.name}`
                    : `Activar ${register.name}`
                }
                disabled={register.isActive && Boolean(register.openSession)}
                onClick={() => onToggleActive(register)}
              />
              <RowAction
                icon="trash"
                tone="danger"
                label={register.hasHistory ? "Ya tuvo turnos: desactívala en lugar de eliminarla" : `Eliminar ${register.name}`}
                disabled={register.hasHistory}
                onClick={() => onDelete(register)}
              />
            </RowActions>
          )
        : undefined
    }
  />
);

export default RegistersTable;
