"""Prédios, caminhos e tempo a pé a partir do Biênio, para a ilustração "Onde fica cada engenharia" do Guia dos cursos.

Uso: python ferramentas/campus_poli.py            (baixa do OpenStreetMap e grava assets/dados/campus-poli.json)

1. Baixa pela API Overpass todos os prédios (building=*) e todas as vias por onde se anda (calçadas, trilhas,
   escadas, ruas internas...) num raio de RAIO metros do Biênio.
2. Projeta tudo em metros com o Biênio na origem (x para leste, y para norte), simplifica e recorta no círculo.
   Os prédios da Poli saem separados, pelo id do OpenStreetMap (PREDIOS abaixo).
3. Calcula a distância a pé do Biênio até cada esquina da rede (Dijkstra) e, com ela, um "campo de caminhada":
   para cada direção (de 4 em 4 graus) e cada distância em linha reta (de 25 em 25 m), quantos metros se anda
   até lá. O componente usa esse campo para redesenhar o campus em tempo a pé (cada ponto se afasta do Biênio
   até a distância que se anda para chegar nele). O campo nunca diminui ao longo de uma direção, para o
   desenho não se dobrar sobre si mesmo.
Dados: © colaboradores do OpenStreetMap (ODbL).
"""
import heapq, json, math, os, sys, time, urllib.parse, urllib.request

BIENIO = (-23.5566899, -46.7326809)       # o mesmo ponto de assets/js/dados/predios-poli.js
RAIO = 1100                               # metros
PASSO_R, ANGULOS = 25, 90                 # resolução do campo de caminhada (25 m, 4°)
SAIDA = os.path.join(os.path.dirname(__file__), "..", "assets", "dados", "campus-poli.json")
SERVIDORES = ["https://overpass-api.de/api/interpreter", "https://lz4.overpass-api.de/api/interpreter"]
A_PE = {"footway", "path", "pedestrian", "steps", "living_street", "residential", "service", "unclassified", "tertiary", "tertiary_link",
        "secondary", "secondary_link", "primary", "primary_link", "track", "cycleway", "corridor", "road"}

# prédio da Poli -> elementos do OpenStreetMap que o desenham
PREDIOS = {
    "bie": ["w147219057"],                # Biênio (os Anfiteatros do Biênio vão em "bie-anexo")
    "bie-anexo": ["w147219056"],
    "pro": ["w147219058"],                # Engenharia de Produção
    "civ": ["w158960183"],                # Edifício Paula Souza (Civil e Ambiental)
    "ele": ["w158960184"],                # Engenharia Elétrica
    "mec": ["r2062864"],                  # Mecânica, Mecatrônica e Naval
    "min": ["r2062859"],                  # Minas e Petróleo
    "pmt": ["w158960185"],                # Metalúrgica, Materiais e Nuclear
    "qui": ["r6029676"],                  # Poli - Ed. Semi-Industrial (Engenharia Química)
}

def overpass(filtro, folga=50):
    lat, lon = BIENIO
    dlat = (RAIO + folga) / 110540
    dlon = (RAIO + folga) / (111320 * math.cos(math.radians(lat)))
    bbox = f"{lat - dlat},{lon - dlon},{lat + dlat},{lon + dlon}"
    consulta = f"[out:json][timeout:90];({filtro.replace('BBOX', bbox)});out geom;"
    for tentativa in range(4):
        for url in SERVIDORES:
            try:
                req = urllib.request.Request(url, data=urllib.parse.urlencode({"data": consulta}).encode(), headers={"User-Agent": "site-gremio-poli/1.0"})
                with urllib.request.urlopen(req, timeout=150) as r:
                    return json.load(r)["elements"]
            except Exception as e:  # servidor cheio: tenta o próximo, depois espera e repete
                print("  falhou", url, e, file=sys.stderr)
        time.sleep(20 * (tentativa + 1))
    sys.exit("Overpass indisponível; tente mais tarde.")

def metros(g):
    lat0, lon0 = BIENIO
    return ((g["lon"] - lon0) * 111320 * math.cos(math.radians(lat0)), (g["lat"] - lat0) * 110540)

