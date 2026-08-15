"use client";

import Link from "next/link";
import { roadmapsDoTopico, urlDoRoadmap, urlDoTopicoNoRoadmap, roadmapTopics } from "@content/roadmaps";
import { useProgress } from "@/components/ProgressProvider";
import { SideApoio } from "@/components/SideApoio";

// A barra lateral de `/topicos/<slug>/`: os roadmaps de que o tópico participa.
//
// Esta rota é a do tópico SOZINHO. Ela é o destino do índice `/topicos/` e dos
// links dentro dos artigos — de quem chegou ao tópico sem estar percorrendo
// nada. Mostrar aqui a lista de um roadmap seria escolher um por ele, e a
// escolha mudaria no dia em que um segundo roadmap o citasse.
//
// Então a barra mostra a única coisa que é verdade sobre ele: em que percursos
// ele aparece. É a pergunta que o leitor tem nesse ponto ("isto faz parte de
// quê?"), e a resposta é também a porta para continuar estudando com sequência.
export function TopicoSidebar({ slug, nome }: { slug: string; nome: string }) {
  const { hydrated, contarTopicos } = useProgress();
  const roadmaps = roadmapsDoTopico(slug);
  if (roadmaps.length === 0) return null;

  return (
    <>
      <div className="side-head">
        <div className="side-head-row">
          <span className="side-label">Este tópico está em</span>
          <span className="side-count">{roadmaps.length}</span>
        </div>
        <p className="side-topico-nome">{nome}</p>
      </div>

      <div className="side-scroll">
        {roadmaps.map((r) => {
          const lista = roadmapTopics(r);
          const feitos = contarTopicos(lista.map((t) => t.slug));
          const pct = hydrated && lista.length ? Math.round((feitos / lista.length) * 100) : 0;
          return (
            <div className="side-roadmap-item" key={r.slug}>
              <Link className="side-roadmap-link" href={urlDoRoadmap(r)}>
                <span className="side-roadmap-glifo" aria-hidden="true">{r.glyph}</span>
                <span className="side-roadmap-texto">
                  <span className="side-roadmap-titulo">{r.name}</span>
                  <span className="side-count">{feitos}/{lista.length} · {pct}%</span>
                </span>
              </Link>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${pct}%` }} />
              </div>
              {/* O atalho que interessa de verdade: continuar a leitura DENTRO
                  daquele roadmap, na posição em que este tópico está nele. */}
              <Link className="side-roadmap-abrir" href={urlDoTopicoNoRoadmap(r, slug)}>
                Ler dentro deste roadmap →
              </Link>
            </div>
          );
        })}

        <Link className="side-extras" href="/topicos">
          <span className="side-extras-ico" aria-hidden="true">≡</span>
          <span>
            <span className="side-extras-nome">Todos os tópicos</span>
            <span className="side-extras-sub">o índice completo</span>
          </span>
        </Link>
      </div>

      <SideApoio />
    </>
  );
}
