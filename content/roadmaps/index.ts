// ---------------------------------------------------------------------------
// Os ROADMAPS: sequências de tópicos, montadas por CITAÇÃO.
//
// Um roadmap não tem tópicos, ele cita tópicos. Os tópicos vivem sozinhos em
// `content/topicos/<slug>/` e não sabem quem os cita — é o roadmap que diz
// "primeiro a Tabela Hash, depois a B-Tree, depois a Skip List", e é só isso
// que ele é: uma ordem, um recorte e o porquê.
//
// A consequência que fez este modelo valer a pena: um tópico pode ser citado
// por quantos roadmaps quiserem, sem pertencer a nenhum. A Tabela Hash está nos
// Fundamentos e em Caminhos Mínimos; a Skip List, em nenhum dos dois; e nenhuma
// das duas precisou sair de lugar nenhum para isso.
//
// OS FUNDAMENTOS SÃO UM ROADMAP como qualquer outro. O que os torna o principal
// não é uma exceção no modelo, são três fatos declarados fora dele: a home
// aponta para eles, eles têm URL curta (`/fundamentos/`) e abrem a vitrine.
//
// AS URLS, e por que são duas
// ---------------------------
//   /roadmaps/<r>/<topico>/   o tópico DENTRO de um roadmap, com a barra dele.
//                             É para onde apontam os links de dentro do
//                             roadmap: quem está percorrendo Caminhos Mínimos e
//                             clica no vizinho quer continuar em Bancos de
//                             Dados, não ser expulso no primeiro clique.
//   /topicos/<slug>/           o tópico sozinho, sem roadmap nenhum. É a página
//                             canônica, é o destino do índice `/topicos/` e dos
//                             links dentro dos artigos, e ela mostra no menu
//                             esquerdo os roadmaps de que o tópico participa.
//
// (Os Fundamentos usam `/fundamentos/<topico>/`, sem o `/roadmaps/` na frente.)
//
// O REGISTRO é uma lista à mão, e não uma varredura da pasta, porque este
// módulo é importado por componente de cliente (o `Shell` decide a barra
// lateral com ele) e código de cliente não tem `fs`. Quem impede a lista de
// envelhecer é o teste `todo arquivo de content/roadmaps/ está registrado no
// índice`, que lê o diretório e compara nos dois sentidos.
// ---------------------------------------------------------------------------

import type { ExtraCard, Roadmap, RoadmapGroup, Topic } from "@/content/tipos";
import { getTopico, isEmptyTopic, TOPICOS } from "../topicos";

// Reexportado para quem fala de roadmaps e de tópicos na mesma linha não
// precisar de dois imports do mesmo assunto.
export { getTopico, isEmptyTopic, TOPICOS };
export type * from "@/content/tipos";

// ------------------------------ o registro --------------------------------

import { roadmap as fundamentos } from "./fundamentos";
import { roadmap as caminhosMinimos } from "./caminhos-minimos";

/**
 * O slug do roadmap principal.
 *
 * Ele não tem mais tratamento próprio de URL — mora em `/roadmaps/fundamentos/`
 * como todo mundo. O que ele ainda tem de próprio é o LUGAR: a home abre nele,
 * a barra do topo lhe dá item, e a vitrine dos extras o deixa de fora.
 */
export const SLUG_DOS_FUNDAMENTOS = "fundamentos";

/** TODOS os roadmaps, os Fundamentos incluídos e sempre na frente. */
export const ROADMAPS: Roadmap[] = [
  fundamentos,
  caminhosMinimos,
];

/** Os roadmaps EXTRAS: todos menos os Fundamentos. É o que a vitrine lista. */
export const ROADMAPS_EXTRAS: Roadmap[] = ROADMAPS.filter((r) => r.slug !== SLUG_DOS_FUNDAMENTOS);

export const FUNDAMENTOS: Roadmap = fundamentos;

// ------------------------------- derivados ---------------------------------

export function getRoadmap(slug: string): Roadmap | undefined {
  return ROADMAPS.find((r) => r.slug === slug);
}

/**
 * A URL da abertura de um roadmap. Uma forma só, para todos.
 *
 * Os Fundamentos já tiveram endereço curto (`/fundamentos/`), porque eram "o
 * roadmap" e os outros eram os extras. Não são mais: no dado eles são um
 * roadmap como os demais, e a exceção no endereço não pagava o que cobrava —
 * ela vazava para o sitemap, para o card do Open Graph, para a casca, para os
 * testes, e cada um desses lugares precisava de um `if` para lembrar que um
 * roadmap mora em outro lugar. Um deles esqueceu, e o sitemap anunciou ao robô
 * uma rota que não existe no `out/`.
 *
 * O endereço antigo continua valendo, por 301 (`public/_redirects`).
 */
export function urlDoRoadmap(r: Roadmap | string): string {
  return `/roadmaps/${typeof r === "string" ? r : r.slug}`;
}

/** A URL de um tópico DENTRO de um roadmap. */
export function urlDoTopicoNoRoadmap(r: Roadmap | string, slug: string): string {
  return `${urlDoRoadmap(r)}/${slug}`;
}

