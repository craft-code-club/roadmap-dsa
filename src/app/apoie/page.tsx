import type { Metadata } from "next";
import { LINKS } from "@/lib/links";
import { pageMetadata } from "@/lib/seo";
import { fetchSupporters, initials, PARTNERS } from "./apoiadores";

// Era `export const metadata` estático e, por isso, sem canonical nem `og:url` —
// a quarta das 48 rotas que não diziam qual era a própria URL. Título e descrição
// seguem os mesmos; `titleStyle: "template"` preserva o " · Roadmap DSA" do fim.
export function generateMetadata(): Metadata {
  return pageMetadata({
    title: "Seja um apoiador da Comunidade",
    description:
      "O Roadmap de Estruturas de Dados e Algoritmos da comunidade Craft & Code Club é livre, aberto e feito pela comunidade. Conheça os apoiadores e parceiros que mantêm tudo gratuito, e junte-se a eles.",
    path: "/apoie/",
    titleStyle: "template",
    ogImage: "raiz",
  });
}

// Página estática: a lista de apoiadores é buscada na APOIA.se no build.
export const dynamic = "force-static";

export default async function ApoiePage() {
  const supporters = await fetchSupporters();
  return (
    <div className="apoie-wrap">
      <span className="hero-badge">Feito pela comunidade, para a comunidade</span>
      <h1>Seja um apoiador da Comunidade</h1>
      <p className="lead">
        O Roadmap de Estruturas de Dados e Algoritmos da comunidade Craft &amp; Code Club é{" "}
        <strong style={{ color: "#fff" }}>livre, aberto e feito pela comunidade</strong>.
        Ele se mantém com o apoio de pessoas e empresas que acreditam em ensino de qualidade e
        gratuito para todo mundo. Sem paywall, sem login e{" "}
        <strong style={{ color: "#fff" }}>sem anúncios, nunca</strong>.
      </p>

      {/* Apoio principal: a comunidade */}
      <div className="cta-card coffee" style={{ marginBottom: 16 }}>
        <div className="cta-eyebrow" style={{ color: "#fcd34d" }}><span>♥</span>Apoie a comunidade</div>
        <h3>Seja um apoiador</h3>
        <p style={{ color: "#dcc9a8", maxWidth: "54ch" }}>
          Sua contribuição, do valor que você quiser, mantém o conteúdo saindo e as visualizações
          novas chegando, e deixa o guia livre e aberto para quem vem depois. E você entra na lista
          de apoiadores abaixo.
        </p>
        <a href={LINKS.apoiar} className="btn btn-coffee" target="_blank" rel="noopener noreferrer">Quero apoiar →</a>
      </div>

      {/* Contribuir com tempo */}
      <div className="feature-card" style={{ marginBottom: 40 }}>
        <h3 style={{ marginTop: 0, fontSize: 16 }}>Da comunidade pra comunidade, contribua</h3>
        <p className="prose-p" style={{ fontSize: 14, marginBottom: 10 }}>
          O código e o conteúdo são abertos. Corrija um erro, escreva um tópico ou crie um
          visualizador, e entre nos créditos.
        </p>
        <ul className="prose-ul" style={{ marginBottom: 0, fontSize: 14 }}>
          <li className="prose-li">Contribua no <a className="prose-a" href={LINKS.github} target="_blank" rel="noopener noreferrer">GitHub</a> e reporte problemas.</li>
          <li className="prose-li">Participe das maratonas semanais no <a className="prose-a" href={LINKS.discord} target="_blank" rel="noopener noreferrer">Discord</a>.</li>
          <li className="prose-li">Compartilhe com quem está estudando para entrevistas.</li>
        </ul>
      </div>

      {/* Apoiadores (pessoas) */}
      <section style={{ marginBottom: 40 }}>
        <div className="wall-head">
          <h2>Apoiadores</h2>
          <span className="wall-sub">Pessoas que bancam o projeto</span>
        </div>
        {supporters.length > 0 ? (
          <>
            {/* Painel de gratidão: o número vem da lista, não é escrito à mão. */}
            <div className="gratidao">
              <span className="gratidao-eyebrow">Gratidão</span>
              <p className="gratidao-titulo">
                <span className="gratidao-n">{supporters.length}</span>{" "}
                {supporters.length === 1 ? "pessoa já apoia" : "pessoas já apoiam"}{" "}
                a comunidade Craft &amp; Code Club.
              </p>
              <p className="gratidao-texto">
                Cada apoio ajuda a manter o site no ar, os encontros acontecendo e o conteúdo livre e
                aberto para quem chegar depois.
              </p>
              <ul className="gratidao-fatos">
                <li>
                  <strong>Conteúdo aberto</strong>
                  <span>sem paywall e sem anúncios</span>
                </li>
                <li>
                  <strong>Encontros</strong>
                  <span>gratuitos e abertos a todo mundo</span>
                </li>
              </ul>
            </div>

            <div className="apoiadores-grid">
              {supporters.map((a) => (
                <div key={a.name} className="apoiador-card">
                  <span className="apoiador-avatar" aria-hidden="true">{initials(a.name)}</span>
                  <span className="apoiador-nome">{a.name}</span>
                </div>
              ))}
              <a
                className="apoiador-card apoiador-card-cta"
                href={LINKS.apoiar}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="apoiador-avatar" aria-hidden="true">+</span>
                <span className="apoiador-corpo">
                  <span className="apoiador-nome">Seu nome aqui</span>
                  <span className="apoiador-cta-sub">Quero apoiar →</span>
                </span>
              </a>
            </div>
          </>
        ) : (
          <div className="wall-empty">
            <p>Ainda não há apoiadores por aqui. <strong style={{ color: "#fff" }}>Seja o primeiro</strong> a sustentar o maior guia de Estruturas de Dados e Algoritmos em português.</p>
            <a href={LINKS.apoiar} className="btn btn-coffee" target="_blank" rel="noopener noreferrer">Quero apoiar →</a>
          </div>
        )}
      </section>

      {/* Parceiros (empresas) */}
      <section>
        <div className="wall-head">
          <h2>Parceiros</h2>
          <span className="wall-sub">Empresas que apoiam a comunidade</span>
        </div>
        {PARTNERS.length > 0 ? (
          <div className="parceiros-grid">
            {PARTNERS.map((p) =>
              p.url ? (
                <a key={p.name} className="parceiro-card" href={p.url} target="_blank" rel="noopener noreferrer">{p.name}</a>
              ) : (
                <span key={p.name} className="parceiro-card">{p.name}</span>
              )
            )}
          </div>
        ) : (
          <div className="wall-empty">
            <p>
              Sua empresa pode ser a primeira parceira. Apoie o maior guia de Estruturas de Dados
              e Algoritmos em português, alcance quem está estudando para entrevistas e apareça aqui.
            </p>
            <a href={LINKS.discord} className="btn btn-discord" target="_blank" rel="noopener noreferrer">Falar com a gente</a>
          </div>
        )}
      </section>
    </div>
  );
}
