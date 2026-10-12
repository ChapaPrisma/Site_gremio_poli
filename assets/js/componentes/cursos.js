// Guia dos cursos e arquivo das turmas, a partir de dados/cursos.js.
// Uso: <div data-componente="cursos" data-modo="..."></div>
//   menu     (aluno/cursos/)          um pequeno menu por centro acadêmico, com os seus cursos
//   curso    (aluno/cursos/CURSO/)    a página do curso; precisa de data-curso="civil"
//   vitrine  (aluno/)                 a faixa pequena com as logos, no fim da Área do aluno
//   arquivo  (aluno/meu-amor/#turmas) as fotos das turmas, organizadas por ano

import { centros, cursos, centroDo, cursoPor, arquivoDesde } from "../dados/cursos.js?v=202610121606";

const esc = (t = "") => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
const insta = (c) => `<a class="ca__insta" href="https://instagram.com/${esc(c.instagram)}" target="_blank" rel="noopener">@${esc(c.instagram)}</a>`;
const fotoMaisRecente = (curso) => [...curso.turmas].sort((a, b) => b.ano - a.ano)[0];

function menu(alvo, { url }) {
  alvo.innerHTML = `<div class="cas">${centros.map((c) => `
    <section class="ca" id="${c.id}" aria-labelledby="ca-${c.id}">
      <div class="ca__cabeca">
        <img class="ca__logo" src="${url(c.logo)}" alt="Logo do ${esc(c.sigla)}" width="72" height="72">
        <div><h2 id="ca-${c.id}">${esc(c.sigla)}</h2><p>${esc(c.nome)}</p>${insta(c)}</div>
      </div>
      <ul class="ca__cursos">${c.cursos.map((id) => `<li><a href="${url(`aluno/cursos/${id}/`)}">${esc(cursoPor(id).nome)}</a></li>`).join("")}</ul>
    </section>`).join("")}</div>`;
}

