import Link from "next/link";
import type { ReactNode } from "react";

/** Largura máxima e respiro lateral, iguais em todas as seções. */
export function Env({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`mx-auto w-full max-w-[1220px] px-[22px] lg:px-[46px] ${className}`}>
      {children}
    </div>
  );
}

type BotaoProps = {
  href: string;
  children: ReactNode;
  variante?: "cheio" | "vazado" | "claro" | "vazado-claro";
  className?: string;
};

const VARIANTES: Record<NonNullable<BotaoProps["variante"]>, string> = {
  cheio: "bg-ouro text-white hover:opacity-90",
  vazado: "border border-ouro-claro text-ouro hover:bg-ouro-fundo",
  claro: "bg-osso text-tinta hover:opacity-90",
  "vazado-claro": "border border-white/70 text-white hover:bg-white/10",
};

export function Botao({ href, children, variante = "cheio", className = "" }: BotaoProps) {
  return (
    <Link
      href={href}
      className={`inline-flex min-h-[50px] items-center justify-center px-[30px] py-4 text-[11.5px] font-bold uppercase tracking-[0.2em] transition-all duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ouro ${VARIANTES[variante]} ${className}`}
    >
      {children}
    </Link>
  );
}

export function Rotulo({ children }: { children: ReactNode }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-[0.34em] text-ouro">
      {children}
    </p>
  );
}

export function Cabeca({
  rotulo,
  titulo,
  texto,
  alinhamento = "centro",
}: {
  rotulo: string;
  titulo: ReactNode;
  texto?: string;
  alinhamento?: "centro" | "esquerda";
}) {
  const centro = alinhamento === "centro";
  return (
    <div className={`mb-9 max-w-[620px] ${centro ? "mx-auto text-center" : ""}`}>
      <Rotulo>{rotulo}</Rotulo>
      <h2 className="mt-[10px] mb-3 font-titulo text-[clamp(32px,6.4vw,54px)] font-light leading-[1.02] text-balance">
        {titulo}
      </h2>
      {texto && <p className="text-tinta-2">{texto}</p>}
    </div>
  );
}

/** Envolve um bloco na animação de entrada. Ver components/Revelar.tsx */
export function Revela({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div data-revelar className={className}>
      {children}
    </div>
  );
}
