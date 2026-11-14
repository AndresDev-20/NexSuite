# Guía de despliegue de NexSuite

Paso a paso para poner NexSuite a funcionar de verdad, **para una o varias empresas en el mismo VPS**:

- el **servidor (API) y la base de datos** en un VPS propio con Ubuntu;
- las **pantallas** en Netlify;
- **respaldos** automáticos cada noche, dentro y fuera del VPS;
- **actualización automática**: haces `git push` y el VPS se actualiza solo.

> **Nunca pegues contraseñas, el `TOKEN_SECRET`, llaves privadas ni el `.env` en chats, correos ni en el
> repositorio.** En esta guía los valores secretos aparecen como `<…>`: los inventas tú y solo viven en
> el VPS (o en los *Secrets* de GitHub).

Tiempo aproximado: 3 a 4 horas la primera vez; cada empresa nueva después, unos 40 minutos.

---

## Índice

| # | Paso | Se hace |
|---|---|---|
| 0 | Cómo queda todo armado | — |
| 1 | Comprar el VPS (qué elegir en cada pantalla) | Una vez |
| 2 | Dominio y DNS | Una vez por empresa |
| 3 | Preparar el VPS (usuario, llaves, firewall, swap) | Una vez |
| 4 | Instalar Node, MySQL, Nginx, PM2, certbot y rclone | Una vez |
| 5 | Ajustar MySQL, PM2 y Nginx (límites del servidor) | Una vez |
| 6 | Empresa nueva: base de datos | Por empresa |
| 7 | Empresa nueva: código desde GitHub | Por empresa |
| 8 | Empresa nueva: `.env` | Por empresa |
| 9 | Empresa nueva: crear la base y el primer usuario | Por empresa |
| 10 | Empresa nueva: arrancar con PM2 | Por empresa |
| 11 | Empresa nueva: Nginx y HTTPS | Por empresa |
| 12 | Empresa nueva: pantallas en Netlify | Por empresa |
| 13 | Empresa nueva: respaldos | Por empresa |
| 14 | Actualización automática con `git push` (GitHub Actions) | Una vez |
| 15 | Actualizar a mano (si hace falta) | Cuando toque |
| 16 | Varias empresas: qué cambia en cada una | Referencia |
| 17 | Límites y vigilancia | Referencia |
| 18 | Si algo falla | Referencia |
| 19 | Lista final antes de entregar | Por empresa |

---

## 0. Cómo queda todo armado

```
                      ┌──────────────────────── VPS (Ubuntu 24.04) ─────────────────────────┐
 Navegador ──HTTPS──▶ │ Nginx ─┬─ api.empresa1.com ──▶ PM2: empresa1-api (puerto 8080) ──┐   │
 (pantallas en        │        └─ api.empresa2.com ──▶ PM2: empresa2-api (puerto 8081) ──┤   │
  Netlify)            │                                                                  ▼   │
                      │                          MySQL 8: db_empresa1 · db_empresa2          │
                      │  ~/respaldos/empresa1 · ~/respaldos/empresa2 ──rclone──▶ Google Drive │
                      └──────────────────────────────────────────────────────────────────────┘
 GitHub (push a main) ──SSH──▶ actualiza todas las empresas del VPS
 GitHub (push a main) ───────▶ Netlify reconstruye las pantallas de cada empresa
```

- **Un solo código para todas las empresas.** Cada empresa tiene su propia **carpeta**, su **base de
  datos**, su **`.env`** (claves distintas), su **proceso** en PM2, su **puerto**, su **dominio**, su
  **sitio de Netlify** y sus **respaldos**. Los datos de una empresa nunca se mezclan con los de otra.
- Las carpetas siguen siempre este patrón (la guía lo usa en todos los comandos):

```
/home/nexsuite/
├── apps/
│   ├── empresa1/BackEnd      ← código + .env de la empresa 1
│   └── empresa2/BackEnd      ← código + .env de la empresa 2
├── respaldos/
│   ├── empresa1/
│   └── empresa2/
└── logs/
```

En los comandos, cambia **`empresa1`** por un nombre corto de la empresa, en minúsculas y sin espacios
ni tildes (por ejemplo `carlos`). Ese mismo nombre se usa en la base, el usuario de MySQL y PM2.

---

## 1. Comprar el VPS (qué elegir en cada pantalla)

Esta guía usa **Hostinger** (los planes KVM), pero sirve igual para DigitalOcean, Contabo u otro: lo que
importa es que sea un **VPS con Ubuntu 24.04 LTS** y acceso `root` por SSH.

### 1.1 ¿Qué plan?

Lo que gasta NexSuite (medido en la base): **un millón de registros ocupa de 0,5 a 1 GB**. Un negocio con
4 sucursales y unas 300 ventas diarias llega a eso en **más o menos un año**. Cada empresa usa de 150 a
300 MB de RAM para su servidor; MySQL, que se comparte, de 1 a 4 GB.

