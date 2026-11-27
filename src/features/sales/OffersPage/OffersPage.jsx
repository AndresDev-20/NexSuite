import { useCallback, useEffect, useState } from "react";
import api from "../../../api/client";
import Button from "../../../components/ui/Button/Button";
import Icon from "../../../components/ui/Icon/Icon";
import Select from "../../../components/forms/Select/Select";
import SearchInput from "../../../components/forms/SearchInput/SearchInput";
import StateMessage from "../../../components/feadback/StateMessage/StateMessage";
import ConfirmDialog from "../../../components/feadback/ConfirmDialog/ConfirmDialog";
import useToast from "../../../components/feadback/Toast/useToast";
import usePermissions from "../../auth/usePermissions";
import useActiveBranch from "../../branches/useActiveBranch";
import { normalizeProduct } from "../../inventory/products/useProducts";
import { unwrap } from "../../../utils/apiResponse";
import getErrorMessage from "../../../utils/getErrorMessage";
import { formatCurrency } from "../../../utils/money";
import { OFFER_STATES, OFFER_TYPES, STATE_LABELS, deleteOffer, listOffers, periodText, setOfferStatus, typeOf } from "../offers/offerApi";
import OfferFormModal from "../offers/OfferFormModal";
import RaffleEntriesModal from "../offers/RaffleEntriesModal";
import "../../../styles/listPage.css";
import "../offers/offers.css";

const SEARCH_DELAY_MS = 300;

/** Lo que activa y lo que da cada oferta, en una línea. */
const contentOf = (offer) => {
  const names = (list) => list.map((row) => row.name).join(", ");
  if (offer.type === "regalo") return `${names(offer.triggers)} → gratis: ${offer.gifts.map((row) => row.name).join(" o ")}`;
  if (offer.type === "precio") return offer.items.map((row) => `${row.name} a ${formatCurrency(row.price)}`).join(" · ");
  if (offer.type === "rifa") return `Premio: ${offer.prize} · por comprar ${names(offer.triggers)}`;
  if (offer.type === "combo") return offer.items.map((row) => `${row.quantity > 1 ? `${row.quantity} × ` : ""}${row.name}`).join(" + ");
  return names(offer.items);
};

const OfferCard = ({ offer, index, canManage, onEdit, onToggle, onDelete, onEntries }) => {
  const type = typeOf(offer.type);
  const limited = offer.limitqty !== null;
  const progress = limited ? Math.min(100, Math.round((offer.used / offer.limitqty) * 100)) : null;
  return (
    <article className={`offer-card offer-tone--${type.tone} offer-card--${offer.state}`} style={{ "--i": Math.min(index, 12) }}>
      <header className="offer-card__head">
        <span className="offer-card__icon" aria-hidden="true">
          <Icon name={type.icon} />
        </span>
        <span className="offer-card__titles">
          <small>{type.label}</small>
          <strong>{offer.name}</strong>
        </span>
        <span className={`offer-state offer-state--${offer.state}`}>{STATE_LABELS[offer.state]}</span>
      </header>
      <p className="offer-card__summary">{offer.summary}</p>
      <p className="offer-card__content">{contentOf(offer)}</p>
      <dl className="offer-card__facts">
        <div>
          <dt>Vigencia</dt>
          <dd>{periodText(offer)}</dd>
        </div>
        <div>
          <dt>Sucursales</dt>
          <dd>{offer.allbranches ? "Todas" : offer.branches.map((branch) => branch.name).join(", ")}</dd>
        </div>
        <div>
          <dt>{offer.type === "regalo" ? "Regalos entregados" : offer.type === "rifa" ? "Oportunidades dadas" : "Usos"}</dt>
          <dd>
            {offer.used}
            {limited && ` de ${offer.limitqty}`}
          </dd>
        </div>
      </dl>
      {limited && (
        <span className="offer-card__meter" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Uso del límite">
          <span style={{ "--value": `${progress}%` }} />
        </span>
      )}
      {offer.type === "rifa" && (
        <Button variant="outline" icon="ticket" onClick={() => onEntries(offer)}>
          Ver participantes
        </Button>
      )}
      {canManage && (
        <footer className="offer-card__actions">
          <Button variant="outline" icon="edit" onClick={() => onEdit(offer)}>
            Editar
          </Button>
          <Button variant="outline" icon={offer.status === "activa" ? "lock" : "check"} onClick={() => onToggle(offer)}>
            {offer.status === "activa" ? "Pausar" : "Activar"}
          </Button>
          <Button variant="outline" icon="trash" className="offer-card__delete" aria-label={`Eliminar ${offer.name}`} onClick={() => onDelete(offer)} />
        </footer>
      )}
    </article>
  );
};

/**
 * Ventas → Ofertas (Fase 31): regalo, precio especial, descuento en el segundo y combo. Se aplican solas al vender
 * (el servidor las calcula); aquí se crean, se editan, se pausan y se ve cuánto se han usado.
 */
