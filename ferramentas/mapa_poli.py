"""Gera a ilustração "Onde fica cada engenharia" do fim do Guia dos cursos (aluno/cursos/index.html).

É um desenho, não um mapa de navegação: as ruas vêm dos trajetos dos ônibus que passam pela Poli
(assets/dados/circulares.json, do GTFS da SPTrans) e cada prédio entra como um alfinete com a logo do
centro acadêmico. Posições: o endereço de cada prédio no OpenStreetMap (Produção; Civil e Ambiental) e as
paradas da SPTrans que levam o nome do prédio (Biênio, Metalurgia, Mecânica, Hidráulica, Farmácia e
Química). Elétrica e Computação ficam numa posição aproximada, ao lado do Biênio, na mesma travessa.
A Poli Química fica a cerca de 1 km, no conjunto das Químicas: entra como uma seta na borda.

Rode quando mudar algum prédio: python ferramentas/mapa_poli.py (troca o trecho entre os marcadores
<!-- mapa-poli:inicio --> e <!-- mapa-poli:fim --> da página).
"""
import json, math
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
PAGINA = RAIZ / "aluno" / "cursos" / "index.html"
CIRCULARES = RAIZ / "assets" / "dados" / "circulares.json"

# recorte: o pedaço do campus onde ficam os prédios da Poli
OESTE, LESTE, NORTE, SUL = -46.7352, -46.7252, -23.5508, -23.5596
LARG = 860
COS = math.cos(math.radians(23.555))
ESCALA = LARG / ((LESTE - OESTE) * COS)
ALT = round((NORTE - SUL) * ESCALA)

def xy(lat, lon):
    return round((lon - OESTE) * COS * ESCALA, 1), round((NORTE - lat) * ESCALA, 1)

def dentro(lat, lon, folga=0.0004):
    return OESTE - folga <= lon <= LESTE + folga and SUL - folga <= lat <= NORTE + folga

# n, rótulo (linhas), latitude, longitude, logos dos CAs, âncora no menu dos centros acadêmicos, deslocamento do rótulo
PREDIOS = [
    (1, ["Biênio", "as aulas dos primeiros anos"], -23.55782, -46.73232, [], "", (0, 38)),
    (2, ["Civil e Ambiental"], -23.55488, -46.73197, ["cec", "caea"], "cec", (0, -34)),
    (3, ["Produção"], -23.55649, -46.73340, ["caep"], "caep", (0, 42)),
    (4, ["Elétrica e Computação"], -23.55745, -46.73050, ["cee"], "cee", (0, 42)),
    (5, ["Metalurgia, Materiais", "e Nuclear"], -23.55222, -46.73149, ["cmr"], "cmr", (0, -46)),
    (6, ["Minas e Petróleo"], -23.55262, -46.73000, ["cmr"], "cmr", (0, 42)),
    (7, ["Mecânica, Mecatrônica", "e Naval"], -23.55281, -46.72842, ["cam", "cen"], "cam", (0, -46)),
    (8, ["Hidráulica (CTH)"], -23.55616, -46.72631, [], "", (0, 30)),
]

def simplifica(pts, tol=1.2):
    if len(pts) < 3:
        return pts
    (ax, ay), (bx, by) = pts[0], pts[-1]
    dx, dy = bx - ax, by - ay
    n = math.hypot(dx, dy) or 1e-9
    dist = [abs(dy * (px - ax) - dx * (py - ay)) / n for px, py in pts[1:-1]]
    i = max(range(len(dist)), key=dist.__getitem__)
    if dist[i] <= tol:
        return [pts[0], pts[-1]]
    return simplifica(pts[: i + 2], tol)[:-1] + simplifica(pts[i + 1 :], tol)

# só as linhas da SPTrans (GTFS oficial); a 280BI1, da EMTU, vem do OpenStreetMap e não está confirmada
SO_SPTRANS = lambda ref: ref.endswith("-10")

