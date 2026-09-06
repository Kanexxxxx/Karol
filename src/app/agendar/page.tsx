import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { BarraMobile, Cabecalho } from "@/components/Cabecalho";
import { Rodape } from "@/components/Rodape";
import { Env, Rotulo } from "@/components/ui";
import { FOTO_DO_SERVICO } from "@/data/fotos";
import { ANTES_DE_VIR, CIDADES, type CidadeId } from "@/data/negocio";
import {
  SERVICOS,
  buscarServico,
  formatarDuracao,
  formatarPreco,
  type Servico,
} from "@/data/servicos";
import { bancoConfigurado } from "@/lib/banco";
import { gradeDoDiaNaAgenda, horariosDoDia, mesDeVagas } from "@/lib/agendamentos";
import { deChave, faixaDeDias, janelaDaCidade, primeiroDiaDisponivel } from "@/lib/agenda";
import { DIA_POR_EXTENSO } from "@/lib/datas";
import { Calendario } from "./Calendario";
import { FormularioDados } from "./FormularioDados";
import { Passos } from "./Passos";

export const metadata: Metadata = { title: "Agendar" };

/** Sem cache: a disponibilidade muda a cada agendamento. */
export const dynamic = "force-dynamic";

export default async function Agendar({
  searchParams,
}: {
  searchParams: Promise<{
    servico?: string;
    cidade?: string;
    mes?: string;
    dia?: string;
    hora?: string;
  }>;
}) {
  const { servico: servicoId, cidade: cidadeId, mes, dia, hora } = await searchParams;
  const servico = servicoId ? buscarServico(servicoId) : undefined;
  // só aceita cidade que existe: a querystring é do visitante
  const cidade = cidadeId && cidadeId in CIDADES ? (cidadeId as CidadeId) : undefined;

  return (
    <>
      <Cabecalho />
      <main className="flex-1 bg-osso pb-24 lg:pb-0">
        <Env className="pt-10 lg:pt-16">
          <Passos
            temServico={!!servico}
            temCidade={!!cidade}
            temDia={!!dia}
            temHora={!!hora}
          />
        </Env>

        {!bancoConfigurado() ? (
          <AvisoSemBanco />
        ) : !servico ? (
          <EscolherServico />
        ) : !cidade ? (
          <EscolherCidade servico={servico} />
        ) : !dia ? (
          <EscolherDia servico={servico} cidade={cidade} mes={mes} />
        ) : !hora ? (
          <EscolherHora servico={servico} cidade={cidade} dia={dia} />
        ) : (
          <Confirmar servico={servico} cidade={cidade} dia={dia} hora={hora} />
        )}
      </main>
      <Rodape />
      <BarraMobile />
    </>
  );
}

/* ------------------------------------------------------------------ */

function AvisoSemBanco() {
  return (
    <Env className="py-16">
      <div className="mx-auto max-w-[560px] border border-linha bg-papel p-8 text-center">
        <Rotulo>Quase pronto</Rotulo>
        <h1 className="mt-3 mb-3 font-titulo text-[34px] leading-tight font-light">
          A agenda online está sendo ligada
        </h1>
        <p className="mb-6 text-tinta-2">
          Enquanto isso, fale comigo no WhatsApp que eu marco pra você na hora.
        </p>
        <Link
          href="/#servicos"
          className="text-sm font-semibold text-ouro underline decoration-ouro-claro underline-offset-4"
        >
          Ver serviços e preços
        </Link>
      </div>
    </Env>
  );
}

