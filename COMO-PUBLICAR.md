# Como publicar o Guerra de Narrativas

Tudo o que vai para a internet está na pasta **`publicar/`**:

- `index.html`: o jogo
- `manifest.webmanifest` e `sw.js`: permitem instalar o jogo e abrir sem internet
- `icone-180.png`, `icone-192.png` e `icone-512.png`: os ícones

Suba a pasta inteira, não só o `index.html`. Sem os outros arquivos, o jogo abre, mas não dá para instalar.

O site precisa usar **https**. As duas opções abaixo já usam, e são gratuitas.

---

## Opção 1: Netlify Drop (mais fácil, uns 2 minutos)

1. Entre em **app.netlify.com/drop**.
2. Arraste a pasta `publicar` para a área indicada na página.
3. Em segundos aparece um endereço, parecido com `nome-aleatorio.netlify.app`. O jogo já está no ar.
4. Para o endereço não expirar e para poder trocar o nome, crie uma conta gratuita quando o site pedir. Depois, em *Site configuration → Change site name*, escolha um nome como `guerra-de-narrativas`.

**Para atualizar depois:** na página do site no Netlify, abra a aba *Deploys* e arraste a pasta `publicar` de novo.

---

## Opção 2: GitHub Pages

1. Crie uma conta em **github.com**, se ainda não tiver.
2. Clique em **New repository**, dê um nome como `guerra-de-narrativas`, marque **Public** e crie.
3. Na página do repositório, clique em **uploading an existing file**.
4. Arraste para lá os **arquivos de dentro** da pasta `publicar`, não a pasta em si, e clique em **Commit changes**.
5. Vá em **Settings → Pages**. Em *Branch*, escolha `main` e a pasta `/ (root)`, e clique em **Save**.
6. Depois de 1 ou 2 minutos, o jogo fica em `https://SEU-USUARIO.github.io/guerra-de-narrativas/`.

**Para atualizar depois:** envie os arquivos novos do mesmo jeito, pelo *Add file → Upload files*. Os arquivos com o mesmo nome são substituídos.

---

## Antes de divulgar

- **O progresso fica em cada endereço.** Quem jogou aqui no computador começa do zero no site novo. Para levar o seu progresso, use *Opções → Levar o progresso para outro aparelho*: gere o código aqui e cole no site.
- **Teste num celular de verdade:**
  - Abra o endereço, jogue uma rodada e deite o celular.
  - No Android, use *Instalar app*. No iPhone, use *Compartilhar → Adicionar à Tela de Início*.
  - Depois, com o celular sem internet, confirme que o jogo abre.
- **Quem já jogou recebe a versão nova sozinho** quando estiver com internet, porque o jogo sempre busca a versão mais recente antes de usar a cópia guardada.
- **Tamanho:** o jogo tem cerca de 670 KB. Os dois serviços entregam compactado, com mais ou menos um terço disso, o que carrega rápido até no 4G.

## Sempre que eu mudar o jogo

A pasta `publicar/` é atualizada junto. É só repetir o passo de atualizar da opção que você escolheu.
