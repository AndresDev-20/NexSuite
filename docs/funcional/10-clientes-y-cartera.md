# Clientes y cartera

> Documento funcional · Módulo 8 del mapa de la alineación · 2026-10-28
> Describe lo que **está implementado hoy**. Lo planeado se indica como tal.
> Complementa `01-roles-acceso-y-costos.md` (acceso a sucursales), `11-ventas-y-comprobantes.md` (ventas fiadas) y `13-cierre-de-caja.md` (el efectivo de los abonos en la caja).
> **Estado:** el servidor de clientes (9.1) y de cartera (10.4) está verificado; las pantallas de clientes y de cartera están **por verificar** por el desarrollador.

---

## 1. Nombre del módulo

**Clientes y cartera** (menú *Ventas → Clientes* y *Ventas → Cartera*). Tiene dos piezas:

- **Clientes:** a quién se le vende. Son **de todo el negocio**: se ven y se atienden en cualquier sucursal. Cada cliente puede tener **cupo de crédito** y **plazo**.
- **Cartera:** lo que deben los clientes. Una deuda es una **venta fiada** con saldo o un **saldo inicial** (deuda de antes del sistema). Los clientes la pagan con **abonos**.

```
Lo que debe un cliente = (lo fiado en sus ventas − lo abonado − lo rebajado por devoluciones) + (sus saldos iniciales vigentes − lo abonado)
Cupo disponible        = cupo − lo que debe
```

## 2. Objetivo

- Saber a quién se le fía, cuánto (cupo) y a cuántos días (plazo), y que nadie pase su cupo.
- Saber en todo momento quién debe, cuánto, qué está vencido y qué vence pronto.
- Registrar cada abono, a qué deuda se aplicó y quién lo recibió; y que el abono en efectivo quede en la caja.
- Pasar al sistema las deudas del cuaderno (saldos iniciales) para que cuenten en el cupo.

Decisiones de negocio (`PROGRESS.md`, «Decisiones de negocio tomadas»):
- 2026-10-24 (Fase 9): se fía **con cupo y plazo** por cliente; sin cupo, solo de contado; el cupo lo asigna quien tenga «Asignar cupo de crédito»; los abonos en efectivo entran a la caja; otros medios no la tocan; las deudas anteriores se cargan como **saldo inicial**.
- 2026-10-27 (10.4): el abono va **a la cuenta** y se aplica **a la deuda que vence primero**; un abono **se anula con motivo**, no se borra.
- 2026-10-27 (caja compartida): el abono en efectivo entra a la **caja abierta que se elija** de la sucursal.

## 3. Usuarios y roles

| Perfil | Qué hace en Clientes y cartera |
|---|---|
| Developer / Administrador | Todo: crear, editar, eliminar clientes, asignar cupo, ver la cartera, recibir y anular abonos, cargar y anular saldos iniciales |
| Gerente de sucursal (plantilla) | Ve la cartera y recibe abonos (`receivables.read`, `receivables.pay`). **No** tiene ningún permiso de clientes (`customers.*`) |
| Cajero / vendedor (plantilla) | Recibe abonos (`receivables.pay`, que también deja ver la cartera). **No** tiene permisos de clientes |
| Inventario (plantilla) | No tiene el módulo |
| Otro rol | Según los permisos que Carlos le dé (sección 4) |

Las plantillas no traen `customers.read` (migración `20261107000000-profile-templates` y las de la Fase 9 y 10.4, que no se las agregan). Ver sección 13.

## 4. Permisos

| Permiso | Código | Qué permite |
|---|---|---|
| Ver clientes | `customers.read` | Lista y ficha de los clientes, con su cupo. También lo usa *Vender* para elegir el cliente |
| Crear clientes | `customers.create` | Registrar clientes nuevos (sin cupo, salvo que tenga también el permiso de cupo) |
| Editar clientes | `customers.update` | Cambiar los datos, activar y desactivar |
| Eliminar clientes | `customers.delete` | Quitar clientes que nunca se usaron |
| Asignar cupo de crédito | `customers.credit` | Enviar el **cupo** y el **plazo** al crear o editar. Sin él, mandar cualquiera de los dos responde 403 |
| Consultar cartera | `receivables.read` | Ver quién debe, los totales y el estado de cuenta de cada cliente |
| Registrar abonos de clientes | `receivables.pay` | Recibir abonos. **Incluye ver la cartera** (las rutas de consulta aceptan cualquiera de los dos) |
| Anular abonos y cargar saldos iniciales | `receivables.manage` | Anular un abono con motivo; cargar y anular saldos iniciales |

