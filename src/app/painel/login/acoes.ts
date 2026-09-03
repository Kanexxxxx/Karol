"use server";

import { redirect } from "next/navigation";
import { criarSessao, painelConfigurado, senhaConfere } from "@/lib/sessao";

export type EstadoLogin = { erro?: string };

export async function entrar(_estado: EstadoLogin, form: FormData): Promise<EstadoLogin> {
  if (!painelConfigurado()) {
    return { erro: "O painel ainda não foi configurado no servidor." };
  }

  const senha = String(form.get("senha") ?? "");

  // Pequena espera pra não virar oráculo de força bruta.
  await new Promise((r) => setTimeout(r, 400));

  if (!senhaConfere(senha)) {
    return { erro: "Senha incorreta." };
  }

  await criarSessao();
  redirect("/painel");
}
