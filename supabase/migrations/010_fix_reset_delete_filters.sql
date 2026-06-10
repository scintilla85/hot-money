create or replace function public.reset_hot_money_game()
returns public.game_state
language plpgsql
security definer
set search_path = public
as $$
declare
  reset_state public.game_state;
begin
  delete from public.daily_temptation_choices
  where day_number between 1 and 7;

  delete from public.extra_temptations
  where id is not null;

  delete from public.evidence_proofs
  where id is not null;

  delete from public.prize_transactions
  where id > 0;

  update public.game_state
  set current_day = 1,
      prize_pool = 300,
      director_orgasms = 0,
      contestant_orgasms = 0,
      notes = '',
      contract_signed = false,
      contract_signed_at = null,
      contract_signer = null,
      game_started_at = null,
      next_day_at = null,
      game_completed = false,
      completed_at = null,
      updated_at = now()
  where id = 1
  returning * into reset_state;

  if not found then
    raise exception 'game_state id=1 non trovato';
  end if;

  return reset_state;
end;
$$;

revoke all on function public.reset_hot_money_game()
from public, anon, authenticated;

grant execute on function public.reset_hot_money_game()
to service_role;
