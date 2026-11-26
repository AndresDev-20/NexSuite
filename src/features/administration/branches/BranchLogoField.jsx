import { useEffect, useRef, useState } from "react";
import api from "../../../api/client";
import Button from "../../../components/ui/Button/Button";
import useToast from "../../../components/feadback/Toast/useToast";
import getErrorMessage from "../../../utils/getErrorMessage";
import { toPng } from "../../settings/LogoSettings";

const ACCEPTED = ["image/png", "image/jpeg", "image/webp"];

/**
 * Logo propio de la sucursal (Fase 52.3): sale en sus comprobantes; sin él, el de Datos del negocio. Se guarda al
 * subirlo (no espera a «Guardar cambios»). La imagen se pide con la sesión (no es pública).
 * branch: { id, logoVersion } · fallback: la URL del logo del negocio · onChange(url | null): para la vista previa.
 */
const BranchLogoField = ({ branch, fallback, onChange }) => {
  const toast = useToast();
  const inputRef = useRef(null);
  const [version, setVersion] = useState(branch.logoVersion ?? null);
  const [url, setUrl] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!version) {
      setUrl(null);
      onChange?.(null);
      return undefined;
    }
    let active = true;
    let objectUrl = null;
    api
      .get(`/branches/${branch.id}/logo`, { responseType: "blob", params: { v: version } })
      .then((response) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(response.data);
        setUrl(objectUrl);
        onChange?.(objectUrl);
      })
      .catch(() => active && setUrl(null));
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
    // onChange es de la vista previa: no vuelve a pedir la imagen
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branch.id, version]);

  const pick = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!ACCEPTED.includes(file.type)) {
      toast.error("Usa una imagen PNG, JPG o WEBP.");
      return;
    }
    setBusy(true);
    try {
      const { blob } = await toPng(file);
      const response = await api.put(`/branches/${branch.id}/logo`, blob, { headers: { "Content-Type": "image/png" } });
      setVersion(response.data?.data?.logoVersion ?? Date.now());
      toast.success("Logo de la sucursal guardado: ya sale en sus comprobantes.");
    } catch (error) {
      toast.error(getErrorMessage(error, "No se pudo subir el logo."));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await api.delete(`/branches/${branch.id}/logo`);
      setVersion(null);
      toast.success("Logo quitado: sus comprobantes salen con el del negocio.");
    } catch (error) {
      toast.error(getErrorMessage(error, "No se pudo quitar el logo."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="branch-logo">
      <span className={`branch-logo__preview ${url ? "branch-logo__preview--own" : ""}`.trim()}>
        <img src={url ?? fallback} alt="" />
      </span>
      <div className="branch-logo__text">
        <strong>{url ? "Logo propio de la sucursal" : "Usa el logo del negocio"}</strong>
        <small>PNG, JPG o WEBP; se ajusta solo (máximo 300 KB).</small>
        <div className="branch-logo__actions">
          <Button variant="outline" icon="plus" disabled={busy} onClick={() => inputRef.current?.click()}>
            {busy ? "Guardando…" : url ? "Cambiar logo" : "Subir logo"}
          </Button>
          {url && (
            <Button variant="outline" icon="trash" disabled={busy} onClick={remove}>
              Quitar
            </Button>
          )}
        </div>
      </div>
      <input ref={inputRef} type="file" accept={ACCEPTED.join(",")} hidden onChange={pick} />
    </div>
  );
};

export default BranchLogoField;