**Permisos de apoyo** (no son de este módulo): `sales.create` o `receivables.pay` para `GET /sales/registers` (las cajas abiertas donde entra el efectivo del abono).

**Qué puede hacer cada perfil**

| Acción | Developer / Administrador | Gerente de sucursal | Cajero / vendedor | Inventario |
|---|---|---|---|---|
| Ver, crear y editar clientes | Sí | No | No | No |
| Asignar cupo y plazo | Sí | No | No | No |
| Eliminar un cliente sin historia | Sí | No | No | No |
| Ver la cartera y el estado de cuenta | Sí | Sí | Sí (por `receivables.pay`) | No |
| Registrar un abono | Sí | Sí | Sí | No |
| Anular un abono | Sí | No | No | No |
| Cargar o anular un saldo inicial | Sí | No | No | No |

## 5. Interfaz

**Clientes** (`/ventas/clientes`, con `customers.read`)
- Buscador «Buscar por nombre, documento o teléfono»; filtros **Filtrar por estado** (Activos e inactivos) y **Filtrar por crédito** («Con cupo de crédito»).
- Botones según permiso: crear, editar, activar / desactivar («Su historia se conserva. Puedes activarlo de nuevo cuando quieras.»), eliminar y **Estado de cuenta** (con `receivables.read` o `receivables.pay`; por ahí se le carga el saldo inicial a quien aún no debe).
- Mensajes: «Aún no hay clientes» («Registra el primero: basta el nombre para atenderlo.»), «Sin resultados» y «No pudimos cargar los clientes».
- **Formulario:**
  - solo **Nombre o razón social** es obligatorio;
  - **Teléfono**, **Tipo de documento** (CC, NIT, CE, Pasaporte; «Opcional: para atender rápido basta el nombre.»), número (en NIT, «NIT (sin dígito de verificación)» y el **DV** calculado en vivo), **Correo**, **Ciudad**, **Dirección** y **Notas**;
  - **Cupo de crédito** («Lo máximo que puede deber. Para fiarle necesita documento y teléfono.») y **Plazo (días)**: solo editables con «Asignar cupo de crédito». Sin el permiso se ven como texto («Solo de contado.») y no se envían.

**Cartera** (`/ventas/cartera`, con `receivables.read` o `receivables.pay`)
- Tarjetas **Por cobrar**, **Vencido** y **Vence en 7 días** («Incluye lo que vence hoy»).
- Buscador «Nombre, documento o teléfono» y filtro **Estado** («Todos los que deben», «Con deuda vencida», «Al día»). Tocar la tarjeta Vencido aplica el filtro «Con deuda vencida».
- Lista «Clientes que deben»: los que tienen algo vencido primero, luego por el **Próximo vencimiento**. Paginada.
- Mensajes: «Nadie te debe» (con la explicación de cómo cargar una deuda de antes), «Sin resultados» y «No pudimos cargar la cartera».

**Estado de cuenta** (ventana desde Cartera o desde Clientes)
- Lo que debe, lo vencido y el **cupo que le queda** (o «Sin cupo de crédito»).
- **Deudas abiertas** (la que vence primero, primero), **abonos** (medio, quién lo recibió, cómo se repartió; los anulados con su motivo) y **saldos iniciales** (también pagados y anulados). Muestra los últimos 100 abonos.
- Botones según permiso: **Registrar abono**, **Anular abono**, **Cargar saldo inicial**, **Anular saldo inicial**.

**Registrar abono**
- **Valor del abono**, **Medio de pago** (efectivo, transferencia, Nequi, Daviplata, tarjeta), **Referencia** y **Notas**.
- Vista previa de cómo se reparte (la deuda que vence primero, primero).
- En efectivo pide la **Caja** («El efectivo entra a esta caja.»): las cajas abiertas de sus sucursales; propone la recordada en el equipo, el turno propio o la única abierta. Sin cajas abiertas: «No hay cajas abiertas en tus sucursales: para recibir efectivo, alguien debe abrir el turno de una caja.»

