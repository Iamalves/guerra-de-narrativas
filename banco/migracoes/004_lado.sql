-- lado que o jogador escolheu defender (2026-11-17): escolhido na primeira entrada e trocado no perfil.
-- 'pt' = Esquerda, 'br' = Direita. Vazio para quem ainda não escolheu.
ALTER TABLE jogadores ADD COLUMN lado TEXT CHECK (lado IN ('pt', 'br'));
