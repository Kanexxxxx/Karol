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

export default function Home() {
  return (
    <>
      <Cabecalho sobreHero />
      <main className="flex-1 pb-20 lg:pb-0">
        <Abertura />
        <Faixa />
        <Esteira />
        <Servicos />
        <Prova />
        <Frase />
        <Atendimento />
        <ComoFunciona />
        <Curso />
        <Trabalhos />
        <Alunas />
        <Local />
        <ChamadaFinal />
      </main>
      <Rodape />
      <BarraMobile />
    </>
  );
}
