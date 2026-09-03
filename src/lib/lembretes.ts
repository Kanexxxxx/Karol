import "server-only";

import {
  agendamentosConcluidosOntem,
  agendamentosDeAmanha,
  type Agendamento,
} from "./agendamentos";
import { enviarEvento, type DadosAgendamento } from "./notificacoes";

/**
 * Roda os lembretes do dia. Chamado pela rota `/api/lembretes` (via cron da
 * Vercel) e pelo botão "disparar agora" no painel.
 */

function paraDados(a: Agendamento): DadosAgendamento {
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
