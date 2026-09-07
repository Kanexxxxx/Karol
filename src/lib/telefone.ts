/**
 * O WhatsApp da cliente, sempre no mesmo formato.
 *
 * ⚠️ ISTO NÃO É FRESCURA DE FORMATAÇÃO. Enquanto o número era gravado do
 * jeito que a pessoa digitou, três coisas quebravam:
 *
 * 1. **O webhook não achava o agendamento.** A Meta manda o remetente como
 *    `5516991557552` (com DDI). Se o banco guardou `16991557552`, a busca
 *    por igualdade não casa — e a cliente que responde o código ouve
 *    "não achei nenhum horário nesse número".
 * 2. **O botão "Chamar" do painel abria a conversa errada.**
 *    `wa.me/16991557552` sem o 55 é lido como +1 631 955-7552, um número
 *    dos Estados Unidos. A Karol clicaria e cairia em outra pessoa.
 * 3. **A formatação da tela falhava**, porque `formatarWhatsapp` espera
 *    DDI + DDD + número e caía no número cru.
 *
 * A regra é uma só: **o que sai daqui sempre tem DDI.** Quem grava chama
 * isto antes; quem lê pode confiar.
 *
 * Assumimos Brasil quando não vem DDI. É verdade pro negócio da Karol, que
 * atende duas cidades do interior de São Paulo — e é uma suposição que
 * precisa ser revista se um dia isso mudar.
 */

/** Brasil. Se um dia atender fora, é aqui que muda. */
const DDI_PADRAO = "55";

/**
 * Devolve o número só com dígitos e com DDI, ou `null` se não for número
 * de telefone plausível.
 *
 * Aceita como a pessoa escreve: `(16) 99155-7552`, `+55 16 99155 7552`,
 * `016991557552` — todos viram `5516991557552`.
 */
export function normalizarWhatsapp(bruto: string): string | null {
  let d = bruto.replace(/\D/g, "");

  // Muita gente escreve o DDD com zero na frente ("011", "016"), herança
  // da discagem por operadora. O zero não faz parte do número.
  if (d.length === 12 && d.startsWith("0")) d = d.slice(1);
  if (d.length === 11 && d.startsWith("0")) d = d.slice(1);

  // Já veio com DDI do Brasil: 55 + DDD(2) + 8 ou 9 dígitos.
  if (/^55\d{10,11}$/.test(d)) return d;

  // Veio só com DDD: 2 + 8 (fixo/antigo) ou 2 + 9 (celular).
  if (/^\d{10,11}$/.test(d)) return DDI_PADRAO + d;

  return null;
}

/**
 * `(16) 99155-7552` a partir do número guardado.
 *
 * Espera o formato normalizado. Se vier outra coisa, devolve o que recebeu
 * em vez de inventar — número errado na tela é pior que número feio.
 */
export function formatarWhatsapp(numero: string): string {
  const m = numero.match(/^(\d{2})(\d{2})(\d{4,5})(\d{4})$/);
  return m ? `(${m[2]}) ${m[3]}-${m[4]}` : numero;
}
