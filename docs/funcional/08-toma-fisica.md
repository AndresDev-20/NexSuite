# Toma física (conteos de inventario)

> Documento funcional · Módulo 6 del mapa de la alineación · 2026-10-24
> Describe lo que **está implementado hoy**. Lo planeado se indica como tal.
> Complementa `01-roles-acceso-y-costos.md` (acceso a sucursales) y `02-interfaz-plantillas-e-inicio.md` (menú por permisos, plantillas e Inicio).

---

## 1. Nombre del módulo

**Toma física** (menú *Inventarios → Toma física*). Sirve para contar lo que hay de verdad en una sucursal y corregir el sistema con lo contado.

- Se cuenta **por partes**: toda una sucursal o **solo una categoría** de ella.
- Se cuenta **a ciegas**: la hoja de conteo no muestra cuánto debería haber.
- Un **encargado revisa** las diferencias y **aprueba**, **devuelve** para recontar o **anula**.

Cada conteo tiene un número `CF-000001` y pasa por estos estados:

```
en_conteo ──enviar──▶ en_revision ──aprobar──▶ aprobado (corrige las existencias)
    ▲                      │
    └──────devolver────────┘        en_conteo | en_revision ──anular──▶ anulado
```

## 2. Objetivo

- Que Carlos sepa si lo que dice el sistema es lo que hay en cada local, y que las diferencias se corrijan con un registro y no con ajustes sueltos.
- Que quien cuenta no se deje llevar por la cifra del sistema (conteo a ciegas).
- Que nadie corrija el inventario por su cuenta: las diferencias pasan por **revisión y aprobación**.
- Que los celulares que no aparecen queden **de baja** con su IMEI, y que los que aparecen de más se informen.

Decisión de negocio del 2026-10-24: conteos **por partes** (sucursal o categoría) con **revisión y aprobación** de las diferencias.

## 3. Usuarios y roles

| Perfil | Qué hace en Toma física |
|---|---|
| Developer / Administrador | Todo, en todas las sucursales: crear, contar, enviar, aprobar, devolver y anular |
| Gerente de sucursal (plantilla) | Ve los conteos de sus sucursales; **aprueba, devuelve o anula**. No crea ni cuenta |
| Inventario (plantilla) | Ve, **crea y cuenta** en sus sucursales y envía a revisión. **No aprueba** |
| Cajero / vendedor (plantilla) | No tiene el módulo |
| Otro rol | Según los permisos que Carlos le dé |

Así, con las plantillas, quien cuenta (Inventario) y quien aprueba (Gerente) son personas distintas. Ver `02-interfaz-plantillas-e-inicio.md`, sección 4.

## 4. Permisos

| Permiso | Código | Qué permite |
|---|---|---|
| Ver conteos | `stock-counts.read` | Lista y detalle de los conteos de sus sucursales |
| Contar | `stock-counts.create` | Crear un conteo, anotar lo contado (también a medias) y enviarlo a revisión |
| Aprobar conteos | `stock-counts.approve` | Aprobar (corrige existencias), devolver para recontar y anular (también un conteo que se está contando) |

No existe eliminar: un conteo se **anula** con motivo y se conserva.

**Permiso de apoyo:** `categories.read` llena la opción "Solo *categoría*" al crear un conteo. Sin él solo se puede contar toda la sucursal.

**Qué puede hacer cada perfil**

| Acción | Developer / Administrador | Gerente de sucursal | Inventario | Cajero / vendedor |
|---|---|---|---|---|
| Ver conteos | Todos | Sus sucursales | Sus sucursales | No |
| Crear un conteo | Sí | No | Sí | No |
| Anotar lo contado y guardar a medias | Sí | No | Sí | No |
| Enviar a revisión | Sí | No | Sí | No |
| Aprobar | Sí | Sí | No | No |
| Devolver para recontar | Sí | Sí | No | No |
| Anular | Sí | Sí | No | No |

## 5. Interfaz

**Menú:** *Inventarios → Toma física* (`/inventario/toma-fisica`), visible con `stock-counts.read`.

**Lista de conteos**
- Subtítulo: "Cuenta lo que hay en *sucursal activa* y un encargado aprueba las diferencias."
- Sigue la **sucursal activa** del encabezado.
- Filtro **Estado**: En conteo, En revisión, Aprobado, Anulado (queda en la dirección de la página).
- Columnas: **Conteo** (número y fecha), **Qué se cuenta** (sucursal y categoría o "Toda la sucursal"), **Avance** ("n de m contados" y "N diferencias"), **Estado**, **Creado por**.
- Acción por fila: **Contar** (en conteo) o **Ver** (los demás estados).
- Paginada de 25 en 25, los más recientes primero.

