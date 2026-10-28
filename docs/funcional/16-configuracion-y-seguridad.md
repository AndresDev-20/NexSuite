# Configuración, sucursales activas, alcance por sucursal y operación

> Documento funcional · Módulos 14 y 16 del mapa de la alineación · 2026-10-28
> Describe lo que **está implementado hoy**: Fase 15 (configuración del negocio), las preferencias del equipo, A8 (alcance por sucursal y regla del conteo a ciegas), A9 (sucursales activas e inactivas) y la parte operativa de la Fase 17 (salud, respaldos y guía de despliegue). Lo planeado se indica como tal.
> Complementa `01-roles-acceso-y-costos.md`, `03-acceso-usuarios-sucursales-auditoria.md` (sucursales, usuarios y auditoría) y `09-cajas-y-turnos.md` (el detalle del conteo de caja). La guía paso a paso del servidor está en `docs/DESPLIEGUE.md`.

---

## 1. Nombre del módulo

**Configuración y seguridad** (menú *Configuración* y *Administrativo → Sucursales*). Reúne lo que se ajusta una vez y protege a todo el sistema:

- **Datos del negocio** (Fase 15): nombre, NIT, teléfono, correo, dirección, ciudad y pie del comprobante que salen en los documentos.
- **Preferencias de este equipo:** tema (claro, noche o automático), animaciones y tamaño del texto.
- **Sucursales activas e inactivas** (A9): una sucursal que se cierra se desactiva, no se borra.
- **Alcance por sucursal** (A8): quien no tiene acceso a todas ve solo lo suyo.
- **Conteo a ciegas** (A8): la regla de quién ve lo que debería haber en la caja.
- **Operación del servidor** (Fase 17): `/health`, respaldos (`npm run backup` / `npm run restore`) y la guía `docs/DESPLIEGUE.md`.

## 2. Objetivo

- Que los comprobantes, la garantía, el balance y los Excel lleven **los datos del negocio de Carlos** sin tocar el servidor.
- Que cada persona use NexSuite **cómodo en su equipo** (modo noche, texto grande, sin animaciones) sin afectar a los demás.
- Que una sucursal que cierra **deje de operar** sin perder su historia.
- Que nadie vea datos de sucursales que no son suyas y que el vendedor cuente la caja **sin saber cuánto debería haber**.
- Que la base de datos tenga **respaldos diarios** con copia fuera del servidor y que se pueda **restaurar** sin improvisar.

Decisiones de negocio del 2026-10-28 (`PROGRESS.md`): «Configuración del negocio (Fase 15)», «Conteo a ciegas (A8)», «Alcance por sucursal (A8)» y «Sucursal inactiva (A9)». La facturación electrónica DIAN sigue **descartada** (decisión del 2026-10-27).

## 3. Usuarios y roles

| Perfil | Qué hace aquí |
|---|---|
| Developer / Administrador | Cambian los datos del negocio (`settings.manage`), activan y desactivan sucursales, ven todas las sucursales (`branches.all-access`) y ven lo esperado de la caja (`cash-sessions.read`) |
| Gerente de sucursal (plantilla) | Ve solo sus sucursales, sus usuarios y sus existencias; ve lo esperado de la caja (tiene «Ver turnos»). No cambia los datos del negocio ni la plantilla trae «Editar sucursales» |
| Cajero / vendedor (plantilla) | Cuenta la caja **a ciegas** (no tiene «Ver turnos»); ve solo sus sucursales |
| Cualquier usuario con sesión | Elige sus **preferencias** del equipo y consulta los datos del negocio (los usa la pantalla) |
| Desarrollador (persona que instala) | Opera el servidor: `/health`, respaldos, restauración y despliegue con la guía. No es una pantalla |

## 4. Permisos

