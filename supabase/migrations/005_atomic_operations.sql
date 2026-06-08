create or replace function public.sign_hot_money_contract(
  p_signer text,
  p_signed_at timestamptz,
  p_next_day_at timestamptz
)
returns public.game_state
language plpgsql security definer set search_path = public
as $$
declare result public.game_state;
begin
  update public.game_state
  set contract_signed = true, contract_signed_at = p_signed_at,
      contract_signer = p_signer, game_started_at = p_signed_at,
      next_day_at = p_next_day_at, current_day = 1, updated_at = now()
  where id = 1 and contract_signed = false
  returning * into result;
  return result;
end;
$$;

create or replace function public.change_hot_money_prize(
  p_amount numeric, p_reason text, p_source_type text,
  p_source_id text, p_idempotency_key text
)
returns public.game_state
language plpgsql security definer set search_path = public
as $$
declare current_state public.game_state; next_balance numeric;
begin
  select * into current_state from public.game_state where id = 1 for update;
  if exists (select 1 from public.prize_transactions where idempotency_key = p_idempotency_key) then
    return current_state;
  end if;
  next_balance := current_state.prize_pool + p_amount;
  if next_balance < 0 then raise exception 'Montepremi insufficiente'; end if;
  update public.game_state set prize_pool = next_balance, updated_at = now()
  where id = 1 returning * into current_state;
  insert into public.prize_transactions
    (day_number, reason, amount, balance_before, balance_after, source_type, source_id, idempotency_key)
  values
    (current_state.current_day, p_reason, p_amount, current_state.prize_pool - p_amount,
     current_state.prize_pool, p_source_type, p_source_id, p_idempotency_key);
  return current_state;
end;
$$;

create or replace function public.choose_extra_temptation(
  p_temptation_id uuid, p_choice text, p_idempotency_key text
)
returns public.extra_temptations
language plpgsql security definer set search_path = public
as $$
declare temptation public.extra_temptations;
begin
  select * into temptation from public.extra_temptations where id = p_temptation_id for update;
  if temptation.choice is not null then return temptation; end if;
  if p_choice not in ('accepted', 'rejected') then raise exception 'Scelta non valida'; end if;
  if p_choice = 'accepted' then
    perform public.change_hot_money_prize(-temptation.cost, 'Tentazione extra: ' || temptation.title,
      'extra_temptation', temptation.id::text, p_idempotency_key);
  end if;
  update public.extra_temptations set choice = p_choice, chosen_at = now(), updated_at = now()
  where id = p_temptation_id and choice is null returning * into temptation;
  return temptation;
end;
$$;

create or replace function public.advance_hot_money_day(p_now timestamptz)
returns public.game_state
language plpgsql security definer set search_path = public
as $$
declare current_state public.game_state;
begin
  select * into current_state from public.game_state where id = 1 for update;
  if not current_state.contract_signed or current_state.current_day >= 7 then return current_state; end if;
  if current_state.next_day_at is null or p_now < current_state.next_day_at then return current_state; end if;
  update public.game_state
  set current_day = least(current_day + 1, 7), next_day_at = next_day_at + interval '1 day', updated_at = now()
  where id = 1 returning * into current_state;
  return current_state;
end;
$$;

revoke all on function public.sign_hot_money_contract(text, timestamptz, timestamptz) from public, anon, authenticated;
revoke all on function public.change_hot_money_prize(numeric, text, text, text, text) from public, anon, authenticated;
revoke all on function public.choose_extra_temptation(uuid, text, text) from public, anon, authenticated;
revoke all on function public.advance_hot_money_day(timestamptz) from public, anon, authenticated;
grant execute on function public.sign_hot_money_contract(text, timestamptz, timestamptz) to service_role;
grant execute on function public.change_hot_money_prize(numeric, text, text, text, text) to service_role;
grant execute on function public.choose_extra_temptation(uuid, text, text) to service_role;
grant execute on function public.advance_hot_money_day(timestamptz) to service_role;
