"""Prédios, caminhos e tempo a pé a partir do Biênio, para a ilustração "Onde fica cada engenharia" do Guia dos cursos.

Uso: python ferramentas/campus_poli.py            (baixa do OpenStreetMap e grava assets/dados/campus-poli.json)

1. Baixa pela API Overpass todos os prédios (building=*) e todas as vias por onde se anda (calçadas, trilhas,
   escadas, ruas internas...) num raio de RAIO metros do Biênio.
2. Projeta tudo em metros com o Biênio na origem (x para leste, y para norte), simplifica e recorta no círculo.
   Os prédios da Poli saem separados, pelo id do OpenStreetMap (PREDIOS abaixo).
3. Baixa o relevo (altitudes do SRTM, da NASA, pela API pública do Open Topo Data) numa grade em volta do Biênio.
4. Calcula o tempo a pé do Biênio até cada esquina da rede (Dijkstra), com a velocidade de cada trecho pela
   função de Tobler: no plano, 4,8 km/h; subindo, mais devagar; numa descida suave, um pouco mais rápido; numa
   descida forte, devagar de novo. Com isso, um "campo de caminhada": para cada direção (de 4 em 4 graus) e
   cada distância em linha reta (de 25 em 25 m), o tempo até lá, guardado em "metros equivalentes" (o que se
   andaria no plano nesse tempo, a 80 m por minuto). O componente usa esse campo para redesenhar o campus em
   tempo a pé. O campo nunca diminui ao longo de uma direção, para o desenho não se dobrar sobre si mesmo.
Dados: © colaboradores do OpenStreetMap (ODbL); relevo SRTM (NASA), via Open Topo Data.
"""
import heapq, json, math, os, sys, time, urllib.parse, urllib.request

BIENIO = (-23.5566899, -46.7326809)       # o mesmo ponto de assets/js/dados/predios-poli.js
RAIO = 1100                               # metros
PASSO_R, ANGULOS = 25, 90                 # resolução do campo de caminhada (25 m, 4°)
M_POR_MIN = 80                            # 4,8 km/h no plano
N_RELEVO = 45                             # grade de altitudes N × N cobrindo o quadrado do desenho (passo de ~60 m)
TOPO = "https://api.opentopodata.org/v1/srtm30m?locations="
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

def relevo():
    """Altitudes numa grade N × N (metros), do SRTM pelo Open Topo Data: 100 pontos por pedido, um pedido por segundo."""
    lado = RAIO + 250; passo = 2 * lado / (N_RELEVO - 1)
    lat0, lon0 = BIENIO
    pts = [(-lado + j * passo, -lado + i * passo) for i in range(N_RELEVO) for j in range(N_RELEVO)]   # linha i = y, coluna j = x
    alts = []
    for k in range(0, len(pts), 100):
        loc = "|".join(f"{lat0 + y / 110540:.6f},{lon0 + x / (111320 * math.cos(math.radians(lat0))):.6f}" for x, y in pts[k:k + 100])
        for tentativa in range(4):
            try:
                with urllib.request.urlopen(urllib.request.Request(TOPO + loc, headers={"User-Agent": "site-gremio-poli/1.0"}), timeout=60) as r:
                    alts += [round(x["elevation"] or 0, 1) for x in json.load(r)["results"]]
                break
            except Exception as e:
                print("  relevo falhou", e, file=sys.stderr); time.sleep(5 * (tentativa + 1))
        else: sys.exit("Open Topo Data indisponível; tente mais tarde.")
        time.sleep(1.1)
    grade = [alts[i * N_RELEVO:(i + 1) * N_RELEVO] for i in range(N_RELEVO)]
    def altitude(q):
        fx = min(max((q[0] + lado) / passo, 0), N_RELEVO - 1.001); fy = min(max((q[1] + lado) / passo, 0), N_RELEVO - 1.001)
        j, i = int(fx), int(fy); ax, ay = fx - j, fy - i
        return (grade[i][j] * (1 - ax) + grade[i][j + 1] * ax) * (1 - ay) + (grade[i + 1][j] * (1 - ax) + grade[i + 1][j + 1] * ax) * ay
    return {"lado": lado, "passo": round(passo, 3), "n": N_RELEVO, "m": [[round(v) for v in linha] for linha in grade]}, altitude

