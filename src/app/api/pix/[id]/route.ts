import { buscarAgendamento } from "@/lib/agendamentos";
import { brCodeDoSinal } from "@/lib/pix";
import { qrParaPng } from "@/lib/png";
import { gerarMatriz } from "@/lib/qr";
import { buscarServico, valorDoSinal } from "@/data/servicos";

/**
 * O QR do PIX de UM agendamento, como imagem.
 *
 * ---------------------------------------------------------------------
 * Por que esta rota existe
 * ---------------------------------------------------------------------
 *
 * A Cloud API da Meta manda imagem por URL: ela vai buscar o arquivo e
 * reenvia pra cliente. Não dá pra colar o PNG na requisição nem mandar um
 * data URI. Então o QR precisa morar num endereço público.
 *
 * ---------------------------------------------------------------------
 * ⚠️ Por que o valor NÃO vem da URL
 * ---------------------------------------------------------------------
 *
 * O caminho óbvio seria `/api/pix?valor=4000`. Seria um erro: qualquer
 * pessoa poderia gerar um QR de qualquer valor apontando pra chave PIX da
 * Karol, hospedado no domínio dela. É a matéria-prima de um golpe — um
 * link que parece do studio, com a chave real dela, cobrando o que o
 * golpista quiser.
 *
 * Aqui o único parâmetro é o identificador do agendamento, e o valor sai
 * do banco. Não existe entrada por onde escolher quanto cobrar.
 *
 * O identificador é um UUID, então também não dá pra varrer a rota
 * tentando números em sequência pra descobrir quem marcou.
 *
 * `node:zlib` (dentro de `lib/png.ts`) só existe no runtime Node.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const agendamento = await buscarAgendamento(id);
  if (!agendamento) return new Response("não encontrado", { status: 404 });

  /*
    O sinal é do SERVIÇO, não do agendamento — ela só pede a partir de
    R$ 80. Um design de R$ 25 não tem QR nenhum pra mostrar, e devolver um
    QR de valor zero seria pior que devolver nada: abriria o app do banco
    pedindo pra pessoa digitar quanto quer pagar.
  */
  const servico = buscarServico(agendamento.servicoId);
  const sinal = servico ? valorDoSinal(servico) : 0;
  if (sinal <= 0) return new Response("este serviço não pede sinal", { status: 404 });

  const codigo = brCodeDoSinal(sinal, id);
  const png = qrParaPng(gerarMatriz(codigo, { nivel: "M" }), { escala: 10 });

  return new Response(new Uint8Array(png), {
    headers: {
      "content-type": "image/png",
      "content-disposition": 'inline; filename="pix.png"',
      // A Meta busca a imagem uma vez e guarda a dela. O cache aqui é pra
      // quando a mesma cliente reabre a mensagem, e pra segunda tentativa
      // de envio não recalcular nada.
      "cache-control": "public, max-age=3600",
      // O valor está dentro do código; ninguém deve indexar isto.
      "x-robots-tag": "noindex",
    },
  });
}
