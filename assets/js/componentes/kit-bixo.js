// Kit burocrático do bixo (aluno/bixo/): um cartão que abre uma janela com os passos da papelada
// do começo da graduação (matrícula, Cartão USP, Bilhete Único, BUSP, grade e bolsas), cada um
// expansível. Os textos ficam em PARTES abaixo; os nomes dos menus seguem os sistemas da USP
// de graduação (JupiterWeb; o Janus é só da pós) e podem mudar de um ano para o outro: revise antes de cada Recepção.
// Uso: <div data-componente="kit-bixo"></div>.

const JUPITER = "https://uspdigital.usp.br/jupiterweb/";
const link = (href, texto) => `<a href="${href}" target="_blank" rel="noopener">${texto}</a>`;

const PARTES = [
  {
    titulo: "Matrícula: as etapas",
    corpo: `<ol>
      <li><b>Pré-matrícula virtual.</b> Depois da aprovação, entre no ${link(JUPITER + "graduacaoMatriculaIngressante", "JupiterWeb (matrícula de ingressante)")}, preencha os formulários e envie os documentos digitalizados pedidos ali, dentro do prazo do seu edital (Fuvest, Enem-Sisu ou Provão Paulista).</li>
      <li><b>Efetivação.</b> A USP confere os documentos e confirma a sua matrícula. Fique de olho no e-mail e no Júpiter: se faltar algo, é lá que avisam.</li>
      <li><b>Senha Única e e-mail USP.</b> Com a matrícula feita, você cria a Senha Única, que abre os sistemas da USP (Júpiter, e-Disciplinas, o app e-Card), e ganha o seu e-mail @usp.br.</li>
      <li><b>Disciplinas do primeiro semestre.</b> No primeiro semestre da Poli, as obrigatórias já vêm na sua grade. Depois, a cada semestre, você mesmo se matricula nas disciplinas pelo Júpiter, em rodadas (a matrícula interativa), e pode ajustar no período de retificação.</li>
    </ol>`,
  },
  {
    titulo: "Carteirinha (Cartão USP)",
    corpo: `<ol>
      <li>Entre no ${link(JUPITER, "JupiterWeb")} com a Senha Única e clique em <b>Cartões USP</b>, no menu da esquerda.</li>
      <li>Carregue uma <b>foto recente</b>: só o rosto, de frente, sem boné, óculos escuros ou máscara, de preferência tipo 3×4 com fundo claro.</li>
      <li>Ainda em <b>Cartões USP</b>, clique em <b>Nova solicitação</b>. No primeiro cartão, o único motivo é <b>Novo Cartão</b>: é só salvar. O pedido vai para o Serviço de Graduação da Poli aprovar. Sem a foto e a solicitação, o pedido fica incompleto.</li>
      <li>O Júpiter manda um e-mail quando o cartão chega à Poli para você retirar (leva cerca de um mês).</li>
      <li>Depois de retirar, <b>ative o cartão no JupiterWeb</b>. Sem ativar, não dá para carregar créditos do bandejão nem usar o CEPEUSP.</li>
    </ol>
    <p>Enquanto o físico não chega, baixe o app <b>e-Card USP</b> (carteirinha digital, com a Senha Única). Ele comprova que você é aluno, mas pode não bastar para meia-entrada em shows e jogos.</p>`,
  },
  {
    titulo: "Bilhete Único de estudante (SPTrans)",
    corpo: `<ol>
      <li>No ${link(JUPITER, "JupiterWeb")}, vá em <b>Acompanhamentos &gt; Bilhete Único SPTrans &gt; Solicitar</b>. Não precisa de documento: é assim que a USP manda os seus dados para a SPTrans.</li>
      <li>Depois que a USP enviar os dados, peça o benefício no site da SPTrans (${link("https://sptrans.dne.com.br/", "sptrans.dne.com.br")}).</li>
      <li>Se ainda não tem Bilhete Único, peça a primeira via ali mesmo: ele chega pelo correio, e a primeira via é paga.</li>
    </ol>
    <p>Quem é de baixa renda pode ter direito ao Passe Livre Estudantil, com as passagens gratuitas; as regras mudam a cada ano. Dúvidas sobre transporte: ${link("https://prip.usp.br/transporte/", "prip.usp.br/transporte")}. Para ônibus intermunicipais (ARTESP, cartão TOP) também há desconto, com pedido pelo site deles.</p>`,
  },
  {
    titulo: "BUSP (os circulares de graça)",
    corpo: `<p>O BUSP é o cartão que libera de graça os ônibus circulares que ligam a Cidade Universitária ao metrô Butantã.</p>
    <ol>
      <li>No ${link(JUPITER, "JupiterWeb")}, abra <b>Cartões USP</b> e escolha <b>Solicitação Bilhete USP</b>.</li>
      <li>Siga as instruções do sistema. Peça só se for usar: a segunda via dá mais trabalho.</li>
    </ol>`,
  },
  {
    titulo: "Grade horária e matérias que faltam",
    corpo: `<ol>
      <li>No ${link(JUPITER, "JupiterWeb")}, abra a sua <b>grade horária</b>: ali estão as disciplinas do semestre, com turma e horário.</li>
      <li>Para saber o que já fez e o que falta, veja a <b>evolução no curso</b> (ou o resumo escolar): ela compara as disciplinas que você cursou com a grade curricular do seu curso, semestre a semestre.</li>
      <li>Antes de cada rodada de matrícula, olhe ali as obrigatórias pendentes e os requisitos de cada uma, para não ficar sem vaga no que trava o semestre seguinte.</li>
    </ol>
    <p>Para achar a sala de cada aula, monte a sua grade em <a href="../salas/#minha-aula">Salas e grade horária</a>.</p>`,
  },
  {
    titulo: "Bolsas e auxílios",
    corpo: `<ol>
      <li>O principal programa de permanência da USP é o <b>PAPFE</b>: auxílio para alimentação, moradia, transporte e livros, conforme a sua situação socioeconômica.</li>
      <li>A inscrição é pelo ${link(JUPITER, "JupiterWeb")}, em <b>Programa de Bolsas &gt; PAPFE &gt; Inscrição em bolsas e apoios</b>: preencha o formulário socioeconômico e anexe os documentos pedidos (a lista completa fica em ${link("https://prip.usp.br/papfe/", "prip.usp.br/papfe")}).</li>
      <li>O <b>PUB</b> (bolsas de projetos de pesquisa, cultura e extensão) exige a inscrição no PAPFE antes. Fique de olho nos editais, que abrem no começo do ano.</li>
    </ol>
    <p class="kit__recado">Ficou em dúvida ou não sabe se tem direito? <a href="mailto:{email}?subject=D%C3%BAvida%20sobre%20bolsas">Manda um e-mail pra gente</a> contando a sua situação: a gente te ajuda a achar o caminho.</p>`,
  },
  {
    titulo: "E mais umas coisas que valem saber",
    corpo: `<ul>
      <li><b>e-Disciplinas.</b> É o Moodle da USP: materiais, listas e notas de muitas disciplinas ficam lá. Entre com a Senha Única.</li>
      <li><b>Wi-Fi.</b> Na USP, a rede é a <b>eduroam</b>, com o seu e-mail USP e a Senha Única. Ela também funciona em outras universidades pelo mundo.</li>
      <li><b>Bandejão.</b> Paga com o Cartão USP (ou com o e-Card, conforme o restaurante). Veja os cardápios em <a href="../bandejoes/">Bandejões</a>.</li>
      <li><b>Prazos.</b> Retificação de matrícula, trancamento e requerimentos têm datas fixas no calendário da graduação. Perdeu o prazo, perdeu a vez: anote tudo.</li>
      <li><b>Dúvida que ninguém resolve?</b> O Serviço de Graduação da Poli cuida da sua vida acadêmica, e o Grêmio está aqui pra ajudar a achar a porta certa.</li>
    </ul>`,
  },
];

