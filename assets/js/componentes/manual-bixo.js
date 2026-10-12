// Manual do bixo (aluno/bixo/): um passo a passo pelo site para quem acabou de entrar na Poli.
// Cada passo explica o que fazer e, quando tem uma página, mostra ela de verdade numa moldura de
// celular ao lado (um iframe da própria página, carregado só quando o passo abre). Os passos já
// vistos ficam marcados neste navegador.
// Uso: <div data-componente="manual-bixo"></div>. Os textos ficam na lista PASSOS abaixo.

const GUARDA = "manual-bixo:vistos";

const PASSOS = [
  {
    id: "comer",
    aba: "Onde comer",
    titulo: "Descubra onde comer",
    texto: "Na Poli, o almoço de todo dia é no bandejão. A página dos Bandejões mostra o cardápio dos quatro e qual fica mais perto de você.",
    como: [
      "Em <b>O que tem hoje</b>, veja o almoço e o jantar de cada bandejão.",
      "Em <b>Qual bandejão fica mais perto de você?</b>, escolha de onde você sai ou toque no mapa: aparece o caminho a pé e quanto tempo leva.",
      "Antes da primeira vez, leia <b>Como pagar</b>.",
    ],
    pagina: { href: "aluno/bandejoes/#hoje", rotulo: "Abrir os Bandejões" },
  },
  {
    id: "aula",
    aba: "Onde é a minha aula",
    titulo: "Ache a sala de cada aula",
    texto: "A sua matrícula fica no JupiterWeb. A página de Salas cruza a sua grade com as salas da Poli e monta a semana para você.",
    como: [
      'No <a href="https://uspdigital.usp.br/jupiterweb/" target="_blank" rel="noopener">JupiterWeb</a>, abra a sua grade e anote de cada disciplina o <b>código</b>, a <b>turma</b>, o <b>horário</b> e o <b>professor</b>.',
      "Em <b>Onde é a minha aula?</b>, digite o código, ache a sua turma (confira pelo horário e pelo professor) e adicione à grade.",
      "Em <b>Minha grade</b>, veja a sala de cada aula. Baixe em PDF ou leve para a agenda do celular.",
    ],
    extra: 'Prefere ir direto à fonte? O <a href="https://www.uspolis.com.br/public/allocations" target="_blank" rel="noopener">USPolis</a>, o sistema de salas da Poli, também mostra onde é cada aula.',
    pagina: { href: "aluno/salas/#minha-aula", rotulo: "Abrir Salas e grade horária" },
  },
  {
    id: "recepcao",
    aba: "Semana de Recepção",
    titulo: "Vá à Semana de Recepção",
    texto: "É a semana em que a Poli recebe você: integração com a sua turma, o campus, os grupos e tudo o que o Grêmio faz. Não perca.",
    como: [
      "Em 2027, ela vai ter uma página só dela aqui no portal, com a programação de cada dia.",
      "As fotos e as memórias de cada Recepção ficam guardadas depois em Meu Amor.",
    ],
    pagina: { href: "aluno/meu-amor/#recepcao", rotulo: "Ver em Meu Amor", semPrevia: true },
  },
  {
    id: "grupos",
    aba: "Grupos de extensão",
    titulo: "Conheça os grupos de extensão",
    texto: "Cada grupo de extensão é uma Poli diferente para viver: competições, pesquisa, projetos sociais, empreendedorismo e muito mais. São mais de 50.",
    como: [
      "A seção Extensões vai ganhar uma apresentação de toda a variedade dos grupos e do que cada um tem a oferecer.",
      "Duas vezes por ano, a Feira de Extensão reúne todos num só lugar. Vá e converse com eles.",
    ],
    pagina: { href: "aluno/extensoes/", rotulo: "Abrir Extensões" },
  },
  {
    id: "pergunte",
    aba: "Explore e pergunte",
    titulo: "Mexa no site e pergunte à vontade",
    texto: "Explore o portal sem medo: nada quebra. E qualquer dúvida, sobre a Poli ou sobre o site, pergunte ao Grêmio, pessoalmente ou pelo canal que você preferir.",
    contato: true,
  },
];

const ler = () => { try { return new Set(JSON.parse(localStorage.getItem(GUARDA) || "[]")); } catch { return new Set(); } };
const gravar = (vistos) => { try { localStorage.setItem(GUARDA, JSON.stringify([...vistos])); } catch {} };

