/* Compras com dinheiro pelo Mercado Pago (Checkout Pro): pacotes de F$ e pacotes de heróis exclusivos.
   Fluxo:
   1. POST /api/compras { pacote } (com conta) → cria a compra e uma "preferência" no Mercado Pago → devolve a URL de pagamento.
   2. O jogador paga na página do Mercado Pago (PIX, cartão, boleto) e volta para o jogo em /?compra=<id>.
   3. O status chega de dois jeitos: pelo webhook (POST /api/pagamentos/webhook, quando o backend tem endereço público)
      e pela conferência na volta (GET /api/compras/:id, que pergunta ao Mercado Pago). Os dois só confiam no que a API
      do Mercado Pago responde, nunca no que o navegador manda, e conferem valor e moeda antes de aprovar.
   4. Compra aprovada fica "a entregar"; o jogo soma o F$ (ou põe os heróis) e confirma no mesmo PUT do progresso
      (veja partidas.ts).
   Sem MP_ACCESS_TOKEN as compras ficam desligadas. Com MP_SIMULADO=1 (só fora de produção) um simulador local faz o
   papel do Mercado Pago, para testar o fluxo inteiro sem credenciais. */
import { Router, type Request } from 'express';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { pool } from './db.ts';
import { exigeConta } from './contas.ts';

/** pacotes de F$ à venda: o preço vale só daqui (o navegador manda só o nome do pacote).
    As etiquetas dizem só o que é verdade: a nossa recomendação e o que rende mais F$ por real (as contas estão no teste) */
export const PACOTES = {
  /* 2026-11-17: F$ de cada pacote cortado pela metade (era 1.500, 4.000, 10.000 e 27.000), preços iguais */
  punhado: { nome: 'Punhado de F$', fs: 750, centavos: 490 },
  saco: { nome: 'Saco de F$', fs: 2000, centavos: 990, destaque: 'Recomendado' },
  cofre: { nome: 'Cofre de F$', fs: 5000, centavos: 1990 },
  fundao: { nome: 'Fundão Partidário', fs: 13500, centavos: 4990, destaque: 'Mais F$ por real' },
} as const satisfies Record<string, { nome: string; fs: number; centavos: number; destaque?: string }>;

/** pacotes com heróis exclusivos (2026-11-17): só com dinheiro, um de cada por conta. Entregam os heróis (e o F$, se
    tiverem) direto no progresso. boasVindas: oferta de boas-vindas (aparece depois de escolher o lado e na loja) */
export const PACOTES_HEROIS = {
  herois_dir: { nome: 'Pacote Lendas da Direita', lado: 'br', centavos: 2999, fs: 0, herois: ['eneaspres', 'flaviohip', 'bolsomito'] },
  herois_esq: { nome: 'Pacote Lendas da Esquerda', lado: 'pt', centavos: 2999, fs: 0, herois: ['lularobo', 'dilmapoderosa', 'erika'] },
  boas_dir: { nome: 'Pacote Boas-vindas', lado: 'br', centavos: 990, fs: 2000, herois: ['bolsomito'], boasVindas: true },
  boas_esq: { nome: 'Pacote Boas-vindas', lado: 'pt', centavos: 990, fs: 2000, herois: ['lularobo'], boasVindas: true },
  /* pacote completo (2026-11-17): libera todos os personagens e heróis do lado, até os exclusivos. A lista de
     personagens é do jogo (SIDES[lado].order), então o servidor manda só "todos: lado" na entrega */
  completo_dir: { nome: 'Pacote Completo da Direita', lado: 'br', centavos: 9999, fs: 0, herois: [], todos: true },
  completo_esq: { nome: 'Pacote Completo da Esquerda', lado: 'pt', centavos: 9999, fs: 0, herois: [], todos: true },
} as const satisfies Record<string, { nome: string; lado: 'pt' | 'br'; centavos: number; fs: number; herois: readonly string[]; boasVindas?: boolean; todos?: boolean }>;

