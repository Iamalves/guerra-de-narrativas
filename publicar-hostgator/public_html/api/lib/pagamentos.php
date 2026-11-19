<?php
/* Compras com dinheiro pelo Mercado Pago (Checkout Pro): pacotes de F$ e pacotes com heróis exclusivos.
   Equivale a backend/src/pagamentos.ts. Só confia no que a API do Mercado Pago responde (nunca no navegador) e confere
   valor e moeda antes de aprovar. Compra aprovada fica "a entregar" até o jogo confirmar no PUT /progresso. */
declare(strict_types=1);

/** pacotes de F$: o preço vale só daqui (o navegador manda só o nome do pacote) */
const PACOTES = [
  'punhado' => ['nome' => 'Punhado de F$', 'fs' => 750, 'centavos' => 490],
  'saco' => ['nome' => 'Saco de F$', 'fs' => 2000, 'centavos' => 990, 'destaque' => 'Recomendado'],
  'cofre' => ['nome' => 'Cofre de F$', 'fs' => 5000, 'centavos' => 1990],
  'fundao' => ['nome' => 'Fundão Partidário', 'fs' => 13500, 'centavos' => 4990, 'destaque' => 'Mais F$ por real'],
];
/** pacotes com heróis exclusivos (um de cada por conta). todos: libera o lado inteiro (a lista é do jogo) */
const PACOTES_HEROIS = [
  'herois_dir' => ['nome' => 'Pacote Lendas da Direita', 'lado' => 'br', 'centavos' => 2999, 'fs' => 0, 'herois' => ['eneaspres', 'flaviohip', 'bolsomito']],
  'herois_esq' => ['nome' => 'Pacote Lendas da Esquerda', 'lado' => 'pt', 'centavos' => 2999, 'fs' => 0, 'herois' => ['lularobo', 'dilmapoderosa', 'erika']],
  'boas_dir' => ['nome' => 'Pacote Boas-vindas', 'lado' => 'br', 'centavos' => 990, 'fs' => 2000, 'herois' => ['bolsomito'], 'boasVindas' => true],
  'boas_esq' => ['nome' => 'Pacote Boas-vindas', 'lado' => 'pt', 'centavos' => 990, 'fs' => 2000, 'herois' => ['lularobo'], 'boasVindas' => true],
  'completo_dir' => ['nome' => 'Pacote Completo da Direita', 'lado' => 'br', 'centavos' => 9999, 'fs' => 0, 'herois' => [], 'todos' => true],
  'completo_esq' => ['nome' => 'Pacote Completo da Esquerda', 'lado' => 'pt', 'centavos' => 9999, 'fs' => 0, 'herois' => [], 'todos' => true],
];
/** bônus da primeira compra de F$ de cada conta (50% a mais) */
const BONUS_PRIMEIRA = 0.5;
const STATUS_MP = ['approved' => 'aprovada', 'authorized' => 'pendente', 'pending' => 'pendente', 'in_process' => 'pendente', 'in_mediation' => 'pendente',
  'rejected' => 'recusada', 'cancelled' => 'cancelada', 'refunded' => 'estornada', 'charged_back' => 'estornada'];

function ehHerois(string $k): bool { return isset(PACOTES_HEROIS[$k]); }
function ehFs(string $k): bool { return isset(PACOTES[$k]); }
function nomePacote(string $k): string { return PACOTES_HEROIS[$k]['nome'] ?? PACOTES[$k]['nome'] ?? $k; }
function heroisDe(string $k): array { return PACOTES_HEROIS[$k]['herois'] ?? []; }
function todosDe(string $k): ?string { return !empty(PACOTES_HEROIS[$k]['todos']) ? PACOTES_HEROIS[$k]['lado'] : null; }
function oQueVem(int $fs, string $pacote = ''): string {
  if (todosDe($pacote)) return 'todos os personagens e heróis do lado, até os exclusivos';
  $h = count(heroisDe($pacote));
  $p = array_filter([$fs ? 'F$ ' . number_format($fs, 0, ',', '.') : '', $h ? ($h === 1 ? '1 herói exclusivo' : "$h heróis exclusivos") : '']);
  return implode(' + ', $p);
}
function jaComprou(string $jogadorId, string $fora = ''): bool {
  return (bool) linha("SELECT 1 FROM compras WHERE jogador_id = ? AND status = 'aprovada' AND id <> ? LIMIT 1", [$jogadorId, $fora]);
}
function mpToken(): string { return trim((string) config()['mp_access_token']); }
function simulado(): bool { return !empty(config()['mp_simulado']) && mpToken() === ''; }
function pagamentosLigados(): bool { return mpToken() !== '' || simulado(); }
/** endereço deste site, tirado do próprio pedido (a API fica no mesmo domínio do jogo) */
function siteDoPedido(): string {
  $https = ($_SERVER['HTTPS'] ?? '') === 'on' || strtolower((string) ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '')) === 'https';
  return ($https ? 'https' : 'http') . '://' . preg_replace('/[^A-Za-z0-9.:\[\]-]/', '', (string) ($_SERVER['HTTP_HOST'] ?? 'localhost'));
}
/** endereço da configuração; vazio ou ainda o exemplo (seudominio): usa o do próprio site, para a volta do pagamento nunca quebrar */
function enderecoConfig(string $chave): string {
  $v = rtrim(trim((string) config()[$chave]), '/');
  return $v === '' || stripos($v, 'seudominio') !== false ? siteDoPedido() : $v;
}
/** para onde o jogador volta depois de pagar */
function frontUrl(): string { return enderecoConfig('front_url'); }
/** endereço público da API (avisos do Mercado Pago): só com https, que é o que o Mercado Pago aceita */
function apiPublica(): string { $u = enderecoConfig('api_url_publica'); return strpos($u, 'https://') === 0 ? $u : ''; }

