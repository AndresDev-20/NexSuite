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
import { PRODUCT_UNITS } from "./productOptions";

const MAX_PRICE_LENGTH = 13;
const MAX_DESCRIPTION = 500;

// Mismos patrones del backend (validators/inventory.schemas.js)
const SKU_PATTERN = /^[A-Z0-9][A-Z0-9._-]{1,49}$/;
const BARCODE_PATTERN = /^[A-Z0-9-]{4,50}$/;

/** Sin espacios y en mayúsculas, como lo guarda el servidor. */
const normalizeCode = (value) => value.replace(/\s+/g, "").toUpperCase();

const toFormValues = (product) => ({
  nameproduct: product?.name ?? "",
  sku: product?.sku ?? "",
  barcode: product?.barcode ?? "",
  idcategory: product?.categoryId != null ? String(product.categoryId) : "",
  unit: product?.unit ?? "unidad",
  cost_price: product?.costPrice != null ? String(product.costPrice) : "",
  sale_price: product ? String(product.salePrice) : "",
  description: product?.description ?? "",
  hasserial: product?.hasSerial ?? false,
});

/**
 * SKU vacío: al crear lo genera el servidor; al editar se conserva el actual.
 * Código de barras y descripción vacíos: al editar se envían null para borrarlos.
 * Sin "Ver costos" el costo no se envía (el servidor lo rechazaría): al crear queda en 0 y lo
 * fija la primera compra.
 */
const buildPayload = (values, isEdit, showCost) => {
  const sku = normalizeCode(values.sku);
  const barcode = normalizeCode(values.barcode);
  const description = values.description.trim();

  return {
    nameproduct: values.nameproduct.trim(),
    idcategory: Number(values.idcategory),
    unit: values.unit,
    ...(showCost && { cost_price: Number(values.cost_price) }),
    sale_price: Number(values.sale_price),
    hasserial: values.hasserial,
    ...(sku && { sku }),
    ...((barcode || isEdit) && { barcode: barcode || null }),
    ...((description || isEdit) && { description: description || null }),
  };
};

const optionalCode = (pattern, message) => ({
  validate: (value) => {
    const code = normalizeCode(value);
    return !code || pattern.test(code) || message;
  },
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
  sku: optionalCode(SKU_PATTERN, "De 2 a 50 caracteres: letras, números, punto, guion o guion bajo."),
  barcode: optionalCode(BARCODE_PATTERN, "De 4 a 50 caracteres: letras, números o guion."),
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
const ProductForm = ({ product, categories, categoryHint, showCost, busy, onCancel, onSubmit }) => {
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

  // Con existencias no se cambia el manejo de seriales (el servidor también lo impide)
  const serialLocked = isEdit && product.quantity > 0;

  const submit = handleSubmit(async (values) => {
    setServerError("");
    try {
      await onSubmit(buildPayload(values, isEdit, showCost));
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

      <div className="form-layout__row">
        <Field
          label="SKU (código interno)"
          autoComplete="off"
          maxLength={50}
          placeholder={isEdit ? undefined : "Automático"}
          hint={isEdit ? "Vacío conserva el actual." : "Déjalo vacío y se genera solo (PRD-000123)."}
          error={errors.sku?.message}
          {...register("sku", RULES.sku)}
        />
        <Field
          label="Código de barras"
          autoComplete="off"
          maxLength={50}
          placeholder="Escanéalo o escríbelo"
          error={errors.barcode?.message}
          {...register("barcode", RULES.barcode)}
        />
      </div>

      <div className="form-layout__row">
        <Select
          label="Categoría"
          required
          placeholder="Selecciona una categoría"
          options={categoryOptions}
          hint={categoryHint}
          error={errors.idcategory?.message}
          {...register("idcategory", RULES.idcategory)}
        />
        <Select label="Unidad de medida" required options={PRODUCT_UNITS} {...register("unit")} />
      </div>

      <div className="form-layout__row">
        {showCost && (
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
        )}
        <Field
          label="Precio de venta"
          required
          inputMode="decimal"
          autoComplete="off"
          maxLength={MAX_PRICE_LENGTH}
          placeholder="0"
          onInput={sanitizeDecimal}
          hint={showCost ? getMarginHint(cost, sale) : isEdit ? undefined : "El costo lo fija la primera compra de este producto."}
          error={errors.sale_price?.message}
          {...register("sale_price", RULES.sale_price)}
        />
      </div>

      <Field
        label="Descripción"
        multiline
        maxLength={MAX_DESCRIPTION}
        placeholder="Opcional: características, referencia, color…"
        {...register("description")}
      />

      <Controller
        name="hasserial"
        control={control}
        render={({ field }) => (
          <Switch
            label="Maneja serial"
            description={
              serialLocked
                ? "No se puede cambiar mientras el producto tenga existencias."
                : "Cada unidad se identifica con su IMEI o serial (equipos, celulares…)."
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
 * showCost: permiso "Ver costos"; sin él no se muestra ni se envía el precio de costo.
 * onSubmit(payload) debe ser async y lanzar el error si algo falla.
 */
const ProductFormModal = ({ open, product = null, categories, categoryHint, showCost, onClose, onSubmit }) => {
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
        showCost={showCost}
        busy={busy}
        onCancel={onClose}
        onSubmit={handleSubmit}
      />
    </Modal>
  );
};

export default ProductFormModal;