/** bônus da primeira compra de F$ de cada conta (50% a mais) */
export const BONUS_PRIMEIRA = 0.5;

const ehHerois = (k: string): k is keyof typeof PACOTES_HEROIS => Object.hasOwn(PACOTES_HEROIS, k);
const ehFs = (k: string): k is keyof typeof PACOTES => Object.hasOwn(PACOTES, k);
const nomePacote = (k: string) => (ehHerois(k) ? PACOTES_HEROIS[k].nome : ehFs(k) ? PACOTES[k].nome : k);
const heroisDe = (k: string): string[] => (ehHerois(k) ? [...PACOTES_HEROIS[k].herois] : []);
/** pacote completo: o lado inteiro que ele libera (null nos outros) */
const todosDe = (k: string): 'pt' | 'br' | null => (ehHerois(k) && 'todos' in PACOTES_HEROIS[k] ? PACOTES_HEROIS[k].lado : null);
const oQueVem = (fs: number, pacote = '') => {
  if (todosDe(pacote)) return 'todos os personagens e heróis do lado, até os exclusivos';
  const h = heroisDe(pacote).length, txt = h ? (h === 1 ? '1 herói exclusivo' : h + ' heróis exclusivos') : '';
  return [fs ? 'F$ ' + fs.toLocaleString('pt-BR') : '', txt].filter(Boolean).join(' + ');
};
/** a conta já teve alguma compra aprovada? (o bônus vale só para a primeira) */
const jaComprou = async (jogadorId: string, fora = '00000000-0000-0000-0000-000000000000') =>
  !!(await pool.query("SELECT 1 FROM compras WHERE jogador_id = $1 AND status = 'aprovada' AND id <> $2 LIMIT 1", [jogadorId, fora])).rowCount;

const env = () => ({
  token: process.env.MP_ACCESS_TOKEN?.trim() || '',
  segredo: process.env.MP_WEBHOOK_SECRET?.trim() || '',
  front: (process.env.FRONT_URL || 'http://localhost:5173').replace(/\/$/, ''),
  apiPublica: (process.env.API_URL_PUBLICA || '').replace(/\/$/, ''),
  simulado: process.env.MP_SIMULADO === '1' && process.env.NODE_ENV !== 'production',
});
export const pagamentosLigados = () => !!env().token || env().simulado;

