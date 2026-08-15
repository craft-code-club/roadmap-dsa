import Link from "next/link";

export default function NotFound() {
  return (
    <div className="apoie-wrap" style={{ textAlign: "center", paddingTop: 90 }}>
      <span className="hero-badge">Erro 404</span>
      <h1 style={{ marginTop: 18 }}>Essa página saiu da janela</h1>
      <p className="lead" style={{ margin: "0 auto 28px" }}>
        O tópico que você procura não existe (ainda). Volte para os Fundamentos, ou veja o índice completo.
      </p>
      {/* "Ver o roadmap" tinha dois defeitos no mesmo rótulo: descrevia o
          gesto em vez do destino, e o "o" prometia um roadmap único num site
          que hoje tem vários. Nomear resolve os dois, com o mesmo rótulo do
          botão da home. */}
      <Link href="/roadmaps/fundamentos" className="btn btn-primary">Roadmap Fundamentos</Link>
    </div>
  );
}
