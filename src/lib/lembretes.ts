import "server-only";

import {
  agendamentosConcluidosOntem,
  agendamentosDeAmanha,
  marcarAvisoEnviado,
  mudarSituacao,
  pendentesVencidos,
} from "./agendamentos";
import { enviarEvento, paraDados } from "./notificacoes";

/**
 * Os lembretes.
 *
 * `rodarLembretes()` manda o da véspera e o agradecimento do dia
 * seguinte. Quem chama é o cron da Vercel (ver `vercel.json`) **e o botão
 * do painel** — e esse "e" é a coisa mais importante deste comentário.
 *
 * ⚠️ NÃO É UMA VEZ POR DIA. A migração 04 assumiu que era ("o cron roda
 * 1x/dia, então cada cliente recebe uma mensagem") e por isso não criou
 * marca nenhuma pra véspera. Mas a Karol pode tocar o botão do painel à
 * vontade, e cada toque remandava tudo: em 07/09/2026 a mesma cliente
 * recebeu o mesmo lembrete às 7:03 e às 7:46.
 *
 * Hoje quem já recebeu sai da varredura (`lembrete_enviado_em`), e a marca
 * só é gravada depois do envio dar certo. Com isso o botão deixa de ser um
 * segundo disparo pra todo mundo e vira "tentar de novo com quem não
 * recebeu". Ver `migracao-06`.
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

  /*
    ⚠️ MARCA DEPOIS DE SAIR, E SÓ SE SAIU.

    As duas listas já chegam filtradas por quem ainda não foi avisado (ver
    `agendamentosDeAmanha`). O que fecha o ciclo é gravar a marca — e a
    ordem importa: envia, confere, só então marca.

    Marcar antes de saber transformaria uma falha do WhatsApp em silêncio
    permanente. A cliente sairia da varredura sem ter recebido nada, e
    nem o cron de amanhã nem o botão da Karol tentariam de novo.

    Do jeito que está, quem falhou continua na fila: o botão do painel é
    um "tenta de novo com quem não recebeu", não um segundo disparo pra
    todo mundo.
  */
  let lembretes = 0;
  for (const a of amanha) {
    if (!(await enviarEvento("lembrete", paraDados(a))).ok) continue;
    await marcarAvisoEnviado(a.id, "lembrete");
    lembretes++;
  }

  let agradecimentos = 0;
  for (const a of ontem) {
    if (!(await enviarEvento("agradecimento", paraDados(a))).ok) continue;
    await marcarAvisoEnviado(a.id, "agradecimento");
    agradecimentos++;
  }

  /*
    O número que volta é quantos SAÍRAM, não quantos foram tentados — e
    agora essa diferença é acionável. Se a Karol lê "2 de 3", tocar o
    botão de novo faz sentido: o que faltou continua na fila.

    Ainda NÃO é "entregue". A Meta aceita com 200 e só depois diz se
    entregou; a falha chega pelo webhook, em `statuses`. Ver docs/whatsapp.md.
  */
  return { lembretes, agradecimentos };
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

