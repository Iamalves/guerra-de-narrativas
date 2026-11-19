/* Teste de ponta a ponta da API PHP (rodar com o docker-compose de backend-php no ar):
     node backend-php/teste-api.mjs [http://localhost:8088]
   Cria contas temporárias "t...", confere todas as rotas e apaga o que criou no fim (pelo próprio MySQL do Docker). */
import { execFileSync } from 'node:child_process';

const BASE = (process.argv[2] || 'http://localhost:8088') + '/api';
const r = Math.floor(Math.random() * 1e6);
let ok = 0, falhas = 0;
const confere = (nome, cond, extra = '') => { if (cond) ok++; else { falhas++; console.log('FALHOU:', nome, extra); } };
async function api(caminho, { metodo = 'GET', corpo, token, form } = {}) {
  const h = {};
  if (corpo !== undefined) h['Content-Type'] = 'application/json';
  if (form) h['Content-Type'] = 'application/x-www-form-urlencoded';
  if (token) h.Authorization = 'Bearer ' + token;
  const res = await fetch(BASE + caminho, { method: metodo, headers: h, body: form ? new URLSearchParams(form) : corpo !== undefined ? JSON.stringify(corpo) : undefined, redirect: 'manual' });
  const txt = await res.text();
  let dados = null; try { dados = JSON.parse(txt); } catch { /* não é JSON */ }
  return { status: res.status, dados, txt, headers: res.headers };
}
const nomes = [`ta${r}`, `tb${r}`, `tc${r}`];

/* contas */
const A = await api('/contas', { metodo: 'POST', corpo: { nome: nomes[0], email: `${nomes[0]}@exemplo.com`, senha: 'segredo1', lado: 'br' } });
confere('cria conta', A.status === 201 && A.dados.token && A.dados.jogador.lado === 'br', A.txt);
const B = await api('/contas', { metodo: 'POST', corpo: { nome: nomes[1], email: `${nomes[1]}@exemplo.com`, senha: 'segredo1' } });
const C = await api('/contas', { metodo: 'POST', corpo: { nome: nomes[2], email: `${nomes[2]}@exemplo.com`, senha: 'segredo1', lado: 'pt' } });
confere('apelido repetido', (await api('/contas', { metodo: 'POST', corpo: { nome: nomes[0].toUpperCase(), email: `x${r}@exemplo.com`, senha: 'segredo1' } })).status === 409);
confere('e-mail repetido', (await api('/contas', { metodo: 'POST', corpo: { nome: `x${r}`, email: `${nomes[0]}@EXEMPLO.com`, senha: 'segredo1' } })).status === 409);
confere('e-mail inválido', (await api('/contas', { metodo: 'POST', corpo: { nome: `y${r}`, email: 'nao-e-email', senha: 'segredo1' } })).status === 400);
confere('senha curta', (await api('/contas', { metodo: 'POST', corpo: { nome: `z${r}`, email: `z${r}@exemplo.com`, senha: '123' } })).status === 400);
const ta = A.dados.token, tb = B.dados.token, tc = C.dados.token;
confere('entra por apelido', (await api('/sessoes', { metodo: 'POST', corpo: { nome: nomes[0].toUpperCase(), senha: 'segredo1' } })).status === 200);
const porEmail = await api('/sessoes', { metodo: 'POST', corpo: { nome: `${nomes[0]}@exemplo.com`, senha: 'segredo1' } });
confere('entra por e-mail', porEmail.status === 200 && porEmail.dados.jogador.lado === 'br', porEmail.txt);
confere('senha errada', (await api('/sessoes', { metodo: 'POST', corpo: { nome: nomes[0], senha: 'errada1' } })).status === 401);
const eu = await api('/eu', { token: ta });
confere('eu', eu.status === 200 && eu.dados.jogador.nome === nomes[0], eu.txt);
confere('eu sem token', (await api('/eu')).status === 401);
confere('perfil troca lado', (await api('/perfil', { metodo: 'PUT', corpo: { lado: 'pt' }, token: ta })).dados?.jogador?.lado === 'pt');
confere('perfil lado ruim', (await api('/perfil', { metodo: 'PUT', corpo: { lado: 'x' }, token: ta })).status === 400);
const sair = await api('/sessoes', { metodo: 'DELETE', token: porEmail.dados.token });
confere('sair', sair.status === 204 && (await api('/eu', { token: porEmail.dados.token })).status === 401);

