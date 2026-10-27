import { useId } from "react";
import Icon from "../../components/ui/Icon/Icon";
import useActiveBranch from "./useActiveBranch";
import "./branchSelector.css";

const ALL = "all";

/**
 * Sucursal activa (encabezado y menú móvil). Con una sola sucursal la muestra fija;
 * con varias deja elegir una o "Todas mis sucursales". Sin sucursales no se muestra.
 */
const BranchSelector = ({ className = "" }) => {
  const id = useId();
  const { status, branches, activeBranchId, setActiveBranch } = useActiveBranch();

  if (status !== "ready" || branches.length === 0) return null;

  if (branches.length === 1) {
    return (
      <div className={`branch-selector branch-selector--single ${className}`.trim()} title="Tu sucursal">
        <Icon name="store" className="branch-selector__icon" />
        <span className="branch-selector__name">{branches[0].name}</span>
      </div>
    );
  }

  return (
    <div className={`branch-selector ${className}`.trim()}>
      <Icon name="store" className="branch-selector__icon" />
      <label htmlFor={id} className="branch-selector__label">
        Sucursal activa
      </label>
      <select
        id={id}
        className="branch-selector__select"
        value={activeBranchId === null ? ALL : String(activeBranchId)}
        onChange={(event) => setActiveBranch(event.target.value === ALL ? null : Number(event.target.value))}
      >
        <option value={ALL}>Todas mis sucursales</option>
        {branches.map((branch) => (
          <option key={branch.id} value={branch.id}>
            {branch.name}
          </option>
        ))}
      </select>
      <Icon name="chevron" className="branch-selector__chevron" />
    </div>
  );
};

export default BranchSelector;
