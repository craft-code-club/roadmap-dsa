import type { Roadmap } from "./index";

// O Prefix Sum com o array mudando embaixo dele.
//
// Um arquivo por roadmap: eles crescem para dezenas de tópicos cada, e num
// arquivo só a revisão de um PR que mexe em dois vira um diff ilegível.
// Registre o novo em `content/roadmaps/index.ts` — o teste
// `todo arquivo de roadmap está registrado no índice` reprova se esquecer.
export const roadmap: Roadmap = {
  slug: "consultas-em-intervalos",
  name: "Consultas em Intervalos",
  tagline: "Somar, minimizar e atualizar faixas em O(log n).",
  description:
    "O Prefix Sum responde “a soma de i até j” em O(1), com uma condição: o array não pode mudar. Uma única escrita no meio invalida o prefixo inteiro e custa O(n) para refazer. Esta trilha é sobre as estruturas que aceitam consulta e atualização intercaladas, as duas em tempo logarítmico.",
  level: "Difícil",
  glyph: "▤",
  requires: ["prefix-sum", "arvores-binarias", "binary-numbers"],
  groups: [
    {
      id: "faixas-arvore",
      name: "Árvores de intervalo",
      topics: [
        { topic: "segment-tree" },
        { topic: "lazy-propagation" },
      ],
    },
    {
      id: "faixas-bits",
      name: "Índices por bits",
      topics: [
        { topic: "fenwick-tree" },
      ],
    },
    {
      id: "faixas-estatico",
      name: "Pré-processar o que não muda",
      topics: [
        { topic: "sparse-table" },
      ],
    },
  ],
};