| Permiso | Código | Qué permite | Rutas del servidor |
|---|---|---|---|
| Configurar el negocio | `settings.manage` | Cambiar nombre, NIT, teléfono, correo, dirección, ciudad y pie de los comprobantes (Configuración → Datos del negocio) | `PUT /settings/business` |
| — (solo sesión) | — | Consultar los datos del negocio | `GET /settings/business` |
| Editar sucursales | `branches.update` | Además de editar sus datos, **activar y desactivar** una sucursal (con acceso a ella) | `PUT /branches/:id/status` |
| Acceso a todas las sucursales | `branches.all-access` | Ver y operar en todas las sucursales; sin él, solo las asignadas (regla de alcance, sin ruta propia) | — |
| Ver turnos | `cash-sessions.read` | Ver lo que debería haber en la caja y la diferencia; sin él se cuenta **a ciegas** | (ver `09-cajas-y-turnos.md`) |

- `settings.manage` se creó con la migración `20261124000000-business-settings` y se dio a Administrador y Developer.
- Las **preferencias del equipo** no tienen permiso: la pantalla *Configuración* (`/configuracion`) es para todos.
- `/health` no pide sesión ni permiso. Los respaldos se corren en la terminal del servidor, no desde la pantalla.

## 5. Interfaz

**Configuración** (`/configuracion`, al final del menú, para todos)
- Título "Configuración" y subtítulo "Cómo se ve y se siente NexSuite en este equipo. Los cambios se aplican al instante." Arriba a la derecha, "Viendo modo claro" o "Viendo modo noche".
- **Apariencia** ("Elige los colores del sistema."): **Claro** ("Blanco con el rojo de la marca."), **Noche** ("Azules oscuros, descansa la vista.") y **Automático** ("Sigue el tema de este equipo."), cada uno con su miniatura.
- **Animaciones**: **Completas** ("Números que cuentan, gráficas que se dibujan y entradas suaves.") o **Reducidas** ("Sin movimiento: todo aparece de una vez.").
- **Tamaño del texto**: **Normal** o **Grande** ("Un poco más grande, más fácil de leer.").
- Pie: "Estas preferencias se guardan en este equipo y navegador: cada computador o celular puede tener las suyas." y **Restablecer** (deshabilitado si ya está como siempre): "Volviste a la configuración de siempre."

**Datos del negocio** (sección de la misma página, solo con `settings.manage`): "Para todos: salen en los comprobantes y documentos del sistema."
- Campos: **Nombre del negocio**, **NIT**, **Teléfono**, **Correo**, **Dirección**, **Ciudad** y **Pie del comprobante**, validados como en el servidor.
- **Vista previa** de la tirilla mientras se escribe (encabezado, sucursal y pie).
- **Guardar datos del negocio** ("Datos del negocio guardados: ya salen en los documentos.") y **Descartar cambios**.
- Muestra "Último cambio: *persona* · *fecha*".
- Un usuario sin el permiso ve Configuración sin esta sección.

**Sucursales** (*Administrativo → Sucursales*, A9)
- Etiqueta **«Inactiva»** en las sucursales desactivadas.
- Botón **Desactivar / Activar** (con «Editar sucursales»). La confirmación de desactivar dice: "¿Desactivar *sucursal*? Deja de vender y no recibe compras, traslados, cargas ni gastos; su caja no abre. Su historial y sus informes se conservan y la puedes volver a activar." y aclara "Solo se puede sin existencias, sin turnos de caja abiertos o por contar, sin fiados pendientes y sin compras en borrador." La de activar: "¿Activar *sucursal*? Vuelve a operar y a aparecer en el selector de sucursales."
- Si el servidor no deja, el aviso trae su motivo (o "No se pudo cambiar el estado de la sucursal.").
- La ficha se puede ver también de las suyas inactivas.
- Sin acceso a todas, la lista muestra **solo sus sucursales** (y cuenta solo esas); al asignar sucursales a un usuario solo salen las suyas (A8).

**Selector de sucursal del encabezado:** una sucursal inactiva **no aparece**.

