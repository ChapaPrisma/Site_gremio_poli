"""Gera assets/dados/circulares.json com o traçado, as paradas e os horários das linhas da SPTrans que
entram na Cidade Universitária, a partir do GTFS oficial da SPTrans (o mesmo arquivo da área de
desenvolvedores, espelhado sem cadastro pelo Mobility Database).

Uso (Python 3.9+, só biblioteca padrão):
    python ferramentas/circulares_gtfs.py                 # baixa o GTFS mais recente
    python ferramentas/circulares_gtfs.py caminho/gtfs.zip

Revise no começo de cada semestre: a SPTrans muda linhas e horários.
"""
import csv, io, json, math, sys, urllib.request, zipfile
from datetime import datetime, timezone
from pathlib import Path

GTFS_URL = "https://files.mobilitydatabase.org/mdb-8/latest.zip"
LINHAS = ["8084-10", "8082-10", "8083-10", "8085-10", "8012-10", "8022-10", "177H-10", "701U-10", "702U-10"]
SAIDA = Path(__file__).resolve().parent.parent / "assets" / "dados" / "circulares.json"
# Região mostrada no mapa: a Cidade Universitária e o caminho até o Metrô Butantã. Linhas longas
# aparecem só neste trecho (o cartão diz até onde elas seguem).
AREA = {"sul": -23.5790, "norte": -23.5420, "oeste": -46.7520, "leste": -46.6990}
DIAS = {"U__": "Segunda a sexta", "US_": "Segunda a sábado", "USD": "Todos os dias", "_SD": "Sábados e domingos", "__D": "Domingos", "_S_": "Sábados"}


def dentro(p):
    return AREA["sul"] <= p[0] <= AREA["norte"] and AREA["oeste"] <= p[1] <= AREA["leste"]


def recorta(pontos):
    pedacos, atual = [], []
    for p in pontos:
        if dentro(p):
            atual.append(p)
        else:
            if len(atual) > 1: pedacos.append(atual)
            atual = []
    if len(atual) > 1: pedacos.append(atual)
    return pedacos


def simplifica(pontos, tol=0.00004):
    """Douglas-Peucker (tolerância de uns 4 m): o traçado fica leve sem mudar o desenho."""
    if len(pontos) < 3: return pontos
    a, b = pontos[0], pontos[-1]
    dx, dy = b[0] - a[0], b[1] - a[1]
    n = math.hypot(dx, dy) or 1e-12
    dist = [abs(dy * (p[0] - a[0]) - dx * (p[1] - a[1])) / n for p in pontos[1:-1]]
    i = max(range(len(dist)), key=dist.__getitem__)
    if dist[i] <= tol: return [a, b]
    return simplifica(pontos[: i + 2], tol)[:-1] + simplifica(pontos[i + 1 :], tol)


def limpa(nome):
    """A SPTrans escreve tudo com inicial maiúscula ("Economia E Administração", "Cptm")."""
    nome = " ".join(nome.split())
    for a, b in ((" E ", " e "), (" De ", " de "), (" Do ", " do "), (" Da ", " da "), (" Dos ", " dos "), (" Das ", " das "), ("Cptm", "CPTM"), ("Usp", "USP"), ("Seade Etec", "Seade/Etec"), ("(cidade", "(Cidade"), (" Ii", " II")):
        nome = nome.replace(a, b)
    return nome


def funcionamento(janelas):
    """Janelas de hora em hora do frequencies.txt -> (início, fim) do serviço, pulando o maior buraco do dia."""
    horas = sorted({int(f["start_time"][:2]) % 24 for f in janelas})
    if len(horas) == 24: return "24 horas"
    buracos = [((horas[(i + 1) % len(horas)] - h) % 24 or 24, i) for i, h in enumerate(horas)]
    _, i = max(buracos)
    ini, fim = horas[(i + 1) % len(horas)], horas[i]
    return f"{ini}h às {(fim + 1) % 24}h"


def tabela(z, nome, filtro=None):
    with z.open(nome) as f:
        for linha in csv.DictReader(io.TextIOWrapper(f, encoding="utf-8-sig")):
            if filtro is None or filtro(linha): yield linha


