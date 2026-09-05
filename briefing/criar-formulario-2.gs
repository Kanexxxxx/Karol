/**
 * BRIEFING 2 — KAROL CARVALHO · agendamento com sinal
 * ===================================================
 *
 * O primeiro briefing montou o site. Este resolve o que ficou em aberto e
 * o que o agendamento com pagamento exige antes de existir.
 *
 * COMO USAR (2 minutos):
 *  1. Abra https://script.google.com  ->  "Novo projeto"
 *  2. Apague o codigo de exemplo e cole ESTE ARQUIVO INTEIRO
 *  3. Executar (>) e escolher a funcao "criarFormulario2"
 *  4. Autorizar com a sua conta Google
 *  5. Ctrl+Enter abre o Registro de execucao com o link publico do form
 *
 * ANTES DE ENVIAR: troque as duas URLs em CAPAS pelas imagens das duas
 * versoes da capa, senao ela escolhe no escuro.
 */

// Suba as duas capas em algum lugar publico (Drive com link aberto, o
// proprio site, Imgur) e cole aqui.
var CAPAS = {
  atual: 'COLE_AQUI_O_LINK_DA_CAPA_ATUAL',
  laranja: 'COLE_AQUI_O_LINK_DA_CAPA_LARANJA'
};

function criarFormulario2() {
  var form = FormApp.create('Karol — as ultimas decisoes do site');

  form.setDescription(
    'Oi Karol! O site ja esta de pe. Faltam umas decisoes que so voce pode ' +
    'tomar, principalmente sobre o sinal: voce pediu, e a gente ainda nao ' +
    'sabe como voce quer.\n\n' +
    'Nao precisa responder tudo de uma vez. Se alguma pergunta nao fizer ' +
    'sentido, escreve "nao sei" e segue. "Nao sei" tambem me ajuda.\n' +
    'Leva uns 10 minutinhos.'
  );
  form.setProgressBar(true);
  form.setCollectEmail(false);
  form.setAllowResponseEdits(true);
  form.setConfirmationMessage(
    'Obrigado! Com isso eu fecho o agendamento com sinal. ' +
    'Qualquer coisa que lembrar depois, me chama no WhatsApp.'
  );

  // ------------------------------------------------------------------
  // 1. A CAPA DO SITE
  // ------------------------------------------------------------------
  form.addPageBreakItem()
    .setTitle('1. Qual capa voce prefere?')
    .setHelpText('Sao duas versoes da mesma pagina, mudando so a foto de abertura.');

  var capas = [
    ['Versao A — a capa de hoje', CAPAS.atual],
    ['Versao B — a do fundo laranja', CAPAS.laranja]
  ];
  capas.forEach(function (par) {
    try {
      form.addImageItem()
        .setTitle(par[0])
        .setImage(UrlFetchApp.fetch(par[1]).getBlob());
    } catch (e) {
      // link nao preenchido ou fora do ar: segue sem a imagem
      form.addSectionHeaderItem()
        .setTitle(par[0])
        .setHelpText('(a imagem nao carregou — mando por WhatsApp)');
    }
  });

  form.addMultipleChoiceItem()
    .setTitle('Qual delas fica no site?')
    .setChoiceValues(['Versao A', 'Versao B', 'Tanto faz, escolhe voce'])
    .setRequired(true);

  form.addParagraphTextItem()
    .setTitle('Quer mudar alguma coisa na que escolheu?')
    .setRequired(false);

  // ------------------------------------------------------------------
  // 2. O SINAL — o coracao deste formulario
  // ------------------------------------------------------------------
  form.addPageBreakItem()
    .setTitle('2. O sinal (a parte mais importante)')
    .setHelpText(
      'No primeiro briefing voce disse que queria "agendamento com sinal": a ' +
      'cliente paga um valor pra segurar o horario e assim nao some. So que ' +
      'nao da pra construir sem saber como VOCE quer. Nao tem resposta errada.'
    );

  form.addMultipleChoiceItem()
    .setTitle('Voce quer mesmo cobrar um sinal pra marcar?')
    .setHelpText('Pensa no dia a dia: cliente antiga, que nunca te deu problema, tambem vai ter que pagar antes.')
    .setChoiceValues([
      'Sim, de todo mundo',
      'Sim, mas so nos servicos mais caros',
      'Nao, prefiro sem sinal por enquanto',
      'Nao sei, me explica melhor'
    ])
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('Esse valor e uma ENTRADA ou uma TAXA?')
    .setHelpText(
      'Entrada = abate do preco. Design de R$ 25: ela paga R$ 10 agora e R$ 15 no dia.\n' +
      'Taxa = valor a mais, so pra segurar. Ela paga R$ 10 agora e os R$ 25 inteiros no dia.'
    )
    .setChoiceValues(['Entrada (abate do preco)', 'Taxa (valor a mais)', 'Nao sei'])
    .setRequired(true);

  form.addTextItem()
    .setTitle('Quanto?')
    .setHelpText('Valor fixo (ex: R$ 10) ou uma parte (ex: metade). Se muda por servico, escreve aqui.')
    .setRequired(false);

  form.addTextItem()
    .setTitle('Qual chave PIX recebe?')
    .setHelpText('Telefone, CPF ou e-mail. Se preferir nao escrever aqui, me manda no WhatsApp.')
    .setRequired(false);

  // ------------------------------------------------------------------
  // 3. QUANDO DA ERRADO
  // ------------------------------------------------------------------
  form.addPageBreakItem()
    .setTitle('3. Quando a cliente desmarca')
    .setHelpText('Isso vai ficar escrito no site, entao precisa ser a sua regra de verdade.');

  form.addMultipleChoiceItem()
    .setTitle('Se ela desmarcar, voce devolve o sinal?')
    .setChoiceValues([
      'Devolvo se ela avisar com antecedencia',
      'Nao devolvo em nenhum caso',
      'Devolvo sempre, o sinal e so pra ela se comprometer',
      'Nao sei'
    ])
    .setRequired(true);

  form.addTextItem()
    .setTitle('Se depende de antecedencia, quanto tempo antes?')
    .setHelpText('Ex: "ate 24h antes eu devolvo".')
    .setRequired(false);

  form.addMultipleChoiceItem()
    .setTitle('E se ela simplesmente nao aparecer?')
    .setChoiceValues([
      'Fico com o sinal',
      'Devolvo mesmo assim',
      'Depende, falo com ela',
      'Nao sei'
    ])
    .setRequired(false);

  // ------------------------------------------------------------------
  // 4. VOCE APROVANDO CADA HORARIO
  // ------------------------------------------------------------------
  form.addPageBreakItem()
    .setTitle('4. Voce quer aprovar cada agendamento?')
    .setHelpText(
      'Voce pediu isso no primeiro briefing. Vale pensar junto com o sinal: ' +
      'se a cliente PAGA e depois voce recusa, alguem tem que devolver o ' +
      'dinheiro na mao. Da trabalho e da mal-estar.'
    );

  form.addMultipleChoiceItem()
    .setTitle('Como voce prefere?')
    .setChoiceValues([
      'Quero aprovar cada um antes de valer',
      'Se ela pagou o sinal, ja pode valer direto',
      'Nao sei, me explica melhor'
    ])
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('Em quanto tempo voce consegue responder?')
    .setHelpText('A cliente fica esperando. Preciso saber o que prometer pra ela na tela.')
    .setChoiceValues([
      'Em minutos, olho o WhatsApp toda hora',
      'No mesmo dia',
      'As vezes demoro, pode ser no dia seguinte',
      'Nao sei dizer'
    ])
    .setRequired(false);

  // ------------------------------------------------------------------
  // 5. O ENDERECO
  // ------------------------------------------------------------------
  form.addPageBreakItem()
    .setTitle('5. Onde voce atende')
    .setHelpText(
      'A ideia e a cliente receber o endereco no WhatsApp junto da confirmacao. ' +
      'Ele NAO fica publico no site: so vai pra quem ja marcou.'
    );

  form.addParagraphTextItem()
    .setTitle('Endereco em Pereira Barreto')
    .setHelpText('Rua, numero e um ponto de referencia.')
    .setRequired(false);

  form.addParagraphTextItem()
    .setTitle('Endereco em Bandeirantes DOeste')
    .setHelpText('Este ninguem sabe ainda. Se for na casa de alguem ou em outro salao, me conta como funciona.')
    .setRequired(false);

  // ------------------------------------------------------------------
  // 6. A PARTE BUROCRATICA (mas decide tudo)
  // ------------------------------------------------------------------
  form.addPageBreakItem()
    .setTitle('6. A parte chata')
    .setHelpText(
      'Prometo que e rapido. Isso decide QUAL sistema de pagamento da pra usar: ' +
      'a maioria so aceita quem tem CNPJ.'
    );

  form.addMultipleChoiceItem()
    .setTitle('Voce tem CNPJ ou MEI?')
    .setChoiceValues(['Nao tenho', 'Tenho MEI', 'Tenho CNPJ', 'Estou tirando'])
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('Voce ja usa alguma maquininha ou app de pagamento?')
    .setHelpText('Mercado Pago, PagBank, InfinitePay, Stone, SumUp...')
    .setChoiceValues([
      'Nao uso nenhum',
      'Uso Mercado Pago',
      'Uso PagBank / PagSeguro',
      'Uso outro (escrevo abaixo)'
    ])
    .setRequired(false);

  form.addTextItem()
    .setTitle('Se usa outro, qual?')
    .setRequired(false);

  form.addMultipleChoiceItem()
    .setTitle('O WhatsApp (18) 99752-5291 e so do trabalho?')
    .setHelpText(
      'Importa porque as mensagens automaticas sairiam por ele, e numero ' +
      'pessoal com envio automatico corre risco de bloqueio pelo WhatsApp.'
    )
    .setChoiceValues([
      'E so do trabalho',
      'E o meu pessoal tambem',
      'Tenho outro numero so pro trabalho'
    ])
    .setRequired(true);

  // ------------------------------------------------------------------
  // 7. AS FOTOS
  // ------------------------------------------------------------------
  form.addPageBreakItem()
    .setTitle('7. As fotos das clientes')
    .setHelpText('O site usa fotos do seu Instagram. Sao rostos de pessoas reais.');

  form.addMultipleChoiceItem()
    .setTitle('Voce confirma que pode usar as fotos das clientes e alunas no site?')
    .setChoiceValues([
      'Sim, todas podem',
      'Quase todas, tem umas que prefiro tirar',
      'Prefiro conferir uma por uma antes'
    ])
    .setRequired(true);

  form.addParagraphTextItem()
    .setTitle('Tem alguma que voce quer tirar?')
    .setHelpText('Pode descrever do seu jeito ("a da menina de blusa amarela").')
    .setRequired(false);

  // ------------------------------------------------------------------
  // 8. SOLTO
  // ------------------------------------------------------------------
  form.addPageBreakItem().setTitle('8. Por ultimo');

  form.addParagraphTextItem()
    .setTitle('Tem alguma coisa no site que voce nao gostou?')
    .setHelpText('Pode falar sem medo. E mais facil mudar agora do que depois.')
    .setRequired(false);

  form.addParagraphTextItem()
    .setTitle('E alguma coisa que voce queria e nao tem?')
    .setRequired(false);

  Logger.log('Formulario criado.');
  Logger.log('Link pra Karol: ' + form.getPublishedUrl());
  Logger.log('Link de edicao: ' + form.getEditUrl());
}