## 6. Flujo de trabajo

**Poner los datos del negocio**
1. Configuración → **Datos del negocio**.
2. Llenar nombre, NIT, teléfono, correo, dirección, ciudad y pie; mirar la vista previa.
3. **Guardar datos del negocio**. Desde ese momento salen en la tirilla y la carta de venta, el documento de garantía, el balance (PDF y Excel) y el Excel de los informes.

**Cambiar al modo noche en un equipo**
1. Configuración → Apariencia → **Noche** (o **Automático**).
2. Se aplica al instante y se recuerda en ese navegador.

**Cerrar una sucursal**
1. Dejarla sin existencias (trasladar o ajustar), contar sus turnos, cobrar o resolver sus fiados con saldo y confirmar o anular sus compras en borrador.
2. Administrativo → Sucursales → **Desactivar** y confirmar.
3. Queda «Inactiva», sale del selector y deja de operar. Su historial e informes se conservan.
4. Para reabrirla: **Activar**.

**Respaldar y restaurar (en el servidor)**
1. Cada noche, el `cron` corre `npm run backup` (la guía lo deja a las 2:30 a. m.).
2. Una vez al mes, revisar un respaldo restaurándolo en **otra base**: `npm run restore -- --archivo <respaldo> --base revision_respaldo --confirmar revision_respaldo --crear`.
3. Solo si de verdad hace falta, restaurar la real: detener el servidor (`pm2 stop nexsuite-api`), `npm run restore -- --archivo <respaldo> --confirmar <nombre de la base>`, y volver a iniciarlo.

**Saber si el servidor está bien**
1. Abrir `https://<api>/health` (o `/api/v1/health`).
2. `status: ok` y `database: ok`: todo responde. 503 con `database: error`: la base no responde.

## 7. Reglas de negocio

**Datos del negocio (Fase 15)**
1. Hay **una sola fila** de configuración (`businesssettings`). Se llenó **una vez** con lo que había en el `.env` del servidor (`BUSINESS_NAME`, `BUSINESS_NIT`, `BUSINESS_PHONE`, `RECEIPT_FOOTER`); desde ahí manda la pantalla.
2. **Respaldo del `.env`:** si en la pantalla un dato queda vacío, los documentos usan el del `.env`. Esto aplica a **nombre, NIT, teléfono y pie del comprobante**; correo, dirección y ciudad no tienen valor en el `.env` y quedan sin dato.
3. Un campo enviado vacío queda **sin dato**. Hay que enviar al menos un campo.
4. Límites: nombre de 2 a 120; NIT hasta 30; teléfono de 7 a 20 caracteres (números, espacios, `+`, `(`, `)`, `-`); correo válido hasta 120; dirección hasta 160; ciudad hasta 80; pie hasta 255.
5. Encabezado de los documentos: nombre; "NIT …"; "Tel. … · correo"; "dirección · ciudad" (solo lo que haya). Los comprobantes y el documento de garantía llevan además la dirección, el teléfono y el correo de la **sucursal**.
6. Cada cambio queda en la **auditoría** (`settings.update`) con lo que cambió; la pantalla muestra quién hizo el último cambio y cuándo.
7. Sin logo ni textos de garantía por ahora (decisión del 2026-10-28).

**Preferencias del equipo**
8. Tema `light` (Claro, por defecto), `dark` (Noche) o `system` (Automático: sigue el tema del equipo y cambia si el equipo cambia); animaciones `full` o `reduced`; texto `normal` o `large`.
9. Se guardan en el **navegador** (`localStorage`, clave `nexsuite.preferences`): cada equipo tiene las suyas; no viajan al servidor ni a otros usuarios. En modo privado se aplican pero no se recuerdan.
10. Se aplican **antes de pintar** la página (sin destello), también en el inicio de sesión.

