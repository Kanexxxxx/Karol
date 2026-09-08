import { createHash, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { rodarLembretes, rodarLembretesCurtos } from "@/lib/lembretes";

/**
 * Dispara os lembretes. Duas varreduras diferentes, escolhidas por `?tipo=`.
 *
 * | chamada                        | o que faz                      | quem bate            |
 * |--------------------------------|--------------------------------|----------------------|
 * | `/api/lembretes`               | véspera + agradecimento        | cron da Vercel, 1x/dia |
 * | `/api/lembretes?tipo=curto`    | o de ~30 min antes             | cron externo, 10 em 10 min |
 *
 * ⚠️ O `?tipo=curto` NÃO é enfeite. Sem ele, o cron de 10 minutos rodaria
 * também a varredura da véspera — e cada cliente com horário amanhã
 * receberia o lembrete umas 140 vezes ao longo do dia. Separar as duas
 * varreduras é o que torna seguro bater aqui de minuto em minuto.
 *
 * Autenticação: `Authorization: Bearer $CRON_SECRET`. O cron da Vercel
 * manda esse cabeçalho sozinho quando `CRON_SECRET` existe no ambiente; no
 * cron externo você cola o mesmo valor à mão. Sem o segredo configurado, a
 * rota fica fechada — ela dispara mensagem paga pra cliente de verdade.
 */

export const dynamic = "force-dynamic";

function autorizado(req: NextRequest): boolean {
  const segredo = process.env.CRON_SECRET;
  if (!segredo) return false;
  const auth = req.headers.get("authorization") ?? "";
  const esperado = `Bearer ${segredo}`;
  const hAuth = createHash("sha256").update(auth, "utf8").digest();
  const hEsp = createHash("sha256").update(esperado, "utf8").digest();
  return timingSafeEqual(hAuth, hEsp);
}

async function handler(req: NextRequest) {
  if (!autorizado(req)) {
    return Response.json({ ok: false, erro: "não autorizado" }, { status: 401 });
  }

  if (req.nextUrl.searchParams.get("tipo") === "curto") {
    return Response.json({ ok: true, ...(await rodarLembretesCurtos()) });
  }

  return Response.json({ ok: true, ...(await rodarLembretes()) });
}

export const GET = handler;
export const POST = handler;
