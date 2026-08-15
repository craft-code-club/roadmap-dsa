import type { Roadmap } from "@/content/tipos";

// Buscar sem recomeçar do zero a cada erro.
//
// Um arquivo por roadmap: eles crescem para dezenas de tópicos cada, e num
// arquivo só a revisão de um PR que mexe em dois vira um diff ilegível.
// Registre o novo em `content/roadmaps/index.ts` — o teste
// `todo arquivo de roadmap está registrado no índice` reprova se esquecer.
export const roadmap: Roadmap = {
  slug: "padroes-em-strings",
  name: "Casamento de Padrões em Strings",
  tagline: "Achar a agulha no texto sem nunca voltar atrás.",
  description:
    "A busca ingênua compara o padrão com o texto, erra no último caractere, e recomeça uma casa adiante, jogando fora tudo o que tinha acabado de descobrir. Esta trilha é sobre os algoritmos que não jogam nada fora: eles usam o que já casou para saber exatamente para onde pular.",
  level: "Difícil",
  glyph: "✱",
  requires: ["strings", "trie", "hash-table"],
  groups: [
    {
      id: "padroes-um",
      name: "Um padrão, um texto",
      topics: [
        { topic: "kmp" },
        { topic: "funcao-z" },
        { topic: "rabin-karp" },
      ],
    },
    {
      id: "padroes-muitos",
      name: "Muitos padrões de uma vez",
      topics: [
        { topic: "trie" },
        { topic: "aho-corasick" },
      ],
    },
    {
      id: "padroes-indice",
      name: "Indexar o texto",
      topics: [
        { topic: "suffix-array" },
      ],
    },
  ],
};