def ruas():
    dados = json.loads(CIRCULARES.read_text(encoding="utf-8"))
    vistos, caminhos = set(), []
    for ref, sentidos in dados["linhas"].items():
        if not SO_SPTRANS(ref):
            continue
        for s in sentidos:
            for trecho in s["trechos"]:
                pedaco = []
                for lat, lon in trecho + [[None, None]]:
                    if lat is not None and dentro(lat, lon):
                        pedaco.append(xy(lat, lon))
                        continue
                    if len(pedaco) > 1:
                        p = simplifica(pedaco, 3.5)   # alisa as manobras de entrada e saída do Terminal USP
                        chave = tuple((round(x / 14), round(y / 14)) for x, y in p)   # os dois sentidos viram um traço só
                        if chave not in vistos:
                            vistos.add(chave)
                            caminhos.append("M" + "L".join(f"{x} {y}" for x, y in p))
                    pedaco = []
    return caminhos

def alfinete(n, rotulo, lat, lon, cas, ancora, desloc):
    x, y = xy(lat, lon)
    dx, dy = desloc
    if cas:
        # cada logo num círculo próprio, lado a lado quando o prédio é de mais de um CA
        r, passo = 19, 42
        corpo = ""
        for i, ca in enumerate(cas):
            cx = x + i * passo - (len(cas) - 1) * passo / 2
            corte = f"mp-{n}-{ca}"
            corpo += (f'<clipPath id="{corte}"><circle cx="{cx}" cy="{y}" r="{r - 1}"/></clipPath>'
                      f'<circle class="mp-pino" cx="{cx}" cy="{y}" r="{r}"/>'
                      f'<image href="../../assets/img/cas/{ca}.svg" x="{cx - r}" y="{y - r}" width="{2 * r}" height="{2 * r}" clip-path="url(#{corte})" preserveAspectRatio="xMidYMid slice"/>'
                      f'<circle class="mp-aro" cx="{cx}" cy="{y}" r="{r}"/>')
    else:
        corpo = f'<circle class="mp-pino mp-pino--{"bienio" if n == 1 else "neutro"}" cx="{x}" cy="{y}" r="{14 if n == 1 else 9}"/>'
    linhas = "".join(f'<tspan x="{x + dx}" dy="{0 if i == 0 else 15}"{" class=\"mp-sub\"" if i else ""}>{t}</tspan>' for i, t in enumerate(rotulo))
    nx = x + (12 if not cas else 16 + (len(cas) - 1) * 21)
    numero = f'<g class="mp-num"><circle cx="{nx}" cy="{y - 15}" r="9"/><text x="{nx}" y="{y - 11.5}" text-anchor="middle">{n}</text></g>'
    texto = f'<text class="mp-rotulo" x="{x + dx}" y="{y + dy}" text-anchor="middle">{linhas}</text>'
    grupo = f'<g class="mp-predio">{corpo}{numero}{texto}</g>'
    return f'<a href="#{ancora}" aria-label="{" ".join(rotulo)}">{grupo}</a>' if ancora else grupo

# as quatro avenidas em volta da Poli, conferidas pelos endereços dos prédios e pelas paradas:
# (nome, dois pontos da avenida para o ângulo, ponto do rótulo, deslocamento para fora do quadrado)
AVENIDAS = [
    ("Av. Prof. Luciano Gualberto", (-23.55782, -46.73232), (-23.55895, -46.72980), (-23.55905, -46.72930), 16),
    ("Av. Prof. Almeida Prado", (-23.55604, -46.73379), (-23.55347, -46.73239), (-23.55420, -46.73290), -14),
    ("Av. Prof. Mello Moraes", (-23.55222, -46.73149), (-23.55285, -46.72871), (-23.55300, -46.72700), -14),
    ("Av. Prof. Lúcio Martins Rodrigues", (-23.55604, -46.73379), (-23.55347, -46.73239), (-23.55520, -46.72640), -16),
]

def rotulos_avenidas():
    out = []
    for nome, a, b, ponto, fora in AVENIDAS:
        (x1, y1), (x2, y2) = xy(*a), xy(*b)
        ang = math.degrees(math.atan2(y2 - y1, x2 - x1))
        if ang > 90: ang -= 180
        if ang < -90: ang += 180
        x, y = xy(*ponto)
        nx, ny = -math.sin(math.radians(ang)) * fora, math.cos(math.radians(ang)) * fora
        out.append(f'<text class="mp-rua" x="{x + nx:.1f}" y="{y + ny:.1f}" text-anchor="middle" transform="rotate({ang:.1f} {x + nx:.1f} {y + ny:.1f})">{nome}</text>')
    return "".join(out)