| Empresas en el VPS | Mínimo | Cómodo | Plan de Hostinger que sirve |
|---|---|---|---|
| 1 | 1 vCPU · 2 GB RAM · 40 GB | 2 vCPU · 4 GB · 50 GB | KVM 1 o KVM 2 |
| 2 a 3 | 2 vCPU · 4 GB · 80 GB | 2 vCPU · 8 GB · 100 GB | **KVM 2** |
| 4 a 8 | 4 vCPU · 8 GB · 150 GB | 4 vCPU · 16 GB · 200 GB | **KVM 4** |

> **KVM 4 (4 vCPU, 16 GB, 200 GB NVMe, 16 TB):** sirve de sobra para 2 empresas y deja espacio para varias
> más. Con 2 empresas usarías unos 3–5 GB de RAM y 15–25 GB de disco el primer año. Compara precio con el
> KVM 2: para solo 2 empresas también alcanza. Las especificaciones de cada plan pueden cambiar:
> revísalas en la página del proveedor el día que compres.

### 1.2 Lo que te pregunta al comprar

Los nombres exactos de los botones cambian con el tiempo; esto es lo que debes elegir:

| Te pregunta | Elige | Por qué |
|---|---|---|
| **Periodo** (1, 12, 24 meses…) | El que te sirva de precio. Ojo: el precio con descuento se paga **todo al inicio** y al **renovar** se cobra el precio normal (en el KVM 4: 933.600 COP por 24 meses y luego 97.900 COP al mes) | Lo más largo sale más barato por mes |
| **Ubicación del servidor** (*location / data center*) | **Estados Unidos** (de preferencia la costa este) o **Brasil (São Paulo)** | Son los más cercanos a Colombia: las pantallas responden más rápido |
| **Tipo de instalación** (*OS / Panel / Application*) | **Sistema operativo limpio** (*Plain OS*) | No elijas plantillas con panel (cPanel, CloudPanel, Coolify…) ni aplicaciones (WordPress, n8n…): esta guía instala todo y un panel ocuparía puertos y memoria |
| **Sistema operativo** | **Ubuntu 24.04 LTS** (64 bits) | Es con el que está probada la guía; LTS = actualizaciones de seguridad por 5 años |
| **Contraseña de root** | Una **muy larga** (20+ caracteres), guardada en un gestor de contraseñas | Solo la usas la primera vez; luego se apaga el acceso con contraseña (paso 3) |
| **Llave SSH** (si la pide) | Pega tu **llave pública** (`~/.ssh/id_ed25519.pub` de tu computador; si no tienes, créala con `ssh-keygen -t ed25519`) | Entrar con llave es mucho más seguro que con contraseña |
| **Nombre del servidor** (*hostname*) | Algo como `vps-nexsuite` | Solo para reconocerlo |
| **Copias automáticas del proveedor** (*backups*) | Si son **gratis semanales**, déjalas. Las **diarias pagas no son necesarias** | NexSuite ya hace respaldos diarios propios dentro y fuera del VPS (paso 13) |
| **Escáner de malware** (Monarx u otro) | Puedes dejarlo; no estorba | |
| **Dominio** que ofrecen con el plan | Opcional: puedes comprarlo ahí o en otro lado | Lo necesitas igual (paso 2) |
| Correo, IA del panel, otros extras | **No** | NexSuite no los usa |

### 1.3 Después de pagar

1. En el panel del proveedor copia la **IP pública** del VPS (algo como `203.0.113.10`).
2. Si el panel tiene **firewall propio**, déjalo apagado o permite solo los puertos **22, 80 y 443**. El
   firewall del VPS (`ufw`) se configura en el paso 3; tener los dos con reglas distintas confunde.
3. Prueba que entras desde tu computador: `ssh root@IP_DEL_VPS`.

---

## 2. Dominio y DNS

Cada empresa necesita una dirección para su API con HTTPS. Opciones:

- Un dominio por empresa: `api.empresa1.com`, `api.empresa2.com`.
- Un solo dominio tuyo con subdominios: `empresa1-api.tudominio.com`, `empresa2-api.tudominio.com`.

En el panel donde compraste el dominio (zona DNS) crea por cada empresa:

| Tipo | Nombre | Valor |
|---|---|---|
| **A** | `api` (o `empresa1-api`) | IP del VPS |
| **CNAME** (opcional, pantallas con tu dominio) | `app` (o `empresa1`) | la dirección `…netlify.app` del sitio de esa empresa (paso 12) |

Espera a que responda: `ping api.empresa1.com` debe mostrar la IP del VPS (puede tardar de minutos a
unas horas).

---

## 3. Preparar el VPS

Entra por SSH como `root` y crea el usuario con el que vas a trabajar:

```bash
adduser nexsuite
usermod -aG sudo nexsuite
```

Copia tu llave SSH a ese usuario. **Desde tu computador**:

```bash
ssh-copy-id nexsuite@IP_DEL_VPS
```

