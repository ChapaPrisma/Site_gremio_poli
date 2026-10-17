"""Contornos dos prédios em volta do Biênio, para a ilustração "Onde fica cada engenharia" do Guia dos cursos.

Uso: python ferramentas/campus_poli.py            (baixa do OpenStreetMap e grava assets/dados/campus-poli.json)

Baixa todos os prédios (building=*) num raio de RAIO metros do Biênio pela API Overpass, projeta em metros
com o Biênio na origem (x para leste, y para norte), simplifica, recorta no círculo e grava em JSON. Os
prédios da Poli saem separados, pelo id do OpenStreetMap (PREDIOS abaixo). Dois cuidados por causa do
botão que desenrola o desenho em coordenadas polares em volta do Biênio:
  - o corte das coordenadas polares é a semirreta para o sul a partir do Biênio (ângulo de ±180°): todo
    prédio que cruza essa semirreta é dividido em dois, um de cada lado;
  - o próprio Biênio contém a origem e fica inteiro (o componente trata ele à parte).
Dados: © colaboradores do OpenStreetMap (ODbL).
"""
import json, math, os, sys, time, urllib.parse, urllib.request

BIENIO = (-23.5566899, -46.7326809)       # o mesmo ponto de assets/js/dados/predios-poli.js
RAIO = 1100                               # metros
SAIDA = os.path.join(os.path.dirname(__file__), "..", "assets", "dados", "campus-poli.json")
SERVIDORES = ["https://overpass-api.de/api/interpreter", "https://lz4.overpass-api.de/api/interpreter"]

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

def baixar():
    lat, lon = BIENIO
    dlat = (RAIO + 50) / 110540
    dlon = (RAIO + 50) / (111320 * math.cos(math.radians(lat)))
    bbox = f"{lat - dlat},{lon - dlon},{lat + dlat},{lon + dlon}"
    consulta = f'[out:json][timeout:90];(way["building"]({bbox});relation["building"]({bbox}););out geom;'
    for tentativa in range(4):
        for url in SERVIDORES:
            try:
                req = urllib.request.Request(url, data=urllib.parse.urlencode({"data": consulta}).encode(), headers={"User-Agent": "site-gremio-poli/1.0"})
                with urllib.request.urlopen(req, timeout=150) as r:
                    return json.load(r)
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
    """Douglas-Peucker num anel fechado."""
    if len(p) < 5: return p
    def dp(a, b):
        (x1, y1), (x2, y2) = p[a], p[b]; L = math.hypot(x2 - x1, y2 - y1) or 1e-9; pior, k = 0, None
        for i in range(a + 1, b):
            d = abs((x2 - x1) * (y1 - p[i][1]) - (x1 - p[i][0]) * (y2 - y1)) / L
            if d > pior: pior, k = d, i
        return [p[a]] if pior < tol else dp(a, k) + dp(k, b)
    meio = max(range(len(p)), key=lambda i: math.dist(p[0], p[i]))
    return dp(0, meio) + dp(meio, len(p) - 1) + [p[-1]]

def recorta(p, dentro, corte):
    """Sutherland-Hodgman contra um semiplano: dentro(q) diz o lado, corte(a, b) acha a interseção."""
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

def cruza_o_sul(p):
    """O anel atravessa a semirreta x = 0, y < 0?"""
    for i in range(len(p)):
        (x1, y1), (x2, y2) = p[i - 1], p[i]
        if (x1 < 0) != (x2 < 0) and y1 + (y2 - y1) * (0 - x1) / (x2 - x1) < 0: return True
    return False

def contem_origem(p):
    c = False
    for i in range(len(p)):
        (x1, y1), (x2, y2) = p[i - 1], p[i]
        if (y1 > 0) != (y2 > 0) and 0 < (x2 - x1) * (0 - y1) / (y2 - y1) + x1: c = not c
    return c

def main():
    dados = baixar()
    dono = {oid: pid for pid, ids in PREDIOS.items() for oid in ids}
    saida = {pid: [] for pid in PREDIOS}; saida["outros"] = []
    for e in dados["elements"]:
        oid = e["type"][0] + str(e["id"])
        if e["type"] == "way":
            grupos = [[[metros(g) for g in e.get("geometry", [])]]]
        else:
            fora = juntar([[metros(g) for g in m.get("geometry", [])] for m in e.get("members", []) if m.get("role") == "outer"])
            dentro = juntar([[metros(g) for g in m.get("geometry", [])] for m in e.get("members", []) if m.get("role") == "inner"])
            grupos = [[f] + [d for d in dentro if contem_ponto(d[0], f)] for f in fora]
        alvo = saida[dono.get(oid, "outros")]
        for aneis in grupos:
            pecas = []
            for anel in aneis:
                if len(anel) < 4: continue
                if anel[0] == anel[-1]: anel = anel[:-1]
                anel = no_circulo(simplifica(anel + [anel[0]])[:-1])
                if len(anel) >= 3: pecas.append(anel)
            if not pecas: continue
            # o Biênio contém a origem e fica inteiro; os outros que cruzam o corte do sul viram dois
            if dono.get(oid) != "bie" and any(cruza_o_sul(a) for a in pecas):
                def corte(a, b):
                    t = (0 - a[0]) / (b[0] - a[0]); return (0.0, a[1] + (b[1] - a[1]) * t)
                for lado in (lambda q: q[0] <= 0, lambda q: q[0] >= 0):
                    metade = [recorta(a, lado, corte) for a in pecas]
                    metade = [a for a in metade if len(a) >= 3]
                    if metade: alvo.append(metade)
            else:
                alvo.append(pecas)
    arred = lambda grupo: [[[round(x), round(y)] for x, y in anel] for anel in grupo]   # 1 m basta no desenho
    json_ = {
        "fonte": "© colaboradores do OpenStreetMap (ODbL), gerado por ferramentas/campus_poli.py",
        "gerado": time.strftime("%Y-%m-%d"),
        "origem": BIENIO, "raio": RAIO,
        "predios": {k: [arred(g) for g in v] for k, v in saida.items()},
    }
    with open(SAIDA, "w", encoding="utf-8") as f:
        json.dump(json_, f, ensure_ascii=False, separators=(",", ":"))
    print("prédios:", {k: len(v) for k, v in saida.items()}, "->", os.path.relpath(SAIDA), os.path.getsize(SAIDA) // 1024, "KB")

def contem_ponto(q, p):
    c = False
    for i in range(len(p)):
        (x1, y1), (x2, y2) = p[i - 1], p[i]
        if (y1 > q[1]) != (y2 > q[1]) and q[0] < (x2 - x1) * (q[1] - y1) / (y2 - y1) + x1: c = not c
    return c

if __name__ == "__main__":
    main()
