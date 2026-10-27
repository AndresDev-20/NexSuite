import DataTable from "../../../components/tables/DataTable/DataTable";
import { RowAction, RowActions } from "../../../components/tables/RowActions/RowActions";
import { getFullName, getInitials } from "../../../utils/userDisplay";
import "./usersTable.css";

const EMPTY = "—";

/** Una sucursal se muestra completa; con más, la primera y cuántas faltan. El detalle las lista todas. */
const BranchesSummary = ({ list }) => {
  if (list.length === 0) return <span className="user-cell__muted">Sin sucursal</span>;

  return (
    <span className="user-cell__branches">
      <span className="user-cell__branch">{list[0].nameBranch}</span>
      {list.length > 1 && <span className="user-cell__branch user-cell__branch--more">+{list.length - 1}</span>}
    </span>
  );
};

/**
 * La tabla muestra solo lo necesario para ubicar a una persona; cédula, teléfono y edad están en "Ver".
 * branchesByUser: Map(userId → [{ id, nameBranch }]) o null si todavía no se conocen (se oculta la columna).
 */
/** canEdit(user): editar y activar/desactivar (permiso, y a un Developer solo lo cambia otro Developer). */
const UsersTable = ({ users, currentUserId, branchesByUser, canEdit, onView, onEdit, onToggleActive }) => {
  const columns = [
    {
      key: "user",
      header: "Usuario",
      primary: true,
      render: (user) => (
        <div className="user-cell">
          <span className="user-cell__avatar" aria-hidden="true">
            {getInitials(user)}
          </span>
          <div className="user-cell__text">
            <span className="user-cell__name">
              {getFullName(user)}
              {user.id === currentUserId && <span className="user-cell__you">Tú</span>}
            </span>
            {user.email && <span className="user-cell__email">{user.email}</span>}
          </div>
        </div>
      ),
    },
    {
      key: "role",
      header: "Rol",
      render: (user) => (user.roleName ? <span className="user-cell__role">{user.roleName}</span> : EMPTY),
    },
    {
      key: "status",
      header: "Estado",
      render: (user) => (
        <span className={`user-cell__status ${user.isActive ? "" : "user-cell__status--inactive"}`.trim()}>
          {user.isActive ? "Activo" : "Inactivo"}
        </span>
      ),
    },
  ];

  if (branchesByUser) {
    columns.push({
      key: "branches",
      header: "Sucursales",
      render: (user) => <BranchesSummary list={branchesByUser.get(user.id) ?? []} />,
    });
  }

  return (
    <DataTable
      caption="Listado de usuarios"
      columns={columns}
      rows={users}
      getRowKey={(user) => user.id}
      renderActions={(user) => {
        const name = getFullName(user);
        const isSelf = user.id === currentUserId;

        return (
          <RowActions>
            <RowAction icon="eye" label={`Ver a ${name}`} onClick={() => onView(user)} />
            {canEdit(user) && <RowAction icon="edit" label={`Editar a ${name}`} onClick={() => onEdit(user)} />}
            {canEdit(user) && (
              <RowAction
                icon={user.isActive ? "lock" : "check"}
                label={
                  isSelf
                    ? "No puedes desactivar tu propio usuario"
                    : user.isActive
                      ? `Desactivar a ${name}`
                      : `Activar a ${name}`
                }
                disabled={isSelf}
                onClick={() => onToggleActive(user)}
              />
            )}
          </RowActions>
        );
      }}
    />
  );
};

export default UsersTable;
