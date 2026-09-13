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

export type Mensagem = {
  role: Papel;
  content: string | null;
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
        max_tokens: 700,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!resp.ok) {
      const detalhe = await resp.text().catch(() => "");
      console.error(`IA: ${resp.status} ${detalhe.slice(0, 300)}`);
      return null;
    }

    const dados = (await resp.json()) as {
      choices?: { message?: Mensagem }[];
    };

    const msg = dados.choices?.[0]?.message;
    if (!msg) return null;

    return {
      texto: typeof msg.content === "string" ? msg.content : null,
      raciocinio: typeof msg.reasoning_content === "string" ? msg.reasoning_content : null,
      chamadas: msg.tool_calls ?? [],
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
