import { useEffect, useState } from "react";
import Button from "../../../components/ui/Button/Button";
import { FormActions } from "../../../components/forms/FormLayout/FormLayout";
import Modal from "../../../components/feadback/Modal/Modal";
import useToast from "../../../components/feadback/Toast/useToast";
import usePermissions from "../../auth/usePermissions";
import useSuppliers from "../../purchases/suppliers/useSuppliers";
import { formatDateTime } from "../../administration/audit/auditOptions";
import { formatDay } from "../../purchases/orders/orderOptions";
import getErrorMessage from "../../../utils/getErrorMessage";
import { formatCurrency } from "../../../utils/money";
import SettleWarrantyModal from "./SettleWarrantyModal";
import WarrantyStepModal from "./WarrantyStepModal";
import WarrantyStatusBadge from "./WarrantyStatusBadge";
import { EVENT_LABELS, RESOLUTION_LABELS, downloadWarrantyDocument, printWarrantyDocument } from "./useWarranties";
import "../../../styles/sheet.css";
import "./warranties.css";

/** Botones del comprobante (recibido o entrega): imprimir en tirilla o carta y descargar el PDF. */
const DocumentButtons = ({ item, type, label }) => {
  const toast = useToast();
  const [busy, setBusy] = useState("");
  const run = async (key, action) => {
    setBusy(key);
    try {
      await action();
    } catch (error) {
      toast.error(getErrorMessage(error, "No se pudo preparar el comprobante."));
    } finally {
      setBusy("");
    }
  };
  return (
    <div className="warranty-docs">
      <span className="warranty-docs__label">{label}</span>
      <div className="warranty-docs__buttons">
        <Button icon="printer" disabled={Boolean(busy)} onClick={() => run("tirilla", () => printWarrantyDocument(item.id, type, "tirilla"))}>
          {busy === "tirilla" ? "Preparando…" : "Tirilla"}
        </Button>
        <Button variant="outline" icon="printer" disabled={Boolean(busy)} onClick={() => run("carta", () => printWarrantyDocument(item.id, type, "carta"))}>
          {busy === "carta" ? "Preparando…" : "Carta"}
        </Button>
        <Button variant="outline" icon="download" disabled={Boolean(busy)} onClick={() => run("pdf", () => downloadWarrantyDocument(item, type))}>
          {busy === "pdf" ? "Descargando…" : "PDF"}
        </Button>
      </div>
    </div>
  );
};

/** Se puede cambiar o devolver: garantía vigente, recién recibido o con el rechazo del proveedor. */
const canSettle = (item) => item.inWarranty && (item.status === "recibido" || (item.status === "listo" && item.resolution === "proveedor_rechazo"));

