import DataTable from "../../../components/tables/DataTable/DataTable";
import { RowAction, RowActions } from "../../../components/tables/RowActions/RowActions";
import { formatDateTime } from "../../administration/audit/auditOptions";
import { formatCurrency } from "../../../utils/money";
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
    key: "schedule",
    header: "Horario y base",
    render: (register) => (
      <div className="cash-cell">
        <span>{register.autoOpen ? `Abre sola ${register.openTime} – ${register.closeTime}` : "Se abre a mano"}</span>
        <span className="cash-cell__secondary">Base {formatCurrency(register.openingBase)}</span>
      </div>
    ),
  },
  {
    key: "session",
    header: "Turno",
    render: (register) => (
      <div className="cash-cell">
        {register.openSession ? (
          <>
            <span className="cash-tag cash-tag--open">Vendiendo</span>
            <span className="cash-cell__secondary">
              {register.openSession.userName} · desde {formatDateTime(register.openSession.openedAt)}
            </span>
          </>
        ) : (
          <span className="cash-cell__secondary">Sin turno abierto</span>
        )}
        {register.pendingSessions.length > 0 && (
          <span className="cash-tag cash-tag--pending">
            {register.pendingSessions.length === 1 ? "1 turno por contar" : `${register.pendingSessions.length} turnos por contar`}
          </span>
        )}
      </div>
    ),
  },
];

/** Editar (nombre, horario y base), activar/desactivar y eliminar (solo si nunca tuvo turnos). */
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
              <RowAction icon="edit" label={`Editar ${register.name} (nombre, horario y base)`} onClick={() => onEdit(register)} />
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
