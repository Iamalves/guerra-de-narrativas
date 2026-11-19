-- amigos (2026-11-17): cada jogador adiciona outros pelo apelido e vê um ranking entre eles.
-- É uma lista de cada um (quem adiciona não precisa ser aceito); o ranking mostra só números do jogo, nada pessoal.
CREATE TABLE amizades (
  jogador_id  BIGINT NOT NULL REFERENCES jogadores(id) ON DELETE CASCADE,
  amigo_id    BIGINT NOT NULL REFERENCES jogadores(id) ON DELETE CASCADE,
  criada_em   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (jogador_id, amigo_id),
  CHECK (jogador_id <> amigo_id)
);
CREATE INDEX amizades_amigo ON amizades (amigo_id);
