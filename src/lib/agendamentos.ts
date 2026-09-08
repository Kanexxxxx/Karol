import "server-only";

import { banco } from "./banco";
import {
  blocoDoAgendamento,
  deChave,
  expedienteDoDia,
  expedientesDoDia,
  fatiarPorDia,
  gradeDoDia,
  horariosLivres,
  paraChave,
  primeiroDiaDisponivel,
  type Horario,
  type Intervalo,
  type VagaNaGrade,
} from "./agenda";
import { lerPeriodo, montarPeriodo } from "./periodo";
import { enviarEvento } from "./notificacoes";
import { normalizarWhatsapp } from "./telefone";
import { buscarServico, buscarServicoAgendavel, type Servico } from "@/data/servicos";
import { CIDADES, NEGOCIO, type CidadeId } from "@/data/negocio";

export type Agendamento = {
  id: string;
  clienteNome: string;
  clienteWhatsapp: string;
  servicoId: string;
  servicoNome: string;
  servicoPreco: number;
  cidade: string;
  inicio: Date;
  fim: Date;
  situacao: "pendente" | "confirmado" | "cancelado" | "concluido" | "faltou";
  observacao: string | null;
  /**
   * Quando o lembrete de 30 min antes saiu. `null` = ainda não saiu.
   *
   * Está no tipo porque o painel MOSTRA isso no cartão: sem ver o estado,
   * a Karol não sabe se pode tocar em "Lembrar agora" ou se vai mandar a
   * mesma mensagem duas vezes pra cliente. Ver migracao-04.
   */
  avisado30minEm: Date | null;
};

/** Converte minutos do dia numa data completa, no fuso local do servidor. */
function emData(dia: Date, minutos: number): Date {
  const d = new Date(dia);
  d.setHours(0, minutos, 0, 0);
  return d;
}

/** Converte uma linha da tabela `agendamentos` no tipo usado pela aplicação. */
function linhaParaAgendamento(r: Record<string, unknown>): Agendamento {
  const p = lerPeriodo(r.periodo as string);
  return {
    id: r.id as string,
    clienteNome: r.cliente_nome as string,
    clienteWhatsapp: r.cliente_whatsapp as string,
    servicoId: r.servico_id as string,
    servicoNome: r.servico_nome as string,
    servicoPreco: r.servico_preco as number,
    cidade: r.cidade as string,
    inicio: p?.inicio ?? new Date(),
    fim: p?.fim ?? new Date(),
    situacao: r.situacao as Agendamento["situacao"],
    observacao: (r.observacao as string | null) ?? null,
    // A coluna é nova (migracao-04). Em banco que ainda não migrou ela vem
    // `undefined`, e o `??` faz isso virar `null` — o painel mostra "não
    // avisado" em vez de quebrar.
    avisado30minEm: r.avisado_30min_em ? new Date(r.avisado_30min_em as string) : null,
  };
}

/** Lê o que já está ocupado num intervalo de dias, agrupado por data. */
async function ocupadosNoPeriodo(
  de: Date,
  ate: Date,
): Promise<Record<string, Intervalo[]>> {
  const bd = banco();
  if (!bd) return {};

  const janela = montarPeriodo(de, ate);

  const [ags, blqs] = await Promise.all([
    bd
      .from("agendamentos")
      .select("periodo")
      .in("situacao", ["pendente", "confirmado", "concluido"])
      .overlaps("periodo", janela),
    bd.from("bloqueios").select("periodo").overlaps("periodo", janela),
  ]);

  const porDia: Record<string, Intervalo[]> = {};

  // Um período pode atravessar a meia-noite (férias são um range só), então
  // ele é recortado dia a dia. Achatar as duas pontas com getHours() fazia
  // todo bloqueio de dia fechado virar intervalo vazio — ver fatiarPorDia.
  const somar = (periodo: string) => {
    const p = lerPeriodo(periodo);
    if (!p) return;
    for (const fatia of fatiarPorDia(p.inicio, p.fim)) {
      (porDia[fatia.chave] ??= []).push({ inicio: fatia.inicio, fim: fatia.fim });
    }
  };

  (ags.data ?? []).forEach((r) => somar(r.periodo as string));
  (blqs.data ?? []).forEach((r) => somar(r.periodo as string));

  return porDia;
}

/**
 * Dias com vaga para um serviço, já consultando o que está ocupado.
 *
 * Devolve a CIDADE junto: ela muda com o dia da semana (Pereira Barreto de
 * segunda a sexta, Bandeirantes no sábado) e sem isso a cliente escolhia o
 * dia sem saber pra onde ia — descobria só no passo seguinte.
 */
export async function diasComVaga(servico: Servico, quantidade = 21) {
  const de = primeiroDiaDisponivel();
  const ate = new Date(de);
  ate.setDate(ate.getDate() + 60);

  const ocupados = await ocupadosNoPeriodo(de, ate);
  const dias: { chave: string; data: Date; vagas: number; cidade: CidadeId }[] = [];

  for (let i = 0; i < 60 && dias.length < quantidade; i++) {
    const data = new Date(de);
    data.setDate(de.getDate() + i);
    const chave = paraChave(data);
    const livres = horariosLivres({ data, servico, ocupados: ocupados[chave] ?? [] });
    if (livres.length > 0) {
      dias.push({ chave, data, vagas: livres.length, cidade: livres[0].cidade });
    }
  }

  return dias;
}