/* ---------- API do Mercado Pago (só fetch, sem SDK) ---------- */
async function mp<T>(caminho: string, op: { metodo?: string; corpo?: unknown; idempotencia?: string } = {}): Promise<T> {
  const r = await fetch('https://api.mercadopago.com' + caminho, {
    method: op.metodo ?? 'GET',
    headers: {
      Authorization: 'Bearer ' + env().token,
      ...(op.corpo !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(op.idempotencia ? { 'X-Idempotency-Key': op.idempotencia } : {}),
    },
    body: op.corpo !== undefined ? JSON.stringify(op.corpo) : undefined,
    signal: AbortSignal.timeout(15000),
  });
  const dados = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Mercado Pago respondeu ${r.status}: ${JSON.stringify(dados).slice(0, 300)}`);
  return dados as T;
}
interface PagamentoMP {
  id: number; status: string; status_detail?: string; external_reference?: string;
  transaction_amount?: number; currency_id?: string; date_approved?: string;
}

/* status do Mercado Pago → status da compra */
const STATUS: Record<string, string> = {
  approved: 'aprovada', authorized: 'pendente', pending: 'pendente', in_process: 'pendente', in_mediation: 'pendente',
  rejected: 'recusada', cancelled: 'cancelada', refunded: 'estornada', charged_back: 'estornada',
};

/** aplica um pagamento (vindo da API do Mercado Pago ou do simulador) à compra dele.
    Só aprova se valor e moeda baterem com a compra; uma compra aprovada não volta a pendente. */
async function aplicaPagamento(p: PagamentoMP): Promise<void> {
  const compraId = p.external_reference;
  if (!compraId || !/^[0-9a-f-]{36}$/.test(compraId)) return;
  const c = (await pool.query<{ valor_centavos: number; moeda: string; status: string; jogador_id: string; fs: number; bonus: boolean; pacote: string }>(
    'SELECT valor_centavos, moeda, status, jogador_id, fs, bonus, pacote FROM compras WHERE id = $1', [compraId])).rows[0];
  if (!c) return;
  let novo = STATUS[p.status] ?? 'pendente';
  if (novo === 'aprovada' && (Math.round((p.transaction_amount ?? 0) * 100) !== c.valor_centavos || (p.currency_id ?? 'BRL') !== c.moeda)) {
    console.error(`Pagamento ${p.id} com valor ou moeda diferentes da compra ${compraId}: não aprovado`);
    novo = 'recusada';
  }
  if (c.status === 'aprovada' && novo === 'pendente') return;
  /* primeira compra aprovada de F$ da conta: rende BONUS_PRIMEIRA a mais. É decidido na aprovação (e não ao criar a
     compra) para não valer em duas compras abertas ao mesmo tempo */
  if (novo === 'aprovada' && c.status !== 'aprovada' && c.fs > 0 && !c.bonus && !ehHerois(c.pacote) && !(await jaComprou(String(c.jogador_id), compraId)))
    await pool.query('UPDATE compras SET fs = round(fs * $2::numeric), bonus = true WHERE id = $1 AND NOT bonus', [compraId, 1 + BONUS_PRIMEIRA]);
  await pool.query(
    `UPDATE compras SET status = $2, status_mp = $3, status_detalhe = $4, mp_pagamento = $5, atualizada_em = now(),
       aprovada_em = CASE WHEN $2 = 'aprovada' THEN COALESCE(aprovada_em, now()) ELSE aprovada_em END
     WHERE id = $1`,
    [compraId, novo, p.status, p.status_detail ?? null, String(p.id)]);
  if (novo === 'estornada' && c.status === 'aprovada') console.warn(`Compra ${compraId} estornada depois de aprovada: confira o F$ ou os heróis do jogador.`);
}

/** pergunta ao Mercado Pago o último pagamento desta compra (para quando o webhook não chega, como em localhost) */
export async function confereNoMercadoPago(compraId: string) {
  if (!env().token) return;
  const r = await mp<{ results: PagamentoMP[] }>(`/v1/payments/search?external_reference=${compraId}&sort=date_created&criteria=desc`);
  if (r.results?.[0]) await aplicaPagamento(r.results[0]);
}

/** webhook: confere a assinatura x-signature (HMAC-SHA256 com a chave secreta do painel do Mercado Pago) */
export function assinaturaValida(req: Pick<Request, 'get'>, dataId: string): boolean {
  const { segredo } = env();
  if (!segredo) return true; // sem chave configurada não dá para conferir; o pagamento é sempre lido da API do Mercado Pago
  const partes = Object.fromEntries((req.get('x-signature') || '').split(',').map(p => p.trim().split('=') as [string, string]));
  if (!partes.ts || !partes.v1) return false;
  const manifesto = `id:${dataId.toLowerCase()};request-id:${req.get('x-request-id') || ''};ts:${partes.ts};`;
  const esperado = createHmac('sha256', segredo).update(manifesto).digest('hex');
  return esperado.length === partes.v1.length && timingSafeEqual(Buffer.from(esperado), Buffer.from(partes.v1));
}

export const rotasPagamentos = Router();

/* pacotes à venda (e se as compras estão ligadas). Com conta, diz também se a primeira compra ainda tem bônus e quais
   pacotes de heróis já foram comprados */
rotasPagamentos.get('/pacotes', async (req, res) => {
  let primeira = true, heroisComprados: string[] = [];
  if (req.jogador) {
    primeira = !(await jaComprou(req.jogador.id));
    heroisComprados = (await pool.query<{ pacote: string }>(
      "SELECT DISTINCT pacote FROM compras WHERE jogador_id = $1 AND status = 'aprovada' AND pacote = ANY($2)", [req.jogador.id, Object.keys(PACOTES_HEROIS)])).rows.map(r => r.pacote);
  }
  res.json({
    ligado: pagamentosLigados(), simulado: env().simulado && !env().token, bonusPrimeira: primeira ? BONUS_PRIMEIRA : 0,
    pacotes: Object.entries(PACOTES).map(([id, p]) => ({ id, ...p })),
    herois: Object.entries(PACOTES_HEROIS).map(([id, p]) => ({ id, ...p, comprado: heroisComprados.includes(id) })),
  });
});

/* cria a compra e a preferência de pagamento */
rotasPagamentos.post('/compras', exigeConta, async (req, res) => {
  const chave = req.body?.pacote;
  if (typeof chave !== 'string' || (!ehFs(chave) && !ehHerois(chave))) { res.status(400).json({ erro: 'Pacote não existe.' }); return; }
  if (!pagamentosLigados()) { res.status(503).json({ erro: 'As compras ainda não estão disponíveis.' }); return; }
  /* pacote de heróis: um por conta (já comprado e aprovado não vende de novo) */
  if (ehHerois(chave) && (await pool.query("SELECT 1 FROM compras WHERE jogador_id = $1 AND pacote = $2 AND status = 'aprovada'", [req.jogador!.id, chave])).rowCount) {
    res.status(409).json({ erro: 'Você já tem esse pacote: os heróis estão na sua conta.' }); return;
  }
  const p = ehHerois(chave) ? { nome: PACOTES_HEROIS[chave].nome, fs: PACOTES_HEROIS[chave].fs, centavos: PACOTES_HEROIS[chave].centavos } : PACOTES[chave];
  const e = env(), simulada = !e.token;
  const compra = (await pool.query<{ id: string }>(
    'INSERT INTO compras (jogador_id, pacote, fs, valor_centavos, simulada) VALUES ($1, $2, $3, $4, $5) RETURNING id',
    [req.jogador!.id, chave, p.fs, p.centavos, simulada])).rows[0];
  const volta = `${e.front}/?compra=${compra.id}`;

  if (simulada) {
    /* simulador: a "página de pagamento" é do próprio backend (só em desenvolvimento) */
    const base = e.apiPublica || `${req.protocol}://${req.get('host')}`;
    res.status(201).json({ id: compra.id, url: `${base}/api/pagamentos/simulador?compra=${compra.id}` });
    return;
  }
  const email = (await pool.query<{ email: string | null }>('SELECT email FROM jogadores WHERE id = $1', [req.jogador!.id])).rows[0]?.email;
  const pref = await mp<{ id: string; init_point: string; sandbox_init_point?: string }>('/checkout/preferences', {
    metodo: 'POST', idempotencia: compra.id,
    corpo: {
      items: [{ id: chave, title: `${p.nome} (${oQueVem(p.fs, chave)}) - Guerra de Narrativas`, quantity: 1, unit_price: p.centavos / 100, currency_id: 'BRL', category_id: 'virtual_goods' }],
      external_reference: compra.id,
      ...(email ? { payer: { email } } : {}),
      back_urls: { success: volta, pending: volta, failure: volta },
      /* voltar sozinho ao aprovar só funciona com endereço https */
      ...(volta.startsWith('https://') ? { auto_return: 'approved' } : {}),
      ...(e.apiPublica ? { notification_url: `${e.apiPublica}/api/pagamentos/webhook` } : {}),
      statement_descriptor: 'GUERRANARRATIVAS',
      expires: true, expiration_date_to: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    },
  });
  await pool.query('UPDATE compras SET mp_preferencia = $2, atualizada_em = now() WHERE id = $1', [compra.id, pref.id]);
  /* com credenciais de teste, usa o endereço de teste */
  const url = e.token.startsWith('TEST-') && pref.sandbox_init_point ? pref.sandbox_init_point : pref.init_point;
  res.status(201).json({ id: compra.id, url });
});

