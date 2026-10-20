import Icon from "../../../components/ui/Icon/Icon";
import DataTable from "../../../components/tables/DataTable/DataTable";
import { RowAction, RowActions } from "../../../components/tables/RowActions/RowActions";
import { getFullName, getInitials } from "../../../utils/userDisplay";
import "./usersTable.css";

const EMPTY = "—";
const ccFormatter = new Intl.NumberFormat("es-CO");

const formatCc = (cc) => (cc ? ccFormatter.format(Number(cc)) : EMPTY);

/**
 * branchesByUser: Map(userId → [{ id, nameBranch }]) o null si todavía no se conocen
 * (en ese caso se oculta la columna y el botón de sucursales).
 */
const UsersTable = ({ users, currentUserId, branchesByUser, onEdit, onDelete, onBranches }) => {
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
            {user.email && (
              <a className="user-cell__link" href={`mailto:${user.email}`}>
                {user.email}
              </a>
            )}
          </div>
        </div>
      ),
    },
    { key: "cc", header: "Cédula", render: (user) => formatCc(user.cc) },
    {
      key: "phone",
      header: "Teléfono",
      render: (user) =>
        user.phone ? (
          <a className="user-cell__link" href={`tel:${user.phone.replace(/[^\d+]/g, "")}`}>
            <Icon name="phone" className="user-cell__link-icon" />
            {user.phone}
          </a>
        ) : (
          EMPTY
        ),
    },
    {
      key: "role",
      header: "Rol",
      render: (user) => (user.roleName ? <span className="user-cell__role">{user.roleName}</span> : EMPTY),
    },
  ];

  if (branchesByUser) {
    columns.push({
      key: "branches",
      header: "Sucursales",
      render: (user) => {
        const list = branchesByUser.get(user.id) ?? [];
        if (list.length === 0) return "Sin sucursal";

        return (
          <ul className="user-cell__branches">
            {list.map((branch) => (
              <li className="user-cell__branch" key={branch.id}>
                {branch.nameBranch}
              </li>
            ))}
          </ul>
        );
      },
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
            {branchesByUser && (
              <RowAction icon="store" label={`Sucursales de ${name}`} onClick={() => onBranches(user)} />
            )}
            <RowAction icon="edit" label={`Editar a ${name}`} onClick={() => onEdit(user)} />
            <RowAction
              icon="trash"
              tone="danger"
              label={isSelf ? "No puedes eliminar tu propio usuario" : `Eliminar a ${name}`}
              disabled={isSelf}
              onClick={() => onDelete(user)}
            />
          </RowActions>
        );
      }}
    />
  );
};

export default UsersTable;