Desde ahora entra siempre como `nexsuite` (`ssh nexsuite@IP_DEL_VPS`). Luego, en el VPS:

```bash
# Actualizaciones de seguridad automáticas
sudo apt update && sudo apt upgrade -y
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure --priority=low unattended-upgrades

# Firewall: solo SSH, HTTP y HTTPS (MySQL y los puertos 8080, 8081… NO quedan abiertos a internet)
sudo ufw allow OpenSSH
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable

# Zona horaria (registros, caja automática y respaldos en hora de Colombia)
sudo timedatectl set-timezone America/Bogota

# Memoria de reserva (swap) de 4 GB: evita que MySQL se caiga si un día se llena la RAM
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
echo 'vm.swappiness=10' | sudo tee /etc/sysctl.d/99-swappiness.conf
sudo sysctl --system

# Carpetas de trabajo
mkdir -p ~/apps ~/respaldos ~/logs
```

**Cerrar el acceso con contraseña** (antes, en **otra terminal**, comprueba que entras con tu llave):

```bash
sudo nano /etc/ssh/sshd_config.d/99-nexsuite.conf
```

```
PasswordAuthentication no
PermitRootLogin no
```

```bash
sudo systemctl restart ssh
```

---

## 4. Instalar Node, MySQL, Nginx, PM2, certbot y rclone

```bash
# Node 22 LTS (la versión con la que se desarrolló y probó NexSuite)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs git
node -v   # v22.x

# MySQL 8, Nginx, certbot (HTTPS gratis) y rclone (copia de los respaldos fuera del VPS)
sudo apt install -y mysql-server nginx certbot python3-certbot-nginx rclone

# PM2: mantiene los servidores andando y los levanta al reiniciar el VPS
sudo npm install -g pm2

# Seguridad de MySQL: contraseña fuerte para root, sin usuarios anónimos ni base de prueba
sudo mysql_secure_installation
```

---

## 5. Ajustar MySQL, PM2 y Nginx (límites del servidor)

Se hace **una vez**, sirve para todas las empresas.

### 5.1 MySQL: cuánta memoria usa y cuántas conexiones acepta

```bash
sudo nano /etc/mysql/mysql.conf.d/nexsuite.cnf
```

```ini
[mysqld]
# Memoria para tener los datos en RAM (lo más importante para la velocidad).
# Regla: ~25 % de la RAM del VPS. 16 GB → 4G · 8 GB → 2G · 4 GB → 1G · 2 GB → 512M
innodb_buffer_pool_size = 4G
# Conexiones al tiempo para TODAS las empresas (cada servidor usa hasta 5; respaldos y migraciones 1–2)
max_connections = 150
# Solo escucha dentro del VPS
bind-address = 127.0.0.1
# Consultas lentas al registro, para encontrar qué mejorar
slow_query_log = 1
long_query_time = 2
```

```bash
sudo systemctl restart mysql
```

### 5.2 PM2: que no crezcan los registros

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 20M     # cada archivo de registro hasta 20 MB
pm2 set pm2-logrotate:retain 14        # guarda 14 archivos viejos y borra los demás
pm2 set pm2-logrotate:compress true
```

### 5.3 Nginx: límite de peticiones por IP (protección extra)

El servidor de NexSuite ya limita peticiones e intentos de inicio de sesión. Esta capa extra frena
abusos antes de que lleguen a Node:

```bash
sudo nano /etc/nginx/conf.d/nexsuite-limites.conf
```

```nginx
# Hasta 20 peticiones por segundo por IP (con ráfagas de 40). Una sucursal con varios equipos
# comparte IP: este número les alcanza de sobra.
limit_req_zone $binary_remote_addr zone=nexsuite_api:10m rate=20r/s;
limit_req_status 429;
```

```bash
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

(La zona se usa en el archivo de cada empresa, paso 11.)

---

## 6. Empresa nueva: base de datos

Cada empresa tiene **su base y su usuario de MySQL**, que solo puede tocar esa base:

```bash
sudo mysql
```

```sql
CREATE DATABASE db_empresa1 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'empresa1'@'localhost' IDENTIFIED BY '<contraseña-de-la-base-empresa1>';
GRANT ALL PRIVILEGES ON db_empresa1.* TO 'empresa1'@'localhost';
-- Límite de conexiones de esta empresa: si una falla, no deja sin conexiones a las demás
ALTER USER 'empresa1'@'localhost' WITH MAX_USER_CONNECTIONS 20;
FLUSH PRIVILEGES;
EXIT;
```

Inventa una contraseña distinta por empresa (`openssl rand -base64 24` te da una).

---

## 7. Empresa nueva: código desde GitHub

El proyecto está en **dos repositorios**: el del servidor (`NexSuite__Backend`) va al VPS; el de las
pantallas (`NexSuite`) va a Netlify (paso 12). **Antes de desplegar, sube a GitHub (commit y push) lo
último de los dos.**

### 7.1 Llave para que el VPS lea el repositorio (si es privado)

