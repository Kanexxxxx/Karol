/**
 * BRIEFING FINAL — KAROL CARVALHO
 * ===============================
 *
 * O formulario que encerra o projeto. Junta os tres anteriores num so, JA
 * PREENCHIDO com tudo que ela respondeu em 29/08/2026, e acrescenta o que
 * falta pra fechar.
 *
 * ---------------------------------------------------------------------
 * O QUE FAZ ESTE DIFERENTE DOS OUTROS
 * ---------------------------------------------------------------------
 *
 * O briefing 2 tinha 12 secoes, prometia 10 minutos e pedia decisao em
 * quase todas. Nunca foi respondido.
 *
 * A saida nao e encurtar de novo — o Kaina precisa de TODAS as respostas
 * pra encerrar. A saida e **ela nao ter que responder de novo o que ja
 * respondeu**.
 *
 * Este script gera um LINK PRE-PREENCHIDO (`toPrefilledUrl`). A Karol abre
 * e encontra as respostas dela de agosto ja marcadas: precos, horarios,
 * fotos, visual, avisos. Ela desce conferindo, muda o que mudou, e para de
 * verdade so nas perguntas novas — que sao as que ninguem sabe.
 *
 * Um formulario grande que ja vem respondido e MUITO mais rapido de fechar
 * do que um formulario pequeno em branco. E o que ela le e "o Kaina
 * anotou tudo que eu falei", nao "tenho que fazer isso de novo".
 *
 * ---------------------------------------------------------------------
 * COMO USAR
 * ---------------------------------------------------------------------
 *
 *  1. Abra https://script.google.com  ->  "Novo projeto"
 *  2. Apague o codigo de exemplo e cole ESTE ARQUIVO INTEIRO
 *  3. Executar (>) e escolher a funcao "criarFormularioFinal"
 *  4. Autorizar com a sua conta Google
 *  5. Ctrl+Enter abre o Registro de execucao com:
 *       - o LINK PRE-PREENCHIDO  <- e ESTE que voce manda pra ela
 *       - o link de edicao, pra voce ver as respostas
 *       - a mensagem pronta pra colar no WhatsApp
 *
 * ⚠️ MANDE O LINK PRE-PREENCHIDO, nao o link normal. O normal abre tudo em
 * branco e joga fora a razao de ser deste formulario.
 *
 * ⚠️ ESTE ARQUIVO TEM ACENTO no que a Karol le. O editor do Apps Script e
 * UTF-8 e aguenta; cole direto, sem passar por bloco de notas.
 */

/** Pra onde os links apontam. */
var SITE = 'https://karol-zeta.vercel.app';

/**
 * O que ela ja respondeu em 29/08/2026.
 *
 * Cada valor aqui tem que ser IGUAL a uma das opcoes da pergunta, senao o
 * Apps Script recusa o pre-preenchimento. Se voce mudar um texto de opcao
 * la embaixo, mude aqui tambem.
 */
var JA_RESPONDIDO = {
  precos: 'Mostrar todos os preços no site',
  domingo: 'Não atendo domingo',
  fotos: 'Pode usar todas',
  visual: 'Manter o dourado com bege, bem clean',
  cnpj: 'Não tenho CNPJ nem MEI',
  cancelamento: 'Não. Ela tem que me chamar no WhatsApp',
  avisoNovo: 'Sim, quero ser avisada no WhatsApp',
  aprovacao: 'Sim, quero aprovar cada uma antes de valer',
  mensagens: [
    'Confirmação na hora que ela marca',
    'Lembrete um dia antes',
    'Agradecimento depois do atendimento',
  ],
  desmarcam: 'De 1 a 2 por semana',
  sinalQuis: 'Sim, quero desde já',
};

