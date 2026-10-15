-- Presentes são pagamento único: não têm assinatura no Asaas
alter table public.assinaturas
  alter column asaas_subscription_id drop not null;

alter table public.assinaturas
  add column asaas_payment_id text unique,
  add column tipo text not null default 'assinatura';
