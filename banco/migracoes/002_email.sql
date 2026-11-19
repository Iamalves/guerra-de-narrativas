-- e-mail da conta (2026-11-17): pedido no cadastro, um por conta, e também serve para entrar.
-- Fica sem NOT NULL só porque contas antigas (se houver) não têm; o backend exige o e-mail em toda conta nova.
ALTER TABLE jogadores ADD COLUMN email TEXT;
CREATE UNIQUE INDEX jogadores_email ON jogadores (lower(email));