function EscolherServico() {
  return (
    <Env className="py-10 lg:py-14">
      <Rotulo>Passo 1</Rotulo>
      <h1 className="mt-2.5 mb-8 font-titulo text-[clamp(30px,6vw,48px)] leading-[1.05] font-light">
        O que você quer fazer?
      </h1>

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SERVICOS.map((s) => {
          const foto = FOTO_DO_SERVICO[s.id];
          return (
            <li key={s.id}>
              <Link
                href={`/agendar?servico=${s.id}`}
                className="group flex gap-4 border border-linha bg-papel p-3 transition-colors hover:border-ouro-claro focus-visible:outline-2 focus-visible:outline-ouro"
              >
                <Image
                  src={foto.arquivo}
                  alt={foto.alt}
                  width={foto.largura}
                  height={foto.altura}
                  sizes="96px"
                  className="size-24 shrink-0 object-cover"
                />
                <span className="flex min-w-0 flex-col">
                  <span className="font-titulo text-[21px] leading-tight">{s.nome}</span>
                  <span className="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-tinta-3">
                    {formatarDuracao(s)}
                  </span>
                  <span className="mt-auto pt-2 font-titulo text-[22px] text-ouro tabular-nums">
                    {formatarPreco(s.preco)}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </Env>
  );
}

/**
 * Passo 2 — a cidade.
 *
 * Ela atende em cidades diferentes em dias diferentes. Perguntar a cidade
 * ANTES do dia faz o calendário seguinte mostrar só os dias daquela cidade,
 * em vez de misturar os dois lugares numa lista só.
 */
function EscolherCidade({ servico }: { servico: Servico }) {
  const cidades = Object.entries(CIDADES) as [CidadeId, (typeof CIDADES)[CidadeId]][];

  return (
    <Env className="py-10 lg:py-14">
      <Rotulo>Passo 2</Rotulo>
      <h1 className="mt-2.5 font-titulo text-[clamp(30px,6vw,48px)] leading-[1.05] font-light">
        Em qual cidade?
      </h1>
      <p className="mt-3 mb-8 text-tinta-2">
        {servico.nome} · {formatarDuracao(servico)} · {formatarPreco(servico.preco)}
      </p>

      <ul className="grid gap-3 sm:grid-cols-2 lg:max-w-[720px]">
        {cidades.map(([id, cidade]) => (
          <li key={id}>
            <Link
              href={`/agendar?servico=${servico.id}&cidade=${id}`}
              className="flex h-full flex-col border border-linha bg-papel px-6 py-6 transition-colors hover:border-ouro-claro focus-visible:outline-2 focus-visible:outline-ouro"
            >
              <span className="font-titulo text-[26px] leading-tight">{cidade.nome}</span>
              <span className="mt-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-ouro">
                {faixaDeDias(id)} · {janelaDaCidade(id)}
              </span>
              {cidade.local && (
                <span className="mt-2.5 text-[14px] text-tinta-2">{cidade.local}</span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </Env>
  );
}

/** Passo 3 — o dia, num calendário do mês. */
async function EscolherDia({
  servico,
  cidade,
  mes,
}: {
  servico: Servico;
  cidade: CidadeId;
  mes?: string;
}) {
  // O mês mais cedo que faz sentido é o do primeiro dia agendável; três
  // meses à frente é limite de sanidade, não regra de negócio.
  const inicio = primeiroDiaDisponivel();
  const minimo = new Date(inicio.getFullYear(), inicio.getMonth(), 1);
  const maximo = new Date(minimo.getFullYear(), minimo.getMonth() + 3, 1);

  const pedido = /^\d{4}-\d{2}$/.test(mes ?? "")
    ? new Date(Number(mes!.slice(0, 4)), Number(mes!.slice(5, 7)) - 1, 1)
    : minimo;
  const atual = pedido < minimo ? minimo : pedido > maximo ? maximo : pedido;

  const dias = await mesDeVagas(servico, cidade, atual.getFullYear(), atual.getMonth());
  const base = `servico=${servico.id}&cidade=${cidade}`;

  return (
    <Env className="py-10 lg:py-14">
      <Rotulo>Passo 3</Rotulo>
      <h1 className="mt-2.5 font-titulo text-[clamp(30px,6vw,48px)] leading-[1.05] font-light">
        Que dia fica bom?
      </h1>
      <p className="mt-3 mb-8 text-tinta-2">
        {servico.nome} · {CIDADES[cidade].nome} ·{" "}
        <Link
          href={`/agendar?servico=${servico.id}`}
          className="underline decoration-linha underline-offset-2 hover:text-ouro"
        >
          trocar cidade
        </Link>
      </p>

      <Calendario
        dias={dias}
        ano={atual.getFullYear()}
        mes={atual.getMonth()}
        base={base}
        temAnterior={atual > minimo}
        temSeguinte={atual < maximo}
      />
    </Env>
  );
}

/** Passo 4 — a hora. Mostra também o que já foi tomado. */
async function EscolherHora({
  servico,
  cidade,
  dia,
}: {
  servico: Servico;
  cidade: CidadeId;
  dia: string;
}) {
  const grade = await gradeDoDiaNaAgenda(servico, dia);
  const data = deChave(dia);
  const livres = grade.filter((v) => v.livre).length;
  const base = `servico=${servico.id}&cidade=${cidade}`;

  return (
    <Env className="py-10 lg:py-14">
      <Rotulo>Passo 4</Rotulo>
      <h1 className="mt-2.5 font-titulo text-[clamp(30px,6vw,48px)] leading-[1.05] font-light">
        Que horas?
      </h1>
      <p className="mt-3 mb-8 text-tinta-2 first-letter:uppercase">
        {DIA_POR_EXTENSO.format(data)} · {CIDADES[cidade].nome}
      </p>

      {livres === 0 ? (
        <p className="border border-linha bg-papel p-6 text-tinta-2">
          Esse dia encheu.{" "}
          <Link href={`/agendar?${base}`} className="text-ouro underline">
            Escolher outro dia
          </Link>
        </p>
      ) : (
        <ul className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-6">
          {grade.map((v) =>
            v.livre ? (
              <li key={v.inicio}>
                <Link
                  href={`/agendar?${base}&dia=${dia}&hora=${v.inicio}`}
                  className="block border border-linha bg-papel py-4 text-center font-titulo text-[21px] tabular-nums transition-colors hover:border-ouro-claro hover:text-ouro focus-visible:outline-2 focus-visible:outline-ouro"
                >
                  {v.rotulo}
                </Link>
              </li>
            ) : (
              // Ocupado aparece, não some: esconder faz a agenda parecer
              // vazia justamente quando está cheia.
              <li key={v.inicio}>
                <span
                  aria-label={`${v.rotulo}, já reservado`}
                  className="block border border-linha/60 bg-creme/40 py-4 text-center font-titulo text-[21px] tabular-nums text-tinta-3/70 line-through decoration-tinta-3/50"
                >
                  {v.rotulo}
                </span>
              </li>
            ),
          )}
        </ul>
      )}
    </Env>
  );
}

async function Confirmar({
  servico,
  cidade,
  dia,
  hora,
}: {
  servico: Servico;
  cidade: CidadeId;
  dia: string;
  hora: string;
}) {
  const inicioMin = Number(hora);
  const horarios = await horariosDoDia(servico, dia);
  const escolhido = horarios.find((h) => h.inicio === inicioMin);
  const data = deChave(dia);

  if (!escolhido) {
    return (
      <Env className="py-14">
        <div className="mx-auto max-w-[520px] border border-linha bg-papel p-7 text-center">
          <h1 className="mb-3 font-titulo text-[28px] font-light">
            Esse horário acabou de ser ocupado
          </h1>
          <p className="mb-5 text-tinta-2">Escolha outro que eu reservo pra você.</p>
          <Link
            href={`/agendar?servico=${servico.id}&cidade=${cidade}&dia=${dia}`}
            className="text-sm font-semibold text-ouro underline decoration-ouro-claro underline-offset-4"
          >
            Ver os horários livres desse dia
          </Link>
        </div>
      </Env>
    );
  }

  return (
    <Env className="py-10 lg:py-14">
      <div className="grid gap-10 lg:grid-cols-[1fr_0.85fr] lg:gap-16">
        <div>
          <Rotulo>Passo 5</Rotulo>
          <h1 className="mt-2.5 mb-8 font-titulo text-[clamp(30px,6vw,48px)] leading-[1.05] font-light">
            Só falta o seu nome
          </h1>
          <FormularioDados
            servicoId={servico.id}
            chaveDia={dia}
            inicioMin={inicioMin}
            // Server Component com `dynamic = "force-dynamic"`: roda 1x por
            // request, no servidor. É o instante em que a página foi servida.
            // eslint-disable-next-line react-hooks/purity
            carimbo={Date.now()}
          />
        </div>

        <aside className="border border-linha bg-papel p-6 lg:sticky lg:top-24 lg:self-start">
          <h2 className="mb-4 text-[10px] font-bold uppercase tracking-[0.22em] text-ouro">
            Seu horário
          </h2>
          <dl className="flex flex-col gap-3 text-[15px]">
            <Linha rotulo="Serviço" valor={servico.nome} />
            <Linha rotulo="Dia" valor={DIA_POR_EXTENSO.format(data)} capitalizar />
            <Linha rotulo="Hora" valor={escolhido.rotulo} />
            <Linha
              rotulo="Onde"
              valor={CIDADES[escolhido.cidade].nome}
            />
            <Linha rotulo="Duração" valor={formatarDuracao(servico)} />
            <Linha rotulo="Valor" valor={formatarPreco(servico.preco)} destaque />
          </dl>

          <div className="mt-6 border-t border-linha pt-5">
            <h3 className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.22em] text-ouro">
              Antes de vir
            </h3>
            <ul className="flex flex-col gap-2">
              {ANTES_DE_VIR.map((aviso) => (
                <li key={aviso} className="flex gap-2 text-[14px] text-tinta-2">
                  <span aria-hidden="true" className="text-ouro-claro">
                    —
                  </span>
                  {aviso}
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </Env>
  );
}

function Linha({
  rotulo,
  valor,
  destaque = false,
  capitalizar = false,
}: {
  rotulo: string;
  valor: string;
  destaque?: boolean;
  capitalizar?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-linha pb-3 last:border-b-0">
      <dt className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-tinta-3">
        {rotulo}
      </dt>
      <dd
        className={`text-right ${capitalizar ? "first-letter:uppercase" : ""} ${
          destaque ? "font-titulo text-[22px] text-ouro tabular-nums" : ""
        }`}
      >
        {valor}
      </dd>
    </div>
  );
}
