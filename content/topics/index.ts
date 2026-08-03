import type { ComponentType } from "react";
import RecursaoFuncional from "./recursao-funcional.mdx";
import Filas from "./filas.mdx";
import Pilhas from "./pilhas.mdx";
import SkipList from "./skip-list.mdx";
import ListasLigadas from "./listas-ligadas.mdx";
import Intervals from "./intervals.mdx";
import PrefixSum from "./prefix-sum.mdx";
import Arrays from "./arrays.mdx";
import BigO from "./big-o.mdx";
import TwoPointers from "./two-pointers.mdx";
import SlidingWindow from "./sliding-window.mdx";
import SubTypes from "./subarray-substring-subsequence-subset.mdx";
import Strings from "./strings.mdx";
import HashTable from "./hash-table.mdx";
import Recursao from "./recursao.mdx";
import TreeTraversals from "./tree-traversals.mdx";
import ArvoresBinarias from "./arvores-binarias.mdx";
import NAryTrees from "./n-ary-trees.mdx";
import Bst from "./bst.mdx";
import GrafosIntro from "./grafos-intro.mdx";
import DfsBfs from "./dfs-bfs.mdx";
import Dijkstra from "./dijkstra.mdx";
import BellmanFord from "./bellman-ford.mdx";
import AStar from "./a-star.mdx";
import TopoSort from "./topological-sort.mdx";
import Mst from "./mst.mdx";

// Registro dos artigos em MDX. Para adicionar um tópico "ready":
//   1. crie content/topics/<slug>.mdx (use <SlidingWindowVisualizer /> etc.)
//   2. registre-o aqui
//   3. em content/roadmap.ts marque status "ready" (e o viz, se houver)
export type Article = { Body: ComponentType; summary: string[] };