/**
 * Um mês inteiro, dia a dia, para uma cidade.
 *
 * A tela de escolher o dia é um calendário: precisa saber o que existe em
 * TODOS os dias do mês, inclusive nos que ela não atende e nos que já
 * lotaram — e não só a lista dos que sobraram.
 *
 * Uma consulta só cobre o mês inteiro. Fazer uma por dia seriam trinta
 * idas ao banco pra desenhar uma tela.
 */
export type DiaDoMes = {
  chave: string;
  data: Date;
  /** dia do mês, 1 a 31 */
  numero: number;
  /** ela atende nesse dia da semana, nessa cidade */
  atende: boolean;
  /** cedo demais: hoje ou antes da antecedência mínima */
  cedoDemais: boolean;
  /**
   * O dia já ficou pra trás.
   *
   * ⚠️ Existe separado de `cedoDemais` porque o calendário precisa DIZER
   * coisas diferentes. Os dois pintavam a mesma célula cinza com a legenda
   * "não atende" — e aí, numa segunda-feira, o dia de hoje aparecia como
   * dia em que ela não trabalha, sendo que segunda é dia útil dela. Quem
   * abria o site na segunda via a primeira semana inteira apagada e
   * concluía que a agenda estava fechada.
   *
   * `passou` = acabou. `cedoDemais && !passou` = ainda é hoje, mas ela só
   * marca a partir de amanhã.
   */
  passou: boolean;
  vagas: number;
  total: number;
};

export async function mesDeVagas(
  servico: Servico,
  cidade: CidadeId,
  ano: number,
  mes: number,
): Promise<DiaDoMes[]> {
  const primeiro = new Date(ano, mes, 1);
  const depoisDoUltimo = new Date(ano, mes + 1, 1);

  const ocupados = await ocupadosNoPeriodo(primeiro, depoisDoUltimo);
  const limite = primeiroDiaDisponivel();

  // Meia-noite de hoje. Comparar com `new Date()` cru faria o dia de hoje
  // "passar" ao longo da manhã, e o calendário mudaria de significado
  // sozinho entre uma visita e outra.
  const agora = new Date();
  const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());

  const dias: DiaDoMes[] = [];
  for (let d = new Date(primeiro); d < depoisDoUltimo; d.setDate(d.getDate() + 1)) {
    const data = new Date(d);
    const chave = paraChave(data);
    const expedientes = expedientesDoDia(data);
    const atende = expedientes.some((e) => e.cidade === cidade);
    const cedoDemais = data < limite;
    const passou = data < hoje;

    const grade =
      atende && !cedoDemais
        ? gradeDoDia({ data, servico, ocupados: ocupados[chave] ?? [], cidade })
        : [];

    dias.push({
      chave,
      data,
      numero: data.getDate(),
      atende,
      cedoDemais,
      passou,
      vagas: grade.filter((v) => v.livre).length,
      total: grade.length,
    });
  }

  return dias;
}

/** A grade de um dia, com o que está livre e o que já foi tomado. */
export async function gradeDoDiaNaAgenda(
  servico: Servico,
  chave: string,
): Promise<VagaNaGrade[]> {
  const data = deChave(chave);
  const fim = new Date(data);
  fim.setDate(fim.getDate() + 1);
  const ocupados = await ocupadosNoPeriodo(data, fim);
  return gradeDoDia({ data, servico, ocupados: ocupados[chave] ?? [] });
}

/** Horários livres de um dia específico. */
export async function horariosDoDia(
  servico: Servico,
  chave: string,
): Promise<Horario[]> {
  const data = deChave(chave);
  const fim = new Date(data);
  fim.setDate(fim.getDate() + 1);

  const ocupados = await ocupadosNoPeriodo(data, fim);
  return horariosLivres({ data, servico, ocupados: ocupados[chave] ?? [] });
}

export type ResultadoAgendamento =
  | { ok: true; id: string; quando: Date; cidade: string }
  | { ok: false; erro: string };

/**
 * Grava o agendamento.
 *
 * A checagem de conflito é feita pelo banco, não por aqui: a restrição
 * `sem_choque` recusa qualquer sobreposição. Conferir antes e gravar depois
 * abriria uma janela pra duas clientes pegarem o mesmo horário no mesmo
 * instante — o banco fecha essa janela.
 */