/* progresso: objetos vazios continuam objetos, números com casas continuam iguais */
const prog = { fundo: 1234, donos: {}, faixas: { SP: 3, RJ: 2 }, medalhas: { primeira: 1 }, est: { vitorias: 7, partidas: 9, conv: 512.5 }, recorde: 45, lista: [] };
const put = await api('/progresso', { metodo: 'PUT', corpo: { dados: prog, entregas: [] }, token: tc });
confere('salva progresso', put.status === 200 && put.dados.ok && /Z$/.test(put.dados.atualizadoEm), put.txt);
const get = await api('/progresso', { token: tc });
confere('lê progresso igual', JSON.stringify(get.dados.dados) === JSON.stringify(prog), get.txt);
confere('progresso inválido', (await api('/progresso', { metodo: 'PUT', corpo: { dados: { fundo: -1 } }, token: tc })).status === 400);
confere('progresso vazio da conta nova', (await api('/progresso', { token: tb })).dados.dados === null);

/* partidas: em andamento, final, envio atrasado não apaga o resultado, de outro jogador é descartada */
const pid = 'tst' + r;
const reg = { v: 1, id: pid, inicio: new Date().toISOString(), uf: 'DF', lado: 'pt', dificuldade: 'normal', modo: 'classico',
  ev: [{ t: 'colocar', r: 1, s: 1.5, verba: 300, k: 'militante', x: 100, y: 200, custo: 180 }], rodadas: [{ r: 1, apoio: 150, verba: 50, rendaFimRodada: 162 }] };
let p = await api('/partidas', { metodo: 'POST', corpo: { ...reg, andamento: { rodada: 3, apoio: 140, verba: 90 } }, token: ta });
confere('partida em andamento', p.dados?.ok === true, p.txt);
p = await api('/partidas', { metodo: 'POST', corpo: { ...reg, fim: { resultado: 'derrota', rodada: 5, apoio: 0, verba: 10 } }, token: ta });
confere('partida terminada', p.dados?.ok === true, p.txt);
p = await api('/partidas', { metodo: 'POST', corpo: { ...reg, andamento: { rodada: 3 } }, token: ta });
confere('envio atrasado descartado', p.status === 202 && p.dados.ok === false, p.txt);
p = await api('/partidas', { metodo: 'POST', corpo: { ...reg, fim: { resultado: 'vitoria' } }, token: tb });
confere('partida de outro jogador descartada', p.status === 202, p.txt);
confere('registro sem id descartado', (await api('/partidas', { metodo: 'POST', corpo: { ev: [] } })).status === 202);
confere('partida sem conta', (await api('/partidas', { metodo: 'POST', corpo: { ...reg, id: 'sc' + r, fim: { resultado: 'vitoria', rodada: 40 } } })).dados?.ok === true);
confere('análise sem chave fica fechada', (await api('/analise/personagens')).status === 404);
const anal = await (async () => { const res = await fetch(BASE + '/analise/personagens', { headers: { 'X-Chave-Admin': 'chave-de-teste-local' } }); const txt = await res.text(); return { status: res.status, dados: JSON.parse(txt), txt }; })();
confere('análise', anal.status === 200 && anal.dados.some(x => x.personagem === 'militante'), anal.txt.slice(0, 200));