/* situação de uma compra do jogador (na volta do pagamento): se ainda não terminou, pergunta ao Mercado Pago */
rotasPagamentos.get('/compras/:id', exigeConta, async (req, res) => {
  const id = String(req.params.id);
  if (!/^[0-9a-f-]{36}$/.test(id)) { res.status(404).json({ erro: 'Compra não encontrada.' }); return; }
  const le = () => pool.query<{ id: string; pacote: string; fs: number; status: string; entregue: boolean }>(
    'SELECT id, pacote, fs, status, entregue_em IS NOT NULL AS entregue FROM compras WHERE id = $1 AND jogador_id = $2', [id, req.jogador!.id]);
  let c = (await le()).rows[0];
  if (!c) { res.status(404).json({ erro: 'Compra não encontrada.' }); return; }
  if (c.status === 'criada' || c.status === 'pendente') {
    try { await confereNoMercadoPago(id); c = (await le()).rows[0]; } catch (e) { console.error(e); }
  }
  res.json({ ...c, herois: heroisDe(c.pacote), todos: todosDe(c.pacote) });
});

/** confere no Mercado Pago as compras ainda abertas do jogador (dos últimos 3 dias, no máximo 5, e cada uma no máximo a cada
    20 s). Assim o F$ chega mesmo sem a volta do pagamento e sem webhook: em localhost o Mercado Pago descarta os endereços
    de volta, o jogador pode fechar a página antes de voltar, e o PIX ou o boleto podem aprovar bem depois */