export async function criarAgendamento(dados: {
  servicoId: string;
  chaveDia: string;
  inicioMin: number;
  nome: string;
  whatsapp: string;
  observacao?: string;
}): Promise<ResultadoAgendamento> {
  const bd = banco();
  if (!bd) return { ok: false, erro: "O agendamento online ainda não está ligado." };

  // `buscarServicoAgendavel` e não `buscarServico`: tirar o curso da LISTA
  // da tela não impede ninguém de mandar o id dele no POST. A tela é
  // conveniência; a regra mora aqui. O painel continua podendo marcar
  // curso na mão, porque lá quem decide é a Karol.
  const servico = buscarServicoAgendavel(dados.servicoId);
  if (!servico) return { ok: false, erro: "Serviço não encontrado." };

  const dia = deChave(dados.chaveDia);
  const livres = await horariosDoDia(servico, dados.chaveDia);
  if (!livres.some((h) => h.inicio === dados.inicioMin)) {
    return { ok: false, erro: "Esse horário acabou de ser ocupado. Escolha outro." };
  }

  const bloco = blocoDoAgendamento(dados.inicioMin, servico);
  const inicio = emData(dia, bloco.inicio);
  const fim = emData(dia, bloco.fim);
  const cidade = livres.find((h) => h.inicio === dados.inicioMin)!.cidade;

  const { data, error } = await bd
    .from("agendamentos")
    .insert({
      cliente_nome: dados.nome.trim(),
      cliente_whatsapp: dados.whatsapp.replace(/\D/g, ""),
      servico_id: servico.id,
      servico_nome: servico.nome,
      servico_preco: servico.preco * 100,
      cidade: CIDADES[cidade].nome,
      periodo: montarPeriodo(inicio, fim),
      observacao: dados.observacao?.trim() || null,
    })
    .select("id")
    .single();

  if (error) {
    // 23P01 = violação da restrição de exclusão: alguém pegou o horário antes
    if (error.code === "23P01") {
      return { ok: false, erro: "Esse horário acabou de ser ocupado. Escolha outro." };
    }
    return { ok: false, erro: "Não consegui salvar agora. Tente de novo em instantes." };
  }

  // Avisa a Karol e confirma pra cliente. Não bloqueia nem quebra o
  // agendamento se falhar (enviarEvento engole o erro).
  const notif = {
    id: data.id,
    cliente: dados.nome.trim(),
    whatsappCliente: dados.whatsapp.replace(/\D/g, ""),
    servico: servico.nome,
    cidade: CIDADES[cidade].nome,
    inicioISO: inicio.toISOString(),
    valorCentavos: servico.preco * 100,
    // ⚠️ o recado da cliente. Ficava só no banco e no painel — a Karol
    // nunca via antes de atender. Ver `DadosAgendamento.observacao`.
    observacao: dados.observacao?.trim() || null,
  };
  await Promise.all([
    enviarEvento("novo-agendamento", notif),
    enviarEvento("confirmacao", notif),
  ]);

  return { ok: true, id: data.id, quando: inicio, cidade: CIDADES[cidade].nome };
}

/** Confirmados que começam amanhã — base do lembrete de 1 dia antes. */
export async function agendamentosDeAmanha(): Promise<Agendamento[]> {
  const bd = banco();
  if (!bd) return [];

  const hoje = new Date();
  const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 1);
  const fim = new Date(inicio);
  fim.setDate(fim.getDate() + 1);

  const { data } = await bd
    .from("agendamentos")
    .select("*")
    .eq("situacao", "confirmado")
    .overlaps("periodo", montarPeriodo(inicio, fim))
    .order("periodo", { ascending: true });

  return (data ?? []).map(linhaParaAgendamento);
}

/**
 * Quanto tempo antes do horário o lembrete curto sai.
 *
 * ⚠️ Não é o intervalo do cron, é a JANELA de varredura — e a diferença
 * decide quanto aviso a cliente recebe de verdade.
 *
 * O cron externo bate aqui de tempos em tempos e leva quem começa dentro
 * desta janela. Com janela de 35 min e cron de 10 em 10 min, a cliente é
 * avisada entre 25 e 35 minutos antes. Se o cron for de 15 em 15, vira
 * 20 a 35. Nunca é exatamente 30 — não dá pra ser, a não ser rodando de
 * minuto em minuto, o que não vale o gasto.
 *
 * Ver WHATSAPP.md pra configurar o cron.
 */
export const JANELA_LEMBRETE_MIN = 35;

/**
 * Confirmados que começam já — base do lembrete de 30 min antes.
 *
 * Devolve só quem AINDA NÃO foi avisado. Sem esse filtro, um cron de 10 em
 * 10 minutos manda a mesma mensagem três ou quatro vezes pra mesma pessoa.
 *
 * A consulta pega uma janela larga no banco e afina em JS de propósito: o
 * `overlaps` do PostgREST casa período que CRUZA a janela, e isso incluiria
 * um atendimento longo que começou faz uma hora e ainda está rolando. Quem
 * decide é o INÍCIO, e o início a gente só tem depois de ler o range. São
 * poucas linhas — a janela inteira do dia da Karol tem 4 horas.
 */
export async function agendamentosParaLembrar(
  janelaMin = JANELA_LEMBRETE_MIN,
): Promise<Agendamento[]> {
  const bd = banco();
  if (!bd) return [];

  const agora = new Date();
  const ate = new Date(agora.getTime() + janelaMin * 60_000);

  // 4 h pra trás cobre o atendimento mais longo em andamento (o curso, 130
  // min) com folga. Eles entram na consulta e saem no filtro abaixo.
  const de = new Date(agora.getTime() - 4 * 60 * 60_000);

  const { data } = await bd
    .from("agendamentos")
    .select("*")
    .eq("situacao", "confirmado")
    .is("avisado_30min_em", null)
    .overlaps("periodo", montarPeriodo(de, ate))
    .order("periodo", { ascending: true });

  return (data ?? [])
    .map(linhaParaAgendamento)
    .filter((a) => a.inicio > agora && a.inicio <= ate);
}

