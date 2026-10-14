// Painel "Vendas da loja" do portal interno (admin/): registrar as vendas (no balcão, por enquanto)
// e ver as últimas. Cada venda vai para a tabela `vendas`; um gatilho no banco (loja.sql) soma
// as vendas do dia e publica sozinho a receita "Vendas da loja" na Transparência.
// Anônimo: não se registra nada de quem comprou. Chamado pelo painel de contas depois do login.

import { reais, dataBR } from "../dados/contas.js?v=202610141043";
import { hojeSP } from "../dados/tempo.js?v=202610141043";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const FORMAS = { pix: "Pix", cartao: "Cartão", dinheiro: "Dinheiro", outro: "Outro" };
const PRODUTOS = ["Camiseta", "Moletom", "Corta-vento", "Blusão", "Ecobag", "Mochila", "Caneca", "Tirante"];

export function avisoVendas(texto) {
  const painel = document.getElementById("painelVendas");
  if (painel) painel.innerHTML = `<p class="nota">${esc(texto)}</p>`;
}

export async function vendasAdmin(db, aviso = "") {
  const painel = document.getElementById("painelVendas");
  if (!painel) return;
  const { data: vendas, error } = await db.from("vendas").select("*").order("data", { ascending: false }).order("criado_em", { ascending: false }).limit(20);
  if (error) {
    painel.innerHTML = `<p><b>A tabela de vendas ainda não existe no banco.</b> No SQL Editor do Supabase, rode o arquivo <code>ferramentas/supabase/loja.sql</code> do repositório e recarregue esta página.</p>`;
    return;
  }
  painel.innerHTML = `
    <form class="formulario" id="fVenda" novalidate>
      <div class="dupla">
        <div class="campo"><label for="cvProduto">Produto</label><input type="text" id="cvProduto" name="produto" list="cvProdutos" maxlength="120" required><datalist id="cvProdutos">${PRODUTOS.map((p) => `<option value="${p}">`).join("")}</datalist></div>
        <div class="campo"><label for="cvData">Data</label><input type="date" id="cvData" name="data" value="${hojeSP()}" required></div>
      </div>
      <div class="tres">
        <div class="campo"><label for="cvQtd">Quantidade</label><input type="number" id="cvQtd" name="quantidade" min="1" step="1" value="1" required></div>
        <div class="campo"><label for="cvValor">Valor total (R$)</label><input type="number" id="cvValor" name="valor_total" min="0.01" step="0.01" inputmode="decimal" required></div>
        <div class="campo"><label for="cvForma">Pagamento</label><select id="cvForma" name="forma">${Object.entries(FORMAS).map(([v, r]) => `<option value="${v}">${r}</option>`).join("")}</select></div>
      </div>
      <p class="formulario__erro" id="cvErro" role="alert" hidden></p>
      <div class="formulario__fim"><button class="botao" type="submit">Registrar venda</button>${aviso ? `<p class="ok-msg">${esc(aviso)}</p>` : ""}</div>
    </form>
    <h3 style="margin-top:22px">Últimas vendas</h3>
    ${vendas.length ? `<ul class="lista-admin">${vendas.map((v) => `<li>
        <span class="tab">${dataBR(v.data)}</span>
        <span>${esc(v.produto)} <small>(${v.quantidade} un. · ${esc(FORMAS[v.forma] || v.forma)}${v.canal === "online" ? " · online" : ""})</small></span>
        <b class="tab" style="color:var(--aberto)">+ ${reais(v.valor_total)}</b>
        <button type="button" data-excluir-venda="${esc(v.id)}">Excluir</button>
      </li>`).join("")}</ul>` : `<p class="nota">Nenhuma venda registrada ainda.</p>`}`;

  painel.querySelector("#fVenda").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = new FormData(e.target), erro = painel.querySelector("#cvErro");
    const reg = {
      produto: String(f.get("produto") || "").trim(),
      data: f.get("data"),
      quantidade: Math.round(Number(f.get("quantidade"))),
      valor_total: Number(String(f.get("valor_total")).replace(",", ".")),
      forma: f.get("forma"),
      canal: "balcao",
    };
    const problema = reg.produto.length < 2 ? "Diga qual produto foi vendido."
      : !reg.data ? "Escolha a data da venda."
      : !(reg.quantidade > 0) ? "A quantidade precisa ser 1 ou mais."
      : !(reg.valor_total > 0) ? "Informe o valor total da venda." : "";
    if (problema) { erro.textContent = problema; erro.hidden = false; return; }
    const { error: falha } = await db.from("vendas").insert(reg);
    if (falha) { erro.textContent = "Não deu para salvar. Confira se você ainda está conectado e tente de novo."; erro.hidden = false; return; }
    vendasAdmin(db, `Venda registrada: ${reais(reg.valor_total)}. O total do dia já está na Transparência.`);
  });

  painel.querySelectorAll("[data-excluir-venda]").forEach((b) => b.addEventListener("click", async () => {
    if (!confirm("Excluir esta venda? O total do dia na Transparência é refeito na hora.")) return;
    const { error: falha } = await db.from("vendas").delete().eq("id", b.dataset.excluirVenda);
    vendasAdmin(db, falha ? "" : "Venda excluída e total do dia refeito.");
  }));
}
