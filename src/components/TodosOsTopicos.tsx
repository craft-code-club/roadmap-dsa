"use client";

import { useMemo, useState } from "react";
import { isEmptyTopic, type Topic } from "@content/topicos";
import { GrupoCards } from "@/components/GrupoCards";

/**
 * O índice completo dos tópicos do site, em cards, com busca.
 *
 * O MESMO CARD DO RESTO DO SITE, e essa é a razão de ele ser um card. Esta
 * página já mostrou os tópicos em linhas, e a linha cabia mais por tela; o que
 * ela não fazia era PARECER com o tópico. Quem chega aqui vindo de
 * `/roadmaps/fundamentos/` acabou de ver quarenta e seis cards com nome, nível
 * e etiquetas de material, e reencontrava a mesma coisa como uma tabela: dois
 * desenhos para o mesmo objeto, e a segunda tela obrigando a reaprender onde
 * está cada informação. O desenho vem do `GrupoCards`, sem cópia.
 *
 * O QUE SÓ ESTA PÁGINA MOSTRA é a coluna que falta em todas as outras: em que
 * percursos cada tópico aparece, e quais não aparecem em nenhum. Nas outras
 * telas o leitor vê um roadmap por vez, e a pergunta "onde mais isto está?" não
 * tem onde ser respondida.
 *
 * A BUSCA FILTRA E A GRADE ENCOLHE, sem paginação nem "carregar mais": os dados
 * já estão todos no HTML (é SSG), então filtrar é uma passada num array de
 * cinquenta itens. Paginar seria esconder atrás de um clique o que já chegou.
 *
 * A busca casa nome, descrição, assunto E o nome dos roadmaps, que é um campo a
 * mais do que a da barra lateral: aqui o leitor pode estar procurando "o que
 * existe de caminhos mínimos", e o nome do roadmap é a resposta.
 */

export type LinhaDeTopico = {
  topic: Topic;
  /** Os roadmaps que citam este tópico, pelo nome. Vazio = tópico avulso. */
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

      {/* O desenho do card, e a marca de concluído, vêm do `GrupoCards`: é o
          mesmo componente da abertura de cada roadmap. O que esta página
          acrescenta é o `origens` de cada item, que é a informação que só ela
          tem condição de dar. */}
      <GrupoCards
        groups={visiveis.map((s) => ({
          id: s.id,
          name: s.nome,
          itens: s.linhas.map(({ topic, roadmaps }) => ({
            topic,
            href: `/topicos/${topic.slug}`,
            origens: roadmaps,
          })),
        }))}
      />
    </>
  );
}
