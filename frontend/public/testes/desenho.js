/* Teste de desenho do Guerra de Narrativas. NÃO faz parte do jogo.
   O robô de equilíbrio não desenha nada, então erros de desenho (como uma variável que não existe)
   passam por ele e só aparecem jogando: o jogo congela. Este teste desenha cada mapa em várias situações.
   Uso, numa aba separada (nunca na aba em que alguém está jogando):
     eval(await (await fetch('/testes/desenho.js?'+Date.now())).text())
   Resultado: {casos, erros}. Não grava nada: os gravadores ficam desligados nesta aba. */
(function(){
  window.__semRegistro=true;
  for(const f of ['salvaProg','salvaPartida','apagaPartida','dica','salvaOpc','tutoMarca','tutoMarcaParte','beep'])window[f]=()=>{};
  const erros=[];let casos=0;
  const tenta=(rot,fn)=>{casos++;try{fn()}catch(e){erros.push(rot+': '+e.message+' @'+((e.stack||'').split('\n')[1]||'').trim())}};
  const lugar=()=>{for(let y=60;y<H;y+=24)for(let x=40;x<W;x+=24)if(validSpot(x,y))return[x,y];return[300,300]};
  for(const[u]of ESTADOS){
    tenta(u+' início',()=>{newGame('normal',false,'pt',u);S.menu=false;startRound();for(let i=0;i<10;i++)spawn(cfg().foes.camisa,i*120,1);render()});
    for(const v of VIAS())tenta(u+' avenida fechada '+v,()=>{S.viaFechada=v;render()});
    S.viaFechada=-1;
    tenta(u+' eventos',()=>{S.chuva=true;S.apagaoT=5;S.enche=!!MAPAS[u].lake;if(MAPAS[u].trem)S.tremFechadoT=3;render();S.chuva=false;S.apagaoT=0;S.enche=false;S.tremFechadoT=0});
    tenta(u+' transporte',()=>{for(const f of['chao','ida','volta']){S.balao={fase:f,t:.5,carga:S.enemies.slice(0,3)};render()}});
    tenta(u+' colocando',()=>{S.placing='militante';render();S.placing=null});
    tenta(u+' selecionado',()=>{const t=place('militante',...lugar());S.sel=t;render();renderPanel();S.sel=null});
    tenta(u+' passos',()=>{S.paused=false;for(let i=0;i<300;i++)step(1/60);render()});
  }
  for(const m of['voto','teto','zero','turbo'])tenta('modo '+m,()=>{newGame('normal',false,'br','SP');S.menu=false;aplicaModo(m);startRound();S.paused=false;for(let i=0;i<300;i++)step(1/60);render();syncHud()});
  window.__desenho={casos,erros};
  return window.__desenho;
})();
