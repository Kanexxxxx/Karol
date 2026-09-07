-- Remarcar pelo WhatsApp: a conversa que tem memória.
--
-- Rode UMA VEZ, num banco que já tem o `schema.sql` aplicado.
--
-- ---------------------------------------------------------------------
-- Por que precisa de tabela
-- ---------------------------------------------------------------------
--
-- O webhook é SEM MEMÓRIA: cada mensagem chega sozinha, sem saber o que
-- veio antes. Isso basta pra "me manda meu horário", que se responde numa
-- ida só.
--
-- Remarcar não cabe numa ida. São quatro momentos, com espera humana entre
-- eles:
--
--   1. a cliente toca em "Remarcar"          -> o site oferece horários
--   2. ela escolhe um da lista               -> precisa saber O QUE foi oferecido
--   3. a Karol recebe e confirma             -> precisa saber QUAL ela escolheu
--   4. a cliente recebe o "confirmado"       -> precisa saber que era pra ela
--
-- Entre o 2 e o 3 pode passar meia hora. Sem guardar em algum lugar, o
-- passo 3 chega e ninguém sabe do que a Karol está falando.
--
-- Uma linha aqui é UM pedido de remarcação em andamento.

create table remarcacoes (
  id uuid primary key default gen_random_uuid(),

  agendamento_id uuid not null references agendamentos(id) on delete cascade,

  -- Quem pediu. É por este número que o webhook acha o pedido em aberto
  -- quando a resposta dela chega.
  whatsapp text not null check (whatsapp ~ '^[0-9]{10,15}$'),

  -- Os horários que foram oferecidos, na ordem em que ela viu. O índice da
  -- escolha aponta pra cá — guardar o que foi mostrado é o que impede o
  -- sistema de mover pra um horário que ela nunca viu.
  opcoes jsonb not null,

  -- O que ela escolheu. Nulo até ela tocar.
  escolhido timestamptz,

  situacao text not null default 'oferecido'
    check (situacao in ('oferecido', 'aguardando-karol', 'feito', 'recusado', 'expirado')),

  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- A busca quente: "existe pedido em aberto deste número?"
create index remarcacoes_abertas_idx
  on remarcacoes (whatsapp, criado_em desc)
  where situacao in ('oferecido', 'aguardando-karol');

create index remarcacoes_agendamento_idx on remarcacoes (agendamento_id);

create trigger remarcacoes_atualizado_em
  before update on remarcacoes
  for each row execute function toca_atualizado_em();

-- Mesma regra do resto do banco: RLS ligado e ZERO policies. Todo acesso
-- passa pela chave de serviço, usada só no servidor. Ver `schema.sql`.
alter table remarcacoes enable row level security;
