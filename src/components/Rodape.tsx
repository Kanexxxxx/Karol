import Link from "next/link";
import { NEGOCIO } from "@/data/negocio";
import { SERVICOS } from "@/data/servicos";
import { linkWhatsapp } from "@/lib/whatsapp";
import { Env } from "./ui";

export function Rodape() {
  return (
    <footer className="border-t border-linha bg-papel pt-[50px] pb-[34px]">
      <Env>
        <div className="grid gap-8 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <p className="mb-[10px] font-titulo text-3xl font-light uppercase tracking-[0.1em]">
              Karol Carvalho
            </p>
            <p className="text-sm text-tinta-2">
              Maquiadora e designer de sobrancelhas em {NEGOCIO.atuacaoCidades}.
            </p>
            <Link
              href="/sobre"
              className="mt-3.5 inline-flex min-h-[38px] items-center text-[11px] font-bold uppercase tracking-[0.2em] text-ouro transition-opacity hover:opacity-70"
            >
              Conhecer a Karol →
            </Link>
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

        <div className="mt-9 flex flex-col items-center gap-1.5 border-t border-linha pt-6 text-center text-xs text-tinta-3">
          <p>
            {NEGOCIO.nome} · {NEGOCIO.atuacaoCidades}
          </p>
          <Link href="/privacidade" className="transition-colors hover:text-ouro">
            Política de privacidade
          </Link>
        </div>
      </Env>
    </footer>
  );
}
