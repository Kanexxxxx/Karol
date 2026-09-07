import "server-only";

import { atender, type Desfecho } from "./atendente";
import { assistente, decisaoDoBotao, PREFIXO_BOTAO, type DesfechoAssistente } from "./assistente";
import { abrirJanela } from "./conversas";
import { whatsappDaKarol } from "./notificacoes";
import type { MensagemRecebida } from "./webhook-meta";

/**
 * Quem atende quem.
 *
 * O webhook do WhatsApp é UM só, e por ele entram duas pessoas muito
 * diferentes: as clientes e a própria Karol. Elas escrevem pro mesmo
 * número, e até aqui todas caíam no mesmo `atender()`.
 *
 * ⚠️ Esta separação existe por um motivo de segurança, não de organização.
 *
 * `atendente.ts` — o caminho das CLIENTES — tem um teste que lê o texto do
 * arquivo e reprova se ele importar `mudarSituacao`, `criarAgendamento` ou
 * `salvarBloqueio`. A Karol respondeu no briefing que a cliente não
 * desmarca sozinha, e essa trava é o que garante isso mesmo quando alguém
 * mexer no código daqui a seis meses.
 *
 * O assistente da Karol precisa exatamente dessas funções. Se ele morasse
 * no mesmo módulo, a trava teria que ser afrouxada — e afrouxada pras
 * clientes junto. Em módulos separados, cada caminho tem os poderes que
 * precisa e nenhum a mais.
 *
 * A decisão é pelo NÚMERO de quem mandou, que vem do payload assinado da
 * Meta e é conferido em `webhook-meta.ts` antes de chegar aqui.
 */

export type DesfechoRecepcao =
  | ({ quem: "cliente" } & Desfecho)
  | ({ quem: "karol" } & DesfechoAssistente);

/** É a Karol falando? Compara só dígitos — ver lib/telefone.ts. */
export function ehAKarol(numero: string): boolean {
  const dela = whatsappDaKarol().replace(/\D/g, "");
  return dela.length > 0 && numero.replace(/\D/g, "") === dela;
}

export async function receber(m: MensagemRecebida): Promise<DesfechoRecepcao> {
  if (!ehAKarol(m.de)) {
    return { quem: "cliente", ...(await atender(m)) };
  }

  /*
    A janela de 24 h dela também precisa ser registrada. `atender()` faz
    isso na primeira linha, e o caminho da Karol não passa mais por lá.

    Na prática a janela dela nunca fecha, justamente porque ela é sempre
    quem escreve primeiro — e é isso que faz o assistente inteiro custar
    zero de Meta. Mas depender disso sem registrar seria depender de sorte.
  */
  await abrirJanela(m.de, m.texto);

  /*
    ⚠️ ORDEM IMPORTA. Os botões `k:` são da remarcação da CLIENTE esperando
    o aval da Karol, e continuam sendo tratados pelo `atendente.ts` — é lá
    que mora o fluxo inteiro, com a tabela `remarcacoes` e a garantia de
    que a agenda só se move depois do toque dela.

    Mandar isso pro assistente quebraria a remarcação pelo WhatsApp, que já
    funciona e foi testada com celular de verdade.
  */
  if (m.botao?.startsWith("k:")) {
    return { quem: "cliente", ...(await atender(m)) };
  }

  if (m.botao?.startsWith(PREFIXO_BOTAO)) {
    return { quem: "karol", ...(await decisaoDoBotao(m.de, m.botao)) };
  }

  return { quem: "karol", ...(await assistente(m.de, m.texto)) };
}
