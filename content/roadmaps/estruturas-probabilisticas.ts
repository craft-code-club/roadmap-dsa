import type { Roadmap } from "@/content/tipos";

// Aleatorizar a RESPOSTA para caber na memória. A Skip List, que aleatoriza a
// ESTRUTURA, é vizinha de família e mora como tópico avulso.
//
// Um arquivo por roadmap: eles crescem para dezenas de tópicos cada, e num
// arquivo só a revisão de um PR que mexe em dois vira um diff ilegível.
// Registre o novo em `content/roadmaps/index.ts` — o teste
// `todo arquivo de roadmap está registrado no índice` reprova se esquecer.
export const roadmap: Roadmap = {
  slug: "estruturas-probabilisticas",
  name: "Estruturas Probabilísticas",
  tagline: "Respostas quase certas, por uma fração da memória.",
  description:
    "Quando o dado não cabe na memória, a saída é trocar exatidão por espaço, de um jeito medido, com a margem de erro escrita no contrato. Esta trilha percorre as estruturas que respondem “já vi isto?”, “quantos distintos?” e “uma amostra justa” usando alguns bits por elemento, e mostra onde cada uma mente e o quanto.",
  level: "Médio",
  glyph: "◐",
  requires: ["hash-table", "big-o"],
  groups: [
    {
      id: "prob-pertinencia",
      name: "Pertinência e contagem",
      topics: [
        { topic: "bloom-filter" },
        { topic: "count-min-sketch" },
        { topic: "hyperloglog" },
      ],
    },
    {
      id: "prob-amostragem",
      name: "Amostragem em fluxo",
      topics: [
        { topic: "reservoir-sampling" },
      ],
    },
  ],
};
