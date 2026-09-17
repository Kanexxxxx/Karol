"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";
import { agendar, type EstadoAgendar } from "./acoes";

/**
 * Mora aqui, e não em `acoes.ts`, porque aquele arquivo é `"use server"` e
 * só pode exportar função assíncrona. Exportar um objeto de lá derrubava o
 * módulo em produção e jogava o /agendar na tela de erro.
 */
const ESTADO_INICIAL: EstadoAgendar = {};

/**
 * Onde o rascunho do formulário fica enquanto ela não envia.
 *
 * ---------------------------------------------------------------------
 * ⚠️ POR QUE ISTO EXISTE
 * ---------------------------------------------------------------------
 *
 * Medido em 17/09/2026, num iPhone de verdade contra a produção: a cliente
 * escolhe serviço, cidade, dia e hora, digita nome e WhatsApp — e aperta F5
 * sem querer. O que sobrevive:
 *
 *   serviço, cidade, dia, hora ....... sobrevivem (estão na URL)
 *   nome e WhatsApp digitados ........ SUMIAM
 *
 * Ela não perdia os passos. Perdia o que tinha acabado de escrever, que é
 * a parte chata de digitar no celular. O Kainã levantou isso: "sem querer
 * recarrega a página e perde um monte de informação que já tinha colocado".
 *
 * ---------------------------------------------------------------------
 * `sessionStorage`, e não `localStorage`, de propósito
 * ---------------------------------------------------------------------
 *
 * É nome e telefone de uma pessoa. O `sessionStorage` morre quando ela
 * fecha a aba, não é compartilhado com outra aba e nunca sai do aparelho
 * dela — não passa pelo nosso servidor nem pelo banco. `localStorage`
 * ficaria lá meses, num celular que pode ser emprestado.
 *
 * E some antes disso em dois casos: quando ela envia, e quando o navegador
 * recusa gravar (aba anônima, armazenamento bloqueado). Por isso todo
 * acesso está dentro de try/catch: se falhar, o formulário funciona do
 * jeito de antes, só sem lembrar.
 */
const RASCUNHO = "karol:rascunho-agendamento";

type Rascunho = { nome?: string; whatsapp?: string; observacao?: string };

function lerRascunho(): Rascunho | null {
  try {
    const cru = sessionStorage.getItem(RASCUNHO);
    return cru ? (JSON.parse(cru) as Rascunho) : null;
  } catch {
    return null;
  }
}

function apagarRascunho(): void {
  try {
    sessionStorage.removeItem(RASCUNHO);
  } catch {
    /* aba anônima: não tinha o que apagar */
  }
}

/**
 * Último passo: nome, WhatsApp e um recado opcional.
 *
 * O serviço, o dia e a hora já foram escolhidos e viajam em campos ocultos.
 * A gravação, a checagem de conflito e o redirecionamento pra tela de
 * confirmação ficam na Server Action `agendar`.
 */
