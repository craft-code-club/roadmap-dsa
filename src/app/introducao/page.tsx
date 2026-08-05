import type { Metadata } from "next";
import Link from "next/link";
import { LINKS } from "@/lib/links";
import { pageMetadata } from "@/lib/seo";

export function generateMetadata(): Metadata {
  return pageMetadata({
    title: "Por onde começar em Algoritmos e Estruturas de Dados",
    description:
      "Guia para quem está começando em algoritmos e estruturas de dados: o que estudar primeiro, em que ordem e como se preparar para entrevistas técnicas.",
    ogTitle: "Por onde começar em Algoritmos e Estruturas de Dados",
    ogDescription:
      "O que estudar primeiro, em que ordem, e como usar o roadmap para se preparar para entrevistas.",
    path: "/introducao/",
  });
}

export const dynamic = "force-static";

export default function IntroducaoPage() {
  return (
    <div className="intro-wrap">
      <span className="hero-badge">Introdução</span>
      <h1>Por onde começar</h1>
      <p className="lead">
        Boas-vindas ao <strong style={{ color: "#fff" }}>Roadmap DSA</strong>, o maior guia visual e
        gratuito de Estruturas de Dados e Algoritmos em português, feito pela comunidade Craft &amp;
        Code Club. A proposta é simples: você aprende <strong style={{ color: "#fff" }}>vendo o
        algoritmo rodar</strong>, no seu ritmo, em vez de decorar teoria.
      </p>

      <h2 className="prose-h2">Aprender vendo, não decorando</h2>
      <p className="prose-p">
        Cada tópico vive numa página só, com tudo no mesmo lugar: o
        <strong className="prose-strong"> algoritmo animado passo a passo</strong>, um
        <strong className="prose-strong"> artigo</strong> direto ao ponto, o
        <strong className="prose-strong"> vídeo</strong> da aula, uma lista curada de
        <strong className="prose-strong"> problemas</strong> do LeetCode e do GeeksforGeeks e
        <strong className="prose-strong"> referências</strong> para se aprofundar. Você roda a
        visualização com o seu próprio exemplo e vê exatamente o que acontece a cada passo.
      </p>

      <h2 className="prose-h2">Por que Python?</h2>
      <p className="prose-p">
        Os exemplos e as soluções deste guia são em <strong className="prose-strong">Python</strong>.
        Não porque você precise conhecer a linguagem, mas porque a sintaxe do Python é limpa e
        enxuta, fácil de ler mesmo sem conhecer a linguagem: dá para entender a ideia sem ruído e é
        fácil traduzir a solução para a que você usa, seja Java, C++, JavaScript ou outra. Nas
        visualizações, esse código aparece ao lado das células e destaca a linha que está rodando a
        cada passo.
      </p>

      <h2 className="prose-h2">Como seguir</h2>
      <p className="prose-p">
        Se está começando agora, siga a trilha na ordem, de cima para baixo na barra lateral. A
        sugestão é firmar os fundamentos primeiro e ir subindo aos poucos:
      </p>
      <ol className="prose-ol">
        <li className="prose-li">
          <strong className="prose-strong">Firme o básico:</strong> Notação Big O e, na sequência,
          Arrays e Listas e Strings. É a fundação de quase tudo que vem depois.
        </li>
        <li className="prose-li">
          <strong className="prose-strong">Pegue os primeiros padrões:</strong> Two Pointers e
          Sliding Window resolvem uma penca de problemas e aparecem o tempo todo.
        </li>
        <li className="prose-li">
          <strong className="prose-strong">Pratique de verdade:</strong> resolva os problemas de
          cada tópico, na ordem sugerida. É praticando que o conteúdo gruda.
        </li>
        <li className="prose-li">
          <strong className="prose-strong">Marque o progresso:</strong> cada tópico e cada problema
          tem um check que fica salvo no seu navegador, sem login.
        </li>
        <li className="prose-li">
          <strong className="prose-strong">Travou? Não trave sozinho:</strong> traga a sua dúvida
          para o Discord da comunidade.
        </li>
      </ol>

      <div className="hero-actions" style={{ marginTop: 28 }}>
        <Link href="/topico/big-o" className="btn btn-primary">Começar por Big O</Link>
        <Link href="/roadmap" className="btn">Ver o roadmap completo</Link>
      </div>

      <div className="cta-card discord" style={{ marginTop: 44 }}>
        <div className="cta-eyebrow" style={{ color: "#a9b3ff" }}>
          <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#5865f2" }} />Comunidade
        </div>
        <h3>Estudar junto é mais fácil</h3>
        <p style={{ color: "#b4c1de" }}>
          Entra no Discord da comunidade Craft &amp; Code Club: maratona semanal de problemas,
          revisão de código e gente resolvendo as mesmas questões que você.
        </p>
        <a href={LINKS.discord} className="btn btn-discord" target="_blank" rel="noopener noreferrer">
          Entrar no Discord →
        </a>
      </div>
    </div>
  );
}
