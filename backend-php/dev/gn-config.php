<?php
/* configuração SÓ do teste local no Docker (backend-php/docker-compose.yml). Em produção, use config.exemplo.php */
return [
  'db_host' => 'mysql',
  'db_porta' => 3306,
  'db_nome' => 'guerra',
  'db_usuario' => 'guerra',
  'db_senha' => 'guerra_local',
  'front_url' => 'http://localhost:5173',
  'api_url_publica' => '',
  'mp_access_token' => '',
  'mp_webhook_secret' => '',
  'mp_simulado' => true,
  'chave_admin' => 'chave-de-teste-local',
  'cors_origens' => [],
];
