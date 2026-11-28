# CLAUDE.md — Sistema de Tarjetas de Lealtad para Cafeterías

## Qué es el proyecto
SaaS multi-tenant de tarjetas de lealtad para cafeterías. Cada cafetería crea su programa (ej. "compra 9, el 10 es gratis"). El cliente final guarda su tarjeta en Apple Wallet o Google Wallet escaneando un QR, sin descargar ninguna app. El barista sella y canjea desde una web app (PWA) escaneando el QR de la tarjeta, y la tarjeta se actualiza sola en el celular del cliente.

Etapa actual: MVP en construcción, publicado en Vercel (`https://fidely-nine.vercel.app`). Ya funciona: login por rol, alta de cafeterías con link de invitación al dueño (`/admin`), programas con límite por plan y diseño de tarjeta por programa (`/panel`), registro público del cliente con su tarjeta web (`/c/[slug]` → `/t/[codigo]`) y escáner del barista para sellar y canjear (`/barista`, instalable como app), Google Wallet (guardar y actualización tras sellos, canjes y cambios de diseño) y sección Clientes (`/panel/clientes`: búsqueda, sellos, historial y reenvío del link de la tarjeta por WhatsApp o correo, que es como se recupera una tarjeta perdida; el registro público NO muestra tarjetas ya existentes), Sucursales y Usuarios (`/panel/sucursales`, `/panel/usuarios`: el dueño invita solo baristas con link, sucursal opcional que se asigna sola si hay una; sucursales y baristas solo se desactivan, no se borran) y "Olvidé mi contraseña" (`/login/recuperar` explica a quién pedirlo; el dueño genera el link para sus baristas en Usuarios y el super admin para el dueño en `/admin`; se manda por WhatsApp porque aún no hay correo propio). Apple Wallet ya está programado (`/api/wallet/apple/pase/[codigo]` y el web service en `/api/wallet/apple/v1/...`, con avisos por APNs tras sellos, canjes y cambios de diseño), pero falta activarlo con el certificado real de la cuenta de Apple Developer en las variables `APPLE_*` de Vercel; sin ellas el botón no aparece.

## Stack (decidido)
- Next.js (App Router, TypeScript), con frontend y backend (API routes / Route Handlers) en un solo proyecto.
- Supabase: PostgreSQL, Auth (para dueños, baristas y super admin) y Storage (logos).
- Vercel para el deploy.
- Apple Wallet: `passkit-generator` (Node) para crear y firmar los `.pkpass`, más el web service de PassKit para las actualizaciones y push vía APNs.
- Google Wallet: API oficial (Loyalty Class por programa y Loyalty Object por tarjeta) con el JWT firmado para el botón "Guardar en Google Wallet".
- Escáner QR del barista: `html5-qrcode` o `@zxing` (está por definir cuál).
- Pagos: Stripe o Mercado Pago (está por definir, después del MVP).

## Roles
- Super admin (el dueño de la plataforma): ve todas las cafeterías y gestiona planes y suscripciones. Tabla `super_admins`.
- Dueño (`staff.rol = 'dueno'`): configura el programa, el diseño de la tarjeta, las sucursales y los baristas, y ve estadísticas.
- Barista (`staff.rol = 'barista'`): solo escanea, sella y canjea.
- Cliente final: no tiene cuenta, su "cuenta" es la tarjeta en su cartera.

## Arquitectura multi-tenant
- Una sola BD con `cafeteria_id` en las tablas y RLS activado en todas.
- Helpers SQL: `mi_cafeteria_id()`, `es_dueno()`, `es_admin()`.
- El staff solo lee clientes, tarjetas y movimientos. Los sellos y canjes solo pasan por las funciones RPC `registrar_sello(p_codigo, p_sucursal_id)` y `canjear_premio(p_codigo, p_sucursal_id)`, que validan la suscripción, la sucursal, el límite diario (según `zona_horaria` de la cafetería) y registran en `movimientos`.
- El dueño solo puede editar columnas visuales de `cafeterias` (column grants), no `plan`, `estado_suscripcion` ni `max_programas`.
- `cafeterias.max_programas` (default 1) limita los programas activos por cafetería; un trigger lo valida y solo el super admin lo sube.
- El backend usa la `service_role` key (se salta RLS) para:
  - el registro público de clientes en `/c/[slug]`
  - la creación y firma de las tarjetas (Apple y Google)
  - el web service de Apple (`apple_dispositivos`, `apple_registros`)
  - las altas de staff (invitar usuario en Supabase Auth y luego insertar en `staff`)
