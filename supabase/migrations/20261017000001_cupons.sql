-- Cupons de 10% para quem presenteia 3 meses e depois assina o próprio plano
create table if not exists public.cupons (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  email text not null,
  desconto_pct integer not null default 10 check (desconto_pct > 0 and desconto_pct <= 100),
  origem text not null default 'presente-3m',
  asaas_payment_id text,
  usado_em timestamptz,
  usado_assinatura_id uuid references public.assinaturas (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists cupons_email_idx on public.cupons (email);
create index if not exists cupons_codigo_idx on public.cupons (codigo);

alter table public.cupons enable row level security;