Se hace **una sola vez** (sirve para todas las empresas, porque todas usan el mismo repositorio):

```bash
ssh-keygen -t ed25519 -f ~/.ssh/github_nexsuite -N "" -C "vps-nexsuite"
cat ~/.ssh/github_nexsuite.pub
```

Copia lo que muestra y agrégalo en GitHub → repositorio `NexSuite__Backend` → *Settings → Deploy keys →
Add deploy key* (**sin** marcar *Allow write access*: el VPS solo lee). Luego dile a SSH que use esa llave
con GitHub:

```bash
cat >> ~/.ssh/config <<'EOF'
Host github.com
  IdentityFile ~/.ssh/github_nexsuite
  IdentitiesOnly yes
EOF
chmod 600 ~/.ssh/config
ssh -T git@github.com    # escribe "yes"; debe decir que te autenticaste (sin acceso a shell)
```

### 7.2 Clonar

```bash
mkdir -p ~/apps/empresa1
cd ~/apps/empresa1
git clone git@github.com:AndresDev-20/NexSuite__Backend.git BackEnd
cd BackEnd
npm ci          # instala todo (sequelize-cli hace falta para las migraciones)
```

> `npm ci` (no `npm ci --omit=dev`): las migraciones usan `sequelize-cli`, que está entre las
> dependencias de desarrollo.

---

## 8. Empresa nueva: el `.env`

```bash
cd ~/apps/empresa1/BackEnd
cp .env.example .env
nano .env
chmod 600 .env
```

| Variable | Valor | Nota |
|---|---|---|
| `NODE_ENV` | `production` | Usa las variables `DB_*` sin sufijo y exige `CORS_ORIGINS` |
| `APP_NAME` | `empresa1-api` | Nombre del proceso en PM2. **Distinto en cada empresa** |
| `APP_MAX_MEMORY` | `400M` | Si el servidor pasa de esa memoria, PM2 lo reinicia |
| `PORT` | `8080` (empresa 1), `8081` (empresa 2)… | **Distinto en cada empresa.** Solo lo ve Nginx |
| `TRUST_PROXY` | `1` | Hay un proxy delante (Nginx): así se lee la IP real (auditoría y límites) |
| `CORS_ORIGINS` | `https://empresa1.netlify.app` | La dirección exacta de las pantallas de **esta** empresa (varias, separadas por coma) |
| `TOKEN_SECRET` | `<secreto>` | Mínimo 32 caracteres: `openssl rand -hex 48`. **Distinto en cada empresa**: con el mismo, una sesión de una empresa podría servir en otra |
| `DB_HOST` / `DB_PORT` | `127.0.0.1` / `3306` | |
| `DB_NAME` / `DB_USERNAME` / `DB_PASSWORD` | `db_empresa1` / `empresa1` / `<contraseña-de-la-base-empresa1>` | Los del paso 6 |
| `DB_SSL` | `false` | MySQL está en el mismo VPS; si la base estuviera en otro servidor, déjalo en `true` |
| `DB_STORAGE_LIMIT_MB` | por ejemplo `20000` | Tope del medidor de **Configuración → Espacio y archivo** (avisa al acercarse) |
| `BUSINESS_NAME`, `BUSINESS_NIT`, `BUSINESS_PHONE`, `RECEIPT_FOOTER` | opcionales | Solo de respaldo: los datos del negocio se llenan en **Configuración → Datos del negocio** |
| `SMTP_*`, `MAIL_FROM` | opcionales | Para enviar comprobantes por correo (ver los comentarios del `.env.example`) |
| `BACKUP_DIR` | `/home/nexsuite/respaldos/empresa1` | **Una carpeta por empresa** |
| `BACKUP_KEEP_DAYS` / `BACKUP_KEEP_MONTHS` | `30` / `12` | |
| `BACKUP_REMOTE` | `drive:nexsuite-respaldos/empresa1` | El destino de rclone del paso 13 (vacío = sin copia afuera) |
| `WHATSAPP_*`, `ANTHROPIC_API_KEY`, `CHATBOT_*` | ver `docs/CHATBOT-WHATSAPP.md` | Solo si esa empresa usa el chatbot de WhatsApp. Cada empresa con su número y su llave |

Las variables `*_DEV` y `*_TEST` no se usan en producción.

---

## 9. Empresa nueva: crear la base y el primer usuario

```bash
cd ~/apps/empresa1/BackEnd
npm run db:setup
```

Corre todas las migraciones y crea los permisos y los roles del sistema (Administrador y Developer).

Luego crea **tu usuario** (Developer); en una base nueva nadie puede entrar todavía:

```bash
npm run setup:first-user -- --cc <tu-cédula> --nombres "<Nombres>" --apellidos "<Apellidos>" --correo <tu-correo>
```

Muestra **una sola vez** una contraseña temporal: entra con ella y cámbiala en Administrativo →
Usuarios. Con `--admin` crea el primer **Administrador** (por ejemplo, el dueño de la empresa); los demás
usuarios se crean desde la aplicación.

