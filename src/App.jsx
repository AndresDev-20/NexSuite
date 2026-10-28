import { lazy } from "react";
import { Route, Routes } from "react-router-dom";
import Login from "./pages/login/Login";
import ProtectedRoute from "./routes/ProtectedRoute";
import MainLayout from "./components/MainLayout";
const Home = lazy(() => import("./pages/home/Home"));
const UsersPage = lazy(() => import("./features/administration/UserPage/UsersPage"));
const RolesPage = lazy(() => import("./features/administration/RolesPage/RolesPage"));
const RolePermissionsPage = lazy(() => import("./features/administration/RolePermissionsPage/RolePermissionsPage"));
const BranchesPage = lazy(() => import("./features/administration/BranchesPage/BranchesPage"));
const AuditPage = lazy(() => import("./features/administration/AuditPage/AuditPage"));
import PermissionRoute from "./routes/PermissionRoute";
import SectionRedirect from "./routes/SectionRedirect";

// Cada pantalla se descarga cuando se abre (Fase 17.2): el inicio de sesión y el menú cargan primero
const CategoriesPage = lazy(() => import("./features/inventory/categories/CategoriesPage/CategoriesPage"));
const SuppliersPage = lazy(() => import("./features/purchases/SuppliersPage/SuppliersPage"));
const OrdersPage = lazy(() => import("./features/purchases/OrdersPage/OrdersPage"));
const PayablesPage = lazy(() => import("./features/purchases/PayablesPage/PayablesPage"));
const ProductsPage = lazy(() => import("./features/inventory/ProductsPage/ProductsPage"));
const BranchStockPage = lazy(() => import("./features/inventory/BranchStockPage/BranchStockPage"));
const MovementsPage = lazy(() => import("./features/inventory/MovementsPage/MovementsPage"));
const TransfersPage = lazy(() => import("./features/inventory/TransfersPage/TransfersPage"));
const StockCountsPage = lazy(() => import("./features/inventory/StockCountsPage/StockCountsPage"));
const MyCashPage = lazy(() => import("./features/cash/MyCashPage/MyCashPage"));
const SessionsPage = lazy(() => import("./features/cash/SessionsPage/SessionsPage"));
const RegistersPage = lazy(() => import("./features/cash/RegistersPage/RegistersPage"));
const PaymentsPage = lazy(() => import("./features/cash/PaymentsPage/PaymentsPage"));
const ProductUnitsPage = lazy(() => import("./features/inventory/ProductUnitsPage/ProductUnitsPage"));
const CustomersPage = lazy(() => import("./features/sales/CustomersPage/CustomersPage"));
const PosPage = lazy(() => import("./features/sales/PosPage/PosPage"));
const SalesPage = lazy(() => import("./features/sales/SalesPage/SalesPage"));
const ReceivablesPage = lazy(() => import("./features/sales/ReceivablesPage/ReceivablesPage"));
const ReportsPage = lazy(() => import("./features/sales/ReportsPage/ReportsPage"));
const BalancePage = lazy(() => import("./features/sales/BalancePage/BalancePage"));
const ExpensesPage = lazy(() => import("./features/expenses/ExpensesPage/ExpensesPage"));
const InventoryReportPage = lazy(() => import("./features/reports/InventoryReportPage/InventoryReportPage"));
const PurchasesReportPage = lazy(() => import("./features/reports/PurchasesReportPage/PurchasesReportPage"));
const CashReportPage = lazy(() => import("./features/reports/CashReportPage/CashReportPage"));
const ExpensesReportPage = lazy(() => import("./features/reports/ExpensesReportPage/ExpensesReportPage"));
const ComparisonPage = lazy(() => import("./features/reports/ComparisonPage/ComparisonPage"));
const WarrantiesPage = lazy(() => import("./features/sales/WarrantiesPage/WarrantiesPage"));
const ChatsPage = lazy(() => import("./features/chats/ChatsPage/ChatsPage"));
const SettingsPage = lazy(() => import("./features/settings/SettingsPage/SettingsPage"));

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
            element={<SectionRedirect prefix="/compras" />}
          />

          <Route element={<PermissionRoute permission="cash-sessions.operate" />}>
            <Route path="/caja/mi-caja" element={<MyCashPage />} />
          </Route>

          <Route element={<PermissionRoute permission="cash-sessions.read" />}>
            <Route path="/caja/turnos" element={<SessionsPage />} />
          </Route>

          <Route element={<PermissionRoute permission="payments.read" />}>
            <Route path="/caja/pagos" element={<PaymentsPage />} />
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

          <Route element={<PermissionRoute permission={["sales.read", "sales.read-all"]} />}>
            <Route path="/ventas/historial" element={<SalesPage />} />
          </Route>

          {/* Reportes: mismo acceso que el historial (las suyas o las de todos) */}
          <Route element={<PermissionRoute permission={["sales.read", "sales.read-all"]} />}>
            <Route path="/ventas/reportes" element={<ReportsPage />} />
          </Route>
          {/* Gastos (Fase 13): lo que sale del negocio sin ser compra de mercancía */}
          <Route element={<PermissionRoute permission="expenses.read" />}>
            <Route path="/gastos/registro" element={<ExpensesPage />} />
          </Route>
          {/* Informes (Fase 14): con el permiso de consulta de cada módulo */}
          <Route element={<PermissionRoute permission="branch-stock.read" />}>
            <Route path="/informes/inventario" element={<InventoryReportPage />} />
          </Route>
          <Route element={<PermissionRoute permission="orders.read" />}>
            <Route path="/informes/compras" element={<PurchasesReportPage />} />
          </Route>
          <Route element={<PermissionRoute permission="cash-sessions.read" />}>
            <Route path="/informes/caja" element={<CashReportPage />} />
          </Route>
          <Route element={<PermissionRoute permission="expenses.read" />}>
            <Route path="/informes/gastos" element={<ExpensesReportPage />} />
          </Route>
          {/* Comparativo de todo el negocio, con el permiso del balance */}
          <Route element={<PermissionRoute permission="reports.balance" />}>
            <Route path="/informes/comparativo" element={<ComparisonPage />} />
          </Route>
          {/* Balance mensual en pantalla, con tablas y descarga en PDF / Excel */}
          <Route element={<PermissionRoute permission="reports.balance" />}>
            <Route path="/ventas/balance" element={<BalancePage />} />
          </Route>

          {/* Garantías (Fase 11.2): recibir y seguir los casos */}
          <Route element={<PermissionRoute permission="warranties.manage" />}>
            <Route path="/ventas/garantias" element={<WarrantiesPage />} />
          </Route>
          {/* Chats de WhatsApp (Fase 16) */}
          <Route element={<PermissionRoute permission="chats.read" />}>
            <Route path="/ventas/chats" element={<ChatsPage />} />
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
            element={<SectionRedirect prefix="/inventario" />}
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
            element={<SectionRedirect prefix="/administrativo" />}
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
