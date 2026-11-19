import { Router, type Request, type Response, type NextFunction } from 'express';
import { pool } from './db.ts';
import { hashSenha, confereSenha, novoToken, hashToken, validaNome, validaSenha, validaEmail, limitador } from './seguranca.ts';

const DIAS_SESSAO = 60;
/** lado: 'pt' (Esquerda) ou 'br' (Direita); null enquanto o jogador não escolheu */
export interface Jogador { id: string; nome: string; lado: 'pt' | 'br' | null }
declare module 'express-serve-static-core' { interface Request { jogador?: Jogador } }
const ladoOk = (v: unknown): v is 'pt' | 'br' => v === 'pt' || v === 'br';

/** lê "Authorization: Bearer <token>" e, se a sessão valer, põe o jogador em req.jogador (sem token segue sem jogador) */
export async function identifica(req: Request, _res: Response, next: NextFunction) {
  const m = /^Bearer (\S+)$/.exec(req.get('authorization') || '');
  if (m) {
    const r = await pool.query<{ id: string; nome: string; lado: string | null }>(
      `SELECT j.id, j.nome, j.lado FROM sessoes s JOIN jogadores j ON j.id = s.jogador_id
       WHERE s.token_hash = $1 AND s.expira_em > now()`, [hashToken(m[1])]);
    const j = r.rows[0];
    if (j) req.jogador = { id: String(j.id), nome: j.nome, lado: ladoOk(j.lado) ? j.lado : null };
  }
  next();
}
export function exigeConta(req: Request, res: Response, next: NextFunction) {
  if (!req.jogador) { res.status(401).json({ erro: 'Entre na sua conta.' }); return; }
  next();
}

async function abreSessao(jogadorId: string) {
  const { token, hash } = novoToken();
  await pool.query(`INSERT INTO sessoes (token_hash, jogador_id, expira_em) VALUES ($1, $2, now() + make_interval(days => $3))`, [hash, jogadorId, DIAS_SESSAO]);
  /* limpeza: sessões vencidas deste jogador */
  await pool.query('DELETE FROM sessoes WHERE jogador_id = $1 AND expira_em < now()', [jogadorId]);
  return token;
}

const tentativas = limitador(20, 10 * 60 * 1000);
export const rotasContas = Router();

/* criar conta: { nome, email, senha } → { token, jogador } */
rotasContas.post('/contas', async (req, res) => {
  if (!tentativas('c:' + req.ip)) { res.status(429).json({ erro: 'Muitas tentativas. Espere alguns minutos.' }); return; }
  const nome = validaNome(req.body?.nome), email = validaEmail(req.body?.email), senha = req.body?.senha;
  /* lado escolhido antes de criar a conta (jogando sem conta) vai junto */
  const lado = ladoOk(req.body?.lado) ? req.body.lado : null;
  if (!nome) { res.status(400).json({ erro: 'O apelido precisa ter de 3 a 20 letras ou números.' }); return; }
  if (!email) { res.status(400).json({ erro: 'Digite um e-mail válido, como nome@exemplo.com.' }); return; }
  if (!validaSenha(senha)) { res.status(400).json({ erro: 'A senha precisa ter pelo menos 6 caracteres.' }); return; }
  const hash = await hashSenha(senha);
  /* apelido e e-mail são únicos: confere os dois antes, para dizer qual está em uso */
  const ja = await pool.query<{ nome_chave: string; email: string | null }>(
    'SELECT nome_chave, email FROM jogadores WHERE nome_chave = $1 OR lower(email) = $2', [nome.toLowerCase(), email]);
  if (ja.rows.some(x => x.email?.toLowerCase() === email)) { res.status(409).json({ erro: 'Esse e-mail já tem uma conta. Entre com ele.' }); return; }
  if (ja.rows.length) { res.status(409).json({ erro: 'Esse apelido já existe. Escolha outro ou entre com ele.' }); return; }
  let r;
  try {
    r = await pool.query<{ id: string }>(
      'INSERT INTO jogadores (nome, nome_chave, email, senha_hash, lado) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [nome, nome.toLowerCase(), email, hash, lado]);
  } catch (e) {
    /* duas contas iguais criadas ao mesmo tempo: o índice único do banco segura a segunda */
    if ((e as { code?: string }).code === '23505') { res.status(409).json({ erro: 'Esse apelido ou e-mail acabou de ser usado. Tente outro.' }); return; }
    throw e;
  }
  const id = String(r.rows[0].id);
  res.status(201).json({ token: await abreSessao(id), jogador: { id, nome, lado } });
});

/* entrar: { nome, senha }, em que nome pode ser o apelido ou o e-mail → { token, jogador } */
rotasContas.post('/sessoes', async (req, res) => {
  if (!tentativas('s:' + req.ip)) { res.status(429).json({ erro: 'Muitas tentativas. Espere alguns minutos.' }); return; }
  const login = typeof req.body?.nome === 'string' ? req.body.nome : '', senha = req.body?.senha;
  const email = login.includes('@') ? validaEmail(login) : null, nome = email ? null : validaNome(login);
  const r = (email || nome) && typeof senha === 'string'
    ? await pool.query<{ id: string; nome: string; senha_hash: string; lado: string | null }>(
        email ? 'SELECT id, nome, senha_hash, lado FROM jogadores WHERE lower(email) = $1' : 'SELECT id, nome, senha_hash, lado FROM jogadores WHERE nome_chave = $1',
        [email ?? nome!.toLowerCase()])
    : { rows: [] };
  const j = r.rows[0];
  if (!j || !(await confereSenha(senha as string, j.senha_hash))) { res.status(401).json({ erro: 'Apelido, e-mail ou senha não conferem.' }); return; }
  const id = String(j.id);
  res.json({ token: await abreSessao(id), jogador: { id, nome: j.nome, lado: ladoOk(j.lado) ? j.lado : null } });
});

/* perfil: { lado } troca o lado que o jogador defende */
rotasContas.put('/perfil', exigeConta, async (req, res) => {
  if (!ladoOk(req.body?.lado)) { res.status(400).json({ erro: 'Escolha Esquerda ou Direita.' }); return; }
  await pool.query('UPDATE jogadores SET lado = $2 WHERE id = $1', [req.jogador!.id, req.body.lado]);
  res.json({ jogador: { ...req.jogador!, lado: req.body.lado } });
});

/* sair: apaga a sessão deste token */
rotasContas.delete('/sessoes', async (req, res) => {
  const m = /^Bearer (\S+)$/.exec(req.get('authorization') || '');
  if (m) await pool.query('DELETE FROM sessoes WHERE token_hash = $1', [hashToken(m[1])]);
  res.status(204).end();
});

/* quem sou eu (confere se o token ainda vale) */
rotasContas.get('/eu', exigeConta, (req, res) => { res.json({ jogador: req.jogador }); });
