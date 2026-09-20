"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { SERVICOS, formatarDuracao, formatarPreco } from "@/data/servicos";
import { CIDADES } from "@/data/negocio";
import { agendarNoPainel, type EstadoNovo } from "./acoes";
import { BOTAO, CAMPO, CAMPO_CURTO, ROTULO_CAMPO, ROTULO_SECAO } from "../estilos";

const INICIAL: EstadoNovo = {};

/**
 * Formulário da Karol pra marcar alguém na mão.
 *
 * A hora é campo livre, não a grade de hora cheia do site: aqui é pra
 * encaixar a mãe, o pai, quem ligou. Quem impede choque é a trava do
 * banco, então liberdade aqui não custa segurança.
 *
 * Dividido em duas caixas — o atendimento e a cliente — porque são dois
 * momentos da conversa: primeiro ela acerta O QUE e QUANDO, depois anota
 * QUEM. Numa coluna só de sete campos iguais, o olho não tinha onde parar.
 */
export function Formulario() {
  const [estado, acao, enviando] = useActionState(agendarNoPainel, INICIAL);
  const v = estado.valores;

  if (estado.ok) {
    return (
      <div role="status" className="border border-linha bg-papel p-6">
        <p className="flex items-center gap-2.5 font-titulo text-[24px] leading-tight">
          <span aria-hidden="true" className="grid size-7 place-items-center bg-ouro text-[14px] text-white">
            ✓
          </span>
          Marcado.
        </p>
        <p className="mt-2 text-[14px] text-tinta-2">
          O horário já está reservado e sumiu do site.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/painel" className={BOTAO.primario}>
            Ver a agenda
          </Link>
          <Link href="/painel/novo" className={BOTAO.secundario}>
            Marcar outro
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form action={acao} className="flex flex-col gap-5">
      {estado.erro && (
        <p
          role="alert"
          className="border border-[#d9b9b3] bg-[#f7ecea] px-4 py-3 text-[14px] text-[#9d3b2f]"
        >
          {estado.erro}
        </p>
      )}

      <Caixa titulo="O atendimento">
        <Campo rotulo="Serviço">
          <select
            name="servicoId"
            defaultValue={v?.servicoId ?? SERVICOS[0].id}
            required
            className={CAMPO}
          >
            {SERVICOS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome} — {formatarDuracao(s)} — {formatarPreco(s.preco)}
              </option>
            ))}
          </select>
        </Campo>

        <Cidade escolhida={v?.cidade ?? "pereira-barreto"} />

        {/* Duas colunas mesmo no celular: dia e hora são lidos juntos, e o
            campo de hora não precisa de mais que meia tela. */}
        <div className="grid grid-cols-2 gap-3">
          <Campo rotulo="Dia">
            <input type="date" name="chaveDia" defaultValue={v?.chaveDia} required className={CAMPO_CURTO} />
          </Campo>
          <Campo rotulo="Hora">
            <input type="time" name="hora" defaultValue={v?.hora} required className={CAMPO_CURTO} />
          </Campo>
        </div>
      </Caixa>

      <Caixa titulo="A cliente">
        <Campo rotulo="Nome">
          <input name="nome" defaultValue={v?.nome} required autoComplete="off" className={CAMPO} />
        </Campo>

        <EscolhaDoWhatsapp valorInicial={v?.whatsapp} />

        <Campo rotulo="Recado" dica="opcional">
          <textarea
            name="observacao"
            rows={2}
            maxLength={500}
            defaultValue={v?.observacao}
            className={`${CAMPO} resize-y py-3`}
          />
        </Campo>
      </Caixa>

      <button type="submit" disabled={enviando} className={BOTAO.enviar}>
        {enviando ? "Marcando…" : "Marcar horário"}
      </button>
    </form>
  );
}

/**
 * As duas cidades num controle segmentado, em vez de uma lista suspensa.
 *
 * São só duas opções, e com a lista ela precisava de dois toques pra ver a
 * segunda. Assim as duas estão sempre à vista e a escolhida fica marcada.
 *
 * O desenho é o `tabs` de rádio do uiverse.io (uiverse-io/galaxy,
 * `Radio-buttons/Admin12121_cold-bobcat-20.html`): rádios de verdade,
 * escondidos, e um bloco (o `::after`) que DESLIZA até a opção marcada,
 * posicionado por `:has(:checked)`. Nada de JavaScript — continua sendo um
 * `<input name="cidade">`, e o servidor recebe exatamente o mesmo campo que
 * recebia do `<select>`.
 *
 * ⚠️ `label:nth-of-type(2)` e não `input:nth-of-type(2)` como no original:
 * aqui cada rádio mora DENTRO do seu rótulo (pra área de toque ser o rótulo
 * inteiro), então todo input é o 1º do seu tipo.
 *
 * Com duas cidades fixas, `translate-x-full` basta. Se entrar uma terceira,
 * este bloco precisa das colunas e do deslocamento de novo.
 */
