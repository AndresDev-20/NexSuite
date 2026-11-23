import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import Header from "../components/header/Header";
import Menu from "../components/menu/Menu";
import ToastProvider from "../components/feadback/Toast/ToastProvider";
import PermissionsProvider from "../features/auth/PermissionsProvider";
import BranchProvider from "../features/branches/BranchProvider";
import DemoBadge from "../demo/DemoBadge";
import { SeasonParticles } from "../features/seasons/SeasonDecor";
import WelcomeGreeting from "../features/seasons/WelcomeGreeting";
import { SeasonScene } from "../features/seasons/SeasonScene";
import { getUser } from "../utils/session";
import { getShortName } from "../utils/userDisplay";
import "./mainLayout.css";
import { useEffect } from "react";
import { loadPaymentMethods } from "../features/sales/sales/paymentMethods";

/** Medios de pago configurados (Fase 40): se piden al entrar para que los nombres salgan bien en todo el sistema. */
const LoadPaymentMethods = () => {
  useEffect(() => {
    loadPaymentMethods();
  }, []);
  return null;
};

const MainLayout = () => (
  <ToastProvider>
    <PermissionsProvider>
      <BranchProvider>
      <div className="main-layout">
        <SeasonParticles variant="app" />
        <Header />

        <div className="main-layout__body">
          <aside className="main-layout__menu">
            <Menu />
            <SeasonScene variant="menu" />
          </aside>

          <main className="main-layout__content">
            {/* Mientras llega el código de la pantalla (se carga al abrirla) */}
            <Suspense fallback={<p className="main-layout__loading" role="status">Cargando…</p>}>
              <Outlet />
            </Suspense>
          </main>
        </div>  
        <LoadPaymentMethods />
        <DemoBadge />
        <WelcomeGreeting mode="system" name={getShortName(getUser()) || ""} />
      </div>
      </BranchProvider>
    </PermissionsProvider>
  </ToastProvider>
);

export default MainLayout;