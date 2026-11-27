import { useEffect, useState } from "react";
import usePermissions from "../../auth/usePermissions";
import useToast from "../../../components/feadback/Toast/useToast";
import CancelReasonModal from "../receivables/CancelReasonModal";
import Button from "../../../components/ui/Button/Button";
import { FormActions } from "../../../components/forms/FormLayout/FormLayout";
import Modal from "../../../components/feadback/Modal/Modal";
import getErrorMessage from "../../../utils/getErrorMessage";
import { formatCurrency } from "../../../utils/money";
import { formatDateTime } from "../../administration/audit/auditOptions";
import { formatDay } from "../../purchases/orders/orderOptions";
import ReceiptActions from "./ReceiptActions";
import { getMethodLabel } from "./useSales";
import api from "../../../api/client";
import Field from "../../../components/forms/Field/Field";
import Select from "../../../components/forms/Select/Select";
import { sanitizeDecimal } from "../../../utils/validators";
import { NO_SURCHARGE } from "./paymentMethods";
import ReturnWizard from "../returns/ReturnWizard";
import ReturnDetailModal from "../returns/ReturnDetailModal";
import "../../../styles/sheet.css";
import "../returns/returns.css";
import { RaffleNotice } from "../offers/cartOffers";
import "./saleDetail.css";

const RETURN_LABELS = { devuelta: "Devuelta", "devuelta-parcial": "Devuelta en parte" };

/**
 * Fase 54: ajustar el recargo de la financiera de un pago (ventas hechas antes, sin recargo). Con «Ajustar recargo de
 * ventas»; no toca la caja ni la ganancia.
 */
const SurchargeEditor = ({ sale, payment, onDone, onCancel }) => {
  const toast = useToast();
  const base = payment.amount - payment.surcharge;
  const current = base > 0 ? Math.round((payment.surcharge / base) * 1000) / 10 : 0;
  const [percent, setPercent] = useState(String(current || ""));
  const [busy, setBusy] = useState(false);
  const preview = Math.round(base * (Number(percent) || 0)) / 100;
  const save = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      const response = await api.put(`/sales/${sale.id}/surcharge`, { idpayment: payment.id, surchargepercent: Math.min(Math.max(Number(percent) || 0, 0), 100) });
      toast.success(response.data?.message ?? "Recargo actualizado.");
      onDone();
    } catch (error) {
      toast.error(getErrorMessage(error, "No se pudo ajustar el recargo."));
      setBusy(false);
    }
  };
  return (
    <form className="sale-surcharge" onSubmit={save}>
      <Field label="% recargo" inputMode="decimal" maxLength={6} value={percent} onInput={sanitizeDecimal} onChange={(event) => setPercent(event.target.value)} data-autofocus />
      <span className="sale-surcharge__preview">
        {getMethodLabel(payment.method)} pagaría <strong>{formatCurrency(base + preview)}</strong> (recargo {formatCurrency(preview)})
      </span>
      <div className="sale-surcharge__actions">
        <Button type="submit" icon="check" disabled={busy}>
          {busy ? "Guardando…" : "Guardar recargo"}
        </Button>
        <Button variant="outline" disabled={busy} onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
};

/**
 * Fase 56: cambiar el vendedor (solo con «Cambiar el vendedor de una venta»): a quien puede vender en la sucursal de la
 * venta, con el motivo. La comisión pasa al correcto y queda en la auditoría.
 */
