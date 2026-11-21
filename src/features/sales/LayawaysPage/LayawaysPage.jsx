import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Button from "../../../components/ui/Button/Button";
import Icon from "../../../components/ui/Icon/Icon";
import SearchInput from "../../../components/forms/SearchInput/SearchInput";
import StateMessage from "../../../components/feadback/StateMessage/StateMessage";
import usePermissions from "../../auth/usePermissions";
import useActiveBranch from "../../branches/useActiveBranch";
import getErrorMessage from "../../../utils/getErrorMessage";
import { LAYAWAY_FILTERS, listLayaways } from "../layaways/layawayApi";
import LayawayCard from "../layaways/LayawayCard";
import LayawayDetailModal from "../layaways/LayawayDetailModal";
import "../../../styles/listPage.css";
import "../layaways/layaways.css";

const PAGE_SIZE = 24;
const SEARCH_DELAY_MS = 300;

/**
 * Ventas → Apartados (Fase 30): los productos que los clientes van pagando con abonos. Se aparta desde «Vender»;
 * aquí se abona, se entrega, se amplía la fecha, se cancela y se devuelve el dinero de los vencidos.
 */
const LayawaysPage = () => {
  const { can } = usePermissions();
  const { activeBranchId } = useActiveBranch();
  const [params, setParams] = useSearchParams();
  const status = LAYAWAY_FILTERS.some((filter) => filter.value === params.get("filtro")) ? params.get("filtro") : "vigente";
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [state, setState] = useState({ items: [], total: 0, counts: {}, loading: true, error: "" });
  const [opened, setOpened] = useState(null);
  const [reload, setReload] = useState(0);

  const load = useCallback(async () => {
    try {
      const data = await listLayaways({ status, limit, ...(activeBranchId && { idbranch: activeBranchId }), ...(query.trim() && { search: query.trim() }) });
      setState({ items: data.items, total: data.total, counts: data.counts ?? {}, loading: false, error: "" });
    } catch (err) {
      setState((current) => ({ ...current, loading: false, error: getErrorMessage(err, "No se pudieron cargar los apartados.") }));
    }
  }, [status, limit, activeBranchId, query]);

  useEffect(() => {
    const timer = setTimeout(load, SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [load, reload]);

  const choose = (value) => {
    setLimit(PAGE_SIZE);
    setState((current) => ({ ...current, loading: true }));
    setParams(value === "vigente" ? {} : { filtro: value }, { replace: true });
  };

  return (
    <section className="list-page layaways-page">
      <header className="list-page__header">
        <div>
          <h1 className="list-page__title">Apartados</h1>
          <p className="list-page__subtitle">Productos separados para clientes que los van pagando con abonos. Nadie más los puede vender.</p>
        </div>
        {can("layaways.create") && can("sales.create") && (
          <Link className="btn btn--primary list-page__add" to="/ventas/vender">
            <Icon name="plus" className="btn__icon" />
            Nuevo apartado
          </Link>
        )}
      </header>

      <div className="layaway-filters" role="tablist" aria-label="Filtrar apartados">
        {LAYAWAY_FILTERS.map((filter, index) => (
          <button
            key={filter.value}
            type="button"
            role="tab"
            aria-selected={status === filter.value}
            className={`layaway-filter layaway-filter--${filter.tone} ${status === filter.value ? "layaway-filter--active" : ""}`.trim()}
            style={{ "--i": index }}
            onClick={() => choose(filter.value)}
          >
            <span className="layaway-filter__icon" aria-hidden="true">
              <Icon name={filter.icon} />
            </span>
            <span className="layaway-filter__label">{filter.label}</span>
            <strong className="layaway-filter__count">{state.counts[filter.value] ?? "·"}</strong>
          </button>
        ))}
      </div>

      <div className="list-page__card">
        <div className="list-page__bar">
          <div className="list-page__search">
            <SearchInput label="Buscar apartados" placeholder="Número, cliente o teléfono" value={query} onChange={setQuery} />
          </div>
          {!state.loading && !state.error && (
            <span className="list-page__count">
              {state.total} {state.total === 1 ? "apartado" : "apartados"}
            </span>
          )}
        </div>

        {state.loading ? (
          <div className="layaway-grid" aria-hidden="true">
            {Array.from({ length: 6 }, (_, index) => (
              <span key={index} className="layaway-card layaway-card--skeleton" />
            ))}
          </div>
        ) : state.error ? (
          <StateMessage tone="error" icon="alert" title="No pudimos cargar los apartados" text={state.error}>
            <Button variant="outline" icon="refresh" onClick={() => setReload((value) => value + 1)}>
              Reintentar
            </Button>
          </StateMessage>
        ) : state.items.length === 0 ? (
          <StateMessage
            icon="lock"
            title={query.trim() ? "Sin resultados" : "No hay apartados aquí"}
            text={query.trim() ? "No encontramos apartados con esa búsqueda." : "Para apartar, arma el carrito en «Vender» y toca «Apartar»."}
          />
        ) : (
          <>
            <div className="layaway-grid">
              {state.items.map((layaway, index) => (
                <LayawayCard key={layaway.id} layaway={layaway} index={index} onOpen={(item) => setOpened(item.id)} />
              ))}
            </div>
            {state.items.length < state.total && (
              <div className="layaway-more">
                <Button variant="outline" icon="chevron" onClick={() => setLimit((value) => value + PAGE_SIZE)}>
                  Ver más
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      <LayawayDetailModal layawayId={opened} onClose={() => setOpened(null)} onChanged={() => setReload((value) => value + 1)} />
    </section>
  );
};

export default LayawaysPage;
