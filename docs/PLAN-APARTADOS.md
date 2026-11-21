# Fase 30: apartados (separar un producto con abonos) — definición

Pedido del 2026-11-14: un cliente abona por un producto y **se le aparta**: no es venta todavía y **nadie más lo
puede vender** mientras termina de pagarlo. Cuando completa el pago, se le entrega y ahí sí queda como venta.

## En qué se diferencia de lo que ya existe

| | Fiado (venta a crédito, Fase 10/19) | Pedido a caja (Fase 18) | **Apartado (nuevo)** |
|---|---|---|---|
| ¿El cliente se lleva el producto? | **Sí**, hoy | Sí, al cobrar | **No**, hasta terminar de pagar |
| ¿Es venta? | Sí, desde el primer día | Sí, al cobrar | **Solo al entregar** |
| ¿El producto queda reservado? | No (ya salió) | 20 minutos | **Días o semanas**, hasta pagar o vencer |
| Pagos | Abonos a la deuda | Uno | **Abonos** hasta completar |

## Cómo funcionaría

1. **Apartar** (Ventas → Apartados → «Nuevo apartado», en la sucursal elegida):
   - Cliente **obligatorio** (nombre y teléfono, para avisarle).
   - Productos: sin serial por cantidad; con serial, **el IMEI exacto** (el cliente aparta *ese* equipo).
   - **El precio queda congelado** al apartar (si después sube, al cliente se le respeta el de ese día).
   - Primer abono (con la forma de pago: efectivo, Nequi, transferencia…) y la fecha límite.
   - Se imprime el **comprobante de apartado** (número `APT-<prefijo>-000001`, productos, total, abonado, saldo,
     fecha límite y condiciones).
2. **Mientras está apartado:**
   - Las unidades **siguen en las existencias de la sucursal** (están físicamente ahí), pero quedan **apartadas**:
     no salen en el punto de venta, ni en la tienda en línea como disponibles, ni se pueden trasladar, ajustar o
     contar como libres. Se ven con la etiqueta «Apartado para <cliente>».
   - **Abonos:** en cualquier caja abierta de la sucursal; cada abono entra a la caja (el efectivo cuadra en el
     cierre) y sale con su comprobante. Se ve el historial de abonos y el saldo.
3. **Completar:** cuando el saldo llega a 0, botón **«Entregar»**: se crea **la venta** (con el vendedor del
   apartado, el cliente, la garantía desde ese día) y las unidades salen de las existencias. **La venta y la
   ganancia cuentan el día de la entrega**; el dinero ya entró a la caja con cada abono (la venta queda pagada
   «con abonos del apartado», sin volver a cobrar).
4. **Vencer o cancelar:** si pasa la fecha límite sin completar, o el cliente desiste, el apartado se cierra, los
   productos **vuelven a estar disponibles** y con el dinero abonado pasa lo que decida el negocio (pregunta 1).

## Pantallas

- **Ventas → Apartados**: lista con filtros (vigentes, por vencer en 3 días, vencidos, entregados, cancelados),
  barra de progreso de lo pagado, saldo y días que faltan; ficha con productos, abonos y acciones (abonar, entregar,
  cancelar, reimprimir).
- En el **punto de venta**, un botón «Apartar» con el carrito armado (mismo buscador de productos).
- **Inicio / avisos**: apartados que vencen pronto, para llamar al cliente.
- En la ficha del cliente: sus apartados.

## Servidor

- Tablas `layaways` (apartado), `layawayitems` (productos, precio congelado, unidad con serial) y `layawaypayments`
  (abonos, ligados a la caja). Migraciones nuevas, probadas en la base aislada y aplicadas en desarrollo **con tu
  permiso**.
- Lo apartado se descuenta de lo disponible igual que hoy lo apartado por los pedidos a caja (la misma regla en
  ventas, traslados, ajustes y conteos), así nada se puede vender dos veces.
- Permisos nuevos: «Consultar apartados», «Crear apartados y abonar», «Cancelar apartados».
- Auditoría de cada paso; pruebas en la base aislada (apartar, abonar, entregar, vencer, cancelar, no vender lo
  apartado, cuadre de caja con abonos).

## Decisiones (2026-11-14)

1. **Si vence o el cliente desiste: se le devuelve todo lo abonado.**
   - Al **vencer**, el sistema cierra el apartado solo y **libera los productos**; el dinero queda **«por devolver»**
     hasta que el cliente venga. La devolución se registra en una caja abierta (sale de esa caja, con comprobante).
   - Si **cancela** antes de la fecha, se devuelve en ese momento desde la caja abierta.
   - En la lista hay un filtro **«Dinero por devolver»** para no olvidar ninguno.
2. **Sin abono mínimo:** se aparta con cualquier abono (desde $1).
3. **Plazo: 30 días por defecto**; al apartar se puede poner otra fecha, **hasta un máximo que se configura en Datos
   del negocio** (propuesta: 90 días). Se puede **ampliar** la fecha de un apartado vigente (queda en la auditoría).
4. **Entrega solo con el saldo en $0.** Si el cliente quiere llevárselo antes, lo que falta se puede pasar a **fiado**
   (venta a crédito normal, con su cupo y sus cuotas): se entrega y el saldo queda en la cartera.

## Hecho en el servidor (30.1)

- Migración `20261210000000-layaways`: tablas `layaways`, `layawayitems` y `layawaypayments`, `productunits.idlayaway`,
  el medio de pago «apartado» en `salepayments`, `businesssettings.layawaymaxdays` (90) y los permisos «Consultar
  apartados», «Crear apartados y recibir abonos» y «Cancelar apartados y devolver abonos» (roles del sistema).
- Número `APT-000001` (uno solo para todo el negocio, en orden).
- Rutas `/layaways`: listar (filtros vigente, por-vencer, por-devolver, entregado, vencido, cancelado, con sus
  conteos), ver, apartar, abonar, ampliar, **entregar** (exige además «Vender»), cancelar, devolver y el
  comprobante en PDF (tirilla y carta).
- Lo apartado se descuenta en ventas, pedidos a caja, traslados, ajustes, cambio de estado de unidades y en la tienda
  en línea; la caja (resumen de apartados) lo ve.
- Los abonos que no son en efectivo salen en **Pagos por medio** (las devoluciones en negativo).
- La venta de una entrega queda pagada «con apartado» (no vuelve a sumar efectivo) y **no se anula** (si el cliente
  devuelve el producto, Garantías).
- Reloj: al arrancar y cada hora vence los apartados cuya fecha límite pasó.

