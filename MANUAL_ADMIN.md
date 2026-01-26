# SIAA - Manual de Usuario (Administrador)

Bienvenido a **SIAA**, el Sistema Integral de Administración de Alquileres. Este manual le guiará paso a paso por todas las funcionalidades de la plataforma.

---

## Índice
1. [Dashboard (Panel Principal)](#1-dashboard-panel-principal)
2. [Gestión de Propiedades](#2-gestión-de-propiedades)
3. [Gestión de Inquilinos](#3-gestión-de-inquilinos)
4. [Contratos](#4-contratos)
5. [Pagos y Conciliación](#5-pagos-y-conciliación)
6. [Egresos y Gastos](#6-egresos-y-gastos)
7. [Propietarios](#7-propietarios)
8. [Reportes](#8-reportes)

---

## 1. Dashboard (Panel Principal)
Al iniciar sesión, verá el "Dashboard". Esta pantalla es su centro de comando.
- **Tarjetas Superiores**: Muestran estadísticas rápidas (Total Propiedades, Inquilinos Activos, Pagos del Mes).
- **Gráficos**: Visualización de ocupación y recaudación.
- **Alertas**: Lista de tareas pendientes como contratos próximos a vencer o pagos por aprobar.

## 2. Gestión de Propiedades
Para registrar edificios, casas o locales.
1. Vaya a **Propiedades** en el menú lateral.
2. Haga clic en **+ Nueva Propiedad**.
3. Complete el formulario:
   - **Nombre**: Ej. "Residencias El Parque".
   - **Tipo**: Edificio, Centro Comercial, etc.
   - **Dirección**: Ubicación exacta.
4. **Agregar Unidades**:
   - Dentro de la propiedad creada, busque la sección "Unidades".
   - Haga clic en **Agregar Unidad**.
   - Defina: Nombre (Apt 101), Tipo (Apartamento), Piso, y Canon Base.

## 3. Gestión de Inquilinos
Base de datos de personas que alquilan.
1. Vaya a **Inquilinos**.
2. Presione **+ Registrar Inquilino**.
3. Campos requeridos: Nombre Completo, Documento de Identidad (C.I./RIF), Correo (importante para el acceso) y Teléfono.
4. **Perfil del Inquilino**: Al hacer clic en un nombre, verá su historial de contratos, saldo y documentos.

## 4. Contratos
El núcleo legal del alquiler.
1. Vaya a **Contratos** y seleccione **Crear Contrato**.
2. **Selección**: Elija la Propiedad -> Unidad -> Inquilino.
3. **Plazos**: Defina Fecha Inicio y Fecha Fin.
4. **Montos**:
   - **Canon**: Monto mensual.
   - **Depósito**: Garantía (si aplica).
5. **Archivos**: Puede subir el PDF del contrato firmado para respaldo digital.
6. El sistema cambiará automáticamente el estado a **Activo** o **Vencido** según la fecha actual.

## 5. Pagos y Conciliación
Aquí se procesan los reportes de pago enviados por los inquilinos.
1. Vaya a **Pagos**.
2. Verá una tabla con todos los reportes recibidos con estado **Pendiente**.
3. **Revisión**:
   - Observe la columna **Referencia** para verificar en su banco.
   - Si hay comprobante adjunto, haga clic en el icono de archivo para verlo.
   - Verifique **Monto**, **Moneda** (USD/VES) y **Tasa**.
4. **Acción**:
   - ✅ **Aprobar**: Si el dinero está en cuenta. Esto registra el ingreso y notifica al inquilino.
   - ❌ **Rechazar**: Si no encuentra el pago o hay error en el monto. Puede agregar una nota explicando el motivo.

## 6. Egresos y Gastos
Registre salidas de dinero para mantener las cuentas claras.
1. Vaya a **Egresos**.
2. Haga clic en **Registrar Egreso**.
3. **Categoría**:
   - **Mantenimiento**: Reparaciones, pintura (asociado a Propiedad).
   - **Impuestos / Servicios**: Pagos fijos.
   - **Retiro de Propietario**: Dinero transferido al dueño del inmueble.
   - **Otros**: Use la casilla para especificar cualquier otro concepto.
4. Indique el **Monto** y la fecha.
5. Estos gastos se descontarán en los reportes financieros.

## 7. Propietarios
Gestión de los dueños de los inmuebles.
1. Vaya a **Propietarios** -> **Registrar Dueño**.
2. Ingrese sus datos personales.
3. Para vincularlo a una propiedad, edite la propiedad y agregue al propietario en la sección "Beneficiarios", indicando su % de participación (Ej. 100% si es único dueño).

## 8. Reportes
Generador de informes en PDF y Excel.
1. Vaya a **Reportes**.
2. Seleccione el tipo de informe:
   - **Ingresos y Egresos**: Balance general del mes. Muestra cuánto entró y cuánto salió.
   - **Morosidad**: Lista de inquilinos con deuda pendiente.
   - **Estado de Cuenta Propietarios**: Informe detallado para enviar a los dueños, mostrando sus ingresos (recibidos de alquileres) menos sus gastos particulares.
3. **Filtros**:
   - Seleccione el **Año** y los **Meses** a consultar.
   - Puede filtrar por una Propiedad específica o generar un reporte global.
4. Presione **Generar** y luego use los botones para **Imprimir** o **Descargar Excel**.

---
**Soporte Técnico**: Para asistencia adicional, contacte al administrador del sistema.
