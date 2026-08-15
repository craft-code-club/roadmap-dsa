"use client";

import { useEffect, useRef, useState } from "react";
import { ytEmbed, ytWatch } from "@/lib/links";

/**
 * A fachada do vídeo da aula: uma miniatura clicável no lugar do `<iframe>`.
 *
 * POR QUE ESTE ARQUIVO EXISTE
 *
 * O `<iframe>` de antes já tinha `loading="lazy"` e mora abaixo do artigo
 * inteiro e dos visualizadores, então na carga ele custava quase nada. O custo
 * estava em quem **rola até o vídeo e não clica**. Medido com Playwright contra
 * `https://dsa.craftcodeclub.io/topicos/arrays/`:
 *
 *   | momento                | celular (iPhone 14)  | desktop 1512x900     |
 *   |------------------------|----------------------|----------------------|
 *   | carga, sem rolar       | 165,5 KB / 2 req     | 165,5 KB / 2 req     |
 *   | rolou e NÃO clicou     | 1.074,9 KB / 10 req  | 1.155,8 KB / 10 req  |
 *
 * A página inteira, da origem própria, são 1.174,7 KB no celular: o embed
 * quase DOBRAVA o peso para quem só passa por ela. Os maiores pedaços:
 * `base.js` 465,8 KB, `ytembeds.base` 234,7 + 153,8 KB, o documento do embed
 * 143,9 KB e `www-player.css` 56,3 KB.
 *
 * O argumento é banda e trabalho de CPU no celular, e só. **Não é privacidade**:
 * o site já usava `youtube-nocookie.com` antes desta mudança (`src/lib/links.ts`),
 * então essa conta já estava paga.
 *
 * O QUE ELA CUSTA, E ESTÁ ESCRITO DE PROPÓSITO
 *
 * O Google achava o vídeo de graça, porque o `<iframe>` saía literal no HTML
 * exportado ("Google can find videos referenced by a `<video>`, `<embed>`,
 * `<iframe>`, or `<object>` element"). A fachada apaga esse sinal, e apaga com o
 * nome que a própria documentação usa: "Don't rely on user actions (such as
 * swiping, clicking, or typing) to load the video". O `<noscript>` abaixo não
 * recompra o sinal — o Googlebot renderiza com JS e não lê `<noscript>` como
 * conteúdo. `VideoObject` também não recompra: desde 04/12/2023 o modo Vídeo só
 * mostra páginas onde o vídeo é o CONTEÚDO PRINCIPAL, e uma página daqui é
 * artigo + visualizadores + seção de vídeo. O resíduo perdido é pequeno, mas é
 * real.
 *
 * O QUE NÃO USAR AQUI
 *
 * O `YouTubeEmbed` do `@next/third-parties` está instalado e parece de graça.
 * Ele injeta o `lite-youtube-embed` por `next/script`: trocaria HTML estático
 * por script de terceiro num site `output: "export"`.
 */

/** Host das miniaturas do YouTube. */
const THUMBS = "https://i.ytimg.com";

/**
 * Abre a conexão com o YouTube **na intenção**, não na carga.
 *
 * O `<link rel="preconnect">` custa DNS + TCP + TLS. No `<head>` do layout ele
 * cobraria isso nas 51 rotas, 17 delas sem vídeo nenhum. Aqui ele é criado no
 * primeiro `pointerenter`/`touchstart`/`focus` do botão — o aluno já demonstrou
 * que vai clicar — e uma vez só por carga de página (`warmed` é de módulo, e há
 * no máximo um vídeo por página).
 *
 * Por que estes dois hosts, medido no documento do embed:
 *
 *   · `www.youtube-nocookie.com` — é ele que serve o documento do embed E os
 *     dois maiores pedaços: no HTML do embed, `"jsUrl"` e `"cssUrl"` são
 *     caminhos RELATIVOS (`/s/player/<hash>/player_embed_es6.vflset/pt_BR/base.js`
 *     e `/s/player/<hash>/www-player.css`), ou seja, resolvem na mesma origem.
 *     Nenhum host de anúncio entra aqui de propósito: o `nocookie` é o que o
 *     site escolheu, e preconectar em `doubleclick.net` (como faz o
 *     `lite-youtube-embed`) desfaria essa escolha;
 *   · `i.ytimg.com` — a origem da miniatura e do pôster que o player mostra
 *     enquanto carrega. Em geral já está quente (a miniatura veio de lá), mas o
 *     socket do documento e o do quadro embutido não são necessariamente o
 *     mesmo, e a linha só custa um `<link>` inerte quando já há conexão.
 */
