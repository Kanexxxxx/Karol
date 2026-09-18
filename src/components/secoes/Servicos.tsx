import Link from "next/link";
import { SERVICOS, formatarDuracao, formatarPreco } from "@/data/servicos";
import { Cabeca, Env, Revela } from "../ui";

/**
 * Serviços e preços — a tabela.
 *
 * ---------------------------------------------------------------------
 * Por que aqui não tem imagem nenhuma (v2)
 * ---------------------------------------------------------------------
 *
 * Na v1 cada serviço era um cartão com a FOTO DE UMA CLIENTE, o nome e o
 * preço por cima de um véu escuro. Bonito, e impossível na v2: eram seis
 * rostos de gente real, um por serviço.
 *
 * A primeira tentativa de substituto foi um ícone dourado por serviço,
 * gerado por IA. O Kainã olhou e resumiu: "está tudo horrível e feio".
 * Ele tinha razão, e o motivo vale ficar escrito — ícone de sobrancelha
 * dourado é o que TODO site de salão tem. Trocar foto de cliente por
 * clip-art de banco de imagem é piorar duas vezes.
 *
 * O que ficou é uma tabela tipográfica, tratada como cardápio de
 * restaurante bom: nome grande em serifada, preço alinhado à direita em
 * número tabular, fio fino separando, e nada mais. Numa tela de celular
 * ela responde a pergunta da cliente ("quanto custa e quanto demora?")
 * mais rápido do que a foto respondia.
 */
export function Servicos() {
  return (
    <section id="servicos" className="py-15 lg:py-23">
      <Env>
        <Revela>
          <Cabeca
            rotulo="Tabela"
            titulo="Serviços e preços"
            texto="Tudo aberto, com o tempo de cada um. Você não precisa perguntar nada."
          />
        </Revela>

        <Revela>
          {/*
            Duas colunas no computador, uma no celular. O `border-t` mora
            em cada item, e não no `ul`, pra segunda coluna também começar
            com fio — senão o topo da direita fica solto.
          */}
          <ul className="mx-auto max-w-[900px] lg:grid lg:grid-cols-2 lg:gap-x-12">
            {SERVICOS.map((servico) => {
              const destino =
                servico.categoria === "curso" ? "/#curso" : `/agendar?servico=${servico.id}`;

              return (
                <li key={servico.id} className="border-t border-linha last:border-b lg:last:border-b-0">
                  <Link
                    href={destino}
                    className="group flex items-baseline gap-4 py-5 transition-colors hover:bg-creme focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ouro lg:px-2"
                  >
                    <div className="min-w-0 flex-1">
                      <h3 className="font-titulo text-[clamp(21px,3.4vw,27px)] leading-tight font-light text-balance">
                        {servico.nome}
                      </h3>
                      <p className="mt-1 text-[13.5px] leading-snug text-tinta-2">
                        {servico.descricao}
                      </p>
                      {/*
                        ⚠️ O SELO FICA AQUI EMBAIXO, e não colado no nome.

                        Ele já esteve ao lado do título. Com a serifada nova
                        (EB Garamond, um tico mais larga que a Cormorant),
                        "Maquiagem social" mais o selo não cabiam numa linha:
                        o nome quebrava em "Maquiagem" / "social", e a linha
                        da tabela ficava mais alta que as vizinhas.

                        Na linha da duração ele não briga com nada, em
                        largura nenhuma de tela.
                      */}
                      <p className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10px] font-bold uppercase tracking-[0.18em] text-tinta-3">
                        {formatarDuracao(servico)}
                        {servico.etiqueta && (
                          <span className="bg-ouro-fundo px-2 py-[3px] text-[8.5px] tracking-[0.16em] whitespace-nowrap text-ouro">
                            {servico.etiqueta}
                          </span>
                        )}
                      </p>
                    </div>

                    {/*
                      O preço é o que a pessoa veio ver. Fica na direita, em
                      número tabular (`lining-nums`), pra coluna de preços
                      alinhar vírgula com vírgula de cima a baixo.
                    */}
                    <div className="shrink-0 text-right">
                      <span className="block font-titulo text-[clamp(22px,3.6vw,30px)] leading-none font-light text-ouro lining-nums">
                        {formatarPreco(servico.preco)}
                      </span>
                      <span
                        aria-hidden="true"
                        className="mt-2 inline-block text-[13px] text-ouro-claro transition-transform duration-300 group-hover:translate-x-1"
                      >
                        →
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Revela>
      </Env>
    </section>
  );
}
