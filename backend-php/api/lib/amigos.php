<?php
/* Amigos por convite e ranking entre eles. Equivale a backend/src/amigos.ts. */
declare(strict_types=1);

const MAX_AMIGOS = 100;

function numOuZero($v) { return (is_int($v) || is_float($v)) && is_finite((float) $v) ? $v : 0; }
/** resume o progresso salvo de um jogador nos números do ranking */
function resumoRanking(?string $dados): array {
  $d = $dados ? json_decode($dados) : null;
  $est = ehObj(campo($d, 'est')) ? campo($d, 'est') : new stdClass();
  $faixas = ehObj(campo($d, 'faixas')) ? get_object_vars(campo($d, 'faixas')) : [];
  $med = ehObj(campo($d, 'medalhas')) ? get_object_vars(campo($d, 'medalhas')) : [];
  return [
    'vitorias' => numOuZero(campo($est, 'vitorias')), 'partidas' => numOuZero(campo($est, 'partidas')), 'convencidos' => (int) round((float) numOuZero(campo($est, 'conv'))),
    'faixas' => count($faixas), 'ouro' => count(array_filter($faixas, fn($v) => numOuZero($v) >= 3)), 'medalhas' => count($med), 'recorde' => numOuZero(campo($d, 'recorde')),
  ];
}
function pessoa(array $x): array { return ['id' => (string) $x['id'], 'nome' => $x['nome'], 'lado' => in_array($x['lado'], ['pt', 'br'], true) ? $x['lado'] : null]; }

/** a amizade nos dois sentidos, apagando os convites entre os dois */
function viramAmigos(string $a, string $b): void {
  transacao(function () use ($a, $b) {
    q('INSERT IGNORE INTO amizades (jogador_id, amigo_id, criada_em) VALUES (?, ?, UTC_TIMESTAMP()), (?, ?, UTC_TIMESTAMP())', [$a, $b, $b, $a]);
    q('DELETE FROM convites_amizade WHERE (de_id = ? AND para_id = ?) OR (de_id = ? AND para_id = ?)', [$a, $b, $b, $a]);
  });
}

/* GET /amigos: ranking (eu e meus amigos), convites recebidos e enviados */
function listaAmigos(): void {
  $j = exigeConta(); $eu = $j['id'];
  $amigos = array_map(fn($x) => pessoa($x) + ['eu' => (string) $x['id'] === $eu] + resumoRanking($x['dados']),
    linhas('SELECT j.id, j.nome, j.lado, p.dados FROM jogadores j LEFT JOIN progresso p ON p.jogador_id = j.id
            WHERE j.id = ? OR j.id IN (SELECT amigo_id FROM amizades WHERE jogador_id = ?)', [$eu, $eu]));
  $rec = array_map('pessoa', linhas('SELECT j.id, j.nome, j.lado FROM convites_amizade c JOIN jogadores j ON j.id = c.de_id WHERE c.para_id = ? ORDER BY c.criado_em DESC', [$eu]));
  $env = array_map('pessoa', linhas('SELECT j.id, j.nome, j.lado FROM convites_amizade c JOIN jogadores j ON j.id = c.para_id WHERE c.de_id = ? ORDER BY c.criado_em DESC', [$eu]));
  responde(200, ['amigos' => $amigos, 'recebidos' => $rec, 'enviados' => $env]);
}

/* POST /amigos { nome }: convida pelo apelido. Se o outro já tinha convidado, viram amigos na hora */
function convidaAmigo(): void {
  $j = exigeConta(); $eu = $j['id'];
  if (!limite('a:' . $eu, 40, 600)) erro(429, 'Muitas tentativas. Espere alguns minutos.');
  $nome = validaNome(campo(corpo(), 'nome'));
  if (!$nome) erro(400, 'Digite o apelido do seu amigo (de 3 a 20 letras ou números).');
  $outro = linha('SELECT id, nome FROM jogadores WHERE nome_chave = ?', [mb_strtolower($nome)]);
  if (!$outro) erro(404, "Não achei ninguém com o apelido \"$nome\". Confira como ele escreve.");
  $id = (string) $outro['id'];
  if ($id === $eu) erro(400, 'Esse é o seu próprio apelido.');
  if (linha('SELECT 1 FROM amizades WHERE jogador_id = ? AND amigo_id = ?', [$eu, $id])) erro(409, "{$outro['nome']} já é seu amigo.");
  if (linha('SELECT 1 FROM convites_amizade WHERE de_id = ? AND para_id = ?', [$eu, $id])) erro(409, "Você já convidou {$outro['nome']}. Falta ele aceitar.");
  if (linha('SELECT 1 FROM convites_amizade WHERE de_id = ? AND para_id = ?', [$id, $eu])) { viramAmigos($eu, $id); responde(200, ['amigo' => ['id' => $id, 'nome' => $outro['nome']], 'aceito' => true]); }
  $total = (int) linha('SELECT (SELECT COUNT(*) FROM amizades WHERE jogador_id = ?) + (SELECT COUNT(*) FROM convites_amizade WHERE de_id = ?) AS n', [$eu, $eu])['n'];
  if ($total >= MAX_AMIGOS) erro(400, 'Você já tem ' . MAX_AMIGOS . ' amigos e convites. Tire alguém para convidar outro.');
  q('INSERT IGNORE INTO convites_amizade (de_id, para_id, criado_em) VALUES (?, ?, UTC_TIMESTAMP())', [$eu, $id]);
  responde(201, ['convite' => ['id' => $id, 'nome' => $outro['nome']]]);
}

function idValido(string $id): void { if (!preg_match('/^\d{1,18}$/', $id)) erro(400, 'Pedido inválido.'); }

/* POST /amigos/convites/{id}/aceitar */
function aceitaConvite(string $id): void {
  $j = exigeConta(); idValido($id);
  if (!linha('SELECT 1 FROM convites_amizade WHERE de_id = ? AND para_id = ?', [$id, $j['id']])) erro(404, 'Esse convite não existe mais.');
  if ((int) linha('SELECT COUNT(*) AS n FROM amizades WHERE jogador_id = ?', [$j['id']])['n'] >= MAX_AMIGOS) erro(400, 'Você já tem ' . MAX_AMIGOS . ' amigos. Tire alguém para aceitar.');
  viramAmigos($j['id'], $id);
  responde(200, ['ok' => true]);
}
/* DELETE /amigos/convites/{id}: recusa um convite recebido ou cancela um enviado */
function tiraConvite(string $id): void {
  $j = exigeConta(); idValido($id);
  q('DELETE FROM convites_amizade WHERE (de_id = ? AND para_id = ?) OR (de_id = ? AND para_id = ?)', [$j['id'], $id, $id, $j['id']]);
  responde(204);
}
/* DELETE /amigos/{id}: desfaz a amizade para os dois */
function tiraAmigo(string $id): void {
  $j = exigeConta(); idValido($id);
  q('DELETE FROM amizades WHERE (jogador_id = ? AND amigo_id = ?) OR (jogador_id = ? AND amigo_id = ?)', [$j['id'], $id, $id, $j['id']]);
  responde(204);
}
