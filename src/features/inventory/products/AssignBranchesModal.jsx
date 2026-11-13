import { useState } from "react";
import Button from "../../../components/ui/Button/Button";
import { FormActions, FormLayout } from "../../../components/forms/FormLayout/FormLayout";
import Modal from "../../../components/feadback/Modal/Modal";
import getErrorMessage from "../../../utils/getErrorMessage";
import BranchAssignmentFields from "./BranchAssignmentFields";
import useBranchAssignment from "./useBranchAssignment";
import "./assignBranchesModal.css";

/* ---------- Formulario (solo existe mientras el modal está abierto) ---------- */
const AssignBranchesForm = ({ product, branches, stocked, suppliers, suppliersHint, fromCreate, busy, onCancel, onSubmit }) => {
  const assignment = useBranchAssignment({ hasSerial: product.hasSerial, branches, suppliers, defaultSupplierId: product.supplierId });
  const [serverError, setServerError] = useState("");
  const { rows, total, hasErrors, isImei } = assignment;

  const submit = async (event) => {
    event.preventDefault();
    assignment.setSubmitted(true);
    setServerError("");
    if (rows.length === 0 || hasErrors) {
      setServerError(rows.length === 0 ? "Elige al menos una sucursal." : "Corrige los datos marcados antes de asignar.");
      return;
    }
    try {
      await onSubmit(assignment.toPayload());
    } catch (error) {
      setServerError(getErrorMessage(error, "No se pudo asignar el producto. Inténtalo de nuevo."));
    }
  };

  return (
    <FormLayout onSubmit={submit} error={serverError}>
      <p className="assign-branches__intro">
        {fromCreate && <strong>{product.name} se creó. </strong>}
        Elige las sucursales a las que llega y cuánto recibe cada una
        {product.hasSerial ? `, con el ${isImei ? "IMEI" : "serial"} de cada unidad.` : "."}
      </p>

      <BranchAssignmentFields assignment={assignment} suppliersHint={suppliersHint} stocked={stocked} />

      <FormActions>
        <Button variant="outline" onClick={onCancel} disabled={busy}>
          {fromCreate ? "Asignar después" : "Cancelar"}
        </Button>
        <Button type="submit" icon="check" disabled={busy || rows.length === 0}>
          {busy ? "Asignando…" : total > 0 ? `Asignar ${total} ${total === 1 ? "unidad" : "unidades"}` : "Asignar"}
        </Button>
      </FormActions>
    </FormLayout>
  );
};

/**
 * Carga inicial de un producto: a qué sucursales llega y cuánto (con serial, un identificador
 * por unidad y el ingreso una sola vez). Solo para productos pendientes de asignar.
 * product: producto normalizado (useProducts) o null. branches: [{ id, name }] del usuario.
 * fromCreate: se abre justo después de crear el producto ("Asignar después" en vez de Cancelar).
 * stocked: { [idbranch]: cantidad } de las sucursales donde ya tiene existencias (no se asignan: se ajustan).
 * onSubmit(payload) debe ser async y lanzar el error si algo falla.
 */
const AssignBranchesModal = ({ product, branches, stocked = {}, suppliers, suppliersHint, fromCreate = false, onClose, onSubmit }) => {
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (payload) => {
    setBusy(true);
    try {
      await onSubmit(payload);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={Boolean(product)} icon="store" title="Asignar a sucursales" subtitle={product?.name} onClose={onClose} busy={busy}>
      {product && (
        <AssignBranchesForm
          key={product.id}
          product={product}
          branches={branches}
          stocked={stocked ?? {}}
          suppliers={suppliers}
          suppliersHint={suppliersHint}
          fromCreate={fromCreate}
          busy={busy}
          onCancel={onClose}
          onSubmit={handleSubmit}
        />
      )}
    </Modal>
  );
};

export default AssignBranchesModal;
