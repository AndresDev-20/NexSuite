import { useEffect, useState } from "react";
import Button from "../../../components/ui/Button/Button";
import Field from "../../../components/forms/Field/Field";
import { FormActions } from "../../../components/forms/FormLayout/FormLayout";
import Modal from "../../../components/feadback/Modal/Modal";
import useToast from "../../../components/feadback/Toast/useToast";
import { todayInColombia } from "../../../utils/dates";
import getErrorMessage from "../../../utils/getErrorMessage";
import { formatCurrency } from "../../../utils/money";
import { AnimatedNumber } from "../../dashboard/charts";
import { downloadBalance, getBalancePreview } from "./balance";
import "./balanceModal.css";

const formatMoney = (value) => formatCurrency(Math.round(value));
const trendLabel = (value) => (value === null || value === undefined ? "Sin mes anterior para comparar" : `${value >= 0 ? "+" : ""}${String(value).replace(".", ",")}% vs. mes anterior`);

/** Vista previa del mes: las cifras clave cuentan hasta su valor y entran en cascada. */
const Preview = ({ month }) => {
  const [state, setState] = useState({ data: null, loading: true, error: "" });

  useEffect(() => {
    let current = true;
    getBalancePreview(month)
      .then((data) => current && setState({ data, loading: false, error: "" }))
      .catch((error) => current && setState({ data: null, loading: false, error: getErrorMessage(error, "No se pudo calcular el balance.") }));
    return () => {
      current = false;
    };
  }, [month]);

  if (state.loading) return <p className="balance-modal__status">Calculando el balance de este mes…</p>;
  if (state.error) return <p className="balance-modal__status balance-modal__status--error">{state.error}</p>;

  const { summary } = state.data;
  const cards = [
    { label: "Vendido", value: summary.sold, detail: trendLabel(summary.trends.sold), tone: "brand" },
    { label: "Ganancia bruta", value: summary.profit, detail: `${String(summary.margin).replace(".", ",")}% del vendido`, tone: "ok" },
    { label: "Compras (inversión)", value: summary.purchases, detail: trendLabel(summary.trends.purchases) },
    { label: "Dinero que entró", value: summary.moneyIn, detail: `Salió ${formatMoney(summary.moneyOut)}` },
  ];

  return (
    <div className="balance-modal__preview">
      <p className="balance-modal__range">
        {state.data.complete ? "Mes completo" : "Mes en curso: hasta hoy"} · {summary.count} {summary.count === 1 ? "venta" : "ventas"} · Todas las sucursales
      </p>
      <div className="balance-modal__cards">
        {cards.map((card, index) => (
          <div className={`balance-modal__card ${card.tone ? `balance-modal__card--${card.tone}` : ""}`.trim()} key={card.label} style={{ "--i": index }}>
            <span className="balance-modal__label">{card.label}</span>
            <strong className="balance-modal__value">
              <AnimatedNumber value={card.value} format={formatMoney} />
            </strong>
            <span className="balance-modal__detail">{card.detail}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Balance mensual: se elige el mes (no futuro), se ve un adelanto de sus cifras y se descarga en
 * PDF (para guardar o imprimir) o Excel (para hacer cuentas). open / onClose.
 */
const BalanceModal = ({ open, onClose }) => {
  const toast = useToast();
  const currentMonth = todayInColombia().slice(0, 7);
  const [month, setMonth] = useState(currentMonth);
  const [busy, setBusy] = useState("");

  const valid = /^\d{4}-\d{2}$/.test(month) && month <= currentMonth;

  const download = async (format) => {
    setBusy(format);
    try {
      await downloadBalance(month, format);
      toast.success(`Balance de ${month} descargado en ${format === "pdf" ? "PDF" : "Excel"}.`);
    } catch (error) {
      toast.error(getErrorMessage(error, "No se pudo descargar el balance."));
    } finally {
      setBusy("");
    }
  };

  return (
    <Modal open={open} title="Balance mensual" onClose={onClose} busy={Boolean(busy)}>
      {open && (
        <div className="balance-modal">
          <p className="balance-modal__intro">
            Ventas, ganancia, compras, inventario, cartera, cuentas por pagar y caja del mes elegido, de todas las sucursales.
          </p>
          <Field
            label="Mes"
            type="month"
            max={currentMonth}
            value={month}
            error={month && !valid ? "Elige un mes que no sea futuro." : undefined}
            onChange={(event) => setMonth(event.target.value)}
          />
          {valid && <Preview key={month} month={month} />}
          <p className="balance-modal__note">Inventario, lo que nos deben y lo que debemos salen con los valores de hoy (el sistema no guarda el estado de cada día).</p>
          <FormActions>
            <Button variant="outline" onClick={onClose} disabled={Boolean(busy)}>
              Cerrar
            </Button>
            <Button variant="outline" icon="download" disabled={!valid || Boolean(busy)} onClick={() => download("xlsx")}>
              {busy === "xlsx" ? "Preparando…" : "Descargar Excel"}
            </Button>
            <Button icon="download" disabled={!valid || Boolean(busy)} onClick={() => download("pdf")}>
              {busy === "pdf" ? "Preparando…" : "Descargar PDF"}
            </Button>
          </FormActions>
        </div>
      )}
    </Modal>
  );
};

export default BalanceModal;