**Nuevo conteo** (con `stock-counts.create`)
- **Sucursal:** las del usuario; trae la activa.
- **Qué se cuenta:** "Toda la sucursal" o "Solo *categoría*" (categorías activas). Ayuda: "Puedes contar por partes: una categoría a la vez."
- **Notas** (opcional, hasta 500).
- Botón **Empezar conteo**. Al crear abre la hoja de conteo: "Conteo CF-… creado: N productos por contar."

**Hoja de conteo** (estado *en conteo*, con `stock-counts.create`) — a ciegas:
- Si fue devuelto, muestra "Devuelto para recontar: *nota*".
- **Lector general** ("Lector: código de barras, SKU o IMEI"): un código de barras o SKU suma **+1** a su producto; un IMEI se marca en su celular. Si no es del conteo: "… no es de este conteo. Si es un IMEI de más, escríbelo en su producto."
- Por producto: campo **Contado** (sin serial) o **IMEI escaneados** con su número y la opción de quitar cada uno (con serial).
- **Buscar producto** en la lista.
- Avance: "n de m contados · k sin guardar".
- Botones **Guardar** (guarda a medias) y **Enviar a revisión** (guarda lo pendiente y envía).
- Quien ve un conteo en curso sin poder contar ve "Este conteo está en curso (n de m contados)."
- Con `stock-counts.approve` aparece "Anular este conteo" también mientras se cuenta.

**Revisión** (estado *en revisión*) y consulta (*aprobado*, *anulado*):
- Resumen "N productos con diferencia de M" y casilla **Solo diferencias**.
- Tabla: **Producto**, **Había** (al empezar), **Contado**, **Diferencia** (+/−), **Hoy** (lo que hay ahora en el sistema).
- Por celular: "No aparecieron (quedarán de baja)" y "Aparecieron de más (solo se informan)".
- Con `stock-counts.approve`: **Anular**, **Devolver para recontar** y **Aprobar**.
  - *Aprobar* pide confirmación: "Las existencias se corrigen con las diferencias (contado − lo que había al empezar) y los IMEI que faltan quedan de baja. No se puede deshacer."
  - *Devolver* pide una nota opcional.
  - *Anular* pide un motivo obligatorio (mínimo 3 letras).
- Aprobado: "Aprobado por *persona* el *fecha*: las existencias quedaron corregidas." Anulado: "Anulado el *fecha*: *motivo*." Los dos en solo lectura.

**Inicio:** tarjeta "Conteos por aprobar" y panel "Toma física" (ver `02-interfaz-plantillas-e-inicio.md`).

## 6. Flujo de trabajo

**1. Crear el conteo** (Inventario)
1. Inventarios → Toma física → **Nuevo conteo**.
2. Elegir la sucursal y, si se quiere, una categoría.
3. **Empezar conteo.** El sistema guarda en ese momento lo que debería haber de cada producto y, en los celulares, sus IMEI disponibles.

**2. Contar** (Inventario)
1. Escanear o escribir lo que se encuentra. Los celulares se cuentan escaneando cada IMEI.
2. **Guardar** cuando se quiera: se puede seguir otro día.
3. Lo que no hay se anota en **0**.
4. **Enviar a revisión** cuando todo esté contado.

**3. Revisar** (Gerente o Administrador)
1. Abrir el conteo en revisión. Ver Había, Contado, Diferencia y Hoy, y los IMEI que faltan o sobran.
2. Elegir:
   - **Aprobar:** las existencias se corrigen y los IMEI que faltan quedan de baja.
   - **Devolver para recontar**, con una nota: vuelve a *en conteo* con lo ya anotado.
   - **Anular**, con motivo: no cambia nada del inventario y la sucursal queda libre para otro conteo.

**Mercancía que apareció y no estaba en la lista**
- El servidor la acepta al guardar: se agrega con "había 0".
- La pantalla **no** ofrece agregar un producto que no está en la hoja (ver Limitaciones). Un IMEI de más sí se escribe en su producto.

## 7. Reglas de negocio

