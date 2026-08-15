// ---------------------------------------------------------------------------
// Roadmaps e outros tópicos — o que existe além dos Fundamentos.
//
// O `content/fundamentos.ts` é a espinha do produto: uma sequência, do Big O aos
// grafos, que o aluno percorre na ordem. Nem tudo que vale a pena aprender cabe
// nela. A Skip List é o caso que abriu esta porta: ela vivia dentro do grupo
// "Listas Encadeadas" porque é feita de listas encadeadas, e a consequência era
// o aluno de terceira semana encontrar uma estrutura probabilística difícil no
// meio de um grupo de fundamentos. Ela não é o próximo passo depois de lista
// encadeada; ela é outro assunto, que usa lista encadeada.
//
// Este arquivo é a casa desse "outro assunto". São duas formas, e a diferença
// entre elas é o tamanho do assunto, não a importância:
//
//   TÓPICO   uma estrutura que se basta numa página só. Vive em
//            `/topico/<slug>/`, exatamente como os tópicos dos Fundamentos, e é
//            servido sem barra lateral: a página é o assunto inteiro, e uma
//            lista ao lado dela seria uma lista para lugar nenhum.
//
//   ROADMAP  uma FAMÍLIA que precisa de várias páginas em ordem. Ganha uma
//            página de abertura em `/roadmaps/<slug>/` e uma barra lateral
//            própria, com os tópicos dele e o caminho de volta.
//
// UM TÓPICO PODE ESTAR EM MAIS DE UM ROADMAP, e essa é a parte que o modelo
// anterior não tinha
// ---------------------------------------------------------------------------
// Um roadmap de "estruturas para bancos de dados" quer a Tabela Hash, que é dos
// Fundamentos; a Skip List, que é avulsa; e o Bloom Filter, que é de outro
// roadmap. Se pertencer a um roadmap significasse MUDAR de casa, montar esse
// roadmap custaria tirar a Tabela Hash dos Fundamentos, o que ninguém quer.
//
// Então o grupo de um roadmap aceita duas coisas na lista `topics`:
//
//   um `Topic` escrito ali    o roadmap é DONO daquele tópico
//   uma `string` (o slug)     o roadmap só CITA um tópico de outra casa
//
// O dono é quem decide a casca da página canônica (`getPlacement`) e quem conta
// o slug no namespace. Quem cita não muda nada da casa alheia: ganha o tópico na
// própria lista, na própria ordem, e uma URL própria para ele
// (`/roadmaps/<roadmap>/<topico>/`) que aponta `canonical` de volta para
// `/topico/<slug>/`.
//
// A REGRA DE NAMESPACE, e por que ela é código e não convenção
// ------------------------------------------------------------
// Como todo tópico do site — Fundamentos, roadmap ou avulso — tem a sua página
// canônica em `/topico/<slug>/`, o slug é um identificador GLOBAL. Dois tópicos
// com o mesmo slug em casas diferentes não dão erro de compilação, não dão erro
// de build: o `generateStaticParams` emite a rota duas vezes, o Next gera uma
// página só, e o segundo tópico simplesmente não existe no site publicado.
// Silêncio total.
//
// Por isso a checagem no fim deste arquivo roda no IMPORT do módulo, e não num
// teste: ela derruba o `npm run build` com o slug repetido e os dois donos
// escritos na mensagem. Teste pega depois; import pega na hora, inclusive no
// `npm run dev`. Ela cobre o slug de tópico, o id de grupo, o slug de roadmap,
// e agora também as CITAÇÕES: citar um slug que não existe é link para 404, e
// citar um tópico que o próprio roadmap já tem é o mesmo tópico duas vezes na
// mesma lista.
// ---------------------------------------------------------------------------

import { ALL_TOPICS, GROUPS, isEmptyTopic, type Level, type Topic } from "../fundamentos";
import { STANDALONES } from "../avulsos";

export { STANDALONES };

/**
 * Um item da lista de um grupo de roadmap.
 *
 * `Topic` escrito ali: o roadmap é DONO. `string`: é o slug de um tópico que
 * mora em outra casa, e o roadmap só o CITA.
 *
 * Duas formas no mesmo array, e não dois arrays, porque a ORDEM importa: num
 * roadmap de bancos de dados a Tabela Hash (citada) vem antes do LSM-Tree
 * (próprio), e com listas separadas não haveria como dizer isso.
 */
