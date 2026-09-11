"use client";

import { useActionState } from "react";
import type { SituacaoAgendamento } from "@/lib/agendamentos";
import { alterarSituacao, type EstadoPainel } from "./acoes";
import { BOTAO } from "./estilos";

/**
 * O tipo vem de `agendamentos.ts`, que é quem fala com o banco. Aqui havia
 * uma segunda lista escrita à mão: bastava alguém acrescentar uma situação
 * de um lado pra as duas divergirem em silêncio.
 *
 * Import só de tipo — apagado na compilação, então o `server-only` do
 * módulo de origem não vem junto pro cliente.
 */
export type Situacao = SituacaoAgendamento;

const INICIAL: EstadoPainel = {};

/** Botões disponíveis a partir da situação atual. */
const CAMINHOS: Record<string, { valor: Situacao; rotulo: string; tom: "ok" | "neutro" | "aviso" }[]> = {
  pendente: [
    { valor: "confirmado", rotulo: "Confirmar", tom: "ok" },
    { valor: "cancelado", rotulo: "Recusar", tom: "aviso" },
  ],
  confirmado: [
    { valor: "concluido", rotulo: "Atendida", tom: "ok" },
    { valor: "faltou", rotulo: "Faltou", tom: "aviso" },
    { valor: "cancelado", rotulo: "Cancelar", tom: "neutro" },
  ],
  cancelado: [{ valor: "confirmado", rotulo: "Reativar", tom: "neutro" }],
  faltou: [{ valor: "confirmado", rotulo: "Reativar", tom: "neutro" }],
  concluido: [],
};

const TOM = {
  ok: BOTAO.primario,
  neutro: BOTAO.secundario,
  aviso: BOTAO.aviso,
} as const;

export function AcoesAgendamento({
  id,
  situacao,
}: {
  id: string;
  situacao: Situacao;
}) {
  const [estado, acao, ocupado] = useActionState(alterarSituacao, INICIAL);
  const botoes = CAMINHOS[situacao] ?? [];

  if (botoes.length === 0 && !estado.erro) return null;

  return (
    <form action={acao} className="flex flex-wrap items-center gap-2" aria-busy={ocupado}>
      <input type="hidden" name="id" value={id} />
      {botoes.map((b) => (
        <button
          key={b.valor}
          type="submit"
          name="situacao"
          value={b.valor}
          disabled={ocupado}
          className={TOM[b.tom]}
        >
          {b.rotulo}
        </button>
      ))}
      {estado.erro && (
        <span role="alert" className="w-full text-[12.5px] text-[#9d3b2f]">
          {estado.erro}
        </span>
      )}
    </form>
  );
}
