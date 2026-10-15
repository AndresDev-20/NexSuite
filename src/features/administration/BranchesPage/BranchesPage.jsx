import { useEffect, useMemo, useState } from "react";
import Button from "../../../components/ui/Button/Button";
import Icon from "../../../components/ui/Icon/Icon";
import StateMessage from "../../../components/feadback/StateMessage/StateMessage";
import useToast from "../../../components/feadback/Toast/useToast";
import BranchFormModal from "../../../features/administration/branches/BranchFormModal";
import BranchesTable from "../../../features/administration/branches/BranchesTable";
import useBranches from "../../../features/administration/branches/useBranches";
import "./branchesPage.css";

const SKELETON_ROWS = 4;

/** Minúsculas y sin tildes, para que "Bogota" encuentre "Bogotá". */
const normalize = (text) =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const BranchesPage = () => {
  const { branches, loading, error, getAllBranches, createBranch } =
    useBranches();
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    getAllBranches();
  }, [getAllBranches]);

  const filtered = useMemo(() => {
    const term = normalize(query.trim());
    if (!term) return branches;

    return branches.filter((branch) =>
      normalize(
        [branch.nameBranch, branch.address, branch.email, branch.number].join(
          " ",
        ),
      ).includes(term),
    );
  }, [branches, query]);

  const handleCreate = async (payload) => {
    await createBranch(payload);
    setModalOpen(false);
    toast.success("Sucursal creada correctamente.");
  };

  const showToolbar = !loading && !error && branches.length > 0;
  const countLabel =
    filtered.length === branches.length
      ? `${branches.length} ${branches.length === 1 ? "sucursal" : "sucursales"}`
      : `${filtered.length} de ${branches.length}`;

  const renderContent = () => {
    if (loading) {
      return (
        <div role="status" aria-live="polite">
          <span className="branches-page__sr">Cargando sucursales…</span>
          <ul className="branches-page__skeleton" aria-hidden="true">
            {Array.from({ length: SKELETON_ROWS }, (_, index) => (
              <li className="branches-page__skeleton-row" key={index} />
            ))}
          </ul>
        </div>
      );
    }

    if (error) {
      return (
        <StateMessage
          tone="error"
          icon="alert"
          title="No pudimos cargar las sucursales"
          text={error}
        >
          <Button
            variant="outline"
            icon="refresh"
            onClick={() => getAllBranches()}
          >
            Reintentar
          </Button>
        </StateMessage>
      );
    }

    if (branches.length === 0) {
      return (
        <StateMessage
          icon="inbox"
          title="Aún no hay sucursales"
          text="Crea la primera para empezar a asignarle usuarios e inventario."
        >
          <Button icon="plus" onClick={() => setModalOpen(true)}>
            Crear sucursal
          </Button>
        </StateMessage>
      );
    }

    if (filtered.length === 0) {
      return (
        <StateMessage
          icon="search"
          title="Sin resultados"
          text={`No encontramos sucursales para «${query.trim()}».`}
        >
          <Button variant="outline" onClick={() => setQuery("")}>
            Limpiar búsqueda
          </Button>
        </StateMessage>
      );
    }

    return <BranchesTable branches={filtered} />;
  };

  return (
    <section className="branches-page">
      <header className="branches-page__header">
        <div>
          <h1 className="branches-page__title">Sucursales</h1>
          <p className="branches-page__subtitle">
            Locales de la empresa y el personal asignado a cada uno.
          </p>
        </div>

        <div className="branches-page__actions">
          {showToolbar && (
            <div className="branches-page__toolbar">
              <div className="branches-page__search">
                <label className="branches-page__sr" htmlFor="branches-search">
                  Buscar sucursales
                </label>
                <Icon name="search" className="branches-page__search-icon" />
                <input
                  id="branches-search"
                  className="branches-page__search-input"
                  type="text"
                  inputMode="search"
                  autoComplete="off"
                  placeholder="Buscar por nombre, dirección o contacto"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
                {query && (
                  <button
                    type="button"
                    className="branches-page__search-clear"
                    aria-label="Limpiar búsqueda"
                    onClick={() => setQuery("")}
                  >
                    <Icon
                      name="x"
                      className="branches-page__search-clear-icon"
                    />
                  </button>
                )}
              </div>
              <span className="branches-page__count">{countLabel}</span>
            </div>
          )}

          <Button
            className="branches-page__add"
            icon="plus"
            onClick={() => setModalOpen(true)}
          >
            Nueva sucursal
          </Button>
        </div>
      </header>

      <div className="branches-page__card">{renderContent()}</div>

      <BranchFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleCreate}
      />
    </section>
  );
};

export default BranchesPage;