/**
 * Os tópicos que um roadmap cita, na ordem, com as citações resolvidas.
 *
 * Citação que não resolve é descartada em silêncio AQUI porque quem grita é o
 * guarda no fim do arquivo, no import: um slug citado que não existe derruba o
 * build antes de qualquer página ser gerada.
 */
export function roadmapTopics(r: Roadmap): Topic[] {
  return r.groups.flatMap((g) =>
    g.topics.flatMap((c) => {
      const t = getTopico(c.topic);
      return t ? [t] : [];
    })
  );
}

/** Os grupos de um roadmap com os tópicos resolvidos, para quem desenha a lista. */
export function roadmapGroups(r: Roadmap): {
  id: string;
  name: string;
  intro?: RoadmapGroup["intro"];
  topicos: Topic[];
}[] {
  return r.groups.map((g) => ({
    id: g.id,
    name: g.name,
    intro: g.intro,
    topicos: g.topics.flatMap((c) => {
      const t = getTopico(c.topic);
      return t ? [t] : [];
    }),
  }));
}

/**
 * Um roadmap tem material quando pelo menos um tópico citado tem.
 *
 * Um roadmap montado inteiro sobre tópicos que já existem (é o caso de "Bancos
 * de Dados") não tem uma linha de conteúdo própria e mesmo assim entrega valor
 * no primeiro dia, porque o que ele publica é a CURADORIA: a ordem, o recorte e
 * o porquê. Tratá-lo como vazio o tiraria do índice do Google no exato momento
 * em que ele está mais completo.
 */
export function roadmapHasMaterial(r: Roadmap): boolean {
  return roadmapTopics(r).some((t) => !isEmptyTopic(t));
}

/** Anterior e próximo dentro de um roadmap. */
export function getRoadmapNeighbors(r: Roadmap, slug: string): { previous?: Topic; next?: Topic } {
  const lista = roadmapTopics(r);
  const i = lista.findIndex((t) => t.slug === slug);
  if (i < 0) return {};
  return { previous: lista[i - 1], next: lista[i + 1] };
}

/**
 * Os roadmaps que citam um tópico, na ordem do registro.
 *
 * É a resposta para "de onde veio isto?" e para "onde mais isto entra?", e as
 * duas perguntas têm a mesma resposta porque não existe "de onde veio": um
 * tópico não sai de lugar nenhum.
 */
export function roadmapsDoTopico(slug: string): Roadmap[] {
  return ROADMAPS.filter((r) => r.groups.some((g) => g.topics.some((c) => c.topic === slug)));
}

/**
 * Reescreve um link interno para dentro deste roadmap, quando fizer sentido.
 *
 * O PROBLEMA QUE ELA RESOLVE
 * Os artigos se citam o tempo todo ("como vimos em [Tabelas Hash](/topicos/
 * hash-table)"), e esses links são escritos no `.mdx`, que não sabe por qual
 * percurso o leitor chegou. Sem esta função, quem estava lendo Caminhos Mínimos
 * clicava numa citação e caía na página canônica do tópico: o menu do roadmap
 * sumia, o "Próximo" sumia, e o percurso acabava sem aviso, no meio de uma
 * frase que prometia continuidade.
 *
 * Com ela, a citação continua dentro do roadmap SE o roadmap tiver aquele
 * tópico. Se não tiver, o link canônico fica como está — e é o certo: não dá
 * para continuar num percurso que não passa por ali, e fingir que dá seria
 * inventar uma URL que não existe.
 *
 * Roda no servidor, na hora de montar o HTML: não custa um byte de JavaScript.
 */
