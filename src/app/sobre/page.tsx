import type { Metadata } from "next";
import Link from "next/link";
import {
  TOTAL_PROBLEMS,
  TOTAL_TOPICS,
  TOTAL_TOPICS_PRONTOS,
  TOTAL_VISUALIZERS,
} from "@content/roadmap";
import { LINKS } from "@/lib/links";
import { pageMetadata } from "@/lib/seo";

// A página que responde "quem está por trás disto?".
//
// Ela existe porque o site afirmava autoria em três lugares soltos (o "por
// Craft & Code Club" da marca, o "feito pela comunidade" do rodapé e o
// `Organization` do JSON-LD) e não tinha uma única URL para onde apontar quem
// quisesse conferir. Agora tem, e é ela que o `author` do tópico descreve.
//
// ⚠️ REGRA DESTA PÁGINA: só entra o que dá para conferir no próprio
// repositório ou nos canais linkados. Nada de data de fundação, número de
// membros, história de origem ou nome de pessoa: nenhum desses fatos existe
// escrito em lugar nenhum daqui, e uma página "sobre" com fato inventado é pior
// do que uma página curta. O que falta está marcado em bloco, mais abaixo.
//
// Os números vêm do `content/roadmap.ts`, como na home: tópico novo entra aqui
// sozinho, no mesmo PR que o cria.

export function generateMetadata(): Metadata {
  return pageMetadata({
    title: "Sobre o Roadmap DSA",
    description: `Quem faz o Roadmap DSA, por que ele é gratuito e como contribuir. Um guia visual de algoritmos e estruturas de dados em português, com ${TOTAL_TOPICS} tópicos, feito pela comunidade Craft & Code Club.`,
    path: "/sobre/",
    titleStyle: "template",
    // Mesmo caso do /apoie, e pelo mesmo motivo: esta página fala do projeto
    // inteiro, não de um conteúdo próprio, e não tem (nem vai ter) card de
    // compartilhamento no segmento dela.
    ogImage: "raiz",
  });
}

export const dynamic = "force-static";