export type RoadmapItem = Topic | string;

export type RoadmapGroup = {
  id: string;
  name: string;
  topics: RoadmapItem[];
};

/**
 * Um roadmap: uma sequência de tópicos sobre uma família, fora dos Fundamentos.
 *
 * Reusa `Topic` dos Fundamentos de propósito. Um roadmap extra não é um formato
 * novo de conteúdo, é o MESMO conteúdo em outra ordem: um tipo paralelo
 * significaria dois lugares para consertar quando o modelo de tópico mudasse, e
 * a página de tópico teria que saber de qual dos dois ela veio.
 */
export type Roadmap = {
  /** Vira `/roadmaps/<slug>/`. */
  slug: string;
  name: string;
  /** A frase do card, no imperativo do que o roadmap entrega. Uma linha. */
  tagline: string;
  /** O parágrafo da abertura, e a `description` do SEO. */
  description: string;
  level: Level;
  /** Glifo do card. Só decoração — sempre `aria-hidden`. */
  glyph: string;
  groups: RoadmapGroup[];
  /** Slugs que convém ter antes. Vira a linha "Antes daqui". */
  requires?: string[];
};

/**
 * Um tópico avulso: um tópico só, que se basta.
 *
 * O tópico é um `Topic` normal e vive em `/topico/<slug>/`. O que este envelope
 * acrescenta é só o que o CARD precisa saber e o tópico não carrega: a frase de
 * chamada e o glifo.
 */
export type Standalone = {
  topic: Topic;
  tagline: string;
  glyph: string;
  /** Slugs que convém ter antes. */
  requires?: string[];
};

// ------------------------------ o registro --------------------------------
//
// Um arquivo por roadmap, em `content/roadmaps/`, e este índice é a lista do que
// existe. Acrescentar um roadmap é criar o arquivo e escrever duas linhas aqui.
//
// POR QUE NÃO VARRE A PASTA SOZINHO
// Porque este módulo é importado por componente de cliente (o `Shell` decide a
// barra lateral com ele), e código de cliente não tem `fs`. Um `import()`
// dinâmico por caminho variável também não serve: com `output: "export"` o grafo
// de módulos precisa ser estático, senão nada disso entra no bundle.
//
// O que sobra é a lista à mão — que é o mesmo padrão do `content/topics/index.ts`
// —, e uma lista à mão só cobre o que alguém lembrou de escrever nela. Por isso
// existe o teste `todo arquivo de content/roadmaps/ está registrado no índice`:
// ele lê a PASTA e compara com esta lista, nos dois sentidos. Criar o arquivo e
// esquecer o registro reprova a suíte com o nome do arquivo na mensagem, em vez
// de publicar um roadmap invisível.

import { roadmap as estruturasProbabilisticas } from "./estruturas-probabilisticas";
import { roadmap as arvoresBalanceadas } from "./arvores-balanceadas";
import { roadmap as consultasEmIntervalos } from "./consultas-em-intervalos";
import { roadmap as padroesEmStrings } from "./padroes-em-strings";
import { roadmap as caminhosMinimos } from "./caminhos-minimos";
import { roadmap as bancosDeDados } from "./bancos-de-dados";
import { roadmap as grafosAvancados } from "./grafos-avancados";

/**
 * Os roadmaps, na ordem em que a vitrine os apresenta quando empatam em
 * material publicado (ver `EXTRA_CARDS`, que põe na frente o que dá para
 * estudar hoje).
 */
export const ROADMAPS: Roadmap[] = [
  estruturasProbabilisticas,
  bancosDeDados,
  caminhosMinimos,
  arvoresBalanceadas,
  consultasEmIntervalos,
  padroesEmStrings,
  grafosAvancados,
];
;

;

// ------------------------------- derivados -------------------------------

/**
 * Os tópicos que um roadmap é DONO, na ordem em que ele os apresenta.
 *
 * Só os próprios: um tópico citado pertence a outra casa, e contá-lo aqui faria
 * dele um tópico de dois donos — que é exatamente o que a checagem de namespace
 * existe para impedir.
 */
