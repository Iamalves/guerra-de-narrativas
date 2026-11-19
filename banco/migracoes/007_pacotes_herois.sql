-- pacotes de heróis exclusivos (2026-11-17): uma compra pode entregar heróis em vez de F$ (fs = 0).
-- bonus: a primeira compra aprovada de F$ de cada conta rende 50% a mais (marcado aqui quando aplicado).
ALTER TABLE compras DROP CONSTRAINT compras_fs_check;
ALTER TABLE compras ADD CONSTRAINT compras_fs_check CHECK (fs >= 0);
ALTER TABLE compras ADD COLUMN bonus BOOLEAN NOT NULL DEFAULT false;
