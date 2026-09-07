/**
 * BRIEFING 3 — KAROL CARVALHO · a versao curta
 * ============================================
 *
 * POR QUE ESTE ARQUIVO EXISTE
 * ---------------------------
 * O briefing 2 nao foi respondido. Ele tinha 12 secoes, prometia 10
 * minutos, e pedia DECISAO em quase todas — inclusive sobre dinheiro.
 * Mandar de novo a mesma coisa da o mesmo resultado.
 *
 * Este e o oposto, e cada escolha aqui foi feita contra o motivo provavel
 * do silencio dela:
 *
 *  - UMA PAGINA SO. Sem quebra de secao. Ela abre e ve o fim da tela —
 *    formulario que rola pra sempre parece trabalho.
 *  - 7 PERGUNTAS, quase todas de um toque. Duas tem campo de texto e as
 *    duas sao opcionais.
 *  - NADA E OBRIGATORIO. Resposta pela metade chega e serve. Pergunta
 *    obrigatoria no meio do caminho e o que faz a pessoa fechar a aba.
 *  - TODA PERGUNTA TEM SAIDA. "Escolhe voce" e "nao sei" sao opcoes de
 *    verdade em todas — e sao respostas uteis, nao desistencia.
 *  - CADA PERGUNTA DIZ O QUE MUDA NO SITE. Ela responde melhor sabendo
 *    o efeito do que respondeu.
 *
 * A pergunta do sinal vem primeiro de proposito: e a unica que trava
 * trabalho de verdade. Se ela responder so a primeira e fechar, ja valeu.
 *
 * COMO USAR (2 minutos)
 * ---------------------
 *  1. Abra https://script.google.com  ->  "Novo projeto"
 *  2. Apague o codigo de exemplo e cole ESTE ARQUIVO INTEIRO
 *  3. Executar (>) e escolher a funcao "criarFormulario3"
 *  4. Autorizar com a sua conta Google
 *  5. Ctrl+Enter abre o Registro de execucao com o link publico
 *     E com a mensagem pronta pra colar no WhatsApp dela
 *
 * ANTES DE RODAR: preencha as duas URLs em CAPAS, se quiser que as fotos
 * aparecam dentro do formulario. Em branco, a pergunta ainda funciona —
 * so pede pra ela olhar as fotos que voce mandou por WhatsApp.
 *
 * ⚠️ ESTE ARQUIVO TEM ACENTO no que a Karol le. O editor do Apps Script e
 * UTF-8 e aguenta; cole direto, sem passar por bloco de notas.
 */

var CAPAS = {
  a: 'COLE_AQUI_O_LINK_DA_CAPA_BRANCA',    // blazer branco, fundo cinza claro
  b: 'COLE_AQUI_O_LINK_DA_CAPA_LARANJA'    // blazer branco, calca terracota
};

/** Pra onde o link vai. So aparece na mensagem do WhatsApp, no fim. */
var SITE = 'https://karol-zeta.vercel.app';

