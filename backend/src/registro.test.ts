import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizaRegistro, validaProgresso } from './registro.ts';
import { hashSenha, confereSenha, validaNome, validaEmail, novoToken, hashToken } from './seguranca.ts';

const exemplo = {
  v: 1, id: 'mi0abc12xyz', inicio: '2026-11-17T11:32:38.540Z', uf: 'DF', lado: 'pt', dificuldade: 'facil', modo: 'classico',
  ev: [
    { t: 'colocar', r: 0, s: 0, verba: 1100, id: 1, k: 'militante', x: 300, y: 210, custo: 165, distAvenida: 44, pontoDaAvenida: 0.12, morro: false },
    { t: 'evoluir', r: 1, s: 12.5, verba: 900, id: 1, k: 'militante', caminho: 1, nivel: 1, nome: 'Megafone', custo: 150 },
    'lixo',
  ],
  rodadas: [{ r: 1, apoio: 200, perdeu: 0, verba: 950, rendaFimRodada: 162, convencidos: 12, duracao: 21.3 }, { r: 1, apoio: 199 }],
  fim: { resultado: 'vitoria', rodada: 40, apoio: 180, verba: 5000 },
};

test('registro vira partida, eventos e rodadas', () => {
  const n = normalizaRegistro(exemplo);
  assert.equal(typeof n, 'object');
  if (typeof n === 'string') return;
  assert.equal(n.partida.resultado, 'vitoria');
  assert.equal(n.partida.rodada, 40);
  assert.equal(n.eventos.length, 2, 'o evento que não é objeto fica de fora');
  assert.deepEqual([n.eventos[0].personagem, n.eventos[0].x, n.eventos[0].y], ['militante', 300, 210]);
  assert.equal(n.rodadas.length, 1, 'rodada repetida fica uma só');
  assert.equal(n.rodadas[0].apoio, 199, 'fica a última foto da rodada');
});

test('registro inválido é recusado', () => {
  assert.equal(typeof normalizaRegistro(null), 'string');
  assert.equal(typeof normalizaRegistro({ id: 'x' }), 'string');
  assert.equal(typeof normalizaRegistro({ id: 'abc def!!' }), 'string');
});

test('partida sem fim usa a última rodada', () => {
  const n = normalizaRegistro({ ...exemplo, fim: undefined });
  if (typeof n === 'string') assert.fail(n);
  assert.equal(n.partida.resultado, null);
  assert.equal(n.partida.rodada, 1);
});

test('progresso', () => {
  assert.equal(typeof validaProgresso({ fundo: 300, donos: { kim: 1 } }), 'object');
  assert.equal(typeof validaProgresso({ fundo: -1 }), 'string');
  assert.equal(typeof validaProgresso({ fundo: 5, donos: [] }), 'string');
});

test('senha e token', async () => {
  const h = await hashSenha('segredo123');
  assert.ok(await confereSenha('segredo123', h));
  assert.ok(!(await confereSenha('errada', h)));
  const t = novoToken();
  assert.equal(t.hash, hashToken(t.token));
  assert.equal(validaNome('  Ana   Maria '), 'Ana Maria');
  assert.equal(validaNome('ab'), null);
  assert.equal(validaNome('<script>'), null);
});

test('e-mail', () => {
  assert.equal(validaEmail('  Ana.Maria+jogo@Exemplo.com.BR '), 'ana.maria+jogo@exemplo.com.br');
  for (const ruim of ['', 'ana', 'ana@', '@exemplo.com', 'ana@exemplo', 'ana @exemplo.com', 'ana@exemplo..com', 'ana@-exemplo.com', 'ana@exemplo.c', '.ana@exemplo.com', 'ana..m@exemplo.com', 'a@b@c.com', 12])
    assert.equal(validaEmail(ruim), null, 'deveria recusar: ' + ruim);
});
