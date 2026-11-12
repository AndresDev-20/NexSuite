# Fase 26: archivo de la auditoría y medidor de espacio (definición)

Pedido del 2026-11-12: que la base no se llene con la auditoría y los movimientos. Decisión: **no** borrar cada
10 días. Los movimientos no se tocan nunca; la auditoría vieja se archiva en Excel y sale de la base; un medidor
muestra cuánto ocupa la base.

Medido en desarrollo (2026-11-12): auditoría 265 filas en 16 días, movimientos 27, menos de 1 MB. Cálculo para un
año real con 4 sucursales: auditoría ~180.000 filas (~100–150 MB), movimientos ~150.000 (~30–50 MB).

## Lo que no cambia

- **Movimientos de inventario y de caja: nunca se borran.** De ellos salen el stock, el kárdex, los arqueos, los
  cierres, las garantías, la cartera y los informes.
- La auditoría sigue sin poderse **editar**, y nadie puede borrar registros sueltos.

## 1. Archivo de la auditoría (solo el Developer)

Cambia la regla «la auditoría no se borra»: ahora se puede **archivar lo de hace más de 12 meses**, siempre con su
Excel antes.

1. **Configuración → Espacio y archivo** (solo el Developer) muestra cuántos registros tienen más de 12 meses y de
   qué fechas.
2. **Descargar archivo**: Excel con esos registros (fecha, usuario, sucursal, acción, qué cambió, IP) y una hoja
   «Acerca de» con el rango y el total. El servidor responde también cuántos son y hasta qué registro va.
3. **Archivar (borrar de la base)**: solo se activa después de descargar. Pide confirmación escribiendo
   ARCHIVAR, y el servidor vuelve a revisar:
   - que sea el Developer (el rol que tiene guardado, no lo que diga la pantalla);
   - que los registros a borrar sean **exactamente** los del Excel descargado (mismo total y mismo último
     registro). Si entró algo nuevo o cambió, pide descargar de nuevo;
   - que todos tengan más de 12 meses. **Nunca** borra lo del último año, ni aunque se pida.
4. Borra por tandas (sin bloquear el sistema) y deja en la auditoría un registro **`audit.archive`** que no se
   borra en ese archivo: quién, cuándo, cuántos y de qué fechas.

Los 12 meses son una constante del servidor (si algún día quieres otro plazo, se cambia ahí).

## 2. Medidor de espacio (solo el Developer)

En la misma sección:

- Cuánto ocupa la base en total y las tablas que más pesan (filas aproximadas y MB).
- Si en el `.env` del servidor pones `DB_STORAGE_LIMIT_MB` (el límite de tu plan de Aiven), muestra la barra
  de uso y avisa en amarillo desde el 70 % y en rojo desde el 90 %. Sin ese dato, solo muestra el tamaño.
- Los números salen de MySQL (`information_schema`): no recorre las tablas, es instantáneo.

## Servidor

- `GET /settings/storage`: tamaño total, tablas, límite y uso. Solo el Developer.
- `GET /audit-logs/archive`: resumen (cuántos tienen más de 12 meses, desde y hasta).
- `GET /audit-logs/archive/excel`: el Excel; en encabezados, el total y el último id incluidos.
- `POST /audit-logs/archive` `{ count, lastId, confirm: "ARCHIVAR" }`: revisa y borra; responde cuántos borró.
- Sin migraciones: no cambia ninguna tabla.
- Pruebas en la base aislada: solo el Developer (el Administrador recibe 403), nunca borra lo del último año,
  rechaza si el total o el último id no coinciden, deja `audit.archive`, el Excel trae los registros correctos y
  el medidor responde.

## Pantallas

- Configuración: sección «Espacio y archivo (Developer)» con el medidor y los dos pasos del archivo.
