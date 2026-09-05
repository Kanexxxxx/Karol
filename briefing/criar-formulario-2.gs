/**
 * BRIEFING 2 — KAROL CARVALHO · as decisoes que faltam
 * ====================================================
 *
 * O primeiro briefing montou o site. Este fecha o que ficou em aberto:
 * a capa, o sinal, o cancelamento, os enderecos e a aprovacao dos textos.
 *
 * COMO USAR (2 minutos):
 *  1. Abra https://script.google.com  ->  "Novo projeto"
 *  2. Apague o codigo de exemplo e cole ESTE ARQUIVO INTEIRO
 *  3. Executar (>) e escolher a funcao "criarFormulario2"
 *  4. Autorizar com a sua conta Google
 *  5. Ctrl+Enter abre o Registro de execucao com o link publico
 *
 * ANTES DE RODAR: preencha as duas URLs em CAPAS. Sao as duas fotos de
 * abertura entre as quais ela vai escolher. Se ficarem em branco, o
 * formulario ainda funciona — a pergunta aparece sem as imagens e voce
 * manda as fotos por WhatsApp.
 */

var CAPAS = {
  a: 'COLE_AQUI_O_LINK_DA_CAPA_ATUAL',      // terno branco, fundo cinza
  b: 'COLE_AQUI_O_LINK_DA_CAPA_LARANJA'     // calca laranja, fundo quente
};

