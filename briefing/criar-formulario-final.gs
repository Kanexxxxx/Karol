/**
 * BRIEFING FINAL — KAROL CARVALHO
 * ===============================
 *
 * O formulario que encerra o projeto. Junta tudo que ja foi perguntado,
 * JA PREENCHIDO com o que ela respondeu em 29/08/2026, e acrescenta todas
 * as pecas que faltam pra fechar.
 *
 * ---------------------------------------------------------------------
 * A IDEIA
 * ---------------------------------------------------------------------
 *
 * Ele e GRANDE de proposito. O objetivo nao e ser rapido de responder —
 * e nao sobrar pergunta nenhuma depois. Quem torna isso possivel e o
 * PRE-PREENCHIMENTO: metade do formulario ja vem com a resposta dela de
 * agosto marcada, entao o que ela realmente responde e so o que ninguem
 * sabe ainda.
 *
 * As perguntas novas estao marcadas com 🆕. Nenhuma e obrigatoria.
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
 * ⚠️ MANDE O LINK PRE-PREENCHIDO, nao o link normal. O normal abre tudo
 * em branco e joga fora a razao de ser deste formulario.
 *
 * ⚠️ ESTE ARQUIVO TEM ACENTO no que a Karol le. O editor do Apps Script e
 * UTF-8 e aguenta; cole direto, sem passar por bloco de notas.
 */

var SITE = 'https://karol-zeta.vercel.app';

