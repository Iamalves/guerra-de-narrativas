# Guerra de Narrativas

Defesa de torre de paródia política, agora em três partes:

| Pasta | O que é | Tecnologia |
|---|---|---|
| `frontend/` | o jogo no navegador, com tela de entrar e conta | React 19 + TypeScript (Vite) |
| `backend/` | API: contas, progresso e registro das partidas | Node 24+ + TypeScript (Express 5) |
| `banco/` | banco de dados e as migrações | PostgreSQL 18 em Docker |

O motor do jogo (o canvas, as regras, os mapas) continua o mesmo de antes: o React fica por fora, cuida da conta e do
salvamento no servidor, e carrega o motor dentro de um componente.

## O que precisa estar instalado

- **Node.js 24 ou mais novo** (o backend roda os arquivos `.ts` direto, sem compilar)
- **Docker Desktop**, aberto, para o Postgres

## Rodar no seu computador

Na pasta do projeto, num terminal:

```bash
npm install
```

```bash
npm run banco:subir
```

O `backend/.env` já vem com o endereço desse banco local (se apagar, copie de `backend/.env.example`).

Depois, em dois terminais separados:

```bash
npm run back
```

```bash
npm run front
```

Abra **http://localhost:5173**. O backend fica em http://localhost:3001/api (o frontend encaminha `/api` para lá) e cria
as tabelas sozinho na primeira vez que liga.

Para parar o banco: `npm run banco:parar` (os dados continuam guardados no volume do Docker).

## Contas e progresso

- **Com conta** (apelido, e-mail e senha; para entrar, vale o apelido ou o e-mail): o progresso (F$, personagens comprados, faixas, medalhas e estatísticas) fica no
  servidor e vale em qualquer aparelho. Ele sobe sozinho cerca de 1 segundo depois de cada mudança; o selo no canto de
  baixo mostra "☁ salvo".
- **Sem conta**: tudo fica só no navegador, como antes.
- Ao criar uma conta num navegador que já tinha progresso sem conta, esse progresso vai para a conta nova.
- Ao entrar numa conta que já tem progresso, vale o do servidor; o progresso sem conta deste navegador fica guardado à
  parte e volta quando você sai da conta.
- A senha é guardada só como hash (scrypt). A sessão dura 60 dias.

## Registro das partidas (para o equilíbrio)

Cada partida manda ao servidor tudo o que aconteceu: onde e quando cada personagem foi colocado, cada evolução, venda,
especial e poder do herói, e uma foto de cada rodada. No banco:

- `partidas`: uma linha por partida, com o registro completo em JSON;
- `partida_eventos`: cada ação, em ordem, com rodada, segundo, verba, personagem e posição;
- `partida_rodadas`: o fim de cada rodada;
- visões prontas `colocacoes` e `evolucoes`;
- `GET /api/analise/personagens`: resumo por personagem (vezes colocado, vitórias e derrotas).

Partidas jogadas com conta ficam ligadas ao jogador. Para trazer registros antigos (o `registros/partidas.jsonl` do
servidor antigo, ou o arquivo baixado em Opções → Registro das partidas):

```bash
npm run importa-jsonl -w backend -- ../registros/partidas.jsonl
```

## Compras de F$ (Mercado Pago)

O jogador com conta compra pacotes de F$ pelo **Checkout Pro**: escolhe o pacote (na loja de F$, aberta pelo saldo de F$
do menu ou pelo botão 💰 do canto), paga na página do Mercado Pago (PIX, cartão ou boleto) e volta para o jogo. O F$
entra sozinho quando o pagamento é aprovado. Os pacotes e preços ficam em `backend/src/pagamentos.ts` (`PACOTES`): o
navegador manda só o nome do pacote, e o servidor confere valor e moeda do pagamento antes de aprovar.

**Sem credenciais** (como vem), o backend usa um **simulador de pagamento** local: a "página de pagamento" é do próprio
backend, com botões de aprovado, pendente e recusado, e nada é cobrado. Ele só liga fora de produção e sem Access Token.

### Passo a passo para ligar o Mercado Pago de teste

1. Entre em https://www.mercadopago.com.br/developers/panel/app com a sua conta do Mercado Pago (ou crie uma).
2. Clique em **Criar aplicação**: dê um nome (ex.: "Guerra de Narrativas"), escolha **Pagamentos online** e, na
   integração, **Checkout Pro**.
