-- Studio Karol Carvalho — banco de agendamentos
--
-- Rode isto uma vez no SQL Editor do Supabase.
-- A ordem importa: tabela, índices, trava anti-conflito, políticas.

create extension if not exists btree_gist;

-- ---------------------------------------------------------------------
-- agendamentos
-- ---------------------------------------------------------------------

create type situacao_agendamento as enum (
  'pendente',    -- esperando o ok da Karol (só quando a aprovação manual está ligada)
  'confirmado',
  'cancelado',
  'concluido',
  'faltou'       -- a cliente não apareceu; serve pra ela ver o padrão
);

create table agendamentos (
  id uuid primary key default gen_random_uuid(),

  -- quem
  cliente_nome text not null check (length(trim(cliente_nome)) between 2 and 120),
  cliente_whatsapp text not null check (cliente_whatsapp ~ '^[0-9]{10,13}$'),

  -- o que
  servico_id text not null,
  servico_nome text not null,           -- congelado: se o preço mudar, o histórico não muda
  servico_preco integer not null,       -- em centavos
  cidade text not null,

  -- quando. `periodo` é a fonte da verdade e já inclui o intervalo entre clientes.
  periodo tstzrange not null,

  situacao situacao_agendamento not null default 'confirmado',
  observacao text check (length(observacao) <= 500),

  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- A trava que impede duas clientes no mesmo horário.
-- Vale no banco, não na aplicação: mesmo com duas pessoas agendando no mesmo
-- segundo, o Postgres recusa a segunda. Cancelado não ocupa a agenda.
alter table agendamentos
  add constraint sem_choque
  exclude using gist (periodo with &&)
  where (situacao in ('pendente', 'confirmado', 'concluido'));

create index agendamentos_periodo_idx on agendamentos using gist (periodo);
create index agendamentos_situacao_idx on agendamentos (situacao, lower(periodo));

-- ---------------------------------------------------------------------
-- bloqueios: férias, compromisso, curso, feriado
-- ---------------------------------------------------------------------

create table bloqueios (
  id uuid primary key default gen_random_uuid(),
  periodo tstzrange not null,
  motivo text not null check (length(trim(motivo)) between 2 and 200),
  criado_em timestamptz not null default now()
);

create index bloqueios_periodo_idx on bloqueios using gist (periodo);

-- ---------------------------------------------------------------------
-- conversas: a janela de 24 h do WhatsApp
-- ---------------------------------------------------------------------
--
-- A Meta só deixa mandar texto livre (e de graça) nas 24 h seguintes à
-- última mensagem DA CLIENTE. Fora disso, recusa com 131047 e só passa
-- template pago. Esta tabela guarda até quando a janela de cada número
-- está aberta. Ver `migracao-02-conversas.sql` e WHATSAPP.md.
--
-- A janela é da pessoa, não do agendamento: a mesma cliente pode ter vários
-- agendamentos e uma conversa só.

create table conversas (
  whatsapp text primary key check (whatsapp ~ '^[0-9]{10,15}$'),
  janela_ate timestamptz not null,
  ultima_mensagem text,
  atualizado_em timestamptz not null default now()
);

create index conversas_janela_idx on conversas (janela_ate);

-- ---------------------------------------------------------------------
-- segurança
-- ---------------------------------------------------------------------

alter table agendamentos enable row level security;
alter table bloqueios enable row level security;
alter table conversas enable row level security;

-- O site público NÃO lê a tabela de agendamentos: os dados das clientes
-- (nome e WhatsApp) nunca saem do servidor. A disponibilidade é calculada
-- no servidor e só os horários livres chegam ao navegador.
--
-- Por isso não existe policy nenhuma aqui. Todo acesso passa pela chave de
-- serviço, usada apenas em Server Actions e Route Handlers — e ela passa
-- por cima do RLS por definição.
--
-- RLS ligado + zero policies = ninguém mais entra. É o que queremos: o
-- projeto não usa Supabase Auth, então uma policy `to authenticated` não
-- serviria a ninguém hoje e abriria a agenda inteira (nome e WhatsApp de
-- cliente) pra qualquer conta que viesse a existir no projeto amanhã.

-- ---------------------------------------------------------------------
-- atualizado_em automático
-- ---------------------------------------------------------------------

create or replace function toca_atualizado_em()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

create trigger agendamentos_atualizado_em
  before update on agendamentos
  for each row execute function toca_atualizado_em();
