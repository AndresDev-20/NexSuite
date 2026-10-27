import { DEMO_MODE } from "./demoMode";
import "./demoBadge.css";

/** Aviso fijo del modo demostración: datos ficticios y nada se guarda. No se muestra en el sistema real. */
const DemoBadge = () =>
  DEMO_MODE ? (
    <div className="demo-badge" role="status">
      <span className="demo-badge__dot" aria-hidden="true" />
      <span>Demostración · datos ficticios</span>
      <span className="demo-badge__more">· los cambios no se guardan</span>
    </div>
  ) : null;

export default DemoBadge;