function criarFormulario2() {
  var form = FormApp.create('Karol — as ultimas decisoes do site');

  form.setDescription(
    'Oi Karol! O site ja esta de pe e funcionando. Faltam umas decisoes que ' +
    'so voce pode tomar — principalmente sobre o sinal, que voce pediu e a ' +
    'gente ainda nao sabe como voce quer.\n\n' +
    'Nao precisa responder tudo de uma vez. Se alguma pergunta nao fizer ' +
    'sentido, escreve "nao sei" e segue: "nao sei" tambem me ajuda.\n' +
    'Leva uns 10 minutinhos.'
  );
  form.setProgressBar(true);
  form.setCollectEmail(false);
  form.setAllowResponseEdits(true);
  form.setConfirmationMessage(
    'Obrigado! Com isso eu fecho o que falta. ' +
    'Qualquer coisa que lembrar depois, me chama no WhatsApp.'
  );

  // ------------------------------------------------------------------
  // 1. A CAPA
  // ------------------------------------------------------------------
  form.addPageBreakItem()
    .setTitle('1. Qual foto fica na abertura?')
    .setHelpText('E a primeira coisa que a cliente ve quando abre o site.');

  [['Opcao A', CAPAS.a], ['Opcao B', CAPAS.b]].forEach(function (par) {
    try {
      form.addImageItem().setTitle(par[0]).setImage(UrlFetchApp.fetch(par[1]).getBlob());
    } catch (e) {
      form.addSectionHeaderItem()
        .setTitle(par[0])
        .setHelpText('(mando a foto por WhatsApp)');
    }
  });

  form.addMultipleChoiceItem()
    .setTitle('Qual voce prefere?')
    .setChoiceValues(['Opcao A', 'Opcao B', 'Tanto faz, escolhe voce'])
    .setRequired(true);

  // ------------------------------------------------------------------
  // 2. O SINAL
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

  // ------------------------------------------------------------------
  // 3. COMO O DINHEIRO CHEGA — a decisao tecnica, em portugues
  // ------------------------------------------------------------------
  form.addPageBreakItem()
    .setTitle('3. Como voce quer receber esse sinal?')
    .setHelpText('Existem dois caminhos. Um e mais simples, o outro e mais automatico.');

  form.addMultipleChoiceItem()
    .setTitle('Qual jeito voce prefere?')
    .setHelpText(
      'JEITO SIMPLES: o site mostra sua chave PIX pra cliente, ela paga pelo ' +
      'banco dela e te manda o comprovante no WhatsApp. Voce confere e ' +
      'confirma no painel. O dinheiro cai direto na sua conta, sem taxa ' +
      'nenhuma. A parte chata: voce precisa olhar o comprovante.\n\n' +
      'JEITO AUTOMATICO: o site cobra sozinho por um sistema de pagamento ' +
      '(tipo Mercado Pago). Confirma sozinho, voce nao faz nada. A parte ' +
      'chata: o sistema fica com uma porcentagem de cada pagamento, o ' +
      'dinheiro demora a cair, e voce passa a ter mais um aplicativo pra ' +
      'controlar.'
    )
    .setChoiceValues([
      'Jeito simples (PIX na mao, sem taxa)',
      'Jeito automatico (sistema cobra sozinho, com taxa)',
      'Nao sei, me explica de novo'
    ])
    .setRequired(true);

  form.addTextItem()
    .setTitle('Se for o jeito simples: qual chave PIX?')
    .setHelpText('Telefone, CPF ou e-mail. Se preferir nao escrever aqui, me manda no WhatsApp.')
    .setRequired(false);

  // ------------------------------------------------------------------
  // 4. OS AVISOS AUTOMATICOS
  // ------------------------------------------------------------------
  form.addPageBreakItem()
    .setTitle('4. Os avisos automaticos')
    .setHelpText(
      'No primeiro briefing voce pediu quatro mensagens: confirmacao na hora ' +
      'que a cliente marca, lembrete um dia antes, agradecimento depois do ' +
      'atendimento, e um aviso pra VOCE quando entra agendamento novo.\n\n' +
      'Os textos ja estao escritos. O que falta decidir e COMO eles saem.'
    );

  form.addSectionHeaderItem()
    .setTitle('Antes de escolher, o que vale saber')
    .setHelpText(
      'Tem um detalhe do WhatsApp que muda tudo: quando a CLIENTE manda ' +
      'mensagem primeiro, abre uma janela em que voce responde a vontade, de ' +
      'graca. O que custa e a empresa puxar conversa do nada. Por isso a ' +
      'opcao 1 sai de graca: a cliente aperta enviar UMA vez e dali em ' +
      'diante tudo e automatico. ' +
      'Existem programas gratuitos que prometem enviar sozinho sem isso, mas ' +
      'eles fingem ser o WhatsApp Web e a Meta bane o numero quando percebe. ' +
      'Seria o SEU numero, o mesmo do Instagram. Por isso nao esta na lista.'
    );

  form.addMultipleChoiceItem()
    .setTitle('Como voce quer que essas mensagens sejam enviadas?')
    .setHelpText('Se ficar em duvida entre duas, marca a que parecer mais a sua cara e a gente conversa.')
    .setChoiceValues([
      '1) WhatsApp: a cliente aperta enviar uma vez, o resto sai sozinho (de graca, sem risco)',
      '2) WhatsApp automatico de verdade, pelo canal oficial da Meta (ninguem aperta nada, mas da trabalho pra montar e pede um chip so do trabalho)',
      '3) Por e-mail (sai 100% sozinho, de graca e sem risco nenhum — mas a cliente precisa deixar o e-mail dela, e tem gente que nao le)',
      '4) WhatsApp e e-mail juntos',
      '5) Eu mesma envio, com a mensagem ja pronta pra copiar (de graca, mas depende de mim)',
      '6) Por enquanto nada automatico, a cliente ve a confirmacao na tela do site',
      '7) Nao sei, me explica melhor'
    ])
    .setRequired(true);

  form.addMultipleChoiceItem()
    .setTitle('E como VOCE prefere ser avisada de um agendamento novo?')
    .setHelpText('Pode ser diferente do que a cliente recebe.')
    .setChoiceValues([
      'WhatsApp',
      'E-mail',
      'Os dois',
      'So olhar o painel quando eu quiser, sem aviso'
    ])
    .setRequired(true);

  form.addTextItem()
    .setTitle('Se for por e-mail, qual e o seu?')
    .setHelpText('So preenche se voce escolheu e-mail em alguma das duas perguntas acima.')
    .setRequired(false);

  form.addMultipleChoiceItem()
    .setTitle('O WhatsApp (18) 99752-5291 e so do trabalho?')
    .setHelpText('Se for o seu pessoal tambem, o envio automatico fica mais arriscado.')
    .setChoiceValues([
      'E so do trabalho',
      'E o meu pessoal tambem',
      'Tenho outro numero so pro trabalho'
    ])
    .setRequired(true);

  // ------------------------------------------------------------------
  // 4. QUANDO DA ERRADO
  // ------------------------------------------------------------------
  form.addPageBreakItem()
    .setTitle('5. Quando a cliente desmarca')
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
    .setChoiceValues(['Fico com o sinal', 'Devolvo mesmo assim', 'Depende, falo com ela', 'Nao sei'])
    .setRequired(false);

  // ------------------------------------------------------------------
  // 5. VOCE APROVANDO CADA HORARIO
  // ------------------------------------------------------------------
  form.addPageBreakItem()
    .setTitle('6. Voce quer aprovar cada agendamento?')
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
  // 6. ONDE VOCE ATENDE
  // ------------------------------------------------------------------
  form.addPageBreakItem()
    .setTitle('7. Os enderecos')
    .setHelpText(
      'A cliente receberia o endereco no WhatsApp junto da confirmacao. ' +
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
  // 7. SEUS HORARIOS
  // ------------------------------------------------------------------
  form.addPageBreakItem()
    .setTitle('8. Conferindo seus horarios')
    .setHelpText('E isto que o site esta oferecendo hoje. Se estiver errado, a cliente marca na hora errada.');

  form.addCheckboxItem()
    .setTitle('Esta certo? Marque o que estiver correto')
    .setChoiceValues([
      'Segunda a sexta eu atendo em Pereira Barreto, das 7h as 11h',
      'Sabado eu atendo em Bandeirantes DOeste, das 11h as 22h',
      'Domingo eu nao atendo',
      'Deixo 10 minutos entre uma cliente e outra',
      'Nunca atendo no mesmo dia que a pessoa marca'
    ])
    .setRequired(false);

  form.addParagraphTextItem()
    .setTitle('Tem algo errado na lista de cima?')
    .setRequired(false);

  // ------------------------------------------------------------------
  // 8. OS TEXTOS DOS SERVICOS
  // ------------------------------------------------------------------
  form.addPageBreakItem()
    .setTitle('9. Os textos que estao no site')
    .setHelpText(
      'Estas descricoes fui EU que escrevi, chutando. Sao afirmacoes sobre o ' +
      'seu trabalho, entao preciso do seu aval antes de ficarem no ar.'
    );

  var textos = [
    ['Design de sobrancelha', 'Modelagem da sobrancelha de acordo com o formato do seu rosto.'],
    ['Design com henna', 'A modelagem com aplicacao de henna, que preenche as falhas e marca o desenho.'],
    ['Design masculino', 'Modelagem masculina, com acabamento discreto e natural.'],
    ['Brow lamination', 'Alinhamento dos fios, que deixa a sobrancelha mais cheia e penteada.'],
    ['Maquiagem social', 'Maquiagem para festa, casamento, formatura e ensaio.'],
    ['Curso de automaquiagem', 'Aula individual e presencial pra voce aprender a se maquiar sozinha. Voce sai com certificado.']
  ];
  textos.forEach(function (t) {
    form.addTextItem()
      .setTitle(t[0])
      .setHelpText('Esta escrito: "' + t[1] + '"  — se estiver bom, escreve "ok". Se nao, escreve do seu jeito.')
      .setRequired(false);
  });

  form.addTextItem()
    .setTitle('Qual servico voce MAIS quer vender?')
    .setHelpText('Ficou em branco no primeiro formulario. Serve pra eu dar destaque pra ele no site.')
    .setRequired(false);

  // ------------------------------------------------------------------
  // 9. AS FOTOS
  // ------------------------------------------------------------------
  form.addPageBreakItem()
    .setTitle('10. As fotos das clientes')
    .setHelpText('O site usa fotos do seu Instagram. Sao rostos de pessoas reais, e algumas alunas aparecem com o certificado na mao, com o nome delas.');

  form.addParagraphTextItem()
    .setTitle('Tem alguma foto que voce quer tirar do site?')
    .setHelpText(
      'Voce ja me liberou todas, entao e so se tiver alguma especifica que ' +
      'voce prefere que saia. Pode descrever do seu jeito ("a da menina de ' +
      'blusa amarela"). Se estiver tudo bem, deixa em branco.'
    )
    .setRequired(false);

  form.addMultipleChoiceItem()
    .setTitle('Voce tem videos que gostaria de por no site?')
    .setChoiceValues(['Tenho e mando', 'Tenho mas prefiro so foto', 'Nao tenho'])
    .setRequired(false);

  // ------------------------------------------------------------------
  // 10. A PARTE BUROCRATICA
  // ------------------------------------------------------------------
  form.addPageBreakItem()
    .setTitle('11. A parte chata')
    .setHelpText('Rapidinho. Isso decide o que da pra usar de sistema de pagamento.');

  form.addMultipleChoiceItem()
    .setTitle('Continua sem CNPJ/MEI?')
    .setHelpText('Voce me disse que nao tinha. So confirmando, porque isso decide o que da pra usar de pagamento.')
    .setChoiceValues([
      'Continuo sem',
      'Tirei MEI depois disso',
      'Estou tirando agora',
      'Tenho CNPJ'
    ])
    .setRequired(true);

  // ------------------------------------------------------------------
  // 11. SOLTO
  // ------------------------------------------------------------------
  form.addPageBreakItem().setTitle('12. Por ultimo');

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
