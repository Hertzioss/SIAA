-- =============================================================================
-- Fase 2 — Endurecimiento de Políticas RLS (Row Level Security)
-- =============================================================================
-- INSTRUCCIONES IMPORTANTES ANTES DE EJECUTAR EN SUPABASE SQL EDITOR:
--
-- PASO 0 (VERIFICACIÓN PREVIA — ejecutar primero solo este SELECT):
--   SELECT id, email, role FROM public.users WHERE role IN ('admin', 'operator');
--
-- Asegúrate de que TODOS tus usuarios administradores y operadores aparezcan
-- en esa lista con role = 'admin' u 'operator'. Si alguno falta o tiene otro rol:
--   UPDATE public.users SET role = 'admin' WHERE email = 'tu-admin@dominio.com';
--
-- Una vez verificado, ejecuta todo el script dentro de una transacción.
-- No modifica ni elimina ningún dato; únicamente reemplaza las políticas RLS.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Funciones auxiliares seguras (SECURITY DEFINER)
-- -----------------------------------------------------------------------------

-- Solo 'admin' y 'operator' (se elimina 'owner' que antes tenía privilegios de admin)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'operator')
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND role IN ('admin', 'operator')
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ID del inquilino autenticado (NULL si no es inquilino)
CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS UUID AS $$
  SELECT id FROM public.tenants WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ID del propietario autenticado (NULL si no es propietario)
CREATE OR REPLACE FUNCTION public.current_owner_id()
RETURNS UUID AS $$
  SELECT id FROM public.owners WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- -----------------------------------------------------------------------------
-- 2. Tabla: users (solo lectura propia o admin; escritura solo admin)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users view own profile" ON public.users;
DROP POLICY IF EXISTS "Admins manage users" ON public.users;

CREATE POLICY "Users view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "Admins manage users" ON public.users
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- -----------------------------------------------------------------------------
-- 3. Tabla: companies (lectura autenticada para recibos/branding; escritura solo admin)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins manage companies" ON public.companies;
DROP POLICY IF EXISTS "Authenticated read companies" ON public.companies;

CREATE POLICY "Authenticated read companies" ON public.companies
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins manage companies" ON public.companies
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- -----------------------------------------------------------------------------
-- 4. Tabla: property_types (catálogo lectura autenticada; escritura solo admin)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.property_types;
DROP POLICY IF EXISTS "Admins manage property_types" ON public.property_types;

CREATE POLICY "Enable read access for authenticated users" ON public.property_types
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins manage property_types" ON public.property_types
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- -----------------------------------------------------------------------------
-- 5. Tabla: owners
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins manage owners" ON public.owners;
DROP POLICY IF EXISTS "Owners view own profile" ON public.owners;
DROP POLICY IF EXISTS "Tenants view property owners for receipts" ON public.owners;

CREATE POLICY "Admins manage owners" ON public.owners
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Owners view own profile" ON public.owners
  FOR SELECT USING (auth.uid() = user_id);

-- Permite a inquilinos leer el nombre/RIF/logo del propietario de su inmueble al imprimir recibos
CREATE POLICY "Tenants view property owners for receipts" ON public.owners
  FOR SELECT USING (
    id IN (
      SELECT po.owner_id
      FROM public.property_owners po
      JOIN public.units u ON u.property_id = po.property_id
      JOIN public.contracts c ON c.unit_id = u.id
      WHERE c.tenant_id = public.current_tenant_id()
    )
  );

-- -----------------------------------------------------------------------------
-- 6. Tablas sensibles de propietarios (solo admin + lectura propia del owner)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins manage beneficiaries" ON public.owner_beneficiaries;
DROP POLICY IF EXISTS "Owners view own beneficiaries" ON public.owner_beneficiaries;

CREATE POLICY "Admins manage beneficiaries" ON public.owner_beneficiaries
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Owners view own beneficiaries" ON public.owner_beneficiaries
  FOR SELECT USING (owner_id = public.current_owner_id());

DROP POLICY IF EXISTS "Admins manage owner_bank_accounts" ON public.owner_bank_accounts;
DROP POLICY IF EXISTS "Owners view own bank accounts" ON public.owner_bank_accounts;

