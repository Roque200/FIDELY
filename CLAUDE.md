# CLAUDE.md — Sistema de Tarjetas de Lealtad para Cafeterías

## Qué es el proyecto
SaaS multi-tenant de tarjetas de lealtad para cafeterías. Cada cafetería crea su programa (ej. "compra 9, el 10 es gratis"). El cliente final guarda su tarjeta en Apple Wallet o Google Wallet escaneando un QR, sin descargar ninguna app. El barista sella y canjea desde una web app (PWA) escaneando el QR de la tarjeta, y la tarjeta se actualiza sola en el celular del cliente.

Etapa actual: MVP. Ya está definido el esquema de base de datos (`supabase/schema.sql`). Todavía no hay código de la app.

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
- El dueño solo puede editar columnas visuales de `cafeterias` (column grants), no `plan` ni `estado_suscripcion`.
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
- Aviso de privacidad (ley mexicana de protección de datos personales); `clientes.acepta_privacidad`.
- Cuenta de Apple Developer (de paga) y acceso a producción de Google Wallet.
- Definir el nombre y el dominio del producto (aparece como emisor en Wallet).

## Cómo trabajar conmigo (Roque)
- Háblame en español, informal.
- Cuando corrijas o cambies código, dame el archivo completo, no fragmentos.
- Un comando o paso a la vez, y espera mi confirmación antes de seguir.
- No generes código de pruebas, archivos de ejemplo ni manuales/documentación a menos que yo los pida.
- Cada vez que agregues o cambies algo en el programa, haz un debug exhaustivo antes de darlo por terminado: build, lint y tipos, levantar la app y probar el flujo de punta a punta contra un Supabase local con el `schema.sql`, incluyendo casos de error y permisos (RLS). Los scripts que uses para eso van fuera del repo y no se suben.
