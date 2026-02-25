# Escritorio Legal - Sistema Integral

Manual de Usuario (Administrador)

Bienvenido a **SIAA**, el Sistema Integral de Administración de Alquileres. Este manual le guiará paso a paso por todas las funcionalidades de la plataforma.

---

## Índice

1. [Dashboard (Panel Principal)](#1-dashboard-panel-principal)
2. [Gestión de Propiedades](#2-gestión-de-propiedades)
3. [Gestión de Inquilinos](#3-gestión-de-inquilinos)
4. [Contratos](#4-contratos)
5. [Pagos y Conciliación](#5-pagos-y-conciliación)
6. [Recibos de Pago](#6-recibos-de-pago)
7. [Ingresos y Egresos](#7-ingresos-y-egresos)
8. [Propietarios](#8-propietarios)
9. [Reportes](#9-reportes)
10. [Comunicaciones y Plantillas](#10-comunicaciones-y-plantillas)
11. [Gestión de Usuarios](#11-gestión-de-usuarios)
12. [Centro de Notificaciones](#12-centro-de-notificaciones)
13. [Configuración del Sistema](#13-configuración-del-sistema)

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
   - Defina: Nombre (Apt 101), Tipo (Apartamento, Oficina, Local o Depósito), Piso, y Canon Base.
5. **Asignar Propietario**:
   - En la lista de propiedades se muestra el propietario asociado.
   - Puede vincular al propietario y su porcentaje de participación.

## 3. Gestión de Inquilinos

Base de datos de personas que alquilan.

1. Vaya a **Inquilinos**.
2. Presione **+ Registrar Inquilino**.
3. Campos requeridos: Nombre Completo, Documento de Identidad (C.I./RIF), Correo (importante para el acceso) y Teléfono.
4. **Perfil del Inquilino**: Al hacer clic en un nombre, verá su historial de contratos, saldo y documentos.
5. **Contrato desde Inquilino**: Puede crear o editar el contrato directamente desde la ficha del inquilino.

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
2. Verá una tabla con todos los reportes recibidos. Puede filtrar por estado: **Pendiente**, **Aprobado** o **Rechazado**.
3. **Columnas disponibles**:
   - Inquilino, Unidad, Monto, Moneda, Tasa, Referencia, Fecha de Pago, Estado.
4. **Revisión**:
   - Observe la columna **Referencia** para verificar en su banco.
   - Si hay comprobante adjunto, haga clic en el icono de archivo para verlo.
   - Verifique **Monto**, **Moneda** (USD/VES) y **Tasa**.
5. **Acción**:
   - ✅ **Aprobar**: Si el dinero está en cuenta. Esto registra el ingreso y notifica al inquilino.
   - ❌ **Rechazar**: Si no encuentra el pago o hay error en el monto. Puede agregar una nota explicando el motivo.
6. **Exportar**: Puede exportar la tabla de pagos a Excel con todas las columnas visibles.
7. **Editar Pago**:
   - Si un inquilino cometió un error en la referencia o el monto, puede hacer clic en el botón de **Editar** (icono de lápiz) en la fila del pago.
   - Corrija los datos necesarios en el formulario y guarde los cambios. Esto facilitará la conciliación posterior.

## 6. Recibos de Pago

Cada pago aprobado genera un recibo imprimible.

1. En la tabla de **Pagos**, haga clic en el botón **Recibo** junto al pago deseado.
2. Se abrirá automáticamente el diálogo de impresión del navegador.
3. **Contenido del Recibo**:
   - **Encabezado**: Logo del propietario (o del sistema si no tiene), nombre del propietario y RIF.
   - **Datos del Consignante**: Nombre, Cédula/RIF del inquilino.
   - **Tipo de Inmueble**: Se muestra automáticamente según el tipo registrado (Apartamento, Oficina, Local o Depósito).
   - **Propietario(s)**: Nombre y RIF de cada propietario vinculado.
   - **Observación**: Concepto del pago.
   - **Detalles financieros**:
     - Fecha del depósito.
     - Monto en Bolívares y número de referencia.
     - Monto en Divisa y tasa de cambio.
     - Subtotal desglosado (Bolívares + Divisas).
     - Total general expresado en Bolívares.
   - **Pie de página**: Fecha/hora de impresión, datos de la empresa administradora (nombre, teléfono, RIF) y sitio web.
4. **Logo en el recibo**: Se prioriza el logo del propietario. Si no tiene, se usa el logo configurado en el sistema.

## 7. Ingresos y Egresos

Registre entradas y salidas de dinero para mantener las cuentas claras.

### Pestaña Egresos

1. Vaya a **Ingresos y Egresos**, pestaña **Egresos**.
2. Haga clic en **Registrar Egreso**.
3. **Categoría**:
   - **Mantenimiento**: Reparaciones, pintura (asociado a Propiedad).
   - **Impuestos / Servicios**: Pagos fijos.
   - **Retiro de Propietario**: Dinero transferido al dueño del inmueble.
   - **Otros**: Use la casilla para especificar cualquier otro concepto.
4. Indique el **Monto** y la fecha.
5. Estos gastos se descontarán en los reportes financieros.

### Pestaña Ingresos

1. Vaya a la pestaña **Ingresos**.
2. Haga clic en **Registrar Ingreso**.
3. Registre ingresos adicionales del propietario que no provengan del alquiler directo (por ejemplo, reembolsos, depósitos especiales, etc.).

## 8. Propietarios

Gestión de los dueños de los inmuebles.

1. Vaya a **Propietarios** -> **Registrar Dueño**.
2. Ingrese sus datos personales: Nombre, RIF/Cédula, Teléfono, Email.
3. **Logo del Propietario**: Puede subir el logo del propietario, el cual aparecerá en los recibos de pago.
4. Para vincularlo a una propiedad, edite la propiedad y agregue al propietario en la sección "Beneficiarios", indicando su % de participación (Ej. 100% si es único dueño).

## 9. Reportes

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
5. **Enviar por Correo (Estado de Cuenta Propietarios)**:
   - Una vez generado el reporte de propietarios, verá un botón **Enviar**.
   - Al hacer clic, se desplegará una lista de los propietarios incluidos en el reporte.
   - Seleccione al propietario deseado para enviarle un correo automático con el resumen de su estado de cuenta directamente desde el sistema.

## 10. Comunicaciones y Plantillas

Gestione los mensajes predefinidos para correos y notificaciones.

1. Vaya a **Comunicaciones** en el menú lateral.
2. **Plantillas**: Aquí puede crear, editar o eliminar plantillas para diferentes propósitos (cobros, alertas, contratos).
3. **Uso**: Al seleccionar "Usar Plantilla", el sistema cargará el contenido predefinido, permitiéndole enviarlo rápidamente como un comunicado a través de las notificaciones.

## 11. Gestión de Usuarios

Controle el acceso de los diferentes actores al sistema.

1. Vaya a **Usuarios**.
2. **Personal Administrativo**: Gestione las cuentas de Administradores y Operadores.
3. **Inquilinos y Propietarios**: Verifique qué inquilinos y propietarios tienen acceso habilitado al portal.
4. **Acciones**: Puede registrar nuevos usuarios, editar roles o restablecer contraseñas según sea necesario.

## 12. Centro de Notificaciones

Monitoree la actividad del sistema y envíe comunicados.

1. Vaya a **Notificaciones** (icono de campana).
2. **Bandeja de Entrada**: Vea todas las alertas automáticas generadas por el sistema (ej. nuevos pagos reportados).
3. **Redactar Comunicado**: Permite enviar un mensaje masivo o individual a los usuarios del sistema.
4. **Estado**: Marque las notificaciones como leídas o elimínelas para mantener limpia su bandeja.

## 13. Configuración del Sistema

Personalice la información de la empresa administradora.

1. Vaya a **Configuración** (icono de engranaje o sección "Cuenta").
2. **Empresa**: Gestione los datos y el logo de la empresa administradora.
3. **Logo de la Empresa**: Suba el logo de su empresa. Se usará como respaldo en los recibos cuando el propietario no tenga logo propio.
4. **Datos de la Empresa**: Configure el nombre, RIF y teléfono. Estos datos aparecen en el pie de página de los recibos impresos.
5. **Configuración de Perfil**: Actualice su nombre de usuario y correo de administrador.

---

**Soporte Técnico**: Para asistencia adicional, contacte al administrador del sistema.