**Sucursales activas e inactivas (A9)**
11. Una sucursal que se cierra **se desactiva**; no se borra (con historial, la auditoría lo impide).
12. Solo se desactiva **sin existencias**, **sin turnos de caja abiertos o por contar**, **sin ventas fiadas con saldo** y **sin compras en borrador** que la incluyan. El mensaje dice qué falta.
13. Inactiva **no** vende, no recibe compras (crear, editar ni confirmar), traslados (ni sale ni llega), cargas iniciales ni gastos, no se le crean cajas, no abre turno y su caja **no abre sola**.
14. Sale del selector de sucursal (`/users/me`) y de los destinos de traslado; la lista de sucursales la trae con `isactive`.
15. Su historial e informes se conservan; se puede **reactivar**.
16. Activar o desactivar exige «Editar sucursales» **y** acceso a esa sucursal, y queda en la auditoría (`branch.activate` / `branch.deactivate`).

**Alcance por sucursal (A8)**
17. Quien **no** tiene «Acceso a todas las sucursales» ve **solo lo suyo**:
    - **usuarios:** él mismo y los asignados a sus sucursales; uno ajeno responde «no existe» (también al editarlo o eliminarlo);
    - **asignaciones usuario–sucursal:** solo de sus sucursales; no asigna, mueve ni quita en una ajena;
    - **existencias totales** de un producto: suman solo sus sucursales;
    - **sucursales:** de las ajenas solo `id` y nombre (lo necesitan los traslados); la ficha `GET /branches/:id`, solo de las suyas.
18. Compras compartidas con sucursales ajenas traen `manageable: false`: la pantalla oculta Editar, Confirmar, Anular y Abonar ("solo puedes consultarla").

**Conteo a ciegas (A8)** — solo la regla; el detalle del conteo está en `09-cajas-y-turnos.md`
19. Quien **no** tiene «Ver turnos» cuenta **totalmente a ciegas**: ni antes ni después de cerrar ve lo que debería haber ni la diferencia. En «Mi turno», abrir turno, ingresos y retiros y el cierre, el servidor responde **sin** el esperado ni la diferencia (`totals`, `expectedamount` y `difference` en null).
20. Si un retiro no alcanza, solo dice "No hay tanto efectivo en la caja."
21. Para él la **nota del conteo es opcional** y al cerrar solo ve cuánto entrega; no se le dice si cuadró.
22. La diferencia la ven quienes tienen «Ver turnos» (Admin, Developer, Gerente) en Turnos y al recibir la entrega; para ellos la nota sigue siendo obligatoria si no cuadra.

**Operación (Fase 17)**
23. **`/health`** y **`/api/v1/health`**: sin sesión y sin límite de peticiones; responden estado, base de datos, versión y tiempo encendido. Si la base no responde, 503. No dicen nada sensible.
24. **Apagado ordenado:** con SIGTERM o SIGINT el servidor detiene el reloj de cajas, termina lo que atiende y cierra la base; si algo se cuelga, sale a los 10 segundos.
25. **Respaldo** (`npm run backup`): `mysqldump` coherente sin bloquear (`--single-transaction`), comprimido (`.sql.gz`), con fecha y hora de Colombia en el nombre; la contraseña va por variable de entorno, nunca en la línea de comandos.
26. **Rotación:** se guardan los diarios de los últimos 30 días y el primero de cada mes durante 12 meses (`BACKUP_KEEP_DAYS`, `BACKUP_KEEP_MONTHS`).
27. **Copia fuera del servidor** con rclone si `BACKUP_REMOTE` tiene un destino.
28. **Restaurar** (`npm run restore`): reemplaza todo el contenido de la base de destino. Exige `--confirmar <nombre de la base>`, saca antes un **respaldo de seguridad** de cómo estaba (carpeta `antes-de-restaurar`, salvo `--sin-respaldo-previo`) y acepta `.sql.gz` o `.sql`. Con `--base … --crear` restaura en otra base para revisar un respaldo sin tocar la real.
29. `DB_SSL=false` para MySQL en el mismo servidor (por defecto la conexión va cifrada).
30. **Primer usuario** de una instalación nueva: `npm run setup:first-user` crea un Developer (o Administrador con `--admin`) con contraseña aleatoria mostrada **una sola vez**; se niega si ya hay uno con ese rol.

