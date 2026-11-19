/* Monta o pacote para publicar na HostGator (cPanel): publicar-hostgator/public_html/ e o .zip dele.
     node ferramentas/pacote-hostgator.mjs
   Antes, gera o motor (separa-jogo) e o site (npm run build). O pacote leva:
     - o jogo (frontend/dist), sem a pasta testes/ (robô e testes de desenho, só para desenvolvimento);
     - a API em PHP (backend-php/api), sem config.php (a configuração fica fora do public_html: veja PUBLICAR-HOSTGATOR.md);
     - o .htaccess da raiz (https obrigatório e cache certo). */
import { execSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const saida = join(raiz, 'publicar-hostgator'), pub = join(saida, 'public_html');
const roda = (cmd, cwd = raiz) => { console.log('> ' + cmd); execSync(cmd, { cwd, stdio: 'inherit' }); };

roda('node ferramentas/separa-jogo.mjs');
/* preços da loja para o servidor conferir quem liberou personagem sem gastar F$ (tirados do motor recém-gerado) */
roda('node ferramentas/gera-precos.mjs');
roda('npm run build', join(raiz, 'frontend'));

rmSync(saida, { recursive: true, force: true });
mkdirSync(pub, { recursive: true });
cpSync(join(raiz, 'frontend', 'dist'), pub, { recursive: true, filter: f => !/[\\/]dist[\\/]testes([\\/]|$)/.test(f) });
cpSync(join(raiz, 'backend-php', 'api'), join(pub, 'api'), { recursive: true, filter: f => !/[\\/]config\.php$/.test(f) });
cpSync(join(raiz, 'backend-php', 'public_html.htaccess'), join(pub, '.htaccess'));
if (existsSync(join(pub, 'testes'))) throw new Error('a pasta testes/ não devia ir no pacote');

/* .zip para enviar pelo Gerenciador de Arquivos do cPanel (que extrai sozinho) */
const zip = join(saida, 'guerra-de-narrativas-hostgator.zip');
if (process.platform === 'win32') {
  /* o Compress-Archive do Windows grava "api\index.php" (barra invertida), que o cPanel extrai como um arquivo com esse
     nome em vez da pasta api/: o zip é montado à mão, com "/" nos caminhos */
  const ps = `Add-Type -AssemblyName System.IO.Compression, System.IO.Compression.FileSystem;
    $base = '${pub}'; $zip = '${zip}'; if (Test-Path $zip) { Remove-Item $zip };
    $z = [IO.Compression.ZipFile]::Open($zip, 'Create');
    Get-ChildItem -LiteralPath $base -Recurse -File -Force | ForEach-Object {
      $rel = $_.FullName.Substring($base.Length + 1).Replace('\\', '/');
      [void][IO.Compression.ZipFileExtensions]::CreateEntryFromFile($z, $_.FullName, $rel, 'Optimal') };
    $z.Dispose()`;
  execSync(`powershell -NoProfile -Command "${ps.replace(/\n\s*/g, ' ').replace(/"/g, '\\"')}"`, { stdio: 'inherit' });
} else roda(`cd "${pub}" && zip -qr "${zip}" .`);
console.log(`\nPronto: ${zip}\nEnvie para public_html no cPanel e extraia (veja PUBLICAR-HOSTGATOR.md).`);