CREATE POLICY "Admins manage owner_bank_accounts" ON public.owner_bank_accounts
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Owners view own bank accounts" ON public.owner_bank_accounts
  FOR SELECT USING (owner_id = public.current_owner_id());

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.owner_expenses;
DROP POLICY IF EXISTS "Admins manage owner_expenses" ON public.owner_expenses;
DROP POLICY IF EXISTS "Owners view own expenses" ON public.owner_expenses;

CREATE POLICY "Admins manage owner_expenses" ON public.owner_expenses
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Owners view own expenses" ON public.owner_expenses
  FOR SELECT USING (owner_id = public.current_owner_id());

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.owner_incomes;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.owner_incomes;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.owner_incomes;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.owner_incomes;
DROP POLICY IF EXISTS "Admins manage owner_incomes" ON public.owner_incomes;
DROP POLICY IF EXISTS "Owners view own incomes" ON public.owner_incomes;

CREATE POLICY "Admins manage owner_incomes" ON public.owner_incomes
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Owners view own incomes" ON public.owner_incomes
  FOR SELECT USING (owner_id = public.current_owner_id());

-- -----------------------------------------------------------------------------
-- 7. Tablas: properties, property_owners, units
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins manage properties" ON public.properties;
DROP POLICY IF EXISTS "Owners view own properties" ON public.properties;
DROP POLICY IF EXISTS "Tenants view rented properties" ON public.properties;

CREATE POLICY "Admins manage properties" ON public.properties
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Owners view own properties" ON public.properties
  FOR SELECT USING (
    id IN (SELECT property_id FROM public.property_owners WHERE owner_id = public.current_owner_id())
  );

CREATE POLICY "Tenants view rented properties" ON public.properties
  FOR SELECT USING (
    id IN (
      SELECT u.property_id
      FROM public.units u
      JOIN public.contracts c ON c.unit_id = u.id
      WHERE c.tenant_id = public.current_tenant_id()
    )
  );

DROP POLICY IF EXISTS "Admins manage property owners" ON public.property_owners;
DROP POLICY IF EXISTS "Owners view own property_owners" ON public.property_owners;
DROP POLICY IF EXISTS "Tenants view rented property_owners" ON public.property_owners;

CREATE POLICY "Admins manage property owners" ON public.property_owners
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Owners view own property_owners" ON public.property_owners
  FOR SELECT USING (owner_id = public.current_owner_id());

CREATE POLICY "Tenants view rented property_owners" ON public.property_owners
  FOR SELECT USING (
    property_id IN (
      SELECT u.property_id
      FROM public.units u
      JOIN public.contracts c ON c.unit_id = u.id
      WHERE c.tenant_id = public.current_tenant_id()
    )
  );

DROP POLICY IF EXISTS "Admins manage units" ON public.units;
DROP POLICY IF EXISTS "Owners view own units" ON public.units;
DROP POLICY IF EXISTS "Tenants view rented units" ON public.units;

CREATE POLICY "Admins manage units" ON public.units
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Owners view own units" ON public.units
  FOR SELECT USING (
    property_id IN (SELECT property_id FROM public.property_owners WHERE owner_id = public.current_owner_id())
  );

CREATE POLICY "Tenants view rented units" ON public.units
  FOR SELECT USING (
    id IN (SELECT unit_id FROM public.contracts WHERE tenant_id = public.current_tenant_id())
  );

-- -----------------------------------------------------------------------------
-- 8. Tablas: tenants y tenant_contacts
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins manage tenants" ON public.tenants;
DROP POLICY IF EXISTS "Tenants view own record" ON public.tenants;
DROP POLICY IF EXISTS "Owners view tenants of own properties" ON public.tenants;

CREATE POLICY "Admins manage tenants" ON public.tenants
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Tenants view own record" ON public.tenants
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Owners view tenants of own properties" ON public.tenants
  FOR SELECT USING (
    id IN (
      SELECT c.tenant_id
      FROM public.contracts c
      JOIN public.units u ON u.id = c.unit_id
      JOIN public.property_owners po ON po.property_id = u.property_id
      WHERE po.owner_id = public.current_owner_id()
    )
  );

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.tenant_contacts;
DROP POLICY IF EXISTS "Admins manage tenant_contacts" ON public.tenant_contacts;
DROP POLICY IF EXISTS "Tenants view own contacts" ON public.tenant_contacts;

CREATE POLICY "Admins manage tenant_contacts" ON public.tenant_contacts
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Tenants view own contacts" ON public.tenant_contacts
  FOR SELECT USING (tenant_id = public.current_tenant_id());

