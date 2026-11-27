import { useState } from "react";
import Modal from "../../../components/feadback/Modal/Modal";
import Button from "../../../components/ui/Button/Button";
import Icon from "../../../components/ui/Icon/Icon";
import Field from "../../../components/forms/Field/Field";
import { FormActions, FormLayout, FormSection } from "../../../components/forms/FormLayout/FormLayout";
import getErrorMessage from "../../../utils/getErrorMessage";
import { formatCurrency } from "../../../utils/money";
import { sanitizeDecimal } from "../../../utils/validators";
import { OFFER_TYPES, createOffer, drawDayText, typeOf, updateOffer } from "./offerApi";
import ProductPicker from "./ProductPicker";
import "./offers.css";

const cents = (value) => Math.round(Number(value || 0) * 100);
const asProduct = (row) => ({ id: row.idproduct, name: row.name, sku: row.sku, salePrice: row.listprice, hasSerial: row.hasserial });

/** El formulario desde una oferta (editar) o vacío (crear). */
const toForm = (offer, type) => ({
  type: offer?.type ?? type,
  name: offer?.name ?? "",
  description: offer?.description ?? "",
  startsat: offer?.startsat ?? "",
  endsat: offer?.endsat ?? "",
  allBranches: offer ? offer.allbranches : true,
  branches: offer?.branches.map((branch) => branch.id) ?? [],
  limit: offer?.limitqty ? String(offer.limitqty) : "",
  buyqty: String(offer?.buyqty ?? 1),
  giftqty: String(offer?.giftqty ?? 1),
  groupsize: String(offer?.groupsize ?? 2),
  percent: String(offer?.percent ?? 100),
  price: offer?.price ? String(offer.price) : "",
  prize: offer?.prize ?? "",
  drawdate: offer?.drawdate ?? "",
  triggers: offer?.triggers.map(asProduct) ?? [],
  gifts: offer?.gifts.map(asProduct) ?? [],
  items: offer?.items.map((row) => ({ product: asProduct(row), price: row.price ? String(row.price) : "", quantity: String(row.quantity ?? 1) })) ?? [],
});

/** Lo que se envía según el tipo. */
const toPayload = (form) => ({
  name: form.name.trim(),
  type: form.type,
  ...(form.description.trim() && { description: form.description.trim() }),
  ...(form.startsat && { startsat: form.startsat }),
  ...(form.endsat && { endsat: form.endsat }),
  ...(!form.allBranches && { branches: form.branches }),
  limitqty: form.limit ? Number(form.limit) : null,
  ...(form.type === "regalo" && {
    buyqty: Number(form.buyqty),
    giftqty: Number(form.giftqty),
    triggers: form.triggers.map((product) => product.id),
    gifts: form.gifts.map((product) => product.id),
  }),
  ...(form.type === "rifa" && { prize: form.prize.trim(), drawdate: form.drawdate, triggers: form.triggers.map((product) => product.id) }),
  ...(form.type === "precio" && { items: form.items.map((item) => ({ idproduct: item.product.id, price: Number(item.price) })) }),
  ...(form.type === "segundo" && { groupsize: Number(form.groupsize), percent: Number(form.percent), items: form.items.map((item) => ({ idproduct: item.product.id })) }),
  ...(form.type === "combo" && { price: Number(form.price), items: form.items.map((item) => ({ idproduct: item.product.id, quantity: Number(item.quantity) || 1 })) }),
});

