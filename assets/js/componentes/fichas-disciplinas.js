// Busca de fichas de disciplina (aluno/fuja-do-nabo/): digite o código ou o nome e veja os créditos, do que
// a disciplina trata e como é a avaliação, com os dados do JupiterWeb (ficha-disciplina.js). Começa vazia:
// só mostra resultados depois que a pessoa digita.
// Uso: <input id="fichaBusca"> e <div data-componente="fichas-disciplinas" data-alvo="fichaResultados"></div>.

import { carregarIndice, textoCreditos, detalhes, ligarFichas } from "./ficha-disciplina.js?v=202610181007";

const esc = (t = "") => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
const norm = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export default async function fichasDisciplinas(alvo, { url }) {
  const campo = document.getElementById("fichaBusca"), saida = document.getElementById(alvo.dataset.alvo || "fichaResultados");
  if (!campo || !saida) return;
  const dados = await carregarIndice(url);
  const lista = Object.entries(dados?.indice || {}).map(([c, [n, ca, ct]]) => ({ c, n, ca, ct, nc: norm(c), nn: norm(n) }));
  const estado = document.getElementById("fichaEstado");
  if (!lista.length) { if (estado) estado.textContent = "As fichas das disciplinas não carregaram agora. Tente de novo em alguns minutos."; return; }
  ligarFichas(saida, url);
  let espera;
  const buscar = () => {
    const q = norm(campo.value.trim());
    if (q.length < 2) { saida.innerHTML = ""; if (estado) estado.textContent = ""; return; }
    const palavras = q.split(/\s+/);
    const achadas = lista.filter((d) => d.nc.startsWith(q) || palavras.every((p) => d.nn.includes(p) || d.nc.includes(p))).slice(0, 8);
    if (estado) estado.textContent = achadas.length ? "" : "Nenhuma disciplina encontrada. Confira o código ou tente uma palavra do nome.";
    saida.innerHTML = achadas.map((d) => `<article class="ficha-busca__item">
        <h3><span>${esc(d.c)}</span> ${esc(d.n)}</h3>
        <p class="ficha-busca__creditos">${esc(textoCreditos(d.ca, d.ct))}</p>
        ${detalhes(d.c)}
      </article>`).join("");
  };
  campo.addEventListener("input", () => { clearTimeout(espera); espera = setTimeout(buscar, 150); });
}