## 8. Relaciones con otros módulos

| Módulo | Relación |
|---|---|
| Ventas | La tirilla y la carta de venta usan los datos del negocio y los de la sucursal. Una sucursal inactiva no vende |
| Garantías | El documento de garantía usa los datos del negocio y de la sucursal |
| Balance e Informes | El balance (PDF y Excel) y el Excel de los informes usan los datos del negocio |
| Cajas y turnos | Conteo a ciegas según «Ver turnos»; una sucursal inactiva no abre turno, no se le crean cajas y su caja no abre sola. Turnos abiertos o por contar impiden desactivarla |
| Compras, traslados, inventario y gastos | Rechazan una sucursal inactiva; existencias o compras en borrador impiden desactivarla |
| Clientes y cartera | Ventas fiadas con saldo impiden desactivar la sucursal |
| Usuarios y sucursales | Alcance por sucursal (A8); selector sin las inactivas (ver `03-acceso-usuarios-sucursales-auditoria.md`) |
| Auditoría | `settings.update`, `branch.activate`, `branch.deactivate`; `setup:first-user` también queda registrado |

## 9. Efectos sobre los datos

- **`businesssettings`:** una fila con `name`, `nit`, `phone`, `email`, `address`, `city`, `receiptfooter` y `updatedby`. Migración `20261124000000-business-settings` (también crea `settings.manage`), aplicada en desarrollo el 2026-10-28 (autorizada: 1 fila; en el `.env` de desarrollo solo estaba el pie del comprobante). Si la fila no existe (base nueva), se crea sola con el pie del `.env`.
- **`branches.isactive`:** migración `20261122000000-branch-isactive` (todas quedaron activas), aplicada en desarrollo el 2026-10-28 (autorizada: 2 sucursales, ambas activas).
- **Preferencias:** solo en el navegador; nada en la base.
- **A8:** sin migración; cambia lo que responden las consultas.
- **Respaldos:** archivos `nexsuite-<base>-AAAA-MM-DDTHH-MM.sql.gz` en `respaldos/diarios` y `respaldos/mensuales` (por defecto junto a `BackEnd`, o en `BACKUP_DIR`), y en `respaldos/antes-de-restaurar` antes de cada restauración. **Restaurar reemplaza la base completa**: se pierde lo hecho después del respaldo.
- **`auditlogs`:** cada cambio de configuración y de estado de sucursal.

## 10. Seguridad

- El servidor revisa el permiso del rol en cada petición; la pantalla solo oculta.
- `PUT /settings/business` sin `settings.manage`: 403. Los campos se validan en el servidor; uno no permitido responde 400.
- Activar o desactivar una sucursal ajena: 403 "No tienes acceso a esa sucursal." La sucursal se **bloquea** dentro de la transacción mientras se revisa lo que impide desactivarla.
- **A8:** sin acceso a todas, los datos de otras sucursales no salen del servidor (usuarios, asignaciones, existencias totales, ficha de sucursal). El esperado de la caja no llega a quien cuenta a ciegas, tampoco en los mensajes de error.
- **A8 (9):** desactivar una caja bloquea la caja y no deja si tiene un turno abierto o por contar; abrir turno vuelve a revisar con la caja bloqueada que siga activa; retirar un producto de la sucursal revisa las existencias con la fila bloqueada.
- **`/health`** no expone datos del negocio ni de la configuración.
- **Respaldos:** contraseña por `MYSQL_PWD`, nunca en la línea de comandos; los mensajes de error quitan el aviso de contraseña de MySQL. Restaurar exige escribir el nombre de la base.
- **Producción** (guía): firewall solo SSH, HTTP y HTTPS (MySQL y el puerto 8080 no quedan abiertos), Nginx con HTTPS (certbot), `TRUST_PROXY=1`, `CORS_ORIGINS` y `TOKEN_SECRET` generado con `openssl`; el `.env` de producción no se sube con valores.

