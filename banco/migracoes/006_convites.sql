-- convites de amizade (2026-11-17): a amizade só existe depois que o outro aceita, e aí vale para os dois.
-- amizades passa a ter sempre as duas linhas (A→B e B→A); o que ainda não foi aceito fica em convites_amizade.
CREATE TABLE convites_amizade (
  de_id      BIGINT NOT NULL REFERENCES jogadores(id) ON DELETE CASCADE,
  para_id    BIGINT NOT NULL REFERENCES jogadores(id) ON DELETE CASCADE,
  criado_em  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (de_id, para_id),
  CHECK (de_id <> para_id)
);
CREATE INDEX convites_para ON convites_amizade (para_id);

-- quem foi adicionado do jeito antigo (sem aceite) e não adicionou de volta vira um convite pendente
INSERT INTO convites_amizade (de_id, para_id, criado_em)
  SELECT a.jogador_id, a.amigo_id, a.criada_em FROM amizades a
  WHERE NOT EXISTS (SELECT 1 FROM amizades b WHERE b.jogador_id = a.amigo_id AND b.amigo_id = a.jogador_id);
DELETE FROM amizades a
  WHERE NOT EXISTS (SELECT 1 FROM amizades b WHERE b.jogador_id = a.amigo_id AND b.amigo_id = a.jogador_id);
