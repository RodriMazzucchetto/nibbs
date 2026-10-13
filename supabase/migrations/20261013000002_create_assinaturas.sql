create table public.assinaturas (
  id uuid primary key default gen_random_uuid(),
  stripe_customer_id text not null,
  stripe_subscription_id text not null unique,
  plano text not null,
  email text not null,
  nome text,
  status text not null default 'active',
  criado_em timestamptz not null default now()
);

alter table public.assinaturas enable row level security;

-- Apenas service role pode ler/escrever (webhook usa service key)
create policy "Service role only" on public.assinaturas
  using (false);
