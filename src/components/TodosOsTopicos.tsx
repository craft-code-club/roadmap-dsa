"use client";

import { useMemo, useState } from "react";
import { isEmptyTopic, topicTags, type Topic } from "@content/topicos";
import { TopicoCard } from "@/components/TopicoCard";

/**
 * O índice completo dos tópicos do site: uma grade só, busca e etiquetas.
 *
 * O MESMO CARD DO RESTO DO SITE, e essa é a razão de ele ser um card. Esta
 * página já mostrou os tópicos em linhas, e a linha cabia mais por tela; o que
 * ela não fazia era PARECER com o tópico. Quem chega aqui vindo de
 * `/roadmaps/fundamentos/` acabou de ver dezenas de cards com nome, nível e
 * etiquetas de material, e reencontrava a mesma coisa como uma tabela: dois
 * desenhos para o mesmo objeto, e a segunda tela obrigando a reaprender onde
 * está cada informação. O desenho vem do `TopicoCard`, sem cópia.
 *
 * SEM SEÇÕES, E POR ISSO AS ETIQUETAS
 * A página separava os tópicos em uma seção por assunto. Dezesseis títulos e
 * dezesseis contadores para uma tela cuja única função é ACHAR: a seção decide
 * por você o único recorte possível, e quem procura "o que tem de grafos com
 * visualização" tinha que rolar até Grafos e ler card a card. Agora o assunto é
 * uma ETIQUETA no card, e todas as etiquetas do acervo ficam clicáveis em cima.
 *
 * O FILTRO É "E", e essa foi a escolha: cada etiqueta que entra TIRA tópicos da
 * grade, sempre, sem exceção por família. É a regra que dá para prever sem ler
 * documentação nenhuma. O preço óbvio dela seria chegar a zero clicando (dois
 * assuntos ao mesmo tempo, por exemplo, porque um tópico tem um assunto só), e
 * é por isso que as etiquetas que zerariam o resultado ficam DESLIGADAS em vez
 * de clicáveis: o leitor não consegue construir uma pergunta sem resposta.
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

/**
 * As FAMÍLIAS de etiqueta, na ordem em que a barra as apresenta.
 *
 * A ordem não é decorativa: ela vai do que o leitor procura primeiro (o
 * assunto) para o que ele usa para desempatar (o percurso). E é a mesma ordem
 * das etiquetas dentro do card, para a barra e o card não obrigarem a duas
 * leituras diferentes da mesma informação.
 */
const FAMILIAS = ["assunto", "nivel", "material", "estado", "roadmap"] as const;
type Familia = (typeof FAMILIAS)[number];

const ROTULO_DA_FAMILIA: Record<Familia, string> = {
  assunto: "Assunto",
  nivel: "Nível",
  material: "Material",
  estado: "Estado",
  roadmap: "Roadmap",
};

type Etiqueta = { id: string; familia: Familia; rotulo: string };

/** As etiquetas de UM tópico. É o mesmo conjunto que o card desenha. */
function etiquetasDe({ topic: t, roadmaps }: LinhaDeTopico): Etiqueta[] {
  return [
    { id: `assunto:${t.group}`, familia: "assunto", rotulo: t.group },
    { id: `nivel:${t.level}`, familia: "nivel", rotulo: t.level },
    ...topicTags(t).map((tag) => ({
      id: `material:${tag.kind}`,
      familia: "material" as const,
      rotulo: tag.label,
    })),
    isEmptyTopic(t)
      ? { id: "estado:soon", familia: "estado" as const, rotulo: "Em breve" }
      : { id: "estado:ready", familia: "estado" as const, rotulo: "Publicado" },
    ...(roadmaps.length > 0
      ? roadmaps.map((nome) => ({ id: `roadmap:${nome}`, familia: "roadmap" as const, rotulo: nome }))
      : [{ id: "roadmap:avulso", familia: "roadmap" as const, rotulo: "Avulso" }]),
  ];
}

type ComEtiquetas = LinhaDeTopico & { etiquetas: Etiqueta[] };

/** A busca casa nome, descrição, assunto e o nome dos roadmaps. */
function casaComBusca(l: ComEtiquetas, b: string): boolean {
  if (!b) return true;
  const alvo = `${l.topic.name} ${l.topic.description} ${l.topic.group} ${l.roadmaps.join(" ")}`;
  return semAcento(alvo).includes(b);
}

