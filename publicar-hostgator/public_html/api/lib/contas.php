<?php
/* Contas: criar, entrar, sair, quem sou eu e trocar o lado. Equivale a backend/src/contas.ts. */
declare(strict_types=1);

const DIAS_SESSAO = 60;
function ladoOk($v): bool { return $v === 'pt' || $v === 'br'; }

function abreSessao(string $jogadorId): string {
  [$token, $hash] = novoToken();
  q('INSERT INTO sessoes (token_hash, jogador_id, criada_em, expira_em) VALUES (?, ?, UTC_TIMESTAMP(), ?)', [$hash, $jogadorId, daquiA(DIAS_SESSAO * 86400)]);
  q('DELETE FROM sessoes WHERE jogador_id = ? AND expira_em < UTC_TIMESTAMP()', [$jogadorId]); // limpeza
  return $token;
}

/* POST /contas { nome, email, senha, lado? } → { token, jogador } */
function criaConta(): void {
  if (!limite('c:' . ip(), 20, 600)) erro(429, 'Muitas tentativas. Espere alguns minutos.');
  $b = corpo();
  $nome = validaNome(campo($b, 'nome')); $email = validaEmail(campo($b, 'email')); $senha = campo($b, 'senha');
  $lado = ladoOk(campo($b, 'lado')) ? campo($b, 'lado') : null;
  if (!$nome) erro(400, 'O apelido precisa ter de 3 a 20 letras ou números.');
  if (!$email) erro(400, 'Digite um e-mail válido, como nome@exemplo.com.');
  if (!validaSenha($senha)) erro(400, 'A senha precisa ter pelo menos 6 caracteres.');
  $chave = mb_strtolower($nome);
  foreach (linhas('SELECT nome_chave, email_chave FROM jogadores WHERE nome_chave = ? OR email_chave = ?', [$chave, $email]) as $r) {
    if ($r['email_chave'] === $email) erro(409, 'Esse e-mail já tem uma conta. Entre com ele.');
  }
  if (linha('SELECT 1 FROM jogadores WHERE nome_chave = ?', [$chave])) erro(409, 'Esse apelido já existe. Escolha outro ou entre com ele.');
  try {
    q('INSERT INTO jogadores (nome, nome_chave, email, email_chave, senha_hash, lado, criado_em) VALUES (?, ?, ?, ?, ?, ?, UTC_TIMESTAMP())',
      [$nome, $chave, $email, $email, password_hash((string) $senha, PASSWORD_DEFAULT), $lado]);
  } catch (PDOException $e) {
    /* duas contas iguais criadas ao mesmo tempo: o índice único segura a segunda */
    if ($e->getCode() === '23000') erro(409, 'Esse apelido ou e-mail acabou de ser usado. Tente outro.');
    throw $e;
  }
  $id = (string) db()->lastInsertId();
  responde(201, ['token' => abreSessao($id), 'jogador' => ['id' => $id, 'nome' => $nome, 'lado' => $lado]]);
}

/* POST /sessoes { nome (apelido ou e-mail), senha } → { token, jogador } */
function entra(): void {
  if (!limite('s:' . ip(), 20, 600)) erro(429, 'Muitas tentativas. Espere alguns minutos.');
  $b = corpo();
  $login = is_string(campo($b, 'nome')) ? campo($b, 'nome') : ''; $senha = campo($b, 'senha');
  $email = strpos($login, '@') !== false ? validaEmail($login) : null;
  $nome = $email ? null : validaNome($login);
  $r = ($email || $nome) && is_string($senha)
    ? linha($email ? 'SELECT id, nome, senha_hash, lado FROM jogadores WHERE email_chave = ?' : 'SELECT id, nome, senha_hash, lado FROM jogadores WHERE nome_chave = ?', [$email ?? mb_strtolower((string) $nome)])
    : null;
  if (!$r || !password_verify((string) $senha, $r['senha_hash'])) erro(401, 'Apelido, e-mail ou senha não conferem.');
  if (password_needs_rehash($r['senha_hash'], PASSWORD_DEFAULT)) q('UPDATE jogadores SET senha_hash = ? WHERE id = ?', [password_hash((string) $senha, PASSWORD_DEFAULT), $r['id']]);
  $id = (string) $r['id'];
  responde(200, ['token' => abreSessao($id), 'jogador' => ['id' => $id, 'nome' => $r['nome'], 'lado' => ladoOk($r['lado']) ? $r['lado'] : null]]);
}

/* DELETE /sessoes: apaga a sessão deste token */
function sai(): void {
  $t = tokenDoPedido();
  if ($t) q('DELETE FROM sessoes WHERE token_hash = ?', [hashToken($t)]);
  responde(204);
}

/* GET /eu */
function eu(): void { responde(200, ['jogador' => exigeConta()]); }

/* PUT /perfil { lado } */
function perfil(): void {
  $j = exigeConta(); $lado = campo(corpo(), 'lado');
  if (!ladoOk($lado)) erro(400, 'Escolha Esquerda ou Direita.');
  q('UPDATE jogadores SET lado = ? WHERE id = ?', [$lado, $j['id']]);
  responde(200, ['jogador' => ['id' => $j['id'], 'nome' => $j['nome'], 'lado' => $lado]]);
}
