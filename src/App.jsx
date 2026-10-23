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
import CategoriesPage from "./features/inventory/categories/CategoriesPage/CategoriesPage";
import SuppliersPage from "./features/purchases/SuppliersPage/SuppliersPage";
import ProductsPage from "./features/inventory/ProductsPage/ProductsPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/welcome" element={<Home />} />

          <Route
            path="/compras"
            element={<Navigate to="/compras/proveedores" replace />}
          />

          <Route element={<PermissionRoute permission="compras.ver" />}>
            <Route path="/compras/proveedores" element={<SuppliersPage/>} />
          </Route>
          <Route
            path="/inventario"
            element={<Navigate to="/inventario/categorias" replace />}
          />
          

          <Route element={<PermissionRoute permission="inventario.ver" />}>
            <Route path="/inventario/categorias" element={<CategoriesPage />} />
            <Route path="/inventario/productos" element={<ProductsPage />} />
          </Route>

          <Route
            path="/administrativo"
            element={<Navigate to="/administrativo/usuarios" replace />}
          />

          <Route element={<PermissionRoute permission="usuarios.ver" />}>
            <Route path="/administrativo/usuarios" element={<UsersPage />} />
          </Route>

          <Route element={<PermissionRoute permission="roles.ver" />}>
            <Route path="/administrativo/roles" element={<RolesPage />} />
          </Route>

          <Route element={<PermissionRoute permission="roles.permisos" />}>
            <Route
              path="/administrativo/roles/:roleId/permisos"
              element={<RolePermissionsPage />}
            />
          </Route>

          <Route element={<PermissionRoute permission="sucursales.ver" />}>
            <Route
              path="/administrativo/sucursales"
              element={<BranchesPage />}
            />
          </Route>
        </Route>
      </Route>
    </Routes>
  );
}

export default App;
