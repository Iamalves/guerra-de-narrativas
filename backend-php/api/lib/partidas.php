<?php
/* Registro das partidas e progresso do jogador. Equivale a backend/src/{partidas,registro}.ts. */
declare(strict_types=1);

const LIMITE_EVENTOS = 20000, LIMITE_RODADAS = 1000, LIMITE_REGISTRO = 5 * 1024 * 1024;

function nInt($v): ?int { return (is_int($v) || (is_float($v) && is_finite($v))) ? (int) round($v) : null; }
function nNum($v): ?float { return (is_int($v) || (is_float($v) && is_finite($v))) ? (float) $v : null; }
function nTxt($v, int $max = 40): ?string { return (is_string($v) && $v !== '') ? mb_substr($v, 0, $max) : null; }
/** data ISO do jogo → DATETIME(3) em UTC (ou null) */
function nData($v): ?string {
  if (!is_string($v)) return null;
  try { $d = new DateTimeImmutable($v); } catch (Exception $e) { return null; }
  return $d->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s.v');
}

/** confere e normaliza o registro; devolve string com o motivo quando não serve */
function normalizaRegistro($r) {
  if (!ehObj($r)) return 'registro precisa ser um objeto JSON';
  $id = campo($r, 'id');
  if (!is_string($id) || !preg_match('/^[a-z0-9]{6,40}$/i', $id)) return 'registro sem id válido';
  $ev = is_array(campo($r, 'ev')) ? campo($r, 'ev') : [];
  $rods = is_array(campo($r, 'rodadas')) ? campo($r, 'rodadas') : [];
  if (count($ev) > LIMITE_EVENTOS) return 'eventos demais';
  if (count($rods) > LIMITE_RODADAS) return 'rodadas demais';
  $fim = ehObj(campo($r, 'fim')) ? campo($r, 'fim') : null;
  /* partida em andamento (enviada ao sair para o menu ou ao fechar a aba): os números da hora do envio */
  $andamento = !$fim && ehObj(campo($r, 'andamento')) ? campo($r, 'andamento') : null;
  $ultima = $rods && ehObj(end($rods)) ? end($rods) : null;
  $agora = $fim ?? $andamento;
  $partida = [
    'id' => $id, 'versao' => nInt(campo($r, 'v')), 'inicio' => nData(campo($r, 'inicio')), 'uf' => nTxt(campo($r, 'uf'), 4),
    'lado' => nTxt(campo($r, 'lado'), 4), 'dificuldade' => nTxt(campo($r, 'dificuldade'), 12), 'modo' => nTxt(campo($r, 'modo'), 20),
    'resultado' => $fim ? nTxt(campo($fim, 'resultado'), 20) : null,
    'rodada' => $agora ? nInt(campo($agora, 'rodada')) : ($ultima ? nInt(campo($ultima, 'r')) : null),
    'apoio' => $agora ? nInt(campo($agora, 'apoio')) : ($ultima ? nInt(campo($ultima, 'apoio')) : null),
    'verba' => $agora ? nInt(campo($agora, 'verba')) : ($ultima ? nInt(campo($ultima, 'verba')) : null),
  ];
  $eventos = [];
  foreach (array_values($ev) as $i => $e) {
    if (!ehObj($e) || !is_string(campo($e, 't'))) continue;
    $eventos[] = [$i, mb_substr(campo($e, 't'), 0, 30), nInt(campo($e, 'r')), nNum(campo($e, 's')), nInt(campo($e, 'verba')),
      nTxt(campo($e, 'k'), 30), nInt(campo($e, 'x')), nInt(campo($e, 'y')), json($e)];
  }
  /* rodada repetida (partida continuada depois de recarregar): fica a última foto daquela rodada */
  $porRodada = [];
  foreach ($rods as $x) {
    if (!ehObj($x)) continue;
    $n = nInt(campo($x, 'r'));
    if ($n === null) continue;
    $porRodada[$n] = [$n, nInt(campo($x, 'apoio')), nInt(campo($x, 'perdeu')), nInt(campo($x, 'verba')), nInt(campo($x, 'rendaFimRodada')),
      nInt(campo($x, 'convencidos')), nNum(campo($x, 'duracao')), json($x)];
  }
  return ['partida' => $partida, 'eventos' => $eventos, 'rodadas' => array_values($porRodada)];
}

