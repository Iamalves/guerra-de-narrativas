/* Cliente da API. Em desenvolvimento a API fica no mesmo endereço (o Vite encaminha /api);
   publicado, VITE_API_URL aponta para o backend (ex.: https://api.meujogo.com.br). */
export const API = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? '';

export type Lado = 'pt' | 'br';
export interface Jogador { id: string; nome: string; lado?: Lado | null }
export interface Sessao { token: string; jogador: Jogador }
export type Progresso = Record<string, unknown> & { fundo: number };

export class ErroApi extends Error {
  status: number;
  constructor(status: number, mensagem: string) { super(mensagem); this.status = status; }
}

async function chama<T>(caminho: string, op: { metodo?: string; corpo?: unknown; token?: string | null; keepalive?: boolean } = {}): Promise<T> {
  let r: Response;
  try {
    r = await fetch(API + '/api' + caminho, {
      method: op.metodo ?? 'GET',
      headers: { ...(op.corpo !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(op.token ? { Authorization: 'Bearer ' + op.token } : {}) },
      body: op.corpo !== undefined ? JSON.stringify(op.corpo) : undefined,
      keepalive: op.keepalive,
    });
  } catch {
    throw new ErroApi(0, 'Sem conexão com o servidor do jogo.');
  }
  if (r.status === 204) return undefined as T;
  const dados = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = (dados as { erro?: string }).erro;
    /* sem mensagem da API e erro 5xx: o servidor nem respondeu (fora do ar, ou o proxy não achou o backend) */
    throw new ErroApi(msg || r.status < 500 ? r.status : 0, msg || (r.status >= 500 ? 'O servidor do jogo não respondeu. Tente de novo em instantes ou jogue sem conta.' : 'Erro ' + r.status));
  }
  return dados as T;
}

export const api = {
  criaConta: (nome: string, email: string, senha: string, lado?: Lado | null) => chama<Sessao>('/contas', { metodo: 'POST', corpo: { nome, email, senha, lado } }),
  defineLado: (token: string, lado: Lado) => chama<{ jogador: Jogador }>('/perfil', { metodo: 'PUT', corpo: { lado }, token }),
  /** login: apelido ou e-mail */
  entra: (login: string, senha: string) => chama<Sessao>('/sessoes', { metodo: 'POST', corpo: { nome: login, senha } }),
  sai: (token: string) => chama<void>('/sessoes', { metodo: 'DELETE', token }),
  eu: (token: string) => chama<{ jogador: Jogador }>('/eu', { token }),
  leProgresso: (token: string) => chama<{ dados: Progresso | null; atualizadoEm: string | null }>('/progresso', { token }),
  /** entregas: compras de F$ que este progresso já inclui (o servidor marca como entregues junto) */
  salvaProgresso: (token: string, dados: Progresso, keepalive = false, entregas: string[] = []) =>
    /* corrigido: o servidor não aceitou parte do progresso (F$ ou personagens sem como ter ganho) e manda a versão certa */
    chama<{ ok: true; atualizadoEm: string; entregues: string[]; corrigido?: boolean; dados?: Progresso }>('/progresso', { metodo: 'PUT', corpo: { dados, entregas }, token, keepalive }),
  /** com token, diz também se a primeira compra tem bônus e quais pacotes de heróis já foram comprados */
  pacotes: (token?: string | null) => chama<{ ligado: boolean; simulado: boolean; bonusPrimeira: number; pacotes: Pacote[]; herois: PacoteHerois[] }>('/pacotes', { token }),
  compra: (token: string, pacote: string) => chama<{ id: string; url: string }>('/compras', { metodo: 'POST', corpo: { pacote }, token }),
  situacaoCompra: (token: string, id: string) => chama<Compra>('/compras/' + encodeURIComponent(id), { token }),
  entregas: (token: string) => chama<{ id: string; pacote: string; fs: number; bonus: boolean; herois: string[]; todos?: Lado | null }[]>('/entregas', { token }),
  amigos: (token: string) => chama<{ amigos: Amigo[]; recebidos: Pessoa[]; enviados: Pessoa[] }>('/amigos', { token }),
  /** convida pelo apelido; se o outro já tinha convidado, viram amigos na hora (aceito: true) */
  convida: (token: string, nome: string) => chama<{ convite?: Pessoa; amigo?: Pessoa; aceito?: boolean }>('/amigos', { metodo: 'POST', corpo: { nome }, token }),
  aceita: (token: string, id: string) => chama<{ ok: true }>('/amigos/convites/' + encodeURIComponent(id) + '/aceitar', { metodo: 'POST', token }),
  /** recusa um convite recebido ou cancela um enviado */
  tiraConvite: (token: string, id: string) => chama<void>('/amigos/convites/' + encodeURIComponent(id), { metodo: 'DELETE', token }),
  tiraAmigo: (token: string, id: string) => chama<void>('/amigos/' + encodeURIComponent(id), { metodo: 'DELETE', token }),
};

export interface Pessoa { id: string; nome: string; lado?: Lado | null }

/** uma linha do ranking de amigos (eu = a própria conta) */
export interface Amigo {
  id: string; nome: string; lado: Lado | null; eu: boolean;
  vitorias: number; partidas: number; faixas: number; ouro: number; medalhas: number; recorde: number; convencidos: number;
}

export interface Pacote { id: string; nome: string; fs: number; centavos: number; destaque?: string }
/** pacote com heróis exclusivos (e F$, no de boas-vindas) */
export interface PacoteHerois { id: string; nome: string; lado: Lado; centavos: number; fs: number; herois: string[]; boasVindas?: boolean; todos?: boolean; comprado: boolean }
export interface Compra { id: string; pacote: string; fs: number; herois?: string[]; status: 'criada' | 'pendente' | 'aprovada' | 'recusada' | 'cancelada' | 'estornada'; entregue: boolean }
