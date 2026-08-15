import type { Topic } from "../index";

export const topico: Topic = {
  slug: "listas-ligadas",
  name: "Listas Encadeadas",
  group: "Listas Encadeadas",
  level: "Fácil",
  status: "ready",
  viz: "listas-ligadas",
  youtube: "j0E5hJZ__EA",
  videoMinutes: "2:00:47",
  readingTime: "23 min",
  language: "Python",
  description: "Nós apontando para nós. Ponteiro rápido e lento, sentinelas e detecção de ciclos.",
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
    "O nó: um valor e um endereço",
    "Contígua ou espalhada: onde cada estrutura mora na memória",
    "Religar ponteiros: inserir, remover e buscar",
    "A tabela de custos, operação por operação",
    "Duplamente encadeada, circular e o preço de andar para trás",
    "O nó sentinela elimina o caso especial da cabeça",
    "Inverter a lista: a dança dos três ponteiros",
    "Rápido e lento: achar o meio sem saber o tamanho",
    "Floyd: existe ciclo, e onde ele começa",
    "As armadilhas que pegam todo mundo",
    "Como praticar",
];
