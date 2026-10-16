// Portal interno (admin/): o portão de entrada (e-mail e senha) e, depois dele, o painel
// "Contas do Grêmio": lançar receitas e despesas,
// excluir lançamentos e ajustar o valor da dívida e o saldo inicial. Tudo o que é salvo aparece
// na hora na página Transparência. Exige o banco Supabase configurado em config.js (site.contas);
// sem ele, mostra o passo a passo. A permissão real está nas regras do banco (contas.sql).
// A área (#areaAdmin) só aparece para quem está na lista de administradores; esconder é só a
// interface: quem protege os dados de verdade são as regras do banco.
// Uso: #painelEntrada, #areaAdmin com #painelContas, e <div data-componente="contas-admin"></div>.

import { supabase, configurado, carregar, extrato, reais, dataBR, CATEGORIAS, INICIO_CONTAS } from "../dados/contas.js?v=202610161636";
import { hojeSP } from "../dados/tempo.js?v=202610161636";
import { projetosAdmin } from "./projetos-admin.js?v=202610161636";
import { vendasAdmin } from "./vendas-admin.js?v=202610161636";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export default async function contasAdmin(_alvo, contexto) {
  const { site, raiz, url } = contexto;
  const painel = document.getElementById("painelContas");
  const entrada = document.getElementById("painelEntrada"), area = document.getElementById("areaAdmin"), portao = document.getElementById("entrada");
  if (!painel || !entrada) return;
  // mostra o portão (com o que for preciso dentro) e esconde a área; ou o contrário
  const noPortao = (html) => { area.hidden = true; portao.hidden = false; entrada.innerHTML = html; return entrada; };
  const naArea = (email) => {
    portao.hidden = true; area.hidden = false;
    document.getElementById("sessaoEmail").textContent = email;
    document.getElementById("sessaoSair").onclick = async () => { await db.auth.signOut(); tela(); };
  };

  if (!configurado(site)) {
    noPortao(`
      <p><b>O banco das contas ainda não está ligado.</b> Assim que ele estiver configurado, quem estiver na lista de administradores entra aqui com e-mail e senha e lança receitas e despesas, que aparecem na hora na <a href="${url("transparencia/")}">Transparência</a>.</p>
      <ol class="passos">
        <li>Crie um projeto gratuito em <a href="https://supabase.com" target="_blank" rel="noopener">supabase.com</a> (região São Paulo).</li>
        <li>No SQL Editor do projeto, rode o arquivo <code>ferramentas/supabase/contas.sql</code> do repositório.</li>
        <li>Cadastre os e-mails de quem pode lançar em <code>administradores</code> e crie essas contas em Authentication, com o cadastro aberto desligado.</li>
        <li>Cole a URL do projeto e a chave pública (anon) em <code>assets/js/config.js</code>, em <code>site.contas</code>, e publique.</li>
      </ol>
      <p class="nota">O passo a passo completo está em <code>ferramentas/supabase/LEIA-ME.md</code>.</p>`);
    return;
  }

  let db;
  try { db = await supabase(site); } catch {
    noPortao(`<p>Não deu para conectar ao banco agora. Tente de novo em alguns minutos.</p>`);
    return;
  }

  // Volta do e-mail de "esqueci a senha": o Supabase abre a sessão e pede uma senha nova.
  let recuperando = /type=recovery/.test(location.hash);
  db.auth.onAuthStateChange((evento) => {
    if (evento === "PASSWORD_RECOVERY") { recuperando = true; telaNovaSenha(); }
  });

  async function tela() {
    const { data: { session } } = await db.auth.getSession();
    if (recuperando && session) return telaNovaSenha();
    if (!session) return telaEntrar();
    const { data: lista } = await db.from("administradores").select("email").eq("email", session.user.email);
    if (!lista || !lista.length) {
      const p = noPortao(`<p>Você entrou como <b>${esc(session.user.email)}</b>, mas esta conta não está na lista de administradores. Peça à diretoria responsável para incluir o seu e-mail.</p><button type="button" class="botao botao--linha botao--pequeno" id="sair">Sair</button>`);
      p.querySelector("#sair").onclick = async () => { await db.auth.signOut(); tela(); };
      return;
    }
    naArea(session.user.email);
    return telaLancar(session.user.email);
  }

  function telaEntrar(msg = "", ok = "") {
    const painel = noPortao(`
      <form class="formulario" id="fEntrar">
        <p>Use o e-mail e a senha de administrador do Grêmio.</p>
        <div class="dupla">
          <div class="campo"><label for="ceEmail">E-mail</label><input type="email" id="ceEmail" autocomplete="username" required></div>
          <div class="campo"><label for="ceSenha">Senha</label><input type="password" id="ceSenha" autocomplete="current-password" required></div>
        </div>
        <p class="formulario__erro" id="ceErro" role="alert"${msg ? "" : " hidden"}>${esc(msg)}</p>
        <div class="formulario__fim"><button class="botao" type="submit">Entrar</button><button class="chip" type="button" id="esqueci">Esqueci a senha</button>${ok ? `<p class="ok-msg">${esc(ok)}</p>` : ""}</div>
      </form>`);
    const email = () => painel.querySelector("#ceEmail").value.trim();
    painel.querySelector("#fEntrar").addEventListener("submit", async (e) => {
      e.preventDefault();
      const { error } = await db.auth.signInWithPassword({ email: email(), password: painel.querySelector("#ceSenha").value });
      if (error) {
        return telaEntrar(/confirm/i.test(error.message) ? "Este e-mail ainda não foi confirmado. Abra o link que o Supabase enviou para ele, ou confirme o usuário no painel do Supabase."
          : /invalid/i.test(error.message) ? "E-mail ou senha incorretos."
          : "Não deu para entrar agora. Tente de novo em alguns minutos.");
      }
      tela();
    });
    painel.querySelector("#esqueci").addEventListener("click", async () => {
      if (!email()) return telaEntrar("Escreva o seu e-mail no campo acima e toque em Esqueci a senha.");
      const { error } = await db.auth.resetPasswordForEmail(email(), { redirectTo: location.origin + location.pathname });
      telaEntrar(error ? "Não deu para enviar o e-mail agora. Tente de novo em alguns minutos." : "", error ? "" : `Se ${email()} for de um administrador, chega nele um link para criar uma senha nova.`);
    });
  }

  function telaNovaSenha(msg = "") {
    const painel = noPortao(`
      <form class="formulario" id="fSenha">
        <p>Crie a sua senha nova de administrador.</p>
        <div class="campo"><label for="cnSenha">Senha nova (mínimo de 8 caracteres)</label><input type="password" id="cnSenha" autocomplete="new-password" minlength="8" required></div>
        <p class="formulario__erro" role="alert"${msg ? "" : " hidden"}>${esc(msg)}</p>
        <div class="formulario__fim"><button class="botao" type="submit">Salvar e entrar</button></div>
      </form>`);
    painel.querySelector("#fSenha").addEventListener("submit", async (e) => {
      e.preventDefault();
      const senha = painel.querySelector("#cnSenha").value;
      if (senha.length < 8) return telaNovaSenha("A senha precisa ter pelo menos 8 caracteres.");
      const { error } = await db.auth.updateUser({ password: senha });
      if (error) return telaNovaSenha("Não deu para salvar a senha. Peça um novo link e tente de novo.");
      recuperando = false;
      history.replaceState(null, "", location.pathname);
      tela();
    });
  }

  async function telaLancar(email, aviso = "") {
    projetosAdmin(db, site);
    vendasAdmin(db);
    const r = await carregar(site, raiz);
    const ex = extrato(r.lancamentos, r.parametros);
    const recentes = r.lancamentos.slice().sort((a, b) => String(b.criado_em).localeCompare(String(a.criado_em))).slice(0, 15);
    painel.innerHTML = `
      <div class="painel-contas__topo">
        <span>Saldo publicado: <b>${reais(ex.saldo)}</b> · ${ex.linhas.length} lançamento${ex.linhas.length === 1 ? "" : "s"}</span>
      </div>
      <form class="formulario" id="fLanc" novalidate>
        <fieldset class="campo">
          <legend>Tipo</legend>
          <div class="opcoes">
            <label><input type="radio" name="tipo" value="despesa" checked><span>Despesa</span></label>
            <label><input type="radio" name="tipo" value="receita"><span>Receita</span></label>
          </div>
        </fieldset>
        <div class="tres">
          <div class="campo"><label for="clData">Data</label><input type="date" id="clData" name="data" min="${INICIO_CONTAS}" value="${hojeSP() < INICIO_CONTAS ? INICIO_CONTAS : hojeSP()}" required></div>
          <div class="campo"><label for="clValor">Valor (R$)</label><input type="number" id="clValor" name="valor" min="0.01" step="0.01" inputmode="decimal" required></div>
          <div class="campo"><label for="clCat">Categoria</label><input type="text" id="clCat" name="categoria" list="clCats" value="Outros" required><datalist id="clCats">${CATEGORIAS.map((c) => `<option value="${esc(c)}">`).join("")}</datalist></div>
        </div>
        <div class="campo"><label for="clDesc">Descrição</label><input type="text" id="clDesc" name="descricao" maxlength="200" placeholder="Ex.: Impressão dos cartazes da Semana de Recepção" required></div>
        <div class="dupla">
          <div class="campo"><label for="clDir">Diretoria (opcional)</label><input type="text" id="clDir" name="diretoria"></div>
          <div class="campo"><label for="clComp">Link do comprovante (opcional)</label><input type="text" id="clComp" name="comprovante_url" placeholder="https://"></div>
        </div>
        <label class="campo" style="display:flex;gap:10px;align-items:center"><input type="checkbox" name="abate_divida" style="width:18px;height:18px"> <span>Esta despesa é um pagamento da dívida do Grêmio</span></label>
        <p class="formulario__erro" id="clErro" role="alert" hidden></p>
        <div class="formulario__fim"><button class="botao" type="submit">Lançar e publicar</button>${aviso ? `<p class="ok-msg">${esc(aviso)}</p>` : ""}</div>
      </form>

      <h3 style="margin-top:22px">Últimos lançamentos</h3>
      ${recentes.length ? `<ul class="lista-admin">${recentes.map((l) => `<li>
          <span class="tab">${dataBR(l.data)}</span>
          <span>${esc(l.descricao)} <small>(${esc(l.categoria)})</small></span>
          <b class="tab" style="color:${l.tipo === "receita" ? "var(--aberto)" : "var(--vermelho)"}">${l.tipo === "receita" ? "+" : "−"} ${reais(l.valor)}</b>
          ${l.origem === "loja" ? `<small title="Gerado pelas vendas da loja; muda quando as vendas do dia mudam">automático</small>` : `<button type="button" data-excluir="${esc(l.id)}">Excluir</button>`}
        </li>`).join("")}</ul>` : `<p class="nota">Nenhum lançamento ainda.</p>`}

      <h3 style="margin-top:22px">Dívida e saldo inicial</h3>
      <form class="formulario" id="fParam" novalidate>
        <div class="dupla">
          <div class="campo"><label for="cpDiv">Valor total da dívida (R$)</label><input type="number" id="cpDiv" min="0" step="0.01" value="${r.parametros?.divida?.total ?? ""}" placeholder="Deixe vazio enquanto estiver a confirmar"></div>
          <div class="campo"><label for="cpIni">Saldo em 1º de janeiro de 2027 (R$)</label><input type="number" id="cpIni" step="0.01" value="${r.parametros?.saldo_inicial?.valor ?? ""}" placeholder="Deixe vazio enquanto estiver a confirmar"></div>
        </div>
        <div class="formulario__fim"><button class="botao botao--linha" type="submit">Salvar valores</button></div>
      </form>`;


    painel.querySelector("#fLanc").addEventListener("submit", async (e) => {
      e.preventDefault();
      const f = new FormData(e.target), erro = painel.querySelector("#clErro");
      const reg = {
        tipo: f.get("tipo"),
        data: f.get("data"),
        valor: Number(String(f.get("valor")).replace(",", ".")),
        categoria: String(f.get("categoria") || "Outros").trim() || "Outros",
        descricao: String(f.get("descricao") || "").trim(),
        diretoria: String(f.get("diretoria") || "").trim() || null,
        comprovante_url: String(f.get("comprovante_url") || "").trim() || null,
        abate_divida: f.get("tipo") === "despesa" && f.get("abate_divida") === "on",
      };
      const problema = !reg.data || reg.data < INICIO_CONTAS ? "A data precisa ser de 1º de janeiro de 2027 em diante."
        : !(reg.valor > 0) ? "Informe um valor maior que zero."
        : reg.descricao.length < 2 ? "Escreva uma descrição para o lançamento."
        : reg.comprovante_url && !/^https?:\/\//.test(reg.comprovante_url) ? "O link do comprovante precisa começar com http:// ou https://." : "";
      if (problema) { erro.textContent = problema; erro.hidden = false; return; }
      const { error } = await db.from("lancamentos").insert(reg);
      if (error) { erro.textContent = "Não deu para salvar. Confira se você ainda está conectado e tente de novo."; erro.hidden = false; return; }
      telaLancar(email, `Lançado: ${reg.tipo === "receita" ? "+" : "−"} ${reais(reg.valor)}. Já está na Transparência.`);
    });

    painel.querySelectorAll("[data-excluir]").forEach((b) => b.addEventListener("click", async () => {
      if (!confirm("Excluir este lançamento? Ele some também da Transparência.")) return;
      const { error } = await db.from("lancamentos").delete().eq("id", b.dataset.excluir);
      telaLancar(email, error ? "" : "Lançamento excluído.");
    }));

    painel.querySelector("#fParam").addEventListener("submit", async (e) => {
      e.preventDefault();
      const div = painel.querySelector("#cpDiv").value, ini = painel.querySelector("#cpIni").value;
      const { error } = await db.from("parametros").upsert([
        { chave: "divida", valor: { total: div === "" ? null : Number(div) }, atualizado_em: new Date().toISOString() },
        { chave: "saldo_inicial", valor: { valor: ini === "" ? null : Number(ini) }, atualizado_em: new Date().toISOString() },
      ]);
      telaLancar(email, error ? "" : "Valores salvos e publicados.");
    });
  }

  tela();
}
