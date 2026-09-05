import { CIDADES, type CidadeId } from "@/data/negocio";
import { faixaDeDias, janelaDaCidade } from "@/lib/agenda";
import { Botao, Cabeca, Env, Revela } from "../ui";

export function Local() {
  const cidades = Object.entries(CIDADES) as [CidadeId, (typeof CIDADES)[CidadeId]][];

  return (
    <section id="local" className="py-15 lg:py-23">
      <Env>
        <Revela>
          <Cabeca
            rotulo="Endereço"
            titulo="Local de atendimento"
            texto="Duas cidades, dias diferentes. O site já mostra só os horários da cidade certa."
          />
        </Revela>

        <Revela>
          <div className="grid gap-px bg-linha outline outline-linha md:grid-cols-2">
            {cidades.map(([id, cidade]) => (
              <div key={id} className="bg-osso px-7 py-9 text-center">
                <h3 className="mb-2 font-titulo text-[32px] font-light">{cidade.nome}</h3>
                <p className="text-[10.5px] font-bold uppercase tracking-[0.2em] text-ouro">
                  {faixaDeDias(id)} · {janelaDaCidade(id)}
                </p>
                {cidade.local && <p className="mt-3.5 text-[14.5px] text-tinta-2">{cidade.local}</p>}
              </div>
            ))}
          </div>
        </Revela>
      </Env>
    </section>
  );
}

export function ChamadaFinal() {
  return (
    <section className="bg-ouro py-15 text-center text-white lg:py-23">
      <Env>
        <Revela>
          <h2 className="mb-3.5 font-titulo text-[clamp(36px,7vw,62px)] leading-none font-light">
            Vamos marcar?
          </h2>
          <p className="mb-7 text-[#F4E7CC]">
            Escolha o serviço, o dia e o horário. Leva menos de um minuto.
          </p>
          <Botao href="/agendar" variante="claro">
            Agendar meu horário
          </Botao>
        </Revela>
      </Env>
    </section>
  );
}
