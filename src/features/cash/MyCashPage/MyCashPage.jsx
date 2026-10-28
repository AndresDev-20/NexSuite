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
import CloseSessionModal from "../../../features/cash/sessions/CloseSessionModal";
import { useCashRegisters, useMyCash, useTodayCash } from "../../../features/cash/useCash";
import usePermissions from "../../../features/auth/usePermissions";
import { getUser } from "../../../utils/session";
import getErrorMessage from "../../../utils/getErrorMessage";
import { formatCurrency } from "../../../utils/money";
import { sanitizeDecimal } from "../../../utils/validators";
import "../../../styles/listPage.css";
import "../cash.css";

const timeOf = (iso) => new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", hour: "numeric", minute: "2-digit" }).format(new Date(iso));

/** Abrir a mano (un día especial, o una caja que no abre sola): la caja y la base contada. */
const OpenSessionForm = ({ registers, onOpen }) => {
  const [serverError, setServerError] = useState("");
  const [busy, setBusy] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: {
      idregister: registers.length === 1 ? String(registers[0].id) : "",
      openingamount: registers.length === 1 ? String(registers[0].openingBase) : "",
      openingnotes: "",
    },
  });

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

  const registerField = register("idregister", { validate: (value) => value !== "" || "Elige la caja." });

  return (
    <div className="my-cash__open">
      <FormLayout onSubmit={submit} error={serverError}>
        <Select
          label="Caja"
          required
          placeholder="Selecciona la caja"
          options={registers.map((item) => ({ value: String(item.id), label: `${item.name} · ${item.branchName}` }))}
          error={errors.idregister?.message}
          {...registerField}
          onChange={(event) => {
            registerField.onChange(event);
            const chosen = registers.find((item) => String(item.id) === event.target.value);
            if (chosen) setValue("openingamount", String(chosen.openingBase));
          }}
        />
        <Field
          label="Base (efectivo con el que arranca)"
          required
          inputMode="decimal"
          autoComplete="off"
          maxLength={15}
          placeholder="0"
          onInput={sanitizeDecimal}
          error={errors.openingamount?.message}
          {...register("openingamount", { validate: (value) => (value !== "" && Number(value) >= 0) || "Escribe la base (puede ser 0)." })}
        />
        <Field label="Notas" maxLength={255} placeholder="Opcional. Ej: abre el domingo por temporada" {...register("openingnotes")} />
        <div>
          <Button type="submit" icon="wallet" disabled={busy}>
            {busy ? "Abriendo…" : "Abrir turno"}
          </Button>
        </div>
      </FormLayout>
    </div>
  );
};

/** Una caja de hoy: si está vendiendo o por contar, desde cuándo y (con permiso) cuánto debería haber. */
const TodayCard = ({ session, canCount, canMove, onCount, onMovement }) => {
  const selling = session.status === "abierta";
  return (
    <article className={`today-cash ${selling ? "" : "today-cash--pending"}`.trim()}>
      <header className="today-cash__head">
        <div>
          <p className="my-cash__register">
            {session.registerName} · {session.branchName}
          </p>
          <p className="my-cash__since">
            {session.auto ? "Abrió sola" : `Turno de ${session.userName}`} a las {timeOf(session.openedAt)} con {formatCurrency(session.openingAmount)}
          </p>
        </div>
        <span className={`cash-tag ${selling ? "cash-tag--open" : "cash-tag--pending"}`}>{selling ? "Vendiendo" : "Por contar"}</span>
      </header>

      {selling ? (
        <p className="today-cash__note">
          {session.registerCloseTime ? `A las ${session.registerCloseTime} deja de vender` : "Cuando deje de vender"}; después se cuenta el efectivo.
        </p>
      ) : (
        <p className="today-cash__note today-cash__note--pending">
          Dejó de vender{session.salesClosedAt ? ` a las ${timeOf(session.salesClosedAt)}` : ""}; cuenta el efectivo: quedan{" "}
          {formatCurrency(session.registerBase ?? session.openingAmount)} en la caja y el resto se le entrega al administrador.
        </p>
      )}

      {session.totals && (
        <dl className="today-cash__totals">
          <div>
            <dt>Ventas en efectivo</dt>
            <dd>{formatCurrency(session.totals.sales)}</dd>
          </div>
          <div>
            <dt>Ingresos − retiros</dt>
            <dd>{formatCurrency(session.totals.income - session.totals.withdrawals)}</dd>
          </div>
          <div className="today-cash__expected">
            <dt>Debería haber</dt>
            <dd>{formatCurrency(session.totals.expected)}</dd>
          </div>
        </dl>
      )}

      {(canCount || canMove) && (
        <div className="my-cash__actions">
          {canMove && (
            <>
              <Button variant="outline" icon="plus" onClick={() => onMovement(session, "ingreso")}>
                Ingreso
              </Button>
              <Button variant="outline" icon="wallet" onClick={() => onMovement(session, "retiro")}>
                Retiro
              </Button>
            </>
          )}
          {canCount && (
            <Button icon="lock" variant={selling ? "outline" : undefined} onClick={() => onCount(session)}>
              {selling ? "Contar y cerrar ya" : "Contar la caja"}
            </Button>
          )}
        </div>
      )}
    </article>
  );
};

