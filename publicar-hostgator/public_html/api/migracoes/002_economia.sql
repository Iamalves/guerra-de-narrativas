-- contra trapaça no progresso (2026-11-18): quanto F$ a conta ganhou jogando na última hora (o servidor limita)
ALTER TABLE progresso ADD COLUMN janela_inicio DATETIME NULL, ADD COLUMN ganho_janela INT NOT NULL DEFAULT 0;
