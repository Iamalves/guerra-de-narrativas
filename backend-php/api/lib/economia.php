<?php
/* Contra trapaça no progresso (2026-11-18). O jogo roda no navegador, então quem souber mexer nos dados consegue mudar
   o próprio progresso. O servidor não confia nele cegamente:
   1) heróis exclusivos (só com dinheiro): só ficam na conta que comprou o pacote; os comprados sempre voltam;
   2) "Pacote Completo": libera o lado inteiro de graça para quem comprou;
   3) F$: o ganho jogando tem um teto por tempo (crédito que se renova com o tempo), e cada personagem novo liberado
      precisa ter custado o preço dele em F$ (tabela precos.json, tirada do motor do jogo).
   O que passar disso é corrigido (não recusado), e o jogo recebe a versão corrigida. */
declare(strict_types=1);

const CREDITO_POR_HORA = 15000;   // F$ que dá para ganhar jogando por hora (bem acima do que um jogador consegue)
const CREDITO_MAXIMO = 45000;     // acumula no máximo 3 horas (quem joga sem internet e sincroniza depois)
const CREDITO_INICIAL = 20000;    // primeira gravação da conta (pode trazer o progresso de quem jogava sem conta)
const PRECO_DESCONHECIDO = 250;   // personagem fora da tabela: pelo menos o menor preço da loja

function tabelaPrecos(): array {
  static $t = null;
  if ($t === null) $t = json_decode((string) @file_get_contents(dirname(__DIR__) . '/precos.json'), true) ?: ['iniciais' => [], 'exclusivos' => [], 'lados' => [], 'precos' => []];
  return $t;
}
function ehExclusivo(string $k): ?string { foreach (tabelaPrecos()['exclusivos'] as $lado => $ks) if (in_array($k, $ks, true)) return $lado; return null; }

/** o que a conta comprou com dinheiro: heróis exclusivos e lados completos */
function direitos(string $jogadorId): array {
  $herois = []; $lados = [];
  foreach (linhas("SELECT DISTINCT pacote FROM compras WHERE jogador_id = ? AND status = 'aprovada'", [$jogadorId]) as $r) {
    foreach (heroisDe($r['pacote']) as $k) $herois[$k] = true;
    if ($l = todosDe($r['pacote'])) $lados[$l] = true;
  }
  foreach (array_keys($lados) as $l) foreach (tabelaPrecos()['exclusivos'][$l] ?? [] as $k) $herois[$k] = true;
  return ['herois' => $herois, 'lados' => $lados];
}

/** heróis comprados sempre presentes, e exclusivos não comprados fora (usado ao gravar e ao ler) */
function aplicaDireitos(stdClass $dados, array $dir): bool {
  $mudou = false;
  if (!ehObj(campo($dados, 'donos'))) { $dados->donos = new stdClass(); $mudou = true; }
  foreach (get_object_vars($dados->donos) as $k => $v) if (ehExclusivo((string) $k) && empty($dir['herois'][$k])) { unset($dados->donos->$k); $mudou = true; }
  foreach (array_keys($dir['herois']) as $k) if (!property_exists($dados->donos, $k)) { $dados->donos->$k = 1; $mudou = true; }
  foreach (array_keys($dir['lados']) as $l) foreach (tabelaPrecos()['lados'][$l] ?? [] as $k)
    if (!property_exists($dados->donos, $k)) { $dados->donos->$k = 1; $mudou = true; }
  return $mudou;
}

/** confere o progresso novo contra o guardado. Devolve [dados, corrigido, credito restante, hora do crédito] */
function confereEconomia(stdClass $novo, ?array $guardado, int $entregueFs, array $dir): array {
  $corrigido = aplicaDireitos($novo, $dir);
  $tab = tabelaPrecos();
  $antigo = $guardado ? json_decode($guardado['dados']) : null;
  $fundoAntigo = (float) (campo($antigo, 'fundo') ?? 0);
  $donosAntigos = ehObj(campo($antigo, 'donos')) ? get_object_vars($antigo->donos) : [];
  /* crédito de ganho: renova com o tempo desde a última gravação */
  if ($guardado && $guardado['janela_inicio'] !== null) {
    $horas = max(0, time() - strtotime($guardado['janela_inicio'] . ' UTC')) / 3600;
    $credito = floor(min(CREDITO_MAXIMO, (float) $guardado['ganho_janela'] + $horas * CREDITO_POR_HORA));
  } else $credito = $guardado ? CREDITO_POR_HORA : CREDITO_INICIAL;

  /* personagens novos que precisam ter custado F$ (não contam iniciais, exclusivos, nem os do lado completo comprado) */
  $novos = [];
  foreach (get_object_vars($novo->donos) as $k => $v) {
    $k = (string) $k;
    if (isset($donosAntigos[$k]) || in_array($k, $tab['iniciais'], true) || ehExclusivo($k)) continue;
    $doLadoCompleto = false;
    foreach (array_keys($dir['lados']) as $l) if (in_array($k, $tab['lados'][$l] ?? [], true)) $doLadoCompleto = true;
    if (!$doLadoCompleto) $novos[$k] = (int) ($tab['precos'][$k] ?? PRECO_DESCONHECIDO);
  }
  $fundoNovo = (float) $novo->fundo;
  $custo = array_sum($novos);
  /* ganho jogando = o que apareceu além do que já havia, do que foi comprado com dinheiro e do que foi gasto na loja */
  $ganho = $fundoNovo + $custo - $fundoAntigo - $entregueFs;
  if ($ganho > $credito) {
    $excesso = $ganho - $credito;
    $tira = min($fundoNovo, ceil($excesso));
    $fundoNovo -= $tira; $excesso -= $tira;
    /* ainda sobrou: os personagens liberados sem F$ suficiente saem (os mais caros primeiro) */
    arsort($novos);
    foreach ($novos as $k => $preco) { if ($excesso <= 0) break; unset($novo->donos->$k, $novos[$k]); $excesso -= $preco; }
    $novo->fundo = $fundoNovo == floor($fundoNovo) ? (int) $fundoNovo : $fundoNovo;
    $ganho = $fundoNovo + array_sum($novos) - $fundoAntigo - $entregueFs;
    $corrigido = true;
    error_log("GN: progresso corrigido (ganho acima do possível)");
  }
  return [$novo, $corrigido, max(0, $credito - max(0, $ganho)), gmdate('Y-m-d H:i:s')];
}