const SellerEditor = ({ sale, changeSeller, onDone, onCancel }) => {
  const toast = useToast();
  const [options, setOptions] = useState(null);
  const [iduser, setIduser] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  useEffect(() => {
    let current = true;
    api
      .get(`/sales/${sale.id}/seller-options`)
      .then((response) => current && setOptions(response.data.data))
      .catch((error) => current && (setOptions([]), setProblem(getErrorMessage(error, "No se pudieron cargar los vendedores."))));
    return () => {
      current = false;
    };
  }, [sale.id]);
  const save = async (event) => {
    event.preventDefault();
    if (!iduser) return setProblem("Elige el vendedor correcto.");
    if (reason.trim().length < 5) return setProblem("Escribe el motivo (mínimo 5 letras).");
    setBusy(true);
    setProblem("");
    try {
      const { sale: changed, message } = await changeSeller(sale.id, Number(iduser), reason.trim());
      toast.success(message ?? "Vendedor cambiado.");
      onDone(changed);
    } catch (error) {
      setProblem(getErrorMessage(error, "No se pudo cambiar el vendedor."));
      setBusy(false);
    }
  };
  return (
    <form className="sale-seller" onSubmit={save}>
      <p className="sale-seller__lead">
        Ahora: <strong>{sale.sellerName || "—"}</strong>. La comisión de la venta pasa al vendedor que elijas y el cambio queda en la auditoría.
      </p>
      <div className="sale-seller__fields">
        <Select
          label="Vendedor correcto"
          value={iduser}
          disabled={options === null}
          placeholder={options === null ? "Cargando…" : "Elige el vendedor"}
          options={(options ?? []).map((option) => ({ value: String(option.id), label: option.name }))}
          onChange={(event) => setIduser(event.target.value)}
        />
        <Field label="Motivo" maxLength={255} value={reason} placeholder="Ej.: se registró a nombre de otro vendedor" onChange={(event) => setReason(event.target.value)} />
      </div>
      {problem && (
        <p className="sale-seller__problem" role="alert">
          {problem}
        </p>
      )}
      <div className="sale-surcharge__actions">
        <Button type="submit" icon="check" disabled={busy}>
          {busy ? "Guardando…" : "Cambiar vendedor"}
        </Button>
        <Button variant="outline" disabled={busy} onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
};

/* ---------- Contenido (se monta por venta) ---------- */
const SaleSheet = ({ saleId, getSale, voidSale, changeSeller, onSellerChanged, onVoided, onReturned, onClose }) => {
  const [state, setState] = useState({ sale: null, loading: true, error: "" });
  const [voiding, setVoiding] = useState(null);
  const [returning, setReturning] = useState(false);
  const [viewingReturn, setViewingReturn] = useState(null);
  const [version, setVersion] = useState(0);
  const [surchargeOf, setSurchargeOf] = useState(null); // id del pago cuyo recargo se ajusta
  const [editingSeller, setEditingSeller] = useState(false);
  const { can } = usePermissions();
  const toast = useToast();

  useEffect(() => {
    let current = true;
    getSale(saleId)
      .then((sale) => current && setState({ sale, loading: false, error: "" }))
      .catch((error) => current && setState({ sale: null, loading: false, error: getErrorMessage(error, "No se pudo cargar la venta.") }));
    return () => {
      current = false;
    };
  }, [saleId, getSale, version]);

  const { sale, loading, error } = state;
  if (loading) return <p className="sheet__loading">Cargando la venta…</p>;
  if (error) return <p className="sheet__error">{error}</p>;

  // Anular: con el permiso, venta completada y su turno de caja abierto (el servidor lo vuelve a revisar)
  // Con devoluciones ya no se anula (Fase 46)
  const canVoid = Boolean(voidSale) && can("sales.void") && !sale.isVoided && sale.sessionOpen !== false && sale.returnedTotal === 0;
  // Devolver (Fase 46): con «Hacer devoluciones», venta completada y algo por devolver (el servidor lo vuelve a revisar)
  const canReturn = can("sales.return") && !sale.isVoided && sale.returnState !== "devuelta";
  const handleVoid = async (reason) => {
    const { sale: voided, message } = await voidSale(sale.id, reason);
    setState({ sale: voided, loading: false, error: "" });
    setVoiding(null);
    toast.success(message ?? `Venta ${voided.number} anulada.`);
    onVoided?.(voided);
  };

  return (
    <div className="sheet">
      {sale.isVoided && (
        <div className="sale-voided" role="status">
          <strong>Venta anulada</strong>
          <span>
            {sale.voidedAt ? formatDateTime(sale.voidedAt) : ""}
            {sale.voiderName && ` · por ${sale.voiderName}`}
          </span>
          {sale.voidReason && <span>Motivo: {sale.voidReason}</span>}
          <span className="sale-voided__note">No cuenta en caja, cartera ni reportes; sus productos volvieron al inventario.</span>
        </div>
      )}
      {sale.returnState && (
        <div className="sale-returned" role="status">
          <strong>{RETURN_LABELS[sale.returnState]}</strong>
          <span>
            Se devolvieron {formatCurrency(sale.returnedTotal)} de {formatCurrency(sale.total)}
            {sale.returns.length > 1 ? ` en ${sale.returns.length} devoluciones` : ""}. Lo devuelto volvió al inventario y el dinero salió por sus medios.
          </span>
        </div>
      )}
      <header className="sheet__head">
        <p className="sheet__name sheet__mono">
          {sale.number} {sale.isVoided && <span className="sheet__badge sheet__badge--empty">Anulada</span>}
          {sale.returnState && <span className={`return-badge ${sale.returnState === "devuelta" ? "return-badge--full" : ""}`.trim()}>{RETURN_LABELS[sale.returnState]}</span>}
        </p>
        <ul className="sheet__facts">
          <li>{formatDateTime(sale.createdAt)}</li>
          {sale.branch && <li>{sale.branch.name}</li>}
          {sale.registerName && <li>{sale.registerName}</li>}
          <li>Vendió {sale.sellerName || "—"}</li>
          {sale.registrarName && sale.registrarId !== sale.sellerId && <li>Registró {sale.registrarName}</li>}
        </ul>
        {sale.sellerChanges.length > 0 && (
          <ul className="sale-seller__history" aria-label="Cambios de vendedor">
            {sale.sellerChanges.map((change, index) => (
              <li key={index}>
                Vendedor cambiado el {formatDateTime(change.at)}
                {change.by && ` por ${change.by}`}: de <strong>{change.from || "—"}</strong> a <strong>{change.to || "—"}</strong>
                {change.reason && <span className="sale-seller__reason"> · {change.reason}</span>}
              </li>
            ))}
          </ul>
        )}
        {editingSeller ? (
          <SellerEditor
            sale={sale}
            changeSeller={changeSeller}
            onCancel={() => setEditingSeller(false)}
            onDone={(changed) => {
              setEditingSeller(false);
              setState({ sale: changed, loading: false, error: "" });
              onSellerChanged?.(changed);
            }}
          />
        ) : (
          changeSeller &&
          can("sales.change-seller") &&
          !sale.isVoided && (
            <button type="button" className="sale-surcharge__open sale-seller__open" onClick={() => setEditingSeller(true)}>
              Cambiar vendedor
            </button>
          )
        )}
        <ul className="sheet__facts">
          <li>
            Cliente: <strong>{sale.customer ? sale.customer.name : "Consumidor final"}</strong>
            {sale.customer?.document && ` · ${sale.customer.typeidentification} ${sale.customer.document}`}
          </li>
        </ul>
      </header>

      <div className="sheet__kpis">
        <div className="sheet__kpi sheet__kpi--money">
          <span className="sheet__kpi-value">{formatCurrency(sale.total)}</span>
          <span className="sheet__kpi-label">Total</span>
        </div>
        {sale.surcharge > 0 && (
          <div className="sheet__kpi sheet__kpi--money">
            <span className="sheet__kpi-value">+ {formatCurrency(sale.surcharge)}</span>
            <span className="sheet__kpi-label">Recargo financieras · total {formatCurrency(sale.total + sale.surcharge)}</span>
          </div>
        )}
        {sale.discount > 0 && (
          <div className="sheet__kpi">
            <span className="sheet__kpi-value">{formatCurrency(sale.discount)}</span>
            <span className="sheet__kpi-label">Descuentos</span>
          </div>
        )}
        {sale.profit !== null && (
          <div className="sheet__kpi sheet__kpi--money sheet__kpi--ok">
            <span className="sheet__kpi-value">{formatCurrency(sale.profit)}</span>
            <span className="sheet__kpi-label">Ganancia (costo {formatCurrency(sale.costTotal)})</span>
          </div>
        )}
        {sale.creditAmount > 0 && (
          <div className="sheet__kpi sheet__kpi--money sheet__kpi--low">
            <span className="sheet__kpi-value">{formatCurrency(sale.creditAmount)}</span>
            <span className="sheet__kpi-label">Fiado · vence {formatDay(sale.dueDate)}</span>
          </div>
        )}
      </div>

      <section className="sheet__section">
        <h3 className="sheet__section-title">
          Productos <span className="sheet__section-count">{sale.items.length}</span>
        </h3>
        <ul className="sheet__rows">
          {sale.items.map((item) => (
            <li className="sheet__row" key={item.id}>
              <div className="sheet__row-main">
                <span className="sheet__row-title">{item.name}</span>
                <span className="sheet__row-meta">
                  {item.sku} · {item.quantity} × {formatCurrency(item.unitPrice)}
                  {!item.gift && item.discount - item.offerDiscount > 0 && ` − ${formatCurrency(item.discount - item.offerDiscount)}`}
                </span>
                {item.returnedQty > 0 && (
                  <span className="sheet__row-meta">
                    <span className={`return-badge ${item.returnedQty >= item.quantity ? "return-badge--full" : ""}`.trim()}>
                      {item.returnedQty >= item.quantity ? "Devuelto" : `${item.returnedQty} devuelta${item.returnedQty === 1 ? "" : "s"}`}
                    </span>
                  </span>
                )}
                {item.gift && <span className="sheet__row-meta sheet__offer">🎁 Obsequio · {item.offerName}</span>}
                {!item.gift && item.offerDiscount > 0 && (
                  <span className="sheet__row-meta sheet__offer">
                    Oferta {item.offerName} · − {formatCurrency(item.offerDiscount)}
                  </span>
                )}
                {item.serials.map((unit) => (
                  <span className="sheet__row-meta" key={unit.id}>
                    <span className="sheet__mono">{unit.serial}</span>
                    {unit.imei2 && ` · IMEI 2 ${unit.imei2}`}
                    {unit.warrantyMonths > 0 && ` · garantía ${unit.warrantyMonths} meses`}
                  </span>
                ))}
              </div>
              <div className="sheet__row-side">
                <span className="sheet__number">{item.gift ? "Gratis" : formatCurrency(item.total)}</span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="sheet__section">
        <h3 className="sheet__section-title">Pagos</h3>
        <ul className="sheet__rows">
          {sale.payments.map((payment) => (
            <li className="sheet__row" key={payment.id}>
              <div className="sheet__row-main">
                <span className="sheet__row-title">{getMethodLabel(payment.method)}</span>
                {payment.reference && <span className="sheet__row-meta">Referencia {payment.reference}</span>}
                {payment.surcharge > 0 && (
                  <span className="sheet__row-meta sale-surcharge__tag">Incluye recargo {formatCurrency(payment.surcharge)} · no entra a la caja ni es ganancia</span>
                )}
                {surchargeOf === payment.id ? (
                  <SurchargeEditor
                    sale={sale}
                    payment={payment}
                    onCancel={() => setSurchargeOf(null)}
                    onDone={() => {
                      setSurchargeOf(null);
                      setVersion((value) => value + 1);
                    }}
                  />
                ) : (
                  can("sales.surcharge") &&
                  !sale.isVoided &&
                  sale.returnedTotal === 0 &&
                  !NO_SURCHARGE.includes(payment.method) && (
                    <button type="button" className="sale-surcharge__open" onClick={() => setSurchargeOf(payment.id)}>
                      {payment.surcharge > 0 ? "Cambiar recargo" : "Ajustar recargo"}
                    </button>
                  )
                )}
                {payment.received !== null && (
                  <span className="sheet__row-meta">
                    Recibido {formatCurrency(payment.received)} · cambios {formatCurrency(payment.change ?? 0)}
                  </span>
                )}
              </div>
              <div className="sheet__row-side">
                <span className="sheet__number">{formatCurrency(payment.amount)}</span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {sale.returns.length > 0 && (
        <section className="sheet__section">
          <h3 className="sheet__section-title">
            Devoluciones <span className="sheet__section-count">{sale.returns.length}</span>
          </h3>
          <ul className="sheet__rows">
            {sale.returns.map((item) => (
              <li className="sheet__row sale-return-item" key={item.id} onClick={() => setViewingReturn(item.id)}>
                <div className="sheet__row-main">
                  <span className="sheet__row-title sheet__mono">{item.number}</span>
                  <span className="sheet__row-meta">
                    {formatDateTime(item.createdAt)}
                    {item.userName && ` · ${item.userName}`}
                    {item.credit > 0 && ` · deuda − ${formatCurrency(item.credit)}`}
                  </span>
                  {item.reason && <span className="sheet__row-meta">Motivo: {item.reason}</span>}
                </div>
                <div className="sheet__row-side">
                  <span className="sheet__number">− {formatCurrency(item.total)}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {sale.notes && <p className="sheet__more">Notas: {sale.notes}</p>}

      {/* Fase 57: rifas en las que participa (las anuladas o devueltas ya no cuentan) */}
      {sale.raffles?.some((raffle) => raffle.chances > 0) && (
        <section className="sheet__section">
          <h3 className="sheet__section-title">Rifas</h3>
          <RaffleNotice raffles={sale.raffles.filter((raffle) => raffle.chances > 0)} />
        </section>
      )}

      <section className="sheet__section">
        <h3 className="sheet__section-title">Comprobante</h3>
        <ReceiptActions sale={sale} />
      </section>

      <FormActions>
        {canReturn && (
          <Button icon="refresh" className="sale-return-button" onClick={() => setReturning(true)}>
            Devolver
          </Button>
        )}
        {canVoid && (
          <Button
            variant="outline"
            icon="x"
            className="sale-void-button"
            onClick={() =>
              setVoiding({
                key: sale.id,
                title: `Anular la venta ${sale.number}`,
                confirmLabel: "Anular venta",
                text: `¿Anular la venta ${sale.number} por ${formatCurrency(sale.total)}? Sus productos vuelven al inventario, el efectivo sale del esperado de la caja y lo fiado de la cartera. Solo se puede mientras su turno de caja siga abierto. El número no se reutiliza y queda en el historial con el motivo.`,
              })
            }
          >
            Anular venta
          </Button>
        )}
        <Button variant="outline" onClick={onClose}>
          Cerrar
        </Button>
      </FormActions>
      <CancelReasonModal request={voiding} onClose={() => setVoiding(null)} onSubmit={handleVoid} />
      <ReturnWizard
        saleId={returning ? sale.id : null}
        onDone={(saleReturn) => {
          setVersion((value) => value + 1);
          onReturned?.(saleReturn);
        }}
        onClose={() => setReturning(false)}
      />
      <ReturnDetailModal returnId={viewingReturn} onClose={() => setViewingReturn(null)} />
    </div>
  );
};

/**
 * Detalle de una venta: productos, IMEI y garantía, pagos y (con "Ver ganancias") la ganancia.
 * Desde aquí se reimprime el comprobante, se descarga en PDF o se envía por correo, (con
 * "Anular ventas") se anula mientras su turno siga abierto y (con «Hacer devoluciones», Fase 46) se devuelve.
 * saleId null = cerrado. voidSale(id, reason), onVoided(venta) y onReturned(devolución) son opcionales: sin
 * voidSale no aparece Anular.
 */
const SaleDetailModal = ({ saleId, getSale, voidSale, changeSeller, onSellerChanged, onVoided, onReturned, onClose }) => (
  <Modal icon="cart" open={Boolean(saleId)} title="Detalle de la venta" size="wide" onClose={onClose}>
    {saleId && <SaleSheet key={saleId} saleId={saleId} getSale={getSale} voidSale={voidSale} changeSeller={changeSeller} onSellerChanged={onSellerChanged} onVoided={onVoided} onReturned={onReturned} onClose={onClose} />}
  </Modal>
);

export default SaleDetailModal;
