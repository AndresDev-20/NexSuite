import Icon from "../../../components/ui/Icon/Icon";
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

const BranchesTable = ({ branches }) => (
  <div className="branches-table">
    <table className="branches-table__element">
      <caption className="branches-table__sr">Listado de sucursales</caption>
      <thead>
        <tr>
          <th>Sucursal</th>
          <th>Dirección</th>
          <th>Contacto</th>
          <th>Usuarios</th>
        </tr>
      </thead>

      <tbody>
        {branches.map((branch, index) => {
          const hostname = branch.web ? getHostname(branch.web) : null;
          const visibleUsers = branch.users.slice(0, MAX_AVATARS);
          const hiddenUsers = branch.users.length - visibleUsers.length;

          return (
            <tr className="branches-table__row" key={branch.id} style={{ "--i": index }}>
              <td className="branches-table__cell branches-table__cell--main" data-label="Sucursal">
                <span className="branches-table__name">{branch.nameBranch}</span>
                {hostname && (
                  <a
                    className="branches-table__link"
                    href={branch.web}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Icon name="globe" className="branches-table__link-icon" />
                    {hostname}
                  </a>
                )}
              </td>

              <td className="branches-table__cell" data-label="Dirección">
                {branch.address ? (
                  <span className="branches-table__line">
                    <Icon name="pin" className="branches-table__line-icon" />
                    {branch.address}
                  </span>
                ) : (
                  EMPTY
                )}
              </td>

              <td className="branches-table__cell" data-label="Contacto">
                {branch.email || branch.number ? (
                  <div className="branches-table__contact">
                    {branch.email && (
                      <a className="branches-table__line" href={`mailto:${branch.email}`}>
                        <Icon name="mail" className="branches-table__line-icon" />
                        {branch.email}
                      </a>
                    )}
                    {branch.number && (
                      <a
                        className="branches-table__line"
                        href={`tel:${branch.number.replace(/[^\d+]/g, "")}`}
                      >
                        <Icon name="phone" className="branches-table__line-icon" />
                        {branch.number}
                      </a>
                    )}
                  </div>
                ) : (
                  EMPTY
                )}
              </td>

              <td className="branches-table__cell" data-label="Usuarios">
                <div className="branches-table__users">
                  {visibleUsers.length > 0 && (
                    <div className="branches-table__avatars">
                      {visibleUsers.map((user) => (
                        <span
                          className="branches-table__avatar"
                          key={user.id}
                          title={getFullName(user)}
                          aria-hidden="true"
                        >
                          {getInitials(user)}
                        </span>
                      ))}
                      {hiddenUsers > 0 && (
                        <span className="branches-table__avatar branches-table__avatar--more" aria-hidden="true">
                          +{hiddenUsers}
                        </span>
                      )}
                    </div>
                  )}
                  <span className="branches-table__count">{usersLabel(branch.users.length)}</span>
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);

export default BranchesTable;