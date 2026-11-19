/* Lado que o jogador defende (Esquerda 'pt' ou Direita 'br'): escolhido na primeira entrada e trocado no Perfil.
   Com conta, fica no servidor (jogadores.lado) e numa cópia na sessão guardada; sem conta, só neste navegador. */
import { api, type Lado, type Sessao } from './api';
import { guardaSessao } from './conta';

const K = 'gn_lado';
const leLocal = (): Lado | null => { try { const v = localStorage.getItem(K); return v === 'pt' || v === 'br' ? v : null; } catch { return null; } };
const gravaLocal = (l: Lado) => { try { localStorage.setItem(K, l); } catch { /* sem armazenamento */ } };

export const nomeLado = (l: Lado) => (l === 'pt' ? 'Esquerda' : 'Direita');

/** o lado do perfil: o da conta, se houver; senão o deste navegador */
export function ladoAtual(s: Sessao | null): Lado | null {
  return s?.jogador.lado ?? leLocal();
}

/** troca o lado (e, com conta, salva no servidor) */
export async function defineLado(s: Sessao | null, lado: Lado): Promise<void> {
  gravaLocal(lado);
  if (!s) return;
  s.jogador.lado = lado;
  guardaSessao(s);
  await api.defineLado(s.token, lado);
}

/** ao entrar numa conta sem lado, leva o lado escolhido neste navegador */
export async function levaLadoParaConta(s: Sessao): Promise<void> {
  const local = leLocal();
  if (!s.jogador.lado && local) await defineLado(s, local).catch(() => {});
  else if (s.jogador.lado) gravaLocal(s.jogador.lado);
}
