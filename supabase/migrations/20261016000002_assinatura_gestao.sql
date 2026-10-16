-- Campos para troca de plano, pular caixa e pausa
alter table public.assinaturas
  add column if not exists plano_slug text,
  add column if not exists proxima_cobranca date,
  add column if not exists pausada_ate date,
  add column if not exists caixa_pulada_ate date,
  add column if not exists atualizado_em timestamptz not null default now();

-- Backfill slug a partir do nome do plano
update public.assinaturas set plano_slug = 'entrada' where plano_slug is null and lower(plano) like '%entrada%';
update public.assinaturas set plano_slug = 'melhor-valor' where plano_slug is null and lower(plano) like '%melhor%';
update public.assinaturas set plano_slug = 'ultimate' where plano_slug is null and lower(plano) like '%ultimate%';
update public.assinaturas set plano_slug = 'melhor-valor' where plano_slug is null;