def minutos(a, b, altitude, extra=1.0):
    """Minutos para andar de a até b em linha reta, pela função de Tobler (no plano: 80 m/min)."""
    d = math.dist(a, b)
    if d < 1e-6: return 0.0
    s = (altitude(b) - altitude(a)) / d
    v = M_POR_MIN * math.exp(-3.5 * abs(s + 0.05)) / math.exp(-3.5 * 0.05)
    return extra * d / v

def caminhos(altitude):
    """As vias a pé (para desenhar) e a distância a pé do Biênio até cada nó (Dijkstra)."""
    vias = [e for e in overpass('way["highway"](BBOX);', folga=250)
            if e.get("tags", {}).get("highway") in A_PE and e.get("tags", {}).get("foot") != "no" and e.get("tags", {}).get("access") != "private"]
    pos, viz = {}, {}
    for v in vias:
        ids, geo = v.get("nodes", []), v.get("geometry", [])
        for i, (n, g) in enumerate(zip(ids, geo)):
            pos[n] = metros(g)
            if i:   # cada sentido tem o seu tempo: subir demora mais que descer
                a = ids[i - 1]
                viz.setdefault(a, []).append((n, minutos(pos[a], pos[n], altitude)))
                viz.setdefault(n, []).append((a, minutos(pos[n], pos[a], altitude)))
    # saída do Biênio: os nós a até 90 m do centro dele, em linha reta
    dist = {n: minutos((0, 0), p, altitude) for n, p in pos.items() if math.hypot(*p) <= 90}
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

def campo_de_caminhada(nos, altitude):
    """Tempo até cada ponto (direção de 4 em 4°, distância de 25 em 25 m), em metros equivalentes no plano."""
    CEL = 60; grade = {}
    for p, d in nos: grade.setdefault((int(p[0] // CEL), int(p[1] // CEL)), []).append((p, d))
    def andar(q):
        cx, cy = int(q[0] // CEL), int(q[1] // CEL); melhor = math.inf
        for alcance in (2, 4, 8):
            for i in range(cx - alcance, cx + alcance + 1):
                for j in range(cy - alcance, cy + alcance + 1):
                    for p, d in grade.get((i, j), ()):
                        melhor = min(melhor, d + minutos(p, q, altitude, 1.25))   # o último trecho, fora da rede, rende menos
            if melhor < math.inf: return melhor * M_POR_MIN
        return minutos((0, 0), q, altitude, 1.4) * M_POR_MIN
    nr = RAIO // PASSO_R + 1
    campo = []
    for k in range(ANGULOS):
        t = 2 * math.pi * k / ANGULOS
        linha = [andar((r * PASSO_R * math.sin(t), r * PASSO_R * math.cos(t))) if r else 0 for r in range(nr)]
        campo.append(linha)
    for _ in range(2):   # suaviza entre direções vizinhas e garante que só cresce ao longo de cada direção
        campo = [[0.25 * campo[k - 1][r] + 0.5 * campo[k][r] + 0.25 * campo[(k + 1) % ANGULOS][r] for r in range(nr)] for k in range(ANGULOS)]
        for linha in campo:
            for r in range(1, nr): linha[r] = max(linha[r], linha[r - 1])
    return [[round(v) for v in linha] for linha in campo]

def main():
    saida = predios()
    alt_json, altitude = relevo()
    vias, nos = caminhos(altitude)
    campo = campo_de_caminhada(nos, altitude)
    arred = lambda grupo: [[[round(x), round(y)] for x, y in anel] for anel in grupo]   # 1 m basta no desenho
    json_ = {
        "fonte": "© colaboradores do OpenStreetMap (ODbL); relevo SRTM (NASA) via Open Topo Data; gerado por ferramentas/campus_poli.py",
        "gerado": time.strftime("%Y-%m-%d"),
        "origem": BIENIO, "raio": RAIO,
        "predios": {k: [arred(g) for g in v] for k, v in saida.items()},
        "caminhos": [[[round(x), round(y)] for x, y in p] for p in vias],
        "caminhada": {"passo": PASSO_R, "angulos": ANGULOS, "metros": campo, "mPorMin": M_POR_MIN, "relevo": True},
        "relevo": alt_json,
    }
    with open(SAIDA, "w", encoding="utf-8") as f:
        json.dump(json_, f, ensure_ascii=False, separators=(",", ":"))
    print("prédios:", {k: len(v) for k, v in saida.items()}, "caminhos:", len(vias), "nós a pé:", len(nos),
          "->", os.path.relpath(SAIDA), os.path.getsize(SAIDA) // 1024, "KB")

if __name__ == "__main__":
    main()