/**
 * Marca que o lembrete curto saiu.
 *
 * ⚠️ Quem chama marca ANTES de mandar, não depois. Parece errado e não é:
 * entre o envio e a marcação cabe a próxima batida do cron, e aí a cliente
 * recebe duas mensagens iguais. Marcar primeiro troca o pior defeito
 * (mandar demais, que a cliente vê) pelo menos pior (não mandar, que a
 * Karol resolve tocando em "Lembrar agora" no cartão).
 *
 * Devolve `false` quando a linha não foi marcada — inclusive quando outra
 * execução do cron marcou primeiro. Quem chama usa isso pra desistir.
 */
export async function marcarLembreteEnviado(id: string): Promise<boolean> {
  const bd = banco();
  if (!bd) return false;
  if (!/^[0-9a-f-]{32,36}$/i.test(id)) return false;

  // `is("avisado_30min_em", null)` no UPDATE é o que torna a marcação uma
  // CORRIDA que só um vence: duas execuções simultâneas do cron mandam o
  // mesmo update, e a segunda não acha mais linha nenhuma pra atualizar.
  const { data, error } = await bd
    .from("agendamentos")
    .update({ avisado_30min_em: new Date().toISOString() })
    .eq("id", id)
    .is("avisado_30min_em", null)
    .select("id");

  if (error) {
    console.error("não consegui marcar o lembrete:", error.message);
    return false;
  }
  return (data ?? []).length > 0;
}

/**
 * Ainda faz sentido mandar o lembrete desta cliente?
 *
 * ⚠️ Mora aqui, e não no cartão do painel, porque `Date.now()` é chamada
 * impura: dentro de um componente ela é reavaliada a cada render e o lint
 * do React reprova (`react-hooks/purity`). E o motivo do lint é bom — num
 * componente, "agora" muda no meio do desenho da tela.
 *
 * Além disso é regra de negócio, não de tela: lembrar só vale pra
 * atendimento CONFIRMADO que ainda vai acontecer. Cancelado, concluído ou
 * vencido não têm lembrete nenhum pra mandar.
 */
export function podeLembrar(a: Agendamento, agora = Date.now()): boolean {
  return a.situacao === "confirmado" && a.inicio.getTime() > agora;
}

/** Apaga a marca, pra Karol poder mandar de novo pelo painel. */
export async function limparLembreteEnviado(id: string): Promise<void> {
  const bd = banco();
  if (!bd) return;
  if (!/^[0-9a-f-]{32,36}$/i.test(id)) return;
  await bd.from("agendamentos").update({ avisado_30min_em: null }).eq("id", id);
}

/** Atendimentos marcados como concluídos ontem — base do agradecimento. */
export async function agendamentosConcluidosOntem(): Promise<Agendamento[]> {
  const bd = banco();
  if (!bd) return [];

  const hoje = new Date();
  const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - 1);
  const fim = new Date(inicio);
  fim.setDate(fim.getDate() + 1);

  const { data } = await bd
    .from("agendamentos")
    .select("*")
    .eq("situacao", "concluido")
    .overlaps("periodo", montarPeriodo(inicio, fim))
    .order("periodo", { ascending: true });

  return (data ?? []).map(linhaParaAgendamento);
}

/** Um agendamento pelo id — tela de confirmação da cliente e painel da Karol. */
export async function buscarAgendamento(id: string): Promise<Agendamento | null> {
  const bd = banco();
  if (!bd) return null;
  if (!/^[0-9a-f-]{32,36}$/i.test(id)) return null;

  const { data } = await bd
    .from("agendamentos")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  return data ? linhaParaAgendamento(data) : null;
}

/**
 * Procura agendamento pelo que a Karol tem na mão.
 *
 * Ela chega aqui vindo do WhatsApp, com uma dessas três coisas: o código que
 * a cliente mandou, o nome que aparece na conversa, ou o número. Um campo só
 * atende os três — obrigar a escolher "buscar por…" antes de digitar é
 * fricção que não paga o que resolve.
 *
 * Busca no histórico inteiro, não só nos próximos 30 dias: quem pergunta
 * "quando foi meu último atendimento?" precisa do passado.
 */
export async function procurarAgendamentos(termo: string): Promise<Agendamento[]> {
  const bd = banco();
  if (!bd) return [];

  const limpo = termo.trim();
  if (limpo.length < 3) return [];

  /*
    ⚠️ Aqui existia um terceiro caminho: o código de seis caracteres do
    agendamento. Ele foi REMOVIDO do projeto inteiro a pedido do Kainã, e a
    razão é boa — era mais uma coisa pra Karol decorar e explicar, e ela já
    tem na mão as duas que resolvem: o nome e o telefone de quem está
    falando com ela no WhatsApp.

    Se algum dia voltar a ideia de "achar rápido pelo código", a resposta é
    não: o link que chega no WhatsApp dela já abre o painel filtrado pelo
    telefone da cliente. Ninguém digita nada.
  */
  const digitos = limpo.replace(/\D/g, "");
  // Quatro dígitos é o mínimo que distingue alguém — menos que isso casa com
  // meia agenda e a Karol acha mais rápido rolando a tela.
  const coluna = digitos.length >= 4 ? "cliente_whatsapp" : "cliente_nome";
  const alvo = digitos.length >= 4 ? digitos : limpo;

  const { data } = await bd
    .from("agendamentos")
    .select("*")
    // `%` e `_` são curingas do LIKE: sem escapar, um nome com underline
    // vira busca genérica. `\` escapa os dois no Postgres.
    .ilike(coluna, `%${alvo.replace(/[\\%_]/g, (c) => `\\${c}`)}%`)
    .order("periodo", { ascending: false })
    .limit(LIMITE_BUSCA);

  return (data ?? []).map(linhaParaAgendamento);
}

