# Plan: Diseños de temporada (Fase 25)

NexSuite y NexStore se visten según la temporada del año: Navidad, Año Nuevo, Halloween, Amor y Amistad, Día de la
Madre, Día del Padre e Independencia. Cada temporada tiene sus adornos, sus animaciones y un saludo con voz al entrar.
El resto del año se ven el diseño y las animaciones normales.

**Decisiones tomadas (2026-11-12):**

- **Temporadas:** Navidad y Año Nuevo, Halloween, Amor y Amistad, Día de la Madre, Día del Padre e Independencia.
- **Dónde:** en **todo**: el inicio de sesión, el sistema administrativo (todas las pantallas) y NexStore.
- **Cómo se activa:** **sola por la fecha**, y el **Developer manda**: en Configuración la deja automática, fuerza una o
  las apaga, y el cambio se ve para todos.
- **Por equipo:** cada persona puede quitarse los adornos y la voz en *Configuración* de su equipo, como el tema noche.
- **Saludo con voz:** «¡Jo, jo, jo! Bienvenido…» en Navidad, algo de miedo en Halloween, y así en cada una.

---

## Las temporadas (fechas de Colombia)

| Temporada | Fechas | Qué se ve | Saludo con voz |
| --- | --- | --- | --- |
| **Navidad** | 1 al 30 de diciembre | Nieve que cae, guirnalda de luces de colores en el encabezado, gorro navideño en el logo, copos en las tarjetas; tonos rojo, verde y dorado | «¡Jo, jo, jo! Bienvenido, Yeison. ¡Feliz Navidad!» |
| **Año Nuevo** | 31 de diciembre al 6 de enero | Fuegos artificiales al entrar, confeti dorado, brillos; tonos dorado y negro | «¡Feliz año nuevo, Yeison! Que este año vendamos mucho» |
| **Halloween** | 24 al 31 de octubre | Murciélagos volando, telarañas en las esquinas, calabaza en el logo, niebla suave abajo; tonos naranja y morado | «Ja, ja, ja… Bienvenido, Yeison… si te atreves» (voz más grave y lenta) |
| **Amor y Amistad** | La semana del tercer sábado de septiembre (lunes a domingo) | Corazones flotando, destellos; tonos rosado y rojo | «Bienvenido, Yeison. ¡Feliz amor y amistad!» |
| **Día de la Madre** | Los 7 días que terminan el segundo domingo de mayo | Pétalos y flores que caen; tonos rosado y lila | «¡Feliz día a todas las mamás! Bienvenido, Yeison» |
| **Día del Padre** | Los 7 días que terminan el tercer domingo de junio | Estrellas y destellos; tonos azul y gris | «¡Feliz día a todos los papás! Bienvenido, Yeison» |
| **Independencia** | 14 al 20 de julio | Banderines y confeti amarillo, azul y rojo; la bandera ondeando en el encabezado | «¡Feliz día de la independencia, Yeison! ¡Viva Colombia!» |
| **Normal** | El resto del año | El diseño de hoy, con su animación de entrada (el logo aparece y un saludo «Buenos días, Yeison» según la hora) | Sin voz |

Las fechas se calculan solas cada año, con la hora de Colombia. Si dos temporadas se cruzan, gana la de la fila de más
arriba.

## Cómo se ve en cada parte

- **Inicio de sesión:** el fondo y el logo con la temporada. Al darle *Ingresar*, una tarjeta de bienvenida animada
  (unos 3 segundos, se puede cerrar) y el saludo con voz.
- **Sistema administrativo** (todas las pantallas):
  - **Adornos suaves que no estorban para trabajar:** en el encabezado, el logo y el menú, más una capa de partículas
    (nieve, murciélagos, corazones…) detrás del contenido o en los bordes.
  - **Nunca tapan botones, tablas ni formularios**, y no se pueden tocar.
  - Ningún color cambia en lo importante: los botones, los montos y los avisos se ven igual.
- **NexStore:**
  - **Más llamativo:** la primera diapositiva de la portada es la de la temporada (por ejemplo, «¡Feliz Navidad! Pide tus
    regalos por WhatsApp»).
  - Adornos en el encabezado y las tarjetas, partículas, y los colores de acento de la temporada.
  - El saludo con voz suena al primer toque del cliente, una vez por visita.

## La voz

