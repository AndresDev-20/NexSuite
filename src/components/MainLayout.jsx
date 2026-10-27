import { Outlet } from "react-router-dom";
import Header from "../components/header/Header";
import Menu from "../components/menu/Menu";
import ToastProvider from "../components/feadback/Toast/ToastProvider";
import PermissionsProvider from "../features/auth/PermissionsProvider";
import BranchProvider from "../features/branches/BranchProvider";
import DemoBadge from "../demo/DemoBadge";
import "./mainLayout.css";

const MainLayout = () => (
  <ToastProvider>
    <PermissionsProvider>
      <BranchProvider>
      <div className="main-layout">
        <Header />

        <div className="main-layout__body">
          <aside className="main-layout__menu">
            <Menu />
          </aside>

          <main className="main-layout__content">
            <Outlet />
          </main>
        </div>  
        <DemoBadge />
      </div>
      </BranchProvider>
    </PermissionsProvider>
  </ToastProvider>
);

export default MainLayout;