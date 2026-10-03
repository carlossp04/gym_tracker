create table if not exists public.vaults (
  id text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  version integer not null,
  kdf text not null,
  cipher text not null,
  iterations integer not null,
  salt text not null,
  iv text not null,
  ciphertext text not null,
  revision bigint not null default 1 check (revision > 0),
  updated_at timestamptz not null default now()
);

-- Safe, non-destructive migration for installations created with the old schema.
-- Existing rows remain inaccessible until an administrator assigns owner_id:
-- update public.vaults set owner_id = '<AUTH_USER_UUID>' where id = '<VAULT_ID>';
alter table public.vaults add column if not exists owner_id uuid references auth.users(id) on delete cascade;
alter table public.vaults add column if not exists revision bigint not null default 1;

create index if not exists vaults_owner_id_idx on public.vaults(owner_id);

create table if not exists public.vault_history (
  history_id bigint generated always as identity primary key,
  vault_id text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  version integer not null,
  kdf text not null,
  cipher text not null,
  iterations integer not null,
  salt text not null,
  iv text not null,
  ciphertext text not null,
  revision bigint not null,
  archived_at timestamptz not null default now()
);

create index if not exists vault_history_owner_vault_idx
on public.vault_history(owner_id, vault_id, revision desc);

alter table public.vaults enable row level security;
alter table public.vaults force row level security;

drop policy if exists "public encrypted vault read" on public.vaults;
drop policy if exists "public encrypted vault write" on public.vaults;
drop policy if exists "public encrypted vault delete" on public.vaults;
drop policy if exists "public encrypted vault update" on public.vaults;
drop policy if exists "owner encrypted vault read" on public.vaults;
drop policy if exists "owner encrypted vault insert" on public.vaults;
drop policy if exists "owner encrypted vault update" on public.vaults;
drop policy if exists "owner encrypted vault delete" on public.vaults;

revoke all on table public.vaults from anon;
grant select, insert, update, delete on table public.vaults to authenticated;

create policy "owner encrypted vault read"
on public.vaults
for select
to authenticated
using ((select auth.uid()) = owner_id);

create policy "owner encrypted vault insert"
on public.vaults
for insert
to authenticated
with check ((select auth.uid()) = owner_id);

create policy "owner encrypted vault update"
on public.vaults
for update
to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

create policy "owner encrypted vault delete"
on public.vaults
for delete
to authenticated
using ((select auth.uid()) = owner_id);

alter table public.vault_history enable row level security;
drop policy if exists "owner vault history read" on public.vault_history;
revoke all on table public.vault_history from anon, authenticated;
grant select on table public.vault_history to authenticated;

create policy "owner vault history read"
on public.vault_history
for select
to authenticated
using ((select auth.uid()) = owner_id);

create or replace function public.archive_vault_revision()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if old.owner_id is not null then
    insert into public.vault_history (
      vault_id, owner_id, version, kdf, cipher, iterations,
      salt, iv, ciphertext, revision, archived_at
    ) values (
      old.id, old.owner_id, old.version, old.kdf, old.cipher, old.iterations,
      old.salt, old.iv, old.ciphertext, old.revision, now()
    );
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke all on function public.archive_vault_revision() from public;

drop trigger if exists archive_vault_revision_trigger on public.vaults;
create trigger archive_vault_revision_trigger
before update or delete on public.vaults
for each row execute function public.archive_vault_revision();
