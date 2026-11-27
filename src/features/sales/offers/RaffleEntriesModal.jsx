import { useEffect, useState } from "react";
import Modal from "../../../components/feadback/Modal/Modal";
import Button from "../../../components/ui/Button/Button";
import SearchInput from "../../../components/forms/SearchInput/SearchInput";
import StateMessage from "../../../components/feadback/StateMessage/StateMessage";
import useToast from "../../../components/feadback/Toast/useToast";
import getErrorMessage from "../../../utils/getErrorMessage";
import { downloadPdf, printPdf } from "../sales/receipt";
import { drawDayText, fetchRaffleList, listRaffleEntries } from "./offerApi";
import "./offers.css";

const SEARCH_DELAY_MS = 300;
const dateTime = (value) => new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", dateStyle: "short", timeStyle: "short" }).format(new Date(value));

/**
 * Participantes de una rifa (Fase 57): quién compró, cuántas oportunidades tiene y en qué venta. El sistema no sortea:
 * esta lista (y su PDF) es para el día del sorteo, que se hace aparte. offer: la rifa.
 */
const RaffleEntriesModal = ({ offer, onClose }) => {
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [data, setData] = useState({ entries: [], totals: { entries: 0, chances: 0 }, loading: true, error: "" });
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    if (!offer) return undefined;
    let active = true;
    const timer = setTimeout(async () => {
      try {
        const result = await listRaffleEntries(offer.id, query.trim() ? { search: query.trim() } : undefined);
        if (active) setData({ ...result, loading: false, error: "" });
      } catch (err) {
        if (active) setData((current) => ({ ...current, loading: false, error: getErrorMessage(err, "No se pudo cargar la lista.") }));
      }
    }, SEARCH_DELAY_MS);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [offer, query]);

  const withPdf = async (action) => {
    setPrinting(true);
    try {
      action(await fetchRaffleList(offer.id));
    } catch (err) {
      toast.error(getErrorMessage(err, "No se pudo generar la lista."));
    } finally {
      setPrinting(false);
    }
  };

  return (
    <Modal
      open={Boolean(offer)}
      size="xl"
      icon="ticket"
      title={offer ? `Participantes · ${offer.name}` : ""}
      subtitle={offer ? [offer.prize && `Premio: ${offer.prize}`, offer.drawdate && `Sorteo: ${drawDayText(offer.drawdate)}`].filter(Boolean).join(" · ") : ""}
      onClose={onClose}
    >
      {offer && (
        <div className="raffle-entries">
          <div className="raffle-entries__head">
            <div className="raffle-entries__totals">
              <span>
                <strong>{data.totals.entries}</strong>
                {data.totals.entries === 1 ? "compra" : "compras"}
              </span>
              <span>
                <strong>{data.totals.chances}</strong>
                oportunidades
              </span>
            </div>
            <div className="list-page__search">
              <SearchInput label="Buscar participante" placeholder="Cliente, documento, teléfono o venta" value={query} onChange={setQuery} />
            </div>
            <div className="raffle-entries__actions">
              <Button variant="outline" icon="printer" disabled={printing} onClick={() => withPdf(printPdf)}>
                Imprimir lista
              </Button>{" "}
              <Button variant="outline" icon="download" disabled={printing} onClick={() => withPdf((blob) => downloadPdf(blob, `rifa-${offer.id}.pdf`))}>
                Descargar
              </Button>
            </div>
          </div>

          {data.loading ? (
            <p className="list-page__subtitle" role="status">
              Cargando participantes…
            </p>
          ) : data.error ? (
            <StateMessage tone="error" icon="alert" title="No pudimos cargar la lista" text={data.error} />
          ) : data.entries.length === 0 ? (
            <StateMessage icon="ticket" title={query.trim() ? "Nadie con esa búsqueda" : "Todavía no hay participantes"} text="Cada venta de los productos de la rifa aparece aquí sola." />
          ) : (
            <div className="raffle-entries__table-wrap">
              <table className="raffle-entries__table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Cliente</th>
                    <th>Documento</th>
                    <th>Teléfono</th>
                    <th>Venta</th>
                    <th>Sucursal</th>
                    <th>Oport.</th>
                  </tr>
                </thead>
                <tbody>
                  {data.entries.map((entry, index) => (
                    <tr key={entry.id} className={`raffle-entries__row--${entry.status}`} title={entry.status === "anulada" ? "Anulada (venta anulada o devuelta)" : undefined}>
                      <td>{index + 1}</td>
                      <td>
                        <strong>{entry.customer?.name ?? "Consumidor final"}</strong>
                      </td>
                      <td>{entry.customer?.document ?? "—"}</td>
                      <td>{entry.customer?.phone ?? "—"}</td>
                      <td>
                        {entry.sale?.number ?? "—"}
                        {entry.sale?.createdat && <small className="list-page__subtitle"> · {dateTime(entry.sale.createdat)}</small>}
                      </td>
                      <td>{entry.branch?.nameBranch ?? "—"}</td>
                      <td>
                        <strong>{entry.quantity}</strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};

export default RaffleEntriesModal;
