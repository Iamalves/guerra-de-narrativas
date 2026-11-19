/* Gera backend-php/api/precos.json: o preço de cada personagem na loja (em F$), tirado do próprio motor do jogo.
     node ferramentas/gera-precos.mjs
   O servidor usa a tabela para conferir se quem liberou um personagem gastou F$ para isso (contra trapaça editando o
   progresso). O motor é um script de navegador: aqui ele roda com um "navegador de mentira" (tudo que ele pede ao DOM
   ou ao canvas devolve um objeto coringa), só para chegar até as tabelas e ler window.GN_MOTOR.
   Roda sozinho no npm run pacote-hostgator, então os preços acompanham o equilíbrio do jogo. */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const motor = readFileSync(join(raiz, 'frontend', 'public', 'jogo', 'motor.js'), 'utf8');

/* coringa: aceita qualquer propriedade, chamada ou conta; vira 0 em contas e '' em textos */
const alvo = function () {};
const coringa = new Proxy(alvo, {
  get: (_t, k) => k === Symbol.toPrimitive ? (hint => (hint === 'string' ? '' : 0)) : k === Symbol.iterator ? function* () {} : k === 'then' ? undefined : coringa,
  set: () => true, apply: () => coringa, construct: () => coringa, has: () => true,
});
const armazenamento = { getItem: () => null, setItem() {}, removeItem() {}, clear() {}, key: () => null, length: 0 };
const ctx = {
  console: { log() {}, warn() {}, error() {} }, Math, JSON, Date, Object, Array, Number, String, Boolean, Symbol, Map, Set, WeakMap, Promise,
  RegExp, Error, TypeError, isFinite, isNaN, parseInt, parseFloat, encodeURIComponent, decodeURIComponent, escape, unescape, Intl,
  setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {}, requestAnimationFrame: () => 0, cancelAnimationFrame() {},
  localStorage: armazenamento, sessionStorage: armazenamento, document: coringa, navigator: { userAgent: '', serviceWorker: undefined, clipboard: coringa },
  location: { protocol: 'file:', search: '', pathname: '/', href: '' }, innerWidth: 1280, innerHeight: 720, devicePixelRatio: 1,
  matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }), addEventListener() {}, removeEventListener() {},
  performance: { now: () => 0 }, Image: function () { return coringa; }, AudioContext: undefined, fetch: () => new Promise(() => {}),
  btoa: s => Buffer.from(s, 'binary').toString('base64'), atob: s => Buffer.from(s, 'base64').toString('binary'),
  getComputedStyle: () => coringa, ResizeObserver: function () { return coringa; }, Path2D: function () { return coringa; },
};
ctx.window = ctx; ctx.self = ctx; ctx.globalThis = ctx;
vm.createContext(ctx);
try { vm.runInContext(motor, ctx, { filename: 'motor.js' }); }
catch (e) { if (!ctx.GN_MOTOR) throw new Error('o motor parou antes de montar as tabelas: ' + e.message); }

const m = ctx.GN_MOTOR;
if (!m || typeof m.precoLoja !== 'function') throw new Error('não achei window.GN_MOTOR.precoLoja no motor');
const iniciais = [...new Set(Object.values(m.INICIAIS).flat().map(x => x[0]))];
const exclusivos = Object.fromEntries(Object.entries(m.EXCLUSIVOS).map(([l, ks]) => [l, [...ks]]));
const lados = Object.fromEntries(Object.entries(m.SIDES).map(([l, s]) => [l, [...s.order]]));
const precos = {};
for (const k of Object.keys(m.TOWERS)) if (!m.TOWERS[k].exclusivo && !iniciais.includes(k)) precos[k] = m.precoLoja(k);
const saida = { gerado: new Date().toISOString(), iniciais, exclusivos, lados, precos };
writeFileSync(join(raiz, 'backend-php', 'api', 'precos.json'), JSON.stringify(saida, null, 1));
console.log(`precos.json: ${Object.keys(precos).length} personagens, ${iniciais.length} iniciais, exclusivos ${Object.values(exclusivos).flat().length}`);
