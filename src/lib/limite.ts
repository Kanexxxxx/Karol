import "server-only";

/**
 * Freio simples contra abuso do agendamento — em memória, por instância.
 *
 * Não é à prova de bala (reinicia a cada deploy, não conversa entre
 * instâncias do serverless), mas segura um script ingênuo que tenta lotar a
 * agenda com horários falsos. Junto com o honeypot e o carimbo de tempo do
 * formulário, resolve o caso comum sem depender de serviço externo.
 */

type Registro = { contagem: number; inicio: number };

const mapa = new Map<string, Registro>();
const JANELA_MS = 60 * 60 * 1000; // 1 hora
const MAX_PADRAO = 5;

/** true se `chave` ainda pode agir; conta a tentativa quando permite. */
export function dentroDoLimite(chave: string, max = MAX_PADRAO, janelaMs = JANELA_MS): boolean {
  const agora = Date.now();
  const r = mapa.get(chave);

  if (!r || agora - r.inicio > janelaMs) {
    mapa.set(chave, { contagem: 1, inicio: agora });
    varrer(janelaMs);
    return true;
  }
  if (r.contagem >= max) return false;

  r.contagem += 1;
  return true;
}

/** Remove janelas velhas pra o Map não crescer sem limite. */
function varrer(janelaMs: number) {
  const agora = Date.now();
  for (const [chave, r] of mapa) {
    if (agora - r.inicio > janelaMs) mapa.delete(chave);
  }
}

/**
 * Espera fixa do login.
 *
 * Fica aqui, e nao solta dentro da action, por dois motivos: o teste
 * consegue substitui-la (nove tentativas a 400 ms custavam 10 s do
 * `npm test`), e o motivo dela fica escrito num lugar so.
 */
export function pausaLogin(): Promise<void> {
  return new Promise((r) => setTimeout(r, 400));
}

/**
 * O IP de quem está pedindo — a chave do freio.
 *
 * `x-forwarded-for` é uma cadeia `cliente, proxy1, proxy2`, e quem faz o
 * pedido pode **prepender** o que quiser: o PRIMEIRO item é justamente o
 * que o atacante controla. Lendo dali, o freio era contornável só trocando
 * um cabeçalho a cada tentativa.
 *
 * Na Vercel o valor confiável é o `x-real-ip`, escrito pela borda. No
 * `x-forwarded-for`, é o ÚLTIMO item — o que a borda acrescentou.
 */
export function ipDoPedido(cabecalhos: { get(nome: string): string | null }): string {
  const real = cabecalhos.get("x-real-ip")?.trim();
  if (real) return real;

  const cadeia = cabecalhos.get("x-forwarded-for");
  if (!cadeia) return "sem-ip";

  const partes = cadeia.split(",").map((p) => p.trim()).filter(Boolean);
  return partes.at(-1) || "sem-ip";
}