/** insere várias linhas de uma vez, em blocos */
function insereVarias(string $tabela, array $colunas, array $linhas): void {
  foreach (array_chunk($linhas, 500) as $bloco) {
    $ph = implode(',', array_fill(0, count($bloco), '(' . implode(',', array_fill(0, count($colunas), '?')) . ')'));
    q("INSERT INTO $tabela (" . implode(',', $colunas) . ") VALUES $ph", array_merge(...$bloco));
  }
}

/** grava (ou regrava) uma partida. Uma partida de um jogador não pode ser sobrescrita por outro, e uma partida que já
    terminou não volta a "em andamento" (um envio atrasado não apaga o resultado) */
function gravaPartida(array $n, string $registro, ?string $jogadorId): bool {
  return transacao(function () use ($n, $registro, $jogadorId) {
    $p = $n['partida'];
    $ja = linha('SELECT jogador_id, resultado FROM partidas WHERE id = ? FOR UPDATE', [$p['id']]);
    $vals = [$p['versao'], $p['inicio'], $p['uf'], $p['lado'], $p['dificuldade'], $p['modo'], $p['resultado'], $p['rodada'], $p['apoio'], $p['verba'], $registro];
    if ($ja) {
      if ($ja['jogador_id'] !== null && (string) $ja['jogador_id'] !== $jogadorId) return false;
      if ($ja['resultado'] !== null && $p['resultado'] === null) return false;
      q('UPDATE partidas SET jogador_id = COALESCE(?, jogador_id), versao = ?, inicio = ?, uf = ?, lado = ?, dificuldade = ?, modo = ?,
           resultado = ?, rodada = ?, apoio = ?, verba = ?, registro = ?, recebido_em = ? WHERE id = ?',
        array_merge([$jogadorId], $vals, [agora(), $p['id']]));
    } else {
      q('INSERT INTO partidas (id, jogador_id, versao, inicio, uf, lado, dificuldade, modo, resultado, rodada, apoio, verba, registro, recebido_em)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', array_merge([$p['id'], $jogadorId], $vals, [agora()]));
    }
    q('DELETE FROM partida_eventos WHERE partida_id = ?', [$p['id']]);
    q('DELETE FROM partida_rodadas WHERE partida_id = ?', [$p['id']]);
    insereVarias('partida_eventos', ['partida_id', 'ordem', 'tipo', 'rodada', 'segundo', 'verba', 'personagem', 'x', 'y', 'dados'],
      array_map(fn($e) => array_merge([$p['id']], $e), $n['eventos']));
    insereVarias('partida_rodadas', ['partida_id', 'rodada', 'apoio', 'perdeu', 'verba', 'renda', 'convencidos', 'duracao', 'dados'],
      array_map(fn($x) => array_merge([$p['id']], $x), $n['rodadas']));
    return true;
  });
}

/* POST /partidas (com ou sem conta). O jogo só tira um registro da fila com resposta de sucesso e para no primeiro erro:
   um registro que nunca vai servir responde 202 "descartado", senão travaria todos os seguintes */
function recebePartida(): void {
  /* limite por endereço: quem joga manda alguns por partida; um robô mandando milhares para encher o banco é barrado */
  if (!limite('p:' . ip(), 300, 600)) responde(429, ['ok' => false, 'erro' => 'Muitos envios. Tente mais tarde.']);
  $bruto = corpoBruto();
  if (strlen($bruto) > LIMITE_REGISTRO) erro(413, 'envio grande demais');
  $n = normalizaRegistro(corpo());
  if (is_string($n)) responde(202, ['ok' => false, 'descartado' => $n]);
  $j = jogador();
  if (!gravaPartida($n, $bruto, $j['id'] ?? null)) responde(202, ['ok' => false, 'descartado' => 'partida de outro jogador ou já terminada']);
  responde(200, ['ok' => true]);
}

/* GET /progresso → { dados, atualizadoEm }. Antes, garante os heróis comprados com dinheiro (e tira exclusivos não pagos) */
function leProgresso(): void {
  $j = exigeConta();
  $r = linha('SELECT dados, atualizado_em FROM progresso WHERE jogador_id = ?', [$j['id']]);
  $dados = $r ? $r['dados'] : 'null';
  if ($r) { $d = json_decode($r['dados']); if (ehObj($d) && aplicaDireitos($d, direitos($j['id']))) $dados = json($d); }
  responde(200, '{"dados":' . $dados . ',"atualizadoEm":' . json($r ? iso($r['atualizado_em']) : null) . '}');
}

