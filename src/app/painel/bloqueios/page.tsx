import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { sessaoAtiva } from "@/lib/sessao";
import { bancoConfigurado } from "@/lib/banco";
import { listarBloqueios, type Bloqueio } from "@/lib/bloqueios";
import { Formulario } from "./Formulario";
import { apagarBloqueio } from "./acoes";

export const metadata: Metadata = { title: "Bloqueios", robots: { index: false } };
export const dynamic = "force-dynamic";

const DIA = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
const DIA_HORA = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function Bloqueios() {
  if (!(await sessaoAtiva())) redirect("/painel/login");

  const bloqueios = bancoConfigurado() ? await listarBloqueios() : [];

  return (
    <main className="min-h-dvh bg-osso">
      <header className="border-b border-linha bg-papel">
        <div className="mx-auto flex max-w-[720px] items-center justify-between gap-4 px-5 py-4">
          <p className="font-titulo text-xl uppercase tracking-[0.14em]">Bloqueios</p>
          <Link
            href="/painel"
            className="text-[11px] font-semibold uppercase tracking-[0.16em] text-tinta-3 hover:text-ouro"
          >
            ← Agenda
          </Link>
        </div>
      </header>

      <div className="mx-auto flex max-w-[720px] flex-col gap-8 px-5 py-8">
        <p className="text-[14px] text-tinta-2">
          Feche as janelas em que você não atende — férias, feriado, curso. O site
          para de oferecer esses horários na hora.
        </p>

        <Formulario />

        <section>
          <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-ouro">
            Bloqueios ativos
          </h2>

          {!bancoConfigurado() ? (
            <Aviso>Banco não configurado.</Aviso>
          ) : bloqueios.length === 0 ? (
            <Aviso>Nenhum bloqueio pra frente.</Aviso>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {bloqueios.map((b) => (
                <li
                  key={b.id}
                  className="flex items-start justify-between gap-4 border border-linha bg-papel p-4"
                >
                  <div>
                    <p className="font-titulo text-[18px] leading-tight">{b.motivo}</p>
                    <p className="mt-0.5 text-[13px] text-tinta-2">{descrever(b)}</p>
                  </div>
                  <form action={apagarBloqueio.bind(null, b.id)}>
                    <button
                      type="submit"
                      className="border border-linha px-3 py-1.5 text-[10.5px] font-bold uppercase tracking-[0.14em] text-tinta-2 transition-colors hover:border-[#c98b80] hover:text-[#9d3b2f]"
                    >
                      Remover
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}

function descrever(b: Bloqueio): string {
  if (b.diaInteiro) {
    // o fim é 00:00 do dia seguinte; volta um dia pra mostrar o último dia coberto
    const ultimoDia = new Date(b.fim);
    ultimoDia.setDate(ultimoDia.getDate() - 1);
    const mesmoDia = b.inicio.toDateString() === ultimoDia.toDateString();
    return mesmoDia
      ? `Dia ${DIA.format(b.inicio)}`
      : `De ${DIA.format(b.inicio)} a ${DIA.format(ultimoDia)}`;
  }
  return `${DIA_HORA.format(b.inicio)} até ${DIA_HORA.format(b.fim)}`;
}

function Aviso({ children }: { children: React.ReactNode }) {
  return (
    <p className="border border-linha bg-papel p-5 text-center text-[14px] text-tinta-2">
      {children}
    </p>
  );
}
