// Aviso de proposta: este site é a proposta da chapa Prisma para o Grêmio, então nada é enviado de
// verdade. Todo botão que manda algo (formulários e links de e-mail das chamadas) abre um aviso
// animado em vez de enviar. Ficam de fora o contato provisório (rodapé e listas com data-contato)
// e o portal interno (admin/), que a chapa já usa.
// Para desligar quando a chapa for eleita: tire a chamada a soSeEleita() em site.js.

const fora = "[data-contato], .rodape, #entrada, #areaAdmin";
let dialogo = null;

function abrir(site) {
  if (!dialogo) {
    dialogo = document.createElement("dialog");
    dialogo.className = "so-se-eleita";
    dialogo.setAttribute("aria-labelledby", "soSeEleitaTitulo");
    dialogo.innerHTML = `
      <span class="so-se-eleita__selo" aria-hidden="true">Proposta</span>
      <h2 id="soSeEleitaTitulo">Isso só vai funcionar se a chapa Prisma for eleita</h2>
      <p>Este site é a proposta da chapa para o Grêmio Politécnico. Por enquanto, nada é enviado: com a eleição, este botão passa a funcionar de verdade.</p>
      <div class="so-se-eleita__acoes">
        <button type="button" class="botao" data-fechar>Entendi</button>
        <a class="botao botao--linha" href="https://chapaprisma.github.io/site_chapa/" target="_blank" rel="noopener">Conhecer as propostas</a>
      </div>
      ${site.contato?.email ? `<small>Quer falar com a chapa agora? Escreva para <a href="mailto:${site.contato.email}">${site.contato.email}</a>.</small>` : ""}`;
    dialogo.addEventListener("click", (e) => { if (e.target === dialogo || e.target.closest("[data-fechar]")) fechar(); });
    dialogo.addEventListener("cancel", (e) => { e.preventDefault(); fechar(); });
    document.body.appendChild(dialogo);
  }
  dialogo.classList.remove("saindo");
  dialogo.showModal();
  dialogo.querySelector("[data-fechar]").focus();
}

function fechar() {
  if (!dialogo?.open) return;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return dialogo.close();
  dialogo.classList.add("saindo");
  setTimeout(() => { dialogo.close(); dialogo.classList.remove("saindo"); }, 180);
}

export default function soSeEleita(site) {
  // fase de captura: o aviso entra antes de qualquer outro tratamento do formulário ou do link
  document.addEventListener("submit", (e) => {
    if (e.target.closest(fora)) return;
    e.preventDefault(); e.stopPropagation();
    abrir(site);
  }, true);
  document.addEventListener("click", (e) => {
    const a = e.target.closest('a[href^="mailto:"]');
    if (!a || a.closest(fora) || a.closest(".so-se-eleita")) return;
    e.preventDefault(); e.stopPropagation();
    abrir(site);
  }, true);
}
