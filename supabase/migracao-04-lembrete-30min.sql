-- Lembrete de 30 minutos antes: a marca de "já avisei".
--
-- Rode UMA VEZ, num banco que já tem o `schema.sql` aplicado.
--
-- ---------------------------------------------------------------------
-- Por que precisa de coluna
-- ---------------------------------------------------------------------
--
-- O lembrete da véspera não precisa de marca nenhuma: o cron da Vercel roda
-- UMA vez por dia, então "quem começa amanhã" só é varrido uma vez e cada
-- cliente recebe uma mensagem.
--
-- O de 30 minutos é outro bicho. Pra pegar um horário de 07:15 com meia hora
-- de antecedência, alguém precisa bater no endpoint a cada 10–15 minutos —
-- e aí a MESMA cliente cai na varredura várias vezes seguidas:
--
--   06:30  faltam 45 min  -> fora da janela, não manda
--   06:45  faltam 30 min  -> MANDA
--   07:00  faltam 15 min  -> ainda dentro da janela -> MANDARIA DE NOVO
--   07:15  faltam  0 min  -> e de novo
--
-- Três mensagens iguais pra mesma pessoa, meia hora antes de ela sair de
-- casa. Sem esta coluna o lembrete de 30 min é spam, não lembrete.
--
-- A coluna guarda QUANDO avisou, não um booleano. Custa os mesmos 8 bytes e
-- responde a pergunta que a Karol faz de verdade quando a cliente não
-- aparece: "será que ela recebeu o aviso?". Um `true` não responde isso.

alter table agendamentos
  add column if not exists avisado_30min_em timestamptz;

comment on column agendamentos.avisado_30min_em is
  'Quando o lembrete de 30 min antes saiu. NULL = ainda não saiu. Impede o cron de curto intervalo de mandar a mesma mensagem várias vezes.';

-- O índice serve à varredura do cron, que é a consulta mais frequente do
-- sistema depois que o lembrete entra no ar: "confirmados, que começam na
-- próxima meia hora, que ainda não foram avisados".
--
-- Parcial de propósito — só as linhas com NULL entram. Assim que o aviso
-- sai, a linha DEIXA o índice, que por isso nunca cresce com o histórico:
-- ele guarda só o punhado de atendimentos que ainda estão por acontecer.
create index if not exists agendamentos_a_avisar_idx
  on agendamentos (lower(periodo))
  where avisado_30min_em is null and situacao = 'confirmado';
