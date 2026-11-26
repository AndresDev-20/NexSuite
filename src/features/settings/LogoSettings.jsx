import { useRef, useState } from "react";
import Button from "../../components/ui/Button/Button";
import Icon from "../../components/ui/Icon/Icon";
import ConfirmDialog from "../../components/feadback/ConfirmDialog/ConfirmDialog";
import useToast from "../../components/feadback/Toast/useToast";
import getErrorMessage from "../../utils/getErrorMessage";
import { useBrand } from "../brand/brandContext";
import { DEFAULT_LOGO, removeLogo, uploadLogo } from "../brand/brandApi";
import BrandWordmark from "../brand/BrandWordmark";
import "./logoSettings.css";

const MAX_SIDE = 512;
const MAX_BYTES = 300 * 1024;
const ACCEPTED = ["image/png", "image/jpeg", "image/webp"];

/**
 * Convierte la imagen a PNG de máximo 512 px por lado con el canvas del navegador (sin librerías). Si aun
 * así pesa más de 300 KB, la reduce un poco más. → { blob, url, width, height }
 */
export const toPng = async (file) => {
  const source = URL.createObjectURL(file);
  try {
    const image = await new Promise((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("No se pudo leer la imagen."));
      element.src = source;
    });
    for (const side of [MAX_SIDE, 384, 256, 192]) {
      const scale = Math.min(1, side / Math.max(image.naturalWidth, image.naturalHeight));
      const width = Math.max(1, Math.round(image.naturalWidth * scale));
      const height = Math.max(1, Math.round(image.naturalHeight * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d").drawImage(image, 0, 0, width, height);
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
      if (blob && blob.size <= MAX_BYTES) return { blob, url: URL.createObjectURL(blob), width, height };
    }
    throw new Error("La imagen sigue pesando mucho. Prueba con un logo más sencillo o recortado.");
  } finally {
    URL.revokeObjectURL(source);
  }
};

/** Cómo se ve el logo en el sistema: encabezado, inicio de sesión, comprobante y pestaña. */
const BrandPreview = ({ logo, name, tagline }) => (
  <div className="logo-preview" aria-hidden="true">
    <div className="logo-preview__item logo-preview__item--header" style={{ "--i": 0 }}>
      <span className="logo-preview__caption">Encabezado</span>
      <div className="logo-preview__bar">
        <img src={logo} alt="" />
        <BrandWordmark name={name} tagline={tagline} size="preview" className="logo-preview__wordmark" />
      </div>
    </div>
    <div className="logo-preview__item logo-preview__item--login" style={{ "--i": 1 }}>
      <span className="logo-preview__caption">Inicio de sesión</span>
      <div className="logo-preview__login">
        <img src={logo} alt="" />
        <BrandWordmark name={name} tagline={tagline} size="preview" className="logo-preview__wordmark" />
        <span className="logo-preview__field" />
        <span className="logo-preview__field" />
        <span className="logo-preview__button" />
      </div>
    </div>
    <div className="logo-preview__item logo-preview__item--ticket" style={{ "--i": 2 }}>
      <span className="logo-preview__caption">Comprobante</span>
      <div className="logo-preview__ticket">
        <img src={logo} alt="" />
        <strong>{name}</strong>
        <span />
        <span />
        <span className="logo-preview__short" />
      </div>
    </div>
    <div className="logo-preview__item logo-preview__item--tab" style={{ "--i": 3 }}>
      <span className="logo-preview__caption">Pestaña del navegador</span>
      <div className="logo-preview__tab">
        <img src={logo} alt="" />
        <span>{name}</span>
        <Icon name="x" />
      </div>
    </div>
  </div>
);

/**
 * Logo de la empresa (Fase 29): se sube aquí, se guarda en la base de esta empresa y sale en el inicio de
 * sesión, el encabezado, la pestaña, la tienda, los comprobantes, los PDF y los Excel. Con «Configurar el negocio».
 */
const LogoSettings = ({ businessName, tagline }) => {
  const brand = useBrand();
  const toast = useToast();
  const inputRef = useRef(null);
  const [staged, setStaged] = useState(null); // { blob, url, width, height } listo para guardar
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [over, setOver] = useState(false);
  const [removing, setRemoving] = useState(false);

  const name = businessName?.trim() || brand.displayName;
  const shown = staged?.url ?? brand.logoUrl;

  const discard = () => {
    if (staged) URL.revokeObjectURL(staged.url);
    setStaged(null);
  };

  const pick = async (file) => {
    setError("");
    if (!file) return;
    if (!ACCEPTED.includes(file.type)) {
      setError("Elige una imagen PNG, JPG o WebP.");
      return;
    }
    setBusy(true);
    try {
      const converted = await toPng(file);
      discard();
      setStaged(converted);
    } catch (err) {
      setError(err.message || "No se pudo leer la imagen.");
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    setBusy(true);
    setError("");
    try {
      const result = await uploadLogo(staged.blob);
      brand.setLogoVersion(result.logoVersion);
      discard();
      toast.success("Logo guardado: ya sale en el sistema y en los documentos.");
    } catch (err) {
      setError(getErrorMessage(err, "No se pudo guardar el logo."));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    await removeLogo();
    brand.setLogoVersion(null);
    setRemoving(false);
    toast.success("Logo quitado: vuelve a verse el de NexSuite.");
  };

  return (
    <section className="logo-settings">
      <header className="logo-settings__head">
        <div>
          <h3 className="logo-settings__title">Logo de la empresa</h3>
          <p className="logo-settings__text">
            Sale en el inicio de sesión, el encabezado, la pestaña del navegador, la tienda en línea, los comprobantes y los informes.
          </p>
        </div>
        <span className={`logo-settings__status ${brand.hasLogo ? "logo-settings__status--ok" : ""}`.trim()}>
          <Icon name={brand.hasLogo ? "check" : "sparkles"} />
          {brand.hasLogo ? "Con logo propio" : "Usando el de NexSuite"}
        </span>
      </header>

      <div className="logo-settings__body">
        <div
          className={`logo-drop ${over ? "logo-drop--over" : ""} ${staged ? "logo-drop--staged" : ""}`.trim()}
          onDragOver={(event) => {
            event.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(event) => {
            event.preventDefault();
            setOver(false);
            if (!busy) pick(event.dataTransfer.files?.[0]);
          }}
        >
          <span className="logo-drop__frame" key={shown}>
            <img src={shown} alt={`Logo de ${name}`} onError={(event) => (event.currentTarget.src = DEFAULT_LOGO)} />
          </span>
          {staged ? (
            <p className="logo-drop__hint">
              <strong>Nuevo logo listo</strong> · {staged.width} × {staged.height} px · {Math.max(1, Math.round(staged.blob.size / 1024))} KB
            </p>
          ) : (
            <p className="logo-drop__hint">Arrastra aquí el logo o elígelo · PNG, JPG o WebP. Mejor con fondo transparente.</p>
          )}
          <div className="logo-drop__actions">
            {staged ? (
              <>
                <Button variant="outline" onClick={discard} disabled={busy}>
                  Cancelar
                </Button>
                <Button icon="check" onClick={save} disabled={busy}>
                  {busy ? "Guardando…" : "Guardar logo"}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" icon="inbox" onClick={() => inputRef.current?.click()} disabled={busy}>
                  {busy ? "Preparando…" : brand.hasLogo ? "Cambiar logo" : "Subir logo"}
                </Button>
                {brand.hasLogo && (
                  <Button variant="danger" icon="trash" onClick={() => setRemoving(true)} disabled={busy}>
                    Quitar
                  </Button>
                )}
              </>
            )}
          </div>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED.join(",")}
            hidden
            onChange={(event) => {
              pick(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
          {error && (
            <p className="logo-drop__error" role="alert">
              {error}
            </p>
          )}
        </div>

        <BrandPreview logo={shown} name={name} tagline={tagline?.trim() || null} />
      </div>

      <ConfirmDialog
        open={removing}
        title="Quitar el logo"
        message="¿Quitar el logo de la empresa? Vuelve a verse el de NexSuite en el sistema, la tienda y los documentos."
        detail="Puedes subirlo de nuevo cuando quieras."
        confirmLabel="Quitar logo"
        confirmIcon="trash"
        errorFallback="No se pudo quitar el logo."
        onConfirm={remove}
        onClose={() => setRemoving(false)}
      />
    </section>
  );
};

export default LogoSettings;
