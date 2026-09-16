import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FUSO } from "@/data/negocio";
import { sessaoAtiva } from "@/lib/sessao";
import { bancoConfigurado } from "@/lib/banco";
import { agendaDaKarol, procurarAgendamentos, type Agendamento } from "@/lib/agendamentos";
import { paraChave } from "@/lib/agenda";
import { DIA_CURTO, DIA_POR_EXTENSO, HORA } from "@/lib/datas";
import { Aguardando } from "./Aguardando";
import { Cartao } from "./Cartao";
import { Dia, emPe } from "./Dia";
import { Indicador, Indicadores } from "./Indicadores";
import { sinalDoAgendamento } from "./Cartao";
import { CabecalhoPainel, LARGURA, RodapePainel } from "./Moldura";
import { BOTAO, CAMPO_BASE, FOCO, ROTULO_SECAO } from "./estilos";

export const metadata: Metadata = { title: "Painel", robots: { index: false } };
export const dynamic = "force-dynamic";

const SO_SEMANA = new Intl.DateTimeFormat("pt-BR", { weekday: "long", timeZone: FUSO });

/** Ainda vai acontecer e segura o horário. */
const marcado = (a: Agendamento) => a.situacao === "confirmado" || a.situacao === "pendente";

/**
 * Quanto da agenda aparece de uma vez.
 *
 * ---------------------------------------------------------------------
 * Por que isto existe
 * ---------------------------------------------------------------------
 *
 * Kainã, 16/09/2026: *"tá muito ruim, numa tela só aparece vários
 * agendamentos, ela vai ter que arrastar lá pra baixão até achar o
 * cliente. Deixe mais organizado e acessível pra celular."*
 *
 * Ele tem razão e o número explica: a página carregava **60 dias** e
 * desenhava todos, um embaixo do outro. Numa semana cheia isso é dezenas
 * de cartões num celular — e o que ela abre o painel pra ver quase sempre
 * é hoje.
 *
 * ⚠️ O FILTRO É SÓ DE EXIBIÇÃO. Os 60 dias continuam vindo do banco, e é
 * de propósito: os números do topo ("7 dias", "pendentes") contam a
 * agenda inteira, e a contagem de cada aba também. Filtrar na consulta
 * faria as abas mentirem sobre o que existe fora da aba aberta.
 */
const PERIODOS = [
  { id: "hoje", rotulo: "Hoje", dias: 1 },
  { id: "semana", rotulo: "7 dias", dias: 7 },
  { id: "mes", rotulo: "30 dias", dias: 30 },
  { id: "tudo", rotulo: "Tudo", dias: 999 },
] as const;

type PeriodoId = (typeof PERIODOS)[number]["id"];

/*
  O padrão é a SEMANA, e não "hoje".

  "Hoje" seria mais curto, mas ela abre o painel à noite também — e um dia
  já atendido mostrando tela vazia parece defeito. Sete dias sempre tem o
  que mostrar quando há algo marcado, cabe no celular, e é o horizonte em
  que ela se organiza.
*/
const PERIODO_PADRAO: PeriodoId = "semana";

