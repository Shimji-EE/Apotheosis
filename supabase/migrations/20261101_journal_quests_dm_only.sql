-- Quests in a character's journal are written by the DM only. Players may change
-- everything else in their character, including their own notes on each quest
-- (data.questNotes). NOT APPLIED YET: waiting for Charl's go-ahead.
create or replace function private.guard_dm_quests() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or private.is_dm() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.data := jsonb_set(coalesce(new.data, '{}'::jsonb), '{quests}', '[]'::jsonb);
  elsif (new.data -> 'quests') is distinct from (old.data -> 'quests') then
    raise exception 'Only the DM can change quests in the journal.';
  end if;
  return new;
end $$;

drop trigger if exists guard_dm_quests on public.characters;
create trigger guard_dm_quests before insert or update on public.characters
  for each row execute function private.guard_dm_quests();

-- Give existing quests stable ids so players' notes can attach to them.
update public.characters c
set data = jsonb_set(c.data, '{quests}', (
  select coalesce(jsonb_agg(case when q ? 'id' then q else q || jsonb_build_object('id', substr(md5(random()::text), 1, 8)) end), '[]'::jsonb)
  from jsonb_array_elements(c.data -> 'quests') q))
where jsonb_typeof(c.data -> 'quests') = 'array';