def juntar(trechos):
    """Une os trechos (ways) de um anel de relação até fechar."""
    aneis, trechos = [], [t[:] for t in trechos if len(t) > 1]
    while trechos:
        anel = trechos.pop(0)
        while anel[0] != anel[-1] and trechos:
            for i, t in enumerate(trechos):
                if t[0] == anel[-1]: anel += t[1:]
                elif t[-1] == anel[-1]: anel += t[::-1][1:]
                elif t[-1] == anel[0]: anel = t[:-1] + anel
                elif t[0] == anel[0]: anel = t[::-1][:-1] + anel
                else: continue
                trechos.pop(i); break
            else: break
        aneis.append(anel)
    return aneis

def simplifica(p, tol=0.7):
    """Douglas-Peucker numa linha (os anéis chegam com o primeiro ponto repetido no fim)."""
    if len(p) < 3: return p
    def dp(a, b):
        (x1, y1), (x2, y2) = p[a], p[b]; L = math.hypot(x2 - x1, y2 - y1) or 1e-9; pior, k = 0, None
        for i in range(a + 1, b):
            d = abs((x2 - x1) * (y1 - p[i][1]) - (x1 - p[i][0]) * (y2 - y1)) / L
            if d > pior: pior, k = d, i
        return [p[a]] if pior < tol else dp(a, k) + dp(k, b)
    if p[0] == p[-1]:
        meio = max(range(len(p)), key=lambda i: math.dist(p[0], p[i]))
        return dp(0, meio) + dp(meio, len(p) - 1) + [p[-1]]
    return dp(0, len(p) - 1) + [p[-1]]

def recorta(p, dentro, corte):
    """Sutherland-Hodgman contra um semiplano."""
    out = []
    for i in range(len(p)):
        a, b = p[i - 1], p[i]
        if dentro(b):
            if not dentro(a): out.append(corte(a, b))
            out.append(b)
        elif dentro(a): out.append(corte(a, b))
    return out

def no_circulo(p, n=256):
    for k in range(n):
        t0, t1 = 2 * math.pi * k / n, 2 * math.pi * (k + 1) / n
        A, B = (RAIO * math.cos(t0), RAIO * math.sin(t0)), (RAIO * math.cos(t1), RAIO * math.sin(t1))
        lado = lambda q: (B[0] - A[0]) * (q[1] - A[1]) - (B[1] - A[1]) * (q[0] - A[0]) >= 0
        def corte(a, b):
            da = (B[0] - A[0]) * (a[1] - A[1]) - (B[1] - A[1]) * (a[0] - A[0])
            db = (B[0] - A[0]) * (b[1] - A[1]) - (B[1] - A[1]) * (b[0] - A[0])
            t = da / (da - db); return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)
        p = recorta(p, lado, corte)
        if len(p) < 3: return []
    return p

def linha_no_circulo(p):
    """Pedaços de uma linha que ficam dentro do círculo."""
    pecas, atual = [], []
    for q in p:
        if math.hypot(*q) <= RAIO: atual.append(q)
        else:
            if len(atual) > 1: pecas.append(atual)
            atual = []
    if len(atual) > 1: pecas.append(atual)
    return pecas

def contem_ponto(q, p):
    c = False
    for i in range(len(p)):
        (x1, y1), (x2, y2) = p[i - 1], p[i]
        if (y1 > q[1]) != (y2 > q[1]) and q[0] < (x2 - x1) * (q[1] - y1) / (y2 - y1) + x1: c = not c
    return c

def predios():
    dono = {oid: pid for pid, ids in PREDIOS.items() for oid in ids}
    saida = {pid: [] for pid in PREDIOS}; saida["outros"] = []
    for e in overpass('way["building"](BBOX);relation["building"](BBOX);'):
        oid = e["type"][0] + str(e["id"])
        if e["type"] == "way":
            grupos = [[[metros(g) for g in e.get("geometry", [])]]]
        else:
            fora = juntar([[metros(g) for g in m.get("geometry", [])] for m in e.get("members", []) if m.get("role") == "outer"])
            dentro = juntar([[metros(g) for g in m.get("geometry", [])] for m in e.get("members", []) if m.get("role") == "inner"])
            grupos = [[f] + [d for d in dentro if contem_ponto(d[0], f)] for f in fora]
        for aneis in grupos:
            pecas = []
            for anel in aneis:
                if len(anel) < 4: continue
                if anel[0] != anel[-1]: anel = anel + [anel[0]]
                anel = no_circulo(simplifica(anel)[:-1])
                if len(anel) >= 3: pecas.append(anel)
            if pecas: saida[dono.get(oid, "outros")].append(pecas)
    return saida

