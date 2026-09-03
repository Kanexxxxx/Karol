import { CIDADES, EXPEDIENTE, type CidadeId } from "@/data/negocio";
import { Botao, Cabeca, Env, Revela } from "../ui";

const DIAS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

function faixaDeDias(cidade: CidadeId) {
  const dias = EXPEDIENTE.filter((e) => e.cidade === cidade).map((e) => e.dia);
  if (dias.length === 0) return "";
  const nome = (i: number) => DIAS[i].replace(/^./, (c) => c.toUpperCase());
  if (dias.length === 1) return nome(dias[0]);
  return `${nome(dias[0])} a ${DIAS[dias[dias.length - 1]]}`;
}

function horarioDe(cidade: CidadeId) {
  const janela = EXPEDIENTE.find((e) => e.cidade === cidade);
  if (!janela) return "";
  const hh = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}h${m % 60 ? String(m % 60).padStart(2, "0") : ""}`;
  return `das ${hh(janela.inicio)} às ${hh(janela.fim)}`;
}

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
                  {faixaDeDias(id)} · {horarioDe(id)}
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
