/* Robô de teste do Guerra de Narrativas. NÃO faz parte do jogo.
   Uso, no console da página do jogo:
     fetch('/testes/robo.js').then(r=>r.text()).then(eval)
     Robo.roda([['rotulo','pt','normal',['militante','haddad',...]]],['DF','RJ'])
   Resultado em window.__bal: res[rotulo][UF] = "rodada/apoio/V ou P", e escapes[rotulo][UF] = quem passou em cada rodada.
   O robô não grava progresso nem partida salva: salvaProg, salvaPartida e apagaPartida ficam desligados nesta página. */
(function(){
  if(window.Robo)return;
  window.__semRegistro=true;
  const realStep=step,realStepEnemy=stepEnemy;
  for(const f of ['render','beep','banner','showOverlay','salvaPartida','apagaPartida','salvaProg','renderPoderes','dica'])window[f]=()=>{};
  window.step=()=>{};
  /* registra quem chegou ao fim da avenida */
  let escapes=null;
  window.stepEnemy=(e,dt)=>{const v=S.lives;realStepEnemy(e,dt);if(escapes&&S.lives<v){const k=ENEMY[e.type].nome.replace(/ \(.*\)/,'');escapes[k]=(escapes[k]||0)+1}};

  const det=s=>s.detect||s.giveDet;
  /* caminho mais curto até a detecção de Isentões, se o personagem tiver */
  function planoDet(T){let m=null;for(const p of [0,1]){const s={...T.base};for(let i=0;i<3;i++){T.up[p][i].f(s);if(det(s)){if(!m||i+1<m.lvl)m={p,lvl:i+1};break}}}return m}
  /* argumento por segundo, aproximado, para comparar personagens e evoluções */
  function forca(T,s){
    if(T.atk==='none')return 0;
    const n=Math.max(1,s.multi||s.spread||s.radial||s.count||s.bats||1),alvos=Math.min(s.pierce||1,6)+(s.splash?2:0);
    let v=(s.dmg||s.batDmg||0)*n*alvos/(s.rate||s.batRate||1);
    if(s.robots)v+=s.robots*(s.robotDmg||2)*4/(s.sumRate||8);
    if(s.nukeDmg)v+=s.nukeDmg*3/(s.nukeRate||20);
    if(s.fireLife)v+=(s.dmg||1)*s.fireLife;
    return v*(1+(s.range||150)/400);
  }
  const ataca=k=>TOWERS[k].atk!=='none';
  function* jogo(side,diff,uf,keys,log){
    newGame(diff,false,side,uf);S.menu=false;S.auto=false;
    /* trechos da avenida que contam: as duas avenidas, menos o túnel (onde ninguém mira) */
    const M=MAPAS[uf],amostra=[];
    for(const v of VIAS())for(let d=0;d<LEN;d+=20){if(M.tunel&&d>M.tunel.d1&&d<M.tunel.d2)continue;if(M.metro&&d>M.metro.d1&&d<M.metro.d2)continue;amostra.push(posAt(d,v))}
    /* lugares bons para cada alcance: quanto da avenida cada ponto cobre, sem contar o que um prédio tapa */
    const cobre=(x,y,R)=>{let c=0;for(const p of amostra)if(Math.hypot(p.x-x,p.y-y)<=R&&!predioTapa(x,y-20,p.x,p.y-10))c++;return c};
    const lugares=[];for(let y=30;y<H-20;y+=24)for(let x=30;x<W-30;x+=24)if(validSpot(x,y))lugares.push({x,y});
    const coloca=k=>{const R=TOWERS[k].base.range||150;let best=null,bc=-1;for(const p of lugares){if(!validSpot(p.x,p.y))continue;const c=cobre(p.x,p.y,R);if(c>bc){bc=c;best=p}}return best?place(k,best.x,best.y):null};
    const temDet=()=>S.towers.some(t=>det(t.s));
    const custoUp=(t,p)=>price(t.T.up[p][p?t.b:t.a].c);
    /* melhor evolução: mais argumento por real; quem dá buff só pega a 1ª do caminho 2 e a 2ª do caminho 1 */
    function melhorUp(){
      let best=null,bv=-1;
      for(const t of S.towers){
        for(const p of [0,1]){
          if(canUp(t,p)!=='ok')continue;
          const c=custoUp(t,p);
          /* só considera o que dá para pagar agora: guardar verba para uma evolução cara deixava todo o resto parado */
          if(c>S.cash)continue;
          if(!ataca(t.key)){const ok=(p===1&&t.b<1)||(p===0&&t.a<2);if(ok&&c/1000<1){const v=.002;if(v>bv){bv=v;best=[t,p,c]}}continue}
          const s0=t.s,s1={...t.T.base};for(let i=0;i<t.a+(p?0:1);i++)t.T.up[0][i].f(s1);for(let i=0;i<t.b+(p?1:0);i++)t.T.up[1][i].f(s1);
          let v=(forca(t.T,s1)-forca(t.T,s0)+.01)/c;
          if(!temDet()&&S.round>=5){const pl=planoDet(t.T);if(pl&&pl.p===p)v*=50}
          if(det(s1)&&!temDet())v*=20;
          if(v>bv){bv=v;best=[t,p,c]}
        }
      }
      return best;
    }
    while(!S.over&&S.round<40){
      const n=S.round+1;
      for(let q=0;q<200;q++){
        const livres=keys.filter(k=>{const r=rodadaLibera(side,k);return r?r<=n:true});
        const atacantes=S.towers.filter(t=>ataca(t.key)).length,alvo=Math.min(16,2+Math.floor(n/3));
        /* herói e quem dá buff: um de cada */
        const unico=livres.find(k=>(TOWERS[k].only||!ataca(k))&&!S.towers.some(t=>t.key===k)&&S.cash>=price(TOWERS[k].cost)&&(TOWERS[k].only||atacantes>=3));
        if(unico&&coloca(unico))continue;
        if(atacantes<alvo){
          const cands=livres.filter(k=>ataca(k)&&!TOWERS[k].only&&S.cash>=price(TOWERS[k].cost)&&!(window.noLimite&&noLimite(k))).sort((a,b)=>forca(TOWERS[b],TOWERS[b].base)/price(TOWERS[b].cost)-forca(TOWERS[a],TOWERS[a].base)/price(TOWERS[a].cost));
          /* varia entre os melhores para não ficar só com um tipo */
          const k=cands[atacantes%Math.max(1,Math.min(2,cands.length))];
          if(k&&coloca(k))continue;
        }
        const up=melhorUp();
        if(up&&S.cash>=up[2]){buyUp(up[0],up[1]);continue}
        break;
      }
      const v0=S.lives;escapes={};S.paused=false;startRound();let fr=0;
      while(S.inRound&&!S.over&&fr<60000){
        if(fr%30===0&&S.enemies.length>6){
          if(S.abilCd<=0&&S.enemies.some(e=>e.T.boss||S.enemies.length>25)){try{fazOL()}catch(e){}}
          for(const t of S.towers)if(temPoder(t)&&!(t.podCd>0))usaPoder(t);
        }
        /* o jogo se pausa sozinho quando a aba fica escondida; o robô continua mesmo assim */
        S.paused=false;realStep(1/60);fr++;if(fr%120===0)yield;
      }
      /* rodada que não acaba: avisa em vez de rodar para sempre */
      if(S.inRound&&!S.over){const e=S.enemies[0];return S.round+'/TRAVOU/'+(e?e.type:'?')}
      if(log&&S.lives<v0)log.push(`r${S.round} -${Math.round(v0-S.lives)} ${Object.entries(escapes).map(([k,v])=>k+'×'+v).join(', ')} | ${S.towers.map(t=>t.key+t.a+t.b).join(' ')}`);
      escapes=null;
    }
    return S.round+'/'+Math.max(0,Math.ceil(S.lives))+'/'+(S.won?'V':'P');
  }
  window.Robo={
    roda(casos,ufs){
      const B=window.__bal={res:{},log:{},prog:'',done:false,err:[]};
      function* job(){for(const[lbl,side,diff,keys]of casos)for(const uf of ufs){B.prog=lbl+' '+uf;const log=[];try{(B.res[lbl]=B.res[lbl]||{})[uf]=yield* jogo(side,diff,uf,keys,log)}catch(e){B.err.push(lbl+uf+': '+e.message)}(B.log[lbl]=B.log[lbl]||{})[uf]=log}B.prog='fim';B.done=true}
      const g=job(),ch=new MessageChannel();
      ch.port1.onmessage=()=>{const t0=performance.now();try{while(performance.now()-t0<180){if(g.next().done)return}}catch(e){B.err.push('fatal '+e.message);B.done=true;return}ch.port2.postMessage(0)};
      ch.port2.postMessage(0);
      return 'rodando';
    },
    ini:s=>INICIAIS[s].map(x=>x[0]),
  };
})();