/** Revisión rápida antes de enviar (el servidor revisa todo otra vez). */
const problemOf = (form) => {
  if (form.name.trim().length < 3) return "Escribe el nombre de la oferta.";
  if (form.type === "regalo") {
    if (form.triggers.length === 0) return "Paso 1: elige qué producto tiene que comprar el cliente.";
    if (form.gifts.length === 0) return "Paso 2: elige al menos un regalo.";
    if (!(Number(form.buyqty) >= 1) || !(Number(form.giftqty) >= 1)) return "Las cantidades deben ser 1 o más.";
  } else if (form.type === "rifa") {
    if (form.prize.trim().length < 3) return "Escribe el premio de la rifa.";
    if (!form.drawdate) return "Elige la fecha del sorteo.";
    if (form.triggers.length === 0) return "Elige al menos un producto que dé participación.";
  } else if (form.items.length === 0) return "Agrega al menos un producto.";
  if (form.type === "precio") {
    const bad = form.items.find((item) => !(cents(item.price) > 0) || cents(item.price) >= cents(item.product.salePrice));
    if (bad) return `${bad.product.name}: el precio de oferta debe ser menor que ${formatCurrency(bad.product.salePrice)}.`;
  }
  if (form.type === "combo") {
    const list = form.items.reduce((sum, item) => sum + cents(item.product.salePrice) * (Number(item.quantity) || 1), 0);
    if (!(cents(form.price) > 0) || cents(form.price) >= list) return `El combo debe costar menos que ${formatCurrency(list / 100)}.`;
  }
  if (!form.allBranches && form.branches.length === 0) return "Elige al menos una sucursal o deja «Todas las sucursales».";
  if (form.startsat && form.endsat && form.endsat < form.startsat) return "La fecha de fin no puede ser antes de la de inicio.";
  return "";
};

/** Así lo ve el cliente (la etiqueta de la tienda y el aviso de Vender). */
const Preview = ({ form }) => {
  const type = typeOf(form.type);
  const names = (list) => list.map((product) => product.name).join(" o ");
  let headline = "";
  let detail = null;
  if (form.type === "rifa") {
    headline = `🎟️ Participa en la rifa${form.prize.trim() ? ` de ${form.prize.trim()}` : "…"}`;
    detail = (
      <>
        {form.triggers.length ? `Por cada ${names(form.triggers)} que compres` : "Elige los productos"}
        {form.drawdate && <span className="offer-preview__save">Sorteo: {drawDayText(form.drawdate)}</span>}
      </>
    );
  } else if (form.type === "regalo") {
    headline = form.gifts.length ? `🎁 Lleva gratis ${names(form.gifts)}` : "🎁 Lleva gratis…";
    detail = form.triggers.length ? `Por la compra de ${Number(form.buyqty) > 1 ? `${form.buyqty} ` : ""}${names(form.triggers)}` : "Elige qué se compra";
  } else if (form.type === "precio") {
    headline = "🏷️ Precio especial";
    detail = form.items.slice(0, 3).map((item) => (
      <span key={item.product.id} className="offer-preview__line">
        {item.product.name}: <s>{formatCurrency(item.product.salePrice)}</s> <strong>{item.price ? formatCurrency(Number(item.price)) : "—"}</strong>
      </span>
    ));
  } else if (form.type === "segundo") {
    headline = Number(form.groupsize) === 2 && Number(form.percent) >= 100 ? "✂️ 2x1" : `✂️ Lleva ${form.groupsize}, el último con ${form.percent} % menos`;
    detail = form.items.length ? names(form.items.map((item) => item.product)) : "Elige los productos";
  } else {
    const list = form.items.reduce((sum, item) => sum + cents(item.product.salePrice) * (Number(item.quantity) || 1), 0);
    headline = `📦 Combo a ${form.price ? formatCurrency(Number(form.price)) : "…"}`;
    detail = (
      <>
        {form.items.map((item) => `${Number(item.quantity) > 1 ? `${item.quantity} × ` : ""}${item.product.name}`).join(" + ") || "Elige los productos"}
        {list > 0 && cents(form.price) > 0 && cents(form.price) < list && (
          <span className="offer-preview__save">
            Antes <s>{formatCurrency(list / 100)}</s> · ahorra {formatCurrency((list - cents(form.price)) / 100)}
          </span>
        )}
      </>
    );
  }
  return (
    <aside className={`offer-preview offer-tone--${type.tone}`} aria-label="Vista previa de la oferta">
      <span className="offer-preview__label">Así la ve el cliente</span>
      <div className="offer-preview__card">
        <span className="offer-preview__ribbon">OFERTA</span>
        <span className="offer-preview__icon" aria-hidden="true">
          <Icon name={type.icon} />
        </span>
        <strong className="offer-preview__name">{form.name.trim() || "Nombre de la oferta"}</strong>
        <span className="offer-preview__headline">{headline}</span>
        <span className="offer-preview__detail">{detail}</span>
      </div>
    </aside>
  );
};

