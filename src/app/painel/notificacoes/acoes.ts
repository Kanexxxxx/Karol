"use server";

import { redirect } from "next/navigation";
import { sessaoAtiva } from "@/lib/sessao";
import { rodarLembretes } from "@/lib/lembretes";

export type EstadoLembretes = {
  erro?: string;
  resultado?: { lembretes: number; agradecimentos: number };
};

export async function dispararLembretes(): Promise<EstadoLembretes> {
  if (!(await sessaoAtiva())) redirect("/painel/login");
  try {
    return { resultado: await rodarLembretes() };
  } catch {
    return { erro: "Não consegui disparar agora." };
  }
}
