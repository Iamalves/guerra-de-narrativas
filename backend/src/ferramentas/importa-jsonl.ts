/* Importa para o banco os registros de um arquivo .jsonl (uma partida por linha): o registros/partidas.jsonl do servidor antigo
   ou o arquivo baixado em Opções → Registro das partidas. As partidas entram sem jogador (não dá para saber de quem eram).
   Uso, na pasta backend:  npm run importa-jsonl -- ../registros/partidas.jsonl */
import { readFile } from 'node:fs/promises';
import { aplicaMigracoes, pool } from '../db.ts';
import { normalizaRegistro } from '../registro.ts';
import { gravaPartida } from '../partidas.ts';

const arquivo = process.argv[2];
if (!arquivo) { console.error('Diga o arquivo: npm run importa-jsonl -- caminho/do/arquivo.jsonl'); process.exit(1); }

await aplicaMigracoes();
let ok = 0, ruins = 0;
for (const linha of (await readFile(arquivo, 'utf8')).split(/\r?\n/)) {
  if (!linha.trim()) continue;
  try {
    const reg = JSON.parse(linha), n = normalizaRegistro(reg);
    if (typeof n === 'string') { ruins++; console.warn('ignorada:', n); continue; }
    if (await gravaPartida(n, reg, null)) ok++; else ruins++;
  } catch (e) { ruins++; console.warn('linha inválida:', e instanceof Error ? e.message : e); }
}
console.log(`${ok} partidas importadas, ${ruins} ignoradas`);
await pool.end();