export default function manualBixo(alvo, { url, site }) {
  const vistos = ler();
  const total = PASSOS.length;

  const contato = () => {
    const c = site.contato;
    const insta = site.redes.find((r) => r.nome === "Instagram");
    const fone = c.telefone ? c.telefone.replace(/\D/g, "") : "";
    return `<ul class="manual__canais" data-contato>
      ${fone ? `<li><b>WhatsApp ou telefone</b><a href="https://wa.me/55${fone}" target="_blank" rel="noopener">${c.telefone}</a></li>` : ""}
      <li><b>E-mail${c.provisorio ? " (provisório)" : ""}</b><a href="mailto:${c.email}">${c.email}</a></li>
      ${insta ? `<li><b>Instagram</b><a href="${insta.href}" target="_blank" rel="noopener">${insta.usuario}</a></li>` : ""}
      <li><b>Proposta ou demanda</b><a href="${url("aluno/demandas/")}">Envie direto para a diretoria</a></li>
    </ul>`;
  };

  const painel = (p, i) => `
    <div class="manual__painel${p.pagina && !p.pagina.semPrevia ? " manual__painel--com-previa" : ""}" id="passo-${p.id}" role="tabpanel" aria-labelledby="aba-${p.id}" tabindex="0" hidden>
      <div class="manual__texto">
        <span class="manual__numero">Passo ${i + 1} de ${total}</span>
        <h3>${p.titulo}</h3>
        <p>${p.texto}</p>
        ${p.como ? `<ol class="manual__como">${p.como.map((c) => `<li>${c}</li>`).join("")}</ol>` : ""}
        ${p.extra ? `<p class="manual__extra">${p.extra}</p>` : ""}
        ${p.contato ? contato() : ""}
        <div class="manual__acoes">
          ${p.pagina ? `<a class="botao" href="${url(p.pagina.href)}">${p.pagina.rotulo}</a>` : ""}
          ${i < total - 1 ? `<button type="button" class="botao botao--linha" data-ir="${i + 1}">Próximo passo</button>` : ""}
        </div>
      </div>
      ${p.pagina && !p.pagina.semPrevia ? `<figure class="manual__celular" aria-label="Prévia da página">
        <div class="manual__tela" data-src="${url(p.pagina.href)}" data-titulo="Prévia: ${p.pagina.rotulo.replace(/^Abrir (os |as |a |o )?/, "")}"></div>
        <figcaption>A página de verdade: role e toque para experimentar.</figcaption>
      </figure>` : ""}
    </div>`;

  alvo.innerHTML = `<div class="manual">
    <div class="manual__trilha">
      <div class="manual__progresso"><span class="manual__barra"><i></i></span><span class="manual__conta"></span></div>
      <div class="manual__abas" role="tablist" aria-label="Passos do manual">
        ${PASSOS.map((p, i) => `<button type="button" role="tab" id="aba-${p.id}" aria-controls="passo-${p.id}" aria-selected="false" tabindex="-1" data-ir="${i}">
          <span class="manual__marca" aria-hidden="true">${i + 1}</span><span>${p.aba}</span></button>`).join("")}
      </div>
    </div>
    <div class="manual__paineis">${PASSOS.map(painel).join("")}</div>
  </div>`;

  // A prévia abre sem a âncora no endereço: o salto de uma âncora dentro do iframe rolaria também
  // esta página. Depois de carregar, rola só a tela do celular até a seção do passo.
  const prever = (tela) => {
    const [endereco, ancora] = tela.dataset.src.split("#");
    const quadro = document.createElement("iframe");
    quadro.title = tela.dataset.titulo;
    quadro.src = endereco;
    // um passo escondido perde a rolagem da prévia, então ela rola de novo sempre que o passo reabre
    tela.rolar = () => {
      if (!ancora) return;
      try {
        const j = quadro.contentWindow, el = j.document.getElementById(ancora);
        if (el) j.scrollTo({ top: el.getBoundingClientRect().top + j.scrollY - 76, behavior: "instant" });
      } catch {}
    };
    quadro.addEventListener("load", () => { tela.rolar(); setTimeout(tela.rolar, 900); }, { once: true }); // de novo depois que os componentes montam
    tela.append(quadro);
  };

  const abas = [...alvo.querySelectorAll('[role="tab"]')];
  const paineis = [...alvo.querySelectorAll('[role="tabpanel"]')];
  const barra = alvo.querySelector(".manual__barra i"), conta = alvo.querySelector(".manual__conta");

  const marcar = () => {
    abas.forEach((a, i) => a.classList.toggle("visto", vistos.has(PASSOS[i].id)));
    const n = PASSOS.filter((p) => vistos.has(p.id)).length;
    barra.style.width = `${(n / total) * 100}%`;
    conta.textContent = n === total ? "Manual completo. Bem-vindo à Poli!" : `${n} de ${total} passos vistos`;
  };

  const abrir = (i, focar = false) => {
    abas.forEach((a, k) => { a.setAttribute("aria-selected", k === i ? "true" : "false"); a.tabIndex = k === i ? 0 : -1; });
    paineis.forEach((p, k) => { p.hidden = k !== i; });
    // a prévia só carrega quando o passo abre, e uma vez só
    const tela = paineis[i].querySelector(".manual__tela[data-src]");
    if (tela) tela.firstChild ? tela.rolar() : prever(tela);
    vistos.add(PASSOS[i].id); gravar(vistos); marcar();
    if (focar) abas[i].focus();
  };

  alvo.addEventListener("click", (e) => {
    const b = e.target.closest("[data-ir]");
    if (!b) return;
    const i = Number(b.dataset.ir);
    abrir(i);
    if (b.closest(".manual__acoes")) alvo.querySelector(".manual").scrollIntoView({ block: "start", behavior: "smooth" });
  });
  alvo.querySelector('[role="tablist"]').addEventListener("keydown", (e) => {
    const atual = abas.indexOf(document.activeElement);
    if (atual < 0) return;
    const ir = { ArrowRight: atual + 1, ArrowDown: atual + 1, ArrowLeft: atual - 1, ArrowUp: atual - 1, Home: 0, End: total - 1 }[e.key];
    if (ir === undefined) return;
    e.preventDefault();
    abrir((ir + total) % total, true);
  });

  abrir(0);
}
