import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { sessaoAtiva } from "@/lib/sessao";
import { bancoConfigurado } from "@/lib/banco";
import { listarBloqueios, type Bloqueio } from "@/lib/bloqueios";
import { DIA_COM_ANO, DIA_E_HORA } from "@/lib/datas";
import { CabecalhoPainel, LARGURA, RodapePainel } from "../Moldura";
import { BOTAO, ROTULO_SECAO } from "../estilos";
import { Formulario } from "./Formulario";
import { apagarBloqueio } from "./acoes";

export const metadata: Metadata = { title: "Bloqueios", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Bloqueios() {
  if (!(await sessaoAtiva())) redirect("/painel/login");

  const bloqueios = bancoConfigurado() ? await listarBloqueios() : [];

  return (
    <main className="flex min-h-dvh flex-col bg-osso">
      <CabecalhoPainel
        titulo="Bloqueios"
        detalhe={
          bloqueios.length === 0
            ? "Nenhum pela frente"
            : bloqueios.length === 1
              ? "1 pela frente"
              : `${bloqueios.length} pela frente`
        }
        aba="bloqueios"
      />

      {/* Duas colunas na tela grande: fechar uma data e conferir as que já
          estão fechadas acontecem juntas. No celular, uma embaixo da outra. */}
      <div className={`${LARGURA} grid gap-8 py-6 sm:py-8 lg:grid-cols-2 lg:items-start`}>
        <div className="flex flex-col gap-5">
          <p className="text-[14px] leading-relaxed text-tinta-2">
            Feche as janelas em que você não atende — férias, feriado, curso. O site
            para de oferecer esses horários na hora.
          </p>
          <Formulario />
        </div>

        <section aria-labelledby="titulo-ativos">
          <h2 id="titulo-ativos" className={`mb-3 border-b border-linha pb-2.5 ${ROTULO_SECAO}`}>
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
                  className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border border-linha border-l-[3px] border-l-ouro-claro bg-papel py-3 pr-3 pl-4"
                >
                  <div className="min-w-0">
                    <p className="break-words font-titulo text-[20px] leading-tight">{b.motivo}</p>
                    <p className="mt-0.5 text-[13px] text-tinta-2 lining-nums">{descrever(b)}</p>
                  </div>
                  <form action={apagarBloqueio.bind(null, b.id)}>
                    <button
                      type="submit"
                      aria-label={`Remover o bloqueio “${b.motivo}”`}
                      className={BOTAO.secundario}
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

      <RodapePainel />
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
      ? `Dia ${DIA_COM_ANO.format(b.inicio)}`
      : `De ${DIA_COM_ANO.format(b.inicio)} a ${DIA_COM_ANO.format(ultimoDia)}`;
  }
  return `${DIA_E_HORA.format(b.inicio)} até ${DIA_E_HORA.format(b.fim)}`;
}

function Aviso({ children }: { children: React.ReactNode }) {
  return (
    <p className="border border-dashed border-linha bg-papel p-5 text-center text-[14px] text-tinta-2">
      {children}
    </p>
  );
}
