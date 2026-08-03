import type { ComponentType } from "react";
import Intervals from "./intervals.mdx";
import PrefixSum from "./prefix-sum.mdx";
import Arrays from "./arrays.mdx";
import BigO from "./big-o.mdx";
import TwoPointers from "./two-pointers.mdx";
import SlidingWindow from "./sliding-window.mdx";
import SubTypes from "./subarray-substring-subsequence-subset.mdx";
import Strings from "./strings.mdx";
import HashTable from "./hash-table.mdx";

// Registro dos artigos em MDX. Para adicionar um tópico "ready":
//   1. crie content/topics/<slug>.mdx (use <SlidingWindowVisualizer /> etc.)
//   2. registre-o aqui
//   3. em content/roadmap.ts marque status "ready" (e o viz, se houver)
export type Article = { Body: ComponentType; summary: string[] };

// summary = SÓ os títulos (h2) do artigo, no texto exato. A página do tópico
// acrescenta "Vídeo da aula" e "Problemas para praticar" quando existem.
export const ARTICLES: Record<string, Article> = {
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
      "O array é um endereço e uma conta",
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
      "O problema com a força bruta",
      "A ideia, em uma frase",
      "Janela fixa: o tamanho travado em k",
      "Janela variável: quando o tamanho não é dado",
      "Por que dá para descartar o que saiu",
      "Fixa ou variável: como escolher",
    ],
  },
};

export function getArticle(slug: string): Article | undefined {
  return ARTICLES[slug];
}
