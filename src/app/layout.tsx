import type { Metadata } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import "./globals.css";
import { NEGOCIO, SITE_URL } from "@/data/negocio";
import { Revelar } from "@/components/Revelar";
import { BarraCarregando } from "@/components/BarraCarregando";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  display: "swap",
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${NEGOCIO.nome} — Sobrancelhas e Maquiagem em Pereira Barreto`,
    template: `%s · ${NEGOCIO.nome}`,
  },
  description:
    "Design de sobrancelhas, brow lamination, maquiagem social e curso de automaquiagem em Pereira Barreto e Bandeirantes D'Oeste. Preços abertos e agendamento pelo site.",
  openGraph: {
    title: NEGOCIO.nome,
    description:
      "Sobrancelhas, maquiagem e curso de automaquiagem em Pereira Barreto e Bandeirantes D'Oeste.",
    locale: "pt_BR",
    type: "website",
    images: ["/fotos/karol-capa.jpg"],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${cormorant.variable} ${manrope.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <BarraCarregando />
        {children}
        <Revelar />
      </body>
    </html>
  );
}