function paginaDoCurso(alvo, { url }) {
  const curso = cursoPor(alvo.dataset.curso), ca = curso && centroDo(curso.id);
  if (!ca) { alvo.innerHTML = "<p>Curso não encontrado.</p>"; return; }
  const foto = fotoMaisRecente(curso);
  const irmaos = ca.cursos.filter((id) => id !== curso.id);
  const preparando = (o_que) => `<p class="curso__vazio">O ${esc(ca.sigla)} está preparando ${o_que}.</p>`;
  const centrinho = ca.centrinho || {};

  alvo.innerHTML = `
    ${foto
      ? `<figure class="curso__turma"><img src="${url(foto.imagem)}" alt="${esc(foto.alt || `Turma de ${foto.ano} da ${curso.nome}`)}"><figcaption>Turma de ${foto.ano}</figcaption></figure>`
      : `<div class="curso__turma curso__turma--vazia"><span>Aqui vai a foto da turma do ano passado, mandada pelo ${esc(ca.sigla)}.</span></div>`}
    <header class="curso__cabeca">
      <h1>${esc(curso.nome)}</h1>
      <p class="curso__ca"><img src="${url(ca.logo)}" alt="" width="36" height="36"><span>Guia feito pelo <b>${esc(ca.sigla)}</b>, ${esc(ca.nome)}. ${insta(ca)}</span></p>
      ${curso.recado ? `<p class="curso__recado">${esc(curso.recado)}</p>` : ""}
    </header>

    <section class="bloco-portal" aria-labelledby="curso-materias">
      <h2 id="curso-materias">As matérias do primeiro semestre</h2>
      ${curso.primeiroSemestre.length
        ? `<ul class="curso__materias">${curso.primeiroSemestre.map((m) => `<li><span class="curso__codigo">${esc(m.codigo || "")}</span><b>${esc(m.nome)}</b>${m.dica ? `<p>${esc(m.dica)}</p>` : ""}</li>`).join("")}</ul>`
        : preparando("as matérias do primeiro semestre, com as dicas de quem já passou por elas")}
    </section>

    <section class="bloco-portal" aria-labelledby="curso-centrinho">
      <h2 id="curso-centrinho">O centrinho</h2>
      <div class="curso__centrinho">
        ${centrinho.foto ? `<img src="${url(centrinho.foto)}" alt="O centrinho do ${esc(ca.sigla)}" loading="lazy">` : ""}
        <div>
          <p class="curso__sobre">${esc(ca.sobre)}</p>
          ${centrinho.onde ? `<p><b>Onde fica:</b> ${esc(centrinho.onde)}</p>` : ""}
          ${centrinho.texto ? `<p>${esc(centrinho.texto)}</p>` : ""}
          ${!centrinho.onde && !centrinho.texto ? preparando("como é o centrinho e onde ele fica") : ""}
        </div>
      </div>
    </section>

    <nav class="bloco-portal curso__mais" aria-label="Mais cursos">
      ${irmaos.length ? `<p>Também do ${esc(ca.sigla)}: ${irmaos.map((id) => `<a href="${url(`aluno/cursos/${id}/`)}">${esc(cursoPor(id).nome)}</a>`).join(", ")}.</p>` : ""}
      <a class="botao botao--linha" href="${url(`aluno/cursos/#${ca.id}`)}">Ver todos os cursos</a>
    </nav>`;
}

function vitrine(alvo, { url }) {
  alvo.innerHTML = `<ul class="vitrine-cas">${centros.map((c) => `<li><a href="${url(`aluno/cursos/#${c.id}`)}" title="${esc(c.sigla)}: ${esc(c.cursos.map((id) => cursoPor(id).nome).join(", "))}">
    <img src="${url(c.logo)}" alt="${esc(c.sigla)}" width="56" height="56" loading="lazy"></a></li>`).join("")}</ul>`;
}

// Arquivo de turmas: um ano por vez (o mais recente primeiro) e, dentro do ano, um bloco por centro
// acadêmico, com a logo ao lado das fotos dos seus cursos. No ano mais recente, os cursos ainda sem foto
// aparecem como "foto em breve"; nos anos antigos, só as fotos que existem (e só os CAs que têm alguma).
function arquivo(alvo, { url }) {
  const anos = [...new Set([arquivoDesde, ...cursos.flatMap((c) => c.turmas.map((t) => t.ano))])].sort((a, b) => b - a);
  const recente = anos[0];
  const fotosDoCa = (ca, ano) => ca.cursos.map((id) => ({ curso: cursoPor(id), foto: cursoPor(id).turmas.find((t) => t.ano === ano) }))
    .filter((x) => x.foto || ano === recente);
  const bloco = (ca, ano) => {
    const fotos = fotosDoCa(ca, ano);
    return fotos.length ? `<section class="turmas__ca" aria-label="${esc(ca.sigla)}, turmas de ${ano}">
      <a class="turmas__ca-nome" href="${url(`aluno/cursos/#${ca.id}`)}"><img src="${url(ca.logo)}" alt="" width="44" height="44" loading="lazy"><b>${esc(ca.sigla)}</b></a>
      <ul class="turmas__grade">${fotos.map(({ curso, foto }) => `<li class="turma-foto${foto ? "" : " turma-foto--vazia"}">
        ${foto ? `<img src="${url(foto.imagem)}" alt="${esc(foto.alt || `Turma de ${ano} da ${curso.nome}`)}" loading="lazy">` : `<span class="turma-foto__espera">Foto em breve</span>`}
        <p>${esc(curso.nome.replace(/^Engenharia (de )?/, ""))}</p>
      </li>`).join("")}</ul>
    </section>` : "";
  };
  const painel = (ano) => `<div class="turmas__ano" data-ano="${ano}"${ano === recente ? "" : " hidden"}>${centros.map((ca) => bloco(ca, ano)).join("")}</div>`;

  alvo.innerHTML = `<div class="turmas">
    ${anos.length > 1 ? `<div class="turmas__anos" role="group" aria-label="Escolha o ano">${anos.map((a) => `<button type="button" class="chip" data-ano="${a}" aria-pressed="${a === recente}">${a}</button>`).join("")}</div>` : `<p class="turmas__titulo-ano">Turmas de ${recente}</p>`}
    ${anos.map(painel).join("")}
  </div>`;
  alvo.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-ano]");
    if (!b) return;
    alvo.querySelectorAll("button[data-ano]").forEach((x) => x.setAttribute("aria-pressed", x === b ? "true" : "false"));
    alvo.querySelectorAll(".turmas__ano").forEach((p) => { p.hidden = p.dataset.ano !== b.dataset.ano; });
  });
}

const modos = { menu, curso: paginaDoCurso, vitrine, arquivo };
export default function componenteCursos(alvo, contexto) {
  (modos[alvo.dataset.modo] || menu)(alvo, contexto);
}
