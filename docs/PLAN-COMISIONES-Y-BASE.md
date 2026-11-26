# Fase 56: filtros por vendedor y cliente, comisiones, cambio de vendedor y billetes de la base (definición)

Pedido del 2026-11-26, antes de seguir con el chatbot. Son cuatro partes.

Decisiones del 2026-11-26 (las ❓ de abajo quedan resueltas así):
- **Comisión:** cada regla dice si es **valor fijo o porcentaje**. Se aplica solo la del mayor «Desde», sobre el
  `total` de la venta (sin el recargo de la financiera).
- **Anulación y devolución:** la anulación anula la comisión; la devolución la recalcula sobre lo que quedó. Si ya
  estaba pagada, ajuste negativo. **Las fiadas comisionan el día de la venta.**
- **Pagos:** se registran («Pagar comisiones»), con comprobante; no sacan dinero de la caja solos.
- **Base:** se dejan primero **monedas y billetes pequeños**; si no da exacto, lo más cerca por debajo y se avisa
  cuánto falta.

## Lo que ya hay

- `GET /sales` ya acepta `iduser` (vendedor) e `idcustomer` (cliente). Quien no tiene «Ver todas las ventas»
  (`sales.read-all`) solo ve las suyas (las que vendió o registró) y el servidor ignora el `iduser` que mande.
- La venta guarda `iduser` (vendedor) y `registeredby` (quien la registró). El `total` ya no trae el recargo de las
  financieras (`sales.surcharge`, Fase 54). `returnedtotal` guarda lo devuelto (Fase 46).
- El usuario tiene la cédula en `users.cc`; el cliente, en `customers.document`.
- Cada caja tiene su base en `cashregisters.openingbase` (por defecto $550.000). Al contar, el servidor ya calcula
  `keptamount` = mín(lo contado, la base) y `handoveramount` = el resto.
- El conteo por billetes y monedas (Fase 38) se guarda en `cashsessions.countdenominations`. Valores:
  $100.000, $50.000, $20.000, $10.000, $5.000, $2.000 (billetes) y $1.000, $500, $200, $100, $50 (monedas).

---

## 1. Filtros por vendedor y por cliente en Ventas

En **Ventas → Ventas**, debajo de los filtros de fecha, dos buscadores uno al lado del otro (en celular, uno debajo
del otro):

- **Vendedor:** se escribe el nombre o la cédula, salen hasta 8 coincidencias y al elegir uno la lista muestra solo
  sus ventas. Una «×» lo quita.
  - Solo sale para quien tiene «Ver todas las ventas». Quien ve solo las suyas no lo ve, y el servidor ya ignora el
    filtro (no hay cambio de seguridad que hacer ahí, solo una prueba que lo confirme).
- **Cliente:** igual, por nombre o documento. Muestra todas las ventas a ese cliente, dentro de lo que la persona puede
  ver (quien ve solo las suyas ve solo las suyas a ese cliente).
- Los dos se combinan con las fechas y la búsqueda. Quedan en la dirección (`#/ventas/historial?vendedor=…&cliente=…`)
  para poder volver.

**Servidor:**
- `GET /sales/sellers?search=` (con «Ver todas las ventas»): vendedores de las sucursales de quien busca, por nombre o
  cédula. Así no hace falta el permiso de usuarios.
- `GET /sales/customers?search=` (con «Ver ventas»): clientes por nombre o documento. Así un vendedor sin «Ver
  clientes» también puede filtrar.

## 2. Comisiones por vendedor

### Reglas (las configura quien tiene «Configurar comisiones»)

Pantalla **Ventas → Comisiones → Reglas**. Cada regla:
- **Desde** (valor mínimo de la venta), por ejemplo $500.000 y $1.000.000;
- **Comisión**: ❓ valor fijo o % (ver preguntas);
- sucursal (todas o una) y activa / inactiva.

Si una venta cumple varias reglas, **se aplica solo la del mayor «Desde»**, no se suman. Ejemplo: con reglas de
$500.000 → $10.000 y $1.000.000 → $25.000, una venta de $1.200.000 da $25.000.

