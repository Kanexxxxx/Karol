"use client";

import { Suspense, useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Quem AVANÇA no site começa no topo. Quem VOLTA cai onde estava.
 *
 * ---------------------------------------------------------------------
 * O defeito original
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
 * ele para.
 *
 * ---------------------------------------------------------------------
 * ⚠️ E O VOLTAR NUNCA FUNCIONOU. Reescrito em 17/09/2026.
 * ---------------------------------------------------------------------
 *
 * A primeira versão levantava uma bandeira no `popstate` e, no efeito de
 * rota, pulava a rolagem quando a bandeira estava de pé. Testado num
 * iPhone contra a produção, o voltar caía em 0px em vez de devolver os
 * 750px de onde a pessoa saiu. Uma sonda no navegador mostrou DOIS
 * motivos, e os dois precisavam cair juntos:
 *
 *   [SONDA] efeito rota="..." voltando=false   <- o efeito roda ANTES
 *   [SONDA] popstate! voltando=true            <- a bandeira sobe DEPOIS
 *
 * 1. O `popstate` chega DEPOIS do efeito de rota. Quando o código
 *    perguntava "é um voltar?", a resposta ainda era não — então tratava
 *    como avanço e ia pro topo. Pior: a bandeira ficava de pé e estragava
 *    a navegação SEGUINTE.
 *
 * 2. A posição guardada estava errada. O efeito anotava `window.scrollY`
 *    na hora em que rodava, e nessa hora a rolagem JÁ tinha sido zerada
 *    por quem chegou antes. Guardava 78px de uma tela que estava em 750.
 *
 * O conserto ataca os dois:
 *
 * - a posição é anotada DURANTE a rolagem, não na hora de sair. Sempre
 *   existe um valor recente e verdadeiro.
 * - quem restaura é o próprio `popstate`, que é quem sabe que houve um
 *   voltar. O efeito de rota deixa a ida ao topo para o quadro seguinte,
 *   e desiste se o `popstate` chegar nesse meio-tempo.
 *
 * ---------------------------------------------------------------------
 * O que continua sendo pulado
 * ---------------------------------------------------------------------
 *
 * ÂNCORA. "Serviços" e "Onde fica" no menu apontam pra `/#servicos` e
 * `/#local`. Se rolássemos pro topo, o link do menu deixaria de funcionar
 * — e o culpado seria invisível.
 *
 * A primeira renderização também é pulada: quem acabou de abrir o site já
 * está no topo, e mexer na rolagem no carregamento atrapalha quem chegou
 * por um link com âncora.
 */
function Topo() {
  const caminho = usePathname();
  const busca = useSearchParams();
  const rota = `${caminho}?${busca}`;

  const primeira = useRef(true);
  /** A rota que está na tela AGORA — lida pelo ouvinte de rolagem. */
  const rotaAtual = useRef(rota);
  /** Onde a pessoa estava em cada rota já visitada nesta aba. */
  const posicoes = useRef(new Map<string, number>());
  /** Cancela a ida ao topo quando o `popstate` chega logo depois. */
  const cancelarTopo = useRef<(() => void) | null>(null);
  /** Enquanto true, a rolagem que acontecer NÃO é anotada. */
  const congelado = useRef(false);

  /*
    ⚠️ NUM EFEITO, E NÃO SOLTO NO CORPO. Mexer num ref durante a
    renderização é o que a regra `react-hooks/refs` proíbe, e com razão:
    a renderização pode ser refeita ou descartada pelo React, e o ref
    ficaria apontando pra uma tela que nunca existiu.
    
    Declarado ANTES dos outros efeitos de propósito — efeitos rodam na
    ordem em que aparecem, então quando a ida ao topo disparar o evento de
    rolagem, `rotaAtual` já é a tela nova, e o zero é anotado na conta
    certa.
  */
  useEffect(() => {
    rotaAtual.current = rota;
  }, [rota]);

  /*
    ANOTA A POSIÇÃO ENQUANTO ELA ROLA.

    ⚠️ É ISTO que conserta o "guardou 78 em vez de 750". Anotar na saída
    não funciona: quando o efeito de rota roda, a rolagem já foi mexida.
    Aqui o valor é sempre o de verdade, do instante em que ela parou.

    `passive: true` porque só lemos — o navegador pode continuar rolando
    sem esperar por nós.
  */
  useEffect(() => {
    let agendado = false;
    const aoRolar = () => {
      if (congelado.current || agendado) return;
      agendado = true;
      requestAnimationFrame(() => {
        agendado = false;
        if (congelado.current) return;
        posicoes.current.set(rotaAtual.current, window.scrollY);
      });
    };

    /*
      ⚠️ O CONGELAMENTO É O QUE FAZ A CONTA FECHAR, e custou duas
      tentativas pra descobrir.

      Medido: a pessoa estava em 750px, clicava na cidade, e o voltar
      devolvia 78px. O ouvinte acima estava certo — errado era O QUE ele
      via. Ao clicar num link, o roteador do Next rola pro pedaço que
      mudou (78px) ANTES de a rota mudar. Então o ouvinte anotava esses
      78px como "onde ela estava na tela anterior".

      Aqui o clique é pego na fase de CAPTURA, antes de qualquer coisa
      acontecer: anota a posição de verdade e fecha a porta. Só o efeito
      de rota reabre, quando a tela nova já está de pé.
    */
    const aoClicar = (e: MouseEvent) => {
      const alvo = e.target as Element | null;
      const link = alvo?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!link) return;

      /*
        ⚠️ LINK QUE APONTA PRA TELA ONDE ELA JÁ ESTÁ.

        O caso real: o nome "Karol Carvalho" no cabeçalho aponta pra `/`.
        Na home, rolada lá embaixo, clicar nele não fazia NADA — a rota
        não muda, então nenhum efeito de rota dispara, e ela ficava
        parada achando que o site travou. Medido em 17/09/2026: 11.886px
        antes do clique, 11.432px depois.

        Aqui é o único lugar que sabe do clique, então é aqui que resolve.
        Âncora (`/#local`) não entra: ali o navegador tem que fazer o
        trabalho dele.
      */
      const mesmaTela =
        link.pathname === window.location.pathname &&
        link.search === window.location.search;

      if (mesmaTela && !link.hash) {
        window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
        return;
      }

      posicoes.current.set(rotaAtual.current, window.scrollY);
      congelado.current = true;
    };

    window.addEventListener("scroll", aoRolar, { passive: true });
    document.addEventListener("click", aoClicar, true);
    return () => {
      window.removeEventListener("scroll", aoRolar);
      document.removeEventListener("click", aoClicar, true);
    };
  }, []);

  /*
    QUEM RESTAURA É O `popstate`, porque é ele quem sabe que houve um
    voltar — e ele chega depois do efeito de rota.

    A restauração insiste por até 1,5 s. As telas do agendamento são
    `force-dynamic`: voltar pra uma delas pede o conteúdo ao servidor de
    novo, e até a resposta chegar a página tem altura de esqueleto. Rolar
    pra 750 numa página de 400px não dá erro — o navegador CORTA no que
    couber, calado. Por isso tenta de novo a cada quadro até caber.
  */
  useEffect(() => {
    const aoVoltar = () => {
      cancelarTopo.current?.();

      const destino = `${window.location.pathname}?${window.location.search.replace(/^\?/, "")}`;
      const guardada = posicoes.current.get(destino) ?? 0;
      if (guardada <= 0 || window.location.hash) return;

      // Enquanto insiste, a rolagem que ela mesma provoca é cortada no
      // que couber — anotar isso apagaria o valor que estamos buscando.
      congelado.current = true;

      const comecou = performance.now();
      const tentar = () => {
        window.scrollTo({ top: guardada, left: 0, behavior: "instant" });
        const chegou = Math.abs(window.scrollY - guardada) < 2;
        if (chegou || performance.now() - comecou > 1500) {
          congelado.current = false;
          return;
        }
        requestAnimationFrame(tentar);
      };
      requestAnimationFrame(tentar);
    };

    window.addEventListener("popstate", aoVoltar);
    return () => window.removeEventListener("popstate", aoVoltar);
  }, []);

  /*
    O F5 começa no topo.

    Por padrão o navegador devolve a rolagem ao recarregar, mas devolve
    ANTES de o conteúdo existir, e a pessoa reaparece olhando o rodapé —
    foi o que o Kainã viu.

    ⚠️ E é por isso que a devolução do VOLTAR virou trabalho nosso, logo
    acima. Desligar a restauração do navegador conserta o F5 e quebra o
    voltar junto: medido, o voltar passou a cair em 0. O roteador do Next
    não cobre esse buraco.

    O que ela digitou NÃO se perde no F5: o formulário guarda um rascunho
    na aba. Ver `RASCUNHO` em `app/agendar/FormularioDados.tsx`.
  */
  useEffect(() => {
    if (!("scrollRestoration" in history)) return;
    history.scrollRestoration = "manual";
    if (!window.location.hash) window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, []);

  /*
    AVANÇOU: vai pro topo — mas só no quadro seguinte.

    ⚠️ O ATRASO DE UM QUADRO É O CONSERTO, não descuido. O `popstate` de
    um voltar chega depois deste efeito; sem a espera, este código ia pro
    topo antes de alguém poder dizer "ela voltou". Um quadro é o bastante
    pra `aoVoltar` cancelar, e curto demais pra alguém enxergar.
  */
  useEffect(() => {
    if (primeira.current) {
      primeira.current = false;
      return;
    }
    if (window.location.hash) return;

    let vivo = true;
    cancelarTopo.current = () => {
      vivo = false;
    };

    requestAnimationFrame(() => {
      if (!vivo) return;
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      // A tela nova está de pé: pode voltar a anotar.
      requestAnimationFrame(() => {
        congelado.current = false;
      });
    });

    return () => {
      vivo = false;
      cancelarTopo.current = null;
    };
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
