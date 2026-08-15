import type { Topic } from "../index";

export const topico: Topic = {
  slug: "tree-traversals",
  name: "Percursos em Árvore (DFS/BFS)",
  group: "Árvores",
  level: "Médio",
  status: "ready",
  viz: "tree-traversals",
  youtube: "_-2F65OVWjo",
  videoMinutes: "1:49:46",
  readingTime: "12 min",
  language: "Python",
  description: "Pré, in, pós-ordem e por nível.",
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
    "Duas famílias, uma decisão",
    "Uma árvore, quatro respostas",
    "O truque das três visitas",
    "O template: uma linha muda tudo",
    "Pré-ordem: quando o pai precisa existir antes do filho",
    "Em ordem: o percurso que ordena",
    "Pós-ordem: quando o pai depende dos filhos",
    "BFS: quando o que importa é a distância",
    "O custo: por que o espaço não é o mesmo",
    "Como praticar",
];
