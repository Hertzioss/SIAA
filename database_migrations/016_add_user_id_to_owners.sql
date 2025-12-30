-- Add user_id to owners table to link with auth.users
ALTER TABLE public.owners ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Update RLS policies
-- Note: Existing policy "Admins manage owners" uses (auth.role() = 'authenticated') which is very broad.
-- Ideally we should restrict that, but for now we ADD a policy for Owners.

CREATE POLICY "Owners view own profile" 
ON public.owners 
FOR SELECT 
USING (auth.uid() = user_id);

-- We might also want to index this column
CREATE INDEX IF NOT EXISTS idx_owners_user_id ON public.owners(user_id);
