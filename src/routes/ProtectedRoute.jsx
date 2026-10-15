import { Navigate, Outlet, useLocation } from "react-router-dom";
import { getToken } from "../utils/session";

/**
 * Deja pasar solo si hay una sesión iniciada.
 * Si no la hay, manda al login y recuerda a dónde quería ir.
 */
function ProtectedRoute() {
  const location = useLocation();

  if (!getToken()) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  return <Outlet />;
}

export default ProtectedRoute;