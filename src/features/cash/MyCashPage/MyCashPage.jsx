import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import Button from "../../../components/ui/Button/Button";
import Field from "../../../components/forms/Field/Field";
import Select from "../../../components/forms/Select/Select";
import { FormLayout } from "../../../components/forms/FormLayout/FormLayout";
import StateMessage from "../../../components/feadback/StateMessage/StateMessage";
import useToast from "../../../components/feadback/Toast/useToast";
import NoBranchesMessage from "../../../features/branches/NoBranchesMessage";
import useActiveBranch from "../../../features/branches/useActiveBranch";
import CashMovementModal from "../../../features/cash/sessions/CashMovementModal";
import SessionView from "../../../features/cash/sessions/SessionView";
import { useCashRegisters, useMyCash } from "../../../features/cash/useCash";
import CloseSessionModal from "../../../features/cash/sessions/CloseSessionModal";
import usePermissions from "../../../features/auth/usePermissions";
import getErrorMessage from "../../../utils/getErrorMessage";
import { formatCurrency } from "../../../utils/money";
import { sanitizeDecimal } from "../../../utils/validators";
import "../../../styles/listPage.css";
import "../cash.css";

/** Abrir turno: caja libre de mis sucursales (la sucursal activa, si hay) y la base contada. */
const OpenSessionForm = ({ registers, onOpen }) => {
  const [serverError, setServerError] = useState("");
  const [busy, setBusy] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ defaultValues: { idregister: registers.length === 1 ? String(registers[0].id) : "", openingamount: "", openingnotes: "" } });

  const submit = handleSubmit(async (values) => {
    setServerError("");
    setBusy(true);
    try {
      await onOpen({
        idregister: Number(values.idregister),
        openingamount: Number(values.openingamount),
        openingnotes: values.openingnotes.trim() || null,
      });
    } catch (error) {
      setServerError(getErrorMessage(error, "No se pudo abrir el turno. Inténtalo de nuevo."));
    } finally {
      setBusy(false);
    }
  });

  return (
    <div className="my-cash__open">
      <p className="my-cash__since">No tienes un turno abierto. Elige la caja y cuenta el efectivo con el que arrancas (la base).</p>
      <FormLayout onSubmit={submit} error={serverError}>
        <Select
          label="Caja"
          required
          placeholder="Selecciona la caja"
          options={registers.map((item) => ({ value: String(item.id), label: `${item.name} · ${item.branchName}` }))}
          data-autofocus
          error={errors.idregister?.message}
          {...register("idregister", { validate: (value) => value !== "" || "Elige la caja." })}
        />
        <Field
          label="Base (efectivo con el que arrancas)"
          required
          inputMode="decimal"
          autoComplete="off"
          maxLength={15}
          placeholder="0"
          onInput={sanitizeDecimal}
          error={errors.openingamount?.message}
          {...register("openingamount", { validate: (value) => (value !== "" && Number(value) >= 0) || "Escribe la base (puede ser 0)." })}
        />
        <Field label="Notas" maxLength={255} placeholder="Opcional. Ej: billetes de 10 y 20 mil" {...register("openingnotes")} />
        <div>
          <Button type="submit" icon="wallet" disabled={busy}>
            {busy ? "Abriendo…" : "Abrir turno"}
          </Button>
        </div>
      </FormLayout>
    </div>
  );
};

