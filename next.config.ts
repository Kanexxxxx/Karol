import type { NextConfig } from "next";

/**
 * Cabeçalhos de segurança, em todas as respostas.
 *
 * Até aqui o site não mandava nenhum. Cada linha abaixo fecha uma porta
 * concreta:
 *
 * - `frame-ancestors 'none'` (e o `X-Frame-Options` antigo, pros navegadores
 *   que não leem CSP): ninguém embute o site num <iframe>. Sem isso, uma
 *   página de golpe podia mostrar o painel da Karol por baixo de um botão
 *   falso e fazer ela clicar em "cancelar" sem saber.
 * - `nosniff`: o navegador não "adivinha" o tipo de um arquivo. A rota do
 *   QR do PIX responde `image/png` e tem que ser tratada como imagem.
 * - HSTS: depois da primeira visita, o navegador só fala HTTPS com o site.
 * - `Referrer-Policy`: quem sai do site por um link não leva o endereço
 *   completo junto — o painel tem a busca na URL (`?q=telefone`).
 * - `Permissions-Policy`: o site não usa câmera, microfone nem localização;
 *   fica dito que não usa.
 *
 * ⚠️ POR QUE A CSP NÃO BLOQUEIA SCRIPT: o Next injeta scripts inline pra
 * hidratar a página. Uma `script-src` sem nonce derruba o site inteiro, e
 * nonce exige renderizar tudo dinâmico. As diretivas abaixo são as que não
 * encostam em script nem estilo — ganho de segurança sem risco de tela
 * branca.
 */
const CABECALHOS = [
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'",
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

/**
 * ⚠️ `standalone` SÓ LIGA QUANDO ALGUÉM PEDE, e isso é de propósito.
 *
 * A cópia da VPS precisa de `output: "standalone"`: o Next monta uma pasta
 * `.next/standalone` que já vem com o servidor e só as dependências que o
 * site usa de verdade. É o que faz caber numa VPS pequena sem levar os
 * ~500 MB de `node_modules`.
 *
 * Mas a Vercel NÃO precisa disso — ela tem o próprio empacotador. Ligar
 * standalone lá muda o jeito como o build sai, e o site da Karol está no
 * ar. Então fica atrás de uma variável: `BUILD_STANDALONE=1 npm run build`
 * é o build da VPS, e `npm run build` sozinho continua sendo, byte por
 * byte, o mesmo build que a Vercel faz hoje.
 *
 * Ver `vps/README.md`.
 */
const nextConfig: NextConfig = {
  ...(process.env.BUILD_STANDALONE ? { output: "standalone" as const } : {}),

  async headers() {
    return [{ source: "/:path*", headers: CABECALHOS }];
  },
};

export default nextConfig;
