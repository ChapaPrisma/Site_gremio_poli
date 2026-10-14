// Vídeo leve: mostra a capa do vídeo do YouTube com um botão de play e só carrega o player
// (youtube-nocookie) quando a pessoa toca. A página abre rápido e ninguém é rastreado à toa.
// Uso: <div class="video-leve" data-youtube="ID" data-titulo="Título do vídeo"></div> em qualquer
// lugar da página e <div data-componente="video-leve"></div> uma vez.

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export default function videoLeve() {
  document.querySelectorAll(".video-leve[data-youtube]").forEach((caixa) => {
    const id = caixa.dataset.youtube, titulo = caixa.dataset.titulo || "Vídeo";
    caixa.innerHTML = `<button type="button" class="video-leve__capa" aria-label="Assistir: ${esc(titulo)}">
        <img src="https://i.ytimg.com/vi/${id}/hqdefault.jpg" alt="" loading="lazy" width="480" height="360">
        <span class="video-leve__play" aria-hidden="true"><svg viewBox="0 0 24 24" width="30" height="30"><path d="M8 5v14l11-7z" fill="currentColor"/></svg></span>
        <span class="video-leve__titulo">${esc(titulo)}</span>
      </button>`;
    caixa.querySelector("button").addEventListener("click", () => {
      caixa.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0" title="${esc(titulo)}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`;
    }, { once: true });
  });
}
