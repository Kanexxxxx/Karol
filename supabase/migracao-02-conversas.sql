-- A janela de 24 h do WhatsApp.
--
-- Rode UMA VEZ, num banco que já tem o `schema.sql` aplicado.
-- Banco novo já sai com isto: o `schema.sql` foi atualizado junto.
--
-- ---------------------------------------------------------------------
-- Por que esta tabela existe
-- ---------------------------------------------------------------------
--
-- Desde 1º/07/2025 a Meta cobra por mensagem entregue, e o que decide se é
-- grátis não é a quantidade: é QUEM PUXOU A CONVERSA. Quando a cliente manda
-- mensagem primeiro, abre uma janela de 24 h em que a empresa responde texto
-- livre, sem template aprovado e sem custo. Fora da janela, a Meta recusa
-- com o erro 131047 e só passa template pago.
--
-- Sem guardar isso em algum lugar, o site não tem como saber se pode falar.
-- Ele tenta, a Meta recusa, e o log fica cheio de 131047 sem que ninguém
-- saiba se aquilo era esperado ou defeito.
--
-- A janela é da PESSOA, não do agendamento: a mesma cliente pode ter três
-- agendamentos e uma conversa só. Por isso a chave é o número.

create table conversas (
  whatsapp text primary key check (whatsapp ~ '^[0-9]{10,15}$'),

  -- Quando a janela fecha. Sempre 24 h depois da última mensagem dela.
  janela_ate timestamptz not null,

  -- A última coisa que ela escreveu. Serve pra Karol ver o contexto no
  -- painel sem precisar abrir o WhatsApp.
  ultima_mensagem text,

  atualizado_em timestamptz not null default now()
);

create index conversas_janela_idx on conversas (janela_ate);

-- Mesma regra do resto do banco: RLS ligado e ZERO policies. Todo acesso
-- passa pela chave de serviço, usada só no servidor. Ver `schema.sql`.
alter table conversas enable row level security;
