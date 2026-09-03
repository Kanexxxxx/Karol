"use client";

import { useActionState } from "react";
import { alterarSituacao, type EstadoPainel } from "./acoes";

export type Situacao = "pendente" | "confirmado" | "cancelado" | "concluido" | "faltou";

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
  ok: "border-ouro bg-ouro text-white hover:opacity-90",
  neutro: "border-linha text-tinta-2 hover:border-ouro-claro hover:text-ouro",
  aviso: "border-[#d9b9b3] text-[#9d3b2f] hover:bg-[#f7ecea]",
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
    <form action={acao} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={id} />
      {botoes.map((b) => (
        <button
          key={b.valor}
          type="submit"
          name="situacao"
          value={b.valor}
          disabled={ocupado}
          className={`border px-3 py-1.5 text-[10.5px] font-bold uppercase tracking-[0.14em] transition-colors disabled:opacity-50 ${TOM[b.tom]}`}
        >
          {b.rotulo}
        </button>
      ))}
      {estado.erro && (
        <span role="alert" className="text-[12px] text-[#9d3b2f]">
          {estado.erro}
        </span>
      )}
    </form>
  );
}
