"use client";

import Link from "next/link";
import { useActionState } from "react";
import { SERVICOS, formatarDuracao, formatarPreco } from "@/data/servicos";
import { CIDADES } from "@/data/negocio";
import { agendarNoPainel, type EstadoNovo } from "./acoes";
import { BOTAO, CAMPO, CAMPO_CURTO, ROTULO_CAMPO, ROTULO_SECAO } from "../estilos";

const INICIAL: EstadoNovo = {};

/**
 * Formulário da Karol pra marcar alguém na mão.
 *
 * A hora é campo livre, não a grade de 15 em 15 do site: aqui é pra
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

        <Campo rotulo="WhatsApp" dica="pode deixar vazio se for da família">
          <input
            name="whatsapp"
            type="tel"
            inputMode="tel"
            defaultValue={v?.whatsapp}
            placeholder="(18) 99999-9999"
            className={CAMPO}
          />
        </Campo>

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
