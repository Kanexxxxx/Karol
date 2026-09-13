import "server-only";

import { vazouMarcacao } from "./fala-do-modelo";

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

/* ------------------------------------------------------------------ */
/* Os provedores, em ordem de preferência                              */
/* ------------------------------------------------------------------ */

/**
 * Quem responde, e quem cobre quando o primeiro cai.
 *
 * ⚠️ NÃO É PRA FICAR MAIS ESPERTO. É pra não ficar MUDO. Quando a API do
 * DeepSeek está fora do ar, ou estoura o tempo, ou a conta secou, hoje o
 * assistente responde "não consegui pensar agora" e a Karol fica sem
 * agenda. Com dois provedores, o segundo assume e ela nem percebe.
 *
 * A ordem é a da lista. O segundo só é chamado se o primeiro devolver
 * nada — nunca os dois em paralelo, que seria pagar duas vezes por uma
 * resposta.
 *
 * Trocar a ordem é trocar `IA_PROVEDOR`: `openai` põe a OpenAI na frente.
 * Sem a chave de um deles, ele simplesmente não entra na fila.
 */
type Provedor = {
  nome: "deepseek" | "openai";
  base: string;
  chaveEnv: string;
  modelo: string;
  /**
   * O corpo muda entre provedores, e as diferenças mordem em silêncio:
   *
   * - a OpenAI dos modelos novos recusa `max_tokens` e quer
   *   `max_completion_tokens` — o pedido volta 400;
   * - `thinking: { type: "disabled" }` é coisa da DeepSeek; mandar isso
   *   pra OpenAI é 400 também.
   *
   * Por isso cada provedor monta o próprio corpo em vez de todo mundo
   * compartilhar um só e rezar.
   */
  corpo: (base: Record<string, unknown>, semPensar: boolean) => Record<string, unknown>;
};

const PROVEDORES: Provedor[] = [
  {
    nome: "deepseek",
    base: process.env.IA_BASE_URL || "https://api.deepseek.com",
    chaveEnv: "DEEPSEEK_API_KEY",
    modelo: MODELO,
    corpo: (b, semPensar) => ({
      ...b,
      temperature: 0.2,
      max_tokens: TETO_DE_TOKENS,
      ...(semPensar ? { thinking: { type: "disabled" } } : {}),
    }),
  },
  {
    nome: "openai",
    base: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
    chaveEnv: "OPENAI_API_KEY",
    modelo: process.env.OPENAI_MODELO || "gpt-4o-mini",
    corpo: (b) => ({
      ...b,
      temperature: 0.2,
      max_tokens: TETO_DE_TOKENS,
    }),
  },
];

/** A fila de hoje: só quem tem chave, na ordem que `IA_PROVEDOR` pedir. */
function fila(): Provedor[] {
  const comChave = PROVEDORES.filter((p) => process.env[p.chaveEnv]);
  const preferido = process.env.IA_PROVEDOR;
  if (!preferido) return comChave;
  return [...comChave].sort((a, b) => Number(b.nome === preferido) - Number(a.nome === preferido));
}

/**
 * O teto de tokens da resposta.
 *
 * ⚠️ ELE INCLUI O PENSAMENTO nos modelos que pensam. Eram 700, e 700
 * emudecia o assistente — ver a explicação em `perguntar`.
 */
const TETO_DE_TOKENS = 3000;

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
  return fila().length > 0;
}

/** Quem está atendendo agora. Serve pro log e pra bancada. */
export function provedorAtual(): string | null {
  return fila()[0]?.nome ?? null;
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
  /*
    Um provedor de cada vez, na ordem da fila. O segundo só entra se o
    primeiro devolver NADA — API fora do ar, tempo estourado, conta seca.
    Resposta ruim não conta como falha: nesse caso a gente já pagou por
    ela, e chamar o outro seria pagar duas vezes pela mesma pergunta.
  */
  for (const provedor of fila()) {
    const r = await tentarNo(provedor, mensagens, ferramentas);
    if (r) return r;
    console.error(`IA: ${provedor.nome} não respondeu, indo pro próximo`);
  }
  return null;
}

/** Tudo o que a gente tenta dentro de UM provedor. */
async function tentarNo(
  provedor: Provedor,
  mensagens: Mensagem[],
  ferramentas: Ferramenta[],
): Promise<Resposta | null> {
  const primeira = await umaIda(provedor, mensagens, ferramentas, false);
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
    const segunda = await umaIda(provedor, mensagens, ferramentas, true);
    if (segunda && (segunda.texto?.trim() || segunda.chamadas.length > 0)) return segunda;
  }

  return primeira;
}

/**
 * Vale tentar de novo, com o pensamento desligado?
 *
 * Dois casos, e os dois terminam do mesmo jeito pra Karol: uma resposta
 * que ela não pode ler.
 *
 * 1. **Ele pensou até acabar o papel.** `finish_reason: "length"` com
 *    conteúdo vazio — o modelo gastou o orçamento inteiro pensando.
 *
 * 2. **Ele escreveu a chamada de ferramenta à mão.** Em vez de texto vem
 *    `<｜｜DSML｜｜invoke name="ver_agenda">`. `fala-do-modelo.ts` barra
 *    isso antes de chegar nela, e o que sobra é o "não consegui
 *    responder" — que foi exatamente o que o Kainã leu como assistente
 *    burro. Medido em 13/09: acontece justamente nas mensagens de
 *    CONVERSA ("nossa que dia cheio, tô morta"), onde não há ferramenta
 *    nenhuma pra chamar e ele inventa uma.
 *
 * Em nenhum dos dois há chamada de ferramenta de verdade — se houvesse, o
 * pedido dela estaria atendido e repetir sem pensar poderia trocar a
 * ferramenta escolhida por outra.
 */
function precisaTentarSemPensar(r: Resposta): boolean {
  if (r.chamadas.length > 0) return false;

  const texto = r.texto?.trim() ?? "";
  if (!texto) return r.motivo === "length";
  return vazouMarcacao(texto);
}

/** Uma ida só, num provedor só. */
async function umaIda(
  provedor: Provedor,
  mensagens: Mensagem[],
  ferramentas: Ferramenta[],
  semPensar: boolean,
): Promise<Resposta | null> {
  const chave = process.env[provedor.chaveEnv];
  if (!chave) return null;

  try {
    const resp = await fetch(`${provedor.base}/chat/completions`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${chave}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(
        provedor.corpo(
          {
            model: provedor.modelo,
            messages: mensagens,
            ...(ferramentas.length > 0 ? { tools: ferramentas } : {}),
          },
          semPensar,
        ),
      ),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!resp.ok) {
      const detalhe = await resp.text().catch(() => "");
      console.error(`IA (${provedor.nome}): ${resp.status} ${detalhe.slice(0, 300)}`);
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
    console.error(`IA (${provedor.nome}) falhou:`, e);
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
