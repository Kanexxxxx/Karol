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
import { CabecalhoPainel, LARGURA, RodapePainel } from "./Moldura";
import { BOTAO, CAMPO_BASE, FOCO, ROTULO_SECAO } from "./estilos";

export const metadata: Metadata = { title: "Painel", robots: { index: false } };
export const dynamic = "force-dynamic";

const SO_SEMANA = new Intl.DateTimeFormat("pt-BR", { weekday: "long", timeZone: FUSO });

/** Ainda vai acontecer e segura o horário. */
const marcado = (a: Agendamento) => a.situacao === "confirmado" || a.situacao === "pendente";

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
  // A lista vem do banco ordenada por período: a primeira que ainda não
  // começou é a próxima.
  const proxima = agendamentos.find((a) => marcado(a) && a.inicio > agora);

  const quando = (d: Date) => {
    const k = paraChave(d);
    if (k === chave.hoje) return "hoje";
    if (k === chave.amanha) return "amanhã";
    return DIA_CURTO.format(d);
  };

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
                rotulo="Sinal"
                valor={pendentes.length}
                tom={pendentes.length > 0 ? "alerta" : "normal"}
                href={pendentes.length > 0 ? "#aguardando" : undefined}
                nota={pendentes.length > 0 ? "PIX pra conferir" : "nenhum pendente"}
              />
            </Indicadores>

            <Aguardando itens={pendentes} />

            {porDia.length === 0 ? (
              <Vazio texto="Nenhum agendamento nos próximos 60 dias." />
            ) : (
              <div className="flex flex-col gap-10">
                {porDia.map((d) => (
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

function Vazio({ texto }: { texto: string }) {
  return (
    <p className="border border-dashed border-linha bg-papel p-6 text-center text-[14px] text-tinta-2">
      {texto}
    </p>
  );
}