async function confereAbertas(jogadorId: string) {
  if (!env().token) return;
  const r = await pool.query<{ id: string }>(
    `UPDATE compras SET atualizada_em = now()
     WHERE id IN (SELECT id FROM compras WHERE jogador_id = $1 AND status IN ('criada', 'pendente') AND NOT simulada
                    AND criada_em > now() - interval '3 days' AND atualizada_em < now() - interval '20 seconds'
                  ORDER BY criada_em DESC LIMIT 5)
     RETURNING id`, [jogadorId]);
  for (const c of r.rows) await confereNoMercadoPago(c.id).catch(e => console.error('conferindo compra', c.id, e));
}

/* compras aprovadas que o jogo ainda não entregou (antes, confere no Mercado Pago as que ainda estão abertas).
   O jogo soma o fs (se houver) e põe os heróis da lista "herois" no progresso */
rotasPagamentos.get('/entregas', exigeConta, async (req, res) => {
  await confereAbertas(req.jogador!.id);
  const r = await pool.query<{ id: string; pacote: string; fs: number; bonus: boolean }>(
    'SELECT id, pacote, fs, bonus FROM compras WHERE jogador_id = $1 AND status = $2 AND entregue_em IS NULL ORDER BY aprovada_em', [req.jogador!.id, 'aprovada']);
  res.json(r.rows.map(c => ({ ...c, herois: heroisDe(c.pacote), todos: todosDe(c.pacote) })));
});

/* histórico de compras do jogador */
rotasPagamentos.get('/compras', exigeConta, async (req, res) => {
  const r = await pool.query(
    'SELECT id, pacote, fs, valor_centavos, status, criada_em, entregue_em IS NOT NULL AS entregue FROM compras WHERE jogador_id = $1 ORDER BY criada_em DESC LIMIT 50', [req.jogador!.id]);
  res.json(r.rows);
});

