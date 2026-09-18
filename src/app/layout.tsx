import type { Metadata } from "next";
import { EB_Garamond, Manrope } from "next/font/google";
import "./globals.css";
import { NEGOCIO, SITE_URL } from "@/data/negocio";
import { Revelar } from "@/components/Revelar";
import { Carregando } from "@/components/Carregando";
import { AoTopo } from "@/components/AoTopo";

/*
  A SERIFADA DOS TÍTULOS — e por que ela não é mais a Cormorant.

  ⚠️ O DEFEITO: o circunflexo saía QUEBRADO. "Você", "três", "avô",
  "paciência" apareciam com o acento solto, deslocado pra cima e pra
  direita, encostando na letra seguinte. Num site inteiro em português,
  em títulos de 52 px.

  Descoberto em 16/09/2026, numa captura de tela da home da v2 — o título
  do curso é "Você aprende a fazer em você mesma", com dois deles.

  Não é bug do site: é o arquivo da fonte. Foram comparadas seis
  serifadas, carregadas do MESMO jeito que o site carrega (`next/font`,
  hospedada junto com o build), numa página de teste com o título real:

      Cormorant .............. acento quebrado
      Cormorant Garamond ..... acento quebrado
      EB Garamond ............ certo   ← a escolhida
      Playfair Display ....... certo
      Crimson Pro ............ certo
      Lora ................... certo

  ⚠️ NÃO ADIANTA TROCAR PELA IRMÃ: a primeira tentativa foi
  `Cormorant_Garamond` → `Cormorant`, e o acento continuou quebrado. A
  família inteira tem o problema.

  ⚠️ E NÃO ADIANTA TESTAR INJETANDO A FONTE DO GOOGLE NUMA PÁGINA QUE JÁ
  USA `next/font`: os dois registram `@font-face` com o MESMO nome de
  família, o navegador usa um só, e o teste mostra a fonte errada dizendo
  o nome certo. Foi o que quase fez esta troca ir pro ar sem resolver
  nada. A página de teste tinha que declarar cada fonte por `next/font`.

  A EB Garamond é da mesma linhagem (garamond de verdade), então a letra
  muda pouco: um pouco mais encorpada e um pouco menos aérea que a
  Cormorant de 300. O itálico de "autoestima" na abertura continua
  existindo e continua bonito.

  ⚠️ ELA NÃO TEM PESO 300. As classes `font-light` espalhadas pelo site
  continuam lá e o navegador resolve pelo mais próximo, que é o 400 — por
  isso os títulos ficaram levemente mais firmes. Trocar as classes uma a
  uma não muda o resultado; o que mudaria é escolher outra fonte.

  ⚠️ A v1, na branch `main`, ainda tem o defeito — o título do curso é o
  mesmo lá.

  A variável CSS continua `--font-cormorant`: renomear ela mexeria em
  `globals.css` e em toda classe `font-titulo` sem melhorar nada. O nome
  virou herança, e esta nota existe pra ninguém achar que é a fonte.
*/
const cormorant = EB_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
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
        <Carregando />
        <AoTopo />
        {children}
        <Revelar />
      </body>
    </html>
  );
}
