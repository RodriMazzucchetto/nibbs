-- Contas da plataforma (Auth) + portal do assinante / admin

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  nome text not null,
  cpf text,
  celular text,
  cep text,
  rua text,
  numero text,
  complemento text,
  bairro text,
  cidade text,
  uf text,
  role text not null default 'assinante' check (role in ('assinante', 'admin')),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index profiles_email_idx on public.profiles (email);

alter table public.assinaturas
  add column if not exists user_id uuid references public.profiles (id) on delete set null,
  add column if not exists cancelamento_solicitado_em timestamptz,
  add column if not exists motivo_cancelamento text,
  add column if not exists troca_plano_solicitada text;

create index if not exists assinaturas_user_id_idx on public.assinaturas (user_id);
create index if not exists assinaturas_email_idx on public.assinaturas (email);

-- Caixas enviadas (rastreio preenchido pelo admin)
create table public.caixas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  mes text not null,
  ano int not null default extract(year from now())::int,
  regiao text,
  status text not null default 'separando'
    check (status in ('separando', 'enviada', 'entregue')),
  codigo_rastreio text,
  entregue_em date,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index caixas_user_id_idx on public.caixas (user_id);

-- Conteúdo editável do início do portal (uma linha)
create table public.portal_inicio (
  id int primary key default 1 check (id = 1),
  titulo text not null default 'Boas-vindas ao clube',
  mensagem text not null default 'Sua caixa está a caminho. A gente avisa quando sair para entrega.',
  mes text not null default 'novembro',
  regiao text not null default 'Sul da Bahia',
  status_caixa text not null default 'separando'
    check (status_caixa in ('pagamento', 'separando', 'enviada', 'entregue')),
  atualizado_em timestamptz not null default now()
);

insert into public.portal_inicio (id) values (1)
on conflict (id) do nothing;

alter table public.profiles enable row level security;
alter table public.caixas enable row level security;
alter table public.portal_inicio enable row level security;

-- Service role ignora RLS; policies para o cliente autenticado (anon key + JWT)
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

create policy "caixas_select_own" on public.caixas
  for select using (auth.uid() = user_id);

create policy "portal_inicio_select_all" on public.portal_inicio
  for select using (true);

-- assinaturas: só service role (já tinha policy bloqueando)
