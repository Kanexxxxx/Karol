import { BarraMobile, Cabecalho } from "@/components/Cabecalho";
import { Rodape } from "@/components/Rodape";
import { Abertura, Faixa } from "@/components/secoes/Abertura";
import { Esteira } from "@/components/secoes/Esteira";
import { Servicos } from "@/components/secoes/Servicos";
import { Frase, Prova } from "@/components/secoes/Prova";
import { Atendimento, ComoFunciona } from "@/components/secoes/Atendimento";
import { Curso } from "@/components/secoes/Curso";
import { Alunas, Trabalhos } from "@/components/secoes/Galeria";
import { ChamadaFinal, Local } from "@/components/secoes/Local";
import { Instagram } from "@/components/secoes/Instagram";
import { Sobre } from "@/components/secoes/Sobre";

export default function Home() {
  return (
    <>
      <Cabecalho sobreHero />
      <main className="flex-1 pb-20 lg:pb-0">
        <Abertura />
        <Esteira />
        <Servicos />
        <Prova />
        <Frase />
        {/* A citação dela prepara a apresentação; a apresentação leva pra /sobre. */}
        <Sobre />
        <Atendimento />
        <ComoFunciona />
        <Curso />
        <Trabalhos />
        <Alunas />
        {/*
          O convite pro Instagram vem logo depois das fotos, que é onde a
          pessoa acabou de querer ver mais. Estava no fim, depois do endereço,
          e a Karol reclamou com razão: ninguém chega lá com vontade de seguir.
        */}
        <Instagram />
        <Faixa />
        <Local />
        <ChamadaFinal />
      </main>
      <Rodape />
      <BarraMobile />
    </>
  );
}
