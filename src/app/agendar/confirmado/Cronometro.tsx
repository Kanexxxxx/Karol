"use client";

import { useEffect, useState } from "react";

/**
 * Quanto tempo falta pra pagar a entrada.
 *
 * ---------------------------------------------------------------------
 * O prazo é do AGENDAMENTO, não desta página
 * ---------------------------------------------------------------------
 *
 * ⚠️ É O ÚNICO JEITO DE ISTO NÃO SER MENTIRA. Se a contagem começasse
 * quando a página abre, bastava recarregar pra ela voltar aos 30 minutos —
 * e a cliente ficaria tranquila achando que tem meia hora quando já tem
 * três minutos. Pior que não ter cronômetro nenhum: um relógio errado é
 * uma promessa errada.
 *
 * Por isso o que chega aqui é `venceEm`, calculado no servidor a partir de
 * `criadoEm` do agendamento. Recarregar, abrir noutro celular, mandar o
 * link pra alguém — todos veem o mesmo tempo restante.
 *
 * ---------------------------------------------------------------------
 * Por que o número inicial vem pronto do servidor
 * ---------------------------------------------------------------------
 *
 * Se a primeira renderização do navegador calculasse o tempo sozinha, o
 * relógio dele nunca bate exatamente com o do servidor e o React reclama
 * de hidratação — e, pior, a tela pisca um número e troca por outro.
 *
 * Com `restanteInicial` vindo pronto, a primeira pintura é idêntica dos
 * dois lados. O relógio do navegador só assume no primeiro tique.
 *
 * ---------------------------------------------------------------------
 * "Parar só quando acabar o prazo"
 * ---------------------------------------------------------------------
 *
 * O intervalo se desliga sozinho ao chegar em zero, e a tela troca de
 * assunto: some o "faltam X" e entra o que fazer agora. O tempo NÃO fica
 * negativo e não recomeça.
 */
export function Cronometro({
  venceEm,
  restanteInicial,
}: {
  /** Instante em que o horário volta pra agenda, em ISO. */
  venceEm: string;
  /** Segundos restantes calculados no servidor. Zero ou menos = já venceu. */
  restanteInicial: number;
}) {
  const [restante, setRestante] = useState(Math.max(0, restanteInicial));

  useEffect(() => {
    const alvo = new Date(venceEm).getTime();

    /*
      Recalcula do relógio, em vez de subtrair 1 a cada tique.

      `setInterval` atrasa, e o navegador congela o temporizador quando a
      aba fica em segundo plano — que é exatamente o que acontece quando a
      cliente sai daqui pra abrir o aplicativo do banco. Subtraindo de um
      contador, ela voltaria com o cronômetro parado no tempo em que saiu.
      Lendo o relógio, voltar mostra a verdade.
    */
    /*
      ⚠️ E O TETO É O QUE O SERVIDOR DISSE.

      Daqui pra frente quem conta é o relógio do CELULAR dela, e celular
      com a hora errada existe — atrasado uma hora, ano errado, o que for.
      Sem o teto, um relógio atrasado faria o cronômetro mostrar mais
      tempo do que ela tem, e ela pagaria confiando nisso.

      Como o tempo só anda pra frente enquanto a página está aberta,
      nunca pode sobrar mais do que sobrava quando ela carregou.
    */
    const teto = Math.max(0, restanteInicial);

    const tique = () => {
      const doRelogio = Math.round((alvo - Date.now()) / 1000);
      const faltam = Math.min(teto, Math.max(0, doRelogio));
      setRestante(faltam);
      return faltam;
    };

    if (tique() === 0) return;

    const id = setInterval(() => {
      if (tique() === 0) clearInterval(id);
    }, 1000);

    return () => clearInterval(id);
  }, [venceEm, restanteInicial]);

  if (restante <= 0) return <Acabou />;

  const minutos = Math.floor(restante / 60);
  const segundos = restante % 60;
  // Abaixo de 5 minutos o relógio fica vermelho. Não é enfeite: é o
  // momento em que ainda dá pra pagar, e a pessoa precisa perceber.
  const apertado = restante <= 5 * 60;

  return (
    <div
      className={`mb-6 flex items-center gap-4 border p-4 ${
        apertado ? "border-[#8f2d2d]/35 bg-[#8f2d2d]/[0.06]" : "border-linha bg-papel"
      }`}
    >
      <p
        /*
          `tabular-nums` trava a largura dos dígitos. Sem isso o número
          "pula" a cada segundo, porque o 1 é mais estreito que o 8 na
          maioria das fontes — e um relógio tremendo parece defeito.

          `aria-live="off"`: quem usa leitor de tela não precisa ouvir a
          contagem a cada segundo. O prazo está escrito no texto ao lado.
        */
        aria-live="off"
        className={`font-titulo text-[34px] leading-none tabular-nums ${
          apertado ? "text-[#8f2d2d]" : "text-tinta"
        }`}
      >
        {minutos}:{String(segundos).padStart(2, "0")}
      </p>
      <p className="text-[13.5px] leading-snug text-tinta-2">
        {apertado ? (
          <>
            <b className="text-[#8f2d2d]">Falta pouco.</b> Depois desse tempo o horário volta pra
            agenda e fica livre pra outra pessoa.
          </>
        ) : (
          <>
            é o tempo que o seu horário fica guardado esperando a entrada. Depois disso ele volta
            pra agenda.
          </>
        )}
      </p>
    </div>
  );
}

/**
 * O que a tela vira quando o tempo acaba.
 *
 * ⚠️ A ÚLTIMA FRASE É A MAIS IMPORTANTE DAQUI. Quem paga no minuto 31 lê
 * isto com o comprovante na mão — se a tela não disser o que fazer, ela
 * fica com o dinheiro enviado, sem horário, e sem saber pra quem falar. É
 * a mesma frase que vai na mensagem de WhatsApp, de propósito.
 */
function Acabou() {
  return (
    <div className="mb-6 border border-[#8f2d2d]/35 bg-[#8f2d2d]/[0.06] p-4">
      <p className="font-titulo text-[20px] leading-none text-[#8f2d2d]">O prazo acabou</p>
      <p className="mt-2 text-[13.5px] leading-snug text-tinta-2">
        Este horário voltou pra agenda e já pode estar com outra pessoa. Dá pra escolher outro em
        um minuto.
      </p>
      <p className="mt-2 text-[13.5px] leading-snug text-tinta-2">
        <b>Se você já pagou</b>, não marque de novo: mande o comprovante pra Karol no WhatsApp que
        ela resolve.
      </p>
    </div>
  );
}