let warmed = false;
function warmUp() {
  if (warmed || typeof document === "undefined") return;
  warmed = true;
  for (const href of ["https://www.youtube-nocookie.com", THUMBS]) {
    const link = document.createElement("link");
    link.rel = "preconnect";
    link.href = href;
    document.head.appendChild(link);
  }
}

/**
 * As larguras que a caixa do vídeo realmente tem, e não `100vw`.
 *
 * `.video-embed` mora dentro do `<article>` do `.topic-layout`
 * (`src/app/globals.css:365`):
 *
 *   · até 1000px o grid colapsa numa coluna com `padding: 28px 20px`
 *     → `100vw - 40px`;
 *   · acima disso são `max-width: 1180px`, `padding: 40px 48px`, `gap: 40px` e
 *     um índice lateral de `200px` → `min(100vw, 1180px) - 336px`, o que dá
 *     `100vw - 336px` enquanto a janela cabe nos 1180, e `844px` fixos depois.
 *
 * `100vw` sozinho mentiria para mais, e subir um degrau de candidato à toa é
 * justamente o desperdício que esta mudança veio cortar.
 */
const SIZES = "(max-width: 1000px) calc(100vw - 40px), (max-width: 1180px) calc(100vw - 336px), 844px";

/**
 * Bytes medidos nos 34 vídeos do roadmap (mediana, WebP, `i.ytimg.com/vi_webp/`):
 * `mqdefault` 5,4 KB · `hqdefault` 8,8 KB · `sddefault` 12,0 KB ·
 * `maxresdefault` 22,8 KB. Em JPEG o `maxresdefault` custa 64,2 KB — **2,8x
 * pelo mesmo pixel**, por isso WebP sempre, com JPEG só no plano B abaixo.
 *
 * MISTURAR 4:3 COM 16:9 NO MESMO `srcset` É DELIBERADO. `hqdefault` (480x360) e
 * `sddefault` (640x480) vêm com tarja preta em cima e embaixo; `mqdefault`
 * (320x180) e `maxresdefault` (1280x720) já são 16:9. O `object-fit: cover`
 * numa caixa 16:9 corta 12,5% de cada lado da imagem 4:3 — que é exatamente a
 * altura de cada tarja (360 de caixa contra 270 de conteúdo). A conta fecha, e
 * o descritor `w` continua honesto porque ele descreve a largura, que não muda.
 */
const RESOLUTIONS = [
  ["mqdefault", 320],
  ["hqdefault", 480],
  ["sddefault", 640],
  ["maxresdefault", 1280],
] as const;

/**
 * Escapa o que vai para dentro de `dangerouslySetInnerHTML`.
 *
 * `&` primeiro, senão ele reescreveria as entidades que os outros produzem.
 */
