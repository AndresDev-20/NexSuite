# Plan — Fase 58: ver solo el nombre de los proveedores

Pedido del 2026-11-27: cajeros, gerentes de sucursal y vendedores a veces crean productos o cargan mercancía y por eso
tienen «Ver proveedores». Con ese permiso entran a **Compras → Proveedores** y ven todo: NIT, teléfono, correo,
dirección y el resumen de compras. Si se les quita, ya no pueden elegir el proveedor al crear un producto ni al cargar
celulares con IMEI. Lo que se quiere: que **elijan el proveedor por su nombre**, pero que **no vean sus datos**.

## Cómo queda

Dos permisos en lugar de uno:

| Permiso | Qué deja ver | Para quién |
|---|---|---|
| **Ver proveedores** (`suppliers.read`, ya existe) | El directorio completo: Compras → Proveedores, NIT, teléfonos, correos, dirección, el resumen de compras de cada uno. | Administrador, Developer y quien maneje compras. |
| **Elegir proveedor** (`suppliers.pick`, **nuevo**) | **Solo el nombre** de los proveedores, en las listas para elegir: crear o editar un producto, la carga inicial, «Aumentar» con IMEI, editar un IMEI, garantías y los filtros por proveedor. **No** abre Compras → Proveedores. | Cajero, Gerente de sucursal, Vendedor, Inventario… |

- Quien tiene «Ver proveedores» puede elegir también (no necesita los dos).
- Quien no tiene ninguno de los dos no ve proveedores en ninguna parte, como hoy.

## Servidor

- Ruta nueva `GET /suppliers/options`: solo `id`, nombre y si está activo. La abre «Ver proveedores» o «Elegir
  proveedor». Las rutas de hoy (`GET /suppliers`, `/suppliers/:id`, `/suppliers/:id/overview`) siguen pidiendo
  «Ver proveedores».
- Donde hoy se exige «Ver proveedores» para poner o ver el proveedor de un producto o de un IMEI (crear y editar
  productos, la ficha, la importación desde Excel), vale también «Elegir proveedor». Allí ya solo viaja el nombre.
- Migración nueva: crea el permiso y **se lo da a todos los roles que hoy tienen «Ver proveedores»**, para que nadie
  pierda nada. Solo agrega (ver pregunta 1).
- Pruebas en la base aislada: con «Elegir proveedor» sale la lista de nombres y se crea un producto con proveedor;
  con ese permiso, `GET /suppliers`, `/suppliers/:id` y el resumen dan 403; sin ninguno de los dos, 403 en todo.

## Pantallas

- Los selectores de proveedor usan la lista de nombres cuando la persona no tiene «Ver proveedores».
- El menú Compras → Proveedores sigue saliendo solo con «Ver proveedores».
- En Administrativo → Roles, el permiso nuevo sale al lado de «Ver proveedores» con su explicación.

## Decisiones (2026-11-27)

1. La migración **les quita «Ver proveedores»** a Gerente de sucursal, Cajero y Vendedor (quedan con «Elegir proveedor»).
2. **Inventario** conserva el directorio completo.

Además: el teléfono, correo, NIT y contacto del proveedor que se veían en el detalle de un IMEI, la ficha del producto y las garantías ahora salen solo con «Ver proveedores».

Importante: los roles creados a mano (como el de Laura en Recarga Móvil) **no cambian**: hay que quitarles «Ver proveedores» y darles «Elegir proveedor» en Administrativo → Roles.
