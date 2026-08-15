"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { isEmptyTopic, topicTags, type Topic } from "@content/topicos";
import { levelClass } from "@/lib/ui";
import { useProgress } from "@/components/ProgressProvider";

/**
 * A lista completa dos tópicos do site, em linhas.
 *
 * LINHA, E NÃO CARD. São 80 e poucos tópicos: em cards de três colunas isso é
 * uma tela de rolagem de card grande, bonita e inútil para a única coisa que se
 * faz aqui, que é ACHAR um tópico. A linha cabe mais por tela, alinha nome com
 * nome, e deixa nível e etiquetas na mesma coluna, comparáveis de relance.
 *
 * A BUSCA FILTRA E A LISTA ENCOLHE, sem paginação nem "carregar mais": os dados
 * já estão todos no HTML (é SSG), então filtrar é uma passada num array de 80
 * itens. Paginar seria esconder atrás de um clique o que já chegou.
 *
 * Aqui a busca casa nome, descrição, grupo E casa, que é uma a mais do que a da
 * barra lateral: nesta página o leitor pode estar procurando "o que existe de
 * bancos de dados", e o nome do roadmap é a resposta.
 */

export type LinhaDeTopico = {
  topic: Topic;
  /** Os roadmaps que citam este tópico, pelo nome. Pode ser vazio. */
  roadmaps: string[];
};

export type SecaoDeTopicos = { id: string; nome: string; sub?: string; linhas: LinhaDeTopico[] };

const semAcento = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

type Filtro = "tudo" | "prontos" | "visual" | "breve";

const FILTROS: { id: Filtro; rotulo: string }[] = [
  { id: "tudo", rotulo: "Todos" },
  { id: "prontos", rotulo: "Publicados" },
  { id: "visual", rotulo: "Com visualização" },
  { id: "breve", rotulo: "Em breve" },
];

function passaNoFiltro(t: Topic, f: Filtro): boolean {
  if (f === "prontos") return !isEmptyTopic(t);
  if (f === "visual") return !!t.viz;
  if (f === "breve") return isEmptyTopic(t);
  return true;
}

export function TodosOsTopicos({ secoes }: { secoes: SecaoDeTopicos[] }) {
  const { isTopico, toggleTopico } = useProgress();
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("tudo");

  const b = semAcento(busca.trim());

  const visiveis = useMemo(
    () =>
      secoes
        .map((s) => ({
          ...s,
          linhas: s.linhas.filter((l) => {
            if (!passaNoFiltro(l.topic, filtro)) return false;
            if (!b) return true;
            const alvo = `${l.topic.name} ${l.topic.description} ${l.topic.group} ${l.roadmaps.join(" ")}`;
            return semAcento(alvo).includes(b);
          }),
        }))
        .filter((s) => s.linhas.length > 0),
    [secoes, b, filtro]
  );

  const total = visiveis.reduce((n, s) => n + s.linhas.length, 0);

  return (
    <>
      <div className="topicos-controles">
        <label className="sr-only" htmlFor="busca-todos">
          Buscar entre todos os tópicos
        </label>
        <input
          id="busca-todos"
          className="side-search topicos-busca"
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome, assunto ou roadmap…"
        />
        <div className="topicos-filtros" role="group" aria-label="Filtrar tópicos">
          {FILTROS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`topicos-filtro${filtro === f.id ? " on" : ""}`}
              aria-pressed={filtro === f.id}
              onClick={() => setFiltro(f.id)}
            >
              {f.rotulo}
            </button>
          ))}
        </div>
      </div>

      {/* `role="status"` porque a contagem muda por causa de uma ação do
          leitor (digitar, filtrar) longe de onde ela aparece: sem a região
          viva, quem usa leitor de tela filtra e não recebe nenhum retorno. */}
      <p className="topicos-contagem" role="status">
        {total === 0
          ? "Nenhum tópico com esse filtro."
          : `${total} ${total === 1 ? "tópico" : "tópicos"}`}
      </p>

      {visiveis.map((s) => (
        <section className="rgroup" id={s.id} key={s.id}>
          <div className="rgroup-head">
            <h2>{s.nome}</h2>
            <span className="rgroup-count">{s.linhas.length}</span>
            <div className="rgroup-rule" />
          </div>
          {s.sub && <p className="topicos-sub">{s.sub}</p>}
          <ul className="topicos-lista">
            {s.linhas.map(({ topic: t, roadmaps }) => {
              const feito = isTopico(t.slug);
              const vazio = isEmptyTopic(t);
              return (
                <li className={`topico-linha${feito ? " done" : ""}`} key={t.slug}>
                  <button
                    type="button"
                    className={`side-check${feito ? " done" : ""}`}
                    role="checkbox"
                    aria-checked={feito}
                    aria-label={`Marcar ${t.name} como concluído`}
                    onClick={() => toggleTopico(t.slug)}
                  >
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
                  <Link href={`/topicos/${t.slug}`} className="topico-linha-link">
                    <span className="topico-linha-nome">
                      {t.name}
                      {t.isNew && <span className="badge-novo">NOVO</span>}
                      {vazio && <span className="badge-soon">em breve</span>}
                    </span>
                    <span className="topico-linha-desc">{t.description}</span>
                  </Link>
                  <span className="topico-linha-tags">
                    <span className={`level ${levelClass(t.level)}`}>{t.level}</span>
                    {topicTags(t).map((tag) => (
                      <span key={tag.kind} className={`ttag ttag-${tag.kind}`}>{tag.label}</span>
                    ))}
                    {/* Em que percursos ele aparece. É a informação que só
                        esta página tem condição de dar: nas outras telas o
                        leitor vê um roadmap por vez. */}
                    {roadmaps.map((nome) => (
                      <span key={nome} className="ttag ttag-origem">{nome}</span>
                    ))}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </>
  );
}
