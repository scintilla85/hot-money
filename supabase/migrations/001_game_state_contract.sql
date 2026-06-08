alter table public.game_state
add column if not exists contract_signed boolean not null default false,
add column if not exists contract_signed_at timestamptz,
add column if not exists contract_signer text,
add column if not exists game_started_at timestamptz,
add column if not exists next_day_at timestamptz,
add column if not exists game_completed boolean not null default false,
add column if not exists completed_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'game_state_current_day_range'
  ) then
    alter table public.game_state
    add constraint game_state_current_day_range check (current_day between 1 and 7);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'game_state_prize_pool_non_negative'
  ) then
    alter table public.game_state
    add constraint game_state_prize_pool_non_negative check (prize_pool >= 0);
  end if;
end;
$$;
