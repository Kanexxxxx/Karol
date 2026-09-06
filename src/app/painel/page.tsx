import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { sessaoAtiva } from "@/lib/sessao";
import { bancoConfigurado } from "@/lib/banco";
import { agendaDaKarol, type Agendamento } from "@/lib/agendamentos";
import { formatarPreco } from "@/data/servicos";
import { paraChave } from "@/lib/agenda";
import { DIA_POR_EXTENSO, HORA } from "@/lib/datas";
import { AcoesAgendamento } from "./AcoesAgendamento";
import { Remarcar } from "./Remarcar";
import { sair } from "./acoes";

export const metadata: Metadata = { title: "Painel", robots: { index: false } };
export const dynamic = "force-dynamic";

const SITUACAO_ROTULO: Record<Agendamento["situacao"], { texto: string; classe: string }> = {
  pendente: { texto: "Aguardando", classe: "bg-[#f3e7cd] text-[#8a6a1f]" },
  confirmado: { texto: "Confirmado", classe: "bg-ouro text-white" },
  concluido: { texto: "Atendida", classe: "bg-[#e3ded3] text-tinta-2" },
  cancelado: { texto: "Cancelado", classe: "bg-[#f0e2df] text-[#9d3b2f]" },
  faltou: { texto: "Faltou", classe: "bg-[#f0e2df] text-[#9d3b2f]" },
};

export default async function Painel() {
  if (!(await sessaoAtiva())) redirect("/painel/login");

  const agendamentos = bancoConfigurado() ? await agendaDaKarol(-1, 60) : [];
  const porDia = agruparPorDia(agendamentos);

  const ativos = agendamentos.filter((a) => a.situacao === "confirmado" || a.situacao === "pendente");
  const aguardando = agendamentos.filter((a) => a.situacao === "pendente").length;

  return (
    <main className="min-h-dvh bg-osso">
      <header className="border-b border-linha bg-papel">
        <div className="mx-auto flex max-w-[900px] flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 py-4">
          <div>
            <p className="font-titulo text-xl uppercase tracking-[0.14em]">Painel</p>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-tinta-3">
              {ativos.length} na agenda
              {aguardando > 0 && ` · ${aguardando} aguardando`}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/painel/novo"
              className="inline-flex min-h-[34px] items-center bg-ouro px-3.5 text-[10.5px] font-bold uppercase tracking-[0.14em] text-white transition-opacity hover:opacity-90"
            >
              + Marcar
            </Link>
            <Link
              href="/painel/relatorio"
              className="text-[11px] font-semibold uppercase tracking-[0.16em] text-tinta-3 hover:text-ouro"
            >
              Relatório
            </Link>
            <Link
              href="/painel/bloqueios"
              className="text-[11px] font-semibold uppercase tracking-[0.16em] text-tinta-3 hover:text-ouro"
            >
              Bloqueios
            </Link>
            <Link
              href="/painel/notificacoes"
              className="text-[11px] font-semibold uppercase tracking-[0.16em] text-tinta-3 hover:text-ouro"
            >
              Notificações
            </Link>
            <form action={sair}>
              <button
                type="submit"
                className="border border-linha px-3 py-1.5 text-[10.5px] font-bold uppercase tracking-[0.14em] text-tinta-2 transition-colors hover:border-ouro-claro hover:text-ouro"
              >
                Sair
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[900px] px-5 py-8">
        {!bancoConfigurado() ? (
          <Vazio texto="Banco não configurado. Preencha NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY." />
        ) : porDia.length === 0 ? (
          <Vazio texto="Nenhum agendamento nos próximos 60 dias." />
        ) : (
          <div className="flex flex-col gap-9">
            {porDia.map(({ chave, data, itens }) => (
              <section key={chave}>
                <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-ouro first-letter:uppercase">
                  {DIA_POR_EXTENSO.format(data)}
                </h2>
                <ul className="flex flex-col gap-2.5">
                  {itens.map((ag) => (
                    <li key={ag.id} className="border border-linha bg-papel p-4">
                      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                        <div className="min-w-0">
                          <p className="font-titulo text-[20px] leading-tight">
                            <span className="tabular-nums text-ouro">
                              {HORA.format(ag.inicio)}
                            </span>{" "}
                            {ag.servicoNome}
                          </p>
                          <p className="mt-0.5 text-[14px] text-tinta-2">
                            {ag.clienteNome} ·{" "}
                            <a
                              href={`https://wa.me/${ag.clienteWhatsapp}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-ouro underline decoration-ouro-claro underline-offset-2"
                            >
                              {formatarWhatsapp(ag.clienteWhatsapp)}
                            </a>
                          </p>
                          <p className="mt-0.5 text-[12px] uppercase tracking-[0.1em] text-tinta-3">
                            {ag.cidade} · {formatarPreco(ag.servicoPreco / 100)}
                          </p>
                          {ag.observacao && (
                            <p className="mt-1.5 border-l-2 border-linha pl-2.5 text-[13px] text-tinta-2">
                              {ag.observacao}
                            </p>
                          )}
                        </div>
                        <span
                          className={`shrink-0 px-2.5 py-1 text-[9.5px] font-bold uppercase tracking-[0.14em] ${SITUACAO_ROTULO[ag.situacao].classe}`}
                        >
                          {SITUACAO_ROTULO[ag.situacao].texto}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap items-start gap-2">
                        <AcoesAgendamento id={ag.id} situacao={ag.situacao} />
                        <Remarcar
                          id={ag.id}
                          diaAtual={paraChave(ag.inicio)}
                          horaAtual={HORA.format(ag.inicio)}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function agruparPorDia(agendamentos: Agendamento[]) {
  const mapa = new Map<string, { chave: string; data: Date; itens: Agendamento[] }>();
  for (const ag of agendamentos) {
    const chave = paraChave(ag.inicio);
    if (!mapa.has(chave)) {
      mapa.set(chave, { chave, data: new Date(ag.inicio.getFullYear(), ag.inicio.getMonth(), ag.inicio.getDate()), itens: [] });
    }
    mapa.get(chave)!.itens.push(ag);
  }
  return [...mapa.values()];
}

function formatarWhatsapp(numero: string): string {
  const m = numero.match(/^(\d{2})(\d{2})(\d{4,5})(\d{4})$/);
  return m ? `(${m[2]}) ${m[3]}-${m[4]}` : numero;
}

function Vazio({ texto }: { texto: string }) {
  return (
    <p className="border border-linha bg-papel p-6 text-center text-[14px] text-tinta-2">{texto}</p>
  );
}