function criarFormulario3() {
  var form = FormApp.create('Karol — 7 perguntinhas (2 min)');

  form.setDescription(
    'Oi, Karol! O site está no ar e funcionando: a agenda, os preços, a ' +
    'sua página, e o WhatsApp já responde as clientes sozinho.\n\n' +
    'Ficaram 7 coisinhas que só você pode decidir. Quase todas são de ' +
    'um toque só.\n\n' +
    '⚠️ Nada aqui é obrigatório. Se alguma pergunta não fizer sentido, ' +
    'pula ou marca "escolhe você" — isso também me ajuda. Responder pela ' +
    'metade e mandar é melhor do que deixar pra depois. 💛'
  );
  form.setProgressBar(false);      // barra de progresso avisa que e longo
  form.setCollectEmail(false);
  form.setAllowResponseEdits(true);
  form.setConfirmationMessage(
    'Obrigado, Karol! Já é o bastante pra eu seguir. ' +
    'Qualquer coisa que você lembrar depois, é só me chamar no WhatsApp. 💛'
  );

  /* ------------------------------------------------------------------
     1. O SINAL — a unica que trava trabalho
     ------------------------------------------------------------------
     No briefing 1 ela escreveu que a unica coisa que gostaria de
     resolver era "a questao do agendamento com sinal", e duas perguntas
     antes tinha marcado "sim, quero desde ja" pra um PIX de sinal.
     Parecem a mesma coisa, mas o Kaina leu como "aviso/notificacao".
     Enquanto isso nao for dito com palavra dela, nao da pra construir
     pagamento nenhum: e a diferenca entre uma tela de PIX e um aviso.
     ------------------------------------------------------------------ */
  form.addSectionHeaderItem()
    .setTitle('1. O sinal')
    .setHelpText(
      'Você escreveu que a coisa que mais queria resolver era "a questão ' +
      'do agendamento com sinal". Só que "sinal" pode ser duas coisas ' +
      'bem diferentes, e eu não quero construir a errada. Qual delas é?'
    );

  form.addMultipleChoiceItem()
    .setTitle('Quando você fala em "sinal", você quer dizer…')
    .setHelpText(
      'A primeira opção é a que mais dá trabalho pra fazer, mas é a que ' +
      'resolve as clientes que desmarcam em cima da hora.'
    )
    .setChoiceValues([
      'Dinheiro. A cliente paga um PIX adiantado pra segurar o horário, e ' +
        'só depois disso o horário fica dela.',
      'Aviso. Eu quero ser avisada no WhatsApp quando alguém marca. ' +
        '(isso já está funcionando)',
      'As duas coisas.',
      'Não sei explicar direito — me liga que eu falo.'
    ])
    .showOtherOption(true)
    .setRequired(false);

  form.addParagraphTextItem()
    .setTitle('Se for dinheiro: quanto, e de qual serviço?')
    .setHelpText(
      'Pode ser um valor só pra tudo ("R$ 10 em qualquer serviço") ou ' +
      'diferente por serviço. E me diz também: se a cliente desmarcar, ' +
      'você devolve ou fica pra você? Não precisa estar decidido — ' +
      'escreve o que vier na cabeça.'
    )
    .setRequired(false);

  /* ------------------------------------------------------------------
     2. A CAPA — um toque, e muda a abertura inteira do site
     ------------------------------------------------------------------ */
  form.addSectionHeaderItem()
    .setTitle('2. A foto que abre o site')
    .setHelpText('É a primeira coisa que a cliente vê. As duas são do mesmo ensaio.');

  [['Foto A — fundo cinza claro', CAPAS.a], ['Foto B — fundo quente', CAPAS.b]]
    .forEach(function (par) {
      try {
        form.addImageItem().setTitle(par[0]).setImage(UrlFetchApp.fetch(par[1]).getBlob());
      } catch (e) {
        form.addSectionHeaderItem()
          .setTitle(par[0])
          .setHelpText('(te mandei essa foto no WhatsApp)');
      }
    });

  form.addMultipleChoiceItem()
    .setTitle('Qual delas fica na abertura?')
    .setHelpText(
      'A que você NÃO escolher não vai pro lixo: ela fica na sua página, ' +
      'a do "A Karol".'
    )
    .setChoiceValues(['Foto A', 'Foto B', 'Tanto faz, escolhe você'])
    .setRequired(false);

  /* ------------------------------------------------------------------
     3. APROVACAO MANUAL — ela pediu no briefing 1, esta desligado
     ------------------------------------------------------------------
     REGRAS.aprovacaoManual esta false. O caminho "pendente" existe todo
     no painel; e um interruptor de uma linha. Mas ligar sem ela querer
     de verdade significa cliente marcando e ficando no vacuo ate a
     Karol abrir o painel.
     ------------------------------------------------------------------ */
  form.addMultipleChoiceItem()
    .setTitle('3. Quando alguém marca pelo site, já está marcado na hora?')
    .setHelpText(
      'Hoje já está marcado na hora, e você recebe o aviso no WhatsApp. ' +
      'Você tinha dito que gostaria de aprovar cada uma na mão. Dá pra ' +
      'fazer — mas aí a cliente fica esperando sua resposta pra saber se ' +
      'o horário é dela, e se você demorar ela desiste.'
    )
    .setChoiceValues([
      'Deixa como está: marca na hora e eu só recebo o aviso.',
      'Quero aprovar cada uma antes de valer.',
      'Escolhe você.'
    ])
    .setRequired(false);

  /* ------------------------------------------------------------------
     4. LEMBRETE DE MEIA HORA — ela disse NAO pra "horas antes"
     ------------------------------------------------------------------
     No briefing 1 ela marcou que NAO queria "lembrete de horas antes".
     O de 30 min foi pedido pelo Kaina depois e ja esta construido, com
     interruptor. E outra coisa na pratica — horas antes e redundante
     com o da vespera, meia hora antes e o empurrao pra sair de casa —
     mas quem decide sobre a conversa dela com a cliente e ela.
     ------------------------------------------------------------------ */
  form.addMultipleChoiceItem()
    .setTitle('4. Posso mandar um "seu horário é daqui a pouco" meia hora antes?')
    .setHelpText(
      'Você já tinha dito que não queria lembrete de horas antes, e eu ' +
      'respeitei. Esse é diferente: é meia hora antes, quando a pessoa ' +
      'ainda dá tempo de sair de casa. É o que costuma evitar aquelas ' +
      '1 ou 2 que somem em cima da hora toda semana.\n\n' +
      'O lembrete de um dia antes continua existindo do mesmo jeito.'
    )
    .setChoiceValues([
      'Pode mandar.',
      'Não, prefiro só o de um dia antes.',
      'Escolhe você.'
    ])
    .setRequired(false);

  /* ------------------------------------------------------------------
     5. O ASSISTENTE — coisa nova, ela precisa saber que existe
     ------------------------------------------------------------------
     Nao trava trabalho: o codigo esta pronto. Mas e uma IA lendo a
     agenda dela, e ela tem que saber disso antes de ligar, nao depois.
     ------------------------------------------------------------------ */
  form.addMultipleChoiceItem()
    .setTitle('5. Quer controlar sua agenda conversando no WhatsApp?')
    .setHelpText(
      'Ficou pronta uma coisa nova: você manda mensagem pro número do ' +
      'studio e ele te responde. "quantas clientes amanhã?", "acha a ' +
      'Larissa pra mim", "quanto eu faturei esse mês?", "cancela a de ' +
      'quinta", "bloqueia sexta que eu vou viajar".\n\n' +
      'Quando for pra MUDAR alguma coisa na agenda, ele nunca faz sozinho: ' +
      'ele te pergunta antes, com o nome da cliente e o horário escritos, ' +
      'e só muda se você apertar "confirmar".\n\n' +
      'Você não precisa usar — o painel continua funcionando igual.'
    )
    .setChoiceValues([
      'Quero testar.',
      'Prefiro só o painel mesmo.',
      'Me explica melhor primeiro.'
    ])
    .setRequired(false);

  /* ------------------------------------------------------------------
     6. BANDEIRANTES — CIDADES.bandeirantes.local esta null
     ------------------------------------------------------------------ */
  form.addTextItem()
    .setTitle('6. Em Bandeirantes D\'Oeste, você atende onde?')
    .setHelpText(
      'Hoje o site só diz a cidade. Pode ser só o nome do lugar ("no ' +
      'salão da Fulana", "na casa da minha mãe") — o endereço completo ' +
      'não vai pro site, ele vai no WhatsApp da cliente depois que ela ' +
      'marca. Se preferir deixar só a cidade, escreve "deixa assim".'
    )
    .setRequired(false);

  /* ------------------------------------------------------------------
     7. OS TEXTOS — rascunho meu, precisam do aval dela
     ------------------------------------------------------------------ */
  form.addMultipleChoiceItem()
    .setTitle('7. Os textos que descrevem seus serviços no site')
    .setHelpText(
      'Aqueles textinhos embaixo de cada serviço fui eu que escrevi, ' +
      'chutando. Eles falam do SEU trabalho, então eu não quero deixar ' +
      'no ar nada que você não assinaria. Dá uma olhada em ' + SITE + '/#servicos'
    )
    .setChoiceValues([
      'Olhei e está tudo certo, pode deixar.',
      'Tem coisa que eu mudaria (escrevo abaixo).',
      'Ainda não olhei.'
    ])
    .setRequired(false);

  form.addParagraphTextItem()
    .setTitle('O que você mudaria?')
    .setHelpText('Se marcou a opção do meio. Pode escrever do seu jeito.')
    .setRequired(false);

  /* ------------------------------------------------------------------
     Espaco livre. A resposta mais util do briefing 1 saiu de um campo
     aberto igual a este.
     ------------------------------------------------------------------ */
  form.addParagraphTextItem()
    .setTitle('Quer falar mais alguma coisa?')
    .setHelpText(
      'Qualquer coisa: algo do site que você não gostou, algo que faltou, ' +
      'algo que te incomodou. Pode ser direta, não vou ficar chateado.'
    )
    .setRequired(false);

  var link = form.getPublishedUrl();
  var edicao = form.getEditUrl();

  Logger.log('');
  Logger.log('=====================================================');
  Logger.log('LINK PRA MANDAR PRA KAROL:');
  Logger.log(link);
  Logger.log('');
  Logger.log('LINK PRA VOCE EDITAR / VER AS RESPOSTAS:');
  Logger.log(edicao);
  Logger.log('=====================================================');
  Logger.log('');
  Logger.log('MENSAGEM PRONTA PRA COLAR NO WHATSAPP DELA:');
  Logger.log('');
  Logger.log(mensagemDoWhatsapp(link));
  Logger.log('');

  return link;
}

/**
 * A mensagem que vai junto com o link.
 *
 * ⚠️ Isto importa tanto quanto o formulario. O briefing 2 provavelmente
 * nao foi respondido menos pelo conteudo e mais por como chegou: link
 * seco de formulario, sem prazo, sem tamanho, sem dizer o que acontece
 * depois. Fica facil deixar pra amanha pra sempre.
 *
 * Esta mensagem diz o tamanho ("2 minutinhos"), da uma saida ("responde
 * as que der"), e diz o que ela ganha ao responder.
 */
function mensagemDoWhatsapp(link) {
  return [
    'Karol, o site tá no ar! 💛',
    '',
    'Dá uma olhada quando puder: ' + SITE,
    '',
    'Ficaram 7 coisinhas que só você pode decidir — quase todas é só ' +
      'marcar uma opção. São uns 2 minutinhos, juro:',
    '',
    link,
    '',
    'Não precisa responder tudo. Responde as que der e manda assim mesmo, ' +
      'que já me ajuda demais. A primeira é a mais importante (é sobre o ' +
      'sinal, aquilo que você falou que queria resolver).'
  ].join('\n');
}
