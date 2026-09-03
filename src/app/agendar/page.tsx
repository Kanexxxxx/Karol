import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { BarraMobile, Cabecalho } from "@/components/Cabecalho";
import { Rodape } from "@/components/Rodape";
import { Env, Rotulo } from "@/components/ui";
import { FOTO_DO_SERVICO } from "@/data/fotos";
import { ANTES_DE_VIR } from "@/data/negocio";
import { SERVICOS, buscarServico, formatarDuracao, formatarPreco } from "@/data/servicos";
import { bancoConfigurado } from "@/lib/banco";
import { diasComVaga, horariosDoDia } from "@/lib/agendamentos";
import { deChave } from "@/lib/agenda";
import { FormularioDados } from "./FormularioDados";
import { Passos } from "./Passos";

export const metadata: Metadata = { title: "Agendar" };

/** Sem cache: a disponibilidade muda a cada agendamento. */
export const dynamic = "force-dynamic";

const FORMATA_DIA = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "2-digit",
  month: "long",
});

const FORMATA_CURTO = new Intl.DateTimeFormat("pt-BR", {
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
});

export default async function Agendar({
  searchParams,
}: {
  searchParams: Promise<{ servico?: string; dia?: string; hora?: string }>;
}) {
  const { servico: servicoId, dia, hora } = await searchParams;
  const servico = servicoId ? buscarServico(servicoId) : undefined;

  return (
    <>
      <Cabecalho />
      <main className="flex-1 bg-osso pb-24 lg:pb-0">
        <Env className="pt-10 lg:pt-16">
          <Passos temServico={!!servico} temDia={!!dia} temHora={!!hora} />
        </Env>

        {!bancoConfigurado() ? (
          <AvisoSemBanco />
        ) : !servico ? (
          <EscolherServico />
        ) : !dia ? (
          <EscolherDia servico={servico} />
        ) : !hora ? (
          <EscolherHora servico={servico} dia={dia} />
        ) : (
          <Confirmar servico={servico} dia={dia} hora={hora} />
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

async function EscolherDia({ servico }: { servico: NonNullable<ReturnType<typeof buscarServico>> }) {
  const dias = await diasComVaga(servico);

  return (
    <Env className="py-10 lg:py-14">
      <Rotulo>Passo 2</Rotulo>
      <h1 className="mt-2.5 font-titulo text-[clamp(30px,6vw,48px)] leading-[1.05] font-light">
        Que dia fica bom?
      </h1>
      <p className="mt-3 mb-8 text-tinta-2">
        {servico.nome} · {formatarDuracao(servico)} · {formatarPreco(servico.preco)}
      </p>

      {dias.length === 0 ? (
        <p className="border border-linha bg-papel p-6 text-tinta-2">
          Não encontrei horário livre nos próximos dias. Me chame no WhatsApp que
          a gente acha um jeito.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
          {dias.map((d) => (
            <li key={d.chave}>
              <Link
                href={`/agendar?servico=${servico.id}&dia=${d.chave}`}
                className="block border border-linha bg-papel px-4 py-4 transition-colors hover:border-ouro-claro focus-visible:outline-2 focus-visible:outline-ouro"
              >
                <span className="block font-titulo text-[19px] capitalize">
                  {FORMATA_CURTO.format(d.data).replace(".", "")}
                </span>
                <span className="mt-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-ouro">
                  {d.vagas} {d.vagas === 1 ? "horário" : "horários"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Env>
  );
}

async function EscolherHora({
  servico,
  dia,
}: {
  servico: NonNullable<ReturnType<typeof buscarServico>>;
  dia: string;
}) {
  const horarios = await horariosDoDia(servico, dia);
  const data = deChave(dia);

  return (
    <Env className="py-10 lg:py-14">
      <Rotulo>Passo 3</Rotulo>
      <h1 className="mt-2.5 font-titulo text-[clamp(30px,6vw,48px)] leading-[1.05] font-light">
        Que horas?
      </h1>
      <p className="mt-3 mb-8 text-tinta-2 first-letter:uppercase">
        {FORMATA_DIA.format(data)}
        {horarios[0] && ` · ${horarios[0].cidade === "pereira-barreto" ? "Pereira Barreto" : "Bandeirantes D'Oeste"}`}
      </p>

      {horarios.length === 0 ? (
        <p className="border border-linha bg-papel p-6 text-tinta-2">
          Esse dia acabou de encher.{" "}
          <Link href={`/agendar?servico=${servico.id}`} className="text-ouro underline">
            Escolher outro dia
          </Link>
        </p>
      ) : (
        <ul className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-6">
          {horarios.map((h) => (
            <li key={h.inicio}>
              <Link
                href={`/agendar?servico=${servico.id}&dia=${dia}&hora=${h.inicio}`}
                className="block border border-linha bg-papel py-4 text-center font-titulo text-[21px] tabular-nums transition-colors hover:border-ouro-claro hover:text-ouro focus-visible:outline-2 focus-visible:outline-ouro"
              >
                {h.rotulo}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Env>
  );
}

async function Confirmar({
  servico,
  dia,
  hora,
}: {
  servico: NonNullable<ReturnType<typeof buscarServico>>;
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
            href={`/agendar?servico=${servico.id}&dia=${dia}`}
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
          <Rotulo>Passo 4</Rotulo>
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
            <Linha rotulo="Dia" valor={FORMATA_DIA.format(data)} capitalizar />
            <Linha rotulo="Hora" valor={escolhido.rotulo} />
            <Linha
              rotulo="Onde"
              valor={escolhido.cidade === "pereira-barreto" ? "Pereira Barreto" : "Bandeirantes D'Oeste"}
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