const MyCashPage = () => {
  const { sessions, loading, error, getToday, countSession } = useTodayCash();
  const { openSession, addMovement } = useMyCash();
  const { registers, getRegisters } = useCashRegisters();
  const { status: branchStatus, hasBranches, activeBranchId } = useActiveBranch();
  const toast = useToast();
  const { can } = usePermissions();
  const me = getUser()?.id;
  const canReadRegisters = can("cash-registers.read");
  const canCloseAny = can("cash-sessions.close-any");
  const [counting, setCounting] = useState(null);
  const [movement, setMovement] = useState(null); // { session, type }
  const [lastCount, setLastCount] = useState(null);

  useEffect(() => {
    getToday();
    if (canReadRegisters) getRegisters();
  }, [getToday, getRegisters, canReadRegisters]);

  const visible = useMemo(
    () => sessions.filter((session) => activeBranchId === null || session.branchId === activeBranchId),
    [sessions, activeBranchId]
  );

  // Abrir a mano: las cajas que no abren solas (quien atiende caja) o cualquiera libre (administrador)
  const freeRegisters = useMemo(
    () =>
      registers.filter(
        (item) => item.isActive && !item.openSession && (!item.autoOpen || canCloseAny) && (activeBranchId === null || item.branchId === activeBranchId)
      ),
    [registers, activeBranchId, canCloseAny]
  );

  // El turno propio lo cuenta su dueño; el de la caja, quien atiende caja; cualquiera, el administrador
  const canCount = (session) => canCloseAny || session.userId === me || (session.userId === null && session.status === "por_contar");
  // A la mitad del día (aún vendiendo) solo cierra antes de hora su dueño o un administrador
  const canCountNow = (session) => (session.status === "abierta" ? canCloseAny || session.userId === me : canCount(session));
  const canMove = (session) => session.status === "abierta" && (session.userId ? session.userId === me : canCloseAny);

  const refresh = () => {
    getToday({ silent: true });
    if (canReadRegisters) getRegisters();
  };

  const handleOpen = async (payload) => {
    const opened = await openSession(payload);
    toast.success(`Turno abierto en ${opened.registerName} con base de ${formatCurrency(opened.openingAmount ?? payload.openingamount)}.`);
    refresh();
  };

  const handleMovement = async (payload) => {
    const updated = await addMovement(movement.session.id, payload);
    // A ciegas (A8) no se dice cuánto debería haber
    const label = payload.type === "ingreso" ? "Ingreso" : "Retiro";
    toast.success(updated.totals ? `${label} registrado. Debería haber ${formatCurrency(updated.totals.expected)}.` : `${label} registrado.`);
    setMovement(null);
    refresh();
  };

  const handleCount = async (payload) => {
    const { session, message } = await countSession(counting.id, payload);
    setCounting(null);
    setLastCount(session);
    toast.success(message ?? "Caja contada.");
    if (canReadRegisters) getRegisters();
  };

  const renderToday = () => {
    if (loading) return <p className="my-cash__since">Cargando la caja de hoy…</p>;
    if (error) {
      return (
        <StateMessage tone="error" icon="alert" title="No pudimos cargar la caja de hoy" text={error}>
          <Button variant="outline" icon="refresh" onClick={() => getToday()}>
            Reintentar
          </Button>
        </StateMessage>
      );
    }
    if (visible.length === 0) {
      return (
        <StateMessage
          icon="wallet"
          title="No hay cajas abiertas"
          text="Las cajas abren solas a su hora (normalmente 8:00 a. m.). Si hoy es un día especial, un administrador puede abrirla a mano."
        />
      );
    }
    return (
      <div className="today-cash__grid">
        {visible.map((session) => (
          <TodayCard
            key={session.id}
            session={session}
            canCount={canCountNow(session)}
            canMove={canMove(session)}
            onCount={setCounting}
            onMovement={(target, type) => setMovement({ session: target, type })}
          />
        ))}
      </div>
    );
  };

  return (
    <section className="list-page">
      <header className="list-page__header">
        <div>
          <h1 className="list-page__title">Mi caja de hoy</h1>
          <p className="list-page__subtitle">Las cajas de tu sucursal: si están vendiendo o por contar, y el conteo al cierre.</p>
        </div>
      </header>

      {branchStatus === "ready" && !hasBranches ? (
        <div className="list-page__card">
          <NoBranchesMessage />
        </div>
      ) : (
        <>
          {lastCount && (
            <div className="list-page__card handover-card" role="status">
              <div>
                <p className="my-cash__register">{lastCount.registerName}: caja contada</p>
                <p className="my-cash__since">
                  Contaste {formatCurrency(lastCount.countedAmount)}
                  {lastCount.difference !== null && lastCount.difference !== 0 && (lastCount.totals || canCloseAny)
                    ? ` (${lastCount.difference > 0 ? "sobraron" : "faltaron"} ${formatCurrency(Math.abs(lastCount.difference))})`
                    : ""}
                  . Quedan {formatCurrency(lastCount.keptAmount)} en la caja para mañana.
                </p>
              </div>
              <div className="handover-card__amount">
                <span>Entrega al administrador</span>
                <strong>{formatCurrency(lastCount.handoverAmount)}</strong>
              </div>
              <Button variant="outline" icon="check" onClick={() => setLastCount(null)}>
                Listo
              </Button>
            </div>
          )}

          <div className="list-page__card">{renderToday()}</div>

          {canReadRegisters && freeRegisters.length > 0 && (
            <div className="list-page__card">
              <h2 className="cash-section-title">Abrir una caja a mano</h2>
              <p className="my-cash__since">
                {canCloseAny ? "Para un día especial o si una caja no abrió sola." : "Las cajas que no abren solas se abren aquí, con la base contada."}
              </p>
              <OpenSessionForm registers={freeRegisters} onOpen={handleOpen} />
            </div>
          )}
        </>
      )}

      <CashMovementModal
        type={movement?.type ?? null}
        expected={movement?.session.totals ? movement.session.totals.expected : null}
        onClose={() => setMovement(null)}
        onSubmit={handleMovement}
      />

      <CloseSessionModal session={counting} base={counting?.registerBase ?? null} onClose={() => setCounting(null)} onSubmit={handleCount} />

    </section>
  );
};

export default MyCashPage;
