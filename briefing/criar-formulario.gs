/**
 * BRIEFING KAROL CARVALHO — gerador do Google Forms
 * =================================================
 *
 * COMO USAR (leva 2 minutos):
 *  1. Abra https://script.google.com  ->  "Novo projeto"
 *  2. Apague o codigo de exemplo e cole ESTE ARQUIVO INTEIRO
 *  3. Clique em Executar (>) e escolha a funcao "criarFormulario"
 *  4. Autorize com sua conta Google (vai aparecer "app nao verificado"
 *     -> Avancado -> Acessar projeto sem titulo). E o seu proprio script.
 *  5. Abra o Registro de execucao (Ctrl+Enter). O link publico do
 *     formulario aparece la. Esse e o link que voce manda pra Karol.
 *
 * O formulario ja vem com as respostas que o Instagram dela entrega
 * pre-preenchidas como CONFIRMACAO, e nao como pergunta aberta.
 */

function criarFormulario() {
  var form = FormApp.create('Briefing — Site com Agenda | Karol Carvalho');

  form.setDescription(
    'Oi Karol! São algumas perguntinhas rápidas pra eu montar o site do jeito ' +
    'que funciona pra VOCÊ, e não do meu jeito.\n\n' +
    'Não precisa responder tudo de uma vez — dá pra parar e voltar depois.\n' +
    'Se alguma pergunta não fizer sentido pro seu trabalho, escreve "não se aplica" ' +
    'e segue. Leva uns 10 minutinhos.'
  );
  form.setProgressBar(true);
  form.setCollectEmail(false);
  form.setAllowResponseEdits(true);
  form.setConfirmationMessage(
    'Prontinho, obrigado! 💛 Com isso eu já consigo montar a primeira versão do site. ' +
    'Qualquer coisa que você lembrar depois, é só me chamar no WhatsApp.'
  );

  // ------------------------------------------------------------------
  // BLOCO 1 — CONFIRMAR O QUE EU JA SEI
  // ------------------------------------------------------------------
  form.addPageBreakItem()
    .setTitle('1. Só confirmando o básico')
    .setHelpText('Isso eu tirei do seu Instagram. Só me diz se está certo.');

  form.addCheckboxItem()
    .setTitle('Está tudo certo aqui? Marque o que estiver correto')
    .setHelpText('Se algo estiver errado, deixa desmarcado e me conta no campo abaixo.')
    .setChoiceValues([
      'Meu nome profissional é Karol Carvalho',
      'O nome do studio é Studio Karol Carvalho',
      'Atendo em Pereira Barreto e em Bandeirantes D’Oeste',
      'Meu WhatsApp de agendamento é (18) 99752-5291',
      'Meus serviços são: design simples, design com henna, design masculino, brow lamination, maquiagem social e curso de automaquiagem',
      'Tenho CNPJ / MEI'
    ])
    .setRequired(false);

  form.addParagraphTextItem()
    .setTitle('Tem alguma coisa errada ou faltando na lista de cima?')
    .setHelpText('Pode escrever do seu jeito, sem formalidade.')
    .setRequired(false);

  // ------------------------------------------------------------------
  // BLOCO 2 — SERVICOS E PRECOS
  // ------------------------------------------------------------------
  form.addPageBreakItem()
    .setTitle('2. Seus serviços')
    .setHelpText('Preço e tempo de cada um. Ex: "R$ 45 — 40 minutos"');

  var servicos = [
    'Design de sobrancelha simples',
    'Design com henna',
    'Design masculino',
    'Brow lamination',
    'Maquiagem social',
    'Curso de automaquiagem'
  ];
  servicos.forEach(function (s) {
    form.addTextItem()
      .setTitle(s)
      .setHelpText('Preço e quanto tempo demora. Ex: R$ 45 — 40 min')
      .setRequired(false);
  });

  form.addParagraphTextItem()
    .setTitle('Faz mais algum serviço que não está nessa lista?')
    .setRequired(false);

  form.addMultipleChoiceItem()
    .setTitle('Você quer que os preços apareçam no site?')
    .setHelpText('Não tem certo nem errado. Tem profissional que prefere mostrar tudo, tem quem prefira "sob consulta".')
    .setChoiceValues([
      'Sim, quero mostrar todos os preços',
      'Quero mostrar só alguns',
      'Prefiro não mostrar preço nenhum, só "consulte valores"'
    ])
    .showOtherOption(true)
    .setRequired(false);

  form.addTextItem()
    .setTitle('Qual serviço você MAIS quer vender?')
    .setHelpText('Esse vai aparecer em destaque, primeiro de todos, na página inicial.')
    .setRequired(false);

  // ------------------------------------------------------------------
  // BLOCO 3 — AGENDA REAL
  // ------------------------------------------------------------------
  form.addPageBreakItem()
    .setTitle('3. Sua agenda')
    .setHelpText('Essa é a parte mais importante. É o que faz o site nunca marcar num horário que você não pode.');

  form.addGridItem()
    .setTitle('Em que cidade você atende em cada dia da semana?')
    .setRows(['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'])
    .setColumns(['Pereira Barreto', 'Bandeirantes D’Oeste', 'Não atendo'])
    .setRequired(false);

  form.addParagraphTextItem()
    .setTitle('Que horas você começa e que horas você para, em cada dia?')
    .setHelpText('Pode escrever solto. Ex: "seg a sex das 9h às 18h, sábado só de manhã até 13h"')
    .setRequired(false);

  form.addTextItem()
    .setTitle('Você para pra almoçar? Que horas?')
    .setHelpText('Ex: das 12h às 13h30. Se não para, escreve "não paro".')
    .setRequired(false);

  form.addTextItem()
    .setTitle('Você precisa de um tempinho entre uma cliente e outra? Quantos minutos?')
    .setHelpText('Pra limpar, arrumar o material, respirar. Ex: 15 minutos.')
    .setRequired(false);

  form.addMultipleChoiceItem()
    .setTitle('Você atende mais de uma cliente ao mesmo tempo?')
    .setChoiceValues(['Não, uma de cada vez', 'Sim, às vezes duas'])
    .showOtherOption(true)
    .setRequired(false);

  form.addMultipleChoiceItem()
    .setTitle('Com quanta antecedência a cliente pode marcar?')
    .setHelpText('Ou seja: dá pra alguém marcar pra hoje daqui a 1 hora, ou você prefere um prazo mínimo?')
    .setChoiceValues([
      'Pode marcar pro mesmo dia, sem problema',
      'Só a partir do dia seguinte',
      'Preciso de pelo menos 2 dias de antecedência'
    ])
    .showOtherOption(true)
    .setRequired(false);

  form.addParagraphTextItem()
    .setTitle('Já tem alguma data que você sabe que NÃO vai atender?')
    .setHelpText('Viagem, curso, feriado, festa de família. Pode ir escrevendo o que lembrar.')
    .setRequired(false);

  // ------------------------------------------------------------------
  // BLOCO 4 — COMO O AGENDAMENTO DEVE FUNCIONAR
  // ------------------------------------------------------------------
  form.addPageBreakItem()
    .setTitle('4. Como você quer que funcione')
    .setHelpText('Aqui você escolhe o quanto o site decide sozinho e o quanto passa por você.');

  form.addMultipleChoiceItem()
    .setTitle('Quando a cliente marcar pelo site, o horário já fica reservado na hora?')
    .setHelpText('Ou você prefere olhar e dar um "ok" antes de confirmar?')
    .setChoiceValues([
      'Já fica reservado na hora, sem eu precisar fazer nada',
      'Eu prefiro confirmar antes, uma por uma'
    ])
    .setRequired(false);

  form.addMultipleChoiceItem()
    .setTitle('Você quer receber um aviso no seu WhatsApp toda vez que alguém marcar?')
    .setChoiceValues(['Sim', 'Não precisa, eu olho no painel'])
    .setRequired(false);

  form.addCheckboxItem()
    .setTitle('Quais mensagens automáticas você gostaria que a cliente recebesse?')
    .setHelpText('Marque quantas quiser. Dá pra ligar e desligar depois.')
    .setChoiceValues([
      'Confirmação na hora que ela marca',
      'Lembrete um dia antes',
      'Lembrete algumas horas antes',
      'Mensagem depois do atendimento agradecendo',
      'Aviso do endereço e como chegar'
    ])
    .setRequired(false);

  form.addMultipleChoiceItem()
    .setTitle('A cliente pode desmarcar sozinha pelo site?')
    .setChoiceValues([
      'Pode, até 24h antes',
      'Pode, até 2h antes',
      'Não. Prefiro que ela me chame no WhatsApp'
    ])
    .showOtherOption(true)
    .setRequired(false);

  form.addMultipleChoiceItem()
    .setTitle('Você gostaria de pedir um Pix de sinal pra segurar o horário?')
    .setHelpText('Muita gente faz isso pra evitar cliente que marca e não aparece. Não precisa ser agora — é só pra eu já deixar preparado.')
    .setChoiceValues([
      'Sim, quero desde já',
      'Talvez mais pra frente',
      'Não, prefiro sem sinal'
    ])
    .setRequired(false);

  // ------------------------------------------------------------------
  // BLOCO 5 — A DOR (bloco mais importante)
  // ------------------------------------------------------------------
  form.addPageBreakItem()
    .setTitle('5. Como é hoje')
    .setHelpText('Essas 4 perguntas são as que mais me ajudam. Pode responder com calma.');

  form.addParagraphTextItem()
    .setTitle('Me conta como funciona hoje: a cliente te chama no WhatsApp e aí?')
    .setHelpText('Do começo ao fim, do jeitinho que acontece. Ex: "ela pergunta o preço, eu mando a tabela, ela some, aí volta 3 dias depois..."')
    .setRequired(false);

  form.addParagraphTextItem()
    .setTitle('Quantas vezes por semana acontece de cliente marcar e não aparecer, ou desmarcar em cima da hora?')
    .setRequired(false);

  form.addParagraphTextItem()
    .setTitle('Qual é a pergunta que as clientes MAIS fazem antes de marcar?')
    .setHelpText('Preço? Endereço? Quanto tempo demora? Se dói? Se pode vir maquiada?')
    .setRequired(false);

  form.addParagraphTextItem()
    .setTitle('Se você pudesse resolver UMA única coisa do seu atendimento hoje, qual seria?')
    .setHelpText('Pode ser qualquer coisa, mesmo que pareça bobagem.')
    .setRequired(false);

  // ------------------------------------------------------------------
  // BLOCO 6 — PORTFOLIO E CONFIANCA
  // ------------------------------------------------------------------
  form.addPageBreakItem()
    .setTitle('6. Fotos e depoimentos')
    .setHelpText('É isso que faz a cliente nova confiar em você antes de te conhecer.');

  form.addMultipleChoiceItem()
    .setTitle('Posso usar as fotos de antes e depois do seu Instagram no site?')
    .setChoiceValues([
      'Pode usar todas',
      'Pode, mas eu vou te mandar quais',
      'Preciso pedir autorização pras clientes primeiro'
    ])
    .setRequired(false);

  form.addMultipleChoiceItem()
    .setTitle('Você tem prints de elogios de clientes guardados?')
    .setHelpText('Aqueles do destaque "FEEDBACK" servem perfeitamente.')
    .setChoiceValues(['Tenho vários', 'Tenho alguns', 'Não tenho guardado'])
    .setRequired(false);

  form.addParagraphTextItem()
    .setTitle('O que a cliente PRECISA saber antes de chegar no atendimento?')
    .setHelpText('Ex: vir sem maquiagem, não depilar antes, não usar a sobrancelha molhada nas primeiras 24h...')
    .setRequired(false);

  form.addParagraphTextItem()
    .setTitle('Se uma amiga te perguntasse "o que você faz?", o que você responderia?')
    .setHelpText('Com as suas palavras mesmo. Provavelmente vira a primeira frase do site.')
    .setRequired(false);

  // ------------------------------------------------------------------
  // BLOCO 7 — CURSO
  // ------------------------------------------------------------------
  form.addPageBreakItem()
    .setTitle('7. Curso de automaquiagem');

  form.addMultipleChoiceItem()
    .setTitle('O curso é presencial no studio, online, ou os dois?')
    .setChoiceValues(['Só presencial', 'Só online', 'Os dois'])
    .setRequired(false);

  form.addTextItem()
    .setTitle('Quanto custa e quanto tempo dura?')
    .setHelpText('Ex: R$ 250 — um sábado inteiro')
    .setRequired(false);

  form.addTextItem()
    .setTitle('Quantas alunas cabem por turma?')
    .setRequired(false);

  form.addMultipleChoiceItem()
    .setTitle('Como você abre as turmas?')
    .setChoiceValues([
      'Marco a data e divulgo',
      'Abro quando junta gente suficiente',
      'A aluna escolhe a data comigo'
    ])
    .showOtherOption(true)
    .setRequired(false);

  // ------------------------------------------------------------------
  // BLOCO 8 — VISUAL
  // ------------------------------------------------------------------
  form.addPageBreakItem()
    .setTitle('8. A cara do site')
    .setHelpText('Última parte, bem rapidinha.');

  form.addMultipleChoiceItem()
    .setTitle('O dourado com bege do seu feed é a cara da sua marca?')
    .setChoiceValues([
      'É sim, quero manter',
      'Gosto, mas quero dar uma modernizada',
      'Quero mudar completamente'
    ])
    .setRequired(false);

  form.addTextItem()
    .setTitle('Tem alguma cor que você NÃO quer ver no site?')
    .setRequired(false);

  form.addParagraphTextItem()
    .setTitle('Tem algum site ou perfil de outra profissional que você achou bonito?')
    .setHelpText('Pode colar o link ou só falar o nome. Vale até print.')
    .setRequired(false);

  form.addParagraphTextItem()
    .setTitle('Tem alguma coisa que você NÃO quer no site de jeito nenhum?')
    .setRequired(false);

  // ------------------------------------------------------------------
  Logger.log('=========================================================');
  Logger.log('LINK PRA MANDAR PRA KAROL:');
  Logger.log(form.getPublishedUrl());
  Logger.log('');
  Logger.log('LINK PRA VOCE EDITAR O FORMULARIO:');
  Logger.log(form.getEditUrl());
  Logger.log('=========================================================');

  return form.getPublishedUrl();
}
