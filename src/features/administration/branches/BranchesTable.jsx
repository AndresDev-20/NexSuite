import Icon from "../../../components/ui/Icon/Icon";
import DataTable from "../../../components/tables/DataTable/DataTable";
import { RowAction, RowActions } from "../../../components/tables/RowActions/RowActions";
import { getFullName, getInitials } from "../../../utils/userDisplay";
import "./branchesTable.css";

const MAX_AVATARS = 3;
const EMPTY = "—";

/** Devuelve el dominio solo si la URL es http(s); evita enlaces peligrosos. */
const getHostname = (url) => {
  try {
    const { protocol, hostname } = new URL(url);
    return protocol === "http:" || protocol === "https:" ? hostname : null;
  } catch {
    return null;
  }
};

const usersLabel = (count) => {
  if (count === 0) return "Sin usuarios";
  return `${count} ${count === 1 ? "usuario" : "usuarios"}`;
};

const columns = [
  {
    key: "branch",
    header: "Sucursal",
    primary: true,
    render: (branch) => {
      const hostname = branch.web ? getHostname(branch.web) : null;

      return (
        <div className="branch-cell">
          <span className="branch-cell__name">{branch.nameBranch}</span>
          {hostname && (
            <a className="branch-cell__link" href={branch.web} target="_blank" rel="noopener noreferrer">
              <Icon name="globe" className="branch-cell__link-icon" />
              {hostname}
            </a>
          )}
        </div>
      );
    },
  },
  {
    key: "address",
    header: "Dirección",
    render: (branch) =>
      branch.address ? (
        <span className="branch-cell__line">
          <Icon name="pin" className="branch-cell__link-icon" />
          {branch.address}
        </span>
      ) : (
        EMPTY
      ),
  },
  {
    key: "contact",
    header: "Contacto",
    render: (branch) => {
      if (!branch.email && !branch.number) return EMPTY;

      return (
        <div className="branch-cell__contact">
          {branch.email && (
            <a className="branch-cell__line" href={`mailto:${branch.email}`}>
              <Icon name="mail" className="branch-cell__link-icon" />
              {branch.email}
            </a>
          )}
          {branch.number && (
            <a className="branch-cell__line" href={`tel:${branch.number.replace(/[^\d+]/g, "")}`}>
              <Icon name="phone" className="branch-cell__link-icon" />
              {branch.number}
            </a>
          )}
        </div>
      );
    },
  },
  {
    key: "users",
    header: "Usuarios",
    render: (branch) => {
      const visible = branch.users.slice(0, MAX_AVATARS);
      const hidden = branch.users.length - visible.length;

      return (
        <div className="branch-cell__users">
          {visible.length > 0 && (
            <div className="branch-cell__avatars">
              {visible.map((user) => (
                <span className="branch-cell__avatar" key={user.id} title={getFullName(user)} aria-hidden="true">
                  {getInitials(user)}
                </span>
              ))}
              {hidden > 0 && (
                <span className="branch-cell__avatar branch-cell__avatar--more" aria-hidden="true">
                  +{hidden}
                </span>
              )}
            </div>
          )}
          <span className="branch-cell__count">{usersLabel(branch.users.length)}</span>
        </div>
      );
    },
  },
];

const BranchesTable = ({ branches, onEdit, onDelete }) => (
  <DataTable
    caption="Listado de sucursales"
    columns={columns}
    rows={branches}
    getRowKey={(branch) => branch.id}
    renderActions={(branch) => (
      <RowActions>
        <RowAction icon="edit" label={`Editar ${branch.nameBranch}`} onClick={() => onEdit(branch)} />
        <RowAction
          icon="trash"
          tone="danger"
          label={`Eliminar ${branch.nameBranch}`}
          onClick={() => onDelete(branch)}
        />
      </RowActions>
    )}
  />
);

export default BranchesTable;