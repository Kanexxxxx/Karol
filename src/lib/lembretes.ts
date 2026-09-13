import "server-only";

import {
  agendamentosConcluidosOntem,
  agendamentosDeAmanha,
  mudarSituacao,
  pendentesVencidos,
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

/**
 * Solta os horários de quem marcou e não pagou a entrada.
 *
 * O porquê está em `pendentesVencidos` — resumo: `pendente` ocupa o
 * horário e nunca expirava, então quem marcasse e não pagasse ficava com
 * a vaga até a Karol cancelar na mão. A regra dela ("seguro até o fim do
 * dia") nunca tinha sido implementada.
 *
 * ⚠️ CANCELA PELO CAMINHO NORMAL, e isso não é detalhe. `mudarSituacao`
 * avisa a cliente que o horário caiu. Cancelar por baixo, direto no
 * banco, seria a pessoa aparecer no studio no dia — que é exatamente o
 * problema que a gente está tentando evitar, virado do avesso.
 *
 * Um erro numa não derruba as outras: cada horário presa a mais é uma
 * cliente que não conseguiu marcar.
 */
export async function expirarPendentes(): Promise<{ expirados: number }> {
  const vencidos = await pendentesVencidos();

  let soltos = 0;
  for (const a of vencidos) {
    const r = await mudarSituacao(a.id, "cancelado", "sinal-vencido");
    if (r.ok) soltos++;
    else console.error(`não consegui soltar o horário ${a.id}: ${r.erro}`);
  }

  return { expirados: soltos };
}

