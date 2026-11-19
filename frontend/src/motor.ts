/* Ponte com o motor do jogo (public/jogo/motor.js). O motor continua dono do estado (progresso, opções, partida);
   o menu em React lê os dados por window.GN_MOTOR e chama as ações dele. Quando o motor quer mostrar o menu
   (ao abrir o jogo, no fim da partida, no botão Menu), ele chama GN_PONTE.abreMenu(aba) e o React abre a página certa. */
import { useSyncExternalStore } from 'react';
import type { Lado } from './api';

export interface Torre { nome: string; desc: string; curta?: string; exclusivo?: boolean; cost: number; only?: boolean; presidente?: boolean; atk?: string; up: { n: string; d: string }[][] }
export interface Inimigo { nome: string; boss?: boolean }
export interface Medalha { id: string; nome: string; desc: string; premio: number; prog?: () => [number, number] }
export interface Mapa { nome: string; leg: string; tier: number; comp?: { livre: number; avenida: number; ocupado: number } }
export interface Partida { side: Lado; uf: string; diff: string; round: number; lives: number; em?: unknown; livre?: boolean; modo?: string }
export interface Progresso {
  fundo: number; donos: Record<string, number>; faixas: Record<string, number>; medalhas: Record<string, number>;
  difs: Record<string, Record<string, number>>; desafio?: string; recorde?: number;
  est: { partidas: number; vitorias: number; derrotas: number; conv: number; tempo: number; porPers: Record<string, number>; colocados: Record<string, number>; porMapa: Record<string, number>; porLado: Record<string, number> };
}
export interface Opcoes { mute?: boolean; volFx: number; volMus: number; musica?: boolean; calmo?: boolean; daltonico?: boolean; mouseGrande?: boolean; texto: number; registro?: boolean }
export type Dificuldade = 'facil' | 'normal' | 'dificil';

export interface Motor {
  readonly PROG: Progresso; readonly OPC: Opcoes; readonly S: { over?: boolean; won?: boolean; livre?: boolean; round: number; uf: string; side: Lado } | null;
  MAPAS: Record<string, Mapa>; ESTADOS: [string, string][]; REGIOES: [string, string[]][];
  TOWERS: Record<string, Torre>; ENEMY: Record<string, Inimigo>;
  SIDES: Record<Lado, { nome: string; pitch: string; goal: string; order: string[]; foes: Record<string, string>; boss: Record<string, string[]> }>;
  DIFFS: Record<Dificuldade, { nome: string }>; MODOS: [string, string, string][]; MEDALHAS: Medalha[];
  INICIAIS: Record<Lado, [string, number][]>; PREMIO: Record<Dificuldade, number>; PREMIO_ESTADO: number;
  NOMES_TIER: Record<number, string>; PREMIO_TIER: Record<number, number>; HEROI_PODER: Record<string, [string, string, unknown]>;
  CHEFES_REGIAO: Record<Lado, Record<string, Record<string, string>>>; TUTO_PARTES: [string, string, string][];
  menu(): { lado: Lado; uf: string; modo: string; msg: string };
  defineMenu(o: { lado?: Lado; uf?: string; modo?: string }): void;
  limpaMsg(): void;
  jogar(d: Dificuldade): void; jogarDesafio(): void;
  desafioDoDia(): { dia: string; side: Lado; uf: string; keys: string[] };
  partidaSalva(): Partida | null; continuar(): void;
  podeLivre(): boolean; continuarLivre(): void;
  premio(d: Dificuldade, uf: string, modo: string): number;
  precoLoja(k: string): number; rodadaLibera(lado: Lado, k: string): number; liberaTudo(): boolean;
  nomePoderHeroi(k: string): string; especialDe(k: string): string; resumoDinamico(uf: string): string; nomeModo(k: string): string;
  seloSvg(k: Dificuldade, on: boolean): string;
  compra(k: string): boolean;
  /** heróis exclusivos de cada lado (só em pacotes pagos) */
  EXCLUSIVOS: Record<Lado, string[]>;
  medalhasNovas(): { id: string; nome: string; premio: number }[];
  medalhaProg(id: string): [number, number] | null;
  pinta: {
    miniatura(cn: HTMLCanvasElement, uf: string): void;
    evo(cn: HTMLCanvasElement, k: string, a: number, b: number, px: number, medio?: boolean): void;
    inimigo(cn: HTMLCanvasElement, k: string, px: number): void;
    retrato(cn: HTMLCanvasElement, k: string): void;
    faixa(cn: HTMLCanvasElement, uf: string): void;
  };
  abreFicha(k: string): void; abreTuto(i: number): void; tutoParteVista(i: number): boolean;
  opcao(k: string, v: boolean): void; volume(k: 'volFx' | 'volMus', v: number, solto?: boolean): void; tamanhoTexto(n: number): void;
  registro: { fila(): number; baixa(): void; envia(): Promise<void> };
  codigo: { gera(): string; le(txt: string): Progresso | null; resumo(p: Progresso): string; importa(p: Progresso): void };
}

declare global { interface Window { GN_MOTOR?: Motor } }
export const motor = () => window.GN_MOTOR ?? null;

/* ---------- qual página do menu está aberta ---------- */
export type Pagina = 'jogar' | 'loja' | 'amigos' | 'conq' | 'mais';
export type SubMais = 'perfil' | 'adv' | 'est' | 'como' | 'opc' | null;
export type AbaLoja = 'pers' | 'herois' | 'pacotes';
export interface EstadoMenu { aberto: boolean; pagina: Pagina; mais: SubMais; lojaAba: AbaLoja; versao: number }

let est: EstadoMenu = { aberto: false, pagina: 'jogar', mais: null, lojaAba: 'pers', versao: 0 };
const ouvintes = new Set<() => void>();
const muda = (n: Partial<EstadoMenu>) => { est = { ...est, ...n, versao: est.versao + 1 }; ouvintes.forEach(f => f()); };

/** páginas do menu antigo do motor → páginas novas */
export function abreMenu(aba: string) {
  switch (aba) {
    case 'loja': muda({ aberto: true, pagina: 'loja', lojaAba: 'pers' }); break;
    case 'herois': muda({ aberto: true, pagina: 'loja', lojaAba: 'herois' }); break;
    case 'conq': muda({ aberto: true, pagina: 'conq' }); break;
    case 'adv': case 'est': case 'como': case 'opc': muda({ aberto: true, pagina: 'mais', mais: aba }); break;
    default: muda({ aberto: true, pagina: 'jogar' });
  }
}
export const vaiPara = (pagina: Pagina, extra: Partial<EstadoMenu> = {}) => muda({ pagina, mais: pagina === 'mais' ? (extra.mais ?? null) : est.mais, ...extra });
export const fechaMenu = () => muda({ aberto: false });
/** algo mudou no motor (compra, opção...): redesenha o menu */
export const atualizaMenu = () => muda({});

export function useMenu(): EstadoMenu {
  return useSyncExternalStore(f => { ouvintes.add(f); return () => { ouvintes.delete(f); }; }, () => est);
}

export const fs = (n: number) => 'F$ ' + Math.round(n).toLocaleString('pt-BR');
export const nomeLadoCurto = (l: Lado) => (l === 'pt' ? 'Esquerda' : 'Direita');
