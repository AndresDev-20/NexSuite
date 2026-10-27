import { DEMO_MODE } from "./demoMode";
import "./demoBadge.css";

const RESET_QUESTION = "¿Reiniciar la demostración? Se borra todo lo que registraste en este navegador y vuelven los datos de ejemplo.";

/**
 * Aviso fijo del modo demostración (datos ficticios, guardados solo en este navegador) con el
 * botón para empezar de nuevo. No se muestra en el sistema real.
 */
const DemoBadge = () => {
  if (!DEMO_MODE) return null;

  const reset = async () => {
    if (!window.confirm(RESET_QUESTION)) return;
    // Se carga solo aquí: en el sistema real este módulo no existe en la pantalla
    const { resetDemo } = await import("./demoStore");
    resetDemo();
  };

  return (
    <div className="demo-badge" role="status">
      <span className="demo-badge__dot" aria-hidden="true" />
      <span>Demostración · datos ficticios</span>
      <span className="demo-badge__more">· lo que registres se guarda solo en este navegador</span>
      <button type="button" className="demo-badge__reset" onClick={reset}>
        Reiniciar demo
      </button>
    </div>
  );
};

export default DemoBadge;
