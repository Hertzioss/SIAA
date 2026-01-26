-- 18. Owner Expenses
CREATE TABLE IF NOT EXISTS public.owner_expenses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    date DATE NOT NULL,
    amount NUMERIC NOT NULL,
    description TEXT NOT NULL,
    category TEXT, -- e.g., 'withdrawal', 'tax', 'fee', 'maintenance'
    owner_id UUID NOT NULL REFERENCES public.owners(id) ON DELETE CASCADE,
    property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
    receipt_url TEXT,
    status TEXT DEFAULT 'paid' CHECK (status IN ('pending', 'paid', 'cancelled'))
);

ALTER TABLE public.owner_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for authenticated users" ON public.owner_expenses 
    FOR ALL USING (auth.role() = 'authenticated');
