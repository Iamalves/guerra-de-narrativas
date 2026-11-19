/* Confere no Mercado Pago todas as compras ainda abertas (criada ou pendente) dos últimos 7 dias e atualiza o status.
   Compra que ficar aprovada é entregue pelo próprio jogo na próxima vez que o jogador abrir (o F$ entra pelo progresso).
   Uso, na pasta do projeto:  npm run confere-compras -w backend */
import { pool } from '../db.ts';
import { confereNoMercadoPago } from '../pagamentos.ts';

if (!process.env.MP_ACCESS_TOKEN?.trim()) { console.error('Sem MP_ACCESS_TOKEN no backend/.env.'); process.exit(1); }
const abertas = (await pool.query<{ id: string; nome: string; pacote: string; status: string }>(
  `SELECT c.id, j.nome, c.pacote, c.status FROM compras c JOIN jogadores j ON j.id = c.jogador_id
   WHERE c.status IN ('criada', 'pendente') AND NOT c.simulada AND c.criada_em > now() - interval '7 days' ORDER BY c.criada_em`)).rows;
for (const c of abertas) {
  await confereNoMercadoPago(c.id);
  const agora = (await pool.query<{ status: string }>('SELECT status FROM compras WHERE id = $1', [c.id])).rows[0].status;
  console.log(`${c.nome} | ${c.pacote} | ${c.status} → ${agora}`);
}
console.log(`${abertas.length} compra(s) aberta(s) conferida(s).`);
await pool.end();
