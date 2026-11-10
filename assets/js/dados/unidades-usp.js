// Onde cada disciplina "mora" no campus, para o Mapa das disciplinas (aluno/disciplinas/,
// componentes/mapa-disciplinas.js). A sigla diz o departamento: PME é da Mecânica, MAT do IME, 4323 da Física...
// Cada unidade tem a posição do prédio (latitude e longitude). Os prédios da Poli vêm de dados/predios-poli.js;
// os das outras unidades, do OpenStreetMap (Nominatim, 08/11/2026).
//
// O mapa não é geográfico ao pé da letra: a distância até o Biênio é comprimida (raiz quadrada), para que os
// prédios da Poli, colados uns nos outros, não se amontoem e a Química e o ICB, a mais de um quilômetro, não
// fiquem longe demais. A direção (norte para cima) é a real.

import { bienio, predios } from "./predios-poli.js?v=202611100009";

const poli = Object.fromEntries(predios.map((p) => [p.id, p]));

// id: [nome curto no mapa, nome por extenso, latitude, longitude, é da Poli]
const LUGARES = {
  bie: ["Biênio", "Biênio e disciplinas comuns da Poli", poli.bie.lat, poli.bie.lon, true],
  pro: ["Produção", "Engenharia de Produção (PRO)", poli.pro.lat, poli.pro.lon, true],
  civ: ["Civil e Ambiental", "Civil e Ambiental: PCC, PEF, PHA e PTR (Edifício Paula Souza)", poli.civ.lat, poli.civ.lon, true],
  ele: ["Elétrica e Computação", "Elétrica e Computação: PCS, PEA, PSI e PTC", poli.ele.lat, poli.ele.lon, true],
  mec: ["Mecânica, Mecatrônica e Naval", "Mecânica, Mecatrônica e Naval: PME, PMR e PNV", poli.mec.lat, poli.mec.lon, true],
  min: ["Minas e Petróleo", "Minas e Petróleo (PMI)", poli.min.lat, poli.min.lon, true],
  pmt: ["Metalúrgica e Materiais", "Metalúrgica, Materiais e Nuclear (PMT)", poli.pmt.lat, poli.pmt.lon, true],
  qui: ["Eng. Química", "Engenharia Química (PQI), no Conjunto das Químicas", poli.qui.lat, poli.qui.lon, true],
  ime: ["IME", "Instituto de Matemática e Estatística", -23.559086, -46.731693],
  if: ["Física", "Instituto de Física", -23.560993, -46.734692],
  iag: ["IAG", "Instituto de Astronomia, Geofísica e Ciências Atmosféricas", -23.559031, -46.733576],
  io: ["Oceanográfico", "Instituto Oceanográfico", -23.561142, -46.731984],
  iq: ["IQ", "Instituto de Química", -23.564548, -46.725893],
  igc: ["Geociências", "Instituto de Geociências", -23.561517, -46.72717],
  fcf: ["Farmácia", "Faculdade de Ciências Farmacêuticas", -23.564031, -46.724442],
  fea: ["FEA", "Faculdade de Economia, Administração e Contabilidade", -23.55857, -46.729189],
  fau: ["FAU", "Faculdade de Arquitetura e Urbanismo", -23.560569, -46.729007],
  fflch: ["FFLCH", "Faculdade de Filosofia, Letras e Ciências Humanas", -23.562617, -46.724629],
  ib: ["IB", "Instituto de Biociências", -23.565464, -46.730718],
  icb: ["ICB", "Instituto de Ciências Biomédicas", -23.567708, -46.732995],
  // fora do Butantã: ficam na borda do mapa, na direção real
  fsp: ["Saúde Pública", "Faculdade de Saúde Pública (fora da Cidade Universitária)", -23.554145, -46.672772, false, true],
  fora: ["Outras unidades", "Disciplinas de outras unidades da USP", null, null, false, true],
};

// nomes ainda mais curtos, para telas estreitas
const CURTOS = { civ: "Civil", ele: "Elétrica", mec: "Mecânica e Naval", min: "Minas", pmt: "Metalurgia", qui: "Eng. Química", igc: "IGc", io: "IO", fcf: "FCF", fsp: "FSP", fora: "Outras" };

// "onde" para frases ("8 no IME, 7 na Física")
const ONDE = { bie: "no Biênio", pro: "na Produção", civ: "na Civil", ele: "no prédio da Elétrica", mec: "na Mecânica", min: "em Minas", pmt: "na Metalúrgica", qui: "na Química", ime: "no IME", if: "na Física", iag: "no IAG", io: "no Oceanográfico", iq: "no IQ", igc: "na Geociências", fcf: "na Farmácia", fea: "na FEA", fau: "na FAU", fflch: "na FFLCH", ib: "no IB", icb: "no ICB", fsp: "na Saúde Pública", fora: "em outras unidades" };

// prefixo da sigla -> lugar. As siglas numéricas começam pelo código da unidade (03 é a Poli, 43 a Física...).
const PREFIXOS = [
  [/^PRO|^0303/, "pro"], [/^P(CC|EF|HA|TR)|^0313/, "civ"], [/^P(CS|EA|SI|TC)|^0323/, "ele"],
  [/^P(ME|MR|NV)/, "mec"], [/^PMI/, "min"], [/^PMT/, "pmt"], [/^PQI/, "qui"], [/^03|^2000/, "bie"],
  [/^MA[CPTE]/, "ime"], [/^43|^F(AP|GE|MA|NC|EP|MT)/, "if"], [/^A(CA|GG|GA)/, "iag"], [/^21|^IO/, "io"],
  [/^Q(FL|BQ|FA|IM)/, "iq"], [/^G(MG|SA|MP|SE)|^044/, "igc"], [/^FB/, "fcf"], [/^EA[CDE]/, "fea"], [/^AU[PTH]/, "fau"],
  [/^FL|^FS/, "fflch"], [/^BI[BOZ]/, "ib"], [/^BM/, "icb"], [/^H(SA|EP|SP)/, "fsp"],
];
export const lugarDe = (sigla) => PREFIXOS.find(([re]) => re.test(sigla))?.[1] || "fora";

// metros a leste e ao norte do Biênio
const metros = (lat, lon) => [(lon - bienio.lon) * 111320 * Math.cos((bienio.lat * Math.PI) / 180), (lat - bienio.lat) * 110540];

// Posição abstrata de cada lugar, em unidades do mapa (o Biênio no centro). A distância é comprimida pela raiz
// quadrada; quem está fora do campus vai para a borda. Devolve [{ id, nome, curto, extenso, x, y, poli, borda }].
export function lugares() {
  const R_BORDA = 40;
  return Object.entries(LUGARES).map(([id, [nome, extenso, lat, lon, ehPoli = false, borda = false]]) => {
    let x = 0, y = 0;
    if (lat != null) {
      const [mx, my] = metros(lat, lon);
      const r = Math.hypot(mx, my), k = r ? Math.min(Math.sqrt(r), R_BORDA) / r : 0;
      x = mx * k; y = -my * k;   // y da tela cresce para baixo
    }
    if (borda && lat == null) { x = -R_BORDA * 0.75; y = R_BORDA * 0.75; }   // "outras unidades": canto de baixo, à esquerda
    if (id !== "bie" && Math.hypot(x, y) < 6) { const a = Math.atan2(y, x) || 0; x = 6 * Math.cos(a); y = 6 * Math.sin(a); }
    return { id, nome, curto: CURTOS[id] || nome, onde: ONDE[id], extenso, x, y, poli: ehPoli, borda };
  });
}
