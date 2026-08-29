import { NEGOCIO } from "@/data/negocio";

/**
 * Monta o link do WhatsApp com a mensagem já escrita.
 *
 * Enquanto a agenda online não existe, é por aqui que a cliente marca —
 * mas agora ela chega sabendo o preço, que era a pergunta nº1 da Karol.
 */
export function linkWhatsapp(mensagem?: string): string {
  const base = `https://wa.me/${NEGOCIO.whatsapp.numero}`;
  return mensagem ? `${base}?text=${encodeURIComponent(mensagem)}` : base;
}

export function linkAgendar(servico?: string): string {
  return linkWhatsapp(
    servico
      ? `Oi Karol! Vim pelo site e queria agendar: ${servico}.`
      : "Oi Karol! Vim pelo site e queria agendar um horário.",
  );
}
