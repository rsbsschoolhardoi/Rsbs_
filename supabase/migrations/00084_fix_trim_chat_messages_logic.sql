create or replace function public.trim_chat_messages()
returns trigger as $$
declare
    v_max_messages integer;
    v_session_id uuid;
begin
    -- Get session ID
    v_session_id := NEW.session_id;

    -- Get global limit from ai_settings
    select max_messages_per_chat into v_max_messages from public.ai_settings limit 1;
    
    -- Ensure v_max_messages has a fallback value
    if v_max_messages is null or v_max_messages < 1 then
        v_max_messages := 50;
    end if;

    -- Delete OLD messages (FIFO)
    -- Order by created_at desc means newest first
    -- Offset skips the newest N and returns the rest (the oldest ones)
    delete from public.ai_chat_messages
    where id in (
        select id from public.ai_chat_messages
        where session_id = v_session_id
        order by created_at desc
        offset v_max_messages
    );

    return NEW;
end;
$$ language plpgsql security definer;
