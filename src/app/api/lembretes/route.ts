import type { NextRequest } from "next/server";
import { rodarLembretes } from "@/lib/lembretes";

/**
 * Dispara lembretes e agradecimentos do dia.
 *
 * Chamada 1x/dia pelo cron da Vercel (ver vercel.json), que manda
 * `Authorization: Bearer $CRON_SECRET` sozinho quando `CRON_SECRET` existe
 * no ambiente. Sem o segredo configurado, a rota fica fechada.
 */

export const dynamic = "force-dynamic";

function autorizado(req: NextRequest): boolean {
  const segredo = process.env.CRON_SECRET;
  if (!segredo) return false;
  return req.headers.get("authorization") === `Bearer ${segredo}`;
}

async function handler(req: NextRequest) {
  if (!autorizado(req)) {
    return Response.json({ ok: false, erro: "não autorizado" }, { status: 401 });
  }
  const r = await rodarLembretes();
  return Response.json({ ok: true, ...r });
}

export const GET = handler;
export const POST = handler;
