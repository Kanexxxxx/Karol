-- O relógio do lembrete de 30 minutos, dentro do próprio banco.
--
-- Rode UMA VEZ, depois de trocar as duas linhas marcadas com <TROQUE>.
--
-- ---------------------------------------------------------------------
-- Por que isto existe
-- ---------------------------------------------------------------------
--
-- O código do lembrete está pronto há dias e nunca disparou, porque falta
-- alguém BATER no endereço a cada 10 minutos.
--
-- O cron da Vercel não serve. Conferido na documentação deles em
-- 13/09/2026: no plano Hobby, cron roda **1× por dia**, e uma expressão
-- mais frequente que isso nem passa no deploy — falha com "Hobby accounts
-- are limited to daily cron jobs". Ainda por cima, a precisão é de ±59
-- minutos. Serve pro lembrete da véspera (que é o que o `vercel.json` já
-- faz), e não serve pra um aviso de meia hora antes.
--
-- ---------------------------------------------------------------------
-- Por que aqui, e não num cron-job.org da vida
-- ---------------------------------------------------------------------
--
-- Porque o Supabase já está no projeto e já faz isso. Um serviço de fora
-- seria mais uma conta pra criar, mais uma senha pra perder, mais uma
-- empresa que precisa estar de pé pras clientes serem avisadas — e o
-- `CRON_SECRET` guardado no servidor de um terceiro.
--
-- Aqui é a mesma coisa que você já fez cinco vezes: colar SQL no editor
-- do Supabase.
--
-- ⚠️ SE ESTA MIGRAÇÃO FALHAR dizendo que a extensão não existe, o caminho
-- de trás continua valendo e está escrito em WHATSAPP.md, seção 8.
--
-- ---------------------------------------------------------------------
-- O que ela faz
-- ---------------------------------------------------------------------
--
-- De 10 em 10 minutos, o banco chama `/api/lembretes?tipo=curto` no site,
-- com o mesmo cabeçalho de segredo que a rota já exige. A rota varre quem
-- tem horário confirmado começando nos próximos 35 minutos e ainda não foi
-- avisado, manda o WhatsApp, e marca `avisado_30min_em`.
--
-- ⚠️ 10 MINUTOS NÃO É NÚMERO REDONDO POR ACASO. A janela da varredura é de
-- 35 minutos (`JANELA_LEMBRETE_MIN`, em `lib/agendamentos.ts`). Se o
-- intervalo entre duas batidas passar de 35 minutos, existe cliente que
-- nunca cai na janela — longe demais numa batida, e já passou na seguinte.
-- 10 dá três chances pra cada uma.
--
-- ⚠️ Precisa da MIGRAÇÃO 04 aplicada. Sem a coluna `avisado_30min_em`, a
-- marca de "já avisei" não existe e a mesma cliente recebe o aviso três
-- vezes seguidas.

-- ---------------------------------------------------------------------
-- 1. As duas extensões
-- ---------------------------------------------------------------------
--
-- `pg_cron` é o relógio. `pg_net` é o que deixa o banco fazer uma chamada
-- HTTP pra fora — sem ele o relógio toca e não há pra quem falar.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- ---------------------------------------------------------------------
-- 2. O segredo, guardado no cofre e não no meio do comando
-- ---------------------------------------------------------------------
--
-- O comando de um job fica em texto puro na tabela `cron.job`, que
-- qualquer consulta lê. O Vault guarda cifrado e devolve só na hora.
--
-- <TROQUE> o valor abaixo pelo MESMO `CRON_SECRET` que está na Vercel.
-- Tem que ser igual, caractere por caractere: é ele que a rota confere.
--
-- ⚠️ NÃO SALVE ESTE ARQUIVO COM O SEGREDO DENTRO. O repositório é
-- público. Cole no editor do Supabase, rode, e deixe o arquivo como está.

select vault.create_secret(
  '<TROQUE-PELO-CRON_SECRET-DA-VERCEL>',
  'cron_secret',
  'O Bearer que /api/lembretes exige. Igual ao CRON_SECRET da Vercel.'
);

-- ---------------------------------------------------------------------
-- 3. O job
-- ---------------------------------------------------------------------
--
-- <TROQUE> o endereço abaixo se o site sair do `karol-zeta.vercel.app`
-- (quando o domínio próprio existir, por exemplo).
--
-- `unschedule` antes de agendar deixa este arquivo poder rodar de novo sem
-- criar job duplicado — dois jobs iguais é o dobro de chamada, não o dobro
-- de mensagem (a coluna `avisado_30min_em` segura), mas é desperdício e
-- confunde quem for olhar depois.

select cron.unschedule('lembrete-30min')
where exists (select 1 from cron.job where jobname = 'lembrete-30min');

select cron.schedule(
  'lembrete-30min',
  '*/10 * * * *',
  $$
  select net.http_get(
    url := 'https://karol-zeta.vercel.app/api/lembretes?tipo=curto',
    headers := jsonb_build_object(
      'Authorization',
      'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    timeout_milliseconds := 20000
  );
  $$
);

-- ---------------------------------------------------------------------
-- 4. Conferir que ficou de pé
-- ---------------------------------------------------------------------
--
-- (a) O job existe e está ativo:
--
--     select jobname, schedule, active from cron.job where jobname = 'lembrete-30min';
--
-- (b) As últimas execuções — `status` tem que ser 'succeeded':
--
--     select start_time, status, return_message
--     from cron.job_run_details
--     where jobname = 'lembrete-30min'
--     order by start_time desc limit 10;
--
-- (c) ⚠️ A PARTE QUE ENGANA: 'succeeded' aqui só quer dizer que o banco
--     CONSEGUIU DISPARAR a chamada. Um 401 do site também é 'succeeded'.
--     Quem conta a verdade é a resposta:
--
--     select created, status_code, content
--     from net._http_response
--     order by created desc limit 10;
--
--     200 com {"ok":true,"curtos":N}  -> funcionando
--     401                             -> o segredo do Vault não bate com
--                                        o CRON_SECRET da Vercel
--
-- ---------------------------------------------------------------------
-- Pra desligar
-- ---------------------------------------------------------------------
--
--     select cron.unschedule('lembrete-30min');
