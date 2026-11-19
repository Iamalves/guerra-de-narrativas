import { randomBytes, scrypt as scryptCb, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCb) as (senha: string, sal: Buffer, tam: number, op: { N: number; r: number; p: number }) => Promise<Buffer>;
const PARAMS = { N: 16384, r: 8, p: 1 };

/** hash da senha no formato scrypt$N$sal$hash (sal e hash em base64url) */
export async function hashSenha(senha: string): Promise<string> {
  const sal = randomBytes(16);
  const h = await scrypt(senha, sal, 32, PARAMS);
  return `scrypt$${PARAMS.N}$${sal.toString('base64url')}$${h.toString('base64url')}`;
}

export async function confereSenha(senha: string, guardado: string): Promise<boolean> {
  const [alg, n, sal, hash] = guardado.split('$');
  if (alg !== 'scrypt' || !sal || !hash) return false;
  const esperado = Buffer.from(hash, 'base64url');
  const h = await scrypt(senha, Buffer.from(sal, 'base64url'), esperado.length, { ...PARAMS, N: Number(n) });
  return h.length === esperado.length && timingSafeEqual(h, esperado);
}

/** token de sessão: o jogador guarda o token; o banco guarda só o hash dele */
export function novoToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString('base64url');
  return { token, hash: hashToken(token) };
}
export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

/** apelido: 3 a 20 caracteres, letras (com acento), números, espaço, ponto, hífen e sublinhado */
export function validaNome(nome: unknown): string | null {
  if (typeof nome !== 'string') return null;
  const n = nome.trim().replace(/\s+/g, ' ');
  return /^[\p{L}\p{N} ._-]{3,20}$/u.test(n) ? n : null;
}
export const validaSenha = (s: unknown): s is string => typeof s === 'string' && s.length >= 6 && s.length <= 200;

/** e-mail: formato nome@dominio.ext, sem espaços, até 254 caracteres; devolve em minúsculas (ou null se não serve) */
export function validaEmail(email: unknown): string | null {
  if (typeof email !== 'string') return null;
  const e = email.trim().toLowerCase();
  if (e.length > 254) return null;
  const m = /^([a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*)@((?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63})$/.exec(e);
  return m && m[1].length <= 64 ? e : null;
}

/** limite simples de tentativas por chave (IP), em memória: protege o login de tentativas em massa */
export function limitador(max: number, janelaMs: number) {
  const mapa = new Map<string, { n: number; ate: number }>();
  return (chave: string): boolean => {
    const agora = Date.now();
    const r = mapa.get(chave);
    if (!r || r.ate < agora) { mapa.set(chave, { n: 1, ate: agora + janelaMs }); return true; }
    r.n++;
    if (mapa.size > 10000) for (const [k, v] of mapa) if (v.ate < agora) mapa.delete(k);
    return r.n <= max;
  };
}
