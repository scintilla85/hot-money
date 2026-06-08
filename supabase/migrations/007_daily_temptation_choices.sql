create table if not exists public.daily_temptation_choices (
  day_number integer primary key check (day_number between 1 and 7),
  choice text not null check (choice in ('accepted', 'rejected')),
  chosen_at timestamptz not null default now()
);

alter table public.daily_temptation_choices enable row level security;
revoke all on public.daily_temptation_choices from anon, authenticated;
grant select, insert on public.daily_temptation_choices to service_role;

create or replace function public.choose_daily_temptation(
  p_day_number integer, p_choice text, p_cost numeric, p_idempotency_key text
)
returns public.daily_temptation_choices
language plpgsql security definer set search_path = public
as $$
declare result public.daily_temptation_choices;
begin
  if p_choice not in ('accepted', 'rejected') then raise exception 'Scelta non valida'; end if;
  insert into public.daily_temptation_choices(day_number, choice)
  values (p_day_number, p_choice)
  on conflict (day_number) do nothing
  returning * into result;
  if result.day_number is null then
    select * into result from public.daily_temptation_choices where day_number = p_day_number;
    return result;
  end if;
  if p_choice = 'accepted' then
    perform public.change_hot_money_prize(-p_cost, 'Tentazione giornaliera', 'daily_temptation',
      p_day_number::text, p_idempotency_key);
  end if;
  return result;
end;
$$;

revoke all on function public.choose_daily_temptation(integer, text, numeric, text) from public, anon, authenticated;
grant execute on function public.choose_daily_temptation(integer, text, numeric, text) to service_role;