export default function kitBixo(alvo, { site }) {
  const email = site.contato?.email || "";
  alvo.innerHTML = `
    <div class="kit-cartao">
      <div>
        <h2 id="kit-titulo">Kit burocrático do bixo</h2>
        <p>Matrícula, carteirinha, Bilhete Único, BUSP, grade e bolsas: o passo a passo da papelada, tudo num lugar só.</p>
      </div>
      <button type="button" class="botao" data-abrir-kit>Abrir o kit</button>
    </div>
    <dialog class="kit" aria-labelledby="kit-janela-titulo">
      <div class="kit__topo">
        <h2 id="kit-janela-titulo">Kit burocrático do bixo</h2>
        <button type="button" class="kit__fechar" data-fechar-kit>Fechar</button>
      </div>
      <p class="kit__intro">Toque em cada assunto para abrir o passo a passo. Os menus têm os nomes dos sistemas da USP, que às vezes mudam: se não achar, procure algo parecido.</p>
      <div class="kit__partes">
        ${PARTES.map((p, i) => `<details class="kit__parte"${i === 0 ? " open" : ""}><summary>${p.titulo}</summary><div class="kit__corpo">${p.corpo.replace("{email}", email)}</div></details>`).join("")}
      </div>
    </dialog>`;
  const janela = alvo.querySelector(".kit");
  alvo.querySelector("[data-abrir-kit]").addEventListener("click", () => janela.showModal());
  alvo.querySelector("[data-fechar-kit]").addEventListener("click", () => janela.close());
  janela.addEventListener("click", (e) => { if (e.target === janela) janela.close(); });
}
