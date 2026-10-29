-- Atualiza a dívida mostrada em Transparência para R$ 1,5 milhão (renegociada, segundo a gestão atual).
-- Rodar uma vez no SQL Editor do Supabase. Muda o site publicado na hora, sem precisar de commit.
update public.parametros
   set valor = jsonb_build_object('total', 1500000)
 where chave = 'divida';

-- Conferir:
select chave, valor from public.parametros where chave = 'divida';
