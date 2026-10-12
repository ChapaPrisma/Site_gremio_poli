// Rodapé no formato de carimbo (legenda) de folha de desenho técnico:
// cada campo traz um dado da entidade.

export default function rodape(alvo, { site, url, registro, destino }) {
  const { contato } = site;
  const tel = contato.telefone ? contato.telefone.replace(/\D/g, "") : "";
  // Mapa do site: todas as ramificações do registro, na ordem em que foram cadastradas.
  const menu = registro.map((r) => `<li><a href="${url(destino(r, []))}">${r.titulo}</a></li>`).join("");

  alvo.innerHTML = `
    <footer class="rodape" id="contato">
      <div class="container">
        <div class="rodape__topo">
          <h2>Fale com a gente</h2>
          <p>Dúvidas, demandas, parcerias ou sugestões: escreva para a gente.${contato.provisorio ? ` <span class="rodape__provisorio">${contato.provisorio}</span>` : ""}</p>
          <ul class="rodape__canais">
            <li><a href="mailto:${contato.email}"><span>E-mail${contato.provisorio ? " (provisório)" : ""}</span>${contato.email}</a></li>
            ${tel ? `<li><a href="tel:+55${tel}"><span>Telefone</span>${contato.telefone}</a></li>` : ""}
            ${site.redes.map((r) => `<li><a href="${r.href}" target="_blank" rel="noopener"><span>${r.nome}</span>${r.usuario}</a></li>`).join("")}
          </ul>
        </div>

        <div class="carimbo" role="group" aria-label="Dados da entidade">
          <div class="carimbo__logo"><img src="${url("assets/img/marca/gremio-azul.png?v=bef84bef")}" alt="${site.nomeCompleto}" width="88" height="88"></div>
          <div class="carimbo__campo carimbo__campo--largo"><span>Entidade</span>${site.nomeCompleto}</div>
          <div class="carimbo__campo"><span>Fundação</span>1º de setembro de 1903</div>
          <div class="carimbo__campo carimbo__campo--largo"><span>Sede</span>${contato.endereco}</div>
          <div class="carimbo__campo"><span>CNPJ</span>${contato.cnpj}</div>
          <div class="carimbo__campo carimbo__campo--largo"><span>Representa</span>Alunos da Escola Politécnica da USP</div>
          <div class="carimbo__campo"><span>Ano</span><span data-ano></span></div>
        </div>

        <nav class="rodape__menu" aria-label="Mapa do site"><ul>${menu}</ul></nav>
        <p class="rodape__autoria">${site.autoria}</p>
      </div>
    </footer>`;
}
