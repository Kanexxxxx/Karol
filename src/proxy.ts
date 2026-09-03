/**
 * Proxy (o antigo `middleware` — renomeado no Next 16).
 *
 * Barra `/painel/*` pra quem não tem sessão válida e manda pro login. É só a
 * primeira linha: cada página e Server Action do painel confere a sessão de
 * novo com `sessaoAtiva()`, porque o proxy sozinho não é fronteira de
 * segurança (um refactor de rota pode tirá-lo do caminho sem avisar).
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { COOKIE_SESSAO, tokenValido } from "@/lib/sessao";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const logado = tokenValido(request.cookies.get(COOKIE_SESSAO)?.value);

  if (pathname === "/painel/login") {
    return logado
      ? NextResponse.redirect(new URL("/painel", request.url))
      : NextResponse.next();
  }

  if (!logado) {
    return NextResponse.redirect(new URL("/painel/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/painel", "/painel/:path*"],
};