/* aviso do Mercado Pago: só usa o id; o pagamento é lido da API do Mercado Pago */
rotasPagamentos.post('/pagamentos/webhook', async (req, res) => {
  const tipo = req.body?.type ?? req.query.type ?? req.query.topic;
  const dataId = String(req.body?.data?.id ?? req.query['data.id'] ?? req.query.id ?? '');
  if (tipo !== 'payment' || !/^\d+$/.test(dataId)) { res.sendStatus(200); return; }
  if (!assinaturaValida(req, dataId)) { res.sendStatus(401); return; }
  if (!env().token) { res.sendStatus(200); return; } // sem Access Token não há como ler o pagamento
  try {
    await aplicaPagamento(await mp<PagamentoMP>(`/v1/payments/${dataId}`));
    res.sendStatus(200);
  } catch (e) {
    /* pagamento que não existe (como o "simular notificação" do painel do Mercado Pago): nada a fazer, sem reenvio */
    if (e instanceof Error && e.message.includes('respondeu 404')) { console.warn(`Webhook de pagamento ${dataId} que não existe: ignorado`); res.sendStatus(200); return; }
    console.error(e);
    res.sendStatus(500); // o Mercado Pago tenta de novo mais tarde
  }
});

/* ---------- simulador de pagamento (só desenvolvimento, sem credenciais) ---------- */
const escapa = (s: string) => s.replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]!));
rotasPagamentos.get('/pagamentos/simulador', async (req, res) => {
  if (!env().simulado) { res.sendStatus(404); return; }
  const id = String(req.query.compra || '');
  const c = /^[0-9a-f-]{36}$/.test(id) ? (await pool.query<{ pacote: string; fs: number; valor_centavos: number; simulada: boolean }>('SELECT pacote, fs, valor_centavos, simulada FROM compras WHERE id = $1', [id])).rows[0] : null;
  if (!c?.simulada) { res.sendStatus(404); return; }
  const valor = (c.valor_centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const botao = (status: string, texto: string, cor: string) =>
    `<form method="post" action="simulador"><input type="hidden" name="compra" value="${escapa(id)}"><input type="hidden" name="status" value="${status}"><button style="background:${cor}">${texto}</button></form>`;
  res.type('html').send(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Simulador de pagamento</title>
<body style="font-family:Arial,sans-serif;background:#eee;display:flex;justify-content:center;padding:30px">
<div style="background:#fff;border-radius:10px;padding:22px;max-width:380px;box-shadow:0 2px 10px #0002">
<p style="background:#fff3c4;padding:8px;border-radius:6px;font-size:13px"><b>Simulador de desenvolvimento.</b> Nenhum dinheiro é cobrado. Com o Access Token do Mercado Pago no backend/.env, esta página dá lugar à do Mercado Pago.</p>
<h2>${escapa(nomePacote(c.pacote))}</h2><p>${oQueVem(c.fs, c.pacote)} por <b>${valor}</b></p>
<style>button{width:100%;margin:6px 0;padding:12px;border:0;border-radius:6px;color:#fff;font-size:16px;cursor:pointer}</style>
${botao('approved', 'Pagar (aprovado)', '#009ee3')}${botao('pending', 'Pagar com PIX (fica pendente)', '#555')}${botao('rejected', 'Cartão recusado', '#c8102e')}
</div></body>`);
});
rotasPagamentos.post('/pagamentos/simulador', async (req, res) => {
  if (!env().simulado) { res.sendStatus(404); return; }
  const id = String(req.body?.compra || ''), status = String(req.body?.status || '');
  const c = /^[0-9a-f-]{36}$/.test(id) ? (await pool.query<{ valor_centavos: number; simulada: boolean }>('SELECT valor_centavos, simulada FROM compras WHERE id = $1', [id])).rows[0] : null;
  if (!c?.simulada || !STATUS[status]) { res.sendStatus(400); return; }
  await aplicaPagamento({ id: Date.now(), status, status_detail: 'simulado', external_reference: id, transaction_amount: c.valor_centavos / 100, currency_id: 'BRL' });
  res.redirect(303, `${env().front}/?compra=${id}`);
});
