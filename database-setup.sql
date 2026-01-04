-- Create tmdebt_script table
create table if not exists public.tmdebt_script (
  id uuid primary key default gen_random_uuid(),
  step_name text not null unique,
  title text not null,
  content text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable Row Level Security
alter table public.tmdebt_script enable row level security;

-- Drop existing policies if they exist
drop policy if exists "Allow public read access" on public.tmdebt_script;
drop policy if exists "Allow authenticated insert" on public.tmdebt_script;
drop policy if exists "Allow authenticated update" on public.tmdebt_script;
drop policy if exists "Allow authenticated delete" on public.tmdebt_script;
drop policy if exists "Allow public insert" on public.tmdebt_script;
drop policy if exists "Allow public update" on public.tmdebt_script;
drop policy if exists "Allow public delete" on public.tmdebt_script;

-- Create policy to allow public read access
create policy "Allow public read access"
  on public.tmdebt_script
  for select
  to public
  using (true);

-- Create policy to allow public insert
create policy "Allow public insert"
  on public.tmdebt_script
  for insert
  to public
  with check (true);

-- Create policy to allow public update
create policy "Allow public update"
  on public.tmdebt_script
  for update
  to public
  using (true)
  with check (true);

-- Create policy to allow public delete
create policy "Allow public delete"
  on public.tmdebt_script
  for delete
  to public
  using (true);

-- Create updated_at trigger
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at
  before update on public.tmdebt_script
  for each row
  execute function public.handle_updated_at();

-- Insert default script data
insert into public.tmdebt_script (step_name, title, content) values
  ('greeting', '1 - Opening Greeting', '"Good [morning/afternoon/evening], this is [Your Name] calling from [Company Name]. Am I speaking with [Customer Name]?"

[Wait for confirmation]

"Great! How are you doing today?"

[Brief acknowledgment]

"I appreciate you taking my call. I''m reaching out today because..."'),
  ('objectionHandling', '1a - Common Objections', '"I''m not interested"
→ "I understand. May I ask what specifically doesn''t interest you? That way I can make sure I''m not wasting your time."

"Send me information"
→ "I''d be happy to! To make sure I send you the most relevant information, can I ask you a few quick questions?"

"I need to think about it"
→ "Of course, this is an important decision. What specific aspects would you like to think about? Maybe I can help clarify those now."'),
  ('qualification', '2 - Qualification Questions', '1. "Can you tell me a bit about your current [solution/process]?"

2. "What challenges are you facing with [specific area]?"

3. "Have you considered making any changes in the near future?"

4. "Who else in your organization would be involved in this decision?"'),
  ('closingNotInterested', '3a - Closing (Not Interested)', '"I completely understand, [Name]. I appreciate you taking the time to speak with me today.

Just so I don''t bother you again with something that''s not relevant - can I ask what specifically doesn''t interest you? Is it:
  • The timing?
  • The solution itself?
  • Budget concerns?

[Listen to response]

"I appreciate that feedback. Let me make a note of that in our system.

If your situation changes in the future, would it be okay if I reach out to you in [3/6/12] months just to check in?

[If yes]: "Perfect. I''ll make a note to follow up then."

[If no]: "No problem at all. I''ll make sure you''re not contacted again."

Thank you again for your time, [Name]. I wish you all the best with [mention their business/situation if applicable]. Have a great rest of your day!"

[End call professionally]'),
  ('closingSuccess', '3b - Closing Spiel (Successful)', '"Based on what we''ve discussed, it sounds like this could be a great fit for [specific need they mentioned]. 

Would you be open to [next step - demo/meeting/trial]?

[If yes]: "Excellent! Let me check my calendar. Would [day/time] or [day/time] work better for you?"

[If no]: "I understand. May I follow up with you in [timeframe] to see if your situation has changed?"

"Thank you so much for your time today, [Name]. I look forward to [next step]."')
on conflict (step_name) do nothing;
