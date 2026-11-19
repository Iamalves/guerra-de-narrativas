<?php
/* Base da API em PHP (HostGator/cPanel): configuração, banco (PDO MySQL), respostas JSON, sessão e limites.
   Equivale a backend/src/{db,seguranca,app}.ts da versão Node. */
declare(strict_types=1);

/* ---------- configuração ----------
   Procura, nesta ordem: o arquivo indicado em GN_CONFIG, gn-config.php uma pasta ACIMA do public_html (fora do site,
   o lugar mais seguro) e config.php nesta pasta (protegido pelo .htaccess). Veja config.exemplo.php. */
function config(): array {
  static $c = null;
  if ($c !== null) return $c;
  $caminhos = array_filter([getenv('GN_CONFIG') ?: null, dirname(__DIR__, 3) . '/gn-config.php', dirname(__DIR__) . '/config.php']);
  foreach ($caminhos as $arq) if (is_file($arq)) { $c = require $arq; break; }
  if (!is_array($c)) { http_response_code(500); header('Content-Type: application/json'); echo '{"erro":"servidor sem configuração (gn-config.php)"}'; exit; }
  $c += ['front_url' => '', 'api_url_publica' => '', 'mp_access_token' => '', 'mp_webhook_secret' => '', 'mp_simulado' => false, 'db_porta' => 3306];
  return $c;
}

/* ---------- respostas ---------- */
function responde(int $status, $dados = null): void {
  http_response_code($status);
  if ($status === 204) exit;
  header('Content-Type: application/json; charset=utf-8');
  echo is_string($dados) ? $dados : json_encode($dados, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRESERVE_ZERO_FRACTION);
  exit;
}
function erro(int $status, string $msg): void { responde($status, ['erro' => $msg]); }

/** corpo do pedido em JSON. Objetos viram stdClass (e não arrays) para "{}" continuar "{}" ao gravar de volta */
function corpo(): ?stdClass {
  static $c = false;
  if ($c !== false) return $c;
  $txt = (string) file_get_contents('php://input');
  if ($txt === '') return $c = null;
  $v = json_decode($txt, false, 512, JSON_BIGINT_AS_STRING);
  if (json_last_error() !== JSON_ERROR_NONE) erro(400, 'JSON inválido');
  return $c = ($v instanceof stdClass ? $v : null);
}
function corpoBruto(): string { return (string) file_get_contents('php://input'); }
/** campo de um objeto (ou null) */
function campo($o, string $k) { return ($o instanceof stdClass && property_exists($o, $k)) ? $o->$k : null; }
function ehObj($v): bool { return $v instanceof stdClass; }
function json($v): string { return json_encode($v, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRESERVE_ZERO_FRACTION); }

/* ---------- datas (sempre em UTC) ---------- */
function agora(): string { $t = microtime(true); return gmdate('Y-m-d H:i:s', (int) $t) . sprintf('.%03d', (int) (($t - floor($t)) * 1000)); }
function daquiA(int $segundos): string { return gmdate('Y-m-d H:i:s', time() + $segundos); }
/** "2026-11-17 12:00:00.123" (UTC) → "2026-11-17T12:00:00.123Z" */
function iso(?string $d): ?string {
  if ($d === null) return null;
  $p = explode('.', $d);
  return str_replace(' ', 'T', $p[0]) . '.' . str_pad(substr($p[1] ?? '0', 0, 3), 3, '0') . 'Z';
}

/* ---------- banco ---------- */
function db(): PDO {
  static $pdo = null;
  if ($pdo) return $pdo;
  $c = config();
  try {
    $pdo = new PDO("mysql:host={$c['db_host']};port={$c['db_porta']};dbname={$c['db_nome']};charset=utf8mb4", $c['db_usuario'], $c['db_senha'], [
      PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC, PDO::ATTR_EMULATE_PREPARES => false,
    ]);
  } catch (PDOException $e) {
    error_log('GN: sem conexão com o banco: ' . $e->getMessage());
    erro(500, 'O servidor do jogo não conseguiu abrir o banco de dados.');
  }
  $pdo->exec("SET time_zone = '+00:00'");
  aplicaMigracoes($pdo);
  return $pdo;
}
/** consulta com parâmetros; devolve o PDOStatement */
function q(string $sql, array $p = []): PDOStatement { $s = db()->prepare($sql); $s->execute($p); return $s; }
function linha(string $sql, array $p = []): ?array { $r = q($sql, $p)->fetch(); return $r === false ? null : $r; }
function linhas(string $sql, array $p = []): array { return q($sql, $p)->fetchAll(); }
/** roda $fn numa transação */
function transacao(callable $fn) {
  $d = db(); $d->beginTransaction();
  try { $r = $fn(); $d->commit(); return $r; } catch (Throwable $e) { $d->rollBack(); throw $e; }
}

