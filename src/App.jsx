import { Navigate, Route, Routes } from "react-router-dom";
import Login from "./pages/login/Login";
import ProtectedRoute from "./routes/ProtectedRoute";
import MainLayout from "./components/MainLayout";
import Home from "./pages/home/Home";
import UsersPage from "./features/administration/UserPage/UsersPage";
import RolesPage from "./features/administration/RolesPage/RolesPage";
import RolePermissionsPage from "./features/administration/RolePermissionsPage/RolePermissionsPage";
import BranchesPage from "./features/administration/BranchesPage/BranchesPage";
import AuditPage from "./features/administration/AuditPage/AuditPage";
import PermissionRoute from "./routes/PermissionRoute";
import CategoriesPage from "./features/inventory/categories/CategoriesPage/CategoriesPage";
import SuppliersPage from "./features/purchases/SuppliersPage/SuppliersPage";
import OrdersPage from "./features/purchases/OrdersPage/OrdersPage";
import PayablesPage from "./features/purchases/PayablesPage/PayablesPage";
import ProductsPage from "./features/inventory/ProductsPage/ProductsPage";
import BranchStockPage from "./features/inventory/BranchStockPage/BranchStockPage";
import MovementsPage from "./features/inventory/MovementsPage/MovementsPage";
import TransfersPage from "./features/inventory/TransfersPage/TransfersPage";
import StockCountsPage from "./features/inventory/StockCountsPage/StockCountsPage";
import MyCashPage from "./features/cash/MyCashPage/MyCashPage";
import SessionsPage from "./features/cash/SessionsPage/SessionsPage";
import RegistersPage from "./features/cash/RegistersPage/RegistersPage";
import ProductUnitsPage from "./features/inventory/ProductUnitsPage/ProductUnitsPage";
import CustomersPage from "./features/sales/CustomersPage/CustomersPage";
import PosPage from "./features/sales/PosPage/PosPage";
import SalesPage from "./features/sales/SalesPage/SalesPage";
import ReceivablesPage from "./features/sales/ReceivablesPage/ReceivablesPage";
import ReportsPage from "./features/sales/ReportsPage/ReportsPage";
import SettingsPage from "./features/settings/SettingsPage/SettingsPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/welcome" element={<Home />} />
          {/* Configuración de este equipo (tema, animaciones, texto): para todos */}
          <Route path="/configuracion" element={<SettingsPage />} />

          <Route
            path="/compras"
            element={<Navigate to="/compras/proveedores" replace />}
          />

          <Route element={<PermissionRoute permission="cash-sessions.operate" />}>
            <Route path="/caja/mi-caja" element={<MyCashPage />} />
          </Route>

          <Route element={<PermissionRoute permission="cash-sessions.read" />}>
            <Route path="/caja/turnos" element={<SessionsPage />} />
          </Route>

          <Route element={<PermissionRoute permission="cash-registers.read" />}>
            <Route path="/caja/cajas" element={<RegistersPage />} />
          </Route>

          <Route element={<PermissionRoute permission="customers.read" />}>
            <Route path="/ventas/clientes" element={<CustomersPage />} />
          </Route>

          <Route element={<PermissionRoute permission="sales.create" />}>
            <Route path="/ventas/vender" element={<PosPage />} />
          </Route>

          <Route element={<PermissionRoute permission="sales.read" />}>
            <Route path="/ventas/historial" element={<SalesPage />} />
          </Route>

          {/* Reportes: mismo acceso que el historial (las suyas o las de todos) */}
          <Route element={<PermissionRoute permission={["sales.read", "sales.read-all"]} />}>
            <Route path="/ventas/reportes" element={<ReportsPage />} />
          </Route>

          {/* Cartera: se ve con "Consultar cartera" o, para cobrar, con "Registrar abonos" */}
          <Route element={<PermissionRoute permission={["receivables.read", "receivables.pay"]} />}>
            <Route path="/ventas/cartera" element={<ReceivablesPage />} />
          </Route>

          <Route element={<PermissionRoute permission="suppliers.read" />}>
            <Route path="/compras/proveedores" element={<SuppliersPage/>} />
          </Route>

          <Route element={<PermissionRoute permission="orders.read" />}>
            <Route path="/compras/registro" element={<OrdersPage />} />
          </Route>

          <Route element={<PermissionRoute permission="payables.read" />}>
            <Route path="/compras/cuentas-por-pagar" element={<PayablesPage />} />
          </Route>
          <Route
            path="/inventario"
            element={<Navigate to="/inventario/categorias" replace />}
          />
          

          <Route element={<PermissionRoute permission="categories.read" />}>
            <Route path="/inventario/categorias" element={<CategoriesPage />} />
          </Route>

          <Route element={<PermissionRoute permission="products.read" />}>
            <Route path="/inventario/productos" element={<ProductsPage />} />
          </Route>

          <Route element={<PermissionRoute permission="branch-stock.read" />}>
            <Route path="/inventario/existencias" element={<BranchStockPage />} />
            <Route path="/inventario/movimientos" element={<MovementsPage />} />
          </Route>

          <Route element={<PermissionRoute permission="stock-counts.read" />}>
            <Route path="/inventario/toma-fisica" element={<StockCountsPage />} />
          </Route>

          <Route element={<PermissionRoute permission="transfers.read" />}>
            <Route path="/inventario/traslados" element={<TransfersPage />} />
          </Route>

          <Route element={<PermissionRoute permission="product-units.read" />}>
            <Route path="/inventario/seriales" element={<ProductUnitsPage />} />
          </Route>

          <Route
            path="/administrativo"
            element={<Navigate to="/administrativo/usuarios" replace />}
          />

          <Route element={<PermissionRoute permission="users.read" />}>
            <Route path="/administrativo/usuarios" element={<UsersPage />} />
          </Route>

          <Route element={<PermissionRoute permission="roles.read" />}>
            <Route path="/administrativo/roles" element={<RolesPage />} />
          </Route>

          <Route element={<PermissionRoute permission="role-permissions.read" />}>
            <Route
              path="/administrativo/roles/:roleId/permisos"
              element={<RolePermissionsPage />}
            />
          </Route>

          <Route element={<PermissionRoute permission="branches.read" />}>
            <Route
              path="/administrativo/sucursales"
              element={<BranchesPage />}
            />
          </Route>

          <Route element={<PermissionRoute permission="audit.read" />}>
            <Route path="/administrativo/auditoria" element={<AuditPage />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  );
}

export default App;