/** Elegir el tipo (solo al crear). */
const TypeChooser = ({ onChoose }) => (
  <div className="offer-types">
    <p className="offer-types__lead">¿Qué tipo de oferta quieres armar?</p>
    <div className="offer-types__grid">
      {OFFER_TYPES.map((type, index) => (
        <button key={type.value} type="button" className={`offer-type offer-tone--${type.tone}`} style={{ "--i": index }} onClick={() => onChoose(type.value)} data-autofocus={index === 0 || undefined}>
          <span className="offer-type__icon" aria-hidden="true">
            <Icon name={type.icon} />
          </span>
          <strong>{type.label}</strong>
          <span>{type.hint}</span>
        </button>
      ))}
    </div>
  </div>
);

const OfferForm = ({ offer, type, branches, products, onCancel, onSaved }) => {
  const [form, setForm] = useState(() => toForm(offer, type));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (changes) => setForm((current) => ({ ...current, ...changes }));
  const meta = typeOf(form.type);
  const usedIds = [...form.triggers, ...form.gifts, ...form.items.map((item) => item.product)].map((product) => product.id);

  const updateItem = (id, changes) => set({ items: form.items.map((item) => (item.product.id === id ? { ...item, ...changes } : item)) });
  const removeFrom = (key, id) => set({ [key]: form[key].filter((entry) => (entry.product ?? entry).id !== id) });

  const submit = async (event) => {
    event.preventDefault();
    const problem = problemOf(form);
    if (problem) return setError(problem);
    setBusy(true);
    setError("");
    try {
      const result = offer ? await updateOffer(offer.id, toPayload(form)) : await createOffer(toPayload(form));
      onSaved(result);
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo guardar la oferta."));
    } finally {
      setBusy(false);
    }
  };

  const chips = (key) =>
    form[key].length > 0 && (
      <ul className="offer-chips">
        {form[key].map((product) => (
          <li key={product.id} className="offer-chip">
            <span>
              <strong>{product.name}</strong>
              <small>{formatCurrency(product.salePrice)}</small>
            </span>
            <button type="button" aria-label={`Quitar ${product.name}`} onClick={() => removeFrom(key, product.id)}>
              <Icon name="x" />
            </button>
          </li>
        ))}
      </ul>
    );

  return (
    <FormLayout onSubmit={submit} error={error}>
      <div className="offer-form">
        <div className="offer-form__main">
          <FormSection icon={meta.icon} title={meta.label} description={meta.hint}>
            <Field label="Nombre de la oferta" required maxLength={120} placeholder={form.type === "rifa" ? "Ej: Rifa de Navidad" : "Ej: Cabina + manos libres de regalo"} data-autofocus value={form.name} onChange={(event) => set({ name: event.target.value })} />

            {form.type === "regalo" && (
              <>
                <ol className="offer-steps">
                  <li className="offer-step" style={{ "--i": 0 }}>
                    <span className="offer-step__number">1</span>
                    <div className="offer-step__body">
                      <strong>¿Qué tiene que comprar el cliente?</strong>
                      <small>Si eliges varios, sirve cualquiera de ellos.</small>
                      <ProductPicker label="Producto que se compra" products={products} exclude={usedIds} onPick={(product) => set({ triggers: [...form.triggers, product] })} />
                      {chips("triggers")}
                    </div>
                  </li>
                  <li className="offer-step" style={{ "--i": 1 }}>
                    <span className="offer-step__number">2</span>
                    <div className="offer-step__body">
                      <strong>¿Qué se lleva gratis?</strong>
                      <small>Si pones varios, al vender se escoge uno (el que haya en la sucursal).</small>
                      <ProductPicker label="Regalo" products={products} exclude={usedIds} onPick={(product) => set({ gifts: [...form.gifts, product] })} />
                      {chips("gifts")}
                    </div>
                  </li>
                  <li className="offer-step" style={{ "--i": 2 }}>
                    <span className="offer-step__number">3</span>
                    <div className="offer-step__body">
                      <strong>¿Cuántos?</strong>
                      <div className="offer-sentence">
                        <span>Por cada</span>
                        <input type="number" min={1} aria-label="Unidades que compra" value={form.buyqty} onChange={(event) => set({ buyqty: event.target.value })} />
                        <span>que compre, se lleva</span>
                        <input type="number" min={1} aria-label="Regalos que se lleva" value={form.giftqty} onChange={(event) => set({ giftqty: event.target.value })} />
                        <span>de regalo.</span>
                      </div>
                      <small>Lo normal es 1 y 1. Si compra el doble, se lleva el doble.</small>
                    </div>
                  </li>
                </ol>
              </>
            )}

            {form.type === "rifa" && (
              <>
                <p className="offer-note">El sistema no sortea ni da números: solo avisa en Vender y en la factura que la compra participa, y guarda la lista de quién participa. El sorteo lo hacen ustedes aparte.</p>
                <div className="form-layout__row">
                  <Field label="Premio" required maxLength={160} placeholder="Ej: Un televisor de 50 pulgadas" value={form.prize} onChange={(event) => set({ prize: event.target.value })} />
                  <Field label="Fecha del sorteo" required type="date" value={form.drawdate} onChange={(event) => set({ drawdate: event.target.value })} />
                </div>
                <ProductPicker label="Productos que dan participación" products={products} exclude={usedIds} onPick={(product) => set({ triggers: [...form.triggers, product] })} />
                {chips("triggers")}
                <small className="offer-hint">Cada unidad que compre de estos productos es 1 oportunidad. Se junta con otras ofertas (no cambia el precio).</small>
              </>
            )}

            {form.type === "segundo" && (
              <>
                <div className="offer-quick">
                  <button type="button" className={form.groupsize === "2" && form.percent === "100" ? "is-on" : ""} onClick={() => set({ groupsize: "2", percent: "100" })}>
                    2x1
                  </button>
                  <button type="button" className={form.groupsize === "2" && form.percent === "50" ? "is-on" : ""} onClick={() => set({ groupsize: "2", percent: "50" })}>
                    Segundo a mitad
                  </button>
                  <button type="button" className={form.groupsize === "3" && form.percent === "100" ? "is-on" : ""} onClick={() => set({ groupsize: "3", percent: "100" })}>
                    3x2
                  </button>
                </div>
                <div className="form-layout__row">
                  <Field label="Lleva (unidades)" type="number" min={2} value={form.groupsize} onChange={(event) => set({ groupsize: event.target.value })} />
                  <Field label="El último con (% de descuento)" inputMode="decimal" onInput={sanitizeDecimal} value={form.percent} onChange={(event) => set({ percent: event.target.value })} />
                </div>
              </>
            )}

            {form.type !== "regalo" && form.type !== "rifa" && (
              <>
                <ProductPicker label="Productos" products={products} exclude={usedIds} onPick={(product) => set({ items: [...form.items, { product, price: "", quantity: "1" }] })} />
                {form.items.length > 0 && (
                  <ul className="offer-items">
                    {form.items.map((item, index) => {
                      const off = form.type === "precio" && cents(item.price) > 0 ? Math.round((1 - cents(item.price) / cents(item.product.salePrice)) * 100) : null;
                      return (
                        <li key={item.product.id} style={{ "--i": index }}>
                          <span className="offer-items__name">
                            <strong>{item.product.name}</strong>
                            <small>Normal {formatCurrency(item.product.salePrice)}</small>
                          </span>
                          {form.type === "precio" && (
                            <Field label="Precio de oferta" prefix="$" inputMode="decimal" onInput={sanitizeDecimal} value={item.price} onChange={(event) => updateItem(item.product.id, { price: event.target.value })} hint={off > 0 ? `${off} % menos` : undefined} />
                          )}
                          {form.type === "combo" && (
                            <Field label="Cantidad" type="number" min={1} value={item.quantity} onChange={(event) => updateItem(item.product.id, { quantity: event.target.value })} />
                          )}
                          <button type="button" className="offer-items__remove" aria-label={`Quitar ${item.product.name}`} onClick={() => removeFrom("items", item.product.id)}>
                            <Icon name="trash" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
                {form.type === "combo" && <Field label="Precio del combo" required prefix="$" inputMode="decimal" onInput={sanitizeDecimal} value={form.price} onChange={(event) => set({ price: event.target.value })} />}
              </>
            )}
          </FormSection>

          <FormSection icon="bell" title="Cuándo y dónde" description={form.type === "rifa" ? "Las fechas son hasta cuándo se puede participar (normalmente hasta el día del sorteo)." : "Sin fechas, empieza ya y no vence. El límite es opcional."}>
            <div className="form-layout__row">
              <Field label="Desde" type="date" value={form.startsat} onChange={(event) => set({ startsat: event.target.value })} />
              <Field label="Hasta" type="date" value={form.endsat} onChange={(event) => set({ endsat: event.target.value })} />
            </div>
            <Field
              label="Límite"
              type="number"
              min={1}
              placeholder="Sin límite"
              hint={form.type === "rifa" ? "Máximo de oportunidades que se dan." : form.type === "regalo" ? "Máximo de regalos que se entregan." : form.type === "combo" ? "Máximo de combos." : form.type === "segundo" ? "Máximo de grupos con descuento." : "Máximo de unidades con el precio especial."}
              value={form.limit}
              onChange={(event) => set({ limit: event.target.value })}
            />
            <label className="offer-branches__all">
              <input type="checkbox" checked={form.allBranches} onChange={(event) => set({ allBranches: event.target.checked })} />
              Todas las sucursales
            </label>
            {!form.allBranches && (
              <div className="offer-branches">
                {branches.map((branch) => (
                  <label key={branch.id} className={`offer-branch ${form.branches.includes(branch.id) ? "is-on" : ""}`.trim()}>
                    <input
                      type="checkbox"
                      checked={form.branches.includes(branch.id)}
                      onChange={(event) => set({ branches: event.target.checked ? [...form.branches, branch.id] : form.branches.filter((id) => id !== branch.id) })}
                    />
                    {branch.name}
                  </label>
                ))}
              </div>
            )}
            <Field label="Nota (opcional)" maxLength={255} placeholder="Ej: hasta agotar existencias" value={form.description} onChange={(event) => set({ description: event.target.value })} />
          </FormSection>
        </div>
        <Preview form={form} />
      </div>
      <FormActions>
        <Button variant="outline" onClick={onCancel} disabled={busy}>
          {offer ? "Cancelar" : "Cambiar tipo"}
        </Button>
        <Button type="submit" icon="check" disabled={busy}>
          {busy ? "Guardando…" : offer ? "Guardar cambios" : "Crear oferta"}
        </Button>
      </FormActions>
    </FormLayout>
  );
};

/**
 * Crear o editar una oferta (Fase 31). offer: la que se edita (null = nueva); branches: [{ id, name }];
 * products: los activos para elegir. onSaved({ message, data }).
 */
const OfferFormModal = ({ open, offer, branches, products, onClose, onSaved }) => {
  const [type, setType] = useState(null);
  const close = () => {
    setType(null);
    onClose();
  };
  const chosen = offer?.type ?? type;
  return (
    <Modal open={open} size="xl" icon="sparkles" title={offer ? `Editar «${offer.name}»` : "Nueva oferta"} subtitle={chosen ? typeOf(chosen).label : "Elige el tipo"} onClose={close}>
      {open &&
        (chosen ? (
          <OfferForm
            key={`${offer?.id ?? "nueva"}-${chosen}`}
            offer={offer}
            type={chosen}
            branches={branches}
            products={products}
            onCancel={offer ? close : () => setType(null)}
            onSaved={(result) => {
              setType(null);
              onSaved(result);
            }}
          />
        ) : (
          <TypeChooser onChoose={setType} />
        ))}
    </Modal>
  );
};

export default OfferFormModal;
