import { useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import Button from "../../../components/ui/Button/Button";
import Field from "../../../components/forms/Field/Field";
import Select from "../../../components/forms/Select/Select";
import Switch from "../../../components/forms/Switch/Switch";
import { FormActions, FormLayout, FormSection } from "../../../components/forms/FormLayout/FormLayout";
import Modal from "../../../components/feadback/Modal/Modal";
import getErrorMessage from "../../../utils/getErrorMessage";
import { calculateMargin, formatCurrency } from "../../../utils/money";
import { sanitizeDecimal } from "../../../utils/validators";
import { cleanFeatures } from "./productOptions";
import FeaturesEditor from "./FeaturesEditor";
import Stepper from "../../../components/forms/Stepper/Stepper";
import Icon from "../../../components/ui/Icon/Icon";
import BranchAssignmentFields from "./BranchAssignmentFields";
import useBranchAssignment from "./useBranchAssignment";
import "./productFormModal.css";
import SupplierPicker from "../../purchases/suppliers/SupplierPicker";
import useSupplierChoices from "../../purchases/suppliers/useSupplierChoices";
import SupplierFormModal from "../../purchases/suppliers/SupplierFormModal";
import CategoryFormModal from "../categories/CategoryFormModal";
import usePermissions from "../../auth/usePermissions";
import useToast from "../../../components/feadback/Toast/useToast";
import api from "../../../api/client";
import { unwrap } from "../../../utils/apiResponse";

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
  idsupplier: product?.supplierId != null ? String(product.supplierId) : "",
  unit: product?.unit ?? "unidad",
  cost_price: product?.costPrice != null ? String(product.costPrice) : "",
  sale_price: product ? String(product.salePrice) : "",
  description: product?.description ?? "",
  hasserial: product?.hasSerial ?? false,
  warrantymonths: String(product?.warrantyMonths ?? 0),
  showinshop: product?.showInShop ?? false,
  features: (product?.features ?? []).map((feature) => ({ name: feature.name, value: feature.value })),
});

/**
 * SKU vacío: al crear lo genera el servidor; al editar se conserva el actual.
 * Código de barras y descripción vacíos: al editar se envían null para borrarlos.
 * Sin "Ver costos" el costo no se envía (el servidor lo rechazaría): al crear queda en 0 y lo
 * fija la primera compra.
 * Proveedor habitual: solo con «Consultar proveedores» (withSupplier); vacío al editar lo quita.
 */
