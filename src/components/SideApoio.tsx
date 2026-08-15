import Link from "next/link";
import { LINKS } from "@/lib/links";

/**
 * O pé de toda barra lateral: Discord e apoio.
 *
 * Existe como componente porque agora são DUAS barras laterais (a do roadmap e a
 * de cada trilha), e este bloco é o mesmo nas duas. Copiar os dois cards é o
 * caminho conhecido para o dia em que o texto de um deles mudar e o do outro
 * não — e o leitor de trilha ver a chamada velha.
 */
export function SideApoio() {
  return (
    <div className="side-apoio">
      <a className="apoio-card discord" href={LINKS.discord} target="_blank" rel="noopener noreferrer">
        <div className="apoio-title"><span className="dot" />Estude junto no Discord</div>
        <p>Dúvidas, revisão de código e maratonas semanais de problemas.</p>
      </a>
      <Link className="apoio-card coffee" href="/apoie">
        <div className="apoio-title"><span>♥</span>Seja um apoiador</div>
        <p>Ajude a manter a comunidade e o conteúdo livres, para todo mundo.</p>
      </Link>
    </div>
  );
}
