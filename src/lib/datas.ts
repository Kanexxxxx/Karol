/**
 * Formatadores de data e hora, num lugar só.
 *
 * Estavam repetidos em cinco arquivos — `FORMATA_DIA` e `FORMATA_HORA`
 * eram idênticos em três deles. Além do texto duplicado, cada cópia era
 * uma chance de o painel e a mensagem de WhatsApp escreverem a mesma data
 * de jeitos diferentes.
 *
 * `Intl.DateTimeFormat` é caro de construir, então cada um é criado uma vez
 * e reaproveitado. Todos usam o fuso do servidor — ver o aviso sobre `TZ`
 * no README.
 */

const pt = (opcoes: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("pt-BR", opcoes);

/** "segunda-feira, 10 de junho" */
export const DIA_POR_EXTENSO = pt({ weekday: "long", day: "2-digit", month: "long" });

/** "seg., 10/06" — para as fichas de dia do agendamento */
export const DIA_CURTO = pt({ weekday: "short", day: "2-digit", month: "2-digit" });

/** "10 de junho de 2099" */
export const DIA_COM_ANO = pt({ day: "2-digit", month: "long", year: "numeric" });

/** "10 de junho, 13:00" */
export const DIA_E_HORA = pt({ day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit" });

/** "13:00" */
export const HORA = pt({ hour: "2-digit", minute: "2-digit" });

/** "segunda-feira, 10 de junho, 13:00" — usado nas mensagens automáticas */
export const DIA_HORA_POR_EXTENSO = pt({
  weekday: "long",
  day: "2-digit",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
});
