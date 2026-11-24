import { useEffect, useState } from "react";
import Icon from "../../../components/ui/Icon/Icon";
import Modal from "../../../components/feadback/Modal/Modal";
import SearchInput from "../../../components/forms/SearchInput/SearchInput";
import useActiveBranch from "../../branches/useActiveBranch";
import { formatDateTime } from "../../administration/audit/auditOptions";
import { formatCurrency } from "../../../utils/money";
import useSales, { getMethodLabel } from "../sales/useSales";
import "./returns.css";

const SEARCH_DELAY_MS = 300;

/** Por qué una venta no se puede devolver (null si se puede). */
const blockedReason = (sale) => {
  if (sale.isVoided) return "Anulada";
  if (sale.returnState === "devuelta") return "Ya devuelta";
  return null;
};

/**
 * Nueva devolución (Fase 46): buscar la venta en **todas las fechas** de la sucursal activa (número, cliente, IMEI o
 * nombre del producto —2026-11-24—)
 * y elegirla para abrir el asistente. onPick(saleId). open: abierto o cerrado.
 */
const FindSaleModal = ({ open, onPick, onClose }) => {
  const { items, loading, error, getSales } = useSales();
  const { activeBranchId, activeBranch } = useActiveBranch();
  const [query, setQuery] = useState("");
  const search = query.trim();

  useEffect(() => {
    if (!open || search.length < 2) return undefined;
    const timer = setTimeout(() => getSales({ search, page: 1, limit: 20, ...(activeBranchId && { idbranch: activeBranchId }) }), SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [open, search, activeBranchId, getSales]);

  const close = () => {
    setQuery("");
    onClose();
  };

  return (
    <Modal icon="search" open={open} title="Nueva devolución" subtitle="Busca la venta, de cualquier fecha" size="wide" onClose={close}>
      <div className="return-find">
        <SearchInput
          label="Buscar la venta"
          placeholder="Número de venta, cliente, documento, IMEI o producto"
          value={query}
          onChange={setQuery}
        />
        <p className="return-panel__lead">
          Se busca en todas las fechas{activeBranch ? ` de ${activeBranch.name}` : " de tus sucursales"}. Ventas viejas también: si pasó el plazo, solo la
          devuelve quien tenga «Devolver fuera de plazo».
        </p>

        {search.length < 2 ? (
          <div className="return-find__hint">
            <Icon name="barcode" />
            Escribe el número del comprobante, el cliente, el IMEI o el nombre del producto (ej.: «cargador 25w»).
          </div>
        ) : loading ? (
          <div className="return-loading" role="status">
            <span className="return-loading__spinner" aria-hidden="true" />
            Buscando…
          </div>
        ) : error ? (
          <p className="return-alert return-alert--stop">{error}</p>
        ) : items.length === 0 ? (
          <p className="return-alert return-alert--info">Ninguna venta coincide con «{search}».</p>
        ) : (
          <ul className="return-find__list">
            {items.map((sale, index) => {
              const blocked = blockedReason(sale);
              return (
                <li key={sale.id} style={{ "--i": index }}>
                  <button type="button" className="return-find__item" disabled={Boolean(blocked)} onClick={() => (setQuery(""), onPick(sale.id))}>
                    <span className="return-find__main">
                      <strong className="return-wizard__number">{sale.number}</strong>
                      <span className="return-find__meta">
                        {formatDateTime(sale.createdAt)} · {sale.customer?.name ?? "Consumidor final"}
                      </span>
                      <span className="return-find__meta">{[...new Set(sale.payments.map((payment) => getMethodLabel(payment.method)))].join(" + ")}</span>
                    </span>
                    <span className="return-find__side">
                      <strong>{formatCurrency(sale.total)}</strong>
                      {blocked ? (
                        <span className="return-badge return-badge--full">{blocked}</span>
                      ) : sale.returnState ? (
                        <span className="return-badge">Devuelta en parte</span>
                      ) : (
                        <span className="return-find__go">
                          Devolver <Icon name="chevron" />
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Modal>
  );
};

export default FindSaleModal;
