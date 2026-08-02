import type { ComponentType } from "react";
import Fixa from "./janela-deslizante-fixa.mdx";
import Dinamica from "./janela-deslizante-dinamica.mdx";
import DoisPonteiros from "./dois-ponteiros.mdx";

// Registro dos artigos em MDX. Para adicionar um tópico "ready":
//   1. crie src/content/topics/<slug>.mdx (use <JanelaVisualizer /> etc.)
//   2. registre-o aqui
//   3. em src/content/roadmap.ts marque status "ready" (e o viz, se houver)
export type Artigo = { Body: ComponentType; sumario: string[] };

// sumario = SÓ os títulos (h2) do artigo, no texto exato. A página do tópico
// acrescenta "Vídeo da aula" e "Problemas para praticar" quando existem.
export const ARTIGOS: Record<string, Artigo> = {
  "dois-ponteiros": {
    Body: DoisPonteiros,
    sumario: ["O padrão", "Two Sum num array ordenado", "Por que funciona"],
  },
  "janela-deslizante-fixa": {
    Body: Fixa,
    sumario: ["O problema com a força bruta", "A ideia, em uma frase", "Janela fixa vs. variável"],
  },
  "janela-deslizante-dinamica": {
    Body: Dinamica,
    sumario: ["Quando o tamanho não é dado", "A ideia, em uma frase", "Por que dá para descartar o que saiu"],
  },
};

export function getArtigo(slug: string): Artigo | undefined {
  return ARTIGOS[slug];
}