/** Teto de resultados da busca. Ela procura UMA cliente, não relatório. */
const LIMITE_BUSCA = 25;

/**
 * O próximo atendimento marcado deste número.
 *
 * Serve o webhook do WhatsApp: a cliente escreve, e o que ela quase sempre
 * quer saber é do horário que ainda vai acontecer. Cancelado e concluído
 * ficam de fora — quem pergunta "que horas é o meu?" não está falando do
 * que já passou.
 */
export async function proximoAgendamentoDe(whatsapp: string): Promise<Agendamento | null> {
  const bd = banco();
  if (!bd) return null;
  if (!/^[0-9]{10,15}$/.test(whatsapp)) return null;

  // `overlaps` e não `gte`: `periodo` é um tstzrange, e comparar range com
  // timestamp não é a mesma operação. O overlaps ainda usa o índice gist.
  const agora = new Date();
  const limite = new Date(agora);
  limite.setFullYear(limite.getFullYear() + 1);

  const { data } = await bd
    .from("agendamentos")
    .select("*")
    .eq("cliente_whatsapp", whatsapp)
    .in("situacao", ["pendente", "confirmado"])
    .overlaps("periodo", montarPeriodo(agora, limite))
    .order("periodo", { ascending: true })
    .limit(1);

  const linha = (data ?? [])[0];
  return linha ? linhaParaAgendamento(linha) : null;
}

export type SituacaoAgendamento = Agendamento["situacao"];

const SITUACOES: SituacaoAgendamento[] = [
  "pendente",
  "confirmado",
  "cancelado",
  "concluido",
  "faltou",
];

/**
 * Muda a situação de um agendamento (painel da Karol).
 *
 * Reativar um cancelado pode esbarrar na trava `sem_choque` se o horário já
 * foi retomado — nesse caso o Postgres recusa e devolvemos o motivo.
 */
export async function mudarSituacao(
  id: string,
  situacao: string,
): Promise<{ ok: boolean; erro?: string }> {
  const bd = banco();
  if (!bd) return { ok: false, erro: "Banco não configurado." };
  if (!/^[0-9a-f-]{32,36}$/i.test(id)) return { ok: false, erro: "Agendamento inválido." };
  if (!SITUACOES.includes(situacao as SituacaoAgendamento)) {
    return { ok: false, erro: "Situação inválida." };
  }

  // Lido ANTES do update: depois já não dá pra saber de onde veio.
  const antes = await buscarAgendamento(id);

  const { error } = await bd.from("agendamentos").update({ situacao }).eq("id", id);
  if (error) {
    if (error.code === "23P01") {
      return { ok: false, erro: "Esse horário já foi retomado por outra cliente." };
    }
    return { ok: false, erro: "Não consegui salvar agora." };
  }

  /*
    Cancelar sem avisar é o pior jeito de cancelar: a cliente se arruma,
    se desloca, e descobre na porta.

    Só quando o horário AINDA IA ACONTECER e só quando a mudança é pra
    cancelado. Marcar "faltou" ou "atendida" é registro do que já passou —
    mandar mensagem nesses seria constrangedor.
  */
  if (
    situacao === "cancelado" &&
    antes &&
    antes.situacao !== "cancelado" &&
    antes.inicio.getTime() > Date.now()
  ) {
    await enviarEvento("cancelado", {
      id,
      cliente: antes.clienteNome,
      whatsappCliente: antes.clienteWhatsapp,
      servico: antes.servicoNome,
      cidade: antes.cidade,
      inicioISO: antes.inicio.toISOString(),
      valorCentavos: antes.servicoPreco,
    });
  }

  return { ok: true };
}

/** Agenda da Karol, para o painel. */
export async function agendaDaKarol(deDias = 0, ateDias = 30): Promise<Agendamento[]> {
  const bd = banco();
  if (!bd) return [];

  const hoje = new Date();
  const de = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + deDias);
  const ate = new Date(de);
  ate.setDate(ate.getDate() + ateDias);

  const { data } = await bd
    .from("agendamentos")
    .select("*")
    .overlaps("periodo", montarPeriodo(de, ate))
    .order("periodo", { ascending: true });

  return (data ?? []).map(linhaParaAgendamento);
}

/* ------------------------------------------------------------------ */
/* O que a Karol faz pelo painel                                       */
/* ------------------------------------------------------------------ */

