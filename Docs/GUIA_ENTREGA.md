# SIAA - Guía de Entrega al Cliente

Documento de referencia para la entrega del sistema SIAA al cliente final.

---

## Documentación Incluida

| Documento          | Dirigido a    | Descripción                                                          |
| ------------------ | ------------- | -------------------------------------------------------------------- |
| `MANUAL_ADMIN.md`  | Administrador | Guía completa de todas las funcionalidades del sistema               |
| `MANUAL_TENANT.md` | Inquilinos    | Guía de autogestión: reportar pagos, ver historial, imprimir recibos |
| `MANUAL_OWNER.md`  | Propietarios  | Interpretación de reportes financieros y gestión de propiedades      |

---

## Módulos del Sistema

### 1. Dashboard

Panel con estadísticas, gráficos de ocupación/recaudación y alertas.

### 2. Propiedades y Unidades

- Registro de propiedades (edificios, centros comerciales)
- Unidades con tipos: **Apartamento**, **Oficina**, **Local**, **Depósito**
- Vinculación de propietarios con porcentaje de participación

### 3. Inquilinos

- Registro con C.I./RIF, email y teléfono
- Creación/edición de contratos directamente desde la ficha del inquilino

### 4. Contratos

- Asociación Propiedad → Unidad → Inquilino
- Estados automáticos: Activo / Vencido

### 5. Pagos y Conciliación

- Recepción de reportes de pago con comprobante
- Aprobación/Rechazo con notificación al inquilino
- Exportación a Excel
- **Recibos de pago** imprimibles con desglose completo

### 6. Recibos de Pago

Formato imprimible tamaño media carta (8.5" × 5.5") que incluye:

- Logo del propietario (con fallback al logo del sistema)
- Datos del consignante (nombre, C.I./RIF)
- Tipo de inmueble detectado automáticamente
- Propietario(s) con RIF
- Desglose financiero: Bolívares, Divisas, Tasa, Total
- Pie de página con datos de la empresa, fecha/hora de impresión y web

### 7. Ingresos y Egresos

- Pestaña **Egresos**: Mantenimiento, impuestos, retiros de propietario
- Pestaña **Ingresos**: Ingresos adicionales del propietario

### 8. Propietarios

- Registro con logo personalizable
- Vinculación a propiedades con % de participación

### 9. Reportes

- Ingresos y Egresos (balance mensual)
- Morosidad
- Estado de Cuenta de Propietarios

### 10. Configuración del Sistema

- Logo de la empresa (respaldo para recibos)
- Nombre, RIF y teléfono (aparecen en pie de recibos)

---

## Roles de Usuario

| Rol               | Acceso                                                                 |
| ----------------- | ---------------------------------------------------------------------- |
| **Administrador** | Acceso completo a todos los módulos                                    |
| **Inquilino**     | Portal de autogestión: reportar pagos, historial, recibos, solicitudes |
| **Propietario**   | Dashboard de propiedades, reportes financieros, estado de cuenta       |

---

## Datos Técnicos

| Componente     | Tecnología                             |
| -------------- | -------------------------------------- |
| Frontend       | Next.js 16 + React + Tailwind CSS      |
| Base de Datos  | Supabase (PostgreSQL)                  |
| Autenticación  | Supabase Auth                          |
| Almacenamiento | Supabase Storage (logos, comprobantes) |
| Notificaciones | Email vía Nodemailer                   |

---

## Configuración Post-Entrega

1. **Logo del Sistema**: Ir a Configuración → subir logo de la empresa
2. **Datos de la Empresa**: Configurar nombre, RIF y teléfono
3. **Propietarios**: Registrar cada propietario con su logo
4. **Propiedades**: Crear propiedades, unidades y vincular propietarios
5. **Inquilinos**: Registrar inquilinos y crear contratos

---

_Fecha de entrega: Febrero 2026_
_Versión: 1.0_