export default function SobrePage() {
  return (
    <div className="intro-wrap">
      <span className="hero-badge">Sobre</span>
      <h1>Sobre o Roadmap DSA</h1>
      <p className="lead">
        O <strong style={{ color: "#fff" }}>Roadmap DSA</strong> é um guia visual e gratuito de
        Algoritmos e Estruturas de Dados em português, feito pela comunidade{" "}
        <a className="prose-a" href={LINKS.site} target="_blank" rel="noopener noreferrer">
          Craft &amp; Code Club
        </a>
        . Ele é aberto: o código e o conteúdo ficam no GitHub, e qualquer pessoa pode ler,
        estudar, adaptar e propor mudança.
      </p>

      <h2 className="prose-h2">O que você encontra aqui</h2>
      <p className="prose-p">
        A trilha tem <strong className="prose-strong">{TOTAL_TOPICS} tópicos</strong>, dos quais{" "}
        <strong className="prose-strong">{TOTAL_TOPICS_PRONTOS} já têm material publicado</strong>.
        Cada tópico vive numa página só, e reúne o que estiver disponível para ele: o algoritmo
        rodando passo a passo, o artigo, o vídeo do canal da comunidade, os problemas para
        praticar e as referências para se aprofundar.
      </p>
      <ul className="prose-ul">
        <li className="prose-li">
          <strong className="prose-strong">{TOTAL_VISUALIZERS} tópicos com visualização</strong>{" "}
          interativa: você roda o algoritmo no seu ritmo, com a sua entrada, e acompanha o código
          linha a linha.
        </li>
        <li className="prose-li">
          <strong className="prose-strong">{TOTAL_PROBLEMS} problemas selecionados</strong> do
          LeetCode e do GeeksforGeeks, na ordem em que recomendamos resolver.
        </li>
        <li className="prose-li">
          Progresso salvo <strong className="prose-strong">no seu navegador</strong>: os tópicos e
          problemas que você marca ficam no armazenamento local deste aparelho. Não há conta, não
          há login, e o que você marcou não é enviado para servidor nenhum.
        </li>
      </ul>

      {/* Esta frase já esteve errada, e vale dizer por quê: ela dizia que "nada é
          enviado para lugar nenhum", sem qualificar, enquanto o site carrega
          Google Analytics em produção (`src/components/Analytics.tsx`). Uma
          página institucional afirmando o que o próprio site desmente é o pior
          tipo de erro que ela pode ter. Cada afirmação abaixo é verificável no
          código, e o teste `a /sobre não promete privacidade que o código
          desmente` amarra a página ao `Analytics.tsx`. */}
      <p className="prose-p">
        O que sai do seu navegador: em produção o site carrega o{" "}
        <strong className="prose-strong">Google Analytics</strong>, que registra as páginas
        visitadas. É a única medição do site: não há outro rastreador, nem anúncio. Ela só é
        carregada depois que a página termina de abrir, e não existe em preview de Pull Request
        nem quando você roda o projeto na sua máquina. O seu progresso não vai junto: ele nunca
        sai do armazenamento local.
      </p>
      <p className="prose-p">
        <Link className="prose-a" href="/roadmap/">
          Ver o roadmap completo
        </Link>{" "}
        ou{" "}
        <Link className="prose-a" href="/introducao/">
          começar pela introdução
        </Link>
        .
      </p>

      <h2 className="prose-h2">Quem faz</h2>
      <p className="prose-p">
        O guia é publicado pela comunidade Craft &amp; Code Club, e é dela a autoria do conteúdo:
        as aulas que dão origem aos tópicos são gravadas e publicadas no canal da comunidade, e o
        material escrito nasce dos encontros. As contribuições chegam por Pull Request no
        repositório aberto, de quem quiser participar.
      </p>

      {/* ────────────────────────────────────────────────────────────────────
          PARA O WILSON ESCREVER, bloco 1 de 2: a história da comunidade.

          O que falta, e o que eu NÃO escrevi por não ter como conferir:

            · quando o Craft & Code Club começou, e por quê;
            · quem tocou o projeto no começo e quem toca hoje (nomes);
            · o tamanho da comunidade hoje (pessoas no Discord, inscritos).

          Por que ficou vazio em vez de preenchido: nenhum desses fatos está
          escrito no repositório. O `LICENSE` traz "Copyright © 2026", que é ano
          de copyright e NÃO data de fundação; usá-lo como tal seria inventar.
          Os 34 vídeos que alimentam os tópicos têm todos
          `ownerChannelName: "Craft & Code Club"` e nenhuma das 34 descrições
          cita o nome de uma pessoa; o `git log` deste repositório tem uma única
          conta humana. Ou seja: não há de onde tirar nome nem data.

          É a MESMA razão pela qual o `author` do JSON-LD aponta para a
          organização e não para uma pessoa (ver `src/lib/jsonld.ts`, constante
          `AUTOR`). Se você escrever nomes aqui, o `author` de lá pode passar a
          nomear a mesma pessoa, porque a regra do arquivo é que a marcação reflita o
          que está na tela, e a partir daí o nome estaria na tela.

          Onde escrever: um `<p className="prose-p">` logo abaixo, dentro desta
          mesma seção "Quem faz".
          ──────────────────────────────────────────────────────────────────── */}

      <h2 className="prose-h2">Onde a comunidade acontece</h2>
      <p className="prose-p">
        O guia é uma das frentes do Craft &amp; Code Club. As outras:
      </p>
      <ul className="prose-ul">
        <li className="prose-li">
          <a className="prose-a" href={LINKS.discord} target="_blank" rel="noopener noreferrer">
            Discord
          </a>{" "}
          para dúvidas, revisão de código e as maratonas de problemas. É o canal mais rápido
          para falar com a gente.
        </li>
        <li className="prose-li">
          <a className="prose-a" href={LINKS.youtube} target="_blank" rel="noopener noreferrer">
            YouTube
          </a>{" "}
          com as gravações dos encontros, que são o vídeo de cada tópico.
        </li>
        <li className="prose-li">
          <a className="prose-a" href={LINKS.eventos} target="_blank" rel="noopener noreferrer">
            Eventos
          </a>{" "}
          e{" "}
          <a
            className="prose-a"
            href={LINKS.clubeDoLivro}
            target="_blank"
            rel="noopener noreferrer"
          >
            clube do livro
          </a>{" "}
          mostram o que a comunidade faz além do roadmap.
        </li>
        <li className="prose-li">
          <a className="prose-a" href={LINKS.blog} target="_blank" rel="noopener noreferrer">
            Blog
          </a>{" "}
          com artigos publicados fora do guia.
        </li>
      </ul>

      <h2 className="prose-h2">Gratuito, e por quê</h2>
      <p className="prose-p">
        Tudo aqui é gratuito: sem paywall, sem login e sem anúncios. A ideia é que quem está
        estudando para uma entrevista, ou aprendendo do zero, não precise pagar por isso. O
        projeto se mantém com o apoio de quem acha que ele deve continuar existindo. Se for o seu
        caso,{" "}
        <Link className="prose-a" href="/apoie/">
          conheça a página de apoio
        </Link>
        , que também lista quem já apoia.
      </p>

      <h2 className="prose-h2">Como contribuir</h2>
      <p className="prose-p">
        Corrigir um erro, escrever um tópico, criar um visualizador ou só apontar o que está
        confuso: tudo entra pelo repositório, e quem contribui entra nos créditos.
      </p>
      <ul className="prose-ul">
        <li className="prose-li">
          O código e o conteúdo estão em{" "}
          <a className="prose-a" href={LINKS.github} target="_blank" rel="noopener noreferrer">
            craft-code-club/roadmap-dsa
          </a>
          , no GitHub. O guia de contribuição (
          <a
            className="prose-a"
            href={`${LINKS.github}/blob/main/CONTRIBUTING.md`}
            target="_blank"
            rel="noopener noreferrer"
          >
            CONTRIBUTING
          </a>
          ) explica como rodar o projeto e como abrir um Pull Request.
        </li>
        <li className="prose-li">
          Achou um erro no conteúdo e não quer mexer em código? Abra uma issue no repositório ou
          avise no{" "}
          <a className="prose-a" href={LINKS.discord} target="_blank" rel="noopener noreferrer">
            Discord
          </a>
          .
        </li>
      </ul>

      <h2 className="prose-h2">Licença</h2>
      <p className="prose-p">
        São duas licenças, porque são duas coisas. E a fronteira não é por diretório: ela
        atravessa arquivos, porque num visualizador o componente é código e as explicações que
        aparecem na tela são conteúdo.
      </p>
      <ul className="prose-ul">
        <li className="prose-li">
          <strong className="prose-strong">O código</strong> está sob{" "}
          <a
            className="prose-a"
            href={`${LINKS.github}/blob/main/LICENSE`}
            target="_blank"
            rel="noopener noreferrer"
          >
            MIT
          </a>
          : open source pela definição da OSI, com uso comercial permitido. Pegue o motor dos
          visualizadores e construa outra coisa, se quiser.
        </li>
        <li className="prose-li">
          <strong className="prose-strong">O conteúdo didático</strong> está sob{" "}
          <a
            className="prose-a"
            href={`${LINKS.github}/blob/main/LICENSE-CONTENT`}
            target="_blank"
            rel="noopener noreferrer"
          >
            CC BY-NC-SA 4.0
          </a>
          : você pode compartilhar e adaptar, dando crédito (BY), sem uso comercial (NC) e
          distribuindo a adaptação sob esta mesma licença (SA).
        </li>
      </ul>
      <p className="prose-p">
        A regra completa, com os casos que mais confundem, está no arquivo{" "}
        <a
          className="prose-a"
          href={`${LINKS.github}/blob/main/LICENSE`}
          target="_blank"
          rel="noopener noreferrer"
        >
          LICENSE
        </a>
        , na seção &ldquo;onde passa a fronteira&rdquo;.
      </p>

      {/* ────────────────────────────────────────────────────────────────────
          PARA O WILSON ESCREVER, bloco 2 de 2: o convite do fim.

          Falta a frase de fechamento: o que você quer que a pessoa faça
          depois de ler a página. Deixei sem porque as opções são decisão sua e
          nenhuma delas é um fato que dê para conferir: entrar no Discord,
          começar pelo Big O, apoiar, contribuir. As quatro já têm link em
          algum lugar acima, então o fecho é sobre a ÊNFASE, não sobre
          informação nova.

          Se quiser um cartão com botão, o padrão pronto é o `.cta-card` do
          `/apoie` (`src/app/apoie/page.tsx`). Mas atenção: lá o título do
          cartão é `<h2>` com estilo copiado da regra `.cta-card h3`, porque a
          hierarquia de títulos da página não pode pular nível. Um `<h3>` aqui
          logo depois de um `<h2>` é válido; um `<h3>` sem `<h2>` antes não é, e
          o teste `nenhuma rota pula um nível de título` reprova.
          ──────────────────────────────────────────────────────────────────── */}
    </div>
  );
}
