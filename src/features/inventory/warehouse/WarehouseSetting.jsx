import { useState } from "react";
import Switch from "../../../components/forms/Switch/Switch";
import useToast from "../../../components/feadback/Toast/useToast";
import usePermissions from "../../auth/usePermissions";
import getErrorMessage from "../../../utils/getErrorMessage";
import { updateWarehouseEnabled, useWarehouseEnabled } from "./warehouseApi";
import "./warehouse.css";

/**
 * Configuración → Datos del negocio: «Usar la bodega» (Fase 47). Apagada no aparece en ningún lado. Solo con
 * «Configurar el negocio»; no se apaga con préstamos vigentes o saldo por cobrar (el servidor dice qué falta).
 */
const WarehouseSetting = () => {
  const toast = useToast();
  const { can } = usePermissions();
  const enabled = useWarehouseEnabled();
  const [busy, setBusy] = useState(false);
  if (enabled === null) return null;
  const allowed = can("settings.manage");

  const change = async (value) => {
    setBusy(true);
    try {
      const result = await updateWarehouseEnabled(value);
      toast.success(result.enabled ? "Bodega activada: ya está en Inventarios → Bodega." : "Bodega apagada: ya no aparece en el sistema.");
    } catch (err) {
      toast.error(getErrorMessage(err, "No se pudo cambiar la bodega."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="business-settings__section wh-setting" aria-label="Bodega">
      <Switch
        label="Usar la bodega"
        description="Para prestarles o venderles productos a colegas o clientes especiales desde el inventario de cada sucursal, con plazos, precio especial y lo que deben. Si no la usas, déjala apagada: no aparece en ningún lado."
        checked={enabled}
        disabled={!allowed || busy}
        onChange={change}
      />
      <span className="wh-setting__state">
        <span className={`wh-setting__dot ${enabled ? "wh-setting__dot--on" : ""}`.trim()} aria-hidden="true" />
        {busy ? "Guardando…" : enabled ? "Activa" : "Apagada"}
        {!allowed && " · la cambia quien tiene «Configurar el negocio»"}
      </span>
    </section>
  );
};

export default WarehouseSetting;