export const OWNED_ROADMAP_TOPICS: Topic[] = ROADMAPS.flatMap((r) =>
  r.groups.flatMap((g) => g.topics.filter((x): x is Topic => typeof x !== "string"))
);

/** Tópicos que se bastam sozinhos. */
export const STANDALONE_TOPICS: Topic[] = STANDALONES.map((s) => s.topic);

/** Tudo que existe fora dos Fundamentos. */
export const EXTRA_TOPICS: Topic[] = [...OWNED_ROADMAP_TOPICS, ...STANDALONE_TOPICS];

/**
 * TODO tópico do site que tem uma página canônica em `/topico/<slug>/`.
 *
 * É esta lista — e não `ALL_TOPICS` — que o `generateStaticParams`, o sitemap e
 * o guarda de datas precisam. `ALL_TOPICS` continua sendo os FUNDAMENTOS: é ele
 * que conta o progresso da espinha, desenha a barra lateral principal e alimenta
 * os números da home, e nenhuma dessas três coisas deve crescer porque um
 * roadmap ganhou um tópico.
 *
 * Cada tópico aparece UMA vez aqui, mesmo citado por três roadmaps: a lista é de
 * páginas canônicas, e a página canônica é uma só.
 */
export const SITE_TOPICS: Topic[] = [...ALL_TOPICS, ...EXTRA_TOPICS];

/** Índice slug -> tópico, para resolver citação sem varrer a lista toda. */
const POR_SLUG = new Map(SITE_TOPICS.map((t) => [t.slug, t]));

/**
 * Um item de roadmap já resolvido: o tópico, e se ele é próprio ou citado.
 *
 * `emprestado` não é detalhe de implementação que vaza: ele é a diferença que a
 * TELA mostra. Um tópico citado ganha a etiqueta da casa dele no card ("dos
 * Fundamentos"), porque o aluno precisa saber que aquele tópico tem uma vida
 * fora deste roadmap, e que marcá-lo aqui conta lá também.
 */
export type ItemResolvido = { topic: Topic; emprestado: boolean };

/**
 * Os itens de um roadmap, na ordem, com as citações já resolvidas.
 *
 * Citação que não resolve é descartada em silêncio AQUI porque quem grita é o
 * guarda no fim do arquivo, no import: se um slug citado não existir, o build
 * cai antes de qualquer página ser gerada. Repetir a validação em toda chamada
 * seria pagar duas vezes por uma garantia que já existe.
 */
export function roadmapItems(r: Roadmap): ItemResolvido[] {
  return r.groups.flatMap((g) =>
    g.topics.flatMap((x): ItemResolvido[] => {
      if (typeof x !== "string") return [{ topic: x, emprestado: false }];
      const achado = POR_SLUG.get(x);
      return achado ? [{ topic: achado, emprestado: true }] : [];
    })
  );
}

/** Os grupos de um roadmap com os itens resolvidos, para quem desenha a lista. */
export function roadmapGroups(r: Roadmap): { id: string; name: string; itens: ItemResolvido[] }[] {
  return r.groups.map((g) => ({
    id: g.id,
    name: g.name,
    itens: g.topics.flatMap((x): ItemResolvido[] => {
      if (typeof x !== "string") return [{ topic: x, emprestado: false }];
      const achado = POR_SLUG.get(x);
      return achado ? [{ topic: achado, emprestado: true }] : [];
    }),
  }));
}

/** Os tópicos de um roadmap, próprios e citados, na ordem de leitura. */
export function roadmapTopics(r: Roadmap): Topic[] {
  return roadmapItems(r).map((i) => i.topic);
}

/**
 * Um roadmap tem material quando pelo menos um tópico dele tem — próprio ou
 * citado.
 *
 * Citado conta, e isso é decisão: um roadmap montado inteiro sobre tópicos que
 * já existem (é o caso de "Bancos de Dados") não tem uma linha de conteúdo
 * própria e mesmo assim entrega valor no primeiro dia, porque o que ele publica
 * é a CURADORIA — a ordem, o recorte e o porquê. Tratá-lo como vazio o tiraria
 * do índice do Google no exato momento em que ele está mais completo.
 *
 * Deriva de `isEmptyTopic`, a mesma função que decide o selo "em breve" no menu
 * e o `noindex` da página de tópico.
 */
