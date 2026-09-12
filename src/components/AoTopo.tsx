"use client";

import { Suspense, useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Toda navegação começa no topo da página.
 *
 * ---------------------------------------------------------------------
 * O defeito
 * ---------------------------------------------------------------------
 *
 * O Kainã achou usando: no `/agendar`, rolar até o fim da lista, escolher
 * um serviço, e a tela seguinte abria no MEIO — às vezes mostrando o
 * rodapé antes do título. Medido: 331 px de rolagem numa página que
 * deveria começar em 0.
 *
 * Não é bug do nosso código: o roteador do Next rola até o pedaço que
 * MUDOU, e não até o topo do documento. Quando o pedaço que muda está no
 * meio da página — que é o caso de um passo do agendamento —, é lá que
 * ele para. Vale pro site inteiro, não só pra tela de agendar.
 *
 * ---------------------------------------------------------------------
 * Os dois casos em que ele NÃO deve rolar
 * ---------------------------------------------------------------------
 *
 * 1. VOLTAR. O navegador devolve a pessoa exatamente onde ela estava, e
 *    isso é bom — rolar pro topo no voltar faz perder o lugar na lista
 *    que ela estava lendo. Por isso o `popstate` levanta a bandeira e a
 *    rolagem é pulada uma vez.
 *
 * 2. ÂNCORA. "Serviços" e "Onde fica" no menu apontam pra `/#servicos` e
 *    `/#local`. Se rolássemos pro topo, o link do menu deixaria de
 *    funcionar — e o culpado seria invisível.
 *
 * A primeira renderização também é pulada: quem acabou de abrir o site já
 * está no topo, e mexer na rolagem no carregamento atrapalha quem chegou
 * por um link com âncora.
 */
function Topo() {
  const caminho = usePathname();
  const busca = useSearchParams();
  const rota = `${caminho}?${busca}`;

  const voltando = useRef(false);
  const primeira = useRef(true);
  const rotaAnterior = useRef<string | null>(null);
  /** Onde a pessoa estava em cada rota já visitada nesta aba. */
  const posicoes = useRef(new Map<string, number>());

  useEffect(() => {
    const aoVoltar = () => {
      voltando.current = true;
    };
    window.addEventListener("popstate", aoVoltar);
    return () => window.removeEventListener("popstate", aoVoltar);
  }, []);

  /*
    O F5 também começa no topo.

    Por padrão o navegador devolve a rolagem ao recarregar. Numa página de
    passos isso quer dizer: apertar F5 no meio do agendamento e reaparecer
    olhando o rodapé — foi o que o Kainã viu.

    ⚠️ E foi por isso que a devolução do VOLTAR virou trabalho nosso, logo
    abaixo. Desligar a restauração do navegador conserta o F5 e quebra o
    voltar junto: medido no navegador, o voltar passou a cair em 0 em vez
    de devolver os 750 px onde a pessoa estava. O roteador do Next não
    cobre esse buraco.
  */
  useEffect(() => {
    if (!("scrollRestoration" in history)) return;
    history.scrollRestoration = "manual";
    if (!window.location.hash) window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, []);

  useEffect(() => {
    /*
      A rolagem de agora ainda é a da tela ANTERIOR: o navegador só a
      muda quando alguém manda. Então este é o momento de anotar onde a
      pessoa estava antes de sair.
    */
    const anterior = rotaAnterior.current;
    if (anterior !== null && anterior !== rota) {
      posicoes.current.set(anterior, window.scrollY);
    }
    rotaAnterior.current = rota;

    if (primeira.current) {
      primeira.current = false;
      return;
    }

    if (voltando.current) {
      voltando.current = false;
      const guardada = posicoes.current.get(rota) ?? 0;
      /*
        Duas tentativas: a primeira acontece antes de o conteúdo novo ter
        altura, e o navegador corta a rolagem no que couber. A segunda,
        no quadro seguinte, já encontra a página inteira.
      */
      window.scrollTo({ top: guardada, left: 0, behavior: "instant" });
      requestAnimationFrame(() =>
        window.scrollTo({ top: guardada, left: 0, behavior: "instant" }),
      );
      return;
    }

    if (window.location.hash) return;
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [rota]);

  return null;
}

export function AoTopo() {
  // `useSearchParams` exige fronteira de Suspense pra não impedir a
  // renderização estática das páginas pré-geradas.
  return (
    <Suspense fallback={null}>
      <Topo />
    </Suspense>
  );
}
