import { useState } from "react";
import Button from "../../../components/ui/Button/Button";
import Switch from "../../../components/forms/Switch/Switch";
import Modal from "../../../components/feadback/Modal/Modal";
import useToast from "../../../components/feadback/Toast/useToast";
import getErrorMessage from "../../../utils/getErrorMessage";
import { getFullName } from "../../../utils/userDisplay";
import "./userBranchesModal.css";

const withToggle = (set, id, enabled) => {
  const next = new Set(set);
  if (enabled) next.add(id);
  else next.delete(id);
  return next;
};

/* Contenido (solo existe mientras el modal está abierto, así parte siempre del estado actual) */
const BranchesPanel = ({ user, branches, initialIds, onToggle, onClose }) => {
  const toast = useToast();
  const [assigned, setAssigned] = useState(() => new Set(initialIds));
  const [pending, setPending] = useState(() => new Set());

  // Cambio inmediato; si el servidor lo rechaza, se revierte
  const handleToggle = async (branchId, enable) => {
    setPending((current) => withToggle(current, branchId, true));
    setAssigned((current) => withToggle(current, branchId, enable));

    try {
      await onToggle(branchId, enable);
    } catch (error) {
      setAssigned((current) => withToggle(current, branchId, !enable));
      toast.error(getErrorMessage(error, "No se pudo actualizar la sucursal. El cambio se revirtió."));
    } finally {
      setPending((current) => withToggle(current, branchId, false));
    }
  };

  return (
    <div className="user-branches">
      <p className="user-branches__text">
        Marca las sucursales donde trabaja <strong>{getFullName(user)}</strong>. Los cambios se guardan al instante.
      </p>

      {branches.length === 0 ? (
        <p className="user-branches__empty">Aún no hay sucursales. Crea una primero en Sucursales.</p>
      ) : (
        <ul className="user-branches__list">
          {branches.map((branch) => (
            <li key={branch.id}>
              <Switch
                label={branch.nameBranch}
                checked={assigned.has(branch.id)}
                disabled={pending.has(branch.id)}
                onChange={(checked) => handleToggle(branch.id, checked)}
              />
            </li>
          ))}
        </ul>
      )}

      <div className="user-branches__actions">
        <Button onClick={onClose} data-autofocus>
          Listo
        </Button>
      </div>
    </div>
  );
};

/**
 * onToggle(branchId, enable) debe ser async y lanzar el error si algo falla.
 * assignedIds: ids de las sucursales que ya tiene el usuario al abrir.
 */
const UserBranchesModal = ({ open, user, branches, assignedIds, onToggle, onClose }) => (
  <Modal open={open} title="Sucursales del usuario" onClose={onClose}>
    {user && (
      <BranchesPanel
        user={user}
        branches={branches}
        initialIds={assignedIds}
        onToggle={onToggle}
        onClose={onClose}
      />
    )}
  </Modal>
);

export default UserBranchesModal;