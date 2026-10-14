// Guia dos circulares (aluno/circulares/): as linhas de ônibus que entram na Cidade Universitária.
// O desenho de cada linha no mapa vem de assets/dados/circulares.json (ferramentas/circulares.mjs);
// aqui ficam as informações para os cartões. Fontes conferidas em outubro de 2026: PUSP-C
// (puspc.usp.br/linhas-de-onibus), avisos da SPTrans, Jornal da USP (circulares de 2024),
// Moovit e BusInfo (pontos e horários). Revise no começo de cada semestre: linhas e horários mudam.

export const LINHAS = [
  // circulares de segunda a sexta (gratuitas com o BUSP)
  { ref: "8084-10", nome: "Metrô Butantã ↔ Cidade Universitária", cor: "#e4572e", busp: true, dias: "Segunda a sexta", horario: "5h às 0h40",
    resumo: "Volta de sentido único: sai do Metrô Butantã, passa pela Praça do Relógio e segue pela Av. Prof. Luciano Gualberto, com paradas no Biênio e na Elétrica da Poli, na FAU, na Geociências e na Letras.",
    destaque: "Passa na Poli" },
  { ref: "8082-10", nome: "Cidade Universitária ↔ Metrô Butantã", cor: "#2a9d8f", busp: true, dias: "Segunda a sexta", horario: "Cerca de 4h à 1h",
    resumo: "Pelas avenidas centrais do campus (Lineu Prestes, do Matão, Almeida Prado e Lúcio Martins Rodrigues) até o Metrô Butantã." },
  { ref: "8083-10", nome: "Cidade Universitária ↔ Metrô Butantã", cor: "#7b2cbf", busp: true, dias: "Segunda a sexta", horario: "Cerca de 4h às 2h",
    resumo: "Pela Av. Prof. Lineu Prestes e pela Av. da Universidade; a volta passa pela Reitoria e pela Av. Prof. Ernesto de Moraes Leme." },
  { ref: "8085-10", nome: "Circular USP (P3)", cor: "#e9c46a", busp: true, dias: "Segunda a sexta", horario: "Cerca de 4h à 1h30",
    resumo: "Volta só dentro do campus, a partir do P3, passando pela estação Cidade Universitária da CPTM e pela Rua do Anfiteatro." },
  // fins de semana, feriados e madrugadas
  { ref: "8012-10", nome: "Metrô Butantã ↔ Cidade Universitária", cor: "#264653", busp: true, dias: "Sábados, domingos, feriados e madrugadas", horario: "Fim de semana: quase o dia todo",
    resumo: "Faz o papel dos circulares quando os de segunda a sexta não rodam. Passa pela Av. da Universidade, Luciano Gualberto e Almeida Prado." },
  { ref: "8022-10", nome: "Metrô Butantã ↔ Cidade Universitária", cor: "#457b9d", busp: true, dias: "Sábados, domingos, feriados e madrugadas", horario: "Fim de semana: quase o dia todo",
    resumo: "A outra linha de fim de semana, pela Rua Prof. Mello Moraes, Almeida Prado e Luciano Gualberto." },
  // outras linhas que entram no campus (pagas com Bilhete Único)
  { ref: "177H-10", nome: "Metrô Santana ↔ Butantã USP", cor: "#6c757d", busp: false, dias: "Todos os dias", horario: "Consulte a SPTrans",
    resumo: "Liga a Zona Norte à USP, passando pelo centro. Paga com Bilhete Único." },
  { ref: "701U-10", nome: "Metrô Santana ↔ Butantã USP", cor: "#8d99ae", busp: false, dias: "Dias úteis", horario: "Consulte a SPTrans",
    resumo: "Outra ligação com o Metrô Santana. Paga com Bilhete Único." },
  { ref: "702U-10", nome: "Terminal Parque Dom Pedro II ↔ Butantã USP", cor: "#adb5bd", busp: false, dias: "Todos os dias", horario: "Consulte a SPTrans",
    resumo: "Liga o centro à USP. Paga com Bilhete Único." },
  { ref: "280BI1", nome: "São Bernardo do Campo ↔ Cidade Universitária", cor: "#b5838d", busp: false, dias: "Dias úteis", horario: "Consulte a EMTU",
    resumo: "Linha intermunicipal da EMTU (ARTESP), do ABC até a USP. Paga com o cartão da EMTU." },
];

// Grupos de exibição, na ordem da página.
export const GRUPOS = [
  { id: "semana", titulo: "Circulares de segunda a sexta", texto: "Gratuitos com o BUSP. Os outros passageiros pagam com Bilhete Único.", refs: ["8084-10", "8082-10", "8083-10", "8085-10"] },
  { id: "fim-de-semana", titulo: "Fins de semana, feriados e madrugadas", texto: "Também gratuitos com o BUSP.", refs: ["8012-10", "8022-10"] },
  { id: "outras", titulo: "Outras linhas que entram no campus", texto: "Linhas comuns, pagas com Bilhete Único ou com o cartão da EMTU.", refs: ["177H-10", "701U-10", "702U-10", "280BI1"] },
];