def main():
    if len(sys.argv) > 1:
        dados_zip = Path(sys.argv[1]).read_bytes()
    else:
        req = urllib.request.Request(GTFS_URL, headers={"User-Agent": "SiteGremioPolitecnico/1.0 (guia dos circulares)"})
        dados_zip = urllib.request.urlopen(req, timeout=300).read()
    z = zipfile.ZipFile(io.BytesIO(dados_zip))
    linhas = set(LINHAS)
    viagens = [t for t in tabela(z, "trips.txt", lambda t: t["route_id"] in linhas)]
    ids_viagem = {t["trip_id"] for t in viagens}
    ids_forma = {t["shape_id"] for t in viagens}

    formas = {}
    for p in tabela(z, "shapes.txt", lambda p: p["shape_id"] in ids_forma):
        formas.setdefault(p["shape_id"], []).append((int(p["shape_pt_sequence"]), round(float(p["shape_pt_lat"]), 5), round(float(p["shape_pt_lon"]), 5)))
    paradas_viagem = {}
    for s in tabela(z, "stop_times.txt", lambda s: s["trip_id"] in ids_viagem):
        paradas_viagem.setdefault(s["trip_id"], []).append((int(s["stop_sequence"]), s["stop_id"]))
    ids_parada = {i for l in paradas_viagem.values() for _, i in l}
    pontos = {p["stop_id"]: p for p in tabela(z, "stops.txt", lambda p: p["stop_id"] in ids_parada)}
    frequencias = {}
    for f in tabela(z, "frequencies.txt", lambda f: f["trip_id"] in ids_viagem):
        frequencias.setdefault(f["trip_id"], []).append(f)

    saida = {}
    horarios = {}
    for t in viagens:
        forma = [(la, lo) for _, la, lo in sorted(formas.get(t["shape_id"], []))]
        trechos = [simplifica(tr) for tr in recorta(forma)]
        paradas = []
        for _, i in sorted(paradas_viagem.get(t["trip_id"], [])):
            p = pontos[i]
            q = {"nome": limpa(p["stop_name"]), "lat": round(float(p["stop_lat"]), 5), "lon": round(float(p["stop_lon"]), 5)}
            if dentro((q["lat"], q["lon"])): paradas.append(q)
        nome_linha = t["route_id"]
        saida.setdefault(nome_linha, []).append({"nome": f'{nome_linha} sentido {limpa(t["trip_headsign"])}', "para": limpa(t["trip_headsign"]), "trechos": trechos, "paradas": paradas})
        fs = frequencias.get(t["trip_id"], [])
        if fs:
            h = horarios.setdefault(nome_linha, {"servico": t["service_id"], "janelas": []})
            h["janelas"] += fs

    # horário de funcionamento e intervalo entre ônibus durante o dia (7h às 20h), para conferir com os
    # cartões de assets/js/dados/circulares.js. Atenção: o GTFS traz um só calendário por linha; nas de
    # fim de semana (8012, 8022) ele mostra só a madrugada dos dias úteis.
    resumo = {}
    for l, h in horarios.items():
        dia = [int(f["headway_secs"]) // 60 for f in h["janelas"] if 7 <= int(f["start_time"][:2]) <= 19]
        resumo[l] = {"dias": DIAS.get(h["servico"], h["servico"]), "horario": funcionamento(h["janelas"]),
                     "intervalo": f"{min(dia)} a {max(dia)} min" if dia else ""}

    validade = next(tabela(z, "calendar.txt"))
    dados = {
        "fonte": "GTFS da SPTrans (sptrans.com.br/desenvolvedores)",
        "atualizadoEm": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "validoAte": validade["end_date"],
        "horarios": resumo,
        "linhas": saida,
    }
    SAIDA.write_text(json.dumps(dados, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"{SAIDA.name}: {len(saida)} linhas, {sum(len(s['paradas']) for v in saida.values() for s in v)} paradas")
    for l in LINHAS:
        print(" ", l, resumo.get(l), [len(s["paradas"]) for s in saida.get(l, [])])


if __name__ == "__main__":
    main()
