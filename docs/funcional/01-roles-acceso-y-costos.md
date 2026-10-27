# Roles del sistema, acceso a sucursales y "Ver costos"

> Documento funcional · tareas A2 y A3 de la Fase A (alineación) · 2026-10-24
> Describe lo que **está implementado hoy**. Lo planeado se indica como tal.

---

## 1. Nombre del módulo

**Roles y acceso** (parte del grupo *Administrativo*). Decide **quién** puede hacer cada cosa, **en qué sucursales** y **si puede ver los costos** del negocio.

Tiene tres piezas:

- **Roles del sistema:** *Developer* y *Administrador*, protegidos.
- **Acceso a todas las sucursales:** un permiso explícito, no el nombre del rol.
- **Ver costos y márgenes:** un permiso que protege el precio de costo.

## 2. Objetivo

- Que nadie obtenga acceso total solo porque su rol **se llame** "Administrador". Antes funcionaba así, y bastaba con renombrar un rol para cambiar quién veía todo.
- Que el desarrollador (Developer) tenga acceso de soporte que el negocio no pueda quitarle por error, y que Carlos (Administrador) no pueda quitarse a sí mismo el acceso total.
- Que un vendedor o cajero **no pueda ver lo que cuesta la mercancía** (precio de costo, ganancia), ni en pantalla ni pidiéndolo directamente al servidor.

## 3. Usuarios y roles

| Rol | Quién | Alcance |
|---|---|---|
| **Developer** | El desarrollador (soporte y diagnóstico) | Todos los permisos, todas las sucursales |
| **Administrador** | Carlos | Todos los permisos, todas las sucursales |
| Roles del negocio (Vendedor, Inventario, Gerente…) | Los que crea Carlos | Solo los permisos y sucursales que Carlos les dé |

Developer y Administrador son **roles del sistema**. Se reconocen por una marca interna (`systemkey`), no por su nombre.

*Planeado (A4):* plantillas editables "Gerente de sucursal", "Cajero / vendedor" e "Inventario". Hoy no existen; Carlos crea los roles desde cero.

## 4. Permisos

| Permiso | Código | Qué permite |
|---|---|---|
| Acceso a todas las sucursales | `branches.all-access` | Ver y operar en todas las sucursales sin tenerlas asignadas. Sin él, solo las sucursales asignadas al usuario. |
| Ver costos y márgenes | `costs.read` | Ver y cambiar el precio de costo de los productos y la ganancia. Ver los costos en la auditoría. |

Los dos se asignan desde **Administrativo → Roles → Permisos**, como cualquier otro. Developer y Administrador los tienen siempre.

**Qué hace cada perfil con estos permisos**

| Acción | Developer | Administrador | Otro rol con el permiso | Otro rol sin el permiso |
|---|---|---|---|---|
| Ver todas las sucursales | Sí | Sí | Sí | Solo las asignadas |
| Ver / cambiar el costo de un producto | Sí | Sí | Sí | No (no lo ve ni lo envía) |
| Ver costos en la auditoría | Sí | Sí | Sí | Aparecen como "•••• (requiere Ver costos)" |
| Ver montos de compras y cuentas por pagar | Si tiene esos módulos | Si tiene esos módulos | Si tiene esos módulos | Si tiene esos módulos (decisión: el módulo ya incluye sus montos) |
| Editar / desactivar / eliminar un usuario Developer | Sí | **No** | No | No |
| Dar el rol Developer a alguien | Sí | **No** | No | No |
| Editar la descripción del rol Developer | Sí | **No** | No | No |
| Renombrar o eliminar Developer / Administrador | No (nadie) | No | No | No |
| Quitar o cambiar permisos de Developer / Administrador | No (nadie) | No | No | No |
| Cambiar **su propio** rol | No (nadie) | No | No | No |

## 5. Interfaz

- **Administrativo → Roles → Permisos:** aparecen "Acceso a todas las sucursales" (en *Sucursales*) y "Ver costos y márgenes" (en *Productos*), cada uno con su explicación.
- **Selector de sucursal del encabezado:** quien tiene acceso a todas ve todas las sucursales; los demás, solo las suyas.
- **Inventarios → Productos**, sin "Ver costos":
  - la tabla no tiene columna *Costo*;
  - la ficha no muestra *Precio de costo* ni *Ganancia por unidad*;
  - el formulario no pide costo, y al crear dice "El costo lo fija la primera compra de este producto".
- **Compras → Registro de compras**, sin "Ver costos":
  - al agregar un producto, el *Costo unitario* aparece vacío para escribirlo (no se precarga el costo actual);
  - "Producto nuevo" no pide costo.
- **Administrativo → Auditoría:** sin "Ver costos", los valores de costo se ven como "•••• (requiere Ver costos)". En compras se ocultan todos los montos.

## 6. Flujo de trabajo