**Anular abono:** pide el **Motivo** (mínimo 3 letras) y, si fue en efectivo, la **Caja** de donde sale el dinero («El dinero que se devuelve sale de esta caja.»).

**Cargar saldo inicial:** **Valor**, **Fecha de la deuda** (no futura), **Vence** (por defecto la fecha más el plazo del cliente, o 30 días si no tiene) y **Notas** («Ej: saldo del cuaderno a octubre»).

## 6. Flujo de trabajo

**Registrar un cliente y darle cupo** (Administrador)
1. Ventas → Clientes → crear. Escribir al menos el nombre.
2. Para fiarle: documento, teléfono, **cupo** y **plazo** (mínimo 1 día).
3. Guardar. Desde ese momento, en *Vender* aparece «Crédito (fiado)» como medio de pago para ese cliente (ver `11-ventas-y-comprobantes.md`).

**Pasar las deudas del cuaderno**
1. Clientes → **Estado de cuenta** del cliente → **Cargar saldo inicial**.
2. Valor, fecha de la deuda y vencimiento. Guardar: «Saldo inicial cargado.»
3. El saldo cuenta para su cupo como cualquier deuda.

**Recibir un abono** (cualquiera con «Registrar abonos de clientes»)
1. Ventas → Cartera → el cliente → **Registrar abono**.
2. Valor y medio. Si es efectivo, elegir la caja abierta donde entra.
3. Confirmar: «Abono registrado. *Cliente* debe ahora $….» El abono se reparte solo: primero la deuda que vence primero.
4. En efectivo, la caja recibe un ingreso «Abono #N de *cliente*».

**Corregir un abono mal registrado** (Administrador)
1. Estado de cuenta → **Anular abono** → motivo (y caja, si fue en efectivo).
2. Lo abonado vuelve a las deudas; en efectivo sale de la caja elegida como retiro «Anulación del abono #N de *cliente*».

## 7. Reglas de negocio

**Clientes**
1. **Documento opcional.** Si se registra, tipo y número van juntos y **no se repiten** (el mismo número con otro tipo sí). Se guarda sin puntos, guiones ni espacios y en mayúscula.
2. **Formato por tipo:** CC de 5 a 10 dígitos; NIT de 5 a 15 dígitos (sin el DV); CE de 3 a 15 letras o números; Pasaporte de 5 a 20 letras o números.
3. **NIT:** el servidor calcula el dígito de verificación; si llega uno distinto, 400.
4. **Cupo:** de 0 en adelante (0 = solo contado). Con cupo mayor que 0 el cliente necesita **documento, teléfono y plazo de 1 a 365 días**. Tampoco se le puede quitar el documento o el teléfono a quien ya tiene cupo.
5. **Cupo y plazo** solo con «Asignar cupo de crédito»; sin él, enviarlos responde 403 (aunque se cree o edite lo demás).
6. Un cliente **inactivo** no recibe ventas (409 «… está inactivo: actívalo para venderle.»).
7. **Eliminar:** el servicio intenta borrarlo; si ya tiene ventas, abonos o saldos, la base de datos lo impide (sección 11). Lo esperado es **desactivarlo**.
8. La lista trae hasta 500 clientes, por nombre.