function Cidade({ escolhida }: { escolhida: string }) {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className={`${ROTULO_CAMPO} mb-1.5`}>Cidade</legend>
      <div className="relative grid grid-cols-2 border border-linha bg-osso p-1 after:pointer-events-none after:absolute after:inset-y-1 after:left-1 after:w-[calc(50%-0.25rem)] after:bg-ouro after:transition-[translate] after:duration-300 after:ease-marca has-[label:nth-of-type(2)_input:checked]:after:translate-x-full has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-ouro motion-reduce:after:transition-none">
        {Object.entries(CIDADES).map(([id, c]) => (
          <label
            key={id}
            className="relative z-10 flex min-h-[44px] cursor-pointer items-center justify-center px-2 text-center text-[13.5px] font-semibold leading-tight text-tinta-2 transition-colors duration-300 has-[input:checked]:text-white [&:not(:has(input:checked)):hover]:text-ouro"
          >
            <input
              type="radio"
              name="cidade"
              value={id}
              defaultChecked={escolhida === id}
              required
              className="sr-only"
            />
            {c.nome}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function Caixa({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="border border-linha bg-papel p-5 sm:p-6">
      <h2 className={`mb-4 ${ROTULO_SECAO}`}>{titulo}</h2>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

/**
 * Tem WhatsApp ou não tem — a pergunta feita na cara.
 *
 * ---------------------------------------------------------------------
 * ⚠️ POR QUE ISTO VIROU UMA ESCOLHA, E NÃO UM CAMPO OPCIONAL
 * ---------------------------------------------------------------------
 *
 * Era um campo comum, com a dica "(pode deixar vazio se for da família)"
 * em cinza, do lado do rótulo. Funcionava — e ninguém viu.
 *
 * Em 16/09 a Karol cadastrou pelo painel 11 clientes que já tinha marcado
 * por fora. Não tinha o telefone delas em mãos e deixou o campo vazio. O
 * que ela não tinha como saber é que o sistema, ao receber vazio,
 * guardava o número DELA na linha da cliente.
 *
 * Em 18/09 às 09:49 isso virou 97 mensagens em 7 segundos no WhatsApp
 * dela e no do Kainã: o sistema tentava avisar "a cliente", que era ela,
 * falhava por janela de 24 h fechada, avisava sobre a falha, e a falha do
 * aviso gerava outro aviso.
 *
 * A raiz foi consertada (agora grava `null`), mas uma dica em cinza pede
 * pra ser ignorada de novo. Escolher entre dois botões não.
 *
 * ---------------------------------------------------------------------
 * Como funciona
 * ---------------------------------------------------------------------
 *
 * Em "não tem", o `<input name="whatsapp">` SAI da tela. Sem ele no
 * formulário, `form.get("whatsapp")` volta nulo, a ação lê `""`, e o
 * banco recebe `null` — nenhuma mensagem é montada pra ninguém.
 *
 * Começa em "tem" porque é o caso normal: quem marca pelo site sempre
 * tem número, e o painel é a exceção.
 */
function EscolhaDoWhatsapp({ valorInicial }: { valorInicial?: string }) {
  const [tem, setTem] = useState(true);

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span id="rotulo-whatsapp-cliente" className={ROTULO_CAMPO}>
        WhatsApp da cliente
      </span>

      <div className="flex gap-2">
        {([true, false] as const).map((opcao) => (
          <button
            key={String(opcao)}
            type="button"
            onClick={() => setTem(opcao)}
            aria-pressed={tem === opcao}
            className={`flex-1 border px-3 py-2.5 text-[13px] transition-colors ${
              tem === opcao
                ? "border-ouro bg-ouro-fundo font-semibold text-ouro"
                : "border-linha bg-osso text-tinta-3 hover:border-ouro-claro"
            }`}
          >
            {opcao ? "Tenho o número" : "Não tenho"}
          </button>
        ))}
      </div>

      {tem ? (
        <input
          name="whatsapp"
          type="tel"
          inputMode="tel"
          defaultValue={valorInicial}
          placeholder="(18) 99999-9999"
          autoComplete="off"
          aria-labelledby="rotulo-whatsapp-cliente"
          className={`${CAMPO} mt-1`}
        />
      ) : (
        /*
          ⚠️ "A CLIENTE", E NUNCA "ELA".

          A primeira versão dizia "Ela só não vai receber confirmação nem
          lembrete". Quem lê esta tela é a Karol — e o Kainã leu como se
          FOSSE ela quem deixaria de receber, e perguntou se ia parar de
          chegar o aviso de agendamento novo.

          Não para: o aviso dela sai pro número dela, que sempre existe.
          Mas se o texto deu essa dúvida em quem conhece o sistema por
          dentro, na Karol daria mais.
        */
        <p className="mt-1 border border-linha bg-creme px-4 py-3 text-[13px] leading-relaxed text-tinta-2">
          Sem problema — o horário fica guardado do mesmo jeito, e aparece na
          sua agenda normalmente.
          <br />
          <span className="text-tinta-3">
            Só <b>a cliente</b> é que não recebe confirmação nem lembrete pelo
            WhatsApp, porque não há número pra onde mandar. Os seus avisos
            continuam chegando igual.
          </span>
        </p>
      )}
    </div>
  );
}

function Campo({
  rotulo,
  dica,
  children,
}: {
  rotulo: string;
  dica?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className={ROTULO_CAMPO}>
        {rotulo}
        {dica && <span className="ml-1.5 font-normal normal-case tracking-normal text-tinta-3">({dica})</span>}
      </span>
      {children}
    </label>
  );
}