export function FormularioDados({
  servicoId,
  chaveDia,
  inicioMin,
  carimbo,
}: {
  servicoId: string;
  chaveDia: string;
  inicioMin: number;
  /** `Date.now()` no momento em que a página foi renderizada (anti-robô). */
  carimbo: number;
}) {
  const [estado, acao, enviando] = useActionState(agendar, ESTADO_INICIAL);
  const v = estado.valores;
  const form = useRef<HTMLFormElement>(null);

  /*
    Devolve o que ela tinha digitado, uma vez só, ao montar.

    ⚠️ SÓ PREENCHE CAMPO VAZIO. Se a ação do servidor recusou o envio, ela
    volta com `estado.valores` já na tela — e aquilo é mais novo que o
    rascunho. Sobrescrever seria trocar o certo pelo velho.
  */
  useEffect(() => {
    const guardado = lerRascunho();
    if (!guardado || !form.current) return;

    for (const campo of ["nome", "whatsapp", "observacao"] as const) {
      const el = form.current.elements.namedItem(campo);
      const valor = guardado[campo];
      if (!valor) continue;
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
        if (el.value === "") el.value = valor;
      }
    }
  }, []);

  /* A cada tecla, guarda. Barato, e é o que salva o F5 sem aviso. */
  function guardar() {
    if (!form.current) return;
    const d = new FormData(form.current);
    try {
      sessionStorage.setItem(
        RASCUNHO,
        JSON.stringify({
          nome: String(d.get("nome") ?? ""),
          whatsapp: String(d.get("whatsapp") ?? ""),
          observacao: String(d.get("observacao") ?? ""),
        }),
      );
    } catch {
      /* armazenamento bloqueado: segue sem lembrar */
    }
  }

  return (
    <form
      ref={form}
      action={acao}
      onInput={guardar}
      onSubmit={apagarRascunho}
      className="flex flex-col gap-5"
    >
      <input type="hidden" name="servicoId" value={servicoId} />
      <input type="hidden" name="chaveDia" value={chaveDia} />
      <input type="hidden" name="inicioMin" value={inicioMin} />
      <input type="hidden" name="carimbo" value={carimbo} />

      {/* Honeypot: fora da tela, sem foco. Cliente nunca vê; robô costuma preencher. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Site
          <input type="text" name="site" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {estado.erro && (
        <p
          role="alert"
          className="border border-[#d9b9b3] bg-[#f7ecea] px-4 py-3 text-[14px] text-[#9d3b2f]"
        >
          {estado.erro}
        </p>
      )}

      <Campo
        nome="nome"
        rotulo="Seu nome"
        erro={estado.campos?.nome}
        defaultValue={v?.nome}
        autoComplete="name"
        required
      />

      <Campo
        nome="whatsapp"
        rotulo="WhatsApp"
        erro={estado.campos?.whatsapp}
        defaultValue={v?.whatsapp}
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder="(18) 99999-9999"
        required
      />

      <label className="flex flex-col gap-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-tinta-3">
          Algum recado? <span className="normal-case text-tinta-3/70">(opcional)</span>
        </span>
        <textarea
          name="observacao"
          rows={3}
          maxLength={500}
          defaultValue={v?.observacao}
          className="resize-y border border-linha bg-osso px-4 py-3 text-[15px] text-tinta outline-none transition-colors focus:border-ouro-claro"
        />
        {estado.campos?.observacao && <Erro>{estado.campos.observacao}</Erro>}
      </label>

      <button
        type="submit"
        disabled={enviando}
        className="mt-1 inline-flex min-h-[50px] items-center justify-center bg-ouro px-[30px] py-4 text-[11.5px] font-bold uppercase tracking-[0.2em] text-white transition-opacity duration-300 hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ouro disabled:cursor-not-allowed disabled:opacity-60"
      >
        {enviando ? "Reservando…" : "Confirmar meu horário"}
      </button>

      <p className="text-[12.5px] text-tinta-3">
        Guardamos só seu nome e WhatsApp, para este atendimento.{" "}
        <Link
          href="/privacidade"
          className="underline decoration-linha underline-offset-2 hover:text-ouro"
        >
          Saiba mais
        </Link>
      </p>
    </form>
  );
}

function Campo({
  nome,
  rotulo,
  erro,
  ...input
}: {
  nome: string;
  rotulo: string;
  erro?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-tinta-3">
        {rotulo}
      </span>
      <input
        name={nome}
        aria-invalid={erro ? true : undefined}
        className="border border-linha bg-osso px-4 py-3 text-[15px] text-tinta outline-none transition-colors focus:border-ouro-claro aria-[invalid]:border-[#c98b80]"
        {...input}
      />
      {erro && <Erro>{erro}</Erro>}
    </label>
  );
}

function Erro({ children }: { children: React.ReactNode }) {
  return <span className="text-[13px] text-[#9d3b2f]">{children}</span>;
}
