update public.game_state
set contract_signed = false
where contract_signed is null;

alter table public.game_state
alter column contract_signed set default false,
alter column contract_signed set not null;

grant select, update on table public.game_state to service_role;

create or replace function public.sign_hot_money_contract(
  p_signer text,
  p_signed_at timestamptz,
  p_next_day_at timestamptz
)
returns public.game_state
language plpgsql
security definer
set search_path = public
as $$
declare
  current_state public.game_state;
begin
  select *
  into current_state
  from public.game_state
  where id = 1
  for update;

  if not found then
    raise exception 'game_state id=1 non trovato';
  end if;

  if current_state.contract_signed is not true then
    update public.game_state
    set contract_signed = true,
        contract_signed_at = p_signed_at,
        contract_signer = p_signer,
        game_started_at = p_signed_at,
        next_day_at = p_next_day_at,
        current_day = 1,
        updated_at = now()
    where id = 1
    returning * into current_state;
  end if;

  return current_state;
end;
$$;

revoke all on function public.sign_hot_money_contract(text, timestamptz, timestamptz)
from public, anon, authenticated;

grant execute on function public.sign_hot_money_contract(text, timestamptz, timestamptz)
to service_role;
