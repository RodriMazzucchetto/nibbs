create table public.leads (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  email text not null,
  empresa text,
  telefone text,
  num_funcionarios text,
  origem text not null default 'business.nibbs.com',
  criado_em timestamptz not null default now()
);

alter table public.leads enable row level security;

-- Apenas service role pode ler/escrever (a API usa service key)
create policy "Service role only" on public.leads
  using (false);