Cambiar una regla **no cambia** las comisiones ya calculadas; vale para las ventas nuevas. Queda en la auditoría.

### Cálculo

- Al registrar la venta se busca la regla y, si hay, se crea la comisión del vendedor (`iduser`, no quien la
  registró) con: venta, valor sobre el que se calculó, regla usada y valor.
- ❓ **Sobre qué valor:** propongo el `total` de la venta (sin el recargo de la financiera).
- **Anulación y devolución:** al anular la venta la comisión se anula; con una devolución se recalcula sobre lo que
  quedó (total − devuelto) con la regla de la venta. Si quedó por debajo de su «Desde», con la regla que hoy
  corresponda a ese valor, sin pasar de la comisión original (puede quedar en cero).
- ❓ **Fiadas:** cuenta cuando se vende o cuando se termina de pagar.
- **Si la comisión ya estaba pagada** y la venta se anula o se devuelve, no se toca lo pagado: se crea un **ajuste
  negativo** que se descuenta en el siguiente pago de ese vendedor.

### Ver y pagar

Pantalla **Ventas → Comisiones**:
- Filtros: periodo (los mismos botones de fecha de Ventas), sucursal, vendedor y estado (pendiente / pagada).
- Arriba, una tarjeta por vendedor: ventas con comisión, total pendiente y total pagado en el periodo.
- Al abrir un vendedor: cada venta con su número, fecha, valor, regla y comisión; ajustes en rojo.
- **«Pagar comisiones»** (con «Pagar comisiones»): marca como pagadas las pendientes del vendedor en el periodo, con
  la fecha y quien pagó, y saca el comprobante. ❓ Si prefieres no registrar pagos (solo ver lo acumulado), lo quito.
  - Propongo que el pago **no** sea un retiro de caja automático; si lo pagan de la caja, lo registran como hoy.

### Comprobantes (tirilla y carta)

- **Estado de comisiones** de un vendedor en un periodo: ventas, comisión de cada una, ajustes, total, pagado y
  pendiente.
- **Comprobante de pago de comisiones**: lo pagado, a quién, quién pagó y firmas. Se imprime justo después de pagar.

### Permisos nuevos

| Permiso | Quién lo tiene al crearlo |
|---|---|
| `commissions.configure` · Configurar comisiones | Administrador, Developer |
| `commissions.read-all` · Ver comisiones de todos | Administrador, Developer, Gerente de sucursal |
| `commissions.read` · Ver mis comisiones | Todos los roles que venden (Vendedor, Cajero, Gerente) |
| `commissions.pay` · Pagar comisiones | Administrador, Developer |

Quien solo tiene «Ver mis comisiones» ve únicamente las suyas: el servidor ignora el vendedor que mande.

## 3. Cambiar el vendedor de una venta

- Permiso nuevo **`sales.change-seller` · Cambiar el vendedor de una venta**: solo Administrador y Developer.
  Vendedores y cajeros no lo tienen; el servidor lo exige (403 sin él).
- `PUT /sales/:id/seller` con `{ iduser, reason }`: el motivo es obligatorio (mínimo 5 letras). El nuevo vendedor
  tiene que estar activo y pertenecer a la sucursal de la venta. No aplica a ventas anuladas.
- La comisión **pasa al vendedor correcto** con el mismo valor (la regla es de la sucursal de la venta, no del
  vendedor): si estaba pendiente, se anula la del anterior y se crea la del nuevo; si ya estaba pagada, el anterior
  recibe un ajuste negativo y el nuevo una comisión pendiente.
- Queda en la auditoría (`sale.change-seller`: antes, después, motivo y quién).
- **En el detalle de la venta**: botón «Cambiar vendedor» (solo con el permiso) y una nota «Vendedor cambiado el
  26/11/2026 por Ana: de Pedro a Juan — motivo». Se lee de la auditoría, sin columnas nuevas en `sales`.