/** aplica, em ordem, os arquivos .sql de migracoes/ que ainda não rodaram neste banco (uma consulta por pedido) */
function aplicaMigracoes(PDO $pdo): void {
  $pdo->exec('CREATE TABLE IF NOT EXISTS migracoes (nome VARCHAR(100) NOT NULL PRIMARY KEY, aplicada_em DATETIME NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4');
  $feitas = array_flip($pdo->query('SELECT nome FROM migracoes')->fetchAll(PDO::FETCH_COLUMN));
  $arquivos = glob(dirname(__DIR__) . '/migracoes/*.sql') ?: [];
  sort($arquivos);
  foreach ($arquivos as $arq) {
    $nome = basename($arq);
    if (isset($feitas[$nome])) continue;
    /* MySQL não desfaz CREATE TABLE numa transação: cada comando roda em ordem, e a migração só é marcada no fim */
    $sql = preg_replace('/^\s*--.*$/m', '', (string) file_get_contents($arq));
    foreach (preg_split('/;\s*(\r?\n|$)/', $sql) as $cmd) if (trim($cmd) !== '') $pdo->exec($cmd);
    $pdo->prepare('INSERT INTO migracoes (nome, aplicada_em) VALUES (?, UTC_TIMESTAMP())')->execute([$nome]);
  }
}

/* ---------- segurança ---------- */
function hashToken(string $t): string { return hash('sha256', $t); }
function b64url(string $b): string { return rtrim(strtr(base64_encode($b), '+/', '-_'), '='); }
function novoToken(): array { $t = b64url(random_bytes(32)); return [$t, hashToken($t)]; }
function uuid4(): string {
  $b = random_bytes(16); $b[6] = chr((ord($b[6]) & 0x0f) | 0x40); $b[8] = chr((ord($b[8]) & 0x3f) | 0x80);
  return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($b), 4));
}
/** apelido: 3 a 20 caracteres, letras (com acento), números, espaço, ponto, hífen e sublinhado */
function validaNome($nome): ?string {
  if (!is_string($nome)) return null;
  $n = preg_replace('/\s+/u', ' ', trim($nome));
  return preg_match('/^[\p{L}\p{N} ._-]{3,20}$/u', (string) $n) ? $n : null;
}
function validaSenha($s): bool { return is_string($s) && strlen($s) >= 6 && strlen($s) <= 200; }
/** e-mail nome@dominio.ext, até 254 caracteres; devolve em minúsculas (ou null) */
function validaEmail($e): ?string {
  if (!is_string($e)) return null;
  $e = strtolower(trim($e));
  if (strlen($e) > 254) return null;
  if (!preg_match('/^([a-z0-9!#$%&\'*+\/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&\'*+\/=?^_`{|}~-]+)*)@((?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63})$/', $e, $m)) return null;
  return strlen($m[1]) <= 64 ? $e : null;
}
function ip(): string { return (string) ($_SERVER['REMOTE_ADDR'] ?? '?'); }
/** limite de tentativas por chave (no banco, porque o PHP não guarda memória entre pedidos). true = pode seguir */
function limite(string $chave, int $max, int $janelaSeg): bool {
  $r = linha('SELECT n, ate > UTC_TIMESTAMP() AS valendo FROM tentativas WHERE chave = ?', [$chave]);
  if (!$r || !$r['valendo']) {
    q('REPLACE INTO tentativas (chave, n, ate) VALUES (?, 1, ?)', [$chave, daquiA($janelaSeg)]);
    if (random_int(1, 200) === 1) q('DELETE FROM tentativas WHERE ate < UTC_TIMESTAMP()');
    return true;
  }
  q('UPDATE tentativas SET n = n + 1 WHERE chave = ?', [$chave]);
  return ((int) $r['n']) + 1 <= $max;
}

/* ---------- sessão ---------- */
/** token do cabeçalho Authorization (o Apache da hospedagem às vezes renomeia: veja o .htaccess) */
function tokenDoPedido(): ?string {
  $h = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
  if ($h === '' && function_exists('getallheaders')) foreach (getallheaders() as $k => $v) if (strtolower($k) === 'authorization') $h = $v;
  return preg_match('/^Bearer (\S+)$/', (string) $h, $m) ? $m[1] : null;
}
/** jogador da sessão (ou null): ['id' => '12', 'nome' => ..., 'lado' => 'pt'|'br'|null] */
function jogador(): ?array {
  static $j = false;
  if ($j !== false) return $j;
  $t = tokenDoPedido();
  if (!$t) return $j = null;
  $r = linha('SELECT j.id, j.nome, j.lado FROM sessoes s JOIN jogadores j ON j.id = s.jogador_id WHERE s.token_hash = ? AND s.expira_em > UTC_TIMESTAMP()', [hashToken($t)]);
  return $j = $r ? ['id' => (string) $r['id'], 'nome' => $r['nome'], 'lado' => in_array($r['lado'], ['pt', 'br'], true) ? $r['lado'] : null] : null;
}
function exigeConta(): array { $j = jogador(); if (!$j) erro(401, 'Entre na sua conta.'); return $j; }
