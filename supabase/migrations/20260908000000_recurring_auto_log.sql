alter table public.recurring_transactions
  add column if not exists auto_log boolean not null default false;

create or replace function public.process_due_recurring_transactions(
  target_user_id uuid default auth.uid()
)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  recurring_row record;
  run_date date;
  next_run_date date;
  processed_count integer := 0;
begin
  for recurring_row in
    select *
    from public.recurring_transactions
    where active = true
      and auto_log = true
      and next_run_at <= current_date
      and (end_date is null or next_run_at <= end_date)
      and case
        when auth.role() = 'service_role' then target_user_id is null or user_id = target_user_id
        else user_id = auth.uid()
      end
    order by next_run_at
    for update skip locked
  loop
    run_date := recurring_row.next_run_at;

    while run_date <= current_date
      and (recurring_row.end_date is null or run_date <= recurring_row.end_date)
    loop
      insert into public.transactions (
        user_id,
        account_id,
        category_id,
        type,
        amount,
        currency,
        exchange_rate,
        amount_base,
        description,
        transaction_date,
        recurring_transaction_id
      ) values (
        recurring_row.user_id,
        recurring_row.account_id,
        recurring_row.category_id,
        recurring_row.type,
        recurring_row.amount,
        recurring_row.currency,
        1,
        recurring_row.amount,
        recurring_row.description,
        run_date,
        recurring_row.id
      );

      update public.accounts
      set balance = coalesce(balance, 0) + case
        when recurring_row.type = 'income' then recurring_row.amount
        else -recurring_row.amount
      end,
      updated_at = now()
      where id = recurring_row.account_id
        and user_id = recurring_row.user_id;

      processed_count := processed_count + 1;
      next_run_date := case recurring_row.frequency
        when 'weekly' then (run_date + make_interval(weeks => recurring_row.interval))::date
        when 'monthly' then (run_date + make_interval(months => recurring_row.interval))::date
        when 'yearly' then (run_date + make_interval(years => recurring_row.interval))::date
        else (run_date + make_interval(days => recurring_row.interval))::date
      end;
      run_date := next_run_date;
    end loop;

    update public.recurring_transactions
    set next_run_at = run_date,
        active = case
          when end_date is not null and run_date > end_date then false
          else active
        end,
        updated_at = now()
    where id = recurring_row.id;
  end loop;

  return processed_count;
end;
$$;

grant execute on function public.process_due_recurring_transactions(uuid) to authenticated, service_role;
