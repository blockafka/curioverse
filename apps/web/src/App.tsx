import type { CSSProperties } from "react";

const pageStyle: CSSProperties = {
  minHeight: "100vh",
  display: "grid",
  placeItems: "center",
  padding: "24px",
  background: "#f8fafc",
  color: "#111827",
  fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif"
};

export function App() {
  return (
    <main style={pageStyle}>
      <section>
        <p>Curioverse</p>
        <h1>瞬悉全宇宙</h1>
        <p>从一个问题出发，继续探索故事、观点与现实应用。</p>
      </section>
    </main>
  );
}