/**
 * O que ela ja respondeu em 29/08/2026.
 *
 * Cada valor tem que ser IGUAL a uma das opcoes da pergunta, senao o Apps
 * Script recusa o pre-preenchimento. Mudou um texto de opcao la embaixo?
 * Mude aqui tambem.
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
  desmarcam: 'De 1 a 2 por semana',
  sinalQuis: 'Sim, quero desde já',
  mensagens: [
    'Confirmação na hora que ela marca',
    'Lembrete um dia antes',
    'Agradecimento depois do atendimento',
  ],
};

function criarFormularioFinal() {
  var form = FormApp.create('Karol — fechando o site');

  form.setDescription(
    'Oi, Karol! Que bom que você voltou. 💛\n\n' +
    'O site está no ar e funcionando: a agenda, os preços, a sua página, e ' +
    'o WhatsApp já responde as clientes sozinho.\n\n' +
    'Esse é o último formulário — depois dele eu fecho tudo.\n\n' +
    '⚠️ Ele parece grande, mas metade JÁ ESTÁ RESPONDIDA: coloquei tudo que ' +
    'você me falou em agosto já marcado. Você só confere e muda o que mudou.\n\n' +
    'O que eu preciso mesmo são as perguntas com 🆕. Nada é obrigatório — ' +
    'responde o que der e manda assim mesmo.'
  );
  form.setCollectEmail(false);
  form.setAllowResponseEdits(true);
  form.setProgressBar(true);
  form.setConfirmationMessage(
    'Pronto, Karol! Agora eu fecho o resto. Obrigado pela paciência. 💛'
  );

  var itens = {};

  /* ==================================================================
     1. A TAXA / O SINAL — a unica coisa que trava trabalho
     ================================================================== */
  form.addPageBreakItem()
    .setTitle('1. A taxa pra segurar o horário 🆕')
    .setHelpText(
      'Essa é a parte mais importante do formulário. Em agosto você escreveu ' +
      'que a coisa que mais queria resolver era "a questão do agendamento ' +
      'com sinal" — e eu não quero construir a coisa errada.'
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
    .setChoiceValues([
      'DINHEIRO. A cliente paga um PIX adiantado, e só depois disso o horário é dela.',
      'AVISO. Eu quero ser avisada no WhatsApp quando alguém marca. (isso já funciona)',
      'As duas coisas.',
      'Não sei explicar direito, me liga.',
    ])
    .showOtherOption(true)
    .setRequired(false);

  form.addSectionHeaderItem()
    .setTitle('Como eu pretendo fazer, se for dinheiro')
    .setHelpText(
      'A cliente marca pelo site → recebe no WhatsApp o horário e a sua ' +
      'chave PIX → paga → manda o comprovante ali mesmo na conversa → o ' +
      'comprovante cai no SEU WhatsApp → você olha e aperta "confirmar".\n\n' +
      'Enquanto ela não pagar, o horário fica segurado por um tempinho e ' +
      'depois volta a ficar livre pra outra pessoa.\n\n' +
      '⚠️ Importante saber: eu não tenho como conferir se o comprovante é ' +
      'verdadeiro — quem confere é você, com o olho, igual você já faz hoje. ' +
      'O site só entrega ele na sua mão.'
    );

  form.addTextItem()
    .setTitle('🆕 Quanto você cobraria de taxa?')
    .setHelpText('Pode ser um valor só ("R$ 10 em tudo") ou diferente por serviço.')
    .setRequired(false);

  form.addMultipleChoiceItem()
    .setTitle('🆕 Se a cliente desmarcar, a taxa volta pra ela?')
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
      'Passado esse tempo sem o comprovante, o horário volta pra agenda. Sem ' +
      'isso, alguém marca, some, e o horário fica travado à toa.'
    )
    .setChoiceValues(['30 minutos', '1 hora', '2 horas', 'Até o fim do dia', 'Escolhe você'])
    .setRequired(false);

  form.addTextItem()
    .setTitle('🆕 Qual é a sua chave PIX, e em nome de quem?')
    .setHelpText(
      '⚠️ Ela vai aparecer pra cliente no WhatsApp na hora de pagar. Pode ser ' +
      'CPF, telefone, e-mail ou aleatória. Se preferir não escrever aqui, me ' +
      'manda no WhatsApp.'
    )
    .setRequired(false);

  form.addMultipleChoiceItem()
    .setTitle('🆕 Vale pra todo serviço, ou só pros mais caros?')
    .setChoiceValues([
      'Todos os serviços',
      'Só os de R$ 80 ou mais (brow lamination, maquiagem, curso)',
      'Só o curso',
      'Escolhe você',
    ])
    .setRequired(false);

  /* ==================================================================
     2. AS FOTOS — inclui os certificados
     ================================================================== */
  form.addPageBreakItem()
    .setTitle('2. As fotos do site')
    .setHelpText('Dá uma passada em ' + SITE + ' antes de responder essa parte.');

  itens.fotos = form.addMultipleChoiceItem()
    .setTitle('As fotos das clientes podem continuar no site?')
    .setChoiceValues([
      'Pode usar todas',
      'Pode, mas tem umas que eu quero tirar (falo no WhatsApp)',
      'Prefiro tirar as fotos de cliente',
    ])
    .setRequired(false);

  form.addMultipleChoiceItem()
    .setTitle('🆕 As fotos das alunas com o certificado: pode aparecer o certificado?')
    .setHelpText(
      'Hoje eu apaguei a parte do certificado onde fica o nome escrito à mão, ' +
      'pra não expor as meninas. Ficou feio, e o Kainã quer que apareça.\n\n' +
      '⚠️ Antes de eu tirar o borrão, preciso que você confirme: essas alunas ' +
      'sabem e deixam a foto delas COM O NOME aparecer num site público? ' +
      'Se você não tiver certeza, é melhor perguntar pra elas primeiro — ' +
      'depois que sobe, qualquer pessoa vê.'
    )
    .setChoiceValues([
      'Pode aparecer o certificado inteiro, elas autorizaram',
      'Pode aparecer o certificado, mas sem o nome delas',
      'Vou perguntar pra elas e te falo',
      'Prefiro deixar como está',
    ])
    .setRequired(false);

  form.addMultipleChoiceItem()
    .setTitle('🆕 Tem alguma foto no site que você não gostou?')
    .setHelpText(
      'O Kainã apontou algumas que ficaram esquisitas. Se você concordar, ' +
      'me diz quais — ou melhor ainda, me manda outras no WhatsApp pra ' +
      'trocar.'
    )
    .setChoiceValues([
      'Tem sim, vou mandar outras no WhatsApp',
      'Tem, mas não sei quais mandar no lugar',
      'Achei todas boas',
    ])
    .setRequired(false);

  form.addParagraphTextItem()
    .setTitle('🆕 Quais fotos você quer trocar?')
    .setHelpText('Pode descrever do seu jeito: "aquela da moça de amarelo", por exemplo.')
    .setRequired(false);

  form.addMultipleChoiceItem()
    .setTitle('🆕 Quer trocar a foto que abre o site?')
    .setHelpText(
      'Hoje é a sua foto do ensaio, de blazer branco. Se quiser outra, manda ' +
      'no meu WhatsApp — direto da galeria, na melhor qualidade que tiver, ' +
      'e não printada. Print perde metade da qualidade.'
    )
    .setChoiceValues([
      'Pode deixar a que está',
      'Quero trocar — mando a foto no seu WhatsApp',
    ])
    .setRequired(false);

  form.addParagraphTextItem()
    .setTitle('🆕 Você tem mais fotos boas do seu trabalho pra me mandar?')
    .setHelpText(
      'Principalmente: antes e depois, você atendendo, e fotos do studio. ' +
      'Quanto mais eu tiver, menos foto repetida fica no site. Pode mandar ' +
      'tudo no WhatsApp — só me avisa aqui que vem.'
    )
    .setRequired(false);

  /* ==================================================================
     3. SOBRE VOCE — o conteudo da pagina dela
     ==================================================================
     A pagina /sobre e a que ela vai abrir pra decidir se fecha contrato, e
     hoje ela tem tres frases porque nao existe mais material. Nada aqui
     pode ser inventado: e a pagina que leva o nome dela.
     ================================================================== */
  form.addPageBreakItem()
    .setTitle('3. Sobre você 🆕')
    .setHelpText(
      'O site tem uma página só sua, mas ela está curtinha — porque tudo que ' +
      'está escrito lá saiu da sua boca, e eu não invento nada sobre você.\n\n' +
      'Responde o que quiser dessas. Cada uma vira um pedaço da sua página. ' +
      'Pode escrever pouco, do jeito que você fala.'
    );

  form.addTextItem()
    .setTitle('Em que ano você começou a trabalhar com isso?')
    .setRequired(false);

  form.addParagraphTextItem()
    .setTitle('Como você começou?')
    .setHelpText(
      'Você me contou que fez o curso de design sem saber onde ia dar. Me ' +
      'conta um pouco mais: o que você fazia antes, por que resolveu fazer o ' +
      'curso, como foi o primeiro atendimento.'
    )
    .setRequired(false);

  form.addTextItem()
    .setTitle('Mais ou menos quantas alunas você já formou?')
    .setRequired(false);

  form.addParagraphTextItem()
    .setTitle('Você fez algum curso, formação ou especialização?')
    .setHelpText('Quais, e com quem. Isso pesa muito pra quem está decidindo se marca.')
    .setRequired(false);

  form.addParagraphTextItem()
    .setTitle('O que você faz que as outras da região não fazem?')
    .setHelpText(
      'Pode ser bobagem na sua cabeça e ser justo o que te diferencia: uma ' +
      'marca específica de produto, uma técnica, o jeito de atender, o tempo ' +
      'que você dedica.'
    )
    .setRequired(false);

  form.addParagraphTextItem()
    .setTitle('Qual foi o atendimento que você mais lembra?')
    .setHelpText(
      'Alguém que chegou de um jeito e saiu de outro. Sem nome, se preferir. ' +
      'História vende mais que qualquer texto meu.'
    )
    .setRequired(false);

  form.addParagraphTextItem()
    .setTitle('Você usa alguma marca de produto que faz questão?')
    .setRequired(false);

  form.addTextItem()
    .setTitle('Você tem alguma frase que é a sua cara?')
    .setHelpText(
      'Já uso duas dos seus reels: "nem de humanas, nem de exatas, eu sou da ' +
      'autoestima" e "um dia decidi fazer curso de design e hoje isso paga as ' +
      'minhas contas". Tem outra?'
    )
    .setRequired(false);

  /* ==================================================================
     4. CONFERINDO O QUE VOCE JA ME DISSE
     ================================================================== */
  form.addPageBreakItem()
    .setTitle('4. Conferindo o que você já me disse')
    .setHelpText('Tudo aqui já vem marcado. Passa o olho e muda só o que mudou.');

  form.addSectionHeaderItem()
    .setTitle('Seus serviços e preços, do jeito que estão no site')
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
    .setHelpText('Tudo certo? Deixa em branco.')
    .setRequired(false);

  form.addParagraphTextItem()
    .setTitle('🆕 Tem serviço que você faz e não está nessa lista?')
    .setHelpText('Cílios, limpeza de pele, penteado, o que for.')
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
    .setTitle('Seus horários, do jeito que estão no site')
    .setHelpText(
      'Segunda a sexta — Pereira Barreto, das 7h às 11h\n' +
      'Sábado — Bandeirantes D\'Oeste, das 11h às 22h\n' +
      'Domingo — você não atende\n\n' +
      'Uma cliente por vez, 10 minutos entre uma e outra, e agendamento só a ' +
      'partir do dia seguinte.'
    );

  form.addParagraphTextItem()
    .setTitle('Algum horário mudou?')
    .setRequired(false);

  itens.domingo = form.addMultipleChoiceItem()
    .setTitle('Domingo continua fechado?')
    .setChoiceValues([
      'Não atendo domingo',
      'Atendo domingo sim (escrevo o horário acima)',
    ])
    .setRequired(false);

  form.addMultipleChoiceItem()
    .setTitle('🆕 Tem algum dia ou período que você já sabe que vai fechar?')
    .setHelpText('Férias, viagem, feriado. Eu já bloqueio na agenda pra ninguém marcar.')
    .setChoiceValues(['Não, por enquanto não', 'Tenho sim (escrevo abaixo)'])
    .setRequired(false);

  form.addTextItem()
    .setTitle('Quais dias?')
    .setRequired(false);

  itens.desmarcam = form.addMultipleChoiceItem()
    .setTitle('Quantas clientes desmarcam em cima da hora, hoje?')
    .setHelpText('Em agosto você me disse de 1 a 2 por semana.')
    .setChoiceValues([
      'Nenhuma, isso parou',
      'De 1 a 2 por semana',
      'De 3 a 5 por semana',
      'Mais que isso',
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
     5. AS MENSAGENS AUTOMATICAS
     ================================================================== */
  form.addPageBreakItem().setTitle('5. As mensagens automáticas');

  itens.mensagens = form.addCheckboxItem()
    .setTitle('O que a cliente recebe sozinho')
    .setHelpText('Já marcado o que você pediu em agosto.')
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
      'respeitei. Esse é diferente: meia hora antes, quando ainda dá tempo de ' +
      'sair de casa. É o que costuma evitar as que somem em cima da hora.'
    )
    .setChoiceValues(['Pode mandar', 'Não, só o de um dia antes', 'Escolhe você'])
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
      'valendo na hora. Deixei assim de propósito e quero seu ok: se você ' +
      'tiver que aprovar cada uma, a cliente fica esperando pra saber se o ' +
      'horário é dela — e se você demorar, ela desiste.\n\n' +
      'Se entrar a taxa, a aprovação vira quase a mesma coisa: você confere o ' +
      'comprovante e confirma.'
    )
    .setChoiceValues([
      'Sim, quero aprovar cada uma antes de valer',
      'Não, pode valer na hora e eu só recebo o aviso',
      'Escolhe você',
    ])
    .setRequired(false);

  form.addParagraphTextItem()
    .setTitle('🆕 Tem alguma coisa que você repete toda hora no WhatsApp?')
    .setHelpText(
      'Tipo "não pode vir de maquiagem", "chega 5 minutos antes", "não atendo ' +
      'sem agendar". Se você repete, eu automatizo e você para de digitar.'
    )
    .setRequired(false);

  /* ==================================================================
     6. O ASSISTENTE
     ================================================================== */
  form.addPageBreakItem().setTitle('6. Uma coisa nova 🆕');

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

  form.addParagraphTextItem()
    .setTitle('🆕 O que você mais queria poder resolver sem abrir o painel?')
    .setHelpText('Se ele pudesse fazer uma coisa por você no WhatsApp, qual seria?')
    .setRequired(false);

  /* ==================================================================
     7. OS DETALHES QUE FALTAM
     ================================================================== */
  form.addPageBreakItem().setTitle('7. Detalhes que faltam');

  form.addTextItem()
    .setTitle('🆕 Em Bandeirantes D\'Oeste, você atende onde?')
    .setHelpText(
      'Hoje o site só diz a cidade. Pode ser só o nome do lugar — o endereço ' +
      'completo não vai pro site, vai no WhatsApp da cliente depois que ela ' +
      'marca. Se preferir deixar só a cidade, escreve "deixa assim".'
    )
    .setRequired(false);

  form.addTextItem()
    .setTitle('🆕 E em Pereira Barreto, qual é o endereço?')
    .setHelpText('Mesma coisa: só vai pro WhatsApp de quem marcou.')
    .setRequired(false);

  form.addMultipleChoiceItem()
    .setTitle('🆕 Os textinhos que descrevem seus serviços')
    .setHelpText(
      'Aqueles textos embaixo de cada serviço fui eu que escrevi, chutando. ' +
      'Eles falam do SEU trabalho. Olha em ' + SITE + '/#servicos'
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
    .setChoiceValues(['Quero sim', 'Por enquanto não', 'Me explica melhor'])
    .setRequired(false);

  form.addParagraphTextItem()
    .setTitle('🆕 Tem alguma pergunta que suas clientes fazem toda hora?')
    .setHelpText(
      'Se elas perguntam, é porque o site não respondeu. Me diz quais e eu ' +
      'ponho a resposta lá.'
    )
    .setRequired(false);

  /* ==================================================================
     8. A PARTE CHATA
     ================================================================== */
  form.addPageBreakItem()
    .setTitle('8. Agora a parte chata')
    .setHelpText('É a que mais me ajuda. Pode ser bem direta.');

  form.addScaleItem()
    .setTitle('🆕 De 0 a 10, o quanto o site tem a sua cara?')
    .setBounds(0, 10)
    .setLabels('Nada a ver comigo', 'É exatamente eu')
    .setRequired(false);

  form.addParagraphTextItem()
    .setTitle('🆕 O que você NÃO gostou?')
    .setHelpText(
      'Sério, pode falar. Alguma foto, alguma palavra, alguma cor, alguma ' +
      'coisa que faltou. Eu prefiro ouvir agora do que descobrir depois.'
    )
    .setRequired(false);

  form.addParagraphTextItem()
    .setTitle('🆕 O site já te ajudou em alguma coisa?')
    .setHelpText(
      'Alguma cliente marcou sozinha, alguém perguntou menos preço no direct, ' +
      'você trabalhou menos no WhatsApp. Ou nada mudou ainda — isso também é ' +
      'resposta.'
    )
    .setRequired(false);

  form.addMultipleChoiceItem()
    .setTitle('🆕 Passado o mês de teste, você quer continuar com o site?')
    .setHelpText('Sem compromisso na resposta — é pra eu saber se continuo melhorando.')
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

  /* ================================================================== */
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
  Logger.log('pra ver as respostas / editar:');
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
 * ⚠️ `createResponse` RECUSA valor que nao esteja entre as opcoes, e ai o
 * script inteiro para. Como um texto de opcao pode mudar sem ninguem
 * lembrar de mudar `JA_RESPONDIDO`, cada item vai dentro de try/catch: se
 * um nao casar, os outros continuam e o log diz qual falhou.
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
 * ⚠️ Importa tanto quanto o formulario. A Karol ficou fora e acabou de
 * voltar, entao a mensagem abre acolhendo isso — e nao cospe uma cobranca
 * na cara de quem chegou de viagem.
 *
 * Depois ela tira o peso do tamanho ("metade ja esta respondida") e diz
 * qual e a unica pergunta que realmente importa, pra ela poder responder
 * so aquela se estiver sem tempo.
 */
function mensagemDoWhatsapp(url) {
  return [
    'Oi Karol, que bom que você voltou! Espero que a viagem tenha sido boa 💛',
    '',
    'Enquanto isso o site ficou pronto: ' + SITE,
    '',
    'A agenda já funciona, os preços estão lá, você tem uma página só sua, e ' +
      'o WhatsApp já responde as clientes sozinho.',
    '',
    'Montei o último formulário pra fechar tudo. Ele parece grande, mas ' +
      'METADE JÁ ESTÁ RESPONDIDA — coloquei tudo que você me falou em agosto ' +
      'já marcado, você só confere. As perguntas novas estão com 🆕.',
    '',
    url,
    '',
    'Se você estiver sem tempo, responde pelo menos a primeira página: é ' +
      'sobre a taxa pra segurar o horário, aquilo que você falou que mais ' +
      'queria resolver. Eu preciso saber se você quis dizer o PIX adiantado ' +
      'ou só o aviso — é a única coisa que está me travando.',
    '',
    'Sem pressa, e obrigado! 🤍',
  ].join('\n');
}