function criarFormularioFinal() {
  var form = FormApp.create('Karol — as últimas decisões do site');

  form.setDescription(
    'Oi, Karol! O site está no ar e funcionando: a agenda, os preços, a sua ' +
    'página e o WhatsApp que já responde as clientes sozinho.\n\n' +
    '⚠️ IMPORTANTE: as suas respostas de agosto já estão marcadas aqui. ' +
    'Você não precisa responder de novo — só conferir se continua certo e ' +
    'mudar o que mudou.\n\n' +
    'As perguntas NOVAS estão marcadas com 🆕. São essas que eu preciso pra ' +
    'terminar. Nenhuma é obrigatória: responde as que der e manda assim ' +
    'mesmo. 💛'
  );
  form.setCollectEmail(false);
  form.setAllowResponseEdits(true);
  form.setProgressBar(true);
  form.setConfirmationMessage(
    'Obrigado, Karol! Com isso eu fecho o que falta. ' +
    'Qualquer coisa que você lembrar depois, é só me chamar no WhatsApp. 💛'
  );

  // guarda as referencias dos itens que vao ser pre-preenchidos
  var itens = {};

  /* ==================================================================
     1. O SINAL — a pergunta que trava tudo, e por isso vem primeiro
     ==================================================================
     No briefing 1 ela marcou "sim, quero desde ja" pra um PIX de sinal, e
     depois escreveu que a UNICA coisa que gostaria de resolver era "a
     questao do agendamento com sinal". As duas respostas parecem falar da
     mesma coisa, mas o Kaina leu como "aviso/notificacao".

     Enquanto isso nao sair da boca dela, nao da pra construir pagamento
     nenhum: e a diferenca entre uma tela de PIX e um aviso de WhatsApp.
     ================================================================== */
  form.addPageBreakItem()
    .setTitle('1. O sinal 🆕')
    .setHelpText(
      'Essa é a parte mais importante do formulário inteiro. Em agosto você ' +
      'escreveu que a coisa que mais queria resolver era "a questão do ' +
      'agendamento com sinal" — e eu não quero construir a errada.'
    );

  itens.sinalQuis = form.addMultipleChoiceItem()
    .setTitle('Em agosto você marcou isso sobre pedir um PIX de sinal. Continua valendo?')
    .setChoiceValues([
      'Sim, quero desde já',
      'Quero, mas mais pra frente',
      'Mudei de ideia, não quero',
    ])
    .setRequired(false);

  form.addMultipleChoiceItem()
    .setTitle('🆕 Quando você fala "sinal", você quer dizer…')
    .setHelpText(
      'As duas coisas são bem diferentes de fazer, e eu preciso saber qual é.'
    )
    .setChoiceValues([
      'DINHEIRO. A cliente paga um PIX adiantado, e só depois disso o horário é dela.',
      'AVISO. Eu quero ser avisada no WhatsApp quando alguém marca. (isso já funciona)',
      'As duas coisas.',
      'Não sei explicar direito, me liga.',
    ])
    .showOtherOption(true)
    .setRequired(false);

  form.addSectionHeaderItem()
    .setTitle('Se for dinheiro, como eu imaginei que funcionaria')
    .setHelpText(
      'A cliente marca pelo site → recebe no WhatsApp o horário e a sua ' +
      'chave PIX → paga → manda o comprovante ali mesmo → o comprovante cai ' +
      'no SEU WhatsApp → você confere com o olho e aperta "confirmar".\n\n' +
      'Enquanto ela não pagar, o horário fica segurado por um tempinho e ' +
      'depois volta a ficar livre pra outra pessoa.\n\n' +
      'As perguntas abaixo são pra eu montar exatamente isso.'
    );

  form.addTextItem()
    .setTitle('🆕 Quanto você cobraria de sinal?')
    .setHelpText(
      'Pode ser um valor só pra tudo ("R$ 10 em qualquer serviço") ou ' +
      'diferente por serviço. Escreve do seu jeito.'
    )
    .setRequired(false);

  form.addMultipleChoiceItem()
    .setTitle('🆕 Se a cliente desmarcar, o sinal volta pra ela?')
    .setChoiceValues([
      'Volta, se ela avisar com um dia de antecedência',
      'Volta sempre',
      'Não volta — é justamente pra ela não desmarcar',
      'Não sei ainda',
    ])
    .setRequired(false);

  form.addMultipleChoiceItem()
    .setTitle('🆕 Quanto tempo eu seguro o horário esperando o pagamento?')
    .setHelpText(
      'Passado esse tempo sem o comprovante, o horário volta pra agenda e ' +
      'outra pessoa pode pegar. Sem isso, alguém marca, some, e o horário ' +
      'fica travado à toa.'
    )
    .setChoiceValues([
      '30 minutos',
      '1 hora',
      '2 horas',
      'Até o fim do dia',
      'Escolhe você',
    ])
    .setRequired(false);

  form.addTextItem()
    .setTitle('🆕 Qual é a sua chave PIX, e em nome de quem?')
    .setHelpText(
      '⚠️ Essa chave vai aparecer pra cliente no WhatsApp na hora de pagar. ' +
      'Pode ser CPF, telefone, e-mail ou aleatória — me diz qual você prefere ' +
      'que apareça. Se preferir não escrever aqui, me manda no WhatsApp.'
    )
    .setRequired(false);

  /* ==================================================================
     2. CONFERINDO O QUE VOCE JA ME DISSE
     ================================================================== */
  form.addPageBreakItem()
    .setTitle('2. Conferindo o que você já me disse')
    .setHelpText(
      'Tudo aqui já está marcado com a sua resposta de agosto. É só passar ' +
      'o olho e mudar o que mudou. Se estiver tudo certo, desce direto.'
    );

  form.addSectionHeaderItem()
    .setTitle('Seus serviços e preços, do jeito que estão no site hoje')
    .setHelpText(
      'Design de sobrancelha — R$ 25 (30 a 40 min)\n' +
      'Design com henna — R$ 30 (40 min a 1h)\n' +
      'Design masculino — R$ 25 (30 a 40 min)\n' +
      'Brow lamination — R$ 80 (1h a 1h30)\n' +
      'Maquiagem social — R$ 100 (40 min a 1h)\n' +
      'Curso de automaquiagem — R$ 120 (~2h, uma aluna por vez)'
    );

  form.addParagraphTextItem()
    .setTitle('Algum preço, tempo ou serviço mudou?')
    .setHelpText('Se estiver tudo certo, deixa em branco.')
    .setRequired(false);

  itens.precos = form.addMultipleChoiceItem()
    .setTitle('Os preços continuam aparecendo no site?')
    .setChoiceValues([
      'Mostrar todos os preços no site',
      'Mostrar só alguns',
      'Não mostrar preço nenhum',
    ])
    .setRequired(false);

  form.addSectionHeaderItem()
    .setTitle('Seus horários, do jeito que estão no site hoje')
    .setHelpText(
      'Segunda a sexta — Pereira Barreto, das 7h às 11h\n' +
      'Sábado — Bandeirantes D\'Oeste, das 11h às 22h\n' +
      'Domingo — você não atende\n\n' +
      'Uma cliente por vez, 10 minutos de intervalo entre uma e outra, e ' +
      'agendamento só a partir do dia seguinte.'
    );

  form.addParagraphTextItem()
    .setTitle('Algum horário mudou?')
    .setHelpText('Se estiver tudo certo, deixa em branco.')
    .setRequired(false);

  itens.domingo = form.addMultipleChoiceItem()
    .setTitle('Domingo continua fechado?')
    .setChoiceValues([
      'Não atendo domingo',
      'Atendo domingo sim (escrevo o horário acima)',
    ])
    .setRequired(false);

  itens.desmarcam = form.addMultipleChoiceItem()
    .setTitle('Quantas clientes desmarcam em cima da hora, hoje?')
    .setHelpText('Em agosto você me disse de 1 a 2 por semana. Melhorou, piorou?')
    .setChoiceValues([
      'Nenhuma, isso parou',
      'De 1 a 2 por semana',
      'De 3 a 5 por semana',
      'Mais que isso',
    ])
    .setRequired(false);

  itens.fotos = form.addMultipleChoiceItem()
    .setTitle('As fotos das clientes e das alunas podem continuar no site?')
    .setHelpText(
      'São fotos do seu Instagram. Os certificados das alunas estão com o ' +
      'nome apagado, pra não expor ninguém.'
    )
    .setChoiceValues([
      'Pode usar todas',
      'Pode, mas tem umas que eu quero tirar (falo no WhatsApp)',
      'Prefiro tirar as fotos de cliente',
    ])
    .setRequired(false);

  itens.visual = form.addMultipleChoiceItem()
    .setTitle('O visual do site continua com a sua cara?')
    .setChoiceValues([
      'Manter o dourado com bege, bem clean',
      'Quero mudar alguma coisa (falo no WhatsApp)',
    ])
    .setRequired(false);

  /* ==================================================================
     3. A CAPA
     ==================================================================
     O Kaina disse que ela ja escolheu e que pode ficar a que esta. Entao a
     pergunta nao e "escolhe entre A e B" — e "quer trocar?".
     ================================================================== */
  form.addPageBreakItem().setTitle('3. A foto que abre o site');

  form.addMultipleChoiceItem()
    .setTitle('🆕 Quer trocar a foto da abertura?')
    .setHelpText(
      'Hoje é a sua foto do ensaio, de blazer branco. Dá uma olhada em ' +
      SITE + ' e me diz.\n\n' +
      'Se você quiser outra, é só mandar a foto no meu WhatsApp — de ' +
      'preferência na melhor qualidade que você tiver, direto da galeria e ' +
      'não printada.'
    )
    .setChoiceValues([
      'Pode deixar a que está',
      'Quero trocar — mando a foto no seu WhatsApp',
    ])
    .setRequired(false);

  /* ==================================================================
     4. AS MENSAGENS AUTOMATICAS
     ================================================================== */
  form.addPageBreakItem()
    .setTitle('4. As mensagens automáticas')
    .setHelpText('O que sai sozinho pelo WhatsApp, sem você fazer nada.');

  itens.mensagens = form.addCheckboxItem()
    .setTitle('O que a cliente recebe sozinho')
    .setHelpText('Já está marcado o que você pediu em agosto. Pode marcar ou desmarcar.')
    .setChoiceValues([
      'Confirmação na hora que ela marca',
      'Lembrete um dia antes',
      'Agradecimento depois do atendimento',
    ])
    .setRequired(false);

  form.addMultipleChoiceItem()
    .setTitle('🆕 Posso mandar um "seu horário é daqui a pouco" meia hora antes?')
    .setHelpText(
      'Em agosto você disse que não queria lembrete de horas antes, e eu ' +
      'respeitei. Esse é diferente: é meia hora antes, quando ainda dá tempo ' +
      'de a pessoa sair de casa. É o que costuma evitar as que somem em cima ' +
      'da hora.\n\nO de um dia antes continua existindo do mesmo jeito.'
    )
    .setChoiceValues([
      'Pode mandar',
      'Não, só o de um dia antes',
      'Escolhe você',
    ])
    .setRequired(false);

  itens.avisoNovo = form.addMultipleChoiceItem()
    .setTitle('Você quer receber aviso no WhatsApp quando alguém marca?')
    .setChoiceValues([
      'Sim, quero ser avisada no WhatsApp',
      'Não precisa, eu olho o painel',
    ])
    .setRequired(false);

  itens.cancelamento = form.addMultipleChoiceItem()
    .setTitle('A cliente pode desmarcar sozinha pelo site?')
    .setChoiceValues([
      'Não. Ela tem que me chamar no WhatsApp',
      'Sim, pode desmarcar sozinha',
    ])
    .setRequired(false);

  itens.aprovacao = form.addMultipleChoiceItem()
    .setTitle('Quando alguém marca pelo site, já vale na hora?')
    .setHelpText(
      '⚠️ Em agosto você pediu pra aprovar cada uma na mão, e hoje está ' +
      'valendo na hora. Eu deixei assim de propósito e quero seu ok: se você ' +
      'tiver que aprovar cada uma, a cliente fica esperando sua resposta pra ' +
      'saber se o horário é dela — e se você demorar, ela desiste.\n\n' +
      'Se a gente colocar o sinal, a aprovação manual vira quase a mesma ' +
      'coisa: você confere o comprovante e confirma.'
    )
    .setChoiceValues([
      'Sim, quero aprovar cada uma antes de valer',
      'Não, pode valer na hora e eu só recebo o aviso',
      'Escolhe você',
    ])
    .setRequired(false);

  /* ==================================================================
     5. O ASSISTENTE
     ================================================================== */
  form.addPageBreakItem().setTitle('5. Uma coisa nova 🆕');

  form.addMultipleChoiceItem()
    .setTitle('🆕 Quer controlar sua agenda conversando no WhatsApp?')
    .setHelpText(
      'Ficou pronto: você manda mensagem pro número do studio e ele te ' +
      'responde. "quantas clientes amanhã?", "acha a Larissa pra mim", ' +
      '"quanto eu faturei esse mês?", "cancela a de quinta", "bloqueia sexta ' +
      'que eu vou viajar".\n\n' +
      'Quando for pra MUDAR alguma coisa, ele nunca faz sozinho: te pergunta ' +
      'antes, com o nome da cliente e o horário escritos, e só muda se você ' +
      'apertar "confirmar".\n\n' +
      'Você não precisa usar — o painel continua igual.'
    )
    .setChoiceValues([
      'Quero testar',
      'Prefiro só o painel mesmo',
      'Me explica melhor primeiro',
    ])
    .setRequired(false);

  /* ==================================================================
     6. OS DETALHES QUE FALTAM
     ================================================================== */
  form.addPageBreakItem().setTitle('6. Detalhes que faltam');

  form.addTextItem()
    .setTitle('🆕 Em Bandeirantes D\'Oeste, você atende onde?')
    .setHelpText(
      'Hoje o site só diz a cidade. Pode ser só o nome do lugar — o endereço ' +
      'completo não vai pro site, vai no WhatsApp da cliente depois que ela ' +
      'marca. Se preferir deixar só a cidade, escreve "deixa assim".'
    )
    .setRequired(false);

  form.addMultipleChoiceItem()
    .setTitle('🆕 Os textinhos que descrevem seus serviços')
    .setHelpText(
      'Aqueles textos embaixo de cada serviço fui eu que escrevi, chutando. ' +
      'Eles falam do SEU trabalho, e eu não quero deixar no ar nada que você ' +
      'não assinaria. Dá uma olhada em ' + SITE + '/#servicos'
    )
    .setChoiceValues([
      'Olhei e está tudo certo',
      'Tem coisa que eu mudaria (escrevo abaixo)',
      'Ainda não olhei',
    ])
    .setRequired(false);

  form.addParagraphTextItem()
    .setTitle('O que você mudaria nos textos?')
    .setRequired(false);

  itens.cnpj = form.addMultipleChoiceItem()
    .setTitle('Você abriu MEI, ou pensa em abrir?')
    .setHelpText(
      '⚠️ Isso muda uma coisa concreta: sem CNPJ, quem recebe sua mensagem ' +
      'automática vê só um número de telefone. Com MEI, dá pra aparecer ' +
      '"Studio Karol Carvalho" com a sua foto. É a única coisa que trava isso.'
    )
    .setChoiceValues([
      'Não tenho CNPJ nem MEI',
      'Já abri MEI',
      'Pretendo abrir',
      'Me explica pra que serve',
    ])
    .setRequired(false);

  form.addTextItem()
    .setTitle('🆕 Qual e-mail você quer que apareça pra contato?')
    .setHelpText('Se preferir não ter e-mail no site, escreve "não quero".')
    .setRequired(false);

  form.addMultipleChoiceItem()
    .setTitle('🆕 Você quer um endereço próprio pro site?')
    .setHelpText(
      'Hoje é ' + SITE + '. Um endereço tipo studiokarolcarvalho.com.br custa ' +
      'uns R$ 40 por ano. Não é obrigatório — o site funciona igual.'
    )
    .setChoiceValues([
      'Quero sim',
      'Por enquanto não',
      'Me explica melhor',
    ])
    .setRequired(false);

  /* ==================================================================
     7. A PARTE CHATA
     ================================================================== */
  form.addPageBreakItem()
    .setTitle('7. Agora a parte chata')
    .setHelpText('Prometo que é rápido, e é a que mais me ajuda.');

  form.addScaleItem()
    .setTitle('🆕 De 0 a 10, o quanto o site tem a sua cara?')
    .setBounds(0, 10)
    .setLabels('Nada a ver comigo', 'É exatamente eu')
    .setRequired(false);

  form.addParagraphTextItem()
    .setTitle('🆕 O que você NÃO gostou?')
    .setHelpText(
      'Pode ser direta, sério. Alguma foto, alguma palavra, alguma cor, ' +
      'alguma coisa que ficou faltando. Eu prefiro ouvir agora do que ' +
      'descobrir depois.'
    )
    .setRequired(false);

  form.addParagraphTextItem()
    .setTitle('🆕 O site já te ajudou em alguma coisa?')
    .setHelpText(
      'Tipo: alguma cliente marcou sozinha, alguém perguntou menos preço no ' +
      'direct, você trabalhou menos no WhatsApp. Ou nada mudou ainda — isso ' +
      'também é resposta.'
    )
    .setRequired(false);

  form.addMultipleChoiceItem()
    .setTitle('🆕 Passado o mês de teste, você quer continuar com o site?')
    .setHelpText(
      'Sem compromisso nenhum nessa resposta — é só pra eu saber se continuo ' +
      'melhorando ou se paro por aqui.'
    )
    .setChoiceValues([
      'Quero continuar',
      'Quero, mas preciso entender o valor primeiro',
      'Ainda estou decidindo',
      'Acho que não vai me servir',
    ])
    .setRequired(false);

  form.addParagraphTextItem()
    .setTitle('Quer falar mais alguma coisa?')
    .setRequired(false);

  /* ==================================================================
     O pre-preenchimento
     ================================================================== */
  var url = linkPrePreenchido(form, itens);

  Logger.log('');
  Logger.log('==============================================================');
  Logger.log('>>> MANDE ESTE LINK PRA KAROL (ja vem preenchido):');
  Logger.log(url);
  Logger.log('==============================================================');
  Logger.log('');
  Logger.log('link em branco (NAO mande este):');
  Logger.log(form.getPublishedUrl());
  Logger.log('');
  Logger.log('pra ver as respostas / editar o formulario:');
  Logger.log(form.getEditUrl());
  Logger.log('');
  Logger.log('--------------------------------------------------------------');
  Logger.log('MENSAGEM PRONTA PRA COLAR NO WHATSAPP:');
  Logger.log('');
  Logger.log(mensagemDoWhatsapp(url));

  return url;
}

