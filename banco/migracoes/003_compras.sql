-- compras de F$ com dinheiro de verdade (Mercado Pago, Checkout Pro), 2026-11-17.
-- O F$ não é somado direto no progresso: a compra aprovada fica "a entregar" até o jogo somar o F$ e confirmar
-- no mesmo envio do progresso (PUT /api/progresso com "entregas"). Assim o jogo aberto não apaga a compra.
CREATE TABLE compras (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jogador_id      BIGINT NOT NULL REFERENCES jogadores(id) ON DELETE RESTRICT,  -- conta com compra não some sem cuidado
  pacote          TEXT NOT NULL,
  fs              INT NOT NULL CHECK (fs > 0),             -- quanto F$ o pacote dá
  valor_centavos  INT NOT NULL CHECK (valor_centavos > 0),
  moeda           TEXT NOT NULL DEFAULT 'BRL',
  status          TEXT NOT NULL DEFAULT 'criada',          -- criada, pendente, aprovada, recusada, cancelada, estornada
  status_mp       TEXT,                                    -- status e detalhe como o Mercado Pago informou
  status_detalhe  TEXT,
  mp_preferencia  TEXT,
  mp_pagamento    TEXT UNIQUE,
  simulada        BOOLEAN NOT NULL DEFAULT false,          -- feita com o simulador de desenvolvimento
  criada_em       TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizada_em   TIMESTAMPTZ NOT NULL DEFAULT now(),
  aprovada_em     TIMESTAMPTZ,
  entregue_em     TIMESTAMPTZ                              -- quando o F$ entrou no progresso do jogador
);
CREATE INDEX compras_jogador ON compras (jogador_id, criada_em DESC);
CREATE INDEX compras_a_entregar ON compras (jogador_id) WHERE status = 'aprovada' AND entregue_em IS NULL;