export function roadmapHasMaterial(r: Roadmap): boolean {
  return roadmapTopics(r).some((t) => !isEmptyTopic(t));
}

export function getRoadmap(slug: string): Roadmap | undefined {
  return ROADMAPS.find((r) => r.slug === slug);
}

/** Qualquer tópico do site, venha ele dos Fundamentos, de um roadmap ou avulso. */
export function getSiteTopic(slug: string): Topic | undefined {
  return POR_SLUG.get(slug);
}

/**
 * Onde o tópico MORA — a pergunta que decide a casca da página canônica.
 *
 * Responde pelo DONO, nunca por quem cita: a Tabela Hash é dos Fundamentos
 * mesmo quando três roadmaps a listam, e `/topico/hash-table/` abre com a barra
 * dos Fundamentos. Quem quiser a Tabela Hash com a barra de outro roadmap tem a
 * URL daquele roadmap (`/roadmaps/<slug>/hash-table/`), que é outra página.
 *
 * A página de tópico e o `Shell` fazem a MESMA pergunta e precisam da mesma
 * resposta: uma calcula o rastro de navegação e os vizinhos, o outro decide se
 * desenha barra lateral e qual. Duas versões desta função é o começo de uma
 * página de roadmap com o menu dos Fundamentos ao lado.
 */
export type Placement =
  | { kind: "fundamentos" }
  | { kind: "roadmap"; roadmap: Roadmap }
  | { kind: "standalone"; standalone: Standalone };

export function getPlacement(slug: string): Placement | undefined {
  const roadmap = ROADMAPS.find((r) =>
    r.groups.some((g) => g.topics.some((x) => typeof x !== "string" && x.slug === slug))
  );
  if (roadmap) return { kind: "roadmap", roadmap };
  const standalone = STANDALONES.find((s) => s.topic.slug === slug);
  if (standalone) return { kind: "standalone", standalone };
  return ALL_TOPICS.some((t) => t.slug === slug) ? { kind: "fundamentos" } : undefined;
}

/**
 * Os roadmaps que CITAM este tópico, sem contar a casa dele.
 *
 * É o que alimenta a pastilha "aparece também em" na página canônica, e é
 * também a lista de rotas `/roadmaps/<slug>/<topico>/` que o build precisa
 * gerar para ele.
 */
export function roadmapsQueCitam(slug: string): Roadmap[] {
  const dono = getPlacement(slug);
  return ROADMAPS.filter((r) => {
    if (dono?.kind === "roadmap" && dono.roadmap.slug === r.slug) return false;
    return r.groups.some((g) => g.topics.some((x) => typeof x === "string" && x === slug));
  });
}

/**
 * O nome da casa de um tópico, para o card dizer de onde ele veio.
 *
 * Só aparece em card de tópico CITADO: no card de um tópico próprio a origem é
 * o roadmap que o leitor já está olhando, e repeti-la é ruído.
 */
export function origemDoTopico(slug: string): string {
  const onde = getPlacement(slug);
  if (onde?.kind === "roadmap") return onde.roadmap.name;
  if (onde?.kind === "standalone") return "Tópico avulso";
  return "Fundamentos";
}

/** Anterior e próximo DENTRO do roadmap. Os Fundamentos têm o seu `getNeighbors`. */
export function getRoadmapNeighbors(r: Roadmap, slug: string): { previous?: Topic; next?: Topic } {
  const lista = roadmapTopics(r);
  const i = lista.findIndex((t) => t.slug === slug);
  if (i < 0) return {};
  return { previous: lista[i - 1], next: lista[i + 1] };
}

/**
 * Todos os pares (roadmap, tópico) que ganham página própria.
 *
 * É o `generateStaticParams` de `/roadmaps/[slug]/[topico]/`, e vale para os
 * tópicos PRÓPRIOS também, não só para os citados: dentro de um roadmap, todo
 * item da lista se comporta igual, e um item que abrisse noutra casca seria uma
 * pedra no meio da sequência.
 */
export function todasAsPaginasDeRoadmap(): { roadmap: Roadmap; topic: Topic }[] {
  return ROADMAPS.flatMap((r) => roadmapTopics(r).map((topic) => ({ roadmap: r, topic })));
}

