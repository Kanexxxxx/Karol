/**
 * Sessão do painel — uma senha só, cookie assinado, sem biblioteca.
 *
 * Duas pessoas usam a mesma senha (`SENHA_PAINEL`): a Karol no dia a dia e
 * quem estiver testando. O cookie carrega só a validade, assinada com HMAC
 * (`SESSAO_SECRET`), então o navegador não consegue forjar nem esticar a
 * sessão. Nada de dado sensível dentro dele.
 *
 * `tokenValido()` não toca em `cookies()` de propósito: o `proxy.ts` também
 * chama, e lá o cookie vem do request. As demais funções são pra Server
 * Actions e Server Components.
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const COOKIE_SESSAO = "painel_sessao";

/** 7 dias. Renovada a cada login. */
const DURACAO_MS = 7 * 24 * 60 * 60 * 1000;

export function painelConfigurado(): boolean {
  return Boolean(process.env.SENHA_PAINEL && process.env.SESSAO_SECRET);
}

function assinar(payload: string, chave: string): string {
  return createHmac("sha256", chave).update(payload).digest("base64url");
}

function comparaConstante(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

/** Valor do cookie: `<payload base64url>.<assinatura>`. */
export function emitirToken(): string | null {
  const chave = process.env.SESSAO_SECRET;
  if (!chave) return null;
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + DURACAO_MS })).toString(
    "base64url",
  );
  return `${payload}.${assinar(payload, chave)}`;
}

/** Confere assinatura e validade. Puro — serve o proxy e as páginas. */
export function tokenValido(token: string | undefined | null): boolean {
  const chave = process.env.SESSAO_SECRET;
  if (!chave || !token) return false;

  const [payload, assinatura] = token.split(".");
  if (!payload || !assinatura) return false;
  if (!comparaConstante(assinatura, assinar(payload, chave))) return false;

  try {
    const { exp } = JSON.parse(Buffer.from(payload, "base64url").toString());
    return typeof exp === "number" && exp > Date.now();
  } catch {
    return false;
  }
}

export function senhaConfere(tentativa: string): boolean {
  const real = process.env.SENHA_PAINEL;
  return Boolean(real) && comparaConstante(tentativa, real!);
}

/* --- ligadas a cookies(): Server Actions e Server Components --- */

export async function criarSessao(): Promise<void> {
  const token = emitirToken();
  if (!token) return;
  const c = await cookies();
  c.set(COOKIE_SESSAO, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.floor(DURACAO_MS / 1000),
  });
}

export async function sessaoAtiva(): Promise<boolean> {
  const c = await cookies();
  return tokenValido(c.get(COOKIE_SESSAO)?.value);
}

export async function encerrarSessao(): Promise<void> {
  const c = await cookies();
  c.delete(COOKIE_SESSAO);
}