/**
 * Monta a resposta com o que ela ja disse e devolve a URL pre-preenchida.
 *
 * ⚠️ `createResponse` RECUSA valor que nao esteja entre as opcoes da
 * pergunta, e ai o script inteiro para. Como um texto de opcao pode mudar
 * sem ninguem lembrar de mudar `JA_RESPONDIDO`, cada item vai dentro de um
 * try/catch: se um nao casar, os outros continuam e o log diz qual falhou.
 *
 * Um campo sem pre-preenchimento e um incomodo pequeno. Um script que para
 * no meio nao entrega link nenhum.
 */
function linkPrePreenchido(form, itens) {
  var resposta = form.createResponse();

  var pares = [
    ['precos', itens.precos, JA_RESPONDIDO.precos],
    ['domingo', itens.domingo, JA_RESPONDIDO.domingo],
    ['fotos', itens.fotos, JA_RESPONDIDO.fotos],
    ['visual', itens.visual, JA_RESPONDIDO.visual],
    ['cnpj', itens.cnpj, JA_RESPONDIDO.cnpj],
    ['cancelamento', itens.cancelamento, JA_RESPONDIDO.cancelamento],
    ['avisoNovo', itens.avisoNovo, JA_RESPONDIDO.avisoNovo],
    ['aprovacao', itens.aprovacao, JA_RESPONDIDO.aprovacao],
    ['desmarcam', itens.desmarcam, JA_RESPONDIDO.desmarcam],
    ['sinalQuis', itens.sinalQuis, JA_RESPONDIDO.sinalQuis],
  ];

  pares.forEach(function (p) {
    try {
      resposta = resposta.withItemResponse(
        p[1].asMultipleChoiceItem().createResponse(p[2])
      );
    } catch (e) {
      Logger.log('!! nao consegui pre-preencher "' + p[0] + '": ' + e);
    }
  });

  try {
    resposta = resposta.withItemResponse(
      itens.mensagens.asCheckboxItem().createResponse(JA_RESPONDIDO.mensagens)
    );
  } catch (e) {
    Logger.log('!! nao consegui pre-preencher "mensagens": ' + e);
  }

  return resposta.toPrefilledUrl();
}

/**
 * A mensagem que vai junto com o link.
 *
 * ⚠️ Isto importa tanto quanto o formulario. O briefing 2 provavelmente nao
 * foi respondido menos pelo conteudo e mais por como chegou: link seco, sem
 * tamanho, sem dizer o que acontece depois. Fica facil deixar pra amanha
 * pra sempre.
 *
 * Esta diz as tres coisas que tiram o peso: que ja vem preenchido, que da
 * pra responder pela metade, e qual e a pergunta que realmente importa.
 */
function mensagemDoWhatsapp(url) {
  return [
    'Karol! O site tá no ar 💛',
    '',
    'Dá uma olhada quando puder: ' + SITE,
    '',
    'Montei um formulário pra fechar os últimos detalhes. Ele já vem com ' +
      'TUDO que você me respondeu em agosto preenchido — você só confere e ' +
      'muda o que mudou. As perguntas novas estão marcadas com 🆕.',
    '',
    url,
    '',
    'Não precisa responder tudo. Se der, responde pelo menos a primeira: é ' +
      'sobre o sinal, aquilo que você falou que mais queria resolver. Eu ' +
      'preciso saber se você quis dizer o PIX adiantado ou só o aviso.',
  ].join('\n');
}
