// Painel "Bandejões agora": quais bandejões estão abertos neste momento,
// com o atalho para o guia completo na Área do aluno.

import { bandejoes, situacao } from "../dados/bandejoes.js?v=202610120941";

export default function agora(alvo, { url, encontrar, destino }) {
  const guia = encontrar("bandejoes");
  const link = guia ? `<a class="botao botao--linha botao--pequeno" href="${url(destino(guia.no, guia.ancestrais))}">Cardápio de hoje e caminho a pé</a>` : "";
  const desenhar = () => {
    const linhas = bandejoes
      .map((b) => ({ b, s: situacao(b) }))
      .sort((x, y) => y.s.aberto - x.s.aberto)
      .map(({ b, s }) => `<li class="agora__linha">
          <span class="agora__nome">${b.nome}</span>
          <span class="pill${s.aberto ? " pill--aberto" : ""} tab">${s.texto}</span>
        </li>`)
      .join("");
    alvo.innerHTML = `<section class="agora" aria-labelledby="agora-titulo">
        <h2 class="agora__titulo" id="agora-titulo">Bandejões agora</h2>
        <ul class="agora__lista" aria-live="polite">${linhas}</ul>
        <p class="agora__nota">Horários de dias letivos. Em feriados e férias o funcionamento muda.</p>
        ${link}
      </section>`;
  };
  desenhar();
  setInterval(desenhar, 60_000);
}