def svg():
    caminhos = ruas()
    caminho = "".join(f'<path d="{d}"/>' for d in caminhos)
    # escala de 100 m e o norte
    m100 = 100 / 111320 * ESCALA
    partes = [
        f'<svg class="mapa-poli__svg" viewBox="0 0 {LARG} {ALT}" role="img" aria-labelledby="mapaPoliTitulo mapaPoliDesc">',
        '<title id="mapaPoliTitulo">Onde fica cada engenharia na Poli</title>',
        '<desc id="mapaPoliDesc">Ilustração dos prédios da Escola Politécnica na Cidade Universitária, com a logo do centro acadêmico de cada curso. A legenda abaixo lista os mesmos prédios.</desc>',
        f'<rect class="mp-fundo" width="{LARG}" height="{ALT}" rx="14"/>',
        f'<g class="mp-ruas-borda">{caminho}</g><g class="mp-ruas">{caminho}</g>',
        rotulos_avenidas(),
        "".join(alfinete(*p) for p in PREDIOS),
        # seta para a Poli Química, a sudeste
        f'<g class="mp-quimica"><a href="#aeq" aria-label="Química: no conjunto das Químicas, a cerca de 1 km"><path class="mp-seta" d="M{LARG - 150} {ALT - 70} l70 34"/><path class="mp-seta-ponta" d="M{LARG - 80} {ALT - 36} l-16 -2 l7 -12z"/>'
        f'<image href="../../assets/img/cas/aeq.svg" x="{LARG - 62}" y="{ALT - 62}" width="40" height="40"/>'
        f'<text class="mp-rotulo" x="{LARG - 200}" y="{ALT - 86}" text-anchor="middle"><tspan x="{LARG - 200}">Química</tspan><tspan x="{LARG - 200}" dy="15" class="mp-sub">a 1 km, no conjunto das Químicas</tspan></text></a></g>',
        f'<g class="mp-escala"><path d="M24 {ALT - 26} h{m100:.1f}"/><text x="24" y="{ALT - 34}">100 m</text></g>',
        f'<g class="mp-norte"><path d="M{LARG - 34} 46 l9 -24 l9 24 l-9 -6z"/><text x="{LARG - 25}" y="62" text-anchor="middle">N</text></g>',
        "</svg>",
    ]
    return "".join(partes)

def legenda():
    itens = [f'<li><span class="mapa-poli__n">{n}</span>{(": " if n == 1 else " ").join(r)}</li>' for n, r, *_ in PREDIOS]
    itens.append('<li><span class="mapa-poli__n mapa-poli__n--seta">→</span>Química, no conjunto das Químicas, a cerca de 1 km</li>')
    return f'<ol class="mapa-poli__legenda">{"".join(itens)}</ol>'

def main():
    html = PAGINA.read_text(encoding="utf-8")
    ini, fim = "<!-- mapa-poli:inicio -->", "<!-- mapa-poli:fim -->"
    bloco = f"""{ini}
      <section class="bloco-portal mapa-poli" id="mapa-poli" aria-labelledby="mapa-poli-titulo">
        <h2 id="mapa-poli-titulo">Onde fica cada engenharia</h2>
        <p class="bloco-portal__intro">Os prédios da Poli na Cidade Universitária, com o centro acadêmico de cada curso. Toque numa logo para ir até ele.</p>
        <figure class="mapa-poli__figura">{svg()}<figcaption>{legenda()}<p class="nota">Ilustração fora de escala nos detalhes: as ruas são as avenidas por onde passam os ônibus da SPTrans e as posições vêm do OpenStreetMap e das paradas com o nome de cada prédio. Elétrica e Computação estão em posição aproximada. A Engenharia de Petróleo também tem casa na Poli Santos, no litoral.</p></figcaption></figure>
      </section>
      {fim}"""
    if ini in html:
        a, b = html.index(ini), html.index(fim) + len(fim)
        html = html[:a] + bloco + html[b:]
    else:
        alvo = '      <p class="nota" style="margin-top:18px">Lista de centros acadêmicos e cursos'
        i = html.index(alvo)
        j = html.index("</p>", i) + 4
        html = html[:j] + "\n\n      " + bloco + html[j:]
    PAGINA.write_text(html, encoding="utf-8")
    print(f"mapa da Poli: {LARG}x{ALT}, {len(PREDIOS)} prédios")

if __name__ == "__main__":
    main()
