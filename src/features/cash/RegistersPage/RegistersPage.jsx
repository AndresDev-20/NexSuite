import { useEffect, useMemo, useState } from "react";
import Button from "../../../components/ui/Button/Button";
import ConfirmDialog from "../../../components/feadback/ConfirmDialog/ConfirmDialog";
import StateMessage from "../../../components/feadback/StateMessage/StateMessage";
import useToast from "../../../components/feadback/Toast/useToast";
import useStatusToggle from "../../../hooks/useStatusToggle";
import usePermissions from "../../../features/auth/usePermissions";
import NoBranchesMessage from "../../../features/branches/NoBranchesMessage";
import useActiveBranch from "../../../features/branches/useActiveBranch";
import RegisterFormModal from "../../../features/cash/registers/RegisterFormModal";
import RegistersTable from "../../../features/cash/registers/RegistersTable";
import ClosuresSection from "../../../features/cash/registers/ClosuresSection";
import { useCashRegisters } from "../../../features/cash/useCash";
import "../../../styles/listPage.css";

const SKELETON_ITEMS = 4;

const RegistersPage = () => {
  const { registers, loading, error, getRegisters, createRegister, updateRegister, deleteRegister } = useCashRegisters();
  const { status: branchStatus, branches, hasBranches, activeBranchId, activeBranch } = useActiveBranch();
  const toast = useToast();
  const { can } = usePermissions();
  const canManage = can("cash-registers.manage");

  const [form, setForm] = useState({ open: false, register: null });
  const [deleting, setDeleting] = useState(null);

  const status = useStatusToggle({
    setActive: async (register, isactive) => {
      await updateRegister(register.id, { isactive });
      toast.success(isactive ? `${register.name} está activa.` : `${register.name} quedó inactiva.`);
    },
    activateError: "No se pudo activar la caja.",
  });

  useEffect(() => {
    getRegisters();
  }, [getRegisters]);

  // La sucursal activa del encabezado filtra la lista
  const rows = useMemo(
    () => registers.filter((register) => activeBranchId === null || register.branchId === activeBranchId),
    [registers, activeBranchId]
  );

  const closeForm = () => setForm((current) => ({ ...current, open: false }));
  const handleSave = async (payload) => {
    if (form.register) {
      await updateRegister(form.register.id, payload);
      toast.success("Caja actualizada.");
    } else {
      await createRegister(payload);
      toast.success(`Caja ${payload.name} creada.`);
    }
    closeForm();
  };

  const handleDelete = async () => {
    await deleteRegister(deleting.id);
    toast.success("Caja eliminada.");
    setDeleting(null);
  };

  const renderContent = () => {
    if (branchStatus === "ready" && !hasBranches) return <NoBranchesMessage />;
    if (loading) {
      return (
        <ul className="list-page__skeleton" aria-hidden="true">
          {Array.from({ length: SKELETON_ITEMS }, (_, index) => (
            <li className="list-page__skeleton-item" key={index} />
          ))}
        </ul>
      );
    }
    if (error) {
      return (
        <StateMessage tone="error" icon="alert" title="No pudimos cargar las cajas" text={error}>
          <Button variant="outline" icon="refresh" onClick={() => getRegisters()}>
            Reintentar
          </Button>
        </StateMessage>
      );
    }
    if (rows.length === 0) {
      return (
        <StateMessage icon="wallet" title="Aún no hay cajas" text="Crea las cajas (puntos de cobro) de cada sucursal.">
          {canManage && (
            <Button icon="plus" onClick={() => setForm({ open: true, register: null })}>
              Nueva caja
            </Button>
          )}
        </StateMessage>
      );
    }
    return (
      <RegistersTable
        registers={rows}
        canManage={canManage}
        onEdit={(register) => setForm({ open: true, register })}
        onToggleActive={status.toggle}
        onDelete={setDeleting}
      />
    );
  };

  return (
    <section className="list-page">
      <header className="list-page__header">
        <div>
          <h1 className="list-page__title">Cajas</h1>
          <p className="list-page__subtitle">
            Los puntos de cobro{activeBranch ? ` de ${activeBranch.name}` : " de cada sucursal"}, su horario, su base y los días sin abrir.
          </p>
        </div>
        {canManage && hasBranches && (
          <Button className="list-page__add" icon="plus" onClick={() => setForm({ open: true, register: null })}>
            Nueva caja
          </Button>
        )}
      </header>

      <div className="list-page__card">{renderContent()}</div>

      {hasBranches && <ClosuresSection branches={branches} activeBranchId={activeBranchId} canManage={canManage} />}

      <RegisterFormModal
        open={form.open}
        register={form.register}
        branches={branches}
        defaultBranchId={activeBranchId ?? (branches.length === 1 ? branches[0].id : null)}
        onClose={closeForm}
        onSubmit={handleSave}
      />

      <ConfirmDialog
        open={Boolean(status.deactivating)}
        title="Desactivar caja"
        message={status.deactivating && <>¿Desactivar <strong>{status.deactivating.name}</strong>? No se podrán abrir turnos en ella.</>}
        detail="Sus turnos anteriores se conservan. Puedes activarla de nuevo cuando quieras."
        confirmLabel="Desactivar"
        confirmIcon="lock"
        errorFallback="No se pudo desactivar la caja."
        onConfirm={status.confirmDeactivate}
        onClose={status.cancelDeactivate}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Eliminar caja"
        message={deleting && <>¿Eliminar <strong>{deleting.name}</strong>? Esta acción no se puede deshacer.</>}
        confirmLabel="Eliminar caja"
        errorFallback="No se pudo eliminar la caja."
        onConfirm={handleDelete}
        onClose={() => setDeleting(null)}
      />
    </section>
  );
};

export default RegistersPage;
