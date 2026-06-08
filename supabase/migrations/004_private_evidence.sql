insert into storage.buckets (id, name, public)
values ('evidence-proofs', 'evidence-proofs', false)
on conflict (id) do update set public = false;

create table if not exists public.evidence_proofs (
  id uuid primary key default gen_random_uuid(),
  day_number integer not null check (day_number between 1 and 7),
  contestant_name text not null default 'ALICE',
  mission_title text not null,
  storage_path text not null unique,
  file_name text not null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create index if not exists evidence_proofs_day_idx
on public.evidence_proofs(day_number, submitted_at desc);

alter table public.evidence_proofs enable row level security;
revoke all on public.evidence_proofs from anon, authenticated;
grant select, insert, update, delete on public.evidence_proofs to service_role;

-- No anon/authenticated Storage policies are created for evidence-proofs.
-- The private bucket is accessed only with service_role and short-lived signed URLs.