## 11. Casos de error

| Situación | Respuesta |
|---|---|
| Sin sesión (configuración o sucursales) | 401 "No se proporcionó un token de autenticación." |
| Cambiar los datos del negocio sin `settings.manage` | 403 "No tienes permiso para realizar esta acción." |
| Cuerpo vacío al guardar | 400 "Envía al menos un campo para actualizar." |
| Correo no válido | 400 "Correo: correo no válido." |
| Teléfono no válido | 400 "Teléfono: teléfono no válido." |
| Nombre del negocio de 1 letra | 400 "Nombre del negocio: mínimo 2 caracteres." |
| Texto demasiado largo | 400 "*Campo*: máximo N caracteres." |
| Campo no permitido | 400 "Campo no permitido: *campo*." |
| Desactivar sin «Editar sucursales» | 403 "No tienes permiso para realizar esta acción." |
| Desactivar una sucursal ajena | 403 "No tienes acceso a esa sucursal." |
| La sucursal no existe | 404 "La sucursal no existe." |
| Desactivar con algo pendiente | 409 "No se puede desactivar *sucursal*: tiene N unidades en existencias (trasládalas o ajústalas); tiene N turnos de caja abiertos o por contar; tiene N ventas fiadas con saldo; está en N compras en borrador." (solo lo que aplique) |
| Operar en una sucursal inactiva | 409 "*Sucursal* está inactiva: actívala para operar en ella." |
| Retiro a ciegas que no alcanza | 409 "No hay tanto efectivo en la caja." |
| `/health` con la base caída | 503 `{ status: "error", database: "error", version }` |
| Restaurar sin confirmar el nombre | "❌ No se restauró: Para confirmar, escribe el nombre de la base de destino: --confirmar *base*" |
| Restaurar un archivo que no existe | "❌ No se restauró: --archivo: indica un respaldo que exista (.sql.gz o .sql)." |
| Nombre de base no válido | "❌ No se restauró: --base: solo letras, números y guion bajo." |
| Falla `mysqldump` | "❌ Respaldo fallido: mysqldump terminó con código N: …" |
| Falla la copia con rclone | "❌ Respaldo fallido: No se pudo copiar a *destino*: …" |

## 12. Pruebas

**Automáticas** (`BackEnd/tests`, base aislada `db_nextsuite_test`; la suite completa más reciente registrada en `PROGRESS.md` es de **455** pruebas, 17.3):

- `tests/businessSettings.test.js` (**3**, Fase 15): cualquiera con sesión consulta y solo «Configurar el negocio» cambia, con auditoría; validación (correo, cuerpo vacío, campo no permitido) y un dato vacío usa el del `.env`; los comprobantes llevan el encabezado configurado y los datos de la sucursal.
- `tests/a9LowPriority.test.js` (**6**, A9): no se desactiva con existencias, turnos, fiados o compras en borrador y lo dice; inactiva no opera (caja, gastos, carga inicial, compras, traslados), sale del selector y se reactiva; activar o desactivar exige «Editar sucursales» y acceso; además cédula de 5 a 10, precio mayor que cero, SKU automático y traslados.
- `tests/a8Security.test.js` (**10**, A8): conteo a ciegas (sin «Ver turnos» no ve el esperado ni en su turno, ni al mover efectivo, ni en el error de un retiro; cierra sin nota y no ve la diferencia; quien ve los turnos sigue con nota obligatoria); usuarios, asignaciones, existencias totales y sucursales solo de las suyas; compras compartidas con `manageable`; caja con turno por contar no se desactiva; retirar un producto con existencias revisado con la fila bloqueada.
- `tests/production.test.js` (**2**, 17.2): `/health` responde sin sesión y sin datos sensibles; crear el primer usuario se niega si ya hay uno con ese rol o faltan datos.
- `tests/backupRestore.test.js` (**3**, 17.3): respaldo comprimido con fecha guardado también como el del mes; restaurado en otra base con las mismas tablas y registros y confirmación obligatoria; rotación de diarios y mensuales. Se salta si `mysqldump` no está instalado.
- **Preferencias del equipo:** sin pruebas automáticas (la web no tiene pruebas).

