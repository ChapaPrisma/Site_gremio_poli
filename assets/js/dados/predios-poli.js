// Prédios da Poli para a ilustração "Onde fica cada engenharia" do Guia dos cursos (componentes/poli-do-bienio.js).
// Endereços e departamentos: Guia de Contatos da Poli (versão 2025.v8, publicada em 2026). Coordenadas: o
// marcador de cada prédio no Google Maps. Os contornos dos prédios vêm do OpenStreetMap, em
// assets/dados/campus-poli.json (ferramentas/campus_poli.py), com o Biênio na origem.
//
// rotulo: onde fica o nome de cada prédio, em px a partir do prédio: { mapa: [dx, dy, alinhamento], polar: [...] }
// (alinhamento "start", "middle" ou "end"). cas: os centros acadêmicos de dados/cursos.js que moram ali.

export const bienio = { lat: -23.5566899, lon: -46.7326809 };

export const predios = [
  {
    id: "bie", nome: "Biênio", sub: "as aulas dos primeiros anos de todos os cursos",
    lat: -23.5566899, lon: -46.7326809, cas: [],
    deptos: [], cursos: "Primeiros anos de todos os cursos",
    endereco: "Av. Prof. Almeida Prado, trav. do Biênio, 128",
    rotulo: { mapa: [-46, 48, "end"], polar: [-236, -2, "middle"] },
  },
  {
    id: "pro", nome: "Produção", sub: "Edifício J. O. Monteiro de Camargo",
    lat: -23.5567492, lon: -46.7332957, cas: ["caep"],
    deptos: ["PRO, Engenharia de Produção"], cursos: "Produção",
    endereco: "Av. Prof. Almeida Prado, trav. do Politécnico, 128",
    rotulo: { mapa: [-92, -24, "end"], polar: [0, -46, "middle"] },
  },
  {
    id: "civ", nome: "Civil e Ambiental", sub: "Edifício Paula Souza",
    lat: -23.5549195, lon: -46.7319974, cas: ["cec", "caea"],
    deptos: ["PCC, Construção Civil", "PEF, Estruturas e Geotécnica", "PHA, Hidráulica e Ambiental", "PTR, Transportes"], cursos: "Civil e Ambiental",
    endereco: "Av. Prof. Almeida Prado, trav. do Biênio, 83",
    rotulo: { mapa: [-78, -10, "end"], polar: [-58, -6, "end"] },
  },
  {
    id: "ele", nome: "Elétrica e Computação", sub: "Prédio da Engenharia Elétrica",
    lat: -23.5577092, lon: -46.7296751, cas: ["cee"],
    deptos: ["PCS, Computação e Sistemas Digitais", "PEA, Energia e Automação Elétricas", "PSI, Sistemas Eletrônicos", "PTC, Telecomunicações e Controle"], cursos: "Elétrica (todas as ênfases) e Computação",
    endereco: "Av. Prof. Luciano Gualberto, trav. do Politécnico, 158",
    rotulo: { mapa: [70, 44, "start"], polar: [44, 18, "start"] },
  },
  {
    id: "mec", nome: "Mecânica, Mecatrônica e Naval", sub: "Edifício da Engenharia Mecânica",
    lat: -23.5539281, lon: -46.7297517, cas: ["cam", "cen"],
    deptos: ["PME, Mecânica", "PMR, Mecatrônica e Sistemas Mecânicos", "PNV, Naval e Oceânica"], cursos: "Mecânica, Mecatrônica e Naval",
    endereco: "Av. Prof. Mello Moraes, 2231",
    rotulo: { mapa: [96, 18, "start"], polar: [70, -16, "start"] },
  },
  {
    id: "min", nome: "Minas e Petróleo", sub: "Prédio da Engenharia de Minas",
    lat: -23.5531668, lon: -46.7308068, cas: ["cmr"],
    deptos: ["PMI, Minas e de Petróleo"], cursos: "Minas e Petróleo",
    endereco: "Av. Prof. Mello Moraes, 2373",
    rotulo: { mapa: [96, -40, "start"], polar: [64, -64, "start"] },
  },
  {
    id: "pmt", nome: "Metalúrgica, Materiais e Nuclear", sub: "Prédio da Eng. Metalúrgica e de Materiais",
    lat: -23.5524788, lon: -46.7311379, cas: ["cmr"],
    deptos: ["PMT, Metalúrgica e de Materiais (abriga o curso de Nuclear)"], cursos: "Metalúrgica, Materiais e Nuclear",
    endereco: "Av. Prof. Mello Moraes, 2463",
    rotulo: { mapa: [-84, -26, "end"], polar: [-60, -40, "end"] },
  },
  {
    id: "qui", nome: "Química", sub: "no Conjunto das Químicas",
    lat: -23.5635273, lon: -46.7265156, cas: ["aeq"],
    deptos: ["PQI, Engenharia Química"], cursos: "Química",
    endereco: "Av. Prof. Lineu Prestes, 580, Conjunto das Químicas, Bloco 18",
    rotulo: { mapa: [-56, 14, "end"], polar: [-40, 24, "end"] },
  },
];
