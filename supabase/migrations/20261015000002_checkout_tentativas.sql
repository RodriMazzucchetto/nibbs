-- Limite de tentativas de pagamento por IP (proteção contra teste de cartões)
create table public.checkout_tentativas (
  id bigint generated always as identity primary key,
  ip text not null,
  criado_em timestamptz not null default now()
);

create index checkout_tentativas_ip_criado_em on public.checkout_tentativas (ip, criado_em desc);

alter table public.checkout_tentativas enable row level security;