/* compras (simulador): bônus só na 1ª compra, pacote de heróis, completo, repetido, entrega e confirmação */
const pac = await api('/pacotes', { token: ta });
confere('pacotes', pac.dados?.ligado && pac.dados.simulado && pac.dados.bonusPrimeira === 0.5 && pac.dados.herois.length === 6, pac.txt.slice(0, 200));
async function compra(pacote, token) {
  const c = await api('/compras', { metodo: 'POST', corpo: { pacote }, token });
  const pag = await api('/pagamentos/simulador', { metodo: 'POST', form: { compra: c.dados?.id, status: 'approved' } });
  return { c, pag };
}
const c1 = await compra('saco', ta);
confere('compra simulada redireciona ao jogo', c1.c.status === 201 && c1.pag.status === 303 && c1.pag.headers.get('location')?.includes('?compra='), c1.c.txt + ' ' + c1.pag.status);
await compra('herois_esq', ta); await compra('completo_dir', ta); await compra('boas_esq', ta);
confere('pacote de heróis repetido', (await api('/compras', { metodo: 'POST', corpo: { pacote: 'herois_esq' }, token: ta })).status === 409);
confere('pacote que não existe', (await api('/compras', { metodo: 'POST', corpo: { pacote: 'xyz' }, token: ta })).status === 400);
const sit = await api('/compras/' + c1.c.dados.id, { token: ta });
confere('situação da compra', sit.dados?.status === 'aprovada' && sit.dados.fs === 3000, sit.txt);
const ent = await api('/entregas', { token: ta });
const porPac = Object.fromEntries((ent.dados || []).map(e => [e.pacote, e]));
confere('entregas', ent.dados?.length === 4, ent.txt);
confere('bônus na 1ª compra', porPac.saco?.fs === 3000 && porPac.saco.bonus === true, JSON.stringify(porPac.saco));
confere('heróis no pacote', porPac.herois_esq?.herois.join() === 'lularobo,dilmapoderosa,erika');
confere('completo libera o lado', porPac.completo_dir?.todos === 'br' && porPac.completo_dir.fs === 0);
confere('boas-vindas sem bônus', porPac.boas_esq?.fs === 2000 && porPac.boas_esq.bonus === false);
const conf = await api('/progresso', { metodo: 'PUT', corpo: { dados: { fundo: 5000 }, entregas: ent.dados.map(e => e.id) }, token: ta });
confere('confirma entregas', conf.dados?.entregues?.length === 4, conf.txt);
confere('entregas zeradas', (await api('/entregas', { token: ta })).dados.length === 0);
const pac2 = await api('/pacotes', { token: ta });
confere('sem bônus depois', pac2.dados.bonusPrimeira === 0 && pac2.dados.herois.filter(h => h.comprado).length === 3);
confere('histórico', (await api('/compras', { token: ta })).dados.length === 4);
confere('webhook sem tipo responde 200', (await api('/pagamentos/webhook', { metodo: 'POST', corpo: { type: 'outro' } })).status === 200);
confere('página do simulador', (await api('/pagamentos/simulador?compra=' + c1.c.dados.id)).txt.includes('Simulador'));

/* trapaças no progresso: o servidor corrige */
const D = await api('/contas', { metodo: 'POST', corpo: { nome: 'td' + r, email: 'td' + r + '@exemplo.com', senha: 'segredo1', lado: 'br' } });
nomes.push('td' + r);
const td = D.dados.token;
let s = await api('/progresso', { metodo: 'PUT', corpo: { dados: { fundo: 5000, donos: {} } }, token: td });
confere('1ª gravação normal', s.dados.ok && !s.dados.corrigido, s.txt);
s = await api('/progresso', { metodo: 'PUT', corpo: { dados: { fundo: 4650, donos: { agro: 1 } } }, token: td });
confere('comprar personagem com F$ é aceito', !s.dados.corrigido, s.txt);
s = await api('/progresso', { metodo: 'PUT', corpo: { dados: { fundo: 999999999, donos: { agro: 1 } } }, token: td });
confere('F$ inventado é corrigido', s.dados.corrigido && s.dados.dados.fundo <= 4650 + 20000, s.txt);
const depois = s.dados.dados.fundo;
s = await api('/progresso', { metodo: 'PUT', corpo: { dados: { fundo: depois, donos: { agro: 1, bolsomito: 1, xi: 1 } } }, token: td });
confere('herói pago sem compra sai', s.dados.corrigido && !s.dados.dados.donos.bolsomito, s.txt);
confere('personagem liberado sem gastar F$ é cobrado', s.dados.dados.donos.xi === 1 && s.dados.dados.fundo <= depois - 4350 && Number.isInteger(s.dados.dados.fundo), s.txt);
const cobrado = s.dados.dados.fundo;
let g = await api('/progresso', { token: td });
confere('servidor guarda a versão corrigida', g.dados.dados.fundo === cobrado && !g.dados.dados.donos.bolsomito, g.txt);
await api('/progresso', { metodo: 'PUT', corpo: { dados: { fundo: 0, donos: { agro: 1, xi: 1 } } }, token: td });
s = await api('/progresso', { metodo: 'PUT', corpo: { dados: { fundo: 0, donos: { agro: 1, xi: 1, milei: 1, trump: 1 } } }, token: td });
confere('sem F$ para pagar, o personagem sai', s.dados.corrigido && !s.dados.dados.donos.milei && !s.dados.dados.donos.trump, s.txt);
await compra('herois_dir', td);
s = await api('/progresso', { metodo: 'PUT', corpo: { dados: { fundo: depois, donos: { agro: 1 } } }, token: td });
g = await api('/progresso', { token: td });
confere('heróis comprados voltam sempre', g.dados.dados.donos.bolsomito === 1 && g.dados.dados.donos.eneaspres === 1, g.txt);
await compra('completo_dir', td);
s = await api('/progresso', { metodo: 'PUT', corpo: { dados: { fundo: depois, donos: { agro: 1, xi: 1, trump: 1 } } }, token: td });
confere('pacote completo libera o lado sem gastar F$', s.dados.ok && (s.dados.dados ? s.dados.dados.donos.trump === 1 : true), s.txt);
g = await api('/progresso', { token: td });
confere('lado completo inteiro na conta', g.dados.dados.donos.trump === 1 && g.dados.dados.donos.milei === 1 && !g.dados.dados.donos.lularobo, Object.keys(g.dados.dados.donos).join());

