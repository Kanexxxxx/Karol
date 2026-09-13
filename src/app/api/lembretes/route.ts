import { createHash, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { rodarLembretes } from "@/lib/lembretes";

/**
 * Dispara os lembretes da véspera e os agradecimentos. Uma varredura só,
 * 1x/dia, chamada pelo cron da Vercel (ver `vercel.json`).
 *
 * ⚠️ AQUI JÁ EXISTIU UM `?tipo=curto`, pro aviso de ~30 min antes. Foi
 * arrancado em 13/09/2026 junto com o resto daquele aviso — a Karol nunca
 * pediu. Se alguém achar um cron externo velho ainda batendo com esse
 * parâmetro, ele é ignorado: a varredura da véspera é a única que existe,
 * e bater nela mais de uma vez por dia manda o lembrete de amanhã várias
 * vezes pra mesma cliente. **Desligue o cron, não confie no parâmetro.**
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

  return Response.json({ ok: true, ...(await rodarLembretes()) });
}

export const GET = handler;
export const POST = handler;
