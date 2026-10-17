// Guia dos circulares (aluno/circulares/): as linhas de ônibus que entram na Cidade Universitária.
// O traçado, as paradas e os horários vêm do GTFS oficial da SPTrans, em assets/dados/circulares.json
// (ferramentas/circulares_gtfs.py). A 280BI1, da EMTU, saiu em out/2026: não foi possível confirmar que ainda passa pela USP.
// Aqui ficam os textos dos cartões, escritos a partir das paradas do GTFS de outubro de 2026. O GTFS só
// traz o horário dos dias úteis; o das linhas de fim de semana vem da PUSP-C e do Jornal da USP.
// Revise no começo de cada semestre: rode o script e confira os textos (linhas e horários mudam).

export const LINHAS = [
  // circulares de segunda a sexta (gratuitas com o BUSP)
  { ref: "8084-10", nome: "Metrô Butantã ↔ Cidade Universitária", cor: "#e4572e", busp: true, dias: "Segunda a sexta", horario: "5h às 0h40", intervalo: "A cada 6 a 12 min durante o dia",
    resumo: "Volta de sentido único a partir do Metrô Butantã: passa pela Educação, pelo CrUSP e pela Reitoria, para no Biênio da Poli e volta pela Geociências, pela Letras e pelo Instituto Butantã.",
    destaque: "Passa na Poli" },
  { ref: "8082-10", nome: "Cidade Universitária ↔ Metrô Butantã", cor: "#2a9d8f", busp: true, dias: "Segunda a sexta", horario: "Cerca de 4h às 2h", intervalo: "A cada 12 a 20 min durante o dia",
    resumo: "Na ida, pela Raia Olímpica, Mecânica II e IPT até a Física e a Vila Indiana. Na volta, passa pela Parada Civil, Metalurgia, Mecânica I e Hidráulica, pela Praça do Relógio e pela estação da CPTM.",
    destaque: "Passa na Poli" },
  { ref: "8083-10", nome: "Cidade Universitária ↔ Metrô Butantã", cor: "#7b2cbf", busp: true, dias: "Segunda a sexta", horario: "Cerca de 4h às 3h", intervalo: "A cada 12 a 20 min durante o dia",
    resumo: "O lado oeste do campus: Farmácia e Química, Vila Indiana, Hospital Universitário, São Remo e Odontologia. Não passa pela Poli." },
  { ref: "8085-10", nome: "Circular USP (P3)", cor: "#e9c46a", busp: true, dias: "Segunda a sexta", horario: "Cerca de 4h às 2h", intervalo: "A cada 20 a 30 min durante o dia",
    resumo: "Volta só dentro do campus, sem ir ao Metrô: Hospital Universitário, Geociências, Letras, CPTM, Reitoria, Biênio da Poli e Odontologia.",
    destaque: "Passa na Poli" },
  // fins de semana, feriados e madrugadas
  { ref: "8012-10", nome: "Metrô Butantã ↔ Cidade Universitária", cor: "#264653", busp: true, dias: "Sábados, domingos, feriados e madrugadas", horario: "Fim de semana: quase o dia todo",
    resumo: "Faz o papel dos circulares quando os de segunda a sexta não rodam. Vai pela Reitoria e pelo Biênio até o Hospital Universitário e volta pela Parada Civil, Metalurgia, Mecânica e Praça do Relógio.",
    destaque: "Passa na Poli" },
  { ref: "8022-10", nome: "Metrô Butantã ↔ Cidade Universitária", cor: "#457b9d", busp: true, dias: "Sábados, domingos, feriados e madrugadas", horario: "Fim de semana: quase o dia todo",
    resumo: "A outra linha de fim de semana: vai pela Raia Olímpica, Mecânica II e IPT até o Hospital Universitário e volta pela Física, Farmácia e Química e Instituto Butantã." },
  // outras linhas que entram no campus (pagas com Bilhete Único)
  { ref: "177H-10", nome: "Metrô Santana ↔ Cidade Universitária", cor: "#6c757d", busp: false, dias: "Todos os dias", horario: "Dias úteis: cerca de 4h às 2h", intervalo: "A cada 12 a 30 min durante o dia",
    resumo: "Liga a Zona Norte à USP, passando pelo centro. No campus, passa pela Reitoria e pelo Biênio e termina no Terminal USP, ao lado da Parada Civil. Paga com Bilhete Único." },
  { ref: "701U-10", nome: "Metrô Santana ↔ Cidade Universitária", cor: "#8d99ae", busp: false, dias: "Dias úteis", horario: "Cerca de 4h à 1h", intervalo: "A cada 20 a 30 min durante o dia",
    resumo: "Outra ligação com o Metrô Santana. No campus, dá a volta pelo Hospital Universitário e pela Praça do Relógio e sai pela Metalurgia, Mecânica e Biênio. Paga com Bilhete Único." },
  { ref: "702U-10", nome: "Terminal Parque Dom Pedro II ↔ Cidade Universitária", cor: "#adb5bd", busp: false, dias: "Todos os dias", horario: "Dias úteis: cerca de 4h à 0h", intervalo: "A cada 12 a 30 min durante o dia",
    resumo: "Liga o centro à USP, com o mesmo caminho da 701U dentro do campus. Paga com Bilhete Único." },
];

// Grupos de exibição, na ordem da página.
export const GRUPOS = [
  { id: "semana", titulo: "Circulares de segunda a sexta", texto: "Gratuitos com o BUSP. Os outros passageiros pagam com Bilhete Único.", refs: ["8084-10", "8082-10", "8083-10", "8085-10"] },
  { id: "fim-de-semana", titulo: "Fins de semana, feriados e madrugadas", texto: "Também gratuitos com o BUSP.", refs: ["8012-10", "8022-10"] },
  { id: "outras", titulo: "Outras linhas que entram no campus", texto: "Linhas comuns, pagas com Bilhete Único.", refs: ["177H-10", "701U-10", "702U-10"] },
];
