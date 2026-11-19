<?php
/* API do Guerra de Narrativas em PHP (para hospedagem com cPanel, como a HostGator).
   Fica em public_html/api/ ao lado do jogo; o .htaccess manda todo pedido /api/... para este arquivo.
   As mesmas rotas e respostas da versão Node (backend/), então o jogo não muda nada. */
declare(strict_types=1);

require __DIR__ . '/lib/base.php';
require __DIR__ . '/lib/contas.php';
require __DIR__ . '/lib/partidas.php';
require __DIR__ . '/lib/pagamentos.php';
require __DIR__ . '/lib/amigos.php';
require __DIR__ . '/lib/economia.php';

header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

/* CORS só se o jogo ficar em outro domínio (no mesmo domínio, que é o normal, não precisa) */
$origem = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origem !== '' && in_array($origem, (array) (config()['cors_origens'] ?? []), true)) {
  header("Access-Control-Allow-Origin: $origem"); header('Vary: Origin');
  header('Access-Control-Allow-Headers: Content-Type, Authorization'); header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
  if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') responde(204);
}

/* caminho depois de /api (ex.: /api/compras/abc → /compras/abc) */
$caminho = (string) parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
$caminho = '/' . trim((string) preg_replace('#^.*?/api(?=/|$)#', '', $caminho), '/');
$metodo = $_SERVER['REQUEST_METHOD'] ?? 'GET';

try {
  $rotas = [
    'GET /saude' => function () { db()->query('SELECT 1'); responde(200, ['ok' => true]); },
    'POST /contas' => 'criaConta', 'POST /sessoes' => 'entra', 'DELETE /sessoes' => 'sai', 'GET /eu' => 'eu', 'PUT /perfil' => 'perfil',
    'POST /partidas' => 'recebePartida', 'GET /progresso' => 'leProgresso', 'PUT /progresso' => 'salvaProgresso', 'GET /analise/personagens' => 'analisePersonagens',
    'GET /pacotes' => 'listaPacotes', 'POST /compras' => 'criaCompra', 'GET /entregas' => 'entregas', 'GET /compras' => 'historicoCompras',
    'POST /pagamentos/webhook' => 'webhook', 'GET /pagamentos/simulador' => 'simuladorPagina', 'POST /pagamentos/simulador' => 'simuladorPaga',
    'GET /amigos' => 'listaAmigos', 'POST /amigos' => 'convidaAmigo',
  ];
  $chave = "$metodo $caminho";
  if (isset($rotas[$chave])) { ($rotas[$chave])(); exit; }
  /* rotas com id no caminho */
  if ($metodo === 'GET' && preg_match('#^/compras/([^/]+)$#', $caminho, $m)) situacaoCompra($m[1]);
  if ($metodo === 'POST' && preg_match('#^/amigos/convites/([^/]+)/aceitar$#', $caminho, $m)) aceitaConvite($m[1]);
  if ($metodo === 'DELETE' && preg_match('#^/amigos/convites/([^/]+)$#', $caminho, $m)) tiraConvite($m[1]);
  if ($metodo === 'DELETE' && preg_match('#^/amigos/([^/]+)$#', $caminho, $m)) tiraAmigo($m[1]);
  erro(404, 'rota não existe');
} catch (Throwable $e) {
  /* erro inesperado: vai para o log de erros do cPanel e responde sem detalhes internos */
  error_log('GN: ' . get_class($e) . ': ' . $e->getMessage() . ' em ' . $e->getFile() . ':' . $e->getLine());
  erro(500, 'erro no servidor');
}
