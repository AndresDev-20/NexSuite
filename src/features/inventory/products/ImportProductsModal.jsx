import { useRef, useState } from "react";
import Modal from "../../../components/feadback/Modal/Modal";
import Stepper from "../../../components/forms/Stepper/Stepper";
import Select from "../../../components/forms/Select/Select";
import { FormActions } from "../../../components/forms/FormLayout/FormLayout";
import Button from "../../../components/ui/Button/Button";
import Icon from "../../../components/ui/Icon/Icon";
import { formatCurrency } from "../../../utils/money";
import getErrorMessage from "../../../utils/getErrorMessage";
import { downloadFailedRows, downloadTemplate, reviewImport, runImport } from "./productImportApi";
import "./importProductsModal.css";

const STEPS = [
  { key: "file", label: "Archivo", description: "Sube el Excel del inventario" },
  { key: "columns", label: "Columnas", description: "Qué trae cada columna" },
  { key: "review", label: "Revisión", description: "Lo que se va a crear" },
  { key: "done", label: "Listo", description: "Resumen final" },
];

const MAX_MB = 5;
const plural = (count, one, many) => `${count.toLocaleString("es-CO")} ${count === 1 ? one : many}`;

/** Zona para soltar o elegir el archivo. */
const DropZone = ({ file, busy, disabled, onFile }) => {
  const inputRef = useRef(null);
  const [over, setOver] = useState(false);
  const pick = (files) => {
    const chosen = files?.[0];
    if (chosen) onFile(chosen);
  };
  return (
    <div
      className={`import-drop ${over ? "import-drop--over" : ""} ${file ? "import-drop--file" : ""} ${disabled ? "import-drop--disabled" : ""}`.trim()}
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled) setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setOver(false);
        if (!disabled && !busy) pick(event.dataTransfer.files);
      }}
    >
      <span className="import-drop__sheet" aria-hidden="true">
        <span className="import-drop__grid" />
        <span className="import-drop__badge">XLSX</span>
      </span>
      {busy ? (
        <>
          <strong className="import-drop__title">Leyendo el archivo…</strong>
          <span className="import-drop__bar" aria-hidden="true" />
        </>
      ) : file ? (
        <>
          <strong className="import-drop__title">{file.name}</strong>
          <span className="import-drop__hint">{(file.size / 1024 / 1024).toFixed(2)} MB · puedes cambiarlo</span>
        </>
      ) : (
        <>
          <strong className="import-drop__title">Arrastra aquí el Excel del inventario</strong>
          <span className="import-drop__hint">o elígelo desde tu equipo · .xlsx hasta {MAX_MB} MB y 5.000 productos</span>
        </>
      )}
      <Button variant="outline" icon="inbox" onClick={() => inputRef.current?.click()} disabled={disabled || busy} data-autofocus>
        {file ? "Elegir otro archivo" : "Elegir archivo"}
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        hidden
        onChange={(event) => {
          pick(event.target.files);
          event.target.value = "";
        }}
      />
    </div>
  );
};

/** Tarjeta de un número del resumen. */
const Stat = ({ tone, icon, value, label, index }) => (
  <div className={`import-stat import-stat--${tone}`} style={{ "--i": index }}>
    <span className="import-stat__icon" aria-hidden="true">
      <Icon name={icon} />
    </span>
    <strong className="import-stat__value">{value.toLocaleString("es-CO")}</strong>
    <span className="import-stat__label">{label}</span>
  </div>
);

/** Filas que no entran (o que ya existían), con su motivo. */
const IssueList = ({ title, rows, tone, failedFile }) =>
  rows.length > 0 && (
    <section className={`import-issues import-issues--${tone}`}>
      <header className="import-issues__head">
        <strong>
          {title} ({rows.length.toLocaleString("es-CO")})
        </strong>
        {failedFile && (
          <Button variant="outline" icon="download" onClick={() => downloadFailedRows(failedFile)}>
            Descargar en Excel
          </Button>
        )}
      </header>
      <ul className="import-issues__list">
        {rows.slice(0, 200).map((row) => (
          <li key={`${row.row}-${row.reason}`}>
            <span className="import-issues__row">Fila {row.row}</span>
            <span>
              {row.name && <strong>{row.name}: </strong>}
              {row.reason}
            </span>
          </li>
        ))}
      </ul>
      {rows.length > 200 && <p className="import-issues__more">Y {(rows.length - 200).toLocaleString("es-CO")} más (están en el Excel).</p>}
    </section>
  );

