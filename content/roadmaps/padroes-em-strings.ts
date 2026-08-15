import type { Roadmap } from "./index";

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
        { slug: "kmp", name: "KMP", group: "Casamento de Padrões em Strings", level: "Difícil", status: "soon", description: "A tabela de prefixo-sufixo que diz para onde voltar sem reler o texto." },
        { slug: "funcao-z", name: "Função Z", group: "Casamento de Padrões em Strings", level: "Difícil", status: "soon", description: "O mesmo poder do KMP com metade dos casos de borda." },
        { slug: "rabin-karp", name: "Rabin-Karp", group: "Casamento de Padrões em Strings", level: "Médio", status: "soon", description: "Hash rolante: comparar números em vez de caracteres, e conferir só no empate." },
      ],
    },
    {
      id: "padroes-muitos",
      name: "Muitos padrões de uma vez",
      topics: [
        // CITAÇÃO. A Trie é um tópico avulso e continua sendo: aqui ela entra
        // porque Aho-Corasick É uma trie com links de falha, e começar por
        // ela sem a trie na mão é começar pelo meio.
        "trie",
        { slug: "aho-corasick", name: "Aho-Corasick", group: "Casamento de Padrões em Strings", level: "Difícil", status: "soon", description: "Uma trie com links de falha: mil padrões numa passada só pelo texto." },
      ],
    },
    {
      id: "padroes-indice",
      name: "Indexar o texto",
      topics: [
        { slug: "suffix-array", name: "Suffix Array", group: "Casamento de Padrões em Strings", level: "Difícil", status: "soon", description: "Ordenar todos os sufixos uma vez e responder qualquer padrão em O(m log n)." },
      ],
    },
  ],
};