1. **Un solo conteo abierto por sucursal** (en conteo o en revisión), aunque sea de una categoría. Para abrir otro, hay que terminar o anular el abierto.
2. **Qué entra al conteo:** los productos registrados en la sucursal (de la categoría, si se eligió) que están **activos o tienen existencias**. Un producto inactivo sin existencias no se cuenta. Si no hay ninguno: "Esta sucursal no tiene productos para contar."
3. **Foto inicial:** al crear se guarda *lo que había* (`expected`). En los productos con serial, *lo que había* es el número de unidades disponibles y su lista de IMEI.
4. **Contar:**
   - sin serial, por cantidad (0 a 1.000.000); enviar `null` borra lo anotado;
   - con serial, solo escaneando IMEI (máximo 5.000 por producto, sin repetidos); la cantidad contada es el número de IMEI distintos;
   - mandar cantidad a un producto con serial, o seriales a uno sin serial: 400;
   - en un conteo de categoría solo se aceptan productos de esa categoría;
   - hasta 1.000 productos por envío, cada uno una sola vez.
5. **Solo se anota en *en conteo*.** Un conteo enviado, aprobado o anulado no se modifica.
6. **Enviar a revisión** exige que **todo** esté contado. Al enviar se borra la nota de devolución anterior.
7. **Devolver** solo desde *en revisión*; conserva lo anotado y guarda la nota.
8. **Anular** desde *en conteo* o *en revisión*, con motivo (3 a 255 caracteres). No cambia existencias.
9. **Aprobar** solo desde *en revisión*:
   - **sin serial:** aplica la diferencia *contado − lo que había al empezar* a las existencias **de hoy**, como ajuste "corrección de conteo". Así no se pisa lo que se vendió o trasladó mientras se contaba;
   - si la corrección dejaría las existencias en negativo, se rechaza y pide devolver para recontar;
   - **con serial:** los IMEI que no aparecieron y siguen disponibles en la sucursal quedan en estado **baja**, con la nota "Faltante en el conteo CF-…"; luego las existencias se igualan a las unidades disponibles;
   - los IMEI **de más** solo se informan (pueden estar registrados en otra sucursal o venir de una compra sin registrar): no se crean unidades.
10. **Diferencias:** un producto cuenta como diferencia si su cantidad cambió o si le faltan o sobran IMEI.
11. **Número:** lo asigna el servidor (`CF-000001`…).
12. **A ciegas en la pantalla:** la hoja de conteo no muestra *lo que había*. Las cifras aparecen en la revisión (ver Limitaciones sobre lo que envía el servidor).

## 8. Relaciones con otros módulos

| Módulo | Relación |
|---|---|
| Existencias | La foto inicial sale de las existencias de la sucursal; al aprobar se corrigen. La columna "Hoy" muestra las existencias actuales |
| Movimientos (kárdex) | Al aprobar deja movimientos de tipo "ajuste" con motivo **"corrección de conteo"** y la nota "Conteo CF-…" |
| Unidades con serial | Los IMEI disponibles forman la foto inicial; los faltantes quedan **de baja** al aprobar |
| Catálogo | Filtra por categoría; productos inactivos sin existencias no se cuentan |
| Traslados y compras | Lo que entra o sale mientras se cuenta no se pisa, porque se aplica la diferencia y no la cifra contada |
| Sucursales y acceso | Todo exige acceso a la sucursal del conteo (ver `01-roles-acceso-y-costos.md`) |
| Auditoría | Área *Toma física*: crear, enviar, devolver, anular y aprobar |
| Inicio | Tarjeta "Conteos por aprobar" y panel "Toma física" (conteos abiertos) |

## 9. Efectos sobre los datos

- **`stockcounts`:** número, sucursal, categoría (opcional), estado, notas, quién lo creó, quién y cuándo lo envió (`submittedby`, `submittedat`), quién y cuándo lo aprobó (`approvedby`, `approvedat`), nota de devolución (`reviewnote`), fecha y motivo de anulación. Migración `20261103000000-create-stock-counts`, que crea también los permisos `stock-counts.read`, `.create` y `.approve`.
- **`stockcountitems`:** por producto, *lo que había* (`expected`) y *lo contado* (`counted`, vacío mientras no se cuente); con serial, los IMEI esperados (`expectedserials`) y los escaneados (`countedserials`). Un producto no se repite en un conteo (índice único `unique_count_product`).
- **Al aprobar:**
  - `branchstock`: cantidad corregida (y filas en 0 creadas si el producto no estaba registrado en la sucursal);
  - `stockmovements`: un movimiento "ajuste / corrección de conteo" por cada producto que cambia;
  - `productunits`: los faltantes pasan a `baja` y su campo de observaciones se reemplaza por "Faltante en el conteo CF-…".
