-- O WhatsApp da cliente passa a ser opcional no banco.
--
-- Rode UMA VEZ, num banco criado a partir do `schema.sql` ANTES de
-- 30/10/2026. Banco novo já sai certo: o `schema.sql` foi corrigido junto.
-- Pode rodar de novo sem medo: tirar um `not null` que não existe não dá erro.
--
-- ---------------------------------------------------------------------
-- Por que esta migração existe
-- ---------------------------------------------------------------------
--
-- Desde o incidente de 18/09/2026 (as 97 mensagens), o painel pergunta
-- "Tenho o número" / "Não tenho", e no segundo caso grava `null` em
-- `cliente_whatsapp` — nunca mais o número da própria Karol.
--
-- O banco de PRODUÇÃO já aceitava `null` (conferido em 18/09, commit
-- 4a81423). Mas o `schema.sql` do repositório dizia `not null`, então
-- qualquer banco criado por ele — o de teste, ou uma instalação nova —
-- recusava o "Não tenho" com erro de constraint.
--
-- O CHECK do formato continua: com valor, só dígitos (10 a 13). Sem valor,
-- `null` — e CHECK que resulta em NULL passa.

alter table agendamentos
  alter column cliente_whatsapp drop not null;