> ¿Quieres llevar los datos que ya cargaron en desarrollo? Saca un respaldo en tu equipo
> (`npm run backup`), cópialo al VPS (`scp archivo.sql.gz nexsuite@IP:~/`) y restáuralo (paso 13.3)
> **en vez** de `db:setup`. Revisa antes que no lleve datos de prueba.

---

## 10. Empresa nueva: arrancar con PM2

```bash
cd ~/apps/empresa1/BackEnd
pm2 start deploy/ecosystem.config.js     # toma APP_NAME y la memoria del .env
pm2 save
curl http://127.0.0.1:8080/health          # el PORT de esta empresa
```

Debe responder `{"status":"ok","database":"ok",…}`. Comandos útiles:

```bash
pm2 status                  # todas las empresas y su memoria
pm2 logs empresa1-api       # el registro de una empresa
pm2 monit                   # CPU y memoria en vivo
```

**Solo la primera vez en el VPS** (para que todo arranque solo si el VPS se reinicia):

```bash
pm2 startup        # copia y ejecuta la línea que te muestra (empieza con sudo)
pm2 save
```

PM2 corre **una sola instancia por empresa** a propósito: la caja automática (abrir a las 8:00 y dejar
de vender a las 19:00) va dentro del servidor y no debe duplicarse.

---

## 11. Empresa nueva: Nginx y HTTPS

```bash
sudo cp ~/apps/empresa1/BackEnd/deploy/nginx/nexsuite-api.conf /etc/nginx/sites-available/empresa1-api
sudo nano /etc/nginx/sites-available/empresa1-api
```

En ese archivo cambia:

1. `server_name api.tudominio.com;` → la dirección de esta empresa (`api.empresa1.com`).
2. `proxy_pass http://127.0.0.1:8080;` → el `PORT` de esta empresa (8080, 8081…).
3. Dentro de `location / {` agrega como primera línea el límite del paso 5.3:

```nginx
        limit_req zone=nexsuite_api burst=40 nodelay;
```

Luego actívalo y saca el certificado HTTPS:

```bash
sudo ln -s /etc/nginx/sites-available/empresa1-api /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d api.empresa1.com     # HTTPS gratis; elige redirigir http a https
```

Comprueba desde tu computador: `https://api.empresa1.com/health` → `"status":"ok"`. El certificado se
renueva solo.

---

## 12. Empresa nueva: pantallas en Netlify

El sitio de **demostración** sigue como está. Cada empresa tiene **su propio sitio** de Netlify con el
**mismo repositorio** de las pantallas:

1. Netlify → *Add new site* → *Import an existing project* → GitHub.
2. Elige el repositorio de las **pantallas** (`AndresDev-20/NexSuite`). **Branch to deploy**: `main` ·
   **Base directory**: vacío · **Build command**: `npm run build` · **Publish directory**: `dist`.
3. *Site configuration → Environment variables*:
   - `VITE_PRODUCTION_SITE` = `true` (apaga el demo que activa `netlify.toml` solo en este sitio)
   - `VITE_REACT_APP_URL` = `https://api.empresa1.com/api/v1` (la API **de esta empresa**)
   - `NODE_VERSION` = `22`
4. *Site configuration → Site details → Change site name*: `empresa1` (queda `https://empresa1.netlify.app`).
   Con tu dominio: *Domain management → Add a domain* (`app.empresa1.com`, con el CNAME del paso 2).
5. Despliega. Pon la dirección del sitio en `CORS_ORIGINS` del `.env` de esa empresa y luego
   `pm2 reload empresa1-api --update-env`.
6. Entra con tu usuario del paso 9. En **Configuración → Datos del negocio** llena nombre, NIT,
   teléfono y demás: salen en los comprobantes.

> Las variables `VITE_*` quedan visibles en el navegador: nunca pongas secretos ahí.

> **Se actualiza solo:** cada `git push` a `main` del repositorio de las pantallas reconstruye **todos**
> los sitios que lo usan (el demo y el de cada empresa).

---

## 13. Empresa nueva: respaldos

### 13.1 Copia fuera del VPS (rclone) — una vez

```bash
rclone config
```

Crea un destino (*remote*), por ejemplo `drive` de tipo Google Drive, y sigue las instrucciones
(autoriza desde tu navegador). Prueba: `rclone lsd drive:`. En el `.env` de cada empresa:
`BACKUP_REMOTE=drive:nexsuite-respaldos/empresa1` (cada una en su subcarpeta).

### 13.2 Probar y programar

```bash
cd ~/apps/empresa1/BackEnd
npm run backup        # debe decir ✅ Respaldo… y ☁️ Copia fuera del servidor…
crontab -e
```

Una línea **por empresa**, con horas distintas para que no se crucen:

