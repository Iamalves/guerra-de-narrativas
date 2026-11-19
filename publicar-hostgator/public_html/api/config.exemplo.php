<?php
/* Configuração da API. Copie este arquivo para gn-config.php UMA PASTA ACIMA do public_html
   (no cPanel: /home/SEU_USUARIO/gn-config.php), fora do site, e preencha. Não envie senhas por e-mail nem chat. */
return [
  /* banco MySQL criado no cPanel (Bancos de dados MySQL). No cPanel o nome e o usuário ganham o prefixo da conta */
  'db_host' => 'localhost',
  'db_porta' => 3306,
  'db_nome' => 'usuario_guerra',
  'db_usuario' => 'usuario_guerra',
  'db_senha' => 'TROQUE-ESTA-SENHA',

  /* endereço do jogo, em https (para onde o jogador volta depois de pagar). Se ficar vazio ou com "seudominio",
     a API usa o endereço do próprio site em que o jogador está */
  'front_url' => 'https://seudominio.com.br',
  /* endereço público da API (o mesmo domínio): recebe os avisos de pagamento do Mercado Pago */
  'api_url_publica' => 'https://seudominio.com.br',

  /* Mercado Pago (Checkout Pro): Access Token de PRODUÇÃO e a chave secreta do webhook (Suas integrações → Webhooks) */
  'mp_access_token' => '',
  'mp_webhook_secret' => '',
  /* simulador de pagamento: só para testes, e só funciona sem Access Token. Em produção, deixe false */
  'mp_simulado' => false,

  /* chave para ver /api/analise/personagens (cabeçalho X-Chave-Admin). Vazia: a rota fica desligada.
     Use um texto longo e aleatório (ex.: o gerador de senhas do cPanel) */
  'chave_admin' => '',

  /* só se o jogo ficar em OUTRO domínio: endereços que podem chamar a API */
  'cors_origens' => [],
];
