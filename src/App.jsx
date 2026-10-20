import { Navigate, Route, Routes } from "react-router-dom";
import Login from "./pages/login/Login";
import ProtectedRoute from "./routes/ProtectedRoute";
import MainLayout from "./components/MainLayout";
import Home from "./pages/home/Home";
import UsersPage from "./features/administration/UserPage/UsersPage";
import RolesPage from "./features/administration/RolesPage/RolesPage";
import RolePermissionsPage from "./features/administration/RolePermissionsPage/RolePermissionsPage";
import BranchesPage from "./features/administration/BranchesPage/BranchesPage";
import PermissionRoute from "./routes/PermissionRoute";


function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/welcome" element={<Home />} />

          <Route path="/administrativo" element={<Navigate to="/administrativo/usuarios" replace />} />

          <Route element={<PermissionRoute permission="usuarios.ver" />}>
            <Route path="/administrativo/usuarios" element={<UsersPage />} />
          </Route>

          <Route element={<PermissionRoute permission="roles.ver" />}>
            <Route path="/administrativo/roles" element={<RolesPage />} />
          </Route>

           <Route element={<PermissionRoute permission="roles.permisos" />}>
            <Route path="/administrativo/roles/:roleId/permisos" element={<RolePermissionsPage />} />
          </Route>

          <Route element={<PermissionRoute permission="sucursales.ver" />}>
            <Route path="/administrativo/sucursales" element={<BranchesPage />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  );
}

export default App;