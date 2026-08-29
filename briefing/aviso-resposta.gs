/**
 * AVISO DE RESPOSTA — briefing Karol Carvalho
 * ===========================================
 *
 * Manda um e-mail pra voce com TODAS as respostas ja escritas dentro,
 * no momento em que ela enviar o formulario.
 *
 * COMO USAR:
 *  1. Abra o formulario no forms.google.com
 *  2. Menu de 3 pontinhos (canto superior direito) -> "Editor de scripts"
 *     (assim o script ja nasce ligado nesse formulario)
 *  3. Cole este arquivo inteiro por cima do codigo de exemplo
 *  4. Execute a funcao "instalarAviso" UMA VEZ e autorize
 *  5. Pronto. Nao precisa rodar de novo.
 *
 * Pra testar: responda seu proprio formulario e veja se o e-mail chega.
 */

function instalarAviso() {
  var form = FormApp.getActiveForm();

  // remove gatilhos antigos pra nao mandar e-mail duplicado
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'aoResponder') {
      ScriptApp.deleteTrigger(t);
    }
  });

  ScriptApp.newTrigger('aoResponder')
    .forForm(form)
    .onFormSubmit()
    .create();

  Logger.log('Aviso instalado. As respostas vao chegar em: ' + Session.getActiveUser().getEmail());
}


function aoResponder(e) {
  var respostas = e.response.getItemResponses();
  var linhas = [];

  respostas.forEach(function (item) {
    var r = item.getResponse();

    // grade e caixas de selecao voltam como lista
    if (Array.isArray(r)) {
      r = r.map(function (x) {
        return Array.isArray(x) ? x.join(', ') : x;
      }).join('\n   ');
    }

    if (r && String(r).trim() !== '') {
      linhas.push('▸ ' + item.getItem().getTitle() + '\n   ' + r);
    }
  });

  var corpo =
    'A Karol respondeu o briefing.\n' +
    'Respondeu ' + linhas.length + ' de 31 perguntas.\n\n' +
    '─────────────────────────────\n\n' +
    linhas.join('\n\n') +
    '\n\n─────────────────────────────\n' +
    'Ver tudo: ' + FormApp.getActiveForm().getPublishedUrl();

  MailApp.sendEmail({
    to: Session.getActiveUser().getEmail(),
    subject: '💄 Karol respondeu o briefing (' + linhas.length + '/31)',
    body: corpo
  });
}
