-- TABLA DE PLANTILLAS DE COMUNICACIÓN
CREATE TABLE IF NOT EXISTS public.notification_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('info', 'alert', 'payment', 'contract')),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;

-- Política de seguridad (Permitir todo a usuarios autenticados)
DROP POLICY IF EXISTS "Admins manage templates" ON public.notification_templates;

CREATE POLICY "Admins manage templates" ON public.notification_templates
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');
