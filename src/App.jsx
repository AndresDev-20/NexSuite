import { Route, Routes } from "react-router-dom";
import Login from "./pages/login/Login";
import Home from "./pages/home/Home";
import MainLayout from "./components/MainLayout";
import ProtectedRoute from "./routes/ProtectedRoute";
import BranchesPage from "./features/administration/BranchesPage/BranchesPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/welcome" element={<Home />} />

          {/* Temporal: se reemplaza por las páginas reales en las próximas tareas */}
          <Route path="/administrativo/sucursales" element={<BranchesPage />} />
          <Route path="/administrativo/*" element={<p>Próximamente</p>} />
        </Route>
      </Route>
    </Routes>
  );
}

export default App;