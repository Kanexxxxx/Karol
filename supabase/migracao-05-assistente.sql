-- O assistente da Karol no WhatsApp.
--
-- Rode UMA VEZ, num banco que já tem `schema.sql` e as migrações 02 a 04.
--
-- ---------------------------------------------------------------------
-- O que muda
-- ---------------------------------------------------------------------
--
-- A Karol passa a poder mandar mensagem pro próprio número do studio e ser
-- atendida por uma IA que enxerga a agenda: "quantas clientes amanhã?",
-- "cancela a da Larissa de quinta", "bloqueia sexta que eu vou viajar".
--
-- Duas coisas precisam de lugar pra morar, e nenhuma cabe numa mensagem
-- solta.

-- ---------------------------------------------------------------------
-- 1. A memória da conversa
-- ---------------------------------------------------------------------
--
-- Sem histórico, cada mensagem chega sozinha e a conversa fica idiota:
--
--   Karol: quais meus horários de quinta?
--   IA:    [lista]
--   Karol: cancela a segunda
--   IA:    a segunda o quê?
--
-- Guarda um punhado das últimas mensagens, não a conversa inteira: o que
-- vai pro modelo é o que a gente paga por token, e conversa de meses atrás
-- não ajuda a responder nada.
--
-- Fica em `conversas` e não em tabela nova porque é exatamente disso que
-- essa tabela já trata: o estado da conversa de um número.

alter table conversas
  add column if not exists historico jsonb not null default '[]'::jsonb;

comment on column conversas.historico is
  'Últimas mensagens trocadas com o assistente, como [{"papel":"user|assistant","texto":"..."}]. Só a Karol usa. Cortado nas N últimas por lib/assistente.ts.';

-- ---------------------------------------------------------------------
-- 2. As ações esperando o toque dela
-- ---------------------------------------------------------------------
--
-- ⚠️ ESTA TABELA É A TRAVA DE SEGURANÇA DO ASSISTENTE, não um detalhe de
-- implementação.
--
-- A IA nunca escreve na agenda. Quando a Karol pede algo que MUDA alguma
-- coisa, a IA descreve o que entendeu, a ação fica guardada aqui, e ela
-- recebe um botão de confirmar. Só o toque dela executa.
--
-- O motivo é o modo como um LLM erra: ele não trava, ele acerta a forma e
-- erra o alvo com confiança total. "Cancela a de amanhã" com dois
-- atendimentos amanhã tem 50% de chance de apagar o horário errado, e a
-- cliente descobre na porta. Confirmar transforma um erro invisível numa
-- pergunta.
--
-- É o mesmo desenho que já governa a remarcação pelo WhatsApp (tabela
-- `remarcacoes`): a cliente escolhe, a Karol decide. Aqui: a IA propõe, a
-- Karol decide.

create table if not exists acoes_pendentes (
  id uuid primary key default gen_random_uuid(),

  -- De quem partiu. Sempre o número da Karol — nenhum outro chega aqui.
  whatsapp text not null check (whatsapp ~ '^[0-9]{10,15}$'),

  -- Qual ferramenta e com quais argumentos. Guardados como o modelo
  -- produziu, já validados antes de gravar.
  ferramenta text not null check (length(ferramenta) between 2 and 60),
  argumentos jsonb not null default '{}'::jsonb,

  -- A frase que a Karol leu antes de confirmar. Fica gravada porque é a
  -- prova do que ela aprovou: se a ação sair diferente do que ela
  -- entendeu, é aqui que se descobre.
  descricao text not null check (length(descricao) between 2 and 500),

  situacao text not null default 'aguardando'
    check (situacao in ('aguardando', 'feita', 'recusada', 'expirada')),

  -- O resultado, quando executa. Serve pro log e pra não repetir.
  resultado text,

  criado_em timestamptz not null default now(),

  -- Ação velha não executa. Ela confirmar de manhã algo que pediu ontem à
  -- noite mudaria a agenda com base num estado que não existe mais.
  expira_em timestamptz not null default now() + interval '30 minutes'
);

-- A consulta do webhook: "esta ação existe e ainda vale?".
create index if not exists acoes_pendentes_abertas_idx
  on acoes_pendentes (whatsapp, criado_em desc)
  where situacao = 'aguardando';

-- Mesma regra do resto do banco: RLS ligado e ZERO policies. Todo acesso
-- passa pela chave de serviço, usada só no servidor. Ver `schema.sql`.
alter table acoes_pendentes enable row level security;
