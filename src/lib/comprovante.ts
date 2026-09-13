import "server-only";

import { perguntar, iaConfigurada } from "./ia";

/**
 * A foto que a cliente mandou é mesmo um comprovante?
 *
 * ---------------------------------------------------------------------
 * O defeito
 * ---------------------------------------------------------------------
 *
 * Hoje QUALQUER foto que chega no número da API é repassada pra Karol com
 * a legenda "📎 Comprovante de Fulana". Qualquer uma: a cliente mandando
 * a foto da sobrancelha que quer copiar, uma selfie, um print de conversa,
 * um engano.
 *
 * A Karol abre o WhatsApp e lê "comprovante" numa foto que não é — e a
 * cliente recebe "Recebi, vou conferir e te confirmo", que pra quem
 * mandou uma foto de referência não faz o menor sentido.
 *
 * ---------------------------------------------------------------------
 * Dá pra fazer isso? Dá — e isso foi MEDIDO, não suposto
 * ---------------------------------------------------------------------
 *
 * Em 13/09/2026 eu testei os dois modelos da DeepSeek com quatro imagens
 * geradas na hora, de cores que ele não teria como adivinhar:
 *
 *   deepseek-flash    4 de 4 acertos
 *   deepseek-v4-pro   não enxerga ("NAO VEJO" com a imagem na frente)
 *
 * O `flash` é justamente o que está em produção. Se um dia alguém trocar
 * o `IA_MODELO` pra `v4-pro`, esta análise para de funcionar — e para
 * bem: a resposta vira "não sei", que cai no comportamento antigo.
 *
 * ⚠️ NA DÚVIDA, TRATA COMO COMPROVANTE. Sem chave, sem token, modelo fora
 * do ar, imagem grande demais, resposta estranha: tudo devolve "não sei",
 * e quem chama repassa do jeito que sempre repassou. Uma legenda errada é
 * um aborrecimento; um comprovante que não chega na Karol é a cliente sem
 * horário depois de pagar.
 */

/** O veredito. `nao-sei` é o padrão sempre que algo dá errado. */
export type Veredito = "comprovante" | "outra-coisa" | "nao-sei";

/**
 * Teto do arquivo que a gente aceita analisar.
 *
 * Foto de comprovante é print de tela: raramente passa de 1 MB. Acima
 * disso é foto de câmera, e mandar 8 MB em base64 pro modelo custa tempo
 * e token pra responder o que a legenda antiga já responderia.
 */
const MAXIMO_BYTES = 4 * 1024 * 1024;

/**
 * Baixa a mídia da Meta. São DUAS chamadas: o webhook manda só um id, o
 * primeiro pedido troca o id por uma URL temporária, e o segundo busca os
 * bytes — essa URL também exige o token, não é pública.
 */
async function baixarMidia(
  midiaId: string,
): Promise<{ base64: string; tipo: string } | null> {
  const token = process.env.META_TOKEN;
  if (!token) return null;

  try {
    const meta = await fetch(`https://graph.facebook.com/v23.0/${midiaId}`, {
      headers: { authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(8000),
    });
    if (!meta.ok) return null;

    const { url, mime_type } = (await meta.json()) as { url?: string; mime_type?: string };
    if (!url || !mime_type?.startsWith("image/")) return null;

    const arquivo = await fetch(url, {
      headers: { authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(15000),
    });
    if (!arquivo.ok) return null;

    const bytes = Buffer.from(await arquivo.arrayBuffer());
    if (bytes.length === 0 || bytes.length > MAXIMO_BYTES) return null;

    return { base64: bytes.toString("base64"), tipo: mime_type };
  } catch (e) {
    console.error("não consegui baixar a mídia pra conferir:", e);
    return null;
  }
}

/*
  A pergunta feita ao modelo.

  Curta e fechada de propósito. Pedir "descreva a imagem" traria um
  parágrafo bonito que eu teria que interpretar — e interpretar texto
  livre de modelo é onde se erra. Aqui ele escolhe entre duas palavras.

  ⚠️ E a instrução do meio importa: a dúvida tem que virar COMPROVANTE, não
  OUTRA. Print cortado, foto tremida, comprovante de banco que ninguém
  conhece — tudo isso é mais provável de ser um comprovante ruim do que de
  ser outra coisa, e o custo de errar pro lado "OUTRA" é a Karol ignorando
  um pagamento de verdade.
*/
const PERGUNTA = [
  "Esta imagem é um comprovante de pagamento (PIX, transferência, recibo bancário)?",
  "",
  "Responda com UMA palavra:",
  "COMPROVANTE — se tem cara de comprovante bancário: valor, data, nome, chave, id de transação, logo de banco.",
  "OUTRA — só se for claramente outra coisa: uma selfie, uma foto de sobrancelha ou maquiagem, um print de conversa, uma paisagem.",
  "",
  "Na dúvida, responda COMPROVANTE.",
].join("\n");

/**
 * O que é esta foto?
 *
 * Nunca lança e nunca demora mais que uns segundos. Ver o aviso do topo:
 * qualquer problema vira `nao-sei`.
 */
export async function analisarComprovante(midiaId: string): Promise<Veredito> {
  if (!iaConfigurada()) return "nao-sei";

  const midia = await baixarMidia(midiaId);
  if (!midia) return "nao-sei";

  const resposta = await perguntar(
    [
      {
        role: "user",
        content: [
          { type: "text", text: PERGUNTA },
          { type: "image_url", image_url: { url: `data:${midia.tipo};base64,${midia.base64}` } },
        ],
      },
    ],
    [],
  );

  const dito = resposta?.texto?.trim().toUpperCase() ?? "";
  if (dito.includes("COMPROVANTE")) return "comprovante";
  if (dito.includes("OUTRA")) return "outra-coisa";
  return "nao-sei";
}
