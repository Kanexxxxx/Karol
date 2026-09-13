import "server-only";

/**
 * A conversa com o modelo. Só o transporte — nada daqui sabe o que é
 * agendamento.
 *
 * Por que `fetch` puro e não o SDK: o projeto inteiro tem quatro
 * dependências, e a API do DeepSeek é compatível com a da OpenAI, que é
 * um POST com JSON. Um SDK aqui traria dezenas de pacotes transitivos pra
 * dentro do bundle da Vercel pra economizar quinze linhas.
 *
 * Trocar de provedor é trocar `BASE` e `MODELO`: OpenAI, Groq, Together e
 * a maioria dos outros falam esse mesmo dialeto.
 *
 * ⚠️ Sem `DEEPSEEK_API_KEY` no ambiente, `disponivel()` devolve false e o
 * assistente inteiro se cala — quem chama trata isso e responde com o link
 * do painel. Nada quebra, igual ao resto do projeto.
 */

const BASE = process.env.IA_BASE_URL || "https://api.deepseek.com";

/**
 * Qual modelo atende a Karol.
 *
 * ⚠️ `deepseek-chat` E `deepseek-reasoner` SÃO APELIDOS DESTE MESMO
 * MODELO. A resposta da API traz o campo `model`, e nos três nomes ele
 * volta `deepseek-flash`; a fatura dos dias de bancada confirma, com só
 * duas linhas de modelo pros "três" que eu testei. Existem dois de fato:
 * `deepseek-flash` e `deepseek-v4-pro`.
 *
 * Então trocar o padrão de `deepseek-chat` pra `deepseek-flash` NÃO
 * melhorou nada — é o mesmo modelo. O nome explícito ficou por outro
 * motivo: apelido é o provedor que decide pra onde aponta, e um dia ele
 * aponta pra outro lugar sem avisar ninguém.
 *
 * Por que não o `v4-pro`: medido na bancada em 4 rodadas de 16 casos, ele
 * não acerta mais que o flash — a diferença cabe dentro do ruído, que o
 * próprio engano acima mediu em uns 2 pontos em 16 (o mesmo modelo, com
 * dois nomes, tirou de 14 a 16). O que ele cobra a mais está na fatura:
 * 2,4× o tempo e 7,5× o dinheiro por chamada. A Karol está com o celular
 * na mão, e o tempo aqui é o dela.
 *
 * Trocar é uma variável na Vercel: `IA_MODELO=deepseek-v4-pro`, sem tocar
 * em código.
 */
const MODELO = process.env.IA_MODELO || "deepseek-flash";

/** Quanto tempo esperamos o modelo. Acima disso a Meta já desistiu de nós. */
const TIMEOUT_MS = 20_000;

export type Papel = "system" | "user" | "assistant" | "tool";

/**
 * O conteúdo de uma mensagem.
 *
 * Quase sempre é texto puro. A forma em LISTA existe pra mandar imagem
 * junto — é assim que a análise de comprovante pergunta "isto é um
 * comprovante?" mostrando a foto (ver `comprovante.ts`).
 *
 * ⚠️ Nem todo modelo enxerga. Medido em 13/09/2026: `deepseek-flash` sim,
 * `deepseek-v4-pro` não. Quem manda imagem tem que aguentar a resposta
 * "não consigo ver" sem quebrar.
 */
export type Conteudo =
  | string
  | null
  | ({ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } })[];

export type Mensagem = {
  role: Papel;
  content: Conteudo;
  /*
    ⚠️ O RACIOCÍNIO PRECISA VOLTAR JUNTO, E NÃO É OPCIONAL.

    Os modelos que pensam antes de responder devolvem o pensamento neste
    campo. Quando a conversa continua depois de uma chamada de
    ferramenta, a API EXIGE que ele volte na mensagem do assistente — sem
    ele, a resposta é 400 com "The `reasoning_content` in the thinking
    mode must be passed back to the API".

    Descoberto na bancada de 12–13/09: o laço de leitura do assistente
    quebrava inteiro nos modelos novos, e só neles. Como o campo é
    ignorado por quem não pensa, ele vai sempre.
  */
  reasoning_content?: string | null;
  tool_calls?: ChamadaDeFerramenta[];
  tool_call_id?: string;
};

export type ChamadaDeFerramenta = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

/** O formato de ferramenta que a API espera. */
export type Ferramenta = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, unknown>;
      required?: string[];
    };
  };
};

export function iaConfigurada(): boolean {
  return Boolean(process.env.DEEPSEEK_API_KEY);
}

export type Resposta = {
  texto: string | null;
  /**
   * O pensamento do modelo, quando ele pensa — os que não pensam não
   * mandam nada, por isso é opcional. Volta pra API na ida seguinte.
   */
  raciocinio?: string | null;
  chamadas: ChamadaDeFerramenta[];
  /**
   * Por que o modelo parou. `"length"` quer dizer que ele bateu no teto de
   * tokens — e num modelo que pensa isso costuma significar que ele gastou
   * tudo pensando e não escreveu nada. Ver `perguntar`.
   */
  motivo?: string | null;
};

