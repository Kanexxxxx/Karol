import Link from "next/link";
import type { Metadata } from "next";
import { BarraMobile, Cabecalho } from "@/components/Cabecalho";
import { Rodape } from "@/components/Rodape";
import { Env, Rotulo } from "@/components/ui";
import { ANTES_DE_VIR, NEGOCIO, REGRAS } from "@/data/negocio";
import { buscarServico, formatarPreco, valorDoSinal } from "@/data/servicos";
import { buscarAgendamento } from "@/lib/agendamentos";
import { linkWhatsapp } from "@/lib/whatsapp";
import { DIA_POR_EXTENSO, HORA } from "@/lib/datas";
import { brCodeDoSinal } from "@/lib/pix";
import { qrParaSvg } from "@/lib/qr";
import { CopiarPix } from "./CopiarPix";

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
          {!agendamento ? <NaoEncontrado /> : <Sucesso agendamento={agendamento} />}
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
  const dia = DIA_POR_EXTENSO.format(agendamento.inicio);
  const hora = HORA.format(agendamento.inicio);

  /*
    O sinal é do SERVIÇO, não do agendamento.

    Ela pediu sinal só nos serviços de R$ 80 ou mais. Um design de R$ 25
    confirma na hora e nunca vê esta parte da tela. Ver `precisaDeSinal`
    em `data/servicos.ts`.

    Se o serviço sumiu da tabela (foi renomeado, saiu do catálogo), o
    agendamento antigo continua abrindo — só sem o bloco do PIX. Nunca
    quebrar uma tela de confirmação por causa de dado histórico.
  */
  const servico = buscarServico(agendamento.servicoId);
  const sinalCentavos = servico ? valorDoSinal(servico) : 0;
  const pedeSinal = sinalCentavos > 0;
  const esperandoPagamento = agendamento.situacao === "pendente" && pedeSinal;

  /*
    Este toque é a peça central do WhatsApp automático, e por dois motivos:

    1. avisa a Karol na hora, com o nome e o horário — ela acha a cliente
       no painel pelo nome ou pelo telefone;
    2. abre a **janela de 24 h** da Meta. Mensagem que a empresa manda sem
       a cliente ter falado primeiro é template pago e precisa de
       aprovação. Depois deste toque, tudo o que sair nas 24 h seguintes é
       texto livre e de graça. Ver WHATSAPP.md, seção 2.

    Por isso a mensagem sai escrita da cliente PRA Karol, e não o contrário.

    ⚠️ SEM código de agendamento. A Karol acha a pessoa pelo nome ou pelo
    telefone, que é o que ela já tem na conversa — decisão do Kainã, e ele
    tem razão: código escrito não combina com studio de beleza, e obriga a
    cliente a guardar uma coisa que não significa nada pra ela.
  */
  /*
    O mesmo texto pra quem já pagou pelo QR desta tela e pra quem ainda
    vai pagar. Quem está devendo o sinal recebe, em resposta a esta
    mensagem, o PIX com valor, o QR e o copia e cola — é esta mensagem que
    abre a janela de 24 h. Ver `atender()` em lib/atendente.ts.
  */
  const recado = linkWhatsapp(
    `Oi Karol! Acabei de agendar pelo site: ${agendamento.servicoNome}, ${dia} às ${hora}, em ${agendamento.cidade}. Sou ${agendamento.clienteNome}.`,
  );

  return (
    <div className="mx-auto max-w-[620px]">
      <Rotulo>{esperandoPagamento ? "Quase lá" : "Tudo certo"}</Rotulo>
      <h1 className="mt-2.5 mb-3 font-titulo text-[clamp(32px,6vw,50px)] leading-[1.05] font-light">
        {esperandoPagamento ? "Falta o sinal pra fechar" : "Horário confirmado"}
      </h1>
      <p className="mb-8 text-tinta-2">
        {esperandoPagamento
          ? `Seu horário está guardado até ${REGRAS.sinal.seguraAte}. Pague o sinal pelo QR abaixo — o valor já vai preenchido — e mande o comprovante pra Karol no WhatsApp. Assim que ela conferir, está fechado.`
          : "O horário já está reservado no seu nome. Anote os detalhes:"}
      </p>

      <dl className="border border-linha bg-papel">
        <Linha rotulo="Serviço" valor={agendamento.servicoNome} />
        <Linha rotulo="Dia" valor={dia} capitalizar />
        <Linha rotulo="Hora" valor={hora} />
        <Linha rotulo="Onde" valor={agendamento.cidade} />
        <Linha
          rotulo={pedeSinal ? "Valor total" : "Valor"}
          valor={formatarPreco(agendamento.servicoPreco / 100)}
          destaque={!pedeSinal}
        />
        {pedeSinal && (
          <Linha
            rotulo={`Sinal (${REGRAS.sinal.porcentagem}%)`}
            valor={formatarPreco(sinalCentavos / 100)}
            destaque
          />
        )}
        {pedeSinal && (
          <Linha
            rotulo="Paga no dia"
            valor={formatarPreco((agendamento.servicoPreco - sinalCentavos) / 100)}
          />
        )}
      </dl>

      {esperandoPagamento && <BlocoPix valorCentavos={sinalCentavos} id={agendamento.id} />}

      <div className="mt-7 border-t border-linha pt-6">
        <h2 className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.22em] text-ouro">
          Antes de vir
        </h2>
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

      <div className="mt-8 flex flex-wrap gap-3">
        <a
          href={recado}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-[50px] items-center justify-center bg-ouro px-7 py-4 text-[11.5px] font-bold uppercase tracking-[0.2em] text-white transition-opacity hover:opacity-90"
        >
          {esperandoPagamento ? "Mandar o comprovante no WhatsApp" : "Avisar a Karol no WhatsApp"}
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

