-- Add max_messages_per_chat to ai_settings
alter table public.ai_settings add column if not exists max_messages_per_chat integer not null default 50;

-- AI Chat Sessions table
create table if not exists public.ai_chat_sessions (
    id uuid primary key default gen_random_uuid(),
    student_id uuid not null references public.students(id) on delete cascade,
    title text not null default 'New Chat',
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- AI Chat Messages table
create table if not exists public.ai_chat_messages (
    id uuid primary key default gen_random_uuid(),
    session_id uuid not null references public.ai_chat_sessions(id) on delete cascade,
    role text not null check (role in ('user', 'assistant', 'system')),
    content text not null,
    attachments jsonb default '[]'::jsonb,
    created_at timestamptz default now()
);

-- RLS Policies
alter table public.ai_chat_sessions enable row level security;
alter table public.ai_chat_messages enable row level security;

-- Admin policies (Full access)
create policy "Admins have full access to ai_chat_sessions" on public.ai_chat_sessions
    for all to authenticated using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
    with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "Admins have full access to ai_chat_messages" on public.ai_chat_messages
    for all to authenticated using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
    with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- Student policies (Read/Write for own data)
create policy "Students can manage their own ai_chat_sessions" on public.ai_chat_sessions
    for all to authenticated using (exists (select 1 from public.profiles where id = auth.uid() and student_id = ai_chat_sessions.student_id))
    with check (exists (select 1 from public.profiles where id = auth.uid() and student_id = ai_chat_sessions.student_id));

create policy "Students can manage their own ai_chat_messages" on public.ai_chat_messages
    for all to authenticated using (exists (select 1 from public.ai_chat_sessions where id = ai_chat_messages.session_id and student_id = (select student_id from public.profiles where id = auth.uid())))
    with check (exists (select 1 from public.ai_chat_sessions where id = ai_chat_messages.session_id and student_id = (select student_id from public.profiles where id = auth.uid())));

-- Realtime
alter publication supabase_realtime add table ai_chat_sessions;
alter publication supabase_realtime add table ai_chat_messages;

-- Function to trim chat messages (FIFO)
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

    -- Delete oldest messages if count exceeds limit
    delete from public.ai_chat_messages
    where id in (
        select id from public.ai_chat_messages
        where session_id = v_session_id
        order by created_at asc
        offset v_max_messages
    );

    return NEW;
end;
$$ language plpgsql security definer;

-- Trigger to run trim_chat_messages after insertion
create trigger after_chat_message_insert
after insert on public.ai_chat_messages
for each row execute function public.trim_chat_messages();
