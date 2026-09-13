import "server-only";

import {
  agendamentosConcluidosOntem,
  agendamentosDeAmanha,
} from "./agendamentos";
import { enviarEvento, paraDados } from "./notificacoes";

/**
 * Os lembretes.
 *
 * `rodarLembretes()` manda o da véspera e o agradecimento do dia
 * seguinte. Varre o dia inteiro de uma vez, então roda 1x/dia: quem chama
 * é o cron da Vercel (ver `vercel.json`) e o botão do painel.
 *
 * ⚠️ AQUI JÁ MOROU UM SEGUNDO RELÓGIO. `rodarLembretesCurtos()` mandava um
 * aviso ~30 min antes do horário, e precisava de um cron externo batendo
 * de 10 em 10 minutos. Foi arrancado em 13/09/2026: a Karol nunca pediu
 * esse aviso — ela tinha respondido NÃO pra "lembrete de horas antes", e o
 * de meia hora foi perguntado e nunca respondido. Mensagem que sai no nome
 * dela não fica no ar esperando ela reclamar.
 *
 * O que saiu junto está no commit; o que ficou é este arquivo com um
 * relógio só.
 */

// `paraDados` mudou de casa: agora vive em `notificacoes.ts`, junto do
// tipo que ela produz. Continua saindo por aqui porque o painel importa
// deste módulo.
export { paraDados };

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

