"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  roadmapGroups,
  roadmapTopics,
  urlDoRoadmap,
  urlDoTopicoNoRoadmap,
  type Roadmap,
} from "@content/roadmaps";
import { isEmptyTopic } from "@content/topicos";
import { mesmaRota } from "@/lib/ui";
import { useProgress } from "@/components/ProgressProvider";
import { SideApoio } from "@/components/SideApoio";

// A barra lateral de um ROADMAP. Mesmas classes da barra dos Fundamentos, três
// diferenças de propósito:
//
//   1. Não tem busca. Os Fundamentos têm 46 tópicos e a busca é o que os torna
//      navegáveis; um roadmap tem 4 a 6, e um campo de busca sobre seis itens é
//      um controle que só ocupa espaço.
//   2. Os grupos não abrem nem fecham. Sanfona existe para caber 16 grupos numa
//      coluna; com dois ou três, ela esconde metade do roadmap atrás de um
//      clique e não economiza rolagem nenhuma.
//   3. Tem porta de saída no topo e no pé. Uma barra lateral sem volta é um
//      beco: o leitor entrou por um card e precisa saber como voltar para os
//      Fundamentos e como chegar aos outros roadmaps.
//
// OS LINKS APONTAM PARA DENTRO DO ROADMAP, e isso é o contrário do que parece
// natural. Um tópico tem página canônica em `/topicos/<slug>/`, e é tentador
// mandar a barra para lá. Mas quem está lendo o Bloom Filter DENTRO de "Bancos
// de Dados" e clica no vizinho quer continuar em Bancos de Dados: mandá-lo para
// a página canônica trocaria a barra embaixo do dedo dele e o expulsaria do
// roadmap no primeiro clique. Então a barra fala em `/roadmaps/<roadmap>/<slug>/`,
// e é a página canônica que oferece a ponte de volta.

export function RoadmapSidebar({ roadmap, mobileNav: _mobileNav }: { roadmap: Roadmap; mobileNav: boolean }) {
  const pathname = usePathname();
  const { hydrated, isTopico, toggleTopico, contarTopicos } = useProgress();

  // O tópico ativo pode chegar por duas rotas: a página dentro do roadmap
  // (`/roadmaps/<r>/<slug>/`, o caso normal aqui) e a canônica
  // (`/topicos/<slug>/`, quando o roadmap é a casa do tópico). As duas precisam
  // acender a mesma linha.
  const partes = (pathname ?? "").split("/").filter(Boolean);
  const slugAtivo =
    partes[0] === "roadmaps" && partes[2] ? partes[2] : partes[0] === "topico" ? partes[1] : null;

  const lista = roadmapTopics(roadmap);
  const feitos = contarTopicos(lista.map((t) => t.slug));
  const pct = hydrated && lista.length ? Math.round((feitos / lista.length) * 100) : 0;
  const naAbertura = mesmaRota(pathname, urlDoRoadmap(roadmap));

  return (
    <>
      <div className="side-head">
        <Link className="side-voltar" href="/fundamentos">
          <span aria-hidden="true">‹</span> Fundamentos
        </Link>
        <div className="side-head-row">
          <span className="side-label">Roadmap</span>
          <span className="side-count">{feitos}/{lista.length} · {pct}%</span>
        </div>
        {/* O nome do roadmap é link para a abertura dele: é de lá que vêm a
            descrição, os pré-requisitos e a ordem sugerida, e sem esta linha o
            leitor que clicou num tópico direto do card nunca chega àquela
            página. */}
        <Link
          href={urlDoRoadmap(roadmap)}
          className={`side-roadmap-nome${naAbertura ? " on" : ""}`}
          aria-current={naAbertura ? "page" : undefined}
        >
          {roadmap.name}
        </Link>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="side-scroll">
        {roadmapGroups(roadmap).map((g) => (
          <div className="side-group" key={g.id}>
            <div className="side-group-rotulo">{g.name}</div>
            <div className="side-items">
              {g.topicos.map((t) => {
                const feito = isTopico(t.slug);
                const ativo = slugAtivo === t.slug;
                const vazio = isEmptyTopic(t);
                return (
                  <div className={`side-row${ativo ? " on" : ""}`} key={t.slug}>
                    <button
                      type="button"
                      className={`side-check${feito ? " done" : ""}`}
                      role="checkbox"
                      aria-checked={feito}
                      aria-label={`Marcar ${t.name} como concluído`}
                      onClick={() => toggleTopico(t.slug)}
                    >
                      {/* O mesmo traço do `FundamentosSidebar`, do `FundamentosGroups` e
                          do `ProblemList`; o porquê medido de ser desenho, e
                          não o caractere `✓`, está no `globals.css`. */}
                      {feito ? (
                        <svg viewBox="0 0 12 12" aria-hidden="true" focusable="false">
                          <path
                            d="M2.4 6.4 5.1 8.6 9.6 3.4"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      ) : null}
                    </button>
                    <Link
                      href={urlDoTopicoNoRoadmap(roadmap, t.slug)}
                      className={`side-item${ativo ? " on" : ""}${vazio ? " soon" : ""}`}
                      aria-current={ativo ? "page" : undefined}
                    >
                      <span className="side-item-name">{t.name}</span>
                      {/* O tópico emprestado não muda de comportamento na lista,
                          mas muda de origem, e esconder isso seria esconder que
                          marcá-lo aqui conta nos Fundamentos também. O ponto é
                          discreto de propósito: informa quem procura, não
                          interrompe quem está lendo a lista. */}
                      {t.isNew && <span className="badge-novo">NOVO</span>}
                      {vazio && <span className="badge-soon">em breve</span>}
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        <Link className="side-extras" href="/roadmaps">
          <span className="side-extras-ico" aria-hidden="true">✧</span>
          <span>
            <span className="side-extras-nome">Outros roadmaps e tópicos</span>
            <span className="side-extras-sub">a vitrine completa</span>
          </span>
        </Link>
      </div>

      <SideApoio />
    </>
  );
}
