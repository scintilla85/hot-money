create table if not exists public.extra_temptations (
  id uuid primary key default gen_random_uuid(),
  day_number integer not null check (day_number between 1 and 7),
  title text not null,
  description text not null,
  cost numeric not null check (cost >= 0),
  choice text check (choice in ('accepted', 'rejected')),
  chosen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists extra_temptations_day_idx
on public.extra_temptations(day_number, created_at desc);

alter table public.extra_temptations enable row level security;
revoke all on public.extra_temptations from anon, authenticated;
grant select, insert, update on public.extra_temptations to service_role;
