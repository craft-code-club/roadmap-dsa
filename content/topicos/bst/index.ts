import type { Topic } from "../index";

export const topico: Topic = {
  slug: "bst",
  name: "Árvore de Busca Binária",
  group: "Árvores",
  level: "Médio",
  status: "ready",
  viz: "bst",
  youtube: "CITquySB4ls",
  videoMinutes: "2:13:44",
  readingTime: "12 min",
  language: "Python",
  description: "Ordem invariante para busca em O(log n).",
};

// O `sumario` é a lista dos `## h2` DO ARTIGO ao lado, no texto exato, e
// alimenta o índice "Nesta página". Ele é uma cópia: quando as duas listas
// divergem, a âncora do índice deixa de casar com a do título. O teste
// `o sumário de cada artigo é a lista dos h2 dele` compara as duas.
//
// Ele mora aqui, e o `import` do `.mdx` mora em `../artigos.ts`, por uma razão
// medida: este módulo é dado, e a barra lateral (que é cliente) o importa
// inteiro. Com o corpo do artigo aqui dentro, TODA página do site baixava os 39
// artigos compilados — 2,1 MB de JavaScript em `/apoie/` para escrever uma
// lista de apoiadores. O sumário é texto curto e é do tópico; o corpo é o peso,
// e ele só é carregado por quem renderiza um artigo.
export const sumario = [
    "A invariante, e o que ela compra",
    "Buscar e inserir são o mesmo passeio",
    "Em ordem devolve a ordem",
    "Remover: os três casos",
    "A letra miúda: dado ordenado destrói a árvore",
    "Balanceamento: as três saídas",
    "A armadilha de validar uma BST",
    "BST ou tabela hash?",
    "Como praticar",
];