/**
 * Os dados do PIX.
 *
 * ⚠️ NÃO PROMETA DEVOLUÇÃO AQUI. Uma versão anterior escreveu que o sinal
 * volta se a cliente desmarcar com 24 h de antecedência — e a resposta
 * dela no formulário foi o contrário, literalmente: "Não volta — é
 * justamente pra ela não desmarcar".
 *
 * Isso chegou a ir pro ar. Promessa de dinheiro numa tela de confirmação
 * não é detalhe de texto: é o que a cliente vai cobrar depois, e quem
 * responde é a Karol. O aviso abaixo é o que ela decidiu, escrito de um
 * jeito que não soa hostil.
 */
function BlocoPix({ valorCentavos, id }: { valorCentavos: number; id: string }) {
  /*
    O BR Code com o valor DENTRO (campo 54). Escaneado, o app do banco
    abre com o valor já preenchido — a cliente não digita, então não erra.
    O identificador é o do agendamento: aparece no extrato da Karol e liga
    o PIX a quem pagou.

    O SVG é gerado aqui mesmo, no servidor, a partir de `lib/qr.ts` — que
    só emite coordenadas e as duas cores abaixo. Não existe texto da
    cliente dentro dele, por isso o `dangerouslySetInnerHTML` é seguro.
  */
  const codigo = brCodeDoSinal(valorCentavos, id);
  const svg = qrParaSvg(codigo, { nivel: "M", escuro: "#332b22", claro: "#ffffff" });
  const valor = formatarPreco(valorCentavos / 100);

  return (
    <div className="mt-7 border border-ouro/40 bg-ouro-fundo/40 p-5 sm:p-6">
      <p className="text-[10.5px] font-bold uppercase tracking-[0.2em] text-ouro">
        PIX do sinal · {valor}
      </p>

      <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-start">
        <div
          role="img"
          aria-label={`QR Code do PIX de ${valor}`}
          className="mx-auto w-[184px] shrink-0 border border-linha bg-white p-1 sm:mx-0"
          dangerouslySetInnerHTML={{ __html: svg }}
        />

        <div className="min-w-0 flex-1">
          <p className="text-[14px] text-tinta-2">
            Abra o app do seu banco, escolha <strong>PIX › Ler QR Code</strong> e aponte a
            câmera. O valor de <strong>{valor}</strong> já vai preenchido.
          </p>

          <p className="mt-4 text-[13px] text-tinta-3">
            Está pagando pelo mesmo celular? Copie o código e cole em{" "}
            <strong>PIX Copia e Cola</strong>:
          </p>
          <div className="mt-2">
            <CopiarPix texto={codigo} rotulo="Copiar código PIX" rotuloCopiado="Código copiado ✓" />
          </div>
        </div>
      </div>

      <div className="mt-5 border-t border-ouro/20 pt-4">
        <p className="text-[13px] text-tinta-2">
          Prefere digitar? Chave ({REGRAS.sinal.tipoChave.toLowerCase()}):{" "}
          <strong className="font-mono font-semibold text-tinta">{REGRAS.sinal.chavePix}</strong>
        </p>
        <p className="mt-1 text-[12.5px] text-tinta-3">
          {REGRAS.sinal.favorecido} · {REGRAS.sinal.banco}
        </p>
        <div className="mt-3">
          <CopiarPix texto={REGRAS.sinal.chavePix} rotulo="Copiar chave" rotuloCopiado="Chave copiada ✓" />
        </div>
      </div>

      {!REGRAS.sinal.devolve && (
        <p className="mt-4 border-t border-ouro/20 pt-3.5 text-[12.5px] leading-relaxed text-tinta-3">
          O sinal desconta do valor final e não é devolvido em caso de
          desistência — é ele que garante que o horário fica guardado só pra
          você. Se precisar mudar de dia, me chame antes que a gente ajeita.
        </p>
      )}
    </div>
  );
}

function NaoEncontrado() {
  return (
    <div className="mx-auto max-w-[520px] border border-linha bg-papel p-8 text-center">
      <h1 className="mb-3 font-titulo text-[30px] font-light">Não achei esse agendamento</h1>
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
}: {
  rotulo: string;
  valor: string;
  destaque?: boolean;
  capitalizar?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-linha px-5 py-3.5 last:border-b-0">
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
