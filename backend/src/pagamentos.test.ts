import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';

/* o módulo de pagamentos importa o banco, que exige DATABASE_URL (a conexão só abre na primeira consulta) */
process.env.DATABASE_URL ||= 'postgres://x:x@127.0.0.1:1/x';
process.env.MP_WEBHOOK_SECRET = 'segredo-de-teste';
const { assinaturaValida, PACOTES } = await import('./pagamentos.ts');

/* monta a assinatura do jeito que o Mercado Pago manda: x-signature "ts=...,v1=..." e x-request-id */
function cabecalhos(dataId: string, segredo: string, ts = '1742505638683', requestId = 'abc-123') {
  const v1 = createHmac('sha256', segredo).update(`id:${dataId};request-id:${requestId};ts:${ts};`).digest('hex');
  const h: Record<string, string> = { 'x-signature': `ts=${ts},v1=${v1}`, 'x-request-id': requestId };
  return { get: (n: string) => h[n.toLowerCase()] } as never;
}

test('webhook: assinatura certa passa', () => {
  assert.ok(assinaturaValida(cabecalhos('123456', 'segredo-de-teste'), '123456'));
});
test('webhook: assinatura com outra chave, outro pagamento ou sem cabeçalho é recusada', () => {
  assert.ok(!assinaturaValida(cabecalhos('123456', 'outra-chave'), '123456'));
  assert.ok(!assinaturaValida(cabecalhos('123456', 'segredo-de-teste'), '999999'));
  assert.ok(!assinaturaValida({ get: () => undefined } as never, '123456'));
});
test('pacotes: valores positivos e mais F$ por real nos maiores', () => {
  const l = Object.values(PACOTES);
  for (const p of l) assert.ok(p.fs > 0 && p.centavos > 0);
  for (let i = 1; i < l.length; i++) assert.ok(l[i].fs / l[i].centavos > l[i - 1].fs / l[i - 1].centavos, 'pacote maior rende mais por real');
});
