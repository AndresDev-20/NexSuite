import { useState } from "react";
import Button from "../../../components/ui/Button/Button";
import Icon from "../../../components/ui/Icon/Icon";
import Field from "../../../components/forms/Field/Field";
import Select from "../../../components/forms/Select/Select";
import Modal from "../../../components/feadback/Modal/Modal";
import { FormActions } from "../../../components/forms/FormLayout/FormLayout";
import { pickSession, rememberSession, sessionOptions } from "../../sales/sales/useOpenRegisters";
import { PAYMENT_METHODS, newSaleKey } from "../../sales/sales/useSales";
import { emptyPlan, planPayload, planProblems } from "../../sales/sales/InstallmentsEditor";
import { CreditPanel, buildPayments, creditAccess, downProblems, emptyDown } from "../../sales/sales/downPayment";
import usePermissions from "../../auth/usePermissions";
import NewCustomerButton from "../../sales/customers/NewCustomerButton";
import getErrorMessage from "../../../utils/getErrorMessage";
import { formatCurrency } from "../../../utils/money";
import { sanitizeDecimal } from "../../../utils/validators";

const cents = (value) => Math.round(Number(value || 0) * 100);
const pesos = (value) => value / 100;
const emptyPayment = (method = "efectivo", amount = "") => ({ key: newSaleKey(), method, amount, received: "", reference: "" });

