import Link from "next/link";
import type { Metadata } from "next";
import { BarraMobile, Cabecalho } from "@/components/Cabecalho";
import { Rodape } from "@/components/Rodape";
import { Env, Rotulo } from "@/components/ui";
import { ANTES_DE_VIR, NEGOCIO } from "@/data/negocio";
import { formatarPreco } from "@/data/servicos";
import { buscarAgendamento } from "@/lib/agendamentos";
import { codigoDoAgendamento } from "@/lib/codigo";
import { linkWhatsapp } from "@/lib/whatsapp";
import { DIA_POR_EXTENSO, HORA } from "@/lib/datas";

export const metadata: Metadata = { title: "Horário confirmado", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Confirmado({
  searchParams,
}: {
  searchParams: Promise<{ ag?: string }>;
}) {
  const { ag } = await searchParams;
  const agendamento = ag ? await buscarAgendamento(ag) : null;

  return (
    <>
      <Cabecalho />
      <main className="flex-1 bg-osso pb-24 lg:pb-0">
        <Env className="py-14 lg:py-20">
          {!agendamento ? (
            <NaoEncontrado />
          ) : (
            <Sucesso agendamento={agendamento} />
          )}
        </Env>
      </main>
      <Rodape />
      <BarraMobile />
    </>
  );
}

function Sucesso({
  agendamento,
}: {
  agendamento: NonNullable<Awaited<ReturnType<typeof buscarAgendamento>>>;
}) {
  const pendente = agendamento.situacao === "pendente";
  const dia = DIA_POR_EXTENSO.format(agendamento.inicio);
  const hora = HORA.format(agendamento.inicio);
  const codigo = codigoDoAgendamento(agendamento.id);

  /*
    Este toque é a peça central do WhatsApp automático, e por dois motivos:

    1. avisa a Karol na hora, com o código junto — ela digita no painel e
       abre o agendamento sem procurar nome nenhum;
    2. abre a **janela de 24 h** da Meta. Mensagem que a empresa manda sem a
       cliente ter falado primeiro é template pago e precisa de aprovação.
       Depois deste toque, tudo o que sair nas 24 h seguintes é texto livre
       e de graça. Ver WHATSAPP.md, seção 2.

    Por isso a mensagem sai escrita da cliente PRA Karol, e não o contrário.
  */
  const recado = linkWhatsapp(
    `Oi Karol! Acabei de agendar pelo site. ${agendamento.servicoNome}, ${dia} às ${hora}, em ${agendamento.cidade}. Sou ${agendamento.clienteNome}. Código ${codigo}.`,
  );

  return (
    <div className="mx-auto max-w-[620px]">
      <Rotulo>{pendente ? "Quase lá" : "Tudo certo"}</Rotulo>
      <h1 className="mt-2.5 mb-3 font-titulo text-[clamp(32px,6vw,50px)] leading-[1.05] font-light">
        {pendente ? "Seu pedido chegou pra Karol" : "Horário confirmado"}
      </h1>
      <p className="mb-8 text-tinta-2">
        {pendente
          ? "Ela confirma com você pelo WhatsApp em breve. Enquanto isso, o horário está segurado no seu nome."
          : "O horário já está reservado no seu nome. Anote os detalhes:"}
      </p>

      <dl className="border border-linha bg-papel">
        <Linha rotulo="Serviço" valor={agendamento.servicoNome} />
        <Linha rotulo="Dia" valor={dia} capitalizar />
        <Linha rotulo="Hora" valor={hora} />
        <Linha rotulo="Onde" valor={agendamento.cidade} />
        <Linha rotulo="Valor" valor={formatarPreco(agendamento.servicoPreco / 100)} destaque />
        <Linha rotulo="Código" valor={codigo} codigo />
      </dl>
      <p className="mt-2 text-[12.5px] text-tinta-3">
        Guarde o código. É por ele que a Karol acha o seu horário rapidinho.
      </p>

      <div className="mt-7 border-t border-linha pt-6">
        <h2 className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.22em] text-ouro">
          Antes de vir
        </h2>
        <ul className="flex flex-col gap-2">
          {ANTES_DE_VIR.map((aviso) => (
            <li key={aviso} className="flex gap-2 text-[14px] text-tinta-2">
              <span aria-hidden="true" className="text-ouro-claro">—</span>
              {aviso}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <a
          href={recado}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-[50px] items-center justify-center bg-ouro px-7 py-4 text-[11.5px] font-bold uppercase tracking-[0.2em] text-white transition-opacity hover:opacity-90"
        >
          Avisar a Karol no WhatsApp
        </a>
        <Link
          href="/"
          className="inline-flex min-h-[50px] items-center justify-center border border-ouro-claro px-7 py-4 text-[11.5px] font-bold uppercase tracking-[0.2em] text-ouro transition-colors hover:bg-ouro-fundo"
        >
          Voltar ao início
        </Link>
      </div>

      <p className="mt-5 text-[13px] text-tinta-3">
        Precisa remarcar ou cancelar? Fale direto com a Karol no WhatsApp{" "}
        {NEGOCIO.whatsapp.exibicao}.
      </p>
    </div>
  );
}

function NaoEncontrado() {
  return (
    <div className="mx-auto max-w-[520px] border border-linha bg-papel p-8 text-center">
      <h1 className="mb-3 font-titulo text-[30px] font-light">
        Não achei esse agendamento
      </h1>
      <p className="mb-6 text-tinta-2">
        O link pode ter expirado. Se você acabou de agendar e recebeu a
        confirmação, está tudo certo. Na dúvida, me chame no WhatsApp.
      </p>
      <Link
        href="/agendar"
        className="text-sm font-semibold text-ouro underline decoration-ouro-claro underline-offset-4"
      >
        Fazer um novo agendamento
      </Link>
    </div>
  );
}

function Linha({
  rotulo,
  valor,
  destaque = false,
  capitalizar = false,
  codigo = false,
}: {
  rotulo: string;
  valor: string;
  destaque?: boolean;
  capitalizar?: boolean;
  codigo?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-linha px-5 py-3.5 last:border-b-0">
      <dt className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-tinta-3">
        {rotulo}
      </dt>
      <dd
        className={`text-right ${capitalizar ? "first-letter:uppercase" : ""} ${
          destaque ? "font-titulo text-[22px] text-ouro tabular-nums" : ""
        } ${
          // Monoespaçado e espaçado: o código é pra ser LIDO em voz alta e
          // digitado à mão. Na fonte do corpo, 0 e O ficariam parecidos.
          codigo ? "font-mono text-[17px] font-semibold tracking-[0.18em]" : ""
        }`}
      >
        {valor}
      </dd>
    </div>
  );
}
