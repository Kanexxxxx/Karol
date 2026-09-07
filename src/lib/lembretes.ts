import "server-only";

import {
  agendamentosConcluidosOntem,
  agendamentosDeAmanha,
  agendamentosParaLembrar,
  marcarLembreteEnviado,
  type Agendamento,
} from "./agendamentos";
import { enviarEvento, type DadosAgendamento } from "./notificacoes";

/**
 * Os lembretes.
 *
 * São DOIS relógios diferentes, e é isso que explica a divisão deste
 * arquivo:
 *
 * - `rodarLembretes()` — o da véspera e o agradecimento. Varre o dia
 *   inteiro de uma vez, então roda 1x/dia. Quem chama é o cron da Vercel
 *   (ver vercel.json) e o botão do painel.
 *
 * - `rodarLembretesCurtos()` — o de ~30 min antes. Precisa de alguém
 *   batendo a cada 10–15 minutos, porque um horário de 07:15 tem que ser
 *   pego às 06:45 e nenhum cron diário faz isso. O plano Hobby da Vercel
 *   só permite 1 execução por dia, então quem bate é um cron externo
 *   (cron-job.org) apontando pra `/api/lembretes?tipo=curto` com o
 *   `CRON_SECRET` no cabeçalho. Ver WHATSAPP.md.
 */

export function paraDados(a: Agendamento): DadosAgendamento {
  return {
    id: a.id,
    cliente: a.clienteNome,
    whatsappCliente: a.clienteWhatsapp,
    servico: a.servicoNome,
    cidade: a.cidade,
    inicioISO: a.inicio.toISOString(),
    valorCentavos: a.servicoPreco,
  };
}

export async function rodarLembretes(): Promise<{
  lembretes: number;
  agradecimentos: number;
}> {
  const [amanha, ontem] = await Promise.all([
    agendamentosDeAmanha(),
    agendamentosConcluidosOntem(),
  ]);

  for (const a of amanha) await enviarEvento("lembrete", paraDados(a));
  for (const a of ontem) await enviarEvento("agradecimento", paraDados(a));

  return { lembretes: amanha.length, agradecimentos: ontem.length };
}

/**
 * O lembrete de ~30 min antes.
 *
 * ⚠️ A ORDEM AQUI IMPORTA: marca primeiro, manda depois.
 *
 * Invertido, a janela entre mandar e marcar cabe a próxima batida do cron
 * — e a cliente recebe a mesma mensagem duas ou três vezes enquanto se
 * arruma. `marcarLembreteEnviado` é uma corrida que só uma execução vence
 * (o `is(null)` vai dentro do próprio UPDATE), então mesmo duas instâncias
 * do serverless rodando ao mesmo tempo produzem uma mensagem só.
 *
 * O preço disso é que uma falha de envio some sem reenvio automático. É o
 * lado certo pra errar: mandar demais a cliente vê e acha o site quebrado;
 * mandar de menos a Karol resolve tocando em "Lembrar agora" no cartão do
 * painel, que existe exatamente pra isso.
 */
export async function rodarLembretesCurtos(): Promise<{ curtos: number }> {
  const proximos = await agendamentosParaLembrar();

  let enviados = 0;
  for (const a of proximos) {
    if (!(await marcarLembreteEnviado(a.id))) continue;
    await enviarEvento("lembrete-curto", paraDados(a));
    enviados++;
  }

  return { curtos: enviados };
}