- La tirilla y la carta de la venta salen con el vendedor actual.

## 4. Caja: qué billetes dejar para la base

Al contar por billetes y monedas, **ahí mismo** sale una tabla de dos columnas por cada valor: **«Dejar en la caja»**
y **«Entregar»**, con el total de cada una. Lo que se deja suma la base de esa caja.

- Se calcula con lo que se contó (no se puede dejar un billete que no hay). Busco una combinación que sume
  **exactamente** la base.
- ❓ **Qué billetes prefiere dejar:** propongo dejar primero monedas y billetes pequeños (para dar cambio) y entregar
  los grandes.
- ❓ **Si no alcanza o no da exacto:** propongo dejar lo más cerca por debajo de la base y avisar «Faltan $X para
  completar la base». Si lo contado es menos que la base, se deja todo y no se entrega nada (como hoy).
- Si se escribe el total a mano (sin contar por billetes), no se puede decir qué billetes dejar: sale «Cuenta por
  billetes y monedas para ver qué dejar».
- El servidor hace el mismo cálculo al cerrar y lo guarda (`cashsessions.keptdenominations`, JSON), para que la
  tirilla del cuadre muestre la sección **«DEJAR EN LA CAJA (BASE)»** y **«ENTREGAR»** billete por billete, y el
  detalle del turno también.
- El conteo a ciegas no cambia: mostrar qué dejar no dice cuánto debía haber.

---

## Servidor

**Migración `20261230000000-commissions-and-base`** (solo agrega, no cambia ni borra datos):
- tabla `commissionrules` (id, idbranch o vacío = todas, minamount, kind `fijo`/`porcentaje`, value, isactive,
  createdby, fechas);
- tabla `salecommissions` (id, idsale, iduser, idbranch, idrule, baseamount, amount, kind `comision`/`ajuste`,
  status `pendiente`/`pagada`/`anulada`, idpayout, fechas);
- tabla `commissionpayouts` (id, iduser, idbranch, from, to, amount, paidby, paidat, notes);
- columna `cashsessions.keptdenominations` (JSON, puede quedar vacía);
- los permisos nuevos y su asignación a los roles de la tabla.

La pruebo en la base aislada y **te pido permiso antes de aplicarla en desarrollo**.

**Pruebas en la base aislada (`db_nextsuite_test`):**
- filtros: por vendedor y cliente; quien ve solo las suyas no ve las de otro aunque mande `iduser`; buscadores;
- reglas: crear, editar, desactivar; 403 sin permiso; regla mayor gana; regla por sucursal;
- comisión al vender; sin regla, sin comisión; anular y devolver (pendiente y pagada → ajuste); fiadas según decidas;
- ver: propias vs todas; pagar; comprobantes en tirilla y carta;
- cambiar vendedor: 403 para vendedor y cajero; motivo obligatorio; vendedor de otra sucursal (400); la comisión
  cambia de dueño; auditoría; nota en el detalle;
- base: exacta, prefiriendo pequeños; no alcanza; total a mano; tirilla con la sección; reabrir conteo la borra.

## Pantallas

- Ventas: los dos buscadores; botón y nota de cambio de vendedor en el detalle.
- Comisiones: reglas, resumen por vendedor, detalle, pagar, imprimir.
- Caja: tabla «Dejar / Entregar» en la ventana de contar y en el detalle del turno.
- Diseño con las piezas que ya usa el sistema, animaciones suaves que se apagan con `prefers-reduced-motion`, y
  revisado en 1366×768 y en celular.

## Por partes

1. Plan y decisiones. **Aprobado (2026-11-26).**
2. Servidor, migración y pruebas en la base aislada. **Hecho (2026-11-26)**, `tests/commissions.test.js` (16
   pruebas). Migración aplicada en desarrollo el 2026-11-26 con tu permiso.
3. Pantallas y prueba en el navegador. **Hecho (2026-11-26)**; la migración se aplicó en desarrollo con tu permiso.