const escaparHtml = (texto: string) =>
  texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export function VideoFacade({ youtube, title }: { youtube: string; title: string }) {
  const [playing, setPlaying] = useState(false);
  // `maxresdefault` existe nos 34 vídeos de hoje, mas o YouTube não garante as
  // resoluções grandes para todo vídeo. O 404 do `i.ytimg.com` é uma página de
  // ~550 B que o `<img>` desenha como ÍCONE QUEBRADO, não como imagem vazia —
  // então o plano B não é opcional. Ele cai em `hqdefault.jpg`, que é a única
  // combinação que o YouTube gera para qualquer vídeo, e some com o `srcset`
  // junto: trocar só o `src` não muda nada enquanto houver candidatos.
  const [thumbBroken, setThumbBroken] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);

  // O foco vai para o player assim que ele monta. Sem isto, quem clicou pelo
  // teclado fica com o foco no `<body>` e perde o lugar na página.
  useEffect(() => {
    if (playing) frame.current?.focus();
  }, [playing]);

  if (playing) {
    return (
      <iframe
        ref={frame}
        // `autoplay=1` é legítimo aqui, e não é atalho: o `<iframe>` NASCE
        // dentro do handler de clique, com o gesto do usuário ainda ativo.
        // Sem ele o aluno clica duas vezes — uma na fachada e outra no play do
        // player. `playsinline=1` é o par obrigatório: sem ele o iPhone joga o
        // vídeo em tela cheia por conta própria.
        src={`${ytEmbed(youtube)}?autoplay=1&playsinline=1`}
        title={`Aula: ${title}`}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    );
  }

  const thumb = (name: string) => `${THUMBS}/vi_webp/${youtube}/${name}.webp`;

  return (
    <>
      <button
        type="button"
        className="video-facade"
        // O nome acessível CONTÉM o texto do título da seção, e não só um
        // "Assistir": numa página com vários botões, "Assistir" não diz a quê.
        aria-label={`Assistir à aula: ${title}`}
        onClick={() => {
          warmUp();
          setPlaying(true);
        }}
        onPointerEnter={warmUp}
        onTouchStart={warmUp}
        onFocus={warmUp}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- `next/image`
            não serve aqui: o projeto é `output: "export"` com
            `images: { unoptimized: true }`, então ele não otimizaria nada e
            ainda entraria com JS no bundle da rota; e o que esta miniatura
            precisa (srcset misto 4:3/16:9, `sizes` com a largura real da caixa,
            e `onError` caindo para o JPEG) é exatamente o controle que o
            componente esconde. */}
        <img
          className="video-facade-thumb"
          src={thumbBroken ? `${THUMBS}/vi/${youtube}/hqdefault.jpg` : thumb("maxresdefault")}
          srcSet={
            thumbBroken
              ? undefined
              : RESOLUTIONS.map(([name, w]) => `${thumb(name)} ${w}w`).join(", ")
          }
          sizes={thumbBroken ? undefined : SIZES}
          // Dimensões declaradas mesmo com a caixa mandando no tamanho: elas
          // dão ao navegador a proporção antes do byte chegar.
          width={thumbBroken ? 480 : 1280}
          height={thumbBroken ? 360 : 720}
          // Decorativa de propósito: quem lê o nome desta região lê o
          // `aria-label` do botão, e repetir o título aqui faria o leitor de
          // tela anunciar a aula duas vezes.
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setThumbBroken(true)}
        />
        <span className="video-facade-play" aria-hidden="true">
          ▶
        </span>
      </button>
      {/*
        SEM JAVASCRIPT A FACHADA NÃO PODE VIRAR BURACO.

        O botão sai no HTML exportado (este componente é `"use client"` SEM
        `ssr: false`), mas botão sem JS não faz nada — e o mesmo vale para a
        janela curta entre o HTML chegar e a hidratação rodar. A decisão é a
        mais simples que resolve: um link direto para o YouTube, por cima da
        miniatura, que só existe quando o script não roda.

        `dangerouslySetInnerHTML` não é firula: com o script LIGADO o navegador
        parseia o conteúdo de `<noscript>` como TEXTO, não como elementos, então
        marcação escrita como filhos JSX daria divergência de hidratação — e
        este repositório tem uma fixture que reprova o teste quando a página
        emite `console.error` (`tests/fixtures/console-limpo.ts`). Com
        `dangerouslySetInnerHTML` o React não compara os filhos. É o mesmo
        caminho que o `@next/third-parties` usa no snippet do GTM.

        A interpolação é a URL, montada do id do vídeo. O comentário anterior
        dizia que o id "é `[A-Za-z0-9_-]{11}` vindo do `content/topicos/index.ts`", e
        isso era SUPOSIÇÃO: o campo é `string` e o `yt()` do roadmap é função
        identidade — não valida nada. Dentro de `<noscript>` isso importa mais
        do que parece: é elemento de texto cru, então um id contendo
        `</noscript>` fecharia a tag e injetaria marcação em toda página com
        JavaScript ligado.

        Agora o formato é CONFERIDO, e o que sobra é escapado. Não é paranoia
        com entrada de usuário — o dado é do repositório —, é não deixar um
        campo `string` sem contrato virar caminho de injeção num commit futuro.
      */}
      <noscript
        dangerouslySetInnerHTML={{
          __html:
            `<a class="video-facade-nojs" href="${escaparHtml(ytWatch(youtube))}"` +
            ` target="_blank" rel="noopener noreferrer">Assistir à aula no YouTube ↗</a>`,
        }}
      />
    </>
  );
}
