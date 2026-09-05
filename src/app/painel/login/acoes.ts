"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { criarSessao, painelConfigurado, senhaConfere } from "@/lib/sessao";
import { dentroDoLimite, ipDoPedido, pausaLogin } from "@/lib/limite";

export type EstadoLogin = { erro?: string };

export async function entrar(_estado: EstadoLogin, form: FormData): Promise<EstadoLogin> {
  if (!painelConfigurado()) {
    return { erro: "O painel ainda não foi configurado no servidor." };
  }

  // Freio de tentativas. A espera de 400 ms sozinha não segurava nada: um
  // script tenta ~2 senhas por segundo por conexão, e abre quantas quiser
  // em paralelo. Quem entra aqui vê nome e WhatsApp de TODAS as clientes,
  // então o login é a porta que mais importa.
  const ip = ipDoPedido(await headers());
  if (!dentroDoLimite(`login:${ip}`, 8, 15 * 60 * 1000)) {
    return { erro: "Muitas tentativas. Espere alguns minutos e tente de novo." };
  }

  // Campo com tamanho absurdo não chega a ser comparado.
  const senha = String(form.get("senha") ?? "").slice(0, 200);

  // Espera fixa pra resposta não denunciar o caminho percorrido.
  await pausaLogin();

  if (!senhaConfere(senha)) {
    return { erro: "Senha incorreta." };
  }

  await criarSessao();
  redirect("/painel");
}
