import { ImageResponse } from "next/og";

export const alt = "Roadmap DSA, guia visual e gratuito de Algoritmos e Estruturas de Dados";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const dynamic = "force-static";

// Gerada no build (SSG). Vira a imagem de preview (Open Graph + Twitter).
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0b111c",
          color: "#e7edf6",
          padding: "72px",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(680px 420px at 10% -5%, rgba(59,130,246,0.24), transparent 60%), radial-gradient(680px 440px at 88% 8%, rgba(124,58,237,0.20), transparent 62%)",
          }}
        />

        {/* topo: marca */}
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "78px",
              height: "78px",
              borderRadius: "18px",
              background: "linear-gradient(150deg, #7c3aed, #3b82f6)",
              fontSize: "27px",
              fontWeight: 800,
              letterSpacing: "-0.02em",
              color: "#fff",
            }}
          >
            DSA
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: "32px", fontWeight: 700 }}>Roadmap DSA</div>
            <div style={{ fontSize: "20px", color: "#8ba0bb" }}>pela comunidade Craft &amp; Code Club</div>
          </div>
        </div>

        {/* meio: chamada */}
        <div style={{ display: "flex", flexDirection: "column", maxWidth: "1000px" }}>
          <div style={{ display: "flex", flexWrap: "wrap", lineHeight: 1.08 }}>
            <span style={{ fontSize: "62px", fontWeight: 800, letterSpacing: "-0.03em", color: "#3b82f6", marginRight: "18px" }}>
              Visualização
            </span>
            <span style={{ fontSize: "62px", fontWeight: 800, letterSpacing: "-0.03em" }}>e aprofundamento</span>
          </div>
          <div style={{ fontSize: "62px", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.08 }}>em cada estrutura</div>
          <div style={{ fontSize: "26px", color: "#a9bcd4", marginTop: "26px" }}>
            O maior guia visual de Algoritmos e Estruturas de Dados, em português.
          </div>
        </div>

        {/* base: selos */}
        <div style={{ display: "flex", gap: "14px" }}>
          {["100% grátis", "open source", "feito pela comunidade"].map((t) => (
            <div
              key={t}
              style={{
                display: "flex",
                padding: "9px 18px",
                border: "1px solid rgba(255,255,255,0.16)",
                borderRadius: "99px",
                fontSize: "21px",
                color: "#9fb4cf",
              }}
            >
              {t}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