const Chips = ({ title, items, icon }) =>
  items.length > 0 && (
    <div className="import-chips">
      <span className="import-chips__title">
        <Icon name={icon} /> {title}
      </span>
      <div className="import-chips__list">
        {items.map((item, index) => (
          <span key={item} className="import-chips__chip" style={{ "--i": index }}>
            {item}
          </span>
        ))}
      </div>
    </div>
  );

/**
 * Importar productos desde Excel (Fase 28): Archivo → Columnas → Revisión → Listo.
 * branch: { id, name } elegida en el encabezado (null = «Todas»: no se puede importar).
 * onImported(): al terminar, para recargar la lista.
 */
const ImportProductsModal = ({ open, branch, showCost, onClose, onImported }) => {
  const [step, setStep] = useState(0);
  const [reached, setReached] = useState(0);
  const [file, setFile] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [mapping, setMapping] = useState({});
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [templateBusy, setTemplateBusy] = useState(false);

  const goTo = (index) => {
    setStep(index);
    setReached((current) => Math.max(current, index));
    setError("");
  };

  const reset = () => {
    setStep(0);
    setReached(0);
    setFile(null);
    setAnalysis(null);
    setMapping({});
    setResult(null);
    setError("");
  };

  const close = () => {
    if (busy) return;
    reset();
    onClose();
  };

  const analyze = async (chosen, columns) => {
    setBusy(true);
    setError("");
    try {
      const data = await reviewImport(chosen, { idbranch: branch.id, columns });
      setAnalysis(data);
      setMapping(data.mapping);
      return data;
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo leer el archivo."));
      return null;
    } finally {
      setBusy(false);
    }
  };

  const handleFile = async (chosen) => {
    if (!/\.xlsx$/i.test(chosen.name)) {
      setError(/\.xls$/i.test(chosen.name) ? "Es un Excel antiguo (.xls): ábrelo y guárdalo como «Libro de Excel (.xlsx)»." : "Elige un archivo de Excel (.xlsx).");
      return;
    }
    if (chosen.size > MAX_MB * 1024 * 1024) {
      setError(`El archivo pesa más de ${MAX_MB} MB. Divídelo en varios archivos.`);
      return;
    }
    setFile(chosen);
    setResult(null);
    setReached(0);
    if (await analyze(chosen)) goTo(1);
  };

  const confirmColumns = async () => {
    const data = await analyze(file, mapping);
    if (!data) return;
    if (data.missing.length > 0) {
      setError(`Elige la columna de: ${data.missing.map((key) => data.fields.find((field) => field.key === key)?.label).join(", ")}.`);
      return;
    }
    goTo(2);
  };

  const handleImport = async () => {
    setBusy(true);
    setError("");
    try {
      const response = await runImport(file, { idbranch: branch.id, columns: mapping });
      setResult({ ...response.data, message: response.message });
      goTo(3);
      onImported?.();
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo importar. Inténtalo de nuevo."));
    } finally {
      setBusy(false);
    }
  };

  const handleTemplate = async () => {
    setTemplateBusy(true);
    try {
      await downloadTemplate();
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo descargar la plantilla."));
    } finally {
      setTemplateBusy(false);
    }
  };

  const setColumn = (key, value) => setMapping((current) => ({ ...current, [key]: value === "" ? null : Number(value) }));
  const usedBy = (column) => Object.entries(mapping).find(([, value]) => value === column)?.[0];
  const headerOptions = (analysis?.headers ?? []).map((header) => ({
    value: String(header.column),
    label: `${header.title}`,
  }));

  const renderFile = () => (
    <div className="import-step">
      <div className={`import-branch ${branch ? "" : "import-branch--missing"}`.trim()}>
        <span className="import-branch__icon" aria-hidden="true">
          <Icon name={branch ? "store" : "alert"} />
        </span>
        {branch ? (
          <span>
            Los productos y sus existencias se cargarán en <strong>{branch.name}</strong>
            <small>Para otra sucursal, cámbiala en el selector de arriba antes de abrir esta ventana.</small>
          </span>
        ) : (
          <span>
            <strong>Elige una sucursal en el selector de arriba.</strong>
            <small>Con «Todas mis sucursales» no se puede importar: el inventario se carga en una sucursal a la vez.</small>
          </span>
        )}
      </div>

      <DropZone file={file} busy={busy} disabled={!branch} onFile={handleFile} />

      <div className="import-tips">
        <div>
          <strong>¿Cómo debe venir el Excel?</strong>
          <ul>
            <li>Una fila de títulos (Nombre, Precio, Cantidad…) y debajo un producto por fila.</li>
            <li>Obligatorios: nombre y precio de venta{showCost ? " y precio de costo" : ""}.</li>
            <li>Lo que ya exista (mismo SKU o código de barras) se salta.</li>
            <li>Las categorías y los proveedores que no existan se crean solos.</li>
          </ul>
        </div>
        <Button variant="outline" icon="download" onClick={handleTemplate} disabled={templateBusy}>
          {templateBusy ? "Descargando…" : "Descargar plantilla"}
        </Button>
      </div>
    </div>
  );

  const renderColumns = () =>
    analysis && (
      <div className="import-step">
        <p className="import-lead">
          Encontramos los títulos en la <strong>fila {analysis.headerRow}</strong> de la hoja «{analysis.sheet}». Revisa qué columna trae cada dato;
          las que no elijas se ignoran.
        </p>
        <div className="import-map">
          {analysis.fields.map((field, index) => {
            const value = mapping[field.key];
            const sample = analysis.headers.find((header) => header.column === value);
            return (
              <div
                key={field.key}
                className={`import-map__row ${value ? "import-map__row--set" : ""} ${field.available ? "" : "import-map__row--off"}`.trim()}
                style={{ "--i": index }}
              >
                <div className="import-map__field">
                  <span className="import-map__dot" aria-hidden="true">
                    {value ? <Icon name="check" /> : index + 1}
                  </span>
                  <span>
                    <strong>{field.label}</strong>
                    <small>{!field.available ? "No se lee con tus permisos" : field.required ? "Obligatorio" : "Opcional"}</small>
                  </span>
                </div>
                <span className="import-map__arrow" aria-hidden="true" />
                <Select
                  className="import-map__select"
                  label={`Columna de ${field.label}`}
                  placeholder="— No usar —"
                  options={headerOptions.map((option) => {
                    const owner = usedBy(Number(option.value));
                    const ownerLabel = owner && owner !== field.key ? analysis.fields.find((item) => item.key === owner)?.label : null;
                    return { ...option, label: ownerLabel ? `${option.label} (ya en ${ownerLabel})` : option.label };
                  })}
                  value={value ? String(value) : ""}
                  disabled={!field.available || busy}
                  onChange={(event) => setColumn(field.key, event.target.value)}
                  hint={sample ? undefined : field.required && field.available ? "Elige una columna" : undefined}
                />
              </div>
            );
          })}
        </div>
        {analysis.warnings.length > 0 && (
          <ul className="import-warnings">
            {analysis.warnings.map((warning) => (
              <li key={warning}>
                <Icon name="alert" /> {warning}
              </li>
            ))}
          </ul>
        )}
      </div>
    );

  const renderReview = () =>
    analysis?.totals && (
      <div className="import-step">
        <div className="import-stats">
          <Stat index={0} tone="ok" icon="plus" value={analysis.totals.ready} label="productos nuevos" />
          <Stat index={1} tone="info" icon="box" value={analysis.totals.units} label={`unidades en ${analysis.branch.name}`} />
          <Stat index={2} tone="muted" icon="refresh" value={analysis.totals.skipped} label="ya existían" />
          <Stat index={3} tone="bad" icon="alert" value={analysis.totals.invalid} label="con errores" />
        </div>

        <Chips title="Categorías que se van a crear" icon="sparkles" items={analysis.newCategories} />
        <Chips title="Proveedores que se van a crear (quedan «por completar»)" icon="users" items={analysis.newSuppliers} />

        {analysis.preview.length > 0 && (
          <section className="import-preview">
            <header className="import-preview__head">
              <strong>Así quedan</strong>
              <span>
                {analysis.totals.ready > analysis.preview.length
                  ? `Los primeros ${analysis.preview.length} de ${analysis.totals.ready.toLocaleString("es-CO")}`
                  : plural(analysis.preview.length, "producto", "productos")}
              </span>
            </header>
            <div className="import-preview__scroll">
              <table className="import-preview__table">
                <thead>
                  <tr>
                    <th>Fila</th>
                    <th>Producto</th>
                    <th>Categoría</th>
                    {showCost && <th className="is-number">Costo</th>}
                    <th className="is-number">Venta</th>
                    <th className="is-number">Cant.</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.preview.map((row) => (
                    <tr key={row.row}>
                      <td className="is-muted">{row.row}</td>
                      <td>
                        <strong>{row.name}</strong>
                        <small>{[row.sku, row.barcode, row.supplier].filter(Boolean).join(" · ") || "SKU automático"}</small>
                      </td>
                      <td>{row.category}</td>
                      {showCost && <td className="is-number">{formatCurrency(row.costPrice ?? 0)}</td>}
                      <td className="is-number">{formatCurrency(row.salePrice)}</td>
                      <td className="is-number">{row.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <IssueList title="Filas con errores (no se importan)" tone="bad" rows={analysis.invalid} failedFile={analysis.failedFile} />
        <IssueList title="Ya existían (se saltan)" tone="muted" rows={analysis.skipped} />

        {analysis.totals.ready === 0 && (
          <p className="import-lead import-lead--warn">No hay productos nuevos para importar. Corrige el Excel y vuelve a subirlo.</p>
        )}
      </div>
    );

  const renderDone = () =>
    result && (
      <div className="import-step import-done">
        <span className="import-done__seal" aria-hidden="true">
          <Icon name="check" />
        </span>
        <h3 className="import-done__title">{result.message}</h3>
        <p className="import-done__text">
          {plural(result.totals.units, "unidad quedó", "unidades quedaron")} en {result.branch.name} como inventario inicial (cargadas sin compra).
        </p>
        <div className="import-stats">
          <Stat index={0} tone="ok" icon="check" value={result.totals.created} label="importados" />
          <Stat index={1} tone="info" icon="box" value={result.totals.units} label="unidades" />
          <Stat index={2} tone="muted" icon="refresh" value={result.totals.skipped} label="ya existían" />
          <Stat index={3} tone="bad" icon="alert" value={result.invalid.length} label="no entraron" />
        </div>
        <Chips title="Categorías creadas" icon="sparkles" items={result.newCategories} />
        <Chips title="Proveedores creados: complétalos en Compras → Proveedores" icon="users" items={result.newSuppliers} />
        <IssueList title="No entraron" tone="bad" rows={result.invalid} failedFile={result.failedFile} />
      </div>
    );

  const content = [renderFile, renderColumns, renderReview, renderDone][step]();

  return (
    <Modal
      open={open}
      size="wide"
      icon="download"
      title="Importar productos desde Excel"
      subtitle={branch ? `Inventario inicial de ${branch.name}` : "Elige primero una sucursal"}
      busy={busy}
      onClose={close}
    >
      <div className="import-modal">
        <Stepper steps={STEPS} current={step} reached={step === 3 ? 3 : Math.min(reached, 2)} onSelect={step === 3 || busy ? undefined : goTo} />
        {error && (
          <p className="form-layout__error import-modal__error" role="alert">
            {error}
          </p>
        )}
        <div className="import-modal__panel" key={step}>
          {content}
        </div>

        <FormActions>
          {step === 0 && (
            <Button variant="outline" onClick={close} disabled={busy}>
              Cancelar
            </Button>
          )}
          {step === 0 && analysis && file && (
            <Button icon="chevron" className="import-modal__next" onClick={() => goTo(1)} disabled={busy}>
              Siguiente
            </Button>
          )}
          {(step === 1 || step === 2) && (
            <Button variant="outline" icon="chevron" className="import-modal__back" onClick={() => goTo(step - 1)} disabled={busy}>
              Atrás
            </Button>
          )}
          {step === 1 && (
            <Button icon="chevron" className="import-modal__next" onClick={confirmColumns} disabled={busy}>
              {busy ? "Revisando…" : "Revisar filas"}
            </Button>
          )}
          {step === 2 && (
            <Button icon="download" onClick={handleImport} disabled={busy || !analysis?.totals?.ready}>
              {busy ? "Importando…" : `Importar ${plural(analysis?.totals?.ready ?? 0, "producto", "productos")}`}
            </Button>
          )}
          {step === 3 && (
            <>
              <Button variant="outline" icon="refresh" onClick={reset}>
                Importar otro archivo
              </Button>
              <Button icon="check" onClick={close}>
                Listo
              </Button>
            </>
          )}
        </FormActions>
      </div>
    </Modal>
  );
};

export default ImportProductsModal;
