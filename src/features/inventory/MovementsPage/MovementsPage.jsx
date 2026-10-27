import { useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import Button from "../../../components/ui/Button/Button";
import Field from "../../../components/forms/Field/Field";
import Select from "../../../components/forms/Select/Select";
import StateMessage from "../../../components/feadback/StateMessage/StateMessage";
import Pagination from "../../../components/tables/Pagination/Pagination";
import NoBranchesMessage from "../../../features/branches/NoBranchesMessage";
import useActiveBranch from "../../../features/branches/useActiveBranch";
import usePermissions from "../../../features/auth/usePermissions";
import { MOVEMENT_TYPES } from "../../../features/inventory/branchStock/stockOptions";
import MovementsTable from "../../../features/inventory/movements/MovementsTable";
import useStockMovements from "../../../features/inventory/movements/useStockMovements";
import useProducts from "../../../features/inventory/products/useProducts";
import { todayInColombia } from "../../../utils/dates";
import "../../../styles/listPage.css";
import "./movementsPage.css";

const PAGE_SIZE = 50;
const SKELETON_ITEMS = 5;
// idproduct + idbranch llegan desde Existencias ("Ver movimientos"); sin idbranch manda la sucursal activa
const FILTER_KEYS = ["idproduct", "idbranch", "type", "from", "to"];

const MovementsPage = () => {
  const { items, total, page, pages, loading, error, getMovements } = useStockMovements();
  const { products, getAllProducts } = useProducts();
  const { status: branchStatus, branches, hasBranches, activeBranchId } = useActiveBranch();
  const { can } = usePermissions();

  // Los filtros viven en la URL: se pueden compartir y el botón "atrás" los respeta
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(
    () => Object.fromEntries(FILTER_KEYS.map((key) => [key, searchParams.get(key) ?? ""])),
    [searchParams]
  );
  const currentPage = Number(searchParams.get("page")) || 1;

  const params = useMemo(
    () => ({
      ...Object.fromEntries(Object.entries(filters).filter(([, value]) => value)),
      ...(!filters.idbranch && activeBranchId && { idbranch: activeBranchId }),
      page: currentPage,
      limit: PAGE_SIZE,
    }),
    [filters, currentPage, activeBranchId]
  );

  useEffect(() => {
    if (branchStatus === "ready" && hasBranches) getMovements(params);
  }, [params, getMovements, branchStatus, hasBranches]);

  // Los productos solo alimentan el filtro: sin permiso de consultarlos, el filtro queda vacío
  const canReadProducts = can("products.read");

  useEffect(() => {
    if (canReadProducts) getAllProducts();
  }, [getAllProducts, canReadProducts]);

  const productOptions = useMemo(
    () =>
      [...products]
        .sort((a, b) => a.name.localeCompare(b.name, "es"))
        .map((product) => ({ value: String(product.id), label: `${product.name} · ${product.sku}` })),
    [products]
  );

  /** Cambiar un filtro vuelve a la primera página. */
  const setFilter = (key, value) =>
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (value) next.set(key, value);
      else next.delete(key);
      next.delete("page");
      return next;
    });

  const setPage = (value) =>
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set("page", String(value));
      return next;
    });

  const hasFilters = FILTER_KEYS.some((key) => filters[key]);
  // Sucursal fijada por el enlace "Ver movimientos" (manda sobre la sucursal activa)
  const linkedBranch = filters.idbranch && branches.find((branch) => branch.id === Number(filters.idbranch));
  const clearFilters = () => setSearchParams({});
  const today = todayInColombia();

  const renderContent = () => {
    if (branchStatus === "ready" && !hasBranches) return <NoBranchesMessage />;

    if (loading && items.length === 0) {
      return (
        <div role="status" aria-live="polite">
          <span className="list-page__sr">Cargando movimientos…</span>
          <ul className="list-page__skeleton" aria-hidden="true">
            {Array.from({ length: SKELETON_ITEMS }, (_, index) => (
              <li className="list-page__skeleton-item" key={index} />
            ))}
          </ul>
        </div>
      );
    }

    if (error) {
      return (
        <StateMessage tone="error" icon="alert" title="No pudimos cargar los movimientos" text={error}>
          <Button variant="outline" icon="refresh" onClick={() => getMovements(params)}>
            Reintentar
          </Button>
        </StateMessage>
      );
    }

    if (items.length === 0) {
      return hasFilters ? (
        <StateMessage icon="search" title="Sin resultados" text="No hay movimientos con esos filtros.">
          <Button variant="outline" onClick={clearFilters}>
            Limpiar filtros
          </Button>
        </StateMessage>
      ) : (
        <StateMessage
          icon="box"
          title="Aún no hay movimientos"
          text="Cada entrada, salida o ajuste de existencias aparecerá aquí."
        />
      );
    }

    return (
      <div className={`movements-page__results ${loading ? "movements-page__results--loading" : ""}`.trim()} aria-busy={loading}>
        <MovementsTable movements={items} />
        <Pagination page={page} pages={pages} total={total} label="movimientos" disabled={loading} onChange={setPage} />
      </div>
    );
  };

  return (
    <section className="list-page">
      <header className="list-page__header">
        <div>
          <h1 className="list-page__title">Movimientos de inventario</h1>
          <p className="list-page__subtitle">
            Cada entrada y salida de existencias, con su motivo y quién la hizo. No se pueden editar ni borrar.
          </p>
        </div>
      </header>

      <div className="list-page__card">
        <div className="movements-page__filters">
          <Select
            label="Producto"
            placeholder="Todos los productos"
            options={productOptions}
            value={filters.idproduct}
            onChange={(event) => setFilter("idproduct", event.target.value)}
          />
          <Select
            label="Tipo"
            placeholder="Todos los tipos"
            options={MOVEMENT_TYPES}
            value={filters.type}
            onChange={(event) => setFilter("type", event.target.value)}
          />
          <Field
            label="Desde"
            type="date"
            max={filters.to || today}
            value={filters.from}
            onChange={(event) => setFilter("from", event.target.value)}
          />
          <Field
            label="Hasta"
            type="date"
            min={filters.from || undefined}
            max={today}
            value={filters.to}
            onChange={(event) => setFilter("to", event.target.value)}
          />
          {hasFilters && (
            <Button variant="outline" className="movements-page__clear" onClick={clearFilters}>
              Limpiar filtros
            </Button>
          )}
        </div>

        {linkedBranch && (
          <p className="movements-page__branch" role="status">
            Solo <strong>{linkedBranch.name}</strong>
            <Button variant="outline" icon="x" onClick={() => setFilter("idbranch", "")}>
              Quitar
            </Button>
          </p>
        )}

        {renderContent()}
      </div>
    </section>
  );
};

export default MovementsPage;
