-- Esquema inicial do Guerra de Narrativas.
-- Aplicado pelo backend ao iniciar (cada arquivo de banco/migracoes roda uma vez só, em ordem, e fica anotado em "migracoes").

-- jogadores: conta com apelido e senha (a senha fica só como hash scrypt)
CREATE TABLE jogadores (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nome        TEXT NOT NULL,
  nome_chave  TEXT NOT NULL UNIQUE,          -- apelido em minúsculas, para não haver "Ana" e "ana"
  senha_hash  TEXT NOT NULL,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- sessões: o token fica com o jogador; aqui só o hash dele
CREATE TABLE sessoes (
  token_hash  TEXT PRIMARY KEY,
  jogador_id  BIGINT NOT NULL REFERENCES jogadores(id) ON DELETE CASCADE,
  criada_em   TIMESTAMPTZ NOT NULL DEFAULT now(),
  expira_em   TIMESTAMPTZ NOT NULL
);
CREATE INDEX sessoes_jogador ON sessoes (jogador_id);

-- progresso entre partidas: o mesmo objeto PROG do jogo (fundo, personagens comprados, faixas, medalhas, estatísticas)
CREATE TABLE progresso (
  jogador_id     BIGINT PRIMARY KEY REFERENCES jogadores(id) ON DELETE CASCADE,
  dados          JSONB NOT NULL,
  atualizado_em  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- partidas: o registro completo (JSON) e as colunas mais usadas nas consultas de equilíbrio
CREATE TABLE partidas (
  id           TEXT PRIMARY KEY,               -- código aleatório criado pelo jogo
  jogador_id   BIGINT REFERENCES jogadores(id) ON DELETE SET NULL,   -- vazio quando jogou sem conta
  versao       INT,
  inicio       TIMESTAMPTZ,
  uf           TEXT,
  lado         TEXT,
  dificuldade  TEXT,
  modo         TEXT,
  resultado    TEXT,                           -- vitoria, derrota, abandonada, fimModoLivre (vazio se ainda não acabou)
  rodada       INT,
  apoio        INT,
  verba        INT,
  registro     JSONB NOT NULL,
  recebido_em  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX partidas_jogador ON partidas (jogador_id);
CREATE INDEX partidas_mapa ON partidas (uf, dificuldade, lado);

-- cada ação da partida (colocar, evoluir, vender, especial, poder do herói...), em ordem, com quando aconteceu
CREATE TABLE partida_eventos (
  partida_id  TEXT NOT NULL REFERENCES partidas(id) ON DELETE CASCADE,
  ordem       INT NOT NULL,
  tipo        TEXT NOT NULL,
  rodada      INT,
  segundo     REAL,                            -- tempo de jogo da partida
  verba       INT,                             -- verba na hora
  personagem  TEXT,                            -- chave do personagem, quando a ação é sobre um
  x           INT,
  y           INT,
  dados       JSONB NOT NULL,                  -- o evento inteiro, como o jogo mandou
  PRIMARY KEY (partida_id, ordem)
);
CREATE INDEX partida_eventos_tipo ON partida_eventos (tipo, personagem);

-- a foto do fim de cada rodada
CREATE TABLE partida_rodadas (
  partida_id   TEXT NOT NULL REFERENCES partidas(id) ON DELETE CASCADE,
  rodada       INT NOT NULL,
  apoio        INT,
  perdeu       INT,
  verba        INT,
  renda        INT,
  convencidos  INT,
  duracao      REAL,
  dados        JSONB NOT NULL,
  PRIMARY KEY (partida_id, rodada)
);

-- atalhos para as perguntas mais comuns de equilíbrio
CREATE VIEW colocacoes AS
  SELECT e.partida_id, p.jogador_id, p.uf, p.lado, p.dificuldade, p.resultado,
         e.ordem, e.rodada, e.segundo, e.personagem, e.x, e.y,
         (e.dados->>'custo')::int AS custo, (e.dados->>'distAvenida')::int AS dist_avenida,
         (e.dados->>'pontoDaAvenida')::real AS ponto_da_avenida, (e.dados->>'morro')::boolean AS morro
  FROM partida_eventos e JOIN partidas p ON p.id = e.partida_id
  WHERE e.tipo = 'colocar';

CREATE VIEW evolucoes AS
  SELECT e.partida_id, p.jogador_id, p.uf, p.lado, p.dificuldade, p.resultado,
         e.ordem, e.rodada, e.segundo, e.personagem, e.dados->>'nome' AS evolucao,
         e.dados->'caminho' AS caminho, e.dados->'nivel' AS nivel, (e.dados->>'custo')::int AS custo
  FROM partida_eventos e JOIN partidas p ON p.id = e.partida_id
  WHERE e.tipo = 'evoluir';