**Dar a alguien acceso a todas las sucursales**
1. Administrativo → Roles → elegir el rol → Permisos.
2. Marcar "Acceso a todas las sucursales".
3. Los usuarios de ese rol ven todas las sucursales desde su siguiente acción (el servidor lo revisa en cada petición).

**Dar a alguien permiso de ver costos**
1. El mismo camino; marcar "Ver costos y márgenes".
2. Desde ese momento sus pantallas de productos y auditoría muestran costos.

**Crear un producto sin "Ver costos"**
1. Inventarios → Productos → Nuevo producto.
2. Llenar nombre, categoría, precio de venta. El costo no se pide.
3. El producto queda con costo $0.
4. La **primera compra confirmada** le fija el costo (costo promedio ponderado).

**Instalación nueva: el primer Developer**

Desde la aplicación solo un Developer puede dar el rol Developer, y al principio no hay ninguno. Por eso existe un comando de una sola vez:

```
npm run seed:developer -- <cédula>
```

Queda en la auditoría del usuario. En la base de desarrollo actual no hizo falta: el rol "Developer" que ya existía se conservó con su usuario.

## 7. Reglas de negocio

1. El acceso a todas las sucursales lo da **solo** el permiso `branches.all-access`. El nombre del rol no influye.
2. Developer y Administrador tienen **siempre todos los permisos**, también los que se agreguen en el futuro (el seeder de roles los completa).
3. Los roles del sistema **no se eliminan**, **no se renombran** y **sus permisos no se cambian** desde la aplicación.
4. **Solo un Developer** puede:
   - editar, desactivar o eliminar a un usuario Developer;
   - cambiarle el rol o las sucursales;
   - dar el rol Developer a alguien;
   - editar el rol Developer.
5. **Nadie cambia su propio rol**, ni se desactiva ni se elimina a sí mismo. Enviar el mismo rol que ya tiene no cuenta como cambio.
5b. *(Desde la A7.2)* **Solo un Administrador o Developer**:
   - asigna, cambia o quita permisos de un rol (cualquiera, incluido el propio);
   - da un rol a un usuario, al crearlo o al cambiárselo; por eso, en la práctica, solo ellos crean usuarios;
   - edita, cambia la contraseña, desactiva, elimina o asigna sucursales a un usuario Administrador;
   - edita el rol Administrador o lo da.

   Así nadie con permisos delegados puede darse más acceso del que tiene. En pantalla, quien no es Administrador ni Developer ve los permisos de los roles bloqueados, con una explicación, el selector de rol bloqueado y a los Administradores solo con "Ver".
6. **Sin "Ver costos":**
   - el servidor no envía el precio de costo de los productos;
   - rechaza (403) que se envíe uno;
   - al crear, el costo queda en 0.
7. **Con "Ver costos":** el precio de costo es obligatorio al crear un producto.
8. Las **existencias por sucursal** no envían el costo a nadie, porque esa pantalla no lo necesita.
9. **Compras y cuentas por pagar** muestran sus montos a quien tenga esos módulos, con o sin "Ver costos" (decisión del 2026-10-24).

## 8. Relaciones con otros módulos

| Módulo | Qué recibe o qué cambia |
|---|---|
| Sucursales (aislamiento) | Usa `branches.all-access` para decidir qué sucursales ve cada usuario en existencias, movimientos, compras, traslados, conteos, cajas y unidades con serial |
| Usuarios | Las reglas 4 y 5 se aplican al crear, editar, desactivar o eliminar usuarios y al asignarles sucursales |
| Roles y permisos | Las reglas 2 y 3 se aplican al editar roles y sus permisos |
| Productos | Lista, ficha, creación y edición respetan "Ver costos" |
| Compras | Al confirmar se recalcula el costo promedio (no cambia); el formulario no precarga el costo sin el permiso |
| Auditoría | Oculta costos a quien no tiene el permiso |

## 9. Efectos sobre los datos

- Tabla `roles`: columna nueva `systemkey` (`developer`, `administrador` o vacía). Migración `20261105000000-system-roles`.
- Rol **Developer** creado o marcado; permiso `branches.all-access` creado y asignado a los dos roles del sistema.
- Permiso `costs.read` creado y asignado a los dos roles del sistema. Migración `20261106000000-costs-permission`.
- Un producto creado sin "Ver costos" queda con `cost_price = 0`.
- Todo cambio de usuario, rol o permiso queda en la **auditoría**, como antes. El comando `seed:developer` deja su registro con origen `script:assign-developer`.
- No se borró ningún dato. En desarrollo, el 2026-10-24 y con autorización, se aplicaron las dos migraciones:
  - el "Developer" que ya existía (id 1) se conservó con su usuario;
  - "Vedendor" e "Inventario" no cambiaron.

## 10. Seguridad