const buildPayload = (values, isEdit, showCost, withSupplier) => {
  const sku = normalizeCode(values.sku);
  const barcode = normalizeCode(values.barcode);
  const description = values.description.trim();

  return {
    nameproduct: values.nameproduct.trim(),
    idcategory: Number(values.idcategory),
    ...(withSupplier && (values.idsupplier || isEdit) && { idsupplier: values.idsupplier ? Number(values.idsupplier) : null }),
    unit: values.unit,
    ...(showCost && { cost_price: Number(values.cost_price) }),
    sale_price: Number(values.sale_price),
    hasserial: values.hasserial,
    // Garantía con el cliente para productos sin serial (con serial va en cada unidad)
    ...(!values.hasserial && { warrantymonths: Number(values.warrantymonths) || 0 }),
    ...(sku && { sku }),
    ...((barcode || isEdit) && { barcode: barcode || null }),
    ...((description || isEdit) && { description: description || null }),
    // Tienda en línea (Fase 24): la lista completa reemplaza la anterior
    showinshop: values.showinshop,
    features: cleanFeatures(values.features),
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

/** Ganancia y margen en vivo (no bloquea el guardado). */
const MarginCard = ({ cost, sale }) => {
  const margin = sale ? calculateMargin(cost, sale) : null;
  if (!margin) {
    return <p className="product-form__margin">Escribe el costo y el precio de venta para ver la ganancia por unidad.</p>;
  }
  const losing = margin.profit < 0;
  return (
    <p className={`product-form__margin product-form__margin--${losing ? "bad" : "good"}`} role="status">
      <span className="product-form__margin-label">{losing ? "Vendes por debajo del costo" : "Ganancia por unidad"}</span>
      <strong className="product-form__margin-value">{formatCurrency(margin.profit)}</strong>
      <span className="product-form__margin-chip">{margin.percent.toFixed(1)} %</span>
    </p>
  );
};

/*
 * «Nuevo producto» por pasos (2026-11-13). Al crear desde Productos: Producto → Precios → Tienda →
 * Sucursales (la asignación es opcional: sin sucursales queda «pendiente de asignar»). Al editar, o al
 * crearlo desde una compra (ahí reparte la compra), los tres primeros. Cada paso revisa sus campos antes
 * de seguir; todos quedan montados (solo se ve el actual) para no perder lo escrito ni sus reglas.
 */
const BASE_STEPS = [
  { key: "producto", label: "Producto", description: "Nombre, códigos, categoría y proveedor" },
  { key: "precios", label: "Precios", description: "Costo, venta, serial y garantía" },
  { key: "tienda", label: "Tienda", description: "Lo que ven los clientes en NexStore" },
];
const BRANCHES_STEP = { key: "sucursales", label: "Sucursales", description: "A dónde llega y cuánto (opcional)" };
const STEP_FIELDS = [["nameproduct", "sku", "barcode", "idcategory"], ["cost_price", "sale_price", "warrantymonths"], [], []];
/** En qué paso está un campo con error (para llevar ahí al guardar). */
const stepOfField = (name) => {
  if (name.startsWith("features")) return 2;
  const index = STEP_FIELDS.findIndex((fields) => fields.includes(name));
  return index === -1 ? 0 : index;
};

/** Tarjeta de la columna lateral: el producto se va armando mientras se escribe. */
const ProductPreview = ({ name, sku, category, supplier, salePrice, hasSerial, showInShop, isEdit }) => (
  <div className="product-wizard__preview" aria-hidden="true">
    <span className="product-wizard__preview-icon">
      <Icon name="box" />
    </span>
    <strong className={`product-wizard__preview-name ${name ? "" : "product-wizard__preview-name--empty"}`.trim()}>
      {name || "Nombre del producto"}
    </strong>
    <span className="product-wizard__preview-meta">
      {sku || (isEdit ? "" : "SKU automático")}
      {category ? ` · ${category}` : ""}
    </span>
    <span className="product-wizard__preview-price">{Number(salePrice) > 0 ? formatCurrency(Number(salePrice)) : "$ —"}</span>
    <span className="product-wizard__preview-tags">
      {supplier && <span className="product-wizard__tag">{supplier}</span>}
      {hasSerial && <span className="product-wizard__tag product-wizard__tag--serial">Con serial</span>}
      {showInShop && <span className="product-wizard__tag product-wizard__tag--shop">En NexStore</span>}
    </span>
  </div>
);

/* ---------- Formulario (solo existe mientras el modal está abierto) ---------- */
const ProductForm = ({ product, categories, categoryHint, showCost, branchStep, busy, onCancel, onSubmit }) => {
  const isEdit = Boolean(product);
  const [serverError, setServerError] = useState("");
  const [creatingSupplier, setCreatingSupplier] = useState(false);
  // Nueva categoría sin salir del producto (con «Crear categorías»); la lista de la página aún no la trae
  const { can } = usePermissions();
  const toast = useToast();
  const canCreateCategory = can("categories.create");
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [newCategories, setNewCategories] = useState([]);
  const [pendingCategory, setPendingCategory] = useState(null); // se elige cuando su opción ya está en la lista
  const [currentSupplier] = useState(() =>
    product?.supplierId != null ? { id: product.supplierId, companyname: product.supplierName, isactive: product.supplierActive } : null
  );
  const supplierChoices = useSupplierChoices(currentSupplier);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    trigger,
    formState: { errors },
  } = useForm({ defaultValues: toFormValues(product) });

  const [name, sku, idcategory, idsupplier, cost, sale, hasSerial, showInShop] = watch([
    "nameproduct",
    "sku",
    "idcategory",
    "idsupplier",
    "cost_price",
    "sale_price",
    "hasserial",
    "showinshop",
  ]);

  // La categoría recién creada se elige cuando su opción ya existe en la lista
  useEffect(() => {
    if (!pendingCategory) return;
    setValue("idcategory", pendingCategory, { shouldDirty: true, shouldValidate: true });
    setPendingCategory(null);
  }, [pendingCategory, setValue]);

  const allCategories = [...categories, ...newCategories.filter((created) => !categories.some((category) => category.id === created.id))];
  const categoryOptions = allCategories
    .map((category) => ({ value: String(category.id), label: category.nameCategory }))
    .sort((a, b) => a.label.localeCompare(b.label, "es"));
  const categoryName = allCategories.find((category) => String(category.id) === idcategory)?.nameCategory ?? "";
  const supplierName = supplierChoices.options.find((option) => option.value === idsupplier)?.label ?? "";

  // Con existencias no se cambia el manejo de seriales (el servidor también lo impide)
  const serialLocked = isEdit && product.quantity > 0;

  // Sucursales (último paso al crear desde Productos)
  const withBranches = Boolean(branchStep) && !isEdit;
  const steps = withBranches ? [...BASE_STEPS, BRANCHES_STEP] : BASE_STEPS;
  const assignment = useBranchAssignment({
    hasSerial,
    branches: withBranches ? branchStep.branches : [],
    suppliers: withBranches ? branchStep.suppliers : [],
    defaultSupplierId: idsupplier || null,
  });
  const canAssignHere = withBranches && (hasSerial ? branchStep.canUnits : branchStep.canStock);

  // Pasos: al crear se avanza en orden; al editar se salta a cualquiera y se guarda desde cualquiera
  const [step, setStep] = useState(0);
  const [reached, setReached] = useState(isEdit ? steps.length - 1 : 0);
  const [direction, setDirection] = useState("forward");
  const wizardRef = useRef(null);
  const lastStep = step === steps.length - 1;
  const goTo = (index) => {
    setDirection(index < step ? "back" : "forward");
    setStep(index);
    setReached((current) => Math.max(current, index));
    // Arriba del paso nuevo (dentro de la ventana)
    wizardRef.current?.closest(".modal__body")?.scrollTo({ top: 0, behavior: "smooth" });
  };
  const goNext = async () => {
    const fields = (STEP_FIELDS[step] ?? []).filter((field) => showCost || field !== "cost_price");
    if (await trigger(fields)) goTo(step + 1);
  };

  const save = handleSubmit(
    async (values) => {
      setServerError("");
      // La asignación solo se envía si eligió sucursales (y tiene permiso)
      const assigning = canAssignHere && assignment.rows.length > 0;
      if (assigning) {
        assignment.setSubmitted(true);
        if (assignment.hasErrors) {
          setServerError("Corrige los datos marcados de las sucursales (o quítalas para asignar después).");
          goTo(steps.length - 1);
          return;
        }
      }
      try {
        await onSubmit(buildPayload(values, isEdit, showCost, supplierChoices.canRead), assigning ? assignment.toPayload() : null);
      } catch (error) {
        setServerError(getErrorMessage(error, isEdit ? "No se pudo guardar el producto. Inténtalo de nuevo." : "No se pudo crear el producto. Inténtalo de nuevo."));
      }
    },
    // Si falta algo, lleva al paso donde está el primer error
    (invalid) => {
      const first = Object.keys(invalid)[0];
      if (first) goTo(stepOfField(first));
    }
  );
  // Enter en un campo: al crear, avanza de paso; en el último (o al editar), guarda
  const submit = (event) => {
    if (!isEdit && !lastStep) {
      event.preventDefault();
      goNext();
      return;
    }
    save(event);
  };

  const total = assignment.total;
  const createLabel = withBranches && assignment.rows.length > 0 ? `Crear y asignar ${total} ${total === 1 ? "unidad" : "unidades"}` : "Crear producto";

  return (
    <>
      <FormLayout onSubmit={submit} error={serverError}>
        <div className="product-wizard" ref={wizardRef} data-direction={direction}>
          <aside className="product-wizard__rail">
            <Stepper steps={steps} current={step} reached={reached} allSelectable={isEdit} vertical onSelect={goTo} />
            <ProductPreview
              name={name.trim()}
              sku={sku.trim().toUpperCase()}
              category={categoryName}
              supplier={supplierName.replace(" (inactivo)", "")}
              salePrice={sale}
              hasSerial={hasSerial}
              showInShop={showInShop}
              isEdit={isEdit}
            />
          </aside>

          <div className="product-wizard__main">
            {/* Paso 1: Producto */}
            <div className="step-panel" hidden={step !== 0}>
              <FormSection icon="box" title="Datos del producto" description="Cómo se llama y cómo se encuentra en el sistema.">
                <Field
                  label="Nombre del producto"
                  required
                  autoComplete="off"
                  maxLength={100}
                  placeholder="Ej: Samsung Galaxy A55 128 GB"
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
                    hint={isEdit ? "Vacío conserva el actual." : "Vacío: se genera solo (PRD-000123)."}
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
                <Field label="Descripción" multiline maxLength={MAX_DESCRIPTION} placeholder="Opcional: características, referencia, color…" {...register("description")} />
              </FormSection>

              <FormSection icon="bag" title="Clasificación y proveedor" description="Dónde se agrupa y a quién se le compra.">
                <div className="purchase-form__supplier">
                  <Select
                    label="Categoría"
                    required
                    placeholder="Selecciona una categoría"
                    options={categoryOptions}
                    hint={categoryHint}
                    error={errors.idcategory?.message}
                    {...register("idcategory", RULES.idcategory)}
                  />
                  {canCreateCategory && (
                    <Button variant="outline" icon="plus" className="purchase-form__inline" onClick={() => setCreatingCategory(true)}>
                      Nueva categoría
                    </Button>
                  )}
                </div>
                <Controller
                  name="idsupplier"
                  control={control}
                  render={({ field }) => (
                    <SupplierPicker choices={supplierChoices} value={field.value} current={currentSupplier} onChange={field.onChange} onNew={() => setCreatingSupplier(true)} />
                  )}
                />
              </FormSection>
            </div>

            {/* Paso 2: Precios */}
            <div className="step-panel" hidden={step !== 1}>
              <FormSection
                icon="wallet"
                title="Precios"
                description={showCost ? "El costo se actualiza solo con cada compra (costo promedio)." : "El costo lo fija la primera compra de este producto."}
              >
                <div className="form-layout__row">
                  {showCost && (
                    <Field
                      label="Precio de costo"
                      required
                      prefix="$"
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
                    prefix="$"
                    inputMode="decimal"
                    autoComplete="off"
                    maxLength={MAX_PRICE_LENGTH}
                    placeholder="0"
                    onInput={sanitizeDecimal}
                    error={errors.sale_price?.message}
                    {...register("sale_price", RULES.sale_price)}
                  />
                </div>
                {showCost && <MarginCard cost={cost} sale={sale} />}
              </FormSection>

              <FormSection icon="shield" title="Serial y garantía" description="Cómo se identifica cada unidad y qué garantía tiene el cliente.">
                <Controller
                  name="hasserial"
                  control={control}
                  render={({ field }) => (
                    <Switch
                      label="Maneja serial"
                      description={serialLocked ? "No se puede cambiar mientras el producto tenga existencias." : "Cada unidad se identifica con su IMEI o serial (equipos, celulares…)."}
                      checked={field.value}
                      disabled={serialLocked}
                      onChange={field.onChange}
                    />
                  )}
                />
                {!hasSerial && (
                  <Field
                    label="Meses de garantía"
                    inputMode="numeric"
                    maxLength={3}
                    hint="Desde el día de la venta (0 = sin garantía). Con serial, se pone en cada unidad."
                    error={errors.warrantymonths?.message}
                    {...register("warrantymonths", {
                      validate: (value) => (/^\d{1,3}$/.test(String(value).trim()) && Number(value) <= 120) || "Escribe de 0 a 120 meses.",
                    })}
                  />
                )}
              </FormSection>
            </div>

            {/* Paso 3: Tienda */}
            <div className="step-panel" hidden={step !== 2}>
              <FormSection icon="store" title="Tienda en línea" description="Lo que ven los clientes en NexStore.">
                <Controller
                  name="showinshop"
                  control={control}
                  render={({ field }) => (
                    <Switch
                      label="Mostrar en la tienda"
                      description="Sale en NexStore con su precio y características. Si no hay existencias, sale como «Agotado»."
                      checked={field.value}
                      onChange={field.onChange}
                    />
                  )}
                />
                <FeaturesEditor control={control} register={register} errors={errors} />
              </FormSection>
            </div>

            {/* Paso 4: Sucursales (solo al crear desde Productos) */}
            {withBranches && (
              <div className="step-panel" hidden={step !== 3}>
                <FormSection icon="home" title="Asignar a sucursales" description="Opcional: si no eliges ninguna, el producto queda «pendiente de asignar» y lo haces después.">
                  {canAssignHere ? (
                    <BranchAssignmentFields assignment={assignment} suppliersHint={branchStep.suppliersHint} />
                  ) : (
                    <p className="product-wizard__note">
                      {branchStep.branches.length === 0
                        ? "No tienes sucursales asignadas: el producto queda pendiente de asignar."
                        : hasSerial
                          ? "Para registrar unidades con serial necesitas el permiso «Registrar unidades»: el producto queda pendiente de asignar."
                          : "Para cargar existencias necesitas el permiso «Registrar existencias»: el producto queda pendiente de asignar."}
                    </p>
                  )}
                </FormSection>
              </div>
            )}
          </div>
        </div>

        <FormActions>
          {step === 0 ? (
            <Button variant="outline" onClick={onCancel} disabled={busy}>
              Cancelar
            </Button>
          ) : (
            <Button variant="outline" icon="chevron" className="product-form__back" onClick={() => goTo(step - 1)} disabled={busy}>
              Atrás
            </Button>
          )}
          {!lastStep && (
            <Button variant={isEdit ? "outline" : "primary"} icon="chevron" onClick={goNext} disabled={busy} className="product-form__next">
              Siguiente
            </Button>
          )}
          {(isEdit || lastStep) && (
            <Button type="submit" icon={isEdit ? "check" : "plus"} disabled={busy}>
              {busy ? "Guardando…" : isEdit ? "Guardar cambios" : createLabel}
            </Button>
          )}
        </FormActions>
      </FormLayout>

      {/* Por fuera del formulario del producto: un formulario dentro de otro guardaría el producto */}
      <CategoryFormModal
        open={creatingCategory}
        onClose={() => setCreatingCategory(false)}
        onSubmit={async (payload) => {
          const created = unwrap(await api.post("/categories", payload));
          setNewCategories((current) => [...current, { id: created.id, nameCategory: created.nameCategory }]);
          setPendingCategory(String(created.id));
          toast.success(`Categoría ${created.nameCategory} creada.`);
          setCreatingCategory(false);
        }}
      />
      <SupplierFormModal
        open={creatingSupplier}
        onClose={() => setCreatingSupplier(false)}
        onSubmit={async (payload) => {
          const id = await supplierChoices.create(payload);
          setValue("idsupplier", id, { shouldDirty: true });
          setCreatingSupplier(false);
        }}
      />
    </>
  );
};

/**
 * product = null → crear · product = {…} → editar.
 * categoryHint: aviso bajo la categoría (cargando, error o sin categorías).
 * showCost: permiso "Ver costos"; sin él no se muestra ni se envía el precio de costo.
 * branchStep (opcional, al crear desde Productos): { branches, suppliers, suppliersHint, canStock, canUnits }
 *   para asignar a sucursales en el último paso.
 * onSubmit(payload, assignment) debe ser async y lanzar el error si algo falla; assignment es la carga
 * inicial (POST /products/:id/initial-stock) o null si no eligió sucursales.
 */
const ProductFormModal = ({ open, product = null, categories, categoryHint, showCost, branchStep = null, onClose, onSubmit }) => {
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (payload, assignment) => {
    setBusy(true);
    try {
      await onSubmit(payload, assignment);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      size="xl"
      icon="box"
      title={product ? "Editar producto" : "Nuevo producto"}
      subtitle={product ? `${product.name} · ${product.sku}` : "Completa los pasos. Los campos con * son obligatorios."}
      onClose={onClose}
      busy={busy}
    >
      <ProductForm
        product={product}
        categories={categories}
        categoryHint={categoryHint}
        showCost={showCost}
        branchStep={branchStep}
        busy={busy}
        onCancel={onClose}
        onSubmit={handleSubmit}
      />
    </Modal>
  );
};

export default ProductFormModal;
