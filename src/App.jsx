import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Login from "./pages/login/Login";
import ProtectedRoute from "./routes/ProtectedRoute";
import MainLayout from "./components/MainLayout";
import SeasonProvider from "./features/seasons/SeasonProvider";
const Home = lazy(() => import("./pages/home/Home"));
const UsersPage = lazy(() => import("./features/administration/UserPage/UsersPage"));
const RolesPage = lazy(() => import("./features/administration/RolesPage/RolesPage"));
const RolePermissionsPage = lazy(() => import("./features/administration/RolePermissionsPage/RolePermissionsPage"));
const BranchesPage = lazy(() => import("./features/administration/BranchesPage/BranchesPage"));
const AuditPage = lazy(() => import("./features/administration/AuditPage/AuditPage"));
import PermissionRoute from "./routes/PermissionRoute";
import SectionRedirect from "./routes/SectionRedirect";
import REPORT_PERMISSIONS from "./features/reports/center/reportPermissions";

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
const OrderPage = lazy(() => import("./features/saleOrders/OrderPage/OrderPage"));
const OrdersQueuePage = lazy(() => import("./features/saleOrders/OrdersQueuePage/OrdersQueuePage"));
const PosPage = lazy(() => import("./features/sales/PosPage/PosPage"));
const SalesPage = lazy(() => import("./features/sales/SalesPage/SalesPage"));
const ReceivablesPage = lazy(() => import("./features/sales/ReceivablesPage/ReceivablesPage"));
const ReportsPage = lazy(() => import("./features/sales/ReportsPage/ReportsPage"));
const BalancePage = lazy(() => import("./features/sales/BalancePage/BalancePage"));
const ExpensesPage = lazy(() => import("./features/expenses/ExpensesPage/ExpensesPage"));
const ReportCatalogPage = lazy(() => import("./features/reports/center/ReportCatalogPage"));
const ReportPage = lazy(() => import("./features/reports/center/ReportPage"));
const WarrantiesPage = lazy(() => import("./features/sales/WarrantiesPage/WarrantiesPage"));
const ChatsPage = lazy(() => import("./features/chats/ChatsPage/ChatsPage"));
const SettingsPage = lazy(() => import("./features/settings/SettingsPage/SettingsPage"));
const ShopLayout = lazy(() => import("./features/shop/ShopLayout"));
const ShopHome = lazy(() => import("./features/shop/ShopHome"));
const ShopProduct = lazy(() => import("./features/shop/ShopProduct"));

function App() {
  return (
    // Diseño de temporada (Fase 25): en el inicio de sesión, el sistema y NexStore
    <SeasonProvider>
    <Routes>
      <Route path="/" element={<Login />} />

      {/* Tienda en línea (Fase 24): pública, sin iniciar sesión */}
      <Route
        path="/tienda"
        element={
          <Suspense fallback={null}>
            <ShopLayout />
          </Suspense>
        }
      >
        <Route index element={<ShopHome />} />
        <Route path="producto/:id" element={<ShopProduct />} />
      </Route>

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
            {/* Fase 18: la caja cobra o rechaza los pedidos que envían los vendedores */}
            <Route path="/ventas/pedidos" element={<OrdersQueuePage />} />
          </Route>

          {/* Fase 18: el vendedor arma el pedido en la tablet y lo envía a caja */}
          <Route element={<PermissionRoute permission="sale-orders.create" />}>
            <Route path="/ventas/pedido" element={<OrderPage />} />
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
          {/* Centro de informes (Fase 23): con el permiso de algún informe; cada informe revisa el suyo en el servidor */}
          <Route element={<PermissionRoute permission={REPORT_PERMISSIONS} />}>
            <Route path="/informes" element={<ReportCatalogPage />} />
            <Route path="/informes/:type" element={<ReportPage />} />
          </Route>
          {/* Las pantallas de Informes de la Fase 14 pasaron al centro: sus direcciones llevan a las nuevas */}
          <Route path="/informes/inventario" element={<Navigate to="/informes/inventory" replace />} />
          <Route path="/informes/compras" element={<Navigate to="/informes/purchases" replace />} />
          <Route path="/informes/caja" element={<Navigate to="/informes/cash" replace />} />
          <Route path="/informes/gastos" element={<Navigate to="/informes/expenses" replace />} />
          <Route path="/informes/comparativo" element={<Navigate to="/informes/comparison?periodo=12-meses&agrupar=month" replace />} />
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
    </SeasonProvider>
  );
}

export default App;
