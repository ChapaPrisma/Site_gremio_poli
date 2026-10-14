// Jornal O Politécnico (aluno/jornal/): folhear a edição como quem puxa uma folha com a mão e
// baixar a edição inteira em PDF (pela impressão do navegador, uma página por folha A3).
// A folha gira pela margem esquerda, levanta um pouco o canto de baixo enquanto dobra, ganha
// luz e sombra e, passada a metade, mostra o verso. Dá para arrastar com o mouse ou o dedo
// (pelo canto dobrado ou pela metade direita da página; a esquerda volta), e as setas, o
// teclado e o rodapé de cada página fazem a mesma virada sozinhos.
// Uso: <div class="edicao" id="edicao"> com <section class="folha"> por página, a barra com
// #jornalAnterior, #jornalProxima, #jornalPagina e #jornalPdf, e <div data-componente="jornal"></div>.

const limitar = (v) => Math.max(0, Math.min(1, v));
const suave = (k) => (k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2);

export default function jornal() {
  const edicao = document.getElementById("edicao");
  if (!edicao) return;
  const folhas = [...edicao.querySelectorAll(".folha")];
  const ant = document.getElementById("jornalAnterior"), prox = document.getElementById("jornalProxima"), rotulo = document.getElementById("jornalPagina");
  const reduzido = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let atual = 0, ocupado = false;

  // Luz que corre pela folha e o canto dobrado (convite para puxar).
  folhas.forEach((f, i) => {
    f.insertAdjacentHTML("beforeend", `<span class="folha__luz" aria-hidden="true"></span>`);
    if (i < folhas.length - 1) f.insertAdjacentHTML("beforeend", `<button type="button" class="folha__canto" aria-label="Virar para a página ${i + 2}"></button>`);
    f.removeAttribute("hidden");
  });
  edicao.classList.add("pronta");

  // A edição acompanha a altura da página aberta (as folhas ficam sobrepostas).
  const ajustarAltura = () => { edicao.style.height = `${folhas[atual].offsetHeight}px`; };
  new ResizeObserver(ajustarAltura).observe(edicao);
  folhas.forEach((f) => new ResizeObserver(() => { if (f === folhas[atual]) ajustarAltura(); }).observe(f));
  const marcar = () => {
    folhas.forEach((f, i) => { f.classList.toggle("atual", i === atual); f.setAttribute("aria-hidden", i === atual ? "false" : "true"); f.inert = i !== atual; });
    rotulo.textContent = `Página ${atual + 1} de ${folhas.length}`;
    ant.disabled = atual === 0; prox.disabled = atual === folhas.length - 1;
    ajustarAltura();
  };

  // Posição da folha que vira: p = 0 deitada no lugar, p = 1 virada para a esquerda.
  function posicionar(f, p) {
    const s = Math.sin(Math.PI * p);
    f.style.transform = `rotateY(${-180 * p}deg) rotateX(${2.5 * s}deg) rotateZ(${-2.2 * s}deg) translateY(${-12 * s}px)`;
    f.style.setProperty("--luz", (0.9 * s).toFixed(3));
    f.classList.toggle("verso", p > 0.5);
  }

  // Uma virada: avançar puxa a folha atual para a esquerda e revela a próxima;
  // voltar traz a folha anterior de volta por cima.
  function comecar(destino) {
    const frente = destino > atual;
    const f = frente ? folhas[atual] : folhas[destino];
    folhas[destino].classList.add("atual");
    f.classList.add("virando");
    return { f, frente, destino, p: frente ? 0 : 1 };
  }
  function terminar(v, completou) {
    v.f.classList.remove("virando", "verso");
    v.f.style.transform = ""; v.f.style.removeProperty("--luz");
    if (completou) atual = v.destino;
    else folhas[v.destino].classList.remove("atual");
    marcar(); ocupado = false;
  }
  // Leva a folha até a posição final; o fim é garantido por tempo mesmo sem quadros de animação.
  function soltar(v, alvo, duracao) {
    const de = v.p, t0 = performance.now();
    let feito = false;
    const fim = () => { if (feito) return; feito = true; posicionar(v.f, alvo); terminar(v, (alvo === 1) === v.frente); };
    const passo = (t) => {
      if (feito) return;
      const k = limitar((t - t0) / duracao);
      v.p = de + (alvo - de) * suave(k);
      posicionar(v.f, v.p);
      if (k < 1) requestAnimationFrame(passo); else fim();
    };
    requestAnimationFrame(passo);
    setTimeout(fim, duracao + 250);
  }

  function ir(destino) {
    if (ocupado || destino < 0 || destino >= folhas.length || destino === atual) return;
    if (reduzido) { atual = destino; marcar(); return; }
    ocupado = true;
    const v = comecar(destino);
    posicionar(v.f, v.p);
    soltar(v, v.frente ? 1 : 0, 900);
  }

  ant.addEventListener("click", () => ir(atual - 1));
  prox.addEventListener("click", () => ir(atual + 1));
  folhas.forEach((f, i) => {
    f.querySelector(".jornal__rodape")?.addEventListener("click", () => ir(i + 1));
    // chamadas da capa ("Nesta edição"): levam direto à página da matéria
    f.querySelectorAll("[data-ir]").forEach((c) => c.addEventListener("click", (e) => { e.preventDefault(); ir(Number(c.dataset.ir) - 1); }));
    f.querySelector(".folha__canto")?.addEventListener("click", (e) => { if (!e.detail || !arrastou) ir(i + 1); });
  });
  edicao.addEventListener("keydown", (e) => { if (e.key === "ArrowRight") ir(atual + 1); if (e.key === "ArrowLeft") ir(atual - 1); });

  // Arrastar com a mão: a folha segue o dedo ou o mouse; soltando depois de um terço, ela vira.
  let toque = null, arrastou = false;
  edicao.addEventListener("pointerdown", (e) => {
    if (ocupado || reduzido || (e.button && e.button !== 0)) return;
    if (e.target.closest("a, input, textarea, select, button:not(.folha__canto)")) return;
    const r = edicao.getBoundingClientRect(), fx = (e.clientX - r.left) / r.width;
    const frente = fx > 0.5 || !!e.target.closest(".folha__canto");
    const destino = atual + (frente ? 1 : -1);
    if (destino < 0 || destino >= folhas.length || (!frente && fx > 0.35)) return;
    toque = { x0: e.clientX, y0: e.clientY, largura: r.width, frente, destino, id: e.pointerId, v: null };
    arrastou = false;
  });
  edicao.addEventListener("pointermove", (e) => {
    if (!toque || e.pointerId !== toque.id) return;
    const dx = e.clientX - toque.x0, dy = e.clientY - toque.y0;
    if (!toque.v) {
      if (Math.abs(dx) < 8 || Math.abs(dy) > Math.abs(dx)) { if (Math.abs(dy) > 12) toque = null; return; }
      if (toque.frente ? dx > 0 : dx < 0) { toque = null; return; }
      ocupado = true; arrastou = true;
      toque.v = comecar(toque.destino);
      edicao.setPointerCapture(toque.id);
      edicao.classList.add("arrastando");
    }
    if (toque.frente) {
      // a borda solta da folha fica embaixo da mão: x da borda = lombada + largura · cos(ângulo)
      const r = edicao.getBoundingClientRect();
      toque.v.p = Math.acos(Math.max(-1, Math.min(1, (e.clientX - r.left) / r.width))) / Math.PI;
    } else {
      toque.v.p = 1 - limitar(Math.abs(dx) / (toque.largura * 0.9));
    }
    posicionar(toque.v.f, toque.v.p);
  });
  const largar = (e) => {
    if (!toque || e.pointerId !== toque.id) return;
    const { v, frente } = toque;
    toque = null;
    edicao.classList.remove("arrastando");
    if (!v) return;
    const andou = frente ? v.p : 1 - v.p;
    const vira = andou > 0.28;
    const alvo = vira === frente ? 1 : 0;
    soltar(v, alvo, 220 + 420 * Math.abs(alvo - v.p));
  };
  edicao.addEventListener("pointerup", largar);
  edicao.addEventListener("pointercancel", largar);

  // PDF: abre a impressão com o nome da edição; o leitor escolhe "Salvar como PDF".
  document.getElementById("jornalPdf")?.addEventListener("click", () => {
    const titulo = document.title;
    document.title = "O Politécnico - edição de relançamento";
    addEventListener("afterprint", () => { document.title = titulo; }, { once: true });
    print();
  });

  marcar();
}
