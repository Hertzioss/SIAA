-- Archivo de inserción de plantillas de ejemplo (Seed Data)
-- Ejecutar en Supabase SQL Editor

INSERT INTO public.notification_templates (name, title, message, type) VALUES
-- 1. Bienvenida General
(
    'Bienvenida Nuevo Inquilino',
    'Bienvenido a su nuevo hogar - {propiedad}',
    'Estimado {inquilino}, nos complace darle la bienvenida a {propiedad}. Estamos a su disposición para cualquier duda o consulta. Esperamos que disfrute su estancia.',
    'info'
),
-- 2. Aviso de Cobro / Renta
(
    'Recordatorio de Pago de Renta',
    'Aviso de Pago - Mes de {mes}',
    'Hola {inquilino}, le recordamos que el pago de la renta correspondiente al mes de {mes} por un monto de {monto} vence el día {vencimiento}. Por favor realizar el pago a tiempo para evitar recargos.',
    'payment'
),
-- 3. Confirmación de Pago Recibido
(
    'Recibo de Pago',
    'Confirmación de Pago Recibido',
    'Hemos recibido su pago de {monto} correspondiente al concepto de {concepto}. Gracias por su puntualidad.',
    'payment'
),
-- 4. Aviso de Mantenimiento
(
    'Mantenimiento Programado',
    'Aviso de Mantenimiento en Áreas Comunes',
    'Informamos que el día {fecha} se realizarán trabajos de mantenimiento en {area}. Es posible que se presenten interrupciones breves en el servicio. Agradecemos su comprensión.',
    'info'
),
-- 5. Aviso de Mora (Primer Aviso)
(
    'Aviso de Falta de Pago',
    'URGENTE: Pago Pendiente Detectado',
    'Estimado {inquilino}, nuestros registros indican que no hemos recibido el pago de su renta del mes de {mes}. Le solicitamos regularizar su situación a la brevedad para evitar acciones adicionales.',
    'alert'
),
-- 6. Renovación de Contrato
(
    'Propuesta de Renovación',
    'Vencimiento de Contrato Próximo',
    'Su contrato de arrendamiento está próximo a vencer el día {fecha_fin}. Nos gustaría conversar sobre la renovación del mismo. Por favor póngase en contacto con la administración.',
    'contract'
),
-- 7. Inspección de Unidad
(
    'Aviso de Inspección',
    'Programación de Inspección Rutinaria',
    'Como parte de nuestro programa de mantenimiento, necesitamos realizar una breve inspección de su unidad el día {fecha} a las {hora}. Por favor confirme su disponibilidad.',
    'contract'
),
-- 8. Reunión de Condominio / Vecinos
(
    'Convocatoria a Reunión',
    'Invitación a Reunión de Residentes',
    'Se convoca a todos los residentes a una reunión general el día {fecha} para tratar temas de interés común sobre el funcionamiento del edificio/conjunto.',
    'info'
),
-- 9. Normas de Convivencia
(
    'Recordatorio de Normas',
    'Recordatorio sobre Normas de Ruido y Convivencia',
    'Recordamos a todos los residentes la importancia de respetar los horarios de silencio y las normas de convivencia en las áreas comunes para el bienestar de todos.',
    'info'
),
-- 10. Aviso de Corte de Servicios (Alerta Crítica)
(
    'Aviso de Suspensión',
    'AVISO URGENTE: Suspensión de Servicios',
    'Debido a la falta de pago acumulada, nos vemos en la obligación de notificarle sobre la posible suspensión de servicios/acceso el día {fecha} si no se regulariza la deuda total de {deuda}.',
    'alert'
);