export function linkDentroDoRoadmap(r: Roadmap, href: string): string {
  const m = /^\/topicos\/([a-z0-9-]+)\/?([?#].*)?$/.exec(href);
  if (!m) return href;
  const [, slug, sufixo = ""] = m;
  const citado = r.groups.some((g) => g.topics.some((c) => c.topic === slug));
  return citado ? `${urlDoTopicoNoRoadmap(r, slug)}/${sufixo}` : href;
}

/** Tópicos que nenhum roadmap cita. Eles se apresentam sozinhos na vitrine. */
export const TOPICOS_AVULSOS: Topic[] = TOPICOS.filter((t) => roadmapsDoTopico(t.slug).length === 0);

/**
 * Todos os pares (roadmap, tópico) que ganham página própria.
 *
 * É o `generateStaticParams` das rotas de tópico dentro de roadmap. Os
 * Fundamentos entram junto: `/fundamentos/<topico>/` é a mesma rota com outra
 * base, e o tópico ali se comporta igual ao de qualquer outro roadmap.
 */
export function todasAsPaginasDeRoadmap(): { roadmap: Roadmap; topic: Topic }[] {
  return ROADMAPS.flatMap((r) => roadmapTopics(r).map((topic) => ({ roadmap: r, topic })));
}

// --------------------------- os cards da vitrine ---------------------------

function cardDoRoadmap(r: Roadmap): ExtraCard {
  const lista = roadmapTopics(r);
  return {
    slug: r.slug,
    href: `${urlDoRoadmap(r)}/`,
    name: r.name,
    tagline: r.tagline,
    level: r.level,
    glyph: r.glyph,
    topics: lista.length,
    ready: lista.filter((t) => !isEmptyTopic(t)).length,
    topicSlugs: lista.map((t) => t.slug),
  };
}

/**
 * A vitrine, ordenada por "dá para estudar hoje?".
 *
 * A ordem é DERIVADA, e não uma lista à mão, porque ela precisa envelhecer
 * sozinha: no dia em que o primeiro tópico de "Árvores Balanceadas" for
 * publicado, o card sobe para junto dos que já têm material sem ninguém
 * reordenar nada. Dentro de cada metade vale a ordem de declaração, que é
 * temática: `sort` de array é estável desde o ES2019.
 *
 * Os Fundamentos ficam de fora: eles não são "o que mais tem", são o ponto de
 * partida, e têm a home e a barra do topo inteiras para si.
 */
export const EXTRA_CARDS: ExtraCard[] = ROADMAPS_EXTRAS.map(cardDoRoadmap).sort(
  (a, b) => Number(b.ready > 0) - Number(a.ready > 0)
);

export const TOTAL_EXTRA_CARDS = EXTRA_CARDS.length;

/**
 * Quantos tópicos existem fora dos Fundamentos.
 *
 * Conta o tópico UMA vez, mesmo citado por três roadmaps: a pergunta que a
 * frase responde é "quanto conteúdo existe além da sequência principal", e um
 * tópico citado duas vezes não é dois tópicos.
 */
export const TOTAL_TOPICS_FORA_DOS_FUNDAMENTOS = TOPICOS.filter(
  (t) => !FUNDAMENTOS.groups.some((g) => g.topics.some((c) => c.topic === t.slug))
).length;

// ----------------------------- o guarda -----------------------------------

/**
 * Roda no import, e reprova o build.
 *
 * As três coisas que ele cobra falham em SILÊNCIO sem ele:
 *
 *   · citar um slug que não existe some da lista (o resolvedor descarta o que
 *     não acha) e vira um roadmap com um tópico a menos do que o autor
 *     escreveu, sem erro e sem aviso;
 *   · citar o mesmo tópico duas vezes no mesmo roadmap o põe duas vezes na
 *     barra lateral, com duas caixas de progresso marcando o mesmo slug;
 *   · id de grupo repetido é chave de React duplicada e âncora ambígua.
 *
 * E o slug de roadmap não pode colidir com o de tópico: `/roadmaps/x/` e
 * `/topicos/x/` conviveriam, e o rastro de navegação teria dois nós com o mesmo
 * nome.
 */
function conferirNamespaces() {
  const slugsDeTopico = new Set(TOPICOS.map((t) => t.slug));

  const idsDeGrupo = new Map<string, string>();
  for (const r of ROADMAPS) {
    if (slugsDeTopico.has(r.slug)) {
      throw new Error(
        `slug "${r.slug}" é de roadmap E de tópico ao mesmo tempo. ` +
          `As duas rotas existiriam e ninguém saberia qual é qual.`
      );
    }

    const citados = new Set<string>();
    for (const g of r.groups) {
      const dono = idsDeGrupo.get(g.id);
      if (dono) {
        throw new Error(`id de grupo "${g.id}" repetido: está em "${dono}" e em "${r.name}".`);
      }
      idsDeGrupo.set(g.id, r.name);

      for (const c of g.topics) {
        if (!slugsDeTopico.has(c.topic)) {
          throw new Error(
            `o roadmap "${r.name}" cita o tópico "${c.topic}", que não existe. ` +
              `Crie a pasta content/topicos/${c.topic}/ e registre-a no índice.`
          );
        }
        if (citados.has(c.topic)) {
          throw new Error(
            `o roadmap "${r.name}" cita o tópico "${c.topic}" duas vezes. ` +
              `Ele apareceria repetido na barra lateral, com duas caixas de progresso.`
          );
        }
        citados.add(c.topic);
      }
    }
  }

  const slugsDeRoadmap = new Set<string>();
  for (const r of ROADMAPS) {
    if (slugsDeRoadmap.has(r.slug)) throw new Error(`slug de roadmap repetido: "${r.slug}".`);
    slugsDeRoadmap.add(r.slug);
  }

  // Pré-requisito é link para um tópico. Slug errado aqui vira link para 404
  // numa página que o build gera sem reclamar.
  for (const [dono, reqs] of [
    ...ROADMAPS.map((r): [string, string[] | undefined] => [`o roadmap "${r.name}"`, r.requires]),
    ...TOPICOS.map((t): [string, string[] | undefined] => [`o tópico "${t.name}"`, t.requires]),
  ]) {
    for (const slug of reqs ?? []) {
      if (!slugsDeTopico.has(slug)) {
        throw new Error(`${dono} pede o pré-requisito "${slug}", que não é tópico de lugar nenhum.`);
      }
    }
  }
}

conferirNamespaces();
