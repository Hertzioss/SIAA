# Memoria de cambios

## 2026-10-26

- Reporte financiero por propietario: montos y tasas a 2 decimales, columna REFERENCIA, badge "Parte X de Y" solo cuando hay división, y tabla de ingresos con anchos fijos para impresión. Archivos: `frontend/components/reports/owner-financial-report.tsx`, `frontend/app/(pages)/(admin)/reports/owners/page.tsx`.
- Formato monetario VES a 2 decimales en reportes y estados de cuenta: `frontend/lib/utils.ts`, `frontend/components/reports/tenant-statement-report.tsx`, `frontend/components/reports/property-performance-report.tsx`, `frontend/hooks/use-owner-report.ts`, `frontend/hooks/use-tenant-statement.ts`.
- Badge "Parte X de Y" oculto cuando el pago no está dividido: `frontend/components/payment-receipt.tsx`, `frontend/components/payments/payment-action-dialog.tsx`, `frontend/app/(pages)/(admin)/payments/page.tsx`.
- Corregida la generación del reporte de propietarios: la tabla `expenses` no tiene `currency` ni `exchange_rate`, por lo que el select usa `*` y se asume USD con la tasa del pago/egreso de propietario más cercano. Mismo ajuste en rendimiento por propiedad y dashboards: `frontend/hooks/use-owner-report.ts`, `frontend/hooks/use-reports.ts`, `frontend/hooks/use-dashboard-data.ts`, `frontend/actions/owner-dashboard.ts`.
- Creado `AGENTS.md` con arquitectura, comandos, variables de entorno, convenciones y regla de registro en `MEMORY.md`.
