# Fase 42 · Comprobante del pago de un gasto

Pedido del 2026-11-23: un comprobante (factura) de cuando se paga un gasto, con todo: dinero, de
dónde salió, tercero, gasto… y con el mismo diseño de los comprobantes del sistema.

## Decisiones (2026-11-23)

| Pregunta | Decisión |
|---|---|
| ¿Pago o abono? | Un gasto se paga **completo de una vez** (no hay abonos). **Cada gasto tiene su comprobante**: se genera al registrarlo y queda para verlo e imprimirlo de nuevo cuando se quiera. |
| ¿Número para buscarlo? | El comprobante lleva el **número del gasto** (`GTO-000027`), que ya es único y ya se busca en Gastos (buscador «Número, descripción…»). No es el campo «Factura o recibo», que es el soporte que entrega el tercero. |
| ¿Formatos? | **Tirilla 80 mm y hoja carta**, igual que el comprobante de venta. |
| ¿Gasto anulado? | Sí se imprime, **marcado ANULADO**, con el motivo, quién, cuándo y si el efectivo volvió a la caja. |
| ¿Quién lo imprime? | Quien **ve o registra gastos**, solo de sus sucursales (los generales, solo quien tiene acceso a todas). Sin permiso nuevo. |

## Qué muestra (los dos formatos)

- **Negocio:** logo, nombre, NIT, contacto y lema (Configuración del negocio), como en las ventas.
- **Sucursal** resaltada, o **«General del negocio»** si el gasto no es de una sucursal.
- **«COMPROBANTE DE EGRESO»** con el número `GTO-000027` en grande; «ANULADO» si aplica.
- **Gasto:** fecha del gasto, fecha y hora en que se registró, categoría, descripción y, si paga un
  gasto fijo, su nombre, el mes que paga y el monto aproximado.
- **Tercero:** nombre, tipo y número de documento (con DV si es NIT), teléfono, correo, dirección y
  ciudad. Sin tercero: «A quién se le pagó» (texto libre) o «—».
- **Pago:** el **valor pagado** en una barra grande, el **medio** y **de dónde salió el dinero**:
  - efectivo de una caja → «Efectivo de la caja *Caja 1*, turno N.º 15»;
  - efectivo fuera de caja → «Efectivo fuera de la caja (no tocó ninguna caja)»;
  - transferencia, Nequi, Daviplata, tarjeta → el medio y su **referencia**.
  - Factura o recibo del tercero, si se anotó.
- **Quién lo registró**.
- **Anulado:** fecha, quién, motivo y «el efectivo volvió a la caja» si salió de una.
- **Firmas:** «Entregó» y «Recibió» (con espacio para nombre y documento).
- Pie: «Documento interno de egreso. No es factura electrónica.» y «Hecho por NEXOON».

Lo que no aplica (pagado antes / saldo) no sale, porque el gasto se paga completo.

## Servidor

- Servicio nuevo `expenseDocument.service.js` con el mismo patrón de `layawayDocument.service.js`
  (pdfkit, `getBusiness`/`headerLines`, `getLogo`/`drawLogo`, `SIGNATURE`).
- Ruta `GET /expenses/:id/receipt?format=tirilla|carta` → PDF. Permiso: ver o registrar gastos;
  revisa la sucursal del gasto igual que el detalle (403 si no es suyo).
- Los datos se leen del gasto guardado, así que el comprobante sale **igual cada vez**. Si después se
  editan los datos del tercero o del negocio, la reimpresión muestra los actuales (como las ventas).
- Sin migración.
- Pruebas `node:test`: PDF de tirilla y carta (es un PDF, trae el número), formato inválido 400,
  sucursal ajena 403, general sin acceso a todas 403, sin permiso 403, anulado se imprime, quien
  solo registra también puede.

## Pantallas (Gastos)

- **Al registrar un gasto:** en lugar de solo cerrar, se abre el **detalle del gasto recién
  registrado** con los botones del comprobante.
- **Detalle del gasto:** botones **«Imprimir tirilla»**, **«Imprimir carta»** y **«Descargar PDF»**
  (`GTO-000027.pdf`), como en las ventas.
- La lista de gastos sigue buscando por el número.

## Fuera de alcance

- Abonos o pagos parciales de un gasto.
- Enviar el comprobante por correo al tercero (se puede agregar después, como en las ventas).
