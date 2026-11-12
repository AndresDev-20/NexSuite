import { useCallback, useEffect, useState } from "react";
import Button from "../../components/ui/Button/Button";
import Icon from "../../components/ui/Icon/Icon";
import Field from "../../components/forms/Field/Field";
import useToast from "../../components/feadback/Toast/useToast";
import getErrorMessage from "../../utils/getErrorMessage";
import { archiveAuditLogs, downloadArchiveExcel, getArchiveSummary, getStorage } from "./storageApi";

/*
 * Espacio y archivo (Fase 26, docs/PLAN-ARCHIVO-AUDITORIA.md): solo el Developer.
 * - Medidor: cuánto ocupa la base y qué tablas pesan más (y el % si el servidor conoce el límite).
 * - Archivo: la auditoría de más de 12 meses sale de la base, siempre con su Excel antes.
 * Los movimientos de inventario y de caja no se borran nunca.
 */

const TABLE_NAMES = {
  auditlogs: "Auditoría",
  stockmovements: "Movimientos de inventario",
  cashmovements: "Movimientos de caja",
  sales: "Ventas",
  saleitems: "Productos vendidos",
  saleorders: "Pedidos a caja",
  products: "Productos",
  productunits: "Unidades con serial (IMEI)",
  orders: "Compras",
  orderitems: "Productos comprados",
  customers: "Clientes",
  expenses: "Gastos",
  warranties: "Garantías",
  cashsessions: "Turnos de caja",
  chatmessages: "Mensajes de chat",
  chatconversations: "Conversaciones de chat",
  stockcounts: "Conteos de inventario",
  transfers: "Traslados",
  users: "Usuarios",
};

const numberFormat = new Intl.NumberFormat("es-CO");
const mbFormat = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 });
const dateFormat = new Intl.DateTimeFormat("es-CO", { timeZone: "America/Bogota", day: "numeric", month: "short", year: "numeric" });
const dateOf = (iso) => (iso ? dateFormat.format(new Date(iso)) : "—");
const sizeOf = (mb) => (mb >= 1024 ? `${mbFormat.format(mb / 1024)} GB` : `${mbFormat.format(mb)} MB`);

const LEVEL_TEXT = {
  ok: "Hay espacio de sobra.",
  warn: "Pasó el 70 %: revisa el plan de tu base o archiva la auditoría vieja.",
  danger: "Pasó el 90 %: amplía el plan de tu base pronto.",
};

const Meter = ({ storage }) => (
  <div className="storage-meter">
    <div className="storage-meter__head">
      <strong className="storage-meter__total">{sizeOf(storage.totalMb)}</strong>
      <span>{storage.limitMb ? `de ${sizeOf(storage.limitMb)} (${mbFormat.format(storage.percent)} %)` : "ocupa la base"}</span>
    </div>
    {storage.limitMb ? (
      <>
        <div className={`storage-meter__bar storage-meter__bar--${storage.level}`} role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, storage.percent)} aria-label="Espacio usado">
          <span style={{ width: `${Math.min(100, storage.percent)}%` }} />
        </div>
        <p className={`storage-meter__note storage-meter__note--${storage.level}`}>{LEVEL_TEXT[storage.level]}</p>
      </>
    ) : (
      <p className="storage-meter__note">Para ver el % usado, pon el límite de tu plan en el servidor: DB_STORAGE_LIMIT_MB en el .env.</p>
    )}
    <ul className="storage-tables" aria-label="Lo que más pesa">
      {storage.tables.map((table) => (
        <li key={table.name}>
          <span className="storage-tables__name">{TABLE_NAMES[table.name] ?? table.name}</span>
          <span className="storage-tables__rows">{numberFormat.format(table.rows)} {table.rows === 1 ? "fila" : "filas"} aprox.</span>
          <span className="storage-tables__mb">{sizeOf(table.mb)}</span>
        </li>
      ))}
    </ul>
  </div>
);

