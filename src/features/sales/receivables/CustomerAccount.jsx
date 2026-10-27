import { useCallback, useEffect, useState } from "react";
import useToast from "../../../components/feadback/Toast/useToast";
import getErrorMessage from "../../../utils/getErrorMessage";
import { formatCurrency } from "../../../utils/money";
import { formatDay } from "../../purchases/orders/orderOptions";
import CancelReasonModal from "./CancelReasonModal";
import CustomerAccountModal from "./CustomerAccountModal";
import CustomerPaymentModal from "./CustomerPaymentModal";
import OpeningBalanceModal from "./OpeningBalanceModal";
import { getMethodLabel } from "./useReceivables";
import useOpenRegisters, { pickSession, sessionOptions } from "../sales/useOpenRegisters";

const LOADING = { open: true, account: null, loading: true, error: "" };

/** Contenido para un cliente (se monta por cliente): carga su cuenta al abrir. */
const AccountFlow = ({ request, receivables, canPay, canManage, onClose }) => {
  const { getAccount, addPayment, cancelPayment, addOpeningBalance, cancelOpeningBalance } = receivables;
  const toast = useToast();
  const [state, setState] = useState(LOADING);
  const [paying, setPaying] = useState(Boolean(request.pay && canPay));
  const [addingBalance, setAddingBalance] = useState(false);
  const [cancelling, setCancelling] = useState(null);
  const customerId = request.id;
  // Caja compartida: el efectivo de un abono (o de su anulación) va a la caja abierta que se elija
  const registers = useOpenRegisters();
  const { getRegisters } = registers;

  const fetchAccount = useCallback(
    () =>
      getAccount(customerId)
        .then((account) => ({ open: true, account, loading: false, error: "" }))
        .catch((error) => ({ open: true, account: null, loading: false, error: getErrorMessage(error, "No se pudo cargar la cuenta.") })),
    [customerId, getAccount]
  );

  useEffect(() => {
    if (canPay || canManage) getRegisters();
  }, [canPay, canManage, getRegisters]);

  useEffect(() => {
    let current = true;
    fetchAccount().then((next) => current && setState(next));
    return () => {
      current = false;
    };
  }, [fetchAccount]);

  const load = async ({ silent = false } = {}) => {
    if (!silent) setState(LOADING);
    const next = await fetchAccount();
    // Al refrescar tras una acción, si falla se deja lo que ya se veía
    if (!silent || !next.error) setState(next);
  };

  const { account } = state;

  const handlePay = async (payload) => {
    const result = await addPayment(customerId, payload);
    const { owed, customer } = result.account;
    toast.success(owed > 0 ? `Abono registrado. ${customer.name} debe ahora ${formatCurrency(owed)}.` : `Abono registrado. ${customer.name} quedó a paz y salvo.`);
    setState((current) => ({ ...current, account: result.account }));
    setPaying(false);
  };

  const handleAddBalance = async (payload) => {
    await addOpeningBalance(customerId, payload);
    toast.success("Saldo inicial cargado.");
    setAddingBalance(false);
    await load({ silent: true });
  };

  const handleCancel = async (reason, idsession) => {
    if (cancelling.kind === "payment") await cancelPayment(cancelling.id, reason, idsession);
    else await cancelOpeningBalance(cancelling.id, reason);
    toast.success(cancelling.kind === "payment" ? `Abono #${cancelling.id} anulado.` : "Saldo inicial anulado.");
    setCancelling(null);
    await load({ silent: true });
  };

  return (
    <>
      <CustomerAccountModal
        state={state}
        canPay={canPay}
        canManage={canManage}
        onRetry={() => load()}
        onClose={onClose}
        onPay={() => setPaying(true)}
        onAddBalance={() => setAddingBalance(true)}
        onCancelPayment={(payment) =>
          setCancelling({
            kind: "payment",
            id: payment.id,
            key: `payment-${payment.id}`,
            title: "Anular abono",
            confirmLabel: "Anular abono",
            text: `¿Anular el abono #${payment.id} de ${formatCurrency(payment.amount)} (${getMethodLabel(payment.method)})? Lo abonado vuelve a las deudas${
              payment.method === "efectivo" ? " y el efectivo sale de la caja que elijas" : ""
            }. Queda en el historial con el motivo.`,
            ...(payment.method === "efectivo" && {
              session: {
                options: sessionOptions(registers.sessions),
                default: String(pickSession(registers.sessions, registers.me)?.id ?? ""),
              },
            }),
          })
        }
        onCancelBalance={(balance) =>
          setCancelling({
            kind: "balance",
            id: balance.id,
            key: `balance-${balance.id}`,
            title: "Anular saldo inicial",
            confirmLabel: "Anular saldo",
            text: `¿Anular el saldo inicial de ${formatCurrency(balance.amount)} del ${formatDay(balance.issuedAt)}? Deja de contar como deuda y queda en el historial con el motivo.`,
          })
        }
      />

      <CustomerPaymentModal
        registers={registers}
        target={paying && account ? { id: account.customer.id, name: account.customer.name, owed: account.owed, debts: account.debts } : null}
        onClose={() => setPaying(false)}
        onSubmit={handlePay}
      />
      <OpeningBalanceModal customer={addingBalance && account ? account.customer : null} onClose={() => setAddingBalance(false)} onSubmit={handleAddBalance} />
      <CancelReasonModal request={cancelling} onClose={() => setCancelling(null)} onSubmit={handleCancel} />
    </>
  );
};

/**
 * Estado de cuenta de un cliente con sus acciones: registrar abono, anular abono y cargar o anular
 * saldos iniciales. request: { id, pay } o null (cerrado); pay abre directo el abono.
 * receivables: las acciones de useReceivables. canPay / canManage: permisos de cartera.
 */
const CustomerAccount = ({ request, ...props }) =>
  request ? <AccountFlow key={`${request.id}-${request.pay}`} request={request} {...props} /> : null;

export default CustomerAccount;
