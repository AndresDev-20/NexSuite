# Fase 40 · Medios de pago que crea el administrador

Pedido del 2026-11-23: que el administrador pueda crear sus propios medios de pago (por ejemplo
«Bancolombia») y que aparezcan al vender.

## Decisiones (2026-11-23)

| Pregunta | Decisión |
|---|---|
| ¿Dónde aparecen? | En ventas (POS y cobro de pedidos), abonos de crédito y abonos de apartados. Gastos no. |
| ¿Qué tipos se pueden crear? | Transferencia o tarjeta. Las financieras (Sistecrédito, Addi, Alocrédito) siguen siendo las del sistema. |
| ¿Se pueden ocultar los del sistema? | Sí: Transferencia, Nequi, Daviplata, Tarjeta, Sistecrédito, Addi y Alocrédito se pueden desactivar. Efectivo y Crédito siempre están. |
| ¿Por sucursal? | No: los mismos medios para toda la empresa. |

## Cómo funciona

- Un medio creado (transferencia o tarjeta) se comporta igual que Nequi: **no entra a la caja**.
  En el cuadre y la tirilla cuenta como «medios electrónicos», y en Pagos sale para conciliar.
- En el recibo, la tirilla, Turnos, Pagos y los reportes sale con su nombre («Bancolombia (3)»),
  separado de los demás.
- No se borran: se **desactivan**. Así las ventas viejas siguen mostrando su nombre. Uno desactivado
  ya no aparece para cobrar, pero vuelve a aparecer si se activa.
- El nombre se puede cambiar. Las ventas viejas muestran el nombre nuevo, porque guardan el medio,
  no el texto.

## Servidor

- Tabla nueva `paymentmethods`: código, nombre, tipo (transferencia, tarjeta o financiado),
  si es del sistema, si está activo, orden y quién lo cambió.
  - Se llena con los 7 del sistema.
  - Los creados llevan el código `m<id>`.
- `salepayments.method`, `customerpayments.method` y `layawaypayments.method` pasan de lista fija
  (ENUM) a texto (VARCHAR 30). Los datos que ya existen no cambian.
- Permiso nuevo **«Configurar medios de pago»** (`payment-methods.manage`). Lo reciben los roles que
  ya tienen «Configurar el negocio».
- Rutas:
  - `GET /payment-methods`: los activos, para cobrar (cualquiera con sesión). Con `?all=1`, también
    los inactivos (solo con el permiso).
  - `POST /payment-methods`: crea uno. Pide nombre y tipo.
  - `PUT /payment-methods/:id`: cambia el nombre, el tipo (solo en los creados) y si está activo.
  - No hay borrar.
- Validación en el servidor, sin confiar en la pantalla:
  - Al cobrar, solo se aceptan Efectivo, Crédito (solo en ventas) y los medios activos.
  - Las financieras solo se aceptan en ventas.
- Todo cambio queda en la auditoría.

## Pantallas

- **Configuración → Medios de pago**: la lista con interruptor de activo, «Nuevo medio» (nombre y
  tipo) y editar el nombre.
- POS, cobrar pedido, abono de crédito, abono de apartado y el filtro de Pagos toman la lista del
  servidor. Los nombres salen bien en todo el sistema.
