import { Router } from 'express';
import type pg from 'pg';
import { pool, emTransacao } from './db.ts';
import { normalizaRegistro, validaProgresso, type RegistroNormalizado } from './registro.ts';
import { exigeConta } from './contas.ts';

/** insere várias linhas de uma vez (em blocos, para não passar do limite de parâmetros do Postgres) */
async function insereVarias(c: pg.PoolClient, tabela: string, colunas: string[], linhas: unknown[][]) {
  const porBloco = Math.floor(30000 / colunas.length);
  for (let i = 0; i < linhas.length; i += porBloco) {
    const bloco = linhas.slice(i, i + porBloco), vals: unknown[] = [];
    const ph = bloco.map(l => '(' + l.map(v => { vals.push(v); return '$' + vals.length; }).join(',') + ')').join(',');
    await c.query(`INSERT INTO ${tabela} (${colunas.join(',')}) VALUES ${ph}`, vals);
  }
}

/** grava (ou regrava) uma partida. A mesma partida pode chegar de novo (em andamento ao sair para o menu, continuada,
    abandonada, terminada): troca tudo pelo novo. Uma partida de um jogador não pode ser sobrescrita por outro, e uma
    partida que já terminou não volta a "em andamento" (um envio atrasado não apaga o resultado). */
export async function gravaPartida(n: RegistroNormalizado, registro: unknown, jogadorId: string | null): Promise<boolean> {
  return emTransacao(async c => {
    const p = n.partida;
    const r = await c.query(
      `INSERT INTO partidas (id, jogador_id, versao, inicio, uf, lado, dificuldade, modo, resultado, rodada, apoio, verba, registro)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       ON CONFLICT (id) DO UPDATE SET jogador_id = COALESCE(EXCLUDED.jogador_id, partidas.jogador_id), versao = EXCLUDED.versao,
         inicio = EXCLUDED.inicio, uf = EXCLUDED.uf, lado = EXCLUDED.lado, dificuldade = EXCLUDED.dificuldade, modo = EXCLUDED.modo,
         resultado = EXCLUDED.resultado, rodada = EXCLUDED.rodada, apoio = EXCLUDED.apoio, verba = EXCLUDED.verba,
         registro = EXCLUDED.registro, recebido_em = now()
       WHERE (partidas.jogador_id IS NULL OR partidas.jogador_id = EXCLUDED.jogador_id)
         AND (partidas.resultado IS NULL OR EXCLUDED.resultado IS NOT NULL)
       RETURNING id`,
      [p.id, jogadorId, p.versao, p.inicio, p.uf, p.lado, p.dificuldade, p.modo, p.resultado, p.rodada, p.apoio, p.verba, JSON.stringify(registro)]);
    if (!r.rowCount) return false;
    await c.query('DELETE FROM partida_eventos WHERE partida_id = $1', [p.id]);
    await c.query('DELETE FROM partida_rodadas WHERE partida_id = $1', [p.id]);
    await insereVarias(c, 'partida_eventos', ['partida_id', 'ordem', 'tipo', 'rodada', 'segundo', 'verba', 'personagem', 'x', 'y', 'dados'],
      n.eventos.map(e => [p.id, e.ordem, e.tipo, e.rodada, e.segundo, e.verba, e.personagem, e.x, e.y, JSON.stringify(e.dados)]));
    await insereVarias(c, 'partida_rodadas', ['partida_id', 'rodada', 'apoio', 'perdeu', 'verba', 'renda', 'convencidos', 'duracao', 'dados'],
      n.rodadas.map(x => [p.id, x.rodada, x.apoio, x.perdeu, x.verba, x.renda, x.convencidos, x.duracao, JSON.stringify(x.dados)]));
    return true;
  });
}

export const rotasJogo = Router();

/* registro de uma partida (com ou sem conta) */
rotasJogo.post('/partidas', async (req, res) => {
  /* o jogo só tira um registro da fila com resposta de sucesso, e para a fila no primeiro erro: um registro que nunca vai
     servir (inválido ou de outro jogador) responde 202 "descartado", senão travaria todos os seguintes */
  const n = normalizaRegistro(req.body);
  if (typeof n === 'string') { res.status(202).json({ ok: false, descartado: n }); return; }
  const ok = await gravaPartida(n, req.body, req.jogador?.id ?? null);
  if (!ok) { res.status(202).json({ ok: false, descartado: 'partida de outro jogador ou já terminada' }); return; }
  res.json({ ok: true });
});

/* progresso do jogador: GET devolve { dados, atualizadoEm } (dados vazio se ainda não salvou) */
rotasJogo.get('/progresso', exigeConta, async (req, res) => {
  const r = await pool.query<{ dados: unknown; atualizado_em: Date }>('SELECT dados, atualizado_em FROM progresso WHERE jogador_id = $1', [req.jogador!.id]);
  res.json({ dados: r.rows[0]?.dados ?? null, atualizadoEm: r.rows[0]?.atualizado_em ?? null });
});

/* PUT { dados, entregas? }: guarda o progresso (vale o último enviado).
   "entregas" são as compras de F$ que o jogo já somou neste progresso: elas são marcadas como entregues na mesma
   transação em que o progresso é gravado, então o F$ comprado não se perde nem é somado duas vezes */
rotasJogo.put('/progresso', exigeConta, async (req, res) => {
  const p = validaProgresso(req.body?.dados);
  if (typeof p === 'string') { res.status(400).json({ erro: p }); return; }
  const entregas = Array.isArray(req.body?.entregas) ? req.body.entregas.filter((x: unknown) => typeof x === 'string' && /^[0-9a-f-]{36}$/.test(x)).slice(0, 50) : [];
  const r = await emTransacao(async c => {
    const g = await c.query<{ atualizado_em: Date }>(
      `INSERT INTO progresso (jogador_id, dados) VALUES ($1, $2)
       ON CONFLICT (jogador_id) DO UPDATE SET dados = EXCLUDED.dados, atualizado_em = now() RETURNING atualizado_em`,
      [req.jogador!.id, JSON.stringify(p)]);
    const e = entregas.length
      ? await c.query<{ id: string }>(
          `UPDATE compras SET entregue_em = now(), atualizada_em = now()
           WHERE id = ANY($1::uuid[]) AND jogador_id = $2 AND status = 'aprovada' AND entregue_em IS NULL RETURNING id`,
          [entregas, req.jogador!.id])
      : { rows: [] };
    return { atualizadoEm: g.rows[0].atualizado_em, entregues: e.rows.map(x => x.id) };
  });
  res.json({ ok: true, ...r });
});

/* resumo para o equilíbrio: por personagem, quantas vezes foi colocado e em quantas partidas vencidas e perdidas */
rotasJogo.get('/analise/personagens', async (_req, res) => {
  const r = await pool.query(
    `SELECT personagem, lado, count(*)::int AS colocados, count(DISTINCT partida_id)::int AS partidas,
            count(DISTINCT partida_id) FILTER (WHERE resultado = 'vitoria')::int AS vitorias,
            count(DISTINCT partida_id) FILTER (WHERE resultado = 'derrota')::int AS derrotas,
            round(avg(rodada), 1) AS rodada_media_colocacao
     FROM colocacoes GROUP BY personagem, lado ORDER BY colocados DESC`);
  res.json(r.rows);
});
