// Rodapé no formato de carimbo (legenda) de folha de desenho técnico.
// Enquanto este é o site de campanha, o carimbo traz os dados da chapa Prisma, não os da entidade
// (determinação da Comissão Eleitoral, 19/10/2026: nada de logo, cores ou dados oficiais do Grêmio).

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

        <div class="carimbo" role="group" aria-label="Sobre este site">
          <div class="carimbo__logo"><img src="${url("assets/img/marca/prisma.svg?v=88a4c984")}" alt="Chapa Prisma" width="80" height="90"></div>
          <div class="carimbo__campo carimbo__campo--largo"><span>Site de campanha</span>Chapa Prisma, eleição do Grêmio Politécnico</div>
          <div class="carimbo__campo"><span>Conheça a chapa</span><a href="${site.chapa}" target="_blank" rel="noopener">site da Prisma</a></div>
          <div class="carimbo__campo carimbo__campo--largo"><span>Identidade</span>As cores e a logo são as da chapa. Se a Prisma for eleita, o portal adota a logo histórica e a identidade do Grêmio.</div>
          <div class="carimbo__campo"><span>Contato</span>${contato.email}</div>
          <div class="carimbo__campo carimbo__campo--largo"><span>Proposta para</span>Os alunos da Escola Politécnica da USP</div>
          <div class="carimbo__campo"><span>Ano</span><span data-ano></span></div>
        </div>

        <nav class="rodape__menu" aria-label="Mapa do site"><ul>${menu}</ul></nav>
        <div class="rodape__fim"><p class="rodape__autoria">${site.autoria}</p><a class="rodape__colabs" href="${url("colaboradores/")}">Colaboradores</a></div>
      </div>
    </footer>`;
}
