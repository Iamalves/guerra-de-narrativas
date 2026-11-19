# Publicar na HostGator (cPanel)

O jogo inteiro fica na sua hospedagem: o site, a API (em PHP) e o banco (MySQL). Não precisa de Node.js nem de outro
serviço. Faça uma vez a **preparação** e depois, a cada versão nova, só o **atualizar**.

## O que você vai precisar

- Um domínio apontado para a HostGator (ex.: `seudominio.com.br`).
- Acesso ao cPanel.
- Para vender de verdade: a conta do Mercado Pago com as **credenciais de produção** liberadas, e os textos de
  **termos de uso, política de privacidade e de reembolso** publicados no site.

## 1. Gerar o pacote (no seu computador)

```bash
npm run pacote-hostgator
```

Isso gera `publicar-hostgator/guerra-de-narrativas-hostgator.zip`, com o jogo, a API e o `.htaccess`.

## 2. Preparar o cPanel (uma vez só)

### 2.1 Versão do PHP
1. No cPanel, abra **MultiPHP Manager** (ou **Selecionar versão do PHP**).
2. Escolha **PHP 8.1** ou mais novo para o seu domínio.
3. Em **Selecionar versão do PHP → Extensões**, confira que estão marcadas: `pdo_mysql`, `curl`, `mbstring` e `json`.

### 2.2 Banco de dados
1. Abra **Bancos de dados MySQL**.
2. Em *Criar novo banco de dados*, digite `guerra` → **Criar**. O nome final ganha o prefixo da conta (ex.: `usuario_guerra`).
3. Em *Usuários do MySQL*, crie um usuário (ex.: `guerra`) com uma **senha forte** (use o gerador do cPanel e guarde-a).
4. Em *Adicionar usuário ao banco de dados*, escolha o usuário e o banco → **Adicionar** → marque **TODOS OS PRIVILÉGIOS** → **Fazer alterações**.

As tabelas são criadas sozinhas no primeiro acesso à API. Não precisa importar nada no phpMyAdmin.

### 2.3 Arquivo de configuração (fora do site)
1. Abra o **Gerenciador de Arquivos**. Fique na pasta inicial (`/home/SEU_USUARIO`), **não** dentro de `public_html`.
2. Clique em **+ Arquivo** e crie `gn-config.php`.
3. Clique com o botão direito → **Editar** e cole o conteúdo de `backend-php/api/config.exemplo.php`, preenchendo:
   - `db_nome` e `db_usuario`: os nomes completos, com o prefixo (ex.: `usuario_guerra`);
   - `db_senha`: a senha do usuário do banco;
   - `front_url` e `api_url_publica`: `https://seudominio.com.br`;
   - `mp_access_token` e `mp_webhook_secret`: deixe vazios por enquanto (passo 4);
   - `mp_simulado`: `false`.
4. **Salvar.** Esse arquivo fica fora do site e ninguém consegue abrir pelo navegador.

### 2.4 https
1. Abra **SSL/TLS Status** e confira que o domínio tem certificado (o **AutoSSL** é grátis). Se não tiver, clique em **Run AutoSSL**.
2. O `.htaccess` do pacote já manda todo acesso para https.

## 3. Enviar o jogo

1. No **Gerenciador de Arquivos**, entre em `public_html`.
2. Se houver arquivos antigos de um site anterior que você não usa mais, faça um backup antes de apagar.
3. **Carregar** → envie `guerra-de-narrativas-hostgator.zip`.
4. Clique com o botão direito no zip → **Extract** → extraia em `/public_html`. Depois apague o zip.
5. Ative **Mostrar arquivos ocultos** (Configurações, no canto) e confira que o `.htaccess` está lá, e também `api/.htaccess`.

### Conferir
- Abra `https://seudominio.com.br/api/saude`. Deve aparecer `{"ok":true}` (no primeiro acesso, as tabelas são criadas).
- Abra `https://seudominio.com.br`. O jogo abre; crie uma conta e jogue uma rodada.
- Se `/api/saude` mostrar erro de configuração, confira o `gn-config.php` (passo 2.3). Erros aparecem em **Métricas → Erros**
  do cPanel (linhas que começam com `GN:`).

## 4. Ligar o Mercado Pago

1. No painel do Mercado Pago (**Suas integrações → sua aplicação**), pegue o **Access Token de produção**.
2. Em **Webhooks**, cadastre a URL `https://seudominio.com.br/api/pagamentos/webhook`, marque o evento **Pagamentos**
   e salve. Copie a **assinatura secreta**.
3. No `gn-config.php`, preencha `mp_access_token` e `mp_webhook_secret` e salve.
4. **Teste com dinheiro de verdade:** compre o Punhado de F$ (R$ 4,90) com a sua conta do jogo. O F$ deve entrar
   sozinho. Depois estorne pelo painel do Mercado Pago.

Nunca cole o Access Token em chat ou e-mail. Se isso acontecer, gere outro no painel.

## Atualizar depois

1. `npm run pacote-hostgator`
2. Envie o zip para `public_html` e extraia, **substituindo** os arquivos.

O `gn-config.php` fica fora do `public_html`, então não é tocado. O banco também continua. Se houver uma migração nova
(`api/migracoes/`), ela roda sozinha no primeiro acesso.

## Testar no seu computador antes

```bash
docker compose -f backend-php/docker-compose.yml up -d --build
```

```bash
node backend-php/teste-api.mjs
```

O jogo publicado fica em `http://localhost:8088` (com PHP 8.1 e MySQL 5.7, como uma hospedagem). Para jogar em modo de
desenvolvimento usando a API PHP, rode o Vite com `GN_API=http://localhost:8088`.

## Bom saber

- **Backups:** no cPanel, **Backup** baixa uma cópia do banco. Faça isso de vez em quando.
- **Senhas das contas:** a versão PHP guarda as senhas com bcrypt. Contas criadas no banco de testes do seu computador
  (PostgreSQL) não vão para a hospedagem; em produção todo mundo cria a conta de novo.
- **A pasta `backend/` (Node + PostgreSQL)** continua funcionando para desenvolvimento, com as mesmas rotas. O que vai
  para a HostGator é a `backend-php/api`. Ao mudar uma regra no servidor, mude nas duas (ou use só a versão PHP).
