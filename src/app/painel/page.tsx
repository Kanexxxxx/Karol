import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { sessaoAtiva } from "@/lib/sessao";
import { bancoConfigurado } from "@/lib/banco";
import { agendaDaKarol, procurarAgendamentos, type Agendamento } from "@/lib/agendamentos";
import { paraChave } from "@/lib/agenda";
import { DIA_POR_EXTENSO } from "@/lib/datas";
import { Cartao } from "./Cartao";
import { sair } from "./acoes";

export const metadata: Metadata = { title: "Painel", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Painel({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  if (!(await sessaoAtiva())) redirect("/painel/login");

  const { q } = await searchParams;
  const busca = (q ?? "").trim().slice(0, 80);

  const agendamentos = bancoConfigurado() ? await agendaDaKarol(-1, 60) : [];
  const porDia = agruparPorDia(agendamentos);

  const achados =
    busca.length >= 3 && bancoConfigurado() ? await procurarAgendamentos(busca) : null;

  const ativos = agendamentos.filter(
    (a) => a.situacao === "confirmado" || a.situacao === "pendente",
  );
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
          {/*
            `flex-wrap` aqui não é enfeite: são cinco itens numa linha, e sem
            quebrar eles estouram a largura do celular — o "Sair" ficava
            pendurado fora da faixa branca do cabeçalho, e a página rolava
            de lado. A Karol usa o painel no telefone.
          */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
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
        <Busca valor={busca} />

        {!bancoConfigurado() ? (
          <Vazio texto="Banco não configurado. Preencha NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY." />
        ) : achados ? (
          <Resultados termo={busca} achados={achados} />
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
                    <Cartao key={ag.id} ag={ag} />
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

/**
 * Um campo só pra código, nome e telefone.
 *
 * É um `form` com `method="get"`: a busca vira `?q=` na barra de endereço,
 * funciona sem JavaScript, o botão voltar do celular faz o que se espera, e
 * ela pode deixar salvo. Nada disso vale o custo de um componente de cliente.
 */
function Busca({ valor }: { valor: string }) {
  return (
    <form method="get" className="mb-8 flex flex-wrap gap-2">
      <input
        type="search"
        name="q"
        defaultValue={valor}
        maxLength={80}
        placeholder="Código, nome ou telefone"
        aria-label="Procurar agendamento por código, nome ou telefone"
        className="min-h-[44px] min-w-0 flex-1 border border-linha bg-papel px-3.5 text-[15px] outline-none focus:border-ouro-claro"
      />
      <button
        type="submit"
        className="min-h-[44px] shrink-0 bg-ouro px-5 text-[10.5px] font-bold uppercase tracking-[0.16em] text-white transition-opacity hover:opacity-90"
      >
        Procurar
      </button>
      {valor && (
        <Link
          href="/painel"
          className="inline-flex min-h-[44px] shrink-0 items-center border border-linha px-4 text-[10.5px] font-bold uppercase tracking-[0.16em] text-tinta-2 transition-colors hover:border-ouro-claro hover:text-ouro"
        >
          Limpar
        </Link>
      )}
    </form>
  );
}

function Resultados({ termo, achados }: { termo: string; achados: Agendamento[] }) {
  if (achados.length === 0) {
    return (
      <Vazio
        texto={`Nada encontrado para “${termo}”. O código tem 6 caracteres; pelo telefone, digite pelo menos 4 números.`}
      />
    );
  }

  return (
    <section>
      <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-ouro">
        {achados.length === 1 ? "1 resultado" : `${achados.length} resultados`} para “{termo}”
      </h2>
      <ul className="flex flex-col gap-2.5">
        {achados.map((ag) => (
          <Cartao key={ag.id} ag={ag} comData />
        ))}
      </ul>
    </section>
  );
}

function agruparPorDia(agendamentos: Agendamento[]) {
  const mapa = new Map<string, { chave: string; data: Date; itens: Agendamento[] }>();
  for (const ag of agendamentos) {
    const chave = paraChave(ag.inicio);
    if (!mapa.has(chave)) {
      mapa.set(chave, {
        chave,
        data: new Date(ag.inicio.getFullYear(), ag.inicio.getMonth(), ag.inicio.getDate()),
        itens: [],
      });
    }
    mapa.get(chave)!.itens.push(ag);
  }
  return [...mapa.values()];
}

function Vazio({ texto }: { texto: string }) {
  return (
    <p className="border border-linha bg-papel p-6 text-center text-[14px] text-tinta-2">
      {texto}
    </p>
  );
}
