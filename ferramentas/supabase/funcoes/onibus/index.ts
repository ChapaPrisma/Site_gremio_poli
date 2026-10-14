// Função "onibus" (Supabase Edge Function): posição ao vivo dos ônibus que entram na USP, a partir
// da API Olho Vivo da SPTrans. A página aluno/circulares/ chama esta função a cada ~20 segundos.
// A chave da SPTrans fica no segredo SPTRANS_TOKEN do projeto (nunca no site). Sem a chave, ou se a
// SPTrans estiver fora do ar, a função responde { ok: false, motivo } e a página avisa que a
// localização ao vivo não está funcionando, sem deixar de mostrar o mapa e as linhas.
// Publicar de novo: copie este arquivo para supabase/functions/onibus/ e rode `supabase functions deploy onibus`.

const BASE = "https://api.olhovivo.sptrans.com.br/v2.1";
// Linhas da SPTrans acompanhadas (a 280BI1 é da EMTU e não está no Olho Vivo).
const LINHAS = ["8082-10", "8083-10", "8084-10", "8085-10", "8012-10", "8022-10", "177H-10", "701U-10", "702U-10"];
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

let cookie = "", cookieEm = 0;
const codigos = new Map<string, { cl: number; sl: number }[]>();
let cache: { em: number; corpo: string } | null = null;

const responder = (corpo: unknown, status = 200) =>
  new Response(typeof corpo === "string" ? corpo : JSON.stringify(corpo), { status, headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "no-store" } });

async function entrar(token: string) {
  const r = await fetch(`${BASE}/Login/Autenticar?token=${encodeURIComponent(token)}`, { method: "POST", signal: AbortSignal.timeout(8000) });
  const ok = await r.json().catch(() => false);
  if (ok !== true) throw new Error("chave-recusada");
  cookie = (r.headers.get("set-cookie") || "").split(";")[0];
  cookieEm = Date.now();
}

async function pegar(caminho: string, token: string): Promise<any> {
  let r = await fetch(BASE + caminho, { headers: { cookie }, signal: AbortSignal.timeout(8000) });
  if (r.status === 401) { await entrar(token); r = await fetch(BASE + caminho, { headers: { cookie }, signal: AbortSignal.timeout(8000) }); }
  if (!r.ok) throw new Error(`sptrans-${r.status}`);
  return r.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return responder("ok");
  const token = Deno.env.get("SPTRANS_TOKEN");
  if (!token) return responder({ ok: false, motivo: "sem-chave" });
  // Muita gente olhando ao mesmo tempo não multiplica as chamadas à SPTrans.
  if (cache && Date.now() - cache.em < 15_000) return responder(cache.corpo);
  try {
    if (!cookie || Date.now() - cookieEm > 20 * 60_000) await entrar(token);
    const linhas: Record<string, unknown[]> = {};
    let hora = "";
    await Promise.all(LINHAS.map(async (ref) => {
      const [letreiro, tipo] = ref.split("-");
      if (!codigos.has(ref)) {
        const achadas: any[] = await pegar(`/Linha/Buscar?termosBusca=${encodeURIComponent(letreiro)}`, token);
        codigos.set(ref, achadas.filter((l) => l.lt === letreiro && String(l.tl) === tipo).map((l) => ({ cl: l.cl, sl: l.sl })));
      }
      const veiculos: unknown[] = [];
      for (const { cl, sl } of codigos.get(ref)!) {
        const pos = await pegar(`/Posicao/Linha?codigoLinha=${cl}`, token);
        hora = pos.hr || hora;
        for (const v of pos.vs || []) veiculos.push({ lat: v.py, lon: v.px, prefixo: v.p, acessivel: !!v.a, em: v.ta, sentido: sl });
      }
      linhas[ref] = veiculos;
    }));
    const corpo = JSON.stringify({ ok: true, hora, geradoEm: new Date().toISOString(), linhas });
    cache = { em: Date.now(), corpo };
    return responder(corpo);
  } catch (e) {
    return responder({ ok: false, motivo: String((e as Error).message || e) });
  }
});
