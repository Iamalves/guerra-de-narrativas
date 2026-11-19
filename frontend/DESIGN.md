# Guerra de Narrativas — plano de design

Refeito do zero em 2026-11-17: "comício à noite", limpo e escuro. Substitui o visual das teclas de urna.

## Princípios
- **Celular primeiro.** Barra de navegação embaixo (Jogar, Loja, Conquistas, Mais); a partir de 900 px ela vira uma
  coluna à esquerda. Conteúdo com no máximo 760 px de largura.
- **Uma ação dourada por tela.** O dourado (`--ouro`) é só para a ação principal: Jogar, Começar rodada, Liberar
  personagem, Entrar. Todo o resto é botão neutro (`.bt.sec`) ou link.
- **Só o essencial à vista.** Na tela Jogar ficam o mapa escolhido, a dificuldade e o botão Jogar. Trocar estado e modo
  abrem uma folha à parte (`Folha`, que é um `<dialog>`). Detalhes do mapa ficam num "O que tem neste mapa" fechado.
- **O lado é do perfil.** Escolhido na primeira entrada (`EscolhaLado`), guardado na conta (`jogadores.lado`) ou no
  navegador (`gn_lado`), trocado em Mais › Perfil. A cor do lado só aparece como luz de palco no fundo e no ponto
  "Você defende a…": vermelho para a Esquerda, verde para a Direita.

## Cores (estilos.css, `:root`)
Fundo `#0d1017`, superfícies `#171d29` / `#1e2533` / `#283042`, texto `#f3f5f9` / `#b8c0cf` / `#8e98ab`
(todos com contraste AA sobre as superfícies), dourado `#ffc533` com texto `#1b1300`, foco `#8ab4ff`.

## Tipos
Bowlby One para títulos e números de destaque (nome do mapa, saldo, "Jogar"); Archivo para o resto.

## Acessibilidade
- Alvos de toque de pelo menos 44 px; anel de foco visível em tudo que é clicável.
- Controles com papel certo: `radiogroup` nos segmentados e nas listas de opção, `switch` nos interruptores,
  `aria-current` na navegação, `progressbar` nas medalhas com progresso.
- Ao trocar de página, o foco vai para o título (o leitor de tela anuncia a página nova).
- Tamanho do texto das Opções vale também para o menu (rem); movimento reduzido quando o sistema pede.

## Nomes de classe
O CSS antigo do motor (src/jogo/jogo.css) ainda tem regras do menu antigo com nomes genéricos (`.seg`, `.desafio`,
`.faixa`...). As classes do React evitam esses nomes; para conferir colisões, compare as classes de estilos.css com
as de jogo.css antes de criar uma nova.

## Partida
O motor continua desenhando o mapa; o fim do estilos.css escurece a barra de cima, a lista da direita, a janela de
evolução, a ficha, a confirmação de sair e o tutorial para combinarem com o menu.
