import { Outlet } from "react-router-dom";
import Header from "../components/header/Header";
import Menu from "../components/menu/Menu";
import "./mainLayout.css";

const MainLayout = () => (
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
);

export default MainLayout;