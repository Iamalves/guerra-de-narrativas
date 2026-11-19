-- Guerra de Narrativas: banco MySQL/MariaDB (HostGator, cPanel). Equivale às migrações 001 a 007 do PostgreSQL.
-- Funciona em MySQL 5.7+ e MariaDB 10.3+. Datas em UTC. JSON guardado como texto (LONGTEXT), lido pelo PHP.

CREATE TABLE jogadores (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  nome        VARCHAR(40) NOT NULL,
  nome_chave  VARCHAR(40) NOT NULL,           -- apelido em minúsculas, para não haver "Ana" e "ana"
  email       VARCHAR(254) NULL,
  email_chave VARCHAR(254) NULL,              -- e-mail em minúsculas (único)
  senha_hash  VARCHAR(255) NOT NULL,
  lado        VARCHAR(2) NULL,                -- 'pt' (Esquerda) ou 'br' (Direita); vazio até escolher
  criado_em   DATETIME NOT NULL,
  UNIQUE KEY jogadores_nome (nome_chave),
  UNIQUE KEY jogadores_email (email_chave)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- sessão: o jogador guarda o token; aqui fica só o hash dele
CREATE TABLE sessoes (
  token_hash  CHAR(64) NOT NULL PRIMARY KEY,
  jogador_id  BIGINT UNSIGNED NOT NULL,
  criada_em   DATETIME NOT NULL,
  expira_em   DATETIME NOT NULL,
  KEY sessoes_jogador (jogador_id),
  CONSTRAINT sessoes_jogador_fk FOREIGN KEY (jogador_id) REFERENCES jogadores(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- progresso do jogo (o PROG inteiro, em JSON)
CREATE TABLE progresso (
  jogador_id     BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  dados          LONGTEXT NOT NULL,
  atualizado_em  DATETIME(3) NOT NULL,
  CONSTRAINT progresso_jogador_fk FOREIGN KEY (jogador_id) REFERENCES jogadores(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- registro de cada partida (para o equilíbrio do jogo)
CREATE TABLE partidas (
  id           VARCHAR(40) NOT NULL PRIMARY KEY,   -- código aleatório criado pelo jogo
  jogador_id   BIGINT UNSIGNED NULL,               -- vazio quando jogou sem conta
  versao       INT NULL,
  inicio       DATETIME(3) NULL,
  uf           VARCHAR(4) NULL,
  lado         VARCHAR(4) NULL,
  dificuldade  VARCHAR(12) NULL,
  modo         VARCHAR(20) NULL,
  resultado    VARCHAR(20) NULL,                   -- vitoria, derrota, abandonada, fimModoLivre (vazio: em andamento)
  rodada       INT NULL,
  apoio        INT NULL,
  verba        INT NULL,
  registro     LONGTEXT NOT NULL,
  recebido_em  DATETIME(3) NOT NULL,
  KEY partidas_jogador (jogador_id),
  KEY partidas_mapa (uf, dificuldade, lado),
  CONSTRAINT partidas_jogador_fk FOREIGN KEY (jogador_id) REFERENCES jogadores(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- cada ação da partida, em ordem
CREATE TABLE partida_eventos (
  partida_id  VARCHAR(40) NOT NULL,
  ordem       INT NOT NULL,
  tipo        VARCHAR(30) NOT NULL,
  rodada      INT NULL,
  segundo     FLOAT NULL,
  verba       INT NULL,
  personagem  VARCHAR(30) NULL,
  x           INT NULL,
  y           INT NULL,
  dados       LONGTEXT NOT NULL,
  PRIMARY KEY (partida_id, ordem),
  KEY partida_eventos_tipo (tipo, personagem),
  CONSTRAINT partida_eventos_fk FOREIGN KEY (partida_id) REFERENCES partidas(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- a foto do fim de cada rodada
CREATE TABLE partida_rodadas (
  partida_id   VARCHAR(40) NOT NULL,
  rodada       INT NOT NULL,
  apoio        INT NULL,
  perdeu       INT NULL,
  verba        INT NULL,
  renda        INT NULL,
  convencidos  INT NULL,
  duracao      FLOAT NULL,
  dados        LONGTEXT NOT NULL,
  PRIMARY KEY (partida_id, rodada),
  CONSTRAINT partida_rodadas_fk FOREIGN KEY (partida_id) REFERENCES partidas(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- compras com dinheiro (Mercado Pago). fs = F$ entregue (0 nos pacotes só de heróis); bonus = recebeu o bônus da 1ª compra
CREATE TABLE compras (
  id              CHAR(36) NOT NULL PRIMARY KEY,
  jogador_id      BIGINT UNSIGNED NOT NULL,
  pacote          VARCHAR(30) NOT NULL,
  fs              INT NOT NULL,
  valor_centavos  INT NOT NULL,
  moeda           VARCHAR(3) NOT NULL DEFAULT 'BRL',
  status          VARCHAR(20) NOT NULL DEFAULT 'criada',   -- criada, pendente, aprovada, recusada, cancelada, estornada
  status_mp       VARCHAR(30) NULL,
  status_detalhe  VARCHAR(80) NULL,
  mp_preferencia  VARCHAR(80) NULL,
  mp_pagamento    VARCHAR(40) NULL,
  simulada        TINYINT(1) NOT NULL DEFAULT 0,
  bonus           TINYINT(1) NOT NULL DEFAULT 0,
  criada_em       DATETIME(3) NOT NULL,
  atualizada_em   DATETIME(3) NOT NULL,
  aprovada_em     DATETIME(3) NULL,
  entregue_em     DATETIME(3) NULL,
  UNIQUE KEY compras_mp_pagamento (mp_pagamento),
  KEY compras_jogador (jogador_id, criada_em),
  KEY compras_status (jogador_id, status, entregue_em),
  CONSTRAINT compras_jogador_fk FOREIGN KEY (jogador_id) REFERENCES jogadores(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- amigos: as duas linhas (A→B e B→A) depois do aceite; o que não foi aceito fica em convites_amizade
CREATE TABLE amizades (
  jogador_id  BIGINT UNSIGNED NOT NULL,
  amigo_id    BIGINT UNSIGNED NOT NULL,
  criada_em   DATETIME NOT NULL,
  PRIMARY KEY (jogador_id, amigo_id),
  KEY amizades_amigo (amigo_id),
  CONSTRAINT amizades_jogador_fk FOREIGN KEY (jogador_id) REFERENCES jogadores(id) ON DELETE CASCADE,
  CONSTRAINT amizades_amigo_fk FOREIGN KEY (amigo_id) REFERENCES jogadores(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE convites_amizade (
  de_id      BIGINT UNSIGNED NOT NULL,
  para_id    BIGINT UNSIGNED NOT NULL,
  criado_em  DATETIME NOT NULL,
  PRIMARY KEY (de_id, para_id),
  KEY convites_para (para_id),
  CONSTRAINT convites_de_fk FOREIGN KEY (de_id) REFERENCES jogadores(id) ON DELETE CASCADE,
  CONSTRAINT convites_para_fk FOREIGN KEY (para_id) REFERENCES jogadores(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- limite de tentativas (login, criar conta, convites): no PHP não há memória entre pedidos, então fica no banco
CREATE TABLE tentativas (
  chave  VARCHAR(120) NOT NULL PRIMARY KEY,
  n      INT NOT NULL,
  ate    DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- atalhos para as perguntas mais comuns de equilíbrio
CREATE VIEW colocacoes AS
  SELECT e.partida_id, p.jogador_id, p.uf, p.lado, p.dificuldade, p.resultado,
         e.ordem, e.rodada, e.segundo, e.personagem, e.x, e.y,
         CAST(JSON_UNQUOTE(JSON_EXTRACT(e.dados, '$.custo')) AS SIGNED) AS custo,
         CAST(JSON_UNQUOTE(JSON_EXTRACT(e.dados, '$.distAvenida')) AS SIGNED) AS dist_avenida,
         JSON_UNQUOTE(JSON_EXTRACT(e.dados, '$.pontoDaAvenida')) AS ponto_da_avenida,
         JSON_UNQUOTE(JSON_EXTRACT(e.dados, '$.morro')) AS morro
  FROM partida_eventos e JOIN partidas p ON p.id = e.partida_id
  WHERE e.tipo = 'colocar';

CREATE VIEW evolucoes AS
  SELECT e.partida_id, p.jogador_id, p.uf, p.lado, p.dificuldade, p.resultado,
         e.ordem, e.rodada, e.segundo, e.personagem,
         JSON_UNQUOTE(JSON_EXTRACT(e.dados, '$.nome')) AS evolucao,
         JSON_UNQUOTE(JSON_EXTRACT(e.dados, '$.caminho')) AS caminho,
         JSON_UNQUOTE(JSON_EXTRACT(e.dados, '$.nivel')) AS nivel,
         CAST(JSON_UNQUOTE(JSON_EXTRACT(e.dados, '$.custo')) AS SIGNED) AS custo
  FROM partida_eventos e JOIN partidas p ON p.id = e.partida_id
  WHERE e.tipo = 'evoluir';
