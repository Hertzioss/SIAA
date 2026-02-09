-- Create owner_incomes table
create table if not exists public.owner_incomes (
    id uuid not null default gen_random_uuid (),
    owner_id uuid not null,
    property_id uuid null,
    date date not null,
    amount numeric not null,
    currency text not null default 'USD'::text,
    exchange_rate numeric null,
    description text null,
    category text not null,
    created_at timestamp with time zone not null default now(),
    constraint owner_incomes_pkey primary key (id),
    constraint owner_incomes_owner_id_fkey foreign key (owner_id) references owners (id) on delete cascade,
    constraint owner_incomes_property_id_fkey foreign key (property_id) references properties (id) on delete set null
) tablespace pg_default;

-- Add RLS policies (copying from owner_expenses logic)
alter table public.owner_incomes enable row level security;

create policy "Enable read access for authenticated users" on public.owner_incomes
    as permissive for select to authenticated using (true);

create policy "Enable insert for authenticated users" on public.owner_incomes
    as permissive for insert to authenticated with check (true);

create policy "Enable update for authenticated users" on public.owner_incomes
    as permissive for update to authenticated using (true);

create policy "Enable delete for authenticated users" on public.owner_incomes
    as permissive for delete to authenticated using (true);