**Cartera**
9. **Deudas:** ventas **completadas** con saldo fiado (fiado − abonado − rebajado por devoluciones de garantía) y **saldos iniciales vigentes** con saldo. Una venta anulada no es deuda.
10. **Vencida:** la fecha de vencimiento ya pasó (hora de Colombia). «Vence en 7 días» incluye hoy.
11. **Reparto del abono:** primero la deuda que vence primero; si vencen el mismo día, la más vieja; si son del mismo día, el saldo inicial antes que la venta. Cada aplicación queda guardada.
12. **Nunca más de lo que debe:** un abono mayor que la deuda responde 400; a quien no debe nada, 409.
13. **Medios del abono:** efectivo, transferencia, Nequi, Daviplata y tarjeta (un abono no se «fía»). Valor mayor que 0, máximo 2 decimales.
14. **Efectivo:** exige una **caja con turno abierto** (la elegida, de una sucursal del usuario, o su turno propio). Entra como **ingreso** del turno. Los demás medios no tocan la caja.
15. **Una sola vez:** cada abono lleva una clave (`idempotencykey`, de 8 a 64 letras, números o guiones). La misma clave enviada otra vez responde el abono ya registrado (200 «El abono #N ya estaba registrado.»).
16. **Anular un abono:** con motivo (3 a 255). No se anula dos veces. Si fue en efectivo, el dinero sale como **retiro** de la caja abierta elegida y **no puede dejarla en negativo**.
17. **Saldo inicial:** valor mayor que 0, fecha no futura, vencimiento no anterior a la fecha. Se **anula** con motivo solo si **no tiene abonos** (primero se anulan los abonos).
18. **Saldos iniciales cuentan para el cupo** al fiar.
19. **Nada se borra:** abonos y saldos se anulan y quedan con quién, cuándo y por qué.
20. La cartera es **de todo el negocio**: no se filtra por sucursal.

## 8. Relaciones con otros módulos

| Módulo | Relación |
|---|---|
| Ventas | Una venta con pago «crédito» crea la deuda, con vencimiento = día de la venta + plazo del cliente. El cupo se revisa al vender (ver `11-ventas-y-comprobantes.md`) |
| Anulaciones | Una venta fiada **con abonos no se anula**: primero se anulan los abonos (ver `12-anulaciones-y-garantias.md`) |
| Garantías | Devolver dinero de una venta fiada **primero rebaja lo que debe** de esa venta (`sales.creditrefunded`) |
| Caja | El abono en efectivo es un ingreso del turno; su anulación, un retiro (ver `13-cierre-de-caja.md`) |
| Pagos por medio | Los abonos por tarjeta, Nequi, Daviplata y transferencia salen allí (sin sucursal ni caja) |
| Reportes y balance | «Abonos de cartera» aparte, por medio de pago; el balance trae «Nos deben (a hoy)» |
| Inicio | Tarjeta y panel de cartera por cobrar con lo vencido |
| Sucursales | Una sucursal con ventas fiadas con saldo **no se desactiva** (A9) |
| Auditoría | Áreas de cliente: `customer.*`, `customer.payment`, `customer.payment_cancel`, `customer.opening_balance`, `customer.opening_balance_cancel` |

## 9. Efectos sobre los datos

- Migración `20261109000000-create-customers`: tabla **`customers`** (tipo y número de documento con índice único, DV, nombre, teléfono, correo, dirección, ciudad, notas, `creditlimit`, `creditdays`, `isactive`) y los 5 permisos `customers.*`.
- Migración `20261112000000-create-receivables`: tablas y permisos de cartera:
  - **`customerbalances`:** saldos iniciales (valor, abonado, fecha, vencimiento, notas, estado `vigente` / `anulado`, quién lo cargó y quién lo anuló con motivo);
  - **`customerpayments`:** abonos (valor, medio, referencia, notas, turno de caja si fue en efectivo, quién lo recibió, clave única, estado `vigente` / `anulado` y anulación);
  - **`customerpaymentapplications`:** cómo se repartió cada abono (venta o saldo inicial y cuánto).
- **`sales.creditpaid`** sube con cada abono aplicado a una venta y baja si el abono se anula; **`customerbalances.paid`**, igual.
- **`cashmovements`:** ingreso «Abono #N de *cliente*» y, al anular, retiro «Anulación del abono #N de *cliente*».
- **`auditlogs`:** `customer.create`, `.update`, `.activate`, `.deactivate`, `.delete`; `customer.payment` (reparto y lo que queda debiendo), `customer.payment_cancel`, `customer.opening_balance` y `customer.opening_balance_cancel`.

## 10. Seguridad

**Permisos en el servidor**
- El cupo lo decide el permiso del **rol guardado** (`customers.credit`), no lo que envía el navegador.
- Las rutas de cartera exigen su permiso; la caja elegida para el efectivo debe ser de una sucursal del usuario (403 si no).

**Operaciones simultáneas**
- **Abono:** dentro de la transacción se bloquean el turno de la caja (si es efectivo), el cliente y **sus deudas**. Dos abonos a la vez esperan su turno y el segundo ve lo que dejó el primero: nunca pasan de lo que debe.
- **Misma clave a la vez:** el índice único deja pasar uno; el otro responde el abono ya registrado.
- **Anular:** bloquea turno, cliente, abono y deudas; revisa con el turno bloqueado que la caja tenga el efectivo. Dos anulaciones a la vez: la segunda responde «El abono ya está anulado.»
- **Interbloqueos:** abonar y anular se repiten hasta 3 veces si MySQL los cancela (`withDeadlockRetry`).
- **Orden de bloqueo:** turno → cliente → abono → deudas (la venta usa turno → … → cliente), para no cruzarse.

## 11. Casos de error

| Situación | Respuesta del servidor |
|---|---|
| Sin sesión | 401 "No se proporcionó un token de autenticación." |
| Sin el permiso de la ruta | 403 "No tienes permiso para realizar esta acción." |
| Enviar cupo o plazo sin «Asignar cupo de crédito» | 403 "No tienes permiso para asignar cupo de crédito." |
| El cliente no existe | 404 "El cliente no existe." |
| Documento repetido | 409 "Ya existe un cliente con CC 1234567: *Nombre*." |
| Tipo sin número (o al revés) | 400 "Documento: envía juntos el tipo y el número (o ninguno)." |
| Número con formato errado | 400 "Número de documento: de 5 a 10 dígitos." (según el tipo) |
| DV del NIT errado | 400 "Dígito de verificación: no corresponde al NIT." |
| Cupo sin documento o teléfono | 400 "Para darle cupo de crédito el cliente necesita documento y teléfono." |
| Cupo sin plazo | 400 "Plazo en días: obligatorio (mínimo 1) cuando el cliente tiene cupo." |
| Eliminar un cliente con ventas, abonos o saldos | 409 "Este cliente ya tiene historia: desactívalo en lugar de eliminarlo." |
| Abonar a quien no debe | 409 "*Cliente* no debe nada." |
| Abono mayor que la deuda | 400 "El abono supera lo que debe *Cliente*: $…." |
| Valor 0 | 400 "Valor del abono: debe ser mayor que 0." |
| Abono en efectivo sin caja ni turno propio | 409 "Para recibir un abono en efectivo, elige una caja con turno abierto de tu sucursal o abre tu turno." |
| Caja elegida que no existe | 404 "La caja elegida no existe." |
| Caja de otra sucursal | 403 "No tienes acceso a esa sucursal." |
| Caja que ya no está abierta | 409 "Esa caja ya no tiene el turno abierto: elige otra o ábrela de nuevo." |
| La caja se cerró mientras se registraba | 409 "El turno de esa caja se cerró mientras tanto: elige otra caja o ábrela de nuevo." |
| Clave usada por otro usuario o cliente | 409 "Esa clave de abono ya se usó en otro abono." |
| El abono no existe | 404 "El abono no existe." |
| Anular dos veces | 409 "El abono ya está anulado." |
| Anular en efectivo sin caja | 409 "El abono fue en efectivo: elige la caja abierta de donde sale el dinero que se devuelve, o abre tu turno." |
| La caja no tiene con qué devolverlo | 409 "No hay tanto efectivo en tu caja para devolver el abono: debería haber $…." (sin «Ver turnos»: sin el monto) |
| Motivo corto | 400 "Motivo: mínimo 3 caracteres." |
| Saldo inicial con fecha futura | 400 "Fecha de la deuda: no puede ser una fecha futura." |
| Vence antes de la fecha | 400 "Vence: no puede ser anterior a la fecha de la deuda." |
| El saldo inicial no existe | 404 "El saldo inicial no existe." |
| Anular un saldo ya anulado | 409 "El saldo inicial ya está anulado." |
| Anular un saldo con abonos | 409 "El saldo inicial tiene abonos por $…: anula primero esos abonos." |
| Estado distinto de vencida / al-dia | 400 "Estado: debe ser vencida, al-dia." |

En pantalla: «Escribe el nombre (mínimo 2 letras).», «Para darle cupo necesita teléfono.», «Para darle cupo necesita documento.», «Escribe un cupo válido.», «Escribe un valor mayor que 0.», «Elige la caja.», «Escribe el motivo (mínimo 3 letras).», «No puede ser futura.» y «No puede ser antes de la fecha de la deuda.»

## 12. Pruebas

**Automáticas** (base aislada `db_nextsuite_test`; `PROGRESS.md` registra 455 pruebas en la última corrida completa, la de la 17.3; este documento no volvió a correrlas):

- `tests/customers.test.js` (**11** pruebas, contadas por `it(`):
  - *registro (5):* se crea solo con nombre; documento único (otro tipo sí); DV del NIT; formato por tipo y limpieza de puntos y espacios; lista con búsqueda y filtros;
  - *cupo (3):* exige documento, teléfono y plazo; no se le quita el documento ni el teléfono a quien tiene cupo; sin «Asignar cupo» → 403;
  - *estado, permisos y auditoría (3):* sin historia se elimina y activar/desactivar quedan en la auditoría; cada acción exige su permiso; los roles del sistema tienen los 5 permisos.
- `tests/receivables.test.js` (**14** pruebas):
  - *abonos (6):* reparto a la que vence primero y el efectivo entra al turno; sin turno no se recibe efectivo pero sí transferencia; no más de lo que debe ni a quien no debe; la misma clave una sola vez; **dos abonos a la vez** no pasan de la deuda; sin permiso 403;
  - *anular (3):* devuelve lo aplicado y saca el efectivo; no se anula si la caja no alcanza; sin permiso 403;
  - *saldos iniciales (3):* cuentan para el cupo; se anulan solo sin abonos; fechas y permiso;
  - *consultar (2):* lista (vencidos primero), filtros y totales; sin permisos 403.
- `tests/sharedCash.test.js`: «abono en efectivo en la caja de otro y su anulación salen de la caja elegida».
- `tests/sales.test.js`: «exige cliente (400) con cupo (409); fía hasta el cupo con su plazo…».
- `tests/businessDay.test.js` (paso 5 y 11): abono en efectivo y la cartera de $300.000 que cuadra con el reporte.
- `tests/profileTemplates.test.js`: permisos exactos de cartera en Gerente y Cajero / vendedor.
- No hay prueba automática de **eliminar un cliente con ventas** (hoy lo detiene la base de datos, sección 13).

**En pantalla:** `PROGRESS.md` dice que la 9.1 y la 10.4 se probaron en el navegador durante el desarrollo (base aislada), pero **no registra tu verificación**.

## 13. Limitaciones

- **Las plantillas no traen «Ver clientes».** El Gerente y el Cajero / vendedor no ven *Ventas → Clientes* y, en *Vender*, solo pueden vender a «consumidor final»: no pueden elegir cliente ni fiar hasta que Carlos les dé `customers.read`.
- **Eliminar un cliente con historia:** corregido en la 17.5: el servicio revisa ventas, saldos iniciales y abonos y responde «Este cliente ya tiene historia: desactívalo en lugar de eliminarlo.» (antes lo frenaba la llave foránea con un mensaje genérico).
- **La cartera no se filtra por sucursal:** quien la consulta ve las deudas de todo el negocio.
- El estado de cuenta muestra los **últimos 100 abonos**.
- **No hay intereses** ni cobro por mora; tampoco recordatorios a los clientes.
- **No se edita** un abono ni un saldo inicial: se anula y se registra de nuevo.
- No existe **exportar** la cartera (el balance mensual sí trae «Nos deben»).

## 14. Estado final

| Parte | Implementado | Probado | Aprobado por el desarrollador |
|---|---|---|---|
| 9.1 Clientes en el servidor (documento, DV, cupo y plazo con permiso, auditoría) | Sí | Sí (11 automáticas) | **Sí** (verificado) |
| 9.1 Pantalla Ventas → Clientes | Sí | En el navegador durante el desarrollo | **No** (entregado, sin verificar) |
| 10.4 Cartera en el servidor (abonos repartidos, efectivo a la caja, anulaciones, saldos iniciales) | Sí | Sí (14 automáticas) | **Sí** (verificado) |
| 10.4 Pantalla Ventas → Cartera y estado de cuenta | Sí | En el navegador durante el desarrollo | **No** (pendiente de verificar) |
| Caja compartida para abonos en efectivo (elegir la caja) | Sí | Sí (`sharedCash.test.js`) | **No** (pendiente de verificar) |
