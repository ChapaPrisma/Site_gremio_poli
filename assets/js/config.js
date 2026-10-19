// Configuração global do site: menu, contato, redes e autoria.
// As ramificações (grandes seções) ficam em ramificacoes.js.
// Os caminhos (href) são relativos à raiz do site, sem barra no início,
// para funcionar igual em subpasta (github.io/Site_gremio_poli/) ou num domínio próprio.

import { encontrar, destino } from "./ramificacoes.js?v=202610191532";

const doRegistro = (id, rotulo) => {
  const { no } = encontrar(id);
  return { id, rotulo: rotulo || no.titulo, href: destino(no) };
};

export const site = {
  // Site de campanha da chapa Prisma. Por determinação da Comissão Eleitoral (19/10/2026), a marca é a da
  // chapa: nada de logo, cores ou dados oficiais do Grêmio. Se a chapa for eleita, volte a
  // nome "Grêmio Politécnico" / nomeCompleto "Grêmio Politécnico da USP" e à logo histórica (está no git).
  nome: "Prisma",
  nomeCompleto: "Prisma, chapa para o Grêmio Politécnico",
  descricao: "chapa para o Grêmio Politécnico",
  chapa: "https://chapaprisma.github.io/site_chapa/",

  // Faixa no topo de todas as páginas. Use null para esconder.
  aviso: {
    texto: "Site de campanha da chapa Prisma, com as cores da chapa. Se formos eleitos, o portal ganha a logo e a identidade históricas do Grêmio.",
    link: null,
    // Quem está fazendo este site (aparece na mesma faixa, com a logo).
    autoria: { texto: "", rotulo: "Conheça a chapa", href: "https://chapaprisma.github.io/site_chapa/", logo: "assets/img/marca/prisma-claro.svg?v=b6820360" },
  },

  // O índice completo das ramificações abre pelo botão "Índice" do cabeçalho.
  // `local: true` mantém o link na própria página (o rodapé com #contato existe em todas).
  menu: [
    doRegistro("representacao", "Representação"),
    doRegistro("parcerias", "Parcerias"),
    doRegistro("loja", "Loja"),
    { rotulo: "O Grêmio", href: "#gremio" },
    { rotulo: "Contato", href: "#contato", local: true },
  ],
  // Portal aberto do Novo Grêmio (Área do aluno). O nome ainda vai ser decidido.
  portal: {
    nome: "Portal Politécnico",
    lancamento: "Semana de Recepção de 2027",
    lancamentoCurto: "Recepção 2027",
  },

  chamada: doRegistro("aluno"),
  // Acessos mostrados no topo da gaveta do índice.
  acessos: [doRegistro("aluno"), doRegistro("politecnico"), doRegistro("admin")],

  // Banco das contas (Transparência e portal interno). Preencha com a URL e a chave pública
  // ("anon") do projeto Supabase; enquanto estiver vazio, o site lê assets/dados/contas.json.
  // Passo a passo em ferramentas/supabase/LEIA-ME.md.
  contas: {
    supabaseUrl: "https://axansbhajygavlihtuaa.supabase.co",
    supabaseChave: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4YW5zYmhhanlnYXZsaWh0dWFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0MjQ2NjIsImV4cCI6MjEwNzAwMDY2Mn0.IBEMZTvoymEGLmhLZjXWqRTfka-3OK97Kj22-gB1NeQ",
  },

  contato: {
    endereco: "Av. Prof. Almeida Prado, 128, Travessa 2, Cidade Universitária, São Paulo, SP",
    // Contato provisório: enquanto este site é a proposta da chapa Prisma, as mensagens vão para a chapa.
    // Depois da eleição, volte para o e-mail, o telefone e as redes do Grêmio.
    telefone: null,
    email: "chapa.poli.prisma@gmail.com",
    provisorio: "Contato provisório da chapa Prisma, enquanto este site é uma proposta.",
  },

  // Redes do Grêmio fora do contato enquanto o contato é o provisório da chapa.
  redes: [],

  autoria: "Site desenvolvido pela chapa Prisma.",
};