export default async function Painel({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; ver?: string }>;
}) {
  if (!(await sessaoAtiva())) redirect("/painel/login");

  const { q, ver } = await searchParams;
  const busca = (q ?? "").trim().slice(0, 80);

  const periodo: PeriodoId =
    PERIODOS.find((p) => p.id === ver)?.id ?? PERIODO_PADRAO;

  const agendamentos = bancoConfigurado() ? await agendaDaKarol(-1, 60) : [];
  const porDia = agruparPorDia(agendamentos);

  const achados =
    busca.length >= 3 && bancoConfigurado() ? await procurarAgendamentos(busca) : null;

  /*
    "Agora" é a hora do PEDIDO. A página é `force-dynamic` — cada abertura
    renderiza de novo no servidor, então isto nunca congela num build. E é
    no servidor de propósito: calcular no celular dela daria outro fuso e
    erro de hidratação (ver o comentário do lembrete no `Cartao`).
  */
  const agora = new Date();
  const dia = (desloca: number) =>
    new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + desloca);
  const chave = { ontem: paraChave(dia(-1)), hoje: paraChave(agora), amanha: paraChave(dia(1)) };

  const deHoje = agendamentos.filter((a) => paraChave(a.inicio) === chave.hoje && emPe(a));
  const restamHoje = deHoje.filter((a) => marcado(a) && a.inicio > agora).length;
  const naSemana = agendamentos.filter(
    (a) => emPe(a) && a.inicio >= dia(0) && a.inicio < dia(7),
  ).length;
  const pendentes = agendamentos.filter((a) => a.situacao === "pendente");
  /*
    ⚠️ PENDENTE NÃO É SEMPRE "DEVE PIX".

    Sinal só existe de R$ 80 pra cima. Um design de R$ 25 pendente (sobra
    de quando tudo entrava pendente, ou aprovação manual ligada) não tem
    comprovante nenhum pra conferir — e o painel mandava a Karol procurar
    um PIX que nunca existiu.
  */
  const comSinal = pendentes.filter((a) => sinalDoAgendamento(a) > 0).length;
  // A lista vem do banco ordenada por período: a primeira que ainda não
  // começou é a próxima.
  const proxima = agendamentos.find((a) => marcado(a) && a.inicio > agora);

  const quando = (d: Date) => {
    const k = paraChave(d);
    if (k === chave.hoje) return "hoje";
    if (k === chave.amanha) return "amanhã";
    return DIA_CURTO.format(d);
  };

  /*
    O recorte por período.

    ⚠️ O CORTE É POR DIA, não por hora. Se fosse por `agora`, um horário
    das 8h sumiria da tela às 8h01 — e ela precisa ver quem já passou pra
    marcar "atendida" ou "faltou" no fim do dia. Ontem também fica na
    visão de hoje, pelo mesmo motivo: é onde ela fecha o dia anterior.
  */
  /*
    "Cabe neste período?" — um dia entra quando começa antes do fim da
    janela. Ontem entra em TODOS: é a pendência mais provável dela (marcar
    quem veio e quem faltou), e some da tela junto com o resto do passado
    conforme os dias andam.
  */
  const cabeEm = (d: Date, dias: number) => d.getTime() < dia(dias).getTime();

  const quantosEm = (dias: number) =>
    porDia.reduce((n, d) => (cabeEm(d.data, dias) ? n + d.itens.length : n), 0);

  const diasDoPeriodo = PERIODOS.find((p) => p.id === periodo)!.dias;
  const diasVisiveis = porDia.filter((d) => cabeEm(d.data, diasDoPeriodo));

  return (
    <main className="flex min-h-dvh flex-col bg-osso">
      <CabecalhoPainel titulo="Agenda" detalhe={DIA_POR_EXTENSO.format(agora)} aba="agenda" />

      <div className={`${LARGURA} flex flex-col gap-8 py-6 sm:py-8`}>
        <Busca valor={busca} />

        {!bancoConfigurado() ? (
          <Vazio texto="Banco não configurado. Preencha NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY." />
        ) : achados ? (
          <Resultados termo={busca} achados={achados} />
        ) : (
          <>
            {/*
              A ordem é a das perguntas que ela faz ao abrir o celular:
              quem é a próxima, como está o dia, tem PIX pra conferir.
              "Próxima" ocupa a linha toda no celular porque é a única com
              nome — cortar o nome da cliente pra caber é pior que uma
              linha a mais.
            */}
            <Indicadores
              rotulo="Resumo da agenda"
              className="grid-cols-3 sm:grid-cols-[1.7fr_1fr_1fr_1fr]"
            >
              <Indicador
                className="col-span-3 sm:col-span-1"
                rotulo="Próxima cliente"
                valor={proxima ? HORA.format(proxima.inicio) : "—"}
                nota={
                  proxima ? (
                    <>
                      <span className="font-semibold text-tinta">{proxima.clienteNome}</span>
                      {" · "}
                      {quando(proxima.inicio)} · {proxima.servicoNome}
                    </>
                  ) : (
                    "Nada marcado pela frente."
                  )
                }
              />
              <Indicador
                rotulo="Hoje"
                valor={deHoje.length}
                nota={
                  deHoje.length === 0
                    ? "dia livre"
                    : restamHoje === 0
                      ? "nenhuma pela frente"
                      : `${restamHoje} pela frente`
                }
              />
              <Indicador rotulo="7 dias" valor={naSemana} nota="contando hoje" />
              <Indicador
                rotulo={comSinal > 0 ? "Sinal" : "Pendentes"}
                valor={pendentes.length}
                tom={pendentes.length > 0 ? "alerta" : "normal"}
                href={pendentes.length > 0 ? "#aguardando" : undefined}
                nota={
                  pendentes.length === 0
                    ? "nenhum pendente"
                    : comSinal > 0
                      ? "PIX pra conferir"
                      : "esperando seu ok"
                }
              />
            </Indicadores>

            <Aguardando itens={pendentes} />

            <Periodos atual={periodo} contar={quantosEm} />

            {diasVisiveis.length === 0 ? (
              <Vazio
                texto={
                  porDia.length === 0
                    ? "Nenhum agendamento nos próximos 60 dias."
                    : `Nada marcado ${periodo === "hoje" ? "hoje" : "nesse período"}. Toque em “Tudo” pra ver o resto da agenda.`
                }
              />
            ) : (
              <div className="flex flex-col gap-10">
                {diasVisiveis.map((d) => (
                  <Dia
                    key={d.chave}
                    {...d}
                    rotulo={
                      d.chave === chave.hoje
                        ? "Hoje"
                        : d.chave === chave.amanha
                          ? "Amanhã"
                          : d.chave === chave.ontem
                            ? "Ontem"
                            : SO_SEMANA.format(d.data)
                    }
                    agora={d.chave === chave.hoje ? agora : null}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <RodapePainel />
    </main>
  );
}

/**
 * Um campo só pra nome e telefone — que é o que a Karol tem na conversa
 * do WhatsApp quando vai procurar alguém.
 *
 * Ele ainda aceita o código de seis caracteres, calado: é o que o link
 * `?q=` das mensagens dela usa. Mas não está escrito em lugar nenhum,
 * porque ninguém precisa digitar isso.
 *
 * É um `form` com `method="get"`: a busca vira `?q=` na barra de endereço,
 * funciona sem JavaScript, o botão voltar do celular faz o que se espera, e
 * ela pode deixar salvo. Nada disso vale o custo de um componente de cliente.
 */
function Busca({ valor }: { valor: string }) {
  return (
    <form method="get" role="search" className="flex flex-wrap gap-2">
      <div className="relative min-w-0 flex-1 basis-48">
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          className="pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-tinta-3"
        >
          <circle cx="8.5" cy="8.5" r="5.75" />
          <path d="m13 13 4.5 4.5" strokeLinecap="square" />
        </svg>
        {/* Texto de exemplo curto de propósito: "Procurar por nome ou
            telefone" era cortado no meio da palavra num celular de 390 px. */}
        <input
          type="search"
          name="q"
          defaultValue={valor}
          maxLength={80}
          placeholder="Nome ou telefone"
          aria-label="Procurar agendamento por nome ou telefone"
          className={`${CAMPO_BASE} bg-papel pr-3 pl-11`}
        />
      </div>
      {/* Sem altura própria: o item de flex estica até a altura da linha,
          então o botão acompanha os 48 px do campo sozinho. */}
      <button type="submit" className={BOTAO.primario}>
        Procurar
      </button>
      {valor && (
        <Link href="/painel" className={BOTAO.secundario}>
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
        texto={`Nada encontrado para “${termo}”. Tente o primeiro nome, ou pelo menos 4 números do telefone.`}
      />
    );
  }

  return (
    <section aria-labelledby="titulo-resultados">
      <h2
        id="titulo-resultados"
        className={`mb-3 border-b border-linha pb-2.5 ${ROTULO_SECAO}`}
      >
        {achados.length === 1 ? "1 resultado" : `${achados.length} resultados`} para “{termo}”
      </h2>
      <ul className="flex flex-col gap-3">
        {achados.map((ag, i) => (
          <Cartao key={ag.id} ag={ag} comData ordem={i} />
        ))}
      </ul>
      <p className="mt-5">
        <Link
          href="/painel"
          className={`inline-flex min-h-[44px] items-center text-[13px] text-tinta-2 underline decoration-linha underline-offset-4 hover:text-ouro ${FOCO}`}
        >
          ← Voltar pra agenda
        </Link>
      </p>
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

/**
 * As abas de período.
 *
 * ⚠️ SÃO LINKS, NÃO BOTÕES DE JAVASCRIPT — e isso é a coisa toda no
 * celular dela: funciona com a página carregando devagar, o voltar do
 * telefone faz o que se espera, e ela pode deixar salvo "a agenda de
 * hoje" na tela inicial. Mesma decisão da busca, logo acima.
 *
 * Cada aba mostra QUANTOS existem dentro dela. Sem o número, esconder o
 * resto da agenda seria esconder mesmo — ela abriria "Hoje", veria dois
 * cartões e não teria como saber que há onze na semana.
 *
 * Os 44 px de altura mínima não são estética: é o alvo de toque que a
 * Apple e o Google recomendam, e ela usa isto com a mão ocupada.
 */
function Periodos({
  atual,
  contar,
}: {
  atual: PeriodoId;
  contar: (dias: number) => number;
}) {
  return (
    <nav aria-label="Período da agenda" className="-mx-1 overflow-x-auto">
      <ul className="flex gap-2 px-1">
        {PERIODOS.map((p) => {
          const aberta = p.id === atual;
          const quantos = contar(p.dias);
          return (
            <li key={p.id}>
              <Link
                href={p.id === PERIODO_PADRAO ? "/painel" : `/painel?ver=${p.id}`}
                aria-current={aberta ? "page" : undefined}
                className={`inline-flex min-h-[44px] items-center gap-2 border px-4 text-[13px] whitespace-nowrap transition-colors ${FOCO} ${
                  aberta
                    ? "border-ouro bg-ouro-fundo font-semibold text-tinta"
                    : "border-linha bg-papel text-tinta-2 hover:border-ouro-claro"
                }`}
              >
                {p.rotulo}
                <span
                  className={`text-[12px] tabular-nums ${aberta ? "text-ouro" : "text-tinta-3"}`}
                >
                  {quantos}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function Vazio({ texto }: { texto: string }) {
  return (
    <p className="border border-dashed border-linha bg-papel p-6 text-center text-[14px] text-tinta-2">
      {texto}
    </p>
  );
}
