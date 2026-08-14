import type { MetadataRoute } from "next";
import { isEmptyTopic } from "@content/roadmap";
import { COURSES, courseHasMaterial, SITE_TOPICS } from "@content/courses";
import {
  atualizacaoDoCurso,
  atualizacaoDoTopico,
  comDataUtil,
  CONTEUDO_DA_ROTA,
  ROTAS_FIXAS,
  ultimaAlteracao,
} from "@/lib/datas-do-git";
import { SITE_URL } from "@/lib/links";

// `CONTEUDO_DA_ROTA` continua exportado daqui porque é daqui que ele sempre foi
// importado; a casa dele agora é o módulo de datas, junto do guarda que mede
// esses mesmos caminhos.
export { CONTEUDO_DA_ROTA, ROTAS_FIXAS };

export const dynamic = "force-static";

// O sitemap é a lista do que o site QUER no índice do Google.
//
// Ele mapeava `ALL_TOPICS` sem filtro enquanto a página emitia `noindex` por
// `isEmptyTopic`: 11 das 51 URLs convidavam o robô para páginas que o próprio
// HTML mandava ignorar, e cada uma vira um erro vermelho permanente no Search
// Console. O filtro abaixo chama a MESMA função que a página chama — recriar a
// condição aqui é o que fez o buraco existir, e recriá-la de novo o reabriria na
// primeira vez que a regra de "tópico vazio" mudasse de um lado só.
//
// A lista das rotas fixas e o mapa de que arquivos datam cada uma vêm do módulo
// de datas: é o mesmo conjunto de caminhos que o guarda de lá mede, e ele só
// pode ser um.

// `lastmod` é o único dos três campos opcionais que o Google declarou usar;
// `priority` e `changeFrequency`, que este arquivo já preenchia, ele ignora.
//
// A derivação da data — o `git log`, o cache por build e o guarda que decide se
// o carimbo é informação — mora em `src/lib/datas-do-git.ts`, porque a página do
// tópico precisa exatamente da mesma resposta para o `dateModified` do JSON-LD.
// A memória de por que o guarda pergunta por CAPACIDADE, e não pela
// profundidade do clone, está lá em cima do arquivo.

export default function sitemap(): MetadataRoute.Sitemap {
  const base = ROTAS_FIXAS.map((rota) => ({
    url: `${SITE_URL}${rota}`,
    priority: rota === "/" ? 1 : rota === "/apoie/" || rota === "/sobre/" ? 0.5 : 0.9,
    changeFrequency: rota === "/" || rota === "/roadmap/" ? ("weekly" as const) : ("monthly" as const),
    lastModified: ultimaAlteracao(...CONTEUDO_DA_ROTA[rota]),
  }));
  // `SITE_TOPICS`, e não `ALL_TOPICS`: os tópicos de curso e as páginas avulsas
  // têm página em `/topico/<slug>/` igual aos da trilha, e ficar de fora do
  // sitemap não os tira do índice — só faz o Google descobri-los mais tarde,
  // por link, enquanto o próprio site diz (pelo `lastmod` que não existe) que
  // não sabe quando eles mudaram.
  const topicos = SITE_TOPICS.filter((t) => !isEmptyTopic(t)).map((t) => ({
    url: `${SITE_URL}/topico/${t.slug}/`,
    priority: t.status === "ready" ? 0.8 : 0.4,
    changeFrequency: "monthly" as const,
    lastModified: atualizacaoDoTopico(t.slug),
  }));
  // A abertura de um curso entra pelo MESMO critério dos tópicos: só quando tem
  // material. Curso em que todo tópico está "em breve" emite `noindex`, e
  // convidar o robô para uma página que manda ignorá-la é o erro vermelho
  // permanente do Search Console que o filtro acima existe para não criar.
  const cursos = COURSES.filter(courseHasMaterial).map((c) => ({
    url: `${SITE_URL}/cursos/${c.slug}/`,
    priority: 0.7,
    changeFrequency: "monthly" as const,
    lastModified: atualizacaoDoCurso(c.slug),
  }));
  return comDataUtil([...base, ...topicos, ...cursos]);
}
