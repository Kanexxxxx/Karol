import Link from "next/link";
import { ANTES_DE_VIR, CIDADES, NEGOCIO } from "@/data/negocio";
import {
  SERVICOS,
  formatarDuracao,
  formatarPreco,
  type Servico,
} from "@/data/servicos";
import { linkAgendar } from "@/lib/whatsapp";

const GRUPOS: { titulo: string; categoria: Servico["categoria"] }[] = [
  { titulo: "Sobrancelhas", categoria: "sobrancelha" },
  { titulo: "Maquiagem", categoria: "maquiagem" },
  { titulo: "Curso", categoria: "curso" },
];

export default function Home() {
  return (
    <>
      <header className="border-b border-linha">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-5">
          <span className="font-titulo text-lg tracking-wide text-tinta">
            Studio <span className="text-dourado">Karol Carvalho</span>
          </span>
          <Link
            href={linkAgendar()}
            className="rounded-full bg-dourado px-5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dourado"
          >
            Agendar
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {/* ---------- abertura ---------- */}
        <section className="bg-creme-fundo">
          <div className="mx-auto max-w-5xl px-6 py-20 sm:py-28">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-dourado">
              Pereira Barreto · Bandeirantes D&apos;Oeste
            </p>
            <h1 className="mt-4 font-titulo text-5xl font-light leading-[1.05] text-tinta text-balance sm:text-6xl">
              Karol Carvalho
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-tinta-suave">
              {NEGOCIO.frase}
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Link
                href={linkAgendar()}
                className="rounded-full bg-dourado px-7 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dourado"
              >
                Agendar meu horário
              </Link>
              <a
                href="#servicos"
                className="text-sm font-medium text-tinta-suave underline decoration-dourado-claro underline-offset-4 transition-colors hover:text-dourado"
              >
                Ver serviços e preços
              </a>
            </div>
          </div>
        </section>

        {/* ---------- serviços ---------- */}
        <section id="servicos" className="mx-auto max-w-5xl px-6 py-20 sm:py-24">
          <h2 className="font-titulo text-4xl font-light text-tinta">Serviços</h2>
          <p className="mt-3 max-w-lg text-tinta-suave">
            Todos os valores estão aqui, sem precisar perguntar.
          </p>

          <div className="mt-12 flex flex-col gap-14">
            {GRUPOS.map((grupo) => {
              const itens = SERVICOS.filter((s) => s.categoria === grupo.categoria);
              if (itens.length === 0) return null;

              return (
                <div key={grupo.categoria}>
                  <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-dourado">
                    {grupo.titulo}
                  </h3>
                  <ul
                    className={`mt-5 grid gap-px overflow-hidden rounded-lg border border-linha bg-linha ${
                      itens.length > 1 ? "sm:grid-cols-2" : ""
                    }`}
                  >
                    {itens.map((servico) => (
                      <li
                        key={servico.id}
                        className="flex flex-col gap-3 bg-papel p-6"
                      >
                        <div className="flex items-baseline justify-between gap-4">
                          <h4 className="font-titulo text-2xl font-normal text-tinta">
                            {servico.nome}
                          </h4>
                          <span className="shrink-0 font-titulo text-2xl text-dourado tabular-nums">
                            {formatarPreco(servico.preco)}
                          </span>
                        </div>
                        <p className="text-sm leading-relaxed text-tinta-suave">
                          {servico.descricao}
                        </p>
                        <div className="mt-auto flex items-center justify-between gap-4 pt-2">
                          <span className="text-xs uppercase tracking-wider text-tinta-fraca">
                            {formatarDuracao(servico)}
                          </span>
                          <Link
                            href={linkAgendar(servico.nome)}
                            className="text-sm font-medium text-dourado underline decoration-dourado-claro underline-offset-4 transition-opacity hover:opacity-70"
                          >
                            Agendar
                          </Link>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>

        {/* ---------- antes de vir ---------- */}
        <section className="bg-dourado-fundo">
          <div className="mx-auto max-w-5xl px-6 py-16">
            <h2 className="font-titulo text-3xl font-light text-tinta">
              Antes de vir
            </h2>
            <ul className="mt-6 flex flex-col gap-3">
              {ANTES_DE_VIR.map((aviso) => (
                <li
                  key={aviso}
                  className="flex gap-3 text-tinta-suave"
                >
                  <span aria-hidden="true" className="text-dourado">
                    —
                  </span>
                  {aviso}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ---------- onde ---------- */}
        <section className="mx-auto max-w-5xl px-6 py-20">
          <h2 className="font-titulo text-4xl font-light text-tinta">
            Onde eu atendo
          </h2>
          <div className="mt-8 grid gap-px overflow-hidden rounded-lg border border-linha bg-linha sm:grid-cols-2">
            {[
              { cidade: CIDADES["pereira-barreto"], dias: "Segunda a sexta, de manhã" },
              { cidade: CIDADES.bandeirantes, dias: "Sábado" },
            ].map(({ cidade, dias }) => (
              <div key={cidade.nome} className="bg-papel p-7">
                <h3 className="font-titulo text-2xl text-tinta">{cidade.nome}</h3>
                {cidade.local && (
                  <p className="mt-1 text-sm text-tinta-suave">{cidade.local}</p>
                )}
                <p className="mt-3 text-sm uppercase tracking-wider text-dourado">
                  {dias}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-linha bg-papel">
        <div className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-12 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-titulo text-xl text-tinta">{NEGOCIO.nome}</p>
            <p className="mt-1 text-sm text-tinta-fraca">{NEGOCIO.atuacao}</p>
          </div>
          <div className="flex flex-col gap-2 text-sm sm:items-end">
            <Link href={linkAgendar()} className="text-dourado hover:opacity-70">
              WhatsApp {NEGOCIO.whatsapp.exibicao}
            </Link>
            <a
              href={`https://instagram.com/${NEGOCIO.instagram.studio}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-tinta-suave hover:text-dourado"
            >
              @{NEGOCIO.instagram.studio}
            </a>
          </div>
        </div>
      </footer>
    </>
  );
}
