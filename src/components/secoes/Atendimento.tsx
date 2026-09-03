import Image from "next/image";
import { FOTOS } from "@/data/fotos";
import { REGRAS } from "@/data/negocio";
import { Cabeca, Env, Revela, Rotulo } from "../ui";

export function Atendimento() {
  return (
    <section className="py-15 lg:py-23">
      <Env className="grid items-center gap-9 lg:grid-cols-[1fr_0.95fr] lg:gap-16">
        <Revela>
          <Image
            src={FOTOS.atendimento.arquivo}
            alt={FOTOS.atendimento.alt}
            width={FOTOS.atendimento.largura}
            height={FOTOS.atendimento.altura}
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="w-full outline outline-linha"
          />
        </Revela>

        <Revela>
          <Rotulo>O atendimento</Rotulo>
          <h2 className="mt-2.5 mb-[18px] font-titulo text-[clamp(32px,5.8vw,52px)] leading-[1.02] font-light text-balance">
            Uma cliente por vez, do começo ao fim
          </h2>
          <p className="text-tinta-2">
            Sem fila e sem pressa. O horário que você marcar é seu inteiro, e eu
            deixo um intervalo entre uma cliente e outra pra tudo ficar pronto
            pra você.
          </p>

          <dl className="mt-7 grid grid-cols-3 border-t border-linha">
            <Numero valor="1" rotulo="Cliente por vez" />
            <Numero valor={String(REGRAS.intervaloMin)} rotulo="Min de intervalo" />
            <Numero valor="2" rotulo="Cidades" />
          </dl>
        </Revela>
      </Env>
    </section>
  );
}

function Numero({ valor, rotulo }: { valor: string; rotulo: string }) {
  return (
    <div className="px-1.5 pt-5 text-center">
      <dt className="font-titulo text-[34px] font-light text-ouro">{valor}</dt>
      <dd className="mt-0.5 text-[9.5px] font-semibold uppercase tracking-[0.18em] text-tinta-2">
        {rotulo}
      </dd>
    </div>
  );
}

/**
 * Como funciona. Sem citar WhatsApp de propósito: o agendamento acontece
 * no próprio site, e mencionar o WhatsApp aqui empurra a cliente de volta
 * pro canal que a gente está tentando esvaziar.
 */
export function ComoFunciona() {
  const passos = [
    {
      n: "I",
      titulo: "Escolha o serviço",
      texto: "O preço e o tempo já estão na tela. É só tocar no que você quer.",
    },
    {
      n: "II",
      titulo: "Escolha o dia e a hora",
      texto:
        "Aparecem só os horários que estão realmente livres, na cidade onde eu estiver naquele dia.",
    },
    {
      n: "III",
      titulo: "Pronto, está agendado",
      texto:
        "Seu horário fica reservado na hora e você recebe a confirmação com tudo que precisa saber.",
    },
  ];

  return (
    <section className="bg-ouro-fundo py-15 lg:py-23">
      <Env>
        <Revela>
          <Cabeca
            rotulo="Como funciona"
            titulo="Marcar leva um minuto"
            texto="Tudo pelo site, na hora que der pra você — inclusive de madrugada."
          />
        </Revela>

        <Revela>
          <ol className="grid gap-[18px] md:grid-cols-3 md:gap-7">
            {passos.map((p) => (
              <li key={p.n} className="px-3 py-2 text-center">
                <span className="mx-auto mb-[18px] grid size-13 place-items-center rounded-full border border-ouro-claro font-titulo text-[23px] text-ouro">
                  {p.n}
                </span>
                <h3 className="mb-2.5 font-titulo text-[27px]">{p.titulo}</h3>
                <p className="text-[14.5px] text-tinta-2">{p.texto}</p>
              </li>
            ))}
          </ol>
        </Revela>
      </Env>
    </section>
  );
}
