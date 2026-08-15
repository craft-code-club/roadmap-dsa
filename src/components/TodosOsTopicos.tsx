"use client";

import { useMemo, useState } from "react";
import { isEmptyTopic, type Topic } from "@content/topicos";
import { TopicoCard } from "@/components/TopicoCard";

/**
 * O índice completo dos tópicos do site: uma grade só, busca e assuntos.
 *
 * O MESMO CARD DO RESTO DO SITE, e essa é a razão de ele ser um card. Esta
 * página já mostrou os tópicos em linhas, e a linha cabia mais por tela; o que
 * ela não fazia era PARECER com o tópico. Quem chega aqui vindo de
 * `/roadmaps/fundamentos/` acabou de ver dezenas de cards com nome, nível e
 * etiquetas de material, e reencontrava a mesma coisa como uma tabela: dois
 * desenhos para o mesmo objeto, e a segunda tela obrigando a reaprender onde
 * está cada informação. O desenho vem do `TopicoCard`, sem cópia.
 *
 * SEM SEÇÕES, E POR ISSO OS ASSUNTOS
 * A página separava os tópicos em uma seção por assunto: dezesseis títulos e
 * dezesseis contadores numa tela cuja única função é ACHAR. A seção decide por
 * você o único recorte possível, e quem procura "grafos" tinha que rolar até
 * Grafos. Agora o assunto é uma etiqueta no card e um botão aqui em cima.
 *
 * DOIS CONTROLES, E SÓ DOIS. Uma versão anterior oferecia cinco famílias de
 * etiqueta (assunto, nível, material, estado, roadmap), com "E" entre todas.
 * Era poderoso e era demais: trinta e poucos botões antes do primeiro card,
 * numa página que a pessoa abre para achar UM tópico. Ficaram os dois recortes
 * que respondem às perguntas de verdade:
 *
 *   · o ESTADO do material, ao lado da busca, um de cada vez ("o que já dá
 *     para estudar?", "o que tem visualização?");
 *   · o ASSUNTO, embaixo, vários ao mesmo tempo.
 *
 * ENTRE ASSUNTOS É "OU", e é a única regra que faz sentido: um tópico tem UM
 * assunto, então "E" entre dois assuntos devolveria sempre zero. Marcar Grafos
 * e Árvores é pedir "me mostre os dois", que é o que a pessoa quer dizer. Entre
 * os dois controles é "E": o estado estreita o que os assuntos escolheram.
 *
 * A BUSCA FILTRA JUNTO, sem paginação nem "carregar mais": os dados já estão
 * todos no HTML (é SSG), então filtrar é uma passada num array de cinquenta
 * itens. Paginar seria esconder atrás de um clique o que já chegou.
 */

export type LinhaDeTopico = {
  topic: Topic;
  /** Os roadmaps que citam este tópico, pelo nome. Vazio = tópico avulso. */
  roadmaps: string[];
};

const semAcento = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

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

/** A busca casa nome, descrição, assunto e o nome dos roadmaps. */
function casaComBusca(l: LinhaDeTopico, b: string): boolean {
  if (!b) return true;
  const alvo = `${l.topic.name} ${l.topic.description} ${l.topic.group} ${l.roadmaps.join(" ")}`;
  return semAcento(alvo).includes(b);
}

export function TodosOsTopicos({ topicos }: { topicos: LinhaDeTopico[] }) {
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("tudo");
  const [assuntos, setAssuntos] = useState<string[]>([]);

  const b = semAcento(busca.trim());

  /** Os assuntos do acervo, em ordem alfabética, uma vez cada. */
  const todosOsAssuntos = useMemo(
    () => [...new Set(topicos.map((l) => l.topic.group))].sort((x, y) => x.localeCompare(y, "pt-BR")),
    [topicos]
  );

  const visiveis = useMemo(
    () =>
      topicos.filter(
        (l) =>
          casaComBusca(l, b) &&
          passaNoFiltro(l.topic, filtro) &&
          // Vazio quer dizer "todos", e não "nenhum": o estado inicial da
          // página não pode ser uma grade em branco.
          (assuntos.length === 0 || assuntos.includes(l.topic.group))
      ),
    [topicos, b, filtro, assuntos]
  );

  /**
   * Assuntos que ainda têm tópico depois da busca e do estado.
   *
   * Sem esta conta o leitor filtra por "Em breve", clica num assunto que só tem
   * tópico publicado e recebe uma grade vazia sem entender por quê. Aqui o
   * botão fica apagado antes do clique. Apagado, e não escondido: o assunto que
   * some faz concluir que o guia não o tem.
   */
  const comResultado = useMemo(() => {
    const ok = new Set<string>();
    for (const l of topicos) {
      if (casaComBusca(l, b) && passaNoFiltro(l.topic, filtro)) ok.add(l.topic.group);
    }
    return ok;
  }, [topicos, b, filtro]);

  const alternarAssunto = (a: string) =>
    setAssuntos((v) => (v.includes(a) ? v.filter((x) => x !== a) : [...v, a]));

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
        <div className="topicos-filtros" role="group" aria-label="Filtrar por material">
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

      {/* Os assuntos, embaixo e em linha própria: são dezesseis, e misturá-los
          com os quatro de cima faria um paredão de botões antes do primeiro
          card. `aria-pressed` em cada um porque são alternáveis e vários podem
          estar ligados ao mesmo tempo. */}
      <div className="topicos-assuntos" role="group" aria-label="Filtrar por assunto">
        {todosOsAssuntos.map((a) => {
          const on = assuntos.includes(a);
          return (
            <button
              key={a}
              type="button"
              className={`topicos-assunto${on ? " on" : ""}`}
              aria-pressed={on}
              disabled={!on && !comResultado.has(a)}
              onClick={() => alternarAssunto(a)}
            >
              {a}
            </button>
          );
        })}
        {assuntos.length > 0 && (
          <button type="button" className="topicos-limpar" onClick={() => setAssuntos([])}>
            Limpar assuntos
          </button>
        )}
      </div>

      {/* `role="status"` porque a contagem muda por causa de uma ação do
          leitor (digitar, filtrar) longe de onde ela aparece: sem a região
          viva, quem usa leitor de tela filtra e não recebe nenhum retorno. */}
      <p className="topicos-contagem" role="status">
        {visiveis.length === 0
          ? "Nenhum tópico com esse filtro."
          : `${visiveis.length} ${visiveis.length === 1 ? "tópico" : "tópicos"}`}
        {assuntos.length > 1 && ` em ${assuntos.length} assuntos`}
      </p>

      <div className="grid-3">
        {visiveis.map(({ topic, roadmaps }) => (
          <TopicoCard
            key={topic.slug}
            topic={topic}
            href={`/topicos/${topic.slug}`}
            origens={roadmaps}
            comAssunto
          />
        ))}
      </div>
    </>
  );
}
