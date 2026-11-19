// Separa o jogo de arquivo único (guerra-de-narrativas.html) nas três peças que o frontend React usa:
//   frontend/src/jogo/jogo.css        estilos do jogo
//   frontend/src/jogo/marcacao.html   o HTML do corpo (HUD, mapa, painel), sem o script
//   frontend/public/jogo/motor.js     o motor do jogo, igual ao original, com ganchos para o React (veja GANCHOS)
//   frontend/public/...               manifesto, ícones, service worker e os testes do navegador
// Uso, na pasta do projeto:  node ferramentas/separa-jogo.mjs
// Rode de novo sempre que o arquivo único mudar. As peças geradas são sobrescritas.
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(raiz, 'guerra-de-narrativas.html'), 'utf8');

const pega = (re, nome) => {
  const m = html.match(re);
  if (!m) throw new Error('Não achei ' + nome + ' no arquivo do jogo');
  return m[1];
};
const css = pega(/<style>([\s\S]*?)<\/style>/, 'o <style>');
const corpo = pega(/<body>([\s\S]*?)<script>/, 'o corpo antes do <script>');
let motor = pega(/<script>([\s\S]*?)<\/script>\s*<\/body>/, 'o <script> do motor');

// Ganchos: cada um troca um trecho exato do motor. Se o trecho não existir mais, para com erro em vez de gerar um jogo quebrado.
const GANCHOS = [
  {
    nome: 'progresso salvo avisa o React (para enviar ao servidor quando houver conta)',
    de: "function salvaProg(){try{localStorage.setItem('gn_prog',JSON.stringify(PROG))}catch(e){}}",
    para: "function salvaProg(){try{localStorage.setItem('gn_prog',JSON.stringify(PROG))}catch(e){}try{window.GN_PONTE&&GN_PONTE.progSalvo&&GN_PONTE.progSalvo(PROG)}catch(e){}}",
  },
  {
    nome: 'registros vão para a API configurada (outro endereço em produção)',
    de: "const REG_URL='/api/partidas'",
    para: "const REG_URL=((window.GN_PONTE&&GN_PONTE.api)||'')+'/api/partidas'",
  },
  {
    nome: 'registros levam o token da conta, para ficarem ligados ao jogador',
    de: "headers:{'Content-Type':'application/json'},body:JSON.stringify(reg)",
    para: "headers:{'Content-Type':'application/json',...(window.GN_PONTE&&GN_PONTE.token&&GN_PONTE.token()?{Authorization:'Bearer '+GN_PONTE.token()}:{})},body:JSON.stringify(reg)",
  },
  {
    nome: 'o service worker só é registrado na versão publicada (no modo de desenvolvimento ele guardaria arquivos velhos)',
    de: "if('serviceWorker' in navigator&&/^https?:$/.test(location.protocol))",
    para: "if('serviceWorker' in navigator&&/^https?:$/.test(location.protocol)&&!(window.GN_PONTE&&GN_PONTE.dev))",
  },
];
for (const g of GANCHOS) {
  if (!motor.includes(g.de)) throw new Error('Gancho não aplicado (' + g.nome + '): o trecho original mudou');
  motor = motor.replace(g.de, g.para);
}

const escreve = (rel, txt) => {
  const f = join(raiz, rel);
  mkdirSync(dirname(f), { recursive: true });
  writeFileSync(f, txt);
  console.log('gerado', rel, Math.round(txt.length / 1024) + ' KB');
};
const aviso = 'GERADO por ferramentas/separa-jogo.mjs a partir de guerra-de-narrativas.html. Não edite aqui: edite o original e rode o script.';
escreve('frontend/src/jogo/jogo.css', `/* ${aviso} */\n${css}`);
escreve('frontend/src/jogo/marcacao.html', `<!-- ${aviso} -->\n${corpo.trim()}\n`);
escreve('frontend/public/jogo/motor.js', `/* ${aviso} */\n${motor}`);

// app instalável (manifesto e ícones) e testes do navegador (robô de equilíbrio e teste de desenho) vão como estão
for (const f of ['manifest.webmanifest', 'icone-180.png', 'icone-192.png', 'icone-512.png', 'testes/robo.js', 'testes/desenho.js']) {
  const destino = join(raiz, 'frontend/public', f);
  mkdirSync(dirname(destino), { recursive: true });
  copyFileSync(join(raiz, f), destino);
  console.log('copiado', 'frontend/public/' + f);
}
// service worker: igual, mas sem guardar nada da API (o progresso de uma conta não pode ficar no cache do aparelho)
const swDe = "if (req.method !== 'GET') return;";
let sw = readFileSync(join(raiz, 'sw.js'), 'utf8');
if (!sw.includes(swDe)) throw new Error('sw.js mudou: confira o trecho do GET');
sw = sw.replace(swDe, swDe + "\n  if (new URL(req.url).pathname.startsWith('/api/')) return;");
escreve('frontend/public/sw.js', sw);