def caminhos():
    """As vias a pé (para desenhar) e a distância a pé do Biênio até cada nó (Dijkstra)."""
    vias = [e for e in overpass('way["highway"](BBOX);', folga=250)
            if e.get("tags", {}).get("highway") in A_PE and e.get("tags", {}).get("foot") != "no" and e.get("tags", {}).get("access") != "private"]
    pos, viz = {}, {}
    for v in vias:
        ids, geo = v.get("nodes", []), v.get("geometry", [])
        for i, (n, g) in enumerate(zip(ids, geo)):
            pos[n] = metros(g)
            if i:
                a = ids[i - 1]; d = math.dist(pos[a], pos[n])
                viz.setdefault(a, []).append((n, d)); viz.setdefault(n, []).append((a, d))
    # saída do Biênio: os nós a até 90 m do centro dele, pela distância em linha reta
    dist = {n: math.hypot(*p) for n, p in pos.items() if math.hypot(*p) <= 90}
    fila = [(d, n) for n, d in dist.items()]; heapq.heapify(fila)
    while fila:
        d, n = heapq.heappop(fila)
        if d > dist.get(n, math.inf): continue
        for m, w in viz.get(n, []):
            if d + w < dist.get(m, math.inf): dist[m] = d + w; heapq.heappush(fila, (d + w, m))
    desenho = []
    for v in vias:
        linha = [metros(g) for g in v.get("geometry", [])]
        for peca in linha_no_circulo(simplifica(linha, 1.5)):
            desenho.append(peca)
    return desenho, [(pos[n], d) for n, d in dist.items()]

def campo_de_caminhada(nos):
    """Metros andados até cada ponto (direção de 4 em 4°, distância de 25 em 25 m), nunca menos que a linha reta."""
    CEL = 60; grade = {}
    for p, d in nos: grade.setdefault((int(p[0] // CEL), int(p[1] // CEL)), []).append((p, d))
    def andar(q):
        cx, cy = int(q[0] // CEL), int(q[1] // CEL); melhor = math.inf
        for alcance in (2, 4, 8):
            for i in range(cx - alcance, cx + alcance + 1):
                for j in range(cy - alcance, cy + alcance + 1):
                    for p, d in grade.get((i, j), ()):
                        melhor = min(melhor, d + 1.25 * math.dist(p, q))   # o último trecho, fora da rede, rende menos
            if melhor < math.inf: return melhor
        return 1.4 * math.hypot(*q)
    nr = RAIO // PASSO_R + 1
    campo = []
    for k in range(ANGULOS):
        t = 2 * math.pi * k / ANGULOS
        linha = [max(r * PASSO_R, andar((r * PASSO_R * math.sin(t), r * PASSO_R * math.cos(t)))) if r else 0 for r in range(nr)]
        campo.append(linha)
    for _ in range(2):   # suaviza entre direções vizinhas e garante que só cresce ao longo de cada direção
        campo = [[0.25 * campo[k - 1][r] + 0.5 * campo[k][r] + 0.25 * campo[(k + 1) % ANGULOS][r] for r in range(nr)] for k in range(ANGULOS)]
        for linha in campo:
            for r in range(1, nr): linha[r] = max(linha[r], linha[r - 1], r * PASSO_R)
    return [[round(v) for v in linha] for linha in campo]

def main():
    saida = predios()
    vias, nos = caminhos()
    campo = campo_de_caminhada(nos)
    arred = lambda grupo: [[[round(x), round(y)] for x, y in anel] for anel in grupo]   # 1 m basta no desenho
    json_ = {
        "fonte": "© colaboradores do OpenStreetMap (ODbL), gerado por ferramentas/campus_poli.py",
        "gerado": time.strftime("%Y-%m-%d"),
        "origem": BIENIO, "raio": RAIO,
        "predios": {k: [arred(g) for g in v] for k, v in saida.items()},
        "caminhos": [[[round(x), round(y)] for x, y in p] for p in vias],
        "caminhada": {"passo": PASSO_R, "angulos": ANGULOS, "metros": campo},
    }
    with open(SAIDA, "w", encoding="utf-8") as f:
        json.dump(json_, f, ensure_ascii=False, separators=(",", ":"))
    print("prédios:", {k: len(v) for k, v in saida.items()}, "caminhos:", len(vias), "nós a pé:", len(nos),
          "->", os.path.relpath(SAIDA), os.path.getsize(SAIDA) // 1024, "KB")

if __name__ == "__main__":
    main()
