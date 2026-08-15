import type { Roadmap } from "./index";

// O roadmap que é quase todo CITAÇÃO: quatro dos seis tópicos moram em outra
// casa, e o que esta página publica é a ordem e o porquê.
//
// Um arquivo por roadmap: eles crescem para dezenas de tópicos cada, e num
// arquivo só a revisão de um PR que mexe em dois vira um diff ilegível.
// Registre o novo em `content/roadmaps/index.ts` — o teste
// `todo arquivo de roadmap está registrado no índice` reprova se esquecer.
export const roadmap: Roadmap = {
  slug: "bancos-de-dados",
  name: "Estruturas de Dados em Bancos de Dados",
  tagline: "As estruturas que decidem se a consulta volta em 1ms ou em 1s.",
  description:
    "Um banco de dados é, por dentro, um punhado de estruturas de dados bem escolhidas. Este roadmap percorre as que decidem o desempenho de uma consulta: como a chave é encontrada, quando vale responder por aproximação para não ir ao disco, e por que os bancos modernos escrevem primeiro e organizam depois. Quase tudo aqui você já viu em outro lugar do guia. O que muda é a pergunta.",
  level: "Difícil",
  glyph: "▤",
  requires: ["hash-table", "big-o"],
  groups: [
    {
      id: "bd-onde-esta-a-chave",
      name: "Onde a chave é procurada",
      // Três CITAÇÕES seguidas, de três casas diferentes: a Tabela Hash é dos
      // Fundamentos, a Skip List é avulsa e a B-Tree é de outro roadmap.
      // Nenhuma muda de casa por estar aqui — o que este roadmap publica é a
      // ordem e o porquê.
      topics: ["hash-table", "b-tree", "skip-list"],
    },
    {
      id: "bd-aproximar",
      name: "Quando dá para responder por aproximação",
      topics: ["bloom-filter"],
    },
    {
      id: "bd-escrever-antes",
      name: "Escrever primeiro, organizar depois",
      topics: [
        {
          slug: "lsm-tree",
          name: "LSM-Tree",
          group: "Estruturas de Dados em Bancos de Dados",
          level: "Difícil",
          status: "soon",
          description: "Escrita sequencial em memória, compactação em níveis: o motor do RocksDB e do Cassandra.",
        },
        {
          slug: "write-ahead-log",
          name: "Write-Ahead Log",
          group: "Estruturas de Dados em Bancos de Dados",
          level: "Médio",
          status: "soon",
          description: "O append-only que torna a durabilidade barata e a recuperação possível.",
        },
      ],
    },
  ],
};