/** Contenido del cobro (solo existe mientras el modal está abierto). */
const ChargeForm = ({ order, sessions, me, customers, canReadCustomers, onCustomerCreated, onCancel, onCharge }) => {
  // Solo las cajas abiertas de la sucursal del pedido
  const branchSessions = sessions.filter((session) => session.branchId === order.branchId);
  const [sessionId, setSessionId] = useState(() => String(pickSession(branchSessions, me)?.id ?? ""));
  const [customerId, setCustomerId] = useState("");
  const [payments, setPayments] = useState([emptyPayment()]);
  const [notes, setNotes] = useState("");
  // Hasta cuándo se fía: una fecha o en cuotas (Fase 19)
  const [plan, setPlan] = useState(emptyPlan);
  const [down, setDown] = useState(emptyDown);
  const { can } = usePermissions();
  const [saleKey] = useState(newSaleKey);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const total = cents(order.total);
  const singlePayment = payments.length === 1;
  const { effectivePayments, creditOnly } = buildPayments({ payments, total, down });
  const paid = effectivePayments.reduce((sum, payment) => sum + cents(payment.amount), 0);
  const pending = total - paid;

  const customer = customers.find((item) => String(item.id) === customerId) ?? null;
  const { canCredit, overLimit, problem: creditProblem } = creditAccess(customer, can("sales.credit-override"));
  const methods = PAYMENT_METHODS.filter((method) => method.value !== "credito" || canCredit);

  const updatePayment = (key, changes) => setPayments((current) => current.map((payment) => (payment.key === key ? { ...payment, ...changes } : payment)));
  const addPayment = () => setPayments([...effectivePayments, emptyPayment("transferencia", pending > 0 ? String(pesos(pending)) : "")]);
  const removePayment = (key) => setPayments((current) => current.filter((payment) => payment.key !== key));

  const cashPayment = effectivePayments.find((payment) => payment.method === "efectivo");
  const change = cashPayment && cashPayment.received ? cents(cashPayment.received) - cents(cashPayment.amount) : 0;
  const credit = effectivePayments.filter((payment) => payment.method === "credito").reduce((sum, payment) => sum + cents(payment.amount), 0);

  const problems = [];
  if (!sessionId) problems.push("Elige la caja donde se cobra.");
  if (pending !== 0) problems.push(pending > 0 ? `Faltan ${formatCurrency(pesos(pending))} por pagar.` : `Los pagos pasan el total por ${formatCurrency(pesos(-pending))}.`);
  if (payments.some((payment) => payment.method === "credito") && !canCredit) problems.push("Para fiar elige un cliente con cupo.");
  if (credit > 0 && creditProblem) problems.push(creditProblem);
  problems.push(...downProblems(down, total, creditOnly));
  if (cashPayment && cashPayment.received && change < 0) problems.push("Lo recibido en efectivo no alcanza.");
  problems.push(...planProblems(plan, pesos(credit), customer?.creditDays));

  const submit = async () => {
    if (problems.length > 0) return setError(problems[0]);
    setBusy(true);
    setError("");
    try {
      await onCharge(
        {
          idempotencykey: saleKey,
          idsession: Number(sessionId),
          ...(customer && { idcustomer: customer.id }),
          payments: effectivePayments
            .filter((payment) => cents(payment.amount) > 0)
            .map((payment) => ({
              method: payment.method,
              amount: Number(payment.amount),
              ...(payment.method === "efectivo" && payment.received && { received: Number(payment.received) }),
              ...(payment.reference.trim() && { reference: payment.reference.trim() }),
            })),
          ...planPayload(plan, pesos(credit), customer?.creditDays),
          ...(notes.trim() && { notes: notes.trim() }),
        },
        change > 0 ? pesos(change) : 0
      );
      rememberSession(Number(sessionId));
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo cobrar el pedido. Inténtalo de nuevo."));
      setBusy(false);
    }
  };

  return (
    <div className="orders-charge">
      <div className="orders-charge__summary">
        <span>
          Pedido <strong>#{order.id}</strong> · vendió {order.sellerName}
        </span>
        <strong className="orders-charge__total">{formatCurrency(order.total)}</strong>
      </div>
      <ul className="orders-card__items">
        {order.items.map((item) => (
          <li key={item.id}>
            {item.quantity} × {item.name}
            {item.serials.length > 0 && <span className="pos-mono orders-card__serials">{item.serials.map((unit) => unit.serial).join(", ")}</span>}
          </li>
        ))}
      </ul>

      {branchSessions.length === 0 ? (
        <p className="pos__error">No hay cajas abiertas en {order.branchName}: abre el turno de una caja para cobrarlo.</p>
      ) : (
        <Select label="Caja" required options={sessionOptions(branchSessions)} value={sessionId} hint="El efectivo entra a esta caja." onChange={(event) => setSessionId(event.target.value)} />
      )}

      {canReadCustomers ? (
        <Select
          label="Cliente"
          placeholder="Consumidor final"
          options={customers.filter((item) => item.isActive).map((item) => ({ value: String(item.id), label: `${item.name}${item.document ? ` · ${item.document}` : ""}` }))}
          value={customerId}
          hint={customer && customer.creditLimit > 0 ? `Cupo de crédito ${formatCurrency(customer.creditLimit)} a ${customer.creditDays} días` : undefined}
          onChange={(event) => {
            setCustomerId(event.target.value);
            setPlan(emptyPlan());
            setPayments((current) => current.map((payment) => (payment.method === "credito" ? { ...payment, method: "efectivo" } : payment)));
          }}
        />
      ) : (
        <p className="pos__hint">Cliente: consumidor final.</p>
      )}
      <NewCustomerButton
        onCreated={async (created) => {
          await onCustomerCreated?.();
          setCustomerId(String(created.id));
          setPlan(emptyPlan());
        }}
      />

      <h3 className="pos__section-title">Pago</h3>
      {creditOnly && customer ? (
        <CreditPanel
          customer={customer}
          overLimit={overLimit}
          credit={credit}
          down={down}
          onDownChange={setDown}
          plan={plan}
          onPlanChange={setPlan}
          methodControl={
            <Select
              label="Medio de pago"
              options={methods}
              value="credito"
              onChange={(event) => updatePayment(payments[0].key, { method: event.target.value, received: "", reference: "" })}
            />
          }
        />
      ) : (
      <ul className="pos__payments">
        {effectivePayments.map((payment) => (
          <li className="pos__payment" key={payment.key}>
            <Select label="Medio" options={methods} value={payment.method} onChange={(event) => updatePayment(payment.key, { method: event.target.value, received: "", reference: "" })} />
            <Field
              label="Valor"
              inputMode="decimal"
              autoComplete="off"
              maxLength={12}
              readOnly={singlePayment}
              onInput={sanitizeDecimal}
              value={payment.amount}
              onChange={(event) => updatePayment(payment.key, { amount: event.target.value })}
            />
            {payment.method === "efectivo" ? (
              <Field
                label="Recibido"
                inputMode="decimal"
                autoComplete="off"
                maxLength={12}
                placeholder="Con cuánto paga"
                onInput={sanitizeDecimal}
                value={payment.received}
                onChange={(event) => updatePayment(payment.key, { received: event.target.value })}
              />
            ) : payment.method !== "credito" ? (
              <Field
                label="Referencia"
                autoComplete="off"
                maxLength={100}
                placeholder="Nº de la transacción"
                value={payment.reference}
                onChange={(event) => updatePayment(payment.key, { reference: event.target.value })}
              />
            ) : (
              <p className="pos__hint">
                Queda fiado a {customer?.name}.{overLimit && " Sin cupo: con tu permiso «Fiar sin cupo»."}
              </p>
            )}
            {!singlePayment && (
              <button type="button" className="pos__remove" aria-label="Quitar este pago" onClick={() => removePayment(payment.key)}>
                <Icon name="x" />
              </button>
            )}
          </li>
        ))}
      </ul>
      )}
      {credit > 0 && customer && !creditOnly && (
        <CreditPanel customer={customer} overLimit={overLimit} credit={credit} showDown={false} plan={plan} onPlanChange={setPlan} />
      )}
      <div className="pos__pay-actions">
        <Button variant="outline" icon="plus" onClick={addPayment} disabled={payments.length >= 6}>
          Otro medio de pago
        </Button>
        {change > 0 && (
          <p className="pos__change" role="status">
            Cambios: <strong>{formatCurrency(pesos(change))}</strong>
          </p>
        )}
        {!singlePayment && pending !== 0 && (
          <p className={`pos__pending ${pending < 0 ? "pos__pending--over" : ""}`.trim()}>
            {pending > 0 ? `Falta ${formatCurrency(pesos(pending))}` : `Sobra ${formatCurrency(pesos(-pending))}`}
          </p>
        )}
      </div>

      <Field label="Notas" multiline maxLength={255} placeholder="Opcional" value={notes} onChange={(event) => setNotes(event.target.value)} />

      {error && (
        <p className="pos__error" role="alert">
          {error}
        </p>
      )}
      <FormActions>
        <Button variant="outline" onClick={onCancel} disabled={busy}>
          Volver
        </Button>
        <Button icon="check" onClick={submit} disabled={busy || branchSessions.length === 0}>
          {busy ? "Cobrando…" : `Cobrar ${formatCurrency(order.total)}`}
        </Button>
      </FormActions>
    </div>
  );
};

/**
 * Cobrar un pedido a caja tal como lo armó el vendedor: la caja, el cliente y la forma de pago.
 * order: el pedido o null (cerrado). onCharge(payload, change) async; lanza el error del servidor.
 */
const ChargeOrderModal = ({ order, onClose, ...props }) => (
  <Modal open={Boolean(order)} title="Cobrar pedido" onClose={onClose}>
    {order && <ChargeForm key={order.id} order={order} onCancel={onClose} {...props} />}
  </Modal>
);

export default ChargeOrderModal;
