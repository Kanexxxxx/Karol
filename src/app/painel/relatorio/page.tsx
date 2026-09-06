import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { sessaoAtiva } from "@/lib/sessao";
import { bancoConfigurado } from "@/lib/banco";
import { relatorioDoMes, type Falta, type LinhaRelatorio } from "@/lib/agendamentos";
import { formatarPreco } from "@/data/servicos";
import { FUSO } from "@/data/negocio";
import { DIA_E_HORA } from "@/lib/datas";

export const metadata: Metadata = { title: "Relatório", robots: { index: false } };
export const dynamic = "force-dynamic";

const MES_POR_EXTENSO = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  year: "numeric",
  timeZone: FUSO,
});

/** Quantos meses pra trás aparecem no seletor. */
const MESES_NO_SELETOR = 12;

export default async function Relatorio({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  if (!(await sessaoAtiva())) redirect("/painel/login");

  const { mes } = await searchParams;
  const hoje = new Date();

  // Mês pedido pela querystring, ou o atual. Nunca no futuro.
  const pedido = /^\d{4}-\d{2}$/.test(mes ?? "")
    ? new Date(Number(mes!.slice(0, 4)), Number(mes!.slice(5, 7)) - 1, 1)
    : new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const limite = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const atual = pedido > limite ? limite : pedido;

  const r = bancoConfigurado()
    ? await relatorioDoMes(atual.getFullYear(), atual.getMonth())
    : null;

  const meses = Array.from({ length: MESES_NO_SELETOR }, (_, i) => {
    const d = new Date(limite.getFullYear(), limite.getMonth() - i, 1);
    return {
      chave: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      rotulo: MES_POR_EXTENSO.format(d),
      atual: d.getTime() === atual.getTime(),
    };
  });

  return (
    <main className="min-h-dvh bg-osso">
      <header className="border-b border-linha bg-papel">
        <div className="mx-auto flex max-w-[900px] flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 py-4">
          <div>
            <p className="font-titulo text-xl uppercase tracking-[0.14em]">Relatório</p>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-tinta-3 first-letter:uppercase">
              {MES_POR_EXTENSO.format(atual)}
            </p>
          </div>
          <Link
            href="/painel"
            className="text-[11px] font-semibold uppercase tracking-[0.16em] text-tinta-3 hover:text-ouro"
          >
            ← Agenda
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-[900px] px-5 py-8">
        {/* Seletor de mês: link comum, funciona sem JavaScript. */}
        <nav aria-label="Escolher o mês" className="mb-8 flex flex-wrap gap-2">
          {meses.map((m) => (
            <Link
              key={m.chave}
              href={`/painel/relatorio?mes=${m.chave}`}
              aria-current={m.atual ? "page" : undefined}
              className={`border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] transition-colors first-letter:uppercase ${
                m.atual
                  ? "border-ouro bg-ouro text-white"
                  : "border-linha bg-papel text-tinta-2 hover:border-ouro-claro hover:text-ouro"
              }`}
            >
              {m.rotulo.replace(" de ", "/")}
            </Link>
          ))}
        </nav>

        {!r ? (
          <Vazio texto="Banco não configurado." />
        ) : r.atendidas + r.faltaram + r.canceladas + r.pendentes === 0 ? (
          <Vazio texto="Nenhum agendamento neste mês." />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Cartao rotulo="Faturamento" valor={formatarPreco(r.faturamento / 100)} destaque />
              <Cartao rotulo="Atendidas" valor={String(r.atendidas)} />
              <Cartao rotulo="Ticket médio" valor={formatarPreco(r.ticketMedio / 100)} />
              <Cartao
                rotulo="Faltas"
                valor={`${r.faltaram}`}
                nota={
                  r.faltaram > 0
                    ? `${r.taxaFalta}% · ${formatarPreco(r.perdidoComFaltas / 100)} que não entrou`
                    : undefined
                }
              />
            </div>

            {/* Concordância na mão: "1 foram cancelados" fica feio. */}
            <p className="mt-3 text-[12.5px] text-tinta-3">
              O faturamento conta só quem você marcou como <b>Atendida</b>.
              {r.pendentes > 0 &&
                ` Ainda ${r.pendentes === 1 ? "falta 1" : `faltam ${r.pendentes}`} por acontecer neste mês.`}
              {r.canceladas > 0 &&
                ` ${r.canceladas === 1 ? "1 foi cancelado" : `${r.canceladas} foram cancelados`}.`}
            </p>

            <QuemFaltou faltas={r.faltas} />

            <Tabela titulo="Por serviço" linhas={r.porServico} />
            <Tabela titulo="Por cidade" linhas={r.porCidade} />

            <p className="mt-8 border-t border-linha pt-5 text-[12.5px] text-tinta-3">
              Os valores vêm do preço da tabela no momento em que a cliente
              agendou. Se você cobrou diferente na hora — desconto, combinado à
              parte — o relatório não sabe disso.
            </p>
          </>
        )}
      </div>
    </main>
  );
}

function Cartao({
  rotulo,
  valor,
  nota,
  destaque = false,
}: {
  rotulo: string;
  valor: string;
  nota?: string;
  destaque?: boolean;
}) {
  return (
    <div className={`border p-4 ${destaque ? "border-ouro-claro bg-ouro-fundo" : "border-linha bg-papel"}`}>
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-tinta-3">{rotulo}</p>
      <p
        className={`mt-1.5 font-titulo tabular-nums leading-none ${
          destaque ? "text-[30px] text-ouro" : "text-[28px] text-tinta"
        }`}
      >
        {valor}
      </p>
      {nota && <p className="mt-1 text-[11px] text-tinta-3">{nota}</p>}
    </div>
  );
}

/**
 * Quem não apareceu, com o WhatsApp do lado.
 *
 * O número seco de faltas não serve pra nada sozinho — o que ela faz com
 * essa informação é falar com a pessoa. Por isso o nome e o link vêm juntos.
 */
function QuemFaltou({ faltas }: { faltas: Falta[] }) {
  if (faltas.length === 0) return null;

  return (
    <section className="mt-8">
      <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-ouro">
        Quem faltou
      </h2>
      <ul className="flex flex-col gap-2">
        {faltas.map((f) => (
          <li
            key={f.id}
            className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border border-linha bg-papel px-4 py-3"
          >
            <div className="min-w-0">
              <p className="font-titulo text-[19px] leading-tight">{f.cliente}</p>
              <p className="mt-0.5 text-[13px] text-tinta-3 first-letter:uppercase">
                {f.servico} · {DIA_E_HORA.format(f.quando)} ·{" "}
                {formatarPreco(f.valorPerdido / 100)}
              </p>
            </div>
            <a
              href={`https://wa.me/${f.whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[38px] shrink-0 items-center border border-linha px-3.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-tinta-2 transition-colors hover:border-ouro-claro hover:text-ouro"
            >
              Chamar
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Tabela({ titulo, linhas }: { titulo: string; linhas: LinhaRelatorio[] }) {
  if (linhas.length === 0) return null;

  return (
    <section className="mt-8">
      <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-ouro">
        {titulo}
      </h2>
      <table className="w-full border-collapse border border-linha bg-papel text-[14.5px]">
        <thead>
          <tr className="border-b border-linha text-[10px] uppercase tracking-[0.14em] text-tinta-3">
            <th scope="col" className="px-4 py-2.5 text-left font-semibold">O quê</th>
            <th scope="col" className="px-4 py-2.5 text-right font-semibold">Qtd</th>
            <th scope="col" className="px-4 py-2.5 text-right font-semibold">Total</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((l) => (
            <tr key={l.nome} className="border-b border-linha last:border-b-0">
              <td className="px-4 py-2.5">{l.nome}</td>
              <td className="px-4 py-2.5 text-right tabular-nums text-tinta-2">{l.quantidade}</td>
              <td className="px-4 py-2.5 text-right tabular-nums font-medium">
                {formatarPreco(l.total / 100)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function Vazio({ texto }: { texto: string }) {
  return <p className="border border-linha bg-papel p-6 text-tinta-2">{texto}</p>;
}
