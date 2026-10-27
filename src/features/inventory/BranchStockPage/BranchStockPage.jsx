import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../../components/ui/Button/Button";
import SearchInput from "../../../components/forms/SearchInput/SearchInput";
import ConfirmDialog from "../../../components/feadback/ConfirmDialog/ConfirmDialog";
import StateMessage from "../../../components/feadback/StateMessage/StateMessage";
import useToast from "../../../components/feadback/Toast/useToast";
import usePermissions from "../../../features/auth/usePermissions";
import NoBranchesMessage from "../../../features/branches/NoBranchesMessage";
import useActiveBranch from "../../../features/branches/useActiveBranch";
import BranchStockTable from "../../../features/inventory/branchStock/BranchStockTable";
import StockAdjustModal from "../../../features/inventory/branchStock/StockAdjustModal";
import { adjustPermissions } from "../../../features/inventory/branchStock/stockAdjustments";
import StockMinimumModal from "../../../features/inventory/branchStock/StockMinimumModal";
import useBranchStock from "../../../features/inventory/branchStock/useBranchStock";
import useProducts from "../../../features/inventory/products/useProducts";
import normalizeText from "../../../utils/normalizeText";
import "../../../styles/listPage.css";

const SKELETON_ITEMS = 5;

const BranchStockPage = () => {
  const { stock, loading, error, getAllStock, adjustStock, setMinimum, deleteStock } = useBranchStock();
  const { products, getAllProducts } = useProducts();
  // Sucursal activa del encabezado: el servidor ya solo devuelve las sucursales del usuario
  const { status: branchStatus, branches, hasBranches, activeBranchId, activeBranch } = useActiveBranch();
  const toast = useToast();
  const navigate = useNavigate();
  const { can } = usePermissions();

  // El backend también debe exigirlos: ocultar botones es solo comodidad
  // Aumentar o disminuir: cada sentido tiene su permiso, según la fila tenga o no serial
  const canAdjust = (row) => {
    const { canIncrease, canDecrease } = adjustPermissions(can, row.hasSerial);
    return canIncrease || canDecrease;
  };
  const canSetMinimum = can("branch-stock.update");
  const canDelete = can("branch-stock.delete");

  const [query, setQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState(""); // "" · "empty" (agotados) · "low" (bajo mínimo)
  const [adjusting, setAdjusting] = useState(null); // registro que se está ajustando
  const [editingMinimum, setEditingMinimum] = useState(null);
  const [deleting, setDeleting] = useState(null); // registro pendiente de confirmar

  // La lista de productos completa los nombres de las filas: sin permiso no se pide
  const canReadProducts = can("products.read");

  useEffect(() => {
    getAllStock();
    if (canReadProducts) getAllProducts();
  }, [getAllStock, getAllProducts, canReadProducts]);

  // Solo la sucursal activa (o todas las del usuario). Si el listado no trae el producto o la
  // sucursal anidados, el nombre sale de sus listas
  const rows = useMemo(() => {
    const productNames = new Map(products.map((product) => [product.id, product.name]));
    const branchNames = new Map(branches.map((branch) => [branch.id, branch.name]));
    return stock
      .filter((row) => activeBranchId === null || row.branchId === activeBranchId)
      .map((row) => ({
        ...row,
        productName: row.productName || productNames.get(row.productId) || "",
        branchName: row.branchName || branchNames.get(row.branchId) || "",
      }));
  }, [stock, products, branches, activeBranchId]);

  const filtered = useMemo(() => {
    const term = normalizeText(query.trim());

    return rows.filter((row) => {
      if (levelFilter === "empty" && row.quantity > 0) return false;
      if (levelFilter === "low" && !row.isLow) return false;
      return !term || normalizeText(`${row.productName} ${row.branchName}`).includes(term);
    });
  }, [rows, query, levelFilter]);

  const emptyCount = rows.filter((row) => row.quantity <= 0).length;
  const lowCount = rows.filter((row) => row.isLow).length;
  const toggleLevel = (level) => setLevelFilter((current) => (current === level ? "" : level));

  const openHistory = (row) => navigate(`/inventario/movimientos?idproduct=${row.productId}&idbranch=${row.branchId}`);
  const clearFilters = () => {
    setQuery("");
    setLevelFilter("");
  };

  const handleAdjust = async (payload, options) => {
    const { stock: updated } = await adjustStock(adjusting.id, payload, options);
    toast.success(`Ajuste registrado. Quedan ${updated.quantity} en ${adjusting.branchName}.`);
    setAdjusting(null);
  };

  const handleMinimum = async (minquantity) => {
    if (minquantity !== editingMinimum.minQuantity) {
      await setMinimum(editingMinimum.id, minquantity);
      toast.success(minquantity > 0 ? `Mínimo guardado: ${minquantity}.` : "Se quitó el mínimo.");
    }
    setEditingMinimum(null);
  };

  const handleDelete = async () => {
    await deleteStock(deleting.id);
    toast.success("Producto retirado de la sucursal.");
    setDeleting(null);
  };

  const showToolbar = !loading && !error && rows.length > 0;
  const countLabel =
    filtered.length === rows.length
      ? `${rows.length} ${rows.length === 1 ? "registro" : "registros"}`
      : `${filtered.length} de ${rows.length}`;

  const renderContent = () => {
    if (loading) {
      return (
        <div role="status" aria-live="polite">
          <span className="list-page__sr">Cargando existencias…</span>
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
        <StateMessage tone="error" icon="alert" title="No pudimos cargar las existencias" text={error}>
          <Button variant="outline" icon="refresh" onClick={() => getAllStock()}>
            Reintentar
          </Button>
        </StateMessage>
      );
    }

    if (branchStatus === "ready" && !hasBranches) return <NoBranchesMessage />;

    if (rows.length === 0) {
      return (
        <StateMessage
          icon="store"
          title="Aún no hay existencias registradas"
          text="Los productos llegan a las sucursales al crearlos (Productos → Asignar a sucursales) o con las compras."
        />
      );
    }

    if (filtered.length === 0) {
      return (
        <StateMessage icon="search" title="Sin resultados" text="No encontramos existencias con esos filtros.">
          <Button variant="outline" onClick={clearFilters}>
            Limpiar filtros
          </Button>
        </StateMessage>
      );
    }

    return (
      <BranchStockTable
        stock={filtered}
        canAdjust={canAdjust}
        canSetMinimum={canSetMinimum}
        canDelete={canDelete}
        onAdjust={setAdjusting}
        onSetMinimum={setEditingMinimum}
        onHistory={openHistory}
        onDelete={setDeleting}
      />
    );
  };

  return (
    <section className="list-page">
      <header className="list-page__header">
        <div>
          <h1 className="list-page__title">Existencias por sucursal</h1>
          <p className="list-page__subtitle">
            {activeBranch
              ? `Cuántas unidades de cada producto hay en ${activeBranch.name}.`
              : "Cuántas unidades de cada producto hay en cada una de tus sucursales."}
          </p>
        </div>
      </header>

      <div className="list-page__card">
        {showToolbar && (
          <div className="list-page__bar">
            <div className="list-page__search">
              <SearchInput
                label="Buscar existencias"
                placeholder="Buscar por producto o sucursal"
                value={query}
                onChange={setQuery}
              />
            </div>

            {emptyCount > 0 && (
              <Button
                variant={levelFilter === "empty" ? "primary" : "outline"}
                icon="alert"
                aria-pressed={levelFilter === "empty"}
                onClick={() => toggleLevel("empty")}
              >
                Agotados ({emptyCount})
              </Button>
            )}

            {lowCount > 0 && (
              <Button
                variant={levelFilter === "low" ? "primary" : "outline"}
                icon="bell"
                aria-pressed={levelFilter === "low"}
                onClick={() => toggleLevel("low")}
              >
                Bajo mínimo ({lowCount})
              </Button>
            )}

            <span className="list-page__count">{countLabel}</span>
          </div>
        )}

        {renderContent()}
      </div>

      <StockAdjustModal row={adjusting} onClose={() => setAdjusting(null)} onSubmit={handleAdjust} />

      <StockMinimumModal row={editingMinimum} onClose={() => setEditingMinimum(null)} onSubmit={handleMinimum} />

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Quitar producto de la sucursal"
        message={
          deleting && (
            <>
              ¿Seguro que quieres quitar <strong>{deleting.productName}</strong> de{" "}
              <strong>{deleting.branchName}</strong>?
            </>
          )
        }
        detail="El producto sigue en el catálogo; solo deja de figurar en esta sucursal."
        confirmLabel="Quitar"
        errorFallback="No se pudo quitar el producto de la sucursal."
        onConfirm={handleDelete}
        onClose={() => setDeleting(null)}
      />
    </section>
  );
};

export default BranchStockPage;