// --------------------------- os cards da vitrine ---------------------------

/**
 * Um card da seção "Trilhas e outros tópicos".
 *
 * Trilha e avulso viram o MESMO tipo aqui de propósito: a vitrine é uma grade só,
 * e o que muda entre os dois é uma etiqueta e o destino do clique. Duas grades
 * lado a lado obrigariam o aluno a entender a diferença entre trilha e avulso
 * ANTES de olhar o que tem em cada um, que é a ordem errada.
 */
export type ExtraCard = {
  kind: "roadmap" | "standalone";
  /** Slug da trilha, ou do tópico avulso. Único dentro da vitrine. */
  slug: string;
  href: string;
  name: string;
  tagline: string;
  level: Level;
  glyph: string;
  /** Quantos tópicos a trilha tem. `1` para um avulso — ele é a própria página. */
  topics: number;
  /** Quantos já têm material para abrir hoje. */
  ready: number;
  /**
   * Os slugs dos tópicos que o card representa.
   *
   * É o que o card precisa para contar o progresso do leitor, e ele tem que vir
   * daqui: o progresso é do TÓPICO, e o componente do card só conhece o card.
   */
  topicSlugs: string[];
};

function cardDaTrilha(track: Roadmap): ExtraCard {
  const lista = roadmapTopics(track);
  return {
    kind: "roadmap",
    slug: track.slug,
    href: `/roadmaps/${track.slug}/`,
    name: track.name,
    tagline: track.tagline,
    level: track.level,
    glyph: track.glyph,
    topics: lista.length,
    ready: lista.filter((t) => !isEmptyTopic(t)).length,
    topicSlugs: lista.map((t) => t.slug),
  };
}

function cardDoTopico(s: Standalone): ExtraCard {
  return {
    kind: "standalone",
    slug: s.topic.slug,
    href: `/topico/${s.topic.slug}/`,
    name: s.topic.name,
    tagline: s.tagline,
    level: s.topic.level,
    glyph: s.glyph,
    topics: 1,
    ready: isEmptyTopic(s.topic) ? 0 : 1,
    topicSlugs: [s.topic.slug],
  };
}

/**
 * A vitrine, ordenada por "dá para estudar hoje?".
 *
 * A ordem é DERIVADA, e não uma lista à mão, porque ela precisa envelhecer
 * sozinha: no dia em que o primeiro tópico de "Árvores Balanceadas" for
 * publicado, o card sobe para junto dos que já têm material sem ninguém ter que
 * lembrar de reordenar nada aqui. Dentro de cada metade vale a ordem de
 * declaração, que é temática — `sort` de array em JavaScript é estável desde o
 * ES2019, então empate mantém a ordem de entrada.
 */
export const EXTRA_CARDS: ExtraCard[] = [
  ...STANDALONES.map(cardDoTopico),
  ...ROADMAPS.map(cardDaTrilha),
].sort((a, b) => Number(b.ready > 0) - Number(a.ready > 0));

export const TOTAL_EXTRA_CARDS = EXTRA_CARDS.length;
export const TOTAL_EXTRA_TOPICS = EXTRA_TOPICS.length;
export const TOTAL_EXTRA_TOPICS_PRONTOS = EXTRA_TOPICS.filter((t) => !isEmptyTopic(t)).length;

// ----------------------------- o guarda -----------------------------------

function conferirUnicos(rotulo: string, pares: [chave: string, dono: string][]) {
  const visto = new Map<string, string>();
  for (const [chave, dono] of pares) {
    const antes = visto.get(chave);
    if (antes) {
      throw new Error(
        `${rotulo} repetido: "${chave}" aparece em ${antes} e em ${dono}. ` +
          `O site publica uma página só por chave, então a segunda sumiria em silêncio. ` +
          `Renomeie uma das duas.`
      );
    }
    visto.set(chave, dono);
  }
}

/**
 * Roda no import, e reprova o build.
 *
 * Sem isto, um slug repetido entre os Fundamentos e um roadmap não acusa em
 * lugar nenhum: `generateStaticParams` devolve o slug duas vezes, o Next gera
 * uma página só, e o tópico perdedor deixa de existir no site publicado sem uma
 * linha de aviso. O mesmo vale para o id de grupo, que é chave de React e
 * âncora de `/fundamentos/#<id>`, e para o slug de roadmap, que divide o
 * namespace de `/roadmaps/`.
 */