/** Constrói o período de um atendimento a partir do dia e da hora. */
function periodoDe(chaveDia: string, horaMin: number, servico: Servico) {
  const dia = deChave(chaveDia);
  const bloco = blocoDoAgendamento(horaMin, servico);
  return { inicio: emData(dia, bloco.inicio), fim: emData(dia, bloco.fim) };
}

/** "08:30" → 510. Devolve null se não for hora válida. */
export function horaEmMinutos(hora: string): number | null {
  const m = hora.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

/**
 * Agendamento criado pela própria Karol, no painel.
 *
 * Difere do fluxo da cliente de propósito: aqui ela escolhe QUALQUER
 * horário, não só os da grade. É pra encaixar a mãe, o pai, uma cliente
 * que ligou — casos que não cabem no passo de 15 minutos.
 *
 * A segurança contra choque continua sendo a mesma do site: a restrição
 * `sem_choque` no banco. Ela é quem recusa sobreposição, aqui e lá.
 */
export async function criarAgendamentoNoPainel(dados: {
  servicoId: string;
  cidade: CidadeId;
  chaveDia: string;
  hora: string;
  nome: string;
  whatsapp: string;
  observacao?: string;
}): Promise<{ ok: boolean; id?: string; erro?: string }> {
  const bd = banco();
  if (!bd) return { ok: false, erro: "Banco não configurado." };

  const servico = buscarServico(dados.servicoId);
  if (!servico) return { ok: false, erro: "Serviço não encontrado." };

  const horaMin = horaEmMinutos(dados.hora);
  if (horaMin === null) return { ok: false, erro: "Hora no formato HH:MM." };

  const nome = dados.nome.trim();
  if (nome.length < 2 || nome.length > 120) {
    return { ok: false, erro: "Escreva o nome (2 a 120 letras)." };
  }

  // Vazio é permitido aqui (encaixe da família, sem WhatsApp). Preenchido,
  // tem que sair com DDI — ver a explicação em lib/telefone.ts.
  const bruto = dados.whatsapp.trim();
  const whatsapp = bruto ? normalizarWhatsapp(bruto) : "";
  if (bruto && !whatsapp) {
    return { ok: false, erro: "WhatsApp com DDD, só números." };
  }

  const { inicio, fim } = periodoDe(dados.chaveDia, horaMin, servico);
  if (Number.isNaN(inicio.getTime())) return { ok: false, erro: "Data inválida." };

  const { data, error } = await bd
    .from("agendamentos")
    .insert({
      cliente_nome: nome,
      // sem WhatsApp (encaixe da família, por exemplo) o CHECK do banco
      // recusaria vazio, então guarda o número dela mesma
      cliente_whatsapp: whatsapp || NEGOCIO.whatsapp.numero,
      servico_id: servico.id,
      servico_nome: servico.nome,
      servico_preco: servico.preco * 100,
      cidade: CIDADES[dados.cidade].nome,
      periodo: montarPeriodo(inicio, fim),
      observacao: dados.observacao?.trim() || null,
    })
    .select("id")
    .single();

  if (error) {
    if ((error as { code?: string }).code === "23P01") {
      return { ok: false, erro: "Já existe atendimento nesse horário." };
    }
    return { ok: false, erro: "Não consegui salvar agora." };
  }

  /*
    A cliente precisa saber, mesmo quando quem marcou foi a Karol.

    Antes isto não avisava ninguém: ela encaixava alguém pelo painel e a
    pessoa nunca recebia confirmação, nem lembrete da véspera com o horário
    escrito. Marcar pelo painel virava um acordo verbal com data.

    Só a `confirmacao` sai — o `novo-agendamento` avisa a Karol, e ela é
    quem acabou de marcar. E só quando existe WhatsApp de verdade: sem
    número, a linha guarda o dela e mandar seria avisar ela mesma.
  */
  if (whatsapp) {
    await enviarEvento("confirmacao", {
      id: data.id,
      cliente: nome,
      whatsappCliente: whatsapp,
      servico: servico.nome,
      cidade: CIDADES[dados.cidade].nome,
      inicioISO: inicio.toISOString(),
      valorCentavos: servico.preco * 100,
    });
  }

  return { ok: true, id: data.id };
}

/**
 * Remarca um atendimento: muda o dia e a hora, mantendo o resto.
 *
 * O bloco é recalculado pela duração do serviço gravado, não pela duração
 * antiga — se o serviço mudou de duração no meio do caminho, o horário
 * remarcado sai com o tempo certo.
 */
export async function remarcarAgendamento(
  id: string,
  chaveDia: string,
  hora: string,
): Promise<{ ok: boolean; erro?: string }> {
  const bd = banco();
  if (!bd) return { ok: false, erro: "Banco não configurado." };
  if (!/^[0-9a-f-]{32,36}$/i.test(id)) return { ok: false, erro: "Agendamento inválido." };

  const horaMin = horaEmMinutos(hora);
  if (horaMin === null) return { ok: false, erro: "Hora no formato HH:MM." };

  const atual = await buscarAgendamento(id);
  if (!atual) return { ok: false, erro: "Agendamento não encontrado." };

  const servico = buscarServico(atual.servicoId);
  if (!servico) return { ok: false, erro: "Serviço do agendamento não existe mais." };

  const { inicio, fim } = periodoDe(chaveDia, horaMin, servico);
  if (Number.isNaN(inicio.getTime())) return { ok: false, erro: "Data inválida." };

  const { error } = await bd
    .from("agendamentos")
    .update({ periodo: montarPeriodo(inicio, fim) })
    .eq("id", id);

  if (error) {
    if ((error as { code?: string }).code === "23P01") {
      return { ok: false, erro: "Já existe atendimento nesse horário." };
    }
    return { ok: false, erro: "Não consegui remarcar agora." };
  }

  /*
    ⚠️ Remarcar SEM avisar era o pior dos três buracos: a agenda da Karol
    passava a dizer uma coisa e a cliente continuava sabendo outra. Ela
    aparecia na hora antiga, no dia antigo, e as duas ficavam achando que a
    errada era a outra.
  */
  await enviarEvento("remarcado", {
    id,
    cliente: atual.clienteNome,
    whatsappCliente: atual.clienteWhatsapp,
    servico: atual.servicoNome,
    cidade: atual.cidade,
    inicioISO: inicio.toISOString(),
    valorCentavos: atual.servicoPreco,
  });

  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* Relatório do mês                                                    */
/* ------------------------------------------------------------------ */

export type LinhaRelatorio = { nome: string; quantidade: number; total: number };

/**
 * Um atendimento na lista do relatório, com o contato junto.
 *
 * Serve pras duas listas que a tela mostra — quem faltou e quem ficou sem
 * marcação. Nos dois casos o número de quem é vale mais que o número
 * agregado: o que a Karol FAZ com essa informação é falar com a pessoa.
 */
export type ItemRelatorio = {
  id: string;
  cliente: string;
  whatsapp: string;
  servico: string;
  quando: Date;
  valor: number;
};

/** Nome antigo, mantido porque a tela de relatório importa por ele. */
export type Falta = ItemRelatorio;

export type Relatorio = {
  atendidas: number;
  faltaram: number;
  canceladas: number;
  /** confirmados que ainda vão acontecer (ou não foram marcados ainda) */
  pendentes: number;
  /** em centavos, só do que ela marcou como Atendida */
  faturamento: number;
  /** em centavos */
  ticketMedio: number;
  /** % de faltas sobre o que já passou (atendidas + faltas) */
  taxaFalta: number;
  /** quanto deixou de entrar por causa das faltas, em centavos */
  perdidoComFaltas: number;
  porServico: LinhaRelatorio[];
  porCidade: LinhaRelatorio[];
  /** as faltas do mês, da mais recente pra mais antiga */
  faltas: ItemRelatorio[];

  /**
   * Horários que JÁ PASSARAM e continuam "confirmado".
   *
   * ⚠️ Este é o furo silencioso do relatório. O faturamento conta só quem
   * ela marcou como Atendida — e ela marca no fim do dia, quando lembra.
   * Cada esquecimento é dinheiro que aconteceu e não aparece, e o relatório
   * mente pra baixo sem nenhum sinal de que está mentindo.
   *
   * Aparecer numa lista com botão resolve o problema onde ele é percebido.
   */
  aMarcar: ItemRelatorio[];
  /** quanto está pendurado nesses atendimentos sem marcação, em centavos */
  aMarcarValor: number;

  /**
   * O mesmo mês anterior, pra comparar. `null` quando não há nada antes.
   *
   * Número solto não diz se o mês foi bom. R$ 1.200 é ótimo depois de 800 e
   * ruim depois de 1.600 — e é essa a pergunta que ela faz olhando aqui.
   */
  anterior: { faturamento: number; atendidas: number } | null;

  /**
   * Clientes novas contra clientes que voltaram, entre as atendidas do mês.
   *
   * É o número que mais diz sobre o negócio dela e o único que o relatório
   * não tinha: sobrancelha vive de retorno (a cada 3 ou 4 semanas), então
   * um mês só de clientes novas é um mês que não fideliza.
   */
  novas: number;
  retornaram: number;
};

/**
 * Números do mês, para o painel.
 *
 * **O faturamento conta só o que ela marcou como Atendida.** Agendamento
 * confirmado que ainda não aconteceu não vira dinheiro no relatório — senão
 * o número sobe no começo do mês e cai quando alguém falta, o que confunde
 * mais do que informa.
 *
 * ⚠️ O valor vem do preço da tabela **no momento do agendamento**, que fica
 * congelado na linha. Se ela cobrar diferente na hora (desconto pra amiga,
 * combinado à parte), o relatório não sabe.
 */
export async function relatorioDoMes(ano: number, mes: number): Promise<Relatorio> {
  const vazio: Relatorio = {
    atendidas: 0, faltaram: 0, canceladas: 0, pendentes: 0,
    faturamento: 0, ticketMedio: 0, taxaFalta: 0, perdidoComFaltas: 0,
    porServico: [], porCidade: [], faltas: [],
    aMarcar: [], aMarcarValor: 0, anterior: null, novas: 0, retornaram: 0,
  };

  const bd = banco();
  if (!bd) return vazio;

  const primeiro = new Date(ano, mes, 1);
  const depoisDoUltimo = new Date(ano, mes + 1, 1);

  const { data } = await bd
    .from("agendamentos")
    .select("*")
    .overlaps("periodo", montarPeriodo(primeiro, depoisDoUltimo))
    .order("periodo", { ascending: true });

  const linhas = (data ?? []).map(linhaParaAgendamento);
  if (linhas.length === 0) return vazio;

  const r = {
    ...vazio,
    porServico: [], porCidade: [], faltas: [], aMarcar: [],
  } as Relatorio;
  const agora = Date.now();
  const servicos = new Map<string, LinhaRelatorio>();
  const cidades = new Map<string, LinhaRelatorio>();
  const atendidasDoMes: Agendamento[] = [];

  for (const a of linhas) {
    if (a.situacao === "cancelado") { r.canceladas++; continue; }
    if (a.situacao === "faltou") {
      r.faltaram++;
      r.perdidoComFaltas += a.servicoPreco;
      r.faltas.push(paraItem(a));
      continue;
    }
    if (a.situacao !== "concluido") {
      r.pendentes++;
      // Já passou da hora e ninguém marcou nada: provavelmente aconteceu e
      // ela esqueceu. Vira lista com botão em vez de sumir na contagem.
      if (a.inicio.getTime() < agora) {
        r.aMarcar.push(paraItem(a));
        r.aMarcarValor += a.servicoPreco;
      }
      continue;
    }

    r.atendidas++;
    atendidasDoMes.push(a);
    r.faturamento += a.servicoPreco;

    for (const [mapa, chave] of [
      [servicos, a.servicoNome],
      [cidades, a.cidade],
    ] as const) {
      const atual = mapa.get(chave) ?? { nome: chave, quantidade: 0, total: 0 };
      atual.quantidade++;
      atual.total += a.servicoPreco;
      mapa.set(chave, atual);
    }
  }

  const passadas = r.atendidas + r.faltaram;
  r.ticketMedio = r.atendidas > 0 ? Math.round(r.faturamento / r.atendidas) : 0;
  r.taxaFalta = passadas > 0 ? Math.round((r.faltaram / passadas) * 100) : 0;

  // da falta mais recente pra mais antiga: a de ontem importa mais
  r.faltas.sort((a, b) => b.quando.getTime() - a.quando.getTime());

  // da mais recente pra mais antiga também: ela resolve de trás pra frente
  r.aMarcar.sort((a, b) => b.quando.getTime() - a.quando.getTime());

  const porTotal = (a: LinhaRelatorio, b: LinhaRelatorio) => b.total - a.total;
  r.porServico = [...servicos.values()].sort(porTotal);
  r.porCidade = [...cidades.values()].sort(porTotal);

  const [anterior, historico] = await Promise.all([
    totalDoMesAnterior(ano, mes),
    quemJaTinhaVindo(atendidasDoMes.map((a) => a.clienteWhatsapp), primeiro),
  ]);

  r.anterior = anterior;

  // Contado por PESSOA, não por atendimento: quem veio duas vezes no mesmo
  // mês é uma cliente, não duas. Sem isso, quem faz sobrancelha de 15 em 15
  // dias apareceria inflando o número de "novas".
  const numeros = new Set(atendidasDoMes.map((a) => a.clienteWhatsapp));
  for (const n of numeros) {
    if (historico.has(n)) r.retornaram++;
    else r.novas++;
  }

  return r;
}

function paraItem(a: Agendamento): ItemRelatorio {
  return {
    id: a.id,
    cliente: a.clienteNome,
    whatsapp: a.clienteWhatsapp,
    servico: a.servicoNome,
    quando: a.inicio,
    valor: a.servicoPreco,
  };
}

/** Faturamento e atendimentos do mês anterior, só pra comparação. */
async function totalDoMesAnterior(
  ano: number,
  mes: number,
): Promise<{ faturamento: number; atendidas: number } | null> {
  const bd = banco();
  if (!bd) return null;

  const primeiro = new Date(ano, mes - 1, 1);
  const depois = new Date(ano, mes, 1);

  const { data } = await bd
    .from("agendamentos")
    .select("servico_preco")
    .eq("situacao", "concluido")
    .overlaps("periodo", montarPeriodo(primeiro, depois));

  if (!data || data.length === 0) return null;

  return {
    faturamento: data.reduce((t, l) => t + ((l.servico_preco as number) ?? 0), 0),
    atendidas: data.length,
  };
}

/**
 * Desses números, quais já tinham sido atendidos ANTES do mês.
 *
 * Uma consulta só, com `in`, em vez de uma por cliente. A janela vai desde
 * 2020 (o negócio não existia antes) até a virada do mês.
 */
async function quemJaTinhaVindo(
  numeros: string[],
  antesDe: Date,
): Promise<Set<string>> {
  const bd = banco();
  const unicos = [...new Set(numeros)];
  if (!bd || unicos.length === 0) return new Set();

  const { data } = await bd
    .from("agendamentos")
    .select("cliente_whatsapp")
    .eq("situacao", "concluido")
    .in("cliente_whatsapp", unicos)
    .overlaps("periodo", montarPeriodo(new Date(2020, 0, 1), antesDe));

  return new Set((data ?? []).map((l) => l.cliente_whatsapp as string));
}
