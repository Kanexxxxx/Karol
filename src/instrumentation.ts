import { FUSO } from "@/data/negocio";

/**
 * Roda uma vez, e termina antes do servidor aceitar a primeira requisição.
 *
 * O motor de horários trabalha em hora local do servidor e assume que ela é
 * a do Brasil. Na Vercel o padrão é UTC — e `TZ` é um nome de variável
 * **reservado** lá, então não há como corrigir pelo painel. Fica aqui.
 *
 * O estrago sem isto é discreto, que é o pior tipo: das 21h à meia-noite o
 * servidor já virou o dia, e a agenda passa a oferecer as datas erradas —
 * inclusive deixando de oferecer o dia seguinte. Ninguém vê erro na tela.
 *
 * Trocar `process.env.TZ` em tempo de execução é suportado pelo Node: a
 * próxima operação com `Date` já usa o fuso novo.
 */
export function register() {
  process.env.TZ = FUSO;
}
