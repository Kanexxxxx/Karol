"use client";

import { useActionState } from "react";
import { lembrarAgora, type EstadoLembrete } from "./acoes";
import { FOCO } from "./estilos";

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
 *
 * O botão é o mais discreto do cartão (só texto, sem caixa): é a ação menos
 * frequente e a única que não muda nada no agendamento.
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
    <form action={acao} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
      <input type="hidden" name="id" value={id} />
      {/* Mandar de novo é decisão dela, então o segundo toque é explícito:
          o mesmo botão muda de nome e passa a levar `forcar`. */}
      {jaSaiu && <input type="hidden" name="forcar" value="1" />}

      {/* Sem altura mínima: é texto, não botão. Com 44 px ele empurrava o
          "Lembrar agora" pra uma segunda linha no celular. */}
      <span className="inline-flex items-center gap-1.5 text-[12.5px] text-tinta-2 lining-nums">
        {jaSaiu ? (
          <>
            <span aria-hidden="true" className="text-ouro">
              ✓
            </span>
            {estado.enviado && !enviadoAs
              ? "Lembrete enviado agora"
              : `Lembrete enviado às ${enviadoAs}`}
          </>
        ) : (
          "Lembrete ainda não saiu"
        )}
      </span>

      {podeEnviar && (
        <button
          type="submit"
          disabled={ocupado}
          className={`inline-flex min-h-[44px] items-center px-1 text-[11px] font-bold uppercase tracking-[0.14em] text-ouro underline decoration-ouro-claro underline-offset-4 transition-colors hover:decoration-ouro active:translate-y-px disabled:opacity-50 ${FOCO}`}
        >
          {ocupado ? "Enviando…" : jaSaiu ? "Mandar de novo" : "Lembrar agora"}
        </button>
      )}

      {estado.erro && (
        <span role="alert" className="w-full pb-1 text-[12.5px] text-[#9d3b2f]">
          {estado.erro}
        </span>
      )}
    </form>
  );
}
