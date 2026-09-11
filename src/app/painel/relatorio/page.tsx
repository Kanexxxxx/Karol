import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { sessaoAtiva } from "@/lib/sessao";
import { bancoConfigurado } from "@/lib/banco";
import { relatorioDoMes, type ItemRelatorio, type LinhaRelatorio } from "@/lib/agendamentos";
import { AcoesAgendamento } from "../AcoesAgendamento";
import { Indicador, Indicadores } from "../Indicadores";
import { CabecalhoPainel, LARGURA, RodapePainel } from "../Moldura";
import { BOTAO, FOCO, NUMERO, ROTULO_SECAO } from "../estilos";
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

/** Só o nome do mês — usado nas comparações ("mais que agosto"). */
const MES_SO_NOME = new Intl.DateTimeFormat("pt-BR", { month: "long", timeZone: FUSO });

/** "set." — o nome curto, pro seletor. */
const MES_CURTO = new Intl.DateTimeFormat("pt-BR", { month: "short", timeZone: FUSO });

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

  const mesAnterior = MES_SO_NOME.format(
    new Date(atual.getFullYear(), atual.getMonth() - 1, 1),
  );

  const meses = Array.from({ length: MESES_NO_SELETOR }, (_, i) => {
    const d = new Date(limite.getFullYear(), limite.getMonth() - i, 1);
    return {
      chave: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      rotulo: MES_POR_EXTENSO.format(d),
      curto: MES_CURTO.format(d).replace(".", ""),
      ano: d.getFullYear(),
      atual: d.getTime() === atual.getTime(),
    };
  });

  return (
    <main className="flex min-h-dvh flex-col bg-osso">
      <CabecalhoPainel titulo="Relatório" detalhe={MES_POR_EXTENSO.format(atual)} aba="relatorio" />

      <div className={`${LARGURA} py-6 sm:py-8`}>
        {/*
          Seletor de mês: link comum, funciona sem JavaScript.

          Eram doze etiquetas "setembro/2026" soltas, quebrando em quatro ou
          cinco linhas desalinhadas no celular. Agora é uma grade de mesmo
          desenho dos mostradores (fio de 1 px entre as células): 4 por
          linha no celular, os 12 numa linha só na tela grande.
        */}
        <nav aria-label="Escolher o mês" className="mb-8">
          <ul className="grid grid-cols-4 gap-px border border-linha bg-linha sm:grid-cols-6 lg:grid-cols-12">
            {meses.map((m) => (
              <li key={m.chave}>
                <Link
                  href={`/painel/relatorio?mes=${m.chave}`}
                  aria-current={m.atual ? "page" : undefined}
                  aria-label={m.rotulo}
                  className={`flex min-h-[52px] flex-col items-center justify-center transition-colors focus-visible:-outline-offset-2 ${FOCO} ${
                    m.atual
                      ? "bg-ouro text-white"
                      : "bg-papel text-tinta-2 hover:bg-ouro-fundo hover:text-tinta"
                  }`}
                >
                  <span className="text-[12px] font-bold uppercase tracking-[0.12em]">{m.curto}</span>
                  <span className={`text-[11px] lining-nums ${m.atual ? "text-white/85" : "text-tinta-3"}`}>
                    {m.ano}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {!r ? (
          <Vazio texto="Banco não configurado." />
        ) : r.atendidas + r.faltaram + r.canceladas + r.pendentes === 0 ? (
          <Vazio texto="Nenhum agendamento neste mês." />
        ) : (
          <>
            {/* Antes dos números, de propósito: enquanto houver atendimento
                sem marcação, os números abaixo estão errados pra baixo. */}
            <SemMarcacao itens={r.aMarcar} valor={r.aMarcarValor} />

            <Indicadores rotulo="Números do mês" className="grid-cols-2 sm:grid-cols-4">
              <Indicador
                rotulo="Faturamento"
                valor={formatarPreco(r.faturamento / 100)}
                nota={comparar(r.faturamento, r.anterior?.faturamento, mesAnterior)}
                tom="destaque"
              />
              <Indicador
                rotulo="Atendidas"
                valor={r.atendidas}
                nota={comparar(r.atendidas, r.anterior?.atendidas, mesAnterior, false)}
              />
              <Indicador rotulo="Ticket médio" valor={formatarPreco(r.ticketMedio / 100)} />
              <Indicador
                rotulo="Faltas"
                valor={r.faltaram}
                nota={
                  r.faltaram > 0
                    ? `${r.taxaFalta}% · ${formatarPreco(r.perdidoComFaltas / 100)} que não entrou`
                    : undefined
                }
              />
            </Indicadores>

            {/* Concordância na mão: "1 foram cancelados" fica feio. */}
            <p className="mt-3 text-[12.5px] leading-relaxed text-tinta-2">
              O faturamento conta só quem você marcou como <b>Atendida</b>.
              {r.pendentes > 0 &&
                ` Ainda ${r.pendentes === 1 ? "falta 1" : `faltam ${r.pendentes}`} por acontecer neste mês.`}
              {r.canceladas > 0 &&
                ` ${r.canceladas === 1 ? "1 foi cancelado" : `${r.canceladas} foram cancelados`}.`}
            </p>

            <QuemVeio novas={r.novas} retornaram={r.retornaram} />

            <QuemFaltou faltas={r.faltas} />

            <div className="grid gap-x-6 lg:grid-cols-2">
              <Tabela titulo="Por serviço" linhas={r.porServico} />
              <Tabela titulo="Por cidade" linhas={r.porCidade} />
            </div>

            <p className="mt-10 border-t border-linha pt-5 text-[12.5px] leading-relaxed text-tinta-2">
              Os valores vêm do preço da tabela no momento em que a cliente
              agendou. Se você cobrou diferente na hora — desconto, combinado à
              parte — o relatório não sabe disso.
            </p>
          </>
        )}
      </div>

      <RodapePainel />
    </main>
  );
}

/**
 * Quem não apareceu, com o WhatsApp do lado.
 *
 * O número seco de faltas não serve pra nada sozinho — o que ela faz com
 * essa informação é falar com a pessoa. Por isso o nome e o link vêm juntos.
 */
function QuemFaltou({ faltas }: { faltas: ItemRelatorio[] }) {
  if (faltas.length === 0) return null;

  return (
    <section className="mt-10">
      <h2 className={`mb-3 border-b border-linha pb-2.5 ${ROTULO_SECAO}`}>Quem faltou</h2>
      <ul className="flex flex-col gap-2">
        {faltas.map((f) => (
          <li
            key={f.id}
            className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border border-linha bg-papel px-4 py-3"
          >
            <div className="min-w-0">
              <p className="break-words font-titulo text-[20px] leading-tight">{f.cliente}</p>
              <p className="mt-0.5 text-[13px] text-tinta-2 lining-nums first-letter:uppercase">
                {f.servico} · {DIA_E_HORA.format(f.quando)} ·{" "}
                {formatarPreco(f.valor / 100)}
              </p>
            </div>
            <a
              href={`https://wa.me/${f.whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Chamar ${f.cliente} no WhatsApp`}
              className={`${BOTAO.secundario} shrink-0`}
            >
              Chamar
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Atendimentos que já passaram da hora e continuam "confirmado".
 *
 * ⚠️ É a correção mais importante que este relatório recebeu, e ela é sobre
 * CONFIANÇA no número. O faturamento conta só quem foi marcada como
 * Atendida — então cada esquecimento é dinheiro que entrou e não aparece
 * aqui. O relatório errava pra baixo em silêncio, e ninguém tinha como
 * desconfiar olhando pra ele.
 *
 * Vem antes dos números na tela porque, enquanto tiver linha aqui, os
 * números de baixo estão errados. E traz os botões do painel junto: o lugar
 * de resolver é o lugar onde o problema aparece.
 */
function SemMarcacao({ itens, valor }: { itens: ItemRelatorio[]; valor: number }) {
  if (itens.length === 0) return null;

  return (
    <section className="mb-8 border border-[#e6cdbd] border-l-[3px] border-l-[#c0632f] bg-[#fbf1ea] p-4 sm:p-5">
      <h2 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[#a2521f]">
        <span aria-hidden="true" className="size-2 bg-[#c0632f] motion-safe:animate-pulse" />
        {itens.length === 1
          ? "1 atendimento sem marcação"
          : `${itens.length} atendimentos sem marcação`}
      </h2>
      <p className="mt-2 mb-4 text-[13.5px] leading-relaxed text-tinta">
        O horário já passou e ficou sem resposta. Enquanto estiver assim,{" "}
        <b className="lining-nums">{formatarPreco(valor / 100)}</b> não entram no faturamento do mês.
        Marque como <b>Atendida</b> quem apareceu e <b>Faltou</b> quem não veio.
      </p>

      <ul className="flex flex-col gap-2">
        {itens.map((i) => (
          <li key={i.id} className="border border-[#e6cdbd] bg-papel px-4 py-3">
            <p className="break-words font-titulo text-[20px] leading-tight">{i.cliente}</p>
            <p className="mt-0.5 mb-3 text-[13px] text-tinta-2 lining-nums first-letter:uppercase">
              {i.servico} · {DIA_E_HORA.format(i.quando)} ·{" "}
              {formatarPreco(i.valor / 100)}
            </p>
            <AcoesAgendamento id={i.id} situacao="confirmado" />
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Novas contra as que voltaram.
 *
 * O número que mais diz sobre o negócio e o único que o relatório não
 * tinha. Sobrancelha vive de retorno — a cliente volta a cada três ou
 * quatro semanas, ou não volta mais. Um mês inteiro de clientes novas
 * parece crescimento e pode ser vazamento.
 *
 * Contado por pessoa, não por atendimento: quem veio duas vezes no mês
 * conta uma.
 */
function QuemVeio({ novas, retornaram }: { novas: number; retornaram: number }) {
  const total = novas + retornaram;
  if (total === 0) return null;

  const porcentoRetorno = Math.round((retornaram / total) * 100);

  return (
    <section className="mt-10">
      <h2 className={`mb-3 border-b border-linha pb-2.5 ${ROTULO_SECAO}`}>Quem você atendeu</h2>
      <div className="border border-linha bg-papel p-5">
        <div className="flex flex-wrap items-baseline gap-x-10 gap-y-3">
          <div>
            <p className={`text-[34px] leading-none text-ouro ${NUMERO}`}>{retornaram}</p>
            <p className="mt-1.5 text-[10.5px] font-bold uppercase tracking-[0.16em] text-tinta-2">
              {retornaram === 1 ? "Já era cliente" : "Já eram clientes"}
            </p>
          </div>
          <div>
            <p className={`text-[34px] leading-none ${NUMERO}`}>{novas}</p>
            <p className="mt-1.5 text-[10.5px] font-bold uppercase tracking-[0.16em] text-tinta-2">
              {novas === 1 ? "Cliente nova" : "Clientes novas"}
            </p>
          </div>
        </div>

        {/* A barra existe pra proporção ser lida sem contas. */}
        <div
          className="mt-4 flex h-2 overflow-hidden bg-creme"
          role="img"
          aria-label={`${porcentoRetorno}% das clientes do mês já tinham vindo antes`}
        >
          <div className="bg-ouro" style={{ width: `${porcentoRetorno}%` }} />
        </div>

        <p className="mt-3 text-[13px] text-tinta-2">
          {retornaram === 0
            ? "Nenhuma delas tinha vindo antes. É mês de gente nova conhecendo o studio."
            : `${porcentoRetorno}% de quem você atendeu esse mês já tinha vindo antes.`}
        </p>
      </div>
    </section>
  );
}

/**
 * A comparação com o mês anterior — "+18% que agosto", "3 a mais que agosto".
 *
 * ⚠️ Dinheiro vai em PORCENTAGEM e quantidade vai em NÚMERO ABSOLUTO, e a
 * diferença não é estética. Nos volumes da Karol (uma dúzia de atendimentos
 * por mês), passar de 2 pra 3 é "+50%" — que soa como um mês espetacular e
 * é uma cliente. Porcentagem sobre número pequeno mente por exagero.
 *
 * `undefined` quando não há com o que comparar: mês sem histórico, ou o
 * anterior zerado — "infinito por cento" não é informação.
 */
function comparar(
  agora: number,
  antes: number | undefined,
  nomeDoMes: string,
  emPorcentagem = true,
): string | undefined {
  if (antes === undefined || antes === 0) return undefined;
  if (agora === antes) return `igual a ${nomeDoMes}`;

  if (emPorcentagem) {
    const variacao = Math.round(((agora - antes) / antes) * 100);
    if (variacao === 0) return `quase igual a ${nomeDoMes}`;
    return `${variacao > 0 ? "+" : ""}${variacao}% que ${nomeDoMes}`;
  }

  const diferenca = agora - antes;
  const quantas = Math.abs(diferenca) === 1 ? "1 a" : `${Math.abs(diferenca)} a`;
  return `${quantas} ${diferenca > 0 ? "mais" : "menos"} que ${nomeDoMes}`;
}

function Tabela({ titulo, linhas }: { titulo: string; linhas: LinhaRelatorio[] }) {
  if (linhas.length === 0) return null;

  return (
    <section className="mt-10 min-w-0">
      <h2 className={`mb-3 border-b border-linha pb-2.5 ${ROTULO_SECAO}`}>{titulo}</h2>
      <table className="w-full border-collapse border border-linha bg-papel text-[14.5px]">
        <thead>
          <tr className="border-b border-linha bg-osso text-[10.5px] uppercase tracking-[0.14em] text-tinta-2">
            <th scope="col" className="px-4 py-2.5 text-left font-semibold">O quê</th>
            <th scope="col" className="px-3 py-2.5 text-right font-semibold">Qtd</th>
            <th scope="col" className="px-4 py-2.5 text-right font-semibold">Total</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((l) => (
            <tr key={l.nome} className="border-b border-linha last:border-b-0">
              <td className="px-4 py-3 break-words">{l.nome}</td>
              <td className="px-3 py-3 text-right tabular-nums text-tinta-2">{l.quantidade}</td>
              <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums font-medium">
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
  return (
    <p className="border border-dashed border-linha bg-papel p-6 text-center text-[14px] text-tinta-2">
      {texto}
    </p>
  );
}
