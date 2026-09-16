-- Lembrete da véspera e agradecimento: a marca de "já mandei".
--
-- Rode UMA VEZ, num banco que já tem o `schema.sql` aplicado.
--
-- ---------------------------------------------------------------------
-- Por que esta migração existe (e por que a 04 dizia que ela não precisava)
-- ---------------------------------------------------------------------
--
-- A migração 04 afirmou, com todas as letras:
--
--     "O lembrete da véspera não precisa de marca nenhuma: o cron da
--      Vercel roda UMA vez por dia, então 'quem começa amanhã' só é
--      varrido uma vez e cada cliente recebe uma mensagem."
--
-- Era mentira, e a mentira estava numa palavra: "o cron". O cron não é o
-- único que dispara a varredura. Existe um BOTÃO no painel da Karol
-- (`/painel/notificacoes`) que chama a mesma `rodarLembretes()`, e ela
-- pode tocar nele quantas vezes quiser. Cada toque manda o lembrete de
-- amanhã pra todo mundo de novo.
--
-- Não é hipótese: em 07/09/2026 a mesma cliente recebeu o mesmo lembrete
-- às 7:03 e de novo às 7:46.
--
-- ---------------------------------------------------------------------
-- O efeito colateral bom
-- ---------------------------------------------------------------------
--
-- Com a marca, o botão do painel para de ser um canhão e vira o que ele
-- deveria ter sido desde o começo: **tentar de novo com quem não
-- recebeu**. Quem já recebeu sai da varredura; quem falhou continua nela.
--
-- Por isso a marca só é gravada quando o envio DÁ CERTO. Marcar antes de
-- saber transformaria uma falha do WhatsApp em silêncio permanente.
--
-- ---------------------------------------------------------------------
-- Duas colunas, não uma
-- ---------------------------------------------------------------------
--
-- São dois avisos diferentes, em dias diferentes da vida do agendamento:
-- o lembrete sai na véspera, o agradecimento no dia seguinte ao
-- atendimento. Uma coluna só faria um apagar o outro.
--
-- Guardam QUANDO, não um booleano — mesmos 8 bytes, e respondem a
-- pergunta que a Karol faz quando a cliente não aparece: "será que ela
-- recebeu o aviso?". Um `true` não responde isso.

alter table agendamentos
  add column if not exists lembrete_enviado_em timestamptz,
  add column if not exists agradecimento_enviado_em timestamptz;

comment on column agendamentos.lembrete_enviado_em is
  'Quando o lembrete da véspera saiu. NULL = ainda não saiu. Impede o botão do painel de mandar a mesma mensagem várias vezes.';

comment on column agendamentos.agradecimento_enviado_em is
  'Quando o agradecimento pós-atendimento saiu. NULL = ainda não saiu.';

-- Índices parciais: só as linhas AINDA NÃO avisadas entram. Assim que o
-- aviso sai, a linha deixa o índice — ele nunca cresce com o histórico,
-- guarda só o punhado de atendimentos que ainda estão por avisar.
create index if not exists agendamentos_lembrete_pendente_idx
  on agendamentos (lower(periodo))
  where lembrete_enviado_em is null and situacao = 'confirmado';

create index if not exists agendamentos_agradecimento_pendente_idx
  on agendamentos (lower(periodo))
  where agradecimento_enviado_em is null and situacao = 'concluido';

-- ---------------------------------------------------------------------
-- A coluna órfã da migração 04
-- ---------------------------------------------------------------------
--
-- `avisado_30min_em` ficou sem dono quando o lembrete de 30 min foi
-- arrancado. Nada lê, nada escreve. São 8 bytes nulos por linha.
--
-- NÃO derrubo aqui de propósito: drop de coluna não se desfaz, e o ganho
-- é zero. Se um dia você quiser mesmo limpar, é esta linha:
--
--     alter table agendamentos drop column if exists avisado_30min_em;
--
-- O índice dela, esse sim, não serve mais a consulta nenhuma:
drop index if exists agendamentos_a_avisar_idx;
