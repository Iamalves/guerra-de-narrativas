/* Registro de uma partida, como o jogo manda (veja regNovo/regEv/regRodada/regFim no motor):
   { v, id, inicio, uf, lado, dificuldade, modo, ..., ev: [{t, r, s, verba, ...}], rodadas: [{r, apoio, ...}], fim?: {...} }
   Aqui ele é conferido e quebrado nas linhas das tabelas partidas, partida_eventos e partida_rodadas. */

export interface LinhaPartida {
  id: string; versao: number | null; inicio: string | null; uf: string | null; lado: string | null;
  dificuldade: string | null; modo: string | null; resultado: string | null; rodada: number | null;
  apoio: number | null; verba: number | null;
}
export interface LinhaEvento {
  ordem: number; tipo: string; rodada: number | null; segundo: number | null; verba: number | null;
  personagem: string | null; x: number | null; y: number | null; dados: Record<string, unknown>;
}
export interface LinhaRodada {
  rodada: number; apoio: number | null; perdeu: number | null; verba: number | null; renda: number | null;
  convencidos: number | null; duracao: number | null; dados: Record<string, unknown>;
}
export interface RegistroNormalizado { partida: LinhaPartida; eventos: LinhaEvento[]; rodadas: LinhaRodada[] }

const LIMITE_EVENTOS = 20000, LIMITE_RODADAS = 1000;
const obj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const int = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : null);
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const txt = (v: unknown, max = 40): string | null => (typeof v === 'string' && v.length > 0 ? v.slice(0, max) : null);
const data = (v: unknown): string | null => (typeof v === 'string' && !Number.isNaN(Date.parse(v)) ? new Date(v).toISOString() : null);

/** confere e normaliza; devolve uma mensagem de erro (string) quando o registro não serve */
export function normalizaRegistro(r: unknown): RegistroNormalizado | string {
  if (!obj(r)) return 'registro precisa ser um objeto JSON';
  if (typeof r.id !== 'string' || !/^[a-z0-9]{6,40}$/i.test(r.id)) return 'registro sem id válido';
  const ev = Array.isArray(r.ev) ? r.ev : [];
  const rods = Array.isArray(r.rodadas) ? r.rodadas : [];
  if (ev.length > LIMITE_EVENTOS) return 'eventos demais';
  if (rods.length > LIMITE_RODADAS) return 'rodadas demais';
  const fim = obj(r.fim) ? r.fim : null;
  /* partida em andamento (enviada ao sair para o menu ou ao fechar a aba): os números da hora do envio */
  const andamento = !fim && obj(r.andamento) ? r.andamento : null;
  const ultima = obj(rods[rods.length - 1]) ? (rods[rods.length - 1] as Record<string, unknown>) : null;
  const agora = fim ?? andamento;

  const partida: LinhaPartida = {
    id: r.id, versao: int(r.v), inicio: data(r.inicio), uf: txt(r.uf, 4), lado: txt(r.lado, 4),
    dificuldade: txt(r.dificuldade, 12), modo: txt(r.modo, 20),
    resultado: fim ? txt(fim.resultado, 20) : null,
    rodada: agora ? int(agora.rodada) : ultima ? int(ultima.r) : null,
    apoio: agora ? int(agora.apoio) : ultima ? int(ultima.apoio) : null,
    verba: agora ? int(agora.verba) : ultima ? int(ultima.verba) : null,
  };

  const eventos: LinhaEvento[] = [];
  ev.forEach((e, i) => {
    if (!obj(e) || typeof e.t !== 'string') return;
    eventos.push({
      ordem: i, tipo: e.t.slice(0, 30), rodada: int(e.r), segundo: num(e.s), verba: int(e.verba),
      personagem: txt(e.k, 30), x: int(e.x), y: int(e.y), dados: e,
    });
  });

  /* rodada repetida (partida continuada depois de recarregar): fica a última foto daquela rodada */
  const porRodada = new Map<number, LinhaRodada>();
  for (const x of rods) {
    if (!obj(x)) continue;
    const n = int(x.r);
    if (n === null) continue;
    porRodada.set(n, {
      rodada: n, apoio: int(x.apoio), perdeu: int(x.perdeu), verba: int(x.verba), renda: int(x.rendaFimRodada),
      convencidos: int(x.convencidos), duracao: num(x.duracao), dados: x,
    });
  }
  return { partida, eventos, rodadas: [...porRodada.values()] };
}

/** progresso do jogo (PROG): objeto com fundo numérico; o resto é guardado como veio */
export function validaProgresso(p: unknown): Record<string, unknown> | string {
  if (!obj(p)) return 'progresso precisa ser um objeto';
  if (typeof p.fundo !== 'number' || !Number.isFinite(p.fundo) || p.fundo < 0) return 'progresso sem fundo válido';
  for (const k of ['donos', 'faixas', 'difs', 'medalhas', 'lados', 'est']) if (p[k] !== undefined && !obj(p[k])) return `campo ${k} inválido`;
  return p;
}