// summary = SÓ os títulos (h2) do artigo, no texto exato. A página do tópico
// acrescenta "Vídeo da aula" e "Problemas para praticar" quando existem.
export const ARTICLES: Record<string, Article> = {
  "recursao-funcional": {
    Body: RecursaoFuncional,
    summary: [
      "Por que linguagem funcional vive de recursão",
      "A pilha que cresce e a conta que espera",
      "Posição de cauda: a regra de uma linha só",
      "O acumulador: fazer a conta na ida",
      "Tail call optimization: quem otimiza e quem não",
      "Trampolim: quando a linguagem não ajuda",
      "De cauda nem sempre é mais rápido",
      "Armadilhas e como praticar",
    ],
  },
  "recursao": {
    Body: Recursao,
    summary: [
      "O que é recursão, e por que ela aparece em tudo depois daqui",
      "Caso base e caso recursivo: as três regras",
      "A pilha de chamadas: onde a recursão acontece de verdade",
      "Stack overflow: por que a pilha tem teto",
      "A árvore do Fibonacci e o retrabalho exponencial",
      "Memoização: de 21.891 chamadas para 39",
      "Como ler a complexidade de uma função recursiva",
      "Os tipos de recursão",
      "Recursão ou iteração: como escolher",
      "As armadilhas que pegam todo mundo",
      "Como praticar",
    ],
  },
  "filas": {
    Body: Filas,
    summary: [
      "Por que a fila existe",
      "O contrato: enfileirar, desenfileirar, espiar",
      "A fila ingênua sobre array, e o pedágio do desenfileirar",
      "O buffer circular: o índice que dá a volta",
      "Cheia ou vazia? O detalhe que trava a implementação",
      "Fila com lista encadeada: o preço do ponteiro",
      "Fila com duas pilhas",
      "Deque: a fila de duas pontas",
      "O deque monotônico e o máximo da janela",
      "Complexidade e o que dizer numa entrevista",
      "Armadilhas que pegam todo mundo",
      "Como praticar",
    ],
  },
  "pilhas": {
    Body: Pilhas,
    summary: [
      "Uma lista com uma porta só",
      "push, pop e peek: tudo acontece no topo",
      "Pilha sobre array: um ponteiro que sobe e desce",
      "Pilha sobre lista ligada: sem resize, com um ponteiro a mais",
      "Parênteses balanceados: o primeiro problema de verdade",
      "A pilha que você já usava sem saber: a call stack",
      "Inverter, desfazer e avaliar: três padrões diretos",
      "Pilha monotônica: o próximo maior elemento em O(n)",
      "As armadilhas que pegam todo mundo",
      "Como praticar",
    ],
  },
  "skip-list": {
    Body: SkipList,
    summary: [
      "O problema: três estruturas, três buracos",
      "A ideia: uma pista expressa por cima da lista",
      "A busca: começa no topo e desce em escada",
      "A moeda: a altura de cada nó é sorteada uma vez só",
      "Inserção e remoção: o rastro de candidatos",
      "O head: o sentinela que quase ninguém desenha",
      "De onde sai o log n, e por que ele é esperado e não garantido",
      "Skip List na vida real",
      "As armadilhas que pegam todo mundo",
      "Como praticar",
    ],
  },
  "listas-ligadas": {
    Body: ListasLigadas,
    summary: [
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
    ],
  },
  "hash-table": {
    Body: HashTable,
    summary: [
      "Por que buscar um valor dói",
      "A ideia: a chave diz onde ela mora",
      "Colisão: duas chaves, o mesmo bucket",
      "Fator de carga e rehash",
      "O que faz uma função de hash ser boa",
      "Set, dicionário e map são a mesma casa",
      "O(1) amortizado, quase sempre",
      "As armadilhas que pegam todo mundo",
      "Os quatro padrões que caem em prova",
    ],
  },
  "intervals": {
    Body: Intervals,
    summary: [
      "O problema: uma agenda cheia de conflitos",
      "Quando dois intervalos se sobrepõem",
      "A regra de ouro: ordene pelo início",
      "Merge Intervals: fundir o que se toca",
      "Insert Interval: três fases e nenhuma ordenação",
      "Quantas salas eu preciso: contagem por eventos",
      "Quantas reuniões cabem: ordene pelo fim",
      "Complexidade: onde o tempo vai",
      "As armadilhas que derrubam a submissão",
      "Como praticar",
    ],
  },
  "prefix-sum": {
    Body: PrefixSum,
    summary: [
      "O problema: recalcular a mesma soma toda vez",
      "A ideia: uma tabela com todas as somas que começam no zero",
      "A sentinela e a fórmula que dispensa o if",
      "O template em Python",
      "Quando compensa pré-processar",
      "Prefix Sum ou Sliding Window?",
      "Não é só soma: saldo, estoque e a variação de um período",
      "Duas extensões: matriz 2D e difference array",
      "As armadilhas que pegam todo mundo",
      "Como praticar",
    ],
  },
  "two-pointers": {
    Body: TwoPointers,
    summary: [
      "Uma técnica, não um algoritmo",
      "O que custa testar todos os pares",
      "Convergentes: o Two Sum em array ordenado",
      "Por que mover um ponteiro só não perde solução",
      "Palíndromo: dois ponteiros em ritmos diferentes",
      "Mesma direção: o leitor e o escritor",
      "Rápido e lento: o ciclo da lista ligada",
      "Ordenar para usar dois ponteiros: o trade-off com hash",
      "Onde o Two Pointers dá errado",
      "Como praticar",
    ],
  },
  "strings": {
    Body: Strings,
    summary: [
      "A string é um array com uma regra a mais",
      "Um caractere não é um byte",
      "Imutável: o que isso cobra e o que isso paga",
      "O laço que concatena, e o O(n²) escondido",
      "O builder: pagar a cópia uma vez só",
      "Vire lista, edite, volte para string",
      "Rotate String: da força bruta ao truque de uma linha",
      "As armadilhas que pegam todo mundo",
      "Como praticar isto",
    ],
  },
  "arrays": {
    Body: Arrays,
    summary: [
      "Espaço contíguo na memória",
      "Por que o processador gosta de memória contígua",
      "O preço de mexer no meio",
      "A tabela de custos, operação por operação",
      "Array dinâmico: a lista que cresce sozinha",
      "Capacidade não é tamanho",
      "Matriz ou array de arrays",
      "As armadilhas que pegam todo mundo",
      "Como praticar",
    ],
  },
  "big-o": {
    Body: BigO,
    summary: [
      "O que o Big O mede",
      "As três regras",
      "As famílias, do O(1) ao O(n!)",
      "Contando operações no mesmo array",
      "Melhor caso, caso médio e pior caso",
      "As armadilhas que pegam todo mundo",
    ],
  },
  "subarray-substring-subsequence-subset": {
    Body: SubTypes,
    summary: [
      "As duas perguntas",
      "Subarray e substring: a fatia",
      "Subsequence: apaga, mas não reordena",
      "Subset: o saco de elementos",
      "A pegadinha: subsequence x subset",
      "O mesmo grid resolve substring e subsequence",
      "Lendo o enunciado em 5 segundos",
    ],
  },
  "sliding-window": {
    Body: SlidingWindow,
    summary: [
      "O problema que faz a técnica nascer",
      "A intuição: o que entra e o que sai",
      "Construindo a janela fixa",
      "Construindo a janela variável",
      "O padrão generalizado",
      "Como reconhecer que é janela deslizante",
      "Complexidade",
      "As armadilhas",
      "Como praticar",
    ],
  },
  "tree-traversals": {
    Body: TreeTraversals,
    summary: [
      "Duas famílias, uma decisão",
      "A árvore do encontro, e as quatro respostas",
      "O truque das três visitas",
      "O template: uma linha muda tudo",
      "Pré-ordem: quando o pai precisa existir antes do filho",
      "Em ordem: o percurso que ordena",
      "Pós-ordem: quando o pai depende dos filhos",
      "BFS: quando o que importa é a distância",
      "O custo: por que o espaço não é o mesmo",
      "Como praticar",
    ],
  },
  "arvores-binarias": {
    Body: ArvoresBinarias,
    summary: [
      "Por que existe uma estrutura hierárquica",
      "O vocabulário, de uma vez",
      "O nó, e a definição que se define a si mesma",
      "Os cinco formatos",
      "A conta que amarra tudo",
      "A árvore que mora num array",
      "A forma decide o custo",
      "Como praticar",
    ],
  },
  "n-ary-trees": {
    Body: NAryTrees,
    summary: [
      "Quando dois filhos não bastam",
      "O nó muda: de dois ponteiros para uma lista",
      "O template sobrevive, o laço muda",
      "Em ordem morre aqui",
      "O grau achata a árvore",
      "Por que o banco de dados usa grau alto",
      "O truque do primeiro filho e do irmão",
      "Onde você já usa isso",
      "Como praticar",
    ],
  },
  "bst": {
    Body: Bst,
    summary: [
      "A invariante, e o que ela compra",
      "Buscar e inserir são o mesmo passeio",
      "Em ordem devolve a ordem",
      "Remover: os três casos",
      "A letra miúda: dado ordenado destrói a árvore",
      "Balanceamento: as três saídas",
      "A armadilha de validar uma BST",
      "BST ou tabela hash?",
      "Como praticar",
    ],
  },
  "grafos-intro": {
    Body: GrafosIntro,
    summary: [
      "O que é, em duas palavras",
      "Guardar o grafo: as duas formas",
      "Qual escolher, e por quê",
      "O grafo que você não desenhou",
      "Onde ficam os ciclos, e por que isso importa",
      "Como praticar",
    ],
  },
  "dfs-bfs": {
    Body: DfsBfs,
    summary: [
      "A única linha nova",
      "Pilha ou fila, e o que muda",
      "Por que o BFS acha o caminho mais curto",
      "Onde cada um brilha",
      "Detectar ciclo: onde os dois divergem",
      "Um percurso não cobre o grafo",
      "Complexidade e memória",
      "Como praticar",
    ],
  },
  "dijkstra": {
    Body: Dijkstra,
    summary: [
      "O que muda quando a aresta tem peso",
      "Relaxar: o verbo do algoritmo",
      "Por que fechar o menor é seguro",
      "O dia em que a hipótese cai",
      "O detalhe do `continue`",
      "Complexidade",
      "Reconstruir o caminho, e não só o custo",
      "Onde isso aparece de verdade",
      "Como praticar",
    ],
  },
  "bellman-ford": {
    Body: BellmanFord,
    summary: [
      "Quando o peso pode ser negativo",
      "A ideia: insistir em vez de escolher",
      "De onde sai o V-1",
      "A rodada que sobra",
      "Dijkstra ou Bellman-Ford",
      "Duas otimizações honestas",
      "Como praticar",
    ],
  },
  "a-star": {
    Body: AStar,
    summary: [
      "O problema do Dijkstra num mapa",
      "As duas parcelas",
      "Admissível: a condição que garante o ótimo",
      "Escolhendo o h",
      "O código, e o que muda em relação ao Dijkstra",
      "A honestidade sobre o ganho",
      "Onde aparece",
      "Como praticar",
    ],
  },
  "topological-sort": {
    Body: TopoSort,
    summary: [
      "O problema, e a condição para ele ter solução",
      "Kahn: remover quem não depende de ninguém",
      "A detecção de ciclo vem de graça",
      "A outra saída: DFS com pós-ordem",
      "Um bônus do Kahn: quantos passos em paralelo",
      "Onde isso já está rodando",
      "Como praticar",
    ],
  },
  "mst": {
    Body: Mst,
    summary: [
      "O que é uma árvore geradora",
      "A propriedade do corte, que faz o guloso funcionar",
      "Kruskal: ordene as arestas e vá colando",
      "O union-find, em duas linhas de ideia",
      "Prim: faça a árvore crescer",
      "Kruskal ou Prim",
      "O que a MST não faz",
      "Onde aparece",
      "Como praticar",
    ],
  },
};

export function getArticle(slug: string): Article | undefined {
  return ARTICLES[slug];
}
