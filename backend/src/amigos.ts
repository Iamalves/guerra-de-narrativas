/* Amigos: o jogador convida outro pelo apelido; quando o convidado aceita, os dois entram na lista um do outro
   (amizades tem as duas linhas, A→B e B→A). O ranking compara vitórias, faixas, medalhas e recorde, que vêm do
   progresso guardado de cada um (progresso.dados). */
import { Router } from 'express';
import { pool } from './db.ts';
import { exigeConta } from './contas.ts';
import { limitador, validaNome } from './seguranca.ts';

const MAX_AMIGOS = 100;
const tentativas = limitador(40, 10 * 60 * 1000);

export interface LinhaRanking {
  id: string; nome: string; lado: 'pt' | 'br' | null; eu: boolean;
  vitorias: number; partidas: number; faixas: number; ouro: number; medalhas: number; recorde: number; convencidos: number;
}
type Pessoa = { id: string; nome: string; lado: 'pt' | 'br' | null };

const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {});
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
const lado = (v: string | null) => (v === 'pt' || v === 'br' ? v : null);
const idOk = (v: unknown) => typeof v === 'string' && /^\d{1,18}$/.test(v);

/** resume o progresso salvo de um jogador nos números do ranking */
export function resumoRanking(dados: unknown) {
  const d = obj(dados), est = obj(d.est), faixas = obj(d.faixas);
  return {
    vitorias: num(est.vitorias), partidas: num(est.partidas), convencidos: Math.round(num(est.conv)),
    faixas: Object.keys(faixas).length, ouro: Object.values(faixas).filter(v => num(v) >= 3).length,
    medalhas: Object.keys(obj(d.medalhas)).length, recorde: num(d.recorde),
  };
}

/** cria a amizade nos dois sentidos e apaga os convites entre os dois (numa transação) */
async function viramAmigos(a: string, b: string) {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    await c.query('INSERT INTO amizades (jogador_id, amigo_id) VALUES ($1, $2), ($2, $1) ON CONFLICT DO NOTHING', [a, b]);
    await c.query('DELETE FROM convites_amizade WHERE (de_id = $1 AND para_id = $2) OR (de_id = $2 AND para_id = $1)', [a, b]);
    await c.query('COMMIT');
  } catch (e) { await c.query('ROLLBACK'); throw e; } finally { c.release(); }
}

export const rotasAmigos = Router();

/* tudo da página: ranking (eu e meus amigos), convites recebidos e convites enviados */
rotasAmigos.get('/amigos', exigeConta, async (req, res) => {
  const eu = req.jogador!.id;
  const [r, rec, env] = await Promise.all([
    pool.query<{ id: string; nome: string; lado: string | null; dados: unknown }>(
      `SELECT j.id, j.nome, j.lado, p.dados FROM jogadores j LEFT JOIN progresso p ON p.jogador_id = j.id
       WHERE j.id = $1 OR j.id IN (SELECT amigo_id FROM amizades WHERE jogador_id = $1)`, [eu]),
    pool.query<{ id: string; nome: string; lado: string | null }>(
      `SELECT j.id, j.nome, j.lado FROM convites_amizade c JOIN jogadores j ON j.id = c.de_id WHERE c.para_id = $1 ORDER BY c.criado_em DESC`, [eu]),
    pool.query<{ id: string; nome: string; lado: string | null }>(
      `SELECT j.id, j.nome, j.lado FROM convites_amizade c JOIN jogadores j ON j.id = c.para_id WHERE c.de_id = $1 ORDER BY c.criado_em DESC`, [eu]),
  ]);
  const pessoa = (x: { id: string; nome: string; lado: string | null }): Pessoa => ({ id: String(x.id), nome: x.nome, lado: lado(x.lado) });
  const amigos: LinhaRanking[] = r.rows.map(x => ({ ...pessoa(x), eu: String(x.id) === eu, ...resumoRanking(x.dados) }));
  res.json({ amigos, recebidos: rec.rows.map(pessoa), enviados: env.rows.map(pessoa) });
});