- **`auditlogs`:**
  - `stock-count.create` (categoría y nº de productos);
  - `stock-count.submit`;
  - `stock-count.return` (nota);
  - `stock-count.cancel` (motivo);
  - `stock-count.approve` (ajustes por producto, IMEI faltantes y de más).
- Crear, guardar, enviar, devolver y anular **no** cambian existencias.

## 10. Seguridad

**Aislamiento por sucursal**
- Ver, crear, contar, enviar, devolver, anular y aprobar exigen acceso a la sucursal del conteo; si no, 403 "No tienes acceso a esa sucursal."
- La lista solo trae conteos de las sucursales del usuario.

**Operaciones simultáneas (A1)**
- **El conteo se bloquea** (`SELECT … FOR UPDATE`) y su estado se **revisa otra vez dentro de la transacción** al anotar, enviar, devolver, anular y aprobar. Dos operaciones sobre el mismo conteo esperan su turno y la segunda ve lo que dejó la primera. Antes de la A1, 3 aprobaciones a la vez de un conteo 10 → 8 dejaban 4 en vez de 8.
- **Crear bloquea la sucursal:** dos creaciones simultáneas esperan su turno y solo queda un conteo abierto.
- **Aprobar** bloquea el conteo y luego las filas de existencias, ordenadas por id.
- **Filas de existencias que faltan:** se crean antes y fuera de la transacción (`ensureStockRows`). Si el conteo se devolvió y recontó entre la revisión previa y el bloqueo, las que aún falten se crean dentro.
- **Reintento por interbloqueo (A1b):** si MySQL cancela la aprobación por interbloqueo, se repite completa hasta 3 veces (`withDeadlockRetry`); en el reintento, si otra petición ya aprobó, responde el 409 de siempre.

## 11. Casos de error

| Situación | Respuesta del servidor |
|---|---|
| Sin sesión | 401 "No se proporcionó un token de autenticación." |
| Sin el permiso de la acción (p. ej. Inventario intenta aprobar) | 403 "No tienes permiso para realizar esta acción." |
| Sucursal ajena | 403 "No tienes acceso a esa sucursal." |
| El conteo no existe | 404 "El conteo no existe." |
| La sucursal no existe | 404 "La sucursal indicada no existe." |
| La categoría no existe | 404 "La categoría indicada no existe." |
| Ya hay un conteo abierto en la sucursal | 409 "Ya hay un conteo abierto en *sucursal*: CF-…. Termínalo o anúlalo primero." |
| No hay productos para contar | 409 "Esta sucursal no tiene productos para contar." / "Esta sucursal no tiene productos de esa categoría para contar." |
| Un producto enviado no existe | 404 "Productos que no existen: 12, 15." |
| Producto de otra categoría | 400 "*Producto* no es de la categoría de este conteo." |
| Cantidad a un producto con serial | 400 "*Producto* maneja serial: se cuenta escaneando sus IMEI o seriales." |
| Seriales a un producto sin serial | 400 "*Producto* no maneja serial: se cuenta por cantidad." |
| Ni cantidad ni seriales, o los dos | 400 "Indica la cantidad contada o los seriales escaneados (uno de los dos)." |
| Seriales repetidos | 400 "Seriales: hay repetidos." |
| Producto repetido en el envío | 400 "Productos: cada producto aparece una sola vez." |
| Anular sin motivo o con menos de 3 caracteres | 400 "Motivo: campo obligatorio." / "Motivo: mínimo 3 caracteres." |
| Anotar en un conteo que no está en conteo | 409 "El conteo está en revisión: no se puede anotar lo contado." (o "aprobado", "anulado") |
| Enviar con productos sin contar | 409 "Faltan 2 por contar: *Producto A*, *Producto B*. Si no hay, anota 0." (nombra hasta 5) |
| Enviar, devolver, anular o aprobar en un estado que no corresponde | 409 "El conteo está *estado*: no se puede enviar a revisión / devolver / anular / aprobar." |
| La corrección dejaría existencias negativas | 409 "*Producto*: la corrección (-5) dejaría las existencias en -2; se movió mercancía mientras se contaba. Devuélvelo para recontar." |
| Interbloqueo que persiste después de 3 intentos | 500 "Ocurrió un error interno. Inténtalo de nuevo más tarde." |

