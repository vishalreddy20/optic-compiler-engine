-- Create a table for storing analysis sessions
create table public.analysis_sessions (
  id uuid default gen_random_uuid() primary key,
  code_snippet text not null,
  diagnostics jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set up Row Level Security (RLS)
alter table public.analysis_sessions enable row level security;

-- Create policies
create policy "Enable insert access for all users" on public.analysis_sessions
  for insert with check (true);

create policy "Enable read access for all users" on public.analysis_sessions
  for select using (true);