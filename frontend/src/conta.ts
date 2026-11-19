/* Conta do jogador neste navegador e a troca de progresso entre o navegador e o servidor.
   O motor do jogo continua lendo e gravando o progresso no localStorage (gn_prog), como sempre:
   - antes de o jogo abrir, o progresso da conta é trazido do servidor para o gn_prog;
   - a cada salvaProg do motor, a ponte manda o gn_prog para o servidor (com um pequeno atraso, juntando várias mudanças).
   Quem joga sem conta continua só com o progresso deste navegador, que fica guardado à parte enquanto alguém usa uma conta. */
import { api, ErroApi, type Lado, type Progresso, type Sessao } from './api';
import { abreMenu, atualizaMenu } from './motor';

const K = { sessao: 'gn_sessao', conta: 'gn_conta', prog: 'gn_prog', partida: 'gn_partida', convidado: 'gn_convidado', pendente: 'gn_prog_pendente', entregas: 'gn_entregas' };
const le = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const grava = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* sem armazenamento: segue só na memória */ } };
const apaga = (k: string) => { try { localStorage.removeItem(k); } catch { /* idem */ } };
const json = <T,>(s: string | null): T | null => { try { return s ? (JSON.parse(s) as T) : null; } catch { return null; } };

export const leSessao = () => json<Sessao>(le(K.sessao));
export const guardaSessao = (s: Sessao) => grava(K.sessao, JSON.stringify(s));

/** o servidor corrigiu o progresso: o jogo passa a usar a versão dele (sem mandar de volta) */
function aceitaCorrecao(r: { corrigido?: boolean; dados?: Progresso }) {
  if (!r.corrigido || !r.dados) return;
  grava(K.prog, JSON.stringify(r.dados));
  ultimo = r.dados;
  const m = window as unknown as MotorGlobal;
  if (m.PROG) { const P = m.PROG as unknown as Record<string, unknown>; for (const k of Object.keys(P)) delete P[k]; Object.assign(P, r.dados); }
  atualizaMenu();
}

export type ResultadoPreparo = 'servidor' | 'levadoParaConta' | 'novo' | 'local';

/** traz o progresso da conta para o navegador antes de o jogo abrir */
export async function preparaProgresso(s: Sessao): Promise<ResultadoPreparo> {
  const { dados } = await api.leProgresso(s.token);
  const contaLocal = le(K.conta);
  if (contaLocal !== s.jogador.id) {
    if (contaLocal === null) {
      /* o que está no navegador é de quem jogou sem conta: guarda à parte (uma vez) para voltar ao sair */
      if (!le(K.convidado)) grava(K.convidado, JSON.stringify({ prog: le(K.prog), partida: le(K.partida) }));
    }
    const localSemConta = contaLocal === null ? json<Progresso>(le(K.prog)) : null;
    grava(K.conta, s.jogador.id);
    apaga(K.pendente);
    if (dados) {
      grava(K.prog, JSON.stringify(dados));
      apaga(K.partida); // a partida salva neste navegador não é desta conta
      return 'servidor';
    }
    /* conta nova: leva junto o progresso que já existia neste navegador */
    if (localSemConta && typeof localSemConta.fundo === 'number') {
      aceitaCorrecao(await api.salvaProgresso(s.token, localSemConta));
      return 'levadoParaConta';
    }
    apaga(K.prog); apaga(K.partida);
    return 'novo';
  }
  /* mesma conta de antes: se ficou algo sem enviar (sem internet na hora), o deste navegador vale e sobe agora,
     junto com as compras de F$ que ele já inclui */
  const local = json<Progresso>(le(K.prog));
  if (le(K.pendente) && local) {
    const env = aplicadas();
    await api.salvaProgresso(s.token, local, false, env).then(r => { apaga(K.pendente); tiraAplicadas(env); aceitaCorrecao(r); }).catch(() => {});
    return 'local';
  }
  if (dados) grava(K.prog, JSON.stringify(dados));
  return 'servidor';
}

/** sai da conta: o navegador volta a ter o progresso de quem joga sem conta */
export async function saiDaConta(s: Sessao | null) {
  if (s) await api.sai(s.token).catch(() => {});
  apaga(K.sessao); apaga(K.conta); apaga(K.pendente); apaga(K.entregas);
  const b = json<{ prog: string | null; partida: string | null }>(le(K.convidado));
  if (b?.prog) grava(K.prog, b.prog); else apaga(K.prog);
  if (b?.partida) grava(K.partida, b.partida); else apaga(K.partida);
  apaga(K.convidado);
}

