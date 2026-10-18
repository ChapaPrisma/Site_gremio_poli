// Cartões das subpáginas de uma ramificação, para páginas escritas à mão.
// Uso: <div data-componente="recursos" data-id="aluno"></div>
// Lista numerada com estado (seções do portal): data-estilo="portal"

import { cartoes } from "./pagina.js?v=202610181016";

export default function recursos(alvo, contexto) {
  const achado = contexto.encontrar(alvo.dataset.id);
  if (achado) alvo.innerHTML = cartoes(contexto, achado.no, achado.ancestrais, alvo.dataset.estilo);
}
