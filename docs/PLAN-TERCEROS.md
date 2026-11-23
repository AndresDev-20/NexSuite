# Fase 41 · Terceros de Gastos

Pedido del 2026-11-23: que Gastos tenga sus propios «proveedores», llamados **Terceros**: las
personas o empresas a quienes se les deben o se les pagan los gastos (el arrendador, la empresa de
energía, el contador…). Se crean y se editan con los mismos datos que hoy pide un proveedor de
Compras. En la pantalla siempre se llaman «Terceros».

## Decisiones (2026-11-23)

| Pregunta | Decisión |
|---|---|
| ¿Dónde se eligen? | Al **registrar un gasto** y al **configurar un gasto fijo**. Se sigue pudiendo escribir a mano «A quién se le pagó» si no es un tercero. |
| ¿Y los proveedores de Compras? | **Se retiran de Gastos**: el gasto ya no se liga a un proveedor de Compras. Gastos tiene sus propios terceros. |
| ¿Se desactivan o eliminan? | Igual que las categorías: se **elimina** solo si no tiene gastos ni gastos fijos; si los tiene, se **desactiva** (deja de ofrecerse, el historial queda). |
| ¿Qué permisos? | Los de gastos que ya existen. Ver la lista: quien ve, registra o configura gastos. Crear, editar, activar/desactivar y eliminar: **«Configurar gastos»** (`expenses.configure`). No hay permiso nuevo. |
| ¿Qué datos son obligatorios? | **Los mismos del proveedor**, con las mismas validaciones. |

## Datos de un tercero (los mismos del proveedor)

| Campo | Obligatorio | Validación |
|---|---|---|
| Tipo de organización | Sí | Natural o Jurídica |
| Tipo de identificación | Sí | NIT, CC, CE o Pasaporte |
| Número de identificación | Sí | 5 a 15 dígitos. **No se repite** el mismo tipo + número |
| Dígito de verificación | — | Solo para NIT; lo **calcula el servidor** (si se envía, debe coincidir) |
| Nombre o razón social | Sí | 2 a 100 letras |
| Teléfono | Sí | El mismo formato del proveedor |
| Dirección, departamento, ciudad | Sí | 2 a 100 letras |
| Correo | Sí | Correo válido, hasta 100 |
| Contacto | — | Hasta 20 |
| Activo | — | Por defecto sí |

No lleva «por completar» (eso del proveedor viene de importar productos, que aquí no aplica).

## Servidor

- **Migración** `20261218000000-expense-third-parties.js`:
  - Tabla nueva `thirdparties` con los campos de arriba, índice único de tipo + número.
  - Columna nueva `idthirdparty` en `expenses` y en `fixedexpenses` (vacía, ligada a `thirdparties`,
    no deja borrar un tercero con gastos).
  - **Sin borrar datos**: la columna vieja `idsupplier` de gastos y gastos fijos se queda en la base
    tal como está, pero el sistema deja de usarla. A los gastos que tengan un proveedor y no tengan
    «A quién se le pagó» se les copia el nombre del proveedor en ese texto, para que lo sigan
    mostrando. (Hoy la base de desarrollo tiene 0 gastos, así que en la práctica no cambia nada.)
- **Modelo** `ThirdParty` (`thirdparty.js`). `Expense` y `FixedExpense` pasan de `supplier` a
  `thirdParty`.
- **Rutas** `/expense-third-parties`:
  - `GET /`: todos (activos primero, por nombre) con cuántos gastos y gastos fijos tiene cada uno.
    `?isactive=true|false` para filtrar. Permiso: ver, registrar o configurar gastos.
  - `GET /:id`: uno, con sus conteos. Mismo permiso.
  - `POST /`, `PUT /:id`: crear y editar. Permiso «Configurar gastos».
  - `DELETE /:id`: solo si no tiene gastos ni gastos fijos; si los tiene responde 409 «desactívalo».
    Permiso «Configurar gastos».
- **Validación en el servidor** (sin confiar en la pantalla):
  - Los mismos esquemas del proveedor (se reutilizan los de `purchases.schemas.js`, con el dígito
    de verificación calculado por el servidor). Documento repetido → 409 «Ya existe un tercero
    con NIT … : nombre».
  - Gasto y gasto fijo aceptan `idthirdparty`: debe existir y estar **activo**. Un gasto fijo que
    ya tenía un tercero que luego se desactivó se puede seguir editando sin cambiarlo.
  - `idsupplier` deja de aceptarse en gastos y gastos fijos (400 «campo no permitido»).
  - La búsqueda de gastos también encuentra por el nombre del tercero.
- Todo cambio queda en la **auditoría** (`expense-third-party.create/update/delete`).
- **Pruebas** `tests/expenseThirdParties.test.js`: crear, documento repetido, DV del NIT, campos
  obligatorios, permisos (sin «Configurar gastos» no crea; con «Registrar gasto» sí lista),
  editar, desactivar, no eliminar con gastos, eliminar sin gastos, gasto con tercero activo /
  inactivo / inexistente, gasto fijo con tercero, ya no acepta `idsupplier`.
  La prueba existente de `expenses.test.js` que ligaba un proveedor al gasto pasa a ligar un tercero.

## Pantallas (Gastos)

Aclaración del usuario: Terceros **no es un módulo aparte** ni una entrada nueva del menú lateral.
Vive dentro de la misma página Gastos → Gastos, como «Categorías» y «Gastos fijos».

- Botón **«Terceros»** en la cabecera de Gastos, junto a «Categorías» y «Gastos fijos» (con
  «Configurar gastos»).
- **Lista de terceros** (ventana): búsqueda por nombre o documento, filtro Activos / Inactivos /
  Todos; cada fila con nombre, documento, teléfono, ciudad, nº de gastos y estado. Acciones: ver,
  editar, activar/desactivar y eliminar (eliminar deshabilitado si tiene gastos, con el porqué).
- **Nuevo / Editar tercero**: el mismo formulario del proveedor (tipo de organización,
  identificación con DV automático para NIT, nombre, teléfono, dirección, departamento, ciudad,
  correo, contacto), con los textos «tercero».
- **Ver tercero**: sus datos y cuántos gastos y gastos fijos tiene.
- **Registrar gasto**: el selector «Proveedor» se cambia por **«Tercero»** (solo los activos).
  Si no se elige, sigue el texto libre «A quién se le pagó».
- **Gastos fijos**: se agrega el selector **«Tercero»**; el pago del mes lo trae al gasto.
- **Detalle del gasto** y lista: muestran el tercero (o el texto libre).

## Fuera de alcance

- Pagos a terceros o cuentas por pagar de gastos (hoy un gasto ya es un pago).
- Reportes por tercero.
- Pasar los proveedores de Compras a terceros (son listas separadas).
