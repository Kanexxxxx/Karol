"use client";

import { useActionState } from "react";
import { lembrarAgora, type EstadoLembrete } from "./acoes";

/**
 * O lembrete de "seu horário é daqui a pouco", no cartão da cliente.
 *
 * Estava tudo em `/painel/notificacoes`, uma tela que listava variável de
 * ambiente e um botão único de "disparar agora" que atingia todo mundo. Não
 * servia: a Karol não pensa em "disparar lembretes", ela pensa "a Larissa
 * das 8h não respondeu, será que chegou?". Essa pergunta é sobre UMA
 * cliente, e se responde olhando pro cartão dela.
 *
 * Por isso o estado vem escrito por extenso ("enviado às 06:45") em vez de
 * um ícone: a hora é a informação que decide se vale mandar de novo.
 *
 * O horário formatado chega pronto do servidor. Formatar aqui usaria o fuso
 * do celular da Karol, e o site inteiro raciocina em `FUSO` — ela poderia
 * estar viajando e ver a hora errada no lembrete.
 */
export function Lembrete({
  id,
  enviadoAs,
  podeEnviar,
}: {
  id: string;
  /** Hora em que o lembrete saiu, já formatada. `null` = ainda não saiu. */
  enviadoAs: string | null;
  /** Falso quando o horário já passou ou o agendamento não está de pé. */
  podeEnviar: boolean;
}) {
  const [estado, acao, ocupado] = useActionState<EstadoLembrete, FormData>(
    lembrarAgora,
    {},
  );

  // Já saiu e o horário já passou: não há nada pra fazer, só a informação.
  if (!podeEnviar && !enviadoAs) return null;

  const jaSaiu = Boolean(enviadoAs) || estado.enviado;

  return (
    <form action={acao} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={id} />
      {/* Mandar de novo é decisão dela, então o segundo toque é explícito:
          o mesmo botão muda de nome e passa a levar `forcar`. */}
      {jaSaiu && <input type="hidden" name="forcar" value="1" />}

      {jaSaiu && (
        <span className="inline-flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-tinta-3">
          <span aria-hidden="true" className="text-ouro">
            ✓
          </span>
          {estado.enviado && !enviadoAs
            ? "Lembrete enviado"
            : `Lembrete ${enviadoAs}`}
        </span>
      )}

      {podeEnviar && (
        <button
          type="submit"
          disabled={ocupado}
          className="inline-flex min-h-[44px] items-center border border-linha px-3.5 text-[10.5px] font-bold uppercase tracking-[0.14em] text-tinta-2 transition-colors hover:border-ouro-claro hover:text-ouro disabled:opacity-50"
        >
          {ocupado ? "Enviando…" : jaSaiu ? "Mandar de novo" : "Lembrar agora"}
        </button>
      )}

      {estado.erro && (
        <span role="alert" className="text-[12px] text-[#9d3b2f]">
          {estado.erro}
        </span>
      )}
    </form>
  );
}
