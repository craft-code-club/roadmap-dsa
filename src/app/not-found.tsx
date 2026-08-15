import Link from "next/link";

export default function NotFound() {
  return (
    <div className="apoie-wrap" style={{ textAlign: "center", paddingTop: 90 }}>
      <span className="hero-badge">Erro 404</span>
      <h1 style={{ marginTop: 18 }}>Essa página saiu da janela</h1>
      <p className="lead" style={{ margin: "0 auto 28px" }}>
        O tópico que você procura não existe (ainda). Volte para os Fundamentos, ou veja o índice completo.
      </p>
      <Link href="/roadmaps/fundamentos" className="btn btn-primary">Ver o roadmap</Link>
    </div>
  );
}