En pantalla, la anulación sin motivo muestra "Escribe el motivo (mínimo 3 letras).", y crear sin sucursal "Elige la sucursal."

## 12. Pruebas

**Automáticas** (base aislada `db_nextsuite_test`; la suite completa más reciente pasó **243 de 243**):

- `tests/stockCounts.test.js` (**14** pruebas, contadas por `it(`):
  - *crear y contar (5):* guarda lo que debería haber y solo un conteo abierto por sucursal; por categoría solo trae esa categoría y no cuenta un inactivo sin existencias; se guarda a medias y enviar exige todo contado; mercancía que apareció se agrega con "había 0"; rechaza cantidad en productos con serial y seriales en los que no tienen (400);
  - *aprobar (3):* corrige con "corrección de conteo" sin pisar lo movido en el medio; con serial, los faltantes quedan de baja y los de más se informan; devolver con nota, anular, y lo aprobado ya no se toca;
  - *permisos y sucursales (2):* quien cuenta no aprueba (403); quien no tiene la sucursal no ve ni cuenta; la lista trae avance y diferencias y filtra por estado;
  - *operaciones simultáneas, A1 (4):* aprobar tres veces a la vez aplica la corrección una sola vez (un movimiento, una auditoría); aprobar y anular a la vez (gana una); crear tres conteos a la vez en la misma sucursal (queda uno); anotar mientras se envía no cambia un conteo ya enviado.
- `tests/deadlocks.test.js` (**5** pruebas): `withDeadlockRetry` y `ensureStockRows` en general (la prueba de estrés usa compras, no conteos).
- `tests/profileTemplates.test.js`: "Inventario … cuenta pero no aprueba" y "Gerente de sucursal … aprueba conteos".
- `tests/dashboard.test.js`: "conteos abiertos, mi caja y turnos abiertos con datos reales".

**Verificación del desarrollador:** 7.3 (servidor), 7.4 (pantalla), A1 y A1b figuran como **verificado** en `PROGRESS.md`. `PROGRESS.md` no detalla pruebas manuales en pantalla para la 7.4.

## 13. Limitaciones

- **A ciegas solo en la pantalla:** el servidor envía *lo que había* (`expected`) y los IMEI esperados a cualquiera con `stock-counts.read`, también a quien cuenta. La pantalla los usa para reconocer un IMEI escaneado, pero no los muestra en la hoja.
- **La lista muestra "N diferencias"** también mientras se cuenta, con lo ya guardado: quien cuenta puede ver que algo no cuadra.
- **Agregar mercancía que apareció:** el servidor lo permite, pero la hoja de conteo no tiene cómo agregar un producto que no esté en la lista.
- **IMEI de más:** solo se informan; registrarlos (compra o unidad) y trasladarlos es manual.
- **Mismo usuario cuenta y aprueba** si su rol tiene los dos permisos (Developer y Administrador los tienen). Las plantillas sí los separan.
- **Un conteo abierto bloquea la sucursal** para otros conteos, aunque sea de otra categoría.
- **Sin valor en dinero** de las diferencias: depende de los informes con "Ver costos" (Fase 14).
- **Sin programación** de conteos periódicos ni recordatorios.
- No existe **exportar** la hoja ni el resultado (pendiente general, alineación D.3).

## 14. Estado final

| Parte | Implementado | Probado | Aprobado por el desarrollador |
|---|---|---|---|
| 7.3 Toma física en el servidor (crear, contar, enviar, devolver, anular, aprobar con corrección de conteo e IMEI de baja) | Sí | Sí (automáticas) | **Sí** (verificado) |
| 7.4 Pantalla Inventarios → Toma física (lista, nuevo conteo, hoja a ciegas con lector, revisión) | Sí | Verificada por el desarrollador | **Sí** (verificado) |
| A1 Conteo bloqueado y estado revisado dentro de la transacción; sucursal bloqueada al crear | Sí | Sí (4 pruebas de concurrencia) | **Sí** (verificado) |
| A1b Reintento por interbloqueo al aprobar | Sí | Sí (automáticas de `withDeadlockRetry`) | **Sí** (verificado) |
