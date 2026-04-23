-- =============================================================================
-- SIAA — Seed de Datos Iniciales
-- Última actualización: 2026-04-23
-- Contiene: tipos de propiedad, plantillas de notificación y empresa por defecto.
-- Ejecutar DESPUÉS de schema.sql en una instancia nueva.
-- =============================================================================


-- =============================================================================
-- 1. TIPOS DE PROPIEDAD
-- =============================================================================
INSERT INTO public.property_types (name, label) VALUES
    ('building',         'Edificio Residencial'),
    ('commercial_center','Centro Comercial'),
    ('standalone',       'Unidad Independiente'),
    ('multifamily',      'Conjunto Residencial'),
    ('office_building',  'Torre de Oficinas')
ON CONFLICT (name) DO NOTHING;


-- =============================================================================
-- 2. PLANTILLAS DE NOTIFICACIÓN
-- =============================================================================
INSERT INTO public.notification_templates (name, title, message, type) VALUES

-- Bienvenida
(
    'Bienvenida Nuevo Inquilino',
    'Bienvenido a su nuevo hogar - {propiedad}',
    'Estimado {inquilino}, nos complace darle la bienvenida a {propiedad}. Estamos a su disposición para cualquier duda o consulta. Esperamos que disfrute su estancia.',
    'info'
),

-- Recordatorio de pago
(
    'Recordatorio de Pago de Canon',
    'Aviso de Pago - Mes de {mes}',
    'Hola {inquilino}, le recordamos que el pago del canon correspondiente al mes de {mes} por un monto de {monto} vence el día {vencimiento}. Por favor realizar el pago a tiempo para evitar recargos.',
    'payment'
),

-- Confirmación de pago recibido
(
    'Recibo de Pago',
    'Confirmación de Pago Recibido',
    'Hemos recibido su pago de {monto} correspondiente al concepto de {concepto}. Gracias por su puntualidad.',
    'payment'
),

-- Mantenimiento programado
(
    'Mantenimiento Programado',
    'Aviso de Mantenimiento en Áreas Comunes',
    'Informamos que el día {fecha} se realizarán trabajos de mantenimiento en {area}. Es posible que se presenten interrupciones breves en el servicio. Agradecemos su comprensión.',
    'info'
),

-- Aviso de mora
(
    'Aviso de Falta de Pago',
    'URGENTE: Pago Pendiente Detectado',
    'Estimado {inquilino}, nuestros registros indican que no hemos recibido el pago de su canon del mes de {mes}. Le solicitamos regularizar su situación a la brevedad para evitar acciones adicionales.',
    'alert'
),

-- Renovación de contrato
(
    'Propuesta de Renovación',
    'Vencimiento de Contrato Próximo',
    'Su contrato de arrendamiento está próximo a vencer el día {fecha_fin}. Nos gustaría conversar sobre la renovación del mismo. Por favor póngase en contacto con la administración.',
    'contract'
),

-- Inspección de unidad
(
    'Aviso de Inspección',
    'Programación de Inspección Rutinaria',
    'Como parte de nuestro programa de mantenimiento, necesitamos realizar una breve inspección de su unidad el día {fecha} a las {hora}. Por favor confirme su disponibilidad.',
    'contract'
),

-- Reunión de residentes
(
    'Convocatoria a Reunión',
    'Invitación a Reunión de Residentes',
    'Se convoca a todos los residentes a una reunión general el día {fecha} para tratar temas de interés común sobre el funcionamiento del edificio/conjunto.',
    'info'
),

-- Normas de convivencia
(
    'Recordatorio de Normas',
    'Recordatorio sobre Normas de Ruido y Convivencia',
    'Recordamos a todos los residentes la importancia de respetar los horarios de silencio y las normas de convivencia en las áreas comunes para el bienestar de todos.',
    'info'
),

-- Aviso de suspensión de servicios
(
    'Aviso de Suspensión',
    'AVISO URGENTE: Suspensión de Servicios',
    'Debido a la falta de pago acumulada, nos vemos en la obligación de notificarle sobre la posible suspensión de servicios/acceso el día {fecha} si no se regulariza la deuda total de {deuda}.',
    'alert'
)

ON CONFLICT DO NOTHING;


-- =============================================================================
-- 3. EMPRESA POR DEFECTO
-- =============================================================================
INSERT INTO public.companies (name, rif, address, phone, email)
SELECT 'Escritorio Legal', 'J-12345678-9', 'Av. Principal, Torre Empresarial', '+58 212 555-5555', 'admin@escritorio.legal'
WHERE NOT EXISTS (SELECT 1 FROM public.companies);