/* convidar pelo apelido: { nome }. Se o outro já tinha me convidado, os dois viram amigos na hora */
rotasAmigos.post('/amigos', exigeConta, async (req, res) => {
  const eu = req.jogador!.id;
  if (!tentativas('a:' + eu)) { res.status(429).json({ erro: 'Muitas tentativas. Espere alguns minutos.' }); return; }
  const nome = validaNome(req.body?.nome);
  if (!nome) { res.status(400).json({ erro: 'Digite o apelido do seu amigo (de 3 a 20 letras ou números).' }); return; }
  const a = await pool.query<{ id: string; nome: string }>('SELECT id, nome FROM jogadores WHERE nome_chave = $1', [nome.toLowerCase()]);
  const outro = a.rows[0];
  if (!outro) { res.status(404).json({ erro: `Não achei ninguém com o apelido "${nome}". Confira como ele escreve.` }); return; }
  const id = String(outro.id);
  if (id === eu) { res.status(400).json({ erro: 'Esse é o seu próprio apelido.' }); return; }
  const ja = await pool.query<{ amigo: boolean; enviei: boolean; recebi: boolean; total: string }>(
    `SELECT EXISTS (SELECT 1 FROM amizades WHERE jogador_id = $1 AND amigo_id = $2) AS amigo,
            EXISTS (SELECT 1 FROM convites_amizade WHERE de_id = $1 AND para_id = $2) AS enviei,
            EXISTS (SELECT 1 FROM convites_amizade WHERE de_id = $2 AND para_id = $1) AS recebi,
            (SELECT count(*) FROM amizades WHERE jogador_id = $1) + (SELECT count(*) FROM convites_amizade WHERE de_id = $1) AS total`, [eu, id]);
  const s = ja.rows[0];
  if (s.amigo) { res.status(409).json({ erro: `${outro.nome} já é seu amigo.` }); return; }
  if (s.enviei) { res.status(409).json({ erro: `Você já convidou ${outro.nome}. Falta ele aceitar.` }); return; }
  if (s.recebi) { await viramAmigos(eu, id); res.json({ amigo: { id, nome: outro.nome }, aceito: true }); return; }
  if (Number(s.total) >= MAX_AMIGOS) { res.status(400).json({ erro: `Você já tem ${MAX_AMIGOS} amigos e convites. Tire alguém para convidar outro.` }); return; }
  await pool.query('INSERT INTO convites_amizade (de_id, para_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [eu, id]);
  res.status(201).json({ convite: { id, nome: outro.nome } });
});

/* aceitar o convite de :id */
rotasAmigos.post('/amigos/convites/:id/aceitar', exigeConta, async (req, res) => {
  const eu = req.jogador!.id, id = String(req.params.id);
  if (!idOk(id)) { res.status(400).json({ erro: 'Convite inválido.' }); return; }
  const c = await pool.query('SELECT 1 FROM convites_amizade WHERE de_id = $1 AND para_id = $2', [id, eu]);
  if (!c.rowCount) { res.status(404).json({ erro: 'Esse convite não existe mais.' }); return; }
  const n = await pool.query<{ n: string }>('SELECT count(*) AS n FROM amizades WHERE jogador_id = $1', [eu]);
  if (Number(n.rows[0].n) >= MAX_AMIGOS) { res.status(400).json({ erro: `Você já tem ${MAX_AMIGOS} amigos. Tire alguém para aceitar.` }); return; }
  await viramAmigos(eu, id);
  res.json({ ok: true });
});

/* recusar um convite recebido de :id, ou cancelar um enviado para :id */
rotasAmigos.delete('/amigos/convites/:id', exigeConta, async (req, res) => {
  const eu = req.jogador!.id, id = String(req.params.id);
  if (!idOk(id)) { res.status(400).json({ erro: 'Convite inválido.' }); return; }
  await pool.query('DELETE FROM convites_amizade WHERE (de_id = $1 AND para_id = $2) OR (de_id = $2 AND para_id = $1)', [eu, id]);
  res.status(204).end();
});

/* desfazer a amizade: sai da lista dos dois */
rotasAmigos.delete('/amigos/:id', exigeConta, async (req, res) => {
  const eu = req.jogador!.id, id = String(req.params.id);
  if (!idOk(id)) { res.status(400).json({ erro: 'Amigo inválido.' }); return; }
  await pool.query('DELETE FROM amizades WHERE (jogador_id = $1 AND amigo_id = $2) OR (jogador_id = $2 AND amigo_id = $1)', [eu, id]);
  res.status(204).end();
});