const OffersPage = () => {
  const { can } = usePermissions();
  const toast = useToast();
  const { branches, activeBranchId } = useActiveBranch();
  const canManage = can("offers.manage");
  const [state, setState] = useState("");
  const [type, setType] = useState("");
  const [query, setQuery] = useState("");
  const [data, setData] = useState({ items: [], counts: {}, loading: true, error: "" });
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({ open: false, offer: null });
  const [deleting, setDeleting] = useState(null);
  const [raffle, setRaffle] = useState(null);
  const [reload, setReload] = useState(0);

  const load = useCallback(async () => {
    try {
      const result = await listOffers({ ...(state && { state }), ...(type && { type }), ...(activeBranchId && { idbranch: activeBranchId }), ...(query.trim() && { search: query.trim() }) });
      setData({ ...result, loading: false, error: "" });
    } catch (err) {
      setData((current) => ({ ...current, loading: false, error: getErrorMessage(err, "No se pudieron cargar las ofertas.") }));
    }
  }, [state, type, activeBranchId, query]);

  useEffect(() => {
    const timer = setTimeout(load, SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [load, reload]);

  // Los productos activos, para armar las ofertas
  useEffect(() => {
    if (!canManage) return;
    api
      .get("/products", { params: { isactive: "true" } })
      .then((response) => setProducts((unwrap(response) ?? []).map(normalizeProduct)))
      .catch(() => setProducts([]));
  }, [canManage]);

  const refresh = () => setReload((value) => value + 1);
  const total = Object.values(data.counts).reduce((sum, count) => sum + count, 0);

  const toggle = async (offer) => {
    try {
      const result = await setOfferStatus(offer.id, offer.status === "activa" ? "pausada" : "activa");
      toast.success(result.message);
      refresh();
    } catch (err) {
      toast.error(getErrorMessage(err, "No se pudo cambiar la oferta."));
    }
  };

  return (
    <section className="list-page offers-page">
      <header className="list-page__header">
        <div>
          <h1 className="list-page__title">Ofertas</h1>
          <p className="list-page__subtitle">Regalos, precios especiales, 2x1, combos y rifas. Se aplican solas al vender en las sucursales y fechas que elijas.</p>
        </div>
        {canManage && (
          <Button className="list-page__add" icon="plus" onClick={() => setForm({ open: true, offer: null })}>
            Nueva oferta
          </Button>
        )}
      </header>

      <div className="offer-filters" role="tablist" aria-label="Filtrar ofertas">
        <button type="button" role="tab" aria-selected={!state} className={`offer-filter ${!state ? "is-on" : ""}`.trim()} onClick={() => setState("")}>
          Todas <strong>{total}</strong>
        </button>
        {OFFER_STATES.map((item) => (
          <button key={item.value} type="button" role="tab" aria-selected={state === item.value} className={`offer-filter offer-filter--${item.tone} ${state === item.value ? "is-on" : ""}`.trim()} onClick={() => setState(item.value)}>
            {item.label} <strong>{data.counts[item.value] ?? 0}</strong>
          </button>
        ))}
      </div>

      <div className="list-page__card">
        <div className="list-page__bar">
          <div className="list-page__search">
            <SearchInput label="Buscar ofertas" placeholder="Nombre de la oferta" value={query} onChange={setQuery} />
          </div>
          <Select className="list-page__filter" label="Tipo" placeholder="Todos los tipos" options={OFFER_TYPES.map((item) => ({ value: item.value, label: item.label }))} value={type} onChange={(event) => setType(event.target.value)} />
        </div>

        {data.loading ? (
          <p className="list-page__subtitle" role="status">
            Cargando ofertas…
          </p>
        ) : data.error ? (
          <StateMessage tone="error" icon="alert" title="No pudimos cargar las ofertas" text={data.error}>
            <Button variant="outline" icon="refresh" onClick={refresh}>
              Reintentar
            </Button>
          </StateMessage>
        ) : data.items.length === 0 ? (
          <StateMessage icon="sparkles" title="No hay ofertas aquí" text={canManage ? "Crea la primera: por ejemplo, por la compra de una cabina, unos manos libres de regalo." : "Cuando haya ofertas, aparecen aquí."}>
            {canManage && (
              <Button icon="plus" onClick={() => setForm({ open: true, offer: null })}>
                Nueva oferta
              </Button>
            )}
          </StateMessage>
        ) : (
          <div className="offer-grid">
            {data.items.map((offer, index) => (
              <OfferCard key={offer.id} offer={offer} index={index} canManage={canManage} onEdit={(item) => setForm({ open: true, offer: item })} onToggle={toggle} onDelete={setDeleting} onEntries={setRaffle} />
            ))}
          </div>
        )}
      </div>

      <OfferFormModal
        open={form.open}
        offer={form.offer}
        branches={branches.map((branch) => ({ id: branch.id, name: branch.name }))}
        products={products}
        onClose={() => setForm({ open: false, offer: null })}
        onSaved={(result) => {
          toast.success(result.message);
          setForm({ open: false, offer: null });
          refresh();
        }}
      />

      <RaffleEntriesModal offer={raffle} onClose={() => setRaffle(null)} />

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Eliminar oferta"
        message={deleting && <>¿Eliminar «{deleting.name}»? Si ya se usó en ventas no se puede: en ese caso, pásala a pausada.</>}
        confirmLabel="Eliminar"
        confirmIcon="trash"
        errorFallback="No se pudo eliminar la oferta."
        onConfirm={async () => {
          const result = await deleteOffer(deleting.id);
          toast.success(result.message ?? "Oferta eliminada.");
          setDeleting(null);
          refresh();
        }}
        onClose={() => setDeleting(null)}
      />
    </section>
  );
};

export default OffersPage;