3. Dentro da aplicação, abra **Credenciais de teste** e copie o **Access Token**.
4. Abra o arquivo `backend/.env`, cole depois de `MP_ACCESS_TOKEN=` e salve. Não compartilhe esse token com ninguém e
   não coloque no frontend.
5. Reinicie o backend (`npm run back`). O simulador desliga sozinho e a loja passa a abrir o Mercado Pago de teste.
6. Para pagar no teste, use as **contas de teste** (na aplicação, em **Contas de teste**: crie uma de vendedor e uma de
   comprador) e os **cartões de teste** da documentação do Mercado Pago (procure por "Cartões de teste" no site de
   desenvolvedores). O nome do titular decide o resultado, por exemplo **APRO** para aprovado e **OTHE** para recusado.

### Avisos de pagamento (webhook)

No seu computador o Mercado Pago não consegue avisar o backend (ele não tem endereço público), e também descarta os
endereços de volta com `http://localhost` (o "Voltar ao site" não traz o jogador de volta à compra). Não tem problema:
o jogo pede as entregas ao abrir, a cada minuto e ao voltar para a aba, e nessa hora o backend confere no Mercado Pago
as compras ainda abertas do jogador (dos últimos 3 dias). O mesmo vale para PIX e boleto, que aprovam depois.

Para conferir de uma vez todas as compras abertas (por exemplo, depois de o backend ficar fora do ar):

```bash
npm run confere-compras -w backend
```

Com o backend publicado num endereço **https**:

1. Coloque esse endereço em `API_URL_PUBLICA` (ex.: `https://api.seujogo.com.br`).
2. No painel da aplicação, em **Webhooks**, cadastre `https://api.seujogo.com.br/api/pagamentos/webhook` com o evento
   **Pagamentos**.
3. Copie a **assinatura secreta** dos webhooks para `MP_WEBHOOK_SECRET`. O backend confere a assinatura de cada aviso e,
   de todo jeito, sempre lê o pagamento direto da API do Mercado Pago.

### Antes de vender de verdade

- Troque para as **credenciais de produção** da aplicação (o Mercado Pago pede para completar os dados do negócio).
- Defina `FRONT_URL` com o endereço real do jogo em https, rode o backend com `NODE_ENV=production` (o simulador fica
  desligado de qualquer jeito com Access Token) e use `MP_WEBHOOK_SECRET`.
- Tenha uma página de **termos de uso e política de reembolso** e confira a parte fiscal (emissão de nota) com quem cuida
  da sua contabilidade. O Mercado Pago cobra uma taxa por venda.
- Compras ficam na tabela `compras` (status, valor, id do pagamento no Mercado Pago, quando foi entregue). Estorno depois
  de entregue aparece no console do backend para você conferir o F$ do jogador.

## Mexer no jogo

O motor ainda é editado no arquivo único `guerra-de-narrativas.html`. Depois de mudar, rode:

```bash
npm run separa-jogo
```

Ele gera `frontend/src/jogo/jogo.css`, `frontend/src/jogo/marcacao.html` e `frontend/public/jogo/motor.js`, e aplica os
ganchos que ligam o motor ao React (progresso salvo, token da conta, endereço da API). Se um gancho não encontrar o
trecho original, o script para com erro em vez de gerar um jogo quebrado.

## Testes

```bash
npm test
```

```bash
npm run tipos
```

Os testes do navegador (robô de equilíbrio e teste de desenho) estão em `frontend/public/testes/` e rodam numa aba do jogo,
como antes.

## Publicar

**Na HostGator (cPanel, sem Node.js):** use a versão PHP + MySQL da API (`backend-php/`). O passo a passo completo
está em [PUBLICAR-HOSTGATOR.md](PUBLICAR-HOSTGATOR.md); o pacote sai com `npm run pacote-hostgator`.

**Em outra hospedagem com Node.js:**

- **Frontend**: `npm run build` gera `frontend/dist/`, que vai para qualquer hospedagem de site estático (Netlify,
  GitHub Pages...). Se o backend ficar em outro endereço, defina `VITE_API_URL` (ex.: `https://api.seujogo.com.br`) antes
  do build.
- **Backend**: precisa de um servidor Node (Render, Railway, Fly.io, uma VPS...) com `DATABASE_URL` apontando para o
  Postgres e `CORS_ORIGENS` com o endereço do site.
- **Banco**: o mesmo docker-compose numa VPS, ou um Postgres gerenciado (Neon, Supabase, RDS...). Troque a senha padrão.
- A versão antiga, de arquivo único sem servidor, continua em `publicar/` (veja `COMO-PUBLICAR.md`).
