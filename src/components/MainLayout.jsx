import { Outlet } from "react-router-dom";
import Header from "../components/header/Header";
import Menu from "../components/menu/Menu";
import ToastProvider from "../components/feadback/Toast/ToastProvider";
import "./mainLayout.css";

const MainLayout = () => (
  <ToastProvider>
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
    </div>
  </ToastProvider>
);

export default MainLayout;