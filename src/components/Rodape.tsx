import Link from "next/link";
import { NEGOCIO } from "@/data/negocio";
import { SERVICOS } from "@/data/servicos";
import { linkWhatsapp } from "@/lib/whatsapp";
import { Env } from "./ui";

/**
 * O rodapé, em vidro.
 *
 * Vidro só aparece se houver alguma coisa ATRÁS dele pra desfocar — sobre
 * um fundo liso, `backdrop-filter` não muda nada e o "efeito" vira um
 * retângulo bege. Por isso o rodapé tem dois halos dourados, grandes e bem
 * desfocados, e o conteúdo fica num painel translúcido por cima: é o halo
 * passando borrado pelo painel que dá a leitura de vidro.
 *
 * Os halos são `aria-hidden` e `pointer-events-none`: são luz, não
 * conteúdo.
 */
export function Rodape() {
  const ano = new Date().getFullYear();

  return (
    <footer className="relative overflow-hidden border-t border-linha bg-papel pt-[50px] pb-[34px]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -left-24 size-[420px] rounded-full bg-ouro-claro/45 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 -bottom-32 size-[380px] rounded-full bg-ouro/25 blur-3xl"
      />

      <Env className="relative">
        <div className="border border-white/70 bg-white/40 p-7 shadow-[0_18px_50px_-24px_rgba(51,43,34,0.35)] backdrop-blur-xl backdrop-saturate-150 sm:p-9">
          <div className="grid gap-8 md:grid-cols-[1.4fr_1fr_1fr]">
            <div>
              <p className="mb-[10px] font-titulo text-3xl font-light uppercase tracking-[0.1em]">
                Karol Carvalho
              </p>
              <p className="text-sm text-tinta-2">
                Maquiadora e designer de sobrancelhas em {NEGOCIO.atuacaoCidades}.
              </p>
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1">
                <Link
                  href="/agendar"
                  className="inline-flex min-h-[44px] items-center text-[11px] font-bold uppercase tracking-[0.2em] text-ouro transition-opacity hover:opacity-70"
                >
                  Agendar horário →
                </Link>
                <Link
                  href="/sobre"
                  className="inline-flex min-h-[44px] items-center text-[11px] font-bold uppercase tracking-[0.2em] text-tinta-2 transition-colors hover:text-ouro"
                >
                  Conhecer a Karol
                </Link>
              </div>
            </div>

            <div>
              <h2 className="mb-[14px] text-[10px] font-bold uppercase tracking-[0.22em] text-ouro">
                Serviços
              </h2>
              <ul className="flex flex-col gap-[10px]">
                {SERVICOS.map((s) => (
                  <li key={s.id}>
                    <Link
                      href={s.categoria === "curso" ? "/#curso" : "/#servicos"}
                      className="text-sm text-tinta-2 transition-colors hover:text-ouro"
                    >
                      {s.nome}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h2 className="mb-[14px] text-[10px] font-bold uppercase tracking-[0.22em] text-ouro">
                Contato
              </h2>
              <ul className="flex flex-col gap-[10px]">
                <li>
                  <a
                    href={linkWhatsapp()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-tinta-2 transition-colors hover:text-ouro"
                  >
                    WhatsApp {NEGOCIO.whatsapp.exibicao}
                  </a>
                </li>
                <li>
                  <a
                    href={`https://instagram.com/${NEGOCIO.instagram.studio}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-tinta-2 transition-colors hover:text-ouro"
                  >
                    @{NEGOCIO.instagram.studio}
                  </a>
                </li>
                <li>
                  <a
                    href={`https://instagram.com/${NEGOCIO.instagram.pessoal}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-tinta-2 transition-colors hover:text-ouro"
                  >
                    @{NEGOCIO.instagram.pessoal}
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-7 flex flex-col items-center gap-1 text-center text-xs text-tinta-3 sm:flex-row sm:justify-between sm:text-left">
          <p>
            © {ano} {NEGOCIO.nome} · {NEGOCIO.atuacaoCidades}
          </p>
          <Link
            href="/privacidade"
            className="inline-flex min-h-[44px] items-center transition-colors hover:text-ouro"
          >
            Privacidade e seus dados
          </Link>
        </div>
      </Env>
    </footer>
  );
}
