import { useEffect, useMemo, useState } from "react";
import Button from "../../../components/ui/Button/Button";
import SearchInput from "../../../components/forms/SearchInput/SearchInput";
import StateMessage from "../../../components/feadback/StateMessage/StateMessage";
import useToast from "../../../components/feadback/Toast/useToast";
import DataTable from "../../../components/tables/DataTable/DataTable";
import Pagination from "../../../components/tables/Pagination/Pagination";
import { RowAction, RowActions } from "../../../components/tables/RowActions/RowActions";
import useActiveBranch from "../../branches/useActiveBranch";
import { formatDateTime } from "../../administration/audit/auditOptions";
import { formatDay } from "../../purchases/orders/orderOptions";
import ReceiveWarrantyModal from "../warranties/ReceiveWarrantyModal";
import WarrantyDetailModal from "../warranties/WarrantyDetailModal";
import WarrantyStatusBadge from "../warranties/WarrantyStatusBadge";
import useWarranties, { RESOLUTION_LABELS } from "../warranties/useWarranties";
import "../../../styles/listPage.css";
import "../../../styles/sheet.css";
import "../warranties/warranties.css";

const PAGE_SIZE = 25;
const SEARCH_DELAY_MS = 300;
const FILTERS = [
  { value: "abiertos", label: "Abiertos" },
  { value: "recibido", label: "Recibidos" },
  { value: "en_proveedor", label: "En el proveedor" },
  { value: "listo", label: "Listos para entregar" },
  { value: "entregado", label: "Entregados" },
  { value: "", label: "Todos" },
];

const columns = [
  {
    key: "number",
    header: "Caso",
    primary: true,
    render: (item) => (
      <div className="warranty-cell">
        <strong className="sheet__mono">{item.number}</strong>
        <span className="warranty-cell__meta">{formatDateTime(item.createdAt)}</span>
      </div>
    ),
  },
  {
    key: "product",
    header: "Producto",
    render: (item) => (
      <div className="warranty-cell">
        <span>
          {item.product?.name}
          {item.quantity > 1 && ` × ${item.quantity}`}
        </span>
        {item.unit && <span className="warranty-cell__meta sheet__mono">{item.unit.serial}</span>}
      </div>
    ),
  },
  {
    key: "customer",
    header: "Cliente",
    render: (item) => (
      <div className="warranty-cell">
        <span>{item.customer?.name ?? "Consumidor final"}</span>
        {item.sale && <span className="warranty-cell__meta">Venta {item.sale.number}</span>}
      </div>
    ),
  },
  {
    key: "coverage",
    header: "Garantía",
    render: (item) =>
      item.warrantyMonths ? (
        <span className={`warranty-coverage warranty-coverage--${item.inWarranty ? "ok" : "expired"}`}>
          {item.inWarranty ? "Vigente" : "Vencida"} · {formatDay(item.warrantyUntil)}
        </span>
      ) : (
        <span className="warranty-coverage warranty-coverage--none">Sin garantía</span>
      ),
  },
  {
    key: "status",
    header: "Estado",
    render: (item) => (
      <div className="warranty-cell">
        <WarrantyStatusBadge status={item.status} />
        {item.resolution && <span className="warranty-cell__meta">{RESOLUTION_LABELS[item.resolution]}</span>}
      </div>
    ),
  },
];

/**
 * Garantías: casos de productos que los clientes traen de una venta. Se reciben (buscando por IMEI,
 * serial o número de venta), se siguen (tienda o proveedor) y se entregan con su comprobante.
 * Sigue la sucursal activa del encabezado.
 */
const WarrantiesPage = () => {
  const { items, total, page, pages, loading, error, getWarranties, getWarranty, lookup, receive, act, getSettleOptions } = useWarranties();
  const { activeBranchId, activeBranch } = useActiveBranch();
  const toast = useToast();
  const [status, setStatus] = useState("abiertos");
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [receiving, setReceiving] = useState(false);
  const [viewing, setViewing] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(query.trim());
      setCurrentPage(1);
    }, SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const params = useMemo(
    () => ({
      ...(status && { status }),
      ...(search && { search }),
      ...(activeBranchId && { idbranch: activeBranchId }),
      page: currentPage,
      limit: PAGE_SIZE,
    }),
    [status, search, activeBranchId, currentPage]
  );

  useEffect(() => {
    getWarranties(params);
  }, [params, getWarranties]);

  const renderContent = () => {
    if (loading && items.length === 0) return <p className="sheet__loading">Cargando garantías…</p>;
    if (error) {
      return (
        <StateMessage tone="error" icon="alert" title="No pudimos cargar las garantías" text={error}>
          <Button variant="outline" icon="refresh" onClick={() => getWarranties(params)}>
            Reintentar
          </Button>
        </StateMessage>
      );
    }
    if (items.length === 0) {
      return (
        <StateMessage
          icon="inbox"
          title={search || status !== "abiertos" ? "Sin resultados" : "No hay garantías abiertas"}
          text={search || status !== "abiertos" ? "Ningún caso coincide con ese filtro o búsqueda." : "Cuando un cliente traiga un producto, recíbelo con «Recibir garantía»."}
        />
      );
    }
    return (
      <>
        <DataTable
          caption="Casos de garantía"
          columns={columns}
          rows={items}
          getRowKey={(item) => item.id}
          renderActions={(item) => (
            <RowActions>
              <RowAction icon="eye" label={`Ver el caso ${item.number}`} onClick={() => setViewing(item.id)} />
            </RowActions>
          )}
        />
        <Pagination page={page} pages={pages} total={total} label="casos" disabled={loading} onChange={setCurrentPage} />
      </>
    );
  };

  return (
    <section className="list-page">
      <header className="list-page__header">
        <div>
          <h1 className="list-page__title">Garantías</h1>
          <p className="list-page__subtitle">
            Productos que los clientes traen por garantía, desde que se reciben hasta que se entregan
            {activeBranch ? ` · ${activeBranch.name}` : ""}.
          </p>
        </div>
        <Button className="list-page__add" icon="plus" onClick={() => setReceiving(true)}>
          Recibir garantía
        </Button>
      </header>

      <div className="list-page__card">
        <div className="warranty-filters">
          <div className="sheet__chips" role="group" aria-label="Estado">
            {FILTERS.map((filter) => (
              <button
                key={filter.value || "todos"}
                type="button"
                className={`sheet__chip ${status === filter.value ? "sheet__chip--on" : ""}`.trim()}
                aria-pressed={status === filter.value}
                onClick={() => {
                  setStatus(filter.value);
                  setCurrentPage(1);
                }}
              >
                {filter.label}
              </button>
            ))}
          </div>
          <SearchInput label="Buscar caso" placeholder="Caso, venta, cliente, IMEI o producto" value={query} onChange={setQuery} />
        </div>
        {renderContent()}
      </div>

      <ReceiveWarrantyModal
        open={receiving}
        lookup={lookup}
        receive={receive}
        onClose={() => setReceiving(false)}
        onReceived={(item, message) => {
          setReceiving(false);
          toast.success(message ?? `Garantía ${item.number} recibida.`);
          setViewing(item.id);
        }}
      />
      <WarrantyDetailModal id={viewing} getWarranty={getWarranty} act={act} getSettleOptions={getSettleOptions} onChanged={() => getWarranties(params, { silent: true })} onClose={() => setViewing(null)} />
    </section>
  );
};

export default WarrantiesPage;
