import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import Button from "../../../components/ui/Button/Button";
import Field from "../../../components/forms/Field/Field";
import Select from "../../../components/forms/Select/Select";
import Switch from "../../../components/forms/Switch/Switch";
import { FormActions, FormLayout } from "../../../components/forms/FormLayout/FormLayout";
import Modal from "../../../components/feadback/Modal/Modal";
import getErrorMessage from "../../../utils/getErrorMessage";
import { calculateMargin, formatCurrency } from "../../../utils/money";
import { sanitizeDecimal } from "../../../utils/validators";

const MAX_PRICE_LENGTH = 13;

const toFormValues = (product) => ({
  nameproduct: product?.name ?? "",
  idcategory: product?.categoryId != null ? String(product.categoryId) : "",
  cost_price: product ? String(product.costPrice) : "",
  sale_price: product ? String(product.salePrice) : "",
  hasserial: product?.hasSerial ?? false,
});

const buildPayload = (values) => ({
  nameproduct: values.nameproduct.trim(),
  idcategory: Number(values.idcategory),
  cost_price: Number(values.cost_price),
  sale_price: Number(values.sale_price),
  hasserial: values.hasserial,
});

/* El backend vuelve a validar: esto es solo para dar respuesta rápida. */
const RULES = {
  nameproduct: {
    validate: (value) => {
      const text = value.trim();
      if (!text) return "Escribe el nombre del producto.";
      if (text.length < 2) return "Debe tener al menos 2 caracteres.";
      return true;
    },
  },
  idcategory: { validate: (value) => value !== "" || "Elige una categoría." },
  cost_price: {
    validate: (value) => {
      if (!value) return "Escribe el precio de costo.";
      const number = Number(value);
      return (Number.isFinite(number) && number >= 0) || "Escribe un valor válido.";
    },
  },
  sale_price: {
    validate: (value) => {
      if (!value) return "Escribe el precio de venta.";
      const number = Number(value);
      return (Number.isFinite(number) && number > 0) || "El precio de venta debe ser mayor que cero.";
    },
  },
};

/** Mensaje bajo el precio de venta: ganancia y margen en vivo (no bloquea el guardado). */
const getMarginHint = (cost, sale) => {
  const margin = sale ? calculateMargin(cost, sale) : null;
  if (!margin) return undefined;

  if (margin.profit < 0) return `Vendes por debajo del costo (${formatCurrency(margin.profit)} por unidad).`;
  return `Ganancia ${formatCurrency(margin.profit)} por unidad · margen ${margin.percent.toFixed(1)}%`;
};

/* ---------- Formulario (solo existe mientras el modal está abierto) ---------- */
const ProductForm = ({ product, categories, categoryHint, busy, onCancel, onSubmit }) => {
  const isEdit = Boolean(product);
  const [serverError, setServerError] = useState("");

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({ defaultValues: toFormValues(product) });

  const [cost, sale] = watch(["cost_price", "sale_price"]);
  const categoryOptions = categories.map((category) => ({
    value: String(category.id),
    label: category.nameCategory,
  }));

  // Con existencias no se cambia el manejo de seriales
  const serialLocked = isEdit && product.quantity > 0;

  const submit = handleSubmit(async (values) => {
    setServerError("");
    try {
      await onSubmit(buildPayload(values));
    } catch (error) {
      setServerError(
        getErrorMessage(
          error,
          isEdit
            ? "No se pudo guardar el producto. Inténtalo de nuevo."
            : "No se pudo crear el producto. Inténtalo de nuevo."
        )
      );
    }
  });

  return (
    <FormLayout onSubmit={submit} error={serverError}>
      <Field
        label="Nombre del producto"
        required
        autoComplete="off"
        maxLength={100}
        data-autofocus
        error={errors.nameproduct?.message}
        {...register("nameproduct", RULES.nameproduct)}
      />

      <Select
        label="Categoría"
        required
        placeholder="Selecciona una categoría"
        options={categoryOptions}
        hint={categoryHint}
        error={errors.idcategory?.message}
        {...register("idcategory", RULES.idcategory)}
      />

      <div className="form-layout__row">
        <Field
          label="Precio de costo"
          required
          inputMode="decimal"
          autoComplete="off"
          maxLength={MAX_PRICE_LENGTH}
          placeholder="0"
          onInput={sanitizeDecimal}
          error={errors.cost_price?.message}
          {...register("cost_price", RULES.cost_price)}
        />
        <Field
          label="Precio de venta"
          required
          inputMode="decimal"
          autoComplete="off"
          maxLength={MAX_PRICE_LENGTH}
          placeholder="0"
          onInput={sanitizeDecimal}
          hint={getMarginHint(cost, sale)}
          error={errors.sale_price?.message}
          {...register("sale_price", RULES.sale_price)}
        />
      </div>

      <Controller
        name="hasserial"
        control={control}
        render={({ field }) => (
          <Switch
            label="Maneja serial"
            description={
              serialLocked
                ? "No se puede cambiar mientras el producto tenga existencias."
                : "Cada unidad se identifica con un número de serial (equipos, celulares…)."
            }
            checked={field.value}
            disabled={serialLocked}
            onChange={field.onChange}
          />
        )}
      />

      <FormActions>
        <Button variant="outline" onClick={onCancel} disabled={busy}>
          Cancelar
        </Button>
        <Button type="submit" icon={isEdit ? "check" : "plus"} disabled={busy}>
          {busy ? "Guardando…" : isEdit ? "Guardar cambios" : "Crear producto"}
        </Button>
      </FormActions>
    </FormLayout>
  );
};

/**
 * product = null → crear · product = {…} → editar.
 * categoryHint: aviso bajo la categoría (cargando, error o sin categorías).
 * onSubmit(payload) debe ser async y lanzar el error si algo falla.
 */
const ProductFormModal = ({ open, product = null, categories, categoryHint, onClose, onSubmit }) => {
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
    <Modal open={open} title={product ? "Editar producto" : "Nuevo producto"} onClose={onClose} busy={busy}>
      <ProductForm
        product={product}
        categories={categories}
        categoryHint={categoryHint}
        busy={busy}
        onCancel={onClose}
        onSubmit={handleSubmit}
      />
    </Modal>
  );
};

export default ProductFormModal;