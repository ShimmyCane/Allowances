-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Create family_id lookup (optional but helpful for multi-tenancy)
-- For MVP, we can just use a unique uuid per family.

-- 2. Parents table
-- linked to auth.users
create table public.parents (
    id uuid references auth.users not null primary key,
    family_id uuid not null,
    display_name text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Children table
create table public.children (
    id uuid default uuid_generate_v4() primary key,
    family_id uuid not null,
    display_name text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    is_active boolean default true
);

-- 4. Transactions table
create table public.transactions (
    id uuid default uuid_generate_v4() primary key,
    family_id uuid not null,
    child_id uuid references public.children(id) not null,
    created_by uuid references public.parents(id) not null,
    type text check (type in ('deposit', 'withdrawal', 'interest', 'adjustment')) not null,
    amount decimal(12,2) not null,
    note text,
    achievement_tag text,
    occurred_at timestamp with time zone default timezone('utc'::text, now()) not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Withdrawal Requests table
create table public.withdrawal_requests (
    id uuid default uuid_generate_v4() primary key,
    family_id uuid not null,
    child_id uuid references public.children(id) not null,
    requested_amount decimal(12,2) not null,
    purpose text,
    status text check (status in ('pending', 'approved', 'declined')) default 'pending' not null,
    reviewed_by uuid references public.parents(id),
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.parents enable row level security;
alter table public.children enable row level security;
alter table public.transactions enable row level security;
alter table public.withdrawal_requests enable row level security;

-- RLS Policies (Basic idea: users can only see data with their family_id)

-- Helper function to get the current user's family_id
create or replace function public.get_my_family_id()
returns uuid
language sql
security definer
as $$
  select family_id from public.parents where id = auth.uid();
$$;

-- Parents policies
create policy "Parents can view their own record"
on public.parents for select
using ( auth.uid() = id );

create policy "Parents can view family members"
on public.parents for select
using ( family_id = public.get_my_family_id() );

-- Children policies
create policy "Parents can view their family's children"
on public.children for select
using ( family_id = public.get_my_family_id() );

create policy "Parents can manage their family's children"
on public.children for all
using ( family_id = public.get_my_family_id() );

-- Transactions policies
create policy "Parents can view family transactions"
on public.transactions for select
using ( family_id = public.get_my_family_id() );

create policy "Parents can insert family transactions"
on public.transactions for insert
with check ( family_id = public.get_my_family_id() );

-- Withdrawal Requests policies
create policy "Parents can view family requests"
on public.withdrawal_requests for select
using ( family_id = public.get_my_family_id() );

create policy "Parents can manage family requests"
on public.withdrawal_requests for all
using ( family_id = public.get_my_family_id() );