const Archive = ({ summary, onDone }) => {
  const toast = useToast();
  const [downloaded, setDownloaded] = useState(null); // { count, lastId } del Excel descargado
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(null); // download | archive

  if (!summary.count) {
    return (
      <p className="storage-archive__empty">
        <Icon name="check" /> No hay auditoría de más de {summary.retentionMonths} meses. Hay {numberFormat.format(summary.total)} registros, todos del último año.
      </p>
    );
  }

  const ready = downloaded?.lastId === summary.lastId && downloaded?.count === summary.count;

  const download = async () => {
    setBusy("download");
    try {
      const fileName = await downloadArchiveExcel(summary.lastId);
      setDownloaded({ count: summary.count, lastId: summary.lastId });
      toast.success(`Descargado: ${fileName}. Guárdalo bien antes de archivar.`);
    } catch (err) {
      toast.error(getErrorMessage(err, "No se pudo descargar el Excel del archivo."));
    } finally {
      setBusy(null);
    }
  };

  const archive = async () => {
    setBusy("archive");
    try {
      const { deleted } = await archiveAuditLogs(downloaded);
      toast.success(`Listo: ${numberFormat.format(deleted)} registros archivados. Quedan en tu Excel.`);
      setDownloaded(null);
      setConfirm("");
      onDone();
    } catch (err) {
      toast.error(getErrorMessage(err, "No se pudo archivar la auditoría."));
      setDownloaded(null);
      onDone();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="storage-archive">
      <p className="storage-archive__summary">
        <strong>{numberFormat.format(summary.count)}</strong> registros de auditoría tienen más de {summary.retentionMonths} meses (del {dateOf(summary.from)} al {dateOf(summary.to)}). Lo del último año no se toca nunca.
      </p>
      <ol className="storage-archive__steps">
        <li className={ready ? "storage-archive__step--done" : undefined}>
          <span>Descarga el Excel con esos registros y guárdalo en un lugar seguro.</span>
          <Button variant="outline" icon="download" onClick={download} disabled={busy !== null}>
            {busy === "download" ? "Descargando…" : ready ? "Descargar otra vez" : "Descargar Excel"}
          </Button>
        </li>
        <li>
          <span>Escribe ARCHIVAR y bórralos de la base. Solo se borra lo que trae tu Excel.</span>
          <div className="storage-archive__confirm">
            <Field label="Confirmación" placeholder="ARCHIVAR" value={confirm} onChange={(event) => setConfirm(event.target.value.toUpperCase())} disabled={!ready || busy !== null} autoComplete="off" />
            <Button variant="danger" icon="trash" onClick={archive} disabled={!ready || confirm !== "ARCHIVAR" || busy !== null}>
              {busy === "archive" ? "Archivando…" : `Archivar ${numberFormat.format(summary.count)}`}
            </Button>
          </div>
        </li>
      </ol>
    </div>
  );
};

/** Sección de Configuración: medidor de espacio y archivo de la auditoría vieja. */
const StorageArchive = () => {
  const [state, setState] = useState({ status: "loading", storage: null, summary: null, error: "" });

  const load = useCallback(() => {
    Promise.all([getStorage(), getArchiveSummary()])
      .then(([storage, summary]) => setState({ status: "ready", storage, summary, error: "" }))
      .catch((err) => setState({ status: "error", storage: null, summary: null, error: getErrorMessage(err, "No se pudo leer el espacio de la base.") }));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (state.status === "loading") return <p className="settings-season__loading" role="status">Cargando…</p>;
  if (state.status === "error") {
    return (
      <div className="settings-season__error" role="alert">
        <p>{state.error}</p>
        <Button
          variant="outline"
          icon="refresh"
          onClick={() => {
            setState((current) => ({ ...current, status: "loading" }));
            load();
          }}
        >
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="storage">
      <div className="storage__block">
        <h3 className="storage__title">Espacio de la base</h3>
        <Meter storage={state.storage} />
      </div>
      <div className="storage__block">
        <h3 className="storage__title">Archivo de la auditoría</h3>
        <Archive summary={state.summary} onDone={load} />
        <p className="storage__note">
          <Icon name="shield" /> Los movimientos de inventario y de caja no se borran nunca: de ellos salen el stock, los arqueos y los informes.
        </p>
      </div>
    </div>
  );
};

export default StorageArchive;
