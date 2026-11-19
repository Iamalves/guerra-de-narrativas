import pg from 'pg';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('Defina DATABASE_URL (veja backend/.env.example)');

export const pool = new pg.Pool({ connectionString: url, max: 10 });

/** roda fn numa transação: commit no fim, rollback se der erro */
export async function emTransacao<T>(fn: (c: pg.PoolClient) => Promise<T>): Promise<T> {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    const r = await fn(c);
    await c.query('COMMIT');
    return r;
  } catch (e) {
    await c.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    c.release();
  }
}

/** aplica, em ordem, os arquivos .sql de banco/migracoes que ainda não rodaram neste banco */
export async function aplicaMigracoes(): Promise<string[]> {
  const pasta = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'banco', 'migracoes');
  const arquivos = (await readdir(pasta)).filter(f => f.endsWith('.sql')).sort();
  await pool.query('CREATE TABLE IF NOT EXISTS migracoes (nome TEXT PRIMARY KEY, aplicada_em TIMESTAMPTZ NOT NULL DEFAULT now())');
  const feitas = new Set((await pool.query<{ nome: string }>('SELECT nome FROM migracoes')).rows.map(r => r.nome));
  const novas: string[] = [];
  for (const f of arquivos) {
    if (feitas.has(f)) continue;
    const sql = await readFile(join(pasta, f), 'utf8');
    await emTransacao(async c => {
      await c.query(sql);
      await c.query('INSERT INTO migracoes (nome) VALUES ($1)', [f]);
    });
    novas.push(f);
  }
  return novas;
}
