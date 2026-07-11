<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/luishrz/siaa/main/frontend/public/escritorio-legal-dark.svg">
  <img alt="Escritorio Legal" src="https://raw.githubusercontent.com/luishrz/siaa/main/frontend/public/escritorio-legal.svg">
</picture>

Plataforma integral para la administración de propiedades de alquiler. Gestiona edificios, unidades, inquilinos, contratos, cobros, gastos, propietarios y reportes desde un solo lugar, con portales de autoservicio para inquilinos y propietarios.

---

## Características

### Módulos principales

| Módulo | Descripción |
|---|---|
| **Dashboard** | Centro de control con estadísticas de propiedades, inquilinos activos, cobros mensuales, gráficos de ocupación/ingresos y alertas |
| **Propiedades y Unidades** | Registro de edificios/comerciales, unidades (apto, oficina, local, depósito), pisos, áreas, montos de alquiler y estado (disponible/ocupado/mantenimiento) |
| **Inquilinos** | Registro completo con cédula/RIF, contacto, fecha de nacimiento, estado (solvente/moroso) y vinculación a cuenta de usuario |
| **Contratos** | Vinculación de unidad con inquilino, fechas de inicio/fin, montos, depósitos, carga de PDF firmado; estado automático (activo/vencido) |
| **Cobros y Conciliación** | Inquilinos reportan pagos con comprobante; administrador aprueba/rechaza con notificaciones. Soporta transferencia, efectivo, Zelle, PagoMóvil. Doble moneda (USD/VES) con tasa de cambio |
| **Recibos de Pago** | Recibos imprimibles tamaño media carta con logo del propietario, datos del inquilino, tipo de propiedad y desglose financiero |
| **Gastos** | Gastos por propiedad (mantenimiento, servicios, impuestos, otros) con seguimiento de estado |
| **Propietarios** | Persona natural o empresa con cuentas bancarias (ahorro/corriente/internacional), beneficiarios, logos personalizados |
| **Reportes** | Balance ingresos/gastos, morosidad, estados de cuenta del propietario (con envío por correo), rendimiento de propiedad, histórico de unidades, listado de inquilinos, estados de cuenta del inquilino, operativos, mantenimiento, detalle de contratos. Exportables a Excel y PDF |
| **Notificaciones** | Centro de notificaciones en la aplicación con tipos: pago, alerta, informativo, contrato. Estado leído/no leído |
| **Mantenimiento** | Solicitudes de mantenimiento con niveles de prioridad (bajo/medio/alto/urgente) y seguimiento de estado |
| **Comunicaciones** | Creación y envío de comunicaciones usando plantillas predefinidas |
| **Tasa de Cambio** | Consulta automática de la tasa BCV a través de DolarAPI |
| **Correo Electrónico** | Notificaciones automáticas vía Resend para confirmaciones de pago, estados de cuenta, credenciales, etc. |

### Roles y portales

| Rol | Acceso |
|---|---|
| **Administrador** | Acceso completo a todos los módulos |
| **Operador** | Acceso operativo a todas las funcionalidades |
| **Inquilino** | Portal de autoservicio: reportar pagos, ver historial, imprimir recibos, solicitar mantenimiento, notificaciones |
| **Propietario** | Dashboard de sus propiedades, reportes financieros, estados de cuenta, morosidad, unidades vacantes |

---

## Tecnologías

| Capa | Tecnología |
|---|---|
| **Frontend** | Next.js 16, React 19, TypeScript |
| **Estilos** | Tailwind CSS v4, shadcn/ui, Radix UI |
| **Tablas** | TanStack React Table v8 |
| **Gráficos** | Recharts |
| **Formularios** | React Hook Form + Zod |
| **PDF** | jsPDF + jspdf-autotable, react-to-print |
| **Excel** | SheetJS (xlsx) |
| **Backend / BD** | Supabase (PostgreSQL + RLS) |
| **Autenticación** | Supabase Auth |
| **Almacenamiento** | Supabase Storage |
| **Correo** | Resend |
| **Tasa de cambio** | DolarAPI (BCV) |
| **Paquetería** | pnpm |

---

## Estructura del proyecto

```
├── frontend/               # Aplicación Next.js
│   ├── app/                # App Router (páginas y API routes)
│   │   ├── (auth)/         # Inicio de sesión, registro, recuperación
│   │   ├── (pages)/        # Panel admin, portal inquilino, portal propietario
│   │   └── api/            # Endpoints de correo, pagos, inquilinos
│   ├── components/         # Componentes React reutilizables
│   ├── hooks/              # Custom hooks (23 hooks)
│   ├── lib/                # Utilidades (Supabase, Resend, PDF)
│   ├── services/           # Servicios (tasa de cambio)
│   ├── types/              # Definiciones TypeScript
│   └── actions/            # Server Actions
├── database_migrations/    # Esquema SQL, seed data, parámetros
│   ├── schema.sql          # 21 tablas, RLS, triggers, storage
│   ├── seed.sql            # Datos iniciales
│   └── params.sql          # Creación de admin y sincronización
└── Docs/                   # Manuales de usuario
    ├── MANUAL_ADMIN.md
    ├── MANUAL_OWNER.md
    └── MANUAL_TENANT.md
```

---

## Requisitos

- Node.js 20+
- pnpm
- Supabase proyecto (base de datos, autenticación, storage)
- Cuenta en Resend (correos transaccionales)

## Configuración

1. Clonar el repositorio e instalar dependencias:

```bash
cd frontend
pnpm install
```

2. Copiar `.env.example` a `.env` y configurar las variables de entorno:

```env
NEXT_PUBLIC_SUPABASE_URL=tu_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
RESEND_API_KEY=tu_resend_key
```

3. Ejecutar las migraciones en la base de datos de Supabase:

```bash
# Ejecutar en orden:
# 1. database_migrations/schema.sql
# 2. database_migrations/seed.sql
# 3. database_migrations/params.sql
```

4. Iniciar el servidor de desarrollo:

```bash
pnpm dev
```

---

## Licencia

MIT &copy; 2025