/* ---------- API do Mercado Pago (cURL) ---------- */
function mp(string $caminho, string $metodo = 'GET', $corpo = null, ?string $idempotencia = null): array {
  $ch = curl_init('https://api.mercadopago.com' . $caminho);
  $cab = ['Authorization: Bearer ' . mpToken()];
  if ($corpo !== null) $cab[] = 'Content-Type: application/json';
  if ($idempotencia) $cab[] = 'X-Idempotency-Key: ' . $idempotencia;
  curl_setopt_array($ch, [CURLOPT_CUSTOMREQUEST => $metodo, CURLOPT_HTTPHEADER => $cab, CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 15,
    CURLOPT_POSTFIELDS => $corpo !== null ? json($corpo) : null]);
  $txt = curl_exec($ch); $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE); $falha = curl_error($ch); curl_close($ch);
  if ($txt === false) throw new RuntimeException('Mercado Pago sem resposta: ' . $falha);
  $d = json_decode((string) $txt, true) ?? [];
  if ($status < 200 || $status >= 300) throw new RuntimeException("Mercado Pago respondeu $status: " . substr((string) $txt, 0, 300));
  return $d;
}

/** aplica um pagamento (da API do Mercado Pago ou do simulador) à compra dele */
function aplicaPagamento(array $p): void {
  $compraId = (string) ($p['external_reference'] ?? '');
  if (!preg_match('/^[0-9a-f-]{36}$/', $compraId)) return;
  $c = linha('SELECT valor_centavos, moeda, status, jogador_id, fs, bonus, pacote FROM compras WHERE id = ?', [$compraId]);
  if (!$c) return;
  $novo = STATUS_MP[$p['status'] ?? ''] ?? 'pendente';
  if ($novo === 'aprovada' && ((int) round(((float) ($p['transaction_amount'] ?? 0)) * 100) !== (int) $c['valor_centavos'] || ($p['currency_id'] ?? 'BRL') !== $c['moeda'])) {
    error_log("GN: pagamento {$p['id']} com valor ou moeda diferentes da compra $compraId: não aprovado");
    $novo = 'recusada';
  }
  if ($c['status'] === 'aprovada' && $novo === 'pendente') return;
  /* primeira compra aprovada de F$ da conta: rende BONUS_PRIMEIRA a mais (decidido na aprovação) */
  if ($novo === 'aprovada' && $c['status'] !== 'aprovada' && (int) $c['fs'] > 0 && !(int) $c['bonus'] && !ehHerois($c['pacote']) && !jaComprou((string) $c['jogador_id'], $compraId))
    q('UPDATE compras SET fs = ROUND(fs * ?), bonus = 1 WHERE id = ? AND bonus = 0', [1 + BONUS_PRIMEIRA, $compraId]);
  $quando = agora();
  q("UPDATE compras SET status = ?, status_mp = ?, status_detalhe = ?, mp_pagamento = ?, atualizada_em = ?,
       aprovada_em = CASE WHEN ? = 'aprovada' THEN COALESCE(aprovada_em, ?) ELSE aprovada_em END WHERE id = ?",
    [$novo, $p['status'] ?? null, isset($p['status_detail']) ? substr((string) $p['status_detail'], 0, 80) : null, (string) $p['id'], $quando, $novo, $quando, $compraId]);
  if ($novo === 'estornada' && $c['status'] === 'aprovada') error_log("GN: compra $compraId estornada depois de aprovada: confira o F$ ou os heróis do jogador.");
}
/** pergunta ao Mercado Pago o último pagamento desta compra */
function confereNoMercadoPago(string $compraId): void {
  if (mpToken() === '') return;
  $r = mp("/v1/payments/search?external_reference=$compraId&sort=date_created&criteria=desc");
  if (!empty($r['results'][0])) aplicaPagamento($r['results'][0]);
}
/** confere as compras abertas do jogador (dos últimos 3 dias, no máximo 5, cada uma no máximo a cada 20 s) */
function confereAbertas(string $jogadorId): void {
  if (mpToken() === '') return;
  $ids = array_column(linhas("SELECT id FROM compras WHERE jogador_id = ? AND status IN ('criada', 'pendente') AND simulada = 0
      AND criada_em > UTC_TIMESTAMP() - INTERVAL 3 DAY AND atualizada_em < UTC_TIMESTAMP() - INTERVAL 20 SECOND ORDER BY criada_em DESC LIMIT 5", [$jogadorId]), 'id');
  foreach ($ids as $id) {
    q('UPDATE compras SET atualizada_em = ? WHERE id = ?', [agora(), $id]);
    try { confereNoMercadoPago($id); } catch (Throwable $e) { error_log("GN: conferindo compra $id: " . $e->getMessage()); }
  }
}
/** webhook: confere a assinatura x-signature (HMAC-SHA256 com a chave secreta do painel do Mercado Pago) */
function assinaturaValida(string $dataId): bool {
  $segredo = trim((string) config()['mp_webhook_secret']);
  if ($segredo === '') return true; // sem chave não dá para conferir; o pagamento é sempre lido da API do Mercado Pago
  $partes = [];
  foreach (explode(',', (string) ($_SERVER['HTTP_X_SIGNATURE'] ?? '')) as $p) { $kv = explode('=', trim($p), 2); if (count($kv) === 2) $partes[$kv[0]] = $kv[1]; }
  if (empty($partes['ts']) || empty($partes['v1'])) return false;
  $manifesto = 'id:' . strtolower($dataId) . ';request-id:' . ($_SERVER['HTTP_X_REQUEST_ID'] ?? '') . ';ts:' . $partes['ts'] . ';';
  return hash_equals(hash_hmac('sha256', $manifesto, $segredo), $partes['v1']);
}

/* GET /pacotes: com conta, diz também se a primeira compra tem bônus e quais pacotes de heróis já foram comprados */
function listaPacotes(): void {
  $j = jogador(); $primeira = true; $comprados = [];
  if ($j) {
    $primeira = !jaComprou($j['id']);
    $in = implode(',', array_fill(0, count(PACOTES_HEROIS), '?'));
    $comprados = array_column(linhas("SELECT DISTINCT pacote FROM compras WHERE jogador_id = ? AND status = 'aprovada' AND pacote IN ($in)",
      array_merge([$j['id']], array_keys(PACOTES_HEROIS))), 'pacote');
  }
  $pac = []; foreach (PACOTES as $id => $p) $pac[] = ['id' => $id] + $p;
  $her = []; foreach (PACOTES_HEROIS as $id => $p) $her[] = ['id' => $id] + $p + ['comprado' => in_array($id, $comprados, true)];
  responde(200, ['ligado' => pagamentosLigados(), 'simulado' => simulado(), 'bonusPrimeira' => $primeira ? BONUS_PRIMEIRA : 0, 'pacotes' => $pac, 'herois' => $her]);
}

/* POST /compras { pacote }: cria a compra e a preferência de pagamento */
function criaCompra(): void {
  $j = exigeConta(); $chave = campo(corpo(), 'pacote');
  if (!is_string($chave) || (!ehFs($chave) && !ehHerois($chave))) erro(400, 'Pacote não existe.');
  if (!pagamentosLigados()) erro(503, 'As compras ainda não estão disponíveis.');
  if (ehHerois($chave) && linha("SELECT 1 FROM compras WHERE jogador_id = ? AND pacote = ? AND status = 'aprovada'", [$j['id'], $chave]))
    erro(409, 'Você já tem esse pacote: os heróis estão na sua conta.');
  $p = ehHerois($chave) ? PACOTES_HEROIS[$chave] : PACOTES[$chave];
  $sim = mpToken() === '';
  $id = uuid4(); $quando = agora();
  q('INSERT INTO compras (id, jogador_id, pacote, fs, valor_centavos, simulada, criada_em, atualizada_em) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [$id, $j['id'], $chave, $p['fs'], $p['centavos'], $sim ? 1 : 0, $quando, $quando]);
  $volta = frontUrl() . '/?compra=' . $id;
  if ($sim) {
    /* simulador: a "página de pagamento" é desta própria API (só sem Access Token e com mp_simulado ligado) */
    $base = apiPublica() ?: ((($_SERVER['HTTPS'] ?? '') === 'on' ? 'https' : 'http') . '://' . ($_SERVER['HTTP_HOST'] ?? 'localhost'));
    responde(201, ['id' => $id, 'url' => "$base/api/pagamentos/simulador?compra=$id"]);
  }
  $email = linha('SELECT email FROM jogadores WHERE id = ?', [$j['id']])['email'] ?? null;
  $pref = mp('/checkout/preferences', 'POST', array_filter([
    'items' => [['id' => $chave, 'title' => $p['nome'] . ' (' . oQueVem((int) $p['fs'], $chave) . ') - Guerra de Narrativas', 'quantity' => 1,
      'unit_price' => $p['centavos'] / 100, 'currency_id' => 'BRL', 'category_id' => 'virtual_goods']],
    'external_reference' => $id,
    'payer' => $email ? ['email' => $email] : null,
    'back_urls' => ['success' => $volta, 'pending' => $volta, 'failure' => $volta],
    'auto_return' => strpos($volta, 'https://') === 0 ? 'approved' : null,          // só funciona com https
    'notification_url' => apiPublica() ? apiPublica() . '/api/pagamentos/webhook' : null,
    'statement_descriptor' => 'GUERRANARRATIVAS',
    'expires' => true, 'expiration_date_to' => gmdate('Y-m-d\TH:i:s.000\Z', time() + 86400),
  ], fn($v) => $v !== null), $id);
  q('UPDATE compras SET mp_preferencia = ?, atualizada_em = ? WHERE id = ?', [$pref['id'] ?? null, agora(), $id]);
  $url = strpos(mpToken(), 'TEST-') === 0 && !empty($pref['sandbox_init_point']) ? $pref['sandbox_init_point'] : $pref['init_point'];
  responde(201, ['id' => $id, 'url' => $url]);
}

function compraParaJson(array $c): array {
  return ['id' => $c['id'], 'pacote' => $c['pacote'], 'fs' => (int) $c['fs'], 'status' => $c['status'], 'entregue' => (bool) $c['entregue'],
    'herois' => heroisDe($c['pacote']), 'todos' => todosDe($c['pacote'])];
}
/* GET /compras/{id}: situação de uma compra (na volta do pagamento); se ainda não terminou, pergunta ao Mercado Pago */
function situacaoCompra(string $id): void {
  $j = exigeConta();
  if (!preg_match('/^[0-9a-f-]{36}$/', $id)) erro(404, 'Compra não encontrada.');
  $le = fn() => linha('SELECT id, pacote, fs, status, entregue_em IS NOT NULL AS entregue FROM compras WHERE id = ? AND jogador_id = ?', [$id, $j['id']]);
  $c = $le();
  if (!$c) erro(404, 'Compra não encontrada.');
  if (in_array($c['status'], ['criada', 'pendente'], true)) {
    try { confereNoMercadoPago($id); $c = $le(); } catch (Throwable $e) { error_log('GN: ' . $e->getMessage()); }
  }
  responde(200, compraParaJson($c));
}
/* GET /entregas: compras aprovadas que o jogo ainda não entregou */
function entregas(): void {
  $j = exigeConta();
  confereAbertas($j['id']);
  $r = linhas("SELECT id, pacote, fs, bonus FROM compras WHERE jogador_id = ? AND status = 'aprovada' AND entregue_em IS NULL ORDER BY aprovada_em", [$j['id']]);
  responde(200, array_map(fn($c) => ['id' => $c['id'], 'pacote' => $c['pacote'], 'fs' => (int) $c['fs'], 'bonus' => (bool) $c['bonus'],
    'herois' => heroisDe($c['pacote']), 'todos' => todosDe($c['pacote'])], $r));
}
/* GET /compras: histórico */
function historicoCompras(): void {
  $j = exigeConta();
  $r = linhas('SELECT id, pacote, fs, valor_centavos, status, criada_em, entregue_em IS NOT NULL AS entregue FROM compras WHERE jogador_id = ? ORDER BY criada_em DESC LIMIT 50', [$j['id']]);
  responde(200, array_map(fn($c) => ['id' => $c['id'], 'pacote' => $c['pacote'], 'fs' => (int) $c['fs'], 'valor_centavos' => (int) $c['valor_centavos'],
    'status' => $c['status'], 'criada_em' => iso($c['criada_em']), 'entregue' => (bool) $c['entregue']], $r));
}
/* POST /pagamentos/webhook: só usa o id; o pagamento é lido da API do Mercado Pago */
function webhook(): void {
  $b = corpo();
  $tipo = campo($b, 'type') ?? ($_GET['type'] ?? $_GET['topic'] ?? null);
  $dataId = (string) (campo(campo($b, 'data'), 'id') ?? ($_GET['data_id'] ?? $_GET['data.id'] ?? $_GET['id'] ?? ''));
  if ($tipo !== 'payment' || !preg_match('/^\d+$/', $dataId)) { http_response_code(200); exit; }
  if (!assinaturaValida($dataId)) { http_response_code(401); exit; }
  if (mpToken() === '') { http_response_code(200); exit; }
  try { aplicaPagamento(mp("/v1/payments/$dataId")); http_response_code(200); }
  catch (Throwable $e) {
    /* pagamento que não existe (como o "simular notificação" do painel): nada a fazer, sem reenvio */
    if (strpos($e->getMessage(), 'respondeu 404') !== false) { error_log("GN: webhook de pagamento $dataId que não existe: ignorado"); http_response_code(200); }
    else { error_log('GN: ' . $e->getMessage()); http_response_code(500); } // o Mercado Pago tenta de novo mais tarde
  }
  exit;
}

/* ---------- simulador de pagamento (só sem Access Token e com mp_simulado ligado) ---------- */
function simuladorPagina(): void {
  if (!simulado()) erro(404, 'rota não existe');
  $id = (string) ($_GET['compra'] ?? '');
  $c = preg_match('/^[0-9a-f-]{36}$/', $id) ? linha('SELECT pacote, fs, valor_centavos, simulada FROM compras WHERE id = ?', [$id]) : null;
  if (!$c || !(int) $c['simulada']) erro(404, 'compra não encontrada');
  $e = fn($s) => htmlspecialchars((string) $s, ENT_QUOTES);
  $valor = 'R$ ' . number_format($c['valor_centavos'] / 100, 2, ',', '.');
  $bt = fn($st, $txt, $cor) => "<form method=\"post\" action=\"simulador\"><input type=\"hidden\" name=\"compra\" value=\"{$e($id)}\"><input type=\"hidden\" name=\"status\" value=\"$st\"><button style=\"background:$cor\">$txt</button></form>";
  header('Content-Type: text/html; charset=utf-8');
  echo '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Simulador de pagamento</title>'
    . '<body style="font-family:Arial,sans-serif;background:#eee;display:flex;justify-content:center;padding:30px"><div style="background:#fff;border-radius:10px;padding:22px;max-width:380px;box-shadow:0 2px 10px #0002">'
    . '<p style="background:#fff3c4;padding:8px;border-radius:6px;font-size:13px"><b>Simulador de desenvolvimento.</b> Nenhum dinheiro é cobrado.</p>'
    . '<h2>' . $e(nomePacote($c['pacote'])) . '</h2><p>' . $e(oQueVem((int) $c['fs'], $c['pacote'])) . " por <b>$valor</b></p>"
    . '<style>button{width:100%;margin:6px 0;padding:12px;border:0;border-radius:6px;color:#fff;font-size:16px;cursor:pointer}</style>'
    . $bt('approved', 'Pagar (aprovado)', '#009ee3') . $bt('pending', 'Pagar com PIX (fica pendente)', '#555') . $bt('rejected', 'Cartão recusado', '#c8102e')
    . '</div></body>';
  exit;
}
function simuladorPaga(): void {
  if (!simulado()) erro(404, 'rota não existe');
  $id = (string) ($_POST['compra'] ?? ''); $st = (string) ($_POST['status'] ?? '');
  $c = preg_match('/^[0-9a-f-]{36}$/', $id) ? linha('SELECT valor_centavos, simulada FROM compras WHERE id = ?', [$id]) : null;
  if (!$c || !(int) $c['simulada'] || !isset(STATUS_MP[$st])) erro(400, 'pedido inválido');
  aplicaPagamento(['id' => (string) (int) (microtime(true) * 1000), 'status' => $st, 'status_detail' => 'simulado', 'external_reference' => $id,
    'transaction_amount' => $c['valor_centavos'] / 100, 'currency_id' => 'BRL']);
  header('Location: ' . frontUrl() . '/?compra=' . $id, true, 303);
  exit;
}
