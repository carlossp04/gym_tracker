create table if not exists public.vaults (
  id text primary key,
  version integer not null,
  kdf text not null,
  cipher text not null,
  iterations integer not null,
  salt text not null,
  iv text not null,
  ciphertext text not null,
  updated_at timestamptz not null default now()
);

alter table public.vaults enable row level security;

drop policy if exists "public encrypted vault read" on public.vaults;
drop policy if exists "public encrypted vault write" on public.vaults;
drop policy if exists "public encrypted vault delete" on public.vaults;

create policy "public encrypted vault read"
on public.vaults
for select
to anon
using (true);

create policy "public encrypted vault write"
on public.vaults
for insert
to anon
with check (true);

create policy "public encrypted vault update"
on public.vaults
for update
to anon
using (true)
with check (true);

create policy "public encrypted vault delete"
on public.vaults
for delete
to anon
using (true);