/* ---------- envio do progresso enquanto joga ---------- */
export type EstadoEnvio = 'semConta' | 'salvo' | 'salvando' | 'erro';
let sessaoAtual: Sessao | null = null, estado: EstadoEnvio = 'semConta', espera: number | undefined, ultimo: Progresso | null = null;
const ouvintes = new Set<(e: EstadoEnvio) => void>();
const muda = (e: EstadoEnvio) => { estado = e; ouvintes.forEach(f => f(e)); };
export const estadoEnvio = () => estado;
export const ouveEnvio = (f: (e: EstadoEnvio) => void) => { ouvintes.add(f); return () => { ouvintes.delete(f); }; };

/* ---------- compras de F$: entrega no progresso ----------
   Compra aprovada → o jogo soma o F$ (PROG.fundo) e guarda o id em gn_entregas → o próximo envio do progresso leva os ids,
   e o servidor marca como entregues na mesma gravação. Um id em gn_entregas nunca é somado de novo. */
const aplicadas = (): string[] => json<string[]>(le(K.entregas)) ?? [];
const tiraAplicadas = (ids: string[]) => grava(K.entregas, JSON.stringify(aplicadas().filter(x => !ids.includes(x))));
interface MotorGlobal { PROG?: { fundo: number; donos: Record<string, number> }; salvaProg?: () => void }
/** o que uma rodada de entregas trouxe: F$ e heróis exclusivos (chaves) */
export interface Entregue { fs: number; herois: string[]; bonus: boolean; lados: Lado[] }

/** busca compras aprovadas ainda não entregues, soma o F$ e põe os heróis no jogo; devolve o que entrou agora */
export async function recebeEntregas(): Promise<Entregue> {
  const m = window as unknown as MotorGlobal, nada: Entregue = { fs: 0, herois: [], bonus: false, lados: [] };
  if (!sessaoAtual || !m.PROG || !m.salvaProg) return nada;
  const lista = await api.entregas(sessaoAtual.token).catch(() => []);
  const ja = aplicadas(), novas = lista.filter(e => !ja.includes(e.id));
  if (!novas.length) { if (ja.length) void envia(); return nada; }
  let soma = 0;
  const herois: string[] = [], lados: Lado[] = [];
  for (const e of novas) {
    soma += e.fs;
    /* pacote completo: todos os personagens e heróis do lado (a lista é a do jogo, com os exclusivos no fim) */
    const doLado = e.todos ? (window.GN_MOTOR?.SIDES[e.todos].order ?? []) : [];
    if (e.todos) lados.push(e.todos);
    for (const k of [...(e.herois ?? []), ...doLado]) if (!m.PROG.donos[k]) { m.PROG.donos[k] = 1; if (!e.todos) herois.push(k); }
  }
  grava(K.entregas, JSON.stringify([...ja, ...novas.map(e => e.id)]));
  m.PROG.fundo += soma;
  m.salvaProg();          // grava o gn_prog e avisa a ponte (que marca como pendente)
  document.querySelectorAll('.saldo').forEach(el => { el.textContent = 'F$ ' + m.PROG!.fundo.toLocaleString('pt-BR'); });
  await envia();          // manda já, sem esperar o atraso normal
  return { fs: soma, herois, bonus: novas.some(e => e.bonus), lados };
}

async function envia(keepalive = false) {
  window.clearTimeout(espera); espera = undefined;
  if (!sessaoAtual) return;
  if (!ultimo) { const l = json<Progresso>(le(K.prog)); if (!l) return; ultimo = l; }
  muda('salvando');
  const env = aplicadas();
  try {
    const r = await api.salvaProgresso(sessaoAtual.token, ultimo, keepalive, env);
    apaga(K.pendente); tiraAplicadas(env); aceitaCorrecao(r); muda('salvo');
  } catch (e) {
    muda('erro');
    if (e instanceof ErroApi && e.status === 401) return; // sessão vencida: o selo mostra o erro
    espera = window.setTimeout(() => void envia(), 15000);
  }
}

/** liga o motor do jogo ao React: endereço da API, token e aviso de progresso salvo */
export function ligaPonte(s: Sessao | null) {
  sessaoAtual = s;
  muda(s ? 'salvo' : 'semConta');
  window.GN_PONTE = {
    api: (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? '',
    dev: import.meta.env.DEV,
    token: () => sessaoAtual?.token ?? null,
    progSalvo: prog => {
      atualizaMenu(); // saldo de F$ e conquistas na tela do menu
      if (!sessaoAtual) return;
      ultimo = JSON.parse(JSON.stringify(prog)) as Progresso;
      grava(K.pendente, '1');
      window.clearTimeout(espera);
      espera = window.setTimeout(() => void envia(), 1200);
    },
    abreMenu,
  };
  /* fechando a aba com algo para enviar: manda na hora (keepalive deixa terminar depois de a página fechar) */
  addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && espera !== undefined) void envia(true); });
}