/* amigos */
let am = await api('/amigos', { metodo: 'POST', corpo: { nome: nomes[1].toUpperCase() }, token: ta });
confere('convida', am.status === 201 && am.dados.convite, am.txt);
confere('convite repetido', (await api('/amigos', { metodo: 'POST', corpo: { nome: nomes[1] }, token: ta })).status === 409);
confere('próprio apelido', (await api('/amigos', { metodo: 'POST', corpo: { nome: nomes[0] }, token: ta })).status === 400);
confere('apelido inexistente', (await api('/amigos', { metodo: 'POST', corpo: { nome: 'ninguemzzz' }, token: ta })).status === 404);
let lb = await api('/amigos', { token: tb });
confere('convite recebido', lb.dados.recebidos.length === 1 && lb.dados.amigos.length === 1, lb.txt);
confere('aceita', (await api(`/amigos/convites/${A.dados.jogador.id}/aceitar`, { metodo: 'POST', token: tb })).status === 200);
const la = await api('/amigos', { token: ta }); lb = await api('/amigos', { token: tb });
confere('amigos nos dois lados', la.dados.amigos.length === 2 && lb.dados.amigos.length === 2 && la.dados.enviados.length === 0);
am = await api('/amigos', { metodo: 'POST', corpo: { nome: nomes[0] }, token: tc });
const cruz = await api('/amigos', { metodo: 'POST', corpo: { nome: nomes[2] }, token: ta });
confere('convite cruzado vira amizade', cruz.dados?.aceito === true, cruz.txt);
const rank = (await api('/amigos', { token: ta })).dados.amigos.find(x => x.nome === nomes[2]);
confere('ranking com números do progresso', rank?.vitorias === 7 && rank.faixas === 2 && rank.ouro === 1 && rank.recorde === 45, JSON.stringify(rank));
confere('desfaz amizade', (await api(`/amigos/${B.dados.jogador.id}`, { metodo: 'DELETE', token: ta })).status === 204
  && (await api('/amigos', { token: tb })).dados.amigos.length === 1);
confere('aceitar sem convite', (await api(`/amigos/convites/${C.dados.jogador.id}/aceitar`, { metodo: 'POST', token: tb })).status === 404);

/* rotas e arquivos protegidos */
confere('rota inexistente', (await api('/nada')).status === 404);
for (const arq of ['lib/base.php', 'migracoes/001_inicial.sql', 'config.exemplo.php']) {
  const res = await fetch(BASE + '/' + arq);
  confere('protegido: ' + arq, res.status === 403, String(res.status));
}

/* limpeza: apaga tudo que o teste criou */
const sql = `DELETE FROM compras WHERE jogador_id IN (SELECT id FROM jogadores WHERE nome_chave IN ('${nomes.join("','")}'));
DELETE FROM partidas WHERE id IN ('${pid}', 'sc${r}');
DELETE FROM jogadores WHERE nome_chave IN ('${nomes.join("','")}');
DELETE FROM tentativas;`;
execFileSync('C:/Program Files/Docker/Docker/resources/bin/docker.exe', ['exec', 'gn-mysql', 'mysql', '-uguerra', '-pguerra_local', 'guerra', '-e', sql], { stdio: 'ignore' });
console.log(`\n${ok} conferências ok, ${falhas} falharam`);
process.exit(falhas ? 1 : 0);