```cron
30 2 * * * cd /home/nexsuite/apps/empresa1/BackEnd && /usr/bin/npm run backup >> /home/nexsuite/logs/respaldos-empresa1.log 2>&1
45 2 * * * cd /home/nexsuite/apps/empresa2/BackEnd && /usr/bin/npm run backup >> /home/nexsuite/logs/respaldos-empresa2.log 2>&1
```

Queda así para cada empresa:

- `~/respaldos/empresa1/diarios`: los de los últimos 30 días.
- `~/respaldos/empresa1/mensuales`: el primero de cada mes, durante 12 meses.
- La misma carpeta copiada en su `BACKUP_REMOTE`.

### 13.3 Restaurar

**Revisar un respaldo sin tocar la base real** (recomendado una vez al mes):

```bash
cd ~/apps/empresa1/BackEnd
npm run restore -- --archivo ~/respaldos/empresa1/diarios/<archivo>.sql.gz --base revision_respaldo --confirmar revision_respaldo --crear
```

Revisa las tablas en `revision_respaldo` y bórrala después (`DROP DATABASE revision_respaldo;`).

**Volver la base real a un respaldo** (solo si de verdad hace falta):

```bash
pm2 stop empresa1-api
npm run restore -- --archivo ~/respaldos/empresa1/diarios/<archivo>.sql.gz --confirmar db_empresa1
pm2 start empresa1-api
```

Antes de reemplazar la base, el script guarda cómo estaba en `antes-de-restaurar` dentro de la carpeta de
respaldos, por si hay que devolverse. Se pierde todo lo que se hizo después de ese respaldo.

---

## 14. Actualización automática con `git push` (GitHub Actions)

El repositorio del servidor trae `.github/workflows/deploy.yml`. Con cada **push a `main`**, GitHub entra
al VPS por SSH y, **empresa por empresa** (todas las carpetas `~/apps/*/BackEnd`):

1. trae el código nuevo (`git pull`);
2. saca un **respaldo** de su base;
3. instala dependencias (`npm ci`);
4. aplica **solo las migraciones nuevas**;
5. reinicia sin cortar (`pm2 reload`);
6. comprueba `/health`.

Si algo falla, se detiene, **no toca las empresas que siguen**, el flujo queda en rojo en la pestaña
*Actions* y GitHub te avisa por correo. Viene **apagado**: se enciende así (una vez):

### 14.1 Llave para que GitHub entre al VPS

Es otra llave, distinta a la del paso 7.1 (esa es para que el VPS lea GitHub; esta para que GitHub entre
al VPS). En el VPS:

```bash
ssh-keygen -t ed25519 -f ~/github-actions -N "" -C "github-actions"
cat ~/github-actions.pub >> ~/.ssh/authorized_keys
cat ~/github-actions        # la llave PRIVADA: cópiala completa (de -----BEGIN a -----END)
```

Y desde **tu computador** saca la huella del VPS (para que GitHub sepa que habla con tu servidor):

```bash
ssh-keyscan -t ed25519 IP_DEL_VPS
```

### 14.2 Configurar el repositorio en GitHub

GitHub → `NexSuite__Backend` → *Settings → Secrets and variables → Actions*:

| Pestaña | Nombre | Valor |
|---|---|---|
| **Secrets** | `VPS_HOST` | IP del VPS |
| **Secrets** | `VPS_USER` | `nexsuite` |
| **Secrets** | `VPS_SSH_KEY` | la llave privada del 14.1 |
| **Secrets** | `VPS_KNOWN_HOSTS` | lo que mostró `ssh-keyscan` |
| **Secrets** (opcional) | `VPS_PORT` | solo si SSH no está en el 22 |
| **Variables** | `DEPLOY_ENABLED` | `true` |

Cuando lo hayas pegado en GitHub, **borra la llave privada del VPS**: `rm ~/github-actions` (la pública
queda en `authorized_keys`).

### 14.3 Probar

GitHub → *Actions* → **Desplegar en el VPS** → *Run workflow*. Debe terminar en verde con
`✅ empresa1-api actualizado y respondiendo` por cada empresa.

### 14.4 Cómo trabajar desde ahora

- **`main` = producción.** Lo que subas a `main` llega a todas las empresas en 1–3 minutos.
- Antes de cada push: `npm test` en tu equipo (la suite completa en verde).
- Para cambios grandes trabaja en otra rama (`git checkout -b fase-29`) y únela a `main` cuando esté
  probada y verificada.
- Si un cambio trae servidor **y** pantallas: sube primero el **servidor** (espera el verde en *Actions*)
  y después las **pantallas**.
- Si el despliegue falla a mitad: la empresa que falló ya tiene su respaldo de ese momento. Revisa
  *Actions* y `pm2 logs`, corrige, y vuelve a subir (o usa el paso 15).
- **Apagar** las actualizaciones automáticas: cambia `DEPLOY_ENABLED` a `false`.

> Cada migración nueva viene descrita en `PROGRESS.md`: léela antes de subirla. Si un permiso nuevo debe
> llegar a los roles del sistema, después del despliegue corre `npm run seed:admin` en cada empresa (se
> puede correr las veces que haga falta).

