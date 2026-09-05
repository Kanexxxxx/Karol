-- Correções apontadas pelo Security Advisor do Supabase.
--
-- Rode UMA VEZ, num banco que já tem o `schema.sql` aplicado.
-- Banco novo já sai certo: o `schema.sql` foi corrigido junto com isto.

-- ---------------------------------------------------------------------
-- 1. Policies que não serviam a ninguém — e abriam a agenda inteira
-- ---------------------------------------------------------------------
--
-- As três policies eram `to authenticated using (true)`, ou seja: acesso
-- total a quem estiver logado pelo Supabase Auth.
--
-- Só que este projeto NÃO usa Supabase Auth. O painel da Karol tem sessão
-- própria (cookie assinado) e todo acesso ao banco passa pela chave de
-- serviço, que ignora o RLS por definição. Nenhuma dessas policies era
-- exercida por ninguém.
--
-- O risco não era hoje, era amanhã: bastava alguém habilitar cadastro no
-- projeto pra qualquer conta criada passar a ler nome e WhatsApp de todas
-- as clientes. Com RLS ligado e ZERO policies, ninguém entra além da
-- chave de serviço — que é exatamente o desenho do projeto.

drop policy if exists "karol le tudo" on agendamentos;
drop policy if exists "karol escreve tudo" on agendamentos;
drop policy if exists "karol gerencia bloqueios" on bloqueios;

-- ---------------------------------------------------------------------
-- 2. search_path fixo na função do trigger
-- ---------------------------------------------------------------------
--
-- Sem `set search_path`, a função resolve nomes pelo search_path de quem
-- dispara o trigger. Fixando em vazio, ela só enxerga o `pg_catalog`.

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