- Todas las reglas se revisan **en el servidor**, con el rol guardado en la base de datos, nunca con lo que envía el navegador.
- Ocultar un botón o una columna es solo comodidad: si alguien pide el dato directamente al servidor, no lo recibe, y si intenta la acción, recibe 403 o 409.
- La marca `systemkey` no se puede enviar desde la aplicación (los formularios de roles no la aceptan).
- La pantalla decide si muestra costos con el **permiso real** del usuario (`can("costs.read")`; desde la A4.1 todas las pantallas usan siempre los permisos reales).

## 11. Casos de error

| Situación | Respuesta |
|---|---|
| Alguien que no es Administrador ni Developer intenta asignar o quitar permisos de un rol *(A7.2)* | 403 "Solo un Administrador o un Developer puede asignar o quitar permisos a un rol." |
| Alguien que no es Administrador ni Developer intenta dar un rol, al crear o al editar un usuario *(A7.2)* | 403 "Solo un Administrador o un Developer puede dar un rol a un usuario." |
| Alguien que no es Administrador ni Developer intenta cambiar a un usuario Administrador o el rol Administrador *(A7.2)* | 403 "Solo un Administrador o un Developer puede hacer cambios sobre el rol Administrador o sus usuarios." |
| El Administrador intenta editar, desactivar o eliminar a un Developer, o darle ese rol a alguien | 403 "Solo un Developer puede hacer cambios sobre el rol Developer o sus usuarios." |
| Alguien intenta renombrar o eliminar Developer / Administrador | 409 "El rol … es del sistema: no se puede renombrar / eliminar." |
| Alguien intenta quitar, cambiar o agregar permisos a un rol del sistema | 409 "Los roles del sistema (Developer y Administrador) tienen siempre todos los permisos: no se cambian." |
| Alguien intenta cambiar su propio rol | 400 "No puedes cambiar tu propio rol." |
| Alguien sin "Ver costos" envía un precio de costo | 403 "No tienes permiso para ver ni cambiar costos." |
| Alguien con "Ver costos" crea un producto sin costo | 400 "Precio de costo: es obligatorio." |
| Un usuario sin acceso global pide datos de otra sucursal | 403 "No tienes acceso a esa sucursal." |
| `seed:developer` sin cédula, con una cédula que no existe o sin el rol Developer creado | El comando termina con un mensaje claro y no cambia nada |

## 12. Pruebas

**Automáticas** (base aislada `db_nextsuite_test`; suite completa: 230 de 230):
- `tests/systemRoles.test.js` (15 pruebas):
  - acceso por permiso y no por nombre (incluido renombrar el rol en la base y quitarle el permiso);
  - protección de los roles del sistema;
  - protección de usuarios Developer;
  - nadie se cambia su propio rol;
  - comando `seed:developer`.
- `tests/costs.test.js` (9 pruebas):
  - lista y detalle de productos sin costo;
  - crear y editar sin el permiso (403 al enviar costo; costo 0 al crear);
  - costo obligatorio con el permiso;
  - existencias sin costo;
  - auditoría oculta (productos y compras);
  - compras siguen mostrando sus montos.
- Antes de aplicar la migración A2 en desarrollo se ensayó sobre una copia aislada con el mismo estado (rol "Developer" existente con usuario).

**En pantalla** (web aislada, sin el interruptor de permisos):
- usuario sin "Ver costos": productos sin costo ni ganancia; creó y editó productos sin error; compra con costo unitario vacío; auditoría con "•••• (requiere Ver costos)";
- Administrador: ve costos y el costo no cambió por la edición del otro usuario.

**Verificado por ti:** A2 (servidor), A3 (servidor) y A3 (pantallas).

## 13. Limitaciones

- ~~El interruptor de permisos de la interfaz seguía apagado en desarrollo~~ → **resuelto en la A4.1**: ya no existe; las pantallas siguen siempre los permisos reales (ver `02-interfaz-plantillas-e-inicio.md`).
- ~~No existían las plantillas de perfiles~~ → **resuelto en la A4.2** (Gerente de sucursal, Cajero / vendedor, Inventario).
- **Márgenes e informes** (Fase 14) aún no existen; cuando existan, también dependerán de "Ver costos".
- No se pueden **desactivar roles**, solo eliminarlos si no tienen usuarios (pendiente; ver alineación D.3).
- El rol Administrador de desarrollo no tiene usuarios aún: Carlos no está creado en la base de desarrollo.

## 14. Estado final

| Parte | Implementado | Probado | Aprobado por ti |
|---|---|---|---|
| A2: acceso global por permiso, roles del sistema, protección del Developer, nadie cambia su propio rol (servidor) | Sí | Sí (automáticas) | **Sí** |
| A2: migración en desarrollo | Aplicada el 2026-10-24 | Ensayada en copia aislada | **Sí** (autorizada) |
| A3: "Ver costos" en el servidor | Sí | Sí (automáticas) | **Sí** |
| A3: migración en desarrollo | Aplicada el 2026-10-24 | — | **Sí** (autorizada) |
| A3: "Ver costos" en pantallas | Sí | Sí (navegador) | **Sí** |
