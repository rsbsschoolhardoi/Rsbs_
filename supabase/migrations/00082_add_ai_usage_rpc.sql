create or replace function public.increment_ai_usage(p_student_id uuid, p_date date)
returns void as $$
begin
    insert into public.ai_usage (student_id, usage_date, message_count, total_historical_usage)
    values (p_student_id, p_date, 1, 1)
    on conflict (student_id, usage_date)
    do update set 
        message_count = ai_usage.message_count + 1,
        total_historical_usage = ai_usage.total_historical_usage + 1,
        updated_at = now();
end;
$$ language plpgsql security definer;