- Nunca exponer la `service_role` key ni los certificados al cliente.

## Wallet: decisiones
- Apple: un solo Pass Type ID y certificado de la plataforma para todas las cafeterías. Cada pass lleva el logo, los colores y el nombre de su cafetería. `serial_apple` y `token_apple` viven en `tarjetas`. `tarjetas.actualizado_en` (con trigger) sirve para `passesUpdatedSince`.
- Google: una sola cuenta de emisor. `programas.google_class_id` y `tarjetas.google_object_id`.
- El QR del pass contiene `tarjetas.codigo`.
- Sin NFC en el MVP (en Apple requiere un permiso especial), solo QR.
- Los certificados y llaves van en variables de entorno de Vercel.

## Rutas previstas (MVP)
- `/c/[slug]`: landing pública de registro del cliente, con los botones de Apple y Google Wallet.
- `/panel`: panel del dueño (dashboard, programa, diseño con vista previa, sucursales, staff).
- `/barista`: PWA del escáner (sellar y canjear).
- `/admin`: super admin.
- `/api/wallet/apple/...`: generación del `.pkpass` y web service de PassKit (`/v1/devices/...`, `/v1/passes/...`, `/v1/log`).
- `/api/wallet/google/...`: generación del link "Guardar en Google Wallet" y actualización de objetos.

## Alcance del MVP
1. Un programa de sellos por cafetería (X sellos = 1 premio).
2. Registro del cliente por QR y tarjeta en Apple y Google Wallet.
3. Escáner del barista para sellar y canjear.
4. Actualización automática de la tarjeta tras cada sello o canje.
5. Panel básico con clientes, sellos dados y premios canjeados.

Después del MVP: notificaciones masivas, varias sucursales completas, niveles, cumpleaños, cobro recurrente, integración con punto de venta.

## Pendientes / riesgos conocidos
- Envío de la invitación al dueño por correo (hoy es link para copiar/WhatsApp); requiere servicio de correo propio (p. ej. Resend) y dominio.
- Cuando haya correo propio: mandar por correo las invitaciones y los links de cambio de contraseña (hoy se copian o van por WhatsApp).
- Aviso de privacidad (ley mexicana de protección de datos personales); `clientes.acepta_privacidad`.
- Cuenta de Apple Developer (de paga) y acceso a producción de Google Wallet.
- Definir el nombre y el dominio del producto (aparece como emisor en Wallet).

## Cómo trabajar conmigo (Roque)
- Háblame en español, informal.
- No me pegues en el chat el código que cambiaste; los cambios van directo al repo. Solo si yo te pido un archivo, dámelo completo, no fragmentos. Los scripts SQL que yo deba correr en Supabase sí van en el chat.
- Un comando o paso a la vez, y espera mi confirmación antes de seguir.
- No generes código de pruebas, archivos de ejemplo ni manuales/documentación a menos que yo los pida.
- Cada vez que agregues o cambies algo en el programa, haz un debug exhaustivo antes de darlo por terminado: build, lint y tipos, levantar la app y probar el flujo de punta a punta contra un Supabase local con el `schema.sql`, incluyendo casos de error y permisos (RLS). Los scripts que uses para eso van fuera del repo y no se suben.
  - Probar tanto con `next start` (producción) como con `next dev` (así la uso yo), revisando errores del navegador y del servidor.
  - Probar el schema en un Supabase sin permisos automáticos en `public` (como los proyectos nuevos), no solo en el local por defecto.
  - Si cambias el schema, dame también el script para aplicar el cambio sobre mi base existente, y que se pueda correr aunque una parte ya esté aplicada.