- **Es la del navegador**, gratis, sin servicios ni librerías, con una voz en español del equipo. Suena distinta en cada
  celular o computador.
- **Solo después de un toque:** los navegadores no dejan hablar antes de que la persona toque algo. En el sistema suena
  al darle *Ingresar*, una vez por sesión; en NexStore, al primer toque del cliente, una vez por visita.
- **Botón para silenciar:** un botón de bocina la silencia, y se recuerda en ese equipo.

## Control

- **Developer** (*Configuración → Temporadas*): **Automático** (por la fecha, viene así), **forzar** una temporada (para
  probarla o adelantarla) o **Apagado**. Lo ven todos al recargar. Lo cambia solo el rol Developer: el servidor lo revisa
  con el rol guardado, no con lo que mande la pantalla, y queda en la auditoría.
- **Cada equipo** (*Configuración → Este equipo*): «**Adornos de temporada**» sí/no y «**Voz de bienvenida**» sí/no.
- **Con «Animaciones reducidas»** los adornos quedan quietos y no hay voz.

## Servidor

- **Migración** (con tu autorización antes de aplicarla en desarrollo): en `businesssettings`, `seasonmode` (`auto`, el
  nombre de una temporada u `off`). Empieza en `auto` y no cambia ningún dato que ya exista.
- **Rutas:**

| Ruta | Quién | Qué hace |
| --- | --- | --- |
| `GET /api/v1/season` | Pública (la usan el inicio de sesión y NexStore) | Devuelve solo la temporada activa, por ejemplo `{ season: "christmas" }` |
| `PUT /api/v1/settings/season` | Solo el Developer | Cambia el modo; deja registro en la auditoría |

- `GET /shop` también trae la temporada.
- **Pruebas:**
  - el calendario de cada temporada de 2026 a 2030, con los domingos de mayo y junio y el tercer sábado de septiembre;
  - los cruces entre temporadas;
  - forzar y apagar;
  - que solo el Developer pueda cambiarlo.

## Pantallas (por partes)

1. **Motor de temporadas:**
   - una capa de partículas en CSS (solo movimiento y transparencia) con pocas partículas, que se detiene cuando la
     pestaña no se ve;
   - la tarjeta de bienvenida y la voz;
   - los ajustes por equipo y la pantalla del Developer.
2. **Los 7 diseños más el normal:** en el inicio de sesión, el sistema y NexStore, con la diapositiva de temporada.
3. **Revisión:** cada temporada en celular, tablet y computador, en claro y oscuro, con y sin «Animaciones reducidas»; que
   no se ponga lenta en un celular sencillo.

## Lo que no cambia

- Ninguna función del sistema, los datos ni los permisos de hoy.
- Las pantallas siguen funcionando igual con los adornos apagados.
- No se agregan librerías ni imágenes pesadas: los adornos son dibujos SVG y CSS.


## Música al entrar (reemplaza la voz)

Decisión del 2026-11-12: sin voces ni audios de bienvenida. Al entrar en temporada suena **una canción corta
(10 a 15 segundos)**, tocada en vivo por el navegador (`seasonMusic.js`, Web Audio): sin archivos, sin librerías,
sin costo y sin derechos de autor (melodías de dominio público o compuestas para NexSuite).

| Temporada | Canción | Instrumentos |
|---|---|---|
| Navidad | «Jingle Bells» (estribillo) | campanas, bajo y cascabeles de trineo |
| Halloween | Tocata en re menor (Bach) | órgano de iglesia con eco y un trueno |
| Año Nuevo | «Auld Lang Syne» | campanas, bajo y pólvora al final |
| Amor y Amistad | «Para Elisa» (Beethoven) | caja de música |
| Día de la Madre | Canción de cuna (Brahms) | caja de música y bajo suave |
| Día del Padre | Fanfarria propia | trompetas, bombo y redoblante |
| Independencia | Cumbia propia | flauta (gaita), guacharaca, tambor y bajo |

- Suena en el sistema al entrar (después de Ingresar) y en NexStore al primer toque del cliente; la tarjeta del
  saludo se queda mientras suena y su «×» la silencia.
- Por equipo: **Configuración → Música de bienvenida** (con música / en silencio). Con «Animaciones reducidas» no suena.
- El Developer puede escucharlas en **Configuración → Diseño de temporada** (botones ▶).