---

## 15. Actualizar a mano (si hace falta)

Una empresa:

```bash
cd ~/apps/empresa1/BackEnd
git pull --ff-only
bash deploy/update.sh       # respaldo, npm ci, migraciones, pm2 reload y prueba de salud
```

Todas:

```bash
for dir in ~/apps/*/BackEnd; do git -C "$dir" pull --ff-only && bash "$dir/deploy/update.sh" || break; done
```

**Volver a la versión anterior** (si la nueva tiene un error y no hay migraciones nuevas):

```bash
cd ~/apps/empresa1/BackEnd
git log --oneline -5                   # busca el commit anterior
git checkout <commit-anterior>
bash deploy/update.sh
```

(Luego, cuando arregles el error y lo subas a `main`: `git checkout main` y `git pull`.) Si la versión
nueva **sí** traía migraciones, lo más seguro es restaurar el respaldo que el despliegue sacó justo antes
(paso 13.3).

Las pantallas: en Netlify → el sitio → *Deploys* → un despliegue anterior → *Publish deploy*.

---

## 16. Varias empresas: qué cambia en cada una

| | Empresa 1 | Empresa 2 | Empresa 3 |
|---|---|---|---|
| Carpeta | `~/apps/empresa1/BackEnd` | `~/apps/empresa2/BackEnd` | `~/apps/empresa3/BackEnd` |
| Base / usuario MySQL | `db_empresa1` / `empresa1` | `db_empresa2` / `empresa2` | `db_empresa3` / `empresa3` |
| `APP_NAME` | `empresa1-api` | `empresa2-api` | `empresa3-api` |
| `PORT` | `8080` | `8081` | `8082` |
| `TOKEN_SECRET` | uno | otro | otro |
| API | `api.empresa1.com` | `api.empresa2.com` | `api.empresa3.com` |
| Nginx | `sites-available/empresa1-api` | `…/empresa2-api` | `…/empresa3-api` |
| Netlify | sitio `empresa1` | sitio `empresa2` | sitio `empresa3` |
| `CORS_ORIGINS` | su sitio de Netlify | su sitio | su sitio |
| Respaldos | `~/respaldos/empresa1` · cron 2:30 | `~/respaldos/empresa2` · cron 2:45 | `~/respaldos/empresa3` · cron 3:00 |

**Para agregar una empresa nueva** repite los pasos **2, 6, 7.2, 8, 9, 10, 11, 12 y 13.2** con su nombre.
No hay que tocar nada de las demás, ni del flujo de GitHub: la detecta sola por su carpeta en `~/apps`.

**Para quitar una empresa:** `pm2 delete empresa1-api && pm2 save`, borra su archivo de Nginx (y
`sudo nginx -t && sudo systemctl reload nginx`), su línea del cron y su sitio de Netlify. **Antes** saca un
último respaldo y guárdalo fuera. La base y la carpeta se borran solo cuando estés seguro.

---

## 17. Límites y vigilancia

| Qué | Dónde se pone | Valor sugerido |
|---|---|---|
| Memoria de cada servidor | `APP_MAX_MEMORY` en el `.env` | `400M` (PM2 lo reinicia si se pasa) |
| Memoria de MySQL | `innodb_buffer_pool_size` (paso 5.1) | ~25 % de la RAM |
| Conexiones totales a MySQL | `max_connections` (paso 5.1) | `150` |
| Conexiones de cada empresa | `MAX_USER_CONNECTIONS` (paso 6) | `20` |
| Peticiones por IP | Nginx `limit_req` (pasos 5.3 y 11) + límites propios del servidor | 20 por segundo |
| Intentos de inicio de sesión | Ya vienen en el servidor | (bloquea por IP y por cédula) |
| Tamaño de archivos subidos | `client_max_body_size` en Nginx | `5m` (el Excel de productos pesa máximo 5 MB) |
| Espacio de la base | `DB_STORAGE_LIMIT_MB` + **Configuración → Espacio y archivo** | avisa al acercarse; el archivo de la auditoría libera espacio |
| Registros de PM2 | pm2-logrotate (paso 5.2) | 20 MB × 14 archivos |
| Respaldos | `BACKUP_KEEP_DAYS` / `BACKUP_KEEP_MONTHS` | 30 días / 12 meses |
| Memoria de reserva | swap (paso 3) | 4 GB |

**Revisar una vez por semana** (5 minutos):

```bash
pm2 status                       # todas online, sin muchos reinicios (columna ↺)
df -h /                          # disco: avisa si pasa del 80 %
free -h                          # memoria
tail -n 5 ~/logs/respaldos-*.log # el respaldo de anoche de cada empresa
sudo du -sh /var/lib/mysql/*     # cuánto ocupa cada base
```

Y en el panel del proveedor activa las **alertas** de CPU, RAM y disco si las ofrece.

