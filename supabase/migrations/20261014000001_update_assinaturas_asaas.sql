-- Migra tabela assinaturas de Stripe para Asaas
alter table public.assinaturas
  rename column stripe_customer_id to asaas_customer_id;

alter table public.assinaturas
  rename column stripe_subscription_id to asaas_subscription_id;