/**
 * Uma ida ao modelo.
 *
 * Devolve `null` quando não deu — sem chave, timeout, erro da API. Nunca
 * lança: isto roda dentro do webhook, e webhook que responde erro faz a
 * Meta reenviar a mensagem, o que viraria a Karol recebendo a mesma
 * resposta várias vezes.
 */
export async function perguntar(
  mensagens: Mensagem[],
  ferramentas: Ferramenta[],
): Promise<Resposta | null> {
  const primeira = await umaIda(mensagens, ferramentas);
  if (!primeira) return null;

  /*
    ⚠️ ELE PENSOU ATÉ ACABAR O PAPEL E NÃO ESCREVEU NADA.

    Foi isto que a Karol e o Kainã viram como "Não consegui responder
    isso. Tenta de outro jeito?" — e é o defeito mais grave que este
    arquivo já teve, porque parece burrice do modelo e é configuração
    nossa.

    O modelo pensa ANTES de responder, e o pensamento sai do mesmo
    orçamento de `max_tokens`. Medido em 13/09/2026 com o pedido real que
    ele mandou (agendar cinco pessoas na mesma mensagem):

      max_tokens=700   -> 700 tokens pensando, 0 de resposta
      max_tokens=2000  -> 2000 pensando,       0 de resposta
      sem pensar       -> 0 pensando,          resposta inteira

    Nas respostas normais o pensamento come de 70% a 100% do orçamento
    (161 de 215 numa pergunta simples). Por isso o teto subiu — e por isso
    ele sozinho não basta: num pedido complicado o modelo pensa até o
    limite que tiver.

    A segunda ida desliga o pensamento. Não dá pra desligar sempre: medido
    na bancada, sem pensar ele cai de 16/16 pra 13/16 nos casos difíceis.
    Pensando por padrão, sem pensar como rede — o pior caso deixa de ser
    silêncio e vira uma resposta um pouco pior.
  */
  if (precisaTentarSemPensar(primeira)) {
    const segunda = await umaIda(mensagens, ferramentas, { thinking: { type: "disabled" } });
    if (segunda && (segunda.texto?.trim() || segunda.chamadas.length > 0)) return segunda;
  }

  return primeira;
}

/** Voltou de mãos abanando por ter estourado o orçamento pensando? */
function precisaTentarSemPensar(r: Resposta): boolean {
  return r.motivo === "length" && !r.texto?.trim() && r.chamadas.length === 0;
}

/** Uma ida só. `extra` entra no corpo da requisição. */
async function umaIda(
  mensagens: Mensagem[],
  ferramentas: Ferramenta[],
  extra: Record<string, unknown> = {},
): Promise<Resposta | null> {
  const chave = process.env.DEEPSEEK_API_KEY;
  if (!chave) return null;

  try {
    const resp = await fetch(`${BASE}/chat/completions`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${chave}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODELO,
        messages: mensagens,
        ...(ferramentas.length > 0 ? { tools: ferramentas } : {}),
        // Temperatura baixa de propósito. Isto não escreve texto criativo,
        // decide o que fazer com a agenda de uma pessoa: a resposta certa
        // pra "cancela a da Maria" é sempre a mesma.
        temperature: 0.2,
        /*
          ⚠️ ESTE TETO INCLUI O PENSAMENTO. Eram 700, e 700 era pouco
          demais — ver a explicação em `perguntar`. Uma resposta da Karol
          chegou cortada no meio da frase por causa disto.
        */
        max_tokens: 3000,
        ...extra,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!resp.ok) {
      const detalhe = await resp.text().catch(() => "");
      console.error(`IA: ${resp.status} ${detalhe.slice(0, 300)}`);
      return null;
    }

    const dados = (await resp.json()) as {
      choices?: { message?: Mensagem; finish_reason?: string }[];
    };

    const escolha = dados.choices?.[0];
    const msg = escolha?.message;
    if (!msg) return null;

    return {
      texto: typeof msg.content === "string" ? msg.content : null,
      raciocinio: typeof msg.reasoning_content === "string" ? msg.reasoning_content : null,
      chamadas: msg.tool_calls ?? [],
      motivo: escolha?.finish_reason ?? null,
    };
  } catch (e) {
    console.error("IA falhou:", e);
    return null;
  }
}

/**
 * Lê os argumentos que o modelo mandou.
 *
 * Eles chegam como STRING de JSON, não como objeto, e um modelo pode
 * devolver string malformada. Devolve `{}` em vez de lançar — quem chama
 * valida campo a campo de qualquer jeito, e vai recusar por falta de
 * argumento obrigatório.
 */
export function lerArgumentos(bruto: string): Record<string, unknown> {
  try {
    const v = JSON.parse(bruto);
    return v && typeof v === "object" && !Array.isArray(v) ? v : {};
  } catch {
    return {};
  }
}