**Cuándo subir de plan:** si la RAM usada pasa del 80 % casi siempre, si el disco pasa del 70 % o si
`pm2 status` muestra reinicios por memoria todos los días. En Hostinger se sube de plan desde el panel sin
reinstalar.

---

## 18. Si algo falla

| Síntoma | Qué revisar |
|---|---|
| `pm2 logs` dice «Configuración incompleta (production)» | Falta una variable del paso 8 (`DB_*`, `CORS_ORIGINS` o un `TOKEN_SECRET` de 32+ caracteres) |
| «No se pudo conectar a la base de datos» | Usuario, contraseña y nombre de la base; `DB_SSL=false`; `sudo systemctl status mysql` |
| `/health` responde 503 | El servidor anda pero la base no responde: `sudo systemctl restart mysql` y revisa el disco (`df -h`) |
| Dos empresas no arrancan juntas («address already in use») | Tienen el mismo `PORT` en el `.env`: cada una el suyo, y el mismo en su archivo de Nginx |
| `pm2 status` muestra una sola empresa | Tienen el mismo `APP_NAME`: cámbialo, `pm2 delete <nombre>` y vuelve a `pm2 start deploy/ecosystem.config.js` en cada carpeta |
| Las pantallas dicen «Network Error» o fallan todas las peticiones | `VITE_REACT_APP_URL` en ese sitio de Netlify (con `https://` y `/api/v1`) y que `CORS_ORIGINS` tenga la dirección exacta del sitio |
| Las pantallas de una empresa muestran datos de otra | Su sitio de Netlify apunta a la API de la otra (`VITE_REACT_APP_URL`) |
| Las pantallas reales muestran «Demostración · datos ficticios» | Falta `VITE_PRODUCTION_SITE=true` en ese sitio de Netlify; vuelve a desplegar |
| *Actions* en rojo: «Permission denied (publickey)» | `VPS_SSH_KEY` mal copiada (completa, con BEGIN/END) o la pública no está en `~/.ssh/authorized_keys` |
| *Actions* en rojo: «Host key verification failed» | `VPS_KNOWN_HOSTS` vacío o de otra IP: vuelve a sacar `ssh-keyscan -t ed25519 IP_DEL_VPS` |
| *Actions* en rojo en `git pull` | Alguien cambió archivos a mano en el VPS: `git -C ~/apps/empresa1/BackEnd status`, deshaz el cambio local y vuelve a correr |
| *Actions* no corre al hacer push | `DEPLOY_ENABLED` no está en `true` (Variables, no Secrets) o el push no fue a `main` |
| *Actions* en rojo en «Prueba de salud» | `pm2 logs empresa1-api`: el código nuevo no arranca; vuelve a la versión anterior (paso 15) |
| Respuestas «429 Too Many Requests» | Se pasó el límite de peticiones: revisa si es un abuso (`/var/log/nginx/access.log`) o sube `rate` en el paso 5.3 |
| La caja no abre sola a las 8:00 | `pm2 status` (debe estar *online*), la caja con «Abre sola» y sin «día sin abrir»; el reloj usa la hora de Colombia |
| Todos aparecen con la misma IP en la auditoría | `TRUST_PROXY=1` en el `.env` y `pm2 reload empresa1-api --update-env` |
| `npm run backup` dice «mysqldump: not found» | `sudo apt install mysql-client` o define `MYSQL_BIN_DIR` |
| El respaldo no llega a Drive | `rclone lsd drive:` y el log `~/logs/respaldos-empresa1.log` |
| Un certificado vencido | `sudo certbot renew --dry-run` |
| El VPS va lento | `pm2 monit` y `htop`: qué empresa consume; el registro de consultas lentas `/var/log/mysql/mysql-slow.log` |

---

## 19. Lista final antes de entregar (por empresa)

> El chatbot de WhatsApp (Fase 16) se conecta aparte, cuando el servidor ya está publicado: sigue
> `docs/CHATBOT-WHATSAPP.md`.

- [ ] `https://api.empresa1.com/health` responde `ok`.
- [ ] Las pantallas de la empresa cargan **sin** el aviso de demostración y se puede iniciar sesión.
- [ ] Contraseña temporal del primer usuario cambiada.
- [ ] Datos del negocio llenos en Configuración; un comprobante de prueba sale con ellos.
- [ ] Sucursales, cajas (horario y base del día) y usuarios creados con sus roles.
- [ ] `APP_NAME`, `PORT`, `TOKEN_SECRET`, base y carpeta de respaldos **distintos** a los de las otras empresas.
- [ ] `npm run backup` funciona y el respaldo aparece en su carpeta del destino de rclone.
- [ ] Su línea del cron de respaldos quedó programada (`crontab -l`).
- [ ] Probaste restaurar un respaldo en una base de revisión.
- [ ] Un push a `main` la actualiza sola (*Actions* en verde con su nombre).
- [ ] `pm2 startup` hecho: todo vuelve solo si se reinicia el VPS (pruébalo con `sudo reboot`).