const CaseSheet = ({ id, getWarranty, act, getSettleOptions, onChanged, onClose }) => {
  const toast = useToast();
  const { can } = usePermissions();
  const { suppliers, getAllSuppliers } = useSuppliers();
  const [state, setState] = useState({ item: null, loading: true, error: "" });
  const [step, setStep] = useState(null);
  const [settling, setSettling] = useState(false);
  const canReadSuppliers = can("suppliers.read");
  const canApprove = can("warranties.approve");

  useEffect(() => {
    let current = true;
    getWarranty(id)
      .then((item) => current && setState({ item, loading: false, error: "" }))
      .catch((error) => current && setState({ item: null, loading: false, error: getErrorMessage(error, "No se pudo cargar el caso.") }));
    return () => {
      current = false;
    };
  }, [id, getWarranty]);

  useEffect(() => {
    if (canReadSuppliers) getAllSuppliers();
  }, [canReadSuppliers, getAllSuppliers]);

  const { item, loading, error } = state;
  if (loading) return <p className="sheet__loading">Cargando el caso…</p>;
  if (error) return <p className="sheet__error">{error}</p>;

  /** Ejecuta un paso, muestra el caso actualizado y avisa a la lista. */
  const runStep = (action, payload) =>
    act(item.id, action, payload).then(({ item: updated, message }) => {
      setState({ item: updated, loading: false, error: "" });
      toast.success(message ?? "Caso actualizado.");
      onChanged?.(updated);
    });

  const openStep = (request) => setStep({ key: `${request.title}-${Date.now()}`, ...request });

  const steps = {
    ready: () =>
      openStep({
        title: "Listo para entregar",
        text: "Sin pasar por el proveedor: ¿se reparó en la tienda o no aplica la garantía? Si no aplica, se le devuelve sin cobrar.",
        submitLabel: "Marcar listo",
        fields: [
          {
            name: "resolution",
            label: "Solución",
            kind: "choice",
            required: true,
            initial: item.inWarranty ? "reparado" : "no_aplica",
            options: [
              { value: "reparado", label: "Reparado en la tienda", hint: "Se le entrega el mismo equipo funcionando." },
              { value: "no_aplica", label: "No aplica la garantía", hint: "Vencida o por mal uso: se devuelve sin cobrar." },
            ],
          },
          { name: "note", label: "Qué se hizo o por qué no aplica", kind: "textarea", placeholder: "Ej: se cambió el conector de carga" },
        ],
        run: (values) => runStep("ready", values),
      }),
    supplier: () =>
      openStep({
        title: "Enviar al proveedor",
        text: item.unit ? `La unidad ${item.unit.serial} queda registrada como "en el proveedor" hasta su respuesta.` : "El caso queda en el proveedor hasta su respuesta.",
        submitLabel: "Enviar al proveedor",
        fields: [
          ...(canReadSuppliers
            ? [
                {
                  name: "idsupplier",
                  label: "Proveedor",
                  kind: "select",
                  placeholder: "Elige el proveedor",
                  options: [...suppliers].sort((a, b) => a.companyname.localeCompare(b.companyname, "es")).map((supplier) => ({ value: String(supplier.id), label: supplier.companyname })),
                },
              ]
            : []),
          { name: "reference", label: "Guía o referencia", kind: "text", placeholder: "Opcional: número de guía o del caso con el proveedor" },
          { name: "note", label: "Nota", kind: "textarea", placeholder: "Opcional" },
        ],
        run: ({ idsupplier, ...rest }) => runStep("send-supplier", { ...rest, ...(idsupplier && { idsupplier: Number(idsupplier) }) }),
      }),
    response: () =>
      openStep({
        title: "Respuesta del proveedor",
        submitLabel: "Guardar respuesta",
        fields: [
          {
            name: "result",
            label: "Respuesta",
            kind: "choice",
            required: true,
            options: [
              { value: "reparado", label: "Lo reparó", hint: "Vuelve el mismo equipo para entregar." },
              { value: "cambiado", label: "Lo cambió", hint: item.product?.hasSerial ? "Envió otro equipo: escribe su IMEI o serial." : "Envió otro igual." },
              { value: "rechazado", label: "Rechazó la garantía", hint: "Vuelve el mismo equipo sin reparar." },
            ],
          },
          ...(item.product?.hasSerial
            ? [
                { name: "serial", label: "IMEI o serial del equipo nuevo", kind: "text", required: true, showIf: (values) => values.result === "cambiado" },
                { name: "imei2", label: "IMEI 2 (opcional)", kind: "text", showIf: (values) => values.result === "cambiado" },
              ]
            : []),
          { name: "note", label: "Nota", kind: "textarea", placeholder: "Opcional: lo que respondió el proveedor" },
        ],
        run: (values) => runStep("supplier-response", values),
      }),
    deliver: () =>
      openStep({
        title: "Entregar al cliente",
        text: item.replacementUnit
          ? `Se le entrega el equipo nuevo (${item.replacementUnit.serial}), con la misma garantía de la venta.`
          : "Se le entrega el producto. Imprime el comprobante de entrega para que lo firme.",
        submitLabel: "Entregar",
        fields: [{ name: "note", label: "Nota", kind: "textarea", placeholder: "Opcional" }],
        run: (values) => runStep("deliver", values),
      }),
    note: () =>
      openStep({
        title: "Agregar nota",
        submitLabel: "Agregar nota",
        fields: [{ name: "note", label: "Nota", kind: "textarea", required: true, placeholder: "Ej: el cliente llamó a preguntar" }],
        run: (values) => runStep("notes", values),
      }),
  };

  return (
    <div className="sheet">
      <header className="sheet__head">
        <p className="sheet__name">
          <span className="sheet__mono">{item.number}</span> <WarrantyStatusBadge status={item.status} />
        </p>
        <ul className="sheet__facts">
          <li>Recibido {formatDateTime(item.createdAt)}</li>
          <li>{item.branchName}</li>
          {item.receiverName && <li>Recibió {item.receiverName}</li>}
        </ul>
        <ul className="sheet__facts">
          <li>
            Cliente: <strong>{item.customer?.name ?? "Consumidor final"}</strong>
            {item.customer?.phone && ` · ${item.customer.phone}`}
          </li>
          {item.sale && <li>Venta {item.sale.number} del {formatDateTime(item.sale.createdAt)}</li>}
        </ul>
      </header>

      <div className={`warranty-banner warranty-banner--${item.warrantyMonths ? (item.inWarranty ? "ok" : "expired") : "none"}`}>
        <strong>
          {item.warrantyMonths ? (item.inWarranty ? "Garantía vigente" : "Garantía vencida") : "Sin garantía registrada"}
        </strong>
        <span>
          {item.warrantyMonths
            ? `${item.warrantyMonths} meses desde la venta, hasta ${formatDay(item.warrantyUntil)} (al recibirlo).`
            : "El producto no tenía meses de garantía el día de la venta."}
        </span>
      </div>

      <section className="sheet__section">
        <h3 className="sheet__section-title">Producto</h3>
        <ul className="sheet__rows">
          <li className="sheet__row">
            <div className="sheet__row-main">
              <span className="sheet__row-title">
                {item.product?.name}
                {item.quantity > 1 && ` × ${item.quantity}`}
              </span>
              {item.unit && (
                <span className="sheet__row-meta">
                  IMEI/Serial <span className="sheet__mono">{item.unit.serial}</span>
                  {item.unit.imei2 && ` · IMEI 2 ${item.unit.imei2}`}
                </span>
              )}
              {item.replacementUnit && (
                <span className="sheet__row-meta">
                  {item.resolution === "cambiado" ? "Equipo que se le entregó" : "Equipo nuevo del proveedor"}:{" "}
                  <span className="sheet__mono">{item.replacementUnit.serial}</span>
                </span>
              )}
              {item.resolution === "reembolsado" && (
                <span className="sheet__row-meta">
                  Se devolvieron <strong>{formatCurrency(item.refundAmount)}</strong>
                  {item.refundCredit > 0 && ` · ${formatCurrency(item.refundCredit)} rebajado de la deuda`}
                  {item.refundCash > 0 && ` · ${formatCurrency(item.refundCash)} en efectivo`}
                </span>
              )}
              {item.resolution && <span className="sheet__row-meta">Solución: {RESOLUTION_LABELS[item.resolution] ?? item.resolution}</span>}
              {item.supplier && (
                <span className="sheet__row-meta">
                  Proveedor: {item.supplier.name}
                  {item.supplierReference && ` · guía ${item.supplierReference}`}
                </span>
              )}
            </div>
          </li>
        </ul>
        <dl className="warranty-facts">
          <div>
            <dt>Falla que reporta el cliente</dt>
            <dd>{item.problem}</dd>
          </div>
          <div>
            <dt>Estado del equipo</dt>
            <dd>{item.condition || "Sin observaciones"}</dd>
          </div>
          <div>
            <dt>Accesorios que dejó</dt>
            <dd>{item.accessories || "Ninguno"}</dd>
          </div>
        </dl>
      </section>

      {item.status !== "entregado" && (
        <section className="sheet__section">
          <h3 className="sheet__section-title">Siguiente paso</h3>
          <div className="warranty-actions">
            {item.status === "recibido" && (
              <>
                <Button icon="check" onClick={steps.ready}>
                  Listo para entregar
                </Button>
                <Button variant="outline" icon="inbox" onClick={steps.supplier}>
                  Enviar al proveedor
                </Button>
              </>
            )}
            {item.status === "en_proveedor" && (
              <Button icon="check" onClick={steps.response}>
                Respuesta del proveedor
              </Button>
            )}
            {item.status === "listo" && (
              <Button icon="check" onClick={steps.deliver}>
                Entregar al cliente
              </Button>
            )}
            {canApprove && canSettle(item) && (
              <Button variant="outline" icon="refresh" onClick={() => setSettling(true)}>
                Cambiar o devolver dinero
              </Button>
            )}
            <Button variant="outline" icon="edit" onClick={steps.note}>
              Agregar nota
            </Button>
          </div>
        </section>
      )}

      <section className="sheet__section">
        <h3 className="sheet__section-title">
          Historial <span className="sheet__section-count">{item.events.length}</span>
        </h3>
        <ol className="warranty-timeline">
          {item.events.map((event) => (
            <li className="warranty-timeline__item" key={event.id}>
              <span className="warranty-timeline__dot" aria-hidden="true" />
              <div>
                <p className="warranty-timeline__title">{EVENT_LABELS[event.type] ?? event.type}</p>
                {event.note && <p className="warranty-timeline__note">{event.note}</p>}
                <p className="warranty-timeline__meta">
                  {formatDateTime(event.createdAt)}
                  {event.userName && ` · ${event.userName}`}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="sheet__section">
        <h3 className="sheet__section-title">Comprobantes</h3>
        <DocumentButtons item={item} type="recepcion" label="Recibido (para el cliente)" />
        {item.status === "entregado" && <DocumentButtons item={item} type="entrega" label="Entrega (para que firme)" />}
      </section>

      <FormActions>
        <Button variant="outline" onClick={onClose}>
          Cerrar
        </Button>
      </FormActions>

      <WarrantyStepModal request={step} onClose={() => setStep(null)} />
      <SettleWarrantyModal
        item={settling ? item : null}
        getSettleOptions={getSettleOptions}
        act={act}
        onClose={() => setSettling(false)}
        onDone={({ item: updated, message }) => {
          setSettling(false);
          setState({ item: updated, loading: false, error: "" });
          toast.success(message ?? "Caso resuelto.");
          onChanged?.(updated);
        }}
      />
    </div>
  );
};

/**
 * Detalle de un caso de garantía: datos, cobertura, historial, el siguiente paso según su estado
 * (listo, proveedor, respuesta, entregar, cambiar o devolver dinero, nota) y los comprobantes.
 * id null = cerrado.
 */
const WarrantyDetailModal = ({ id, getWarranty, act, getSettleOptions, onChanged, onClose }) => (
  <Modal open={Boolean(id)} title="Caso de garantía" size="wide" onClose={onClose}>
    {id && <CaseSheet key={id} id={id} getWarranty={getWarranty} act={act} getSettleOptions={getSettleOptions} onChanged={onChanged} onClose={onClose} />}
  </Modal>
);

export default WarrantyDetailModal;