function conferirNamespaces() {
  // O slug é reivindicado por quem é DONO. Citação não entra aqui: citar é
  // justamente NÃO reivindicar, e contá-la faria a checagem reprovar o caso que
  // ela deveria permitir.
  conferirUnicos("slug de tópico", [
    ...ALL_TOPICS.map((t): [string, string] => [t.slug, "os Fundamentos"]),
    ...ROADMAPS.flatMap((r) =>
      r.groups.flatMap((g) =>
        g.topics
          .filter((x): x is Topic => typeof x !== "string")
          .map((t): [string, string] => [t.slug, `o roadmap "${r.name}"`])
      )
    ),
    ...STANDALONES.map((s): [string, string] => [s.topic.slug, "os tópicos avulsos"]),
  ]);

  conferirUnicos("id de grupo", [
    ...GROUPS.map((g): [string, string] => [g.id, "os Fundamentos"]),
    ...ROADMAPS.flatMap((r) => r.groups.map((g): [string, string] => [g.id, `o roadmap "${r.name}"`])),
  ]);

  conferirUnicos("slug de roadmap", ROADMAPS.map((r): [string, string] => [r.slug, "os roadmaps"]));

  // Um roadmap não pode ter o mesmo slug de um tópico: os dois conviveriam, em
  // `/roadmaps/x/` e `/topico/x/`, mas o leitor não tem como saber qual é qual,
  // e o rastro de navegação passaria a ter dois nós com o mesmo nome.
  const slugsDeTopico = new Set(SITE_TOPICS.map((t) => t.slug));
  for (const r of ROADMAPS) {
    if (slugsDeTopico.has(r.slug)) {
      throw new Error(
        `slug "${r.slug}" é de roadmap E de tópico ao mesmo tempo. ` +
          `As duas rotas existiriam (/roadmaps/${r.slug}/ e /topico/${r.slug}/) e ninguém saberia qual é qual.`
      );
    }
  }

  // AS CITAÇÕES. São duas coisas para conferir, e as duas falham em silêncio:
  //
  //   · citar um slug que não existe some da lista (o resolvedor descarta o que
  //     não acha) e vira um roadmap com um tópico a menos do que o autor
  //     escreveu — sem erro, sem aviso;
  //   · citar duas vezes, ou citar um tópico que o próprio roadmap já é dono,
  //     põe o mesmo tópico duas vezes na mesma lista, com duas caixas de
  //     progresso que marcam juntas.
  for (const r of ROADMAPS) {
    const vistos = new Set<string>();
    for (const g of r.groups) {
      for (const x of g.topics) {
        const slug = typeof x === "string" ? x : x.slug;
        if (typeof x === "string" && !slugsDeTopico.has(slug)) {
          throw new Error(
            `o roadmap "${r.name}" cita o tópico "${slug}", que não existe em lugar nenhum. ` +
              `Citação é por slug de um tópico que já tem casa; para criar um tópico novo, ` +
              `escreva o objeto inteiro aqui.`
          );
        }
        if (vistos.has(slug)) {
          throw new Error(
            `o roadmap "${r.name}" lista o tópico "${slug}" duas vezes. ` +
              `Ele apareceria repetido na barra lateral e na abertura, com duas caixas de ` +
              `progresso marcando o mesmo slug.`
          );
        }
        vistos.add(slug);
      }
    }
  }

  // Pré-requisito é link para um tópico. Um slug errado aqui vira um link para
  // 404 numa página que o build gera sem reclamar.
  for (const [dono, reqs] of [
    ...ROADMAPS.map((r): [string, string[] | undefined] => [`o roadmap "${r.name}"`, r.requires]),
    ...STANDALONES.map((s): [string, string[] | undefined] => [
      `o tópico avulso "${s.topic.name}"`,
      s.requires,
    ]),
  ]) {
    for (const slug of reqs ?? []) {
      if (!slugsDeTopico.has(slug)) {
        throw new Error(`${dono} pede o pré-requisito "${slug}", que não é tópico de lugar nenhum.`);
      }
    }
  }
}

conferirNamespaces();