**En pantalla** (`PROGRESS.md`, base aislada): se guardaron los datos de Celulares Rovira, la vista previa los mostró y quedaron al recargar; un usuario sin el permiso ve Configuración sin la sección. Rovira Plaza no se dejó desactivar ("tiene 6 unidades en existencias") y Rovira Sur sí (quedó «Inactiva», salió del selector y ofreció Activar). La vendedora contó $540.000 de $550.000 sin nota y solo vio «Contaste $540.000»; el gerente de Centro vio 2 usuarios y 1 sucursal. Configuración, inicio, ventas, menú e inicio de sesión probados en modo noche.

## 13. Limitaciones

- **Sin logo** ni textos de garantía configurables; sin numeración ni impuestos configurables (la empresa no maneja IVA). **Facturación electrónica DIAN descartada** por ahora.
- Correo, dirección y ciudad del negocio no tienen respaldo en el `.env`.
- Las **preferencias** son por navegador, no por usuario: al cambiar de equipo hay que elegirlas otra vez.
- Una sucursal **no se elimina** si tiene historia; solo se desactiva.
- La plantilla Gerente no trae «Editar sucursales»: Carlos se lo da si quiere que active o desactive.
- Los respaldos y la restauración se corren en la **terminal del servidor**; no hay pantalla para ellos. La copia fuera del servidor depende de configurar rclone.
- Nada se contrata ni se publica desde el desarrollo: el VPS, el dominio y el sitio en Netlify los prepara el desarrollador con `docs/DESPLIEGUE.md`.

## 14. Estado final

| Parte | Implementado | Probado | Aprobado por el desarrollador |
|---|---|---|---|
| 15 Configuración del negocio · servidor (`businesssettings`, `settings.manage`, documentos, respaldo del `.env`) | Sí | Sí (3 automáticas) | No: «hecho», **por verificar** |
| 15 Configuración del negocio · pantalla (Datos del negocio con vista previa) | Sí | Sí (en el navegador) | No: «hecho», **por verificar** |
| Modo noche y Configuración del equipo (tema, animaciones, texto) | Sí | Sí (en el navegador) | No: «pendiente de verificar» |
| A8 servidor (alcance por sucursal, conteo a ciegas, compras compartidas, revisiones con bloqueo) | Sí | Sí (11 automáticas nuevas) | No: «hecho», **por verificar** |
| A8 pantallas | Sí | Sí (en el navegador) | No: «hecho», **por verificar** |
| A9 servidor (sucursales activas e inactivas y demás puntos) | Sí | Sí (6 automáticas) | No: «hecho», **por verificar** |
| A9 pantallas | Sí | Sí (en el navegador) | No: «hecho», **por verificar** |
| 17.2 Preparar producción (`/health`, apagado ordenado, `db:setup`, `setup:first-user`, PM2, Nginx, Netlify) | Sí | Sí (2 automáticas y en el navegador) | No: «hecho», **por verificar** |
| 17.3 Respaldos y restauración | Sí | Sí (3 automáticas) | No: «hecho», **por verificar** |
| 17.4 Guía de despliegue `docs/DESPLIEGUE.md` | Sí | Revisada contra el código | No: «hecho», **por verificar** |

La Fase 15 figura como «completada (por verificar)» y la Fase 17 como «en curso» (falta el cierre 17.5) en `PROGRESS.md`.
