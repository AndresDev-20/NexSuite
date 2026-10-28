import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import Button from "../../../components/ui/Button/Button";
import Field from "../../../components/forms/Field/Field";
import Select from "../../../components/forms/Select/Select";
import ConfirmDialog from "../../../components/feadback/ConfirmDialog/ConfirmDialog";
import useToast from "../../../components/feadback/Toast/useToast";
import { formatDay } from "../../purchases/orders/orderOptions";
import { todayInColombia } from "../../../utils/dates";
import getErrorMessage from "../../../utils/getErrorMessage";
import { useBranchClosures } from "../useCash";
import "../cash.css";

/** Marcar un día sin abrir: sucursal, fecha (hoy o después) y motivo. */
const ClosureForm = ({ branches, defaultBranchId, onAdd }) => {
  const [serverError, setServerError] = useState("");
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { idbranch: defaultBranchId ? String(defaultBranchId) : "", date: "", reason: "" } });

  const submit = handleSubmit(async (values) => {
    setServerError("");
    try {
      await onAdd({ idbranch: Number(values.idbranch), date: values.date, ...(values.reason.trim() && { reason: values.reason.trim() }) });
      reset({ ...values, date: "", reason: "" });
    } catch (error) {
      setServerError(getErrorMessage(error, "No se pudo guardar el día sin abrir."));
    }
  });

  return (
    <form className="closures__form" onSubmit={submit} noValidate>
      <Select
        label="Sucursal"
        required
        placeholder="Elige la sucursal"
        options={branches.map((branch) => ({ value: String(branch.id), label: branch.name }))}
        error={errors.idbranch?.message}
        {...register("idbranch", { validate: (value) => value !== "" || "Elige la sucursal." })}
      />
      <Field
        label="Día"
        type="date"
        required
        min={todayInColombia()}
        error={errors.date?.message}
        {...register("date", { validate: (value) => (value !== "" && value >= todayInColombia()) || "Elige hoy o un día que viene." })}
      />
      <Field label="Motivo" maxLength={120} placeholder="Opcional. Ej: festivo, inventario" {...register("reason")} />
      <Button type="submit" icon="plus" disabled={isSubmitting}>
        {isSubmitting ? "Guardando…" : "Marcar día"}
      </Button>
      {serverError && (
        <p className="closures__error" role="alert">
          {serverError}
        </p>
      )}
    </form>
  );
};

/**
 * Días sin abrir por sucursal: ese día sus cajas no abren solas. Los marca y quita quien tiene
 * "Configurar cajas"; los demás solo los ven.
 */
const ClosuresSection = ({ branches, activeBranchId, canManage }) => {
  const { closures, loading, error, getClosures, addClosure, removeClosure } = useBranchClosures();
  const toast = useToast();
  const [removing, setRemoving] = useState(null);

  useEffect(() => {
    getClosures();
  }, [getClosures]);

  const rows = closures.filter((closure) => activeBranchId === null || closure.branchId === activeBranchId);

  const handleAdd = async (payload) => {
    await addClosure(payload);
    toast.success(`Listo: ese día las cajas de ${branches.find((branch) => branch.id === payload.idbranch)?.name ?? "la sucursal"} no abren solas.`);
  };

  const handleRemove = async () => {
    await removeClosure(removing.id);
    toast.success("Ese día las cajas vuelven a abrir solas.");
    setRemoving(null);
  };

  return (
    <section className="list-page__card closures" aria-labelledby="closures-title">
      <header>
        <h2 className="cash-section-title" id="closures-title">
          Días sin abrir
        </h2>
        <p className="my-cash__since">Festivos o días en que la sucursal no abre: ese día sus cajas no abren solas.</p>
      </header>

      {canManage && <ClosureForm branches={branches} defaultBranchId={activeBranchId ?? (branches.length === 1 ? branches[0].id : null)} onAdd={handleAdd} />}

      {loading && <p className="my-cash__since">Cargando…</p>}
      {error && <p className="closures__error">{error}</p>}
      {!loading && !error && rows.length === 0 && <p className="my-cash__since">No hay días marcados: las cajas abren todos los días.</p>}
      {rows.length > 0 && (
        <ul className="closures__list">
          {rows.map((closure) => (
            <li className="closures__item" key={closure.id}>
              <div className="cash-cell">
                <strong>{formatDay(closure.date)}</strong>
                <span className="cash-cell__secondary">
                  {closure.branchName}
                  {closure.reason && ` · ${closure.reason}`}
                </span>
              </div>
              {canManage && (
                <Button variant="outline" icon="trash" onClick={() => setRemoving(closure)}>
                  Quitar
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={Boolean(removing)}
        title="Quitar día sin abrir"
        message={removing && <>¿Quitar el {formatDay(removing.date)} de {removing.branchName}? Ese día las cajas abrirán solas.</>}
        confirmLabel="Quitar"
        confirmIcon="check"
        errorFallback="No se pudo quitar el día."
        onConfirm={handleRemove}
        onClose={() => setRemoving(null)}
      />
    </section>
  );
};

export default ClosuresSection;