const MyCashPage = () => {
  const { session, loading, error, getMySession, openSession, addMovement, closeSession } = useMyCash();
  const { registers, loading: registersLoading, getRegisters } = useCashRegisters();
  const { status: branchStatus, hasBranches, activeBranchId } = useActiveBranch();
  const toast = useToast();
  const [movementType, setMovementType] = useState(null);
  const [closing, setClosing] = useState(false);
  // Elegir la caja para abrir un turno exige ver las cajas (cash-registers.read)
  const { can } = usePermissions();
  const canReadRegisters = can("cash-registers.read");

  useEffect(() => {
    getMySession();
    if (canReadRegisters) getRegisters();
  }, [getMySession, getRegisters, canReadRegisters]);

  // Cajas donde se puede abrir: activas, sin turno abierto y de la sucursal activa (si hay)
  const freeRegisters = useMemo(
    () =>
      registers.filter(
        (item) => item.isActive && !item.openSession && (activeBranchId === null || item.branchId === activeBranchId)
      ),
    [registers, activeBranchId]
  );

  const handleOpen = async (payload) => {
    const opened = await openSession(payload);
    toast.success(`Turno abierto en ${opened.registerName} con base de ${formatCurrency(opened.totals.opening)}.`);
    if (canReadRegisters) getRegisters();
  };

  const handleMovement = async (payload) => {
    const updated = await addMovement(session.id, payload);
    toast.success(
      `${payload.type === "ingreso" ? "Ingreso" : "Retiro"} registrado. Efectivo esperado: ${formatCurrency(updated.totals.expected)}.`
    );
    setMovementType(null);
  };

  const handleClose = async (payload) => {
    const closed = await closeSession(session.id, payload);
    setClosing(false);
    toast.success(
      closed.difference === 0
        ? `Turno cerrado: cuadró en ${formatCurrency(closed.countedAmount)}.`
        : `Turno cerrado: ${closed.difference > 0 ? "sobraron" : "faltaron"} ${formatCurrency(Math.abs(closed.difference))}.`
    );
    if (canReadRegisters) getRegisters();
  };

  const renderContent = () => {
    if (branchStatus === "ready" && !hasBranches) return <NoBranchesMessage />;
    if (loading || (canReadRegisters && registersLoading)) return <p className="my-cash__since">Cargando tu caja…</p>;
    if (error) {
      return (
        <StateMessage tone="error" icon="alert" title="No pudimos cargar tu caja" text={error}>
          <Button variant="outline" icon="refresh" onClick={() => getMySession()}>
            Reintentar
          </Button>
        </StateMessage>
      );
    }
    if (session) {
      return (
        <SessionView
          session={session}
          actions={
            <div className="my-cash__actions">
              <Button variant="outline" icon="plus" onClick={() => setMovementType("ingreso")}>
                Ingreso de efectivo
              </Button>
              <Button variant="outline" icon="wallet" onClick={() => setMovementType("retiro")}>
                Retiro de efectivo
              </Button>
              <Button icon="lock" onClick={() => setClosing(true)}>
                Cerrar turno
              </Button>
            </div>
          }
        />
      );
    }
    if (!canReadRegisters) {
      return (
        <StateMessage
          icon="lock"
          title="No puedes elegir una caja"
          text="Para abrir un turno necesitas también el permiso de consultar cajas. Pídeselo a un administrador."
        />
      );
    }
    if (freeRegisters.length === 0) {
      return (
        <StateMessage
          icon="wallet"
          title="No hay cajas libres"
          text={
            registers.length === 0
              ? "Tu sucursal aún no tiene cajas. Pide a un encargado que las cree en Caja → Cajas."
              : "Todas las cajas de la sucursal tienen un turno abierto o están inactivas."
          }
        />
      );
    }
    return <OpenSessionForm registers={freeRegisters} onOpen={handleOpen} />;
  };

  return (
    <section className="list-page">
      <header className="list-page__header">
        <div>
          <h1 className="list-page__title">Mi caja</h1>
          <p className="list-page__subtitle">Tu turno: la base, los ingresos y retiros de efectivo y lo que debería haber en la caja.</p>
        </div>
      </header>

      <div className="list-page__card">{renderContent()}</div>

      <CashMovementModal
        type={movementType}
        expected={session?.totals.expected ?? 0}
        onClose={() => setMovementType(null)}
        onSubmit={handleMovement}
      />

      <CloseSessionModal session={closing ? session : null} onClose={() => setClosing(false)} onSubmit={handleClose} />
    </section>
  );
};

export default MyCashPage;
