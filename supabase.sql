-- Mesa de Precatórios — estrutura do banco (rodar uma vez no SQL Editor do Supabase)
-- Dados compartilhados entre os sócios cadastrados na tabela "membros".

create table if not exists public.membros (
  email text primary key,
  nome text
);
insert into public.membros (email, nome) values
  ('eduardobpfalcao2@gmail.com', 'Eduardo'),
  ('gabrielbpfalcao1@gmail.com', 'Gabriel')
on conflict (email) do nothing;

create or replace function public.e_membro() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.membros where lower(email) = lower(auth.jwt() ->> 'email'))
$$;

create table if not exists public.docs (
  collection text not null,
  id text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by text default (auth.jwt() ->> 'email'),
  primary key (collection, id)
);

alter table public.docs enable row level security;
alter table public.membros enable row level security;
drop policy if exists "socios leem" on public.docs;
drop policy if exists "socios gravam" on public.docs;
drop policy if exists "socios veem membros" on public.membros;
create policy "socios leem" on public.docs for select using (public.e_membro());
create policy "socios gravam" on public.docs for all using (public.e_membro()) with check (public.e_membro());
create policy "socios veem membros" on public.membros for select using (public.e_membro());

-- Só e-mails da tabela "membros" podem criar conta
create or replace function public.so_membros() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.membros where lower(email) = lower(new.email)) then
    raise exception 'Cadastro não autorizado';
  end if;
  return new;
end $$;
drop trigger if exists so_membros on auth.users;
create trigger so_membros before insert on auth.users for each row execute function public.so_membros();
