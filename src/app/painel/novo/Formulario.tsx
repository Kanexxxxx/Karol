"use client";

import Link from "next/link";
import { useActionState } from "react";
import { SERVICOS, formatarDuracao, formatarPreco } from "@/data/servicos";
import { CIDADES } from "@/data/negocio";
import { agendarNoPainel, type EstadoNovo } from "./acoes";

const INICIAL: EstadoNovo = {};

/**
 * Formulário da Karol pra marcar alguém na mão.
 *
 * A hora é campo livre, não a grade de 15 em 15 do site: aqui é pra
 * encaixar a mãe, o pai, quem ligou. Quem impede choque é a trava do
 * banco, então liberdade aqui não custa segurança.
 */
export function Formulario() {
  const [estado, acao, enviando] = useActionState(agendarNoPainel, INICIAL);
  const v = estado.valores;

  if (estado.ok) {
    return (
      <div className="border border-linha bg-papel p-6">
        <p className="font-titulo text-[22px]">Marcado.</p>
        <p className="mt-1.5 text-[14px] text-tinta-2">
          O horário já está reservado e sumiu do site.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/painel"
            className="inline-flex min-h-[44px] items-center bg-ouro px-5 text-[11px] font-bold uppercase tracking-[0.16em] text-white"
          >
            Ver a agenda
          </Link>
          <Link
            href="/painel/novo"
            className="inline-flex min-h-[44px] items-center border border-linha px-5 text-[11px] font-bold uppercase tracking-[0.16em] text-tinta-2"
          >
            Marcar outro
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form action={acao} className="flex flex-col gap-5">
      {estado.erro && (
        <p
          role="alert"
          className="border border-[#d9b9b3] bg-[#f7ecea] px-4 py-3 text-[14px] text-[#9d3b2f]"
        >
          {estado.erro}
        </p>
      )}

      <Campo rotulo="Serviço">
        <select
          name="servicoId"
          defaultValue={v?.servicoId ?? SERVICOS[0].id}
          required
          className="w-full border border-linha bg-osso px-4 py-3 text-[15px]"
        >
          {SERVICOS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nome} — {formatarDuracao(s)} — {formatarPreco(s.preco)}
            </option>
          ))}
        </select>
      </Campo>

      <Campo rotulo="Cidade">
        <select
          name="cidade"
          defaultValue={v?.cidade ?? "pereira-barreto"}
          required
          className="w-full border border-linha bg-osso px-4 py-3 text-[15px]"
        >
          {Object.entries(CIDADES).map(([id, c]) => (
            <option key={id} value={id}>
              {c.nome}
            </option>
          ))}
        </select>
      </Campo>

      <div className="grid gap-5 sm:grid-cols-2">
        <Campo rotulo="Dia">
          <input
            type="date"
            name="chaveDia"
            defaultValue={v?.chaveDia}
            required
            className="w-full border border-linha bg-osso px-4 py-3 text-[15px]"
          />
        </Campo>
        <Campo rotulo="Hora">
          <input
            type="time"
            name="hora"
            defaultValue={v?.hora}
            required
            className="w-full border border-linha bg-osso px-4 py-3 text-[15px]"
          />
        </Campo>
      </div>

      <Campo rotulo="Nome">
        <input
          name="nome"
          defaultValue={v?.nome}
          required
          className="w-full border border-linha bg-osso px-4 py-3 text-[15px]"
        />
      </Campo>

      <Campo rotulo="WhatsApp" dica="pode deixar vazio se for da família">
        <input
          name="whatsapp"
          type="tel"
          inputMode="tel"
          defaultValue={v?.whatsapp}
          placeholder="(18) 99999-9999"
          className="w-full border border-linha bg-osso px-4 py-3 text-[15px]"
        />
      </Campo>

      <Campo rotulo="Recado" dica="opcional">
        <textarea
          name="observacao"
          rows={2}
          maxLength={500}
          defaultValue={v?.observacao}
          className="w-full resize-y border border-linha bg-osso px-4 py-3 text-[15px]"
        />
      </Campo>

      <button
        type="submit"
        disabled={enviando}
        className="mt-1 inline-flex min-h-[50px] items-center justify-center bg-ouro px-8 text-[11.5px] font-bold uppercase tracking-[0.2em] text-white transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {enviando ? "Marcando…" : "Marcar horário"}
      </button>
    </form>
  );
}

function Campo({
  rotulo,
  dica,
  children,
}: {
  rotulo: string;
  dica?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-tinta-3">
        {rotulo}
        {dica && <span className="ml-1.5 normal-case text-tinta-3/70">({dica})</span>}
      </span>
      {children}
    </label>
  );
}
