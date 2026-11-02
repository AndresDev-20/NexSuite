import { useCallback, useEffect, useState } from "react";
import Button from "../../../components/ui/Button/Button";
import StateMessage from "../../../components/feadback/StateMessage/StateMessage";
import useToast from "../../../components/feadback/Toast/useToast";
import usePermissions from "../../auth/usePermissions";
import useActiveBranch from "../../branches/useActiveBranch";
import useCustomers from "../../sales/customers/useCustomers";
import SaleDoneModal from "../../sales/PosPage/SaleDoneModal";
import useOpenRegisters from "../../sales/sales/useOpenRegisters";
import useSaleOrders, { formatLeft, useSecondsLeft } from "../useSaleOrders";
import { formatCurrency } from "../../../utils/money";
import ChargeOrderModal from "./ChargeOrderModal";
import RejectOrderModal from "./RejectOrderModal";
import "../../../styles/listPage.css";
import "../../sales/PosPage/pos.css";
import "../saleOrders.css";

const REFRESH_MS = 15000;
const WARN_SECONDS = 5 * 60;

const timeOf = (value) => new Intl.DateTimeFormat("es-CO", { hour: "numeric", minute: "2-digit", timeZone: "America/Bogota" }).format(new Date(value));

/** Un pedido esperando: número grande, vendedor, productos, total y lo que le queda. */
const OrderCard = ({ order, showBranch, onCharge, onReject }) => {
  const left = useSecondsLeft(order.expiresAt);
  return (
    <li className={`orders-card ${left <= WARN_SECONDS ? "orders-card--late" : ""}`.trim()}>
      <div className="orders-card__head">
        <strong className="orders-number">#{order.id}</strong>
        <span className="orders-left" aria-label={`Vence en ${formatLeft(left)}`}>
          {left > 0 ? `Vence en ${formatLeft(left)}` : "Vencido"}
        </span>
      </div>
      <p className="pos__hint">
        Vendió <strong>{order.sellerName}</strong> · {timeOf(order.createdAt)}
        {showBranch && ` · ${order.branchName}`}
      </p>
      <ul className="orders-card__items">
        {order.items.map((item) => (
          <li key={item.id}>
            {item.quantity} × {item.name}
            {item.serials.length > 0 && <span className="pos-mono orders-card__serials">{item.serials.map((unit) => unit.serial).join(", ")}</span>}
          </li>
        ))}
      </ul>
      {order.notes && <p className="orders-card__notes">{order.notes}</p>}
      <div className="orders-card__foot">
        <strong className="orders-card__total">{formatCurrency(order.total)}</strong>
        <div className="orders-card__actions">
          <Button variant="outline" icon="x" onClick={() => onReject(order)} disabled={left === 0}>
            Rechazar
          </Button>
          <Button icon="check" onClick={() => onCharge(order)} disabled={left === 0}>
            Cobrar
          </Button>
        </div>
      </div>
    </li>
  );
};

/**
 * Pedidos a caja (Fase 18): los que enviaron los vendedores desde la tablet, el más viejo primero.
 * La caja los cobra tal cual (caja, cliente y pago) o los rechaza con motivo. Se actualiza sola.
 */
const OrdersQueuePage = () => {
  const toast = useToast();
  const { can } = usePermissions();
  const { activeBranchId, activeBranch } = useActiveBranch();
  const { items, loading, error, getOrders, chargeOrder, rejectOrder } = useSaleOrders();
  const { sessions, me, getRegisters } = useOpenRegisters();
  const { customers, getAllCustomers } = useCustomers();
  const canReadCustomers = can("customers.read");

  const [charging, setCharging] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [done, setDone] = useState(null);

  const load = useCallback((quiet) => getOrders({ status: "pendiente", ...(activeBranchId && { idbranch: activeBranchId }) }, { quiet }), [getOrders, activeBranchId]);

  useEffect(() => {
    load(false);
    const timer = setInterval(() => load(true), REFRESH_MS);
    return () => clearInterval(timer);
  }, [load]);

  useEffect(() => {
    getRegisters({ idbranch: activeBranchId });
  }, [getRegisters, activeBranchId]);

  useEffect(() => {
    if (canReadCustomers) getAllCustomers();
  }, [canReadCustomers, getAllCustomers]);

  const charge = async (payload, change) => {
    const { sale, message } = await chargeOrder(charging.id, payload);
    toast.success(message ?? `Pedido #${charging.id} cobrado.`);
    setCharging(null);
    setDone({ sale, change });
    load(true);
  };

  const reject = async (reason) => {
    const { message } = await rejectOrder(rejecting.id, reason);
    toast.success(message ?? `Pedido #${rejecting.id} rechazado.`);
    setRejecting(null);
    load(true);
  };

  return (
    <section className="list-page orders-queue">
      <header className="list-page__header">
        <div>
          <h1 className="list-page__title">Pedidos a caja</h1>
          <p className="list-page__subtitle">
            {activeBranch ? activeBranch.name : "Todas mis sucursales"} · los envían los vendedores desde la tablet; se actualiza solo
          </p>
        </div>
        <Button variant="outline" icon="refresh" onClick={() => load(false)}>
          Actualizar
        </Button>
      </header>

      {loading && items.length === 0 ? (
        <div className="list-page__card">
          <p className="pos__hint" role="status">
            Cargando pedidos…
          </p>
        </div>
      ) : error ? (
        <div className="list-page__card">
          <StateMessage icon="alert" tone="error" title="No pudimos cargar los pedidos" text={error}>
            <Button variant="outline" icon="refresh" onClick={() => load(false)}>
              Reintentar
            </Button>
          </StateMessage>
        </div>
      ) : items.length === 0 ? (
        <div className="list-page__card">
          <StateMessage icon="inbox" title="No hay pedidos esperando" text="Cuando un vendedor envíe un pedido desde la tablet, aparece aquí para cobrarlo." />
        </div>
      ) : (
        <ul className="orders-queue__list">
          {items.map((order) => (
            <OrderCard key={order.id} order={order} showBranch={!activeBranchId} onCharge={setCharging} onReject={setRejecting} />
          ))}
        </ul>
      )}

      <ChargeOrderModal
        order={charging}
        sessions={sessions}
        me={me}
        customers={customers}
        canReadCustomers={canReadCustomers}
        onCustomerCreated={getAllCustomers}
        onClose={() => setCharging(null)}
        onCharge={charge}
      />
      <RejectOrderModal order={rejecting} onClose={() => setRejecting(null)} onReject={reject} />
      <SaleDoneModal result={done} nextLabel="Siguiente pedido" onClose={() => setDone(null)} />
    </section>
  );
};

export default OrdersQueuePage;
