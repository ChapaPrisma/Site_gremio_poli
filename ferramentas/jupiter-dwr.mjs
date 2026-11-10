// Conversa com a interface pública do JupiterWeb (o bean "ControlePublicoDWR", que fala DWR, sem login).
// Usado por ferramentas/jupiter.mjs (fichas e grades) e ferramentas/ementas.mjs (histórico das ementas).
//
// Crédito: o caminho até esses dados foi mapeado pelo projeto usp-mcp, de Caio Castro e João Pedro
// Gunthen (github.com/CaioCastro1/mcp-usp, licença MIT). Foram eles que descobriram essa interface pública
// e documentaram o formato das chamadas e das respostas. O leitor de respostas abaixo é uma tradução para
// JavaScript do usp_mcp/jupiter/dwr.py deles (Copyright (c) Caio Castro e João Pedro Gunthen, licença MIT).
//
// Gentileza com a USP: uma requisição por vez, com pausa entre elas. Nada de login, cookie ou credencial.

const URL_DWR = "https://uspdigital.usp.br/jupiterweb/dwr/call/plaincall/ControlePublicoDWR";

export class ErroJupiter extends Error {}

function serializar(metodo, consulta, params) {
  const linhas = ["callCount=1", "windowName=", "c0-scriptName=ControlePublicoDWR", `c0-methodName=${metodo}`, "c0-id=0",
    `c0-param0=string:${encodeURIComponent(consulta)}`];
  const refs = [];
  Object.entries(params).forEach(([chave, valor], i) => {
    const rot = `c0-e${i + 1}`;
    linhas.push(typeof valor === "number" ? `${rot}=number:${valor}` : `${rot}=string:${encodeURIComponent(String(valor))}`);
    refs.push(`${chave}:reference:${rot}`);
  });
  linhas.push(`c0-param1=Object_Object:{${refs.join(", ")}}`, "batchId=0", "instanceId=0", "page=%2Fjupiterweb%2FjupCarreira.jsp", "scriptSessionId=0000000000000000");
  return linhas.join("\n");
}

// A resposta é um literal JavaScript (chaves sem aspas) dentro de um envelope: não é JSON e não deve
// ser executada. Este leitor percorre o texto sem rodar nada, distinguindo o que é string do que é estrutura.
export function decodificar(corpo) {
  if (!corpo.includes("//#DWR-END#")) throw new Error("resposta do JupiterWeb sem o marcador de fim (truncada ou não é DWR)");
  const m = /handle(Callback|Exception)\("[^"]*","[^"]*",/.exec(corpo);
  if (!m) throw new Error("resposta sem handleCallback nem handleException");
  let i = m.index + m[0].length;
  const t = corpo;
  const espaco = () => { while (i < t.length && " \t\r\n".includes(t[i])) i++; };
  const ESC = { '"': '"', "\\": "\\", "/": "/", b: "\b", f: "\f", n: "\n", r: "\r", t: "\t" };
  function texto() {
    i++; let s = "";
    for (;;) {
      const c = t[i];
      if (c === undefined) throw new Error("string sem fechamento");
      if (c === '"') { i++; return s; }
      if (c !== "\\") { s += c; i++; continue; }
      const f = t[i + 1];
      if (f === "u") { s += String.fromCharCode(parseInt(t.slice(i + 2, i + 6), 16)); i += 6; }
      else if (f in ESC) { s += ESC[f]; i += 2; }
      else throw new Error(`escape desconhecido \\${f}`);
    }
  }
  function valor() {
    espaco();
    const c = t[i];
    if (c === "{") {
      i++; const o = {}; espaco();
      if (t[i] === "}") { i++; return o; }
      for (;;) {
        espaco();
        let chave;
        if (t[i] === '"') chave = texto();
        else { const ini = i; while (i < t.length && /[\w$]/.test(t[i])) i++; chave = t.slice(ini, i); if (!chave) throw new Error("esperava uma chave"); }
        espaco(); if (t[i] !== ":") throw new Error("esperava ':'"); i++;
        o[chave] = valor(); espaco();
        const s = t[i++]; if (s === "}") return o; if (s !== ",") throw new Error("esperava ',' ou '}'");
      }
    }
    if (c === "[") {
      i++; const l = []; espaco();
      if (t[i] === "]") { i++; return l; }
      for (;;) { l.push(valor()); espaco(); const s = t[i++]; if (s === "]") return l; if (s !== ",") throw new Error("esperava ',' ou ']'"); }
    }
    if (c === '"') return texto();
    for (const [nome, v] of [["null", null], ["true", true], ["false", false]]) if (t.startsWith(nome, i)) { i += nome.length; return v; }
    const ini = i; while (i < t.length && "-+.eE0123456789".includes(t[i])) i++;
    if (ini === i) throw new Error("valor ilegível na resposta");
    return Number(t.slice(ini, i));
  }
  const v = valor();
  if (m[1] === "Exception") throw new ErroJupiter((v && (v.localizedMessage || v.message)) || "o JupiterWeb recusou o pedido");
  return v;
}

const espera = (ms) => new Promise((r) => setTimeout(r, ms));

// Um cliente com pausa própria: chamar(metodo, consulta, params) e cliente.pedidos (quantos já foram).
export function clienteJupiter({ agente, pausa = 1500 } = {}) {
  const cliente = {
    pedidos: 0,
    async chamar(metodo, consulta, params) {
      if (cliente.pedidos++) await espera(pausa);
      const r = await fetch(`${URL_DWR}.${metodo}.dwr`, {
        method: "POST", body: serializar(metodo, consulta, params),
        headers: { "Content-Type": "text/plain", "User-Agent": agente }, signal: AbortSignal.timeout(30_000),
      });
      if (!r.ok) throw new Error(`${consulta}: HTTP ${r.status}`);
      return decodificar(new TextDecoder("iso-8859-1").decode(await r.arrayBuffer()));
    },
  };
  return cliente;
}

// texto do JupiterWeb sem \r, sem espaços no fim das linhas e sem pilhas de linhas em branco
export const limpa = (s) => String(s ?? "").replace(/\r/g, "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