-- -----------------------------------------------------------------------------
-- 9. Tablas: contracts y payments
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins manage contracts" ON public.contracts;
DROP POLICY IF EXISTS "Tenants view own contracts" ON public.contracts;
DROP POLICY IF EXISTS "Owners view own property contracts" ON public.contracts;

CREATE POLICY "Admins manage contracts" ON public.contracts
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Tenants view own contracts" ON public.contracts
  FOR SELECT USING (tenant_id = public.current_tenant_id());

CREATE POLICY "Owners view own property contracts" ON public.contracts
  FOR SELECT USING (
    unit_id IN (
      SELECT u.id
      FROM public.units u
      JOIN public.property_owners po ON po.property_id = u.property_id
      WHERE po.owner_id = public.current_owner_id()
    )
  );

DROP POLICY IF EXISTS "Admins manage payments" ON public.payments;
DROP POLICY IF EXISTS "Tenants view own payments" ON public.payments;
DROP POLICY IF EXISTS "Tenants insert pending payments" ON public.payments;
DROP POLICY IF EXISTS "Owners view own property payments" ON public.payments;

CREATE POLICY "Admins manage payments" ON public.payments
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Tenants view own payments" ON public.payments
  FOR SELECT USING (
    tenant_id = public.current_tenant_id()
    OR contract_id IN (SELECT id FROM public.contracts WHERE tenant_id = public.current_tenant_id())
  );

-- Un inquilino solo puede reportar pagos propios en estado 'pending' (nunca aprobarse sus pagos)
CREATE POLICY "Tenants insert pending payments" ON public.payments
  FOR INSERT WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND status = 'pending'
    AND contract_id IN (SELECT id FROM public.contracts WHERE tenant_id = public.current_tenant_id())
  );

CREATE POLICY "Owners view own property payments" ON public.payments
  FOR SELECT USING (
    contract_id IN (
      SELECT c.id
      FROM public.contracts c
      JOIN public.units u ON u.id = c.unit_id
      JOIN public.property_owners po ON po.property_id = u.property_id
      WHERE po.owner_id = public.current_owner_id()
    )
  );

-- -----------------------------------------------------------------------------
-- 10. Tablas: expenses, maintenance_requests, notification_templates, notifications
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.expenses;
DROP POLICY IF EXISTS "Admins manage expenses" ON public.expenses;
DROP POLICY IF EXISTS "Owners view own property expenses" ON public.expenses;

CREATE POLICY "Admins manage expenses" ON public.expenses
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Owners view own property expenses" ON public.expenses
  FOR SELECT USING (
    property_id IN (SELECT property_id FROM public.property_owners WHERE owner_id = public.current_owner_id())
  );

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.maintenance_requests;
DROP POLICY IF EXISTS "Admins manage maintenance" ON public.maintenance_requests;
DROP POLICY IF EXISTS "Owners view own property maintenance" ON public.maintenance_requests;

CREATE POLICY "Admins manage maintenance" ON public.maintenance_requests
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Owners view own property maintenance" ON public.maintenance_requests
  FOR SELECT USING (
    property_id IN (SELECT property_id FROM public.property_owners WHERE owner_id = public.current_owner_id())
  );

DROP POLICY IF EXISTS "Admins manage templates" ON public.notification_templates;
CREATE POLICY "Admins manage templates" ON public.notification_templates
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins manage notifications" ON public.notifications;
DROP POLICY IF EXISTS "Tenants view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Tenants mark own notifications read" ON public.notifications;

CREATE POLICY "Admins manage notifications" ON public.notifications
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "Tenants view own notifications" ON public.notifications
  FOR SELECT USING (tenant_id = public.current_tenant_id());

CREATE POLICY "Tenants mark own notifications read" ON public.notifications
  FOR UPDATE
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

-- -----------------------------------------------------------------------------
-- 11. Storage: logos solo subibles/actualizables por administradores
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can upload owner logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update owner logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload company logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update company logos" ON storage.objects;

CREATE POLICY "Admins can upload owner logos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'owner-logos' AND public.is_admin());

CREATE POLICY "Admins can update owner logos"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'owner-logos' AND public.is_admin());

CREATE POLICY "Admins can upload company logos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'company-logos' AND public.is_admin());

CREATE POLICY "Admins can update company logos"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'company-logos' AND public.is_admin());

COMMIT;