/** progresso do jogo (PROG): objeto com fundo numérico; o resto é guardado como veio */
function validaProgresso($p) {
  if (!ehObj($p)) return 'progresso precisa ser um objeto';
  $f = campo($p, 'fundo');
  if (!(is_int($f) || is_float($f)) || !is_finite((float) $f) || $f < 0) return 'progresso sem fundo válido';
  foreach (['donos', 'faixas', 'difs', 'medalhas', 'lados', 'est'] as $k) if (property_exists($p, $k) && !ehObj($p->$k)) return "campo $k inválido";
  return $p;
}

/* PUT /progresso { dados, entregas? }: "entregas" são as compras que o jogo já somou neste progresso; são marcadas como
   entregues na mesma transação em que o progresso é gravado (nada se perde nem é somado duas vezes) */
function salvaProgresso(): void {
  $j = exigeConta(); $b = corpo();
  $p = validaProgresso(campo($b, 'dados'));
  if (is_string($p)) erro(400, $p);
  $entregas = array_slice(array_values(array_filter(is_array(campo($b, 'entregas')) ? campo($b, 'entregas') : [],
    fn($x) => is_string($x) && preg_match('/^[0-9a-f-]{36}$/', $x))), 0, 50);
  $r = transacao(function () use ($j, $p, $entregas) {
    $quando = agora();
    $guardado = linha('SELECT dados, janela_inicio, ganho_janela FROM progresso WHERE jogador_id = ? FOR UPDATE', [$j['id']]);
    /* compras que este progresso já inclui: o F$ delas não conta como ganho jogando */
    $entregues = []; $entregueFs = 0;
    if ($entregas) {
      $in = implode(',', array_fill(0, count($entregas), '?'));
      $rows = linhas("SELECT id, fs FROM compras WHERE id IN ($in) AND jogador_id = ? AND status = 'aprovada' AND entregue_em IS NULL FOR UPDATE",
        array_merge($entregas, [$j['id']]));
      $entregues = array_column($rows, 'id'); $entregueFs = (int) array_sum(array_column($rows, 'fs'));
      if ($entregues) {
        $in2 = implode(',', array_fill(0, count($entregues), '?'));
        q("UPDATE compras SET entregue_em = ?, atualizada_em = ? WHERE id IN ($in2)", array_merge([$quando, $quando], $entregues));
      }
    }
    [$p, $corrigido, $credito, $horaCredito] = confereEconomia($p, $guardado, $entregueFs, direitos($j['id']));
    q('INSERT INTO progresso (jogador_id, dados, atualizado_em, janela_inicio, ganho_janela) VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE dados = VALUES(dados), atualizado_em = VALUES(atualizado_em), janela_inicio = VALUES(janela_inicio), ganho_janela = VALUES(ganho_janela)',
      [$j['id'], json($p), $quando, $horaCredito, (int) floor($credito)]);
    /* corrigido: o jogo troca o progresso dele por este */
    return ['atualizadoEm' => iso($quando), 'entregues' => $entregues] + ($corrigido ? ['corrigido' => true, 'dados' => $p] : []);
  });
  responde(200, ['ok' => true] + $r);
}

/* GET /analise/personagens: por personagem, quantas vezes foi colocado e em quantas partidas vencidas e perdidas */
function analisePersonagens(): void {
  /* só para quem cuida do jogo: precisa da chave_admin do gn-config.php no cabeçalho X-Chave-Admin */
  $chave = (string) (config()['chave_admin'] ?? '');
  if ($chave === '' || !hash_equals($chave, (string) ($_SERVER['HTTP_X_CHAVE_ADMIN'] ?? ''))) erro(404, 'rota não existe');
  $r = linhas("SELECT personagem, lado, COUNT(*) AS colocados, COUNT(DISTINCT partida_id) AS partidas,
      COUNT(DISTINCT CASE WHEN resultado = 'vitoria' THEN partida_id END) AS vitorias,
      COUNT(DISTINCT CASE WHEN resultado = 'derrota' THEN partida_id END) AS derrotas,
      ROUND(AVG(rodada), 1) AS rodada_media_colocacao
    FROM colocacoes GROUP BY personagem, lado ORDER BY colocados DESC");
  foreach ($r as &$x) foreach (['colocados', 'partidas', 'vitorias', 'derrotas'] as $k) $x[$k] = (int) $x[$k];
  responde(200, $r);
}
