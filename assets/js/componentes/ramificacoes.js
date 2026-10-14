// Blocos-resumo das ramificações na página inicial, gerados do registro (ramificacoes.js).
// Uso: <div data-componente="ramificacoes" data-grupo="frentes"></div>
// Cada bloco leva à página da ramificação; as seções filhas levam às âncoras dentro dela.

export default function ramificacoes(alvo, { url, registro, destino }) {
  const grupo = alvo.dataset.grupo || "frentes";
  const lista = registro.filter((r) => r.grupo === grupo);

  const abrir = (r) => `<a class="botao botao--linha botao--pequeno" href="${url(destino(r, []))}">Abrir ${r.titulo.toLowerCase()}</a>`;

  // Acessos: faixa de destaque. A primeira área (aluno) é a principal.
  if (grupo === "acessos") {
    const rotulos = { aluno: "Entrar na Área do aluno", politecnico: "Entrar na Área do politécnico", admin: "Entrar na área da gestão" };
    alvo.innerHTML = `<div class="acessos">${lista
      .map((r, i) => `<article class="acesso${i ? "" : " acesso--principal"}">
          <h3><a href="${url(destino(r, []))}">${r.titulo}</a></h3>
          <p>${r.resumo}</p>
          <a class="botao ${i ? "botao--claro" : "botao--grande"}" href="${url(destino(r, []))}">${rotulos[r.id] || `Entrar: ${r.titulo}`}</a>
        </article>`)
      .join("")}</div>`;
    return;
  }

  const numeros = (r) =>
    r.numeros && r.numeros.length
      ? `<dl class="fichas frente__numeros">${r.numeros.map((n) => `<div class="ficha"><dt>${n.valor}</dt><dd>${n.rotulo}</dd></div>`).join("")}</dl>`
      : "";

  const filhos = (r) =>
    r.filhos && r.filhos.length
      ? `<ul class="frente__itens">${r.filhos
          .map((f) => `<li><h4><a href="${url(destino(f, [r]))}">${f.titulo}</a></h4>${f.texto || f.resumo ? `<p>${f.texto || f.resumo}</p>` : ""}</li>`)
          .join("")}</ul>`
      : "";

  alvo.innerHTML = `<div class="frentes">${lista
    .map((r) => `<article class="frente">
        <div class="frente__cabeca">
          <h3><a href="${url(destino(r, []))}">${r.titulo}</a></h3>
          <p>${r.resumo}</p>
          ${numeros(r)}
          ${abrir(r)}
        </div>
        <div class="frente__corpo">${filhos(r)}</div>
      </article>`)
    .join("")}</div>`;
}