/** O "E" do filtro: o tópico precisa ter TODAS as etiquetas ligadas. */
function temTodas(l: ComEtiquetas, ids: string[]): boolean {
  const suas = new Set(l.etiquetas.map((e) => e.id));
  return ids.every((id) => suas.has(id));
}

export function TodosOsTopicos({ topicos }: { topicos: LinhaDeTopico[] }) {
  const [busca, setBusca] = useState("");
  const [ligadas, setLigadas] = useState<string[]>([]);

  const b = semAcento(busca.trim());

  // Cada tópico com o conjunto das suas etiquetas, uma vez só. É a base das
  // três contas abaixo (o que aparece, o que a barra oferece, o que desliga).
  const comEtiquetas: ComEtiquetas[] = useMemo(
    () => topicos.map((l) => ({ ...l, etiquetas: etiquetasDe(l) })),
    [topicos]
  );

  /** O acervo de etiquetas, deduplicado e agrupado por família. */
  const barra = useMemo(() => {
    const vistas = new Map<string, Etiqueta>();
    for (const t of comEtiquetas) for (const e of t.etiquetas) vistas.set(e.id, e);
    return FAMILIAS.map((familia) => ({
      familia,
      etiquetas: [...vistas.values()]
        .filter((e) => e.familia === familia)
        .sort((a, b) => a.rotulo.localeCompare(b.rotulo, "pt-BR")),
    })).filter((f) => f.etiquetas.length > 1);
  }, [comEtiquetas]);

  // As duas peneiras. Fora do componente porque não fecham sobre estado nenhum:
  // recebem tudo por parâmetro, e assim os `useMemo` abaixo declaram as
  // dependências que de fato têm (`b` e `ligadas`) em vez de arrastar duas
  // funções recriadas a cada render.
  const visiveis = useMemo(
    () => comEtiquetas.filter((l) => casaComBusca(l, b) && temTodas(l, ligadas)),
    [comEtiquetas, b, ligadas]
  );

  // Quais etiquetas ainda levam a algum lugar. Sem esta conta, o filtro "E"
  // deixa o leitor construir uma pergunta sem resposta em dois cliques.
  const uteis = useMemo(() => {
    const ok = new Set<string>();
    for (const t of comEtiquetas) {
      if (!casaComBusca(t, b)) continue;
      for (const e of t.etiquetas) {
        if (ligadas.includes(e.id) || temTodas(t, [...ligadas, e.id])) ok.add(e.id);
      }
    }
    return ok;
  }, [comEtiquetas, b, ligadas]);

  const alternar = (id: string) =>
    setLigadas((v) => (v.includes(id) ? v.filter((x) => x !== id) : [...v, id]));

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
        {ligadas.length > 0 && (
          <button type="button" className="topicos-limpar" onClick={() => setLigadas([])}>
            Limpar {ligadas.length === 1 ? "o filtro" : `os ${ligadas.length} filtros`}
          </button>
        )}
      </div>

      {/* `group` com nome, e uma linha por família: sem isso o leitor de tela
          recebe trinta botões seguidos sem nenhuma pista de que "Grafos" e
          "Difícil" filtram coisas diferentes. */}
      <div className="topicos-etiquetas">
        {barra.map(({ familia, etiquetas }) => (
          <div className="tfam" key={familia} role="group" aria-label={ROTULO_DA_FAMILIA[familia]}>
            <span className="tfam-rot">{ROTULO_DA_FAMILIA[familia]}</span>
            {etiquetas.map((e) => {
              const on = ligadas.includes(e.id);
              return (
                <button
                  key={e.id}
                  type="button"
                  className={`topicos-filtro${on ? " on" : ""}`}
                  aria-pressed={on}
                  // Desligada, e não escondida: a etiqueta some da tela se for
                  // escondida, e o leitor conclui que o assunto não existe no
                  // guia. Ela existe, só não combina com o que já está ligado.
                  disabled={!on && !uteis.has(e.id)}
                  onClick={() => alternar(e.id)}
                >
                  {e.rotulo}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* `role="status"` porque a contagem muda por causa de uma ação do
          leitor (digitar, filtrar) longe de onde ela aparece: sem a região
          viva, quem usa leitor de tela filtra e não recebe nenhum retorno. */}
      <p className="topicos-contagem" role="status">
        {visiveis.length === 0
          ? "Nenhum tópico com esse filtro."
          : `${visiveis.length} ${visiveis.length === 1 ? "tópico" : "tópicos"}`}
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
