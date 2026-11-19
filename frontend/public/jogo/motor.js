/* GERADO por ferramentas/separa-jogo.mjs a partir de guerra-de-narrativas.html. Não edite aqui: edite o original e rode o script. */

'use strict';
const W=960,H=640;
const cv=document.getElementById('c'),g=cv.getContext('2d');
const $=id=>document.getElementById(id);
const rand=(a,b)=>a+Math.random()*(b-a),pick=a=>a[Math.floor(Math.random()*a.length)];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

/* ---------- caminho ---------- */
/* PATH/SEG: a avenida principal. PATH2/SEG2: a segunda avenida, quando o mapa tem desvio.
   As duas têm exatamente o mesmo comprimento (o desvio contorna um retângulo pelo outro lado),
   então "quanto o adversário já andou" (e.d) vale igual nas duas, e e.via diz em qual ele está. */
let PATH=[],SEG=[],LEN=0,LAKE=null,PATH2=null,SEG2=null,PATH3=null,SEG3=null;
/* caminhos que existem neste mapa: 0 (principal), 1 (desvio ou entrada) e 2 (entrada, quando também há desvio) */
const VIAS=()=>SEG3?[0,1,2]:SEG2?[0,1]:[0];
function segsDe(pts){
  const seg=[];let len=0;
  for(let i=0;i<pts.length-1;i++){
    const[a,b]=pts[i],[c,d]=pts[i+1],l=Math.hypot(c-a,d-b);
    if(l<.01)continue;
    /* caixa de cada trecho: deixa a distância até a avenida rápida mesmo com muitas curvas */
    seg.push({x:a,y:b,dx:(c-a)/l,dy:(d-b)/l,l,s:len,x0:Math.min(a,c),x1:Math.max(a,c),y0:Math.min(b,d),y1:Math.max(b,d)});len+=l;
  }
  /* índice espacial: cada quadrado de 64 px sabe quais trechos passam por ele */
  const grade=new Map();
  for(const s of seg)for(let gx=Math.floor(s.x0/64);gx<=Math.floor(s.x1/64);gx++)for(let gy=Math.floor(s.y0/64);gy<=Math.floor(s.y1/64);gy++){const k=gx*1000+gy;let a=grade.get(k);if(!a)grade.set(k,a=[]);a.push(s)}
  seg.grade=grade;
  return{seg,len};
}
function setPath(pts,pts2,pts3){
  PATH=pts;const r=segsDe(pts);SEG=r.seg;LEN=r.len;
  PATH2=pts2||null;SEG2=pts2?segsDe(pts2).seg:null;
  PATH3=pts3||null;SEG3=pts3?segsDe(pts3).seg:null;
}
/* ponto da avenida a uma distância d do começo: busca binária, porque as avenidas curvas têm muitos trechos */
function posAt(d,v){
  const L=v===2&&SEG3?SEG3:v&&SEG2?SEG2:SEG;
  d=clamp(d,0,LEN);
  let lo=0,hi=L.length-1;
  while(lo<hi){const mid=(lo+hi)>>1;if(L[mid].s+L[mid].l<d)lo=mid+1;else hi=mid}
  const s=L[lo],k=clamp(d-s.s,0,s.l);return{x:s.x+s.dx*k,y:s.y+s.dy*k,dx:s.dx,dy:s.dy};
}
/* distância do ponto até a avenida: procura nos quadrados do índice em anéis cada vez maiores e para
   quando o anel já está mais longe que o trecho mais perto encontrado */
function distSeg(L,x,y){
  let m=1e9;
  const umTrecho=s=>{const k=clamp((x-s.x)*s.dx+(y-s.y)*s.dy,0,s.l),d=Math.hypot(x-s.x-s.dx*k,y-s.y-s.dy*k);if(d<m)m=d};
  const G=L.grade;
  if(G){
    const gx=Math.floor(x/64),gy=Math.floor(y/64);
    for(let rg=0;rg<24;rg++){
      if((rg-1)*64>m)return m;
      for(let i=-rg;i<=rg;i++){
        const borda=Math.abs(i)===rg;
        for(let j=-rg;j<=rg;j+=borda?1:2*rg||1){const a=G.get((gx+i)*1000+gy+j);if(a)for(const s of a)umTrecho(s)}
      }
    }
    if(m<1e9)return m;
  }
  for(const s of L)umTrecho(s);
  return m;
}
/* distância até a avenida mais perto (contando a segunda, se houver) */
function distPath(x,y){let m=distSeg(SEG,x,y);if(SEG2)m=Math.min(m,distSeg(SEG2,x,y));if(SEG3)m=Math.min(m,distSeg(SEG3,x,y));return m}
/* ponto da avenida mais perto; nearestD.via diz em qual das duas avenidas ele fica */
function nearestD(x,y){
  let best=0,m=1e9,bv=0;
  for(const v of VIAS())for(let d=0;d<=LEN;d+=8){const p=posAt(d,v),q=Math.hypot(p.x-x,p.y-y);if(q<m-.5){m=q;best=d;bv=v}}
  nearestD.via=bv;
  return best;
}
const inLake=(x,y)=>!!LAKE&&((x-LAKE.x)/LAKE.rx)**2+((y-LAKE.y)/LAKE.ry)**2<1;
const inStage=(x,y)=>x>815&&y<205;

/* ---------- mapas dos estados ---------- */
const BIOMAS={
  cerrado:{g:'#93ab5c',p:['#a4b866','#86a052','#b5a55f','#c99a5e'],t:['#e2679b','#f3c11f','#4c7a3a','#4c7a3a','#5f8f42'],n:70,tipo:'round',lago:1},
  amazonia:{g:'#4f8a3e',p:['#3f7a32','#5f9a48','#46803a','#6aa24e'],t:['#2f6b2c','#3f7a32','#2a5e28','#46803a'],n:150,tipo:'round',lago:1},
  mata:{g:'#6ea04e',p:['#7fb05a','#5f9244','#86b862','#669a4a'],t:['#3f7a32','#4c8a3a','#e2679b','#5f9a48'],n:95,tipo:'round',lago:1},
  caatinga:{g:'#c8a870',p:['#d6b880','#b8966a','#c29c60','#ddc294'],t:['#5f8a56','#6f9a62','#4f7a4a'],n:55,tipo:'cacto',lago:0},
  pampa:{g:'#a8c46a',p:['#b8d27a','#98b45e','#b0ca70','#c0d684'],t:['#4c7a3a','#5f8f42'],n:30,tipo:'round',lago:1},
  pantanal:{g:'#7fa45a',p:['#6f9650','#90b268','#5f9a7a','#86a860'],t:['#4c7a3a','#f3c11f','#5f8f42','#e2679b'],n:60,tipo:'round',lago:1},
  litoral:{g:'#d8c88c',p:['#e4d6a0','#ccba7c','#b8c478','#e8dcae'],t:['#3f8a3e','#4f9a48','#2f7a34'],n:60,tipo:'palmeira',lago:1},
  serra:{g:'#7a9a5e',p:['#6a8a50','#8aaa6a','#92a876','#6f9058'],t:['#2f5a30','#3a6a38','#26502a'],n:85,tipo:'araucaria',lago:0},
};
const ESTADOS=[
  ['AC','Acre','amazonia','castanheira','Castanheira'],['AL','Alagoas','litoral','jangada','Jangada de Pajuçara'],
  ['AM','Amazonas','amazonia','teatro','Teatro Amazonas'],['AP','Amapá','amazonia','marco','Marco Zero do Equador'],
  ['BA','Bahia','litoral','lacerda','Elevador Lacerda'],['CE','Ceará','litoral','farol','Farol do Mucuripe'],
  ['DF','Distrito Federal','cerrado','catedral','Catedral de Brasília'],['ES','Espírito Santo','mata','penha','Convento da Penha'],
  ['GO','Goiás','cerrado','tres','Monumento às Três Raças'],['MA','Maranhão','litoral','dunas','Lençóis Maranhenses'],
  ['MG','Minas Gerais','serra','igreja','Igreja de Ouro Preto'],['MS','Mato Grosso do Sul','pantanal','tuiuiu','Tuiuiú do Pantanal'],
  ['MT','Mato Grosso','pantanal','jacare','Jacaré do Pantanal'],['PA','Pará','amazonia','verpeso','Ver-o-Peso'],
  ['PB','Paraíba','litoral','farolpb','Farol do Cabo Branco'],['PE','Pernambuco','litoral','galo','Galo da Madrugada'],
  ['PI','Piauí','caatinga','pedra','Serra da Capivara'],['PR','Paraná','serra','estufa','Jardim Botânico'],
  ['RJ','Rio de Janeiro','mata','cristo','Cristo Redentor'],['RN','Rio Grande do Norte','caatinga','forte','Forte dos Reis Magos'],
  ['RO','Rondônia','amazonia','loco','Madeira-Mamoré'],['RR','Roraima','amazonia','tepui','Monte Roraima'],
  ['RS','Rio Grande do Sul','pampa','lacador','Estátua do Laçador'],['SC','Santa Catarina','serra','ponte','Ponte Hercílio Luz'],
  ['SE','Sergipe','litoral','caranguejo','Caranguejo de Aracaju'],['SP','São Paulo','mata','masp','MASP'],
  ['TO','Tocantins','cerrado','jalapao','Jalapão'],
];
function genPath(i){
  let s=(i+1)*7919%2147483647;
  const r=()=>(s=(s*16807)%2147483647)/2147483647,fam=i%3;
  if(fam===1){
    /* fileiras horizontais, de baixo para cima */
    const n=i%2?3:4,y0=Math.round(540+r()*40),xL=Math.round(n===3?100+r()*60:210+r()*50),xR=Math.round(n===3?730+r()*60:650+r()*40);
    const ys=[...Array(n)].map((_,k)=>Math.round(y0+(130-y0)*k/(n-1)));
    const startRight=n%2===0,pts=[[startRight?1000:-40,ys[0]]];
    let right=!startRight;
    for(let k=0;k<n-1;k++){const x=right?xR:xL;pts.push([x,ys[k]],[x,ys[k+1]]);right=!right}
    pts.push([858,130]);
    return pts;
  }
  /* colunas verticais; a família 2 tem colunas de tamanhos bem diferentes */
  const n=fam===2?6:4+(i%3===0?(i/3|0)%3:0),x0=Math.round(70+r()*40),xN=Math.round(735+r()*25);
  const span=n>=6?300:n===5?370:440;
  const top=()=>fam===2?Math.round(90+r()*170):Math.round(90+r()*60);
  const bot=()=>fam===2?Math.round(350+r()*230):Math.round(90+span+r()*50);
  const xs=[...Array(n)].map((_,k)=>Math.round(x0+(xN-x0)*k/(n-1)));
  const conn=[...Array(n-1)].map((_,k)=>(n-2-k)%2===0?bot():top());
  const y0=(n-2)%2===0?top():bot(),pts=[[-40,y0],[xs[0],y0]];
  for(let k=0;k<n-1;k++)pts.push([xs[k],conn[k]],[xs[k+1],conn[k]]);
  pts.push([xs[n-1],130],[858,130]);
  return pts;
}
/* ---------- avenidas mais complexas ----------
   Formas próprias (labirinto, caracol, laços, ondas, oito e a serpente antiga), todas com as esquinas arredondadas,
   e avenidas extras que entram por outra borda, serpenteiam pelo espaço livre e se juntam à principal mais adiante. */
const comprimentoPts=pts=>{let l=0;for(let i=1;i<pts.length;i++)l+=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]);return l};
/* troca cada esquina por uma curva (5 pontos), sem mexer no começo nem no fim */
function arredonda(pts,R){
  if(pts.length<3)return pts.slice();
  const out=[pts[0]];
  for(let i=1;i<pts.length-1;i++){
    const[ax,ay]=pts[i-1],[bx,by]=pts[i],[cx,cy]=pts[i+1],l1=Math.hypot(bx-ax,by-ay),l2=Math.hypot(cx-bx,cy-by);
    if(l1<1||l2<1){out.push([bx,by]);continue}
    const ux=(bx-ax)/l1,uy=(by-ay)/l1,vx=(cx-bx)/l2,vy=(cy-by)/l2,r=Math.min(R,l1/2-1,l2/2-1);
    if(r<6||Math.abs(ux*vy-uy*vx)<.05){out.push([bx,by]);continue}
    const p1=[bx-ux*r,by-uy*r],p2=[bx+vx*r,by+vy*r];
    for(let k=0;k<=4;k++){const t=k/4,m=1-t;out.push([m*m*p1[0]+2*m*t*bx+t*t*p2[0],m*m*p1[1]+2*m*t*by+t*t*p2[1]])}
  }
  out.push(pts[pts.length-1]);
  return out;
}
/* tira pontos no meio de retas (para o arredondamento achar as esquinas) */
function simplifica(pts){const out=[pts[0]];for(let i=1;i<pts.length-1;i++){const[a,b]=out[out.length-1],[c,d]=pts[i],[e,f]=pts[i+1];if(Math.abs((c-a)*(f-d)-(d-b)*(e-c))>1)out.push(pts[i])}out.push(pts[pts.length-1]);return out}
/* grade das ruas: 7 colunas x 6 fileiras; a célula (6,0) fica na porta do destino */
const GX=k=>70+k*112,GY=j=>130+j*92;
/* caminho pela grade sem passar duas vezes na mesma célula, com tamanho entre minC e maxC */
function rotaGrade(r,ini,fim,bloq,minC,maxC){
  const key=(k,j)=>k*10+j,vis=new Set(bloq),cam=[ini];vis.add(key(...ini));let tent=0,achou=null;
  const dfs=()=>{
    if(++tent>4000)return true;
    const[k,j]=cam[cam.length-1];
    if(k===fim[0]&&j===fim[1]){if(cam.length>=minC){achou=cam.slice();return true}return false}
    if(cam.length+Math.abs(fim[0]-k)+Math.abs(fim[1]-j)>maxC)return false;
    for(const[dk,dj]of[[1,0],[-1,0],[0,1],[0,-1]].sort(()=>r()-.5)){
      const nk=k+dk,nj=j+dj;if(nk<0||nk>6||nj<0||nj>5||vis.has(key(nk,nj)))continue;
      vis.add(key(nk,nj));cam.push([nk,nj]);if(dfs())return true;cam.pop();vis.delete(key(nk,nj));
    }
    return false;
  };
  dfs();return achou;
}
function caminhoLabirinto(r,minC=15,maxC=22){
  const j0=2+Math.floor(r()*4);
  const rota=rotaGrade(r,[0,j0],[6,0],[],minC,maxC)||rotaGrade(r,[0,j0],[6,0],[],8,30);
  if(!rota)return null;
  return arredonda(simplifica([[-40,GY(j0)],...rota.map(([k,j])=>[GX(k),GY(j)]),[858,130]]),34);
}
function caminhoCaracol(r){
  /* espiral quadrada para dentro; a saída cruza a volta de fora num viaduto */
  const m1=70+r()*20,b1=560+r()*20,R1=735+r()*15,t1=230+r()*20,g=112;
  return arredonda([[-40,b1],[R1,b1],[R1,t1],[m1+60,t1],[m1+60,b1-g],[R1-g,b1-g],[R1-g,t1+g],[m1+60+g,t1+g],[m1+60+g,130],[858,130]],40);
}
function caminhoLacos(r){
  /* três fileiras ligadas nas pontas; em cada uma a avenida dá um laço em volta de si mesma */
  const R=56,a=R*.42,y1=525+r()*25,y2=330+r()*20;
  const laco=(x0,y,dir,s)=>{const o=[];for(let k=1;k<=18;k++){const t=k/18*Math.PI*2;o.push([x0+dir*(a*t-R*Math.sin(t)),y+s*(R-R*Math.cos(t))])}return o};
  const xa=200+r()*60,xb=560+r()*60,xc=330+r()*80;
  return[[-40,y1],[xa,y1],...laco(xa,y1,1,-1),[760,y1],[778,y1-20],[778,y2+20],[760,y2],[xb,y2],...laco(xb,y2,-1,1),[110,y2],[92,y2-20],[92,150],[110,130],[xc,130],...laco(xc,130,1,1),[858,130]];
}
function caminhoOndas(r){
  const ys=[545+r()*25,340+r()*20],A=32,P=170+r()*60,pts=[];
  for(let x=-40;x<=740;x+=18)pts.push([x,ys[0]+A*Math.sin(x/P*Math.PI*2)]);
  pts.push([785,ys[0]-45],[785,ys[1]+40]);
  for(let x=740;x>=130;x-=18)pts.push([x,ys[1]+A*Math.sin(x/P*Math.PI*2+1.3)]);
  pts.push([85,ys[1]-45],[85,170]);
  for(let x=130;x<=760;x+=18)pts.push([x,130+(x<700?18*Math.sin(x/P*Math.PI*2):0)]);
  pts.push([858,130]);
  return pts;
}
function caminhoOito(r){
  /* um oito deitado: a avenida dá uma volta em cada laço e cruza no meio */
  const cx=440+r()*30,cy=405+r()*20,A=300,B=320,pts=[[-40,cy],[cx-A-26,cy]];
  for(let k=0;k<=56;k++){const t=-Math.PI/2+k/56*Math.PI*2;pts.push([cx+A*Math.sin(t),cy+B*Math.sin(t)*Math.cos(t)])}
  pts.push([cx-A,130],[858,130]);
  return pts;
}
/* confere se a avenida fica dentro da tela e só entra no destino no fim */
function caminhoValido(pts){
  for(let i=1;i<pts.length-1;i++){const[x,y]=pts[i];if(x<20||x>940||y<34||y>618)return false;if(inStage(x,y)&&i<pts.length-2)return false}
  return true;
}
/* avenida extra: começa numa borda (embaixo, em cima ou à esquerda), passa por células livres da grade
   e se junta à principal num ponto adiante. O pedaço fora da tela é esticado para ela ter o mesmo tamanho da principal */
function caminhoRamal(r,A,outros,lado){
  const segA=segsDe(A).seg,lenA=segsDe(A).len,todos=[segA,...outros.map(p=>segsDe(p).seg)];
  const dist=(x,y)=>Math.min(...todos.map(L=>distSeg(L,x,y)));
  const bloq=[];for(let k=0;k<7;k++)for(let j=0;j<6;j++)if(dist(GX(k),GY(j))<80)bloq.push(k*10+j);
  /* ponto de encontro: uma célula livre vizinha da avenida principal, já na segunda metade dela */
  const alvos=[];
  for(let k=0;k<7;k++)for(let j=0;j<6;j++){
    if(bloq.includes(k*10+j))continue;const x=GX(k),y=GY(j),dd=distSeg(segA,x,y);if(dd<80||dd>150)continue;
    let bd=0,bm=1e9;for(let d=0;d<lenA;d+=6){const p=posSeg(segA,d),q=Math.hypot(p.x-x,p.y-y);if(q<bm){bm=q;bd=d}}
    if(bd>lenA*.35&&bd<lenA-200)alvos.push({k,j,dm:bd});
  }
  alvos.sort(()=>r()-.5);
  for(const al of alvos.slice(0,6)){
    const ini=lado==='baixo'?[Math.floor(r()*6),5]:lado==='cima'?[1+Math.floor(r()*4),0]:[0,1+Math.floor(r()*5)];
    if(bloq.includes(ini[0]*10+ini[1]))continue;
    const borda=lado==='baixo'?[GX(ini[0]),H+12]:lado==='cima'?[GX(ini[0]),-12]:[-12,GY(ini[1])];
    const fora=lado==='baixo'?[0,1]:lado==='cima'?[0,-1]:[-1,0];
    const mand=Math.abs(al.k-ini[0])+Math.abs(al.j-ini[1])+1;
    const maxC=Math.floor((al.dm-200)/100)+1;if(maxC<mand)continue;
    const rota=rotaGrade(r,ini,[al.k,al.j],bloq.filter(c=>c!==ini[0]*10+ini[1]),Math.min(maxC,mand+4),maxC);if(!rota)continue;
    const pm=posSeg(segA,al.dm);
    const pre=arredonda(simplifica([borda,...rota.map(([k,j])=>[GX(k),GY(j)]),[pm.x,pm.y]]),30);
    const pad=al.dm-comprimentoPts(pre);if(pad<30)continue;
    /* o resto é a própria avenida principal, a partir do ponto de encontro */
    let idx=0,acc=0;for(let i=1;i<A.length;i++){const l=Math.hypot(A[i][0]-A[i-1][0],A[i][1]-A[i-1][1]);if(acc+l>=al.dm){idx=i;break}acc+=l}
    const caminho=[[borda[0]+fora[0]*pad,borda[1]+fora[1]*pad],...pre,...A.slice(idx)];
    if(Math.abs(comprimentoPts(caminho)-lenA)>2)continue;
    return{pts:caminho,dm:al.dm};
  }
  return null;
}
function posSeg(L,d){let lo=0,hi=L.length-1;while(lo<hi){const mid=(lo+hi)>>1;if(L[mid].s+L[mid].l<d)lo=mid+1;else hi=mid}const s=L[lo],k=clamp(d-s.s,0,s.l);return{x:s.x+s.dx*k,y:s.y+s.dy*k}}
/* monta as avenidas de um mapa: forma da principal e quantas extras (0 a 2), sempre igual para todo mundo */
const FORMAS=['labirinto','caracol','lacos','ondas','oito','serpente'];
function caminhosDoMapa(i,uf){
  if(uf==='DF')return{paths:[arredonda([[-40,120],[220,120],[220,300],[90,300],[90,530],[370,530],[370,180],[560,180],[560,420],[760,420],[760,130],[858,130]],36)],entradas:[],forma:'tutorial'};
  let s=hashStr('cam'+uf);const r=()=>(s=(Math.imul(s,1103515245)+12345)>>>0)/4294967296;
  /* metade dos mapas: labirinto mais enxuto com 1 ou 2 avenidas extras; a outra metade: uma avenida só, com forma elaborada */
  const nExtra=[0,1,0,2][i%4];
  const forma=nExtra?'labirinto':['lacos','caracol','oito','ondas','serpente'][(i*3+1)%5];
  const gera={labirinto:()=>caminhoLabirinto(r,nExtra?12:15,nExtra?16:22),caracol:caminhoCaracol,lacos:caminhoLacos,ondas:caminhoOndas,oito:caminhoOito}[forma];
  /* se a forma não couber na tela, fica a serpente de antes (arredondada) */
  let A=gera?gera(r):null,formaOk=forma;
  if(!A||!caminhoValido(A)){A=arredonda(genPath(i),38);formaOk='serpente'}
  /* avenidas extras, vindas de bordas diferentes; se não couber, tenta outra forma do labirinto */
  let paths=[A],entradas=[];
  for(let tent=0;tent<6&&nExtra;tent++){
    paths=[A];entradas=[];const lados=['baixo','cima','esquerda'].sort(()=>r()-.5);
    for(let n=0;n<nExtra;n++){
      let ram=null;for(const lado of lados){ram=caminhoRamal(r,A,paths.slice(1),lado);if(ram){lados.splice(lados.indexOf(lado),1);break}}
      if(!ram)break;paths.push(ram.pts);entradas.push({via:paths.length-1,dm:ram.dm});
    }
    if(entradas.length===nExtra)break;
    /* depois de umas tentativas, aceita um labirinto um pouco mais curto, que deixa mais espaço livre */
    const novo=caminhoLabirinto(r,tent<3?12:10,tent<3?16:14);if(novo&&caminhoValido(novo))A=novo;
  }
  return{paths,entradas,forma:formaOk};
}
const NOMES_FORMA={labirinto:'avenida em labirinto',caracol:'avenida em caracol',lacos:'avenida com laços',ondas:'avenida em ondas',oito:'avenida em oito',serpente:'avenida em zigue-zague',tutorial:''};
const MAPAS={};
function buildMap(uf){
  const i=ESTADOS.findIndex(e=>e[0]===uf),[,nome,bio,ic,leg]=ESTADOS[i],b=BIOMAS[bio];
  const cam=caminhosDoMapa(i,uf),path=cam.paths[0];
  setPath(path,cam.paths[1],cam.paths[2]);
  let lake=null;
  if(b.lago)for(const[x,y,rx,ry]of[[650,590,215,78],[300,595,205,72],[470,595,200,70],[520,60,170,50]]){
    let ok=true;
    for(let a=0;a<6.3&&ok;a+=.12)if(distPath(x+Math.cos(a)*(rx+10),y+Math.sin(a)*(ry+10))<40)ok=false;
    if(ok){lake={x,y,rx,ry};break}
  }
  LAKE=lake;
  /* monumento e barraca vão para os espaços livres mais longe da avenida */
  let spots=[];
  for(let x=90;x<790;x+=20)for(let y=70;y<590;y+=20)if(!inLake(x,y)&&!inStage(x,y)&&distPath(x,y)>=62)spots.push({x,y,d:distPath(x,y)});
  spots.sort((a,b)=>b.d-a.d);
  let lm=uf==='DF'?{x:660,y:270}:(spots[0]||{x:480,y:320});
  /* a coisa típica do estado ocupa uns 96 x 70 px: o retângulo inteiro tem de ficar longe da avenida e do lago */
  const folga=p=>{let m=1e9;for(let dx=-48;dx<=48;dx+=8)for(let dy=-44;dy<=26;dy+=10){const x=p.x+dx,y=p.y+dy;m=Math.min(m,inLake(x,y)?0:distPath(x,y))}return m};
  let far=spots.filter(p=>Math.hypot(p.x-lm.x,p.y-lm.y)>170&&folga(p)>=34);
  /* sem lugar folgado, fica no ponto com mais folga, em vez de encostar na avenida */
  if(!far.length){
    const cand=[];for(let x=60;x<=900;x+=10)for(let y=60;y<=600;y+=10){const p={x,y};if(!inStage(x,y)&&Math.hypot(x-lm.x,y-lm.y)>140)cand.push({x,y,f:folga(p)})}
    cand.sort((a,b)=>b.f-a.f);far=cand.slice(0,1);
  }
  const stall=uf==='DF'?{x:470,y:70}:(far[Math.floor(far.length/4)]||far[0]||{x:lm.x+150,y:lm.y});
  /* o mapa do Rio é uma favela: casinhas coloridas no lugar das árvores e obstáculos próprios */
  MAPAS[uf]={i,uf,nome,ic,leg,b,path,path2:cam.paths[1]||null,path3:cam.paths[2]||null,entradas:cam.entradas,forma:cam.forma,lake,lm,stall,len:LEN,bloq:[],tier:0,tema:uf==='RJ'?'favela':uf==='SP'?'paulista':['AL','BA','CE','MA','PB','PE','PI','RN','SE'].includes(uf)?'sertao':null,
    /* visuais especiais da serra: geada em Santa Catarina, outono (ipês amarelos e folhas) no Paraná e em Minas */
    visual:uf==='SC'?'geada':(uf==='PR'||uf==='MG')?'outono':null};
}
function setMap(uf){
  if(!MAPAS[uf])buildMap(uf);
  setPath(MAPAS[uf].path,MAPAS[uf].path2,MAPAS[uf].path3);LAKE=MAPAS[uf].lake;
}
/* dificuldade de cada mapa em quatro níveis (tabela TIER_MAPA, medida com o robô): os 6 mais difíceis são Expert
   (com obras onde não se pode colocar ninguém e marcha 5% mais rápida), os 7 seguintes Avançado, depois 7 Intermediário e o resto Iniciante. */
const NOMES_TIER={1:'Iniciante',2:'Intermediário',3:'Avançado',4:'Expert'},PREMIO_TIER={1:1,2:1.2,3:1.35,4:1.5};
/* classificação medida (2026-11-12). Antes era só pelo comprimento da avenida, mas com avenidas extras, metrô, balão,
   mapas lotados e bloqueios o comprimento deixou de dizer o quanto o mapa é difícil (AP e RR eram Expert e o robô
   vencia sem perder apoio; RJ era Iniciante e caía na rodada 10 no teste duro).
   Como foi medido: todos os mapas com a mesma classificação (sem as obras e a velocidade do Expert), o robô jogou
   o Difícil duas vezes com cada lado e o Normal com cada lado, e depois um Difícil com a marcha 60% mais resistente.
   Nota = derrotas (pesando mais as mais cedo) + apoio perdido nas vitórias. Os 6 piores viraram Expert, os 7 seguintes
   Avançado, depois 7 Intermediário e o resto Iniciante; o DF fica Iniciante por ser o mapa do tutorial. */
const TIER_MAPA={RN:4,ES:4,AL:4,SC:4,PE:4,PA:4, PR:3,RS:3,PI:3,MA:3,AP:3,RJ:3,SP:3, RR:2,PB:2,CE:2,BA:2,MS:2,AM:2,TO:2, SE:1,AC:1,GO:1,MG:1,MT:1,RO:1,DF:1};
let tiersProntos=false;
function garanteTiers(){
  if(tiersProntos)return;tiersProntos=true;
  for(const e of ESTADOS)if(!MAPAS[e[0]])buildMap(e[0]);
  const ord=ESTADOS.map(e=>e[0]).sort((a,b)=>MAPAS[a].len-MAPAS[b].len);
  ord.forEach(uf=>{MAPAS[uf].tier=TIER_MAPA[uf]||2});
  MAPAS.DF.tier=1;
  for(const uf of ord){
    const M=MAPAS[uf];if(M.tier!==4)continue;
    setMap(uf);
    /* 4 obras nos melhores lugares perto da avenida, longe umas das outras e do monumento e da barraca */
    const cand=[];
    for(let x=80;x<=880;x+=20)for(let y=70;y<=590;y+=20){const d=distPath(x,y);if(d<44||d>80||inLake(x,y)||inStage(x,y))continue;if(Math.hypot(x-M.lm.x,y-M.lm.y)<90||Math.hypot(x-M.stall.x,y-M.stall.y)<80)continue;cand.push({x,y})}
    let s=hashStr('obra'+uf);const r=()=>(s=(Math.imul(s,1103515245)+12345)>>>0)/4294967296;
    for(let k=0;k<4&&cand.length;k++){
      const ok=cand.filter(p=>M.bloq.every(z=>Math.hypot(z.x-p.x,z.y-p.y)>220));
      const lista=ok.length?ok:cand;const p=lista[Math.floor(r()*lista.length)];M.bloq.push({x:p.x,y:p.y,r:34});
    }
  }
  /* bloqueios novos em todos os mapas (menos o do tutorial): 2 nos mapas fáceis, 3 nos Avançados e Expert,
     sempre em bons lugares perto da avenida, onde fariam falta para quem defende */
  for(const uf of ord){
    if(uf==='DF')continue;const M=MAPAS[uf];setMap(uf);
    const tipos=M.tema==='paulista'?['cercado','feira','somParado']:M.tema==='favela'?['feira','cercado','canteiro']:M.tema==='sertao'?['feira','canteiro','somParado']:['cercado','canteiro','feira','somParado'];
    const cand=[];
    for(let x=70;x<=890;x+=18)for(let y=70;y<=590;y+=18){const d=distPath(x,y);if(d<46||d>95||inLake(x,y)||inStage(x,y))continue;if(Math.hypot(x-M.lm.x,y-M.lm.y)<90||Math.hypot(x-M.stall.x,y-M.stall.y)<80)continue;cand.push({x,y})}
    let s=hashStr('bloq'+uf);const r=()=>(s=(Math.imul(s,1103515245)+12345)>>>0)/4294967296;
    const n=2+(M.tier>=3?1:0);
    for(let k=0;k<n&&cand.length;k++){
      const ok=cand.filter(p=>M.bloq.every(z=>Math.hypot(z.x-p.x,z.y-p.y)>180));if(!ok.length)break;
      const p=ok[Math.floor(r()*ok.length)],tipo=tipos[k%tipos.length];M.bloq.push({x:p.x,y:p.y,r:tipo==='somParado'?30:32,tipo});
    }
  }
  garanteDinamicos();
}
/* ---------- mapas dinâmicos ----------
   Cada mapa ganha, de forma fixa (sempre igual para todo mundo):
   - desvio: uma segunda avenida do mesmo tamanho, contornando um retângulo pelo outro lado de uma esquina;
   - túnel: um trecho coberto em que ninguém mira a marcha (só poderes especiais e o do herói atingem);
   - prédios: tapam a visão de quem ataca (aviões e auras não são afetados) e não dá para construir neles;
   - obstáculos: ocupam bons lugares e saem pagando verba;
   - um evento do estado: chuva, trem, apagão ou enchente. */
const TIPOS_OBST={
  carro:{nome:'Carro abandonado',custo:300,r:22},banca:{nome:'Banca de jornal',custo:250,r:20},
  cacamba:{nome:'Caçamba de entulho',custo:400,r:22},arvore:{nome:'Árvore grande',custo:200,r:22},
  pedra:{nome:'Pedra',custo:350,r:20},tronco:{nome:'Tronco caído',custo:150,r:20},
  barraco:{nome:'Barraco vazio',custo:350,r:22},caixadagua:{nome:'Caixa d\'água',custo:200,r:18},
};
const OBST_BIOMA={amazonia:['arvore','tronco','pedra','carro'],mata:['arvore','carro','banca','tronco'],caatinga:['pedra','tronco','carro'],
  litoral:['carro','banca','pedra'],cerrado:['carro','banca','cacamba'],serra:['pedra','arvore','tronco','cacamba'],pampa:['pedra','tronco','carro'],pantanal:['tronco','arvore','pedra']};
const EVENTOS={
  chuva:{nome:'Chuva',desc:'Em algumas rodadas chove: a marcha anda 15% mais devagar e o fogo apaga rápido.'},
  trem:{nome:'Trem',desc:'De tempos em tempos o trem passa e a cancela segura a marcha por alguns segundos (chefões não esperam).'},
  apagao:{nome:'Apagão',desc:'Em algumas rodadas falta luz por 12 s: todo mundo enxerga 25% mais perto.'},
  enchente:{nome:'Enchente',desc:'Em algumas rodadas o lago enche: quem fica dentro da água não ataca até a água baixar.'},
};
/* mapas atuais que ganharam as dificuldades novas:
   lotados = muitos obstáculos e mais prédios; móveis = dirigível e fumaça que passam e tapam a visão */
const MAPAS_LOTADOS=['PE','PR','GO','RJ','AC','SC','ES'];
const MAPAS_MOVEIS=['SP','BA','MG','RS','AM','CE','MA','TO','PB'];
/* metrô: quem entra numa estação sai na outra, mais adiante (chefões não cabem no vagão).
   balão: de tempos em tempos leva até 5 da marcha pelo ar até outro ponto; lá em cima ninguém alcança */
const MAPAS_METRO=['SP','RJ','MG','BA','PE','RS','CE','PI'];
const MAPAS_BALAO=['SC','PR','GO','TO','MS','MT','RN','ES'];
/* balsa (Norte): atravessa um rio levando até 8, devagar; teleférico (AL, MA, PB, SE): uma cabine pelo cabo levando até 4, rápido.
   Funcionam como o balão: quem está dentro não pode ser atingido e só desce no outro ponto */
const MAPAS_BALSA=['AM','PA','AP','AC','RO','RR'];
const MAPAS_TELEFERICO=['AL','MA','PB','SE'];
const TRANSPORTE={
  balao:{cap:5,vel:75,espera:9,min:3,pouso:'pouso',txt:'Subiu no balão!',nome:'balão',desc:'balão (leva até 5 da marcha pelo ar; lá em cima ninguém alcança)',
    dica:'O balão leva quem estiver passando para outro ponto da avenida. Lá em cima ninguém alcança: defenda o lugar onde ele pousa.'},
  balsa:{cap:8,vel:48,espera:10,min:4,pouso:'cais',txt:'Embarcou na balsa!',nome:'balsa',desc:'balsa (atravessa o rio com até 8 da marcha; dentro dela ninguém alcança)',
    dica:'A balsa atravessa o rio levando até 8 da marcha, devagar. Dentro dela ninguém alcança: espere todo mundo desembarcar no cais do outro lado.'},
  teleferico:{cap:4,vel:95,espera:6,min:2.5,pouso:'torreCabo',txt:'Subiu no teleférico!',nome:'teleférico',desc:'teleférico (uma cabine leva até 4 da marcha pelo cabo; lá em cima ninguém alcança)',
    dica:'O teleférico leva até 4 da marcha pelo cabo, rápido e muitas vezes. Defenda a torre de chegada.'},
};
/* posição de uma coisa que se move: vai de a até b e volta, devagar nas pontas (usa o relógio da partida, então para no pause) */
function posMovel(m){
  const f=(((S?S.time:0)+m.fase)%m.per)/m.per,k0=f<.5?f*2:2-f*2,k=k0*k0*(3-2*k0);
  return{x:m.a.x+(m.b.x-m.a.x)*k,y:m.a.y+(m.b.y-m.a.y)*k,dir:f<.5?1:-1};
}
let dinProntos=false;
function garanteDinamicos(){
  if(dinProntos)return;dinProntos=true;
  for(const[uf]of ESTADOS){const M=MAPAS[uf];setMap(uf);montaDinamico(M)}
}
function montaDinamico(M){
  let s=hashStr('din'+M.uf);const r=()=>(s=(Math.imul(s,1103515245)+12345)>>>0)/4294967296;
  const longe=(x,y,folga)=>Math.hypot(x-M.lm.x,y-M.lm.y)>folga+40&&Math.hypot(x-M.stall.x,y-M.stall.y)>folga+40&&M.bloq.every(z=>Math.hypot(x-z.x,y-z.y)>z.r+folga);
  const livre=(x,y)=>x>34&&x<W-34&&y>44&&y<H-30&&!inStage(x,y)&&!inLake(x,y)&&!rioBalsaDe(M,x,y);
  const tutorial=M.uf==='DF';
  /* 1. desvio: só em parte dos mapas (e nunca no do tutorial) */
  M.desvio=null;M.entrada=null;
  if(M.entradas&&M.entradas.length){
    /* o mapa já nasceu com avenidas extras (vindas de outras bordas): sem desvio nem a entrada curta de antes */
    M.entrada={dm:Math.max(...M.entradas.map(x=>x.dm)),via:M.entradas[0].via};
  }else{
    M.path2=null;M.path3=null;
    if(!tutorial&&r()<2){const d=achaDesvio(M,livre,longe,r);if(d){M.path=d.path1;M.path2=d.path2;M.desvio={d1:d.d1,d2:d.d2}}}
    /* 1b. segunda entrada: a marcha chega também por outro lado da tela.
       Num mapa que já tem desvio, ela vira o 3º caminho (e se junta à avenida antes do desvio). */
    setPath(M.path,M.path2);
    if(!tutorial&&r()<.8){
      const e=achaEntrada(M,longe,r,M.desvio?M.desvio.d1-140:780);
      if(e){if(M.path2){M.path3=e.path2;M.entrada={dm:e.dm,via:2}}else{M.path2=e.path2;M.entrada={dm:e.dm,via:1}}}
    }
  }
  setPath(M.path,M.path2,M.path3);
  /* 2. túnel: um trecho reto, longe do desvio */
  M.tunel=null;
  if(!tutorial&&r()<.45){
    const cand=SEG.filter(sg=>sg.l>=230).filter(sg=>{const a=sg.s+(sg.l-150)/2,b=a+150;
      if(M.desvio&&b>M.desvio.d1-60&&a<M.desvio.d2+60)return false;
      if(M.entrada&&a<M.entrada.dm+60)return false;
      for(let d=a;d<=b;d+=15){const p=posAt(d);if(!livre(p.x,p.y)&&!inLake(p.x,p.y))return false}
      return a>120&&b<LEN-200});
    if(cand.length){const sg=cand[Math.floor(r()*cand.length)],a=sg.s+(sg.l-150)/2;M.tunel={d1:a,d2:a+150}}
  }
  /* 2b. metrô e balão: dois pontos da avenida (na parte comum a todas as avenidas) ligados por baixo da terra ou pelo ar */
  M.metro=null;M.balaoVoo=null;
  /* ficam na avenida principal: quem vem por uma avenida extra só usa depois que ela se junta à principal */
  const pontoOk=d=>d>160&&d<LEN-220&&!(M.desvio&&d>M.desvio.d1-70&&d<M.desvio.d2+70)&&!(M.tunel&&d>M.tunel.d1-70&&d<M.tunel.d2+70);
  /* lugar na calçada ao lado do ponto d: do lado que estiver livre e longe das outras avenidas */
  const calcada=(d,afasta)=>{const p=posAt(d,0);for(const s of[1,-1]){const x=p.x-p.dy*s*afasta,y=p.y+p.dx*s*afasta;if(livre(x,y)&&longe(x,y,24)&&distPath(x,y)>=afasta-6)return{x,y}}return null};
  const escolhePar=(frac0,frac1,salto,afasta)=>{for(let k=0;k<40;k++){const d1=LEN*(frac0+(frac1-frac0)*r()),d2=d1+LEN*salto*(.85+.3*r());if(!pontoOk(d1)||!pontoOk(d2))continue;const a=calcada(d1,afasta),b=calcada(d2,afasta);if(a&&b&&Math.hypot(a.x-b.x,a.y-b.y)>160)return{d1,d2,a,b}}return null};
  if(!tutorial&&MAPAS_METRO.includes(M.uf)){const p=escolhePar(.15,.5,.24,40);if(p){M.metro={d1:p.d1,d2:p.d2,a:p.a,b:p.b};const cor=['#c8102e','#2456a6','#35a35f','#f2b705'][Math.floor(r()*4)];for(const q of[p.a,p.b])M.bloq.push({x:q.x,y:q.y,r:20,tipo:'metro',cor})}}
  {const tipo=MAPAS_BALAO.includes(M.uf)?'balao':MAPAS_BALSA.includes(M.uf)?'balsa':MAPAS_TELEFERICO.includes(M.uf)?'teleferico':null;
   if(!tutorial&&tipo){const TT=TRANSPORTE[tipo],p=escolhePar(.15,.5,tipo==='teleferico'?.22:.26,46);
     if(p){const dist=Math.hypot(p.a.x-p.b.x,p.a.y-p.b.y);M.balaoVoo={tipo,d1:p.d1,d2:p.d2,a:p.a,b:p.b,dur:Math.max(TT.min,dist/TT.vel),espera:TT.espera,cap:TT.cap};for(const q of[p.a,p.b])M.bloq.push({x:q.x,y:q.y,r:24,tipo:TT.pouso})}}}
  /* 3. prédios: 1 a 3, perto da avenida, onde tapam a visão (no mapa lotado, 2 a mais) */
  M.lotado=MAPAS_LOTADOS.includes(M.uf);
  M.predios=[];
  const nPred=tutorial?0:1+Math.floor(r()*(M.tier===4?3:2.2))+(M.lotado?2:0);
  const spots=[];for(let x=60;x<=900;x+=15)for(let y=70;y<=590;y+=15){const d=distPath(x,y);if(d>=58&&d<=95&&livre(x,y)&&longe(x,y,40)&&!naTunel(M,x,y))spots.push({x,y})}
  for(let k=0;k<nPred&&spots.length;k++){
    const ok=spots.filter(p=>M.predios.every(q=>Math.hypot(q.x-p.x,q.y-p.y)>(M.lotado?150:200)));if(!ok.length)break;
    const p=ok[Math.floor(r()*ok.length)];M.predios.push({x:p.x,y:p.y,r:24,h:40+Math.floor(r()*30),cor:['#8a8f98','#b8a88a','#9aa6b2','#c7b39a'][Math.floor(r()*4)]});
  }
  /* 3b. morros: terreno alto onde o personagem enxerga 15% mais longe e por cima dos prédios */
  M.morros=[];
  if(!tutorial){
    const nM=1+Math.floor(r()*2),cabe=(x,y,R)=>{for(let a=0;a<6.3;a+=.8)if(!livre(x+Math.cos(a)*R,y+Math.sin(a)*R*.8))return false;return true};
    const lug=[];for(let x=80;x<=880;x+=15)for(let y=90;y<=580;y+=15){const d=distPath(x,y);if(d>=95&&d<=150&&livre(x,y)&&cabe(x,y,56)&&longe(x,y,70)&&M.predios.every(q=>Math.hypot(q.x-x,q.y-y)>110)&&!naTunel(M,x,y))lug.push({x,y})}
    for(let k=0;k<nM&&lug.length;k++){const ok=lug.filter(p=>M.morros.every(q=>Math.hypot(q.x-p.x,q.y-p.y)>230));if(!ok.length)break;const p=ok[Math.floor(r()*ok.length)];M.morros.push({x:p.x,y:p.y,r:56})}
  }
  /* 4. obstáculos removíveis: 4 ou 5 em lugares bons (perto da avenida) */
  M.obst=[];
  const tipos=M.tema==='favela'?['barraco','caixadagua','barraco','caixadagua','carro']:M.tema==='sertao'?['pedra','tronco','carro','pedra']:M.tema==='paulista'?['carro','banca','cacamba','carro']:OBST_BIOMA[ESTADOS[M.i][2]]||['carro','pedra'];
  const bons=[];for(let x=50;x<=910;x+=15)for(let y=60;y<=600;y+=15){const d=distPath(x,y);if(d>=46&&d<=(M.lotado?160:120)&&livre(x,y)&&longe(x,y,30)&&M.predios.every(q=>Math.hypot(q.x-x,q.y-y)>70)&&M.morros.every(q=>Math.hypot(q.x-x,q.y-y)>q.r+25))bons.push({x,y})}
  /* mapa lotado: 11 a 13 obstáculos, bem mais perto uns dos outros */
  const nObs=tutorial?3:M.lotado?11+Math.floor(r()*3):4+Math.floor(r()*2);
  for(let k=0;k<nObs&&bons.length;k++){
    const ok=bons.filter(p=>M.obst.every(q=>Math.hypot(q.x-p.x,q.y-p.y)>(M.lotado?72:110)));if(!ok.length)break;
    const p=ok[Math.floor(r()*ok.length)],tipo=tipos[Math.floor(r()*tipos.length)];
    M.obst.push({id:k,x:p.x,y:p.y,tipo,r:TIPOS_OBST[tipo].r,rot:r()*.6-.3});
  }
  /* 4b. coisas que se movem e tapam a visão: um dirigível que cruza o mapa e nuvens de fumaça que vão e voltam sobre a avenida */
  M.moveis=[];
  if(MAPAS_MOVEIS.includes(M.uf)){
    /* dirigível: escolhe a altura (y) em que a linha de voo passa por cima de mais avenida */
    let by=320,bn=-1;for(let y=110;y<=540;y+=10){let n=0;for(let x=0;x<W;x+=12)if(distPath(x,y)<60)n++;if(n>bn){bn=n;by=y}}
    M.moveis.push({tipo:'balao',a:{x:-90,y:by},b:{x:W+90,y:by+(r()-.5)*80},r:40,per:44,fase:r()*44});
    /* fumaça: 1 ou 2 nuvens, cada uma indo e voltando 170 px por cima de um trecho da avenida */
    const nF=1+(M.tier>=3?1:0);
    for(let k=0;k<nF;k++){
      const d=LEN*(.3+.4*r()),p=posAt(d),ang=r()*6.28;
      M.moveis.push({tipo:'fumaca',a:{x:p.x-Math.cos(ang)*85,y:p.y-Math.sin(ang)*85},b:{x:p.x+Math.cos(ang)*85,y:p.y+Math.sin(ang)*85},r:50,per:24+r()*10,fase:r()*30});
    }
  }
  /* 5. evento do estado, pelo bioma */
  const bio=ESTADOS[M.i][2];
  const sorte=r();
  M.evento=tutorial?null:bio==='amazonia'?'chuva':bio==='mata'?(sorte<.5?'apagao':'chuva')
    :(bio==='litoral'||bio==='pantanal')?(M.lake?(sorte<.65?'enchente':'chuva'):(sorte<.5?'trem':'chuva'))
    :(bio==='cerrado'||bio==='pampa')?'trem':(sorte<.5?'apagao':'trem');
  /* o trem cruza a avenida num ponto reto, fora do desvio e do túnel */
  M.trem=null;
  if(M.evento==='trem'){
    const cand=[];for(const sg of SEG){if(sg.l<140)continue;const d=sg.s+sg.l/2;if(d<150||d>LEN-150)continue;
      if(M.desvio&&d>M.desvio.d1-50&&d<M.desvio.d2+50)continue;if(M.entrada&&d<M.entrada.dm+50)continue;if(M.tunel&&d>M.tunel.d1-60&&d<M.tunel.d2+60)continue;
      if(M.metro&&d>M.metro.d1-60&&d<M.metro.d2+60)continue;if(M.balaoVoo&&(Math.abs(d-M.balaoVoo.d1)<80||Math.abs(d-M.balaoVoo.d2)<80))continue;
      const p=posAt(d);if(livre(p.x,p.y))cand.push(d)}
    if(cand.length)M.trem={d:cand[Math.floor(r()*cand.length)]};else M.evento='apagao';
  }
  /* enchente: até onde o lago pode crescer sem chegar na avenida */
  if(M.evento==='enchente'){let k=1.0;const L=M.lake;
    for(let f=1.05;f<=1.5;f+=.05){let ok=true;for(let a=0;a<6.3&&ok;a+=.1)if(distPath(L.x+Math.cos(a)*L.rx*f,L.y+Math.sin(a)*L.ry*f)<34)ok=false;if(!ok)break;k=f}
    if(k<1.15)M.evento='chuva';else M.enchK=k;
  }
  /* trechos especiais da avenida (ladeira, lama, mato alto...) */
  montaTrechos(M);
  /* composição do mapa, para o menu: quanto é espaço livre, avenida e ocupado (lago, obras, obstáculos, prédios) */
  let liv=0,ave=0,tot=0;
  for(let x=5;x<W;x+=10)for(let y=5;y<H;y+=10){
    if(inStage(x,y))continue;tot++;const d=distPath(x,y);
    if(d<28)ave++;
    else if(d>=38&&!inLake(x,y)&&x>=18&&x<=W-18&&y>=26&&y<=H-14&&!M.bloq.some(z=>Math.hypot(z.x-x,z.y-y)<z.r+8)&&!M.obst.some(o=>Math.hypot(o.x-x,o.y-y)<o.r+10)&&!M.predios.some(b=>Math.hypot(b.x-x,b.y-y)<b.r+14))liv++;
  }
  M.comp={livre:Math.round(liv/tot*100),avenida:Math.round(ave/tot*100)};M.comp.ocupado=100-M.comp.livre-M.comp.avenida;
  M.len=LEN;
}
/* no morro: elipse um pouco achatada, como aparece no desenho */
const noMorro=(x,y)=>(MAPAS[S.uf].morros||[]).some(m=>((x-m.x)/m.r)**2+((y-m.y)/(m.r*.8))**2<1);
function desenhaMorro(c,m){
  c.save();c.translate(m.x,m.y);
  c.fillStyle='#0003';c.beginPath();c.ellipse(4,10,m.r+4,m.r*.8+2,0,0,7);c.fill();
  c.fillStyle='#8a7350';c.beginPath();c.ellipse(0,6,m.r+2,m.r*.8+2,0,0,7);c.fill();
  c.fillStyle='#a88a5e';c.beginPath();c.ellipse(0,2,m.r,m.r*.8,0,0,7);c.fill();
  c.fillStyle='#9cb86a';c.beginPath();c.ellipse(0,-2,m.r-8,m.r*.8-8,0,0,7);c.fill();
  c.fillStyle='#b2cc7c';c.beginPath();c.ellipse(-10,-10,m.r*.45,m.r*.3,0,0,7);c.fill();
  c.fillStyle='#6f5a3e';for(let a=.3;a<3;a+=.5)disc(c,Math.cos(a)*(m.r-2),3+Math.sin(a)*(m.r*.8-2),3.2);
  c.restore();
}
/* balão: espera no ponto de partida, embarca até 5 da marcha que passam pela avenida ali do lado,
   voa até o ponto de chegada (lá em cima ninguém alcança), solta todo mundo na avenida e volta vazio */
/* o ponto d de uma via fica na avenida principal? (avenidas extras só coincidem com ela depois de se juntarem) */
const naPrincipal=(d,v)=>{if(!v)return true;const a=posAt(d,0),b=posAt(d,v);return Math.hypot(a.x-b.x,a.y-b.y)<6};
function stepBalao(dt){
  const M=MAPAS[S.uf],V=M.balaoVoo;if(!V||!S.inRound||S.menu)return;
  const B=S.balao||(S.balao={fase:'chao',t:4,carga:[]});
  if(B.fase==='chao'){
    B.t-=dt;if(B.t>0)return;
    const TT=TRANSPORTE[V.tipo||'balao'];
    const pega=S.enemies.filter(e=>!e.dead&&!e.voo&&!e.T.boss&&!e.T.veh&&e.d>V.d1-36&&e.d<V.d1+14&&naPrincipal(V.d1,e.via)).slice(0,V.cap||5);
    if(!pega.length){B.t=.25;return}
    for(const e of pega)e.voo=1;B.carga=pega;B.fase='ida';B.t=0;
    const p=posAt(V.d1);S.fx.push({k:'ring',x:p.x,y:p.y,r:30,c:'#ffe27a',t:0,d:.4});float(V.a.x,V.a.y-70,TT.txt,'#ffe27a');
    const kd='transp_'+(V.tipo||'balao');if(!DICAS[kd])dica(kd,TT.dica);
  }else if(B.fase==='ida'){
    B.t+=dt/V.dur;
    if(B.t>=1){for(const e of B.carga)if(!e.dead){e.voo=0;e.d=V.d2}B.carga=[];B.fase='volta';B.t=0;const p=posAt(V.d2);S.fx.push({k:'ring',x:p.x,y:p.y,r:30,c:'#ffe27a',t:0,d:.4})}
  }else{B.t+=dt/V.dur;if(B.t>=1){B.fase='chao';B.t=V.espera}}
}
/* rio da balsa: faixa de água reta entre os dois cais (as avenidas passam por cima, como pontes) */
const naRioBalsa=(x,y)=>rioBalsaDe(MAPAS[S&&S.uf],x,y);
const rioBalsaDe=(M,x,y)=>{const V=M&&M.balaoVoo;if(!V||V.tipo!=='balsa')return false;
  const ax=V.a.x,ay=V.a.y,bx=V.b.x,by=V.b.y,L2=(bx-ax)**2+(by-ay)**2,t=Math.max(0,Math.min(1,((x-ax)*(bx-ax)+(y-ay)*(by-ay))/L2));
  return Math.hypot(x-(ax+(bx-ax)*t),y-(ay+(by-ay)*t))<26};
function desenhaRioBalsa(c,M){
  const V=M.balaoVoo;if(!V||V.tipo!=='balsa')return;
  const dx=V.b.x-V.a.x,dy=V.b.y-V.a.y,L=Math.hypot(dx,dy),ux=dx/L,uy=dy/L,ex=V.a.x-ux*40,ey=V.a.y-uy*40,fx=V.b.x+ux*40,fy=V.b.y+uy*40;
  c.lineCap='round';c.strokeStyle='#c9b07a';c.lineWidth=46;c.beginPath();c.moveTo(ex,ey);c.lineTo(fx,fy);c.stroke();
  c.strokeStyle='#4f8fb0';c.lineWidth=36;c.stroke();c.strokeStyle='rgba(255,255,255,.18)';c.lineWidth=14;c.stroke();
  c.strokeStyle='rgba(255,255,255,.55)';c.lineWidth=1.2;for(let k=30;k<L+50;k+=26){const x=ex+ux*k+(-uy)*((k*7)%20-10),y=ey+uy*k+ux*((k*7)%20-10);c.beginPath();c.moveTo(x-ux*6,y-uy*6);c.quadraticCurveTo(x-uy*2,y+ux*2,x+ux*6,y+uy*6);c.stroke()}
}
function desenhaBalaoVoo(c,M){
  const V=M.balaoVoo;if(!V)return;
  const B=S.balao||{fase:'chao',t:0,carga:[]},k=B.fase==='chao'?0:B.fase==='ida'?B.t:1-B.t,kk=k*k*(3-2*k);
  const tipo=V.tipo||'balao',nCarga=Math.min(8,(B.carga||[]).filter(e=>!e.dead).length),pele=['#e3b085','#c98e62','#8d5a3b','#f0c8a0'];
  if(tipo==='balsa'){
    const x=V.a.x+(V.b.x-V.a.x)*kk,y=V.a.y+(V.b.y-V.a.y)*kk,an=Math.atan2(V.b.y-V.a.y,V.b.x-V.a.x)+(B.fase==='volta'?Math.PI:0);
    c.save();c.translate(x,y);c.rotate(an);
    c.fillStyle='rgba(255,255,255,.35)';c.beginPath();c.ellipse(-22,0,10,14,0,0,7);c.fill();
    c.fillStyle='#1d1a16';c.beginPath();c.moveTo(-20,-13);c.lineTo(16,-13);c.lineTo(24,0);c.lineTo(16,13);c.lineTo(-20,13);c.closePath();c.fill();
    c.fillStyle='#e8e4da';c.beginPath();c.moveTo(-18,-11);c.lineTo(15,-11);c.lineTo(21,0);c.lineTo(15,11);c.lineTo(-18,11);c.closePath();c.fill();
    c.fillStyle='#2f6fd0';c.fillRect(-18,-3,33,6);c.fillStyle='#c8102e';c.fillRect(-16,-9,10,18);
    c.rotate(-an);for(let i=0;i<nCarga;i++){c.fillStyle=pele[i%4];disc(c,-6+(i%4)*5-an,-5+Math.floor(i/4)*7,2.8)}
    c.restore();return;
  }
  if(tipo==='teleferico'){
    /* cabo entre as duas torres e a cabine pendurada */
    const ax=V.a.x,ay=V.a.y-34,bx=V.b.x,by=V.b.y-34;
    c.strokeStyle='rgba(0,0,0,.18)';c.lineWidth=3;c.beginPath();c.moveTo(ax+6,ay+40);c.quadraticCurveTo((ax+bx)/2+6,(ay+by)/2+62,bx+6,by+40);c.stroke();
    c.strokeStyle='#2a2622';c.lineWidth=2.6;c.beginPath();c.moveTo(ax,ay);c.quadraticCurveTo((ax+bx)/2,(ay+by)/2+22,bx,by);c.stroke();
    c.lineWidth=1.6;c.beginPath();c.moveTo(ax,ay+5);c.quadraticCurveTo((ax+bx)/2,(ay+by)/2+27,bx,by+5);c.stroke();
    const t=kk,qx=(1-t)*(1-t)*ax+2*(1-t)*t*(ax+bx)/2+t*t*bx,qy=(1-t)*(1-t)*ay+2*(1-t)*t*((ay+by)/2+22)+t*t*by;
    c.fillStyle='rgba(0,0,0,.15)';c.beginPath();c.ellipse(V.a.x+(V.b.x-V.a.x)*t,V.a.y+(V.b.y-V.a.y)*t+4,10,3.5,0,0,7);c.fill();
    c.strokeStyle='#2a2622';c.lineWidth=2;c.beginPath();c.moveTo(qx,qy);c.lineTo(qx,qy+8);c.stroke();
    c.fillStyle='#1d1a16';rr(c,qx-15,qy+8,30,22,5);c.fillStyle='#e63946';rr(c,qx-13.5,qy+9.5,27,19,4);c.fillStyle='#9ad0e8';c.fillRect(qx-11,qy+12,22,8);c.fillStyle='#fff';c.fillRect(qx-13.5,qy+23,27,2);
    for(let i=0;i<nCarga;i++){c.fillStyle=pele[i%4];disc(c,qx-8+i*5.4,qy+17,2.6)}
    return;
  }
  const alt=B.fase==='chao'?0:Math.sin(Math.PI*k)*60+18;
  const x=V.a.x+(V.b.x-V.a.x)*kk,y=V.a.y+(V.b.y-V.a.y)*kk-alt-10;
  /* sombra no chão */
  c.fillStyle='rgba(0,0,0,.18)';c.beginPath();c.ellipse(V.a.x+(V.b.x-V.a.x)*kk,V.a.y+(V.b.y-V.a.y)*kk+4,16-alt*.08,5,0,0,7);c.fill();
  c.save();c.translate(x,y+Math.sin((S.time||0)*2)*1.5);
  c.strokeStyle='#5a3d27';c.lineWidth=1;for(const s of[-1,1]){c.beginPath();c.moveTo(s*12,-26);c.lineTo(s*7,-4);c.stroke()}
  const cores=['#c8102e','#f2b705','#2456a6','#35a35f'];
  for(let i=0;i<6;i++){c.fillStyle=cores[i%4];c.beginPath();c.moveTo(0,-20);c.ellipse(0,-44,22,26,0,Math.PI*.5+i*Math.PI/3,Math.PI*.5+(i+1)*Math.PI/3);c.closePath();c.fill()}
  c.strokeStyle='#1d1a16';c.lineWidth=1.5;c.beginPath();c.ellipse(0,-44,22,26,0,0,7);c.stroke();
  c.fillStyle='rgba(255,255,255,.25)';c.beginPath();c.ellipse(-8,-52,6,10,-.3,0,7);c.fill();
  c.fillStyle='#8a5a30';c.fillRect(-8,-6,16,10);c.strokeStyle='#5a3d27';c.strokeRect(-8,-6,16,10);
  /* cabeças de quem está no cesto */
  const n=Math.min(5,(B.carga||[]).filter(e=>!e.dead).length);for(let i=0;i<n;i++){c.fillStyle=['#e3b085','#c98e62','#8d5a3b','#f0c8a0','#e3b085'][i];disc(c,-6+i*3,-8,2.6)}
  if(B.fase==='chao'){c.fillStyle='#ff8a2c';c.beginPath();c.moveTo(-3,-10);c.quadraticCurveTo(0,-20,3,-10);c.fill()}
  c.restore();
}
/* metrô: a linha tracejada mostra por onde ele leva a marcha, por baixo da terra */
function desenhaLinhaMetro(c,M){
  const Mm=M.metro;if(!Mm)return;c.save();c.strokeStyle='rgba(40,40,60,.35)';c.lineWidth=4;c.setLineDash([2,10]);c.lineCap='round';c.beginPath();c.moveTo(Mm.a.x,Mm.a.y);c.lineTo(Mm.b.x,Mm.b.y);c.stroke();c.restore();
  /* trem passando de vez em quando */
  const f=((S.time||0)%6)/6;if(f<.5){const k=f*2,x=Mm.a.x+(Mm.b.x-Mm.a.x)*k,y=Mm.a.y+(Mm.b.y-Mm.a.y)*k;c.fillStyle='rgba(40,40,60,.28)';c.beginPath();c.ellipse(x,y,9,4,Math.atan2(Mm.b.y-Mm.a.y,Mm.b.x-Mm.a.x),0,7);c.fill()}
}
const naTunel=(M,x,y)=>{if(!M.tunel)return false;for(let d=M.tunel.d1;d<=M.tunel.d2;d+=10){const p=posAt(d);if(Math.hypot(p.x-x,p.y-y)<40)return true}return false};
/* as duas avenidas: num trecho reto e comprido, a avenida se abre em dois braços espelhados, um para cada lado,
   que voltam a se juntar mais adiante. Por serem espelhos, os dois têm exatamente o mesmo tamanho;
   no meio fica uma ilha onde dá para colocar personagem cobrindo os dois braços. */
function achaDesvio(M,livre,longe,r){
  const P=M.path,cands=[];let cum=0;
  /* cada braço se afasta 46 px: a ilha do meio fica com 92 px, o bastante para um personagem */
  const W2=46,RAMPA=50;
  for(let i=0;i<P.length-1;i++){
    const A=P[i],B=P[i+1],L=Math.hypot(B[0]-A[0],B[1]-A[1]),st=cum;cum+=L;
    if(L<320)continue;
    const ux=(B[0]-A[0])/L,uy=(B[1]-A[1])/L,nx=-uy,ny=ux;
    const comp=Math.min(L-150,340),ini=(L-comp)/2;
    const braco=s=>{const p=k=>[A[0]+ux*k,A[1]+uy*k],a=p(ini),b=p(ini+RAMPA),c=p(ini+comp-RAMPA),d=p(ini+comp);
      return[a,[b[0]+nx*W2*s,b[1]+ny*W2*s],[c[0]+nx*W2*s,c[1]+ny*W2*s],d]};
    /* os outros trechos da avenida (sem o que vai ser aberto) não podem ficar perto dos braços */
    const outros=SEG.filter((_,k)=>k!==i);
    let ok=true;
    for(const s of[-1,1]){const q=braco(s);
      for(let j=0;j<3&&ok;j++){const[p1,p2]=[q[j],q[j+1]],l=Math.hypot(p2[0]-p1[0],p2[1]-p1[1]);
        for(let k=0;k<=l&&ok;k+=10){const x=p1[0]+(p2[0]-p1[0])*k/l,y=p1[1]+(p2[1]-p1[1])*k/l;
          if(!livre(x,y)||!longe(x,y,30))ok=false;
          else if(distSeg(outros,x,y)<84)ok=false}}}
    if(!ok)continue;
    const p1=[...P.slice(0,i+1),...braco(-1),...P.slice(i+1)],p2=[...P.slice(0,i+1),...braco(1),...P.slice(i+1)];
    const extra=2*(Math.hypot(RAMPA,W2)-RAMPA);
    cands.push({path1:p1,path2:p2,d1:st+ini,d2:st+ini+comp+extra});
  }
  return cands.length?cands[Math.floor(r()*cands.length)]:null;
}
/* segunda entrada: uma reta que sai de um ponto da avenida (no começo dela) e vai até a borda da tela.
   Fora da tela, a reta continua o tanto que falta para o caminho todo ter o mesmo tamanho da avenida principal:
   assim e.d vale igual para as duas, e quem entra pelo lado chega ao encontro junto com quem veio pela frente. */
function achaEntrada(M,longe,r,dmMax){
  const P=M.path,seg=SEG,cands=[];
  /* se já há desvio, a entrada também precisa ficar longe do braço que se afasta (o resto da 2ª avenida é igual à principal) */
  const braco=SEG2&&M.desvio?SEG2.filter(sg=>sg.s>=M.desvio.d1-1&&sg.s<M.desvio.d2):null;
  for(let i=0;i<seg.length;i++){
    const sg=seg[i];if(sg.l<160)continue;
    for(let k=60;k<=sg.l-60;k+=20){
      const dm=sg.s+k;if(dm<240||dm>Math.min(780,dmMax||780))continue;
      const mx=sg.x+sg.dx*k,my=sg.y+sg.dy*k;
      for(const s of[-1,1]){
        const nx=-sg.dy*s,ny=sg.dx*s;
        let L=1e9;if(nx>.01)L=Math.min(L,(W-mx)/nx);if(nx<-.01)L=Math.min(L,-mx/nx);if(ny>.01)L=Math.min(L,(H-my)/ny);if(ny<-.01)L=Math.min(L,-my/ny);
        L+=30;
        const extra=dm-L;if(extra<20||extra>240)continue;
        let ok=true;
        for(let q=40;q<=L&&ok;q+=10){const x=mx+nx*q,y=my+ny*q;
          if(x<-5||x>W+5||y<-5||y>H+5)break;
          if(inStage(x,y)||inLake(x,y)||!longe(x,y,30)||distSeg(seg,x,y)<Math.min(q-5,84)||(braco&&distSeg(braco,x,y)<84))ok=false}
        if(!ok)continue;
        const borda=[mx+nx*L,my+ny*L],ini=[mx+nx*(L+extra),my+ny*(L+extra)];
        cands.push({path2:[ini,borda,[mx,my],...P.slice(i+1)],dm});
      }
    }
  }
  return cands.length?cands[Math.floor(r()*cands.length)]:null;
}
/* quem está no túnel não pode ser mirado nem atingido por ataques comuns */
const noTunel=e=>{const T=MAPAS[S.uf].tunel;return !!T&&e.d>T.d1&&e.d<T.d2};
/* o prédio tapa a visão: a linha do personagem até o alvo passa por dentro dele */
function predioTapa(x1,y1,x2,y2){
  const M=MAPAS[S.uf],dx=x2-x1,dy=y2-y1,L2=dx*dx+dy*dy||1;
  const tapa=(bx,by,r)=>{const k=clamp(((bx-x1)*dx+(by-y1)*dy)/L2,0,1);return Math.hypot(x1+dx*k-bx,y1+dy*k-by)<r};
  for(const b of M.predios||[])if(tapa(b.x,b.y,b.r))return true;
  /* dirigível e fumaça: tapam enquanto estão no meio do caminho */
  for(const m of M.moveis||[]){const p=posMovel(m);if(tapa(p.x,p.y,m.r))return true}
  return false;
}
/* o caminho v é um dos braços do desvio (e não a entrada lateral)? */
const ehBraco=(M,v)=>!!M.desvio&&v<=1;
/* avenidas extras (entradas por outras bordas) abrem aos poucos: até a rodada 10 só a principal, da 11 à 20 a principal e mais uma,
   e da 21 em diante todas. Com todas abertas desde o começo, os mapas curtos com 2 ou 3 entradas eram perdidos nas rodadas 10 a 14
   quase sempre no Difícil, mesmo pelo robô (2026-11-12). Os braços do desvio não contam: eles saem da mesma avenida. */
const ABRE_EXTRA=[10,20];
const viasExtras=M=>M.entradas&&M.entradas.length?M.entradas.map(x=>x.via).sort():M.entrada?[M.entrada.via]:[];
function extrasAbertas(r){return r<=ABRE_EXTRA[0]?0:r<=ABRE_EXTRA[1]?1:99}
/* entre as rodadas já vale o estado da próxima, para dar tempo de se preparar para a avenida que vai abrir */
function viaInativa(v){if(!S||S.livre)return false;const ex=viasExtras(MAPAS[S.uf]),i=ex.indexOf(v);return i>=0&&i>=extrasAbertas(S.inRound?S.round:S.round+1)}
const viasAtivas=()=>VIAS().filter(v=>!viaInativa(v));
/* começo dos mapas curtos: avenida curta dá pouco tempo para convencer, e nos mapas de 1.300 a 1.600 px a partida era perdida
   nas rodadas 8 a 10 (marcha comum e Isentões passando), mesmo com uma avenida só. Até a rodada 15 a marcha anda na proporção
   do tamanho da avenida (no mínimo VEL_CURTO_MIN da velocidade), e o efeito some aos poucos até a rodada 21 (2026-11-12).
   Com 72%, o robô passou de 76% para 81% de vitórias no Difícil (acima da meta de 70% a 75%) */
const LEN_REF=2300,VEL_CURTO_MIN=.8;
function velCurto(){const M=MAPAS[S.uf],fc=Math.max(VEL_CURTO_MIN,Math.min(1,(M.len||LEN)/LEN_REF)),r=S.round;return r<=15?fc:r>=21?1:fc+(1-fc)*(r-15)/6}
/* lago cheio da enchente: a mesma elipse, maior */
const naEnchente=(x,y)=>{const M=MAPAS[S.uf],L=M.lake;if(!S.enche||!L)return false;const k=M.enchK;return((x-L.x)/(L.rx*k))**2+((y-L.y)/(L.ry*k))**2<1};
/* o que acontece em cada rodada, pelo evento do estado; a sequência é fixa, então dá para se preparar */
function eventosDaRodada(){
  const M=MAPAS[S.uf],n=S.round+M.i;
  S.chuva=false;S.enche=false;S.apagaoT=0;S.apagaoEm=-1;S.tremCiclo=0;S.tremFechadoT=0;S.viaFechada=-1;
  /* de tempos em tempos um braço da avenida (ou uma das entradas) fica fechado e a marcha toda vai pelo outro */
  /* só fecha quando há pelo menos dois caminhos em uso (as avenidas extras que ainda não abriram não contam) */
  const ativas=viasAtivas(),fechaveis=(M.path3?[1,2]:[0,1]).filter(v=>ativas.includes(v)&&ativas.length>=2);
  if(M.path2&&S.round>=4&&(S.round+M.i)%5===0&&fechaveis.length){
    /* com 3 caminhos, fecha o 2º braço ou a entrada lateral (o braço principal recebe quem entra pelo lado) */
    S.viaFechada=fechaveis[(S.round>>1)%fechaveis.length];
    banner(ehBraco(M,S.viaFechada)?'Obra num braço da avenida: nesta rodada a marcha vai pelos outros caminhos.':'Uma entrada está fechada: nesta rodada a marcha vem pelos outros caminhos.');
    dica('via_fechada','Quando um braço da avenida ou uma entrada fecha, a marcha toda passa pelo outro lado. Confira onde estão os cones antes de começar.');
  }
  if(M.evento==='chuva'&&S.round>=2&&n%3===0){S.chuva=true;banner('Chuva! A marcha anda mais devagar e o fogo apaga rápido.');dica('ev_chuva',EVENTOS.chuva.desc)}
  else if(M.evento==='apagao'&&S.round>=3&&n%4===0)S.apagaoEm=8;
  else if(M.evento==='enchente'&&S.round>=3&&n%4===1){S.enche=true;banner('Enchente! Quem está dentro da água não ataca nesta rodada.');dica('ev_enchente',EVENTOS.enchente.desc);for(const t of S.towers)if(naEnchente(t.x,t.y))float(t.x,t.y-60,'Molhado!','#9fd6ee')}
  else if(M.evento==='trem'&&S.round>=2)S.tremCiclo=10;
}
function stepEventos(dt){
  /* morro: quem está no alto enxerga 15% mais longe e por cima dos prédios */
  for(const t of S.towers){t.alto=noMorro(t.x,t.y);if(t.alto)t.rangeMul*=1.15}
  if(!S.inRound)return;
  if(S.apagaoEm>0){S.apagaoEm-=dt;if(S.apagaoEm<=0){S.apagaoT=12;banner('Apagão! Por 12 s, todo mundo enxerga mais perto.');dica('ev_apagao',EVENTOS.apagao.desc);beep(140,.4,'sawtooth',.08)}}
  if(S.apagaoT>0){S.apagaoT-=dt;for(const t of S.towers)t.rangeMul*=.75}
  if(S.tremCiclo>0){S.tremCiclo-=dt;if(S.tremCiclo<=0){S.tremFechadoT=5;S.tremCiclo=24;dica('ev_trem',EVENTOS.trem.desc);desliza(330,262,.6,'square',.05)}}
  if(S.tremFechadoT>0)S.tremFechadoT-=dt;
  for(const t of S.towers)t.molhado=S.enche&&t.T.atk!=='plane'&&naEnchente(t.x,t.y);
  if(S.chuva)for(const f of S.fires)if(!f.lama&&!f.planta)f.life-=dt*2;
}
function fimEventos(){S.viaFechada=-1;S.chuva=false;S.enche=false;S.apagaoT=0;S.apagaoEm=-1;S.tremCiclo=0;S.tremFechadoT=0;for(const t of S.towers)t.molhado=false}
/* resumo do que o mapa tem, para o menu */
function resumoDinamico(uf){
  const M=MAPAS[uf],l=[];
  if(M.tema==='favela')l.push('favela');if(M.tema==='sertao')l.push('cidadezinha do sertão');if(M.tema==='paulista')l.push('Avenida Paulista');
  if(M.visual==='geada')l.push('geada');if(M.visual==='outono')l.push('outono');
  for(const t of M.trechos||[])l.push(TRECHOS[t.tipo].txt);
  if(NOMES_FORMA[M.forma])l.push(NOMES_FORMA[M.forma]);
  if(M.entradas&&M.entradas.length)l.push(M.entradas.length+1+' avenidas (chegam por bordas diferentes; as extras abrem na rodada 11'+(M.entradas.length>1?' e na 21':'')+')');
  else if(M.path3)l.push('3 caminhos (desvio e duas entradas; a 2ª entrada abre na rodada 11)');else{if(M.desvio)l.push('duas avenidas');if(M.entrada)l.push('duas entradas (a 2ª abre na rodada 11)')}
  if(M.lotado)l.push('mapa lotado');if(M.moveis&&M.moveis.length)l.push('coisas que passam e tapam a visão');
  if(M.tunel)l.push('túnel');
  if(M.metro)l.push('metrô (quem entra numa estação sai na outra, mais adiante; chefões não entram)');
  if(M.balaoVoo)l.push(TRANSPORTE[M.balaoVoo.tipo||'balao'].desc);
  {const nb=(M.bloq||[]).filter(z=>['cercado','feira','canteiro','somParado'].includes(z.tipo)).length;if(nb)l.push(nb+(nb>1?' áreas bloqueadas':' área bloqueada'))}
  if(M.morros&&M.morros.length)l.push(M.morros.length+(M.morros.length>1?' morros':' morro'));
  if(M.predios&&M.predios.length)l.push(M.predios.length+(M.predios.length>1?' prédios':' prédio'));
  if(M.obst&&M.obst.length)l.push(M.obst.length+' obstáculos');
  if(M.evento)l.push('evento: '+EVENTOS[M.evento].nome.toLowerCase());
  return l.join(' · ');
}
const obstAtivos=()=>{const M=MAPAS[S.uf];return(M.obst||[]).filter(o=>!(S.removidos||[]).includes(o.id))};
const obstEm=(x,y)=>obstAtivos().find(o=>Math.hypot(o.x-x,o.y-y)<o.r+10);
const predioEm=(x,y)=>(MAPAS[S.uf].predios||[]).some(b=>Math.hypot(b.x-x,b.y-y)<b.r+14);
const obraEm=(x,y)=>{const M=MAPAS[S&&S.uf];return !!(M&&M.bloq&&M.bloq.some(z=>Math.hypot(z.x-x,z.y-y)<z.r+8))};
/* prédio visto de cima e de frente: base, paredes, janelas e caixa d'água */
function desenhaPredio(c,b){
  c.save();c.translate(b.x,b.y);
  c.fillStyle='#0003';c.beginPath();c.ellipse(4,8,b.r+6,10,0,0,7);c.fill();
  const w=b.r*2,h=b.h;
  c.fillStyle='#1d1a16';c.fillRect(-w/2-2,-h-2,w+4,h+12);
  c.fillStyle=b.cor;c.fillRect(-w/2,-h,w,h+8);
  c.fillStyle='#0002';c.fillRect(w/2-8,-h,8,h+8);
  c.fillStyle='#cfe6ff';for(let y=-h+6;y<0;y+=11)for(let x=-w/2+5;x<w/2-9;x+=10)c.fillRect(x,y,6,7);
  c.fillStyle='#5a5f68';c.fillRect(-4,-4,8,12);
  c.fillStyle='#e8e2d2';c.fillRect(-w/2-3,-h-5,w+6,5);
  c.fillStyle='#9aa6b2';rr(c,-w/4-5,-h-15,10,10,2);
  c.restore();
}
/* obstáculos que dá para tirar pagando */
function desenhaObst(c,o){
  c.save();c.translate(o.x,o.y);c.rotate(o.rot||0);
  c.fillStyle='#0003';c.beginPath();c.ellipse(0,6,o.r,7,0,0,7);c.fill();
  const k=o.tipo;
  if(k==='carro'){c.fillStyle='#1d1a16';rr(c,-21,-10,42,18,5);c.fillStyle='#8a4a3a';rr(c,-19,-8,38,14,4);c.fillStyle='#bfd8e8';rr(c,-9,-6,15,10,2);c.fillStyle='#22242a';disc(c,-12,8,4.5);disc(c,12,8,4.5);c.fillStyle='#c8102e88';c.fillRect(-19,-2,5,3)}
  else if(k==='banca'){c.fillStyle='#1d1a16';c.fillRect(-17,-22,34,30);c.fillStyle='#2f7a3e';c.fillRect(-15,-20,30,26);c.fillStyle='#f4ead5';for(let i=0;i<4;i++)c.fillRect(-13+i*7,-14,5,7);c.fillStyle='#f2b705';c.fillRect(-17,-26,34,6)}
  else if(k==='cacamba'){c.fillStyle='#1d1a16';c.beginPath();c.moveTo(-22,-12);c.lineTo(22,-12);c.lineTo(17,8);c.lineTo(-17,8);c.closePath();c.fill();c.fillStyle='#f28a1e';c.beginPath();c.moveTo(-20,-10);c.lineTo(20,-10);c.lineTo(15,6);c.lineTo(-15,6);c.closePath();c.fill();c.fillStyle='#8a7a62';disc(c,-8,-12,6);disc(c,4,-14,7);c.fillStyle='#b5895a';disc(c,12,-12,5)}
  else if(k==='arvore'){c.fillStyle='#5a3d27';c.fillRect(-4,-8,8,16);c.fillStyle='#2f6b2c';disc(c,0,-20,17);disc(c,-12,-12,11);disc(c,12,-12,11);c.fillStyle='#3f8a3e';disc(c,-4,-24,9)}
  else if(k==='barraco'){
    /* barraco vazio visto de cima: telhado de fibrocimento quebrado, com tábuas atravessadas */
    c.fillStyle='#1d1a16';c.fillRect(-19,-17,38,30);c.fillStyle='#9aa3a8';c.fillRect(-17,-15,34,26);
    c.strokeStyle='#7e878d';c.lineWidth=1;for(let xx=-15;xx<17;xx+=3){c.beginPath();c.moveTo(xx,-15);c.lineTo(xx,11);c.stroke()}
    c.fillStyle='#2b2f3a';c.beginPath();c.moveTo(-4,-15);c.lineTo(8,-15);c.lineTo(2,-4);c.closePath();c.fill();
    c.fillStyle='#8a5a30';c.save();c.rotate(.5);c.fillRect(-20,-2,40,4);c.rotate(-1);c.fillRect(-20,-2,40,4);c.restore();
  }
  else if(k==='caixadagua'){c.fillStyle='#1d1a16';rr(c,-13,-20,26,24,3);c.fillStyle='#2f6fd0';rr(c,-11,-18,22,20,2);c.fillStyle='#5a8fe0';c.fillRect(-11,-18,22,4);c.fillStyle='#1d4f9a';c.fillRect(-11,-6,22,2)}
  else if(k==='pedra'){c.fillStyle='#1d1a16';c.beginPath();c.ellipse(0,-4,21,15,0,0,7);c.fill();c.fillStyle='#8a8f98';c.beginPath();c.ellipse(0,-5,19,13,0,0,7);c.fill();c.fillStyle='#b8bec8';c.beginPath();c.ellipse(-6,-10,8,5,-.4,0,7);c.fill()}
  else{c.fillStyle='#1d1a16';rr(c,-22,-8,44,14,6);c.fillStyle='#7a5434';rr(c,-20,-6,40,10,5);c.fillStyle='#b88a5a';c.beginPath();c.ellipse(-19,-1,4,5,0,0,7);c.fill();c.strokeStyle='#5a3d27';c.lineWidth=1;c.beginPath();c.moveTo(-10,-3);c.lineTo(14,-3);c.stroke()}
  c.restore();
}
/* coisas do mapa que mudam durante a partida: água da enchente embaixo; túnel, trem, chuva e apagão por cima */
function desenhaChaoDinamico(c){
  const M=MAPAS[S.uf];
  if(S.enche&&M.lake){const L=M.lake,k=M.enchK;c.fillStyle='rgba(63,143,181,.55)';c.beginPath();c.ellipse(L.x,L.y+2,L.rx*k,L.ry*k,0,0,7);c.fill()}
}
function desenhaTopoDinamico(c){
  const M=MAPAS[S.uf];
  desenhaMato(c,M);
  desenhaLinhaMetro(c,M);
  desenhaBalaoVoo(c,M);
  /* braço ou entrada fechada (evento da rodada) e avenidas extras que ainda não abriram: barreira listrada e cones */
  if(M.path2)for(const v of VIAS())if(v===S.viaFechada||viaInativa(v)){
    /* onde pôr a barreira: no começo do braço do desvio, perto da borda da entrada lateral, ou no começo da avenida principal */
    const ent=(M.entradas||[]).find(x=>x.via===v)||M.entrada||{via:-1,dm:290};
    let d=ehBraco(M,v)?M.desvio.d1+70:v===ent.via?0:Math.min(ent.dm-150,140);
    if(!ehBraco(M,v)&&v===ent.via){for(;d<LEN;d+=6){const p=posAt(d,v);if(p.x>=20&&p.x<=W-20&&p.y>=20&&p.y<=H-20)break}d+=60}
    const p=posAt(d,v),nx=-p.dy,ny=p.dx;
    c.save();c.translate(p.x,p.y);c.rotate(Math.atan2(ny,nx));
    c.fillStyle='#1d1a16';c.fillRect(-27,-5,54,10);for(let i=0;i<6;i++){c.fillStyle=i%2?'#fff':'#ff7a1c';c.fillRect(-26+i*9,-4,9,8)}
    for(const x of[-20,0,20]){c.fillStyle='#f28a1e';c.beginPath();c.moveTo(x-5,16);c.lineTo(x,2);c.lineTo(x+5,16);c.closePath();c.fill();c.fillStyle='#fff';c.fillRect(x-3,9,6,2)}
    c.restore();
  }
  /* túnel: cobertura de concreto sobre o trecho, com as bocas escuras */
  if(M.tunel){const a=posAt(M.tunel.d1),b=posAt(M.tunel.d2),an=Math.atan2(b.y-a.y,b.x-a.x),L=Math.hypot(b.x-a.x,b.y-a.y);
    c.save();c.translate(a.x,a.y);c.rotate(an);
    c.fillStyle='#1d1a16';c.fillRect(-2,-34,L+4,68);c.fillStyle='#7d7a72';c.fillRect(0,-32,L,64);
    c.fillStyle='#6b6862';for(let x=14;x<L;x+=26)c.fillRect(x,-32,3,64);
    c.fillStyle='#2a2826';c.fillRect(-4,-24,8,48);c.fillRect(L-4,-24,8,48);
    c.fillStyle='#4c7a3a';for(let x=8;x<L-6;x+=18){disc(c,x,-30,5);disc(c,x+9,30,5)}
    c.restore()}
  /* cancela e trem */
  if(M.trem){const p=posAt(M.trem.d),nx=-p.dy,ny=p.dx,fech=S.tremFechadoT>0;
    for(const s of[-1,1]){const bx=p.x+nx*s*34-p.dx*30,by=p.y+ny*s*34-p.dy*30;c.fillStyle='#1d1a16';disc(c,bx,by,4);
      c.strokeStyle='#c8102e';c.lineWidth=4;c.setLineDash([6,6]);c.beginPath();c.moveTo(bx,by);
      if(fech)c.lineTo(bx-nx*s*30,by-ny*s*30);else c.lineTo(bx-p.dx*4,by-p.dy*4-26);c.stroke();c.setLineDash([])}
    if(fech){const k=1-S.tremFechadoT/5,ang=Math.atan2(ny,nx),off=(k-.5)*700;
      c.save();c.translate(p.x+nx*off,p.y+ny*off);c.rotate(ang);
      for(let i=0;i<3;i++){const x=-i*58;c.fillStyle='#1d1a16';rr(c,x-27,-14,54,28,4);c.fillStyle=i?'#2f6fd0':'#f2b705';rr(c,x-25,-12,50,24,3);c.fillStyle='#cfe6ff';for(const wx of[-15,-3,9])c.fillRect(x+wx,-8,8,7)}
      c.restore();
      if(Math.floor(S.time*4)%2){c.fillStyle='#ff3b3b';disc(c,p.x+nx*44-p.dx*30,p.y+ny*44-p.dy*30-10,4)}}
  }
}
/* mapa de posicionamento: enquanto o jogador escolhe onde colocar (ou para onde andar na Passeata),
   o que não dá fica listrado de vermelho e o que dá ganha um leve tom verde. É calculado em quadradinhos de 8 px
   e só é refeito quando algo muda (personagem novo, obstáculo tirado, enchente...) */
let MASC=null,MASCK='';
function mascaraPosicao(ign){
  const k=S.uf+'|'+S.towers.map(t=>Math.round(t.x)+','+Math.round(t.y)).join(';')+'|'+(S.enche?1:0)+'|'+(S.removidos||[]).length+'|'+(ign?ign.id:'')+'|'+(OPC.daltonico?1:0);
  if(k===MASCK&&MASC)return MASC;
  MASCK=k;
  const m=document.createElement('canvas');m.width=W;m.height=H;const c=m.getContext('2d'),P=8;
  c.fillStyle='#000';
  for(let y=0;y<H;y+=P)for(let x=0;x<W;x+=P)if(!validSpot(x+P/2,y+P/2,ign))c.fillRect(x,y,P,P);
  /* listras só onde não dá */
  const pt=document.createElement('canvas');pt.width=12;pt.height=12;const q=pt.getContext('2d');
  q.fillStyle=OPC.daltonico?'rgba(0,0,0,.38)':'rgba(200,16,46,.30)';q.fillRect(0,0,12,12);
  q.strokeStyle=OPC.daltonico?'rgba(255,255,255,.6)':'rgba(110,0,18,.55)';q.lineWidth=2.4;
  q.beginPath();q.moveTo(-3,3);q.lineTo(3,-3);q.moveTo(0,12);q.lineTo(12,0);q.moveTo(9,15);q.lineTo(15,9);q.stroke();
  c.globalCompositeOperation='source-in';c.fillStyle=c.createPattern(pt,'repeat');c.fillRect(0,0,W,H);
  /* tom verde por baixo, só onde ficou vazio (onde dá para colocar) */
  c.globalCompositeOperation='destination-over';c.fillStyle=OPC.daltonico?'rgba(255,255,255,.14)':'rgba(53,196,107,.16)';c.fillRect(0,0,W,H);
  MASC=m;return m;
}
function desenhaMascara(c){
  const anda=S.sel&&S.sel.marchaT>0?S.sel:null;
  if(!S.placing&&!anda)return;
  c.drawImage(mascaraPosicao(anda),0,0,W,H);
}
/* setas do caminho: brancas onde a marcha entra na tela (uma por entrada) e cinza-escuras chegando ao destino, com a
   marca quadriculada no fim. Cores neutras, sem o verde ou o vermelho de nenhum lado (2026-11-17).
   Entre as rodadas pulsam para chamar atenção; durante a rodada ficam discretas */
/* símbolo do destino (fim da avenida): disco quadriculado de chegada, em preto e branco com aro cinza, sem cor de lado
   nenhum (2026-11-17; antes era uma estrela vermelha no mapa e um alvo vermelho na partida) */
function marcaDestino(c,x,y,r){
  c.save();c.fillStyle='#1d1a16';disc(c,x,y,r+2.5);c.fillStyle='#d8dbe0';disc(c,x,y,r+1);
  c.beginPath();c.arc(x,y,r-1.5,0,7);c.clip();c.fillStyle='#fff';c.fillRect(x-r,y-r,2*r,2*r);
  const q=(2*r)/6;c.fillStyle='#1d1a16';for(let i=0;i<6;i++)for(let j=0;j<6;j++)if((i+j)%2)c.fillRect(x-r+i*q,y-r+j*q,q+.4,q+.4);
  c.restore();
}
function seta(c,x,y,ang,cor,s){
  c.save();c.translate(x,y);c.rotate(ang);c.scale(s,s);
  c.fillStyle='#1d1a16';c.beginPath();c.moveTo(-9,-11);c.lineTo(4,0);c.lineTo(-9,11);c.lineTo(-3,0);c.closePath();c.fill();
  c.fillStyle=cor;c.beginPath();c.moveTo(-7,-8);c.lineTo(2,0);c.lineTo(-7,8);c.lineTo(-3,0);c.closePath();c.fill();
  c.restore();
}
function desenhaSetasCaminho(c){
  const pulso=S.inRound?.45:.65+.35*Math.sin(S.time*4+performance.now()/250);
  c.save();c.globalAlpha=pulso;
  /* entrada de cada caminho: o primeiro ponto dele que aparece na tela (duas entradas no mesmo lugar contam uma vez) */
  const vistos=[];
  for(const v of VIAS()){
    if(viaInativa(v))continue;
    let d=0;for(;d<LEN;d+=6){const p=posAt(d,v);if(p.x>=12&&p.x<=W-12&&p.y>=12&&p.y<=H-12)break}
    const p0=posAt(d+14,v);if(vistos.some(q=>Math.hypot(q.x-p0.x,q.y-p0.y)<40))continue;vistos.push(p0);
    const anda=(S.time*1.2+performance.now()/900)%1;
    for(let i=0;i<3;i++){const p=posAt(d+16+i*30+anda*30,v),q=posAt(d+22+i*30+anda*30,v);seta(c,p.x,p.y,Math.atan2(q.y-p.y,q.x-p.x),'#ffffff',1.6)}
  }
  /* destino: setas cinza chegando e a marca de chegada no fim da avenida */
  const fim=posAt(LEN),ant=posAt(LEN-12);
  for(let i=0;i<3;i++){const p=posAt(LEN-110+i*30),q=posAt(LEN-104+i*30);seta(c,p.x,p.y,Math.atan2(q.y-p.y,q.x-p.x),'#8d939c',1.6)}
  c.globalAlpha=Math.min(1,pulso+.2);
  marcaDestino(c,fim.x-(fim.x-ant.x)*.2,fim.y-(fim.y-ant.y)*.2,20);
  c.restore();
}
/* dirigível e fumaça: desenhados por cima de tudo, porque passam pelo alto */
function desenhaMoveis(c){
  for(const m of MAPAS[S.uf].moveis||[]){
    const p=posMovel(m);
    if(m.tipo==='balao'){
      c.fillStyle='rgba(0,0,0,.16)';c.beginPath();c.ellipse(p.x+16,p.y+34,m.r+6,m.r*.35,0,0,7);c.fill();
      c.save();c.translate(p.x,p.y-8);c.scale(p.dir,1);
      /* faixa de propaganda do outro lado, sem escrita: só as cores */
      const cores=S.side==='pt'?['#1f7a4d','#f2b705']:['#c8102e','#ffffff'];
      c.fillStyle='#1d1a16';c.fillRect(-m.r-58,-9,50,18);for(let i=0;i<5;i++){c.fillStyle=cores[i%2];c.fillRect(-m.r-57+i*10,-8+Math.sin(S.time*5+i)*1.5,10,16)}
      c.strokeStyle='#1d1a16';c.lineWidth=1.2;c.beginPath();c.moveTo(-m.r-8,0);c.lineTo(-m.r+4,0);c.stroke();
      c.fillStyle='#1d1a16';c.beginPath();c.moveTo(-m.r+6,0);c.lineTo(-m.r-6,-15);c.lineTo(-m.r-6,15);c.closePath();c.fill();
      c.fillStyle='#9aa6b2';c.beginPath();c.moveTo(-m.r+6,0);c.lineTo(-m.r-3,-12);c.lineTo(-m.r-3,12);c.closePath();c.fill();
      c.fillStyle='#1d1a16';c.beginPath();c.ellipse(0,0,m.r+3,m.r*.48+3,0,0,7);c.fill();
      c.fillStyle='#e8e2d2';c.beginPath();c.ellipse(0,0,m.r,m.r*.48,0,0,7);c.fill();
      c.fillStyle=cores[0];c.fillRect(-m.r*.75,-4,m.r*1.5,8);
      c.fillStyle='#ffffff88';c.beginPath();c.ellipse(m.r*.2,-m.r*.22,m.r*.45,m.r*.12,0,0,7);c.fill();
      c.fillStyle='#5a5f68';rr(c,-11,m.r*.48-1,22,9,3);c.fillStyle='#cfe6ff';c.fillRect(-7,m.r*.48+1,5,4);c.fillRect(2,m.r*.48+1,5,4);
      c.restore();
    }else{
      c.save();
      for(let i=0;i<8;i++){const a=i*.8+S.time*.35,raio=m.r*(.42+.12*Math.sin(S.time+i));
        c.globalAlpha=.5;c.fillStyle=i%2?'#aeb3bb':'#d6d9de';disc(c,p.x+Math.cos(a)*m.r*.45,p.y+Math.sin(a)*m.r*.3-8,raio)}
      c.restore();
    }
  }
}
function desenhaClima(c){
  desenhaMoveis(c);
  if(S.chuva){c.fillStyle='rgba(40,60,90,.16)';c.fillRect(0,0,W,H);c.strokeStyle='rgba(200,225,255,.55)';c.lineWidth=1.4;c.beginPath();
    for(let i=0;i<110;i++){const x=(i*97+S.time*260)%(W+60)-30,y=(i*61+S.time*620)%(H+40)-20;c.moveTo(x,y);c.lineTo(x-5,y+14)}c.stroke()}
  if(S.apagaoT>0){c.fillStyle='rgba(10,12,30,.5)';c.fillRect(0,0,W,H);
    for(const t of S.towers){const gr=c.createRadialGradient(t.x,t.y-14,4,t.x,t.y-14,46);gr.addColorStop(0,'rgba(255,230,150,.35)');gr.addColorStop(1,'rgba(255,230,150,0)');c.fillStyle=gr;disc(c,t.x,t.y-14,46)}}
}
/* obra: tapume listrado em volta, cones e um monte de terra */
function desenhaObra(c,z){
  if(z.tipo&&z.tipo!=='obra'){desenhaBloqueio(c,z);return}
  c.save();c.translate(z.x,z.y);
  c.fillStyle='#b5895a';c.beginPath();c.ellipse(0,4,z.r,z.r*.62,0,0,7);c.fill();
  c.fillStyle='#8a6440';c.beginPath();c.moveTo(-14,8);c.quadraticCurveTo(0,-14,16,8);c.fill();
  c.lineWidth=5;for(let i=0;i<16;i++){c.strokeStyle=i%2?'#fff':'#ff7a1c';c.beginPath();c.ellipse(0,4,z.r,z.r*.62,0,i*Math.PI/8,(i+1)*Math.PI/8);c.stroke()}
  for(const[x,y]of[[-z.r+6,-4],[z.r-6,-4]]){c.fillStyle='#ff7a1c';c.beginPath();c.moveTo(x-5,y+10);c.lineTo(x,y-6);c.lineTo(x+5,y+10);c.fill();c.fillStyle='#fff';c.fillRect(x-3,y+2,6,2)}
  c.restore();
}
/* bloqueios novos (2026-11-12): lugares perto da avenida onde não dá para colocar personagem.
   Cercado da polícia, feira de camelôs, canteiro protegido e caminhão de som estacionado; e as estações do metrô e os pontos do balão */
function desenhaBloqueio(c,z){
  c.save();c.translate(z.x,z.y);const R=z.r;
  if(z.tipo==='cercado'){c.fillStyle='rgba(60,60,70,.25)';c.beginPath();c.ellipse(0,4,R,R*.62,0,0,7);c.fill();
    c.strokeStyle='#c9ced6';c.lineWidth=2;for(let a=0;a<6.28;a+=.32){const x=Math.cos(a)*R,y=4+Math.sin(a)*R*.62;c.beginPath();c.moveTo(x,y);c.lineTo(x,y-9);c.stroke()}
    c.beginPath();c.ellipse(0,-1,R,R*.62,0,0,7);c.stroke();c.beginPath();c.ellipse(0,-5,R,R*.62,0,0,7);c.stroke();
    c.fillStyle='#1d1a16';rr(c,-13,-7,26,13,3);c.fillStyle='#f4f1e8';rr(c,-12,-6,24,11,2.5);c.fillStyle='#2456a6';c.fillRect(-12,-2,24,3);c.fillStyle=Math.floor(S?S.time*3:0)%2?'#ff3b3b':'#3b6bff';c.fillRect(-4,-9,8,3)}
  else if(z.tipo==='feira'){for(let i=0;i<5;i++){const a=i*1.26,x=Math.cos(a)*R*.55,y=Math.sin(a)*R*.38,cor=['#c8102e','#2456a6','#f2b705','#35a35f','#ff7a1c'][i];
      c.fillStyle='#0003';c.fillRect(x-11,y+1,24,6);c.fillStyle=cor;c.fillRect(x-11,y-10,22,12);c.fillStyle='rgba(255,255,255,.35)';for(let k=0;k<3;k++)c.fillRect(x-11+k*8,y-10,4,12);c.strokeStyle='#1d1a16';c.lineWidth=1;c.strokeRect(x-11,y-10,22,12)}
    c.fillStyle='#e8a51c';disc(c,0,0,3);c.fillStyle='#4a1a4a';disc(c,5,2,2.4)}
  else if(z.tipo==='canteiro'){c.fillStyle='#6a4a30';c.beginPath();c.ellipse(0,4,R,R*.62,0,0,7);c.fill();c.fillStyle='#4c8a3a';c.beginPath();c.ellipse(0,2,R-4,R*.62-4,0,0,7);c.fill();
    for(let i=0;i<14;i++){const a=i*.9,k=.25+(i%3)*.22;c.fillStyle=['#e2679b','#f3c11f','#fff','#9b7fd0'][i%4];disc(c,Math.cos(a)*R*k*1.4,2+Math.sin(a)*R*k*.8,2.4)}
    c.strokeStyle='#d8d2c4';c.lineWidth=2;c.setLineDash([3,3]);c.beginPath();c.ellipse(0,4,R+2,R*.62+2,0,0,7);c.stroke();c.setLineDash([])}
  else if(z.tipo==='somParado'){c.fillStyle='#0003';c.fillRect(-26,6,56,7);c.fillStyle='#1d1a16';rr(c,-27,-14,54,22,4);c.fillStyle='#f2b705';rr(c,-25,-12,34,18,3);c.fillStyle='#c8102e';rr(c,10,-12,14,18,3);
    c.fillStyle='#1d1a16';for(const x of[-18,-8,2]){disc(c,x,-3,4.4)}c.fillStyle='#9aa0a8';for(const x of[-18,-8,2])disc(c,x,-3,1.6);c.fillStyle='#22242a';disc(c,-16,9,4);disc(c,16,9,4)}
  else if(z.tipo==='metro'){c.fillStyle='#0003';c.fillRect(-15,4,32,6);c.fillStyle='#4a4f58';c.fillRect(-15,-12,30,18);c.fillStyle='#2a2d33';for(let i=0;i<4;i++)c.fillRect(-12+i*1.5,-9+i*4,24-i*3,2.4);
    c.fillStyle='#d8d2c4';c.fillRect(-17,-14,2,22);c.fillRect(15,-14,2,22);c.fillStyle='#4a4f58';c.fillRect(19,-30,2,30);c.fillStyle='#1d1a16';disc(c,20,-32,7.5);c.fillStyle=z.cor||'#c8102e';disc(c,20,-32,6);c.fillStyle='#fff';c.fillRect(17,-33,6,2)}
  else if(z.tipo==='cais'){c.fillStyle='#0003';c.fillRect(-20,2,42,8);c.fillStyle='#6a4326';c.fillRect(-20,-10,40,16);c.strokeStyle='#4a2f1e';c.lineWidth=1;for(let x=-16;x<20;x+=6){c.beginPath();c.moveTo(x,-10);c.lineTo(x,6);c.stroke()}
    c.fillStyle='#3a2a1e';for(const x of[-18,18])c.fillRect(x-2,-14,4,22);c.fillStyle='#f2b705';c.beginPath();c.arc(14,-16,5,0,7);c.fill();c.strokeStyle='#c8102e';c.lineWidth=2;c.beginPath();c.arc(14,-16,5,0,7);c.stroke()}
  else if(z.tipo==='torreCabo'){c.fillStyle='#0003';c.beginPath();c.ellipse(2,4,18,6,0,0,7);c.fill();c.fillStyle='#d8d2c4';rr(c,-14,-8,28,14,3);c.fillStyle='#8a8f98';c.fillRect(-14,-10,28,3);
    c.strokeStyle='#4a4f58';c.lineWidth=2.4;c.beginPath();c.moveTo(-8,-8);c.lineTo(0,-34);c.lineTo(8,-8);c.moveTo(-5,-18);c.lineTo(5,-18);c.moveTo(-3,-26);c.lineTo(3,-26);c.stroke();c.fillStyle='#4a4f58';c.fillRect(-9,-36,18,3);c.fillStyle='#c8102e';disc(c,0,-38,2)}
  else if(z.tipo==='pouso'){c.fillStyle='rgba(255,255,255,.25)';c.beginPath();c.ellipse(0,2,R,R*.62,0,0,7);c.fill();c.strokeStyle='#f2b705';c.lineWidth=2.4;c.setLineDash([5,4]);c.beginPath();c.ellipse(0,2,R-2,R*.62-2,0,0,7);c.stroke();c.setLineDash([]);
    c.strokeStyle='#fff';c.lineWidth=3;c.beginPath();c.moveTo(-8,-3);c.lineTo(8,7);c.moveTo(8,-3);c.lineTo(-8,7);c.stroke();
    c.fillStyle='#8a8f98';c.fillRect(R-6,-24,2,26);c.fillStyle='#ff7a1c';c.beginPath();c.moveTo(R-4,-24);c.lineTo(R+10,-21);c.lineTo(R-4,-17);c.closePath();c.fill()}
  c.restore();
}

/* ---------- visuais ---------- */
const SK=['#e3b085','#c98e62','#8d5a3b','#f0c8a0'];
const BR={shirt:'#f6cf1d',collar:'#1f7a4d',pants:'#2456a6'};
const LOOKS={
  militante:{skin:SK[1],shirt:'#c8102e',pants:'#3a3a44',star:1,cap:'#c8102e',hair:'#2b211a',hold:'panfleto'},
  janones:{skin:SK[0],shirt:'#20242c',pants:'#20242c',hair:'#1c1712',style:'short',stubble:1,hold:'phone'},
  marx:{skin:SK[3],shirt:'#26242a',pants:'#26242a',hair:'#d9d6cf',style:'wild',beard:'huge',beardC:'#e6e3dc',suit:1,tie:'#26242a',hold:'book'},
  lula:{skin:SK[0],shirt:'#c8102e',pants:'#26283a',hair:'#bcbcbc',style:'short',beard:'full',beardC:'#c8c8c8',star:1,hold:'espeto'},
  dilma:{skin:SK[3],shirt:'#a3122a',pants:'#26283a',hair:'#6a3f22',style:'bob',neck:1,hold:'vento'},
  haddad:{skin:SK[0],shirt:'#2b3550',pants:'#2b3550',hair:'#7d7a74',style:'short',glasses:1,suit:1,tie:'#c8102e',hold:'imposto'},
  churras:{skin:SK[2],shirt:'#b4372f',pants:'#3a3a44',hair:'#1c1712',apron:1,chef:1,hold:'espeto'},
  sindicato:{skin:SK[1],shirt:'#c8102e',pants:'#34425f',hair:'#2b211a',hard:1,star:1,beard:'stache',beardC:'#2b211a',hold:'flier'},
  camisa:{...BR,hair:'#2b211a',style:'short',hold:'bandeirinha'},
  bandeira:{...BR,hair:'#5a3a20',style:'short',flag:1},
  tio:{...BR,hair:'#a8a8a8',style:'short',beard:'stache',beardC:'#8f8f8f',hold:'phone',big:1},
  fone:{shirt:'#2456a6',collar:'#f6cf1d',pants:'#f6f0e0',hair:'#1c1712',style:'short',phones:1},
  isentao:{shirt:'#f4f4f0',pants:'#a9a59a',hair:'#6a5a44',style:'short',shades:1},
  motoca:{...BR,helmet:'#1f7a4d'},
  capacete:{...BR,skin:SK[1],helmet:'#3a3f48',hold:'bandeirinha',big:1},
  teimoso:{...BR,hair:'#5a4a3a',style:'short',beard:'stache',beardC:'#4a3a2a',pose:'crossed',big:1},
  pcapacete:{shirt:'#c8102e',pants:'#2b2f3a',star:1,helmet:'#2a2a2e',hold:'bandeirinhaR',big:1},
  pteimoso:{shirt:'#c8102e',pants:'#3a3a44',hair:'#3a2a1a',style:'short',beard:'short',beardC:'#3a2a1a',star:1,pose:'crossed',big:1},
  pavanato:{skin:SK[3],shirt:'#1d2a4d',pants:'#1d2a4d',hair:'#241a12',style:'slick',suit:1,tie:'#f6cf1d',hold:'phone'},
  nikolas:{skin:SK[3],shirt:'#17171c',pants:'#17171c',hair:'#8b6a42',style:'swoop',suit:1,tie:'#17171c',hold:'phone'},
  flavio:{skin:SK[0],shirt:'#4b515c',pants:'#4b515c',hair:'#1f1a15',style:'side',suit:1,tie:'#2456a6',hold:'mic'},
  bolsonaro:{...BR,skin:SK[0],hair:'#9d9d9d',style:'side',sash:1,hold:'leite',big:1},
  patriota:{...BR,skin:SK[1],hair:'#2b211a',cap:'#1f7a4d',capPlain:1,hold:'santinho'},
  agro:{...BR,skin:SK[2],hair:'#1c1712',cowboy:1,hold:'berrante'},
  caminhoneiro:{skin:SK[1],shirt:'#2456a6',pants:'#3a3a44',hair:'#2b211a',cap:'#f6cf1d',capPlain:1,beard:'stache',beardC:'#2b211a'},
  empresario:{skin:SK[3],shirt:'#efe6d0',pants:'#5a4630',hair:'#6a5a44',cowboy:1,beard:'stache',beardC:'#6a5a44',hold:'flier'},
  pcamisa:{shirt:'#c8102e',pants:'#34425f',hair:'#2b211a',style:'short',star:1,hold:'bandeirinhaR'},
  pbandeira:{shirt:'#c8102e',pants:'#3a3a44',hair:'#5a3a20',style:'short',star:1,flagR:1},
  ptio:{shirt:'#c8102e',pants:'#34425f',hair:'#a8a8a8',style:'short',beard:'stache',beardC:'#8f8f8f',star:1,hold:'phone',big:1},
  pfone:{shirt:'#7a1a2e',pants:'#2b3a67',hair:'#1c1712',style:'short',phones:1},
  pmoto:{shirt:'#c8102e',pants:'#3a3a44',star:1,helmet:'#f4f0e6'},
  janja:{skin:SK[3],shirt:'#c8102e',pants:'#26283a',hair:'#b98a52',style:'long',neck:1,hold:'mala'},
  xandao:{skin:SK[3],shirt:'#121216',pants:'#121216',style:'bald',toga:1,hold:'martelo'},
  veio:{skin:SK[0],shirt:'#1f7a4d',pants:'#1f7a4d',suit:1,tie:'#f6cf1d',pin:'#f6cf1d',hold:'sacola'},
  che:{skin:'#d9ab88',shirt:'#5f6b3f',pants:'#4a5232',style:'che',hold:'camiseta'},
  mussolini:{skin:'#d8a47e',shirt:'#6a7560',pants:'#4f5a47',sleeve:'#7a8570',style:'mus',uniform:1,pose:'hips'},
  putin:{skin:'#e7bd9d',shirt:'#181a22',pants:'#181a22',sleeve:'#252831',style:'put',suit:1,tie:'#1c2a4a',tieDots:1,pose:'pockets'},
  xi:{skin:'#e3b896',shirt:'#1f3264',pants:'#1f3264',style:'xi',suit:1,tie:'#7a1f3d',hold:'caixa'},
  artista:{skin:'#6e4a34',shirt:'#22222e',pants:'#22222e',sleeve:'#2c2c3a',style:'art',scarf:'#6a3aa8',pose:'crossed'},
  marcal:{skin:'#dcae90',shirt:'#1f4d8a',pants:'#1f4d8a',sleeve:'#285a9c',style:'pab',suit:1,tie:'#eeeeff',pose:'clasped',watch:'#d9a400'},
  vampirao:{skin:'#ecd2bc',shirt:'#15171e',pants:'#15171e',style:'vam',suit:1,tie:'#1f3264',tieStripe:1,capeV:1},
  kelmon:{skin:'#d9a988',shirt:'#17171c',pants:'#17171c',style:'kel',chainS:1,hold:'cruz'},
  milei:{skin:'#e8c0a0',shirt:'#2b2a2c',pants:'#2b2a2c',style:'mil',suit:1,tie:'#5a4632',shirtIn:'#bcd3e8',sashTri:['#75aadb','#f4f1e8','#75aadb'],sashMark:'#f2b705',hold:'motosserra'},
  bukele:{skin:'#d9a67e',shirt:'#141b2e',pants:'#141b2e',style:'buk',suit:1,shirtIn:'#f7f5ee',sashTri:['#1f4fc0','#f4f1e8','#1f4fc0'],sashMark:'#3f9e5c',hold:'algema'},
  lenin:{skin:'#e6bd9c',shirt:'#1c1c22',pants:'#1c1c22',hair:'#8a5a38',style:'len',suit:1,tie:'#1a2238',tieDots:1,hold:'pravda'},
  ana:{skin:'#d9a47e',shirt:'#b5713f',pants:'#3a5a8a',sleeve:'#d9a47e',style:'ana',choker:'#6a4326',hold:'chapeuM'},
  pabllo:{skin:'#c99a78',shirt:'#f0ece4',pants:'#7fa6c9',style:'vit',vaca:1,hold:'mic'},
  churchill:{skin:'#efc6a6',shirt:'#20222c',pants:'#20222c',style:'len',suit:1,tie:'#7d1f2e',tieDots:1,hold:'charuto'},
  thatcher:{skin:'#f0c8a8',shirt:'#2456a6',pants:'#2456a6',style:'car',hold:'bolsaT'},
  friedman:{skin:'#efc6a6',shirt:'#3a3d44',pants:'#3a3d44',style:'len',suit:1,tie:'#7d1f2e',hold:'moedaH'},
  reagan:{skin:'#e8b295',shirt:'#20263a',pants:'#20263a',style:'elo',suit:1,tie:'#c8102e',hold:'jujubaH'},
  clacerda:{skin:'#e8bfa2',shirt:'#20222c',pants:'#20222c',style:'len',suit:1,tie:'#26262c',hold:'mic'},
  nixon:{skin:'#e3b896',shirt:'#20263a',pants:'#20263a',style:'buk',suit:1,tie:'#2f4a8a',hold:'fitaH'},
  gaulle:{skin:'#e8bfa2',shirt:'#6a6a52',pants:'#55553f',sleeve:'#6a6a52',style:'kepi',uniform:1,hold:'naoH'},
  zapata:{skin:'#b98560',shirt:'#1c1a18',pants:'#1c1a18',style:'somb',hold:'milhoH'},
  owen:{skin:SK[1],shirt:'#20222c',pants:'#20222c',hair:'#a8a8a8',style:'short'},
  prestes:{skin:SK[1],shirt:'#7a2a24',pants:'#34425f',hair:'#2b211a',style:'short'},
  arouca:{skin:'#e3b896',shirt:'#f4f4f0',pants:'#3a3d44',style:'buk',hold:'vacinaM'},
  rosa:{skin:'#f0c8a8',shirt:'#2b2a2c',pants:'#2b2a2c',style:'mar',hold:'panfleto'},
  goldman:{skin:'#f0c8a8',shirt:'#7d1f2e',pants:'#2b2a2c',style:'mar',hold:'pandeiroM'},
  helder:{skin:'#d9a988',shirt:'#17171c',pants:'#17171c',style:'len',chainS:1,hold:'book'},
  stalin:{skin:'#d9a988',shirt:'#8a8460',pants:'#5a563e',sleeve:'#8a8460',style:'sta',uniform:1,hold:'cachimbo'},
  abbas:{skin:'#d9a988',shirt:'#1c1c22',pants:'#1c1c22',style:'men',suit:1,tie:'#2f4a8a',tieDots:1,shirtIn:'#f4f4f0',hold:'chaveP'},
  miliciano:{skin:SK[1],shirt:'#4a5a30',pants:'#3a4628',hair:'#2b211a',style:'short'},
  empresarios:{skin:SK[1],shirt:'#20263a',pants:'#20263a',hair:'#2b211a',style:'short',suit:1,tie:'#c8102e',hold:'flier'},
  ratinho:{skin:'#d9a988',shirt:'#20222c',pants:'#20222c',style:'rtn',suit:1,shirtIn:'#2a2f52',headset:1,hold:'dnaR'},
  neymar:{skin:'#c99a78',shirt:'#f6cf1d',pants:'#2456a6',style:'ney',camisa10:1,hold:'bolaN'},
  gusttavo:{skin:'#d9a67e',shirt:'#f7f5ee',pants:'#efe9dc',style:'gus',suit:1,shirtIn:'#d9a67e',choker:'#d8dde6',hold:'mic'},
  xuxa:{skin:'#f0c8a8',shirt:'#c9ced6',pants:'#c9ced6',sleeve:'#d8dde6',style:'xux',glitter:1,hold:'bonecaX'},
  anitta:{skin:'#b98560',shirt:'#17171c',pants:'#17171c',sleeve:'#b98560',style:'ani',choker:'#d8dde6',hold:'mic'},
  musk:{skin:'#e8bfa2',shirt:'#17171c',pants:'#17171c',style:'elo',suit:1,tie:'#101014',shirtIn:'#f4f4f0',hold:'carroM'},
  marina:{skin:'#b98560',shirt:'#f4f1e8',pants:'#c9bfa6',style:'mar',colarM:1,hold:'folhaV'},
  gilmar:{skin:'#d9a988',shirt:'#22305a',pants:'#22305a',hair:'#a8a59e',style:'len',suit:1,tie:'#a8adb5',hold:'lisboa'},
  toffoli:{skin:'#e3b896',shirt:'#1c1c22',pants:'#1c1c22',hair:'#6a6258',style:'buk',suit:1,tie:'#c8323a',shirtIn:'#b9b6cc',hold:'anulado'},
  nunes:{skin:'#c99a78',shirt:'#22305a',pants:'#22305a',hair:'#2a2420',style:'man',suit:1,tie:'#5a88c0',hold:'cajuina'},
  dino:{skin:'#c99a78',shirt:'#1f2024',pants:'#1f2024',style:'din',suit:1,tie:'#26262c',big:1,hold:'suspenso'},
  mendonca:{skin:'#e3b896',shirt:'#121216',pants:'#121216',style:'men',toga:1,hold:'bibliaSTF'},
  fux:{skin:'#e0b090',shirt:'#1c2748',pants:'#1c2748',style:'fux',suit:1,tie:'#2a3468',hold:'martelo'},
  fachin:{skin:'#e3b896',shirt:'#3a3d44',pants:'#3a3d44',hair:'#dcd9d2',style:'ene',suit:1,tie:'#7d95c0',hold:'book'},
  zanin:{skin:'#efc6a6',shirt:'#22335e',pants:'#22335e',hair:'#7a5a3c',style:'buk',suit:1,tie:'#d9a83a',hold:'habeas'},
  carmen:{skin:'#e3bd9f',shirt:'#17171c',pants:'#17171c',style:'car',hold:'constituicao'},
  kim:{skin:'#e3b896',shirt:'#1a2240',pants:'#1a2240',style:'kim',suit:1,shirtIn:'#cfe0f5',tie:'#1c2a5a',tieDots:1,hold:'lei'},
  renan:{skin:'#e3b896',shirt:'#1f2a4a',pants:'#1f2a4a',style:'ren',suit:1,shirtIn:'#f4f4f0',tie:'#f4f4f0',hold:'violao'},
  manga:{skin:'#efc4a2',shirt:'#20263a',pants:'#20263a',style:'man',suit:1,tie:'#7a1f3d',hold:'manga'},
  eneas:{skin:'#d9a47e',shirt:'#2140b8',pants:'#2140b8',style:'ene',suit:1,tie:'#1c2a6a',beard:'huge',beardC:'#14110f',hold:'bomba'},
  eduarda:{skin:'#f0c8a8',shirt:'#4a2c20',pants:'#2b2230',style:'edu',florais:1,hold:'voto'},
  caiado:{skin:'#d9a988',shirt:'#1c2a4a',pants:'#1c2a4a',style:'cai',suit:1,shirtIn:'#bcd8f2',tie:'#bcd8f2',hold:'pequi'},
  zema:{skin:'#e3b896',shirt:'#1a1f2e',pants:'#1a1f2e',style:'zem',suit:1,shirtIn:'#d9b8e8',tie:'#d9b8e8',hold:'paoqueijo'},
  cury:{skin:'#e3b896',shirt:'#1f3a6a',pants:'#1f3a6a',style:'cur',suit:1,tie:'#cfe0f5',hold:'rivotril'},
  datena:{skin:'#e3b08e',shirt:'#1a1f2e',pants:'#1a1f2e',style:'dat',suit:1,tie:'#c8102e',hold:'cadeira'},
  trump:{skin:'#e8a070',shirt:'#1f3264',pants:'#1f3264',style:'tru',suit:1,tie:'#d0162a',hold:'tarifa'},
  maduro:{skin:'#c48e68',shirt:'#15171e',pants:'#15171e',style:'mad',suit:1,tie:'#a8182a',hold:'bolivar'},
};
/* traços de caricatura de cada figura pública */
const TRACOS={
  lula:{hs:1.26,style:'lula',skin:'#e8b295',hair:'#d8d8d2',beard:'full',beardC:'#e3e3dd',brow:2,browC:'#bdbdb6',nose:1.5,headW:10.2,headH:10.4,jaw:.8,ear:2.9,bags:1,wr:1,talk:1,shirt:'#1c2a4a',pants:'#1c2a4a',sleeve:'#26365c',suit:1,tie:'#3b58b8',tieDots:1,star:0,pose:'gesture',hold:null},
  bolsonaro:{hs:1.24,style:'bolso',skin:'#e0b090',hair:'#473c33',brow:2,browC:'#4a4038',nose:1.4,headW:9.8,headH:10.8,jaw:.74,ear:2.5,bags:1,wr:1,es:.85,iris:'#4f86c0',smile:1,lip:'#a8574a',shirt:'#1a1f2e',pants:'#1a1f2e',collar:null,suit:1,tie:'#1c2a4a',big:0,flagPin:1},
  nikolas:{hs:1.22,style:'nik',skin:'#e3b896',hair:'#4a3526',brow:2.3,browC:'#2a1e16',nose:1.1,headW:9,headH:10.8,jaw:.64,ear:2.4,thin:1,shirt:'#17171c',pants:'#17171c',tie:'#0c0c10'},
  pavanato:{hs:1.22,style:'pav',skin:'#f0c4a4',hair:'#8a4a2a',brow:1.5,browC:'#6a3c22',nose:1,headW:9.2,headH:10.8,jaw:.66,ear:2.4,smile:1,lip:'#b5524a',tie:'#eeeeff'},
  flavio:{hs:1.24,style:'flav',hair:'#2a2019',brow:1.8,browC:'#2a2019',nose:1.2,headW:10.2,headH:10.6,jaw:.86,iris:'#7d7238',grin:1,shirt:'#1a1f2e',pants:'#1a1f2e',sleeve:'#272e42',tie:'#a9cdee',pin:'#35a35f',pose:'pockets',hold:null},
  janones:{hs:1.22,style:'jan',skin:'#cf9d78',hair:'#181310',beard:'short',beardC:'#2a2420',stubble:0,brow:2.1,browC:'#181310',nose:1.2,headW:9.6,headH:10.4,jaw:.75,shirt:'#d71f1f',pants:'#17171b',sleeve:'#d71f1f',tee:1,mst:1,sneaker:1,pose:'pockets',hold:null},
  marx:{hs:1.26,skin:'#e6b48f',hair:'#b5b1a8',beardC:'#c9c5bc',brow:2.4,browC:'#3a3632',nose:1.35,headW:9.8,jaw:.8,bags:1},
  dilma:{hs:1.24,style:'dilma',hair:'#8a4a22',lip:'#b3264a',smile:1,brow:1.4,browC:'#4a2e1b',nose:1,headW:10.2,headH:9.8,jaw:.76,shirt:'#a80d1e',pants:'#a80d1e',sleeve:'#c01428',blazer:1,neck:0,pearls:1,pose:'crossed',hold:null},
  haddad:{hs:1.22,style:'had',skin:'#d9a988',hair:'#55524f',brow:1.7,browC:'#3a3632',nose:1.3,headW:9.3,headH:10.9,jaw:.66,ear:2.5,bags:1,wr:1,grin:1,glasses:0,shirt:'#2f4f7f',pants:'#2f4f7f',tie:'#4a7ad0',tieChk:1},
  janja:{hs:1.22,style:'janja',hair:'#a8763f',brow:1.2,browC:'#6a4a2a',nose:.85,lip:'#c2244e',smile:1,headW:9.3,headH:10.2,jaw:.66,glasses:'tort',shirt:'#c8142a',pants:'#121214',sleeve:'#d31a30',blazer:1,blazerIn:'#111114',neck:0,chain:1,pinR:1,pose:'clasped',hold:null},
  mussolini:{hs:1.24,brow:1.4,browC:'#3a2e24',stern:1,nose:1.45,headW:10.4,headH:10.6,jaw:.96,es:.75,ear:2.4,bags:1},
  putin:{hs:1.22,hair:'#b9a88a',brow:1,browC:'#a89878',nose:1.15,headW:9.6,headH:10.6,jaw:.72,es:.72,ear:2.4,thin:1,bags:1,wr:1},
  artista:{hs:1.22,hair:'#bdb9b0',beard:'short',beardC:'#c9c5bc',brow:1.8,browC:'#9a968e',nose:1.3,headW:9.8,headH:10.8,jaw:.76,es:.85,ear:2.5,bags:1,wr:1},
  marcal:{hs:1.22,hair:'#1f1a17',beard:'short',beardC:'#4a4440',brow:2,browC:'#1f1a17',nose:1.2,headW:9.6,headH:10.8,jaw:.76,ear:2.4},
  vampirao:{hs:1.24,hair:'#c4c2bc',brow:1.6,browC:'#5a5650',nose:1.25,headW:9.8,headH:11,jaw:.76,es:.85,ear:2.5,bags:1,wr:1,grin:1,fangs:1},
  dino:{hs:1.24,hair:'#2a2622',brow:2,browC:'#2a2622',glasses:'thin',smile:1,smileR:4.4,lip:'#a8574a',nose:1.35,headW:11,headH:11,jaw:.92,ear:2.4,wr:1},
  mendonca:{hs:1.22,hair:'#8f8c86',brow:1.8,browC:'#5a5048',nose:1.35,headW:9.8,headH:11,jaw:.74,es:.8,ear:2.6,bags:1,wr:1},
  ana:{hs:1.22,hair:'#1c1612',brow:1.4,browC:'#1c1612',smile:1,smileR:4,lip:'#c96a72',nose:.95,headW:9.4,headH:10.2,jaw:.68},
  pabllo:{hs:1.22,hair:'#f2ecd8',brow:2,browC:'#3a2a20',lip:'#b5524a',smile:1,smileR:3.2,nose:1,headW:9.2,headH:10.6,jaw:.66},
  anitta:{hs:1.22,hair:'#4a2c1c',brow:1.7,browC:'#2a1a12',lip:'#a8574a',smile:1,smileR:3.4,nose:1,headW:9.2,headH:10.4,jaw:.66},
  ratinho:{hs:1.22,hair:'#2a211c',brow:2,browC:'#2a211c',stacheBig:1,stacheC:'#2a211c',nose:1.35,headW:10.2,headH:10.6,jaw:.8,es:.85,ear:2.6,bags:1,wr:1},
  neymar:{hs:1.22,hair:'#1c1612',beard:'short',beardC:'#3a2a20',stubble:0,brow:1.8,browC:'#1c1612',nose:1.2,headW:9.6,headH:10.6,jaw:.72,ear:2.8,tongue:1},
  gusttavo:{hs:1.22,hair:'#1c1612',beard:'short',beardC:'#1c1612',stubble:0,brow:2.2,browC:'#1c1612',nose:1.2,headW:9.6,headH:10.8,jaw:.74,ear:2.5},
  xuxa:{hs:1.22,hair:'#f2ecd8',brow:1.1,browC:'#b9a888',smile:1,smileR:4.4,lip:'#c96a72',nose:.95,headW:9.2,headH:10.2,jaw:.66},
  musk:{hs:1.22,hair:'#4a3626',brow:1.4,browC:'#4a3626',nose:1.25,headW:10,headH:10.8,jaw:.82,es:.8,ear:2.6,bags:1,wr:1},
  zapata:{hs:1.22,hair:'#1c1612',brow:2,browC:'#1c1612',stacheBig:1,stacheC:'#14110f',nose:1.2,headW:9.4,headH:10.6,jaw:.74,es:.85,ear:2.3},
  arouca:{hs:1.22,hair:'#2a2420',beard:'short',beardC:'#4a4038',stubble:0,brow:1.7,browC:'#2a2420',glasses:'thin',nose:1.2,headW:9.8,headH:10.8,jaw:.78,ear:2.5},
  rosa:{hs:1.22,hair:'#4a3626',brow:1.5,browC:'#3a2a20',nose:1.15,lip:'#a8574a',headW:9.2,headH:10.4,jaw:.7,es:.95,ear:2.3},
  goldman:{hs:1.22,hair:'#6a5a44',brow:1.4,browC:'#4a3e30',glasses:'round',nose:1.2,lip:'#a8574a',headW:9.6,headH:10.4,jaw:.78,es:.85,ear:2.3},
  helder:{hs:1.2,hair:'#e4e1da',brow:1.2,browC:'#a8a59e',smile:1,smileR:3.8,lip:'#a8574a',nose:1.15,headW:9,headH:10.4,jaw:.68,es:.9,ear:2.8,wr:1},
  churchill:{hs:1.24,hair:'#c9b894',brow:1.3,browC:'#a8966e',nose:1.2,headW:11,headH:10.8,jaw:.98,es:.75,ear:2.4,wr:1},
  thatcher:{hs:1.22,hair:'#c9a860',brow:1.2,browC:'#8a6a38',smile:1,smileR:3.6,lip:'#c2244e',nose:1.05,headW:9.4,headH:10.4,jaw:.72,es:.85,pearls:1},
  friedman:{hs:1.22,hair:'#a8a59e',brow:1.4,browC:'#6a665e',glasses:'big',smile:1,smileR:3.8,lip:'#a8574a',nose:1.3,headW:9.4,headH:10.6,jaw:.76,ear:3},
  reagan:{hs:1.22,hair:'#3a2a20',brow:1.7,browC:'#2a1c14',smile:1,smileR:4.4,lip:'#b5524a',nose:1.15,headW:10,headH:10.6,jaw:.8,ear:2.5,wr:1},
  clacerda:{hs:1.22,hair:'#3a3632',brow:1.8,browC:'#2a2622',glasses:'rect',nose:1.3,headW:9.6,headH:10.8,jaw:.72,ear:2.5,talk:1},
  nixon:{hs:1.22,hair:'#2a2420',brow:2.2,browC:'#2a2420',nose:1.55,headW:10.2,headH:10.8,jaw:.9,es:.8,ear:2.7,bags:1},
  gaulle:{hs:1.24,hair:'#2a2622',brow:1.4,browC:'#2a2622',stacheBig:1,stacheC:'#3a3632',nose:1.9,headW:9,headH:11,jaw:.72,es:.75,ear:2.6},
  stalin:{hs:1.24,hair:'#3a3632',brow:2.2,browC:'#3a3632',stacheBig:1,stacheC:'#3a2f26',nose:1.35,headW:10,headH:10.8,jaw:.78,es:.75,ear:2.5,bags:1,wr:1},
  abbas:{hs:1.22,hair:'#e4e1da',brow:1.6,browC:'#8a8680',glasses:'thin',stacheBig:1,stacheC:'#c9c5bc',nose:1.4,headW:10.4,headH:11,jaw:.84,es:.75,ear:2.8,bags:1,wr:1},
  marina:{hs:1.22,hair:'#6f6a64',brow:1.2,browC:'#3a3430',glasses:'cat',glassC:'#3a2630',glassW:.65,smile:1,smileR:3.6,lip:'#a8574a',nose:1.05,headW:9,headH:10.6,jaw:.66,es:.85,ear:2.4,wr:1},
  gilmar:{hs:1.24,brow:1.6,browC:'#d8d5ce',glasses:'rect',nose:1.4,headW:10.4,headH:11,jaw:.8,es:.7,ear:2.7,bags:1,wr:1},
  toffoli:{hs:1.24,beard:'short',beardC:'#b9b4a8',stubble:0,brow:1.8,browC:'#a8a296',nose:1.4,headW:10.6,headH:11,jaw:.86,es:.75,ear:2.6,bags:1},
  nunes:{hs:1.22,brow:1.5,browC:'#2a2420',nose:1.3,headW:10.4,headH:10.6,jaw:.84,es:1,ear:3,talk:1},
  fux:{hs:1.22,hair:'#8a8882',brow:1.8,browC:'#6a665e',nose:1.35,headW:9.8,headH:10.8,jaw:.78,es:.75,ear:2.4,bags:1,wr:1},
  fachin:{hs:1.24,brow:1.8,browC:'#c9c5bc',glasses:'thin',stacheBig:1,stacheC:'#e8e6e0',nose:1.4,headW:10.8,headH:10.8,jaw:.86,es:.75,ear:2.6,bags:1,wr:1},
  zanin:{hs:1.22,brow:1.1,browC:'#8a6a48',glasses:'round',nose:1.1,headW:10.2,headH:11,jaw:.84,es:.8,ear:2.8},
  carmen:{hs:1.22,hair:'#8f8d86',brow:1.2,browC:'#6a665e',smile:1,smileR:3.8,lip:'#a8574a',nose:1.1,headW:9.6,headH:10.4,jaw:.72,es:.85,pearls:1,wr:1},
  milei:{hs:1.24,hair:'#2a211c',brow:2.6,browC:'#2a211c',nose:1.4,headW:9.8,headH:11,jaw:.78,es:.8,ear:2.3,bags:1},
  bukele:{hs:1.22,hair:'#1c1612',beard:'short',beardC:'#1c1612',stubble:0,brow:2.1,browC:'#1c1612',nose:1.15,headW:9.6,headH:11,jaw:.76,ear:2.5},
  lenin:{hs:1.24,goatee:1,goateeC:'#7a4f2c',brow:2.2,browC:'#6a4426',nose:1.25,headW:10,headH:11,jaw:.74,es:.85,ear:2.5,wr:1},
  kelmon:{hs:1.24,hair:'#8f8c86',beard:'short',beardC:'#bdbab3',brow:2.4,browC:'#2a2622',glasses:'thin',nose:1.4,headW:10.2,headH:10.6,jaw:.82,es:.85,ear:2.5,bags:1},
  kim:{hs:1.22,hair:'#1f1812',brow:1.6,browC:'#1f1812',glasses:'thin',goatee:1,goateeC:'rgba(31,24,18,.6)',smile:1,smileR:3.8,lip:'#a8574a',nose:1,headW:9.4,headH:10.4,jaw:.72,ear:2.5},
  renan:{hs:1.22,hair:'#2b1f18',beard:'short',beardC:'#4a4038',brow:1.8,browC:'#2b1f18',nose:1.15,headW:9.4,headH:10.6,jaw:.74,ear:2.4},
  manga:{hs:1.22,hair:'#8a6a48',brow:1.4,browC:'#6a4d30',smile:1,smileR:4.2,lip:'#b5524a',nose:1.05,headW:9.4,headH:10.8,jaw:.7,ear:2.5},
  eneas:{hs:1.24,hair:'#1a1612',brow:1.3,browC:'#1a1612',glasses:'big',nose:1.3,headW:9.8,headH:10.8,jaw:.78,ear:2.5},
  eduarda:{hs:1.22,hair:'#3a2c24',brow:1.1,browC:'#3a2c24',glasses:'cat',smile:1,smileR:4.4,lip:'#b5524a',nose:.95,headW:9.6,headH:10.2,jaw:.7},
  caiado:{hs:1.22,hair:'#bcbab4',brow:1.5,browC:'#6a6660',smile:1,smileR:4.4,lip:'#a8574a',naso:1,nose:1.3,headW:10,headH:10.8,jaw:.76,ear:2.4,bags:1,wr:1},
  zema:{hs:1.22,hair:'#6f6c66',brow:1.1,browC:'#5a5650',glasses:'round',nose:1.35,headW:9.6,headH:11,jaw:.72,ear:2.6,thin:1,wr:1,goatee:1,goateeC:'rgba(120,115,105,.42)',noChin:1,mgPin:1},
  cury:{hs:1.22,hair:'#3a3632',brow:1.5,browC:'#3a3632',glasses:'rect',smile:1,smileR:4.2,lip:'#a8574a',naso:1,nose:1.2,headW:10,headH:10.6,jaw:.76,ear:2.6,wr:1},
  datena:{hs:1.24,hair:'#a9a6a0',brow:1.7,browC:'#3a3632',nose:1.25,headW:10.6,headH:11,jaw:.86,ear:2.4,bags:1,wr:1,talk:1},
  trump:{hs:1.24,hair:'#d8b468',brow:1.5,browC:'#b89858',nose:1.25,headW:10.2,headH:10.4,jaw:.84,es:.7,ear:2.4,bags:1,wr:1,purse:1,usPin:1},
  maduro:{hs:1.24,hair:'#1c1816',brow:2.2,browC:'#1c1816',nose:1.5,headW:10.4,headH:10.8,jaw:.86,es:.75,ear:2.4,bags:1,thin:1,stacheBig:1,sashVE:1,chainG:1},
  xi:{hs:1.22,hair:'#2b2a2c',brow:1.6,browC:'#2b2a2c',nose:1.15,headW:10.2,headH:10.4,jaw:.82,es:.78,ear:2.5,bags:1,grin:1},
  che:{hs:1.24,hair:'#1f1812',brow:1.9,browC:'#1f1812',nose:1.1,headW:9.4,headH:10.6,jaw:.68,ear:2.2,scruff:1,goatee:1,goateeC:'rgba(30,22,16,.75)',thin:1,fatigue:1},
  veio:{hs:1.16,style:'veio',skin:'#e3b08e',hair:'#c9b8a4',brow:1.2,browC:'#a89c8a',nose:1.15,headW:10.2,headH:10.6,jaw:.78,ear:2.8,es:.8,squint:1,naso:1,wr:1,smile:1,smileR:4.6,lip:'#a8574a',shirt:'#1f7a45',pants:'#2b3a67',sleeve:'#1f7a45',suit:0,tie:0,pin:0,tee:1,havan:1,pose:'down',hold:null},
  xandao:{hs:1.28,style:'bald',skin:'#dcae90',brow:2.2,browC:'#2a2622',stern:1,nose:1.3,headW:10,headH:11,jaw:.74,es:.85,bags:1,wr:1,ear:2.5},
};
for(const k in TRACOS)Object.assign(LOOKS[k],TRACOS[k]);
function rr(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath();c.fill()}
function disc(c,x,y,r){c.beginPath();c.arc(x,y,r,0,7);c.fill()}
function brFlag(c,x,y,w,h){
  c.fillStyle='#1f8a4d';c.fillRect(x,y,w,h);
  c.fillStyle='#f6cf1d';c.beginPath();c.moveTo(x+w/2,y+h*.1);c.lineTo(x+w*.92,y+h/2);c.lineTo(x+w/2,y+h*.9);c.lineTo(x+w*.08,y+h/2);c.fill();
  c.fillStyle='#22408f';disc(c,x+w/2,y+h/2,h*.23);
}
function redFlag(c,x,y,w,h){c.fillStyle='#c8102e';c.fillRect(x,y,w,h);c.fillStyle='#fff';star(c,x+w/2,y+h/2,h*.32)}
function star(c,x,y,r){c.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,q=i%2?r*.42:r;c.lineTo(x+Math.cos(a)*q,y+Math.sin(a)*q)}c.closePath();c.fill()}
function item(c,k){
  if(k==='phone'){c.fillStyle='#14151a';rr(c,-2.5,-8,5.5,10,1.2);c.fillStyle='#7fd4ff';c.fillRect(-1.5,-6.8,3.5,7)}
  else if(k==='cruz'){c.fillStyle='#d9a400';c.fillRect(-1.2,-15,2.4,15);c.fillRect(-5,-11,10,2.4)}
  else if(k==='suspenso'){c.fillStyle='#f4f1e8';c.fillRect(-5,-11,10,12);c.fillStyle='#c8102e';c.fillRect(-4,-6.6,8,2.4)}
  else if(k==='bibliaSTF'){c.fillStyle='#17181d';rr(c,-5,-11,10,12,1);c.fillStyle='#d9a400';c.fillRect(-.6,-9.4,1.2,7.6);c.fillRect(-2.6,-7.4,5.2,1.2)}
  else if(k==='habeas'){c.fillStyle='#f4f1e8';c.fillRect(-5,-11,10,12);c.strokeStyle='#d9a400';c.lineWidth=1.2;c.beginPath();c.arc(-1.6,-7.6,1.8,0,7);c.stroke();c.fillStyle='#d9a400';c.fillRect(0,-8.2,4,1.2);c.fillRect(2.4,-7,1,1.8);c.fillStyle='#9aa0a8';c.fillRect(-3.6,-3.4,7.2,.9);c.fillRect(-3.6,-1.6,5,.9)}
  else if(k==='constituicao'){c.fillStyle='#1f7a4d';rr(c,-5,-11,10,12,1);c.fillStyle='#f2b705';c.fillRect(-3,-8.6,6,5)}
  else if(k==='milhoH'){c.fillStyle='#f2c83a';c.beginPath();c.ellipse(0,-8,3,6.4,0,0,7);c.fill();c.fillStyle='#3f8a34';c.beginPath();c.moveTo(-3,-2);c.quadraticCurveTo(-5,-8,-2.6,-12);c.lineTo(-1,-3);c.fill();c.beginPath();c.moveTo(3,-2);c.quadraticCurveTo(5,-8,2.6,-12);c.lineTo(1,-3);c.fill()}
  else if(k==='charuto'){c.fillStyle='#6a4326';rr(c,-1.6,-12,3.2,11,1.4);c.fillStyle='#ff8a2c';disc(c,0,-12.4,1.7)}
  else if(k==='bolsaT'){c.fillStyle='#17181d';rr(c,-5.4,-9,10.8,8,1.6);c.strokeStyle='#17181d';c.lineWidth=1;c.beginPath();c.arc(0,-9,3.2,Math.PI,0);c.stroke();c.fillStyle='#d9a400';c.fillRect(-1,-7.6,2,1.6)}
  else if(k==='moedaH'){c.fillStyle='#e0b020';disc(c,0,-7,4.6);c.fillStyle='#8a6a10';c.font='700 6px Arial';c.textAlign='center';c.fillText('$',0,-5)}
  else if(k==='jujubaH'){c.fillStyle='#e2234e';rr(c,-3.6,-9,7.2,4.6,2.2);c.fillStyle='#2bb5e0';rr(c,-3,-5,6.4,4.2,2)}
  else if(k==='fitaH'){c.fillStyle='#17181d';rr(c,-6,-10,12,8,1.2);c.fillStyle='#d8d4c8';disc(c,-2.6,-6,1.5);disc(c,2.6,-6,1.5)}
  else if(k==='naoH'){c.fillStyle='#6a4a2a';c.fillRect(-6.6,-13,1.2,14);for(const[i,k2]of[[0,'#1f3a8a'],[1,'#fff'],[2,'#c8102e']]){c.fillStyle=k2;c.fillRect(-5.4+i*4,-13,4,8)}}
  else if(k==='vacinaM'){c.fillStyle='#bfe3f5';c.fillRect(-1.6,-12,3.2,9);c.fillStyle='#c9ced6';c.fillRect(-.4,-3,.8,4);c.fillStyle='#8a8f98';c.fillRect(-2.6,-13,5.2,1.4)}
  else if(k==='pandeiroM'){c.fillStyle='#f4ead5';disc(c,0,-7,5.4);c.strokeStyle='#a8583c';c.lineWidth=1.4;c.beginPath();c.arc(0,-7,5.4,0,7);c.stroke()}
  else if(k==='cachimbo'){c.fillStyle='#5a3a22';rr(c,-3.6,-11,7,7.4,1.6);c.fillStyle='#2a1c12';c.fillRect(-2.2,-11,4.4,1.8);c.strokeStyle='#5a3a22';c.lineWidth=1.8;c.lineCap='round';c.beginPath();c.moveTo(0,-4.4);c.quadraticCurveTo(1,-1,7,-3);c.stroke()}
  else if(k==='chaveP'){c.strokeStyle='#e0b020';c.lineWidth=1.6;c.beginPath();c.arc(0,-12,2.8,0,7);c.moveTo(0,-9.2);c.lineTo(0,-1);c.moveTo(0,-3);c.lineTo(2.6,-3);c.moveTo(0,-5.4);c.lineTo(2.2,-5.4);c.stroke()}
  else if(k==='bonecaX'){c.fillStyle='#e2679b';rr(c,-3.2,-7,6.4,8,1.6);c.fillStyle='#f0c8a8';disc(c,0,-10,3);c.fillStyle='#f2d04a';c.beginPath();c.arc(0,-10.6,3.3,Math.PI,0);c.fill()}
  else if(k==='dnaR'){c.fillStyle='#f4e2b8';c.fillRect(-6,-10,12,9);c.strokeStyle='#b89a60';c.lineWidth=.6;c.beginPath();c.moveTo(-6,-10);c.lineTo(0,-6);c.lineTo(6,-10);c.stroke();for(let i=0;i<5;i++){const x=-4+i*2,y=Math.sin(i*1.3)*1.6;c.fillStyle='#2f6fd0';disc(c,x,-4+y,.8);c.fillStyle='#d0162a';disc(c,x,-4-y,.8)}}
  else if(k==='bolaN'){c.fillStyle='#fff';disc(c,0,-6,5);c.fillStyle='#17181d';disc(c,0,-6,1.7);disc(c,-3.2,-8.6,1);disc(c,3.2,-8.6,1);disc(c,-3.2,-3.4,1);disc(c,3.2,-3.4,1)}
  else if(k==='chapeuM'){c.fillStyle='#6a4a2a';c.beginPath();c.ellipse(0,-6,8,2.4,0,0,7);c.fill();rr(c,-4,-12,8,6,2);c.fillStyle='#e8dcc4';c.fillRect(-4,-7.6,8,1.2)}
  else if(k==='carroM'){c.fillStyle='#c8102e';rr(c,-7,-7,14,5,1.5);c.fillStyle='#9fd6ee';rr(c,-3.6,-10,7.2,3.4,1);c.fillStyle='#17181d';disc(c,-4,-2,1.7);disc(c,4,-2,1.7)}
  else if(k==='folhaV'){c.fillStyle='#3f9e5c';c.beginPath();c.ellipse(0,-8,3.6,7,.3,0,7);c.fill();c.strokeStyle='#1f6a3a';c.lineWidth=.6;c.beginPath();c.moveTo(-1.6,-2);c.lineTo(1.8,-14);c.stroke()}
  else if(k==='lisboa'){c.fillStyle='#2456a6';rr(c,-7,-9,14,8,1);c.fillStyle='#fff';c.fillRect(-5,-7,10,1.2);c.fillRect(-5,-4.6,6,1.2)}
  else if(k==='anulado'){c.fillStyle='#6a4326';c.fillRect(-1,-13,2,8);c.fillStyle='#17181d';rr(c,-4.6,-6,9.2,4,1);c.fillStyle='#c8102e';c.fillRect(-4.6,-2.4,9.2,1.6)}
  else if(k==='cajuina'){c.fillStyle='#d9a441';rr(c,-3,-10,6,11,1.4);c.fillRect(-1.2,-14,2.4,4);c.fillStyle='#fff';c.fillRect(-3,-6.6,6,3)}
  else if(k==='motosserra'){c.fillStyle='#e8701a';rr(c,-5,-7,10,9,1.6);c.fillStyle='#c9ced6';c.fillRect(-2.4,-29,4.8,22);c.fillStyle='#2a2a2e';for(let i=0;i<8;i++){c.fillRect(-3.5,-29+i*2.8,1.1,1.5);c.fillRect(2.4,-29+i*2.8,1.1,1.5)}}
  else if(k==='algema'){c.strokeStyle='#c9ced6';c.lineWidth=1.6;c.beginPath();c.arc(-3.4,-9,3,0,7);c.moveTo(6.4,-9);c.arc(3.4,-9,3,0,7);c.stroke();c.fillStyle='#8a8f98';c.fillRect(-1,-9.7,2,1.4)}
  else if(k==='pravda'){c.fillStyle='#f4f1e8';c.fillRect(-5,-11,10,12);c.fillStyle='#c8102e';c.fillRect(-5,-11,10,3);c.fillStyle='#8a8f98';c.fillRect(-3.6,-6.4,7.2,1);c.fillRect(-3.6,-4,7.2,1);c.fillRect(-3.6,-1.6,5,1)}
  else if(k==='violao'){c.fillStyle='#b98a4a';c.beginPath();c.ellipse(0,-5,5,4.6,0,0,7);c.fill();c.beginPath();c.ellipse(0,-11,3.6,3.4,0,0,7);c.fill();c.fillStyle='#4a2c16';disc(c,0,-6,1.5);c.fillRect(-.8,-25,1.6,12)}
  else if(k==='manga'){c.fillStyle='#f2a02c';c.beginPath();c.ellipse(0,-7,4.4,5.8,.3,0,7);c.fill();c.fillStyle='#d0432a';c.beginPath();c.ellipse(1.8,-9,2,2.8,.3,0,7);c.fill();c.fillStyle='#3f7a32';c.fillRect(1,-14,1.4,2.4)}
  else if(k==='bomba'){c.fillStyle='#3a3f48';c.beginPath();c.ellipse(0,-7,4,6.4,0,0,7);c.fill();c.fillStyle='#d0162a';c.fillRect(-3,-14,6,2.4);c.fillStyle='#f2b705';disc(c,0,-7,1.8)}
  else if(k==='voto'){c.fillStyle='#fff';c.fillRect(-4,-11,8,11);c.fillStyle='#1f7a4d';c.font='700 7px Arial';c.textAlign='center';c.fillText('X',0,-3)}
  else if(k==='pequi'){c.fillStyle='#5f8a3e';disc(c,0,-6,4.8);c.fillStyle='#f2b705';disc(c,0,-6,2.6)}
  else if(k==='paoqueijo'){c.fillStyle='#e8c070';disc(c,0,-6,4.6);c.fillStyle='#d09a4a';disc(c,-1.4,-7.6,1);disc(c,1.8,-5,.9)}
  else if(k==='rivotril'){c.fillStyle='#f4f8fc';rr(c,-5,-12,10,12,1.2);c.fillStyle='#2f6fd0';c.fillRect(-5,-9,10,3.4);c.fillStyle='#2f6fd0';disc(c,0,-3.6,1.7)}
  else if(k==='cadeira'){c.strokeStyle='#6a4326';c.lineWidth=1.6;c.lineCap='butt';c.beginPath();c.moveTo(-4,-1);c.lineTo(-4,-15);c.moveTo(-4,-7);c.lineTo(4,-7);c.lineTo(4,-1);c.moveTo(-4,-12);c.lineTo(-1,-12);c.stroke()}
  else if(k==='curso'){c.fillStyle='#17366e';rr(c,-5,-11,10,12,1.2);c.fillStyle='#f2b705';c.fillRect(-3.4,-8,6.8,1.6)}
  else if(k==='tarifa'){c.fillStyle='#fff';c.fillRect(-5,-11,10,11);c.fillStyle='#d0162a';c.fillRect(-5,-11,10,3);c.beginPath();c.moveTo(0,-7);c.lineTo(3,-4);c.lineTo(1,-4);c.lineTo(1,-1.4);c.lineTo(-1,-1.4);c.lineTo(-1,-4);c.lineTo(-3,-4);c.fill()}
  else if(k==='bolivar'){c.fillStyle='#6fa36a';c.fillRect(-6,-10,12,7);c.fillStyle='#e8f0d8';c.fillRect(-4,-8.4,8,3.8);c.fillStyle='#2e5a30';c.beginPath();c.ellipse(0,-6.5,1.4,1.6,0,0,7);c.fill()}
  else if(k==='caixa'){c.fillStyle='#b98a4a';rr(c,-5,-11,10,10,1);c.fillStyle='#e6d0a0';c.fillRect(-1,-11,2,10)}
  else if(k==='camiseta'){c.fillStyle='#f4f1e8';rr(c,-4,-11,8,10,1);c.fillRect(-7,-11,14,3.4);c.fillStyle='#17140f';disc(c,0,-7,1.9);c.fillStyle='#c8102e';star(c,0,-8.4,.9)}
  else if(k==='sacola'){c.fillStyle='#2456a6';rr(c,-5,-11,10,12,1.2);c.fillStyle='#f6cf1d';c.fillRect(-5,-7,10,2.4);c.strokeStyle='#17366e';c.lineWidth=1.1;c.beginPath();c.arc(0,-11,2.8,Math.PI,0);c.stroke()}
  else if(k==='cupom'){c.fillStyle='#f6cf1d';c.fillRect(-7,-11,14,9);c.fillStyle='#c8102e';disc(c,-3,-8.6,1.3);disc(c,2,-4.4,1.3);c.strokeStyle='#c8102e';c.lineWidth=1.2;c.beginPath();c.moveTo(2.4,-9.6);c.lineTo(-3.4,-3.4);c.stroke()}
  else if(k==='megafone'){c.fillStyle='#f4f0e6';c.beginPath();c.moveTo(-2,-3);c.lineTo(2,-3);c.lineTo(6,-13);c.lineTo(-6,-13);c.fill();c.fillStyle='#c8102e';c.fillRect(-2,-3,4,4)}
  else if(k==='calculadora'){c.fillStyle='#2e3440';rr(c,-4.5,-11,9,12,1.2);c.fillStyle='#b8e0b0';c.fillRect(-3.2,-9.6,6.4,3);c.fillStyle='#ddd';for(let i=0;i<3;i++)for(let j=0;j<2;j++)c.fillRect(-3+i*2.3,-5.4+j*2.4,1.5,1.5)}
  else if(k==='lupa'){c.strokeStyle='#d9b64a';c.lineWidth=2;c.beginPath();c.arc(0,-11,5,0,7);c.stroke();c.fillStyle='#bfe3f566';disc(c,0,-11,4.2);c.fillStyle='#6a4326';c.fillRect(-1,-6,2,8)}
  else if(k==='espetos'){c.fillStyle='#bbb';for(const q of[-3.5,0,3.5])c.fillRect(q-.5,-17,1.1,19);c.fillStyle='#8a2a22';for(const q of[-3.5,0,3.5])rr(c,q-2,-15,4,9,1.5)}
  else if(k==='book2'){c.fillStyle='#7d1420';rr(c,-7,-14,14,17,1.5);c.fillStyle='#f2b705';c.fillRect(-4.5,-11,9,2);c.fillRect(-4.5,-7,6,1.4)}
  else if(k==='book'){c.fillStyle='#7d1420';rr(c,-5,-9,10,12,1.2);c.fillStyle='#f2b705';c.fillRect(-3,-6,6,1.5)}
  else if(k==='panfleto'||k==='flier'){c.fillStyle='#fff';c.fillRect(-4,-9,8,10);c.fillStyle='#c8102e';c.fillRect(-3,-7.5,6,2)}
  else if(k==='mic'){c.fillStyle='#333';c.fillRect(-1,-7,2.4,8);c.fillStyle='#999';disc(c,.2,-8.5,3)}
  else if(k==='mandioca'){c.fillStyle='#8a5a30';c.beginPath();c.ellipse(0,-6,2.6,7.5,.3,0,7);c.fill();c.fillStyle='#f4e7c8';c.beginPath();c.ellipse(.8,-11.5,1.7,1.2,.3,0,7);c.fill()}
  else if(k==='espeto'){c.fillStyle='#bbb';c.fillRect(-.6,-16,1.3,18);c.fillStyle='#8a2a22';rr(c,-3.4,-14,7,8,2);c.fillStyle='#d9694f';c.fillRect(-3,-11,6,2)}
  else if(k==='bandeirinha'){c.fillStyle='#6a4a2a';c.fillRect(-.6,-15,1.3,17);brFlag(c,.5,-15,11,7.5)}
  else if(k==='bandeirinhaR'){c.fillStyle='#6a4a2a';c.fillRect(-.6,-15,1.3,17);redFlag(c,.5,-15,11,7.5)}
  else if(k==='mala'){c.fillStyle='#7a4a2a';rr(c,-5,-9,10,10,1.8);c.fillStyle='#f2b705';c.fillRect(-5,-5,10,1.6)}
  else if(k==='martelo'){c.fillStyle='#6a4326';c.fillRect(-.8,-13,1.8,15);rr(c,-5.5,-16,11,6,1.2)}
  else if(k==='leite'){c.fillStyle='#2456a6';rr(c,-4,-9,8,10,1.5);c.fillStyle='#fff';c.fillRect(-4,-6.5,8,4)}
  else if(k==='berrante'){c.strokeStyle='#d9c7a0';c.lineWidth=3;c.beginPath();c.arc(4,-6,6,1.6,4.4);c.stroke()}
  else if(k==='vento'){c.strokeStyle='#dff3ff';c.lineWidth=1.8;c.beginPath();c.arc(0,-8,5,.2,5);c.moveTo(2,-8);c.arc(0,-8,2,0,4.5);c.stroke()}
  else if(k==='imposto'){c.fillStyle='#fff';c.fillRect(-4,-9,8,10);c.fillStyle='#c8102e';c.font='700 8px Arial';c.textAlign='center';c.fillText('%',0,-1.5)}
  else if(k==='santinho'){c.fillStyle='#f6cf1d';c.fillRect(-4,-9,8,10);c.fillStyle='#1f7a4d';c.fillRect(-3,-7.5,6,2)}
  else if(k==='lei'){c.fillStyle='#2456a6';rr(c,-5,-9,10,12,1.2);c.fillStyle='#fff';c.fillRect(-3,-6,6,1.2);c.fillRect(-3,-3.5,6,1.2)}
}
function hairCap(c,L,hy,line,drop){
  const W=(L.headW||9.6)+.6,H=L.headH||9.6;
  c.fillStyle=L.hair;c.beginPath();c.moveTo(-W,hy+drop);c.bezierCurveTo(-W-1.4,hy-H*1.52,W+1.4,hy-H*1.52,W,hy+drop);
  c.lineTo(W-2.4,hy+drop);c.bezierCurveTo(W-2.2,hy-line*.7,3,hy-line,0,hy-line);c.bezierCurveTo(-3,hy-line,-W+2.2,hy-line*.7,-W+2.4,hy+drop);c.closePath();c.fill();
}
function beardShape(c,hy,W,H){c.beginPath();c.moveTo(-W+.2,hy+.8);c.bezierCurveTo(-W+.6,hy+H*1.22,W-.6,hy+H*1.22,W-.2,hy+.8);c.quadraticCurveTo(W-3.2,hy+3.6,5.2,hy+2.6);c.quadraticCurveTo(0,hy+4.4,-5.2,hy+2.6);c.quadraticCurveTo(-W+3.2,hy+3.6,-W+.2,hy+.8);c.fill()}
/* rosto detalhado das figuras públicas; a multidão usa o desenho simples de char() */
function drawFace(c,L,hy,skin,t,bw){
  const W=L.headW||9.6,H=L.headH||10,J=L.jaw||.7,es=L.es||1,st=L.style;
  c.save();c.translate(0,hy+9);c.scale(L.hs,L.hs);c.translate(0,-(hy+9));
  /* cabelo de trás */
  if(st==='wild'){c.fillStyle=L.hair;for(const[a,b,r]of[[-12,-3,6],[-13.5,3,5.6],[-11,8,4.6],[12,-3,6],[13.5,3,5.6],[11,8,4.6],[-8,-9.6,5],[8,-9.6,5],[0,-11.4,4.6]])disc(c,a,hy+b,r)}
  if(st==='dilma'){c.fillStyle=L.hair;c.beginPath();c.ellipse(0,hy-3.6,W+1.8,H-.4,0,0,7);c.fill()}
  if(st==='janja'){
    c.fillStyle=L.hair;c.beginPath();c.ellipse(0,hy-1,W+1.8,H,0,0,7);c.fill();
    for(const sd of[-1,1]){
      c.fillStyle=L.hair;c.beginPath();c.ellipse(sd*(W+.2),hy+6,3.2,10.5,0,0,7);c.fill();
      for(const[a,b,r]of[[W+1,9,2.6],[W+1.8,13.4,2.8],[W+.2,17,2.8],[W-3,18.2,2.2]])disc(c,sd*a,hy+b,r);
      c.strokeStyle='#c79a5e';c.lineWidth=.8;c.beginPath();c.moveTo(sd*(W+.4),hy+1);c.quadraticCurveTo(sd*(W+2.4),hy+7,sd*(W+.6),hy+11);c.quadraticCurveTo(sd*(W-.6),hy+14,sd*(W+1),hy+17);c.stroke();
    }
  }
  if(st==='ana'||st==='vit'||st==='ani'){
    const[len,larg]=st==='vit'?[14.5,4.6]:st==='ana'?[13,4]:[9.6,4];
    c.fillStyle=L.hair;c.beginPath();c.ellipse(0,hy-1,W+1.8,H,0,0,7);c.fill();
    for(const sd of[-1,1]){c.beginPath();c.ellipse(sd*(W+.6),hy+len*.72,larg,len,sd*.05,0,7);c.fill();if(st==='ani'){c.fillStyle='#6f4526';c.beginPath();c.ellipse(sd*(W+.6),hy+len*1.24,larg-.7,len*.36,sd*.05,0,7);c.fill();c.fillStyle=L.hair}}
  }
  if(st==='car'){c.fillStyle=L.hair;c.beginPath();c.ellipse(0,hy-1,W+2.4,H,0,0,7);c.fill();for(const sd of[-1,1]){c.beginPath();c.ellipse(sd*(W+1),hy+4,3.6,8,sd*.06,0,7);c.fill()}}
  if(st==='edu'){c.fillStyle=L.hair;c.beginPath();c.ellipse(0,hy-1,W+2,H,0,0,7);c.fill();for(const sd of[-1,1]){c.beginPath();c.ellipse(sd*(W+.4),hy+6,3.4,9.6,sd*.06,0,7);c.fill();disc(c,sd*(W+1),hy+13,2.8)}}
  if(st==='che'){c.fillStyle=L.hair;c.beginPath();c.ellipse(0,hy-1,W+2,H,0,0,7);c.fill();for(const sd of[-1,1]){c.beginPath();c.ellipse(sd*(W+.6),hy+6,3.4,9.5,sd*.1,0,7);c.fill();for(const[a,b,r]of[[W+1.6,10,2.4],[W+.8,14,2.4]])disc(c,sd*a,hy+b,r)}}
  if(L.wig){c.fillStyle='#e8c35e';c.beginPath();c.ellipse(0,hy-2,W+3.6,H+1.4,0,0,7);c.fill();for(const sd of[-1,1]){c.beginPath();c.ellipse(sd*(W+1.6),hy+7,4.4,12,sd*.08,0,7);c.fill();for(const[a,b,r]of[[W+3.4,10,3],[W+4.4,15,3.2],[W+1.6,19,3]])disc(c,sd*a,hy+b,r)}}
  /* pescoço, orelhas e cabeça */
  c.fillStyle=skin;c.fillRect(-3.4,hy+7,6.8,6);
  disc(c,-W+.2,hy+.6,L.ear||2.1);disc(c,W-.2,hy+.6,L.ear||2.1);
  c.beginPath();c.moveTo(-W,hy-1);c.bezierCurveTo(-W,hy-H*1.25,W,hy-H*1.25,W,hy-1);c.bezierCurveTo(W,hy+H*.65,W*J,hy+H*1.02,0,hy+H*1.02);c.bezierCurveTo(-W*J,hy+H*1.02,-W,hy+H*.65,-W,hy-1);c.fill();
  c.fillStyle='rgba(90,40,20,.1)';c.beginPath();c.ellipse(W*.56,hy+1.4,W*.42,H*.76,0,0,7);c.fill();
  if(L.pearls){c.fillStyle='#f7f2e6';for(let i=-4;i<=4;i++)disc(c,i*1.55,hy+10.8+(16-i*i)*.17,1)}
  /* cabelo da frente */
  if(st==='wild')hairCap(c,L,hy,9.2,-6.4);
  if(st==='lula'){hairCap(c,L,hy,8.2,-.6);c.strokeStyle='#a9a9a3';c.lineWidth=.6;c.beginPath();for(const q of[-5,-2,1.5,5]){c.moveTo(q,hy-8.8);c.quadraticCurveTo(q*1.05,hy-9.8,q*.9,hy-10.8)}c.stroke()}
  if(st==='bolso'){c.fillStyle='#a9a69f';c.beginPath();c.ellipse(-W+.5,hy-2.2,2,4,.1,0,7);c.fill();c.beginPath();c.ellipse(W-.5,hy-2.2,2,4,-.1,0,7);c.fill();hairCap(c,L,hy,5.8,-3.6);c.fillStyle=L.hair;c.beginPath();c.moveTo(-W+1,hy-4.6);c.quadraticCurveTo(-2,hy-12.5,W-1.6,hy-6.8);c.quadraticCurveTo(0,hy-8,-W+1,hy-4.6);c.fill();c.strokeStyle='#6a5f55';c.lineWidth=.5;c.beginPath();c.moveTo(-W+3,hy-7);c.quadraticCurveTo(-2,hy-10.6,W-4,hy-8.4);c.moveTo(-W+4,hy-9);c.quadraticCurveTo(-1,hy-12,W-5,hy-10.4);c.stroke()}
  if(L.wig){
    c.fillStyle='#e8c35e';c.beginPath();c.moveTo(-W-1.6,hy+1);c.bezierCurveTo(-W-3,hy-17,W+3,hy-17,W+1.6,hy+1);c.lineTo(W-2,hy-1);c.bezierCurveTo(W-3,hy-6,3,hy-7.4,-1,hy-6.6);c.bezierCurveTo(-5,hy-6.4,-W+2.4,hy-5,-W+2,hy-1);c.closePath();c.fill();
    c.strokeStyle='#f6e19a';c.lineWidth=.8;c.beginPath();c.moveTo(-8,hy-6);c.quadraticCurveTo(-4,hy-14,2,hy-13);c.moveTo(-3,hy-8);c.quadraticCurveTo(2,hy-12,8,hy-7);c.moveTo(-W-.6,hy-3);c.quadraticCurveTo(-W-1.6,hy+3,-W+.2,hy+7);c.moveTo(W+.6,hy-3);c.quadraticCurveTo(W+1.6,hy+3,W-.2,hy+7);c.stroke();
    c.strokeStyle='#e8c35e';c.lineWidth=1;c.beginPath();c.moveTo(-5,hy-14);c.lineTo(-9,hy-18);c.moveTo(3,hy-15);c.lineTo(7,hy-19);c.stroke();
  }else if(st==='nik'){
    hairCap(c,L,hy,5,-1.4);
    c.fillStyle=L.hair;for(const[a,b,r]of[[-8.4,-7,2.8],[-6,-10.6,3.2],[-2,-12.6,3.4],[2.6,-12.8,3.4],[6.6,-10.6,3.2],[8.6,-6.8,2.6],[-3,-6.8,2],[1,-6.2,2.1],[4.6,-7,1.9]])disc(c,a,hy+b,r);
    c.strokeStyle='#7a5a40';c.lineWidth=.7;c.beginPath();c.moveTo(-6,hy-9);c.quadraticCurveTo(-3,hy-13.5,0,hy-12);c.moveTo(2,hy-12.6);c.quadraticCurveTo(6,hy-12.6,7.6,hy-8.6);c.moveTo(-2.4,hy-8);c.quadraticCurveTo(-.5,hy-9.6,1.2,hy-7.6);c.stroke();
  }
  if(st==='pav'){
    hairCap(c,L,hy,6.4,-2.4);
    c.fillStyle=L.hair;c.beginPath();c.moveTo(-W,hy-4);c.bezierCurveTo(-W,hy-13,-1,hy-14.6,5,hy-13.4);c.bezierCurveTo(W+1,hy-12.4,W+.8,hy-7,W,hy-4.6);c.quadraticCurveTo(W-2.4,hy-8,3,hy-8.4);c.quadraticCurveTo(-4,hy-8.2,-W,hy-4);c.fill();
    c.strokeStyle='#b06a3e';c.lineWidth=.7;c.beginPath();c.moveTo(-6,hy-8.6);c.quadraticCurveTo(-1,hy-13,6,hy-11.6);c.moveTo(-4,hy-8.8);c.quadraticCurveTo(0,hy-11,6.6,hy-9.6);c.stroke();
  }
  if(st==='flav'){hairCap(c,L,hy,7,-1.8);c.fillStyle=L.hair;c.beginPath();c.moveTo(-5,hy-8);c.quadraticCurveTo(-1,hy-6,4.4,hy-7.4);c.quadraticCurveTo(0,hy-11,-5,hy-8);c.fill();c.strokeStyle='#5a4636';c.lineWidth=.7;c.beginPath();c.moveTo(-4,hy-10);c.quadraticCurveTo(0,hy-13,5,hy-10.5);c.stroke()}
  if(st==='jan'){
    c.fillStyle='#4a423a';c.beginPath();c.ellipse(-W+.8,hy-2.6,1.8,3.6,.1,0,7);c.fill();c.beginPath();c.ellipse(W-.8,hy-2.6,1.8,3.6,-.1,0,7);c.fill();
    hairCap(c,L,hy,5.4,-4);
    c.fillStyle=L.hair;for(const[a,b,r]of[[-7,-8,2.4],[-4,-10.6,2.7],[0,-11.6,2.9],[4,-10.8,2.7],[7,-8.4,2.4],[-2,-7.6,2],[2.6,-7.8,2]])disc(c,a,hy+b,r);
  }
  if(st==='dilma'){
    hairCap(c,L,hy,5,-2.4);
    c.fillStyle=L.hair;for(const[a,b,r]of[[-10,-3.4,3],[-9.6,-8,3.8],[-6,-11.6,4],[-1,-14,4.4],[4.4,-13,4.2],[8.6,-9.6,3.8],[10,-4.2,3]])disc(c,a,hy+b,r);
    c.fillStyle='#b0683a';for(const[a,b,r]of[[-7.4,-9,1.4],[-3,-13,1.6],[2.4,-14.6,1.6],[6.6,-11.4,1.4],[-9.8,-4.4,1.1],[9.8,-5.6,1.1],[0,-9.4,1.3]])disc(c,a,hy+b,r);
    c.fillStyle='#f7f2e6';disc(c,-W-.4,hy+3.6,1.3);disc(c,W+.4,hy+3.6,1.3);
  }
  if(st==='had'){
    hairCap(c,L,hy,6.4,1.4);
    c.fillStyle=L.hair;for(const[a,b,r]of[[-9.6,-1,2.4],[-9.8,-5,2.8],[-7,-10,3.2],[-2.4,-12.4,3.4],[3,-12,3.4],[7.4,-9.4,3.2],[9.8,-4.6,2.8],[9.6,-.6,2.4]])disc(c,a,hy+b,r);
    c.strokeStyle='#a5a29c';c.lineWidth=.7;c.beginPath();c.moveTo(-7,hy-8);c.quadraticCurveTo(-3,hy-13,3,hy-12);c.moveTo(-9.5,hy-3);c.quadraticCurveTo(-8.8,hy-6,-7.4,hy-8);c.moveTo(9.5,hy-3);c.quadraticCurveTo(9,hy-7,6,hy-11);c.stroke();
  }
  if(st==='janja'){hairCap(c,L,hy,4,2);c.strokeStyle='rgba(110,78,40,.45)';c.lineWidth=.5;c.beginPath();c.moveTo(-.6,hy-9.8);c.lineTo(-.9,hy-6.4);c.stroke()}
  if(st==='art'){hairCap(c,L,hy,6.4,-3);c.fillStyle='rgba(235,232,225,.5)';for(const[a,b]of[[-5,-10],[-1,-11],[3.4,-10.6],[6.6,-8.6],[-7.4,-7.6]])disc(c,a,hy+b,.7)}
  if(st==='pab'){
    c.fillStyle='#5a5450';c.beginPath();c.ellipse(-W+.7,hy-3,1.7,3.4,.1,0,7);c.fill();c.beginPath();c.ellipse(W-.7,hy-3,1.7,3.4,-.1,0,7);c.fill();
    hairCap(c,L,hy,6.4,-4);c.fillStyle=L.hair;c.beginPath();c.moveTo(-W+.8,hy-5);c.bezierCurveTo(-W,hy-14.6,W,hy-15.4,W-.8,hy-5.4);c.quadraticCurveTo(1,hy-9.4,-W+.8,hy-5);c.fill();
    c.strokeStyle='#4a4440';c.lineWidth=.6;c.beginPath();c.moveTo(-5,hy-8);c.quadraticCurveTo(-1,hy-13.4,4.4,hy-12.6);c.moveTo(-2,hy-8);c.quadraticCurveTo(1,hy-11,6,hy-10.4);c.stroke();
  }
  if(st==='vam'){
    hairCap(c,L,hy,8.2,-1.6);
    c.strokeStyle='#e6e4de';c.lineWidth=.6;c.beginPath();for(const q of[-6,-3,0,3,6]){c.moveTo(q,hy-9);c.quadraticCurveTo(q*.98,hy-9.8,q*.92,hy-10.8)}c.stroke();
  }
  if(st==='kel'){
    c.fillStyle=L.hair;c.beginPath();c.ellipse(-W+.5,hy-3,2.4,5,.1,0,7);c.fill();c.beginPath();c.ellipse(W-.5,hy-3,2.4,5,-.1,0,7);c.fill();
    c.fillStyle='#14141a';c.beginPath();c.arc(0,hy-5.4,W+.8,Math.PI,0);c.lineTo(W+.8,hy-5);c.lineTo(-W-.8,hy-5);c.closePath();c.fill();
    c.fillStyle='#f4f1e8';for(const[a,b]of[[-6.4,-7.6],[-2.2,-10.4],[2.2,-10.4],[6.4,-7.6],[0,-7.4]]){c.fillRect(a-.45,hy+b-1.5,.9,3);c.fillRect(a-1.5,hy+b-.45,3,.9)}
  }
  if(st==='mil'){
    c.fillStyle=L.hair;for(const sd of[-1,1]){c.beginPath();c.ellipse(sd*(W+.1),hy+1,2.2,7.4,sd*.08,0,7);c.fill()}
    hairCap(c,L,hy,6.2,-1.6);
    c.fillStyle=L.hair;for(const[a,b,r]of[[-10,-5.6,3.2],[-8,-10,3.6],[-4,-13,3.8],[.8,-14.2,4],[5.4,-12.8,3.8],[9,-9,3.4],[10.4,-4.8,2.8],[-6.2,-6.8,2.2],[-1.8,-7,2.4],[3.6,-7,2.2]])disc(c,a,hy+b,r);
    c.strokeStyle='#54443a';c.lineWidth=.6;c.beginPath();c.moveTo(-7,hy-9);c.quadraticCurveTo(-3,hy-15,1,hy-14);c.moveTo(1,hy-10);c.quadraticCurveTo(6,hy-14,9,hy-9);c.stroke();
  }
  if(st==='din'){
    c.fillStyle='#77746e';for(const sd of[-1,1]){c.beginPath();c.ellipse(sd*(W+.1),hy-3.6,2.2,4.8,sd*.1,0,7);c.fill()}
    hairCap(c,L,hy,7.2,-3);
    c.strokeStyle='#5a5650';c.lineWidth=.6;c.beginPath();c.moveTo(-7,hy-7);c.quadraticCurveTo(-1,hy-13,8,hy-8.4);c.stroke();
  }
  if(st==='men'){
    hairCap(c,L,hy,6.8,-1.8);
    c.fillStyle=L.hair;c.beginPath();c.ellipse(1,hy-10,W-.6,3.6,-.08,0,7);c.fill();
    c.strokeStyle='#c9c6bf';c.lineWidth=.6;c.beginPath();c.moveTo(-5.6,hy-8);c.quadraticCurveTo(0,hy-13,8,hy-9.4);c.moveTo(-3,hy-7.6);c.quadraticCurveTo(2,hy-10.6,8.4,hy-7.6);c.stroke();
  }
  if(st==='fux'){
    c.fillStyle=L.hair;for(const sd of[-1,1]){c.beginPath();c.ellipse(sd*(W+.6),hy-2,3,6.4,sd*.08,0,7);c.fill()}
    hairCap(c,L,hy,6.4,-1.4);
    c.fillStyle=L.hair;c.beginPath();c.ellipse(.8,hy-11,W+1.6,5.4,-.06,0,7);c.fill();
    c.strokeStyle='#c9c6bf';c.lineWidth=.6;c.beginPath();c.moveTo(-8,hy-8);c.quadraticCurveTo(-3,hy-16,3,hy-14.6);c.moveTo(-1,hy-8.4);c.quadraticCurveTo(4,hy-14,10,hy-8);c.stroke();
  }
  if(st==='car'){hairCap(c,L,hy,5.4,1.4);c.strokeStyle='#c4c1ba';c.lineWidth=.6;c.beginPath();c.moveTo(-1,hy-11);c.quadraticCurveTo(-7,hy-9,-9,hy-1);c.moveTo(1,hy-11);c.quadraticCurveTo(7,hy-9,9,hy-1);c.stroke()}
  if(st==='buk'){
    hairCap(c,L,hy,8.6,-2);
    c.strokeStyle='#4a4038';c.lineWidth=.6;c.beginPath();for(const q of[-5,-2,1.5,5]){c.moveTo(q,hy-9.4);c.quadraticCurveTo(q*1.05,hy-10.8,q*.92,hy-12)}c.stroke();
  }
  if(st==='vit'||st==='ani'){hairCap(c,L,hy,5.4,1.6);c.strokeStyle=st==='vit'?'#c9c2ac':'#7a5038';c.lineWidth=.6;c.beginPath();c.moveTo(0,hy-13);c.lineTo(0,hy-5.6);c.stroke()}
  if(st==='ana'){
    hairCap(c,L,hy,5.4,1.2);
    c.fillStyle='#e8dcc4';for(const sd of[-1,1]){c.beginPath();c.ellipse(sd*(W+3.6),hy-12,3.6,5,sd*.5,0,7);c.fill()}
    c.fillStyle='#5a3a22';for(const sd of[-1,1]){disc(c,sd*(W+4.4),hy-13.4,1.5);disc(c,sd*(W+2.6),hy-9.8,1.2)}
    c.fillStyle='#6a4a2a';c.beginPath();c.ellipse(0,hy-9.6,W+4.4,3.2,0,0,7);c.fill();rr(c,-7,hy-22,14,13,4.4);
    c.fillStyle='#e8dcc4';c.fillRect(-7,hy-12.4,14,1.8);
  }
  if(st==='rtn'){
    hairCap(c,L,hy,7,-2);
    c.fillStyle=L.hair;c.beginPath();c.ellipse(.6,hy-11,W-.6,4.2,-.08,0,7);c.fill();
    c.strokeStyle='#5a4a40';c.lineWidth=.6;c.beginPath();c.moveTo(-6.4,hy-9);c.quadraticCurveTo(0,hy-14.6,7,hy-9.6);c.stroke();
  }
  if(st==='ney'){
    hairCap(c,{...L,hair:'#3a302a'},hy,6.6,-3);
    c.fillStyle=L.hair;for(const[a,b,r]of[[-6,-11,2.6],[-3,-13,2.8],[.4,-13.8,3],[4,-13,2.8],[6.6,-10.8,2.5],[-1.6,-10.4,2.4],[2.6,-10.6,2.4]])disc(c,a,hy+b,r);
  }
  if(st==='gus'){
    hairCap(c,{...L,hair:'#241e1a'},hy,6.6,-2.4);
    c.fillStyle=L.hair;c.beginPath();c.ellipse(0,hy-11.6,W-.4,4.6,0,0,7);c.fill();
    c.strokeStyle='#4a4038';c.lineWidth=.6;c.beginPath();c.moveTo(-6,hy-10);c.quadraticCurveTo(0,hy-15.4,6.4,hy-10.6);c.stroke();
  }
  if(st==='xux'){
    hairCap(c,L,hy,5.8,-2.2);
    c.fillStyle=L.hair;c.beginPath();c.ellipse(1.6,hy-10.4,W-1,4,-.2,0,7);c.fill();
    c.strokeStyle='#cfc8b2';c.lineWidth=.6;c.beginPath();c.moveTo(-6,hy-8);c.quadraticCurveTo(0,hy-14,7,hy-8.6);c.stroke();
  }
  if(st==='somb'){
    hairCap(c,L,hy,6,-2.4);
    c.fillStyle='#c9a35e';rr(c,-6.6,hy-21,13.2,12.4,5);
    c.fillStyle='#6a4a2a';c.fillRect(-6.6,hy-11.4,13.2,2);
    c.fillStyle='#c9a35e';c.beginPath();c.ellipse(0,hy-9.2,W+9,3.8,0,0,7);c.fill();
    c.strokeStyle='#a8834a';c.lineWidth=.8;c.beginPath();c.ellipse(0,hy-9.2,W+6.6,2.6,0,0,7);c.stroke();
  }
  if(st==='kepi'){
    hairCap(c,L,hy,6.4,-3);
    c.fillStyle='#3f4a2c';c.fillRect(-8.8,hy-17,17.6,8.4);
    c.beginPath();c.ellipse(0,hy-17,8.8,2.6,0,0,7);c.fill();
    c.fillStyle='#d9a400';c.fillRect(-8.8,hy-12.4,17.6,1.6);
    c.fillStyle='#17181d';rr(c,-10,hy-9.2,20,2.4,1);
  }
  if(st==='sta'){
    hairCap(c,L,hy,7.6,-2);
    c.strokeStyle='#524c46';c.lineWidth=.5;c.beginPath();for(const q of[-5,0,5]){c.moveTo(q,hy-8);c.quadraticCurveTo(q*1.05,hy-10.6,q*.96,hy-12.4)}c.stroke();
  }
  if(st==='elo'){
    hairCap(c,L,hy,7.8,-2.4);
    c.fillStyle=L.hair;c.beginPath();c.ellipse(-1.6,hy-11,W-.8,4.2,-.14,0,7);c.fill();disc(c,W-1.4,hy-8.6,2.6);disc(c,-W+1.6,hy-6.6,2.6);
    c.strokeStyle='#7a5f48';c.lineWidth=.6;c.beginPath();c.moveTo(-7,hy-8);c.quadraticCurveTo(-3,hy-14.4,3,hy-13.6);c.moveTo(-3,hy-9);c.quadraticCurveTo(3,hy-13,9,hy-9);c.stroke();
  }
  if(st==='mar'){c.fillStyle=L.hair;disc(c,0,hy-14.2,3.8);hairCap(c,L,hy,7.2,-2.8);c.strokeStyle='#b4afa8';c.lineWidth=.6;c.beginPath();c.moveTo(0,hy-7.4);c.quadraticCurveTo(-5,hy-9,-8,hy-4);c.moveTo(0,hy-7.4);c.quadraticCurveTo(5,hy-9,8,hy-4);c.moveTo(0,hy-7.4);c.lineTo(0,hy-13);c.stroke()}
  if(st==='len'){c.fillStyle=L.hair;for(const sd of[-1,1]){c.beginPath();c.ellipse(sd*(W-.2),hy-3.6,1.5,3.8,sd*.1,0,7);c.fill()}c.fillStyle='#ffffff55';c.beginPath();c.ellipse(-3,hy-7.8,3.4,1.9,-.4,0,7);c.fill()}
  if(st==='kim'){
    hairCap(c,L,hy,5.2,-1.6);
    c.fillStyle=L.hair;for(const[a,b,r]of[[-7.6,-8,2.8],[-4.4,-11,3],[-.6,-12.4,3.2],[3.4,-12,3],[7,-9,2.8],[-2,-7.6,1.8],[2.4,-7.6,1.8]])disc(c,a,hy+b,r);
    c.strokeStyle='#4a3e34';c.lineWidth=.6;c.beginPath();c.moveTo(-5,hy-9);c.quadraticCurveTo(-2,hy-13,1,hy-12);c.moveTo(2,hy-12);c.quadraticCurveTo(5,hy-12,6.6,hy-9);c.stroke();
  }
  if(st==='ren'){
    hairCap(c,L,hy,5.2,-1.4);
    c.fillStyle=L.hair;c.beginPath();c.moveTo(-W,hy-4);c.bezierCurveTo(-W,hy-13.6,0,hy-15,5,hy-13.6);c.bezierCurveTo(W+1,hy-12.6,W+.6,hy-7.4,W,hy-4.4);c.quadraticCurveTo(W-2.4,hy-8.4,2,hy-7.8);c.quadraticCurveTo(-4.6,hy-7.2,-W,hy-4);c.fill();
    c.strokeStyle='#5a4638';c.lineWidth=.6;c.beginPath();c.moveTo(-6,hy-8);c.quadraticCurveTo(-1,hy-13,6,hy-11.4);c.stroke();
  }
  if(st==='man'){c.fillStyle=L.hair;c.beginPath();c.ellipse(-W+.5,hy-3,2,4.6,.1,0,7);c.fill();c.beginPath();c.ellipse(W-.5,hy-3,2,4.6,-.1,0,7);c.fill();hairCap(c,L,hy,7.8,-2.4)}
  if(st==='ene'){c.fillStyle=L.hair;c.beginPath();c.ellipse(-W+.5,hy-2.6,2.2,5,.1,0,7);c.fill();c.beginPath();c.ellipse(W-.5,hy-2.6,2.2,5,-.1,0,7);c.fill();c.fillStyle='#ffffff55';c.beginPath();c.ellipse(-3,hy-7.8,3.4,1.9,-.4,0,7);c.fill()}
  if(st==='edu'){hairCap(c,L,hy,5,1.4);c.strokeStyle='#5a4638';c.lineWidth=.5;c.beginPath();c.moveTo(0,hy-11);c.lineTo(0,hy-6);c.stroke()}
  if(st==='cai'){
    c.fillStyle='#77746e';for(const sd of[-1,1]){c.beginPath();c.ellipse(sd*(W+.4),hy+3,2.8,6.4,sd*.12,0,7);c.fill()}
    hairCap(c,L,hy,6.2,.4);
    c.fillStyle=L.hair;c.beginPath();c.ellipse(.4,hy-9.6,W+.6,4.4,-.05,0,7);c.fill();for(const sd of[-1,1]){c.beginPath();c.ellipse(sd*(W-.4),hy-4,2.8,5.6,sd*.1,0,7);c.fill()}
    c.strokeStyle='#eceae5';c.lineWidth=.7;c.beginPath();c.moveTo(-7,hy-7.4);c.quadraticCurveTo(-2,hy-13.4,6,hy-11.6);c.moveTo(-3.6,hy-7.8);c.quadraticCurveTo(2,hy-11,8,hy-8);c.stroke();
  }
  if(st==='zem'){
    hairCap(c,L,hy,6.8,-1.6);
    c.fillStyle=L.hair;c.beginPath();c.ellipse(0,hy-9.6,W-.4,3.2,0,0,7);c.fill();
    c.strokeStyle='#a9a69f';c.lineWidth=.7;c.beginPath();for(const q of[-5.4,-2.2,1.2,4.6]){c.moveTo(q*.95,hy-7.6);c.quadraticCurveTo(q,hy-8.8,q*1.02,hy-10)}c.stroke();
  }
  if(st==='cur'){
    c.fillStyle='#8a8680';c.beginPath();c.ellipse(-W+.7,hy-2.6,1.8,3.6,.1,0,7);c.fill();c.beginPath();c.ellipse(W-.7,hy-2.6,1.8,3.6,-.1,0,7);c.fill();
    hairCap(c,L,hy,7.4,-3.6);
    c.strokeStyle='#6a6660';c.lineWidth=.6;c.beginPath();c.moveTo(-5,hy-9.4);c.quadraticCurveTo(0,hy-12,5,hy-9.8);c.stroke();
  }
  if(st==='dat'){
    hairCap(c,L,hy,5.8,-1);
    c.fillStyle=L.hair;c.beginPath();c.moveTo(-W-.6,hy-3.4);c.bezierCurveTo(-W-.8,hy-14,W+.8,hy-14.6,W+.6,hy-3.4);c.quadraticCurveTo(W-3,hy-8.6,0,hy-8);c.quadraticCurveTo(-W+3,hy-7.6,-W-.6,hy-3.4);c.fill();
    c.strokeStyle='#d0cdc6';c.lineWidth=.7;c.beginPath();c.moveTo(-7,hy-7.6);c.quadraticCurveTo(-2,hy-13,6,hy-11);c.moveTo(-3,hy-8.4);c.quadraticCurveTo(2,hy-11,8,hy-8);c.stroke();
  }
  if(st==='tru'){
    hairCap(c,L,hy,5.4,-1.8);
    c.fillStyle=L.hair;c.beginPath();c.moveTo(-W-1,hy-3.4);c.bezierCurveTo(-W-1.6,hy-14.4,2,hy-16,8,hy-13.6);c.bezierCurveTo(W+3,hy-12.4,W+2.6,hy-7.4,W+.8,hy-4.4);c.quadraticCurveTo(W-3,hy-8.4,2.4,hy-7.8);c.quadraticCurveTo(-5,hy-7.6,-W-1,hy-3.4);c.fill();
    c.strokeStyle='#f0d796';c.lineWidth=.8;c.beginPath();c.moveTo(-8,hy-6.6);c.quadraticCurveTo(-3,hy-13.6,6,hy-12.2);c.moveTo(-5,hy-7.6);c.quadraticCurveTo(0,hy-11,8.4,hy-9);c.stroke();
  }
  if(st==='mad'){
    c.fillStyle='#6a6660';c.beginPath();c.ellipse(-W+.7,hy-2.6,1.8,3.6,.1,0,7);c.fill();c.beginPath();c.ellipse(W-.7,hy-2.6,1.8,3.6,-.1,0,7);c.fill();
    hairCap(c,L,hy,6,-3.4);c.fillStyle=L.hair;c.beginPath();c.ellipse(.4,hy-9.4,W,3.6,-.05,0,7);c.fill();
    c.strokeStyle='#4a4644';c.lineWidth=.5;c.beginPath();c.moveTo(-6,hy-9.6);c.quadraticCurveTo(0,hy-12.4,6,hy-10);c.stroke();
  }
  if(st==='mus'){
    c.fillStyle='#5f6a55';c.beginPath();c.ellipse(0,hy-10.6,W+3.4,5.8,0,0,7);c.fill();
    c.fillStyle='#b31e26';c.fillRect(-W-.4,hy-9,2*W+.8,2.8);
    c.fillStyle='#17140f';c.beginPath();c.ellipse(0,hy-5.8,W+1.2,2.2,0,0,7);c.fill();
    c.fillStyle='#d9a400';disc(c,0,hy-11.6,2.5);
  }
  if(st==='put'){hairCap(c,L,hy,8.6,-2.8);c.strokeStyle='#d6c8ac';c.lineWidth=.5;c.beginPath();c.moveTo(-5,hy-10);c.quadraticCurveTo(0,hy-11.6,5,hy-10);c.stroke()}
  if(st==='xi'){hairCap(c,L,hy,5.6,-1.6);c.fillStyle=L.hair;c.beginPath();c.ellipse(.4,hy-9.2,W,3.6,-.06,0,7);c.fill();c.strokeStyle='#77757a';c.lineWidth=.6;c.beginPath();c.moveTo(-6,hy-8.8);c.quadraticCurveTo(0,hy-12,6,hy-9.6);c.moveTo(-W+1,hy-3.6);c.lineTo(-W+1.6,hy-6.4);c.moveTo(W-1,hy-3.6);c.lineTo(W-1.6,hy-6.4);c.stroke()}
  if(st==='che'){
    hairCap(c,L,hy,4.8,1);
    c.fillStyle='#14141a';c.beginPath();c.ellipse(1.2,hy-9.4,W+2.6,4.6,-.14,0,7);c.fill();c.beginPath();c.ellipse(-1,hy-12,W-.6,3.6,-.2,0,7);c.fill();
    c.fillStyle=L.bigStar?'#f2b705':'#d9d2b8';star(c,2.4,hy-10,L.bigStar?3:2);
  }
  if(st==='veio'){
    c.fillStyle='rgba(120,105,90,.28)';c.beginPath();c.ellipse(-W+.5,hy-2.4,1.1,3.2,.08,0,7);c.fill();c.beginPath();c.ellipse(W-.5,hy-2.4,1.1,3.2,-.08,0,7);c.fill();
    c.fillStyle='#ffffff66';c.beginPath();c.ellipse(-3,hy-7.6,3.2,1.7,-.4,0,7);c.fill();
  }
  if(st==='bald'){c.fillStyle='#ffffff77';c.beginPath();c.ellipse(-3.4,hy-7,3.6,2.1,-.4,0,7);c.fill()}
  /* barba */
  if(L.scruff){c.fillStyle='rgba(30,22,16,.22)';beardShape(c,hy,W,H)}
  if(L.stacheBig){c.fillStyle=L.stacheC||'#14110f';c.beginPath();c.moveTo(-6.6,hy+4.8);c.quadraticCurveTo(-3.4,hy+1.2,0,hy+2.2);c.quadraticCurveTo(3.4,hy+1.2,6.6,hy+4.8);c.quadraticCurveTo(0,hy+4.4,-6.6,hy+4.8);c.fill()}
  if(L.goatee){c.fillStyle=L.goateeC||'rgba(130,122,110,.55)';if(!L.noChin){c.beginPath();c.ellipse(0,hy+8.6,3.4,2.4,0,0,7);c.fill()}rr(c,-4.4,hy+2.6,8.8,1.3,.6)}
  if(L.beard==='full'){c.fillStyle=L.beardC;beardShape(c,hy,W,H);rr(c,-5.2,hy+2.2,10.4,2.1,1)}
  if(L.beard==='short'){c.fillStyle=L.beardC;beardShape(c,hy,W,H);rr(c,-4.8,hy+2.3,9.6,1.9,.9)}
  if(L.beard==='huge'){c.fillStyle=L.beardC;for(const[a,b,r]of[[-6,5,5.4],[6,5,5.4],[0,7,7],[-4,12,5.4],[4,12,5.4],[0,16,4.8]])disc(c,a,hy+b,r);c.fillStyle='#17140f';c.beginPath();c.moveTo(-6.4,hy+4.6);c.quadraticCurveTo(-3,hy+1.6,0,hy+2.6);c.quadraticCurveTo(3,hy+1.6,6.4,hy+4.6);c.quadraticCurveTo(0,hy+5.6,-6.4,hy+4.6);c.fill()}
  /* olhos */
  for(const sd of[-1,1]){
    const ex=sd*3.7,ey=hy-.8;
    c.fillStyle='#fff';c.beginPath();c.ellipse(ex,ey,2.35*es,1.55*es,0,0,7);c.fill();
    c.fillStyle=L.iris||'#3a2a1c';disc(c,ex,ey+.1,1.2*es);c.fillStyle='#0d0a08';disc(c,ex,ey+.1,.62*es);
    c.strokeStyle='#2b1c14';c.lineWidth=.8;c.beginPath();c.ellipse(ex,ey,2.45*es,1.65*es,0,Math.PI,0);c.stroke();
    if(L.bags){c.strokeStyle='rgba(90,45,25,.4)';c.lineWidth=.7;c.beginPath();c.arc(ex,ey+1.9,2,.2*Math.PI,.8*Math.PI);c.stroke()}
    if(L.squint){
      c.fillStyle=skin;c.beginPath();c.ellipse(ex,ey+1.9,2.6,1.1,0,0,7);c.fill();
      c.strokeStyle='rgba(90,45,25,.5)';c.lineWidth=.55;c.beginPath();for(const q of[-1.1,0,1.1]){c.moveTo(ex+sd*2.5,ey+q*.5);c.lineTo(ex+sd*4.1,ey+q*1.3)}c.stroke();
    }
  }
  if(L.wr){c.strokeStyle='rgba(90,45,25,.32)';c.lineWidth=.7;for(const q of[6.2,4.8]){c.beginPath();c.moveTo(-5,hy-q);c.quadraticCurveTo(0,hy-q-.9,5,hy-q);c.stroke()}}
  /* sobrancelhas, nariz e boca */
  if(L.brow){const a=L.stern?1.9:-.3;c.strokeStyle=L.browC;c.lineWidth=L.brow;c.lineCap='round';c.beginPath();c.moveTo(-6.6,hy-3.8);c.quadraticCurveTo(-4,hy-4.9,-1.6,hy-3.8+a);c.moveTo(6.6,hy-3.8);c.quadraticCurveTo(4,hy-4.9,1.6,hy-3.8+a);c.stroke()}
  const n=L.nose||1;
  c.strokeStyle='rgba(90,45,25,.6)';c.lineWidth=.9;c.beginPath();c.moveTo(.8,hy-1.6);c.quadraticCurveTo(1.7*n,hy+1.6,1.5*n,hy+2.2);c.quadraticCurveTo(0,hy+3.1,-1.4*n,hy+2.2);c.stroke();
  if(L.beard==='huge'){/* a barba cobre a boca */}
  else if(L.stern){c.strokeStyle='#5a3028';c.lineWidth=1.5;c.beginPath();c.moveTo(-3.2,hy+5.2);c.quadraticCurveTo(0,hy+4.6,3.2,hy+5.2);c.stroke()}
  else if(L.smile){
    const sr=L.smileR||3.5;
    c.fillStyle='#fff';c.beginPath();c.arc(0,hy+3.8,sr,.08*Math.PI,.92*Math.PI);c.closePath();c.fill();c.strokeStyle=L.lip;c.lineWidth=L.smileR?1:1.4;c.stroke();
    if(L.naso){c.strokeStyle='rgba(90,45,25,.42)';c.lineWidth=.7;c.beginPath();c.moveTo(-3.2,hy+1.6);c.quadraticCurveTo(-sr-1.4,hy+2.6,-sr-1,hy+5.2);c.moveTo(3.2,hy+1.6);c.quadraticCurveTo(sr+1.4,hy+2.6,sr+1,hy+5.2);c.stroke()}
  }
  else if(L.talk){c.fillStyle='#5a2a24';c.beginPath();c.ellipse(0,hy+5.6,2.9,1.7,0,0,7);c.fill();c.fillStyle='#fff';c.fillRect(-1.9,hy+4.2,3.8,.9)}
  else if(L.beard){c.strokeStyle='#8a4a3c';c.lineWidth=1.3;c.beginPath();c.moveTo(-2.6,hy+5);c.quadraticCurveTo(0,hy+6,2.6,hy+5);c.stroke()}
  else if(L.lip){c.fillStyle=L.lip;c.beginPath();c.moveTo(-3.2,hy+5.1);c.quadraticCurveTo(0,hy+3.8,3.2,hy+5.1);c.quadraticCurveTo(0,hy+7,-3.2,hy+5.1);c.fill()}
  else if(L.purse){c.fillStyle='#a85a4a';c.beginPath();c.ellipse(0,hy+5.1,2.2,1.3,0,0,7);c.fill();c.strokeStyle='#7a3a30';c.lineWidth=.5;c.beginPath();c.moveTo(-2.2,hy+5.1);c.lineTo(2.2,hy+5.1);c.stroke()}
  else if(L.grin){c.strokeStyle='#7a4034';c.lineWidth=1.3;c.beginPath();c.moveTo(-4.2,hy+4.4);c.quadraticCurveTo(0,hy+7.2,4.2,hy+4.4);c.stroke()}
  else{c.strokeStyle='#7a4034';c.lineWidth=L.thin?.9:1.2;c.beginPath();c.moveTo(-3.2,hy+5);c.quadraticCurveTo(0,hy+6.2,3.4,hy+4.6);c.stroke()}
  if(L.glasses==='thin'){c.strokeStyle='rgba(150,155,165,.9)';c.lineWidth=.6;c.strokeRect(-7.1,hy-3,6.2,4.4);c.strokeRect(.9,hy-3,6.2,4.4);c.beginPath();c.moveTo(-.9,hy-1.4);c.lineTo(.9,hy-1.4);c.stroke()}
  if(L.fangs){c.fillStyle='#fff';for(const sd of[-1,1]){c.beginPath();c.moveTo(sd*1.4,hy+5.6);c.lineTo(sd*2.2,hy+8.8);c.lineTo(sd*3.1,hy+5.2);c.fill()}}
  if(L.glasses==='big'){c.strokeStyle='#1a1612';c.lineWidth=1.25;c.strokeRect(-7.8,hy-3.8,7,6.2);c.strokeRect(.8,hy-3.8,7,6.2);c.beginPath();c.moveTo(-.8,hy-1.8);c.lineTo(.8,hy-1.8);c.stroke()}
  if(L.glasses==='cat'){c.strokeStyle=L.glassC||'#ecccc0';c.lineWidth=L.glassW||1.05;c.lineJoin='round';for(const sd of[-1,1]){c.beginPath();c.moveTo(sd*.9,hy-2.4);c.lineTo(sd*7.4,hy-3.6);c.lineTo(sd*6.6,hy+1);c.quadraticCurveTo(sd*3.6,hy+2.6,sd*.9,hy+.6);c.closePath();c.stroke()}c.beginPath();c.moveTo(-.9,hy-1.6);c.lineTo(.9,hy-1.6);c.stroke()}
  if(L.glasses==='round'){c.strokeStyle='#2a2a30';c.lineWidth=.95;c.beginPath();c.arc(-3.7,hy-.8,3.3,0,7);c.moveTo(7,hy-.8);c.arc(3.7,hy-.8,3.3,0,7);c.moveTo(-.5,hy-1.2);c.lineTo(.5,hy-1.2);c.stroke()}
  if(L.glasses==='tort'){
    c.strokeStyle='#6a4020';c.lineWidth=.7;c.strokeRect(-7.2,hy-3.2,6.4,4.9);c.strokeRect(.8,hy-3.2,6.4,4.9);c.beginPath();c.moveTo(-.8,hy-1.4);c.lineTo(.8,hy-1.4);c.stroke();
    c.fillStyle='#2b1a0c';for(const[a,b]of[[-6.2,-3.2],[-3.4,-3.2],[-7.2,0],[-1.2,1.7],[1.6,-3.2],[4.6,-3.2],[7.2,-.6],[3.2,1.7]])disc(c,a,hy+b,.28);
  }
  if(L.glasses==='rect'){c.strokeStyle='#26262a';c.lineWidth=.9;c.strokeRect(-6.7,hy-2.9,5.8,4);c.strokeRect(.9,hy-2.9,5.8,4);c.beginPath();c.moveTo(-.9,hy-1.4);c.lineTo(.9,hy-1.4);c.stroke()}
  gear(c,L,'h',t,hy,bw);
  c.restore();
}
function pole(c,x,top){c.fillStyle='#6a4a2a';c.fillRect(x-1,top,2,-top)}
function tenda(c,a,b){c.fillStyle='#6a4a2a';c.fillRect(-24,-46,2,44);c.fillRect(22,-46,2,44);for(let i=0;i<6;i++){c.fillStyle=i%2?b:a;c.fillRect(-27+i*9,-54,9,10)}}
function miniCar(c,x,col,w){c.fillStyle=col;rr(c,x-w/2,-14,w,11,3);c.fillStyle='#bfe3f5';rr(c,x-w/4,-19,w/2,6,2);c.fillStyle='#22242a';disc(c,x-w/3,-3,3.2);disc(c,x+w/3,-3,3.2)}
function vaca(c,x){c.fillStyle='#f0e8d8';rr(c,x-8,-13,15,9,3);c.fillStyle='#6a4a2a';disc(c,x-3,-10,2.2);c.fillStyle='#f0e8d8';disc(c,x+8,-14,4.2);c.fillStyle='#5a3d27';c.fillRect(x-6,-5,2,5);c.fillRect(x+3,-5,2,5);c.strokeStyle='#d9c7a0';c.lineWidth=1.3;c.beginPath();c.moveTo(x+6,-18);c.lineTo(x+4,-21);c.moveTo(x+10,-18);c.lineTo(x+12,-21);c.stroke()}
/* suporte de madeira onde o objeto da evolução fica exposto */
function suporte(c){c.fillStyle='#5a4630';c.fillRect(-1.2,-22,2.4,22);c.fillStyle='#3a2e22';rr(c,-7,-24,14,3,1.4)}
function pent(c,x,y,r){c.beginPath();for(let i=0;i<5;i++){const a=-Math.PI/2+i*1.2566;c.lineTo(x+Math.cos(a)*r,y+Math.sin(a)*r)}c.fill()}
/* objetos sem texto, desenhados em volta de (0,0) num espaço de uns 24 px */
const ICON={
  tesoura:c=>{c.strokeStyle='#8a909c';c.lineWidth=1.6;c.beginPath();c.moveTo(0,0);c.lineTo(-4.4,4.4);c.moveTo(0,0);c.lineTo(4.4,4.4);c.stroke();c.fillStyle='#c9ced6';for(const s of[-1,1]){c.save();c.rotate(s*.42);c.beginPath();c.moveTo(-1.8,1);c.lineTo(0,-13);c.lineTo(1.8,1);c.fill();c.restore()}c.strokeStyle='#d0162a';c.lineWidth=2.4;for(const s of[-1,1]){c.beginPath();c.arc(s*6,7.6,3.6,0,7);c.stroke()}c.fillStyle='#4b515c';disc(c,0,0,1.5)},
  mandioca:c=>{c.save();c.rotate(-.6);c.fillStyle='#7a4a2a';c.beginPath();c.ellipse(0,0,12,4.4,0,0,7);c.fill();c.fillStyle='#f4ead0';c.beginPath();c.ellipse(11,0,1.6,3.4,0,0,7);c.fill();c.restore();c.save();c.rotate(-.2);c.fillStyle='#8a5a32';c.beginPath();c.ellipse(-2,6,9,3.4,0,0,7);c.fill();c.fillStyle='#f4ead0';c.beginPath();c.ellipse(6.6,6,1.3,2.8,0,0,7);c.fill();c.restore()},
  alvo:c=>{for(const[r,k]of[[11,'#d0162a'],[8,'#fff'],[5,'#d0162a'],[2.2,'#fff']]){c.fillStyle=k;disc(c,0,0,r)}c.strokeStyle='#2a2a2e';c.lineWidth=1.4;c.beginPath();c.moveTo(0,0);c.lineTo(9,-9);c.stroke();c.fillStyle='#2456a6';c.beginPath();c.moveTo(9,-9);c.lineTo(13,-8);c.lineTo(10,-12);c.fill()},
  prancheta:c=>{c.fillStyle='#8a5a30';rr(c,-8,-11,16,22,2);c.fillStyle='#fff';c.fillRect(-6,-7,12,16);c.fillStyle='#9aa0a8';for(let i=0;i<4;i++)c.fillRect(-4.5,-4+i*3.4,9,1.2);c.fillStyle='#c9ced6';rr(c,-4,-12.5,8,4,1)},
  apito:c=>{c.strokeStyle='#d0162a';c.lineWidth=1.4;c.beginPath();c.moveTo(-8,0);c.quadraticCurveTo(-13,-11,-4,-11);c.stroke();c.fillStyle='#c9ced6';disc(c,-2,2,7);c.fillRect(-2,-5,14,6);c.fillStyle='#8a909c';disc(c,-2,2,3);c.fillStyle='#1d1a16';c.fillRect(4,-5,3,2)},
  trigo:c=>{c.strokeStyle='#b8902a';c.lineWidth=1.4;c.fillStyle='#e0b440';for(const a of[-.35,0,.35]){c.save();c.rotate(a);c.beginPath();c.moveTo(0,12);c.lineTo(0,-4);c.stroke();for(let i=0;i<4;i++){c.beginPath();c.ellipse(-1.8,-4-i*2.6,1.4,2.4,-.5,0,7);c.fill();c.beginPath();c.ellipse(1.8,-4-i*2.6,1.4,2.4,.5,0,7);c.fill()}c.restore()}c.fillStyle='#7a4a2a';c.fillRect(-4,6,8,2.4)},
  microfone:c=>{c.save();c.translate(-2,-5);c.rotate(-.5);c.fillStyle='#17181d';rr(c,-2.4,4,4.8,14,2);c.restore();c.fillStyle='#9aa0a8';disc(c,-2,-5,6.4);c.strokeStyle='#5a5f68';c.lineWidth=.8;c.beginPath();for(const d of[-3,0,3]){const w=Math.sqrt(41-d*d);c.moveTo(-2-w,-5+d);c.lineTo(-2+w,-5+d)}c.stroke()},
  mascaras:c=>{for(const[x,y,k,s,r]of[[-4,-1,'#f2b705',1,-.25],[4,2,'#5a86c8',-1,.25]]){c.save();c.translate(x,y);c.rotate(r);c.fillStyle=k;c.beginPath();c.ellipse(0,0,6.4,8,0,0,7);c.fill();c.fillStyle='#1d1a16';disc(c,-2.4,-2.4,1.3);disc(c,2.4,-2.4,1.3);c.strokeStyle='#1d1a16';c.lineWidth=1.2;c.beginPath();if(s>0)c.arc(0,1.4,3,.25,Math.PI-.25);else c.arc(0,6,3,Math.PI+.25,-.25);c.stroke();c.restore()}},
  claquete:c=>{c.fillStyle='#17181d';c.fillRect(-10,-3,20,13);c.save();c.translate(-10,-3);c.rotate(-.3);c.fillRect(0,-4,20,4);c.fillStyle='#fff';for(let i=0;i<4;i++){c.beginPath();c.moveTo(2+i*5,-4);c.lineTo(5+i*5,-4);c.lineTo(3+i*5,0);c.lineTo(i*5,0);c.fill()}c.restore();c.fillStyle='#fff';c.fillRect(-7,1,14,1.2);c.fillRect(-7,5,9,1.2)},
  laptop:c=>{c.fillStyle='#2e3440';rr(c,-10,-10,20,14,1.5);c.fillStyle='#2456a6';c.fillRect(-8,-8,16,10);c.fillStyle='#fff';c.beginPath();c.moveTo(-2,-6);c.lineTo(3,-3);c.lineTo(-2,0);c.fill();c.fillStyle='#9aa0a8';c.beginPath();c.moveTo(-12,4);c.lineTo(12,4);c.lineTo(10,7);c.lineTo(-10,7);c.fill()},
  carta:c=>{c.fillStyle='#f4ead5';c.fillRect(-11,-7,22,15);c.strokeStyle='#b9a070';c.lineWidth=1;c.strokeRect(-11,-7,22,15);c.beginPath();c.moveTo(-11,-7);c.lineTo(0,2);c.lineTo(11,-7);c.stroke();c.fillStyle='#a8122a';disc(c,0,2,2.6)},
  biblia:c=>{c.fillStyle='#2a1c14';rr(c,-8,-11,16,21,2);c.fillStyle='#f4ead5';c.fillRect(6,-9,2,17);c.fillStyle='#d9a400';c.fillRect(-1.2,-7,2.4,12);c.fillRect(-4.4,-4,8.8,2.4)},
  vassoura:c=>{c.save();c.rotate(.5);c.fillStyle='#8a5a30';c.fillRect(-1.2,-14,2.4,18);c.fillStyle='#e0b440';c.beginPath();c.moveTo(-3,3);c.lineTo(3,3);c.lineTo(7,13);c.lineTo(-7,13);c.fill();c.strokeStyle='#b8902a';c.lineWidth=.7;c.beginPath();for(let i=-4;i<=4;i+=2){c.moveTo(i*.5,4);c.lineTo(i*1.4,13)}c.stroke();c.fillStyle='#d0162a';c.fillRect(-3.4,2,6.8,2.4);c.restore()},
  algemas:c=>{c.strokeStyle='#c9ced6';c.lineWidth=2.6;for(const x of[-6,6]){c.beginPath();c.arc(x,3,5,0,7);c.stroke()}c.strokeStyle='#8a909c';c.lineWidth=1.4;c.beginPath();c.moveTo(-3,-4);c.lineTo(3,-4);c.stroke();c.fillStyle='#8a909c';c.fillRect(-8,-5.6,4,3.4);c.fillRect(4,-5.6,4,3.4)},
  distintivo:c=>{c.fillStyle='#b8860b';star(c,0,0,12.4);c.fillStyle='#e0b020';star(c,0,0,11);c.fillStyle='#2456a6';disc(c,0,0,4.4);c.fillStyle='#f6cf1d';disc(c,0,0,1.8)},
  jornal:c=>{c.fillStyle='#ece6d6';c.fillRect(-10,-11,20,22);c.fillStyle='#2a2a2e';c.fillRect(-8,-9,16,3.4);c.fillStyle='#9aa0a8';c.fillRect(-8,-4,7,6);for(let i=0;i<4;i++)c.fillRect(1,-4+i*2.2,7,1.1);for(let i=0;i<3;i++)c.fillRect(-8,4+i*2.4,16,1.1)},
  foiceMartelo:c=>{c.fillStyle='#c8102e';disc(c,0,0,11.5);c.strokeStyle='#f6cf1d';c.lineWidth=2.2;c.beginPath();c.arc(1,-1,6,-2.6,1.3);c.stroke();c.beginPath();c.moveTo(-1.6,5);c.lineTo(-5,8.4);c.stroke();c.save();c.rotate(-.78);c.fillStyle='#f6cf1d';c.fillRect(-1,-3,2,11);c.fillRect(-4,-5,8,3);c.restore()},
  martelo:c=>{c.fillStyle='#6a4326';rr(c,-11,8,14,4,1.5);c.save();c.translate(2,-2);c.rotate(-.6);c.fillStyle='#8a5a30';c.fillRect(-1.2,0,2.4,13);c.fillStyle='#6a4326';rr(c,-6.5,-4,13,7,2);c.fillStyle='#d9a400';c.fillRect(-4,-4,1.6,7);c.fillRect(2.4,-4,1.6,7);c.restore()},
  balanca:c=>{c.strokeStyle='#d9a400';c.fillStyle='#d9a400';c.lineWidth=1.6;c.beginPath();c.moveTo(0,-11);c.lineTo(0,9);c.moveTo(-10,-7);c.lineTo(10,-7);for(const s of[-1,1]){c.moveTo(s*10,-7);c.lineTo(s*10-3,1);c.moveTo(s*10,-7);c.lineTo(s*10+3,1)}c.stroke();for(const s of[-1,1]){c.beginPath();c.arc(s*10,1,3.6,0,Math.PI);c.fill()}c.fillRect(-5,9,10,2.4);disc(c,0,-11,1.6)},
  lupa:c=>{c.save();c.rotate(-.7);c.fillStyle='#3a2a1e';rr(c,-1.8,6,3.6,9,1.5);c.restore();c.fillStyle='#bfe3f5aa';disc(c,-2,-2,6);c.strokeStyle='#6a6f78';c.lineWidth=2.6;c.beginPath();c.arc(-2,-2,7,0,7);c.stroke();c.fillStyle='#fff';disc(c,-4.4,-4.4,1.4)},
  bonde:c=>{c.strokeStyle='#22242a';c.lineWidth=1;c.beginPath();c.moveTo(0,-8);c.lineTo(4,-14);c.stroke();c.fillStyle='#f2c81e';rr(c,-12,-8,24,14,2.4);c.fillStyle='#fff';c.fillRect(-12,1,24,2);c.fillStyle='#bfe3f5';for(let i=0;i<3;i++)c.fillRect(-10+i*7.4,-5,5.6,4.6);c.fillStyle='#22242a';disc(c,-6,7,2.4);disc(c,6,7,2.4)},
  ampulheta:c=>{c.fillStyle='#d8eef8';c.beginPath();c.moveTo(-6,-9.4);c.lineTo(6,-9.4);c.lineTo(1,0);c.lineTo(6,9.4);c.lineTo(-6,9.4);c.lineTo(-1,0);c.fill();c.fillStyle='#e0b440';c.beginPath();c.moveTo(-4,-6);c.lineTo(4,-6);c.lineTo(0,-.6);c.fill();c.beginPath();c.moveTo(0,4);c.lineTo(5,9.4);c.lineTo(-5,9.4);c.fill();c.fillStyle='#6a4326';c.fillRect(-8,-12,16,2.6);c.fillRect(-8,9.4,16,2.6)},
  borracha:c=>{c.save();c.rotate(-.35);c.fillStyle='#f28aa0';rr(c,-10,-4,12,9,1.5);c.fillStyle='#2f6fd0';rr(c,1,-4,9,9,1.5);c.restore();c.fillStyle='#f28aa0';disc(c,-8,9,1.2);disc(c,-4,10.4,1);disc(c,-11,7,.9)},
  caju:c=>{c.fillStyle='#3f7a32';c.beginPath();c.ellipse(4,-12,4,1.8,-.4,0,7);c.fill();c.fillStyle='#e8402a';c.beginPath();c.moveTo(-6,-10);c.quadraticCurveTo(0,-13,6,-10);c.quadraticCurveTo(8,0,3,4);c.lineTo(-3,4);c.quadraticCurveTo(-8,0,-6,-10);c.fill();c.fillStyle='#f6b02c';c.beginPath();c.ellipse(-2.4,-4,2,4.4,0,0,7);c.fill();c.fillStyle='#9a8a6a';c.beginPath();c.moveTo(-4,4);c.quadraticCurveTo(-6,11,0,11);c.quadraticCurveTo(5,11,4,6);c.quadraticCurveTo(1,7,0,4);c.fill()},
  guitarra:c=>{c.save();c.rotate(.6);c.fillStyle='#d0162a';c.beginPath();c.ellipse(0,6,6.4,6,0,0,7);c.fill();c.beginPath();c.ellipse(0,-1,4.6,4.4,0,0,7);c.fill();c.fillStyle='#fff';c.fillRect(-3,4,6,2);c.fillStyle='#5a3a22';c.fillRect(-1,-14,2,12);c.fillStyle='#17181d';c.fillRect(-2,-16,4,3);c.restore()},
  pastas:c=>{for(let i=0;i<3;i++){c.fillStyle=['#c9a45a','#d9b870','#e8cc88'][i];c.fillRect(-11+i,4-i*5,22,5);c.fillStyle='#c8102e';c.fillRect(-1+i,4-i*5,1.6,5)}c.fillStyle='#e8cc88';c.fillRect(-9,-8,7,2)},
  carimbo:c=>{c.strokeStyle='#d0162a';c.lineWidth=1.2;c.strokeRect(-10,8,20,4);c.fillStyle='#6a4326';disc(c,0,-9,3.6);c.fillRect(-1.6,-7,3.2,7);c.fillStyle='#2a2a2e';c.fillRect(-7,0,14,4);c.fillStyle='#d0162a';c.fillRect(-7,4,14,2)},
  chave:c=>{c.strokeStyle='#d9a400';c.lineWidth=3;c.beginPath();c.arc(-6,0,4.4,0,7);c.stroke();c.fillStyle='#d9a400';c.fillRect(-2,-1.4,13,2.8);c.fillRect(7,1,2,4);c.fillRect(10,1,2,3)},
  pasta:c=>{c.strokeStyle='#5a3a22';c.lineWidth=2;c.beginPath();c.moveTo(-4,-5);c.lineTo(-4,-9);c.lineTo(4,-9);c.lineTo(4,-5);c.stroke();c.fillStyle='#5a3a22';rr(c,-11,-5,22,15,2);c.fillStyle='#4a2e1a';c.fillRect(-11,1,22,1.2);c.fillStyle='#d9a400';c.fillRect(-2,0,4,3)},
  livroLei:c=>{c.fillStyle='#1f5a3a';rr(c,-9,-11,18,22,2);c.fillStyle='#f4ead5';c.fillRect(7,-9,2,18);c.fillStyle='#d9a400';star(c,-.6,-2,5.4);c.fillRect(-5,6,9,1.6)},
  xicara:c=>{c.fillStyle='#d8d4c8';c.beginPath();c.ellipse(-1,8,11,2.4,0,0,7);c.fill();c.fillStyle='#fff';c.beginPath();c.moveTo(-8,-3);c.lineTo(6,-3);c.quadraticCurveTo(6,7,-1,7);c.quadraticCurveTo(-8,7,-8,-3);c.fill();c.strokeStyle='#fff';c.lineWidth=1.8;c.beginPath();c.arc(7,1,3,-1.4,1.4);c.stroke();c.fillStyle='#2456a6';c.fillRect(-7,-1,12,1.4);c.strokeStyle='#ffffffaa';c.lineWidth=1.2;c.beginPath();c.moveTo(-3,-6);c.quadraticCurveTo(-5,-9,-3,-12);c.moveTo(2,-6);c.quadraticCurveTo(0,-9,2,-12);c.stroke()},
  maoV:c=>{c.fillStyle='#e8b896';c.save();c.rotate(-.25);rr(c,-4.6,-13,3.6,14,1.8);c.restore();c.save();c.rotate(.25);rr(c,1,-13,3.6,14,1.8);c.restore();rr(c,-6,-1,12,12,3);c.fillStyle='#c48a68';c.fillRect(-4,3,8,1);c.fillRect(-4,6,8,1);c.fillStyle='#e8b896';disc(c,-6.4,5,2.6)},
  ferro:c=>{c.strokeStyle='#2a2a2e';c.lineWidth=2.2;c.beginPath();c.moveTo(-8,-4);c.lineTo(-8,-10);c.lineTo(4,-10);c.lineTo(5,-4);c.stroke();c.fillStyle='#5a6070';c.beginPath();c.moveTo(-11,5);c.lineTo(13,5);c.quadraticCurveTo(6,-5,-3,-5);c.lineTo(-11,-5);c.closePath();c.fill();c.fillStyle='#c9ced6';c.beginPath();c.moveTo(-11,5);c.lineTo(13,5);c.lineTo(11,8.4);c.lineTo(-11,8.4);c.fill();c.fillStyle='#d0162a';disc(c,-6,0,1.6)},
  bolsa:c=>{c.strokeStyle='#17181d';c.lineWidth=2;c.beginPath();c.arc(0,-3,6,Math.PI,0);c.stroke();c.fillStyle='#17181d';rr(c,-10,-3,20,14,3);c.fillStyle='#d9a400';c.fillRect(-2,-3,4,3)},
  lapis:c=>{c.save();c.rotate(-.8);c.fillStyle='#f2b705';c.fillRect(-3,-10,6,16);c.fillStyle='#f28aa0';c.fillRect(-3,-13,6,3);c.fillStyle='#c9ced6';c.fillRect(-3,-10,6,1.6);c.fillStyle='#e8c89a';c.beginPath();c.moveTo(-3,6);c.lineTo(3,6);c.lineTo(0,12);c.fill();c.fillStyle='#2a2a2e';c.beginPath();c.moveTo(-1,10);c.lineTo(1,10);c.lineTo(0,12);c.fill();c.restore()},
  medalha:c=>{c.fillStyle='#2456a6';c.beginPath();c.moveTo(-7,-12);c.lineTo(-3,-12);c.lineTo(0,-5);c.lineTo(3,-12);c.lineTo(7,-12);c.lineTo(1.4,-1);c.lineTo(-1.4,-1);c.fill();c.fillStyle='#b8860b';disc(c,0,4,7.4);c.fillStyle='#f2c81e';disc(c,0,4,5.6);c.fillStyle='#b8860b';star(c,0,4,3.4)},
  chapeuCowboy:c=>{c.fillStyle='#8a5a30';c.beginPath();c.ellipse(0,4,13,3.6,0,0,7);c.fill();c.fillStyle='#a06a3a';c.beginPath();c.moveTo(-7,4);c.quadraticCurveTo(-8,-8,-3,-7);c.quadraticCurveTo(0,-4,3,-7);c.quadraticCurveTo(8,-8,7,4);c.fill();c.fillStyle='#4a2e1a';c.fillRect(-7,0,14,2)},
  pote:c=>{c.fillStyle='#d8eef8cc';rr(c,-8,-7,16,18,3);c.fillStyle='#9aa0a8';rr(c,-7,-11,14,4,1.5);const k=['#d0162a','#35c46b','#f2b705','#7a3ab0','#2f6fd0','#ff8a2c'];for(let i=0;i<12;i++){c.fillStyle=k[i%6];c.beginPath();c.ellipse(-5+(i%4)*3.4,8-Math.floor(i/4)*3.6,1.6,1.1,i,0,7);c.fill()}},
  corvo:c=>{c.strokeStyle='#d9a400';c.lineWidth=1;c.beginPath();c.moveTo(-1,6);c.lineTo(-1,11);c.moveTo(2,6);c.lineTo(2,11);c.stroke();c.fillStyle='#17181d';c.beginPath();c.ellipse(0,2,8,5.4,-.3,0,7);c.fill();disc(c,6,-4,4);c.beginPath();c.moveTo(-6,3);c.lineTo(-13,6);c.lineTo(-7,0);c.fill();c.fillStyle='#d9a400';c.beginPath();c.moveTo(9,-5);c.lineTo(13,-3.6);c.lineTo(9,-2.6);c.fill();c.fillStyle='#fff';disc(c,7,-5,1)},
  gravador:c=>{c.fillStyle='#4b515c';rr(c,-11,-6,22,15,2);c.fillStyle='#17181d';disc(c,-5,-6,5);disc(c,5,-6,5);c.fillStyle='#9aa0a8';disc(c,-5,-6,1.6);disc(c,5,-6,1.6);c.fillStyle='#c9ced6';c.fillRect(-8,3,16,3);c.fillStyle='#d0162a';disc(c,8,5,1.2)},
  cruzLorena:c=>{c.fillStyle='#fff';disc(c,0,0,12);c.fillStyle='#1f3a8a';c.fillRect(-1.6,-10,3.2,20);c.fillRect(-4.4,-6,8.8,2.4);c.fillRect(-6.6,-.6,13.2,2.4)},
  baguete:c=>{c.save();c.rotate(-.6);c.fillStyle='#d9a050';c.beginPath();c.ellipse(0,0,14,3.6,0,0,7);c.fill();c.strokeStyle='#a8702a';c.lineWidth=1;c.beginPath();for(let i=-2;i<=2;i++){c.moveTo(i*4.6-1.6,-2);c.lineTo(i*4.6+1.6,1.6)}c.stroke();c.restore()},
  enxada:c=>{c.save();c.rotate(.45);c.fillStyle='#8a5a30';c.fillRect(-1.2,-12,2.4,24);c.fillStyle='#8a909c';c.beginPath();c.moveTo(-1,-12);c.lineTo(-9,-11);c.lineTo(-9,-5);c.lineTo(-1,-8);c.fill();c.restore()},
  sombrero:c=>{c.fillStyle='#d9b870';c.beginPath();c.ellipse(0,5,14,4,0,0,7);c.fill();c.beginPath();c.moveTo(-6,5);c.quadraticCurveTo(-5,-10,0,-10);c.quadraticCurveTo(5,-10,6,5);c.fill();c.fillStyle='#c8102e';c.fillRect(-6,1,12,2);c.strokeStyle='#a8823a';c.lineWidth=1;c.beginPath();c.ellipse(0,5,11,2.6,0,0,7);c.stroke()},
  aperto:c=>{c.fillStyle='#2456a6';c.fillRect(-13,-2,7,7);c.fillStyle='#c8102e';c.fillRect(6,-2,7,7);c.fillStyle='#e8b896';rr(c,-7,-3,14,9,4);c.fillStyle='#c48a68';for(const x of[-3,0,3])c.fillRect(x,-1,1,6)},
  moeda:c=>{for(let i=0;i<4;i++){c.fillStyle='#b8860b';c.beginPath();c.ellipse(-3,8-i*3.4,7,2.6,0,0,7);c.fill();c.fillStyle='#e0b020';c.beginPath();c.ellipse(-3,7-i*3.4,7,2.6,0,0,7);c.fill()}c.fillStyle='#b8860b';disc(c,7,4,6);c.fillStyle='#f2c81e';disc(c,7,3.4,5);c.fillStyle='#b8860b';star(c,7,3.4,2.6)},
  bussola:c=>{c.fillStyle='#b8860b';disc(c,0,0,11);c.fillStyle='#f4ead5';disc(c,0,0,8.6);c.fillStyle='#d0162a';c.beginPath();c.moveTo(0,-7);c.lineTo(2.2,0);c.lineTo(-2.2,0);c.fill();c.fillStyle='#2a2a2e';c.beginPath();c.moveTo(0,7);c.lineTo(2.2,0);c.lineTo(-2.2,0);c.fill();disc(c,0,0,1.2)},
  seringa:c=>{c.save();c.rotate(-.7);c.fillStyle='#d8eef8';c.fillRect(-3,-8,6,14);c.fillStyle='#35c46b';c.fillRect(-3,-1,6,7);c.fillStyle='#8a909c';c.fillRect(-1,-12,2,4);c.fillRect(-4,-13,8,1.6);c.fillRect(-4.6,-8,9.2,1.4);c.fillStyle='#c9ced6';c.fillRect(-.4,6,.8,7);c.restore()},
  kitMed:c=>{c.strokeStyle='#f4f8fc';c.lineWidth=2;c.beginPath();c.moveTo(-4,-6);c.lineTo(-4,-10);c.lineTo(4,-10);c.lineTo(4,-6);c.stroke();c.fillStyle='#f4f8fc';rr(c,-11,-6,22,16,2);c.fillStyle='#d0162a';c.fillRect(-1.8,-3,3.6,10);c.fillRect(-5,.2,10,3.6)},
  rosa:c=>{c.strokeStyle='#2f7a3e';c.lineWidth=1.6;c.beginPath();c.moveTo(0,-2);c.quadraticCurveTo(2,6,0,12);c.stroke();c.fillStyle='#3f9e5c';c.beginPath();c.ellipse(4,5,3.4,1.6,-.5,0,7);c.fill();c.fillStyle='#c8102e';disc(c,0,-6,6);c.strokeStyle='#8f0b20';c.lineWidth=1.2;c.beginPath();c.arc(0,-6,3.4,0,4.4);c.stroke()},
  pena:c=>{c.fillStyle='#2a2a2e';rr(c,2,3,9,8,2);c.save();c.translate(-2,0);c.rotate(.5);c.fillStyle='#f4f1e8';c.beginPath();c.moveTo(0,10);c.quadraticCurveTo(-6,-2,0,-13);c.quadraticCurveTo(5,-2,0,10);c.fill();c.strokeStyle='#b9b09a';c.lineWidth=.8;c.beginPath();c.moveTo(0,10);c.lineTo(0,-11);c.stroke();c.restore()},
  notaMus:c=>{c.fillStyle='#7a3ab0';c.beginPath();c.ellipse(-5,7,4,3,-.4,0,7);c.fill();c.beginPath();c.ellipse(6,4,4,3,-.4,0,7);c.fill();c.fillRect(-1.6,-10,2,17);c.fillRect(9.4,-13,2,17);c.beginPath();c.moveTo(-1.6,-10);c.lineTo(11.4,-13);c.lineTo(11.4,-9);c.lineTo(-1.6,-6);c.fill()},
  corrente:c=>{c.strokeStyle='#8a909c';c.lineWidth=2.4;for(const[x,y,a]of[[-11,6,.5],[-5.4,3,-.5],[5.4,-3,-.5],[11,-6,.5]]){c.beginPath();c.ellipse(x,y,4,2.4,a,0,7);c.stroke()}c.strokeStyle='#f2b705';c.lineWidth=1.4;c.beginPath();c.moveTo(-1,-3);c.lineTo(1,-8);c.moveTo(1,3);c.lineTo(3,7);c.moveTo(-2,2);c.lineTo(-5,-3);c.stroke()},
  pao:c=>{c.fillStyle='#c98a3a';c.beginPath();c.ellipse(0,2,12,7,0,0,7);c.fill();c.fillStyle='#e0a858';c.beginPath();c.ellipse(0,0,10,5,0,0,7);c.fill();c.strokeStyle='#a8702a';c.lineWidth=1.2;c.beginPath();for(const x of[-5,0,5]){c.moveTo(x-2,-3);c.lineTo(x+2,3)}c.stroke()},
  pomba:c=>{c.fillStyle='#fff';c.beginPath();c.ellipse(0,2,8,4.6,-.2,0,7);c.fill();disc(c,7,-3,3.4);c.beginPath();c.moveTo(-2,0);c.lineTo(-6,-11);c.lineTo(4,-1);c.fill();c.beginPath();c.moveTo(-7,2);c.lineTo(-13,-1);c.lineTo(-12,6);c.fill();c.fillStyle='#f2a02c';c.beginPath();c.moveTo(10,-3.6);c.lineTo(13,-2.4);c.lineTo(10,-1.4);c.fill();c.fillStyle='#17181d';disc(c,8,-4,.8);c.fillStyle='#3f9e5c';c.beginPath();c.ellipse(12,1,2.6,1.2,.5,0,7);c.fill();c.beginPath();c.ellipse(13,4,2.6,1.2,-.3,0,7);c.fill()},
  estrelaVerm:c=>{c.fillStyle='#8f0b20';star(c,0,0,12.5);c.fillStyle='#d0162a';star(c,0,0,10.5);c.fillStyle='#f6cf1d';star(c,0,0,3)},
  globoONU:c=>{c.fillStyle='#4b92db';disc(c,0,0,11);c.strokeStyle='#fff';c.lineWidth=1;c.beginPath();c.arc(0,0,6.6,0,7);c.moveTo(-6.6,0);c.lineTo(6.6,0);c.moveTo(0,-6.6);c.lineTo(0,6.6);c.stroke();c.beginPath();c.ellipse(0,0,3.2,6.6,0,0,7);c.stroke();c.fillStyle='#fff';for(let i=0;i<5;i++){const a=Math.PI*.15+i*.33;disc(c,Math.cos(a)*9.2,Math.sin(a)*9.2,1.2);disc(c,-Math.cos(a)*9.2,Math.sin(a)*9.2,1.2)}},
  capacete:c=>{c.fillStyle='#4b5a3a';c.beginPath();c.arc(0,4,11,Math.PI,0);c.fill();c.fillRect(-13,3,26,3);c.fillStyle='#3a462c';c.fillRect(-11,0,22,2);c.fillStyle='#6a7a52';disc(c,-4,-3,1.6)},
  envDin:c=>{c.save();c.rotate(-.2);c.fillStyle='#3f9e5c';c.fillRect(-7,-12,14,10);c.fillStyle='#d8f0d8';disc(c,0,-7,2);c.restore();c.fillStyle='#c9a45a';c.fillRect(-11,-5,22,14);c.fillStyle='#b8924a';c.beginPath();c.moveTo(-11,-5);c.lineTo(0,3);c.lineTo(11,-5);c.fill()},
  dna:c=>{for(let i=0;i<=12;i++){const y=-12+i*2,x=Math.sin(i*.55)*7;if(i%2===0){c.strokeStyle='#9aa0a8';c.lineWidth=.8;c.beginPath();c.moveTo(x,y);c.lineTo(-x,y);c.stroke()}c.fillStyle='#2f6fd0';disc(c,x,y,1.5);c.fillStyle='#d0162a';disc(c,-x,y,1.5)}},
  bola:c=>{c.fillStyle='#fff';disc(c,0,0,10);c.save();c.beginPath();c.arc(0,0,10,0,7);c.clip();c.fillStyle='#17181d';pent(c,0,0,3.8);for(let i=0;i<5;i++){const a=-Math.PI/2+i*1.2566;pent(c,Math.cos(a)*9.4,Math.sin(a)*9.4,3)}c.restore();c.strokeStyle='#17181d';c.lineWidth=1;c.beginPath();c.arc(0,0,10,0,7);c.stroke()},
  chuteira:c=>{c.fillStyle='#f2b705';c.beginPath();c.moveTo(-10,-6);c.lineTo(-3,-6);c.lineTo(-2,0);c.quadraticCurveTo(10,0,12,5);c.lineTo(-10,5);c.closePath();c.fill();c.fillStyle='#17181d';for(const x of[-8,-3,3,8])c.fillRect(x,5,2.4,3);c.strokeStyle='#2456a6';c.lineWidth=1.2;c.beginPath();c.moveTo(-6,-3);c.lineTo(6,2);c.stroke()},
  copo:c=>{c.strokeStyle='#d8eef8';c.lineWidth=2.4;c.beginPath();c.arc(6,2,4,-1.5,1.5);c.stroke();c.fillStyle='#f2b705';c.fillRect(-8,-6,13,17);c.fillStyle='#fff';c.beginPath();c.ellipse(-1.5,-7,8,3.6,0,0,7);c.fill();disc(c,-6,-9,3);disc(c,2,-9,3);c.fillStyle='#ffffff66';c.fillRect(-6,-3,2,12)},
  nave:c=>{c.fillStyle='#ffe27a';c.beginPath();c.moveTo(-4,7);c.lineTo(4,7);c.lineTo(7,13);c.lineTo(-7,13);c.fill();c.fillStyle='#ff7ab8';c.beginPath();c.ellipse(0,3,13,4.6,0,0,7);c.fill();c.fillStyle='#bfe3f5';c.beginPath();c.arc(0,1,6.4,Math.PI,0);c.fill();c.fillStyle='#fff';for(const x of[-8,0,8])disc(c,x,4,1.4)},
  botaBranca:c=>{c.fillStyle='#fff';c.strokeStyle='#b9b4a4';c.lineWidth=1;c.beginPath();c.moveTo(-5,-12);c.lineTo(3,-12);c.lineTo(3,4);c.quadraticCurveTo(12,4,12,10);c.lineTo(-5,10);c.closePath();c.fill();c.stroke();c.fillStyle='#ff7ab8';c.fillRect(-5,-12,8,3)},
  luvaBox:c=>{c.fillStyle='#d0162a';c.beginPath();c.ellipse(1,-2,9,9,0,0,7);c.fill();c.beginPath();c.ellipse(-7,1,4,5,-.5,0,7);c.fill();c.fillStyle='#fff';c.fillRect(-5,6,12,5);c.fillStyle='#8f0b20';c.fillRect(-1,-7,1.2,8)},
  sol:c=>{c.fillStyle='#f6cf1d';disc(c,0,-3,6.4);c.strokeStyle='#f6cf1d';c.lineWidth=1.6;c.beginPath();for(let i=0;i<8;i++){const a=i*Math.PI/4;c.moveTo(Math.cos(a)*8.4,-3+Math.sin(a)*8.4);c.lineTo(Math.cos(a)*11.4,-3+Math.sin(a)*11.4)}c.stroke();c.strokeStyle='#2f8fd0';c.lineWidth=2.2;c.beginPath();c.moveTo(-12,9);for(let x=-12;x<12;x+=6){c.quadraticCurveTo(x+1.5,6,x+3,9);c.quadraticCurveTo(x+4.5,12,x+6,9)}c.stroke()},
  carroEle:c=>{c.fillStyle='#d0162a';c.beginPath();c.moveTo(-13,5);c.lineTo(-11,-1);c.lineTo(-4,-6);c.lineTo(5,-6);c.lineTo(11,0);c.lineTo(13,5);c.fill();c.fillStyle='#bfe3f5';c.beginPath();c.moveTo(-3,-4.6);c.lineTo(4,-4.6);c.lineTo(8,-.6);c.lineTo(-7,-.6);c.fill();c.fillStyle='#22242a';disc(c,-7,5,3);disc(c,7,5,3)},
  marte:c=>{c.fillStyle='#c8502a';disc(c,0,0,11);c.fillStyle='#a03a1e';disc(c,-4,-3,2.6);disc(c,4,4,3.4);disc(c,5,-5,1.6);c.fillStyle='#ffffff55';c.beginPath();c.ellipse(0,-9,5,1.6,0,0,7);c.fill()},
  hashi:c=>{c.fillStyle='#f4f1e8';disc(c,0,6,7);c.fillStyle='#1f2a24';disc(c,0,6,5.4);c.fillStyle='#f4f1e8';disc(c,0,6,3.8);c.fillStyle='#f2703a';disc(c,0,6,1.8);c.strokeStyle='#8a5a30';c.lineWidth=1.6;c.beginPath();c.moveTo(-10,-12);c.lineTo(3,3);c.moveTo(-6,-13);c.lineTo(5,2);c.stroke()},
  atomo:(c,t)=>{c.strokeStyle='#2f8fd0';c.lineWidth=1.4;for(const a of[0,1.05,2.1]){c.beginPath();c.ellipse(0,0,13,4.6,a,0,7);c.stroke()}c.fillStyle='#d0162a';disc(c,0,0,2.8);c.fillStyle='#f6cf1d';for(const a of[0,1.05,2.1]){const f=t*3+a*2,x=Math.cos(f)*13,y=Math.sin(f)*4.6;disc(c,x*Math.cos(a)-y*Math.sin(a),x*Math.sin(a)+y*Math.cos(a),1.5)}},
  buque:c=>{c.fillStyle='#3f9e5c';c.beginPath();c.moveTo(-3,0);c.lineTo(3,0);c.lineTo(1,12);c.lineTo(-1,12);c.fill();for(const[x,y,k]of[[-5,-4,'#ff7ab8'],[0,-8,'#d0162a'],[5,-4,'#f6cf1d'],[-2,-1,'#fff'],[3,0,'#ff7ab8']]){c.fillStyle=k;disc(c,x,y,3.4)}c.fillStyle='#f4ead5';c.beginPath();c.moveTo(-6,2);c.lineTo(6,2);c.lineTo(2,8);c.lineTo(-2,8);c.fill()},
  laranja:c=>{c.fillStyle='#f28a1c';disc(c,0,2,9.4);c.fillStyle='#ffb04a';disc(c,-3,-1,2.4);c.fillStyle='#6a4326';c.fillRect(-.6,-9,1.4,3);c.fillStyle='#3f9e5c';c.beginPath();c.ellipse(3,-8,4,2,-.5,0,7);c.fill()},
  etiqueta:c=>{c.strokeStyle='#8a909c';c.lineWidth=1;c.beginPath();c.moveTo(6,0);c.quadraticCurveTo(9,-10,2,-12);c.stroke();c.fillStyle='#f6cf1d';c.beginPath();c.moveTo(-11,-6);c.lineTo(5,-6);c.lineTo(12,0);c.lineTo(5,6);c.lineTo(-11,6);c.closePath();c.fill();c.fillStyle='#1d1a16';disc(c,6,0,1.6);c.fillStyle='#d0162a';disc(c,-7,-2.4,1.8);disc(c,-1,2.4,1.8);c.strokeStyle='#d0162a';c.lineWidth=1.6;c.beginPath();c.moveTo(-1.6,-4);c.lineTo(-6.4,4);c.stroke()},
  hamburguer:c=>{c.fillStyle='#d9963a';c.beginPath();c.arc(0,-1,10,Math.PI,0);c.fill();c.fillStyle='#3fae4a';c.fillRect(-11,-1,22,2.4);c.fillStyle='#f6cf1d';c.fillRect(-10,1.4,20,2);c.fillStyle='#6a3a1e';rr(c,-10,3.4,20,4,2);c.fillStyle='#d9963a';rr(c,-10,7.4,20,4,2);c.fillStyle='#fff8d8';disc(c,-4,-5,.8);disc(c,2,-7,.8);disc(c,5,-4,.8)},
  sacola:c=>{c.strokeStyle='#f6cf1d';c.lineWidth=1.8;c.beginPath();c.arc(0,-4,5,Math.PI,0);c.stroke();c.fillStyle='#2456a6';c.beginPath();c.moveTo(-9,-4);c.lineTo(9,-4);c.lineTo(11,11);c.lineTo(-11,11);c.fill();c.fillStyle='#f6cf1d';star(c,0,4,3.8)},
  picanha:c=>{c.strokeStyle='#9aa0a8';c.lineWidth=1.6;c.beginPath();c.moveTo(-13,10);c.lineTo(13,-10);c.stroke();for(const[x,y]of[[-5,4],[5,-4]]){c.save();c.translate(x,y);c.rotate(-.65);c.fillStyle='#a8323a';c.beginPath();c.arc(0,2,7,Math.PI,0);c.closePath();c.fill();c.fillStyle='#d8606a';c.beginPath();c.arc(0,2,4.4,Math.PI,0);c.closePath();c.fill();c.strokeStyle='#f4ead0';c.lineWidth=2.4;c.beginPath();c.arc(0,2,7.4,Math.PI+.1,-.1);c.stroke();c.restore()}c.fillStyle='#6a4326';c.fillRect(-15,9,4,3)},
};
/* acessórios das melhorias: k = costas, c = corpo, h = cabeça, b = chão, ao redor da torre */
const GEAR={
  k_mochila:['k',c=>{c.fillStyle='#4a5a3a';rr(c,-11,-19,22,13,3);c.fillStyle='#fff';c.fillRect(-8,-25,5,8);c.fillRect(-2,-26,5,9);c.fillRect(4,-24,4,7);c.fillStyle='#c8102e';c.fillRect(-7,-23,3,1.5)}],
  k_bandeira:['k',(c,t)=>{pole(c,-11,-56);redFlag(c,-10,-56,20+Math.sin(t*5)*1.5,13)}],
  k_flagBR:['k',(c,t)=>{pole(c,-11,-56);brFlag(c,-10,-56,20+Math.sin(t*5)*1.5,13)}],
  k_capaBR:['k',(c,t)=>{c.fillStyle='#1f7a4d';c.beginPath();c.moveTo(-9,-19);c.lineTo(9,-19);c.lineTo(13+Math.sin(t*5),-1);c.lineTo(-13+Math.sin(t*5),-1);c.fill();c.fillStyle='#f6cf1d';star(c,0,-8,4)}],
  k_laco:['k',c=>{c.strokeStyle='#c9a35e';c.lineWidth=2;c.beginPath();c.ellipse(-11,-13,5,7,.3,0,7);c.stroke()}],
  c_colete:['c',c=>{c.fillStyle='#f2b705';rr(c,-8.5,-18.5,5.5,14,1.5);rr(c,3,-18.5,5.5,14,1.5);c.fillStyle='#fff';c.fillRect(-8.5,-11,5.5,1.6);c.fillRect(3,-11,5.5,1.6)}],
  c_coleteBR:['c',c=>{c.fillStyle='#1f7a4d';rr(c,-8.5,-18.5,5.5,14,1.5);rr(c,3,-18.5,5.5,14,1.5);c.fillStyle='#f6cf1d';c.fillRect(-8.5,-11,5.5,1.6);c.fillRect(3,-11,5.5,1.6)}],
  c_medalha:['c',c=>{c.strokeStyle='#2456a6';c.lineWidth=1.3;c.beginPath();c.moveTo(-3.6,-19);c.lineTo(0,-11);c.lineTo(3.6,-19);c.stroke();c.fillStyle='#f2b705';disc(c,0,-9.6,2.6)}],
  c_bottons:['c',c=>{for(const[x,y,k]of[[-5,-15,'#c8102e'],[-5,-11,'#f2b705'],[5,-13,'#fff']]){c.fillStyle=k;disc(c,x,y,1.5)}}],
  c_cracha:['c',c=>{c.strokeStyle='#c8102e';c.lineWidth=1;c.beginPath();c.moveTo(-3,-19);c.lineTo(0,-13);c.lineTo(3,-19);c.stroke();c.fillStyle='#fff';c.fillRect(-3,-13,6,7);c.fillStyle='#c8102e';c.fillRect(-2,-12,4,1.5)}],
  c_faixaPres:['c',(c,t,hy,bw)=>{c.beginPath();c.moveTo(-bw/2,-18);c.lineTo(-bw/2+5,-19);c.lineTo(bw/2,-7);c.lineTo(bw/2-5,-5);c.closePath();c.fillStyle='#1f7a4d';c.fill();c.strokeStyle='#f6cf1d';c.lineWidth=1.2;c.stroke();c.fillStyle='#f2b705';star(c,0,-12,3)}],
  h_binoculo:['h',(c,t,hy)=>{c.fillStyle='#22242a';rr(c,-7.5,hy-3.4,6.6,5,1.5);rr(c,.9,hy-3.4,6.6,5,1.5);c.fillRect(-1,hy-2,2,2);c.fillStyle='#7fd4ff';disc(c,-4.2,hy-.9,1.4);disc(c,4.2,hy-.9,1.4)}],
  h_oculos:['h',(c,t,hy)=>{c.fillStyle='#101014';rr(c,-7,hy-3,6.2,4,1.3);rr(c,.8,hy-3,6.2,4,1.3);c.fillRect(-1,hy-2,2,1)}],
  h_headset:['h',(c,t,hy)=>{c.strokeStyle='#22242a';c.lineWidth=1.8;c.beginPath();c.arc(0,hy-1,11,Math.PI,0);c.stroke();c.fillStyle='#22242a';rr(c,-12.5,hy-3,3.6,7,1.6);rr(c,8.9,hy-3,3.6,7,1.6);c.strokeStyle='#22242a';c.lineWidth=1;c.beginPath();c.moveTo(-10.5,hy+4);c.quadraticCurveTo(-7,hy+8,-3,hy+6.6);c.stroke()}],
  h_louro:['h',(c,t,hy)=>{c.fillStyle='#d9a400';for(let i=0;i<7;i++){const a=Math.PI+.3+i*.42;c.save();c.translate(Math.cos(a)*11,hy-2+Math.sin(a)*10);c.rotate(a);c.beginPath();c.ellipse(0,0,2.6,1.2,0,0,7);c.fill();c.restore()}}],
  h_chefOuro:['h',(c,t,hy)=>{c.fillStyle='#f2b705';c.fillRect(-7.5,hy-7.6,15,2.2);star(c,0,hy-12,3)}],
  b_tenda:['b',c=>tenda(c,'#c8102e','#fff')],
  b_tendaBR:['b',c=>tenda(c,'#1f7a4d','#f6cf1d')],
  b_nuvem:['b',(c,t)=>{c.fillStyle='#eef9ffcc';for(let i=0;i<5;i++){const a=t*3+i*1.26;disc(c,Math.cos(a)*17,3+Math.sin(a)*5,4)}}],
  b_furacao:['b',(c,t)=>{c.strokeStyle='#dff3ff';c.lineWidth=2.4;for(let i=0;i<6;i++){c.beginPath();c.ellipse(-28+Math.sin(t*6+i)*2,-3-i*7,4+i*2.2,1.6+i*.5,0,0,7);c.stroke()}}],
  /* objeto que representa a evolução, num suporte à direita (ic) ou à esquerda (ic2), ou flutuando acima da cabeça (icA) */
  ic:['b',(c,t,a,b,x)=>{c.translate(38,0);suporte(c);c.translate(0,-35);ICON[x](c,t)}],
  ic2:['b',(c,t,a,b,x)=>{c.translate(-38,0);suporte(c);c.translate(0,-35);ICON[x](c,t)}],
  icA:['b',(c,t,a,b,x)=>{c.translate(0,-76+Math.sin(t*2.4)*2);ICON[x](c,t)}],
  b_fogo:['b',(c,t)=>{for(const x of[-14,0,14]){const h=8+Math.sin(t*14+x)*2.5;c.fillStyle='#ff8a2c';c.beginPath();c.moveTo(x-4.5,6);c.quadraticCurveTo(x,6-h*2,x+4.5,6);c.fill();c.fillStyle='#ffd24a';c.beginPath();c.moveTo(x-2.2,6);c.quadraticCurveTo(x,6-h,x+2.2,6);c.fill()}}],
  b_churrasqueira:['b',(c,t)=>{c.fillStyle='#3a3a40';c.fillRect(17,-6,2,8);c.fillRect(33,-6,2,8);rr(c,14,-16,24,11,3);c.fillStyle='#ff8a2c';c.fillRect(16,-17,20,2);c.fillStyle='#8a2a22';rr(c,18,-21,7,4,1.5);rr(c,27,-21,7,4,1.5);const f=(t*.8)%1;c.fillStyle=`rgba(230,230,230,${.5-f*.5})`;disc(c,26,-26-f*16,3+f*4)}],
  b_isopor:['b',c=>{c.fillStyle='#e8f1f5';rr(c,-40,-14,20,15,2);c.fillStyle='#2456a6';c.fillRect(-40,-14,20,4);c.fillStyle='#e8a51c';rr(c,-35,-21,5,7,1);rr(c,-28,-21,5,7,1)}],
  b_bandeirinhas:['b',c=>{c.strokeStyle='#6a4a2a';c.lineWidth=1;c.beginPath();c.moveTo(-30,-50);c.quadraticCurveTo(0,-38,30,-50);c.stroke();for(let i=0;i<7;i++){const x=-26+i*8.6,y=-49+(1-((x/30)**2))*6;c.fillStyle=['#c8102e','#f2b705','#2456a6'][i%3];c.beginPath();c.moveTo(x-3,y);c.lineTo(x+3,y);c.lineTo(x,y+7);c.fill()}}],
  b_maquina:['b',c=>{c.fillStyle='#4b515c';rr(c,-40,-20,20,20,2);c.fillStyle='#b8e0b0';c.fillRect(-37,-17,14,5);c.fillStyle='#d8d8d8';for(let i=0;i<3;i++)c.fillRect(-37+i*5,-10,3.6,3.6);c.fillStyle='#fff';c.fillRect(-35,-25,10,6)}],
  b_pilha:['b',c=>{c.fillStyle='#fff';for(let i=0;i<7;i++){c.fillRect(19+((i*7)%3),-3-i*3.4,20,2.8)}c.fillStyle='#c8102e';c.fillRect(24,-26,10,3)}],
  b_dinheiro:['b',c=>{for(let i=0;i<3;i++)for(let j=0;j<3-i;j++){c.fillStyle='#3f9e5c';c.fillRect(-42+j*9+i*4,-4-i*5,8,4.4);c.fillStyle='#d8f0d8';c.fillRect(-39+j*9+i*4,-3-i*5,2,2)}}],
  b_leao:['b',c=>{c.fillStyle='#c98a1c';disc(c,28,-14,11);c.fillStyle='#f2c060';disc(c,28,-14,7);c.fillStyle='#1b1712';disc(c,25.5,-16,1.2);disc(c,30.5,-16,1.2);c.beginPath();c.moveTo(26.5,-12);c.lineTo(29.5,-12);c.lineTo(28,-10);c.fill()}],
  b_tripe:['b',c=>{c.strokeStyle='#22242a';c.lineWidth=1.6;c.beginPath();c.moveTo(28,-22);c.lineTo(21,2);c.moveTo(28,-22);c.lineTo(35,2);c.moveTo(28,-22);c.lineTo(28,2);c.stroke();c.fillStyle='#14151a';rr(c,23,-36,10,16,1.5);c.fillStyle='#7fd4ff';c.fillRect(24.5,-34,7,12)}],
  b_ringlight:['b',c=>{c.strokeStyle='#fff8d8';c.lineWidth=4;c.beginPath();c.arc(0,-30,23,0,7);c.stroke();c.strokeStyle='#ffe27a88';c.lineWidth=1.4;c.beginPath();c.arc(0,-30,26,0,7);c.stroke()}],
  b_print:['b',c=>{c.fillStyle='#14151a';rr(c,18,-42,20,36,3);c.fillStyle='#e8f6ee';c.fillRect(20,-39,16,28);c.fillStyle='#35c46b';rr(c,22,-37,10,5,1.5);c.fillStyle='#fff';rr(c,25,-30,10,5,1.5);c.fillStyle='#35c46b';rr(c,22,-23,10,5,1.5)}],
  b_coracoes:['b',(c,t)=>{for(let i=0;i<3;i++){const f=(t*.6+i/3)%1,x=-22+i*22;c.fillStyle=`rgba(226,60,90,${1-f})`;const y=-40-f*22;disc(c,x-2,y,2.4);disc(c,x+2,y,2.4);c.beginPath();c.moveTo(x-4.4,y+.6);c.lineTo(x+4.4,y+.6);c.lineTo(x,y+6);c.fill()}}],
  b_satelite:['b',c=>{c.fillStyle='#d8d8d8';c.beginPath();c.ellipse(-28,-24,11,5,-.6,0,7);c.fill();c.strokeStyle='#6a6a72';c.lineWidth=2;c.beginPath();c.moveTo(-28,-22);c.lineTo(-28,0);c.moveTo(-28,-24);c.lineTo(-20,-36);c.stroke();c.fillStyle='#c8102e';disc(c,-20,-36,2)}],
  b_livros:['b',c=>{for(const[y,k,w]of[[-5,'#7d1420',22],[-10,'#2456a6',18],[-15,'#3a6a3a',16]]){c.fillStyle=k;c.fillRect(17,y,w,5)}}],
  b_livros2:['b',c=>{for(let i=0;i<8;i++){c.fillStyle=['#7d1420','#2456a6','#3a6a3a','#6a4a2a'][i%4];c.fillRect(-40+(i%2)*2,-5-i*5,20,4.6)}}],
  b_saco:['b',c=>{c.fillStyle='#b98a4a';disc(c,28,-9,9);c.fillRect(25,-20,6,5);c.fillStyle='#fff';c.font='700 11px Arial';c.textAlign='center';c.fillText('R$',28,-5)}],
  b_globo:['b',c=>{c.fillStyle='#3f8fb5';disc(c,-28,-22,12);c.fillStyle='#4c9a55';disc(c,-32,-26,4.6);disc(c,-23,-19,5);disc(c,-30,-15,2.8);c.fillStyle='#6a4a2a';c.fillRect(-34,-8,12,3);c.fillRect(-29,-10,2,4)}],
  b_palanque:['b',c=>{c.fillStyle='#8f0b20';c.fillRect(-26,-4,52,13);c.fillStyle='#fff';star(c,0,3,5)}],
  b_palanqueBR:['b',c=>{c.fillStyle='#1f7a4d';c.fillRect(-26,-4,52,13);c.fillStyle='#f6cf1d';star(c,0,3,5)}],
  b_cartazes:['b',c=>{for(const x of[-27,27]){pole(c,x,-26);c.fillStyle='#fff';rr(c,x-11,-42,22,18,2);c.fillStyle='#c8102e';c.fillRect(x-7,-37,14,2);c.fillRect(x-7,-32,14,2)}}],
  b_caixasom:['b',c=>{for(const y of[-13,-28]){c.fillStyle='#17181d';rr(c,-40,y,18,15,2);c.fillStyle='#5b5f68';disc(c,-31,y+7.5,5);c.fillStyle='#17181d';disc(c,-31,y+7.5,2)}}],
  b_mesa:['b',c=>{c.fillStyle='#5a3a22';c.fillRect(-27,-14,54,14);c.fillStyle='#7a5234';c.fillRect(-29,-17,58,4)}],
  b_tarja:['b',c=>{pole(c,44,-26);c.fillStyle='#fff';rr(c,22,-46,44,22,3);c.beginPath();c.moveTo(30,-25);c.lineTo(28,-19);c.lineTo(36,-25);c.fill();c.fillStyle='#0b0b0d';c.save();c.translate(44,-35);c.rotate(-.12);c.fillRect(-20,-4.4,40,8.8);c.restore()}],
  b_celBloq:['b',c=>{c.fillStyle='#14151a';rr(c,18,-34,18,30,3);c.fillStyle='#7fd4ff';c.fillRect(20,-31,14,23);c.strokeStyle='#d22';c.lineWidth=3;c.beginPath();c.moveTo(21,-28);c.lineTo(33,-11);c.moveTo(33,-28);c.lineTo(21,-11);c.stroke()}],
  b_cofre:['b',c=>{c.fillStyle='#4b515c';rr(c,-42,-22,22,22,2);c.strokeStyle='#d8d8d8';c.lineWidth=1.6;c.beginPath();c.arc(-31,-11,5,0,7);c.moveTo(-31,-16);c.lineTo(-31,-6);c.stroke()}],
  b_colunas:['b',c=>{c.fillStyle='#f4f1e8';for(const x of[-27,-13,10,24])c.fillRect(x,-54,5,52);c.fillRect(-31,-58,64,6)}],
  b_bancada:['b',c=>{c.fillStyle='#2456a6';c.beginPath();c.moveTo(-42,0);c.lineTo(-38,-22);c.lineTo(-20,-22);c.lineTo(-16,0);c.fill();c.fillStyle='#f6cf1d';star(c,-29,-11,4.5);c.strokeStyle='#333';c.lineWidth=1.4;c.beginPath();c.moveTo(-29,-22);c.lineTo(-27,-31);c.stroke();c.fillStyle='#777';disc(c,-27,-32,2)}],
  b_bancada2:['b',c=>{c.fillStyle='#4b515c';for(const x of[-28,0,28]){c.beginPath();c.arc(x,-46,3.4,0,7);c.fill();rr(c,x-5,-43,10,9,2.4)}c.fillStyle='#2e3440';c.fillRect(-36,-34,72,5)}],
  boi:['b',(c,t,a,b,x)=>vaca(c,+x)],
  b_cerca:['b',c=>{c.fillStyle='#8a6a42';for(const x of[-36,-18,16,34])c.fillRect(x,-20,3,20);c.fillRect(-38,-16,76,2.4);c.fillRect(-38,-9,76,2.4)}],
  b_porteira:['b',c=>{c.fillStyle='#6a4a2a';c.fillRect(-44,-26,4,26);c.fillRect(-18,-26,4,26);c.strokeStyle='#8a6a42';c.lineWidth=2.4;c.beginPath();for(const y of[-22,-14,-6]){c.moveTo(-40,y);c.lineTo(-18,y)}c.moveTo(-40,-6);c.lineTo(-18,-22);c.stroke()}],
  b_carro:['b',c=>{miniCar(c,-32,'#f6cf1d',26);brFlag(c,-38,-30,12,8)}],
  b_caminhao:['b',c=>{c.fillStyle='#d9a400';rr(c,-48,-18,28,15,2);miniCar(c,-14,'#1f7a4d',16)}],
  b_cone:['b',c=>{for(const x of[-28,28]){c.fillStyle='#ff7a1c';c.beginPath();c.moveTo(x-6,1);c.lineTo(x,-15);c.lineTo(x+6,1);c.fill();c.fillStyle='#fff';c.fillRect(x-3,-7,6,2.4)}}],
  b_buzina:['b',c=>{c.fillStyle='#d8d8d8';c.beginPath();c.moveTo(18,-14);c.lineTo(40,-24);c.lineTo(40,-4);c.fill();c.fillStyle='#6a6a72';c.fillRect(12,-17,8,6)}],
  b_guarda:['b',c=>{pole(c,28,-42);for(let i=0;i<5;i++){c.fillStyle=i%2?'#f6cf1d':'#1f7a4d';c.beginPath();c.moveTo(28,-50);c.lineTo(10+i*7.2,-38);c.lineTo(17.2+i*7.2,-38);c.fill()}}],
  b_zap:['b',c=>{c.fillStyle='#35c46b';disc(c,28,-28,10);c.beginPath();c.moveTo(21,-22);c.lineTo(18,-14);c.lineTo(27,-19);c.fill();c.fillStyle='#fff';disc(c,24,-28,1.5);disc(c,28,-28,1.5);disc(c,32,-28,1.5)}],
  b_trator:['b',c=>{c.fillStyle='#1f7a4d';rr(c,-44,-18,22,11,2);c.fillStyle='#bfe3f5';c.fillRect(-42,-28,10,10);c.fillStyle='#22242a';disc(c,-42,-6,6.4);disc(c,-23,-5,4)}],
  b_silo:['b',c=>{c.fillStyle='#d8d8d8';c.fillRect(20,-40,20,40);c.fillStyle='#a8a8a8';c.beginPath();c.arc(30,-40,10,Math.PI,0);c.fill();c.fillStyle='#b8b8b8';c.fillRect(20,-28,20,2);c.fillRect(20,-15,20,2)}],
  b_celeiro:['b',c=>{c.fillStyle='#a6342c';c.fillRect(-30,-44,60,42);c.fillStyle='#7a241e';c.beginPath();c.moveTo(-34,-44);c.lineTo(0,-60);c.lineTo(34,-44);c.fill();c.strokeStyle='#fff';c.lineWidth=1.6;c.strokeRect(-11,-30,22,28)}],
  b_pix:['b',c=>{c.save();c.translate(-30,-30);c.rotate(Math.PI/4);c.fillStyle='#32bcad';c.fillRect(-11,-11,22,22);c.strokeStyle='#fff';c.lineWidth=2.2;c.strokeRect(-5,-5,10,10);c.restore()}],
  b_cercadinho:['b',c=>{c.strokeStyle='#c8c8c8';c.lineWidth=2.4;c.beginPath();c.moveTo(-36,-16);c.lineTo(36,-16);c.moveTo(-36,-5);c.lineTo(36,-5);c.stroke();c.fillStyle='#c8c8c8';for(const x of[-36,-12,12,34])c.fillRect(x,-18,2.4,18)}],
  b_tvlive:['b',c=>{c.fillStyle='#17181d';rr(c,14,-40,34,24,2);c.fillStyle='#7fd4ff';c.fillRect(17,-37,28,18);c.fillStyle='#fff';disc(c,23,-32,3);c.fillStyle='#d22';disc(c,23,-32,2.2);c.fillStyle='#17181d';c.fillRect(29,-16,4,16)}],
  b_estatua:['b',c=>{c.fillStyle='#b9b4a4';c.fillRect(24,-8,14,8);c.fillStyle='#6fb5a2';rr(c,27,-30,8,22,3);disc(c,31,-34,4);c.fillRect(35,-40,2,14);c.fillStyle='#ffb52c';disc(c,36,-42,2.6);c.fillStyle='#6fb5a2';for(const q of[-3,0,3])c.fillRect(31+q-.6,-41,1.2,4)}],
  b_loja:['b',c=>{c.fillStyle='#2456a6';c.fillRect(-36,-52,72,50);for(let i=0;i<8;i++){c.fillStyle=i%2?'#fff':'#f6cf1d';c.beginPath();c.moveTo(-36+i*9,-52);c.lineTo(-27+i*9,-52);c.lineTo(-27+i*9,-42);c.arc(-31.5+i*9,-42,4.5,0,Math.PI);c.fill()}c.fillStyle='#bfe3f5';c.fillRect(-30,-34,16,14);c.fillRect(14,-34,16,14)}],
  b_estatua2:['b',c=>{c.fillStyle='#b9b4a4';c.fillRect(-48,-18,26,18);c.fillStyle='#6fb5a2';rr(c,-43,-62,16,44,5);disc(c,-35,-70,8);c.fillRect(-27,-82,4,30);c.fillStyle='#ffb52c';disc(c,-25,-86,5);c.fillStyle='#6fb5a2';for(const q of[-6,-2,2,6])c.fillRect(-35+q-1,-82,2,8)}],
  c_medalhas:['c',c=>{for(let i=0;i<3;i++)for(let j=0;j<2;j++){c.fillStyle=['#c8102e','#2456a6','#f2b705'][(i+j)%3];c.fillRect(2+i*1.9,-15+j*1.5,1.7,1.2)}}],
  c_casaco:['c',(c,t,hy,bw)=>{c.fillStyle='#6a4a2a';for(let i=-3;i<=3;i++)disc(c,i*2.5,-18.6+Math.abs(i)*.2,1.9);c.fillStyle='#5a3d27';c.fillRect(-bw/2,-17,2.6,12.6);c.fillRect(bw/2-2.6,-17,2.6,12.6)}],
  c_faixaJudo:['c',(c,t,hy,bw)=>{c.fillStyle='#0d0d10';c.fillRect(-bw/2,-8.4,bw,2.2);c.fillRect(-1.2,-8.4,2.4,5)}],
  b_sacada:['b',c=>{c.fillStyle='#d8d0bc';c.fillRect(-30,-4,60,12);c.fillStyle='#b9b09a';for(let i=0;i<7;i++)c.fillRect(-28+i*9,-14,3.6,11);c.fillRect(-32,-17,64,4)}],
  b_trem:['b',c=>{c.fillStyle='#2e3440';rr(c,-52,-18,28,14,2);c.fillStyle='#bfe3f5';c.fillRect(-48,-15,8,5);c.fillRect(-37,-15,8,5);c.fillStyle='#22242a';disc(c,-46,-3,3.4);disc(c,-30,-3,3.4)}],
  b_pedestal:['b',c=>{c.fillStyle='#d8d0bc';c.fillRect(-20,-3,40,12);c.fillStyle='#f2b705';c.fillRect(-20,-3,40,2)}],
  b_mesaLonga:['b',c=>{c.fillStyle='#e8dcc0';c.fillRect(-58,-8,116,7);c.fillStyle='#b9a070';c.fillRect(-58,-1,116,2);c.fillRect(-54,1,3,8);c.fillRect(51,1,3,8)}],
  b_neve:['b',(c,t)=>{c.fillStyle='#ffffffd8';for(let i=0;i<14;i++){const f=(t*.35+i*.073)%1,x=-46+((i*37)%92)+Math.sin(t*2+i)*3;disc(c,x,-58+f*62,1.6)}}],
  b_vodca:['b',c=>{c.fillStyle='#d8eef8';rr(c,24,-24,9,24,2);c.fillRect(26.5,-30,4,7);c.fillStyle='#c8102e';c.fillRect(24,-14,9,4);c.fillStyle='#ffffffb0';rr(c,37,-8,6,8,1)}],
  b_cavalo:['b',c=>{c.fillStyle='#6a4a2a';rr(c,-54,-22,30,13,5);disc(c,-22,-27,6);c.fillRect(-28,-28,8,12);c.fillRect(-50,-11,3.4,12);c.fillRect(-32,-11,3.4,12);c.fillStyle='#2b1c12';c.fillRect(-27,-33,5,9)}],
  b_esteira:['b',(c,t)=>{c.fillStyle='#3a3a40';c.fillRect(-52,-8,34,6);c.fillStyle='#8a8f98';for(let i=0;i<5;i++)disc(c,-49+i*7,-2,1.6);c.fillStyle='#b98a4a';const x=-50+((t*14)%24);rr(c,x,-17,9,9,1)}],
  b_container:['b',c=>{for(const[y,k]of[[-11,'#2456a6'],[-23,'#c8102e']]){c.fillStyle=k;c.fillRect(20,y,32,12);c.fillStyle='#0003';for(let i=0;i<5;i++)c.fillRect(23+i*6,y+1,1.4,10)}}],
  b_fabrica:['b',(c,t)=>{c.fillStyle='#8a8f98';c.fillRect(-36,-40,72,38);c.fillRect(-28,-58,8,20);c.fillRect(14,-58,8,20);c.fillStyle='#bfe3f5';for(let i=0;i<4;i++)c.fillRect(-30+i*16,-32,10,10);const f=(t*.7)%1;c.fillStyle=`rgba(210,210,210,${.6-f*.6})`;disc(c,-24,-62-f*16,3+f*5);disc(c,18,-62-f*16,3+f*5)}],
  b_camera:['b',c=>{c.fillStyle='#6a6a72';c.fillRect(30,-40,2.4,40);c.fillStyle='#22242a';rr(c,18,-46,18,9,2);c.fillStyle='#d22';disc(c,20,-41.6,1.6)}],
  b_mapaRota:['b',c=>{pole(c,-38,-26);c.fillStyle='#e8dcc0';c.fillRect(-58,-44,40,20);c.strokeStyle='#c8102e';c.lineWidth=1.6;c.setLineDash([3,2]);c.beginPath();c.moveTo(-54,-30);c.quadraticCurveTo(-38,-44,-22,-34);c.stroke();c.setLineDash([])}],
  b_muralha:['b',c=>{c.fillStyle='#a8a08c';c.fillRect(-58,-14,116,14);c.fillStyle='#8f8774';for(let i=0;i<10;i++)c.fillRect(-58+i*12,-19,7,6)}],
  h_passaro:['h',(c,t,hy)=>{const f=Math.sin(t*16);c.fillStyle='#2f7fd0';c.beginPath();c.ellipse(5,hy-13,3.4,2.5,0,0,7);c.fill();disc(c,8,hy-14.4,1.9);c.fillStyle='#1f5fa8';c.beginPath();c.moveTo(4,hy-13);c.lineTo(1,hy-15.4-f*1.4);c.lineTo(6,hy-14);c.fill();c.fillStyle='#f2b705';c.beginPath();c.moveTo(9.6,hy-14.8);c.lineTo(11.6,hy-14.2);c.lineTo(9.6,hy-13.6);c.fill();c.fillStyle='#111';disc(c,8.4,hy-14.8,.4)}],
  b_notas:['b',c=>{for(let i=0;i<6;i++){c.fillStyle=i%2?'#6fa36a':'#86b880';c.fillRect(20+(i%2)*2,-3-i*3,20,2.7)}}],
  b_carrinho:['b',c=>{c.fillStyle='#22242a';disc(c,-44,-3,4);c.fillStyle='#6a4a2a';c.fillRect(-44,-9,28,3);c.fillStyle='#7c8088';c.beginPath();c.moveTo(-46,-10);c.lineTo(-20,-10);c.lineTo(-24,-20);c.lineTo(-44,-20);c.fill();c.fillStyle='#6fa36a';for(let i=0;i<4;i++){c.save();c.translate(-41+i*6,-23);c.rotate(i*.5-.7);c.fillRect(-5,-2,10,4);c.restore()}}],
  b_chuvaNotas:['b',(c,t)=>{for(let i=0;i<12;i++){const f=(t*.4+i*.083)%1,x=-48+((i*31)%96)+Math.sin(t*2+i)*5;c.save();c.translate(x,-72+f*72);c.rotate(Math.sin(t*3+i));c.fillStyle='#86b880';c.fillRect(-4.5,-2.2,9,4.4);c.restore()}}],
  b_onibus:['b',c=>{c.fillStyle='#c8102e';rr(c,-58,-24,36,20,3);c.fillStyle='#f2c81e';c.fillRect(-58,-12,36,3);c.fillStyle='#bfe3f5';for(let i=0;i<3;i++)c.fillRect(-55+i*11,-21,9,7);c.fillStyle='#22242a';disc(c,-50,-3,3.6);disc(c,-30,-3,3.6)}],
  h_boneVerm:['h',(c,t,hy)=>{c.fillStyle='#c8102e';c.beginPath();c.arc(0,hy-6.4,10.6,Math.PI,0);c.fill();rr(c,-12,hy-7.6,20,2.8,1.2);c.fillStyle='#fff';c.fillRect(-4.6,hy-13,9.2,3.4)}],
  b_muroT:['b',c=>{c.fillStyle='#a8583c';c.fillRect(-52,-24,34,24);c.strokeStyle='#7a3c28';c.lineWidth=.8;c.beginPath();for(let y=-20;y<0;y+=4){c.moveTo(-52,y);c.lineTo(-18,y)}c.stroke()}],
  b_guindaste:['b',c=>{c.strokeStyle='#d9a400';c.lineWidth=3;c.beginPath();c.moveTo(38,0);c.lineTo(38,-62);c.lineTo(8,-62);c.stroke();c.lineWidth=1;c.beginPath();c.moveTo(14,-62);c.lineTo(14,-44);c.stroke();c.fillStyle='#a8583c';c.fillRect(8,-44,12,7)}],
  b_golfe:['b',c=>{c.fillStyle='#6fbf5f';c.beginPath();c.ellipse(-36,-3,22,7,0,0,7);c.fill();c.fillStyle='#eee';c.fillRect(-30,-30,1.6,27);c.fillStyle='#c8102e';c.beginPath();c.moveTo(-28.4,-30);c.lineTo(-18,-26);c.lineTo(-28.4,-22);c.fill();c.fillStyle='#fff';disc(c,-44,-4,1.8)}],
  b_violao:['b',c=>{c.fillStyle='#b98a4a';c.beginPath();c.ellipse(32,-8,9,8,0,0,7);c.fill();c.beginPath();c.ellipse(32,-19,6.4,5.6,0,0,7);c.fill();c.fillStyle='#5a3a22';disc(c,32,-9,2.6);c.fillRect(30.8,-46,2.4,26)}],
  b_palcoArt:['b',c=>{c.fillStyle='#3a2a5a';c.fillRect(-34,-62,4,62);c.fillRect(30,-62,4,62);c.fillStyle='#6a3aa8';c.fillRect(-36,-68,72,9);c.fillStyle='#ffe27a';for(let i=0;i<5;i++)disc(c,-24+i*12,-58,2.6)}],
  b_palcoCurso:['b',c=>{c.fillStyle='#17181d';c.fillRect(-36,-66,72,30);c.fillStyle='#2456a6';c.fillRect(-33,-63,66,24);c.strokeStyle='#35c46b';c.lineWidth=2.4;c.beginPath();c.moveTo(-26,-44);c.lineTo(-12,-50);c.lineTo(0,-46);c.lineTo(18,-58);c.stroke();c.fillStyle='#35c46b';c.beginPath();c.moveTo(22,-61);c.lineTo(13,-59);c.lineTo(19,-53);c.fill();c.fillStyle='#f2b705';disc(c,-22,-56,4);c.fillStyle='#17181d';c.fillRect(-34,-36,3,36);c.fillRect(31,-36,3,36)}],
  b_funil:['b',c=>{c.fillStyle='#f2b705';c.beginPath();c.moveTo(16,-40);c.lineTo(48,-40);c.lineTo(36,-20);c.lineTo(36,-4);c.lineTo(28,-4);c.lineTo(28,-20);c.fill();c.fillStyle='#3f9e5c';c.fillRect(27,-3,10,4)}],
  b_cadeiras:['b',c=>{c.strokeStyle='#6a4326';c.lineWidth=2.4;c.beginPath();for(const[x,y]of[[26,0],[42,0],[34,-14]]){c.moveTo(x-6,y);c.lineTo(x-6,y-20);c.moveTo(x-6,y-10);c.lineTo(x+6,y-10);c.lineTo(x+6,y)}c.stroke()}],
  b_bancadaTV:['b',c=>{c.fillStyle='#17366e';c.fillRect(-36,-16,72,16);c.fillStyle='#d0162a';c.fillRect(-36,-20,72,4);c.fillStyle='#ff4040';c.beginPath();c.arc(0,-20,5,Math.PI,0);c.fill();c.fillStyle='#ffd0d0';disc(c,-1.6,-22,1.4);c.fillStyle='#fff';c.fillRect(-26,-11,52,2)}],
  b_heli:['b',(c,t)=>{const y=-66+Math.sin(t*2)*3;c.fillStyle='#d0162a';c.beginPath();c.ellipse(34,y,15,8,0,0,7);c.fill();c.fillRect(44,y-2,20,3);c.fillStyle='#bfe3f5';c.beginPath();c.ellipse(26,y-1,6,5,0,0,7);c.fill();c.strokeStyle='#22242a';c.lineWidth=2;const w=18*Math.abs(Math.sin(t*22));c.beginPath();c.moveTo(34-w,y-11);c.lineTo(34+w,y-11);c.moveTo(34,y-11);c.lineTo(34,y-7);c.stroke()}],
  b_farmacia:['b',c=>{c.fillStyle='#f4f8fc';c.fillRect(-52,-36,30,36);c.fillStyle='#2fa36a';c.fillRect(-40,-32,6,18);c.fillRect(-46,-26,18,6);c.fillStyle='#3b5a6b';c.fillRect(-42,-11,10,11)}],
  b_droneBase:['b',c=>{c.fillStyle='#45454d';disc(c,34,-3,15);c.fillStyle='#f2b705';c.font='700 15px Arial';c.textAlign='center';c.fillText('H',34,2)}],
  b_enxame:['b',(c,t)=>{for(let i=0;i<4;i++){const a=t*1.4+i*1.57,x=Math.cos(a)*34,y=-58+Math.sin(a)*9;c.fillStyle='#2e3440';c.fillRect(x-6,y-1.5,12,3);c.fillStyle='#8a909c';c.fillRect(x-9,y-3.4,6,1.2);c.fillRect(x+3,y-3.4,6,1.2);c.fillStyle='#ff4040';disc(c,x,y+2,1.2)}}],
  b_forno:['b',c=>{c.fillStyle='#b5704a';c.beginPath();c.arc(32,0,16,Math.PI,0);c.fill();c.fillStyle='#2e2420';c.beginPath();c.arc(32,0,8,Math.PI,0);c.fill();c.fillStyle='#ff8a2c';c.fillRect(27,-3,10,3)}],
  b_queijo:['b',c=>{c.fillStyle='#f2d67a';c.beginPath();c.ellipse(-34,-5,16,7,0,0,7);c.fill();c.fillRect(-50,-11,32,7);c.fillStyle='#ffe9a8';c.beginPath();c.ellipse(-34,-12,16,7,0,0,7);c.fill();c.fillStyle='#d9a400';disc(c,-38,-13,1.6);disc(c,-29,-11,1.2)}],
  b_banana:['b',c=>{c.strokeStyle='#f6cf1d';c.lineWidth=5;c.lineCap='round';for(let i=0;i<4;i++){c.beginPath();c.arc(-30+i*2,-22+i*5,12,.3,2.2);c.stroke()}c.fillStyle='#6a4a2a';c.fillRect(-26,-36,4,6)}],
  b_cestaPequi:['b',c=>{c.fillStyle='#b98a4a';c.beginPath();c.moveTo(20,-12);c.lineTo(46,-12);c.lineTo(42,0);c.lineTo(24,0);c.fill();c.fillStyle='#5f8a3e';for(const[x,y]of[[26,-14],[33,-16],[40,-14]])disc(c,x,y,4.4)}],
  b_pequizeiro:['b',c=>{c.fillStyle='#5a3d27';c.fillRect(-36,-34,5,34);c.fillStyle='#4c7a3a';disc(c,-34,-44,15);disc(c,-46,-36,10);disc(c,-22,-36,10);c.fillStyle='#d8e070';for(const[x,y]of[[-40,-44],[-28,-40],[-34,-52]])disc(c,x,y,2.6)}],
  b_maleta:['b',c=>{c.fillStyle='#2b211a';rr(c,20,-16,28,16,2.5);c.strokeStyle='#2b211a';c.lineWidth=2;c.beginPath();c.arc(34,-16,5,Math.PI,0);c.stroke();c.fillStyle='#fff';c.fillRect(32,-13,4,10);c.fillRect(29,-10,10,4)}],
  b_ambulancia:['b',c=>{c.fillStyle='#f4f8fc';rr(c,-56,-22,34,18,2);c.fillStyle='#d0162a';c.fillRect(-44,-18,10,3);c.fillRect(-40.5,-21,3,9);c.fillStyle='#bfe3f5';c.fillRect(-27,-19,4,7);c.fillStyle='#22242a';disc(c,-49,-3,3.6);disc(c,-29,-3,3.6)}],
  c_esteto:['c',c=>{c.strokeStyle='#2b2b30';c.lineWidth=1;c.beginPath();c.moveTo(-3.6,-19);c.quadraticCurveTo(-5,-10,0,-9.4);c.moveTo(3.6,-19);c.quadraticCurveTo(5,-10,0,-9.4);c.stroke();c.fillStyle='#c9ccd2';disc(c,0,-8.6,1.6)}],
  b_urna:['b',c=>{c.fillStyle='#d8d4c8';rr(c,20,-20,30,20,2);c.fillStyle='#2e3440';c.fillRect(23,-17,12,8);c.fillStyle='#17181d';for(let i=0;i<3;i++)for(let j=0;j<3;j++)c.fillRect(38+i*3.6,-17+j*4,2.6,2.6);c.fillStyle='#35c46b';c.fillRect(23,-6,12,3)}],
  b_micPe:['b',c=>{c.fillStyle='#22242a';c.fillRect(-32,-46,2.4,46);c.fillRect(-40,-2,18,3);c.fillStyle='#17181d';rr(c,-34,-54,7,10,3)}],
  b_votos:['b',c=>{c.fillStyle='#fff';for(let i=0;i<8;i++)c.fillRect(-46+(i%2)*3,-3-i*3.4,24,2.8);c.fillStyle='#1f7a4d';c.font='700 9px Arial';c.textAlign='center';c.fillText('X',-34,-30)}],
  b_ogiva:['b',c=>{c.fillStyle='#b9b09a';c.fillRect(20,-5,28,5);c.fillStyle='#3a3f48';c.beginPath();c.ellipse(34,-22,8,17,0,0,7);c.fill();c.fillStyle='#f2b705';disc(c,34,-22,3.4);c.fillStyle='#1a1612';for(let i=0;i<3;i++){c.beginPath();c.moveTo(34,-22);c.arc(34,-22,3.4,i*2.09,i*2.09+1.05);c.fill()}}],
  b_foguete:['b',c=>{c.fillStyle='#d8d4c8';c.fillRect(-42,-62,16,50);c.fillStyle='#d0162a';c.beginPath();c.moveTo(-42,-62);c.lineTo(-34,-82);c.lineTo(-26,-62);c.fill();c.beginPath();c.moveTo(-42,-22);c.lineTo(-52,-8);c.lineTo(-42,-12);c.fill();c.beginPath();c.moveTo(-26,-22);c.lineTo(-16,-8);c.lineTo(-26,-12);c.fill();c.fillStyle='#ff8a2c';c.beginPath();c.moveTo(-40,-12);c.lineTo(-34,2);c.lineTo(-28,-12);c.fill()}],
  b_lousa:['b',c=>{pole(c,38,-30);c.fillStyle='#2f5a3e';c.fillRect(16,-50,46,24);c.fillStyle='#f4f1e8';c.font='700 9px Arial';c.textAlign='center';c.fillText('E=mc²',39,-35)}],
  b_cestaManga:['b',c=>{c.fillStyle='#b98a4a';c.beginPath();c.moveTo(20,-12);c.lineTo(46,-12);c.lineTo(42,0);c.lineTo(24,0);c.fill();for(const[x,y]of[[26,-14],[33,-17],[40,-14]]){c.fillStyle='#f2a02c';disc(c,x,y,4.8);c.fillStyle='#d0432a';disc(c,x+1.4,y-1.6,1.8)}}],
  b_mangueira:['b',c=>{c.fillStyle='#5a3d27';c.fillRect(-37,-34,6,34);c.fillStyle='#3f7a32';disc(c,-34,-46,16);disc(c,-47,-37,11);disc(c,-21,-37,11);c.fillStyle='#f2a02c';for(const[x,y]of[[-42,-40],[-28,-36],[-34,-52],[-24,-46]])disc(c,x,y,3)}],
  b_cogu:['b',c=>{for(const[x,r,k]of[[26,7,'#d0162a'],[38,5,'#7a3ab0']]){c.fillStyle='#f4f1e8';c.fillRect(x-2,-8,4,8);c.fillStyle=k;c.beginPath();c.arc(x,-8,r,Math.PI,0);c.fill();c.fillStyle='#fff';disc(c,x-2,-11,1.3);disc(c,x+2.4,-10,1)}}],
  b_coguG:['b',c=>{c.fillStyle='#f4f1e8';c.fillRect(-42,-26,14,26);c.fillStyle='#d0162a';c.beginPath();c.arc(-35,-26,22,Math.PI,0);c.fill();c.fillStyle='#fff';for(const[x,y,r]of[[-46,-34,3.4],[-35,-41,3.8],[-24,-33,3],[-34,-30,2.4]])disc(c,x,y,r)}],
  b_musica:['b',(c,t)=>{for(let i=0;i<4;i++){const f=(t*.5+i/4)%1,x=-30+i*20+Math.sin(t*2+i)*4,y=-42-f*26;c.fillStyle=`rgba(122,58,176,${1-f})`;c.beginPath();c.ellipse(x,y,3,2.2,-.3,0,7);c.fill();c.fillRect(x+2,y-11,1.4,11);c.fillRect(x+2,y-11,6,2)}}],
  b_banquinho:['b',c=>{c.fillStyle='#8a5a30';c.fillRect(-46,-20,20,4);c.fillRect(-44,-16,3,16);c.fillRect(-31,-16,3,16)}],
  b_amp:['b',c=>{c.fillStyle='#17181d';rr(c,20,-30,28,30,2);c.fillStyle='#3a3a40';disc(c,34,-12,10);c.fillStyle='#17181d';disc(c,34,-12,3.6);c.fillStyle='#d9a400';for(let i=0;i<3;i++)disc(c,26+i*8,-26,1.4)}],
  b_pratoSushi:['b',c=>{c.fillStyle='#17181d';rr(c,18,-8,32,8,2);for(let i=0;i<3;i++){const x=24+i*10;c.fillStyle='#1f2a24';disc(c,x,-12,4.6);c.fillStyle='#f4f1e8';disc(c,x,-12,3.2);c.fillStyle='#f2703a';disc(c,x,-12,1.5)}}],
  b_barcoSushi:['b',c=>{c.fillStyle='#8a5a30';c.beginPath();c.moveTo(-62,-16);c.lineTo(-18,-16);c.lineTo(-26,-2);c.lineTo(-54,-2);c.fill();for(let i=0;i<4;i++){const x=-54+i*10;c.fillStyle='#f4f1e8';rr(c,x-4,-22,8,6,2);c.fillStyle='#f2703a';rr(c,x-4,-25,8,3.4,1.4)}c.fillStyle='#6a4326';c.fillRect(-41,-44,2,22);c.fillStyle='#fff';c.beginPath();c.moveTo(-39,-44);c.lineTo(-24,-34);c.lineTo(-39,-30);c.fill()}],
  b_velas:['b',(c,t)=>{for(const[x,h]of[[24,18],[33,24],[42,14]]){c.fillStyle='#f4f1e8';c.fillRect(x-2,-h,4,h);c.fillStyle='#ffb52c';c.beginPath();c.ellipse(x,-h-4+Math.sin(t*9+x)*.8,2,4,0,0,7);c.fill()}}],
  b_capela:['b',c=>{c.fillStyle='#f4f1e8';c.fillRect(-52,-30,30,30);c.fillStyle='#a6342c';c.beginPath();c.moveTo(-56,-30);c.lineTo(-37,-46);c.lineTo(-18,-30);c.fill();c.fillStyle='#5a3a22';c.fillRect(-41,-16,8,16);c.fillStyle='#d9a400';c.fillRect(-38,-58,2,13);c.fillRect(-42,-54,10,2)}],
  b_quermesse:['b',c=>{c.fillStyle='#6a4a2a';c.fillRect(18,-36,2,36);c.fillRect(56,-36,2,36);for(let i=0;i<5;i++){c.fillStyle=i%2?'#f2b705':'#d0162a';c.fillRect(16+i*9,-44,9,9)}c.fillStyle='#b98a4a';c.fillRect(18,-14,40,14);for(const x of[26,38,50]){c.fillStyle='#e8c84a';c.beginPath();c.ellipse(x,-18,2.8,5,0,0,7);c.fill();c.fillStyle='#7aa84a';c.beginPath();c.moveTo(x-3.4,-14);c.lineTo(x-1,-22);c.lineTo(x,-14);c.fill()}}],
  b_caixao:['b',c=>{c.fillStyle='#3a2616';c.beginPath();c.moveTo(24,-40);c.lineTo(42,-40);c.lineTo(50,-26);c.lineTo(42,0);c.lineTo(24,0);c.lineTo(16,-26);c.fill();c.fillStyle='#d9c7a0';c.fillRect(32,-32,2.4,18);c.fillRect(27,-26,12,2.4)}],
  b_morcegosV:['b',(c,t)=>{for(let i=0;i<4;i++){const a=t*1.8+i*1.57,x=Math.cos(a)*30,y=-58+Math.sin(a)*12,f=Math.sin(t*20+i)*4;c.fillStyle='#17141f';c.beginPath();c.moveTo(x,y);c.lineTo(x-10,y-3-f);c.lineTo(x-5,y+2);c.lineTo(x,y+4);c.lineTo(x+5,y+2);c.lineTo(x+10,y-3-f);c.fill()}}],
  b_lua:['b',c=>{c.fillStyle='#f4eec0';disc(c,-30,-58,15);c.fillStyle='#d8d0a0';disc(c,-35,-62,3);disc(c,-25,-54,2.2)}],
  b_castelo:['b',c=>{c.fillStyle='#4a4a56';c.fillRect(-36,-44,72,42);for(let i=0;i<7;i++)c.fillRect(-36+i*11,-50,7,7);c.fillRect(-42,-62,14,60);c.fillRect(28,-62,14,60);c.fillStyle='#f2c94a';for(const x of[-37,33])c.fillRect(x,-50,4,7)}],
  b_serra:['b',c=>{c.fillStyle='#6f7a58';for(const[x,h,w]of[[-34,40,24],[-14,52,28],[12,44,26],[34,36,22]]){c.beginPath();c.moveTo(x-w,0);c.lineTo(x,-h);c.lineTo(x+w,0);c.fill()}c.fillStyle='#f4f1e8';c.beginPath();c.moveTo(-20,-41);c.lineTo(-14,-52);c.lineTo(-8,-41);c.fill()}],
  b_motoChe:['b',c=>{c.fillStyle='#22242a';disc(c,-44,-5,5.4);disc(c,-22,-5,5.4);c.fillStyle='#8a8f98';disc(c,-44,-5,2);disc(c,-22,-5,2);c.fillStyle='#3a3a40';rr(c,-44,-13,22,6,2);c.fillStyle='#c8102e';rr(c,-37,-17,10,5,2)}],
  b_arara:['b',c=>{c.fillStyle='#6a4a2a';c.fillRect(20,-40,2,40);c.fillRect(50,-40,2,40);c.fillRect(20,-40,32,2);for(let i=0;i<3;i++){const x=27+i*9;c.fillStyle='#f4f1e8';c.fillRect(x-3.4,-37,7,11);c.fillStyle='#17140f';disc(c,x,-32,1.8);c.fillStyle='#c8102e';star(c,x,-34.2,1)}}],
  b_sacoAreia:['b',c=>{c.fillStyle='#c9b48a';for(const[x,y]of[[36,-5],[47,-5],[58,-5],[41,-12],[52,-12]])rr(c,x-6,y-3,12,7,3)}],
  b_guarita:['b',c=>{c.fillStyle='#6a6f5a';c.fillRect(-64,-46,24,46);c.fillStyle='#3a3f30';c.fillRect(-68,-52,32,7);c.fillStyle='#17181d';c.fillRect(-59,-38,14,8)}],
  b_bolsaSobe:['b',c=>{c.fillStyle='#17181d';rr(c,25,-36,34,36,2);c.fillStyle='#35c46b';[8,13,11,19,25].forEach((h,i)=>c.fillRect(29+i*5.6,-4-h,4,h));c.strokeStyle='#ffe27a';c.lineWidth=1.6;c.beginPath();c.moveTo(29,-14);c.lineTo(42,-20);c.lineTo(55,-31);c.stroke()}],
  b_carroForte:['b',c=>{c.fillStyle='#5a6a4a';rr(c,25,-18,34,14,2);c.fillStyle='#9fd6ee';c.fillRect(49,-16,8,6);c.fillStyle='#f2b705';c.font='700 9px Arial';c.textAlign='center';c.fillText('$',36,-8);c.fillStyle='#17181d';disc(c,32,-3,3.6);disc(c,52,-3,3.6)}],
  b_trave:['b',c=>{c.strokeStyle='#fff';c.lineWidth=3;c.beginPath();c.moveTo(-38,0);c.lineTo(-38,-46);c.lineTo(38,-46);c.lineTo(38,0);c.stroke();c.strokeStyle='#ffffff66';c.lineWidth=.7;c.beginPath();for(let i=1;i<9;i++){c.moveTo(-38+i*8.4,-46);c.lineTo(-38+i*8.4,0)}for(let j=1;j<5;j++){c.moveTo(-38,-46+j*9);c.lineTo(38,-46+j*9)}c.stroke()}],
  b_trofeu:['b',c=>{c.fillStyle='#e0b020';rr(c,-52,-30,14,16,3);c.strokeStyle='#e0b020';c.lineWidth=2;c.beginPath();c.arc(-55,-24,4,0,7);c.moveTo(-31,-24);c.arc(-35,-24,4,0,7);c.stroke();c.fillRect(-47,-14,4,8);c.fillStyle='#7a4a2a';c.fillRect(-52,-6,14,6)}],
  b_ovos:['b',c=>{for(const[x,r]of[[-44,7],[-34,6],[-26,7.5]]){c.fillStyle='#e8dcc4';c.beginPath();c.ellipse(x,-r,r*.8,r,0,0,7);c.fill();c.fillStyle='#7a9a5e';disc(c,x-1,-r-1,1.4);disc(c,x+1.6,-r+2,1)}}],
  b_ossada:['b',c=>{c.strokeStyle='#efe6d0';c.lineWidth=3;c.lineCap='round';c.beginPath();c.moveTo(24,-18);c.quadraticCurveTo(40,-32,56,-18);for(const x of[30,37,44,51]){c.moveTo(x,-26);c.lineTo(x+1,-7)}c.stroke()}],
  b_dinoGrande:['b',c=>{c.fillStyle='#4f7a3a';c.beginPath();c.moveTo(-34,-34);c.quadraticCurveTo(-60,-38,-70,-22);c.quadraticCurveTo(-54,-24,-36,-22);c.fill();c.beginPath();c.ellipse(-30,-34,17,12,-.25,0,7);c.fill();c.beginPath();c.moveTo(-24,-42);c.lineTo(-14,-58);c.lineTo(-6,-50);c.lineTo(-16,-28);c.fill();rr(c,-18,-66,28,14,4);c.fillStyle='#3a5e2a';c.fillRect(-40,-26,8,26);c.fillRect(-26,-26,8,26);c.fillStyle='#fff';disc(c,-8,-61,2.8);c.fillStyle='#17181d';disc(c,-7,-61,1.5);c.fillStyle='#fff';for(let i=0;i<5;i++){c.beginPath();c.moveTo(-6+i*3.2,-52);c.lineTo(-4.4+i*3.2,-48);c.lineTo(-2.8+i*3.2,-52);c.fill()}}],
  b_muda:['b',c=>{c.fillStyle='#7a4a2a';rr(c,26,-9,14,9,2);c.fillStyle='#3f9e5c';c.beginPath();c.ellipse(29,-15,4,7,-.6,0,7);c.fill();c.beginPath();c.ellipse(37,-15,4,7,.6,0,7);c.fill()}],
  b_arvoreM:['b',c=>{c.fillStyle='#6a4326';c.fillRect(38,-30,7,30);c.fillStyle='#2f7a3e';disc(c,41,-44,16);disc(c,30,-36,10);disc(c,52,-36,10)}],
  b_matinha:['b',c=>{for(const[x,r]of[[-54,12],[-36,15],[-18,11]]){c.fillStyle='#6a4326';c.fillRect(x-2,-r*2,4,r*2);c.fillStyle=r>12?'#2f7a3e':'#3f9e5c';disc(c,x,-r*2.4,r)}}],
  b_serraPe:['b',c=>{c.fillStyle='#e8701a';rr(c,-54,-24,17,14,2);c.fillStyle='#c9ced6';c.fillRect(-37,-21,24,8);c.fillStyle='#2a2a2e';for(let i=0;i<8;i++){c.fillRect(-37+i*3,-23,1.6,2);c.fillRect(-37+i*3,-13,1.6,2)}c.fillStyle='#17181d';c.fillRect(-50,-10,9,10)}],
  b_leaoM:['b',c=>{c.fillStyle='#b5701f';disc(c,36,-13,12.5);c.fillStyle='#e0a94a';disc(c,36,-12,8.2);c.fillStyle='#2a1c10';disc(c,33,-14,1.2);disc(c,39,-14,1.2);c.fillRect(35,-10.6,2,1.6)}],
  b_grade:['b',c=>{c.fillStyle='#565c66';for(let i=0;i<7;i++)c.fillRect(-36+i*12,-46,3,46);c.fillRect(-38,-46,76,4);c.fillRect(-38,-24,76,3)}],
  b_presidio:['b',c=>{c.fillStyle='#9aa0a8';c.fillRect(-58,-38,20,38);c.fillRect(38,-38,20,38);c.fillStyle='#6a7078';c.fillRect(-61,-42,26,5);c.fillRect(35,-42,26,5);c.fillStyle='#1c1f26';for(const x of[-54,-47,42,49])c.fillRect(x,-30,3,10)}],
  b_cameras:['b',c=>{pole(c,-44,-46);c.fillStyle='#e8eaee';c.fillRect(-54,-48,17,7);c.fillStyle='#1c1f26';disc(c,-54,-44.5,2.6)}],
  b_bitcoin:['b',c=>{c.fillStyle='#f2931a';disc(c,36,-12,11);c.fillStyle='#fff';c.font='700 14px Arial';c.textAlign='center';c.fillText('B',36,-7)}],
  b_tribuna:['b',c=>{c.fillStyle='#6a4a2a';c.fillRect(-20,-8,40,8);c.fillStyle='#c8102e';c.fillRect(-20,-8,40,3)}],
  b_bandVerm:['b',c=>{for(const x of[-46,46]){pole(c,x,-56);c.fillStyle='#c8102e';c.fillRect(x,-56,x<0?14:-14,10)}}],
  b_engrenagem:['b',c=>{c.fillStyle='#8a8f98';for(let i=0;i<8;i++){const a=i*Math.PI/4;c.fillRect(38+Math.cos(a)*11-2,-13+Math.sin(a)*11-2,4,4)}disc(c,38,-13,10);c.fillStyle='#3a3f48';disc(c,38,-13,4)}],
  b_kremlin:['b',c=>{c.fillStyle='#a8322a';c.fillRect(-58,-26,22,26);c.fillStyle='#3f7a32';c.beginPath();c.moveTo(-58,-26);c.quadraticCurveTo(-47,-46,-36,-26);c.fill();c.fillStyle='#f2b705';star(c,-47,-44,3)}],
  b_faixaGreve:['b',c=>{c.fillStyle='#f4ead5';c.fillRect(-25,-33,50,13);c.fillStyle='#c8102e';for(const x of[-14,0,14]){rr(c,x-3.4,-29.6,6.8,5.6,1.6);c.fillRect(x-2,-25,4,4.4)}}],
  b_festaPredio:['b',c=>{c.translate(0,14);GEAR.b_bandeirinhas[1](c)}],
  b_moto:['b',c=>{c.fillStyle='#22242a';disc(c,-42,-5,5.4);disc(c,-22,-5,5.4);c.fillStyle='#1f7a4d';rr(c,-42,-15,20,8,3);c.fillStyle='#f6cf1d';rr(c,-36,-18,10,5,2)}],
};
function gear(c,L,layer,t,hy,bw){
  if(!L.gear)return;
  for(const id of L.gear){const[k,x]=id.split(':'),G=GEAR[k];if(G&&G[0]===layer){c.save();G[1](c,t,hy,bw,x);c.restore()}}
}
/* o que cada melhoria muda na aparência: texto = acessório, objeto = troca de item */
const VIS={
  militante:[[{hold:'megafone'},'k_mochila','k_bandeira'],['h_binoculo','c_colete','b_tenda']],
  dilma:[['b_nuvem','h_louro','b_furacao'],['ic:alvo','h_oculos','ic2:mandioca']],
  churras:[['b_fogo','b_churrasqueira','h_chefOuro'],[{hold:'espetos'},'b_isopor','b_bandeirinhas']],
  haddad:[[{hold:'calculadora'},'b_maquina','b_pilha'],[{hold:'lupa'},'b_dinheiro','b_leao']],
  janones:[['b_tripe','h_headset','b_ringlight'],['b_print','b_coracoes','b_satelite']],
  marx:[['b_livros',{hold:'book2'},'b_livros2'],['b_saco','k_bandeira','b_globo']],
  sindicato:[['b_caixasom','b_faixaGreve','b_palanque'],['ic:prancheta','ic2:apito','b_festaPredio']],
  xandao:[['b_pilha','b_mesa','b_tarja'],['b_celBloq','b_cofre','b_colunas']],
  lula:[['c_bottons','b_churrasqueira','b_isopor'],['icA:picanha','b_palanque','c_faixaPres']],
  patriota:[['k_flagBR','b_zap','b_carro'],['h_binoculo','c_coleteBR','b_tendaBR']],
  nikolas:[['b_tripe','h_headset','b_pix'],['b_coracoes','b_zap',{nome:'Nicole',wig:1,hold:null,pose:'hairhands',talk:1,shirt:'#1b2a55',pants:'#1b2a55',sleeve:'#263a70'}]],
  agro:[['boi:30','b_cerca','boi:-34'],['k_laco','b_porteira','boi:0']],
  pavanato:[['b_tripe','b_ringlight','h_oculos'],['b_print','b_saco','b_satelite']],
  flavio:[['b_pilha','b_bancada','b_bancada2'],['b_dinheiro','c_medalha','c_faixaPres']],
  caminhoneiro:[['b_buzina','c_medalha','b_caminhao'],['c_coleteBR','b_cone','b_guarda']],
  empresario:[['b_saco','b_trator','b_silo'],['c_bottons','ic:trigo','b_celeiro']],
  che:[[{bigStar:1},'b_serra','k_bandeira'],['b_motoChe','b_cartazes','b_arara']],
  mussolini:[[{jaw:1.04,headH:11.4},'b_sacada','ic:microfone'],['b_trem','c_medalhas','b_pedestal']],
  putin:[['c_casaco','b_mesaLonga','b_neve'],['c_faixaJudo','b_vodca','b_cavalo']],
  artista:[['b_violao','ic:mascaras','b_palcoArt'],['b_coracoes','ic2:claquete','b_saco']],
  marcal:[['ic:laptop','b_tvlive','b_palcoCurso'],['b_coracoes','b_funil','b_dinheiro']],
  vampirao:[['b_caixao','ic2:carta','b_morcegosV'],['b_lua','b_castelo','b_saco']],
  kelmon:[['b_velas','b_capela','ic:biblia'],['b_bandeirinhas','b_quermesse','b_tvlive']],
  milei:[['ic:vassoura','b_serraPe','b_palanque'],['ic2:tesoura','b_dinheiro','b_leaoM']],
  bukele:[['ic:algemas','b_grade','b_presidio'],['ic2:distintivo','b_cameras','b_bitcoin']],
  lenin:[['ic:jornal','b_tribuna','b_bandVerm'],['ic2:foiceMartelo','b_engrenagem','b_kremlin']],
  dino:[['ic:martelo','b_pilha','b_colunas'],['ic2:balanca','b_cofre','boi:30']],
  mendonca:[['ic:lupa','b_livros','b_colunas'],['ic2:biblia','b_mesa','b_capela']],
  churchill:[['ic:xicara','b_mesa','b_palanque'],['ic2:maoV','b_cerca','b_colunas']],
  thatcher:[['ic:ferro','b_mesa','b_colunas'],['ic2:bolsa','b_pilha','b_cofre']],
  friedman:[['b_livros','ic:lapis','b_dinheiro'],['ic2:medalha','b_mesa','b_cofre']],
  reagan:[['ic:chapeuCowboy','b_palanque','b_tvlive'],['ic2:pote','b_mesa','b_dinheiro']],
  clacerda:[['ic:jornal','b_pilha','b_palanque'],['ic2:corvo','b_tvlive','b_colunas']],
  nixon:[['ic:maoV','b_mesa','b_colunas'],['ic2:gravador','b_tvlive','b_cofre']],
  gaulle:[['ic:cruzLorena','b_cerca','b_palanque'],['ic2:baguete','b_colunas','b_mesa']],
  zapata:[['ic:enxada','b_cerca','boi:30'],['ic2:sombrero','b_mesa','b_palanque']],
  owen:[['ic2:aperto','b_dinheiro','b_bolsaSobe'],['b_cofre','ic:moeda','b_carroForte']],
  prestes:[['b_sacoAreia','ic:bussola','b_guarita'],['b_dinheiro','ic2:foiceMartelo','b_cofre']],
  arouca:[['ic:seringa','b_mesa','b_palanque'],['ic2:kitMed','b_tripe','b_tvlive']],
  rosa:[['ic:rosa','b_pilha','b_palanque'],['ic2:pena','b_livros','b_caixasom']],
  goldman:[['ic:notaMus','b_caixasom','b_palanque'],['ic2:corrente','b_ringlight','b_tvlive']],
  helder:[['ic:pao','b_livros','b_colunas'],['ic2:pomba','b_mesa','b_capela']],
  stalin:[['ic:foiceMartelo','b_ogiva','b_foguete'],['b_bandVerm','ic2:estrelaVerm','b_kremlin']],
  abbas:[['ic:globoONU','b_pilha','b_colunas'],['ic2:pomba','b_mesa','b_tvlive']],
  miliciano:[['b_sacoAreia','ic:capacete','b_guarita'],['b_dinheiro','ic2:envDin','b_cofre']],
  empresarios:[['ic2:pasta','b_dinheiro','b_bolsaSobe'],['b_cofre','ic:moeda','b_carroForte']],
  ratinho:[['b_queijo','ic:dna','b_palanque'],['ic2:microfone','b_tvlive','b_ringlight']],
  neymar:[['ic:bola','b_trave','b_trofeu'],['ic2:chuteira','b_dinheiro','b_cofre']],
  gusttavo:[['ic:copo','b_caixasom','b_palanque'],['ic2:chapeuCowboy','b_ringlight','b_tvlive']],
  xuxa:[['ic:nave','b_caixasom','b_palanque'],['ic2:botaBranca','b_tvlive','b_ringlight']],
  ana:[['ic:trigo','boi:30','b_palanque'],['ic2:chapeuCowboy','b_caixasom','b_tvlive']],
  pabllo:[['b_caixasom','b_ringlight','b_palanque'],['ic2:luvaBox','b_tripe','b_tvlive']],
  anitta:[['ic:microfone','b_caixasom','b_palanque'],['ic2:sol','b_ringlight','b_tvlive']],
  musk:[['ic:carroEle','b_dinheiro','b_cofre'],['b_satelite','ic2:marte','b_foguete']],
  marina:[['b_ovos','b_ossada','b_dinoGrande'],['b_muda','b_arvoreM','b_matinha']],
  gilmar:[['ic:bonde','b_mesa','b_colunas'],['ic2:ampulheta','b_pilha','b_cofre']],
  toffoli:[['ic:borracha','b_pilha','b_colunas'],['ic2:martelo','b_livros','b_cofre']],
  nunes:[['ic:caju','b_mesa','b_colunas'],['ic2:balanca','b_urna','b_tvlive']],
  fux:[['ic:guitarra','b_pilha','b_colunas'],['ic2:martelo','b_mesa','b_dinheiro']],
  fachin:[['ic:pastas','b_pilha','b_colunas'],['ic2:carimbo','b_livros','b_cofre']],
  zanin:[['ic:chave','b_livros','b_cofre'],['ic2:pasta','b_pilha','b_mesa']],
  carmen:[['ic:livroLei','b_livros','b_colunas'],['ic2:balanca','b_urna','b_tvlive']],
  kim:[['b_pilha','b_bancada','ic:carimbo'],['b_pratoSushi','ic2:hashi','b_barcoSushi']],
  renan:[['b_cogu','b_coguG','ic:bussola'],['b_musica','b_banquinho','b_amp']],
  manga:[['b_cestaManga','b_mangueira','ic:chave'],['b_caixasom','b_tripe','b_ringlight']],
  eneas:[['icA:atomo','b_ogiva','b_foguete'],['ic2:microfone','b_lousa','b_tvlive']],
  eduarda:[['ic:buque','b_urna','h_louro'],['b_micPe','b_tripe','b_votos']],
  caiado:[['b_cestaPequi','boi:-34','b_pequizeiro'],['c_esteto','b_maleta','b_ambulancia']],
  zema:[['b_forno','b_queijo','ic:laranja'],['b_banana','ic2:etiqueta','b_dinheiro']],
  cury:[['b_livros','b_farmacia','ic:xicara'],['b_droneBase','b_satelite','b_enxame']],
  datena:[['b_cadeiras','b_bancadaTV','ic:microfone'],['b_tvlive','b_heli','b_dinheiro']],
  trump:[['b_muroT','b_guindaste','ic:hamburguer'],['ic2:etiqueta','h_boneVerm','b_golfe']],
  maduro:[['b_notas','b_carrinho','b_chuvaNotas'],['h_passaro','b_tvlive','b_onibus']],
  xi:[['b_esteira','b_container','b_fabrica'],['b_camera','b_mapaRota','b_muralha']],
  veio:[['b_estatua','b_loja','b_estatua2'],['ic2:etiqueta','ic:sacola','b_dinheiro']],
  bolsonaro:[['b_cercadinho','b_tvlive','h_louro'],['k_capaBR','b_moto','b_palanqueBR']],
};
function buildLook(t){
  const v=VIS[t.key],L={...LOOKS[t.key],gear:[]};
  if(!v)return L;
  const add=x=>{if(typeof x==='string')L.gear.push(x);else Object.assign(L,x)};
  for(let i=0;i<t.a;i++)add(v[0][i]);
  for(let i=0;i<t.b;i++)add(v[1][i]);
  return L;
}
function char(c,L,x,y,s,t,o={}){
  const aim=o.aim??-1.15,ph=o.ph||0,walk=o.walk?Math.sin(t*11+ph)*2.4:0;
  const skin=L.skin||SK[(ph*13|0)%4];
  c.save();c.translate(x,y);c.scale(s,s);
  if(o.shadow!==false){c.fillStyle='#0003';c.beginPath();c.ellipse(0,1,10,3.4,0,0,7);c.fill()}
  if(L.flag){const w=Math.sin(t*7+ph)*2.5;c.save();c.translate(0,-17);c.transform(1,0,.12*w/2.5,1,0,0);brFlag(c,-13+w*.2,-2,26,18);c.restore()}
  if(L.flagR){const w=Math.sin(t*7+ph)*2.5;c.save();c.translate(0,-17);c.transform(1,0,.12*w/2.5,1,0,0);redFlag(c,-13+w*.2,-2,26,18);c.restore()}
  /* heróis exclusivos: brilho em volta e capa de herói (atrás do corpo) */
  if(L.brilho){const g=c.createRadialGradient(0,-22,4,0,-22,30);g.addColorStop(0,L.brilho+"88");g.addColorStop(1,L.brilho+"00");c.fillStyle=g;c.beginPath();c.ellipse(0,-22,28,32,0,0,7);c.fill()}
  if(L.capa){const w=Math.sin(t*5+ph)*1.6;c.fillStyle=L.capaB||"#0d0d10";c.beginPath();c.moveTo(-9,-21);c.lineTo(-16-w,1);c.lineTo(16+w,1);c.lineTo(9,-21);c.fill();c.fillStyle=L.capa;c.beginPath();c.moveTo(-7.6,-20);c.lineTo(-14-w,-.5);c.lineTo(14+w,-.5);c.lineTo(7.6,-20);c.fill()}
  if(L.capeV){c.fillStyle='#0d0d10';c.beginPath();c.moveTo(-9,-21);c.lineTo(-17,-1);c.lineTo(17,-1);c.lineTo(9,-21);c.fill();c.fillStyle='#8f0b20';c.beginPath();c.moveTo(-7,-20);c.lineTo(-13,-2);c.lineTo(13,-2);c.lineTo(7,-20);c.fill();c.fillStyle='#0d0d10';c.beginPath();c.moveTo(-9,-22);c.lineTo(-15,-30);c.lineTo(-6,-24);c.moveTo(9,-22);c.lineTo(15,-30);c.lineTo(6,-24);c.fill()}
  gear(c,L,'k',t);
  c.fillStyle=L.pants||'#2b3a67';rr(c,-6,-7+walk*.5,5,8,2);rr(c,1,-7-walk*.5,5,8,2);
  if(L.hs){c.fillStyle='#0d0d10';rr(c,-7,-1.6+walk*.5,6.4,3,1.2);rr(c,.6,-1.6-walk*.5,6.4,3,1.2)}
  if(L.sneaker){c.fillStyle='#f2efe6';rr(c,-7,-.4+walk*.5,6.4,1.8,.8);rr(c,.6,-.4-walk*.5,6.4,1.8,.8)}
  const bw=L.big?20:17;
  c.fillStyle=L.shirt;rr(c,-bw/2,-19,bw,15,5);
  if(L.collar){c.fillStyle=L.collar;c.beginPath();c.moveTo(-4,-19);c.lineTo(0,-14.5);c.lineTo(4,-19);c.fill();c.fillStyle='#1f7a4d';disc(c,3.6,-11,1.1)}
  if(L.star){c.fillStyle='#fff';star(c,0,-11.5,4.2)}
  if(L.suit){c.fillStyle=L.shirtIn||'#eef';c.beginPath();c.moveTo(-3.6,-19);c.lineTo(0,-10);c.lineTo(3.6,-19);c.fill();c.fillStyle=L.tie;c.beginPath();c.moveTo(-1.2,-18);c.lineTo(1.2,-18);c.lineTo(1.6,-11);c.lineTo(0,-9.6);c.lineTo(-1.6,-11);c.fill()}
  if(L.apron){c.fillStyle='#f4f0e6';rr(c,-6,-15,12,11.5,2)}
  if(L.sash){c.save();c.beginPath();c.moveTo(-bw/2,-18);c.lineTo(-bw/2+5,-19);c.lineTo(bw/2,-7);c.lineTo(bw/2-5,-5);c.closePath();c.fillStyle='#1f8a4d';c.fill();c.strokeStyle='#f6cf1d';c.lineWidth=1.7;c.lineCap='butt';c.beginPath();c.moveTo(-bw/2+2.5,-18.5);c.lineTo(bw/2-2.5,-6);c.stroke();c.fillStyle='#f2b705';disc(c,-1.6,-11.6,2.5);c.fillStyle='#22408f';disc(c,-1.6,-11.6,1.2);c.restore()}
  if(L.flagPin)brFlag(c,3.6,-16.6,3.6,2.5);
  if(L.toga){
    c.fillStyle='#b9c6e6';c.beginPath();c.moveTo(-4.4,-19);c.lineTo(0,-8);c.lineTo(4.4,-19);c.fill();
    c.fillStyle='#8a4a6a';c.beginPath();c.moveTo(-1.2,-18);c.lineTo(1.2,-18);c.lineTo(1.6,-11);c.lineTo(0,-9.2);c.lineTo(-1.6,-11);c.fill();
    c.fillStyle='#2e2e36';c.fillRect(-bw/2,-19,3,15);c.fillRect(bw/2-3,-19,3,15);
    c.strokeStyle='#050507';c.lineWidth=.7;c.setLineDash([.9,.7]);c.beginPath();c.moveTo(-4.8,-19);c.lineTo(-.8,-8);c.moveTo(4.8,-19);c.lineTo(.8,-8);c.stroke();c.setLineDash([]);
  }
  if(L.blazer){c.fillStyle=L.blazerIn||'#7d0b1c';c.beginPath();c.moveTo(-4.4,-19);c.lineTo(0,-9);c.lineTo(4.4,-19);c.fill();c.strokeStyle='#6d0918';c.lineWidth=.8;c.beginPath();c.moveTo(-5.4,-19);c.lineTo(-1,-8);c.lineTo(-1,-4.5);c.moveTo(5.4,-19);c.lineTo(1,-8);c.stroke()}
  if(L.chain){c.fillStyle='#f4efe2';for(let i=-4;i<=4;i++){const q=(16-i*i)/16;disc(c,i*.7,-18+q*5.4,.42);disc(c,i*.95,-18+q*8,.42)}}
  if(L.pinR){c.fillStyle='#d9a400';disc(c,5.6,-15.6,1.4);c.strokeStyle='#2fa36a';c.lineWidth=.9;c.beginPath();c.arc(5.6,-12.2,1.2,0,3.2);c.stroke();c.strokeStyle='#e0533a';c.beginPath();c.arc(5.6,-12.2,1.2,3.2,6.4);c.stroke()}
  if(L.neck){c.fillStyle='#f2b705';for(let i=-3;i<=3;i++)disc(c,i*1.25,-17.6+(9-i*i)*.33,.72)}
  if(L.mst){c.fillStyle='#f7f3e8';disc(c,0,-11.8,5.4);c.fillStyle='#2f8a3e';c.beginPath();c.ellipse(.3,-13.2,3.6,2.3,.2,0,7);c.fill();c.fillStyle='#c8102e';disc(c,.8,-12,1.2);/* faixa sem letras embaixo do emblema */c.fillStyle='#1d1a16';c.fillRect(-3.2,-8.8,6.4,1.4)}
  if(L.scarf){c.fillStyle=L.scarf;c.fillRect(-6.4,-19,4.2,13);c.fillRect(2.2,-19,4.2,13);c.beginPath();c.ellipse(0,-18.4,7.4,2.6,0,0,7);c.fill()}
  if(L.florais){c.fillStyle='#f4f1e8';for(const[a,b]of[[-6,-15],[-2.6,-12],[2.8,-14.6],[6,-11],[-5.6,-8.6],[-1,-7.4],[3.6,-7.2]])disc(c,a,b,.75);c.fillStyle='#d9a400';disc(c,0,-14.6,.8)}
  if(L.chainS){c.strokeStyle='#c9ccd2';c.lineWidth=.8;c.beginPath();c.moveTo(-5,-19);c.lineTo(0,-10.4);c.lineTo(5,-19);c.stroke();c.fillStyle='#c9ccd2';c.fillRect(-.6,-10.6,1.2,5);c.fillRect(-2,-9,4,1.1)}
  if(L.mgPin){c.fillStyle='#fff';c.fillRect(3.8,-16.2,3.4,2.4);c.fillStyle='#d0162a';c.beginPath();c.moveTo(4.5,-14.2);c.lineTo(5.5,-15.9);c.lineTo(6.5,-14.2);c.fill()}
  if(L.usPin){c.fillStyle='#fff';c.fillRect(3.6,-16.2,3.6,2.3);c.fillStyle='#c8102e';for(let i=0;i<3;i++)c.fillRect(3.6,-16.2+i*.95,3.6,.45);c.fillStyle='#1f3264';c.fillRect(3.6,-16.2,1.5,1.2)}
  if(L.sashVE){
    c.save();c.lineCap='butt';c.lineWidth=2;
    for(const[k,o]of[['#f2c81e',-2],['#2456a6',0],['#c8102e',2]]){c.strokeStyle=k;c.beginPath();c.moveTo(6.5+o*.7,-19+o*.7);c.lineTo(-7.5+o*.7,-5+o*.7);c.stroke()}
    c.fillStyle='#fff';for(const q of[.25,.45,.65])star(c,6.5-14*q,-19+14*q,.9);
    c.restore();
  }
  if(L.camisa10){c.fillStyle='#1f8a4d';c.beginPath();c.moveTo(-5,-19.4);c.lineTo(0,-15);c.lineTo(5,-19.4);c.lineTo(3.6,-19.6);c.lineTo(0,-16.6);c.lineTo(-3.6,-19.6);c.closePath();c.fill();c.font='700 6.4px Arial';c.textAlign='center';c.fillText('10',0,-9)}
  if(L.glitter){c.fillStyle='#fff';for(const[a,b]of[[-5,-16],[-2,-13],[3,-15.4],[5,-11],[-4,-9],[1,-8],[-.6,-11]])disc(c,a,b,.7)}
  if(L.vaca){c.fillStyle='#5a2a30';for(const[a,b,r]of[[-5,-15,1.8],[4.6,-13,2.1],[-3,-9.6,1.5],[3,-8,1.3],[-.4,-12.4,1]])disc(c,a,b,r)}
  if(L.sashTri){c.save();c.lineCap='butt';c.lineWidth=2;L.sashTri.forEach((k,i)=>{const o=(i-1)*2;c.strokeStyle=k;c.beginPath();c.moveTo(-6.5-o*.7,-19+o*.7);c.lineTo(7.5-o*.7,-5+o*.7);c.stroke()});c.fillStyle=L.sashMark;disc(c,3,-9.5,1.7);c.restore()}
  if(L.chainG){c.fillStyle='#d9a400';for(let i=0;i<=6;i++){const q=i/6;disc(c,-4.8+q*4.8,-19+q*9.2,.55);disc(c,4.8-q*4.8,-19+q*9.2,.55)}}
  if(L.uniform){
    c.fillStyle='#17140f';c.beginPath();c.moveTo(-4.2,-19);c.lineTo(0,-10.5);c.lineTo(4.2,-19);c.fill();
    c.strokeStyle='#4f5a47';c.lineWidth=.7;c.beginPath();c.moveTo(-6,-19);c.lineTo(-.6,-9.6);c.lineTo(-.6,-4.4);c.moveTo(6,-19);c.lineTo(.6,-9.6);c.stroke();
    c.fillStyle='#d9a400';c.fillRect(-bw/2-.6,-19.4,5,1.8);c.fillRect(bw/2-4.4,-19.4,5,1.8);
  }
  if(L.fatigue){
    c.fillStyle=skin;c.beginPath();c.moveTo(-3,-19);c.lineTo(0,-11.5);c.lineTo(3,-19);c.fill();
    c.fillStyle='#4a5432';c.beginPath();c.moveTo(-6.4,-19);c.lineTo(-.8,-11);c.lineTo(-3,-19);c.moveTo(6.4,-19);c.lineTo(.8,-11);c.lineTo(3,-19);c.fill();
    c.strokeStyle='#3f4a2c';c.lineWidth=.6;c.strokeRect(-7,-11.6,4.6,4.4);c.strokeRect(2.4,-11.6,4.6,4.4);c.beginPath();c.moveTo(0,-11);c.lineTo(0,-4.4);c.stroke();
  }
  if(L.havan){
    c.strokeStyle='#176236';c.lineWidth=1.3;c.beginPath();c.arc(0,-19.4,4.4,.1*Math.PI,.9*Math.PI);c.stroke();
    brFlag(c,-7,-15.2,4.2,2.8);
    /* estampa sem texto nem marca: listras amarelas e uma estrela */
    c.fillStyle='#f6cf1d';c.fillRect(-.6,-13.6,6.2,1);c.fillRect(-5.4,-9.6,10.8,.9);c.fillRect(-4.4,-7.4,8.8,.9);star(c,3.6,-15.4,1.3);
  }
  if(L.pocket){c.fillStyle=L.pocket;c.beginPath();c.moveTo(2.2,-9.6);c.lineTo(7.2,-9.6);c.lineTo(4.7,-12);c.fill()}
  if(L.tieStripe){c.strokeStyle='#efe6b8';c.lineWidth=.35;c.beginPath();for(let y=-17;y<-10.4;y+=1.8){c.moveTo(-1.3,y);c.lineTo(1.3,y+1.3)}c.stroke()}
  if(L.tieChk){c.strokeStyle='#dfe9fb';c.lineWidth=.3;c.beginPath();for(let y=-17.4;y<-10;y+=1.7){c.moveTo(-1.3,y);c.lineTo(1.3,y+1.2);c.moveTo(1.3,y);c.lineTo(-1.3,y+1.2)}c.stroke()}
  if(L.tieDots){c.fillStyle='#c9d6f5';for(const[a,b]of[[-.5,-16.6],[.5,-15],[-.6,-13.4],[.6,-12],[0,-10.6]])disc(c,a,b,.28)}
  if(L.pin){c.fillStyle=L.pin;star(c,-5.4,-15,1.9)}
  gear(c,L,'c',t,-28,bw);
  /* braço */
  c.lineCap='round';c.lineJoin='round';
  if(L.pose==='crossed'){
    c.strokeStyle=L.sleeve;c.lineWidth=4.4;c.beginPath();c.moveTo(-bw/2,-16);c.lineTo(-bw/2-.4,-11);c.lineTo(4.4,-10.4);c.moveTo(bw/2,-16);c.lineTo(bw/2+.4,-12.6);c.lineTo(-4.4,-12.8);c.stroke();
    c.fillStyle=skin;disc(c,5.6,-10.4,2.1);disc(c,-5.6,-12.8,2.1);
    c.fillStyle='#c9ccd2';c.fillRect(1.6,-12.2,2,3.6);
  }else if(L.pose==='hips'){
    c.strokeStyle=L.sleeve;c.lineWidth=4.4;c.beginPath();c.moveTo(-bw/2,-16);c.lineTo(-bw/2-4.4,-10.6);c.lineTo(-bw/2+.8,-7);c.moveTo(bw/2,-16);c.lineTo(bw/2+4.4,-10.6);c.lineTo(bw/2-.8,-7);c.stroke();
    c.fillStyle=skin;disc(c,-bw/2+1.2,-6.6,2.1);disc(c,bw/2-1.2,-6.6,2.1);
  }else if(L.pose==='down'){
    c.strokeStyle=L.sleeve;c.lineWidth=4.4;c.beginPath();c.moveTo(-bw/2,-16);c.lineTo(-bw/2-1.6,-11.8);c.moveTo(bw/2,-16);c.lineTo(bw/2+1.6,-11.8);c.stroke();
    c.strokeStyle=skin;c.lineWidth=3.6;c.beginPath();c.moveTo(-bw/2-1.7,-10.8);c.lineTo(-bw/2-1.9,-5);c.moveTo(bw/2+1.7,-10.8);c.lineTo(bw/2+1.9,-5);c.stroke();
    c.fillStyle=skin;disc(c,-bw/2-1.9,-3.8,2.3);disc(c,bw/2+1.9,-3.8,2.3);
    c.strokeStyle='#176236';c.lineWidth=.8;c.beginPath();c.moveTo(-bw/2-3.9,-11);c.lineTo(-bw/2+.6,-11);c.moveTo(bw/2-.6,-11);c.lineTo(bw/2+3.9,-11);c.stroke();
  }else if(L.pose==='hairhands'){
    c.strokeStyle=L.sleeve;c.lineWidth=4.4;c.beginPath();c.moveTo(-bw/2,-16);c.lineTo(-bw/2-4.4,-10);c.lineTo(-18,-19);c.moveTo(bw/2,-16);c.lineTo(bw/2+4.4,-10);c.lineTo(18,-19);c.stroke();
    c.fillStyle='#f4f4f0';disc(c,-18.2,-20.4,2);disc(c,18.2,-20.4,2);
    c.fillStyle=skin;disc(c,-18.6,-23.6,3.2);disc(c,18.6,-23.6,3.2);
  }else if(L.pose==='gesture'){
    c.strokeStyle=L.sleeve;c.lineWidth=4.4;c.beginPath();c.moveTo(-bw/2,-16);c.lineTo(-bw/2-3,-8.6);c.lineTo(-7.2,-10.2);c.moveTo(bw/2,-16);c.lineTo(bw/2+3,-8.6);c.lineTo(7.2,-10.2);c.stroke();
    c.fillStyle='#f4f4f0';disc(c,-6.8,-10.6,1.9);disc(c,6.8,-10.6,1.9);
    c.fillStyle=skin;disc(c,-6.2,-12.4,2.5);disc(c,6.2,-12.4,2.5);
    c.strokeStyle=skin;c.lineWidth=1;c.beginPath();c.arc(-5.2,-15,1.3,0,7);c.moveTo(6.5,-15);c.arc(5.2,-15,1.3,0,7);c.stroke();
  }else if(L.pose==='clasped'){
    c.strokeStyle=L.sleeve;c.lineWidth=4.4;c.beginPath();c.moveTo(-bw/2,-16);c.lineTo(-bw/2-.6,-11);c.lineTo(-3,-8.8);c.moveTo(bw/2,-16);c.lineTo(bw/2+.6,-11);c.lineTo(3,-8.8);c.stroke();
    c.fillStyle=skin;disc(c,-1.6,-8.6,2.3);disc(c,1.8,-8,2.3);
    c.fillStyle=L.watch||'#c9ccd2';c.fillRect(3.2,-10,1.8,3);
  }else if(L.pose==='pockets'){
    c.strokeStyle=L.sleeve;c.lineWidth=4.4;c.beginPath();c.moveTo(-bw/2,-16);c.lineTo(-bw/2-2,-10.5);c.lineTo(-bw/2+1.5,-5.8);c.moveTo(bw/2,-16);c.lineTo(bw/2+2,-10.5);c.lineTo(bw/2-1.5,-5.8);c.stroke();
    if(L.tee){
      c.strokeStyle=skin;c.lineWidth=3.8;c.beginPath();c.moveTo(-bw/2-1.8,-11.6);c.lineTo(-bw/2-2,-10.5);c.lineTo(-bw/2+1.5,-5.8);c.moveTo(bw/2+1.8,-11.6);c.lineTo(bw/2+2,-10.5);c.lineTo(bw/2-1.5,-5.8);c.stroke();
      c.fillStyle='#c9ccd2';c.fillRect(bw/2-.8,-8.8,3.6,2);
    }
  }else{
    const side=Math.cos(aim)>=0?1:-1,sx=(bw/2-1)*side,sy=-15.5,ex=sx+Math.cos(aim)*10.5,ey=sy+Math.sin(aim)*10.5;
    c.strokeStyle=L.shirt;c.lineWidth=4.4;c.beginPath();c.moveTo(sx,sy);c.lineTo(ex,ey);c.stroke();
    if(L.hold){c.save();c.translate(ex,ey);c.rotate(aim+Math.PI/2);item(c,L.hold);c.restore()}
    c.fillStyle=skin;disc(c,ex,ey,2.5);
  }
  /* cabeça */
  const hy=-28;
  if(L.hs){
    drawFace(c,L,hy,skin,t,bw);
    /* o colar da Marina vem depois do pescoço, que é desenhado junto com o rosto */
    if(L.headset){c.strokeStyle='#17181d';c.lineWidth=.8;c.lineCap='round';c.beginPath();c.moveTo(12,-27);c.quadraticCurveTo(11,-20,5,-20.6);c.stroke();c.fillStyle='#17181d';disc(c,4.4,-20.6,1.2)}
    if(L.tongue){c.save();c.translate(0,hy+9);c.scale(L.hs,L.hs);c.translate(0,-(hy+9));c.fillStyle='#e8788a';rr(c,-1.9,hy+5,3.8,4.6,1.7);c.restore()}
    if(L.choker){c.lineCap='round';c.strokeStyle=L.choker;c.lineWidth=1.5;c.beginPath();c.moveTo(-4.4,-18.6);c.quadraticCurveTo(0,-15.8,4.4,-18.6);c.stroke()}
    if(L.colarM){c.lineCap='round';c.strokeStyle='#ffffff';c.lineWidth=1.3;c.beginPath();c.moveTo(-6.4,-18.8);c.lineTo(-3,-14);c.moveTo(6.4,-18.8);c.lineTo(3,-14);c.stroke();c.strokeStyle='#3a2a20';c.lineWidth=.9;c.beginPath();c.moveTo(-4.6,-19.6);c.lineTo(0,-14.5);c.lineTo(4.6,-19.6);c.stroke();c.fillStyle='#e8dcc4';disc(c,-1.8,-15.8,1);disc(c,1.8,-15.8,1);c.fillStyle='#3a2420';c.beginPath();c.moveTo(-1.2,-14.8);c.lineTo(1.2,-14.8);c.lineTo(2.4,-8.2);c.lineTo(-2.4,-8.2);c.closePath();c.fill()}
    /* as mãos ficam na frente da peruca */
    if(L.pose==='hairhands'){c.fillStyle=skin;disc(c,-19.5,-24.5,3.4);disc(c,19.5,-24.5,3.4)}
    extrasCabeca(c,L,hy,t);
    c.restore();return;
  }
  if(L.style==='long'){c.fillStyle=L.hair;c.beginPath();c.arc(0,hy+1,11.6,Math.PI*.98,Math.PI*.02);c.lineTo(12.5,hy+17);c.quadraticCurveTo(0,hy+13,-12.5,hy+17);c.closePath();c.fill()}
  if(L.style==='bob'){c.fillStyle=L.hair;c.beginPath();c.arc(0,hy+1,11.3,Math.PI*.95,Math.PI*.05);c.lineTo(11,hy+8);c.lineTo(-11,hy+8);c.closePath();c.fill()}
  if(L.style==='wild'){c.fillStyle=L.hair;for(const[a,b,r]of[[-10,-3,5],[-11,3,4.6],[10,-3,5],[11,3,4.6],[-6,-9,5],[6,-9,5],[0,-11,5]])disc(c,a,hy+b,r)}
  c.fillStyle=skin;disc(c,-9.4,hy+1,2);disc(c,9.4,hy+1,2);c.beginPath();c.ellipse(0,hy,L.headW||9.6,L.headH||9.6,0,0,7);c.fill();
  if(L.style==='short'||L.style==='side'||L.style==='slick'||L.style==='swoop'||L.style==='bob'||L.style==='long'||(!L.style&&!L.cap&&!L.hard&&!L.chef&&!L.helmet&&!L.cowboy)){
    c.fillStyle=L.hair;c.beginPath();c.arc(0,hy-.8,9.9,Math.PI*1.03,Math.PI*1.97);c.quadraticCurveTo(0,hy-7,-9.8,hy-1.2);c.fill();
  }
  if(L.style==='side'){c.fillStyle=L.hair;c.beginPath();c.moveTo(-9,hy-3);c.quadraticCurveTo(-1,hy-13,6,hy-6);c.quadraticCurveTo(-2,hy-7,-9,hy-3);c.fill()}
  if(L.style==='receding'){c.fillStyle=L.hair;c.beginPath();c.ellipse(-8.6,hy-3,2.8,5.4,.15,0,7);c.fill();c.beginPath();c.ellipse(8.6,hy-3,2.8,5.4,-.15,0,7);c.fill();c.beginPath();c.ellipse(0,hy-9,6.8,1.9,0,0,7);c.fill()}
  if(L.style==='bald'){c.fillStyle='#ffffff66';c.beginPath();c.ellipse(-3.2,hy-6.2,3.4,2.1,-.4,0,7);c.fill()}
  if(L.style==='swoop'){c.fillStyle=L.hair;c.beginPath();c.ellipse(-9.2,hy+1,2.4,6.4,.08,0,7);c.fill();c.beginPath();c.ellipse(9.2,hy+1,2.4,6.4,-.08,0,7);c.fill()}
  if(L.style==='slick'){c.fillStyle=L.hair;c.beginPath();c.ellipse(1,hy-8,9.4,4.2,-.18,0,7);c.fill()}
  if(L.style==='swoop'){c.fillStyle=L.hair;c.beginPath();c.moveTo(-10,hy-2);c.quadraticCurveTo(-8,hy-16,6,hy-14);c.quadraticCurveTo(13,hy-12,10,hy-4);c.quadraticCurveTo(3,hy-9,-3,hy-6);c.quadraticCurveTo(-7,hy-5,-10,hy-2);c.fill()}
  if(L.beard==='full'){c.fillStyle=L.beardC;c.beginPath();c.arc(0,hy,9.8,.08*Math.PI,.92*Math.PI);c.quadraticCurveTo(0,hy+2,9.6,hy+2.4);c.fill()}
  if(L.beard==='huge'){c.fillStyle=L.beardC;for(const[a,b,r]of[[-6,4,5],[6,4,5],[0,6,6.5],[-4,11,5],[4,11,5],[0,15,4.5]])disc(c,a,hy+b,r)}
  if(L.beard==='short'){c.fillStyle=L.beardC;c.beginPath();c.arc(0,hy,9.8,.08*Math.PI,.92*Math.PI);c.quadraticCurveTo(0,hy+5.5,9.6,hy+2.4);c.fill()}
  if(L.beard==='stache'){c.fillStyle=L.beardC;rr(c,-4.2,hy+3,8.4,1.9,.9)}
  if(L.stubble){c.fillStyle='#0002';c.beginPath();c.arc(0,hy,9.6,.1*Math.PI,.9*Math.PI);c.fill()}
  if(L.shades){c.fillStyle='#111';rr(c,-7,hy-2.4,6.2,4,1.2);rr(c,.8,hy-2.4,6.2,4,1.2);c.fillRect(-1,hy-1.6,2,1)}
  else{c.fillStyle='#1b1712';disc(c,-3.5,hy-.6,1.3);disc(c,3.5,hy-.6,1.3)}
  if(L.glasses){c.strokeStyle='#222';c.lineWidth=1;c.beginPath();c.arc(-3.5,hy-.6,3,0,7);c.moveTo(6.5,hy-.6);c.arc(3.5,hy-.6,3,0,7);c.moveTo(-.5,hy-.6);c.lineTo(.5,hy-.6);c.stroke()}
  if(L.nose){c.fillStyle='rgba(110,60,35,.4)';c.beginPath();c.ellipse(0,hy+1.6,1.7*L.nose,1.25*L.nose,0,0,7);c.fill()}
  if(L.brow){const a=L.stern?1.8:.2;c.strokeStyle=L.browC||L.hair;c.lineWidth=L.brow;c.beginPath();c.moveTo(-6.4,hy-4);c.lineTo(-1.6,hy-4+a);c.moveTo(6.4,hy-4);c.lineTo(1.6,hy-4+a);c.stroke()}
  if(L.stern){c.strokeStyle='#5a3028';c.lineWidth=1.4;c.beginPath();c.moveTo(-2.8,hy+5);c.lineTo(2.8,hy+5);c.stroke()}
  else if(L.beard==='full'||L.beard==='short'){c.strokeStyle='#7a4a3a';c.lineWidth=1.1;c.beginPath();c.arc(0,hy+3.2,2.2,.15*Math.PI,.85*Math.PI);c.stroke()}
  else if(!L.beard||L.beard==='stache'){c.strokeStyle=L.lip||'#6a3a2a';c.lineWidth=L.lip?1.8:1.1;c.beginPath();c.arc(0,hy+3.5,2.6,.15*Math.PI,.85*Math.PI);c.stroke()}
  if(L.cap){c.fillStyle=L.cap;c.beginPath();c.arc(0,hy-2.4,9.8,Math.PI,0);c.fill();rr(c,-11,hy-3.6,20,2.6,1.2);if(!L.capPlain){c.fillStyle='#fff';star(c,0,hy-7,2.7)}}
  if(L.cowboy){c.fillStyle='#c9a35e';c.beginPath();c.arc(0,hy-4,8.6,Math.PI,0);c.fill();c.beginPath();c.ellipse(0,hy-4,15,3,0,0,7);c.fill();c.fillStyle='#6a4a2a';c.fillRect(-8.4,hy-6.4,16.8,1.8)}
  if(L.hard){c.fillStyle='#f2b705';c.beginPath();c.arc(0,hy-2,10.3,Math.PI,0);c.fill();rr(c,-12,hy-3.2,24,2.6,1.2)}
  if(L.chef){c.fillStyle='#fff';disc(c,-5,hy-11,5);disc(c,5,hy-11,5);disc(c,0,hy-13,5.6);c.fillRect(-7.5,hy-11,15,6)}
  if(L.helmet){c.fillStyle=L.helmet;c.beginPath();c.arc(0,hy-.5,11,Math.PI*.95,Math.PI*.05);c.lineTo(10,hy+2);c.lineTo(-10,hy+2);c.fill();c.fillStyle='#17222b';rr(c,-8,hy-3.4,16,4.4,2)}
  if(L.phones){c.strokeStyle='#d33';c.lineWidth=2.2;c.beginPath();c.arc(0,hy-1,10.4,Math.PI,0);c.stroke();c.fillStyle='#d33';rr(c,-13,hy-2.5,4.6,8,2);rr(c,8.4,hy-2.5,4.6,8,2)}
  gear(c,L,'h',t,hy,bw);
  c.restore();
}
/* enfeites da cabeça dos heróis exclusivos: antena do Lula Robô e interrogações do Flávio Hipotético */
function extrasCabeca(c,L,hy,t){
  const hs=L.hs||1,topo=hy+9-(9+(L.headH||9.6))*hs;
  if(L.antena){c.strokeStyle="#5d6a78";c.lineWidth=1.4;c.lineCap="round";c.beginPath();c.moveTo(0,topo+1);c.lineTo(0,topo-7);c.stroke();c.fillStyle=Math.sin(t*6)>0?"#ff4d5e":"#7fd4ff";disc(c,0,topo-8,2.2)}
  if(L.interroga){c.fillStyle="#f6cf1d";c.font="bold 9px Archivo, Arial, sans-serif";c.textAlign="center";for(const[x,f]of[[-13,0],[13,2.1]]){const y=topo+2+Math.sin(t*3+f)*2.2;c.globalAlpha=.85;c.fillText("?",x,y)}c.globalAlpha=1}
}
function moto(c,x,y,s,t,f,ph,red,vert){
  c.save();c.translate(x,y);c.scale(s*f,s);
  c.fillStyle='#0003';c.beginPath();c.ellipse(0,5,vert?8:17,3.5,0,0,7);c.fill();
  if(vert){
    c.fillStyle='#22242a';rr(c,-2.8,-9,5.6,15,2.6);
    c.fillStyle=red?'#c8102e':'#1f7a4d';rr(c,-5,-11,10,7,2.5);
    c.fillStyle='#b9bec7';rr(c,-10,-12,20,2.2,1);
  }else if(red){
    c.strokeStyle='#22242a';c.lineWidth=1.8;c.beginPath();c.arc(-11,1,5.4,0,7);c.moveTo(16.4,1);c.arc(11,1,5.4,0,7);c.stroke();
    c.strokeStyle='#c8102e';c.lineWidth=2.2;c.beginPath();c.moveTo(-11,1);c.lineTo(-3,-7);c.lineTo(8,-7);c.lineTo(11,1);c.moveTo(-3,-7);c.lineTo(1,1);c.lineTo(8,-7);c.stroke();
  }else{
    c.fillStyle='#22242a';disc(c,-11,1,5.4);disc(c,11,1,5.4);
    c.fillStyle='#b9bec7';disc(c,-11,1,2.1);disc(c,11,1,2.1);
    c.fillStyle='#1f7a4d';rr(c,-9,-7,19,7,3);c.fillStyle='#f6cf1d';rr(c,-2,-10,10,5,2);
  }
  c.restore();
  char(c,red?LOOKS.pmoto:LOOKS.motoca,x-1,y-4,.72*s,t,{ph,aim:-.2,shadow:false});
}
/* três vistas: de lado nas retas horizontais, de frente quando desce e de traseira quando sobe */
function truck(c,x,y,w,a,kind,red){
  const bus=kind==='caravana',flag=red?redFlag:brFlag,cx=Math.cos(a),sy=Math.sin(a),side=Math.abs(cx)>=.7;
  const cor=red?'#c8102e':'#1f7a4d',faixa=red?'#fff':'#f6cf1d',carga=red?'#8f0b20':'#d9a400';
  c.fillStyle='#0003';c.beginPath();c.ellipse(x,y+15,side?w*.6:24,6,0,0,7);c.fill();
  c.save();c.translate(x,y);
  if(side){
    c.scale(cx>0?1:-1,1);c.rotate(Math.atan2(sy,Math.abs(cx))*.45);
    const h=bus?30:26;
    if(bus){
      c.fillStyle=cor;rr(c,-w/2,-h+6,w,h,6);c.fillStyle=faixa;c.fillRect(-w/2,-h+22,w,7);
      c.fillStyle='#bfe3f5';for(let i=0;i<5;i++)rr(c,-w/2+6+i*(w-10)/5,-h+11,(w-10)/5-4,9,2);
    }else{
      c.fillStyle=carga;rr(c,-w/2,-h+4,w*.68,h,3);
      c.fillStyle=cor;rr(c,w*.2,-h+10,w*.3,h-6,4);c.fillStyle='#bfe3f5';rr(c,w*.27,-h+13,w*.18,9,2);
      flag(c,-w/2+5,-h+8,w*.52,h-9);
    }
    c.fillStyle='#22242a';disc(c,-w*.3,12,6.2);disc(c,w*.3,12,6.2);c.fillStyle='#b9bec7';disc(c,-w*.3,12,2.4);disc(c,w*.3,12,2.4);
  }else{
    c.rotate(cx*.22);
    const vw=bus?40:36,top=bus?-34:-30;
    c.fillStyle='#22242a';rr(c,-vw/2+2,9,9,9,2);rr(c,vw/2-11,9,9,9,2);
    if(sy>0){
      /* descendo: vemos a frente, com para-brisa, motorista, grade e faróis */
      c.fillStyle=cor;rr(c,-vw/2,top,vw,44-top-30+16,6);
      c.fillStyle='#bfe3f5';rr(c,-vw/2+4,top+4,vw-8,15,3);
      c.fillStyle=SK[1];disc(c,-vw/4,top+13,3.4);c.fillStyle='#2b211a';c.beginPath();c.arc(-vw/4,top+12.4,3.5,Math.PI,0);c.fill();
      c.fillStyle='#17181d';c.fillRect(-vw/2+7,top+24,vw-14,10);
      c.fillStyle='#8a8f98';for(let i=0;i<4;i++)c.fillRect(-vw/2+9+i*(vw-18)/3-1,top+25,2,8);
      c.fillStyle='#ffe27a';disc(c,-vw/2+4,top+29,2.8);disc(c,vw/2-4,top+29,2.8);
      c.fillStyle=faixa;c.fillRect(-vw/2,top+36,vw,4);
      c.fillStyle='#17181d';c.fillRect(-vw/2-5,top+6,5,8);c.fillRect(vw/2,top+6,5,8);
    }else{
      /* subindo: vemos a traseira indo embora */
      c.fillStyle=bus?cor:carga;rr(c,-vw/2,top,vw,44-top-30+16,4);
      if(bus){c.fillStyle='#bfe3f5';rr(c,-vw/2+6,top+5,vw-12,12,3);c.fillStyle=faixa;c.fillRect(-vw/2,top+22,vw,5)}
      flag(c,-vw/2+6,bus?top+29:top+6,vw-12,bus?9:24);
      if(!bus){c.fillStyle='#00000055';c.fillRect(-1,top+2,2,34)}
      c.fillStyle='#e23b3b';rr(c,-vw/2+1,top+37,8,4,1);rr(c,vw/2-9,top+37,8,4,1);
    }
  }
  c.restore();
}

/* ---------- inimigos ---------- */
const ENEMY={
  camisa:{nome:'Camisa da Seleção',hp:3,spd:62,cash:3,r:13,leak:1,s:.8},
  bandeira:{nome:'Bandeira nas Costas',hp:6,spd:86,cash:4,r:13,leak:2,s:.82,kids:['camisa']},
  tio:{nome:'Tio do Zap',hp:18,spd:52,cash:8,r:14,leak:3,s:.88,heal:1},
  isentao:{nome:'Isentão (invisível sem detecção)',hp:10,spd:78,cash:7,r:13,leak:2,s:.8,camo:1},
  fone:{nome:'De Fone no Ouvido (ignora som)',hp:15,spd:68,cash:8,r:13,leak:3,s:.82,immune:'som'},
  motoca:{nome:'Motociata (muito rápida)',hp:22,spd:142,cash:9,r:16,leak:4,s:1,veh:'moto'},
  /* blindado: cada acerto perde 2 de argumento, então ataque fraco não faz nada; fogo e o poder do herói passam direto */
  capacete:{nome:'Patriota de Capacete (blindado)',hp:16,spd:54,cash:11,r:14,leak:4,s:.92,armor:2},
  /* cabeça-dura: se ninguém acerta por 1 segundo, recupera o argumento aos poucos */
  teimoso:{nome:'Cabeça-Dura do Zap (se recupera)',hp:34,spd:48,cash:13,r:14,leak:4,s:.94,regen:.09},
  pcapacete:{nome:'Manifestante de Capacete (blindado)',hp:16,spd:54,cash:11,r:14,leak:4,s:.92,armor:2},
  pteimoso:{nome:'Cabeça-Dura do Grupo (se recupera)',hp:34,spd:48,cash:13,r:14,leak:4,s:.94,regen:.09},
  caminhao:{nome:'Caminhão do Buzinaço',hp:170,spd:36,cash:26,r:28,leak:15,veh:'truck',w:62,kids:['bandeira','bandeira','tio','tio']},
  caravana:{nome:'Caravana Patriota',hp:750,spd:29,cash:70,r:36,leak:40,veh:'caravana',w:86,kids:['caminhao','caminhao','motoca','motoca']},
  pavanato:{nome:'Lucas Pavanato',boss:1,hp:170,spd:34,cash:220,r:30,leak:60,s:1.75},
  nikolas:{nome:'Nikolas Ferreira',boss:1,hp:750,spd:32,cash:600,r:32,leak:80,s:1.95},
  flavio:{nome:'Flávio Bolsonaro',boss:1,hp:2200,spd:30,cash:1400,r:34,leak:100,s:2.1},
  /* chefão final: 6.500 de vida, 3.500 enquanto houve o limite de 2 de cada personagem, e 5.400 desde que o limite caiu (2026-11-17) */
  bolsonaro:{nome:'Jair Bolsonaro',boss:1,hp:5400,spd:27,cash:0,r:40,leak:999,s:2.55},
  pcamisa:{nome:'Camiseta Vermelha',hp:3,spd:62,cash:3,r:13,leak:1,s:.8},
  pbandeira:{nome:'Bandeira Vermelha',hp:6,spd:86,cash:4,r:13,leak:2,s:.82,kids:['pcamisa']},
  ptio:{nome:'Sindicalista do Zap',hp:18,spd:52,cash:8,r:14,leak:3,s:.88,heal:1},
  pfone:{nome:'Estudante de Fone (ignora som)',hp:15,spd:68,cash:8,r:13,leak:3,s:.82,immune:'som'},
  pmoto:{nome:'Bicicletada (muito rápida)',hp:22,spd:142,cash:9,r:16,leak:4,s:1,veh:'moto',red:1},
  pcaminhao:{nome:'Carro de Som',hp:170,spd:36,cash:26,r:28,leak:15,veh:'truck',w:62,red:1,kids:['pbandeira','pbandeira','ptio','ptio']},
  pcaravana:{nome:'Caravana da Cidadania',hp:750,spd:29,cash:70,r:36,leak:40,veh:'caravana',w:86,red:1,kids:['pcaminhao','pcaminhao','pmoto','pmoto']},
  janones:{nome:'André Janones',boss:1,hp:170,spd:34,cash:220,r:30,leak:60,s:1.75},
  marx:{nome:'Karl Marx',boss:1,hp:750,spd:32,cash:600,r:32,leak:80,s:1.95},
  dilma:{nome:'Dilma Rousseff',boss:1,hp:2200,spd:30,cash:1400,r:34,leak:100,s:2.1},
  lula:{nome:'Lula',boss:1,hp:5400,spd:27,cash:0,r:40,leak:999,s:2.55},
};
const FRASES=['Hmm, faz sentido','Vou repensar','Tá, me convenceu','Volta a picanha?','Vou ler isso aí','Mudei de grupo','É, pode ser','Acho que errei'];
const FRASES_BR=['Hmm, faz sentido','Vou repensar','Tá, me convenceu','Vou ver o vídeo','Me add no grupo','É, pode ser','Virei patriota','Acho que errei'];
const LINES={
  pavanato:['Corte pro TikTok!','Olha o Reels!','Isso vai viralizar!'],
  nikolas:['Vídeo novo no ar!','Todo mundo assistindo!','Milhões de views!'],
  flavio:['Aqui é o 01!','Herança de família!','Chama o reforço!'],
  bolsonaro:['Talkei?','Tá ok?','Selva!','Brasil acima de tudo!'],
  janones:['Thread nova!','Olha o print!','Vou expor na live!'],
  marx:['Proletários, uni-vos!','Lê o capítulo 1!','Isso é mais-valia!'],
  dilma:['Vamos dobrar a meta!','Saúdo a mandioca!','Chama a companheirada!'],
  lula:['Companheiro!','Faz o L!','Picanha pra todos!','Companheirada, vamos!'],
};

/* ---------- torres ---------- */
const TOWERS={
  militante:{nome:'Militante',cost:190,atk:'shot',desc:'Entrega panfleto para quem passa. Barato e confiável.',
    base:{range:165,rate:.85,dmg:1,pierce:1,spd:520,type:'papel',shot:'panfleto'},
    up:[[{n:'Megafone',c:120,d:'+35 de alcance',f:s=>{s.range+=35}},
         {n:'Panfletagem em Massa',c:320,d:'3 panfletos por vez',f:s=>{s.spread=3}},
         {n:'Greve Geral',c:1600,d:'Bem mais rápido, +2 de argumento',f:s=>{s.rate*=.48;s.dmg+=2;s.pierce+=1}}],
        [{n:'Olho no Grupo',c:150,d:'Detecta Isentões',f:s=>{s.detect=1}},
         {n:'Panfleto Plastificado',c:380,d:'+2 de argumento, atravessa 2 a mais',f:s=>{s.dmg+=2;s.pierce+=2}},
         {n:'Comitê de Bairro',c:1800,d:'+5 de argumento, 50% mais rápido',f:s=>{s.dmg+=5;s.rate/=1.5}}]]},
  janones:{nome:'André Janones',cost:420,atk:'shot',desc:'Sempre online. Longo alcance e já vê Isentões.',
    base:{range:230,rate:.5,dmg:1,pierce:1,spd:820,type:'som',shot:'meme',detect:1},
    up:[[{n:'Thread Longa',c:220,d:'Atravessa +2',f:s=>{s.pierce+=2}},
         {n:'Modo Live',c:640,d:'Atinge 3 alvos de uma vez',f:s=>{s.multi=3}},
         {n:'Viralizou!',c:3200,d:'2× mais rápido, +3 de argumento',f:s=>{s.rate/=2;s.dmg+=3}}],
        [{n:'Print da Conversa',c:260,d:'+1 de argumento e passa a atingir quem usa fone',f:s=>{s.dmg+=1;s.type='meme'}},
         {n:'Engajamento',c:700,d:'+R$ 2 por pessoa convencida',f:s=>{s.bonus=2}},
         {n:'Algoritmo',c:2800,d:'Alcance no mapa todo, +3 de argumento',f:s=>{s.range=1400;s.dmg+=3}}]]},
  marx:{nome:'Karl Marx',cost:620,atk:'shot',desc:'Arremessa O Capital. Lento, mas atinge uma área inteira.',
    base:{range:205,rate:1.6,dmg:3,pierce:1,spd:400,type:'livro',shot:'livro',splash:58},
    up:[[{n:'Manifesto de Bolso',c:400,d:'33% mais rápido',f:s=>{s.rate*=.75}},
         {n:'Volume II',c:950,d:'+3 de argumento, área maior',f:s=>{s.dmg+=3;s.splash+=25}},
         {n:'Obra Completa',c:3600,d:'+14 de argumento, área enorme',f:s=>{s.dmg+=14;s.splash+=35}}],
        [{n:'Mais-Valia',c:500,d:'+R$ 3 por pessoa convencida',f:s=>{s.bonus=3}},
         {n:'Trabalhadores, Uni-vos!',c:1250,d:'Torres próximas 15% mais rápidas',f:s=>{s.aura=.15;s.auraR=165}},
         {n:'A Internacional',c:4200,d:'Bônus sobe para 35% e alcança mais longe',f:s=>{s.aura=.35;s.auraR=240}}]]},
  dilma:{nome:'Dilma Rousseff',cost:360,atk:'boom',desc:'Lança mandioca que vai e volta, atravessando a fila.',
    base:{range:150,rate:1.15,dmg:2,pierce:6,type:'comida',count:1,shot:'mandioca'},
    up:[[{n:'Saudação à Mandioca',c:280,d:'Atravessa +6',f:s=>{s.pierce+=6}},
         {n:'Mulher Sapiens',c:650,d:'+2 de argumento, 25% mais rápida',f:s=>{s.dmg+=2;s.rate*=.75}},
         {n:'Estocar Vento',c:2600,d:'+4 de argumento e empurra o pessoal de volta',f:s=>{s.dmg+=4;s.knock=16}}],
        [{n:'Dobrar a Meta',c:350,d:'2 mandiocas por vez',f:s=>{s.count=2}},
         {n:'Meta Aberta',c:800,d:'+50 de alcance, detecta Isentões',f:s=>{s.range+=50;s.detect=1}},
         {n:'Dobrar de Novo',c:3000,d:'4 mandiocas, +3 de argumento',f:s=>{s.count=4;s.dmg+=3}}]]},
  churras:{nome:'Churrasqueiro',cost:300,atk:'aura',desc:'O cheiro de picanha faz todo mundo andar mais devagar.',
    base:{range:125,slow:.35,dmg:0,rate:.8,type:'comida'},
    up:[[{n:'Fogo Alto',c:250,d:'+30 de alcance',f:s=>{s.range+=30}},
         {n:'Churrascão',c:750,d:'Reduz a velocidade em 55%',f:s=>{s.slow=.55}},
         {n:'Picanha Premium',c:2200,d:'De tempos em tempos, todos param para comer',f:s=>{s.stop=1;s.slow=.65}}],
        [{n:'Espetinho',c:300,d:'Argumento de 1 em todos da área',f:s=>{s.dmg=1}},
         {n:'Cervejinha Gelada',c:850,d:'Quem está na área é 30% mais convencível',f:s=>{s.vuln=1.3;s.dmg+=1}},
         {n:'Festa da Firma',c:2400,d:'+6 de argumento na área toda',f:s=>{s.dmg+=6}}]]},
  sindicato:{nome:'Sindicato',cost:750,atk:'none',desc:'Não ataca. Arrecada verba no fim de cada rodada.',
    base:{range:0,income:130},
    up:[[{n:'Contribuição',c:500,d:'+R$ 90 por rodada',f:s=>{s.income+=90}},
         {n:'Vaquinha',c:1500,d:'+R$ 220 por rodada',f:s=>{s.income+=220}},
         {n:'Central Sindical',c:5000,d:'+R$ 700 por rodada',f:s=>{s.income+=700}}],
        [{n:'Sócio Novo',c:500,d:'+1 de apoio por rodada',f:s=>{s.regen=1}},
         {n:'Assembleia',c:1000,d:'Torres próximas com +12% de alcance',f:s=>{s.rangeB=.12;s.auraR=170}},
         {n:'Dia do Trabalhador',c:3000,d:'Torres próximas 25% mais rápidas',f:s=>{s.aura=.25;s.auraR=170}}]]},
  lula:{nome:'Lula',cost:900,atk:'wave',only:1,desc:'Só existe um. O discurso atinge todos ao redor e libera o Faz o L!',
    base:{range:160,rate:1.25,dmg:3,pierce:14,type:'som',abilCd:45,abilDmg:20},
    up:[[{n:'Companheirada',c:500,d:'+40 de alcance, atinge mais gente',f:s=>{s.range+=40;s.pierce+=10}},
         {n:'Discurso de Palanque',c:1500,d:'+5 de argumento',f:s=>{s.dmg+=5}},
         {n:'Sindicalista de Raiz',c:4200,d:'+12 de argumento, 40% mais rápido, detecta Isentões',f:s=>{s.dmg+=12;s.rate*=.6;s.detect=1}}],
        [{n:'Picanha pra Todos',c:600,d:'+R$ 100 e +1 de apoio por rodada',f:s=>{s.income=100;s.regen=1}},
         {n:'Programa Social',c:1800,d:'+R$ 300 por rodada',f:s=>{s.income+=300}},
         {n:'Terceiro Mandato',c:5000,d:'Faz o L! muito mais forte e com recarga menor',f:s=>{s.abilCd=24;s.abilDmg=90;s.detect=1}}]]},
};
function reskin(src,nome,desc,shot,names){
  const B=TOWERS[src],base={...B.base};if(shot)base.shot=shot;
  return{...B,nome,desc,base,up:B.up.map((p,i)=>p.map((u,j)=>({...u,n:names[i][j][0],d:names[i][j][1]||u.d})))};
}
TOWERS.patriota=reskin('militante','Patriota','Distribui santinho verde e amarelo. Barato e confiável.','santinho',
  [[['Bandeirão'],['Grupo da Família','3 santinhos por vez'],['Buzinaço Geral']],[['Olho no Zap'],['Santinho Plastificado'],['Núcleo do Bairro']]]);
TOWERS.nikolas={nome:'Nikolas Ferreira',cost:380,atk:'shot',desc:'Joga o celular com o vídeo do dia. Quem é atingido para um instante para assistir.',
  base:{range:195,rate:1,dmg:2,pierce:3,spd:520,type:'meme',shot:'celular',stunHit:.45},
  up:[[{n:'Mais um Vídeo',c:280,d:'Atravessa +3',f:s=>{s.pierce+=3}},
       {n:'Milhões de Views',c:650,d:'+2 de argumento, 25% mais rápido',f:s=>{s.dmg+=2;s.rate*=.75}},
       {n:'Vídeo do Pix',c:2600,d:'+6 de argumento, 35% mais rápido e o pessoal fica parado por mais tempo',f:s=>{s.dmg+=6;s.rate*=.65;s.stunHit=.6}}],
      [{n:'Repost',c:350,d:'2 celulares por vez',f:s=>{s.spread=2}},
       {n:'Trending',c:800,d:'+50 de alcance, detecta Isentões',f:s=>{s.range+=50;s.detect=1}},
       {n:'Nicole',c:3000,d:'Evolução: ganha a peruca loira, 4 celulares, +3 de argumento',f:s=>{s.spread=4;s.dmg+=3}}]]};
TOWERS.agro={nome:'Peão da Boiada',cost:320,atk:'runner',desc:'Quando alguém chega perto, solta um boi que corre pela avenida no sentido contrário.',
  base:{range:155,rate:2.4,dmg:3,pierce:10,spd:270,len:310,count:1,type:'gado'},
  up:[[{n:'Mais Gado',c:250,d:'O boi atinge +10 pessoas',f:s=>{s.pierce+=10}},
       {n:'Passar a Boiada',c:850,d:'+3 de argumento, 30% mais rápido',f:s=>{s.dmg+=3;s.rate*=.7}},
       {n:'Comitiva',c:2400,d:'+8 de argumento, muito mais rápido',f:s=>{s.dmg+=8;s.rate*=.6}}],
      [{n:'Berrante',c:300,d:'O boi corre 120 a mais',f:s=>{s.len+=120}},
       {n:'Porteira Aberta',c:800,d:'Boi mais veloz, detecta Isentões',f:s=>{s.spd+=110;s.detect=1}},
       {n:'Rebanho Inteiro',c:2600,d:'3 bois por vez, +3 de argumento',f:s=>{s.count=3;s.dmg+=3}}]]};
TOWERS.pavanato={nome:'Lucas Pavanato',cost:400,atk:'none',desc:'Não ataca. Os cortes deixam as torres próximas mais rápidas.',
  base:{range:195,auraR:195,aura:.15},
  up:[[{n:'Corte de 30 Segundos',c:220,d:'+40 de alcance do buff',f:s=>{s.auraR+=40;s.range=s.auraR}},
       {n:'Modo Reels',c:800,d:'Torres próximas 30% mais rápidas',f:s=>{s.aura=.3}},
       {n:'Viralizou no TikTok',c:2800,d:'Torres próximas 55% mais rápidas',f:s=>{s.aura=.55}}],
      [{n:'Print no Story',c:260,d:'Torres próximas detectam Isentões',f:s=>{s.giveDet=1}},
       {n:'Monetização',c:700,d:'Torres próximas com +15% de alcance',f:s=>{s.rangeB=.15}},
       {n:'Algoritmo do Feed',c:2800,d:'O buff alcança o mapa inteiro',f:s=>{s.auraR=2000;s.range=2000}}]]};
TOWERS.caminhoneiro={nome:'Caminhoneiro',cost:450,atk:'none',desc:'Atravessa o caminhão na pista e segura a fila por um tempo, até a marcha derrubar o caminhão. A buzina também dá buff de argumento nas torres próximas.',
  base:{range:175,auraR:175,dmgB:.25},
  up:[[{n:'Buzina a Ar',c:280,d:'+40 de alcance do buff',f:s=>{s.auraR+=40;s.range=s.auraR}},
       {n:'Buzinaço',c:900,d:'Torres próximas com +50% de argumento',f:s=>{s.dmgB=.5}},
       {n:'Comboio',c:3200,d:'Torres próximas com o dobro de argumento',f:s=>{s.dmgB=1}}],
      [{n:'Novo Apoiador',c:300,d:'+1 de apoio por rodada',f:s=>{s.regen=1}},
       {n:'Fila Dupla',c:800,d:'Tiros das torres próximas atravessam +2',f:s=>{s.pierceB=2}},
       {n:'Feriadão Patriota',c:2800,d:'Torres próximas também 30% mais rápidas',f:s=>{s.aura=.3}}]]};
TOWERS.flavio=reskin('marx','Flávio Bolsonaro','Arremessa pilhas de projetos de lei. Lento, mas atinge uma área inteira.','lei',
  [[['Regime de Urgência'],['Substitutivo'],['Bancada Inteira']],[['Emenda de Bancada'],['Líder da Oposição'],['Base Aliada']]]);
/* Flávio: projeto de lei pesa mais em alvo grande. No Difícil, a direita perdia muito mais que a esquerda nas rodadas 30 a 36,
   para as caravanas, os carros de som e a chefona da rodada 30; o 3º gratuito dela (o Flávio) é quem passa a segurar alvo grande.
   A base é copiada para não mexer no Marx, de quem ele é uma versão. */
TOWERS.flavio.base={...TOWERS.flavio.base,grande:2,splash:85,rate:1.35};
/* área maior e um pouco mais rápido (2026-11-12): nos mapas de labirinto com várias avenidas, a direita perdia muito mais;
   com isso ela passou de 3 para 6 vitórias em 13 desses mapas no Difícil */
TOWERS.flavio.desc='Arremessa pilhas de projetos de lei. Lento, mas atinge uma área inteira e tira o dobro de argumento de veículos e chefões.';
Object.assign(TOWERS.caminhoneiro.base,{bloqueio:1,wallRate:7,wallLife:3,wallN:1});
{
  const extra=[[', bloqueio dura mais',s=>{s.wallLife+=1.2}],[', bloqueios mais frequentes',s=>{s.wallRate*=.65}],[', 2 caminhões por vez',s=>{s.wallN=2}]];
  TOWERS.caminhoneiro.up[1]=TOWERS.caminhoneiro.up[1].map((u,i)=>({...u,d:u.d+extra[i][0],f:s=>{u.f(s);extra[i][1](s)}}));
}
TOWERS.empresario=reskin('sindicato','Fazendeiro','Invoca plantas na avenida, que seguram e convencem quem passa por perto, e ainda rende verba no fim de cada rodada.',null,
  [[['Patrocínio'],['Vaquinha do Agro'],['Frente do Agro']],[['Novo Apoiador'],['Reunião do Grupo'],['Feriadão Patriota']]]);
Object.assign(TOWERS.empresario.base,{income:60,range:160,plantRate:6.5,plantLife:8,plantR:42,plantDmg:.8,plantMax:2});
{
  const extra=[[', plantas mais fortes',s=>{s.plantDmg+=1}],[', mais plantas e mais rápido',s=>{s.plantMax+=1;s.plantRate=3.5}],[', plantas gigantes',s=>{s.plantDmg+=2;s.plantR+=14}]];
  TOWERS.empresario.up[0]=TOWERS.empresario.up[0].map((u,i)=>({...u,d:u.d+extra[i][0],f:s=>{u.f(s);extra[i][1](s)}}));
}
TOWERS.bolsonaro={nome:'Jair Bolsonaro',cost:900,atk:'shot',only:1,desc:'Só existe um. Arremessa pão e lata de leite condensado, que gruda e deixa o pessoal mais lento, e libera o Selva!',
  base:{range:190,rate:.75,dmg:3,pierce:1,spd:470,type:'comida',alt:['pao','leite'],splash:46,abilCd:45,abilDmg:20},
  up:[[{n:'Cercadinho',c:500,d:'+40 de alcance, área maior',f:s=>{s.range+=40;s.splash+=14}},
       {n:'Live de Quinta',c:1500,d:'+5 de argumento',f:s=>{s.dmg+=5}},
       {n:'Mito das Redes',c:4200,d:'+12 de argumento, 40% mais rápido, detecta Isentões',f:s=>{s.dmg+=12;s.rate*=.6;s.detect=1}}],
      [{n:'Povo na Rua',c:600,d:'+R$ 100 e +1 de apoio por rodada',f:s=>{s.income=100;s.regen=1}},
       {n:'Auxílio Turbinado',c:1800,d:'+R$ 300 por rodada',f:s=>{s.income+=300}},
       {n:'Capitão do Povo',c:5000,d:'Selva! muito mais forte e com recarga menor',f:s=>{s.abilCd=24;s.abilDmg=90;s.detect=1}}]]};
TOWERS.vampirao={nome:'Temer',cost:520,atk:'drain',desc:'Suga o argumento de quem passa com um raio vermelho, e cada sugada vira verba na hora.',
  base:{range:165,rate:.55,dmg:1.5,type:'sangue',steal:1},
  up:[[{n:'Presas Afiadas',c:300,d:'+2 de argumento',f:s=>{s.dmg+=2}},
       {n:'Mesóclise',c:900,d:'30% mais rápido',f:s=>{s.rate*=.7}},
       {n:'Sugar Tudo',c:3200,d:'+9 de argumento, cada sugada rende +R$ 2',f:s=>{s.dmg+=9;s.steal+=2}}],
      [{n:'Noite de Lua',c:350,d:'+40 de alcance',f:s=>{s.range+=40}},
       {n:'Castelo Assombrado',c:900,d:'Suga 3 de uma vez, detecta Isentões',f:s=>{s.multi=3;s.detect=1}},
       {n:'Conde das Verbas',c:3000,d:'+R$ 500 por rodada, +3 de argumento',f:s=>{s.income=500;s.dmg+=3}}]]};
TOWERS.dino={nome:'Flávio Dino',cost:500,atk:'shot',desc:'Joga decisões de "SUSPENSO" que param por um instante quem acertam. Evoluindo, bloqueia emendas e rende verba.',
  base:{range:185,rate:.85,dmg:2,pierce:3,spd:560,type:'decisao',shot:'suspenso',stunHit:.4,bossStun:.12},
  up:[[{n:'Liminar',c:300,d:'+2 de argumento',f:s=>{s.dmg+=2}},
       {n:'Decisão Monocrática',c:950,d:'25% mais rápido, para por mais tempo',f:s=>{s.rate*=.75;s.stunHit=.6}},
       {n:'Referendo do Plenário',c:3200,d:'3 decisões por vez, +8 de argumento',f:s=>{s.spread=3;s.dmg+=8}}],
      [{n:'Bloqueio de Emendas',c:350,d:'+R$ 120 por rodada',f:s=>{s.income=120}},
       {n:'Auditoria',c:900,d:'Detecta Isentões, +40 de alcance',f:s=>{s.detect=1;s.range+=40}},
       {n:'Bumba Meu Boi',c:3000,d:'+R$ 500 por rodada, +3 de argumento',f:s=>{s.income=500;s.dmg+=3}}]]};
TOWERS.mendonca={nome:'André Mendonça',cost:490,atk:'shot',desc:'Alterna Bíblias e pedidos de vista. O pedido de vista deixa o pessoal mais lento, porque o processo parou.',
  base:{range:175,rate:1.05,dmg:2,pierce:2,spd:520,type:'papel',alt:['bibliaSTF','vista']},
  up:[[{n:'Terrivelmente Evangélico',c:300,d:'+2 de argumento',f:s=>{s.dmg+=2}},
       {n:'Versículo do Dia',c:950,d:'25% mais rápido, atravessa +2',f:s=>{s.rate*=.75;s.pierce+=2}},
       {n:'Culto no Plenário',c:3200,d:'3 por vez, +8 de argumento',f:s=>{s.spread=3;s.dmg+=8}}],
      [{n:'Vista Coletiva',c:350,d:'+40 de alcance',f:s=>{s.range+=40}},
       {n:'Sessão Virtual',c:900,d:'Detecta Isentões, 20% mais rápido',f:s=>{s.detect=1;s.rate*=.8}},
       {n:'Ministro Pastor',c:3000,d:'+R$ 400 por rodada, +4 de argumento, torres próximas 15% mais rápidas',f:s=>{s.income=400;s.dmg+=4;s.aura=.15;s.auraR=150}}]]};
TOWERS.fux={nome:'Luiz Fux',cost:560,atk:'shot',desc:'Lança a plaquinha "In Fux We Trust" de muito longe, com argumento forte e ritmo lento.',
  base:{range:250,rate:1.7,dmg:6,pierce:1,spd:760,type:'decisao',shot:'infux'},
  up:[[{n:'Toga Bem Passada',c:320,d:'+4 de argumento',f:s=>{s.dmg+=4}},
       {n:'Voto Longo',c:1000,d:'+8 de argumento, atravessa +1',f:s=>{s.dmg+=8;s.pierce+=1}},
       {n:'Voto de 13 Horas',c:3300,d:'+25 de argumento',f:s=>{s.dmg+=25}}],
      [{n:'Visão Ampla',c:340,d:'+60 de alcance, detecta Isentões',f:s=>{s.range+=60;s.detect=1}},
       {n:'Jurisprudência',c:900,d:'30% mais rápido',f:s=>{s.rate*=.7}},
       {n:'In Fux We Trust',c:3000,d:'+R$ 400 por rodada, torres próximas 15% mais rápidas',f:s=>{s.income=400;s.aura=.15;s.auraR=150}}]]};
TOWERS.fachin={nome:'Edson Fachin',cost:520,atk:'shot',desc:'Joga pilhas de autos do processo que atingem uma área grande.',
  base:{range:165,rate:1.25,dmg:3,pierce:1,spd:470,type:'papel',shot:'autos',splash:52},
  up:[[{n:'Relator',c:300,d:'+2 de argumento',f:s=>{s.dmg+=2}},
       {n:'Turma Cheia',c:950,d:'25% mais rápido, área maior',f:s=>{s.rate*=.75;s.splash+=14}},
       {n:'Anulação Geral',c:3200,d:'+10 de argumento, área muito maior',f:s=>{s.dmg+=10;s.splash+=26}}],
      [{n:'Apensos',c:320,d:'+30 de alcance',f:s=>{s.range+=30}},
       {n:'Segredo de Justiça',c:900,d:'Detecta Isentões, 20% mais rápido',f:s=>{s.detect=1;s.rate*=.8}},
       {n:'Presidência do STF',c:3000,d:'+R$ 400 por rodada, torres próximas 15% mais rápidas',f:s=>{s.income=400;s.aura=.15;s.auraR=150}}]]};
TOWERS.zanin={nome:'Cristiano Zanin',cost:470,atk:'shot',desc:'Dispara habeas corpus em ritmo acelerado. Evoluindo, cobra honorários a cada um que convence.',
  base:{range:170,rate:.55,dmg:1.5,pierce:1,spd:640,type:'papel',shot:'habeas'},
  up:[[{n:'Petição Inicial',c:300,d:'+1 de argumento',f:s=>{s.dmg+=1}},
       {n:'Recurso Atrás de Recurso',c:950,d:'30% mais rápido, atravessa +1',f:s=>{s.rate*=.7;s.pierce+=1}},
       {n:'Sustentação Oral',c:3200,d:'3 por vez, +6 de argumento',f:s=>{s.spread=3;s.dmg+=6}}],
      [{n:'Honorários',c:350,d:'+R$ 2 a cada um que convence',f:s=>{s.bonus=(s.bonus||0)+2}},
       {n:'Vista dos Autos',c:900,d:'Detecta Isentões, +30 de alcance',f:s=>{s.detect=1;s.range+=30}},
       {n:'Grande Banca',c:3000,d:'+R$ 500 por rodada, +3 de argumento',f:s=>{s.income=500;s.dmg+=3}}]]};
TOWERS.carmen={nome:'Cármen Lúcia',cost:510,atk:'shot',desc:'Joga balões de "Cala a boca já morreu!" que calam por um instante quem acertam.',
  base:{range:180,rate:1,dmg:2,pierce:2,spd:520,type:'papel',shot:'calaboca',stunHit:.35,bossStun:.1},
  up:[[{n:'Voto de Minerva',c:300,d:'+2 de argumento',f:s=>{s.dmg+=2}},
       {n:'Sessão Plenária',c:950,d:'25% mais rápido, atravessa +2',f:s=>{s.rate*=.75;s.pierce+=2}},
       {n:'Constituição em Punho',c:3200,d:'3 por vez, +8 de argumento',f:s=>{s.spread=3;s.dmg+=8}}],
      [{n:'Presidência do TSE',c:350,d:'Torres próximas 15% mais rápidas',f:s=>{s.aura=.15;s.auraR=150}},
       {n:'Mesárias',c:900,d:'Detecta Isentões, +30 de alcance',f:s=>{s.detect=1;s.range+=30}},
       {n:'Ministra Mineira',c:3000,d:'+6 de argumento, torres próximas 30% mais rápidas',f:s=>{s.dmg+=6;s.aura=.3}}]]};
TOWERS.stalin={nome:'Josef Stalin',cost:650,atk:'shot',desc:'Dispara estrelas vermelhas e, de tempos em tempos, solta a bomba atômica, que atinge uma área enorme.',
  base:{range:190,rate:1.1,dmg:2,pierce:2,spd:520,type:'papel',shot:'estrelaS',nukeRate:28,nukeR:150,nukeDmg:30},
  up:[[{n:'Plano Quinquenal',c:320,d:'+2 de argumento',f:s=>{s.dmg+=2}},
       {n:'Primeiro Teste',c:1000,d:'Bomba bem mais forte e maior',f:s=>{s.nukeDmg=70;s.nukeR=180}},
       {n:'Corrida Nuclear',c:3600,d:'Bomba muito mais frequente, forte e maior',f:s=>{s.nukeRate=16;s.nukeDmg=140;s.nukeR=215}}],
      [{n:'Propaganda',c:350,d:'30% mais rápido',f:s=>{s.rate*=.7}},
       {n:'Polícia Secreta',c:900,d:'Detecta Isentões, a bomba recarrega mais rápido',f:s=>{s.detect=1;s.nukeRate*=.8}},
       {n:'Cortina de Ferro',c:3000,d:'+6 de argumento, atravessa +3',f:s=>{s.dmg+=6;s.pierce+=3}}]]};
TOWERS.abbas={nome:'Mahmoud Abbas',cost:500,atk:'shot',desc:'Alterna chaves e resoluções da ONU, que atingem uma área. Evoluindo, a diplomacia acelera as torres próximas.',
  base:{range:180,rate:1.15,dmg:2,pierce:2,spd:520,type:'papel',alt:['chaveP','resolP'],splash:32},
  up:[[{n:'Resolução Aprovada',c:300,d:'+2 de argumento',f:s=>{s.dmg+=2}},
       {n:'Assembleia Geral',c:950,d:'25% mais rápido, área maior',f:s=>{s.rate*=.75;s.splash+=14}},
       {n:'Voto Unânime',c:3200,d:'3 por vez, +8 de argumento',f:s=>{s.spread=3;s.dmg+=8}}],
      [{n:'Diplomacia',c:350,d:'Torres próximas 15% mais rápidas',f:s=>{s.aura=.15;s.auraR=150}},
       {n:'Ajuda Internacional',c:900,d:'+R$ 300 por rodada, detecta Isentões',f:s=>{s.income=300;s.detect=1}},
       {n:'Reconhecimento Mundial',c:3000,d:'+6 de argumento, torres próximas 30% mais rápidas',f:s=>{s.dmg+=6;s.aura=.3}}]]};
TOWERS.miliciano={nome:'Miliciano',cost:900,atk:'shot',tank:1,desc:'Um tanque que dispara de longe, devagar, com explosão em área. Evoluindo, cobra taxa da região e rende verba.',
  base:{range:220,rate:2.4,dmg:8,pierce:1,spd:460,type:'papel',shot:'obus',splash:60},
  up:[[{n:'Munição Pesada',c:350,d:'+6 de argumento',f:s=>{s.dmg+=6}},
       {n:'Carregador Automático',c:1100,d:'30% mais rápido, área maior',f:s=>{s.rate*=.7;s.splash+=14}},
       {n:'Canhão Duplo',c:3800,d:'2 tiros por vez, +20 de argumento',f:s=>{s.spread=2;s.dmg+=20}}],
      [{n:'Gatonet',c:400,d:'+R$ 150 por rodada',f:s=>{s.income=150}},
       {n:'Taxa de Segurança',c:1000,d:'+R$ 350 por rodada, detecta Isentões',f:s=>{s.income=350;s.detect=1}},
       {n:'Domínio do Território',c:3200,d:'+R$ 700 por rodada, +10 de argumento',f:s=>{s.income=700;s.dmg+=10}}]]};
TOWERS.empresarios={nome:'Empresários',cost:650,atk:'none',building:'emp',desc:'Não ataca. O prédio guarda dinheiro no cofre a cada rodada, com juros sobre o que ficar lá. Clique nele para sacar.',
  base:{range:0,aporte:120,juros:.1,teto:3000},
  up:[[{n:'Filial',c:450,d:'+R$ 80 de aporte por rodada',f:s=>{s.aporte+=80}},
       {n:'Fusão',c:1400,d:'+R$ 200 de aporte, juros de 15%',f:s=>{s.aporte+=200;s.juros=.15}},
       {n:'Holding',c:4800,d:'+R$ 600 de aporte, juros de 20%, cofre até R$ 15.000',f:s=>{s.aporte+=600;s.juros=.2;s.teto=15000}}],
      [{n:'Cofre Maior',c:400,d:'Cofre até R$ 6.000',f:s=>{s.teto=Math.max(s.teto,6000)}},
       {n:'Débito Automático',c:1200,d:'O cofre vai sozinho para a verba no fim da rodada',f:s=>{s.autoSaque=1}},
       {n:'Bolsa de Valores',c:3200,d:'+R$ 800 de aporte por rodada',f:s=>{s.aporte+=800}}]]};
TOWERS.ratinho={nome:'Ratinho',cost:500,atk:'shot',desc:'Invoca ratos que andam pela avenida e mordem quem encontram, e joga exames de DNA que revelam quem é Isentão.',
  base:{range:175,rate:1.1,dmg:1,pierce:2,spd:540,type:'papel',shot:'dnaR',detect:1,robots:2,rato:1,sumRate:4,robotLife:9,robotDmg:1.5},
  up:[[{n:'Ninhada',c:320,d:'Invoca 3 ratos por vez',f:s=>{s.robots=3}},
       {n:'Ratazanas',c:950,d:'Mordida +2, invoca mais rápido',f:s=>{s.robotDmg+=2;s.sumRate=3}},
       {n:'Praga de Ratos',c:3200,d:'6 ratos por vez, mordida +6, duram mais',f:s=>{s.robots=6;s.robotDmg+=6;s.robotLife+=4}}],
      [{n:'Patrocinador',c:350,d:'+R$ 100 por rodada',f:s=>{s.income=100}},
       {n:'Filho Governador',c:900,d:'+R$ 300 por rodada, +30 de alcance',f:s=>{s.income=300;s.range+=30}},
       {n:'Recorde de Audiência',c:3000,d:'+R$ 500 por rodada, +4 de argumento',f:s=>{s.income=500;s.dmg+=4}}]]};
TOWERS.neymar={nome:'Neymar Jr',cost:480,atk:'shot',desc:'Chuta bolas que atravessam a fila. Evoluindo, dribla e deixa o alvo parado por um instante.',
  base:{range:180,rate:1.15,dmg:2,pierce:3,spd:600,type:'papel',shot:'bolaN'},
  up:[[{n:'Chute Colocado',c:300,d:'+2 de argumento',f:s=>{s.dmg+=2}},
       {n:'Lambreta',c:950,d:'25% mais rápido, atravessa +3',f:s=>{s.rate*=.75;s.pierce+=3}},
       {n:'Gol de Placa',c:3200,d:'3 bolas por vez, +8 de argumento',f:s=>{s.spread=3;s.dmg+=8}}],
      [{n:'Drible Desconcertante',c:350,d:'Quem leva a bola fica parado por um instante',f:s=>{s.stunHit=.3;s.bossStun=.1}},
       {n:'Contrato Milionário',c:900,d:'+R$ 300 por rodada, detecta Isentões',f:s=>{s.income=300;s.detect=1}},
       {n:'Camisa 10',c:3000,d:'+R$ 500 por rodada, +4 de argumento',f:s=>{s.income=500;s.dmg+=4}}]]};
TOWERS.gusttavo={nome:'Gusttavo Lima',cost:480,atk:'shot',desc:'Joga discos de ouro que atravessam a fila. Evoluindo, acelera as torres próximas.',
  base:{range:175,rate:1.1,dmg:2,pierce:2,spd:540,type:'papel',shot:'discoG'},
  up:[[{n:'Disco de Ouro',c:300,d:'+2 de argumento',f:s=>{s.dmg+=2}},
       {n:'Disco de Platina',c:950,d:'25% mais rápido, atravessa +2',f:s=>{s.rate*=.75;s.pierce+=2}},
       {n:'Buteco Lotado',c:3200,d:'3 discos por vez, +8 de argumento',f:s=>{s.spread=3;s.dmg+=8}}],
      [{n:'Embaixador',c:350,d:'Torres próximas 15% mais rápidas',f:s=>{s.aura=.15;s.auraR=150}},
       {n:'Cachê Alto',c:900,d:'+R$ 300 por rodada',f:s=>{s.income=300}},
       {n:'Turnê Nacional',c:3000,d:'+6 de argumento, torres próximas 30% mais rápidas',f:s=>{s.dmg+=6;s.aura=.3}}]]};
TOWERS.xuxa={nome:'Xuxa Meneghel',cost:490,atk:'shot',desc:'Joga bonecas e, assim que entra, traz o Xuxucão, que fica sempre ao lado e morde quem chega perto.',
  base:{range:175,rate:1,dmg:2,pierce:1,spd:520,type:'papel',shot:'bonecaX',pet:1,petR:80,petRate:.7,petDmg:2},
  up:[[{n:'Boneca de Coleção',c:300,d:'+2 de argumento',f:s=>{s.dmg+=2}},
       {n:'Ilariê',c:950,d:'25% mais rápido, atravessa +2, Xuxucão morde +3',f:s=>{s.rate*=.75;s.pierce+=2;s.petDmg+=3}},
       {n:'Rainha dos Baixinhos',c:3200,d:'3 bonecas por vez, +8 de argumento, Xuxucão morde +8',f:s=>{s.spread=3;s.dmg+=8;s.petDmg+=8}}],
      [{n:'Paquitas',c:350,d:'Torres próximas 15% mais rápidas',f:s=>{s.aura=.15;s.auraR=150}},
       {n:'Programa na TV',c:900,d:'+R$ 300 por rodada, detecta Isentões',f:s=>{s.income=300;s.detect=1}},
       {n:'Nave da Xuxa',c:3000,d:'+6 de argumento, torres próximas 30% mais rápidas',f:s=>{s.dmg+=6;s.aura=.3}}]]};
TOWERS.ana={nome:'Ana Castela',cost:420,atk:'boom',desc:'Arremessa o chapéu, que vai e volta atravessando a fila.',
  base:{range:160,rate:1.45,dmg:2,pierce:4,type:'papel',count:1,shot:'chapeu'},
  up:[[{n:'Aba Larga',c:300,d:'+2 de argumento, atravessa +3',f:s=>{s.dmg+=2;s.pierce+=3}},
       {n:'Boiadeira',c:950,d:'25% mais rápido, +30 de alcance',f:s=>{s.rate*=.75;s.range+=30}},
       {n:'Chapéu de Ouro',c:3200,d:'3 chapéus por vez, +8 de argumento',f:s=>{s.count=3;s.dmg+=8}}],
      [{n:'Pipoco',c:350,d:'+R$ 100 por rodada',f:s=>{s.income=100}},
       {n:'Turnê pelo Interior',c:900,d:'+R$ 250 por rodada, detecta Isentões',f:s=>{s.income=250;s.detect=1}},
       {n:'Agro Pop',c:3000,d:'+R$ 550 por rodada, +4 de argumento',f:s=>{s.income=550;s.dmg+=4}}]]};
TOWERS.pabllo={nome:'Pabllo Vittar',cost:540,atk:'saw',desc:'Cospe fogo em cone e atinge todo mundo que estiver na frente de uma vez.',
  base:{range:150,rate:.7,dmg:2,pierce:12,type:'fogo',sawArc:.6,sawFx:'fogoC'},
  up:[[{n:'Chama Forte',c:300,d:'+2 de argumento',f:s=>{s.dmg+=2}},
       {n:'Sopro Longo',c:950,d:'25% mais rápido, +40 de alcance',f:s=>{s.rate*=.75;s.range+=40}},
       {n:'Nocaute no Palco',c:3200,d:'+9 de argumento, cone bem mais aberto, atinge quantos estiverem no fogo',f:s=>{s.dmg+=9;s.pierce=60;s.sawArc=.95}}],
      [{n:'Trio Elétrico',c:350,d:'Torres próximas 15% mais rápidas',f:s=>{s.aura=.15;s.auraR=150}},
       {n:'Open Bar',c:900,d:'+R$ 250 por rodada',f:s=>{s.income=250}},
       {n:'Parada do Orgulho',c:3000,d:'+6 de argumento, torres próximas 30% mais rápidas',f:s=>{s.dmg+=6;s.aura=.3}}]]};
TOWERS.anitta={nome:'Anitta',cost:520,atk:'saw',desc:'Derrota quem estiver na frente rebolando: acerta vários de uma vez, de perto. Evoluindo, faz todo mundo por perto parar para dançar.',
  base:{range:110,rate:.58,dmg:2,pierce:6,type:'danca',sawArc:.9,sawFx:'rebolado'},
  up:[[{n:'Show das Poderosas',c:300,d:'+2 de argumento',f:s=>{s.dmg+=2}},
       {n:'Hit do Verão',c:950,d:'25% mais rápido, atinge +4, +25 de alcance',f:s=>{s.rate*=.75;s.pierce+=4;s.range+=25}},
       {n:'Garota do Rio',c:3200,d:'+8 de argumento, +40 de alcance, atinge bem mais gente',f:s=>{s.dmg+=8;s.range+=40;s.pierce+=8;s.sawArc=1.4}}],
      [{n:'Envolver',c:350,d:'De tempos em tempos, faz todo mundo por perto dançar',f:s=>{s.danceRate=6;s.danceT=.8}},
       {n:'Turnê Mundial',c:900,d:'Dança mais frequente, detecta Isentões',f:s=>{s.danceRate=4.2;s.detect=1}},
       {n:'Estrela Global',c:3000,d:'+R$ 500 por rodada, +3 de argumento',f:s=>{s.income=500;s.dmg+=3}}]]};
TOWERS.musk={nome:'Elon Musk',cost:700,atk:'plane',desc:'Voa de foguete dando voltas pelo mapa e joga carros o tempo todo, sem mirar, para os dois lados.',
  base:{orbit:210,reach:150,range:360,planeSpd:1.1,rate:.8,dmg:3,pierce:1,spd:360,splash:70,semMira:1.2,type:'papel',shot:'carro'},
  up:[[{n:'Autopiloto',c:300,d:'Foguete mais veloz, 20% mais rápido',f:s=>{s.planeSpd*=1.3;s.rate*=.8}},
       {n:'Caminhonete Blindada',c:950,d:'+4 de argumento, área maior',f:s=>{s.dmg+=4;s.splash+=14}},
       {n:'Nave Estelar',c:3400,d:'+10 de argumento, muito mais rápido',f:s=>{s.dmg+=10;s.rate*=.55}}],
      [{n:'Satélites',c:350,d:'Detecta Isentões',f:s=>{s.detect=1}},
       {n:'Viagem a Marte',c:900,d:'Voa bem mais longe',f:s=>{s.orbit+=70;s.reach+=40;s.range=s.orbit+s.reach}},
       {n:'Frota de Foguetes',c:3000,d:'Dois foguetes no ar, +3 de argumento',f:s=>{s.planes=2;s.dmg+=3}}]]};
TOWERS.marina={nome:'Marina Silva',cost:540,atk:'shot',desc:'Joga folhas e invoca dinossauros que andam pela avenida e mordem quem encontram.',
  base:{range:170,rate:1.1,dmg:1,pierce:1,spd:500,type:'papel',shot:'folhaV',robots:1,dino:1,dinoS:1,sumRate:5.5,robotLife:8,robotDmg:1.5},
  up:[[{n:'Ovos de Dinossauro',c:320,d:'Invoca 2 dinossauros por vez',f:s=>{s.robots=2}},
       {n:'Velociraptor',c:950,d:'Mordida +3, invoca mais rápido',f:s=>{s.robotDmg+=3;s.sumRate=3.4}},
       {n:'Tiranossauro Rex',c:3200,d:'Dinossauros gigantes: mordida +12 e duram mais',f:s=>{s.dinoS=1.5;s.robotDmg+=12;s.robotLife+=5}}],
      [{n:'Rede Sustentabilidade',c:320,d:'+30 de alcance',f:s=>{s.range+=30}},
       {n:'Reserva Extrativista',c:900,d:'Ela e os dinossauros detectam Isentões, eles duram mais',f:s=>{s.detect=1;s.robotLife+=4}},
       {n:'Floresta em Pé',c:3000,d:'+R$ 500 por rodada, +3 de argumento',f:s=>{s.income=500;s.dmg+=3}}]]};
TOWERS.gilmar={nome:'Gilmar Mendes',cost:500,atk:'shot',desc:'Distribui passagens para o fórum de Lisboa: quem recebe volta um pedaço do caminho.',
  base:{range:175,rate:1,dmg:3,pierce:3,spd:540,type:'papel',shot:'lisboa',knock:30},
  up:[[{n:'Primeira Classe',c:300,d:'+2 de argumento',f:s=>{s.dmg+=2}},
       {n:'Voo Direto',c:950,d:'25% mais rápido, empurra para mais longe',f:s=>{s.rate*=.75;s.knock=50}},
       {n:'Fórum em Lisboa',c:3200,d:'3 passagens por vez, +8 de argumento',f:s=>{s.spread=3;s.dmg+=8}}],
      [{n:'Decano',c:320,d:'+30 de alcance',f:s=>{s.range+=30}},
       {n:'Instituto em Brasília',c:900,d:'+R$ 250 por rodada',f:s=>{s.income=250}},
       {n:'Palavra Final',c:3000,d:'+R$ 500 por rodada, +3 de argumento',f:s=>{s.income=500;s.dmg+=3}}]]};
TOWERS.toffoli={nome:'Dias Toffoli',cost:520,atk:'shot',desc:'Carimba "ANULADO": apaga o escudo dos chefes e segura o alvo por um instante.',
  base:{range:175,rate:1,dmg:3,pierce:1,spd:560,type:'decisao',shot:'anulado',stunHit:.2,bossStun:.06},
  up:[[{n:'Carimbo Novo',c:300,d:'+2 de argumento',f:s=>{s.dmg+=2}},
       {n:'Decisão de Ofício',c:950,d:'25% mais rápido, atravessa +2',f:s=>{s.rate*=.75;s.pierce+=2}},
       {n:'Anula Tudo',c:3200,d:'3 carimbos por vez, +8 de argumento',f:s=>{s.spread=3;s.dmg+=8}}],
      [{n:'Inquérito Aberto',c:340,d:'+30 de alcance, detecta Isentões',f:s=>{s.range+=30;s.detect=1}},
       {n:'Plantão Judiciário',c:900,d:'+R$ 250 por rodada',f:s=>{s.income=250}},
       {n:'Presidência da Corte',c:3000,d:'+R$ 400 por rodada, torres próximas 15% mais rápidas',f:s=>{s.income=400;s.aura=.15;s.auraR=150}}]]};
TOWERS.nunes={nome:'Nunes Marques',cost:480,atk:'shot',desc:'Joga cajuína do Piauí, que atinge uma pequena área e deixa o pessoal mais lento.',
  base:{range:170,rate:1.3,dmg:2,pierce:1,spd:500,type:'comida',shot:'cajuina',splash:30},
  up:[[{n:'Cajuína Gelada',c:300,d:'+2 de argumento',f:s=>{s.dmg+=2}},
       {n:'Voto Divergente',c:950,d:'25% mais rápido, área maior',f:s=>{s.rate*=.75;s.splash+=14}},
       {n:'Engradado do Piauí',c:3200,d:'3 por vez, +8 de argumento',f:s=>{s.spread=3;s.dmg+=8}}],
      [{n:'Indicado',c:320,d:'+30 de alcance',f:s=>{s.range+=30}},
       {n:'Sessão no TSE',c:900,d:'Detecta Isentões, 20% mais rápido',f:s=>{s.detect=1;s.rate*=.8}},
       {n:'Presidência do TSE',c:3000,d:'+R$ 400 por rodada, +4 de argumento',f:s=>{s.income=400;s.dmg+=4}}]]};
TOWERS.milei={nome:'Javier Milei',cost:500,atk:'saw',desc:'Ataca com a motosserra quem estiver na frente dele e acerta vários de uma vez. Alcance curto, não joga nada.',
  base:{range:100,rate:.7,dmg:2,pierce:4,type:'papel',sawArc:1.05},
  up:[[{n:'¡Afuera!',c:300,d:'+2 de argumento',f:s=>{s.dmg+=2}},
       {n:'Motosserra Ligada',c:950,d:'30% mais rápido, corta +3 de uma vez',f:s=>{s.rate*=.7;s.pierce+=3}},
       {n:'Motosserra no Estado',c:3200,d:'+8 de argumento, +40 de alcance, corte mais aberto',f:s=>{s.dmg+=8;s.range+=40;s.sawArc=1.5}}],
      [{n:'Corte de Gastos',c:350,d:'+R$ 100 por rodada',f:s=>{s.income=100}},
       {n:'Dolarização',c:900,d:'+R$ 250 por rodada, detecta Isentões',f:s=>{s.income=250;s.detect=1}},
       {n:'Viva la Libertad',c:3000,d:'+R$ 600 por rodada, +4 de argumento',f:s=>{s.income=600;s.dmg+=4}}]]};
TOWERS.bukele={nome:'Nayib Bukele',cost:500,atk:'shot',desc:'Joga algemas e prende quem acerta: o alvo fica parado atrás das grades por um tempo. Evoluindo, quem estiver fraco vai direto para o presídio.',
  base:{range:180,rate:1,dmg:3,pierce:3,spd:560,type:'decisao',shot:'algema',stunHit:1.1,bossStun:.3},
  up:[[{n:'Estado de Exceção',c:350,d:'Prende por mais tempo, +1 de argumento',f:s=>{s.stunHit=1.5;s.dmg+=1}},
       {n:'Prisão em Massa',c:1000,d:'3 algemas por vez',f:s=>{s.spread=3}},
       {n:'Megapresídio',c:3300,d:'Quem tiver até 20 de vida é preso de vez, +6 de argumento (chefes não)',f:s=>{s.jailHp=20;s.dmg+=6}}],
      [{n:'Polícia Nacional',c:320,d:'+40 de alcance',f:s=>{s.range+=40}},
       {n:'Câmeras nas Ruas',c:900,d:'Detecta Isentões, 25% mais rápido',f:s=>{s.detect=1;s.rate*=.75}},
       {n:'Bitcoin Oficial',c:3000,d:'+R$ 500 por rodada, +3 de argumento',f:s=>{s.income=500;s.dmg+=3}}]]};
TOWERS.lenin={nome:'Vladimir Lenin',cost:520,atk:'shot',desc:'Joga exemplares do jornal Pravda que atravessam a fila. Evoluindo, organiza os sovietes e acelera as torres próximas.',
  base:{range:180,rate:1.1,dmg:2,pierce:2,spd:520,type:'papel',shot:'pravda'},
  up:[[{n:'Edição Especial',c:300,d:'+2 de argumento',f:s=>{s.dmg+=2}},
       {n:'Teses de Abril',c:950,d:'25% mais rápido, atravessa +3',f:s=>{s.rate*=.75;s.pierce+=3}},
       {n:'Revolução de Outubro',c:3200,d:'3 jornais por vez, +8 de argumento',f:s=>{s.spread=3;s.dmg+=8}}],
      [{n:'Sovietes',c:350,d:'Torres próximas 15% mais rápidas',f:s=>{s.aura=.15;s.auraR=150}},
       {n:'Nova Política Econômica',c:900,d:'+R$ 250 por rodada',f:s=>{s.income=250}},
       {n:'Todo Poder aos Sovietes',c:3000,d:'+6 de argumento, torres próximas 30% mais rápidas',f:s=>{s.dmg+=6;s.aura=.3}}]]};
TOWERS.kelmon={nome:'Padre Kelmon',cost:480,atk:'shot',desc:'Joga cruzes que atingem uma área, e já enxerga Isentões.',
  base:{range:170,rate:1.1,dmg:2,pierce:1,spd:480,type:'comida',shot:'cruz',splash:44,detect:1},
  up:[[{n:'Cruz de Ouro',c:300,d:'+2 de argumento',f:s=>{s.dmg+=2}},
       {n:'Sermão Longo',c:900,d:'25% mais rápido, área maior',f:s=>{s.rate*=.75;s.splash+=14}},
       {n:'Procissão',c:3200,d:'+9 de argumento',f:s=>{s.dmg+=9}}],
      [{n:'Padre de Festa Junina',c:350,d:'Torres próximas 15% mais rápidas',f:s=>{s.aura=.15;s.auraR=150}},
       {n:'Quermesse',c:900,d:'+R$ 200 por rodada',f:s=>{s.income=200}},
       {n:'Debate na TV',c:3000,d:'+6 de argumento, torres próximas 30% mais rápidas',f:s=>{s.dmg+=6;s.aura=.3}}]]};
TOWERS.kim={nome:'Kim Kataguiri',cost:500,atk:'shot',desc:'Alterna projetos de lei, que deixam o pessoal mais lento em tramitação, e sushi. Os dois atingem uma pequena área.',
  base:{range:175,rate:.9,dmg:2,pierce:1,spd:520,type:'papel',alt:['lei','sushi'],splash:34,tram:1},
  up:[[{n:'Emenda ao Projeto',c:300,d:'+2 de argumento',f:s=>{s.dmg+=2}},
       {n:'Regime de Urgência',c:900,d:'25% mais rápido, área maior',f:s=>{s.rate*=.75;s.splash+=14}},
       {n:'Aprovado no Plenário',c:3200,d:'+5 de argumento',f:s=>{s.dmg+=5}}],
      [{n:'Combinado',c:650,d:'3 por vez',f:s=>{s.spread=3}},
       {n:'Rodízio Livre',c:900,d:'20% mais rápido, detecta Isentões',f:s=>{s.rate*=.8;s.detect=1}},
       {n:'Barca de Sushi',c:3000,d:'+4 de argumento, área maior',f:s=>{s.dmg+=4;s.splash+=18}}]]};
TOWERS.renan={nome:'Renan Santos',cost:500,atk:'shot',desc:'Joga cogumelos que deixam o pessoal viajando e andando para trás, e de tempos em tempos toca violão para todo mundo por perto.',
  base:{range:170,rate:.8,dmg:2,pierce:3,spd:480,type:'comida',shot:'cogumelo',trip:.7,guitarRate:5,guitarDmg:3},
  up:[[{n:'Cogumelo Colorido',c:300,d:'+2 de argumento',f:s=>{s.dmg+=2}},
       {n:'Viagem Longa',c:900,d:'Viaja por mais tempo, 20% mais rápido',f:s=>{s.trip=1.2;s.rate*=.8}},
       {n:'Reino dos Cogumelos',c:3200,d:'3 cogumelos por vez, +8 de argumento',f:s=>{s.spread=3;s.dmg+=8}}],
      [{n:'Acorde Maior',c:320,d:'O violão dá +3 de argumento',f:s=>{s.guitarDmg+=3}},
       {n:'Roda de Violão',c:900,d:'Toca bem mais vezes, +30 de alcance',f:s=>{s.guitarRate=3;s.range+=30}},
       {n:'Show Acústico',c:3000,d:'O violão dá +10 de argumento, +R$ 300 por rodada',f:s=>{s.guitarDmg+=10;s.income=300}}]]};
TOWERS.manga={nome:'Rodrigo Manga',cost:470,atk:'shot',desc:'Joga mangas e, de tempos em tempos, faz todo mundo por perto parar para dançar.',
  base:{range:170,rate:.95,dmg:2,pierce:2,spd:500,type:'comida',shot:'manga',danceRate:7,danceT:.9},
  up:[[{n:'Manga Madura',c:300,d:'+2 de argumento',f:s=>{s.dmg+=2}},
       {n:'Manga Rosa',c:900,d:'Atravessa +3, 20% mais rápido',f:s=>{s.pierce+=3;s.rate*=.8}},
       {n:'Mangueira Inteira',c:3200,d:'3 mangas por vez, +8 de argumento',f:s=>{s.spread=3;s.dmg+=8}}],
      [{n:'Dancinha',c:320,d:'A dança dura mais',f:s=>{s.danceT=1.4}},
       {n:'Viral no TikTok',c:900,d:'Dança mais frequente, detecta Isentões',f:s=>{s.danceRate=4.5;s.detect=1}},
       {n:'Prefeito Dançarino',c:3000,d:'+R$ 400 por rodada, +3 de argumento, dança ainda mais longa',f:s=>{s.income=400;s.dmg+=3;s.danceT=1.8}}]]};
TOWERS.eneas={nome:'Enéas Carneiro',cost:650,atk:'shot',desc:'Ataca gritando o próprio nome e, de tempos em tempos, solta a bomba atômica, que atinge uma área enorme.',
  base:{range:190,rate:1.1,dmg:2,pierce:2,spd:520,type:'papel',shot:'eneas',nukeRate:28,nukeR:150,nukeDmg:30},
  up:[[{n:'Prona',c:320,d:'+2 de argumento',f:s=>{s.dmg+=2}},
       {n:'Urânio Enriquecido',c:1000,d:'Bomba bem mais forte e maior',f:s=>{s.nukeDmg=70;s.nukeR=180}},
       {n:'Projeto Nuclear',c:3600,d:'Bomba muito mais frequente, forte e maior',f:s=>{s.nukeRate=16;s.nukeDmg=140;s.nukeR=215}}],
      [{n:'Meu Nome é Enéas',c:350,d:'30% mais rápido',f:s=>{s.rate*=.7}},
       {n:'Aula de Física',c:900,d:'Detecta Isentões, a bomba recarrega mais rápido',f:s=>{s.detect=1;s.nukeRate*=.8}},
       {n:'Quinze Segundos na TV',c:3000,d:'+6 de argumento, atravessa +3',f:s=>{s.dmg+=6;s.pierce+=3}}]]};
TOWERS.eduarda={nome:'Eduarda Campopiano',cost:480,atk:'shot',desc:'Dispara um leque de votos que cobre a avenida na frente dela.',
  base:{range:155,rate:1.2,dmg:1.5,pierce:1,spd:540,type:'papel',shot:'voto',spread:5},
  up:[[{n:'Vereadora',c:280,d:'+1 de argumento',f:s=>{s.dmg+=1}},
       {n:'Deputada Eleita',c:900,d:'7 votos por vez, 20% mais rápida',f:s=>{s.spread=7;s.rate*=.8}},
       {n:'Mais Votada de SP',c:3200,d:'+6 de argumento, cada voto atravessa +2',f:s=>{s.dmg+=6;s.pierce+=2}}],
      [{n:'Microfone na Câmara',c:320,d:'+35 de alcance',f:s=>{s.range+=35}},
       {n:'Vídeo nas Redes',c:900,d:'Detecta Isentões, 15% mais rápida',f:s=>{s.detect=1;s.rate*=.85}},
       {n:'Quase 2 Milhões',c:3000,d:'+R$ 500 por rodada, +2 de argumento',f:s=>{s.income=500;s.dmg+=2}}]]};
TOWERS.caiado={nome:'Ronaldo Caiado',cost:490,atk:'shot',desc:'Joga pequi cheio de espinho, que atravessa a fila. Como é médico, recupera apoio popular a cada rodada.',
  base:{range:175,rate:.95,dmg:2,pierce:3,spd:500,type:'comida',shot:'pequi',regen:1},
  up:[[{n:'Pequi Maduro',c:300,d:'+2 de argumento',f:s=>{s.dmg+=2}},
       {n:'Espinhos do Pequi',c:900,d:'Atravessa +4, 20% mais rápido',f:s=>{s.pierce+=4;s.rate*=.8}},
       {n:'Pequizeiro Inteiro',c:3200,d:'3 pequis por vez, +8 de argumento',f:s=>{s.spread=3;s.dmg+=8}}],
      [{n:'Consultório',c:320,d:'+1 de apoio por rodada',f:s=>{s.regen+=1}},
       {n:'Plantão Médico',c:900,d:'+30 de alcance, detecta Isentões',f:s=>{s.range+=30;s.detect=1}},
       {n:'Doutor Governador',c:3000,d:'+3 de apoio e +R$ 400 por rodada',f:s=>{s.regen+=3;s.income=400}}]]};
TOWERS.zema={nome:'Romeu Zema',cost:470,atk:'shot',desc:'Alterna pão de queijo e banana. Quem pisa na banana escorrega e para um instante.',
  base:{range:175,rate:.7,dmg:2,pierce:1,spd:500,type:'comida',alt:['paoqueijo','banana'],banStun:.5},
  up:[[{n:'Pão de Queijo Quentinho',c:300,d:'+2 de argumento',f:s=>{s.dmg+=2}},
       {n:'Queijo Canastra',c:900,d:'Atinge uma área, 20% mais rápido',f:s=>{s.splash=44;s.rate*=.8}},
       {n:'Minas de Novo',c:3200,d:'+9 de argumento, área maior',f:s=>{s.dmg+=9;s.splash=66}}],
      [{n:'Banana com Casca',c:320,d:'Escorrega por mais tempo',f:s=>{s.banStun=.95}},
       {n:'Privatização',c:900,d:'+R$ 150 por rodada, +R$ 2 por pessoa convencida',f:s=>{s.income=150;s.bonus=2}},
       {n:'Estado Mínimo',c:3000,d:'+R$ 500 por rodada, +3 de argumento',f:s=>{s.income+=500;s.dmg+=3}}]]};
TOWERS.cury={nome:'Augusto Cury',cost:510,atk:'shot',desc:'Joga Rivotril, que faz o pessoal cochilar um instante, e invoca drones que sobrevoam a avenida atirando.',
  base:{range:170,rate:1.15,dmg:3,pierce:3,spd:480,type:'papel',shot:'rivotril',stunHit:.7,bossStun:.12,robots:1,drone:1,sumRate:5,robotLife:8,robotDmg:2},
  up:[[{n:'Gestão da Emoção',c:300,d:'O cochilo dura mais',f:s=>{s.stunHit=1.1}},
       {n:'Ansiedade Zero',c:900,d:'25% mais rápido, +2 de argumento',f:s=>{s.rate*=.75;s.dmg+=2}},
       {n:'O Vendedor de Sonhos',c:3200,d:'+7 de argumento, cochilo bem mais longo',f:s=>{s.dmg+=7;s.stunHit=1.4}}],
      [{n:'Drone Extra',c:350,d:'2 drones por vez',f:s=>{s.robots=2}},
       {n:'Inteligência Multifocal',c:900,d:'Ele e os drones detectam Isentões, drones duram mais',f:s=>{s.detect=1;s.robotLife+=4}},
       {n:'Enxame',c:3000,d:'4 drones por vez, bem mais fortes',f:s=>{s.robots=4;s.robotDmg+=3}}]]};
TOWERS.datena={nome:'Datena',cost:470,atk:'shot',desc:'Dá cadeirada: arremessa cadeiras de perto, atinge uma área e deixa o pessoal tonto por um instante.',
  base:{range:135,rate:1.3,dmg:5,pierce:1,spd:520,type:'papel',shot:'cadeira',splash:44,stunHit:.35,bossStun:.15},
  up:[[{n:'Cadeira de Ferro',c:300,d:'+4 de argumento',f:s=>{s.dmg+=4}},
       {n:'Mesa Junto',c:900,d:'Área maior, 20% mais rápido',f:s=>{s.splash+=20;s.rate*=.8}},
       {n:'Cadeirada Histórica',c:3200,d:'+12 de argumento, deixa tonto por mais tempo',f:s=>{s.dmg+=12;s.stunHit=.8}}],
      [{n:'Brasil Urgente',c:350,d:'Detecta Isentões',f:s=>{s.detect=1}},
       {n:'Helicóptero da TV',c:900,d:'+60 de alcance',f:s=>{s.range+=60}},
       {n:'Audiência Recorde',c:3000,d:'+R$ 500 por rodada, +4 de argumento',f:s=>{s.income=500;s.dmg+=4}}]]};
TOWERS.marcal={nome:'Pablo Marçal',cost:490,atk:'shot',desc:'Ataca vendendo curso. Cada pessoa atingida compra um, e a verba entra na hora.',
  base:{range:175,rate:.75,dmg:2,pierce:1,spd:540,type:'papel',shot:'curso',sale:1},
  up:[[{n:'Mentoria VIP',c:300,d:'+2 de argumento',f:s=>{s.dmg+=2}},
       {n:'Método Milionário',c:900,d:'30% mais rápido, cada venda rende +R$ 1',f:s=>{s.rate*=.7;s.sale+=1}},
       {n:'Palestra Lotada',c:3200,d:'+6 de argumento e o curso atinge uma área',f:s=>{s.dmg+=6;s.splash=52}}],
      [{n:'Live de Madrugada',c:350,d:'Detecta Isentões',f:s=>{s.detect=1}},
       {n:'Funil de Vendas',c:900,d:'Atravessa +3',f:s=>{s.pierce+=3}},
       {n:'Assinatura Vitalícia',c:3000,d:'+R$ 500 por rodada, +3 de argumento',f:s=>{s.income=500;s.dmg+=3}}]]};
TOWERS.trump={nome:'Donald Trump',cost:520,atk:'shot',desc:'Joga tarifas e constrói muros na avenida que seguram a fila por um tempo.',
  base:{range:180,rate:.8,dmg:3,pierce:4,spd:540,type:'papel',shot:'tarifa',wallRate:6,wallLife:2.6,wallN:1},
  up:[[{n:'Muro Maior',c:320,d:'O muro dura mais',f:s=>{s.wallLife+=1.2}},
       {n:'Obra Acelerada',c:900,d:'Muros saem bem mais rápido',f:s=>{s.wallRate*=.65}},
       {n:'Muro Duplo',c:3100,d:'2 muros por vez, +6 de argumento',f:s=>{s.wallN=2;s.dmg+=6}}],
      [{n:'Tarifaço',c:340,d:'+2 de argumento',f:s=>{s.dmg+=2}},
       {n:'Boné Vermelho',c:850,d:'30% mais rápido',f:s=>{s.rate*=.7}},
       {n:'Campo de Golfe',c:3000,d:'+R$ 500 por rodada, +4 de argumento',f:s=>{s.income=500;s.dmg+=4}}]]};
/* nome sem a marca da loja (marca registrada); o visual de terno verde e amarelo continua dizendo quem é */
TOWERS.veio={nome:'Véio das Lojas',cost:480,atk:'shot',desc:'Arremessa sacolas de liquidação. Quem é atingido anda mais devagar, e cada pessoa convencida rende verba extra.',
  base:{range:180,rate:1.25,dmg:2,pierce:1,spd:480,type:'comida',shot:'sacola',splash:34,bonus:2},
  up:[[{n:'Estátua da Liberdade',c:350,d:'+40 de alcance',f:s=>{s.range+=40}},
       {n:'Loja Nova',c:900,d:'+3 de argumento, área maior',f:s=>{s.dmg+=3;s.splash+=14}},
       {n:'Rede Nacional',c:3200,d:'+9 de argumento, muito mais rápido',f:s=>{s.dmg+=9;s.rate*=.6}}],
      [{n:'Cupom de Desconto',c:300,d:'+R$ 2 por pessoa convencida',f:s=>{s.bonus+=2}},
       {n:'Liquidação Total',c:900,d:'+R$ 200 por rodada',f:s=>{s.income=200}},
       {n:'Black Friday Patriota',c:3000,d:'+R$ 500 por rodada, +R$ 4 por pessoa convencida',f:s=>{s.income+=500;s.bonus+=4}}]]};
/* kits exclusivos do lado petista; as versões acima seguem como base do lado bolsonarista */
Object.assign(TOWERS,{
  dilma:{nome:'Dilma Rousseff',cost:360,atk:'shot',desc:'Sopra rajadas de vento. Não convence ninguém, só empurra a fila de volta pela avenida.',
    base:{range:180,rate:1.15,dmg:0,pierce:8,spd:420,type:'vento',shot:'vento',knock:42},
    up:[[{n:'Estocar Vento',c:280,d:'Atravessa +6 e empurra mais longe',f:s=>{s.pierce+=6;s.knock+=14}},
         {n:'Mulher Sapiens',c:650,d:'25% mais rápida, atravessa +4',f:s=>{s.rate*=.75;s.pierce+=4}},
         {n:'Furacão na Esplanada',c:2600,d:'Empurrão enorme e 30% mais rápida',f:s=>{s.knock+=30;s.rate*=.7}}],
        [{n:'Dobrar a Meta',c:350,d:'2 rajadas por vez',f:s=>{s.spread=2}},
         {n:'Meta Aberta',c:800,d:'+50 de alcance, detecta Isentões',f:s=>{s.range+=50;s.detect=1}},
         {n:'Dobrar de Novo',c:3000,d:'4 rajadas, cada uma atravessa +4',f:s=>{s.spread=4;s.pierce+=4}}]]},
  haddad:{nome:'Haddad (Taxad)',cost:400,atk:'shot',desc:'Joga imposto em quem passa. Cada pessoa convencida rende verba extra.',
    /* atravessa 3 e alcança 190, como o Nikolas (o 2º gratuito do outro lado): com 2 e 175 a esquerda perdia muito mais no Difícil.
       A verba por convencido caiu de R$ 2 para R$ 1: atravessando 3, ele convence muito, e no fim do jogo a esquerda ficava bem mais rica que a direita */
    base:{range:190,rate:1,dmg:2,pierce:3,spd:560,type:'papel',shot:'imposto',bonus:1},
    up:[[{n:'Alíquota Maior',c:240,d:'+1 de argumento',f:s=>{s.dmg+=1}},
         {n:'IOF',c:700,d:'30% mais rápido, atravessa +2',f:s=>{s.rate*=.7;s.pierce+=2}},
         {n:'Taxação Geral',c:3000,d:'+6 de argumento, muito mais rápido',f:s=>{s.dmg+=6;s.rate*=.6}}],
        [{n:'Malha Fina',c:220,d:'Detecta Isentões, +R$ 1 por pessoa convencida',f:s=>{s.detect=1;s.bonus+=1}},
         {n:'Arrecadação Recorde',c:900,d:'+R$ 150 por rodada, +R$ 1 por pessoa convencida',f:s=>{s.income=150;s.bonus+=1}},
         {n:'Reforma Tributária',c:3200,d:'+R$ 450 por rodada, +R$ 4 por pessoa convencida',f:s=>{s.income+=450;s.bonus+=4}}]]},
  janones:{nome:'André Janones',cost:400,atk:'none',desc:'Não ataca. Dá buff de velocidade nas torres próximas.',
    base:{range:195,auraR:195,aura:.15},
    up:[[{n:'Grupo de WhatsApp',c:220,d:'+40 de alcance do buff',f:s=>{s.auraR+=40;s.range=s.auraR}},
         {n:'Modo Live',c:800,d:'Torres próximas 30% mais rápidas',f:s=>{s.aura=.3}},
         {n:'Viralizou!',c:2800,d:'Torres próximas 55% mais rápidas',f:s=>{s.aura=.55}}],
        [{n:'Print da Conversa',c:260,d:'Torres próximas detectam Isentões',f:s=>{s.giveDet=1}},
         {n:'Engajamento',c:700,d:'Torres próximas com +15% de alcance',f:s=>{s.rangeB=.15}},
         {n:'Algoritmo',c:2800,d:'O buff alcança o mapa inteiro',f:s=>{s.auraR=2000;s.range=2000}}]]},
  sindicato:{nome:'Sindicato',cost:450,atk:'none',building:1,desc:'Não ataca. O prédio dá buff de argumento nas torres próximas.',
    base:{range:175,auraR:175,dmgB:.25},
    up:[[{n:'Assembleia',c:280,d:'+40 de alcance do buff',f:s=>{s.auraR+=40;s.range=s.auraR}},
         {n:'Greve',c:900,d:'Torres próximas com +50% de argumento',f:s=>{s.dmgB=.5}},
         {n:'Central Sindical',c:3200,d:'Torres próximas com o dobro de argumento',f:s=>{s.dmgB=1}}],
        [{n:'Sócio Novo',c:300,d:'+1 de apoio por rodada',f:s=>{s.regen=1}},
         {n:'Piquete',c:800,d:'Tiros das torres próximas atravessam +2',f:s=>{s.pierceB=2}},
         {n:'Dia do Trabalhador',c:2800,d:'Torres próximas também 30% mais rápidas',f:s=>{s.aura=.3}}]]},
  janja:{nome:'Janja',cost:650,atk:'plane',desc:'Sempre viajando. Dá voltas de avião e joga malas o tempo todo, sem mirar, para os dois lados.',
    base:{orbit:210,reach:150,range:360,planeSpd:1,rate:.55,dmg:2,pierce:1,spd:340,splash:55,semMira:1.3,type:'mala',shot:'mala'},
    up:[[{n:'Classe Executiva',c:300,d:'Avião mais veloz, 20% mais rápida',f:s=>{s.planeSpd*=1.3;s.rate*=.8}},
         {n:'Milhas Acumuladas',c:900,d:'+3 de argumento, área maior',f:s=>{s.dmg+=3;s.splash+=14}},
         {n:'Jato da Comitiva',c:3400,d:'+9 de argumento, muito mais rápida',f:s=>{s.dmg+=9;s.rate*=.55}}],
        [{n:'Passaporte Carimbado',c:350,d:'Detecta Isentões',f:s=>{s.detect=1}},
         {n:'Volta ao Mundo',c:900,d:'Voa bem mais longe',f:s=>{s.orbit+=70;s.reach+=40;s.range=s.orbit+s.reach}},
         {n:'Agenda Internacional',c:3000,d:'Dois aviões no ar, +3 de argumento',f:s=>{s.planes=2;s.dmg+=3}}]]},
  xandao:{nome:'Xandão',cost:520,atk:'shot',desc:'Censura com tarja preta. Quem é atingido fica parado, e ele já enxerga Isentões.',
    base:{range:200,rate:1,dmg:3,pierce:4,spd:700,type:'decisao',shot:'tarja',stunHit:.8,bossStun:.3,detect:1},
    up:[[{n:'Inquérito Aberto',c:300,d:'Atinge +2 pessoas',f:s=>{s.pierce+=2}},
         {n:'Decisão Monocrática',c:900,d:'30% mais rápido, censura por mais tempo',f:s=>{s.rate*=.7;s.stunHit=1.2}},
         {n:'Tarja Geral',c:3200,d:'Censura uma área inteira, +4 de argumento',f:s=>{s.splash=70;s.stunHit=1.6;s.dmg+=4}}],
        [{n:'Bloqueio de Perfil',c:400,d:'+2 de argumento, 15% mais rápido',f:s=>{s.dmg+=2;s.rate*=.85}},
         {n:'Multa Diária',c:1000,d:'+3 de argumento, +R$ 3 por pessoa convencida',f:s=>{s.dmg+=3;s.bonus=3}},
         {n:'Plenário Virtual',c:3000,d:'+60 de alcance, +6 de argumento, segura mais os chefões',f:s=>{s.range+=60;s.dmg+=6;s.bossStun=.7}}]]},
  mussolini:{nome:'Benito Mussolini',cost:480,atk:'wave',desc:'Faz discursos intermináveis com o queixo erguido. Cansa todo mundo ao redor de uma vez.',
    base:{range:170,rate:1,dmg:5,pierce:12,type:'som'},
    up:[[{n:'Queixo Erguido',c:280,d:'Atinge +8 pessoas',f:s=>{s.pierce+=8}},
         {n:'Sacada Maior',c:900,d:'+45 de alcance',f:s=>{s.range+=45}},
         {n:'Discurso Interminável',c:3200,d:'+7 de argumento, 40% mais rápido',f:s=>{s.dmg+=7;s.rate*=.6}}],
        [{n:'Trem no Horário',c:350,d:'20% mais rápido',f:s=>{s.rate*=.8}},
         {n:'Medalhas de Sobra',c:900,d:'+3 de argumento',f:s=>{s.dmg+=3}},
         {n:'Pose para a Foto',c:3000,d:'+8 de argumento, atinge +10 pessoas',f:s=>{s.dmg+=8;s.pierce+=10}}]]},
  putin:{nome:'Vladimir Putin',cost:480,atk:'aura',desc:'Solta morcegos que perseguem quem passa, e o inverno russo deixa todo mundo por perto mais devagar.',
    base:{range:150,slow:.4,dmg:1,rate:.8,type:'neve',cold:1,bats:1,batRate:1,batDmg:4},
    up:[[{n:'Casaco de Pele',c:260,d:'+30 de alcance',f:s=>{s.range+=30}},
         {n:'Mesa Comprida',c:800,d:'Reduz a velocidade em 60%',f:s=>{s.slow=.6}},
         {n:'Inverno Russo',c:2400,d:'De tempos em tempos, todos congelam',f:s=>{s.stop=1;s.slow=.7}}],
        [{n:'Faixa Preta',c:320,d:'2 morcegos por vez',f:s=>{s.bats=2}},
         {n:'Vodca Gelada',c:850,d:'Quem está na área é 30% mais convencível, morcegos mais rápidos',f:s=>{s.vuln=1.3;s.batRate*=.75}},
         {n:'Passeio a Cavalo',c:2500,d:'4 morcegos por vez, +6 de argumento em cada um',f:s=>{s.bats=4;s.batDmg+=6}}]]},
  xi:{nome:'Xi Jinping',cost:500,atk:'shot',desc:'Dispara caixas de produtos e invoca robôs que marcham pela avenida para ajudar.',
    base:{range:175,rate:.45,dmg:1,pierce:1,spd:600,type:'papel',shot:'caixa',robots:1,sumRate:4.5,robotLife:9,robotDmg:1},
    up:[[{n:'Linha de Montagem',c:320,d:'25% mais rápido e robôs saem mais cedo',f:s=>{s.rate*=.75;s.sumRate*=.8}},
         {n:'Porto de Xangai',c:950,d:'Atinge 3 alvos de uma vez, 2 robôs por vez',f:s=>{s.multi=3;s.robots=2}},
         {n:'Fábrica do Mundo',c:3300,d:'+4 de argumento, 3 robôs bem mais fortes',f:s=>{s.dmg+=4;s.rate*=.6;s.robots=3;s.robotDmg+=2}}],
        [{n:'Câmeras em Toda Parte',c:350,d:'Ele e os robôs detectam Isentões',f:s=>{s.detect=1}},
         {n:'Rota da Seda',c:850,d:'+60 de alcance, robôs duram mais',f:s=>{s.range+=60;s.robotLife+=5}},
         {n:'Grande Muralha',c:3000,d:'+R$ 500 por rodada, +2 de argumento',f:s=>{s.income=500;s.dmg+=2}}]]},
  maduro:{nome:'Nicolás Maduro',cost:460,atk:'shot',desc:'Joga notas de bolívar. Quanto mais notas o mesmo inimigo leva, maior fica o dano: é a hiperinflação.',
    base:{range:170,rate:.8,dmg:2,pierce:2,spd:540,type:'papel',shot:'bolivar',inflate:.25,inflCap:4},
    up:[[{n:'Nota de Mil Bolívares',c:280,d:'+1 de argumento',f:s=>{s.dmg+=1}},
         {n:'Nota de Um Milhão',c:900,d:'A inflação sobe o dobro e vai até 6 vezes',f:s=>{s.inflate=.5;s.inflCap=6}},
         {n:'Hiperinflação',c:3200,d:'A inflação vai até 12 vezes, 40% mais rápido',f:s=>{s.inflCap=12;s.rate*=.6}}],
        [{n:'Passarinho',c:350,d:'Um passarinho avisa onde estão os Isentões',f:s=>{s.detect=1}},
         {n:'Domingos na TV',c:850,d:'30% mais rápido',f:s=>{s.rate*=.7}},
         {n:'Motorista de Ônibus',c:3000,d:'+6 de argumento, atravessa +3',f:s=>{s.dmg+=6;s.pierce+=3}}]]},
  artista:{nome:'Artistas',cost:520,atk:'fire',desc:'Fazem surgir árvores pegando fogo na avenida, que atingem todo mundo por perto enquanto queimam, e queimam ainda mais veículos e chefões.',
    /* dmg 1,4 e 1,8× contra veículos e chefões (2026-11-12): com o limite de 2, os Artistas causavam metade do dano do Flávio
       no fim do jogo, e a esquerda perdia muito mais que a direita */
    base:{range:175,rate:2.2,dmg:1.4,type:'fogo',fireLife:4,fireR:58,count:1,grande:1.8},
    up:[[{n:'Show Beneficente',c:300,d:'As árvores queimam por mais tempo',f:s=>{s.fireLife+=2}},
         {n:'Manifesto Assinado',c:900,d:'+2 de argumento, 25% mais rápido',f:s=>{s.dmg+=2;s.rate*=.75}},
         {n:'Festival na Floresta',c:3200,d:'+4 de argumento, fogo bem maior',f:s=>{s.dmg+=4;s.fireR+=18}}],
        [{n:'Hashtag',c:350,d:'Detecta Isentões',f:s=>{s.detect=1}},
         {n:'Campanha Global',c:900,d:'2 árvores por vez',f:s=>{s.count=2}},
         {n:'Lei Rouanet',c:3000,d:'+R$ 500 por rodada, +2 de argumento',f:s=>{s.income=500;s.dmg+=2}}]]},
  che:{nome:'Che Guevara',cost:490,atk:'shot',desc:'Lança camisetas com a própria cara em todas as direções.',
    base:{range:165,rate:1,dmg:2,pierce:2,spd:480,type:'papel',shot:'camiseta',radial:8},
    up:[[{n:'Boina com Estrela',c:300,d:'+40 de alcance',f:s=>{s.range+=40}},
         {n:'Sierra Maestra',c:950,d:'12 camisetas por vez, +2 de argumento',f:s=>{s.radial=12;s.dmg+=2}},
         {n:'Hasta la Victoria',c:3300,d:'+6 de argumento, duas vezes mais rápido',f:s=>{s.dmg+=6;s.rate*=.5}}],
        [{n:'Diários de Motocicleta',c:350,d:'Detecta Isentões',f:s=>{s.detect=1}},
         {n:'Foco Revolucionário',c:900,d:'Cada camiseta atravessa +3',f:s=>{s.pierce+=3}},
         {n:'Ícone Pop',c:3000,d:'A venda de camisetas rende +R$ 500 por rodada, +3 de argumento',f:s=>{s.income=500;s.dmg+=3}}]]},
  lula:{nome:'Lula',cost:900,atk:'shot',only:1,desc:'Só existe um. Arremessa picanha e cervejinha, que deixa o pessoal mais lento, e libera o Faz o L!',
    base:{range:190,rate:.75,dmg:3,pierce:1,spd:470,type:'comida',alt:['picanha','cerveja'],splash:46,abilCd:45,abilDmg:20},
    up:[[{n:'Companheirada',c:500,d:'+40 de alcance, área maior',f:s=>{s.range+=40;s.splash+=14}},
         {n:'Churrasco do Trabalhador',c:1500,d:'+5 de argumento',f:s=>{s.dmg+=5}},
         {n:'Picanha na Mesa',c:4200,d:'+12 de argumento, 40% mais rápido, detecta Isentões',f:s=>{s.dmg+=12;s.rate*=.6;s.detect=1}}],
        [{n:'Picanha pra Todos',c:600,d:'+R$ 100 e +1 de apoio por rodada',f:s=>{s.income=100;s.regen=1}},
         {n:'Programa Social',c:1800,d:'+R$ 300 por rodada',f:s=>{s.income+=300}},
         {n:'Terceiro Mandato',c:5000,d:'Faz o L! muito mais forte e com recarga menor',f:s=>{s.abilCd=24;s.abilDmg=90;s.detect=1}}]]},
});
/* personagens genéricos que dão par a quem estava sozinho: mesma mecânica do original, com nome e visual próprios */
TOWERS.churchill=reskin('putin','Winston Churchill','A fumaça do charuto deixa todo mundo por perto mais devagar, e pequenos aviões perseguem quem passa.',null,
  [[['Charuto Maior'],['Névoa de Londres'],['Nunca Se Render','De tempos em tempos, todos param no lugar']],[['Dois Aviões','2 aviões por vez'],['Chá das Cinco','Quem está na área é 30% mais convencível, aviões mais rápidos'],['Esquadrão Inteiro','4 aviões por vez, +6 de argumento em cada um']]]);
TOWERS.churchill.base.batShot='spitfire';
TOWERS.thatcher=reskin('churras','Margaret Thatcher','O olhar da Dama de Ferro faz todo mundo por perto andar mais devagar.',null,
  [[['Bolsa de Mão'],['Dama de Ferro'],['Sem Alternativa','De tempos em tempos, todos param no lugar']],[['Sermão no Parlamento'],['Privatização'],['Revolução Conservadora']]]);
TOWERS.friedman=reskin('maduro','Milton Friedman','Joga moedas. Quanto mais moedas o mesmo adversário leva, maior fica o dano: são os juros compostos.','moedaF',
  [[['Livre Mercado'],['Juros Compostos','Os juros sobem o dobro e vão até 6 vezes'],['Prêmio Nobel','Os juros vão até 12 vezes, 40% mais rápido']],[['Mão Invisível','A mão invisível aponta onde estão os Isentões'],['Escola de Chicago'],['Não Existe Almoço Grátis']]]);
TOWERS.reagan=reskin('che','Ronald Reagan','Lança jujubas em todas as direções.','jujuba',
  [[['Cavalo de Hollywood'],['Pacote Econômico','12 jujubas por vez, +2 de argumento'],['Guerra nas Estrelas']],[['Assessor Atento'],['Jujuba Dura','Cada jujuba atravessa +3'],['Reeleição','O saco de jujubas rende +R$ 500 por rodada, +3 de argumento']]]);
TOWERS.clacerda=reskin('mussolini','Carlos Lacerda','Discursa sem parar e cansa todo mundo ao redor de uma vez. Quem está de fone não ouve.',null,
  [[['Tribuna da Imprensa'],['Microfone na Câmara'],['Oratória do Corvo']],[['Fala Mais Rápido'],['Governador da Guanabara'],['Discurso Histórico']]]);
TOWERS.nixon=reskin('xuxa','Richard Nixon','Joga fitas gravadas e, assim que entra, traz o cachorro Checkers, que fica sempre ao lado e morde quem chega perto.','fita',
  [[['Fita Regravada'],['Gabinete Oval','25% mais rápido, atravessa +2, Checkers morde +3'],['Reeleição Esmagadora','3 fitas por vez, +8 de argumento, Checkers morde +8']],[['Assessores'],['Debate na TV'],['Viagem à China']]]);
Object.assign(TOWERS.nixon.base,{petNome:'Checkers',petOr:'#2a2622',petEsc:'#17181d',petAm:'#f4f1e8'});
TOWERS.gaulle=reskin('gilmar','Charles de Gaulle','Responde "NON!", e quem recebe volta um pedaço do caminho.','naoF',
  [[['Non Definitivo'],['França Livre'],['Grande Nação','3 "NON!" por vez, +8 de argumento']],[['Quepe Alto'],['Quinta República'],['Palavra do General']]]);
TOWERS.zapata=reskin('agro','Emiliano Zapata','Quando alguém chega perto, solta um boi do campo que corre pela avenida no sentido contrário.',null,
  [[['Terra Comunal'],['Plano de Ayala'],['Tierra y Libertad']],[['Corneta do Campo'],['Vale de Morelos'],['Exército do Sul']]]);
TOWERS.owen=reskin('empresarios','Robert Owen','Não ataca. A cooperativa guarda dinheiro no cofre a cada rodada, com juros sobre o que ficar lá. Clique nela para sacar.',null,
  [[['New Lanark'],['Pioneiros de Rochdale'],['Banco dos Trabalhadores']],[['Cofre Maior'],['Débito Automático'],['Aldeia Cooperativa']]]);
TOWERS.owen.building='coop';
TOWERS.prestes=reskin('miliciano','Luís Carlos Prestes','Comanda um tanque que dispara de longe, devagar, com explosão em área. Evoluindo, arrecada com a comunidade e rende verba.',null,
  [[['Munição Pesada'],['Coluna em Marcha'],['Canhão Duplo']],[['Mutirão Popular'],['Vaquinha'],['Cavaleiro da Esperança']]]);
TOWERS.prestes.tank=2;
TOWERS.arouca=reskin('caiado','Sérgio Arouca','Aplica vacinas que atravessam a fila e recupera apoio popular a cada rodada.','vacinaM',
  [[['Dose Extra'],['Campanha de Vacinação'],['Mutirão de Saúde','3 vacinas por vez, +8 de argumento']],[['Posto de Saúde'],['Reforma Sanitária'],['Pai do SUS']]]);
TOWERS.rosa=reskin('eduarda','Rosa Luxemburgo','Dispara um leque de panfletos que cobre a avenida na frente.','panfleto',
  [[['Panfleto Novo'],['Liga Espartaquista','7 panfletos por vez, 20% mais rápido'],['Folheto de Junius','+6 de argumento, cada panfleto atravessa +2']],[['Megafone'],['Imprensa Operária','Detecta Isentões, 15% mais rápido'],['Greve de Massas']]]);
TOWERS.goldman=reskin('manga','Emma Goldman','Joga pandeiros e, de tempos em tempos, faz todo mundo por perto parar para dançar: revolução sem dança não vale.','pandeiroM',
  [[['Pandeiro Novo'],['Mother Earth'],['Minha Revolução','3 pandeiros por vez, +8 de argumento']],[['Dança Livre','A dança dura mais'],['Viral nas Ruas','Dança mais frequente, detecta Isentões'],['Festa Anarquista','+R$ 400 por rodada, +3 de argumento, dança ainda mais longa']]]);
TOWERS.helder=reskin('mendonca','Dom Hélder Câmara','Alterna Bíblias e pedidos de vista. O pedido de vista deixa o pessoal mais lento.',null,
  [[['Comunidades de Base'],['Arcebispo de Olinda'],['Romaria Popular']],[['Pastoral'],['Conferência de Medellín'],['Dom da Paz']]]);
/* heróis (2026-11-13): Lula, Bolsonaro e todo personagem que é ou foi presidente de um país.
   Só cabe 1 herói em campo por vez (de qualquer tipo). Herói ganha experiência, sobe de nível e tem um poder próprio (HEROI_PODER).
   Os presidentes custam HEROI_CUSTO vezes mais na partida, mas sobem de nível e continuam com o especial deles.
   Na loja, ficam numa aba própria (Palácio), mais cara: veja PRECO_HEROI */
const PRESIDENTES=['dilma','vampirao','putin','xi','maduro','abbas','trump','milei','bukele','reagan','nixon','gaulle'];
const HEROI_CUSTO=1.4;
/* poder próprio de cada herói (2026-11-17, no lugar do Faz o L! e do Selva!, que eram iguais para todos os heróis do lado).
   Fica no botão ★ quando o herói chega ao nível máximo (10; antes de 2026-11-17 era desde a entrada em campo). Todos têm uma parte de dano parecida com a do poder antigo (20 em todo mundo,
   chefões 5×) e um efeito que é só dele, sem repetir os especiais do próprio herói. No nível 10 ele já vem com os 3 marcos
   antigos (níveis 3, 7 e 10): dano ×1,3³ e recarga 9 s menor (veja fazOL e calcStats). [nome, descrição, efeitos] */
const HEROI_PODER={
  lula:['Discurso do Metalúrgico','Atinge toda a avenida com 20 de argumento (chefões, 5 vezes) e recupera 5 de apoio.',[{k:'atingeTodos',dmg:20},{k:'vida',v:5}]],
  dilma:['Saudação à Mandioca','Mandiocas caem em 10 adversários (40 de argumento cada) e a avenida inteira anda devagar por 4 s.',[{k:'chuva',n:10,dmg:40},{k:'lento',area:'tela',t:4}]],
  putin:['Corte do Gás','Todos na avenida perdem 15% do argumento que ainda têm (chefões, bem menos) e levam mais 12.',[{k:'corta',area:'tela',pct:.15},{k:'atingeTodos',dmg:12}]],
  xi:['Rota da Seda','Rende R$ 15 por adversário na avenida e atinge todos com 15 de argumento.',[{k:'verbaInim',por:15},{k:'atingeTodos',dmg:15}]],
  maduro:['Decreto de Emergência','A marcha para de chegar por 6 s e todos na avenida levam 20 de argumento.',[{k:'cessar',t:6},{k:'atingeTodos',dmg:20}]],
  abbas:['Assento na ONU','Por 8 s, todos os seus personagens atacam 30% mais rápido, e a avenida inteira leva 15.',[{k:'buffTodos',vel:1.3,t:8},{k:'atingeTodos',dmg:15}]],
  vampirao:['Ponte para o Futuro','Os 8 adversários comuns mais adiantados voltam um bom pedaço da avenida, e todos levam 15.',[{k:'volta',n:8,d:300},{k:'atingeTodos',dmg:15}]],
  bolsonaro:['Motociata','Uma motociata passa pela avenida do fim para o começo: 6 vezes o argumento do Bolsonaro em cada um e um empurrão para trás.',[{k:'onda',x:6,v:650,shot:'onda',knock:50}]],
  trump:['Comício Gigante','Por 6 s, a avenida inteira fica 40% mais fácil de convencer, e todos levam 15.',[{k:'vuln',area:'tela',x:1.4,t:6},{k:'atingeTodos',dmg:15}]],
  milei:['Afuera!','Empurra a marcha inteira para trás (chefões quase não saem do lugar), e todos levam 15.',[{k:'empurra',area:'tela',d:200},{k:'atingeTodos',dmg:15}]],
  bukele:['Regime de Exceção','A avenida inteira fica presa por 2,5 s (chefões, bem menos), e todos levam 12.',[{k:'parar',area:'tela',t:2.5,m:'jail'},{k:'atingeTodos',dmg:12}]],
  reagan:['Reaganomics','Rende 10% da sua verba (até R$ 600), e todos na avenida levam 18.',[{k:'juros',x:.1,max:600},{k:'atingeTodos',dmg:18}]],
  nixon:['Watergate','A avenida inteira anda devagar por 5 s, o mais adiantado fica 2,5 vezes mais fácil de convencer, e todos levam 12.',[{k:'lento',area:'tela',t:5},{k:'focoFrente',x:2.5,t:5},{k:'atingeTodos',dmg:12}]],
  gaulle:['Libération','Por 8 s, todos os seus personagens alcançam 30% mais longe, e a avenida inteira leva 15.',[{k:'buffTodos',alc:1.3,t:8},{k:'atingeTodos',dmg:15}]],
};
const nomePoderHeroi=k=>(HEROI_PODER[k]||['Poder do herói'])[0];
for(const k of PRESIDENTES){const T=TOWERS[k];if(!T)continue;
  T.only=1;T.presidente=1;T.cost=Math.round(T.cost*HEROI_CUSTO/10)*10;
  /* o poder próprio precisa de recarga; reskins dividem o base, então cada um ganha uma cópia */
  T.base={abilCd:45,...T.base};
  T.desc+=' Herói: sobe de nível e tem o poder '+nomePoderHeroi(k)+'.'}
/* "Só existe um" não vale mais só para eles: agora é 1 herói por vez, de qualquer tipo */
for(const k of ['lula','bolsonaro'])TOWERS[k].desc=TOWERS[k].desc.replace('Só existe um. ','Herói do lado. ').replace(/e libera o (Faz o L!|Selva!)/,'e tem o poder '+nomePoderHeroi(k)+'.');
/* a última evolução de cada um deixava o Faz o L!/Selva! mais forte: agora deixa o poder próprio mais forte */
for(const k of ['lula','bolsonaro']){const u=TOWERS[k].up[1][2];u.d=nomePoderHeroi(k)+' muito mais forte e com recarga menor, detecta Isentões';u.f=s=>{s.abilCd=24;s.abilPot=2;s.detect=1}}
/* heróis exclusivos (2026-11-17): só vêm nos pacotes pagos com dinheiro (Loja › Pacotes), nunca com F$.
   Cada um é a versão "especial" de um personagem que já existe: mesma mecânica de base, visual e poder próprios.
   exclusivo:1 tira da loja de F$, do desafio do dia e da medalha "Elenco completo"; o pacote entrega direto em PROG.donos */
const EXCLUSIVOS={
  br:[
    ['eneaspres','eneas','Enéas Presidente','Enéas com a faixa presidencial: grita o próprio nome e, de tempos em tempos, solta a bomba atômica.',
      [[['Meu Nome é Enéas'],['Ogiva Presidencial'],['Programa Nuclear Nacional']],[['Prona no Poder'],['Barba Imponente'],['Cadeia Nacional de TV']]],
      ['Meu Nome é Enéas!','Por 6 s, a avenida inteira fica 30% mais fácil de convencer, e todos levam 22.',[{k:'vuln',area:'tela',x:1.3,t:6},{k:'atingeTodos',dmg:22}]],
      /* Enéas Presidente: de faixa presidencial e sem a barba (pedido do jogador, 2026-11-17) */
      L=>({...L,sash:1,beard:null,beardC:null})],
    ['flaviohip','flavio','Flávio Hipotético','A versão hipotética do Flávio: projetos de lei em área que talvez existam, talvez não.',
      [[['Hipótese Inicial'],['Cenário Provável'],['Teoria Confirmada']],[['Rachadinha Hipotética'],['Mansão Imaginária'],['Senador do Futuro']]],
      ['Hipótese Comprovada','Os 10 adversários comuns mais adiantados voltam um bom pedaço da avenida, e todos levam 16.',[{k:'volta',n:10,d:260},{k:'atingeTodos',dmg:16}]],
      L=>({...L,interroga:1,sash:1})],
    ['bolsomito','bolsonaro','BolsoMito','O Bolsonaro lendário, de capa verde e amarela: pão e leite condensado que deixam o pessoal mais lento.',
      [[['Cercadinho de Ouro'],['Live Lendária'],['Mito Supremo']],[['Povo na Rua'],['Auxílio Turbinado'],['Imbrochável']]],
      ['Mito Total','Uma motociata lendária atravessa a avenida: 7 vezes o argumento dele em cada um, um empurrão para trás e +5 de apoio.',[{k:'onda',x:7,v:650,shot:'onda',knock:60},{k:'vida',v:5}]],
      L=>({...L,sash:1,capa:'#1f8a4d',capaB:'#f6cf1d',brilho:'#f6cf1d'})],
  ],
  pt:[
    ['lularobo','lula','Lula Robô','O Lula do futuro, de metal: picanha e cervejinha disparadas por um braço mecânico.',
      [[['Sensores Calibrados'],['Churrasqueira a Laser'],['Picanha Quântica']],[['Bateria Solar'],['Programa Social 2.0'],['Quarto Mandato']]],
      ['Protocolo L-3000','Por 8 s, todos os seus personagens atacam 35% mais rápido, e a avenida inteira leva 18.',[{k:'buffTodos',vel:1.35,t:8},{k:'atingeTodos',dmg:18}]],
      L=>({...L,skin:'#aebccb',hair:'#7d8b99',beardC:'#9aa8b6',browC:'#5d6a78',antena:1,brilho:'#7fd4ff'})],
    ['dilmapoderosa','dilma','Poderosa Dilma','Dilma de capa e faixa: rajadas de vento que empurram a fila de volta pela avenida.',
      [[['Vento Forte'],['Tempestade'],['Furacão Presidencial']],[['Mira Certeira'],['Óculos de Sol'],['Mandioca Dourada']]],
      ['Mandioca Suprema','Mandiocas caem em 14 adversários (45 de argumento cada) e a avenida inteira anda devagar por 5 s.',[{k:'chuva',n:14,dmg:45},{k:'lento',area:'tela',t:5}]],
      L=>({...L,capa:'#c8102e',capaB:'#f2b705',brilho:'#ff6a7a',sashTri:['#c8102e','#f2b705','#c8102e'],sashMark:'#f2b705'})],
    ['erika','eduarda','Erika Hilton','Deputada de discurso firme: dispara um leque de projetos de lei que cobre a avenida na frente dela.',
      [[['Projeto Novo'],['Tribuna da Câmara','7 projetos por vez, 20% mais rápido'],['Recorde de Votos','+6 de argumento, cada projeto atravessa +2']],[['Frente Parlamentar'],['Comissão de Direitos','Detecta Isentões, 15% mais rápido'],['Mandato Histórico']]],
      ['Voto Recorde','Todos na avenida perdem 15% do argumento que ainda têm, ficam 30% mais fáceis de convencer por 5 s e levam 12.',[{k:'corta',area:'tela',pct:.15},{k:'vuln',area:'tela',x:1.3,t:5},{k:'atingeTodos',dmg:12}]],
      L=>({...L,skin:'#7a4a30',hair:'#140e0b',browC:'#140e0b',shirt:'#6b2fb3',sleeve:'#6b2fb3',pants:'#2a1f3a',lip:'#8a3048',florais:0,glasses:0,hold:'mic',style:'ani'})],
  ],
};
const EXC_ORDEM=[];
for(const[lado,lista]of Object.entries(EXCLUSIVOS))for(const[k,src,nome,desc,nomes,poder,visual]of lista){
  const T=reskin(src,nome,desc,k==='erika'?'panfleto':null,nomes);
  /* quem não era herói (Enéas, Flávio, base da Erika) ganha o custo de herói, como os presidentes */
  T.only=1;T.exclusivo=1;delete T.presidente;if(!TOWERS[src].only)T.cost=Math.round(T.cost*HEROI_CUSTO/10)*10;
  T.base={abilCd:45,...T.base};T.desc=desc+' Herói exclusivo: sobe de nível e tem o poder '+poder[0]+'.';
  TOWERS[k]=T;HEROI_PODER[k]=poder;LOOKS[k]=visual({...LOOKS[src]});VIS[k]=VIS[src];
  T.fonte=src;EXC_ORDEM.push([lado,k]);
}
const ehHeroi=k=>!!(TOWERS[k]&&TOWERS[k].only);
const heroiEmCampo=()=>S?S.towers.find(t=>t.T.only):null;
const SIDES={
  pt:{nome:'Petistas defendem',pitch:'Proteja o Palácio do Planalto da marcha verde e amarela.',goal:'o Palácio do Planalto',abil:'Faz o L!',mark:'L',hero:'Lula',stun:'vendo vídeo',stunE:'nhac',frases:FRASES,
    order:['militante','dilma','churras','haddad','janones','marx','lenin','stalin','sindicato','janja','xandao','dino','fux','fachin','zanin','carmen','gilmar','toffoli','lula','che','mussolini','putin','xi','maduro','abbas','artista','marina','pabllo','anitta','xuxa','datena','renan','kim','zapata','owen','prestes','arouca','rosa','goldman','helder','vampirao'],
    foes:{camisa:'camisa',bandeira:'bandeira',tio:'tio',isentao:'isentao',fone:'fone',moto:'motoca',capacete:'capacete',teimoso:'teimoso',caminhao:'caminhao',caravana:'caravana'},
    boss:{10:['pavanato','Pavanato'],20:['nikolas','Nikolas'],30:['flavio','Flávio'],40:['bolsonaro','Bolsonaro']}},
  br:{nome:'Bolsonaristas defendem',pitch:'Proteja o ato na Paulista da marcha vermelha.',goal:'o ato na Paulista',abil:'Selva!',mark:'22',hero:'Bolsonaro',stun:'lendo Marx',stunE:'assistindo',frases:FRASES_BR,
    order:['patriota','nikolas','agro','pavanato','flavio','caminhoneiro','empresario','empresarios','miliciano','veio','bolsonaro','trump','milei','bukele','musk','marcal','datena','cury','zema','caiado','eduarda','eneas','manga','ana','neymar','gusttavo','ratinho','renan','kim','kelmon','mendonca','nunes','fux','churchill','thatcher','friedman','reagan','clacerda','nixon','gaulle','vampirao'],
    foes:{camisa:'pcamisa',bandeira:'pbandeira',tio:'ptio',isentao:'isentao',fone:'pfone',moto:'pmoto',capacete:'pcapacete',teimoso:'pteimoso',caminhao:'pcaminhao',caravana:'pcaravana'},
    boss:{10:['janones','Janones'],20:['marx','Marx'],30:['dilma','Dilma'],40:['lula','Lula']}},
};
/* heróis exclusivos entram no fim da lista do lado (só aparecem na partida para quem tem) */
for(const[lado,k]of EXC_ORDEM)SIDES[lado].order.push(k);
/* configuração do lado, com os chefões da região do mapa atual (guardada até mudar o lado ou o mapa) */
let cfgK='',cfgO=null;
const cfg=()=>{const k=S.side+'|'+S.uf;if(k!==cfgK){cfgK=k;cfgO={...SIDES[S.side],boss:chefesDe(S.side,S.uf)}}return cfgO};
const LOOKOF=k=>LOOKS[k];
const MODES=[['first','Primeiro'],['last','Último'],['strong','Mais forte'],['close','Mais perto']];
/* testado com o robô (testes/robo.js): o Difícil antes acabava na rodada 7-10 por falta de verba no começo; hp acima de 1 cresce aos poucos (vidaDif) */
/* verba inicial baixa (2026-11-17, pedido do jogador: 'uns 300'): dá para 1 personagem; o resto vem das rodadas */
const DIFFS={facil:{nome:'Fácil',lives:200,cash:350,cost:.85,hp:.72},normal:{nome:'Normal',lives:150,cash:300,cost:.94,hp:1.1},dificil:{nome:'Difícil',lives:120,cash:300,cost:1.08,hp:1.4}};
/* Difícil com hp 1.4 (2026-11-11): o fim de jogo agora cresce sozinho (veja tardio), então o extra do Difícil foi de 1.6 para 1.4.
   Com 1.6 mais o fim de jogo novo, o robô vencia só 33% a 59%. */

/* ---------- estado ---------- */
let S=null,uid=0;
function newGame(diff,menu,side,uf){
  const d=DIFFS[diff];
  side=side||(S?S.side:'pt');uf=uf||(S?S.uf:'DF');
  const rebuilt=!S||S.side!==side,mudouMapa=!S||S.uf!==uf;
  setMap(uf);
  S={d,diff,side,uf,lives:d.lives,cash:d.cash,round:0,inRound:false,queue:[],spawnT:0,hpMul:1,enemies:[],towers:[],shots:[],allies:[],walls:[],fires:[],nukes:[],fx:[],texts:[],time:0,over:false,menu:!!menu,livre:false,perdeu:false,conv:0,ganho:0,limpas:0,vidaIni:0,
     speed:S?S.speed:1,auto:S?S.auto:false,sel:null,placing:null,abilCd:0,banner:null,bannerT:0,shake:0,flash:0,hover:{x:-99,y:-99,on:false}};
  S.expert=MAPAS[uf].tier===4;
  document.body.dataset.side=side;
  buildShop();
  if((rebuilt||mudouMapa)&&BG)paintBg();
  renderPanel();syncHud();
}
/* com um poder de desconto ativo, tudo sai mais barato por alguns segundos */
const price=c=>Math.round(c*S.d.cost*(S.descT>0?S.descX:1)/5)*5;

/* fim de jogo: da rodada 25 em diante a marcha cresce mais rápido, porque a militância do jogador (verba, evoluções no máximo,
   especiais) cresce muito mais do que antes. Sem isso, nas rodadas 31 a 40 a marcha mal passava de 20% da avenida.
   O aumento é forte entre as rodadas 25 e TETO_TARDIO e depois fica estável: crescendo até a 40, as rodadas 31 a 35 continuavam fáceis
   e só a 40 ficava impossível.
   INC_TARDIO: argumento a mais por rodada; DENS_TARDIO: gente a mais por rodada; EXP_CHEFE: quanto disso vale para os chefões. */
/* valores testados com o robô (2026-11-11), em todos os 27 mapas:
   - a marcha comum leva +30% de argumento por rodada da 25 à 36, vem 6% mais cheia e 1,5% mais rápida por rodada;
   - veículos (carro de som, caravana) crescem 75% disso; chefões, bem pouco (com a curva inteira, viravam parede);
   - Normal: o robô vence 54/54, mas a marcha das rodadas 26-40 chega ~50% mais longe e já tira apoio;
   - Difícil (hp 1.4): o robô vence 72% (esquerda 23/27, direita 16/27 — a direita sofre mais com as caravanas).
   Aumentar só o argumento quase não muda nada: os ataques em área convencem a marcha comum logo no começo da avenida.
   O que aperta o fim de jogo são os alvos grandes (veículos e chefões) e a velocidade. */
/* INC_TARDIO .15 (era .3): com o limite de 2 de cada personagem, as caravanas e os carros de som do fim passavam,
   e só com os gratuitos o robô venceu 3 (esquerda) e 9 (direita) de 27 no Difícil (2026-11-12) */
/* INC_TARDIO .24 (2026-11-17): sem o limite de cópias, com .15 o robô vencia 72% no Difícil, várias vezes com o apoio no máximo;
   com .3 e chefão final de 6.500, 28%; com .22 e 5.000, 50%; com .26 e 5.800, 17%. O alvo aceito é ~37%
   (quem joga de verdade joga melhor que o robô). Ficou .24 com chefão final de 5.400 */
var INC_TARDIO=.24,DENS_TARDIO=.06,TETO_TARDIO=36,EXP_CHEFE=.15,VEL_TARDIO=.015,EXP_VEIC=.75;
function tardio(n){return n<=24?1:(1+(Math.min(n,TETO_TARDIO)-24)*INC_TARDIO)*(n>40?1+(n-40)*.08:1)}
/* a marcha também anda mais rápido no fim (VEL_TARDIO por rodada depois da 24, até o teto) */
const velTardio=n=>1+Math.max(0,Math.min(n,TETO_TARDIO)-24)*VEL_TARDIO;
function buildRound(n){
  const q=[];let t=0;
  const dens=n<=25?1:1+(Math.min(n,TETO_TARDIO)-25)*DENS_TARDIO;
  const add=(type,count,gap)=>{
    count=Math.round(count*dens);if(count<=0)return;
    for(let i=0;i<count;i++)q.push({t:t+i*gap,type});
    t+=count*gap*.55+.6;
  };
  /* no modo livre o chefão final volta a cada 10 rodadas, cada vez mais resistente */
  const R=cfg().foes,boss=(cfg().boss[n]||(n>40&&n%10===0?cfg().boss[40]:[]))[0],f=boss?.55:1;
  if(n<=24)add(R.camisa,(10+n*2.4)*f,Math.max(.16,.72-n*.03));
  if(n>=3)add(R.bandeira,Math.min(60,(n-2)*2.2)*f,Math.max(.16,.6-n*.02));
  /* o Tio do Zap cura os outros: em grupo grande era quem mais derrubava as partidas no Difícil */
  if(n>=6)add(R.tio,(n-5)*.85*f,.75);
  if(n>=8&&n%2===0)add(R.isentao,n*.7*f,.5);
  if(n>=11)add(R.fone,(n-9)*1.1*f,.55);
  if(n>=14)add(R.moto,(n-12)*1.1*f,.4);
  if(n>=16)add(R.capacete,(n-14)*.8*f,.6);
  if(n>=19&&n%2===1)add(R.teimoso,(n-17)*.6*f,.8);
  if(n>=25||(n>=13&&n%3===1))add(R.caminhao,Math.floor((n-9)/4),2.2);
  if(n>=28&&n%3===0)add(R.caravana,Math.floor((n-24)/4),5);
  if(boss)q.push({t:t+1,type:boss});
  q.sort((a,b)=>a.t-b.t);
  return q;
}
/* quanto de vida a mais a dificuldade dá aos adversários nesta rodada (vale também para os chefões) */
function vidaDif(){return S.d.hp>1?1+(S.d.hp-1)*Math.min(1,(Math.max(1,S.round)-1)/20):S.d.hp}
/* Difícil a partir da rodada 10: a marcha comum e os veículos ganham APERTO_DIF de vida a mais por rodada (chefões não).
   Quem jogou no Difícil achou fácil da rodada 10 em diante (2026-11-12); o robô, que joga só com os gratuitos, perde mais que gente */
let APERTO_DIF=.03;
const apertoDif=n=>S&&S.diff==='dificil'&&!S.livre?1+Math.max(0,n-10)*APERTO_DIF:1;
/* desafio do dia: a partir do momento em que o jogador para de perder apoio, a marcha comum fica PRESSAO_PASSO mais forte
   a cada rodada limpa (depois de PRESSAO_SEQ seguidas, contando da rodada PRESSAO_DESDE). Quando volta a perder, o aperto cai
   para PRESSAO_ALIVIO do que era (ao quadrado se perdeu muito), para a partida ficar no limite em vez de virar passeio.
   Quem jogou achou fácil depois de estabilizar (2026-11-13). Com o robô, aliviar só um passo por rodada perdida não dava tempo:
   ele passava 30 rodadas sem perder e desabava de uma vez no fim */
let PRESSAO_PASSO=.04,PRESSAO_MAX=.8,PRESSAO_SEQ=2,PRESSAO_DESDE=5,PRESSAO_ALIVIO=.5,PRESSAO_VEIC=.3;
/* veículos (caravana, carro de som) levam só PRESSAO_VEIC do aperto: com o aperto inteiro, uma única rodada de caravanas
   tirava mais de 100 de apoio de quem vinha sem perder nada; chefões não levam */
const pressaoDe=T=>S&&S.modo==='desafio'&&!S.livre&&S.pressao?1+S.pressao*(T.veh?PRESSAO_VEIC:1):1;
/* o aperto também acelera a marcha (menos os chefões): só vida a mais quase não pesa contra ataque em área.
   Com PRESSAO_VEL .3, o aperto máximo deixa a marcha 24% mais rápida */
let PRESSAO_VEL=.3;
const velPressao=()=>S.modo==='desafio'&&!S.livre&&S.pressao?1+S.pressao*PRESSAO_VEL:1;
function ajustaPressao(){
  if(S.modo!=='desafio'||S.livre||S.round<PRESSAO_DESDE)return;
  const perdeu=(S.vidaIni||S.lives)-S.lives,p0=S.pressao||0;
  if(perdeu<=0){S.seqLimpa=(S.seqLimpa||0)+1;if(S.seqLimpa>=PRESSAO_SEQ)S.pressao=Math.min(PRESSAO_MAX,p0+PRESSAO_PASSO)}
  else{S.seqLimpa=0;S.pressao=p0*(perdeu>S.d.lives*.08?PRESSAO_ALIVIO*PRESSAO_ALIVIO:PRESSAO_ALIVIO)}
  if((S.pressao||0)>p0+1e-9)float(W/2,92,'A marcha endureceu: +'+Math.round(S.pressao*100)+'% de argumento','#ffb38a');
}
function spawn(type,d,hpMul,via){
  /* chefões crescem bem menos que a marcha no fim (EXP_CHEFE): com o mesmo fator, o chefão da rodada 40 ficava imbatível */
  /* veículos (carro de som, caravana) crescem só metade da curva do fim: um alvo único e enorme não fica mais fácil com
     ataques em área, e com a curva inteira a caravana da rodada 36 sozinha derrubava a partida */
  const T=ENEMY[type],hp=T.boss?T.hp*vidaDif()*Math.pow(tardio(S.round),EXP_CHEFE)*(S.livre?1+Math.max(0,S.round-40)*.15:1):T.hp*hpMul/(T.veh?Math.pow(tardio(S.round),1-EXP_VEIC):1)*pressaoDe(T);
  /* com duas avenidas, a marcha se reveza entre elas; quem nasce de outro adversário fica na avenida dele */
  if(via===undefined){let abertas=viasAtivas().filter(v=>v!==S.viaFechada);if(!abertas.length)abertas=[0];via=abertas[(S.viaN=(S.viaN||0)+1)%abertas.length]}
  const e={id:++uid,type,T,d,via,hp,max:hp,hpMul,slowVal:0,slowT:0,stun:0,vuln:1,shield:0,boost:0,cd:{},ph:rand(0,6.28),off:T.veh==='truck'||T.veh==='caravana'||T.boss?0:rand(-9,9),dead:false,face:1,noted:0};
  S.enemies.push(e);
  if(T.camo)dica('isentao','Chegou um Isentão: ele é invisível para quem não detecta Isentões. Procure evoluções que dizem "detecta Isentões".');
  else if(T.armor)dica('blindado','Chegou um blindado: ataque fraco não passa. Evolua quem tira mais argumento por acerto, ou use fogo.');
  if(T.boss&&!S.menu){
    /* o cartão já mostra o nome: o aviso só vai para leitores de tela */
    {const a=$('aoVivo');if(a)a.textContent=T.nome+' chegou!'}beep(150,.4,'sawtooth',.14);
    /* entrada do chefão: cartão com o nome e um instante em câmera lenta (a tela calma dispensa a câmera lenta) */
    S.fx.push({k:'chefeCard',nome:T.nome,t:0,d:2.4});if(!OPC.calmo)S.slowmo=.9;
  }
  return e;
}
/* o aviso grande no meio do mapa também é lido por leitores de tela */
function banner(t){S.banner=t;S.bannerT=2.6;const a=$('aoVivo');if(a)a.textContent=t}
function float(x,y,str,col,bubble){if(S.texts.length>42)S.texts.shift();S.texts.push({x,y,str,col:col||'#fff',t:0,bubble:!!bubble})}
function say(e,str){const p=posAt(e.d,e.via);float(p.x,p.y-e.T.s*52,str,'#1d1a16',true)}
function timer(e,k,p,dt,f){e.cd[k]=(e.cd[k]===undefined?p*.6:e.cd[k])-dt;if(e.cd[k]<=0){e.cd[k]=p;f()}}
function stunNear(e,R,T){
  const p=posAt(e.d,e.via);S.fx.push({k:'ring',x:p.x,y:p.y,r:R,c:'#2456a6',t:0,d:.5});
  for(const t of S.towers)if(Math.hypot(t.x-p.x,t.y-p.y)<R)t.stun=Math.max(t.stun,T);
}
function minions(e,type,n){for(let i=0;i<n;i++)spawn(type,Math.max(0,e.d-30-i*20),S.hpMul,e.via)}
const BOSS_RUSH=(e,dt)=>{timer(e,'a',6,dt,()=>{e.boost=2.2;say(e,pick(LINES[e.type]))})};
const BOSS_STUN=(e,dt)=>{timer(e,'a',7,dt,()=>{stunNear(e,210,2);say(e,pick(LINES[e.type]))})};
const BOSS_SHIELD=(e,dt)=>{
  timer(e,'a',8,dt,()=>{e.shield=e.max*.09;say(e,pick(LINES[e.type]))});
  timer(e,'b',10,dt,()=>minions(e,cfg().foes.moto,3));
};
const BOSS_FINAL=(e,dt)=>{
  const R=cfg().foes;
  timer(e,'a',9,dt,()=>{stunNear(e,190,2.2);say(e,pick(LINES[e.type]))});
  timer(e,'b',9,dt,()=>minions(e,pick([R.moto,R.bandeira,R.tio]),6));
  timer(e,'c',14,dt,()=>{e.shield=e.max*.05});
  if(!e.half&&e.hp<e.max/2){e.half=true;e.shield=e.max*.1;e.boost=4;banner('Segundo turno!')}
};
const AI={pavanato:BOSS_RUSH,janones:BOSS_RUSH,nikolas:BOSS_STUN,marx:BOSS_STUN,flavio:BOSS_SHIELD,dilma:BOSS_SHIELD,bolsonaro:BOSS_FINAL,lula:BOSS_FINAL};
/* ---------- chefões por região ----------
   Os chefões das rodadas 10, 20 e 30 mudam conforme a região do mapa (o Sudeste fica com os originais; o da rodada 40 é sempre o rival principal).
   Cada um tem a força da rodada dele, igual em todas as regiões, e um jeito próprio de atrapalhar. */
/* some: fica invisível por um instante (só quem detecta Isentões continua acertando) */
const BOSS_SOME=(e,dt)=>{timer(e,'a',8,dt,()=>{e.someT=2.6;say(e,pick(LINES[e.type]));const p=posAt(e.d,e.via);S.fx.push({k:'ring',x:p.x,y:p.y-20,r:40,c:'#cfe6ff',t:0,d:.5})})};
/* cura: recupera o argumento de quem está perto (e um pouco do próprio) */
const BOSS_CURA=(e,dt)=>{timer(e,'a',6,dt,()=>{const p=posAt(e.d,e.via);S.fx.push({k:'ring',x:p.x,y:p.y,r:130,c:'#35c46b',t:0,d:.45});
  for(const o of S.enemies){if(o.dead)continue;const q=posAt(o.d,o.via);if(Math.hypot(q.x-p.x,q.y-p.y)<130)o.hp=Math.min(o.max,o.hp+o.max*(o===e?.04:.2))}say(e,pick(LINES[e.type]))})};
/* chama gente: de tempos em tempos, mais 6 entram na marcha atrás dele */
const BOSS_CHAMA=(e,dt)=>{timer(e,'a',8,dt,()=>{const R=cfg().foes;minions(e,pick([R.bandeira,R.tio,R.camisa]),6);say(e,pick(LINES[e.type]))})};
/* blinda: fica com blindagem por alguns segundos e chama manifestantes de capacete */
const BOSS_BLINDA=(e,dt)=>{timer(e,'a',9,dt,()=>{e.blindT=3.5;say(e,pick(LINES[e.type]))});timer(e,'b',11,dt,()=>minions(e,cfg().foes.capacete,3))};
/* invisível: Isentão, chefão que sumiu ou adversário escondido no mato alto */
const ehCamo=e=>!!e.T.camo||e.someT>0||noMato(e);
const FORCA_CHEFE={10:{hp:170,spd:34,cash:220,r:30,leak:60,s:1.75},20:{hp:750,spd:32,cash:600,r:32,leak:80,s:1.95},30:{hp:2200,spd:30,cash:1400,r:34,leak:100,s:2.1}};
/* quem cada lado enfrenta em cada região (pt = quem defende a esquerda enfrenta chefões da direita) */
const CHEFES_REGIAO={
  pt:{'Norte':{10:'agro',20:'eneas',30:'mendonca'},'Nordeste':{10:'kelmon',20:'eduarda',30:'nunes'},
      'Centro-Oeste':{10:'gusttavo',20:'marcal',30:'caiado'},'Sul':{10:'ana',20:'ratinho',30:'veio'}},
  br:{'Norte':{10:'anitta',20:'marina',30:'xandao'},'Nordeste':{10:'pabllo',20:'helder',30:'dino'},
      'Centro-Oeste':{10:'artista',20:'carmen',30:'gilmar'},'Sul':{10:'xuxa',20:'janja',30:'prestes'}},
};
const AI_REGIAO={'Norte':{10:BOSS_SOME,20:BOSS_CURA,30:BOSS_BLINDA},'Nordeste':{10:BOSS_RUSH,20:BOSS_CHAMA,30:BOSS_SHIELD},
  'Centro-Oeste':{10:BOSS_SOME,20:BOSS_STUN,30:BOSS_CHAMA},'Sul':{10:BOSS_CURA,20:BOSS_RUSH,30:BOSS_BLINDA}};
/* falas: paródia do jeito público de cada um, na mesma medida para os dois lados */
const FALAS_CHEFE={
  agro:['Ôoo, boiada!','Abre a porteira!','O agro passou!'],eneas:['Meu nome é Enéas!','Quinze segundos!','Física pura!'],mendonca:['Peço vista!','Sessão virtual!','Voto vencido? Nunca!'],
  kelmon:['Em nome da fé!','A quermesse começou!','Chega de debate!'],eduarda:['Pela ordem!','Microfone ligado!','Corta pro vídeo!'],nunes:['Voto divergente!','Sessão aberta!','Com a palavra o relator!'],
  gusttavo:['O embaixador chegou!','Saideira!','Aumenta o som!'],marcal:['Bora pro curso!','Não é sobre isso!','Funil aberto!'],caiado:['O doutor chegou!','Ordem no plantão!','Respeita o Goiás!'],
  ana:['Pipoco!','Bota o chapéu!','Modão no talo!'],ratinho:['Chama o comercial!','Que é isso, gente?','Audiência lá em cima!'],veio:['Liquidação!','Leva dois, paga um!','Black Friday!'],
  anitta:['Turnê mundial!','Rebola, Brasil!','Estrela global!'],marina:['Floresta em pé!','Sustentabilidade!','A rede vai pra rua!'],xandao:['Inquérito aberto!','Perfil bloqueado!','Multa diária!'],
  pabllo:['Bota pra tocar!','O trio está passando!','Brilho total!'],helder:['Paz e bem!','A pastoral está na rua!','Partilha já!'],dino:['Bloqueio de emendas!','Bumba meu boi!','Auditoria já!'],
  artista:['Arte é resistência!','Hashtag no ar!','Edital aberto!'],carmen:['Ordem na seção!','Mineiramente!','A palavra é minha!'],gilmar:['Palavra final!','O decano falou!','Habeas pra todos!'],
  xuxa:['Hora do Xou!','Paquitas, comigo!','A nave vai decolar!'],janja:['Agenda internacional!','Comitiva, avante!','Passaporte carimbado!'],prestes:['Avante, coluna!','Marcha longa!','Cavaleiro da esperança!'],
};
const regiaoDe=uf=>(REGIOES.find(([,l])=>l.includes(uf))||['Sudeste'])[0];
for(const side of['pt','br'])for(const[reg,tab]of Object.entries(CHEFES_REGIAO[side]))for(const[r,k]of Object.entries(tab)){
  if(!ENEMY[k])ENEMY[k]={nome:TOWERS[k].nome.replace(/ \(.*\)/,''),boss:1,...FORCA_CHEFE[r]};
  AI[k]=AI_REGIAO[reg][r];LINES[k]=FALAS_CHEFE[k];
}
/* tabela de chefões do mapa: a da região, com o rival principal na 40 */
function chefesDe(side,uf){
  const base=SIDES[side].boss,reg=(CHEFES_REGIAO[side]||{})[regiaoDe(uf)];
  if(!reg)return base;
  const t={...base};for(const r of[10,20,30])t[r]=[reg[r],ENEMY[reg[r]].nome];
  return t;
}
/* o que o poder de cada chefão faz, para a página de adversários */
const TEXTO_AI=new Map([[BOSS_RUSH,'Dá arrancadas de tempos em tempos.'],[BOSS_STUN,'Trava os personagens que estão perto.'],[BOSS_SHIELD,'Ganha escudo e chama gente rápida.'],
  [BOSS_FINAL,'Trava quem está perto, chama reforço e, na metade, ganha escudo e acelera.'],[BOSS_SOME,'Some por um instante: só quem detecta Isentões continua acertando.'],
  [BOSS_CURA,'Recupera o argumento de quem está perto.'],[BOSS_CHAMA,'Chama mais gente para a marcha.'],[BOSS_BLINDA,'Fica blindado de tempos em tempos e chama manifestantes de capacete.']]);
function hurt(e,dmg,type,src){
  if(e.dead||e.voo)return false;
  /* dentro do túnel, só os poderes especiais e o do herói alcançam */
  if(type!=='puro'&&noTunel(e))return false;
  if(e.T.immune===type){if(S.time-e.noted>1.6){e.noted=S.time;const p=posAt(e.d,e.via);float(p.x+e.off,p.y-28,'Nem ouvi!','#ffd')}return false}
  dmg*=e.vuln;
  /* quem é forte contra alvo grande (veículos e chefões) */
  if(src&&src.s&&src.s.grande&&(e.T.veh||e.T.boss))dmg*=src.s.grande;
  e.lastHit=S.time;
  /* habilidade "dobra": o próximo acerto deste personagem vale o dobro */
  if(src&&src.dobra&&!habLock){dmg*=2;src.dobra=false}
  /* blindado: o acerto conta (gasta o projétil), mas tira 2 do argumento; fogo, o poder do herói e quem tirou a blindagem passam direto */
  /* chefão que se blinda (e.blindT) ganha 6 de blindagem enquanto dura */
  const arm=(e.T.armor||0)+(e.blindT>0?6:0);
  if(arm&&type!=='puro'&&type!=='fogo'&&!(e.armorOffT>0)){
    dmg-=arm;
    if(dmg<=0){if(S.time-e.noted>1.6){e.noted=S.time;const p=posAt(e.d,e.via);float(p.x+e.off,p.y-30,'Blindado!','#cfe6ff')}if(src&&src.habs&&src.habs.length)habAcerto(src,e);return true}
  }
  if(e.shield>0){const a=Math.min(e.shield,dmg);e.shield-=a;dmg-=a}
  /* registro: argumento que cada personagem realmente tirou (sem contar o que passou do que o adversário tinha) */
  if(src&&src.id&&dmg>0)src.dano=(src.dano||0)+Math.min(dmg,Math.max(0,e.hp));
  e.hp-=dmg;
  /* habilidades das evoluções que disparam com o acerto */
  if(src&&src.habs&&src.habs.length&&!e.dead)habAcerto(src,e);
  if(e.hp<=0&&!e.dead)convince(e,src);
  return true;
}
function convince(e,src){
  e.dead=true;
  const p=posAt(e.d,e.via),T=e.T;
  const ganhou=T.cash+((src&&src.s&&src.s.bonus)||0)+(S.bonusT>0?S.bonusV:0)+(src&&src.bonT>0?src.bonV:0)+(e.marcaAte>S.time?e.marcaV:0);
  /* poder de contágio: quem é convencido atinge (ou põe fogo em) quem está perto */
  if(S.contT>0&&!habLock&&S.contSrc){
    habLock++;
    try{for(const o of [...S.enemies]){if(o.dead||o===e)continue;const q=posAt(o.d,o.via);if(Math.hypot(q.x-p.x,q.y-p.y)>70)continue;
      if(S.contFogo){o.burnT=Math.max(o.burnT||0,3);o.burnD=Math.max(o.burnD||0,S.contD*.5);o.burnSrc=S.contSrc}else hurt(o,S.contD,'puro',S.contSrc)}}
    finally{habLock--}
    S.fx.push({k:'ring',x:p.x,y:p.y,r:70,c:S.contFogo?'#ff8a3d':'#b58cff',t:0,d:.35});
  }
  S.cash+=ganhou;S.ganho+=ganhou;S.conv++;
  /* Voto Popular: quanto mais perto do começo da avenida, mais o voto é seu; perto do fim, ele se divide */
  if(S.modo==='voto'&&!S.livre){S.votos=S.votos||{nos:0,eles:0};const w=votoDe(T),f=progressoVisivel(e),g=f<ZONA_VOTO?0:(f-ZONA_VOTO)/(1-ZONA_VOTO);S.votos.nos+=w*(1-g);S.votos.eles+=w*g}
  if(!S.menu){PROG.est.conv++;if(src&&src.key)somaEst('porPers',src.key)}
  if(src)src.kills=(src.kills||0)+1;
  if(src&&src.T&&src.T.only)ganhaXP(src,XP_CONV);
  if(T.kids)T.kids.forEach((k,i)=>spawn(k,Math.max(0,e.d-i*13),e.hpMul,e.via));
  /* habilidades "ao convencer" de quem convenceu e "quando um vizinho convence" de quem está perto */
  if(src&&src.habs&&!habLock){
    habEvento(src,'convence',p);
    for(const o of S.towers)if(o!==src&&o.habs&&o.habs.length&&Math.hypot(o.x-src.x,o.y-src.y)<=170)habEvento(o,'vizinho',p);
  }
  if(T.boss){
    banner(T.nome+' perdeu o debate!');S.flash=.5;beep(520,.5,'triangle',.18);
    for(let i=0;i<26;i++)S.fx.push({k:'conf',x:p.x,y:p.y-30,vx:rand(-190,190),vy:rand(-260,30),c:pick(['#c8102e','#f2b705','#fff']),t:0,d:rand(.8,1.5)});
  }
  if(!T.veh)S.fx.push({k:'conv',x:p.x+e.off,y:p.y+9,s:T.s,L:LOOKOF(e.type),t:0,d:T.boss?1.5:.75,ph:e.ph});
  else S.fx.push({k:'ring',x:p.x,y:p.y,r:50,c:'#fff',t:0,d:.35});
  if(Math.random()<.14&&!T.boss)float(p.x,p.y-22,pick(cfg().frases),'#fff');
  beep(T.boss?300:rand(520,760),.05,'square',.03);
}

/* ---------- passo da simulação ---------- */
function targets(t,range,n,mode){
  const out=[];
  /* prédios tapam a visão de quem atira do chão; aviões e auras não são afetados */
  const ve=!((MAPAS[S.uf].predios||[]).length||(MAPAS[S.uf].moveis||[]).length)||t.T.atk==='aura'||t.T.atk==='plane'||t.alto;
  for(const e of S.enemies){
    if(e.dead||e.voo||(ehCamo(e)&&!t.s.detect&&!t.buffDet)||noTunel(e))continue;
    const p=posAt(e.d,e.via),dist=Math.hypot(p.x-t.x,p.y-t.y);
    if(dist<=range&&(ve||!predioTapa(t.x,t.y-20,p.x,p.y-10)))out.push({e,p,dist});
  }
  const m=mode||t.mode;
  out.sort(m==='first'?(a,b)=>b.e.d-a.e.d:m==='last'?(a,b)=>a.e.d-b.e.d:m==='strong'?(a,b)=>b.e.hp-a.e.hp:(a,b)=>a.dist-b.dist);
  return out.slice(0,n);
}
function shoot(t,tg,ang){
  const s=t.s,dist=tg.dist,lead=posAt(tg.e.d+tg.e.T.spd*(dist/s.spd)*.9,tg.e.via);
  const a=(ang||0)+Math.atan2(lead.y-t.y,lead.x-t.x);
  const kind=s.alt?s.alt[(t.altI=(t.altI||0)+1)%2]:s.shot;
  S.shots.push({x:t.x,y:t.y-18,vx:Math.cos(a)*s.spd,vy:Math.sin(a)*s.spd,life:4,ox:t.x,oy:t.y,maxR:s.range*t.rangeMul+18,dmg:s.dmg*t.dmgMul,pierce:s.pierce+t.pierceAdd,type:s.type,shot:kind,splash:s.splash||0,det:!!(s.detect||t.buffDet),hit:new Set,src:t,a,r:kind==='vento'?14:7,knock:s.knock||0,slowHit:kind==='cerveja'||kind==='leite'||kind==='sacola'||kind==='vista'||kind==='cajuina'||(kind==='lei'&&s.tram)?1.5:0,stunHit:kind==='banana'?s.banStun:(s.stunHit||0),bossStun:s.bossStun||0,censor:kind==='tarja',inflate:s.inflate||0,inflCap:s.inflCap||1,sale:s.sale||0,chair:kind==='cadeira',jail:kind==='algema',anula:kind==='anulado',jailHp:s.jailHp||0,sleep:kind==='rivotril',slip:kind==='banana',trip:s.trip||0});
}
function applyStun(e,p){
  /* cada inimigo tem um limite: ninguém fica parado para sempre */
  if(!p.stunHit||e.dead)return;
  if(p.anula&&e.shield>0){e.shield=0;const q=posAt(e.d,e.via);float(q.x,q.y-30,'Anulado!','#ffd9a0')}
  if(p.jailHp&&!e.T.boss&&!e.T.veh&&e.hp<=p.jailHp){const q=posAt(e.d,e.via);float(q.x,q.y-30,'Preso!','#ffd9a0');convince(e,p.src);return}
  if((e.stunned||0)>=(e.T.boss?3:4))return;
  const k=e.T.boss?p.bossStun:p.stunHit*(e.T.w?.5:1);
  if(!k)return;
  e.stunned=(e.stunned||0)+k;e.stun=Math.max(e.stun,k);
  if(p.censor)e.censorT=k;
  if(p.jail)e.jailT=k;
  if(p.chair)e.chairT=k;
  if(p.sleep)e.sleepT=k;
  if(p.slip)e.slipT=k;
}
function planeCenter(x,y,orbit){
  const mx=orbit+45,my=orbit*.72+45;
  return[clamp(x,Math.min(mx,W/2),Math.max(W-mx,W/2)),clamp(y-14,Math.min(my,H/2),Math.max(H-my,H/2))];
}
function stepPlane(t,dt){
  const s=t.s,n=s.planes||1;
  t.ang=(t.ang||0)+s.planeSpd*dt*t.auraMul;
  t.pl=[];
  /* a órbita fica inteira dentro do mapa, sem o avião raspar a borda */
  const[cx,cy]=planeCenter(t.x,t.y,s.orbit);
  for(let i=0;i<n;i++){
    const a=t.ang+i*Math.PI*2/n;
    t.pl.push({x:cx+Math.cos(a)*s.orbit,y:cy+Math.sin(a)*s.orbit*.72,h:Math.atan2(Math.cos(a)*.72,-Math.sin(a))});
  }
  if(t.stun>0){t.stun-=dt;return}
  t.cd-=dt*t.auraMul;
  if(t.cd>0)return;
  /* joga o tempo todo, sem mirar: sai um de cada lado de quem voa, cobrindo a área mostrada no mapa */
  t.cd=s.rate;
  const voo=s.reach*t.rangeMul;
  for(const p of t.pl)for(const lado of [-1,1]){
    const a=p.h+lado*Math.PI/2;
    S.shots.push({x:p.x,y:p.y,vx:Math.cos(a)*s.spd,vy:Math.sin(a)*s.spd,life:voo/s.spd,dmg:s.dmg*t.dmgMul*(s.semMira||1),pierce:1,type:s.type,shot:s.shot,splash:s.splash,det:!!(s.detect||t.buffDet),hit:new Set,src:t,a,r:9,knock:0,slowHit:0,stunHit:0,landBurst:1});
  }
  beep(420,.04,'triangle',.012);
}
/* árvores em chamas dos Artistas: nascem um pouco à frente do alvo e atingem quem passa perto */
function growFire(t,e){
  if(S.fires.filter(f=>!f.planta).length>=14)return;
  const s=t.s,p=posAt(e.d+e.T.spd*.7,e.via);
  S.fires.push({x:p.x,y:p.y,life:s.fireLife,max:s.fireLife,r:s.fireR,dmg:s.dmg*t.dmgMul,det:!!(s.detect||t.buffDet),src:t,cd:.2,ph:rand(0,6)});
  beep(260,.1,'sawtooth',.03);
}
/* bloqueio do Caminhoneiro: quando vem gente, atravessa o caminhão na pista mais próxima */
function stepBloqueio(t,dt){
  const s=t.s;
  t.wallCd=(t.wallCd||0)-dt*t.auraMul;
  if(t.wallCd>0||!targets(t,s.range,1).length)return;
  t.wallCd=s.wallRate;
  buildWall(t);
}
/* plantas do Fazendeiro: brotam na avenida à frente de quem vem, dentro do alcance dele */
function stepPlantas(t,dt){
  const s=t.s;
  t.plantCd=(t.plantCd===undefined?s.plantRate*.3:t.plantCd)-dt*t.auraMul;
  if(t.plantCd>0)return;
  const alvo=targets(t,s.range,1)[0];
  if(!alvo)return;
  if(S.fires.filter(f=>f.planta&&f.src===t).length>=s.plantMax)return;
  t.plantCd=s.plantRate;
  let p=posAt(alvo.e.d+alvo.e.T.spd*.7,alvo.e.via);
  if(Math.hypot(p.x-t.x,p.y-t.y)>s.range)p=alvo.p;
  S.fires.push({planta:1,tipo:Math.floor(rand(0,3)),x:p.x,y:p.y,life:s.plantLife,max:s.plantLife,r:s.plantR,dmg:s.plantDmg*t.dmgMul,det:!!(s.detect||t.buffDet),src:t,cd:.2,ph:rand(0,6)});
  beep(520,.08,'triangle',.03);
}
function stepFire(f,dt){
  f.life-=dt;f.cd-=dt;
  if(f.cd>0)return;
  f.cd=.5;
  for(const e of [...S.enemies]){
    if(e.dead||(ehCamo(e)&&!f.det))continue;
    const q=posAt(e.d,e.via);if(Math.hypot(q.x-f.x,q.y-f.y)>f.r)continue;
    /* piquete ou mata: só deixa lento (e, no piquete, mais fácil de convencer) */
    if(f.lama){e.slowT=Math.max(e.slowT,.6);if(f.lx>1){e.vulnX=Math.max(e.vulnT>0?e.vulnX||1:1,f.lx);e.vulnT=Math.max(e.vulnT||0,.6)}continue}
    hurt(e,f.dmg,f.planta?'comida':'fogo',f.src);if(f.planta)e.slowT=Math.max(e.slowT,.6);
  }
}
/* bomba do Enéas: cai do céu no ponto mirado e explode depois de 1 segundo */
function launchNuke(t,p){
  const s=t.s;
  S.nukes.push({x:p.x,y:p.y,t:1,r:s.nukeR,dmg:s.nukeDmg*t.dmgMul,src:t});
  banner('BOMBA ATÔMICA!');beep(90,.9,'sawtooth',.1);
}
function stepNuke(n,dt){
  n.t-=dt;
  if(n.t>0)return;
  S.flash=.55;S.shake=.5;beep(55,.8,'sawtooth',.18);
  S.fx.push({k:'nuke',x:n.x,y:n.y,r:n.r,t:0,d:1.3});
  for(const e of [...S.enemies]){
    if(e.dead)continue;
    const q=posAt(e.d,e.via);if(Math.hypot(q.x-n.x,q.y-n.y)<=n.r)hurt(e,n.dmg,'puro',n.src);
  }
}
/* bloqueios da avenida (muros, caminhões, barreiras) têm vida: quem fica parado empurrando vai derrubando,
   cada um na força do tamanho dele (veículos derrubam rápido); a vida cresce com a rodada. Chefões passam direto. */
function novoBloqueio(d,life,truck){const hp=Math.round((truck?140:70)*(1+Math.max(0,S.round-1)*.08));return{d,life,max:life,truck,hp,hpMax:hp}}
const forcaContraBloqueio=T=>4+Math.min(T.leak,60)*6;
/* muros do Trump: nascem no ponto da avenida mais perto da torre */
function buildWall(t){
  const s=t.s;
  if(t.pathD===undefined){t.pathD=nearestD(t.x,t.y);t.pathV=nearestD.via}
  for(let i=0;i<s.wallN&&S.walls.length<8;i++){
    const d=Math.max(0,t.pathD-i*44);
    S.walls.push(novoBloqueio(d,s.wallLife,!!s.bloqueio));
  }
  beep(180,.1,'square',.04);
}
/* notas do Maduro: cada acerto no mesmo inimigo aumenta o dano, até o limite da torre */
function inflDmg(p,e){
  if(!p.inflate)return p.dmg;
  e.infl=(e.infl||0)+1;
  if(e.infl%4===0&&S.time-e.noted>1.2){e.noted=S.time;const q=posAt(e.d,e.via);float(q.x,q.y-30,'Inflação!','#ffe27a')}
  return p.dmg*Math.min(p.inflCap,1+e.infl*p.inflate);
}
/* robôs do Xi: marcham contra a fila e param para atirar em quem estiver perto */
const ROBOT_SPD=70,ROBOT_RANGE=95,DRONE_SPD=120,DRONE_RANGE=125;
function summonRobots(t){
  const s=t.s;
  if(t.pathD===undefined){t.pathD=nearestD(t.x,t.y);t.pathV=nearestD.via}
  for(let i=0;i<s.robots&&S.allies.length<30;i++){
    S.allies.push({drone:!!s.drone,dino:!!(s.dino||s.rato),rato:!!s.rato,scale:s.dinoS||1,cor:pick([['#5f9a48','#3f7a32'],['#3f9a8a','#2a7a6a'],['#d98a3a','#b56a22']]),via:t.pathV,d:Math.min(LEN,t.pathD+i*20),life:s.robotLife,dmg:s.robotDmg*t.dmgMul,det:!!(s.detect||t.buffDet),src:t,cd:0,face:1,beam:0,bx:0,by:0,dead:false,ph:rand(0,6)});
  }
  beep(620,.08,'square',.03);
}
/* o dinossauro olha para onde vai: de lado na horizontal, de frente descendo, de costas subindo */
function dinoAim(a,vx,vy){
  if(Math.abs(vy)>Math.abs(vx))a.view=vy>0?'front':'back';
  else{a.view='side';if(vx)a.face=vx>0?1:-1}
}
function stepAlly(a,dt){
  a.life-=dt;
  const p=posAt(a.d,a.via);a.x=p.x;a.y=p.y;if(p.dx)a.face=p.dx>0?-1:1;
  if(a.life<=0||a.d<=0){a.dead=true;S.fx.push({k:'ring',x:a.x,y:a.y,r:18,c:'#7fd4ff',t:0,d:.3});return}
  if(a.beam>0)a.beam-=dt;
  let best=null,m=a.drone?DRONE_RANGE:a.dino?62*a.scale:ROBOT_RANGE,bq=null;
  for(const e of S.enemies){
    if(e.dead||(ehCamo(e)&&!a.det))continue;
    const q=posAt(e.d,e.via),d=Math.hypot(q.x-p.x,q.y-p.y);
    if(d<m){m=d;best=e;bq=q}
  }
  if(!best){if(a.dino)dinoAim(a,-p.dx,-p.dy);a.d=Math.max(0,a.d-(a.drone?DRONE_SPD:ROBOT_SPD)*dt);a.walk=true;return}
  if(a.dino)dinoAim(a,bq.x-p.x,bq.y-p.y);
  a.walk=false;a.cd-=dt;
  if(a.cd<=0){a.cd=a.dino?.7:.55;a.beam=a.dino?.2:.12;a.bx=bq.x;a.by=bq.y;hurt(best,a.dmg,'meme',a.src);if(a.dino){if(Math.random()<.2)float(bq.x,bq.y-26,'Nhac!','#d8ffc0');beep(150,.06,'sawtooth',.025)}else beep(980,.03,'square',.012)}
}
/* Xuxucão: fica ao lado da Xuxa, sempre do lado mais perto da avenida, e morde quem chega perto */
function petOff(x,y){
  const p=posAt(nearestD(x,y));let sd=p.x<x?-1:1;
  if(x+sd*32<20||x+sd*32>W-20)sd=-sd;
  return sd*32;
}
function stepPet(t,dt){
  const s=t.s;
  if(t.petO===undefined)t.petO=petOff(t.x,t.y);
  if(t.petBite>0)t.petBite-=dt;
  t.petCd=(t.petCd||0)-dt*t.auraMul;
  const px=t.x+t.petO;
  let best=null,m=s.petR,bq=null;
  for(const e of S.enemies){
    if(e.dead||(ehCamo(e)&&!s.detect&&!t.buffDet))continue;
    const q=posAt(e.d,e.via),d=Math.hypot(q.x-px,q.y-t.y);
    if(d<m){m=d;best=e;bq=q}
  }
  if(!best)return;
  t.petFace=bq.x>=px?1:-1;
  if(t.petCd>0)return;
  t.petCd=s.petRate;t.petBite=.2;
  hurt(best,s.petDmg*t.dmgMul,'meme',t);
  if(Math.random()<.25)float(bq.x,bq.y-26,'Nhac!','#ffd9a0');
  beep(170,.06,'sawtooth',.025);
}
function stepTower(t,dt){
  const s=t.s;
  if(t.dance>0)t.dance-=dt;
  if(s.plantRate&&!(t.stun>0))stepPlantas(t,dt);
  if(s.bloqueio&&!(t.stun>0))stepBloqueio(t,dt);
  if(s.pet&&!(t.stun>0))stepPet(t,dt);
  if(t.T.atk==='plane'){stepPlane(t,dt);return}
  if(t.molhado)return;
  if(t.stun>0){t.stun-=dt;return}
  if(t.T.atk==='none')return;
  const R=s.range*t.rangeMul;
  if(t.T.atk==='aura'){
    for(const e of S.enemies){
      if(e.dead)continue;const p=posAt(e.d,e.via);
      if(Math.hypot(p.x-t.x,p.y-t.y)<=R){e.slowVal=Math.max(e.slowVal,s.slow);if(s.vuln)e.vuln=Math.max(e.vuln,s.vuln)}
    }
    if(s.bats){
      t.batCd=(t.batCd||0)-dt*t.auraMul;
      const qs=t.batCd<=0?targets(t,R,s.bats):[];
      if(qs.length){
        t.batCd=s.batRate;
        for(let i=0;i<s.bats;i++)S.shots.push({x:t.x+rand(-10,10),y:t.y-30,vx:0,vy:-200,life:4,ox:t.x,oy:t.y,maxR:R+18,dmg:s.batDmg*t.dmgMul,pierce:1,type:'morcego',shot:s.batShot||'morcego',splash:0,det:!!(s.detect||t.buffDet),hit:new Set,src:t,a:0,r:10,knock:0,slowHit:0,stunHit:0,target:qs[i%qs.length].e,spd:330,ph:rand(0,6)});
        beep(1200,.04,'triangle',.02);
      }
    }
    t.cd-=dt*t.auraMul;
    if(t.cd<=0){
      t.cd=s.rate;
      if(s.dmg>0||s.stop){
        S.fx.push({k:'ring',x:t.x,y:t.y,r:R,c:s.cold?'#9fd6ee':'#ff9a3c',t:0,d:.3});
        for(const e of [...S.enemies]){
          if(e.dead)continue;const p=posAt(e.d,e.via);if(Math.hypot(p.x-t.x,p.y-t.y)>R)continue;
          if(s.dmg>0)hurt(e,s.dmg*t.dmgMul,s.type,t);
          if(s.stop&&!e.T.boss&&(t.tick=(t.tick||0)+1)%10===0)e.stun=.8;
        }
      }
    }
    return;
  }
  const first=targets(t,R,1)[0];
  if(first)t.aim=Math.atan2(first.p.y-t.y+18,first.p.x-t.x);
  if(t.T.atk==='drain'){
    t.cd-=dt*t.auraMul;
    if(first&&t.cd<=0){
      t.cd=s.rate;
      for(const q of targets(t,R,s.multi||1)){
        if(hurt(q.e,s.dmg*t.dmgMul,s.type,t))S.cash+=s.steal;
        S.fx.push({k:'beam',x:t.x,y:t.y-30,x2:q.p.x,y2:q.p.y,t:0,d:.18});
      }
      beep(140,.05,'sawtooth',.02);
    }
    return;
  }
  if(t.T.atk==='fire'){
    t.cd-=dt*t.auraMul;
    if(first&&t.cd<=0){t.cd=s.rate;for(const q of targets(t,R,s.count))growFire(t,q.e)}
    return;
  }
  if(s.guitarRate){
    t.gt=(t.gt===undefined?s.guitarRate*.4:t.gt)-dt*t.auraMul;
    if(first&&t.gt<=0){
      t.gt=s.guitarRate;
      S.fx.push({k:'ring',x:t.x,y:t.y,r:R,c:'#7a3ab0',t:0,d:.45});
      float(t.x,t.y-58,'♪ ♫ ♪','#e0c8ff');
      for(const q of targets(t,R,99))hurt(q.e,s.guitarDmg*t.dmgMul,'som',t);
      beep(392,.16,'triangle',.05);
    }
  }
  if(s.danceRate){
    t.dn=(t.dn===undefined?s.danceRate*.4:t.dn)-dt*t.auraMul;
    if(first&&t.dn<=0){
      t.dn=s.danceRate;
      S.fx.push({k:'ring',x:t.x,y:t.y,r:R,c:'#e2679b',t:0,d:.4});
      for(const q of targets(t,R,99)){const e=q.e;if(e.T.boss||(e.stunned||0)>=4)continue;e.stunned=(e.stunned||0)+s.danceT;e.stun=Math.max(e.stun,s.danceT);e.danceT=s.danceT}
    }
  }
  if(s.nukeRate){t.nk=(t.nk===undefined?s.nukeRate*.4:t.nk)-dt*t.auraMul;if(first&&t.nk<=0){t.nk=s.nukeRate;launchNuke(t,first.p)}}
  if(s.wallRate){t.wallCd=(t.wallCd||0)-dt*t.auraMul;if(first&&t.wallCd<=0){t.wallCd=s.wallRate;buildWall(t)}}
  if(s.robots){t.sum=(t.sum||0)-dt*t.auraMul;if(first&&t.sum<=0){t.sum=s.sumRate;summonRobots(t)}}
  t.cd-=dt*t.auraMul;
  if(t.cd>0||!first)return;
  t.cd=s.rate;t.kick=.12;
  if(t.T.atk==='shot'){
    if(s.multi){for(const q of targets(t,R,s.multi))shoot(t,q,0)}
    else if(s.radial){for(let i=0;i<s.radial;i++)shoot(t,first,i*Math.PI*2/s.radial)}
    else if(s.spread){for(let i=0;i<s.spread;i++)shoot(t,first,(i-(s.spread-1)/2)*.22)}
    else shoot(t,first,0);
    somAtaque(s.type);
  }else if(t.T.atk==='boom'){
    const a=Math.atan2(first.p.y-t.y,first.p.x-t.x),n=s.count;
    for(let i=0;i<n;i++){
      const off=n>1?(i-(n-1)/2)*.38:0;
      S.shots.push({boom:1,ox:t.x,oy:t.y-14,a:a+off,R:R+8,t:0,dur:.95,dmg:s.dmg*t.dmgMul,pierce:s.pierce+t.pierceAdd,type:s.type,shot:s.shot,det:!!(s.detect||t.buffDet),hit:new Set,src:t,x:t.x,y:t.y,r:11,knock:s.knock||0,turned:false});
    }
    beep(300,.05,'triangle',.03);
  }else if(t.T.atk==='runner'){
    if(t.pathD===undefined){t.pathD=nearestD(t.x,t.y);t.pathV=nearestD.via}
    for(let i=0;i<s.count;i++)S.shots.push({run:1,via:t.pathV,d:Math.min(LEN,t.pathD+i*26),left:s.len,v:s.spd,dmg:s.dmg*t.dmgMul,pierce:s.pierce+t.pierceAdd,type:s.type,shot:'boi',det:!!(s.detect||t.buffDet),hit:new Set,src:t,x:t.x,y:t.y,r:15,a:0,face:1});
    beep(240,.1,'sawtooth',.03);
  }else if(t.T.atk==='wave'){
    S.fx.push({k:'ring',x:t.x,y:t.y-10,r:R,c:'#c8102e',t:0,d:.32});
    for(const q of targets(t,R,s.pierce))hurt(q.e,s.dmg*t.dmgMul,s.type,t);
    beep(190,.08,'sawtooth',.03);
  }else if(t.T.atk==='saw'){
    /* corte de perto: só acerta quem está no leque à frente dele */
    const a=Math.atan2(first.p.y-t.y,first.p.x-t.x);
    const naFrente=targets(t,R,99).filter(q=>{const da=Math.atan2(q.p.y-t.y,q.p.x-t.x)-a;return Math.abs(Math.atan2(Math.sin(da),Math.cos(da)))<=s.sawArc});
    for(const q of naFrente.slice(0,s.pierce+t.pierceAdd))hurt(q.e,s.dmg*t.dmgMul,s.type,t);
    if(s.sawFx==='fogoC'){
      /* a labareda nasce na boca, mas o alcance continua medido do pé, como o círculo do mapa */
      const by=t.y-26;
      S.fx.push({k:'fogoC',x:t.x,y:by,a:Math.atan2(first.p.y-by,first.p.x-t.x),r:Math.hypot(first.p.x-t.x,first.p.y-by)+24,arc:s.sawArc,t:0,d:.3});
      beep(rand(70,95),.09,'sawtooth',.03);
    }else if(s.sawFx==='rebolado'){
      t.dance=.45;
      S.fx.push({k:'rebolado',x:t.x,y:t.y-6,a,r:R,arc:s.sawArc,t:0,d:.34});
      beep(rand(520,700),.07,'triangle',.03);
    }else{
      S.fx.push({k:'saw',x:t.x,y:t.y-6,a,r:R,arc:s.sawArc,t:0,d:.16});
      beep(rand(90,120),.06,'sawtooth',.03);
    }
  }
}
/* mapas Expert: marcha 5% mais rápida. Com o robô no Difícil, 10% fazia perder quase todas; 5% deixa metade das vitórias, contra todas nos mapas Iniciante */
var VEL_EXPERT=1.05;
function stepEnemy(e,dt){
  const T=e.T;
  /* no cesto do balão: quem leva é o balão (stepBalao) */
  if(e.voo)return;
  if(T.boss&&AI[e.type])AI[e.type](e,dt);
  if(T.heal&&!(e.noRegenT>0))timer(e,'h',3.2,dt,()=>{
    const p=posAt(e.d,e.via);S.fx.push({k:'ring',x:p.x,y:p.y,r:80,c:'#35c46b',t:0,d:.3});
    for(const o of S.enemies){if(o.dead||o.T.boss)continue;const q=posAt(o.d,o.via);if(Math.hypot(q.x-p.x,q.y-p.y)<80)o.hp=Math.min(o.max,o.hp+o.max*.12)}
  });
  if(T.regen&&e.hp<e.max&&S.time-(e.lastHit||0)>1&&!(e.noRegenT>0))e.hp=Math.min(e.max,e.hp+e.max*T.regen*dt);
  if(e.vulnT>0)e.vulnT-=dt;
  if(e.rotT>0)e.rotT-=dt;
  for(const k of ['noRegenT','armorOffT','roubaT','someT','blindT'])if(e[k]>0)e[k]-=dt;
  /* queimando: perde argumento aos poucos (não dispara outras habilidades) */
  if(e.burnT>0){e.burnT-=dt;habLock++;try{hurt(e,e.burnD*dt,'fogo',e.burnSrc)}finally{habLock--}if(e.dead)return}
  if(e.slowT>0)e.slowT-=dt;
  if(e.boost>0)e.boost-=dt;
  if(e.censorT>0)e.censorT-=dt;
  if(e.jailT>0)e.jailT-=dt;
  if(e.chairT>0)e.chairT-=dt;
  if(e.sleepT>0)e.sleepT-=dt;
  if(e.slipT>0)e.slipT-=dt;
  if(e.danceT>0)e.danceT-=dt;
  /* andar para trás e ser empurrado também têm limite por adversário (8 s e 1.200 px), pelo mesmo motivo */
  if(e.tripT>0){e.tripTot=(e.tripTot||0)+dt;if(e.tripTot<8){e.tripT-=dt;e.d=Math.max(0,e.d-T.spd*.6*dt);return}e.tripT=0}
  if(e.pushLeft>0){const v=Math.min(e.pushLeft,480*dt);e.pushTot=(e.pushTot||0)+v;if(e.pushTot<1200){e.d=Math.max(0,e.d-v);e.pushLeft-=v;return}e.pushLeft=0}
  /* cada adversário fica parado no máximo 10 s no total: sem isso, um blindado que ninguém consegue ferir
     podia ficar preso para sempre por habilidades que prendem a cada acerto, e a rodada nunca acabava */
  if(e.stun>0){e.stunTot=(e.stunTot||0)+dt;if(e.stunTot<10){e.stun-=dt;return}e.stun=0}
  /* a lentidão vai no máximo a 85%: com 100%, um caminhão dentro do frio parava para sempre e a rodada não acabava */
  let slow=Math.min(.85,Math.max(e.slowVal,e.slowT>0?.5:0));if(T.boss)slow*=.45;
  /* no Turbo a marcha anda 35% mais rápido, e nos mapas Expert, 5%; na chuva, 15% mais devagar */
  const mv=T.spd*(1-slow)*(e.boost>0?1.9:1)*(S.modo==='turbo'?1.35:1)*(S.expert?VEL_EXPERT:1)*(S.chuva?.85:1)*(T.boss?1:velTardio(S.round)*velPressao())*velTrecho(e)*(S.livre?1:velCurto())*dt;
  /* cancela do trem fechada: quem chega espera antes dos trilhos (chefões passam) */
  if(S.tremFechadoT>0&&!T.boss){const dT=MAPAS[S.uf].trem.d-34;if(e.d<=dT&&e.d+mv>=dT)return}
  /* cada inimigo só fica preso em muro por até 5 segundos no total, e chefões passam direto */
  if(!T.boss&&(e.walled||0)<5)for(const w of S.walls)if(w.life>0&&e.d<=w.d&&e.d+mv>=w.d-14){e.walled=(e.walled||0)+dt;
    /* empurrando, o adversário tira vida do bloqueio; quando acaba, ele cai */
    if(w.hpMax){w.hp-=forcaContraBloqueio(T)*dt;if(w.hp<=0){w.life=0;const p=posAt(w.d,e.via);S.fx.push({k:'ring',x:p.x,y:p.y,r:30,c:'#ff9a3c',t:0,d:.4});float(p.x,p.y-40,'Derrubaram!','#ffb3b3')}}
    return}
  e.d+=mv;
  /* metrô: quem passa pela estação desce e sai na outra estação, mais adiante (uma vez só; chefões e veículos não entram) */
  {const Mm=MAPAS[S.uf].metro;if(Mm&&!T.boss&&!T.veh&&!e.metro&&e.d-mv<Mm.d1&&e.d>=Mm.d1&&naPrincipal(Mm.d1,e.via)){e.metro=1;const a=posAt(Mm.d1,e.via);e.d=Mm.d2+(e.d-Mm.d1);const b=posAt(e.d,e.via);
    S.fx.push({k:'ring',x:a.x,y:a.y,r:22,c:'#cfe6ff',t:0,d:.35});S.fx.push({k:'ring',x:b.x,y:b.y,r:22,c:'#cfe6ff',t:0,d:.35});
    if(!DICAS.metro)dica('metro','A marcha pegou o metrô: quem passa pela estação sai na outra, mais adiante, e pula o trecho do meio. Chefões e veículos não cabem no vagão.')}}
  if(e.d>=LEN){
    e.dead=true;
    /* poder de barreira: os próximos que chegam ao fim (menos chefões) não tiram apoio */
    if(S.escudoN>0&&!T.boss){S.escudoN--;float(830,160,'Barrado!','#cfe6ff');beep(500,.08,'triangle',.05);return}
    /* registro: quem chegou ao fim nesta rodada */
    {const o=S.escRod||(S.escRod={});o[e.type]=(o[e.type]||0)+1}
    /* Tolerância Zero: um que passe e acabou */
    if(S.modo==='zero'){S.perdeu=true;S.motivo=T.nome.replace(/ \(.*\)/,'')+' chegou ao fim, e no Tolerância Zero ninguém pode passar.';S.lives=0;endGame(false);return}
    /* Voto Popular: quem passa vira voto do outro lado, e o apoio não cai */
    if(S.modo==='voto'&&!S.livre){S.votos=S.votos||{nos:0,eles:0};const v=votoDe(T)*PESO_VOTO_ELES;S.votos.eles+=v;S.perdeu=true;habEventoTodos('perdeApoio');S.shake=T.boss?.6:.14;beep(120,.12,'sawtooth',.06);float(830,160,'+'+v+' votos para eles','#ffb3b3');syncHud();return}
    S.lives-=T.leak;S.perdeu=true;habEventoTodos('perdeApoio');S.shake=T.boss?.6:.14;beep(120,.12,'sawtooth',.06);
    float(830,160,'-'+Math.min(T.leak,99)+' apoio','#ffb3b3');
    if(S.lives<=0){S.lives=0;endGame(false)}
  }
}
/* explosão em área; a festa de confete só aparece quando acerta alguém */
function burstShot(p){
  S.fx.push({k:'ring',x:p.x,y:p.y,r:p.splash,c:'#f2b705',t:0,d:.22});
  let acertou=false;
  for(const o of [...S.enemies]){
    if(o.dead||(ehCamo(o)&&!p.det))continue;
    const w=posAt(o.d,o.via);if(Math.hypot(w.x-p.x,w.y-p.y)<=p.splash+o.T.r*.4){acertou=true;if(p.slowHit)o.slowT=Math.max(o.slowT,p.slowHit);hurt(o,p.dmg,p.type,p.src);applyStun(o,p)}
  }
  if(acertou&&(p.shot==='mala'||p.shot==='carro'||p.shot==='obus')){
    S.fx.push({k:'flash',x:p.x,y:p.y,r:p.splash+12,t:0,d:.32});
    for(let i=0;i<9;i++)S.fx.push({k:'conf',x:p.x,y:p.y,vx:rand(-170,170),vy:rand(-230,-40),c:pick(['#c8102e','#2456a6','#f2b705','#e2679b','#fff']),t:0,d:rand(.45,.75)});
  }
  if(p.sale){S.cash+=p.sale;float(p.x,p.y-20,'Comprou!','#b6ffb0')}
}
function stepShot(p,dt){
  if(p.run){
    p.d-=p.v*dt;p.left-=p.v*dt;
    if(p.left<=0||p.d<=0){p.dead=true;return}
    const q=posAt(p.d,p.via);p.x=q.x;p.y=q.y;if(q.dx)p.face=q.dx>0?-1:1;
  }else if(p.boom){
    p.t+=dt/p.dur;
    if(p.t>=1){p.dead=true;return}
    if(!p.turned&&p.t>.5){p.turned=true;p.hit.clear()}
    const o=Math.sin(Math.PI*p.t)*p.R,w=Math.sin(Math.PI*2*p.t)*p.R*.16;
    p.x=p.ox+Math.cos(p.a)*o-Math.sin(p.a)*w;p.y=p.oy+Math.sin(p.a)*o+Math.cos(p.a)*w;
  }else{
    if(p.target&&!p.target.dead){const q=posAt(p.target.d,p.target.via),a=Math.atan2(q.y-p.y,q.x-p.x);p.vx=Math.cos(a)*p.spd;p.vy=Math.sin(a)*p.spd;p.a=a}
    p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;
    if(p.landBurst&&p.life<=0){burstShot(p);p.dead=true;return}
    if(p.life<=0||p.x<-30||p.x>W+30||p.y<-30||p.y>H+30||(p.maxR&&Math.hypot(p.x-p.ox,p.y-p.oy)>p.maxR)){p.dead=true;return}
  }
  for(const e of S.enemies){
    if(e.dead||p.hit.has(e.id)||(ehCamo(e)&&!p.det))continue;
    const q=posAt(e.d,e.via);
    if(Math.hypot(q.x-p.x,q.y-p.y)>e.T.r+p.r)continue;
    if(p.splash){
      burstShot(p);
      p.dead=true;return;
    }
    p.hit.add(e.id);
    if(hurt(e,inflDmg(p,e),p.type,p.src)){
      if(p.sale){S.cash+=p.sale;if(Math.random()<.3)float(p.x,p.y-20,'Comprou!','#b6ffb0')}
      if(p.knock&&!e.dead){
        /* cada inimigo só pode ser empurrado até certo ponto, senão a rodada nunca acaba */
        const k=Math.min(p.knock*(e.T.boss?.15:e.T.w?.4:1),Math.max(0,420-(e.pushed||0)));
        e.pushed=(e.pushed||0)+k;e.pushLeft=(e.pushLeft||0)+k;
      }
      applyStun(e,p);
      /* a viagem também tem limite por inimigo, para a rodada não travar */
      if(p.trip&&!e.dead&&!e.T.boss&&(e.tripped||0)<3){e.tripT=p.trip;e.tripped=(e.tripped||0)+p.trip}
      if(--p.pierce<=0){p.dead=true;return}
    }
  }
}
function step(dt){
  if(S.over||S.menu||S.paused)return;
  S.time+=dt;
  /* tempo de jogo de verdade: na velocidade ×3 roda 3 passos por quadro, então cada passo vale um terço */
  PROG.est.tempo+=dt/(S.speed||1);
  if(S.abilCd>0)S.abilCd-=dt;
  /* automático: entre rodadas, conta um instante e começa a próxima. Antes era um setTimeout único no fim da rodada, que
     se perdia quando o jogo estava pausado, com menu ou tutorial aberto naquela hora (2026-11-17) */
  if(S.auto&&!S.inRound&&S.round>0){S.autoT=(S.autoT??1.2)-dt/(S.speed||1);if(S.autoT<=0){S.autoT=undefined;startRound();return}}
  if(S.inRound){
    if(S.cessarT>0)S.cessarT-=dt;else S.spawnT+=dt;
    if(S.inicioT>0){S.inicioT-=dt;if(S.inicioT<=0)habEventoTodos('inicio')}
    S.saveT=(S.saveT||0)+dt;if(S.saveT>=5){S.saveT=0;salvaPartida()}
    while(S.queue.length&&S.queue[0].t<=S.spawnT)spawn(S.queue.shift().type,0,S.hpMul);
  }
  for(const e of S.enemies){e.slowVal=e.roubaT>0?.4:0;e.vuln=e.vulnT>0?e.vulnX:1}
  for(const t of S.towers){t.auraMul=1;t.rangeMul=1;t.dmgMul=1;t.pierceAdd=0;t.buffDet=false;if(t.kick>0)t.kick-=dt}
  for(const t of S.towers){
    const s=t.s;if(!s.auraR)continue;
    for(const o of S.towers){
      if(o===t||Math.hypot(o.x-t.x,o.y-t.y)>s.auraR)continue;
      if(s.aura)o.auraMul=Math.max(o.auraMul,1+s.aura);
      if(s.rangeB)o.rangeMul=Math.max(o.rangeMul,1+s.rangeB);
      if(s.dmgB)o.dmgMul=Math.max(o.dmgMul,1+s.dmgB);
      if(s.pierceB)o.pierceAdd=Math.max(o.pierceAdd,s.pierceB);
      if(s.giveDet)o.buffDet=true;
    }
  }
  stepPoderes(dt);
  stepEventos(dt);
  for(const t of S.towers)stepTower(t,dt);
  for(const a of S.allies)stepAlly(a,dt);
  S.allies=S.allies.filter(a=>!a.dead);
  for(const n of S.nukes)stepNuke(n,dt);
  S.nukes=S.nukes.filter(n=>n.t>0);
  for(const f of S.fires)stepFire(f,dt);
  S.fires=S.fires.filter(f=>f.life>0);
  for(const w of S.walls)w.life-=dt;
  S.walls=S.walls.filter(w=>w.life>0);
  for(const e of [...S.enemies]){if(!e.dead)stepEnemy(e,dt);if(S.over)return}
  for(const p of S.shots)stepShot(p,dt);
  stepBalao(dt);
  S.enemies=S.enemies.filter(e=>!e.dead);
  S.shots=S.shots.filter(p=>!p.dead);
  for(const f of S.fx){f.t+=dt;if(f.k==='conf'){f.x+=f.vx*dt;f.y+=f.vy*dt;f.vy+=520*dt}}
  S.fx=S.fx.filter(f=>f.t<(f.d||1));
  for(const f of S.texts){f.t+=dt;f.y-=(f.bubble?8:26)*dt}
  S.texts=S.texts.filter(f=>f.t<(f.bubble?1.9:1.05));
  if(S.bannerT>0)S.bannerT-=dt;
  if(S.shake>0)S.shake-=dt;
  if(S.flash>0)S.flash-=dt;
  if(S.inRound&&!S.queue.length&&!S.enemies.length)endRound();
}
function startRound(){
  if(!S||S.inRound||S.over||S.menu)return;
  S.paused=false;S.vidaIni=S.lives;
  S.round++;S.inicioRodadaT=S.time||0;S.escRod={};
  /* estatística: a partida conta quando a 1ª rodada começa (continuar uma partida salva não conta de novo) */
  if(S.round===1&&!S.contada){S.contada=true;PROG.est.partidas++;somaEst('porMapa',S.uf);somaEst('porLado',S.side)}
  S.inicioT=1.5;/* o gatilho "começo da rodada" dispara 1,5 s depois, quando a marcha já entrou */S.queue=buildRound(S.round);S.spawnT=0;S.inRound=true;
  eventosDaRodada();
  /* no Difícil a vida extra cresce aos poucos: na rodada 1 é igual ao Normal e chega aos 25% a mais na rodada 21.
     Sem isso, a Camisa precisava de 4 panfletos em vez de 3 logo no começo, com um personagem só, e a partida acabava na rodada 7 */
  S.hpMul=(1+Math.max(0,S.round-18)*.05)*vidaDif()*tardio(S.round)*apertoDif(S.round);
  if(S.round===1&&(MAPAS[S.uf].trechos||[]).length&&!DICAS.trechos)dica('trechos','A avenida tem trechos especiais: na ladeira, na geada, no corredor de ônibus e na rodovia a marcha acelera; na subida, na lama e na areia ela anda devagar; no mato alto ela some, e só quem detecta Isentões consegue acertar.');
  else if(S.round===1&&(MAPAS[S.uf].moveis||[]).length&&!DICAS.moveis)dica('moveis','O dirigível e a fumaça passam pelo mapa e tapam a visão de quem está atrás deles enquanto passam. Um personagem no morro enxerga por cima.');
  else if(S.round===1&&MAPAS[S.uf].lotado&&!DICAS.lotado)dica('lotado','Mapa lotado: muitos obstáculos ocupam os bons lugares. Toque neles para ver quanto custa tirar.');
  else if(S.round===1&&MAPAS[S.uf].obst&&MAPAS[S.uf].obst.length&&!DICAS.obstaculo)dica('obstaculo','Este mapa tem '+resumoDinamico(S.uf)+'. Toque num obstáculo para ver quanto custa tirar.');
  else if(S.round===1&&MAPAS[S.uf].tier===4)dica('expert','Mapa Expert: a marcha anda mais rápido e há obras onde não se pode colocar ninguém. Em troca, o prêmio é 50% maior.');
  else if(S.round===1&&S.modo&&S.modo!=='classico')dica('modo_'+S.modo,S.modo==='desafio'?'Desafio do dia: só os 5 personagens sorteados. Enquanto você não perde apoio, a marcha fica mais forte a cada rodada; quando volta a perder, ela alivia um pouco.':'Modo '+nomeModo(S.modo)+': '+(MODOS.find(m=>m[0]===S.modo)||[,,''])[2]);
  /* quem já tinha visto o tutorial antes dos passos novos recebe um aviso, uma vez só */
  else if(S.round===1&&tutoVisto()&&!DICAS.tutoNovo)dica('tutoNovo','O tutorial agora tem 3 partes: o básico, heróis e especiais, e mapas, modos e loja. Veja qualquer uma em Menu → Como jogar.');
  if(!S.placing)renderPanel();
  syncHud();
}
const REFORCO_LARGADA=[0,200,200,200,200];
function endRound(){
  S.inRound=false;S.allies=[];S.walls=[];S.fires=[];S.nukes=[];fimEventos();
  /* poderes de verba: fim de rodada multiplicado e o retorno do que foi investido */
  let inc=Math.round((150+S.round*12)*(S.rodadaX||1)),reg=0;S.rodadaX=0;
  /* a partida começa com pouca verba (R$ 300) e recebe um reforço nas 4 primeiras rodadas: com o robô, o Difícil
     ficou igual ao de antes (5 de 12, começando com R$ 1.000); sem o reforço, quase toda partida acabava na rodada 8 */
  inc+=REFORCO_LARGADA[S.round]||0;
  if(S.investe){inc+=S.investe;S.investe=0}
  for(const t of S.towers){
    if(t.s.income){inc+=t.s.income;float(t.x,t.y-44,'+R$ '+t.s.income,'#b6ffb0')}
    if(t.s.regen)reg+=t.s.regen;
    if(t.s.teto){
      /* cofre dos Empresários: aporte fixo + juros sobre o que ficou guardado */
      const antes=t.caixa||0,depois=Math.min(t.s.teto,Math.round(antes*(1+t.s.juros)+t.s.aporte));
      t.caixa=depois;
      if(t.s.autoSaque){inc+=depois;t.caixa=0;float(t.x,t.y-60,'+R$ '+depois,'#b6ffb0')}
      else if(depois>antes)float(t.x,t.y-60,'+R$ '+(depois-antes)+' no cofre','#b6ffb0');
    }
  }
  if(S.lives>=S.vidaIni)S.limpas++;
  ajustaPressao();
  /* parte 2 do tutorial: no fim da rodada 3, quando o básico já foi visto */
  if(S.round===3)setTimeout(()=>tutoAuto(1),700);
  /* modo livre: a rodada 50 (e a 75) vale na hora, sem precisar perder para a medalha aparecer */
  medalhaNoJogo({livre:S.livre?S.round:0});
  habEventoTodos('fim');
  for(const t of S.towers)if(t.T.only)ganhaXP(t,XP_RODADA);
  S.cash+=inc;S.ganho+=inc;S.lives=Math.min(S.d.lives+60,S.lives+reg);
  regRodada(inc);
  if(S.sel&&S.sel.s.teto)renderPanel();
  /* Voto Popular: apuração nas rodadas 10, 20 e 30; na 40, precisa de mais da metade */
  if(S.modo==='voto'&&!S.livre&&S.round%10===0){
    const p=pctVotos();if(S.round<40)S.votoMin=Math.min(S.votoMin??100,p);
    if(S.round<40&&p<50){S.motivo=`Na apuração da rodada ${S.round} você tinha só ${fmtPct(p)} dos votos.`;endGame(false);return}
    if(S.round>=40&&p<=50){S.motivo=`Na apuração final você ficou com ${fmtPct(p)} dos votos, e precisava de mais da metade.`;endGame(false);return}
    if(S.round<40)banner(`Apuração da rodada ${S.round}: ${fmtPct(p)} dos votos`);
  }
  if(S.modo==='zero')medalhaNoJogo({zero:S.round});
  if(S.round>=40&&!S.livre){endGame(true);return}
  salvaPartida();salvaProg();
  banner('Rodada '+S.round+' encerrada. +R$ '+inc);
  /* avenida extra abrindo na próxima rodada: avisa já, para dar tempo de se preparar */
  {const ex=viasExtras(MAPAS[S.uf]);if(!S.livre&&ex.length&&Math.min(ex.length,extrasAbertas(S.round+1))>Math.min(ex.length,extrasAbertas(S.round))){
    banner('Na próxima rodada abre mais uma avenida!');dica('avenida_abre','As avenidas extras abrem aos poucos: até a rodada 10 a marcha vem só pela principal, na 11 abre a segunda e na 21 a terceira. As setas brancas mostram por onde ela vai chegar.')}}
  dica('salvo','A partida fica salva sozinha. Se fechar o jogo, é só tocar em Continuar no menu.');
  if(!liberaTudo()){const nov=INICIAIS[S.side].find(x=>x[1]===S.round+1&&!PROG.donos[x[0]]);if(nov)banner(TOWERS[nov[0]].nome+' liberado!')}
  if(!S.placing)renderPanel();
  syncHud();
  S.autoT=1.2;
}
function endGame(won){
  S.over=true;S.won=won;apagaPartida();
  /* registro: a rodada em que acabou (se acabou no meio dela) e o resultado */
  if(S.reg&&S.inRound)regRodada(0);
  regFim(S.livre?'fimModoLivre':won?'vitoria':'derrota');
  if(!S.livre){if(won)PROG.est.vitorias++;else PROG.est.derrotas++;salvaProg()}
  const c=cfg(),rival=ENEMY[c.boss[40][0]].nome;
  if(S.livre){
    /* fim do modo livre: a vitória já foi contada, aqui só vale o recorde */
    const antes=PROG.recorde||0;PROG.recorde=Math.max(antes,S.round);
    const novas=checaMedalhas({livre:S.round});salvaProg();
    showOverlay(`<h2>Fim do modo livre</h2><p>Você aguentou até a rodada ${S.round}.${S.round>antes?' É o seu novo recorde!':' Seu recorde continua na rodada '+antes+'.'}</p>${resumoHtml()}${medalhasHtml(novas)}`);
    return;
  }
  let premio='',novas=[];
  if(won){
    /* prêmio: dificuldade × dificuldade do mapa × modo, mais o do estado novo e o do desafio do dia */
    const nova=!PROG.faixas[S.uf],desafioNovo=S.modo==='desafio'&&S.desafioDia&&PROG.desafio!==S.desafioDia,primeiroMapa=!liberaTudo();
    const ganho=premioPartida(S.diff,S.uf,S.modo)+(nova?PREMIO_ESTADO:0)+(desafioNovo?300:0);
    PROG.fundo+=ganho;PROG.faixas[S.uf]=Math.max(PROG.faixas[S.uf]||0,{facil:1,normal:2,dificil:3}[S.diff]);
    (PROG.difs[S.uf]=PROG.difs[S.uf]||{})[S.diff]=1;
    PROG.lados[S.side]=1;if(desafioNovo)PROG.desafio=S.desafioDia;
    novas=checaMedalhas({venceu:true});salvaProg();
    premio=`<p class="fundo">Você ganhou <b>F$ ${ganho}</b> para usar na loja${desafioNovo?', com o bônus do desafio do dia':''}.</p>`+(nova?`<div class="faixaGanha"><canvas data-fx="${S.uf}"></canvas><span>Nova faixa: ${MAPAS[S.uf].nome}!</span></div>`:'')
      +(primeiroMapa?`<p class="fundo"><b>Primeiro mapa vencido!</b> De agora em diante, todos os personagens iniciais ficam liberados desde a rodada 1.</p>`:'');
  }
  /* na derrota também contam as medalhas de soma (convencidos, partidas jogadas) */
  else novas=checaMedalhas({});
  showOverlay(won?`<h2>Debate vencido!</h2><p>Você defendeu ${c.goal} nas 40 rodadas e ${rival} perdeu o debate na dificuldade ${S.d.nome}.</p>${premio}${resumoHtml()}${medalhasHtml(novas)}
      <div class="livreBox"><p>Quer ver até onde aguenta? No modo livre as rodadas continuam, cada vez mais difíceis, e vale recorde${PROG.recorde?' (o seu é a rodada '+PROG.recorde+')':''}.</p><button class="hb" id="btLivre">Continuar no modo livre</button></div>`
    :`<h2>Fim de papo</h2><p>${S.motivo||`O apoio popular acabou na rodada ${S.round}.`} Reforce a militância e tente de novo.</p>${resumoHtml()}${medalhasHtml(novas)}`);
}
/* números da partida, mostrados na tela de vitória ou derrota */
function resumoHtml(){
  const top=S.towers.slice().sort((a,b)=>(b.kills||0)-(a.kills||0))[0],br=v=>Math.round(v).toLocaleString('pt-BR');
  const itens=[[br(S.conv),'convencidos'],['R$ '+br(S.ganho),'verba ganha'],[S.limpas+' de '+S.round,'rodadas sem perder apoio']];
  if(top&&top.kills)itens.unshift([top.look.nome||top.T.nome,'quem mais convenceu ('+br(top.kills)+')']);
  return `<div class="resumo">${itens.map(([v,l])=>`<div><b>${v}</b><small>${l}</small></div>`).join('')}</div>`;
}
/* depois de vencer as 40 rodadas, dá para seguir jogando sem limite */
function continuaLivre(){
  if(!S||!S.over||!S.won||S.livre||S.menu||S.round<40)return;
  S.over=false;S.won=false;S.livre=true;menuMsg='';
  $('overlay').classList.add('hide');
  banner('Modo livre: até onde você aguenta?');renderPanel();syncHud();
}
/* ---------- medalhas: conquistas além das faixas, cada uma com prêmio em F$ ---------- */
var MEDALHAS=[
  {id:'primeira',nome:'Primeiro debate',desc:'Vencer uma partida.',premio:100,ok:x=>x.venceu},
  {id:'poder',nome:'Poder liberado',desc:'Usar um poder especial.',premio:100,ok:x=>x.poder},
  {id:'semperder',nome:'Ninguém passou',desc:'Vencer sem perder nenhum apoio.',premio:400,ok:x=>x.venceu&&!S.perdeu},
  {id:'sogratis',nome:'Só com a base',desc:'Vencer usando só os personagens gratuitos do seu lado.',premio:300,ok:x=>x.venceu&&!S.usouLoja},
  {id:'doislados',nome:'Dos dois lados',desc:'Vencer pelo menos uma vez com cada lado.',premio:300,ok:()=>PROG.lados.pt&&PROG.lados.br},
  {id:'dificil',nome:'Debate duro',desc:'Vencer no Difícil.',premio:600,ok:x=>x.venceu&&S.diff==='dificil'},
  {id:'regiao',nome:'Dono da região',desc:'Ganhar as faixas de todos os estados de uma região.',premio:500,ok:()=>REGIOES.some(([,l])=>l.every(u=>PROG.faixas[u]))},
  {id:'livre50',nome:'Fôlego de sobra',desc:'Chegar à rodada 50 no modo livre.',premio:500,ok:x=>(x.livre||0)>=50},
  {id:'turbo',nome:'Pé no acelerador',desc:'Vencer no modo Turbo.',premio:400,ok:x=>x.venceu&&S.modo==='turbo'},
  {id:'semvender',nome:'Sem arrependimento',desc:'Vencer no modo Sem vender.',premio:300,ok:x=>x.venceu&&S.modo==='semvender'},
  {id:'desafio',nome:'Desafio cumprido',desc:'Vencer um desafio do dia.',premio:300,ok:x=>x.venceu&&S.modo==='desafio'},
  {id:'expert',nome:'Terreno difícil',desc:'Vencer num mapa Expert.',premio:400,ok:x=>x.venceu&&MAPAS[S.uf].tier===4},
  {id:'brasil',nome:'Brasil inteiro',desc:'Ganhar as faixas dos 27 estados.',premio:2000,ok:()=>ESTADOS.every(e=>PROG.faixas[e[0]]),prog:()=>[ESTADOS.filter(e=>PROG.faixas[e[0]]).length,27]},
  /* novas (2026-11-12) */
  {id:'porumfio',nome:'Por um fio',desc:'Vencer com 10 de apoio ou menos.',premio:300,ok:x=>x.venceu&&S.lives<=10},
  {id:'evo3',nome:'No topo',desc:'Levar um personagem à 3ª evolução de um caminho.',premio:150,ok:()=>S&&!S.menu&&S.towers.some(t=>t.a>=3||t.b>=3)},
  {id:'lotou',nome:'Avenida lotada',desc:'Ter 20 personagens no mapa ao mesmo tempo.',premio:250,ok:()=>S&&!S.menu&&S.towers.length>=20},
  /* nível 8 (era 10): com a experiência dobrando a cada nível, o 10 ficou fora de alcance numa partida normal */
  {id:'heroi10',nome:'Lenda viva',desc:'Levar o herói ao nível 8.',premio:400,ok:()=>S&&!S.menu&&S.towers.some(t=>t.T.only&&(t.nivel||1)>=8)},
  {id:'cofre',nome:'Cofre cheio',desc:'Juntar R$ 20.000 de verba numa partida.',premio:300,ok:()=>S&&!S.menu&&S.cash>=20000},
  {id:'especiais10',nome:'Mestre dos especiais',desc:'Usar 10 poderes especiais na mesma partida.',premio:250,ok:()=>S&&(S.poderesN||0)>=10},
  {id:'limpeza',nome:'Área limpa',desc:'Tirar 3 obstáculos na mesma partida.',premio:200,ok:()=>S&&(S.removidos||[]).length>=3},
  {id:'conv1k',nome:'Mil convencidos',desc:'Convencer 1.000 adversários, somando todas as partidas.',premio:200,ok:()=>PROG.est.conv>=1000,prog:()=>[PROG.est.conv,1000]},
  {id:'conv25k',nome:'Multidão convencida',desc:'Convencer 25.000 adversários, somando todas as partidas.',premio:800,ok:()=>PROG.est.conv>=25000,prog:()=>[PROG.est.conv,25000]},
  {id:'vit10',nome:'Veterano das ruas',desc:'Vencer 10 partidas.',premio:500,ok:()=>PROG.est.vitorias>=10,prog:()=>[PROG.est.vitorias,10]},
  {id:'part25',nome:'Sempre na rua',desc:'Jogar 25 partidas.',premio:300,ok:()=>PROG.est.partidas>=25,prog:()=>[PROG.est.partidas,25]},
  {id:'cincoreg',nome:'De norte a sul',desc:'Ganhar a faixa de pelo menos um estado em cada uma das 5 regiões.',premio:500,ok:()=>REGIOES.every(([,l])=>l.some(u=>PROG.faixas[u])),prog:()=>[REGIOES.filter(([,l])=>l.some(u=>PROG.faixas[u])).length,5]},
  {id:'ouro10',nome:'Faixas de ouro',desc:'Ganhar a faixa no Difícil em 10 estados.',premio:800,ok:()=>Object.values(PROG.faixas).filter(v=>v>=3).length>=10,prog:()=>[Object.values(PROG.faixas).filter(v=>v>=3).length,10]},
  {id:'expertdif',nome:'Sem medo de nada',desc:'Vencer num mapa Expert no Difícil.',premio:800,ok:x=>x.venceu&&MAPAS[S.uf].tier===4&&S.diff==='dificil'},
  {id:'livre75',nome:'Maratona',desc:'Chegar à rodada 75 no modo livre.',premio:800,ok:x=>(x.livre||0)>=75},
  /* conquistas dos modos novos */
  {id:'voto_vence',nome:'Eleito pelo povo',desc:'Vencer no modo Voto Popular.',premio:400,ok:x=>x.venceu&&S.modo==='voto'},
  {id:'voto_lavada',nome:'Lavada nas urnas',desc:'Vencer no Voto Popular com 97% dos votos ou mais.',premio:600,ok:x=>x.venceu&&S.modo==='voto'&&pctVotos()>=97},
  {id:'voto_virada',nome:'Virada na apuração',desc:'Vencer no Voto Popular depois de ter menos de 60% dos votos numa apuração.',premio:600,ok:x=>x.venceu&&S.modo==='voto'&&(S.votoMin??100)<60},
  {id:'voto_dificil',nome:'Voto no Difícil',desc:'Vencer no Voto Popular no Difícil.',premio:800,ok:x=>x.venceu&&S.modo==='voto'&&S.diff==='dificil'},
  {id:'teto_vence',nome:'Contas em dia',desc:'Vencer no modo Teto de Gastos.',premio:400,ok:x=>x.venceu&&S.modo==='teto'},
  {id:'teto_enxuto',nome:'Gabinete enxuto',desc:'Vencer no Teto de Gastos com 6 personagens ou menos no mapa.',premio:700,ok:x=>x.venceu&&S.modo==='teto'&&S.towers.length<=6},
  {id:'zero_20',nome:'Ninguém passa',desc:'Chegar ao fim da rodada 20 no Tolerância Zero.',premio:300,ok:x=>S&&S.modo==='zero'&&((x.zero||0)>=20||(x.venceu&&S.round>=20))},
  {id:'zero_vence',nome:'Muralha',desc:'Vencer no modo Tolerância Zero.',premio:800,ok:x=>x.venceu&&S.modo==='zero'},
  {id:'zero_dificil',nome:'Perfeição',desc:'Vencer no Tolerância Zero no Difícil.',premio:1500,ok:x=>x.venceu&&S.modo==='zero'&&S.diff==='dificil'},
  {id:'tresdif',nome:'Faixa completa',desc:'Vencer o mesmo estado no Fácil, no Normal e no Difícil.',premio:400,ok:()=>Object.values(PROG.difs||{}).some(d=>d.facil&&d.normal&&d.dificil)},
  {id:'colecao',nome:'Elenco completo',desc:'Ter todos os personagens da loja de um dos lados.',premio:1000,ok:()=>['pt','br'].some(s=>SIDES[s].order.every(k=>TOWERS[k].exclusivo||INICIAIS[s].some(i=>i[0]===k)||PROG.donos[k]))},
];
/* as medalhas rendem a metade do que estava escrito em cada uma (pedido do jogador, 2026-11-17) */
for(const m of MEDALHAS)m.premio=Math.round(m.premio/2);
function checaMedalhas(x){
  const novas=[];
  for(const m of MEDALHAS){let ok=false;try{ok=!PROG.medalhas[m.id]&&m.ok(x||{})}catch(e){}if(ok){PROG.medalhas[m.id]=1;PROG.fundo+=m.premio;novas.push(m)}}
  if(novas.length)salvaProg();
  return novas;
}
/* medalhas que podem chegar no meio da partida (evolução, rodada, especial...): avisa na hora com um banner */
function medalhaNoJogo(x){if(!S||S.menu||S.restaurando||window.Robo)return;for(const m of checaMedalhas(x))banner('Medalha: '+m.nome+' (+F$ '+m.premio+')')}
let avisoMedalhas=[];
function medalhasHtml(novas){
  if(!novas.length)return '';
  return `<div class="medNovas"><b>Medalhas novas</b>${novas.map(m=>`<span>🏅 ${m.nome} <em>+F$ ${m.premio.toLocaleString('pt-BR')}</em></span>`).join('')}</div>`;
}
/* poder próprio do herói em campo (botão ★ e tecla F). O nome fazOL ficou porque o robô de teste chama esta função.
   Nos níveis 3, 7 e 10 o dano cresce 30% a cada marco (e a duração, 10%); a última evolução de Lula e Bolsonaro dobra o dano (abilPot) */
const marcosHeroi=t=>[3,7,10].filter(m=>(t.nivel||1)>=m).length;
/* o poder do herói só é liberado no nível máximo (2026-11-17, pedido do jogador) */
const NIVEL_PODER=10,poderLiberado=t=>!!t&&(t.nivel||1)>=NIVEL_PODER;
function fazOL(){
  const l=heroiEmCampo(),P=l&&HEROI_PODER[l.key];
  if(!l||!P||!poderLiberado(l)||S.abilCd>0||S.over||S.menu||S.paused||l.stun>0)return;
  const m=marcosHeroi(l),pot=(l.s.abilPot||1)*Math.pow(1.3,m);
  S.abilCd=l.s.abilCd||45;S.flash=.35;banner(P[0].toUpperCase()+'!');beep(660,.35,'triangle',.18);
  regEv('poderHeroi',{k:l.key,nome:P[0],nivelHeroi:l.nivel||1,naAvenida:S.enemies.length,chefao:S.enemies.some(e=>e.T.boss)});
  for(const ef of P[2]){const e2={...ef};if(e2.dmg)e2.dmg*=pot;if(e2.k==='onda')e2.x*=pot;if(e2.t)e2.t*=1+.1*m;EFEITOS[e2.k](l,e2);fxPoder(l,e2)}
  S.fx.push({k:'ring',x:l.x,y:l.y,r:80,c:'#ffe27a',t:0,d:.6});float(l.x,l.y-84,P[0]+'!','#ffe27a');
  habEventoTodos('heroi');
}

/* ---------- compra ---------- */
function validSpot(x,y,ign){
  if(x<18||x>W-18||y<26||y>H-14||inLake(x,y)||inStage(x,y)||distPath(x,y)<38||obraEm(x,y)||obstEm(x,y)||predioEm(x,y)||naEnchente(x,y)||naRioBalsa(x,y))return false;
  return !S.towers.some(t=>t!==ign&&Math.hypot(t.x-x,t.y-y)<36);
}
/* renda passiva das evoluções (verba por rodada, aporte e cofre dos Empresários, habilidades de verba) vale RENDA_EVO
   do número escrito na evolução original; os textos são reescritos com o valor certo em ajustaTextosRenda (2026-11-12) */
const RENDA_EVO=.35;
const rendaRedonda=v=>Math.max(10,Math.round(v*RENDA_EVO/10)*10);
function calcStats(t){
  const s={...t.T.base};
  for(let i=0;i<t.a;i++)t.T.up[0][i].f(s);
  for(let i=0;i<t.b;i++)t.T.up[1][i].f(s);
  if(s.income)s.income=rendaRedonda(s.income);
  if(s.aporte)s.aporte=rendaRedonda(s.aporte);
  if(s.teto)s.teto=Math.max(500,Math.round(s.teto*RENDA_EVO/100)*100);
  /* herói: cada nível dá mais argumento, velocidade e alcance; nos níveis 3, 7 e 10 o poder dele fica mais forte */
  if(t.T.only){
    const n=t.nivel||1,marcos=[3,7,10].filter(m=>n>=m).length;
    s.dmg=(s.dmg||0)*(1+.08*(n-1));s.rate=(s.rate||1)*Math.pow(.97,n-1);s.range=(s.range||0)*(1+.02*(n-1));
    if(s.abilCd)s.abilCd=Math.max(12,s.abilCd-3*marcos);
  }
  t.s=s;t.look=buildLook(t);t.habs=habsDe(t);
}
/* experiência do herói: XP_CONV por adversário que ele convence e XP_RODADA por rodada em campo.
   A experiência que falta para o próximo nível dobra a cada nível: 20, 40, 80, 160... (total de 10.220 para o nível 10).
   Antes (1 por convencido, 8 por rodada e 20, 30, 40... por nível) o herói entrava na rodada 18 e chegava ao nível 10
   entre as rodadas 22 e 32; agora termina a partida por volta do nível 6 ou 7 (2026-11-12) */
const XP_CONV=.4,XP_RODADA=4,XP_PRIMEIRO=20;
const XP_NIVEL=(()=>{const a=[0];for(let k=1;k<10;k++)a.push(a[k-1]+XP_PRIMEIRO*2**(k-1));return a})();
function nivelDoXP(xp){let n=1;while(n<10&&xp>=XP_NIVEL[n])n++;return n}
function ganhaXP(t,v){
  if(!t||!t.T||!t.T.only)return;
  const antes=t.nivel||1;t.xp=(t.xp||0)+v;const n=nivelDoXP(t.xp);
  if(n>antes){
    t.nivel=n;calcStats(t);float(t.x,t.y-84,'Nível '+n+'!','#ffe27a');if(n>=8)medalhaNoJogo({});
    dica('nivel','O herói sobe de nível convencendo adversários e a cada rodada. Cada nível deixa ele mais forte, e no nível 10 (o máximo) ele libera o poder próprio.');
    banner(n>=NIVEL_PODER?t.T.nome+' chegou ao nível máximo: poder '+nomePoderHeroi(t.key)+' liberado (★)!':t.T.nome+' subiu para o nível '+n);
    if(S.sel===t)renderPanel();
  }
}
function place(key,x,y){
  const T=TOWERS[key],c=price(T.cost);
  /* partida salva de antes de os presidentes virarem heróis pode ter mais de um: ao continuar, ninguém some */
  if(S.cash<c||!validSpot(x,y)||(T.only&&!S.restaurando&&heroiEmCampo()))return null;
  if(S.modo==='teto'&&S.towers.length>=TETO_PERS){float(x,y-40,'Teto de gastos: no máximo '+TETO_PERS,'#ffd9a0');return null}
  S.cash-=c;
  if(!INICIAIS[S.side].some(i=>i[0]===key))S.usouLoja=true;
  const t={id:++uid,key,T,x,y,a:0,b:0,cd:0,aim:-1.1,stun:0,mode:'first',spent:c,auraMul:1,rangeMul:1,dmgMul:1,pierceAdd:0,buffDet:false,kills:0,kick:0};
  calcStats(t);S.towers.push(t);beep(420,.07,'triangle',.06);
  if(!S.restaurando&&!S.menu){somaEst('colocados',key);S.ultima={tipo:'torre',t,custo:c,rodada:S.round};
    regEv('colocar',{id:t.id,k:key,x:Math.round(x),y:Math.round(y),custo:c,distAvenida:Math.round(distPath(x,y)),pontoDaAvenida:+(nearestD(x,y)/LEN).toFixed(3),morro:noMorro(x,y),emRodada:!!S.inRound})}
  if(noMorro(x,y)){float(x,y-58,'No alto: +15% de alcance','#ffe27a');dica('morro','No morro, o personagem enxerga 15% mais longe e por cima dos prédios.')}
  if(t.s.pet){t.petO=petOff(x,y);S.fx.push({k:'ring',x:x+t.petO,y:y-10,r:34,c:'#f28a1e',t:0,d:.4});float(x+t.petO,y-58,(t.s.petNome||'Xuxucão')+'!','#ffd9a0')}
  medalhaNoJogo({});
  /* herói colocado: sai do modo de colocar (o Shift não continua colocando mais um) */
  if(T.only&&S.placing===key)S.placing=null;
  syncHud();
  return t;
}
function canUp(t,p){
  const cur=p?t.b:t.a,oth=p?t.a:t.b;
  if(cur>=3)return 'max';
  if(cur>=1&&oth>=2)return 'lock';
  if(cur+1>=2&&oth>=2)return 'lock';
  return 'ok';
}
function buyUp(t,p){
  if(canUp(t,p)!=='ok')return;
  const u=t.T.up[p][p?t.b:t.a],c=price(u.c);
  if(S.cash<c)return;
  S.cash-=c;t.spent+=c;if(p)t.b++;else t.a++;
  S.ultima={tipo:'evo',t,p,custo:c,rodada:S.round};
  regEv('evoluir',{id:t.id,k:t.key,caminho:p+1,nivel:p?t.b:t.a,a:t.a,b:t.b,nome:u.n,custo:c,emRodada:!!S.inRound});
  calcStats(t);if(temPoder(t))dica('especial',`${t.look.nome||t.T.nome} ganhou o especial ${nomePoder(t)}. Use pelo botão ⚡ no canto do mapa ou pela tecla Q.`);t.puloAte=performance.now()+350;S.fx.push({k:'brilho',x:t.x,y:t.y-24,t:0,d:.6,t0:performance.now()});beep(700,.1,'triangle',.08);medalhaNoJogo({});renderPanel();syncHud();
}
function podeEvoluir(t){
  for(const p of [0,1]){if(canUp(t,p)!=='ok')continue;if(S.cash>=price(t.T.up[p][p?t.b:t.a].c))return true}
  return false;
}
function setaEvo(c,t){
  const x=t.x+15,y=t.y-58+Math.sin(S.time*5+t.id)*2;
  c.fillStyle='#1d1a16';disc(c,x,y,7.6);c.fillStyle='#35c46b';disc(c,x,y,6.2);
  c.fillStyle='#fff';c.beginPath();c.moveTo(x,y-4.4);c.lineTo(x+4,y+.4);c.lineTo(x+1.5,y+.4);c.lineTo(x+1.5,y+4);c.lineTo(x-1.5,y+4);c.lineTo(x-1.5,y+.4);c.lineTo(x-4,y+.4);c.closePath();c.fill();
}
/* ---------- poder especial: cada personagem que chega à 3ª evolução ganha o seu, único ----------
   Cada linha: nome, o que faz (texto do jogo), recarga em segundos e a lista de efeitos.
   area: 'tela' = avenida inteira; 0 = alcance do personagem. Chefões sofrem só uma parte dos efeitos de parar e cortar. */
const PODERES={
  /* esquerda */
  militante:['Panfletaço','Por 8 s, panfleta 3 vezes mais rápido.',45,[{k:'buff',vel:3,t:8}]],
  janones:['Live Bombando','Por 8 s, quem está no alcance do buff ataca 2 vezes mais rápido.',55,[{k:'buff',area:1,vel:2,t:8}]],
  marx:['Mais-Valia','Por 15 s, cada adversário convencido rende R$ 6 a mais.',55,[{k:'bonus',v:6,t:15}]],
  dilma:['Ventania','Empurra toda a marcha da avenida para trás. Chefões quase não saem do lugar.',55,[{k:'empurra',area:'tela',d:260}]],
  churras:['Rodízio Liberado','Quem está no alcance para 4 s para comer.',50,[{k:'parar',area:0,t:4,m:'Nhac!'}]],
  sindicato:['Greve Geral','Por 8 s, quem está perto do prédio tira o dobro de argumento.',55,[{k:'buff',area:1,dano:2,t:8}]],
  haddad:['Taxação Total','Rende na hora R$ 25 por adversário na avenida.',60,[{k:'verbaInim',por:25}]],
  lenin:['Revolução de Outubro','Convence na hora os 10 adversários mais fracos da avenida (chefões não).',60,[{k:'convence',n:10,area:'tela'}]],
  stalin:['Bomba Tsar','Uma bomba gigante cai onde a marcha está mais cheia.',75,[{k:'bomba',n:1,dmg:400,r:170}]],
  janja:['Comitiva Presidencial','Por 10 s, arremessa 2 vezes mais rápido e cobre uma área 30% maior.',55,[{k:'buff',vel:2,alc:1.3,t:10}]],
  xandao:['Censura Geral','Censura a avenida inteira: todos ficam parados 3,5 s (chefões, 1 s).',65,[{k:'parar',area:'tela',t:3.5,m:'censor'}]],
  dino:['Liminar','Para o adversário mais resistente da avenida por 6 s, mesmo chefão (aí são 2 s).',50,[{k:'pararForte',n:1,t:6,m:'Liminar!'}]],
  fux:['In Fux We Trust','Todos na avenida perdem 25% do argumento que ainda têm (chefões, 8%).',60,[{k:'corta',area:'tela',pct:.25}]],
  fachin:['Relatoria','Por 12 s, quem está no alcance fica 60% mais fácil de convencer.',50,[{k:'vuln',area:0,x:1.6,t:12}]],
  zanin:['Habeas Corpus','Recupera 20 de apoio popular.',70,[{k:'vida',v:20}]],
  carmen:['Cala a Boca','Quem está no alcance fica calado e parado por 5 s.',55,[{k:'parar',area:0,t:5,m:'Calado!'}]],
  gilmar:['Trânsito em Julgado','Por 10 s, quem está no alcance anda pela metade da velocidade.',45,[{k:'lento',area:0,t:10}]],
  toffoli:['Anulação','Anula os 5 adversários comuns mais adiantados no alcance: são convencidos na hora.',60,[{k:'convence',n:5,area:0,frente:1}]],
  che:['Guerrilha','14 ataques-surpresa em adversários espalhados pela avenida, 25 de argumento cada.',50,[{k:'chuva',n:14,dmg:25}]],
  mussolini:['Discurso da Sacada','Quem está no alcance para 3 s para ouvir e fica 30% mais fácil de convencer por 8 s.',55,[{k:'parar',area:0,t:3,m:'Ouvindo...'},{k:'vuln',area:0,x:1.3,t:8}]],
  putin:['Inverno Russo','Por 10 s, a avenida inteira congela e a marcha anda pela metade.',60,[{k:'lento',area:'tela',t:10}]],
  xi:['Exército de Terracota','Invoca 4 levas de robôs de uma vez.',60,[{k:'invoca',n:4}]],
  maduro:['Hiperinflação','Quem está no alcance perde 35% do argumento que ainda tem (chefões, 10%).',50,[{k:'corta',area:0,pct:.35}]],
  abbas:['Cessar-Fogo','A marcha para de chegar por 8 s, e quem já está na avenida para 1,5 s.',65,[{k:'cessar',t:8},{k:'parar',area:'tela',t:1.5,m:'Trégua'}]],
  artista:['Incêndio Cultural','7 árvores pegam fogo ao longo da avenida, na frente da marcha.',55,[{k:'fogo',n:7,dmg:6,vida:7}]],
  marina:['Era dos Dinossauros','Invoca 3 levas de dinossauros de uma vez.',60,[{k:'invoca',n:3}]],
  pabllo:['Fogo no Palco','Por 8 s, cospe fogo 2 vezes mais rápido e tira 50% a mais.',50,[{k:'buff',vel:2,dano:1.5,t:8}]],
  anitta:['Envolver','Todo mundo no alcance para de andar para dançar por 4 s.',50,[{k:'parar',area:0,t:4,m:'dance'}]],
  xuxa:['Xou da Xuxa','16 bonecas caem do céu em adversários pela avenida, 22 de argumento cada.',55,[{k:'chuva',n:16,dmg:22}]],
  datena:['Cadeirada Geral','8 cadeiradas em adversários espalhados: 40 de argumento e 1,5 s tonto cada.',55,[{k:'chuva',n:8,dmg:40,st:1.5,m:'chair'}]],
  renan:['Cogumelo Mágico','Quem está no alcance fica viajando e anda para trás por 4 s.',55,[{k:'trip',area:0,t:4}]],
  kim:['Projeto Aprovado','Por 10 s, todos os seus personagens tiram 30% a mais de argumento.',60,[{k:'buffTodos',dano:1.3,t:10}]],
  zapata:['Terra e Liberdade','Solta 6 camponeses de uma vez pela avenida, mais fortes que o normal.',50,[{k:'bois',n:6}]],
  owen:['Cooperativa','Por 10 s, todos os seus personagens atacam 25% mais rápido e tiram 25% a mais.',65,[{k:'buffTodos',vel:1.25,dano:1.25,t:10}]],
  prestes:['Coluna Prestes','Por 10 s, o tanque alcança 50% mais longe e tira o dobro.',55,[{k:'buff',alc:1.5,dano:2,t:10}]],
  arouca:['SUS para Todos','Recupera 12 de apoio e destrava todos os seus personagens que estavam parados.',60,[{k:'vida',v:12},{k:'destrava'}]],
  rosa:['Greve de Massas','Por 8 s, todos os seus personagens atacam 50% mais rápido.',60,[{k:'buffTodos',vel:1.5,t:8}]],
  goldman:['Anarquia','Todo mundo na avenida se perde e anda para trás por 2 s (chefões não).',55,[{k:'trip',area:'tela',t:2}]],
  helder:['Conversão','Convence na hora todos os adversários comuns que estão no alcance.',65,[{k:'convence',n:99,area:0}]],
  /* heróis (2026-11-13): especial no botão, como os outros, um por caminho; o poder próprio do herói fica no botão ★ */
  lula:['Churrascão do Povo','A avenida inteira para 3 s para comer picanha (chefões, 1 s) e fica 40% mais fácil de convencer por 8 s.',60,[{k:'parar',area:'tela',t:3,m:'Picanha!'},{k:'vuln',area:'tela',x:1.4,t:8}]],
  vampirao:['Sugada Final','Suga 25% do argumento de todos na avenida (chefões, 5%) e transforma em verba.',60,[{k:'drena',pct:.25}]],
  /* direita */
  /* 6× e 40 s (eram 4× e 45 s): com 4×, o Patriota rendia bem menos que o Panfletaço do Militante, o espelho dele na esquerda */
  bolsonaro:['Imbrochável','Por 10 s, todos os seus personagens atacam 40% mais rápido e tiram 30% a mais.',60,[{k:'buffTodos',vel:1.4,dano:1.3,t:10}]],
  patriota:['Corrente do Zap','Acerta de uma vez todo mundo no alcance, com 6 vezes o argumento.',40,[{k:'leque',x:6}]],
  nikolas:['Vídeo Viral','Todo mundo na avenida para 2,5 s para assistir (chefões, 0,8 s).',60,[{k:'parar',area:'tela',t:2.5,m:'Assistindo'}]],
  agro:['Estouro da Boiada','Solta 8 bois de uma vez pela avenida, mais fortes que o normal.',50,[{k:'bois',n:8}]],
  pavanato:['Viralizou no Feed','Por 10 s, todos na avenida ficam 50% mais fáceis de convencer.',60,[{k:'vuln',area:'tela',x:1.5,t:10}]],
  caminhoneiro:['Greve dos Caminhoneiros','Atravessa 4 caminhões na avenida, que seguram a marcha por 6 s.',60,[{k:'muro',n:4,vida:6}]],
  flavio:['Bancada em Peso','Por 8 s, arremessa 2,5 vezes mais argumento.',50,[{k:'buff',dano:2.5,t:8}]],
  empresario:['Safra Recorde','Rende na hora 3 vezes a verba de um fim de rodada.',70,[{k:'verbaRodada',x:3}]],
  empresarios:['Juros Compostos','Rende na hora 4 vezes o aporte do cofre.',60,[{k:'verbaAporte',x:4}]],
  miliciano:['Tomada do Território','Por 8 s, o tanque atira 2 vezes mais rápido e tira o dobro.',60,[{k:'buff',vel:2,dano:2,t:8}]],
  veio:['Black Friday','Rende R$ 10 por adversário na avenida, e todos andam pela metade por 6 s.',60,[{k:'verbaInim',por:10},{k:'lento',area:'tela',t:6}]],
  trump:['O Muro','Levanta 3 muros grandes na avenida, que seguram a marcha por 10 s.',65,[{k:'muro',n:3,vida:10}]],
  milei:['Motosserra Total','Passa a motosserra em todo mundo no alcance, com 6 vezes o argumento.',50,[{k:'leque',x:6}]],
  bukele:['Megapresídio','Prende por 8 s os 12 adversários comuns mais resistentes da avenida.',60,[{k:'pararForte',n:12,t:8,m:'jail',semChefe:1}]],
  musk:['Chuva de Teslas','10 carros caem do céu em adversários pela avenida, 45 de argumento cada.',55,[{k:'chuva',n:10,dmg:45}]],
  marcal:['Curso Relâmpago','Rende na hora 15% da verba que você tem (até R$ 1.500).',60,[{k:'juros',x:.15,max:1500}]],
  cury:['Enxame de Drones','Invoca 3 levas de drones de uma vez.',60,[{k:'invoca',n:3}]],
  zema:['Pão de Queijo Grátis','Todo mundo na avenida para 3 s para comer (chefões, 1 s).',60,[{k:'parar',area:'tela',t:3,m:'Pão de queijo!'}]],
  caiado:['Plantão Médico','Recupera 10 de apoio e, por 8 s, todos os seus personagens atacam 20% mais rápido.',65,[{k:'vida',v:10},{k:'buffTodos',vel:1.2,t:8}]],
  eduarda:['Votação Relâmpago','Por 5 s, ataca 4 vezes mais rápido.',45,[{k:'buff',vel:4,t:5}]],
  eneas:['Meu Nome É Enéas','Duas bombas caem nos pontos mais cheios da marcha.',75,[{k:'bomba',n:2,dmg:240,r:140}]],
  manga:['Show do Prefeito','Por 8 s, todos os seus personagens alcançam 40% mais longe.',55,[{k:'buffTodos',alc:1.4,t:8}]],
  ana:['Tour Lotada','Por 8 s, joga o chapéu 2,5 vezes mais rápido e com 50% a mais.',50,[{k:'buff',vel:2.5,dano:1.5,t:8}]],
  neymar:['Cai-Cai','Todo mundo no alcance escorrega e fica no chão por 3 s.',45,[{k:'parar',area:0,t:3,m:'Escorregou!'}]],
  gusttavo:['Saideira','Quem está no alcance para 4 s no buteco e fica 25% mais fácil de convencer.',55,[{k:'parar',area:0,t:4,m:'Saideira!'},{k:'vuln',area:0,x:1.25,t:6}]],
  ratinho:['Ratoeira Gigante','Invoca 3 levas de ratos de uma vez.',55,[{k:'invoca',n:3}]],
  kelmon:['Milagre','Todos na avenida perdem 15% do argumento, e quem fica com até 30% é convencido na hora (chefões não).',60,[{k:'corta',area:'tela',pct:.15},{k:'execucao',pct:.3}]],
  mendonca:['Pedido de Vista','Os 6 adversários comuns mais adiantados voltam um bom pedaço da avenida.',55,[{k:'volta',n:6,d:500}]],
  nunes:['Voto de Minerva','Por 15 s, os 8 adversários mais resistentes ficam 2 vezes mais fáceis de convencer.',55,[{k:'vulnForte',n:8,x:2,t:15}]],
  churchill:['Batalha da Inglaterra','12 aviões atacam adversários espalhados pela avenida, 30 de argumento cada.',55,[{k:'chuva',n:12,dmg:30}]],
  thatcher:['Privatização','Rende na hora R$ 60 por personagem seu no mapa.',65,[{k:'verbaTorres',por:60}]],
  friedman:['Mão Invisível','Os 10 adversários comuns mais adiantados voltam um pedaço da avenida.',55,[{k:'volta',n:10,d:280}]],
  reagan:['Guerra nas Estrelas','3 raios do espaço atingem os adversários mais resistentes, 150 de argumento cada.',60,[{k:'chuva',n:3,dmg:150,forte:1}]],
  clacerda:['Golpe de Pena','Cada chefão na avenida perde 12% do argumento máximo, e quem está no alcance para 2 s.',60,[{k:'antiChefe',pct:.12},{k:'parar',area:0,t:2,m:'Manchete!'}]],
  nixon:['Grampo','Por 15 s, os Isentões ficam visíveis para todos os seus personagens.',60,[{k:'revela',t:15}]],
  gaulle:['Non!','Os 5 adversários mais resistentes da avenida param por 4 s (chefões, 1,2 s).',55,[{k:'pararForte',n:5,t:4,m:'Non!'}]],
};
/* ---------- o segundo poder: cada caminho de evolução tem o seu ----------
   O poder da tabela PODERES fica no caminho 1, menos nos personagens de ORIG_NO_2, em que ele combina com o caminho 2.
   PODERES_B traz o poder do outro caminho. Dentro do mesmo personagem, os dois poderes não repetem nenhum tipo de efeito. */
const ORIG_NO_2=new Set(['marx','fux','veio','thatcher','friedman','anitta','eneas','caiado','cury','rosa']);
const PODERES_B={
  /* esquerda */
  militante:['Mutirão do Comitê','Todos os seus personagens perto do Militante disparam na hora, com o dobro de argumento.',45,[{k:'salva',r:200,x:2}]],
  janones:['Algoritmo','O próximo poder especial usado por qualquer personagem seu acontece duas vezes.',60,[{k:'ecoPoder'}]],
  marx:['Luta de Classes','Os 6 adversários comuns mais adiantados trocam de lugar com os 6 mais atrasados.',55,[{k:'trocaLugar',n:6}]],
  dilma:['Dobrar a Meta','A verba do fim desta rodada vem em dobro.',70,[{k:'dobraRodada',x:2}]],
  churras:['Festa da Firma','Destrava todo mundo e, por 12 s, nenhum personagem seu pode ser travado.',55,[{k:'vacina',t:12},{k:'destrava'}]],
  sindicato:['Piquete','Monta 3 piquetes na frente da marcha por 8 s: quem passa anda devagar e fica 30% mais fácil de convencer.',50,[{k:'lama',n:3,vida:8,x:1.3}]],
  haddad:['Reforma Tributária','A verba do fim desta rodada vem 50% maior, e entra R$ 100 na hora.',65,[{k:'dobraRodada',x:1.5},{k:'doacao',v:100}]],
  lenin:['Todo Poder aos Sovietes','Todos os seus personagens no mapa disparam na hora, com 50% a mais de argumento.',55,[{k:'salva',r:9999,x:1.5}]],
  stalin:['Cortina de Ferro','Os próximos 10 adversários comuns que chegarem ao fim não tiram apoio, e a avenida anda pela metade por 4 s.',70,[{k:'escudo',n:10},{k:'lento',area:'tela',t:4}]],
  janja:['Volta ao Mundo','Tira 15 s da recarga dos poderes de todos e, por 6 s, todos os seus personagens alcançam 20% mais longe.',60,[{k:'recargaTodos',s:15},{k:'buffTodos',alc:1.2,t:6}]],
  xandao:['Multa Diária','Por 5 s, a avenida inteira perde argumento aos poucos, anda mais devagar e paga R$ 2 por adversário.',60,[{k:'queimaTela',area:'tela',t:5,x:.5},{k:'rouba',area:'tela',v:2,t:5}]],
  dino:['Bumba Meu Boi','Convence os 4 mais fracos no alcance, que dão meia-volta dançando e atropelam quem vem atrás.',55,[{k:'vira',n:4,x:3}]],
  fux:['Embargos Infinitos','Por 10 s, os chefões na avenida andam mais devagar e ficam 40% mais fáceis de convencer.',55,[{k:'chefeLento',t:10,x:1.4}]],
  fachin:['Segredo de Justiça','Por 10 s, quem está no alcance perde a blindagem e não recupera argumento.',50,[{k:'desblinda',area:0,t:10}]],
  zanin:['Honorários','Devolve em verba 25% de tudo que você gastou no Zanin.',70,[{k:'reembolso',x:.25}]],
  carmen:['Mesárias','Por 12 s, cada adversário que entra no alcance paga R$ 5 para passar pela seção.',50,[{k:'pedagio',t:12,v:5,area:0}]],
  gilmar:['Palavra Final','O adversário comum mais adiantado é convencido e cai em cima de quem está perto: 6 vezes o argumento do Gilmar em volta.',45,[{k:'explode',x:6,r:90}]],
  toffoli:['Inquérito Aberto','Por 15 s, cada adversário que está agora na avenida rende R$ 6 a mais ao ser convencido.',55,[{k:'marcaVerba',area:'tela',v:6,t:15}]],
  che:['Ícone Pop','Convence os 6 mais fracos no alcance, que viram guerrilheiros e correm contra a marcha.',55,[{k:'vira',n:6,x:2}]],
  mussolini:['Trem no Horário','Um trem passa pela avenida do fim para o começo: 3 vezes o argumento em cada um e um empurrão para trás.',60,[{k:'onda',x:3,v:620,shot:'trem',knock:60}]],
  putin:['Faixa Preta','Os 4 adversários comuns mais adiantados trocam de lugar com os 4 mais atrasados, e a avenida para 1,2 s.',55,[{k:'trocaLugar',n:4},{k:'parar',area:'tela',t:1.2,m:'Judô!'}]],
  xi:['Grande Muralha','Levanta 6 trechos de muralha que seguram a marcha por 5 s, e os próximos 3 que chegarem ao fim não tiram apoio.',65,[{k:'muro',n:6,vida:5},{k:'escudo',n:3}]],
  maduro:['Motorista de Ônibus','Um ônibus passa pela avenida do fim para o começo: 2,5 vezes o argumento em cada um e um empurrão para trás.',55,[{k:'onda',x:2.5,v:380,shot:'onibus',knock:40}]],
  abbas:['Ajuda Internacional','Chega uma doação de R$ 250 e 8 de apoio.',65,[{k:'doacao',v:250},{k:'vida',v:8}]],
  artista:['Campanha Global','Por 8 s, cada adversário convencido espalha fogo em quem está perto.',55,[{k:'contagio',t:8,x:2,fogo:1}]],
  marina:['Floresta em Pé','Planta 5 trechos de mata na frente da marcha por 10 s: quem passa anda devagar.',55,[{k:'lama',n:5,vida:10,x:1,mata:1}]],
  pabllo:['Parada do Orgulho','Quem está no alcance pega fogo por 6 s e perde o argumento da Pabllo a cada segundo.',50,[{k:'queimaTela',area:0,t:6,x:1}]],
  anitta:['Show das Poderosas','O adversário mais adiantado vira o centro do show: anda devagar e fica 2,5 vezes mais fácil de convencer por 6 s.',45,[{k:'focoFrente',x:2.5,t:6}]],
  xuxa:['Nave da Xuxa','A nave passa pela avenida do fim para o começo: 2 vezes o argumento da Xuxa em cada um.',55,[{k:'onda',x:2,v:420,shot:'nave'}]],
  datena:['Helicóptero da TV','Por 20 s, todos veem os Isentões, e o adversário mais adiantado fica 80% mais fácil de convencer por 8 s.',55,[{k:'revela',t:20},{k:'focoFrente',x:1.8,t:8}]],
  renan:['Roda de Violão','Os 6 adversários comuns mais adiantados se juntam na roda, e a avenida para 1 s para ouvir.',55,[{k:'ima',n:6},{k:'parar',area:'tela',t:1,m:'Ouvindo...'}]],
  kim:['Barca de Sushi','Sushi para a avenida inteira: cada adversário leva 2 vezes o argumento do Kim.',55,[{k:'rajadaTela',x:2}]],
  zapata:['Terra para Quem Trabalha','Os próximos 5 que chegarem ao fim não tiram apoio, e 2 roças na frente da marcha deixam todos lentos por 8 s.',60,[{k:'escudo',n:5},{k:'lama',n:2,vida:8,x:1,mata:1}]],
  owen:['Aldeia Cooperativa','Investe até R$ 300 da sua verba e devolve o triplo no fim da rodada.',60,[{k:'investe',max:300,x:3}]],
  prestes:['Cavaleiro da Esperança','Cada uso deixa o tanque 10% mais rápido para sempre (até 40%).',50,[{k:'treino',vel:.1,max:.4}]],
  arouca:['Reforma Sanitária','Por 12 s, nenhum personagem seu pode ser travado, e gasta até R$ 150 para recuperar até 10 de apoio.',55,[{k:'vacina',t:12},{k:'compraApoio',custo:150,v:10}]],
  rosa:['Spartakus','Os seus personagens perto da Rosa disparam na hora com 2,5 vezes o argumento, e quem está no alcance dela perde a blindagem por 5 s.',60,[{k:'salva',r:220,x:2.5},{k:'desblinda',area:0,t:5}]],
  goldman:['Festa Anarquista','Por 8 s, a avenida inteira perde a blindagem e não recupera argumento.',55,[{k:'desblinda',area:'tela',t:8}]],
  helder:['Dom da Paz','A marcha para de chegar por 5 s, e você recupera o apoio perdido nesta rodada (até 10).',60,[{k:'cessar',t:5},{k:'anistia',max:10}]],
  lula:['Frente Ampla','Todos os seus personagens no mapa disparam na hora com o dobro de argumento, e tira 15 s da recarga dos poderes de todos e do poder do herói.',60,[{k:'salva',r:9999,x:2},{k:'recargaTodos',s:15}]],
  vampirao:['Castelo Assombrado','Por 10 s, todo adversário convencido assombra quem está perto: 3 vezes o argumento do Temer em volta.',60,[{k:'contagio',t:10,x:3}]],
  /* direita */
  bolsonaro:['Cadeia Nacional','A marcha para de chegar por 8 s, a avenida inteira para 2 s para assistir, e tira 15 s da recarga dos poderes de todos e do poder do herói.',60,[{k:'cessar',t:8},{k:'parar',area:'tela',t:2,m:'Assistindo'},{k:'recargaTodos',s:15}]],
  patriota:['Passeata','Por 8 s, o Patriota panfleta 2,5 vezes mais rápido, e você pode tocar no mapa para levá-lo andando até outro lugar.',40,[{k:'marcha',t:8,vel:2.5}]],
  nikolas:['Repost em Massa','Repete o último poder especial usado por outro personagem seu.',50,[{k:'copia'}]],
  agro:['Porteira Fechada','Os 8 adversários comuns mais adiantados são tocados de volta para junto do último deles, como gado no curral.',55,[{k:'ima',n:8}]],
  pavanato:['Monetização','Por 6 s, a avenida inteira anda mais devagar, e você ganha R$ 3 por adversário.',55,[{k:'rouba',area:'tela',v:3,t:6}]],
  caminhoneiro:['Frete Pago','Investe até R$ 600 da sua verba e devolve o dobro no fim da rodada.',60,[{k:'investe',max:600,x:2}]],
  flavio:['Base Aliada','Tira 20 s da recarga dos poderes de todos os seus personagens e do poder do herói.',55,[{k:'recargaTodos',s:20}]],
  empresario:['Seguro Rural','Os próximos 6 adversários comuns que chegarem ao fim não tiram apoio.',60,[{k:'escudo',n:6}]],
  empresarios:['Bolsa de Valores','Aposta na bolsa: pode render 30% da sua verba (até R$ 2.500), 6 vezes o aporte do cofre ou só R$ 50.',60,[{k:'sorteio',l:[{k:'juros',x:.3,max:2500,txt:'Alta!'},{k:'verbaAporte',x:6,txt:'Dividendos!'},{k:'doacao',v:50,txt:'Queda...'}]}]],
  miliciano:['Taxa de Segurança','Quem está no alcance paga R$ 12 de taxa e anda mais devagar por 8 s.',55,[{k:'rouba',area:0,v:12,t:8}]],
  veio:['Estátua da Liberdade','Os próximos 4 que chegarem ao fim não tiram apoio, e entra R$ 150 na hora.',55,[{k:'escudo',n:4},{k:'doacao',v:150}]],
  trump:['Tarifaço','Por 20 s, cada adversário que entra na avenida paga R$ 4 de tarifa.',60,[{k:'pedagio',t:20,v:4,area:'tela'}]],
  milei:['Dolarização','Por 15 s, comprar e evoluir personagens custa 30% menos.',60,[{k:'desconto',x:.7,t:15}]],
  bukele:['Bitcoin Oficial','Aposta em bitcoin: metade das vezes rende 50% da sua verba (até R$ 3.000); na outra metade, não rende nada.',60,[{k:'sorteio',l:[{k:'juros',x:.5,max:3000,txt:'Subiu!'},{k:'doacao',v:0,txt:'Caiu...'}]}]],
  musk:['Viagem a Marte','Um foguete cai no adversário mais resistente: 20 vezes o argumento do Musk e 15% do argumento máximo dele (chefão, bem menos).',55,[{k:'meteoro',x:20,pct:.15}]],
  marcal:['Assinatura Vitalícia','Investe até R$ 1.000 da sua verba e devolve 60% a mais no fim da rodada.',55,[{k:'investe',max:1000,x:1.6}]],
  cury:['Gestão da Emoção','O herói ganha 25 de experiência e tira 10 s da recarga dos poderes de todos.',55,[{k:'xpHeroi',v:25},{k:'recargaTodos',s:10}]],
  zema:['Estado Mínimo','Devolve 20% do que você gastou no Zema e, por 10 s, tudo custa 15% menos.',65,[{k:'reembolso',x:.2},{k:'desconto',x:.85,t:10}]],
  caiado:['Vacinação em Massa','Por 15 s, nenhum personagem seu pode ser travado, e você recupera o apoio perdido nesta rodada (até 8).',60,[{k:'vacina',t:15},{k:'anistia',max:8}]],
  eduarda:['Quase 2 Milhões','Por 20 s, quem está no alcance fica marcado: cada um rende R$ 10 a mais ao ser convencido.',50,[{k:'marcaVerba',area:0,v:10,t:20}]],
  eneas:['Onda de Choque','Uma onda passa pela avenida do fim para o começo: 4 vezes o argumento do Enéas em cada um.',60,[{k:'onda',x:4,v:700,shot:'onda'}]],
  manga:['Prefeito Dançarino','Cada uso deixa o alcance 10% maior para sempre (até 40%).',50,[{k:'treino',alc:.1,max:.4}]],
  neymar:['Contrato Milionário','Cada uso deixa o Neymar 15% mais forte para sempre (até 60%).',50,[{k:'treino',dano:.15,max:.6}]],
  gusttavo:['Embaixador','O herói ganha 40 de experiência (sem herói em campo, rende verba).',55,[{k:'xpHeroi',v:40}]],
  ana:['Chapéu Bumerangue','O chapéu quica entre 5 adversários, 4 vezes o argumento da Ana em cada.',50,[{k:'corrente',n:5,x:4}]],
  ratinho:['Merchan ao Vivo','Rende R$ 100 mais R$ 20 por rodada já jogada.',60,[{k:'doacao',v:100,r:20}]],
  kelmon:['Quermesse','Gasta até R$ 250 na quermesse e recupera até 18 de apoio.',55,[{k:'compraApoio',custo:250,v:18}]],
  mendonca:['Ministro Pastor','Recupera o apoio perdido nesta rodada, até 15. Se não perdeu nada, rende R$ 300.',60,[{k:'anistia',max:15}]],
  nunes:['Sessão no TSE','Um raio de decisão pula entre 8 adversários, 3 vezes o argumento do Nunes em cada.',50,[{k:'corrente',n:8,x:3}]],
  churchill:['Chá das Cinco','A marcha para de chegar por 10 s, e os poderes de todos recarregam 8 s mais rápido.',60,[{k:'cessar',t:10},{k:'recargaTodos',s:8}]],
  thatcher:['Dama de Ferro','Por 8 s, os chefões andam mais devagar e ficam 80% mais fáceis de convencer, e cada um perde 5% do argumento máximo.',60,[{k:'chefeLento',t:8,x:1.8},{k:'antiChefe',pct:.05}]],
  friedman:['Monetarismo','Rende 10% da sua verba (até R$ 800) e, por 12 s, tudo custa 10% menos.',60,[{k:'juros',x:.1,max:800},{k:'desconto',x:.9,t:12}]],
  reagan:['Reeleição','Recupera o apoio perdido nesta rodada (até 20), e o herói ganha 15 de experiência.',60,[{k:'anistia',max:20},{k:'xpHeroi',v:15}]],
  clacerda:['Discurso Histórico','Empurra para trás quem está no alcance, e o mais adiantado fica 3 vezes mais fácil de convencer por 4 s.',55,[{k:'focoFrente',x:3,t:4},{k:'empurra',area:0,d:120}]],
  nixon:['Viagem à China','A marcha para de chegar por 6 s, e entra R$ 200 de acordo comercial.',60,[{k:'cessar',t:6},{k:'doacao',v:200}]],
  gaulle:['Quinta República','Por 10 s, ninguém trava os seus personagens, e quem está perto do General dispara na hora com 50% a mais.',55,[{k:'vacina',t:10},{k:'salva',r:180,x:1.5}]],
};
/* ---------- ajuste de preço depois do teste com o robô (2026-11-11) ----------
   Cada personagem jogou no Difícil, em 4 mapas, de dois jeitos: junto do primeiro gratuito e sozinho com o herói.
   Quem ficou entre os mais fracos nos dois testes ficou mais barato; quem ganhou quase tudo nos dois ficou um pouco mais caro.
   Nikolas e Haddad são o 2º gratuito de cada lado: o Nikolas vencia muito mais, então os dois foram aproximados. */
const AJUSTE_PRECO={
  toffoli:.85,marina:.85,che:.85,xi:.85,helder:.85,zanin:.85,janja:.85,zapata:.85,haddad:.9,
  musk:.85,reagan:.85,nunes:.85,agro:.85,eduarda:.85,neymar:.85,manga:.85,marcal:.85,nixon:.85,
  vampirao:1.1,kim:1.1,maduro:1.1,xandao:1.1,nikolas:1.1,ratinho:1.1,zema:1.1,
};
for(const[k,f]of Object.entries(AJUSTE_PRECO))if(TOWERS[k])TOWERS[k].cost=Math.round(TOWERS[k].cost*f/10)*10;
/* ---------- preço pela força, sem o limite de cópias (2026-11-17) ----------
   Cada personagem comum que ataca jogou no Difícil em 4 mapas (DF, RJ, GO, BA), só com o 1º gratuito do lado, pelo preço
   que tinha: a rodada média alcançada mede quanto ele rende pelo que custa. Fator = 1 + (média - mediana do lado)/45,
   entre 0,8 e 1,25; mudanças menores que 5% ficaram de fora. Quem está nos dois lados ficou com a média dos dois.
   Gratuitos iniciais (base do equilíbrio) e quem não ataca (o robô coloca um só, então o teste não mede) não entram.
   Como o preço da loja (F$) segue o preço da partida, ele muda junto. */
const AJUSTE_FORCA={
  /* esquerda */
  anitta:1.21,kim:1.2,mussolini:1.21,prestes:1.21,pabllo:1.2,xandao:1.2,datena:1.15,churras:1.13,stalin:1.09,goldman:1.08,fachin:1.07,
  carmen:.9,helder:.9,toffoli:.91,fux:.9,marina:.86,zapata:.85,zanin:.82,
  /* direita */
  veio:1.25,kelmon:1.21,churchill:1.19,clacerda:1.16,miliciano:1.13,eneas:1.11,zema:1.09,ana:1.07,thatcher:1.06,
  gusttavo:.94,manga:.94,marcal:.92,musk:.9,agro:.89,ratinho:.89,nunes:.84,neymar:.82,eduarda:.81,
  /* presidentes (heróis): cada um jogou no lugar do herói gratuito, com a equipe gratuita, no Difícil em 6 mapas.
     A Dilma ficou bem abaixo (rodada média 23, os outros 33 a 36) e o Putin acima; os outros ficaram dentro do ruído.
     Depois dos poderes próprios (8 mapas), Dilma ainda abaixo e Xi, Putin e Reagan acima: mais um ajuste pequeno */
  dilma:.75,putin:1.09,xi:1.06,reagan:1.04,
};
for(const[k,f]of Object.entries(AJUSTE_FORCA))if(TOWERS[k])TOWERS[k].cost=Math.round(TOWERS[k].cost*f/10)*10;
/* heróis exclusivos: o preço na partida segue o do personagem de origem (já ajustado pela força), e os especiais
   de cada caminho são os mesmos dele */
for(const[,k]of EXC_ORDEM){const T=TOWERS[k],F=TOWERS[T.fonte];
  T.cost=F.only?F.cost:Math.round(F.cost*HEROI_CUSTO/10)*10;
  if(PODERES[T.fonte])PODERES[k]=PODERES[T.fonte];if(PODERES_B[T.fonte])PODERES_B[k]=PODERES_B[T.fonte];
  if(ORIG_NO_2.has(T.fonte))ORIG_NO_2.add(k)}
function poderDoCaminho(k,p){return (p===1)===ORIG_NO_2.has(k)?PODERES[k]:PODERES_B[k]}
const caminhoPoder=t=>t.a===3?0:t.b===3?1:-1;
const poderDe=t=>{const p=caminhoPoder(t);return p<0?null:poderDoCaminho(t.key,p)||null};
/* todo personagem, herói ou não, tem um especial no botão ao completar um caminho (desde 2026-11-17 também Lula e Bolsonaro) */
const temPoder=t=>!!poderDe(t);
const nomePoder=t=>poderDe(t)[0];
const efeitoPoder=t=>poderDe(t)[1];
const cdPoder=t=>poderDe(t)[2];
/* quem é atingido: a avenida inteira ou só quem está no alcance do personagem */
function alvosPoder(t,area){
  const R=area==='tela'?1e9:(t.s.range||t.s.auraR||150)*t.rangeMul;
  return S.enemies.filter(e=>{if(e.dead||e.voo)return false;const p=posAt(e.d,e.via);return Math.hypot(p.x-t.x,p.y-t.y)<=R});
}
/* para o adversário por k segundos (chefão só um terço), com o rótulo do poder em cima */
function pararPoder(e,k,m){
  if(e.T.boss)k*=.3;
  e.stun=Math.max(e.stun,k);
  if(m==='censor')e.censorT=k;else if(m==='jail')e.jailT=k;else if(m==='chair')e.chairT=k;else if(m==='dance')e.danceT=k;
  else if(m){e.rot=m;e.rotT=k}
}
function pontoCheio(r){
  let best=null,bn=-1;
  for(const e of S.enemies){if(e.dead)continue;const p=posAt(e.d,e.via);let n=0;for(const o of S.enemies){if(o.dead)continue;const q=posAt(o.d,o.via);if(Math.hypot(q.x-p.x,q.y-p.y)<=r)n++}if(n>bn){bn=n;best=p}}
  return best;
}
const EFEITOS={
  buff:(t,p)=>{t.podBuff={area:p.area,vel:p.vel,dano:p.dano,alc:p.alc};t.podT=p.t},
  buffTodos:(t,p)=>{S.buff={vel:p.vel,dano:p.dano,alc:p.alc};S.buffT=p.t},
  parar:(t,p)=>{for(const e of alvosPoder(t,p.area))pararPoder(e,p.t,p.m)},
  pararForte:(t,p)=>{for(const e of S.enemies.filter(e=>!e.dead&&!(p.semChefe&&e.T.boss)).sort((a,b)=>b.hp-a.hp).slice(0,p.n))pararPoder(e,p.t,p.m)},
  empurra:(t,p)=>{for(const e of alvosPoder(t,p.area))e.pushLeft=(e.pushLeft||0)+(e.T.boss?p.d*.2:p.d)},
  volta:(t,p)=>{for(const e of S.enemies.filter(e=>!e.dead&&!e.T.boss).sort((a,b)=>b.d-a.d).slice(0,p.n)){e.d=Math.max(0,e.d-p.d);const q=posAt(e.d,e.via);S.fx.push({k:'ring',x:q.x,y:q.y,r:20,c:'#ffe27a',t:0,d:.4})}},
  lento:(t,p)=>{for(const e of alvosPoder(t,p.area))e.slowT=Math.max(e.slowT,p.t)},
  vuln:(t,p)=>{for(const e of alvosPoder(t,p.area)){e.vulnT=p.t;e.vulnX=p.x}},
  vulnForte:(t,p)=>{for(const e of S.enemies.filter(e=>!e.dead).sort((a,b)=>b.hp-a.hp).slice(0,p.n)){e.vulnT=p.t;e.vulnX=p.x}},
  trip:(t,p)=>{for(const e of alvosPoder(t,p.area))if(!e.T.boss)e.tripT=Math.max(e.tripT||0,p.t)},
  cessar:(t,p)=>{S.cessarT=p.t},
  corta:(t,p)=>{for(const e of alvosPoder(t,p.area)){e.hp-=e.hp*(e.T.boss?p.pct*.3:p.pct)}},
  drena:(t,p)=>{let soma=0;for(const e of alvosPoder(t,'tela')){const d=e.hp*(e.T.boss?.05:p.pct);soma+=d;hurt(e,d,'puro',t)}const v=Math.round(soma);S.cash+=v;float(t.x,t.y-62,'+R$ '+v,'#b6ffb0')},
  convence:(t,p)=>{let l=alvosPoder(t,p.area).filter(e=>!e.T.boss);l.sort(p.frente?(a,b)=>b.d-a.d:(a,b)=>a.hp-b.hp);for(const e of l.slice(0,p.n)){const q=posAt(e.d,e.via);S.fx.push({k:'ring',x:q.x,y:q.y,r:22,c:'#b6ffb0',t:0,d:.4});convince(e,t)}},
  execucao:(t,p)=>{for(const e of S.enemies.filter(e=>!e.dead&&!e.T.boss&&e.hp<=e.max*p.pct))convince(e,t)},
  bomba:(t,p)=>{for(let i=0;i<p.n;i++){const q=pontoCheio(p.r);if(!q)break;S.nukes.push({x:q.x+(i?rand(-60,60):0),y:q.y+(i?rand(-40,40):0),t:1+i*.4,r:p.r,dmg:p.dmg*t.dmgMul,src:t})}banner(nomePoder(t).toUpperCase()+'!')},
  chuva:(t,p)=>{
    const vivos=S.enemies.filter(e=>!e.dead);if(!vivos.length)return;
    const lista=p.forte?vivos.sort((a,b)=>b.hp-a.hp):vivos;
    for(let i=0;i<p.n;i++){const e=p.forte?lista[i%lista.length]:pick(lista);if(e.dead)continue;const q=posAt(e.d,e.via);S.fx.push({k:'ring',x:q.x,y:q.y,r:p.forte?40:22,c:'#ffe27a',t:0,d:.45});S.fx.push({k:'queda',x:q.x+e.off,y:q.y-10,shot:t.s.shot||t.s.batShot||'panfleto',t:0,d:.5});hurt(e,p.dmg*t.dmgMul,'puro',t);if(p.st&&!e.dead)pararPoder(e,p.st,p.m)}
  },
  leque:(t,p)=>{S.fx.push({k:'ring',x:t.x,y:t.y,r:t.s.range*t.rangeMul,c:'#ffe27a',t:0,d:.4});for(const e of alvosPoder(t,0))hurt(e,(t.s.dmg||1)*t.dmgMul*p.x,t.s.type,t)},
  antiChefe:(t,p)=>{for(const e of S.enemies)if(!e.dead&&e.T.boss)hurt(e,e.max*p.pct,'puro',t)},
  invoca:(t,p)=>{for(let i=0;i<p.n;i++)summonRobots(t)},
  fogo:(t,p)=>{
    const ini=S.enemies.length?Math.max(...S.enemies.map(e=>e.d)):nearestD(t.x,t.y);
    for(let i=0;i<p.n;i++){const q=posAt(Math.min(LEN-10,ini+20+i*48));S.fires.push({x:q.x,y:q.y,life:p.vida,max:p.vida,r:42,dmg:p.dmg*t.dmgMul,det:true,src:t,cd:.1,ph:rand(0,6)})}
  },
  muro:(t,p)=>{
    const ini=S.enemies.length?Math.max(...S.enemies.map(e=>e.d))+60:nearestD(t.x,t.y);
    for(let i=0;i<p.n;i++)S.walls.push(novoBloqueio(Math.min(LEN-30,ini+i*70),p.vida,t.key==='caminhoneiro'));
  },
  bois:(t,p)=>{const s=t.s;if(t.pathD===undefined){t.pathD=nearestD(t.x,t.y);t.pathV=nearestD.via}for(let i=0;i<p.n;i++)S.shots.push({run:1,via:t.pathV,d:Math.min(LEN,t.pathD+i*26),left:s.len*1.5,v:s.spd,dmg:s.dmg*t.dmgMul*2,pierce:(s.pierce+t.pierceAdd)*2,type:s.type,shot:'boi',det:true,hit:new Set,src:t,x:t.x,y:t.y,r:15,a:0,face:1})},
  vida:(t,p)=>{S.lives=Math.min(S.d.lives+60,S.lives+p.v);float(830,190,'+'+p.v+' apoio','#b6ffb0')},
  destrava:()=>{for(const o of S.towers)o.stun=0},
  verbaInim:(t,p)=>{const v=(p.por||0)*S.enemies.filter(e=>!e.dead).length;S.cash+=v;float(t.x,t.y-62,'+R$ '+v,'#b6ffb0')},
  verbaRodada:(t,p)=>{const v=Math.round((150+S.round*12+(t.s.income||0))*p.x);S.cash+=v;float(t.x,t.y-62,'+R$ '+v,'#b6ffb0')},
  verbaAporte:(t,p)=>{const v=Math.round(((t.s.aporte||0)+(t.s.income||0))*p.x)||300;S.cash+=v;float(t.x,t.y-62,'+R$ '+v,'#b6ffb0')},
  verbaTorres:(t,p)=>{const v=p.por*S.towers.length;S.cash+=v;float(t.x,t.y-62,'+R$ '+v,'#b6ffb0')},
  juros:(t,p)=>{const v=Math.round(Math.min(p.max,S.cash*p.x));S.cash+=v;float(t.x,t.y-62,'+R$ '+v,'#b6ffb0')},
  bonus:(t,p)=>{S.bonusV=p.v;S.bonusT=p.t},
  revela:(t,p)=>{S.revelaT=p.t},
};
/* ---------- efeitos novos, usados pelos poderes do segundo caminho ---------- */
const vivos=()=>S.enemies.filter(e=>!e.dead);
const maisAdiantado=l=>l.reduce((m,e)=>!m||e.d>m.d?e:m,null);
const ganha=(t,v,txt)=>{v=Math.round(v);if(!v)return;S.cash+=v;S.ganho+=v;float(t.x,t.y-62,txt||'+R$ '+v.toLocaleString('pt-BR'),'#b6ffb0')};
Object.assign(EFEITOS,{
  /* Passeata: por alguns segundos o personagem pode ser levado a outro lugar do mapa */
  marcha:(t,p)=>{t.marchaT=p.t;t.podBuff={vel:p.vel};t.podT=p.t;S.placing=null;S.sel=t;renderPanel();float(t.x,t.y-92,'Toque no mapa para andar','#ffe27a')},
  /* raio que pula de um adversário para o mais próximo */
  corrente:(t,p)=>{
    let e=maisAdiantado(alvosPoder(t,0))||maisAdiantado(vivos());if(!e)return;
    const feitos=new Set;let px=t.x,py=t.y-26;
    for(let i=0;i<p.n&&e;i++){
      feitos.add(e);const q=posAt(e.d,e.via);S.fx.push({k:'linha',x:px,y:py,x2:q.x+e.off,y2:q.y-12,t:0,d:.45});px=q.x+e.off;py=q.y-12;
      hurt(e,habDano(t)*p.x,'puro',t);
      let prox=null,pd=170;for(const o of vivos()){if(feitos.has(o))continue;const w=posAt(o.d,o.via),d=Math.hypot(w.x-q.x,w.y-q.y);if(d<pd){pd=d;prox=o}}
      e=prox;
    }
  },
  rajadaTela:(t,p)=>{let n=0;for(const e of vivos()){if(n++<24){const q=posAt(e.d,e.via);S.fx.push({k:'queda',x:q.x+e.off,y:q.y-10,shot:t.s.shot||'panfleto',t:0,d:.5})}hurt(e,habDano(t)*p.x,'puro',t)}},
  escudo:(t,p)=>{S.escudoN=(S.escudoN||0)+p.n;float(t.x,t.y-62,'Barreira: '+S.escudoN,'#cfe6ff')},
  desconto:(t,p)=>{S.descT=p.t;S.descX=p.x;float(t.x,t.y-62,'-'+Math.round((1-p.x)*100)+'% em tudo','#b6ffb0');syncHud()},
  investe:(t,p)=>{const v=Math.min(Math.floor(S.cash),p.max);if(v<=0)return;S.cash-=v;S.investe=(S.investe||0)+Math.round(v*p.x);float(t.x,t.y-62,'Investiu R$ '+v.toLocaleString('pt-BR'),'#ffe27a')},
  /* os convencidos dão meia-volta e atropelam quem vem atrás */
  vira:(t,p)=>{
    const l=alvosPoder(t,0).filter(e=>!e.T.boss).sort((a,b)=>a.hp-b.hp).slice(0,p.n);
    for(const e of l){const d=e.d,via=e.via,look=LOOKOF(e.type);convince(e,t);const q=posAt(d,via);
      S.shots.push({run:1,d,via,left:420,v:150,dmg:habDano(t)*p.x,pierce:6,type:'puro',shot:'fiel',look,det:true,hit:new Set,src:t,x:q.x,y:q.y,r:14,a:0,face:1})}
  },
  /* junta os mais adiantados no ponto do último deles */
  ima:(t,p)=>{
    const l=vivos().filter(e=>!e.T.boss).sort((a,b)=>b.d-a.d).slice(0,p.n);if(!l.length)return;
    const fim=l[l.length-1].d;for(const e of l){e.d=Math.max(0,fim-rand(0,14));const q=posAt(e.d,e.via);S.fx.push({k:'ring',x:q.x,y:q.y,r:18,c:'#ffe27a',t:0,d:.4})}
  },
  /* trechos na frente da marcha que deixam lento (e, às vezes, mais fácil de convencer) */
  lama:(t,p)=>{
    const ini=S.enemies.length?Math.max(...S.enemies.map(e=>e.d))+30:nearestD(t.x,t.y);
    for(let i=0;i<p.n;i++){const q=posAt(Math.min(LEN-10,ini+i*60));S.fires.push({x:q.x,y:q.y,life:p.vida,max:p.vida,r:44,dmg:0,lama:1,mata:p.mata,lx:p.x,cd:0,ph:rand(0,6)})}
  },
  treino:(t,p)=>{
    const k=p.dano?'trD':p.alc?'trA':'trV',v=p.dano||p.alc||p.vel;
    t[k]=Math.min(p.max,(t[k]||0)+v);float(t.x,t.y-62,'+'+Math.round(t[k]*100)+'% para sempre','#ffe27a');
  },
  recargaTodos:(t,p)=>{for(const o of S.towers)if(o!==t&&o.podCd>0)o.podCd=Math.max(0,o.podCd-p.s);S.abilCd=Math.max(0,S.abilCd-p.s);renderPoderes(true)},
  xpHeroi:(t,p)=>{const h=S.towers.find(o=>o.T.only);if(h){ganhaXP(h,p.v);float(h.x,h.y-70,'+'+p.v+' de experiência','#ffe27a')}else ganha(t,p.v*8)},
  contagio:(t,p)=>{S.contT=p.t;S.contD=habDano(t)*p.x;S.contSrc=t;S.contFogo=!!p.fogo},
  meteoro:(t,p)=>{
    const l=vivos();if(!l.length)return;const e=l.reduce((m,o)=>o.hp>m.hp?o:m),q=posAt(e.d,e.via);
    S.fx.push({k:'queda',x:q.x+e.off,y:q.y-10,shot:t.s.shot||'panfleto',t:0,d:.5});S.fx.push({k:'flash',x:q.x,y:q.y,r:60,t:0,d:.4});S.shake=.25;
    hurt(e,habDano(t)*p.x+e.max*p.pct*(e.T.boss?.2:1),'puro',t);
  },
  /* os personagens perto disparam todos de uma vez */
  salva:(t,p)=>{
    for(const o of S.towers){
      if(Math.hypot(o.x-t.x,o.y-t.y)>p.r||!o.s.range)continue;
      const R=o.s.range*o.rangeMul,det=o.s.detect||o.buffDet;
      const alvo=maisAdiantado(vivos().filter(e=>(!ehCamo(e)||det)&&(()=>{const q=posAt(e.d,e.via);return Math.hypot(q.x-o.x,q.y-o.y)<=R})()));
      if(!alvo)continue;const q=posAt(alvo.d,alvo.via);
      S.fx.push({k:'linha',x:o.x,y:o.y-24,x2:q.x+alvo.off,y2:q.y-12,t:0,d:.35});
      hurt(alvo,habDano(o)*p.x,o.s.type||'puro',o);
    }
  },
  pedagio:(t,p)=>{t.pedT=p.t;t.pedV=p.v;t.pedA=p.area;t.pedSet=new Set;t.pedSoma=0},
  anistia:(t,p)=>{const perdido=Math.max(0,Math.round((S.vidaIni||S.lives)-S.lives)),v=Math.min(p.max,perdido);
    if(v>0){S.lives+=v;float(830,190,'+'+v+' apoio','#b6ffb0')}else ganha(t,p.max*20)},
  ecoPoder:(t,p)=>{S.ecoN=(S.ecoN||0)+1;float(t.x,t.y-62,'O próximo poder vale dois','#ffe27a')},
  copia:(t,p)=>{
    const u=S.ultimoPoder;
    if(!u){EFEITOS.buffTodos(t,{vel:1.2,t:6});float(t.x,t.y-62,'Nada para repostar: todos 20% mais rápidos','#ffe27a');return}
    for(const ef of u[3])if(ef.k!=='marcha'){EFEITOS[ef.k](t,ef);fxPoder(t,ef)}
    float(t.x,t.y-62,'Repost: '+u[0],'#ffe27a');
  },
  marcaVerba:(t,p)=>{for(const e of alvosPoder(t,p.area)){e.marcaV=p.v;e.marcaAte=S.time+p.t;const q=posAt(e.d,e.via);S.fx.push({k:'ring',x:q.x,y:q.y,r:14,c:'#b6ffb0',t:0,d:.5})}},
  vacina:(t,p)=>{S.imuneT=p.t;for(const o of S.towers)o.stun=0},
  queimaTela:(t,p)=>{const d=habDano(t)*p.x;for(const e of alvosPoder(t,p.area)){e.burnT=Math.max(e.burnT||0,p.t);e.burnD=Math.max(e.burnT>0&&e.burnD||0,d);e.burnSrc=t}},
  desblinda:(t,p)=>{for(const e of alvosPoder(t,p.area)){e.armorOffT=Math.max(e.armorOffT||0,p.t);e.noRegenT=Math.max(e.noRegenT||0,p.t)}},
  explode:(t,p)=>{
    const e=maisAdiantado(vivos().filter(o=>!o.T.boss));if(!e)return;const q=posAt(e.d,e.via);convince(e,t);
    S.fx.push({k:'flash',x:q.x,y:q.y,r:p.r,t:0,d:.4});S.fx.push({k:'ring',x:q.x,y:q.y,r:p.r,c:'#ffe27a',t:0,d:.4});
    for(const o of vivos()){const w=posAt(o.d,o.via);if(Math.hypot(w.x-q.x,w.y-q.y)<=p.r)hurt(o,habDano(t)*p.x,'puro',t)}
  },
  rouba:(t,p)=>{const l=alvosPoder(t,p.area);for(const e of l)e.roubaT=Math.max(e.roubaT||0,p.t);ganha(t,p.v*l.length)},
  compraApoio:(t,p)=>{const pago=Math.min(Math.floor(S.cash),p.custo),v=Math.round(p.v*pago/p.custo);if(!v){float(t.x,t.y-62,'Sem verba','#ffb3b3');return}
    S.cash-=pago;S.lives+=v;float(830,190,'+'+v+' apoio','#b6ffb0')},
  doacao:(t,p)=>{const v=p.v+(p.r||0)*S.round;if(v)ganha(t,v)},
  dobraRodada:(t,p)=>{S.rodadaX=Math.max(S.rodadaX||1,p.x);float(t.x,t.y-62,'Fim de rodada ×'+String(p.x).replace('.',','),'#b6ffb0')},
  focoFrente:(t,p)=>{const e=maisAdiantado(vivos());if(!e)return;e.vulnT=p.t;e.vulnX=p.x;e.slowT=Math.max(e.slowT,p.t);const q=posAt(e.d,e.via);S.fx.push({k:'ring',x:q.x,y:q.y,r:40,c:'#ffe27a',t:0,d:.7})},
  /* veículo que passa pela avenida inteira, do fim para o começo */
  /* com duas avenidas, passa um por cada uma, e quem já foi atingido por um não é atingido pelo outro */
  onda:(t,p)=>{const hit=new Set;for(const via of VIAS())S.shots.push({run:1,d:LEN-4,via,left:LEN+10,v:p.v,dmg:habDano(t)*p.x,pierce:9999,type:'puro',shot:p.shot,det:true,hit,src:t,x:-99,y:-99,r:28,a:0,face:1,knock:p.knock||0})},
  sorteio:(t,p)=>{const ef=pick(p.l);EFEITOS[ef.k](t,ef);fxPoder(t,ef);float(t.x,t.y-96,ef.txt,'#ffe27a')},
  chefeLento:(t,p)=>{for(const e of vivos())if(e.T.boss){e.slowT=Math.max(e.slowT,p.t);e.vulnT=p.t;e.vulnX=p.x;const q=posAt(e.d,e.via);S.fx.push({k:'ring',x:q.x,y:q.y,r:50,c:'#9fd6ee',t:0,d:.7})}},
  reembolso:(t,p)=>ganha(t,t.spent*p.x),
  trocaLugar:(t,p)=>{
    const l=vivos().filter(e=>!e.T.boss).sort((a,b)=>b.d-a.d),n=Math.min(p.n,Math.floor(l.length/2));
    for(let i=0;i<n;i++){const a=l[i],b=l[l.length-1-i],d=a.d;a.d=b.d;b.d=d;for(const e of [a,b]){const q=posAt(e.d,e.via);S.fx.push({k:'ring',x:q.x,y:q.y,r:18,c:'#e2679b',t:0,d:.5})}}
  },
});
/* poder do herói: argumento em todo mundo na avenida (chefões, 5 vezes), como fazia o Faz o L!/Selva! */
EFEITOS.atingeTodos=(t,p)=>{let n=0;for(const e of vivos()){if(n++<24){const q=posAt(e.d,e.via);S.fx.push({k:'ring',x:q.x,y:q.y,r:16,c:'#ffe27a',t:0,d:.35})}hurt(e,e.T.boss?p.dmg*5:p.dmg,'puro',t)}S.shake=Math.max(S.shake,.15)};
/* buffs do próprio personagem podem dar perfuração */
{const b0=EFEITOS.buff;EFEITOS.buff=(t,p)=>{b0(t,p);t.podBuff.pierce=p.pierce}}
/* efeito visual de cada tipo de poder */
function fxPoder(t,ef){
  const F=o=>S.fx.push({t:0,...o}),k=ef.k;
  if(k==='empurra')F({k:'ventania',d:.9});
  else if(k==='lento')F(ef.area==='tela'?{k:'neve',d:1.4}:{k:'ring',x:t.x,y:t.y,r:t.s.range*t.rangeMul,c:'#9fd6ee',d:.6});
  else if(k==='invoca')F({k:'portal',x:t.x,y:t.y-6,d:1});
  else if(['verbaInim','verbaRodada','verbaAporte','verbaTorres','juros','bonus','drena'].includes(k))F({k:'moedas',x:t.x,y:t.y-34,d:1});
  else if(k==='vida')F({k:'coracoes',x:t.x,y:t.y-34,d:1.3});
  else if(k==='cessar'){const p=posAt(0);F({k:'bandeira',x:Math.min(W-70,Math.max(10,p.x)),y:Math.min(H-10,Math.max(70,p.y)),d:ef.t})}
  else if(k==='revela')F({k:'olho',x:t.x,y:t.y-78,d:1.6});
  else if(k==='trip')F({k:'espiral',x:t.x,y:t.y-10,r:ef.area==='tela'?260:t.s.range*t.rangeMul,d:1});
  else if(k==='corta'||k==='execucao'){let n=0;for(const e of S.enemies){if(e.dead||n++>24)continue;const q=posAt(e.d,e.via);F({k:'corte',x:q.x+e.off,y:q.y,d:.45})}}
  else if(k==='buffTodos')for(const o of S.towers)F({k:'ring',x:o.x,y:o.y,r:34,c:'#ffe27a',d:.6});
  else if(k==='parar'||k==='pararForte')F({k:'ring',x:t.x,y:t.y,r:ef.area==='tela'?300:t.s.range*t.rangeMul,c:'#cfe6ff',d:.6});
}
function usaPoder(t){
  if(!t||!temPoder(t)||t.podCd>0||S.menu||S.over||S.paused)return;
  const P=poderDe(t);
  t.podCd=P[2];
  for(const ef of P[3]){EFEITOS[ef.k](t,ef);fxPoder(t,ef)}
  /* Algoritmo: o próximo poder acontece duas vezes; Repost: guarda o último poder para ser repetido */
  const especial=P[3].some(ef=>['ecoPoder','copia','marcha'].includes(ef.k));
  if(S.ecoN>0&&!especial){S.ecoN--;for(const ef of P[3]){EFEITOS[ef.k](t,ef);fxPoder(t,ef)}float(t.x,t.y-96,'De novo!','#ffe27a')}
  if(!especial)S.ultimoPoder=P;
  habEvento(t,'poder');
  S.fx.push({k:'ring',x:t.x,y:t.y,r:60,c:'#ffe27a',t:0,d:.5});
  float(t.x,t.y-78,P[0]+'!','#ffe27a');beep(880,.25,'triangle',.12);
  S.poderesN=(S.poderesN||0)+1;
  regEv('especial',{id:t.id,k:t.key,nome:P[0],naAvenida:S.enemies.length,chefao:S.enemies.some(e=>e.T.boss)});
  if(!window.Robo)for(const m of checaMedalhas({poder:true}))banner('Medalha: '+m.nome+' (+F$ '+m.premio+')');
  renderPoderes(true);syncHud();
}
/* efeitos com duração: buffs do próprio personagem, de quem está perto ou de todos */
function stepPoderes(dt){
  const ap=(o,b)=>{o.auraMul*=b.vel||1;o.dmgMul*=b.dano||1;o.rangeMul*=b.alc||1;o.pierceAdd+=b.pierce||0};
  if(S.buffT>0){S.buffT-=dt;for(const o of S.towers)ap(o,S.buff)}
  if(S.bonusT>0)S.bonusT-=dt;
  if(S.revelaT>0){S.revelaT-=dt;for(const o of S.towers)o.buffDet=true}
  if(S.descT>0){S.descT-=dt;if(S.descT<=0)syncHud()}
  if(S.contT>0)S.contT-=dt;
  if(S.imuneT>0){S.imuneT-=dt;for(const o of S.towers)o.stun=0}
  for(const t of S.towers){
    stepHabs(t,dt);
    /* ganhos permanentes dos poderes de treino */
    if(t.trD)t.dmgMul*=1+t.trD;if(t.trA)t.rangeMul*=1+t.trA;if(t.trV)t.auraMul*=1+t.trV;
    /* Passeata: anda até o lugar escolhido */
    if(t.marchaT>0){t.marchaT-=dt;t.marchaFx=(t.marchaFx||0)-dt;if(t.marchaFx<=0){t.marchaFx=.45;S.fx.push({k:'ring',x:t.x,y:t.y,r:26,c:'#ffe27a',t:0,d:.4})}}
    if(t.destino){
      const dx=t.destino.x-t.x,dy=t.destino.y-t.y,d=Math.hypot(dx,dy),v=210*dt;
      if(d<=v){t.x=t.destino.x;t.y=t.destino.y;t.destino=null;t.pathD=undefined;if(t.s.pet)t.petO=petOff(t.x,t.y)}
      else{t.x+=dx/d*v;t.y+=dy/d*v}
      if(S.sel===t)posEvo();
    }
    /* pedágio: cada adversário que entra no alcance paga uma vez */
    if(t.pedT>0){
      t.pedT-=dt;
      for(const e of alvosPoder(t,t.pedA)){if(t.pedSet.has(e.id))continue;t.pedSet.add(e.id);S.cash+=t.pedV;S.ganho+=t.pedV;t.pedSoma+=t.pedV}
      if(t.pedSoma&&(t.pedT<=0||S.time-(t.pedFloat||0)>1)){t.pedFloat=S.time;float(t.x,t.y-62,'+R$ '+t.pedSoma,'#b6ffb0');t.pedSoma=0}
    }
    if(t.podCd>0)t.podCd-=dt;
    if(!(t.podT>0))continue;
    t.podT-=dt;
    const b=t.podBuff;if(!b)continue;
    if(b.area){for(const o of S.towers)if(Math.hypot(o.x-t.x,o.y-t.y)<=t.s.auraR)ap(o,b)}
    else ap(t,b);
  }
}
/* ---------- habilidades das evoluções ----------
   Cada evolução de cada personagem ganha uma habilidade formada por um GATILHO (quando acontece) e um EFEITO (o que faz).
   Nenhuma combinação gatilho + efeito se repete no jogo, e dentro do mesmo personagem nem o gatilho nem o efeito se repetem.
   O sorteio é fixo (sempre igual para todo mundo) e respeita o tema de cada um. Os números crescem com o nível da evolução. */
/* gatilhos: alvo = o gatilho já traz um adversário; acerto = só para quem ataca */
const GATILHOS={
  nAcertos:{acerto:1,alvo:1,txt:p=>`A cada ${p.n} acertos`},
  primeiro:{acerto:1,alvo:1,txt:()=>'No primeiro acerto em cada adversário'},
  chefe:{acerto:1,alvo:1,txt:()=>'Ao acertar um chefão'},
  veiculo:{acerto:1,alvo:1,txt:()=>'Ao acertar um veículo'},
  blindado:{acerto:1,alvo:1,txt:()=>'Ao acertar um blindado'},
  isentao:{acerto:1,alvo:1,txt:()=>'Ao acertar um Isentão'},
  fraco:{acerto:1,alvo:1,txt:()=>'Ao acertar quem já está quase convencido'},
  critico:{acerto:1,alvo:1,txt:p=>`Com ${p.c}% de chance a cada acerto`},
  longe:{acerto:1,alvo:1,txt:()=>'Ao acertar alguém na borda do alcance'},
  perto:{acerto:1,alvo:1,txt:()=>'Ao acertar alguém bem de perto'},
  rapido:{acerto:1,alvo:1,txt:()=>'Ao acertar um adversário rápido'},
  teimoso:{acerto:1,alvo:1,txt:()=>'Ao acertar um Cabeça-Dura'},
  convence:{acerto:1,txt:()=>'Ao convencer alguém'},
  tempo:{txt:p=>`A cada ${p.s} s, se houver alguém no alcance`},
  entra:{alvo:1,txt:()=>'Quando alguém entra no alcance'},
  lotado:{txt:()=>'Quando há 6 ou mais no alcance (no máximo a cada 4 s)'},
  inicio:{txt:()=>'No começo de cada rodada'},
  fim:{txt:()=>'No fim de cada rodada'},
  perdeApoio:{txt:()=>'Quando você perde apoio'},
  poder:{txt:()=>'Ao usar o poder especial'},
  heroi:{txt:()=>'Quando o herói usa o poder dele'},
  vizinho:{txt:()=>'Quando um personagem perto convence alguém'},
};
/* efeitos: alvo = precisa de um adversário; sem alvo no gatilho, vale para o mais adiantado no alcance. proprio = mexe no próprio ataque */
const EFEITOS_H={
  prende:{alvo:1,txt:(p,a)=>`prende ${a} por ${p.t} s`,f:(t,e,p)=>pararPoder(e,p.t,'jail')},
  atordoa:{alvo:1,txt:(p,a)=>`deixa ${a} tonto por ${p.t} s`,f:(t,e,p)=>pararPoder(e,p.t,'Tonto!')},
  lento:{alvo:1,txt:(p,a)=>`deixa ${a} lento por ${p.t} s`,f:(t,e,p)=>{e.slowT=Math.max(e.slowT,p.t)}},
  empurra:{alvo:1,txt:(p,a)=>`empurra ${a} para trás`,f:(t,e,p)=>{e.pushLeft=(e.pushLeft||0)+(e.T.boss?p.d*.2:p.d)}},
  re:{alvo:1,txt:(p,a)=>`faz ${a} andar para trás por ${p.t} s`,f:(t,e,p)=>{if(!e.T.boss)e.tripT=Math.max(e.tripT||0,p.t)}},
  marca:{alvo:1,txt:(p,a)=>`deixa ${a} ${Math.round((p.x-1)*100)}% mais fácil de convencer por ${p.t} s`,f:(t,e,p)=>{e.vulnT=Math.max(e.vulnT||0,p.t);e.vulnX=Math.max(e.vulnX||1,p.x)}},
  ricochete:{alvo:1,txt:(p,a)=>`o argumento pula de ${a} para ${p.n} vizinhos`,f:(t,e,p)=>{const q=posAt(e.d,e.via);let n=0;for(const o of S.enemies){if(o===e||o.dead)continue;const w=posAt(o.d,o.via);if(Math.hypot(w.x-q.x,w.y-q.y)<80){S.fx.push({k:'linha',x:q.x,y:q.y-14,x2:w.x,y2:w.y-14,t:0,d:.2});hurt(o,habDano(t)*p.f,'puro',t);if(++n>=p.n)break}}}},
  explosao:{alvo:1,txt:(p,a)=>`explode em volta de ${a}`,f:(t,e,p)=>{const q=posAt(e.d,e.via);S.fx.push({k:'ring',x:q.x,y:q.y,r:p.r,c:'#ff9a3c',t:0,d:.3});for(const o of [...S.enemies]){if(o.dead)continue;const w=posAt(o.d,o.via);if(Math.hypot(w.x-q.x,w.y-q.y)<=p.r)hurt(o,habDano(t)*p.f,'puro',t)}}},
  queima:{alvo:1,txt:(p,a)=>`deixa ${a} queimando por ${p.t} s`,f:(t,e,p)=>{e.burnT=p.t;e.burnD=habDano(t)*p.f;e.burnSrc=t}},
  desblinda:{alvo:1,txt:(p,a)=>`tira a blindagem de ${a} por ${p.t} s`,f:(t,e,p)=>{e.armorOffT=p.t;e.shield=0}},
  gelo:{alvo:1,txt:(p,a)=>`congela ${a} por ${p.t} s`,f:(t,e,p)=>{pararPoder(e,p.t,'Congelado!');e.slowT=Math.max(e.slowT,p.t+1.5)}},
  confunde:{alvo:1,txt:(p,a)=>`faz ${a} dançar no lugar por ${p.t} s`,f:(t,e,p)=>pararPoder(e,p.t,'dance')},
  semRegen:{alvo:1,txt:(p,a)=>`impede ${a} de se recuperar e de curar os outros por ${p.t} s`,f:(t,e,p)=>{e.noRegenT=p.t;e.vulnT=Math.max(e.vulnT||0,1.5);e.vulnX=Math.max(e.vulnX||1,1.1)}},
  roubaVel:{alvo:1,txt:(p,a)=>`rouba a pressa de ${a} por ${p.t} s e acelera este personagem`,f:(t,e,p)=>{e.roubaT=p.t;t.rajT=Math.max(t.rajT||0,p.t*.6)}},
  golpe:{alvo:1,txt:(p,a)=>`tira mais ${Math.round(p.f*100)}% do argumento normal de ${a}`,f:(t,e,p)=>hurt(e,habDano(t)*p.f,'puro',t)},
  executa:{alvo:1,txt:(p,a)=>`convence ${a} na hora se tiver até ${Math.round(p.x*100)}% do argumento (chefões não)`,f:(t,e,p)=>{if(!e.T.boss&&!e.dead&&e.hp<=e.max*p.x)convince(e,t)}},
  muro:{alvo:1,txt:(p,a)=>`levanta uma barreira na frente de ${a} por ${p.t} s`,f:(t,e,p)=>{if(S.walls.length<12)S.walls.push(novoBloqueio(Math.min(LEN-20,e.d+24),p.t,false))}},
  fogueira:{alvo:1,txt:(p,a)=>`acende uma fogueira onde está ${a}`,f:(t,e,p)=>{const q=posAt(e.d+20,e.via);if(S.fires.length<24)S.fires.push({x:q.x,y:q.y,life:p.t,max:p.t,r:34,dmg:habDano(t)*.5,det:true,src:t,cd:.2,ph:rand(0,6)})}},
  onda:{txt:p=>`empurra um pouco todo mundo no alcance`,f:(t,e,p)=>{for(const o of alvosPoder(t,0))o.pushLeft=(o.pushLeft||0)+(o.T.boss?p.d*.2:p.d)}},
  chuva:{txt:p=>`${p.n} argumentos caem em adversários aleatórios da avenida`,f:(t,e,p)=>{const v=S.enemies.filter(o=>!o.dead);for(let i=0;i<p.n&&v.length;i++){const o=pick(v);const q=posAt(o.d,o.via);S.fx.push({k:'ring',x:q.x,y:q.y,r:16,c:'#ffe27a',t:0,d:.3});hurt(o,habDano(t)*p.f,'puro',t)}}},
  verba:{txt:p=>`rende R$ ${p.v}`,f:(t,e,p)=>{S.cash+=p.v;S.ganho+=p.v;habTxt(t,'+R$ '+p.v,'#b6ffb0')}},
  apoio:{txt:p=>`recupera ${p.v} de apoio`,f:(t,e,p)=>{S.lives=Math.min(S.d.lives+60,S.lives+p.v);habTxt(t,'+'+p.v+' apoio','#b6ffb0')}},
  recarga:{txt:p=>`adianta em ${p.s} s a recarga do poder especial deste personagem e do herói`,f:(t,e,p)=>{if(t.podCd>0)t.podCd=Math.max(0,t.podCd-p.s);if(S.abilCd>0)S.abilCd=Math.max(0,S.abilCd-p.s*.5)}},
  ajudante:{txt:p=>`chama um ajudante que marcha contra a fila por ${p.t} s`,f:(t,e,p)=>{if(S.allies.length>=30)return;if(t.pathD===undefined){t.pathD=nearestD(t.x,t.y);t.pathV=nearestD.via}S.allies.push({drone:false,dino:false,rato:false,scale:1,cor:['#c9a45a','#a8823a'],via:t.pathV,d:Math.min(LEN,t.pathD),life:p.t,dmg:habDano(t)*.6,det:true,src:t,cd:0,face:1,beam:0,bx:0,by:0,dead:false,ph:rand(0,6)})}},
  dobra:{proprio:1,txt:()=>`o próximo acerto tira o dobro`,f:t=>{t.dobra=true}},
  eco:{proprio:1,txt:()=>`ataca de novo na hora`,f:t=>{t.cd=0}},
  rajada:{proprio:1,txt:p=>`ataca 2 vezes mais rápido por ${p.t} s`,f:(t,e,p)=>{t.rajT=Math.max(t.rajT||0,p.t)}},
  mira:{proprio:1,txt:p=>`alcança 25% mais longe por ${p.t} s`,f:(t,e,p)=>{t.alcT=Math.max(t.alcT||0,p.t)}},
  vizinhos:{txt:p=>`os personagens perto atacam 30% mais rápido por ${p.t} s`,f:(t,e,p)=>{t.vizT=Math.max(t.vizT||0,p.t)}},
  premio:{txt:p=>`cada convencido nos próximos ${p.t} s rende R$ ${p.v} a mais`,f:(t,e,p)=>{t.bonT=p.t;t.bonV=p.v}},
  revela:{txt:p=>`revela os Isentões para todos os seus personagens por ${p.t} s`,f:(t,e,p)=>{S.revelaT=Math.max(S.revelaT||0,p.t)}},
};
/* números de cada efeito, já crescendo com o nível da evolução (n = 0, 1 ou 2) */
function paramsHab(g,e,n){
  const k=1+.35*n,r=v=>Math.round(v*10)/10;
  const p={n:[8,6,4][n],c:[8,12,16][n],s:[8,6,5][n]};
  Object.assign(p,{t:r(({prende:1,atordoa:.8,lento:2,re:1.2,marca:4,queima:3,desblinda:4,gelo:1.2,confunde:1.2,semRegen:6,roubaVel:3,muro:1.5,fogueira:3,ajudante:6,rajada:3,mira:4,vizinhos:4,premio:6,revela:4})[e]*k||1),
    d:Math.round(60*k),f:r(({ricochete:.6,explosao:.7,queima:.5,golpe:1.2,chuva:1.5})[e]*k||1),r:Math.round(42*(1+.15*n)),
    v:({verba:[3,5,8],apoio:[1,1,2],premio:[2,3,5]})[e]?({verba:[3,5,8],apoio:[1,1,2],premio:[2,3,5]})[e][n]:0,x:({marca:[1.2,1.3,1.45],executa:[.1,.14,.2]})[e]?({marca:[1.2,1.3,1.45],executa:[.1,.14,.2]})[e][n]:1});
  if(e==='ricochete'||e==='chuva')p.n=[2,3,4][n];
  if(e==='recarga')p.s=[2,3,5][n];
  /* gatilhos que disparam muito pedem efeitos menores, e os raros pedem maiores */
  if(['inicio','fim','perdeApoio','poder','heroi'].includes(g)&&(e==='verba'))p.v*=15;
  if(['inicio','fim','poder','heroi','lotado'].includes(g)&&(e==='apoio'))p.v*=3;
  if(g==='tempo'&&e==='verba')p.v*=3;
  /* verba das habilidades também é renda passiva: cai junto com a das evoluções */
  if(e==='verba')p.v=Math.max(1,Math.round(p.v*RENDA_EVO));
  return p;
}
/* tema de cada tipo de ataque: efeitos que combinam com ele vêm primeiro no sorteio */
const TEMA_H={papel:['marca','prende','ricochete','verba'],som:['atordoa','confunde','onda','vizinhos'],comida:['lento','apoio','premio','fogueira'],meme:['revela','ricochete','chuva','marca'],
  livro:['marca','explosao','golpe','desblinda'],decisao:['prende','semRegen','desblinda','executa'],fogo:['queima','fogueira','explosao','rajada'],gado:['empurra','re','onda','ajudante'],
  sangue:['roubaVel','verba','semRegen','golpe'],danca:['confunde','atordoa','vizinhos','rajada'],vento:['empurra','onda','re','lento'],neve:['gelo','lento','prende','onda'],
  mala:['explosao','verba','chuva','dobra'],morcego:['roubaVel','queima','ajudante','chuva'],puro:['golpe','dobra','eco','mira']};
/* sorteio fixo com semente pelo nome, para cada personagem ter uma ordem própria */
function hashStr(s){let h=2166136261;for(const ch of s){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function embaralha(arr,seed){const a=arr.slice();let s=seed||1;for(let i=a.length-1;i>0;i--){s=(Math.imul(s,1103515245)+12345)>>>0;const j=s%(i+1);[a[i],a[j]]=[a[j],a[i]]}return a}
function montaHabilidades(){
  const usados=new Set(),G=Object.keys(GATILHOS),E=Object.keys(EFEITOS_H);
  /* cada personagem com a sua própria cópia das evoluções, mesmo os que nasceram de outro */
  for(const k of Object.keys(TOWERS))TOWERS[k].up=TOWERS[k].up.map(p=>p.map(u=>({...u})));
  for(const k of Object.keys(TOWERS)){
    const T=TOWERS[k],ataca=T.atk!=='none',tipo=T.base.type||'puro',seed=hashStr(k);
    const gOk=embaralha(G.filter(g=>ataca||!GATILHOS[g].acerto),seed);
    const tema=TEMA_H[tipo]||TEMA_H.puro;
    const eOk=[...embaralha(tema,seed^77),...embaralha(E.filter(e=>!tema.includes(e)),seed^991)].filter(e=>ataca||!EFEITOS_H[e].proprio);
    const gDoPers=new Set(),eDoPers=new Set();
    T.up.forEach((path,pi)=>path.forEach((u,n)=>{
      let esc=null;
      /* efeitos que não valem para chefões nunca ficam com o gatilho "ao acertar um chefão" */
      const nunca={chefe:['executa','re']};
      for(const e of eOk){if(eDoPers.has(e))continue;for(const g of gOk){if(gDoPers.has(g)||usados.has(g+'|'+e)||(nunca[g]||[]).includes(e))continue;esc=[g,e];break}if(esc)break}
      if(!esc)return;
      const[g,e]=esc;usados.add(g+'|'+e);gDoPers.add(g);eDoPers.add(e);
      const p=paramsHab(g,e,n);
      const temAlvo=GATILHOS[g].alvo,alvo=g==='convence'||g==='vizinho'?'o vizinho mais próximo':temAlvo?'o alvo':'o mais adiantado no alcance';
      /* texto em português certo: "do alvo" em vez de "de o alvo", e vírgula nos decimais */
      const txt=(GATILHOS[g].txt(p)+', '+EFEITOS_H[e].txt(p,alvo)+'.').replace(/ de o /g,' do ').replace(/(\d)\.(\d)/g,'$1,$2');
      u.hab={g,e,p,txt};
    }));
  }
  /* o Patriota é a versão da direita do Militante e fica com as mesmas habilidades: o sorteio tinha dado a ele
     um conjunto bem mais fraco ("ao perder apoio", "ao acertar um Isentão"), e com o mesmo sorteio a esquerda
     vencia 23 de 27 no Difícil e caía para 11 quando o Militante recebia o conjunto do Patriota (2026-11-12) */
  for(const[k,de]of Object.entries(ESPELHO_HAB))TOWERS[k].up.forEach((p,i)=>p.forEach((u,n)=>{const h=TOWERS[de].up[i][n].hab;if(h)u.hab={...h,p:{...h.p}}}));
}
const ESPELHO_HAB={patriota:'militante'};
const habDano=t=>Math.max(1,(t.s.dmg||t.s.batDmg||t.s.robotDmg||t.s.plantDmg||t.s.petDmg||(2+S.round*.4)))*t.dmgMul;
let habTxtT=0;function habTxt(t,s,c){if(S.time-habTxtT>.25){habTxtT=S.time;float(t.x,t.y-70,s,c)}}
let habLock=0;
/* executa a habilidade: escolhe o adversário quando o gatilho não traz um */
/* intervalo mínimo entre dois disparos dos efeitos fortes, para gatilhos que acontecem toda hora não exagerarem */
const ICD_H={verba:1.5,apoio:8,premio:6,recarga:3,revela:5,vizinhos:4,mira:4,rajada:4,chuva:2,ajudante:3,muro:2,fogueira:1,explosao:.5,onda:2,executa:.3};
function rodaHab(t,h,e,pos){
  const E=EFEITOS_H[h.e],icd=ICD_H[h.e]||0;
  if(icd&&h.icdT>S.time)return;
  if(E.alvo&&(!e||e.dead)){
    if(pos){let m=1e9;e=null;for(const o of S.enemies){if(o.dead)continue;const w=posAt(o.d,o.via),d=Math.hypot(w.x-pos.x,w.y-pos.y);if(d<m&&d<120){m=d;e=o}}}
    else e=targets(t,t.s.range*t.rangeMul||160,1,'first').map(q=>q.e)[0];
    if(!e)return;
  }
  if(icd)h.icdT=S.time+icd;
  habLock++;try{E.f(t,e,h.p)}finally{habLock--}
  /* conta os disparos e mostra um aviso curto sobre o personagem (no máximo um por segundo) */
  t.habCont=t.habCont||{};const ch=h.g+'|'+h.e;t.habCont[ch]=(t.habCont[ch]||0)+1;
  if(S.time-(t.habFx??-9)>1){t.habFx=S.time;S.fx.push({k:'habIco',x:t.x,y:t.y-66,txt:NOME_EF[h.e]||'',t:0,d:.85});dica('hab','O ⚡ em cima do personagem é uma habilidade de evolução disparando. A janela dele mostra quantas vezes cada uma disparou.')}
}
const NOME_EF={prende:'Prende',atordoa:'Tonto',lento:'Lento',empurra:'Empurrão',re:'Ré',marca:'Marcado',ricochete:'Ricochete',explosao:'Explosão',queima:'Queima',desblinda:'Sem blindagem',gelo:'Gelo',confunde:'Dança',semRegen:'Sem cura',roubaVel:'Pressa roubada',golpe:'Golpe',executa:'Convencido',muro:'Barreira',fogueira:'Fogueira',onda:'Onda',chuva:'Chuva',verba:'Verba',apoio:'Apoio',recarga:'Recarga',ajudante:'Ajudante',dobra:'Dobro',eco:'De novo',rajada:'Rajada',mira:'Mira',vizinhos:'Ânimo',premio:'Prêmio',revela:'Revela'};
/* gatilhos de acerto: chamados pelo hurt quando o personagem acerta alguém */
function habAcerto(t,e){
  if(habLock)return;
  const q=posAt(e.d,e.via),dist=Math.hypot(q.x-t.x,q.y-t.y),R=(t.s.range||150)*t.rangeMul;
  for(const h of t.habs){
    const g=h.g;let ok=false;
    if(g==='nAcertos'){t.habN=(t.habN||0)+1;ok=t.habN%h.p.n===0}
    else if(g==='primeiro'){if(!e.vistoPor)e.vistoPor=new Set();ok=!e.vistoPor.has(t.id);e.vistoPor.add(t.id)}
    else if(g==='chefe')ok=!!e.T.boss;
    else if(g==='veiculo')ok=!!e.T.veh;
    else if(g==='blindado')ok=!!e.T.armor;
    else if(g==='isentao')ok=!!e.T.camo;
    else if(g==='fraco')ok=e.hp<=e.max*.25;
    else if(g==='critico')ok=Math.random()*100<h.p.c;
    else if(g==='longe')ok=dist>R*.8;
    /* "bem de perto": nunca menos que 55, porque nenhum personagem fica a menos de 38 do meio da avenida */
    else if(g==='perto')ok=dist<Math.max(R*.35,55);
    else if(g==='rapido')ok=e.T.spd>=80;
    else if(g==='teimoso')ok=!!e.T.regen;
    if(ok)rodaHab(t,h,e);
  }
}
/* gatilhos de evento: começo/fim de rodada, perder apoio, poder, herói, convencer */
function habEvento(t,g,pos){if(habLock||!t.habs)return;for(const h of t.habs)if(h.g===g)rodaHab(t,h,null,pos)}
function habEventoTodos(g){for(const t of S.towers)habEvento(t,g)}
/* gatilhos que dependem do tempo ou de quem está no alcance */
function stepHabs(t,dt){
  for(const k of ['rajT','alcT','vizT','bonT'])if(t[k]>0)t[k]-=dt;
  if(t.rajT>0)t.auraMul*=2;
  if(t.alcT>0)t.rangeMul*=1.25;
  if(t.vizT>0)for(const o of S.towers)if(o!==t&&Math.hypot(o.x-t.x,o.y-t.y)<=170)o.auraMul*=1.3;
  if(!t.habs||!t.habs.length||!S.inRound)return;
  for(const h of t.habs){
    if(h.g==='tempo'){h.cd=(h.cd||h.p.s)-dt;if(h.cd<=0){h.cd=h.p.s;if(targets(t,(t.s.range||150)*t.rangeMul,1).length)rodaHab(t,h,null)}}
    /* confere 4 vezes por segundo (antes conferia a cada quadro enquanto não havia 6 no alcance) */
    else if(h.g==='lotado'){h.cd=(h.cd||0)-dt;if(h.cd<=0){if(targets(t,(t.s.range||150)*t.rangeMul,6).length>=6){h.cd=4;rodaHab(t,h,null)}else h.cd=.25}}
    else if(h.g==='entra'){h.cd=(h.cd||0)-dt;if(h.cd<=0){h.cd=.25;if(!t.dentro)t.dentro=new Set();const ag=new Set();for(const q of targets(t,(t.s.range||150)*t.rangeMul,99)){ag.add(q.e.id);if(!t.dentro.has(q.e.id))rodaHab(t,h,q.e)}t.dentro=ag}}
  }
}
/* as habilidades que o personagem já comprou */
function habsDe(t){
  const l=[];
  for(let i=0;i<t.a;i++){const h=t.T.up[0][i].hab;if(h)l.push({...h})}
  for(let i=0;i<t.b;i++){const h=t.T.up[1][i].hab;if(h)l.push({...h})}
  return l;
}
/* fileira de botões de poder no canto do mapa: um por personagem que chegou à 3ª evolução */
let poderesSig='';
/* fileira de especiais recolhida (2026-11-18): o jogador recolhe ou mostra pelo botão da ponta; fica lembrado no navegador */
let poderesRecolhido=false;try{poderesRecolhido=localStorage.getItem('gn_poderes_recolhido')==='1'}catch(e){}
function alternaPoderes(){
  poderesRecolhido=!poderesRecolhido;try{localStorage.setItem('gn_poderes_recolhido',poderesRecolhido?'1':'0')}catch(e){}
  const box=$('poderes');if(box)box.classList.toggle('recolhido',poderesRecolhido);renderPoderes(true);
}
/* símbolo de cada tipo de efeito: junto com o rosto do personagem, deixa cada especial com um botão diferente
   (os dois especiais de um mesmo personagem nunca usam o mesmo tipo de efeito) */
const EMBLEMA={buff:'⚡',buffTodos:'📣',parar:'✋',pararForte:'⛔',empurra:'💨',volta:'↩️',lento:'🐢',vuln:'🎯',vulnForte:'🎯',trip:'🌀',cessar:'🚧',corta:'✂️',
  drena:'🧛',convence:'🤝',execucao:'💫',bomba:'💣',chuva:'🌧️',leque:'📢',antiChefe:'👑',invoca:'🤖',fogo:'🔥',muro:'🧱',bois:'🐂',vida:'❤️',destrava:'🔓',
  verbaInim:'💰',verbaRodada:'💰',verbaAporte:'🏦',verbaTorres:'🏢',juros:'📈',bonus:'💵',revela:'👁️',marcha:'🚶',corrente:'⛓️',rajadaTela:'🎆',escudo:'🛡️',
  desconto:'🏷️',investe:'💹',vira:'🔄',ima:'🧲',lama:'🌳',treino:'💪',recargaTodos:'⏩',xpHeroi:'⭐',contagio:'👻',meteoro:'☄️',salva:'🎇',pedagio:'🎫',
  anistia:'🕊️',ecoPoder:'🔁',copia:'📋',marcaVerba:'💲',vacina:'💉',queimaTela:'♨️',desblinda:'🔧',explode:'💥',rouba:'🤏',compraApoio:'🎪',doacao:'🎁',
  dobraRodada:'✖️',focoFrente:'🔦',onda:'🌊',sorteio:'🎲',chefeLento:'🐌',reembolso:'🧾',trocaLugar:'🔀'};
/* cor de fundo própria de cada especial, tirada do nome dele */
const corPoder=nome=>`hsl(${hashStr(nome)%360} 75% 72%)`;
/* especiais iguais (mesmo personagem e mesmo caminho) ficam num botão só */
const grupoPoder=t=>t.key+'|'+caminhoPoder(t);
function prontosDoGrupo(g){return S.towers.filter(t=>temPoder(t)&&grupoPoder(t)===g&&!(t.podCd>0))}
/* usa um dos especiais do grupo: o que tem mais adversários no alcance (os da avenida inteira valem igual para todos) */
function usaPoderGrupo(g){
  const l=prontosDoGrupo(g);if(!l.length)return;
  let best=l[0],bn=-1;for(const t of l){const n=alvosPoder(t,0).length;if(n>bn){bn=n;best=t}}
  usaPoder(best);
}
function renderPoderes(forca){
  const box=$('poderes');if(!box)return;
  if(!S||S.menu||S.over){box.innerHTML='';poderesSig='';return}
  const ts=S.towers.filter(temPoder),grupos=[];
  for(const t of ts){const g=grupoPoder(t);let x=grupos.find(o=>o.g===g);if(!x){x={g,ts:[]};grupos.push(x)}x.ts.push(t)}
  /* poder próprio do herói (2026-11-17): primeiro botão da fileira, com ★ no lugar do emblema; só aparece no nível máximo */
  const h=heroiEmCampo(),HP=h&&poderLiberado(h)&&HEROI_PODER[h.key];
  const sig=(HP?'heroi:'+h.id+',':'')+grupos.map(x=>x.g+':'+x.ts.length).join(',');
  if(forca||sig!==poderesSig){
    poderesSig=sig;
    /* botão da ponta: recolhe ou mostra a fileira (só aparece quando há algum especial) */
    const temAlgum=!!HP||grupos.length>0;
    box.innerHTML=(temAlgum?`<button class="poderToggle" aria-expanded="${!poderesRecolhido}" aria-label="${poderesRecolhido?'Mostrar os especiais':'Recolher os especiais'}" title="${poderesRecolhido?'Mostrar os especiais':'Recolher os especiais'}"><b>⚡</b><i class="ptCont"></i><span class="ptSeta" aria-hidden="true">${poderesRecolhido?'›':'‹'}</span></button>`:'')
     +(HP?`<button class="poder poderHeroi" data-g="heroi" style="background:${corPoder(HP[0])}" title="★ ${HP[0]}: ${HP[1]} (poder do herói, tecla F)" aria-label="Poder do herói: ${HP[0]}"><canvas></canvas><i class="pCarga"></i><i class="pEmb">★</i><i class="pBarra"><b></b></i><b class="pNum"></b><span></span></button>`:'')
     +grupos.map(({g,ts})=>{const t=ts[0],P=poderDe(t);
      return `<button class="poder" data-g="${g}" style="background:${corPoder(P[0])}" title="${P[0]}: ${P[1]}${ts.length>1?` (${ts.length} personagens com este especial: cada toque usa um)`:''}" aria-label="Especial ${P[0]}"><canvas></canvas><i class="pCarga"></i><i class="pEmb">${EMBLEMA[P[3][0].k]||'⚡'}</i><i class="pBarra"><b></b></i><b class="pNum"></b><span></span></button>`}).join('');
    box.classList.toggle('recolhido',poderesRecolhido);
    const tg=box.querySelector('.poderToggle');if(tg)tg.onclick=ev=>{ev.currentTarget.blur();alternaPoderes()};
    box.querySelectorAll('.poder').forEach(b=>{
      if(b.dataset.g==='heroi'){portrait(b.querySelector('canvas'),h.look,'#0002',iconeDe(h.key));b.onclick=ev=>{ev.currentTarget.blur();fazOL()};return}
      const t=S.towers.find(o=>temPoder(o)&&grupoPoder(o)===b.dataset.g);portrait(b.querySelector('canvas'),t.look,'#0002',iconeDe(t.key));b.onclick=ev=>{ev.currentTarget.blur();usaPoderGrupo(b.dataset.g)}});
  }
  const bh=box.querySelector('.poderHeroi');
  if(bh&&h){
    const pronto=!(S.abilCd>0)&&!(h.stun>0),falta=pronto?0:clamp(S.abilCd/(h.s.abilCd||45),0,1);
    bh.disabled=!pronto||S.paused;bh.classList.toggle('recarga',!pronto);
    bh.querySelector('span').textContent=S.abilCd>0?Math.ceil(S.abilCd)+'s':'';
    bh.querySelector('.pCarga').style.background=!pronto?`conic-gradient(rgba(29,26,22,.62) 0 ${falta*360}deg,transparent ${falta*360}deg)`:'none';
    bh.querySelector('.pBarra').style.display='none';
    if(pronto&&bh.dataset.prontos==='0'){bh.classList.remove('pisca');void bh.offsetWidth;bh.classList.add('pisca')}
    bh.dataset.prontos=pronto?1:0;
  }
  box.querySelectorAll('.poder:not(.poderHeroi)').forEach(b=>{
    const doG=ts.filter(t=>grupoPoder(t)===b.dataset.g);if(!doG.length)return;
    const prontos=doG.filter(t=>!(t.podCd>0)).length,cd=prontos?0:Math.ceil(Math.min(...doG.map(t=>t.podCd)));
    b.disabled=!prontos||S.paused;b.classList.toggle('recarga',!prontos);b.classList.toggle('ativo',doG.some(t=>t.podT>0));
    b.querySelector('span').textContent=cd?cd+'s':'';
    /* carregando: o próximo a ficar pronto. Sem nenhum pronto, um "relógio" escuro recua revelando a cor do botão;
       com alguns prontos e outros carregando, uma barrinha embaixo enche */
    const carreg=doG.filter(t=>t.podCd>0),prox=carreg.reduce((m,t)=>!m||t.podCd<m.podCd?t:m,null);
    const falta=prox?clamp(prox.podCd/cdPoder(prox),0,1):0;
    b.querySelector('.pCarga').style.background=!prontos&&prox?`conic-gradient(rgba(29,26,22,.62) 0 ${falta*360}deg,transparent ${falta*360}deg)`:'none';
    const barra=b.querySelector('.pBarra');barra.style.display=prontos&&prox?'block':'none';if(prox)barra.firstChild.style.width=Math.round((1-falta)*100)+'%';
    /* acabou de ficar pronto: pisca */
    if(prontos>(+b.dataset.prontos||0)&&b.dataset.prontos!==undefined){b.classList.remove('pisca');void b.offsetWidth;b.classList.add('pisca')}
    b.dataset.prontos=prontos;
    /* contador: quantos estão prontos agora (só aparece quando o grupo tem mais de um) */
    const n=b.querySelector('.pNum');n.textContent=doG.length>1?'×'+prontos:'';n.classList.toggle('zero',!prontos);
  });
  /* recolhida: o botão da ponta mostra quantos especiais estão prontos para usar */
  const ct=box.querySelector('.ptCont');
  if(ct){const n=[...box.querySelectorAll('.poder')].filter(b=>!b.classList.contains('recarga')).length;ct.textContent=poderesRecolhido&&n?n:'';box.querySelector('.poderToggle').classList.toggle('temPronto',poderesRecolhido&&n>0)}
  const ub=$('usaPoder');
  if(ub&&S.sel&&temPoder(S.sel)){const cd=S.sel.podCd>0?Math.ceil(S.sel.podCd):0;ub.disabled=cd>0||S.paused;ub.textContent='⚡ '+nomePoder(S.sel)+(cd?' ('+cd+' s)':'')}
}
/* desfazer a última compra (personagem novo ou evolução): devolve todo o valor, mas só enquanto a rodada não mudar */
function podeDesfazer(){const u=S&&S.ultima;return !!u&&u.rodada===S.round&&S.modo!=='semvender'&&!S.over&&S.towers.includes(u.t)&&(u.tipo==='torre'||(u.p?u.t.b:u.t.a)>0)}
function textoDesfazer(){const u=S.ultima;return(u.tipo==='torre'?(u.t.look.nome||u.t.T.nome):(u.t.T.up[u.p][(u.p?u.t.b:u.t.a)-1].n))+' (R$ '+u.custo.toLocaleString('pt-BR')+')'}
function desfazCompra(){
  if(!podeDesfazer()){if(S&&S.ultima&&S.ultima.rodada!==S.round)float(830,190,'Só dá para desfazer na mesma rodada','#ffd9a0');return}
  const u=S.ultima,t=u.t;
  regEv('desfazer',{oque:u.tipo==='torre'?'colocar':'evoluir',id:t.id,k:t.key,custo:u.custo});
  if(u.tipo==='torre'){S.towers=S.towers.filter(o=>o!==t);if(S.sel===t)S.sel=null}
  else{if(u.p)t.b--;else t.a--;t.spent-=u.custo;calcStats(t)}
  S.cash+=u.custo;S.ultima=null;
  float(t.x,t.y-60,'Desfeito: +R$ '+u.custo.toLocaleString('pt-BR'),'#b6ffb0');beep(520,.1,'triangle',.06);
  renderPanel();syncHud();
}
function sell(t){
  if(S.modo==='semvender'){float(t.x,t.y-60,'Modo sem vender','#ffd9a0');return}
  if(S.ultima&&S.ultima.t===t)S.ultima=null;
  regEv('vender',{id:t.id,k:t.key,a:t.a,b:t.b,valor:Math.round(t.spent*.7)+(t.caixa||0),conv:t.kills|0,dano:Math.round(t.dano||0)});
  S.cash+=Math.round(t.spent*.7)+(t.caixa||0);S.towers=S.towers.filter(o=>o!==t);S.sel=null;renderPanel();syncHud();
}

/* ---------- painel ---------- */
function portrait(cn,L,bgc,building){
  const c=cn.getContext('2d');cn.width=96;cn.height=108;c.scale(2,2);
  if(building==='tank'||building==='tank2'){c.translate(24,28);c.scale(.62,.62);drawTank(c,0,0,-.55,0,false,building==='tank2'?2:1);return}
  if(building){predio(c,22,52,0,0,building);return}
  char(c,L,22,74,1.5,0,{aim:-1.25,shadow:false});
}
/* prepara um canvas de px x py pixels na tela, nítido em telas de alta densidade, com escala para um desenho de bw x bh */
function telaFig(cn,px,py,bw,bh){
  const d=Math.min(2,devicePixelRatio||1);cn.width=Math.round(px*d);cn.height=Math.round(py*d);cn.style.width=px+'px';cn.style.height=py+'px';
  const c=cn.getContext('2d'),k=Math.min(px/bw,py/bh)*d;c.setTransform(k,0,0,k,(px*d-bw*k)/2,(py*d-bh*k)/2);return c;
}
/* o personagem inteiro como fica com a evoluções a (caminho 1) e b (caminho 2), com os objetos ao redor */
function pintaEvo(cn,k,a,b,px,medio){
  /* sem evolução não há objetos em volta, então o desenho chega mais perto do personagem; "medio" corta um pouco dos objetos para o personagem aparecer maior */
  const T=TOWERS[k],L=buildLook({key:k,a,b,T}),perto=!a&&!b,bw=perto?76:medio?100:132,bh=perto?84:medio?96:119;
  const c=telaFig(cn,px,Math.round(px*.9),bw,bh);
  c.translate(bw/2,perto?72:medio?76:92);
  c.fillStyle='#1d1a1640';c.beginPath();c.ellipse(0,3,19,8,0,0,7);c.fill();
  c.fillStyle=T.atk==='none'?'#7a3b3b':'#f4ead5';c.beginPath();c.ellipse(0,1,17,6.6,0,0,7);c.fill();
  if(T.building)predio(c,0,1,1,a,T.building);
  gear(c,L,'b',1);
  if(T.tank)drawTank(c,0,-8,-.55,a,false,T.tank);
  else if(!T.building)char(c,L,0,1,LOOKS[k].hs?1.28:1.05,1,{aim:-1.15,shadow:false});
}
/* adversário desenhado como aparece na avenida; o Isentão fica meio transparente, como no jogo */
function pintaInimigo(cn,k,px){
  const T=ENEMY[k];
  if(T.veh==='moto'){const c=telaFig(cn,px,px,48,54);moto(c,24,44,1,1,1,0,T.red,false);return}
  if(T.veh){const w=T.w,c=telaFig(cn,px,px,w+14,w+14);truck(c,(w+14)/2,(w+14)/2+4,w,0,T.veh,T.red);return}
  const bw=T.s*34,bh=T.s*60,c=telaFig(cn,px,px,bw,bh);
  if(T.camo){c.strokeStyle='#6d6250';c.setLineDash([3,3]);c.lineWidth=1.2;c.beginPath();c.ellipse(bw/2,bh*.55,bw*.48,bh*.45,0,0,7);c.stroke();c.setLineDash([]);c.globalAlpha=.55}
  char(c,LOOKOF(k),bw/2,bh-5*T.s,T.s,0,{aim:-1.2,shadow:false});c.globalAlpha=1;
}
/* o que cada tipo de adversário tem de especial, a partir dos dados dele */
function especialDe(k){
  const T=ENEMY[k],nome=x=>ENEMY[x].nome.replace(/ \(.*\)/,''),out=[];
  if(T.boss){
    /* rodada e regiões onde ele aparece: os originais ficam no Sudeste (e o da rodada 40 em todo lugar) */
    let rod='?',regs=[];
    for(const side of['pt','br']){
      for(const[r,v]of Object.entries(SIDES[side].boss))if(v[0]===k){rod=r;regs.push(+r===40?'todas as regiões':'Sudeste')}
      for(const[reg,tab]of Object.entries(CHEFES_REGIAO[side]))for(const[r,v]of Object.entries(tab))if(v===k){rod=r;regs.push(reg)}
    }
    out.push('Chefão da rodada '+rod+(regs.length?' ('+regs.join(', ')+')':'')+'. Muito resistente. '+(TEXTO_AI.get(AI[k])||'')+(T.leak>=999?' Se chegar ao fim, você perde na hora.':' Se passar, tira '+T.leak+' de apoio.'));
  }
  if(T.camo)out.push('Invisível: só é atingido por quem detecta Isentões. Procure nas evoluções as que dizem "detecta Isentões".');
  if(T.immune==='som')out.push('Ignora ataques de som, como discursos, música e buzina.');
  if(T.heal)out.push('De tempos em tempos, cura quem está perto dele.');
  if(T.armor)out.push('Blindado: cada acerto tira '+T.armor+' do argumento, então ataque fraco não faz efeito. Evolua quem dá mais argumento por acerto; fogo e o poder do herói ignoram a blindagem.');
  if(T.regen)out.push('Cabeça-dura: se ninguém acertar por 1 segundo, recupera o argumento aos poucos. Precisa de ataque constante.');
  if(T.spd>=120)out.push('Muito rápido.');
  else if(!T.boss&&T.spd>=80)out.push('Rápido.');
  if(T.kids){const c={};T.kids.forEach(x=>c[x]=(c[x]||0)+1);out.push('Ao ser convencido, solta '+Object.entries(c).map(([x,n])=>nome(x)+(n>1?' (×'+n+')':'')).join(' e ')+'.')}
  if(!out.length)out.push('O mais comum da marcha. Fraco e devagar.');
  if(!T.boss&&T.hp>=100)out.push('Aguenta muito argumento.');
  return out.join(' ');
}
/* ficha com as seis evoluções desenhadas; abre pela loja e pela janela de evolução */
let fichaPausa=false;
function abreFicha(k){
  fechaFicha();
  const T=TOWERS[k],emJogo=S&&!S.menu&&!S.over;
  if(emJogo){fichaPausa=!!S.paused;S.paused=true;syncHud()}
  /* ficha enxuta (2026-11-17, pedido do jogador): só as evoluções, cada uma com o nome e a descrição curta */
  const passo=(p,i)=>{const u=T.up[p][i];return `<div class="fichaPasso"><canvas data-ev="${p?0:i+1},${p?i+1:0}"></canvas><b>${i+1}. ${u.n}</b><small>${u.d}</small></div>`};
  const d=document.createElement('div');d.id='ficha';
  d.innerHTML=`<div class="sheet fichaBox" role="dialog" aria-modal="true" aria-labelledby="fichaTit"><button id="fichaX" title="Fechar" aria-label="Fechar">×</button>
    <div class="fichaTopo"><canvas data-ev="0,0"></canvas><div><h2 id="fichaTit">${T.nome}</h2></div></div>
    ${[0,1].map(p=>`<h3 class="fxTit">Caminho ${p+1}</h3><div class="fichaRow">${[0,1,2].map(i=>passo(p,i)).join('')}</div>`).join('')}</div>`;
  document.body.appendChild(d);
  d.querySelectorAll('canvas[data-ev]').forEach(cn=>{const[a,b]=cn.dataset.ev.split(',').map(Number);pintaEvo(cn,k,a,b,cn.closest('.fichaTopo')?96:104)});
  $('fichaX').onclick=fechaFicha;d.onclick=e=>{if(e.target===d)fechaFicha()};$('fichaX').focus();
}
function fechaFicha(){
  const d=$('ficha');if(!d)return;
  d.remove();if(S&&!S.menu&&!S.over){S.paused=fichaPausa;syncHud()}
}
/* loja da partida: personagens comuns primeiro e o herói num grupo próprio no fim; os números do teclado seguem esta ordem */
const ordemLoja=()=>{const ks=shopKeys(S.side);return [...ks.filter(k=>!TOWERS[k].only),...ks.filter(k=>TOWERS[k].only)]};
function buildShop(){
  const ks=ordemLoja(),com=ks.filter(k=>!TOWERS[k].only),her=ks.filter(k=>TOWERS[k].only);
  const card=(k,i)=>`<button class="card${TOWERS[k].only?' heroi':''}" data-k="${k}"><canvas></canvas><div><b>${TOWERS[k].nome}</b><span class="pr"></span></div>${i<10?`<kbd>${(i+1)%10}</kbd>`:''}</button>`;
  $('shop').innerHTML=`<h3 class="shopTit">Personagens <small>escolha e toque no mapa</small></h3>${com.map((k,i)=>card(k,i)).join('')}`
    +(her.length?`<h3 class="shopTit heroiTit">★ ${her.length>1?'Heróis':'Herói'} <small>só 1 em campo</small></h3>${her.map((k,i)=>card(k,com.length+i)).join('')}`:'');
  $('shop').querySelectorAll('.card').forEach(b=>{
    portrait(b.querySelector('canvas'),LOOKOF(b.dataset.k),'#0002',iconeDe(b.dataset.k));
    b.addEventListener('click',()=>choose(b.dataset.k));
    b.addEventListener('pointerenter',ev=>{if(ev.pointerType==='mouse'){balaoHover=b;updateBalao()}});
    b.addEventListener('pointerleave',ev=>{if(ev.pointerType==='mouse'){balaoHover=null;updateBalao()}});
  });
}
/* personagens comuns: sem limite de cópias (o limite de 2 caiu em 2026-11-13). Herói: só 1 em campo, de qualquer tipo;
   vender o herói libera a vaga para outro */
function choose(k){
  if(S.menu||S.over||!disponivel(k))return;
  const T=TOWERS[k],h=heroiEmCampo();
  if(T.only&&h&&h.key===k){S.sel=h;S.placing=null;renderPanel();return}
  if(T.only&&h){S.placing=null;S.sel=h;banner('Só cabe 1 herói: venda '+h.T.nome+' para trocar');dica('um_heroi','Só cabe 1 herói em campo por vez. Para colocar outro, venda o que está no mapa.');renderPanel();return}
  S.placing=S.placing===k?null:k;S.sel=null;S.selObst=null;renderPanel();
}
function nextInfo(){
  const n=S.livre?S.round+(S.inRound?0:1):Math.min(40,S.round+(S.inRound?0:1));
  const cnt={};for(const q of buildRound(n))cnt[q.type]=(cnt[q.type]||0)+1;
  const rows=Object.keys(cnt).map(k=>`<div class="foe ${ENEMY[k].boss?'boss':''}" title="${especialDe(k).replace(/"/g,'&quot;')}"><canvas data-foe="${k}"></canvas><span>${ENEMY[k].nome}</span><i>${ENEMY[k].boss?'CHEFÃO':'× '+cnt[k]}</i></div>`).join('');
  /* desfazer a última compra: aparece só enquanto ainda dá (mesma rodada) */
  const desf=podeDesfazer()?`<button class="mini desfaz" id="desfazBt" title="Atalho: Z">↶ Desfazer: ${textoDesfazer()}</button>`:'';
  return `${desf}<div class="proxCard"><h2>${S.inRound?'Rodada':'Próxima rodada'}: ${n}</h2>${rows}</div>
  <details class="atalhos"><summary>⌨ Atalhos do teclado</summary><p class="keys">Números escolhem o personagem; com ele escolhido, as setas movem o lugar no mapa (Shift, mais devagar) e Enter coloca. Tab passa pelos personagens colocados. Espaço começa a rodada, F usa o poder do herói, P pausa, Z desfaz a última compra e Esc cancela. Com alguém selecionado: vírgula e ponto evoluem os caminhos 1 e 2, Q usa o especial dele e Delete vende.</p></details>`;
}
let evoAberto=false;
function renderPanel(){
  if(!S)return;
  $('shop').querySelectorAll('.card').forEach(b=>{b.classList.toggle('on',S.placing===b.dataset.k)});
  const box=$('info'),evo=$('evo');
  if(S.placing){
    const T=TOWERS[S.placing];
    box.innerHTML=`<h2>${T.nome}</h2><p>${T.desc}</p><p class="dicaLugar"><i class="amostra ok"></i> dá para colocar <i class="amostra nao"></i> não dá</p><p class="keys">Clique ou toque no mapa para posicionar.</p>`;
  }else if(S.sel){
    const t=S.sel,T=t.T;
    /* no celular, o que não é compra fica escondido atrás de "Mais detalhes" */
    const habs=habsDe(t),cont=t.habCont||{};
    let mais=`<p>${T.curta||T.desc}</p>`;
    /* o essencial à vista (nome, evoluções com preço, vender); descrições e explicações ficam em Detalhes (2026-11-17) */
    let h=`<div class="evoTopo"><h2>${t.look.nome||T.nome}</h2><small>${t.kills} conv.</small><button class="mini evoMaisBt" id="evoMais">${evoAberto?'Menos':'Detalhes'}</button></div><div class="evoMais">${mais}</div>`;
    if(T.only){const n=t.nivel||1,xp=t.xp||0,de=XP_NIVEL[n-1],ate=XP_NIVEL[n]||XP_NIVEL[9];
      h+=`<div class="nivelHeroi"><b>Nível ${n}/10</b> <small>${n<NIVEL_PODER?'★ no nível 10':'★ liberado'}</small><div class="barraConq"><i style="width:${n<10?Math.round((xp-de)/(ate-de)*100):100}%"></i></div></div>`}
    if(T.atk!=='none'&&T.atk!=='aura')h+=`<div class="row">`+MODES.map(([m,n])=>`<button class="mini ${t.mode===m?'on':''}" data-m="${m}">${n}</button>`).join('')+`</div>`;
    for(let p=0;p<2;p++){
      const cur=p?t.b:t.a,st=canUp(t,p);
      const pips='●'.repeat(cur)+'○'.repeat(3-cur);
      if(st==='max')h+=`<div class="upg"><span class="pips">${pips}</span><b>Máximo</b></div>`;
      else if(st==='lock')h+=`<div class="upg" style="opacity:.55"><span class="pips">${pips}</span><b>Bloqueado</b></div>`;
      else{const u=T.up[p][cur];h+=`<button class="upg comPrev" data-p="${p}" data-c="${price(u.c)}" title="${u.d.replace(/"/g,'&quot;')}"><canvas class="prev" data-ev="${p?t.a:t.a+1},${p?t.b+1:t.b}" title="Como fica"></canvas><span><span class="pips">${pips}</span><b>${u.n}</b><small class="evoMais">${u.d}</small><em>R$ ${price(u.c)}</em></span></button>`}
    }
    if(temPoder(t))h+=`<div class="poderBox"><button class="mini poderBt" id="usaPoder">⚡ ${nomePoder(t)}</button><small class="evoMais">${efeitoPoder(t)} Recarga de ${cdPoder(t)} s. Atalho: Q.</small></div>`;    h+=`<div class="row evoMais"><button class="mini" id="verEvo">Ver todas as evoluções</button></div>`;
    if(t.s.teto){
      const saldo=t.caixa||0,br=v=>v.toLocaleString('pt-BR');
      h+=`<p>Cofre: <b>R$ ${br(saldo)}</b> de R$ ${br(t.s.teto)}<span class="evoMais"><br>Aporte de R$ ${br(t.s.aporte)} e juros de ${Math.round(t.s.juros*100)}% por rodada</span></p>`;
      if(!t.s.autoSaque)h+=`<div class="row"><button class="mini" id="saque" ${saldo?'':'disabled'}>Sacar R$ ${br(saldo)}</button></div>`;
    }
    h+=S.modo==='semvender'?`<p class="dicaPoder">Sem vender neste modo.</p>`:`<div class="row"><button class="mini sell" id="sell">Vender por R$ ${Math.round(t.spent*.7)+(t.caixa||0)}</button></div>`;
    box.innerHTML=nextInfo();
    evo.innerHTML='<button id="evoX" title="Fechar">×</button>'+h;
    evo.classList.toggle('aberto',evoAberto);
    $('evoX').onclick=()=>{S.sel=null;renderPanel()};
    $('evoMais').onclick=()=>{evoAberto=!evoAberto;renderPanel()};
    evo.querySelectorAll('.mini[data-m]').forEach(b=>b.onclick=()=>{t.mode=b.dataset.m;regEv('alvo',{id:t.id,k:t.key,modo:t.mode});renderPanel()});
    evo.querySelectorAll('.upg[data-p]').forEach(b=>b.onclick=()=>buyUp(t,+b.dataset.p));
    evo.querySelectorAll('canvas.prev').forEach(cn=>{const[a,b]=cn.dataset.ev.split(',').map(Number);pintaEvo(cn,t.key,a,b,80,true)});
    $('verEvo').onclick=()=>abreFicha(t.key);
    if($('usaPoder')){$('usaPoder').onclick=()=>usaPoder(t);renderPoderes()}
    if($('sell'))$('sell').onclick=()=>sell(t);
    if($('saque'))$('saque').onclick=()=>{S.cash+=t.caixa||0;float(t.x,t.y-60,'+R$ '+(t.caixa||0),'#b6ffb0');t.caixa=0;beep(760,.1,'triangle',.06);renderPanel()};
  }else if(S.selObst){
    /* obstáculo escolhido: o que é e quanto custa para tirar */
    const o=S.selObst,T=TIPOS_OBST[o.tipo],c=price(T.custo);
    box.innerHTML=nextInfo();
    evo.innerHTML=`<button id="evoX" title="Fechar">×</button><h2>${T.nome}</h2><p>Ocupa um bom lugar perto da avenida. Tirando, o espaço fica livre para colocar personagens até o fim da partida.</p><div class="row"><button class="mini" id="tiraObst" data-c="${c}" ${S.cash<c?'disabled':''}>Tirar por R$ ${c.toLocaleString('pt-BR')}</button></div>`;
    evo.classList.remove('aberto');
    $('evoX').onclick=()=>{S.selObst=null;renderPanel()};
    $('tiraObst').onclick=()=>removeObst(o);
  }else box.innerHTML=nextInfo();
  box.querySelectorAll('canvas[data-foe]').forEach(cn=>pintaInimigo(cn,cn.dataset.foe,30));
  {const db=$('desfazBt');if(db)db.onclick=ev=>{ev.currentTarget.blur();desfazCompra()}}
  updateBalao();
  posEvo();
  syncHud();
}
/* janela de evolução: abre ao lado do personagem selecionado, fora da coluna de compra */
function posEvo(){
  const e=$('evo');
  if(!e)return;
  const alvo=S&&(S.sel||S.selObst);
  if(!alvo||S.placing||S.menu||S.over){e.classList.add('hide');return}
  e.classList.remove('hide');
  const st=$('stage').getBoundingClientRect(),w=e.offsetWidth,h=e.offsetHeight,q=cv.getBoundingClientRect(),k=q.width/W;
  const tx=q.left-st.left+alvo.x*k,ty=q.top-st.top+alvo.y*k;
  /* celular deitado: a janela fica presa num canto, do lado oposto ao personagem escolhido */
  e.classList.toggle('esq',tx>st.width/2);
  let x=tx+46*k;
  if(x+w>st.width-8)x=tx-46*k-w;
  e.style.left=clamp(x,8,Math.max(8,st.width-w-8))+'px';
  e.style.top=clamp(ty-h/2,8,Math.max(8,st.height-h-8))+'px';
}
/* balão com o que o personagem faz, junto da carta na loja */
let balaoHover=null;
function updateBalao(){
  const b=$('balao');
  if(!b)return;
  if(!S||S.menu||S.over){b.classList.add('hide');return}
  let T=null,nome='',card=null;
  if(balaoHover){T=TOWERS[balaoHover.dataset.k];nome=T.nome;card=balaoHover}
  else if(S.placing){T=TOWERS[S.placing];nome=T.nome;card=$('shop').querySelector(`.card[data-k="${S.placing}"]`)}
  if(!T){b.classList.add('hide');return}
  b.innerHTML=`<b>${nome}</b>${T.desc}`;
  b.classList.remove('hide');
  const st=$('stage').getBoundingClientRect(),w=b.offsetWidth,h=b.offsetHeight;
  const x=st.width-w-10,y=card.getBoundingClientRect().top-st.top;
  b.style.left=clamp(x,8,Math.max(8,st.width-w-8))+'px';
  b.style.top=clamp(y,8,Math.max(8,st.height-h-8))+'px';
}
addEventListener('resize',()=>{updateBalao();posEvo();if(tutoI>=0)tutoShow()});
function syncHud(){
  if(!S)return;
  /* no Voto Popular o placar mostra a sua parte dos votos; no Tolerância Zero, que ninguém pode passar */
  const lv=$('lives'),rot=lv.previousElementSibling;
  if(S.modo==='voto'&&!S.livre){lv.textContent=fmtPct(pctVotos());if(rot)rot.textContent='Seus votos'}
  else if(S.modo==='zero'){lv.textContent='0 escapes';if(rot)rot.textContent='Tolerância zero'}
  else{lv.textContent=Math.ceil(S.lives);if(rot)rot.textContent='Apoio popular'}
  /* barra de vida: cheia no apoio do começo; verde, amarela abaixo de 60% e vermelha abaixo de 30% (no Voto Popular, os votos) */
  {const sv=lv.closest('.s-vida'),f=$('vidaFill'),voto=S.modo==='voto'&&!S.livre,zero=S.modo==='zero';
   const pct=voto?pctVotos()/100:clamp(S.lives/S.d.lives,0,1);
   if(f){f.parentNode.style.display=zero?'none':'';f.style.width=Math.round(pct*100)+'%';f.style.backgroundColor=pct>.6?'#5fd16b':pct>.3?'#f2c83a':'#ff4b4b'}
   sv.classList.toggle('baixo',!zero&&pct<=.3&&!S.over);
   /* piscar: vermelho ao perder apoio, verde ao recuperar */
   const v=Math.ceil(S.lives),ant=S._hudVida;S._hudVida=v;
   if(ant!==undefined&&v!==ant&&!S.menu){const c=v<ant?'dano':'cura';sv.classList.remove('dano','cura');void sv.offsetWidth;sv.classList.add(c)}}
  /* o "R$" fica num pedaço à parte: no celular deitado ele some (o 💰 já diz que é dinheiro) e o valor cabe inteiro */
  {const cs=$('cash'),txt=Math.floor(S.cash).toLocaleString('pt-BR');if(cs.dataset.v!==txt){cs.dataset.v=txt;cs.innerHTML='<span class="rs">R$ </span>'+txt}}
  $('round').textContent=S.round+(S.livre?'/∞':'/40');
  $('uf').textContent=S.uf;
  /* um botão só para começar e pausar (2026-11-17): fora da rodada começa; durante a rodada pausa e continua */
  const go=$('go');go.disabled=S.over||S.menu;
  const C=cfg(),boss=(C.boss[S.round+1]||[])[1];
  go.textContent=S.inRound?(S.paused?'▶ Continuar':'❚❚ Pausar'):boss?'▶ Chefão: '+boss:'▶ Começar rodada';
  go.title=S.inRound?(S.paused?'Continuar a rodada (P)':'Pausar a rodada (P)'):'Começar a rodada (Espaço)';
  go.classList.toggle('emRodada',!!S.inRound&&!S.paused);
  $('speed').textContent='⏩ ×'+S.speed;$('speed').title='Velocidade do jogo: ×'+S.speed+' (clique para mudar)';
  $('auto').textContent='⟳ Auto'+(S.auto?' ✓':'');$('auto').title=S.auto?'A próxima rodada começa sozinha':'Ligue para a próxima rodada começar sozinha';
  $('auto').classList.toggle('on',!!S.auto);
  renderPoderes();
  const pb=$('pause'),pt=S.paused?'Continuar (P)':'Pausar (P)';
  pb.disabled=$('menuBtn').disabled=S.over||S.menu;
  pb.classList.toggle('on',!!S.paused);
  if(pb.title!==pt){pb.title=pt;pb.setAttribute('aria-label',pt);pb.textContent=S.paused?'▶︎':'❚❚'}
  const l=S.towers.some(t=>t.T.only),ab=$('ability');
  ab.disabled=!l||S.abilCd>0||S.over||S.menu||S.paused;
  /* poder do herói: sem herói fica apagado com a explicação no título; pronto, brilha */
  const hk=l?heroiEmCampo().key:null,pn=hk?nomePoderHeroi(hk):'Poder do herói';
  ab.textContent=S.abilCd>0&&l?'★ '+pn+' '+Math.ceil(S.abilCd)+'s':'★ '+pn;
  ab.title=!l?'Coloque um herói em campo para ter o poder dele':!poderLiberado(heroiEmCampo())?'O poder libera quando o herói chega ao nível 10':S.abilCd>0?'Recarregando':'Pronto! '+HEROI_PODER[hk][1]+' (tecla F)';
  ab.classList.toggle('pronto',!ab.disabled);
  const h=heroiEmCampo();
  $('shop').querySelectorAll('.card').forEach(b=>{
    const k=b.dataset.k,T=TOWERS[k],c=price(T.cost),placed=!!h&&h.key===k,outro=T.only&&!!h&&!placed;
    const livre=disponivel(k);
    b.classList.toggle('off',!livre||outro||(!placed&&S.cash<c));
    b.querySelector('.pr').textContent=!livre?'Rodada '+rodadaLibera(S.side,k):placed?'Em campo':outro?'Já tem herói':'R$ '+c;
  });
  $('evo').querySelectorAll('.upg[data-c]').forEach(b=>{b.disabled=S.cash<+b.dataset.c});
}

/* ---------- som ---------- */
/* opções do jogador, guardadas no navegador: efeitos sonoros, música e tela calma (sem tremor nem clarão) */
var OPC=(()=>{const vol=(v,p)=>typeof v==='number'&&v>=0&&v<=1?v:p;try{const o=JSON.parse(localStorage.getItem('gn_opcoes'));if(o)return{mute:!!o.mute,musica:o.musica!==false,calmo:!!o.calmo,daltonico:!!o.daltonico,mouseGrande:o.mouseGrande!==false,registro:o.registro!==false,texto:[1,2,3].includes(o.texto)?o.texto:1,volFx:vol(o.volFx,.8),volMus:vol(o.volMus,.6)}}catch(e){}return{mute:false,musica:true,calmo:!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches),daltonico:false,mouseGrande:true,registro:true,texto:1,volFx:.8,volMus:.6}})();
/* tamanho do texto: aumenta painel, janelas e menu (o mapa continua igual) */
function aplicaTexto(){document.body.classList.remove('texto2','texto3');if(OPC.texto>1)document.body.classList.add('texto'+OPC.texto);document.body.classList.toggle('daltonico',!!OPC.daltonico);document.body.classList.toggle('mouseNormal',OPC.mouseGrande===false)}
function salvaOpc(){try{localStorage.setItem('gn_opcoes',JSON.stringify(OPC))}catch(e){}}
let AC=null,mute=OPC.mute,lastB=0,ruidoBuf=null;
/* dois volumes separados: efeitos e música, cada um com o seu controle nas opções */
let saidaFx=null,saidaMus=null;
function saidas(){
  if(!saidaFx){saidaFx=AC.createGain();saidaFx.connect(AC.destination);saidaMus=AC.createGain();saidaMus.connect(AC.destination)}
  saidaFx.gain.value=OPC.volFx;saidaMus.gain.value=OPC.volMus;
}
const fxOut=()=>{if(!saidaFx)saidas();return saidaFx};
function beep(f,d,type,v){
  if(mute||!AC||!OPC.volFx)return;
  const n=AC.currentTime;if(n-lastB<.03&&v<.08)return;lastB=n;
  const o=AC.createOscillator(),a=AC.createGain();
  o.type=type;o.frequency.value=f;a.gain.setValueAtTime(v,n);a.gain.exponentialRampToValueAtTime(.0005,n+d);
  o.connect(a).connect(fxOut());o.start(n);o.stop(n+d);
}
/* chiado curto (papel, vento, fogo): ruído passando por um filtro */
function ruidoEm(t,freq,d,v,q,saida){
  if(!ruidoBuf){ruidoBuf=AC.createBuffer(1,AC.sampleRate*.5|0,AC.sampleRate);const a=ruidoBuf.getChannelData(0);for(let i=0;i<a.length;i++)a[i]=Math.random()*2-1}
  const s=AC.createBufferSource(),f=AC.createBiquadFilter(),g=AC.createGain();
  s.buffer=ruidoBuf;f.type='bandpass';f.frequency.value=freq;f.Q.value=q||1.2;
  g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.0005,t+d);
  s.connect(f).connect(g).connect(saida||fxOut());s.start(t);s.stop(t+d);
}
function chiado(freq,d,v,q){if(mute||!AC||!OPC.volFx)return;const n=AC.currentTime;if(n-lastB<.03)return;lastB=n;ruidoEm(n,freq,d,v,q)}
/* nota que escorrega de uma altura para outra: o plim do celular, o pop da comida */
function desliza(f1,f2,d,type,v){
  if(mute||!AC||!OPC.volFx)return;const n=AC.currentTime;if(n-lastB<.03)return;lastB=n;
  const o=AC.createOscillator(),a=AC.createGain();o.type=type;
  o.frequency.setValueAtTime(f1,n);o.frequency.exponentialRampToValueAtTime(f2,n+d);
  a.gain.setValueAtTime(v,n);a.gain.exponentialRampToValueAtTime(.0005,n+d);
  o.connect(a).connect(fxOut());o.start(n);o.stop(n+d);
}
/* cada tipo de ataque tem o seu som */
function somAtaque(tipo){
  switch(tipo){
    case 'papel':return chiado(rand(2600,3400),.06,.035,2);
    case 'livro':return chiado(900,.07,.04,1.5);
    case 'som':return desliza(rand(520,600),rand(760,820),.08,'triangle',.025);
    case 'meme':return desliza(1300,1900,.06,'square',.012);
    case 'comida':return desliza(420,180,.08,'sine',.045);
    case 'decisao':return beep(rand(160,190),.07,'square',.025);
    case 'fogo':return chiado(rand(400,700),.12,.04,.8);
    case 'vento':case 'neve':return chiado(rand(1200,1600),.14,.03,.7);
    case 'gado':return desliza(180,120,.12,'sawtooth',.025);
    case 'sangue':return desliza(300,500,.08,'sine',.03);
    case 'danca':return desliza(660,990,.07,'triangle',.025);
    default:return beep(rand(880,1020),.025,'square',.012);
  }
}
/* música de fundo, gerada na hora e bem baixinha; só toca durante a partida.
   Cada lado tem a sua: a esquerda, um batuque de samba; a direita, um arrasta-pé de sanfona com baixo marcado. */
let musPasso=0,musProx=0;
const hz=m=>440*Math.pow(2,(m-69)/12);
const MUSICAS={
  pt:{bpm:104,acordes:[[60,64,67],[57,60,64],[53,57,60],[55,59,62]]},
  br:{bpm:94,acordes:[[55,59,62],[62,66,69],[64,67,71],[60,64,67]]},
};
function notaEm(f,t,d,type,v){const o=AC.createOscillator(),a=AC.createGain();o.type=type;o.frequency.value=f;a.gain.setValueAtTime(.0001,t);a.gain.linearRampToValueAtTime(v,t+.012);a.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(a).connect(saidaMus);o.start(t);o.stop(t+d+.03)}
function agendaMusica(){
  if(!AC)return;
  const tocar=OPC.musica&&OPC.volMus>0&&!mute&&S&&!S.menu&&!S.over&&!S.paused&&!document.hidden;
  if(!tocar){musProx=0;return}
  saidas();
  const M=MUSICAS[S.side]||MUSICAS.pt,passo=60/M.bpm/2;
  if(musProx<AC.currentTime)musProx=AC.currentTime+.06;
  while(musProx<AC.currentTime+.35){
    const i=musPasso%32,ac=M.acordes[i>>3];
    if(S.side==='br'){
      /* baixo alternando tônica e quinta, sanfona no contratempo e um arpejo subindo */
      if(i%4===0)notaEm(hz(ac[0]-24),musProx,.28,'triangle',.06);
      if(i%4===2)notaEm(hz(ac[2]-24),musProx,.22,'triangle',.045);
      if(i%2===1)for(const m of ac)notaEm(hz(m),musProx,.11,'sawtooth',.004);
      if(i%8===0||i%8===5)notaEm(hz(ac[(i>>1)%3]+12),musProx,.2,'sine',.018);
      if(i%4===2)ruidoEm(musProx,3800,.05,.02,2,saidaMus);
    }else{
      if(i%4===0)notaEm(hz(ac[0]-24),musProx,.3,'triangle',.06);
      if(i%8===6)notaEm(hz(ac[0]-17),musProx,.18,'triangle',.04);
      if(i%4===2)for(const m of ac)notaEm(hz(m),musProx,.13,'square',.007);
      if([0,3,6,8,11,14].includes(i%16))ruidoEm(musProx,5200,.035,i%16===0?.035:.02,3,saidaMus);
    }
    musProx+=passo;musPasso++;
  }
}
setInterval(agendaMusica,120);
/* o navegador só libera o som depois de um toque; o iPhone às vezes suspende de novo, então cada toque e cada volta para a aba religam */
const ligaSom=()=>{if(!AC){try{AC=new(window.AudioContext||window.webkitAudioContext)()}catch(e){}}if(AC&&AC.state!=='running'){try{AC.resume()}catch(e){}}};
addEventListener('pointerdown',ligaSom);addEventListener('touchend',ligaSom,{passive:true});addEventListener('keydown',ligaSom);
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&AC&&AC.state!=='running'){try{AC.resume()}catch(e){}}});

/* ---------- cenário ---------- */
let BG=null,K=1;
/* um monumento por estado; o chão de cada desenho fica perto de y=14 */
const MONUMENTOS={
  catedral:c=>{c.fillStyle='#d9e6e6';disc(c,0,12,30);c.fillStyle='#eef3f1';for(let i=-3;i<=3;i++){c.beginPath();c.moveTo(i*9-3,14);c.quadraticCurveTo(i*5,-16,i*2.2,-34);c.quadraticCurveTo(i*6+3,-14,i*9+5,14);c.fill()}c.fillStyle='#8fc9d8';for(let i=-3;i<3;i++){c.beginPath();c.moveTo(i*9+5,14);c.quadraticCurveTo(i*5+3,-12,i*2.2+1,-30);c.lineTo(i*9+9,14);c.fill()}},
  masp:c=>{c.fillStyle='#0003';c.fillRect(-48,14,96,6);c.fillStyle='#2d3a44';c.fillRect(-38,-22,76,20);c.strokeStyle='#8fa6b3';c.lineWidth=1;for(let i=1;i<8;i++){c.beginPath();c.moveTo(-38+i*9.5,-22);c.lineTo(-38+i*9.5,-2);c.stroke()}c.fillStyle='#c8102e';c.fillRect(-46,-30,8,46);c.fillRect(38,-30,8,46);c.fillRect(-46,-30,92,8);c.fillRect(-46,-4,92,5)},
  cristo:c=>{c.fillStyle='#5f8a4a';c.beginPath();c.moveTo(-52,16);c.quadraticCurveTo(-18,-14,0,-14);c.quadraticCurveTo(18,-14,52,16);c.fill();c.fillStyle='#eae6da';c.fillRect(-5,-44,10,32);c.fillRect(-26,-40,52,6);disc(c,0,-49,5);c.fillRect(-7,-14,14,4)},
  teatro:c=>{c.fillStyle='#e8a0a8';c.fillRect(-42,-12,84,26);c.fillStyle='#f4f0e6';for(let i=0;i<6;i++)c.fillRect(-36+i*13.4,-10,4,24);c.fillRect(-46,-16,92,5);c.fillStyle='#2f7a9a';c.beginPath();c.arc(0,-16,17,Math.PI,0);c.fill();c.fillStyle='#f2b705';for(let i=-2;i<=2;i++){c.beginPath();c.arc(i*6.4,-16-(4-Math.abs(i))*3,2,0,7);c.fill()}c.fillStyle='#d9a400';c.fillRect(-1,-40,2,8)},
  marco:c=>{c.fillStyle='#d8d4c8';c.fillRect(-26,10,52,5);c.fillStyle='#f4f1e8';c.beginPath();c.moveTo(-7,10);c.lineTo(-3,-46);c.lineTo(3,-46);c.lineTo(7,10);c.fill();c.strokeStyle='#d0162a';c.lineWidth=4;c.beginPath();c.arc(0,-30,17,0,7);c.stroke();c.strokeStyle='#2456a6';c.lineWidth=2;c.beginPath();c.moveTo(-40,13);c.lineTo(40,13);c.stroke()},
  lacerda:c=>{c.fillStyle='#b9b09a';c.fillRect(-52,-4,44,18);c.fillStyle='#f0ece0';c.fillRect(-4,-50,20,64);c.fillRect(-20,-48,18,8);c.fillStyle='#8fc9d8';for(let y=-44;y<8;y+=10)c.fillRect(1,y,10,6)},
  farol:c=>{c.fillStyle='#b9b09a';c.fillRect(-20,8,40,7);for(let i=0;i<6;i++){c.fillStyle=i%2?'#fff':'#d0162a';c.beginPath();c.moveTo(-10+i*.8,8-i*8);c.lineTo(10-i*.8,8-i*8);c.lineTo(9-i*.8,0-i*8);c.lineTo(-9+i*.8,0-i*8);c.fill()}c.fillStyle='#ffe27a';c.fillRect(-5,-48,10,8);c.fillStyle='#2e3440';c.beginPath();c.moveTo(-7,-48);c.lineTo(0,-56);c.lineTo(7,-48);c.fill()},
  penha:c=>{c.fillStyle='#6f8a5a';c.beginPath();c.moveTo(-54,16);c.quadraticCurveTo(-20,-24,0,-24);c.quadraticCurveTo(20,-24,54,16);c.fill();c.fillStyle='#f4f1e8';c.fillRect(-18,-40,36,18);c.fillStyle='#a6342c';c.beginPath();c.moveTo(-22,-40);c.lineTo(0,-52);c.lineTo(22,-40);c.fill();c.fillStyle='#3b5a6b';c.fillRect(-4,-34,8,12)},
  tres:c=>{c.fillStyle='#b9b09a';c.fillRect(-32,4,64,10);c.fillStyle='#c9992e';for(const[x,h]of[[-16,38],[0,46],[16,38]]){c.fillRect(x-4,4-h,8,h);disc(c,x,-h,5)}c.fillRect(-20,-22,40,4)},
  dunas:c=>{c.fillStyle='#f2e6c0';c.beginPath();c.moveTo(-58,16);c.quadraticCurveTo(-34,-34,-8,14);c.quadraticCurveTo(14,-40,58,16);c.fill();c.fillStyle='#4fa8c8';c.beginPath();c.ellipse(-4,12,22,6,0,0,7);c.fill()},
  igreja:c=>{c.fillStyle='#f4f1e8';c.fillRect(-28,-20,56,34);c.fillRect(-34,-40,16,54);c.fillRect(18,-40,16,54);c.fillStyle='#5a7a4a';disc(c,-26,-42,8);disc(c,26,-42,8);c.fillStyle='#b98a4a';c.beginPath();c.moveTo(-18,-20);c.quadraticCurveTo(0,-42,18,-20);c.fill();c.fillStyle='#5a3a22';c.fillRect(-7,-6,14,20)},
  tuiuiu:c=>{c.strokeStyle='#3a3a40';c.lineWidth=2;c.beginPath();c.moveTo(-5,0);c.lineTo(-6,14);c.moveTo(5,0);c.lineTo(6,14);c.stroke();c.fillStyle='#f4f1e8';c.beginPath();c.ellipse(0,-8,18,11,0,0,7);c.fill();c.fillStyle='#17140f';c.fillRect(10,-32,6,24);c.fillStyle='#d0162a';c.fillRect(9,-16,8,5);c.fillStyle='#17140f';disc(c,13,-35,5);c.beginPath();c.moveTo(17,-37);c.lineTo(40,-30);c.lineTo(17,-32);c.fill()},
  jacare:c=>{c.fillStyle='#4f7a3e';c.beginPath();c.ellipse(-4,6,34,9,0,0,7);c.fill();c.beginPath();c.moveTo(26,1);c.lineTo(56,6);c.lineTo(26,12);c.fill();c.fillStyle='#fff';for(let i=0;i<5;i++)c.fillRect(32+i*4.6,8-i*.3,2,2.6);c.fillStyle='#3f6a32';c.beginPath();c.moveTo(-34,3);c.lineTo(-58,9);c.lineTo(-34,12);c.fill();for(let i=0;i<6;i++){c.beginPath();c.moveTo(-26+i*9,-2);c.lineTo(-22+i*9,-8);c.lineTo(-18+i*9,-2);c.fill()}c.fillStyle='#1b1712';disc(c,24,-1,1.8)},
  verpeso:c=>{c.fillStyle='#3a6ea8';c.fillRect(-42,-14,84,28);c.fillStyle='#bfe3f5';for(let i=0;i<7;i++)c.fillRect(-38+i*11.4,-9,7,20);c.fillStyle='#8a4a3a';c.beginPath();c.moveTo(-46,-14);c.lineTo(0,-26);c.lineTo(46,-14);c.fill();c.fillStyle='#3a6ea8';for(const x of[-42,42]){c.fillRect(x-5,-32,10,46);c.fillStyle='#8a4a3a';c.beginPath();c.moveTo(x-7,-32);c.lineTo(x,-44);c.lineTo(x+7,-32);c.fill();c.fillStyle='#3a6ea8'}},
  farolpb:c=>{c.fillStyle='#b9b09a';c.fillRect(-26,9,52,6);c.fillStyle='#f4f1e8';c.beginPath();c.moveTo(-22,10);c.lineTo(0,-52);c.lineTo(22,10);c.fill();c.fillStyle='#d0162a';c.beginPath();c.moveTo(-8,-26);c.lineTo(8,-26);c.lineTo(5,-34);c.lineTo(-5,-34);c.fill()},
  galo:c=>{c.fillStyle='#f2b705';c.beginPath();c.ellipse(0,-6,24,18,0,0,7);c.fill();c.fillStyle='#d0162a';for(const[x,y,a]of[[-26,-20,-.6],[-30,-8,-.3],[-30,4,.1]]){c.save();c.translate(x,y);c.rotate(a);c.beginPath();c.ellipse(0,0,14,6,0,0,7);c.fill();c.restore()}c.fillStyle='#2456a6';c.fillRect(14,-34,12,26);c.fillStyle='#f2b705';disc(c,22,-38,10);c.fillStyle='#d0162a';for(let i=0;i<3;i++)disc(c,16+i*6,-48,4);c.beginPath();c.moveTo(30,-38);c.lineTo(42,-35);c.lineTo(30,-32);c.fill();c.fillStyle='#1b1712';disc(c,25,-40,1.8);c.strokeStyle='#d9a400';c.lineWidth=3;c.beginPath();c.moveTo(-6,10);c.lineTo(-6,16);c.moveTo(8,10);c.lineTo(8,16);c.stroke()},
  pedra:c=>{c.fillStyle='#b5704a';c.beginPath();c.moveTo(-56,16);c.lineTo(-48,-30);c.lineTo(-12,-40);c.lineTo(30,-34);c.lineTo(54,16);c.fill();c.strokeStyle='#6a2a1c';c.lineWidth=2;for(const x of[-30,-12,8]){c.beginPath();c.arc(x,-16,2.6,0,7);c.moveTo(x,-13);c.lineTo(x,-3);c.moveTo(x-6,-9);c.lineTo(x+6,-9);c.moveTo(x,-3);c.lineTo(x-4,4);c.moveTo(x,-3);c.lineTo(x+4,4);c.stroke()}},
  estufa:c=>{c.fillStyle='#d8eef8';c.fillRect(-44,-12,88,26);c.beginPath();c.arc(0,-12,18,Math.PI,0);c.fill();c.strokeStyle='#3a5a4a';c.lineWidth=1.4;c.strokeRect(-44,-12,88,26);c.beginPath();c.arc(0,-12,18,Math.PI,0);for(let i=1;i<8;i++){c.moveTo(-44+i*11,-12);c.lineTo(-44+i*11,14)}c.moveTo(0,-30);c.lineTo(0,-12);c.stroke()},
  forte:c=>{c.fillStyle='#d8c9a8';c.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,q=i%2?22:44;c.lineTo(Math.cos(a)*q,-8+Math.sin(a)*q*.55)}c.closePath();c.fill();c.fillStyle='#b9a880';c.beginPath();c.ellipse(0,-8,18,10,0,0,7);c.fill();pole(c,0,-42);redFlag(c,1,-42,14,9)},
  loco:c=>{c.fillStyle='#22242a';rr(c,-40,-14,52,20,4);c.fillRect(8,-30,28,36);c.fillStyle='#bfe3f5';c.fillRect(13,-25,18,12);c.fillStyle='#22242a';c.fillRect(-34,-30,10,18);c.fillStyle='#d0162a';c.fillRect(-42,2,80,4);c.fillStyle='#555a64';disc(c,-28,10,8);disc(c,-6,10,8);disc(c,22,10,8);c.fillStyle='#ddd';disc(c,-31,-36,4);disc(c,-24,-42,5)},
  tepui:c=>{c.fillStyle='#7a6a58';c.beginPath();c.moveTo(-58,16);c.lineTo(-46,-36);c.lineTo(46,-36);c.lineTo(58,16);c.fill();c.fillStyle='#5f8a4a';c.fillRect(-46,-40,92,6);c.fillStyle='#d8eef8';c.fillRect(-4,-36,4,50)},
  lacador:c=>{c.fillStyle='#b9b09a';c.fillRect(-20,2,40,12);c.fillStyle='#5a4a3a';c.fillRect(-6,-34,12,38);c.fillRect(-14,-8,28,4);disc(c,0,-40,6);c.beginPath();c.ellipse(0,-44,14,3,0,0,7);c.fill();c.fillRect(-6,-52,12,8);c.strokeStyle='#5a4a3a';c.lineWidth=2;c.beginPath();c.moveTo(6,-28);c.lineTo(24,-40);c.stroke();c.beginPath();c.ellipse(30,-46,10,5,0,0,7);c.stroke()},
  ponte:c=>{c.fillStyle='#3f8fb5';c.fillRect(-58,10,116,6);c.strokeStyle='#8a8f98';c.lineWidth=3;c.beginPath();c.moveTo(-58,-26);c.quadraticCurveTo(-30,8,-24,-34);c.moveTo(-24,-34);c.quadraticCurveTo(0,20,24,-34);c.moveTo(24,-34);c.quadraticCurveTo(30,8,58,-26);c.stroke();c.fillStyle='#6a7078';c.fillRect(-27,-40,6,50);c.fillRect(21,-40,6,50);c.fillRect(-58,0,116,4)},
  caranguejo:c=>{c.fillStyle='#d0432a';c.beginPath();c.ellipse(0,0,24,14,0,0,7);c.fill();c.strokeStyle='#d0432a';c.lineWidth=4;c.beginPath();for(const sd of[-1,1]){c.moveTo(sd*18,4);c.lineTo(sd*34,14);c.moveTo(sd*18,-4);c.lineTo(sd*30,-18)}c.stroke();for(const sd of[-1,1]){c.beginPath();c.arc(sd*33,-23,8,sd>0?.5:-2.6,sd>0?5.6:2.6);c.fill()}c.fillStyle='#fff';disc(c,-7,-12,3);disc(c,7,-12,3);c.fillStyle='#111';disc(c,-7,-12,1.4);disc(c,7,-12,1.4)},
  castanheira:c=>{c.fillStyle='#5a3d27';c.beginPath();c.moveTo(-8,16);c.lineTo(-4,-30);c.lineTo(4,-30);c.lineTo(8,16);c.fill();c.fillStyle='#2f6b2c';for(const[x,y,r]of[[0,-46,20],[-22,-36,15],[22,-36,15],[-10,-56,12],[12,-56,12]])disc(c,x,y,r)},
  jangada:c=>{c.fillStyle='#3f8fb5';c.beginPath();c.ellipse(0,12,50,7,0,0,7);c.fill();c.fillStyle='#b98a4a';c.fillRect(-32,6,64,6);c.fillStyle='#6a4a2a';c.fillRect(-1,-44,3,50);c.fillStyle='#f4f1e8';c.beginPath();c.moveTo(2,-44);c.quadraticCurveTo(38,-20,26,4);c.lineTo(2,4);c.fill();c.fillStyle='#d0162a';c.beginPath();c.moveTo(4,-30);c.quadraticCurveTo(24,-18,22,-6);c.lineTo(4,-6);c.fill()},
  jalapao:c=>{c.fillStyle='#d98a4a';for(const[x,w,h]of[[-30,12,44],[-6,16,60],[26,12,36]]){c.beginPath();c.moveTo(x-w,16);c.lineTo(x-w*.45,16-h);c.lineTo(x+w*.45,16-h);c.lineTo(x+w,16);c.fill()}c.fillStyle='#c0703a';c.fillRect(-58,10,116,5);c.fillStyle='#e8c35e';for(let i=0;i<9;i++)c.fillRect(-46+i*11,5,2,9)},
};
/* barraca de feira: toldo listrado e balcão; o chão fica em y=22 */
function barraca(c,a,b){c.fillStyle='#0002';c.beginPath();c.ellipse(0,23,44,5,0,0,7);c.fill();c.fillStyle='#6a4a2a';c.fillRect(-38,-18,3,40);c.fillRect(35,-18,3,40);c.fillStyle='#f4ead5';c.fillRect(-36,2,72,20);c.fillStyle='#d8ccb0';c.fillRect(-36,2,72,3);for(let i=0;i<6;i++){c.fillStyle=i%2?b:a;c.fillRect(-42+i*14,-28,14,13)}}
function agua(c,rx){c.fillStyle='#d7c88f';c.beginPath();c.ellipse(0,14,rx+6,13,0,0,7);c.fill();c.fillStyle='#3f8fb5';c.beginPath();c.ellipse(0,15,rx,10,0,0,7);c.fill()}
function arvore(c,x,h,r,tronco,copa){c.fillStyle='#0002';c.beginPath();c.ellipse(x,22,r*.9,4,0,0,7);c.fill();c.fillStyle=tronco;c.fillRect(x-2.6,22-h,5.2,h);c.fillStyle=copa;disc(c,x,22-h-r*.5,r);disc(c,x-r*.7,22-h,r*.7);disc(c,x+r*.7,22-h,r*.7)}
/* uma coisa característica de cada estado, sem escrita; ocupa uns 90 x 60 px com o chão em y=22 */
const TIPICO={
  SP:c=>{barraca(c,'#c8102e','#fff');for(const x of[-24,-8,8]){c.fillStyle='#e8b04a';c.beginPath();c.arc(x,2,7,Math.PI,0);c.fill();c.fillStyle='#c98a2a';for(let i=0;i<5;i++)disc(c,x-5.6+i*2.8,1.6,.8)}c.fillStyle='#d8eef8';c.fillRect(20,-10,9,12);c.fillStyle='#b8c84a';c.fillRect(21,-6,7,8)},
  MG:c=>{barraca(c,'#a6342c','#f2d67a');for(const[x,y]of[[-24,-4],[-10,-4],[-17,-11]]){c.fillStyle='#e8dcb0';rr(c,x-6,y-1,12,7,2);c.fillStyle='#f4ecd0';c.beginPath();c.ellipse(x,y-1,6,2.2,0,0,7);c.fill()}c.fillStyle='#e8c070';for(const[x,y]of[[8,-1],[15,-1],[22,-1],[11.5,-6],[18.5,-6]])disc(c,x,y,3.4)},
  GO:c=>{barraca(c,'#1f7a4d','#f6cf1d');for(const x of[-24,-12,0]){c.fillStyle='#8ab04a';c.beginPath();c.ellipse(x,-3,5,6.4,0,0,7);c.fill();c.strokeStyle='#e8dcb0';c.lineWidth=1.2;c.beginPath();c.moveTo(x-5,-3);c.lineTo(x+5,-3);c.stroke()}for(const x of[14,22]){c.fillStyle='#f2c83a';c.beginPath();c.ellipse(x,-4,3,7,.2,0,7);c.fill();c.fillStyle='#5f8a3e';c.beginPath();c.moveTo(x-4,3);c.lineTo(x,-8);c.lineTo(x+1,3);c.fill()}},
  PA:c=>{barraca(c,'#5a2a6a','#f4ead5');for(const x of[-22,-6,10]){c.fillStyle='#f4f1e8';c.beginPath();c.arc(x,-4,7,0,Math.PI);c.fill();c.fillStyle='#4a1a4a';c.beginPath();c.ellipse(x,-4,7,2.4,0,0,7);c.fill();c.fillStyle='#c9ced6';c.fillRect(x+2,-12,1.4,8)}c.fillStyle='#6a4326';c.fillRect(26,-20,2,22);c.fillStyle='#3f7a32';for(const a of[-2.4,-1.6,-.8,-1.2])c.save(),c.translate(27,-20),c.rotate(a),c.beginPath(),c.ellipse(9,0,10,2.4,0,0,7),c.fill(),c.restore();c.fillStyle='#4a1a4a';for(let i=0;i<4;i++)disc(c,25+i*1.6,-15+i%2,1.4)},
  AL:c=>{c.strokeStyle='#7a5a36';c.lineWidth=4;c.beginPath();c.moveTo(-20,22);c.quadraticCurveTo(-14,-6,-24,-34);c.stroke();c.fillStyle='#3f8a3e';for(const a of[-.3,.6,1.6,2.4,3.3])c.save(),c.translate(-24,-34),c.rotate(a),c.beginPath(),c.ellipse(13,0,15,3.6,0,0,7),c.fill(),c.restore();c.fillStyle='#5f9a3a';disc(c,-22,-30,3.2);disc(c,-27,-29,3.2);for(const[x,y]of[[6,18],[16,18],[26,18],[11,11],[21,11],[16,4]]){c.fillStyle='#6fb04a';disc(c,x,y,5.4);c.fillStyle='#8ccf5f';disc(c,x-1.6,y-1.6,1.6)}c.strokeStyle='#d0162a';c.lineWidth=1.4;c.beginPath();c.moveTo(16,4);c.lineTo(20,-6);c.stroke()},
  BA:c=>{c.fillStyle='#6a4a2a';c.fillRect(-1,-30,2,52);c.fillStyle='#f4f1e8';c.beginPath();c.moveTo(-34,-22);c.quadraticCurveTo(0,-46,34,-22);c.fill();c.fillStyle='#e8dcc0';for(let i=0;i<5;i++){c.beginPath();c.arc(-27+i*13.5,-22,6.8,0,Math.PI);c.fill()}c.fillStyle='#6a4a2a';c.fillRect(-20,8,2,14);c.fillRect(18,8,2,14);c.fillStyle='#d8c090';c.beginPath();c.ellipse(0,6,28,6,0,0,7);c.fill();for(const[x,y]of[[-16,3],[-6,4],[4,3],[14,4],[-10,0],[0,-1],[10,0]]){c.fillStyle='#c8702a';c.beginPath();c.ellipse(x,y,4.6,3,0,0,7);c.fill()}c.fillStyle='#d0162a';disc(c,20,0,2);disc(c,23,2,1.6)},
  CE:c=>{c.fillStyle='#6a4a2a';c.fillRect(-36,-24,4,46);c.fillRect(32,-24,4,46);const k=['#d0162a','#f2b705','#2f8fd0','#35a35f','#ff7ab8'];for(let i=0;i<5;i++){c.strokeStyle=k[i];c.lineWidth=3.2;c.beginPath();c.moveTo(-32,-18+i*.6);c.quadraticCurveTo(0,14+i*3,32,-18+i*.6);c.stroke()}c.strokeStyle='#f4f1e8';c.lineWidth=1;c.beginPath();for(let i=0;i<6;i++){c.moveTo(-26+i*10,-6+Math.abs(i-2.5)*-3+12);c.lineTo(-26+i*10,6+Math.abs(i-2.5)*-3+16)}c.stroke()},
  DF:c=>{c.fillStyle='#d8d4c8';c.fillRect(-44,8,88,10);c.fillStyle='#f4f1e8';c.fillRect(-6,-44,5,52);c.fillRect(2,-44,5,52);c.fillStyle='#d8eef8';for(let y=-40;y<6;y+=6){c.fillRect(-5,y,3,3);c.fillRect(3,y,3,3)}c.fillStyle='#f4f1e8';c.beginPath();c.arc(-26,8,13,Math.PI,0);c.fill();c.beginPath();c.arc(26,-2,14,0,Math.PI);c.fill();c.fillRect(13,-3,26,3)},
  ES:c=>{c.fillStyle='#6a4a2a';c.fillRect(-26,16,52,6);c.fillStyle='#2a2420';c.beginPath();c.ellipse(0,4,28,13,0,0,Math.PI);c.fill();c.fillRect(-28,-2,56,6);c.beginPath();c.ellipse(-30,1,4,2.4,0,0,7);c.ellipse(30,1,4,2.4,0,0,7);c.fill();c.fillStyle='#e8701a';c.beginPath();c.ellipse(0,-2,25,5,0,0,7);c.fill();c.fillStyle='#f4ead0';c.beginPath();c.ellipse(-6,-3,10,3,0,0,7);c.fill();c.beginPath();c.moveTo(4,-3);c.lineTo(10,-7);c.lineTo(10,1);c.fill();c.fillStyle='#3f9e5c';for(const[x,y]of[[-16,-3],[12,-1],[18,-4],[-2,0]])disc(c,x,y,1.6);c.fillStyle='#d0162a';disc(c,8,-2,1.8)},
  AM:c=>{agua(c,42);for(const[x,y,r]of[[-20,14,13],[12,17,11],[24,8,8]]){c.fillStyle='#3f8a3e';c.beginPath();c.ellipse(x,y,r,r*.42,0,0,7);c.fill();c.strokeStyle='#8a3a3a';c.lineWidth=1.6;c.beginPath();c.ellipse(x,y,r,r*.42,0,Math.PI*.05,Math.PI*.95,true);c.stroke();c.strokeStyle='#2f6a2e';c.lineWidth=.8;c.beginPath();c.moveTo(x,y);c.lineTo(x+r*.9,y-r*.1);c.stroke()}c.fillStyle='#f4f1e8';for(let i=0;i<6;i++){c.save();c.translate(-2,10);c.rotate(i*1.05);c.beginPath();c.ellipse(0,-4,2,5,0,0,7);c.fill();c.restore()}c.fillStyle='#ff9ab8';disc(c,-2,10,3)},
  AP:c=>{agua(c,42);c.fillStyle='#8a5a30';c.beginPath();c.moveTo(-34,8);c.quadraticCurveTo(0,22,34,8);c.lineTo(28,14);c.quadraticCurveTo(0,24,-28,14);c.fill();c.fillStyle='#6a4326';c.fillRect(-26,8,52,2);c.save();c.translate(10,0);c.rotate(.6);c.fillStyle='#6a4326';c.fillRect(-1,-22,2,32);c.beginPath();c.ellipse(0,12,3,6,0,0,7);c.fill();c.restore();c.fillStyle='#f2b705';c.beginPath();c.moveTo(-14,8);c.lineTo(-18,-6);c.lineTo(-6,8);c.fill()},
  MA:c=>{c.fillStyle='#0002';c.beginPath();c.ellipse(0,23,34,5,0,0,7);c.fill();const k=['#d0162a','#f2b705','#2f6fd0','#35a35f','#7a3ab0','#ff7ab8'];for(let i=0;i<9;i++){c.fillStyle=k[i%6];c.fillRect(-28+i*6.4,0,6.4,20)}c.fillStyle='#17181d';c.beginPath();c.ellipse(0,-4,30,11,0,0,7);c.fill();c.fillStyle='#f2b705';for(let i=0;i<14;i++)disc(c,-24+i*3.7,-4+Math.sin(i)*4,1.2);c.fillStyle='#17181d';c.beginPath();c.ellipse(32,-14,10,8,-.3,0,7);c.fill();c.fillStyle='#f4f1e8';star(c,34,-16,3.4);c.strokeStyle='#e8dcc0';c.lineWidth=3;c.beginPath();c.moveTo(28,-20);c.quadraticCurveTo(22,-32,30,-34);c.moveTo(38,-20);c.quadraticCurveTo(44,-32,38,-34);c.stroke();c.strokeStyle='#f2b705';c.lineWidth=1;for(let i=0;i<7;i++){c.beginPath();c.moveTo(-30+i*10,-14);c.lineTo(-32+i*10,-24);c.stroke()}},
  MS:c=>{c.fillStyle='#0002';c.beginPath();c.ellipse(0,23,30,4,0,0,7);c.fill();c.fillStyle='#2f7a3e';rr(c,4,-14,24,36,4);c.fillStyle='#f4f1e8';c.fillRect(4,-8,24,4);c.fillStyle='#17181d';rr(c,11,-20,10,7,2);c.fillStyle='#d8c090';c.beginPath();c.moveTo(-28,22);c.lineTo(-10,22);c.quadraticCurveTo(-6,-4,-12,-12);c.lineTo(-24,-12);c.quadraticCurveTo(-30,-4,-28,22);c.fill();c.fillStyle='#3f8a3e';c.beginPath();c.ellipse(-18,-12,6,2.2,0,0,7);c.fill();c.strokeStyle='#c9ced6';c.lineWidth=2;c.beginPath();c.moveTo(-17,-10);c.lineTo(-12,-30);c.stroke()},
  MT:c=>{c.fillStyle='#0002';c.beginPath();c.ellipse(0,23,44,5,0,0,7);c.fill();c.fillStyle='#2f8a3e';rr(c,-20,-14,46,24,3);c.fillRect(6,-30,16,18);c.fillStyle='#bfe3f5';c.fillRect(9,-27,10,9);c.fillStyle='#f2b705';c.fillRect(-36,2,18,12);c.strokeStyle='#d9a400';c.lineWidth=1.2;for(let i=0;i<4;i++){c.beginPath();c.moveTo(-36,4+i*3);c.lineTo(-18,4+i*3);c.stroke()}c.fillStyle='#22242a';disc(c,-6,14,8);disc(c,20,16,6);c.fillStyle='#8a8f98';disc(c,-6,14,3);disc(c,20,16,2.4);c.fillStyle='#c9a45a';c.beginPath();c.moveTo(30,22);c.quadraticCurveTo(38,8,46,22);c.fill()},
  PB:c=>{c.fillStyle='#0002';c.beginPath();c.ellipse(0,23,30,4,0,0,7);c.fill();c.fillStyle='#c8102e';rr(c,-30,-14,12,32,2);rr(c,18,-14,12,32,2);c.fillStyle='#f4f1e8';for(let i=0;i<6;i++)c.fillRect(-28,-12+i*5,8,3);for(let i=0;i<8;i++){c.fillStyle=i%2?'#2a2a2e':'#5a5f68';c.beginPath();c.moveTo(-18+i*4.5,-14);c.lineTo(-13.5+i*4.5,-14);c.lineTo(-13.5+i*4.5,18);c.lineTo(-18+i*4.5,18);c.fill()}c.fillStyle='#d9a400';for(let i=0;i<4;i++)disc(c,24,-9+i*7,1.8);c.strokeStyle='#6a4326';c.lineWidth=2;c.beginPath();c.moveTo(-24,-14);c.quadraticCurveTo(0,-26,24,-14);c.stroke()},
  PE:c=>{c.fillStyle='#0002';c.beginPath();c.ellipse(0,23,24,4,0,0,7);c.fill();c.fillStyle='#6a4a2a';c.fillRect(-1.4,-18,2.8,40);const k=['#d0162a','#f2b705','#35a35f','#2f6fd0'];for(let i=0;i<8;i++){c.fillStyle=k[i%4];c.beginPath();c.moveTo(0,-26);c.arc(0,-26,28,Math.PI+i*Math.PI/8,Math.PI+(i+1)*Math.PI/8);c.fill()}c.fillStyle='#f4f1e8';for(let i=0;i<=8;i++)disc(c,-28*Math.cos(i*Math.PI/8),-26-28*Math.sin(i*Math.PI/8),1.6)},
  PI:c=>{arvore(c,-6,22,20,'#6a4326','#3f7a32');for(const[x,y]of[[-18,-10],[-4,-22],[8,-12],[-12,-26],[4,-4]]){c.fillStyle=Math.abs(x)%3?'#e8402a':'#f6b02c';c.beginPath();c.ellipse(x,y,3.4,4.4,0,0,7);c.fill();c.fillStyle='#8a7a62';disc(c,x,y+5,1.8)}c.fillStyle='#e8dcc0';rr(c,22,6,6,16,1.4);c.fillRect(23.6,2,2.8,5)},
  PR:c=>{c.fillStyle='#0002';c.beginPath();c.ellipse(0,23,26,4,0,0,7);c.fill();c.fillStyle='#6a4326';c.fillRect(-2.6,-40,5.2,62);c.fillStyle='#2f5a32';for(const[y,w]of[[-42,30],[-30,38],[-18,30]]){c.beginPath();c.moveTo(-w,y+5);c.quadraticCurveTo(0,y-12,w,y+5);c.quadraticCurveTo(0,y-2,-w,y+5);c.fill()}c.fillStyle='#3f7a42';c.beginPath();c.ellipse(0,-50,10,4,0,0,7);c.fill()},
  RJ:c=>{c.fillStyle='#ecd9a0';c.beginPath();c.ellipse(0,18,46,9,0,0,7);c.fill();c.fillStyle='#6a4a2a';c.fillRect(-12,-24,2,42);for(let i=0;i<6;i++){c.fillStyle=i%2?'#fff':'#ff7a1c';c.beginPath();c.moveTo(-11,-30);c.arc(-11,-30,26,Math.PI+i*Math.PI/6,Math.PI+(i+1)*Math.PI/6);c.fill()}c.strokeStyle='#2f6fd0';c.lineWidth=2;c.beginPath();c.moveTo(-34,18);c.lineTo(-26,6);c.lineTo(-18,18);c.moveTo(-34,8);c.lineTo(-18,8);c.stroke();c.fillStyle='#ff7a1c';rr(c,18,-2,16,20,3);c.fillStyle='#fff';c.fillRect(18,4,16,3);c.fillRect(18,11,16,3);c.fillStyle='#c9ced6';c.fillRect(24,-6,4,4)},
  RN:c=>{c.fillStyle='#f2e0b0';c.beginPath();c.moveTo(-48,22);c.quadraticCurveTo(-10,-20,30,8);c.quadraticCurveTo(40,14,48,22);c.fill();c.fillStyle='#0002';c.beginPath();c.ellipse(6,20,22,3,0,0,7);c.fill();c.fillStyle='#f2b705';c.beginPath();c.moveTo(-14,14);c.lineTo(-10,4);c.lineTo(18,4);c.lineTo(24,14);c.fill();c.strokeStyle='#22242a';c.lineWidth=2;c.beginPath();c.moveTo(-6,4);c.lineTo(-2,-6);c.lineTo(12,-6);c.lineTo(14,4);c.stroke();c.fillStyle='#22242a';disc(c,-8,16,5);disc(c,18,16,5);c.fillStyle='#8a8f98';disc(c,-8,16,2);disc(c,18,16,2)},
  RO:c=>{c.fillStyle='#0002';c.beginPath();c.ellipse(0,23,32,4,0,0,7);c.fill();c.fillStyle='#3a3a40';c.fillRect(-26,10,3,12);c.fillRect(23,10,3,12);c.fillRect(-30,6,60,6);c.fillStyle='#ff6a1c';for(let i=0;i<7;i++)disc(c,-24+i*8,5,2.6);c.strokeStyle='#8a8f98';c.lineWidth=1;c.beginPath();for(let i=0;i<9;i++){c.moveTo(-28+i*7,2);c.lineTo(-28+i*7,-2)}c.stroke();c.fillStyle='#4a5a6a';c.beginPath();c.ellipse(-2,-6,20,8,0,0,7);c.fill();c.beginPath();c.moveTo(16,-6);c.lineTo(28,-14);c.lineTo(28,2);c.fill();c.fillStyle='#d8703a';c.beginPath();c.ellipse(-2,-3,17,4,0,0,Math.PI);c.fill();c.fillStyle='#fff';disc(c,-16,-8,2);c.fillStyle='#111';disc(c,-16,-8,1);c.strokeStyle='#2a2a2e';c.lineWidth=1;c.beginPath();for(const x of[-6,0,6]){c.moveTo(x,-13);c.lineTo(x+2,0)}c.stroke()},
  RR:c=>{c.fillStyle='#0002';c.beginPath();c.ellipse(0,23,40,5,0,0,7);c.fill();c.fillStyle='#c9a45a';c.beginPath();c.moveTo(-38,22);c.quadraticCurveTo(-36,-10,0,-38);c.quadraticCurveTo(36,-10,38,22);c.fill();c.strokeStyle='#a8823a';c.lineWidth=1.2;for(let i=1;i<6;i++){c.beginPath();c.moveTo(-38+i*1.6,22-i*9);c.quadraticCurveTo(0,22-i*9-6,38-i*1.6,22-i*9);c.stroke()}c.fillStyle='#3a2a1a';c.beginPath();c.arc(0,22,8,Math.PI,0);c.fill()},
  RS:c=>{c.fillStyle='#0002';c.beginPath();c.ellipse(0,23,32,4,0,0,7);c.fill();c.fillStyle='#4a6a3a';c.beginPath();c.moveTo(-26,-2);c.quadraticCurveTo(-30,22,-12,22);c.quadraticCurveTo(6,22,2,-2);c.fill();c.fillStyle='#c9ced6';c.fillRect(-27,-4,30,3);c.fillStyle='#3f8a3e';c.beginPath();c.ellipse(-12,-3,13,2.4,0,0,7);c.fill();c.strokeStyle='#d8d8d8';c.lineWidth=2.4;c.beginPath();c.moveTo(-10,-3);c.lineTo(-2,-28);c.stroke();c.fillStyle='#d8d8d8';rr(c,-5,-31,6,4,1.4);c.fillStyle='#c8c8c8';rr(c,12,-22,16,44,4);c.fillStyle='#2a2a2e';rr(c,14,-28,12,8,2);c.fillRect(26,-14,6,3);c.fillStyle='#d0162a';c.fillRect(12,4,16,3);c.fillStyle='#1f7a4d';c.fillRect(12,8,16,3)},
  SC:c=>{c.fillStyle='#0002';c.beginPath();c.ellipse(0,23,36,4,0,0,7);c.fill();c.fillStyle='#8a5a30';c.beginPath();c.ellipse(-12,4,20,20,0,0,7);c.fill();c.fillStyle='#6a4326';c.fillRect(-32,-6,40,3);c.fillRect(-32,12,40,3);c.fillStyle='#a06a3a';c.beginPath();c.ellipse(-12,4,6,18,0,0,7);c.fill();c.fillStyle='#c9ced6';c.fillRect(-14,1,4,6);c.fillStyle='#f2b705';rr(c,14,-6,16,28,2);c.strokeStyle='#d8eef8';c.lineWidth=3;c.beginPath();c.arc(30,8,6,-1.4,1.4);c.stroke();c.fillStyle='#fff';c.beginPath();c.ellipse(22,-7,10,4.4,0,0,7);c.fill();disc(c,16,-10,4);disc(c,26,-10,4);c.fillStyle='#ffffff55';c.fillRect(17,-2,3,22)},
  SE:c=>{c.strokeStyle='#6a4a2a';c.lineWidth=1;c.beginPath();c.moveTo(-44,-36);c.quadraticCurveTo(0,-22,44,-36);c.stroke();const k=['#d0162a','#f2b705','#2f6fd0','#35a35f'];for(let i=0;i<10;i++){const x=-40+i*9,y=-35+(1-(x/44)**2)*10;c.fillStyle=k[i%4];c.beginPath();c.moveTo(x-3.4,y);c.lineTo(x+3.4,y);c.lineTo(x,y+8);c.fill()}c.fillStyle='#0002';c.beginPath();c.ellipse(0,23,26,4,0,0,7);c.fill();c.fillStyle='#6a4326';for(const a of[-.5,.5,0]){c.save();c.translate(0,18);c.rotate(a);c.fillRect(-3,-22,6,26);c.restore()}c.fillStyle='#ff8a2c';c.beginPath();c.moveTo(-16,14);c.quadraticCurveTo(-12,-14,0,-24);c.quadraticCurveTo(12,-14,16,14);c.fill();c.fillStyle='#ffd24a';c.beginPath();c.moveTo(-8,14);c.quadraticCurveTo(-4,-4,0,-12);c.quadraticCurveTo(4,-4,8,14);c.fill()},
  TO:c=>{c.fillStyle='#0002';c.beginPath();c.ellipse(0,23,36,5,0,0,7);c.fill();c.fillStyle='#d9a441';c.beginPath();c.moveTo(-30,0);c.lineTo(-4,0);c.lineTo(-8,22);c.lineTo(-26,22);c.fill();c.strokeStyle='#a8782a';c.lineWidth=1;for(let i=1;i<6;i++){c.beginPath();c.moveTo(-30+i*.8,i*3.8);c.lineTo(-4-i*.8,i*3.8);c.stroke()}c.fillStyle='#e8b84a';c.beginPath();c.ellipse(-17,0,13,3,0,0,7);c.fill();c.strokeStyle='#d9a441';c.lineWidth=2.4;for(const r of[14,10,6]){c.beginPath();c.arc(18,6,r,0,7);c.stroke()}c.strokeStyle='#a8782a';c.lineWidth=.8;for(let i=0;i<12;i++){const a=i*Math.PI/6;c.beginPath();c.moveTo(18+Math.cos(a)*4,6+Math.sin(a)*4);c.lineTo(18+Math.cos(a)*15,6+Math.sin(a)*15);c.stroke()}},
  AC:c=>{arvore(c,-8,30,16,'#7a6a52','#3f7a32');c.fillStyle='#f4f1e8';for(let i=0;i<3;i++){c.save();c.translate(-8,8-i*6);c.rotate(-.4);c.fillRect(-4,-.6,8,1.2);c.restore()}c.fillStyle='#f4f1e8';c.beginPath();c.moveTo(-3,10);c.lineTo(3,10);c.lineTo(1,16);c.lineTo(-1,16);c.fill();c.fillStyle='#5a3a22';c.beginPath();c.arc(-1,18,4,0,Math.PI);c.fill();c.fillStyle='#e8e0c8';for(const[x,y]of[[16,18],[24,18],[20,13]]){c.beginPath();c.ellipse(x,y,5,4,0,0,7);c.fill()}},
};
/* ---------- cenário caprichado por bioma ----------
   Cada bioma (ou visual especial: geada em SC, outono em PR e MG) tem as suas árvores, flores, bichos e uma borda de mata e pedras
   em volta do mapa. Tudo é só cenário: onde dá para colocar personagem continua igual. */
const VISUAL={
  amazonia:{arv:['copa','copa','palmeira'],cores:['#1f5a2a','#2f6b2c','#3f7a32','#2a6e3a'],borda:['copa'],flores:['#e2679b','#f3c11f','#ff7a1c'],extra:'samambaia',trechos:['mato','lama']},
  mata:{arv:['copa','ipe','copa'],cores:['#3f7a32','#4c8a3a','#5f9a48'],ipe:'#e86aa6',borda:['copa'],flores:['#fff','#f3c11f','#e2679b'],extra:'borboleta',trechos:['ladeira','mato']},
  cerrado:{arv:['retorcida','ipe','retorcida'],cores:['#6f8a3a','#7f9a46','#5f7a32'],ipe:'#9b59b6',borda:['retorcida','copa'],flores:['#f3c11f','#fff'],extra:'cupim',trechos:['mato','subida']},
  pampa:{arv:['copa'],cores:['#4c7a3a','#5f8f42'],borda:['copa'],flores:['#fff','#f3c11f','#9b7fd0'],extra:'ovelha',trechos:['mato','ladeira']},
  pantanal:{arv:['palmeira','copa'],cores:['#4c7a3a','#5f8f42','#3f7a32'],borda:['copa','palmeira'],flores:['#e2679b','#fff'],extra:'poca',trechos:['lama','mato']},
  serra:{arv:['araucaria','copa'],cores:['#2f5a30','#3a6a38'],borda:['araucaria'],flores:['#fff','#9b7fd0'],extra:'pedra',trechos:['ladeira','subida']},
  outono:{arv:['ipe','araucaria','copaOutono'],cores:['#d98b2b','#e0a94f','#c96a24'],ipe:'#f2c12e',borda:['copaOutono','araucaria'],flores:['#f2c12e','#d98b2b'],extra:'folhas',trechos:['ladeira','subida']},
  geada:{arv:['araucariaNeve','pinheiroNeve'],cores:['#2f5a40','#3a6a48'],borda:['pinheiroNeve'],flores:['#ffffff'],extra:'neve',trechos:['gelo','subida']},
  sertao:{borda:['seca'],trechos:['areia','ladeira']},
  favela:{trechos:['ladeira','subida']},
};
const visualDe=M=>VISUAL[M.tema||M.visual||ESTADOS[M.i][2]]||VISUAL.mata;
/* desenho dos trechos na avenida (o mato alto é desenhado por cima da marcha, em desenhaTopoDinamico) */
function desenhaTrechos(c,M){
  for(const t of M.trechos||[]){
    const pts=[];for(let d=t.d1;d<=t.d2;d+=6)pts.push(posAt(d));
    const linha=(w,cor)=>{c.strokeStyle=cor;c.lineWidth=w;c.lineCap='round';c.beginPath();pts.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.stroke()};
    if(t.tipo==='ladeira'){linha(46,'rgba(0,0,0,.18)');for(let d=t.d1+12;d<t.d2;d+=26){const p=posAt(d),q=posAt(d+6);c.save();c.translate(p.x,p.y);c.rotate(Math.atan2(q.y-p.y,q.x-p.x));c.strokeStyle='rgba(255,255,255,.7)';c.lineWidth=3;c.beginPath();c.moveTo(-6,-9);c.lineTo(3,0);c.lineTo(-6,9);c.moveTo(1,-9);c.lineTo(10,0);c.lineTo(1,9);c.stroke();c.restore()}}
    else if(t.tipo==='subida'){linha(46,'rgba(255,255,255,.12)');for(let d=t.d1+4;d<t.d2;d+=9){const p=posAt(d);c.save();c.translate(p.x,p.y);c.rotate(Math.atan2(p.dy,p.dx));c.fillStyle='rgba(0,0,0,.28)';c.fillRect(-1,-21,2.4,42);c.restore()}}
    else if(t.tipo==='lama'){for(const p of pts){for(let i=0;i<2;i++){const ox=(Math.sin(p.x*1.7+i)*.5)*30,oy=(Math.cos(p.y*1.3+i)*.5)*30;c.fillStyle=i?'#5a3a20':'#7a5232';c.beginPath();c.ellipse(p.x+ox,p.y+oy,9+((p.x+p.y+i*7)%7),6,p.x%3,0,7);c.fill()}}c.fillStyle='#4a2f18';for(const p of pts)if(Math.round(p.x+p.y)%5===0)disc(c,p.x+((p.y*3)%20-10),p.y+((p.x*3)%20-10),2.4)}
    else if(t.tipo==='areia'){for(const p of pts){c.fillStyle='#e6c88e';c.beginPath();c.ellipse(p.x+(Math.sin(p.x)*14),p.y+(Math.cos(p.y)*14),14,8,p.x%3,0,7);c.fill()}c.strokeStyle='#c9a46a';c.lineWidth=1.2;for(let d=t.d1;d<t.d2;d+=14){const p=posAt(d);c.beginPath();c.arc(p.x,p.y+6,10,3.6,5.8);c.stroke()}}
    else if(t.tipo==='corredor'){
      /* corredor de ônibus: faixa vermelha com bordas brancas tracejadas, setas e pontos de ônibus na calçada */
      linha(46,'rgba(176,32,42,.55)');c.setLineDash([10,8]);
      for(const s of[-1,1]){c.strokeStyle='rgba(255,255,255,.85)';c.lineWidth=2;c.beginPath();pts.forEach((p,i)=>{const x=p.x-p.dy*s*19,y=p.y+p.dx*s*19;i?c.lineTo(x,y):c.moveTo(x,y)});c.stroke()}c.setLineDash([]);
      for(let d=t.d1+20;d<t.d2;d+=34){const p=posAt(d),q=posAt(d+6);c.save();c.translate(p.x,p.y);c.rotate(Math.atan2(q.y-p.y,q.x-p.x));c.fillStyle='rgba(255,255,255,.8)';c.beginPath();c.moveTo(8,0);c.lineTo(-4,-6);c.lineTo(-4,6);c.closePath();c.fill();c.restore()}
      for(const d of[t.d1+30,t.d2-30]){const p=posAt(d),x=p.x-p.dy*36,y=p.y+p.dx*36;if(distPath(x,y)<30)continue;c.fillStyle='#0003';c.fillRect(x-11,y+2,24,4);c.fillStyle='#3a4a5a';c.fillRect(x-11,y-14,22,3);c.fillStyle='#9ad0e8aa';c.fillRect(x-10,y-11,20,10);c.fillStyle='#4a4f58';c.fillRect(x-11,y-11,2,13);c.fillRect(x+9,y-11,2,13);c.fillStyle='#c8102e';c.fillRect(x+12,y-20,3,22)}
    }
    else if(t.tipo==='rodovia'){
      /* asfalto novo e escuro, faixa dupla amarela no meio, bordas brancas e marcos de quilômetro na beira */
      linha(46,'#2e2e34');
      for(const s of[-1,1]){c.strokeStyle='#f4f1e8';c.lineWidth=2;c.beginPath();pts.forEach((p,i)=>{const x=p.x-p.dy*s*20,y=p.y+p.dx*s*20;i?c.lineTo(x,y):c.moveTo(x,y)});c.stroke()}
      for(const s of[-1.6,1.6]){c.strokeStyle='#f2c12e';c.lineWidth=1.6;c.beginPath();pts.forEach((p,i)=>{const x=p.x-p.dy*s,y=p.y+p.dx*s;i?c.lineTo(x,y):c.moveTo(x,y)});c.stroke()}
      for(let d=t.d1+18;d<t.d2;d+=44){const p=posAt(d),q=posAt(d+6);c.save();c.translate(p.x,p.y);c.rotate(Math.atan2(q.y-p.y,q.x-p.x));c.fillStyle='rgba(255,255,255,.55)';for(const o of[-10,10]){c.beginPath();c.moveTo(6,o);c.lineTo(-3,o-4);c.lineTo(-3,o+4);c.closePath();c.fill()}c.restore()}
      for(let d=t.d1+10;d<t.d2;d+=70){const p=posAt(d),x=p.x-p.dy*30,y=p.y+p.dx*30;if(distPath(x,y)<26)continue;c.fillStyle='#0003';c.fillRect(x-2,y,6,2);c.fillStyle='#f4f1e8';rr(c,x-3,y-10,6,10,2);c.fillStyle='#35a35f';c.fillRect(x-3,y-10,6,3)}
    }
    else if(t.tipo==='gelo'){linha(46,'rgba(207,233,247,.75)');c.strokeStyle='rgba(255,255,255,.9)';c.lineWidth=1.5;for(let d=t.d1;d<t.d2;d+=18){const p=posAt(d),q=posAt(d+12);const o=((d*7)%30)-15;c.beginPath();c.moveTo(p.x-p.dy*o,p.y+p.dx*o);c.lineTo(q.x-q.dy*o,q.y+q.dx*o);c.stroke()}}
  }
}
/* mato alto por cima da marcha: tufos que balançam de leve */
function desenhaMato(c,M){
  for(const t of M.trechos||[])if(t.tufos)for(const[x,y,s,f]of t.tufos){
    const bal=Math.sin(S.time*2+f*6)*1.5;c.strokeStyle=f<.5?'#4c8a3a':'#5f9a48';c.lineWidth=2*s;
    c.beginPath();for(const a of[-.5,-.2,.15,.45]){c.moveTo(x,y);c.quadraticCurveTo(x+a*6*s+bal,y-8*s,x+a*10*s+bal*1.5,y-16*s)}c.stroke();
  }
}
/* trechos da avenida: mudam a marcha enquanto ela passa por eles */
const TRECHOS={
  ladeira:{nome:'Ladeira',vel:1.45,txt:'ladeira (a marcha desce acelerando)'},
  subida:{nome:'Subida',vel:.75,txt:'subida (a marcha anda devagar)'},
  lama:{nome:'Lama',vel:.65,txt:'lama (a marcha atola)'},
  areia:{nome:'Areia fofa',vel:.75,txt:'areia fofa (a marcha anda devagar)'},
  gelo:{nome:'Geada',vel:1.6,txt:'geada (a marcha escorrega mais rápido)'},
  mato:{nome:'Mato alto',vel:1,esconde:1,txt:'mato alto (esconde a marcha: só quem detecta Isentões vê)'},
  corredor:{nome:'Corredor de ônibus',vel:1.75,txt:'corredor de ônibus (a marcha pega carona e anda bem mais rápido)'},
  rodovia:{nome:'Rodovia',vel:1.6,txt:'trecho de rodovia (asfalto novo: a marcha anda bem mais rápido)'},
};
/* mapas de cidade grande ganham também um corredor de ônibus, além dos trechos do bioma */
const MAPAS_CORREDOR=['SP','RJ','MG','PR','GO','ES','AM','PA','BA','SE'];
function trechoEm(e){const l=MAPAS[S.uf].trechos;if(!l)return null;for(const t of l)if(e.d>t.d1&&e.d<t.d2&&(!t.soPrincipal||naPrincipal(e.d,e.via)))return t;return null}
/* velocidade no trecho (chefões sentem metade) e se o mato esconde (chefões não se escondem) */
function velTrecho(e){const t=trechoEm(e);if(!t)return 1;const f=TRECHOS[t.tipo].vel;return e.T.boss?1+(f-1)*.5:f}
const noMato=e=>{const t=trechoEm(e);return !!t&&t.tipo==='mato'&&!e.T.boss};
/* escolhe os trechos de cada mapa num pedaço comum a todos os caminhos (fora de desvio, entrada lateral, túnel e trem) */
function montaTrechos(M){
  M.trechos=[];if(M.uf==='DF')return;
  let s=hashStr('trecho'+M.uf);const r=()=>(s=(Math.imul(s,1103515245)+12345)>>>0)/4294967296;
  const tipos=(visualDe(M).trechos||[]).slice();
  /* todo mapa ganha um trecho rápido: corredor de ônibus nas cidades grandes, rodovia nos outros */
  tipos.unshift(MAPAS_CORREDOR.includes(M.uf)?'corredor':'rodovia');
  const livreD=(a,b)=>{
    if(a<220||b>LEN-160)return false;
    /* nada de trecho no pedaço que o metrô pula, nem no ponto do balão */
    if(M.metro&&b>M.metro.d1-40&&a<M.metro.d2+40)return false;
    if(M.balaoVoo&&((b>M.balaoVoo.d1-60&&a<M.balaoVoo.d1+60)||(b>M.balaoVoo.d2-60&&a<M.balaoVoo.d2+60)))return false;
    if(M.desvio&&b>M.desvio.d1-50&&a<M.desvio.d2+50)return false;
    if(M.entrada&&a<M.entrada.dm+60&&!soPrincipal)return false;
    if(M.tunel&&b>M.tunel.d1-40&&a<M.tunel.d2+40)return false;
    if(M.trem&&b>M.trem.d-60&&a<M.trem.d+60)return false;
    return M.trechos.every(t=>b<t.d1-150||a>t.d2+150);
  };
  let soPrincipal=false;
  for(const tipo of tipos){
    const comp=170+r()*60;let ok=null;soPrincipal=false;
    for(let k=0;k<40&&!ok;k++){const a=220+r()*(LEN-400-comp);if(livreD(a,a+comp))ok=a}
    /* sem lugar na parte comum (avenidas extras que se juntam tarde): fica na avenida principal, e só vale para quem passa por ela */
    if(ok===null&&M.entrada){soPrincipal=true;for(let k=0;k<40&&!ok;k++){const a=220+r()*(LEN-400-comp);if(livreD(a,a+comp))ok=a}}
    if(ok!==null)M.trechos.push({tipo,d1:ok,d2:ok+comp,soPrincipal:soPrincipal&&ok<M.entrada.dm+60});
  }
  /* tufos do mato alto, já posicionados (desenhados por cima da marcha a cada quadro) */
  for(const t of M.trechos)if(t.tipo==='mato'){t.tufos=[];for(let d=t.d1;d<t.d2;d+=7){const p=posAt(d);for(let i=0;i<3;i++)t.tufos.push([p.x+(r()-.5)*44,p.y+(r()-.5)*40,.8+r()*.6,r()])}}
}
/* árvores de cada tipo */
function arvoreTipo(c,tipo,x,y,s,col,V){
  c.fillStyle='#0002';c.beginPath();c.ellipse(x,y+4,11*s,4*s,0,0,7);c.fill();
  if(tipo==='palmeira'){
    c.strokeStyle='#7a5a36';c.lineWidth=3*s;c.beginPath();c.moveTo(x,y+4);c.quadraticCurveTo(x+4*s,y-12*s,x+2*s,y-26*s);c.stroke();
    c.fillStyle=col;for(const a of[-2.9,-2.2,-1.5,-.8,-.2]){c.save();c.translate(x+2*s,y-26*s);c.rotate(a);c.beginPath();c.ellipse(11*s,0,12*s,3*s,.2,0,7);c.fill();c.restore()}
  }else if(tipo==='araucaria'||tipo==='araucariaNeve'){
    c.fillStyle='#5a3d27';c.fillRect(x-1.5*s,y-30*s,3*s,35*s);
    for(const[q,w]of[[-32,16],[-25,13],[-18,9]]){c.fillStyle=col;c.beginPath();c.ellipse(x,y+q*s,w*s,3.6*s,0,0,7);c.fill();if(tipo==='araucariaNeve'){c.fillStyle='#fff';c.beginPath();c.ellipse(x,y+(q-1.4)*s,w*.8*s,1.8*s,0,0,7);c.fill()}}
  }else if(tipo==='pinheiroNeve'){
    c.fillStyle='#5a3d27';c.fillRect(x-1.5*s,y-6*s,3*s,9*s);
    for(const[q,w]of[[-8,12],[-16,10],[-23,7]]){c.fillStyle=col;c.beginPath();c.moveTo(x-w*s,y+q*s);c.lineTo(x,y+(q-12)*s);c.lineTo(x+w*s,y+q*s);c.closePath();c.fill();
      c.fillStyle='#fff';c.beginPath();c.moveTo(x-w*.55*s,y+(q-5)*s);c.lineTo(x,y+(q-12)*s);c.lineTo(x+w*.55*s,y+(q-5)*s);c.quadraticCurveTo(x,y+(q-3)*s,x-w*.55*s,y+(q-5)*s);c.fill()}
  }else if(tipo==='retorcida'||tipo==='seca'){
    c.strokeStyle=tipo==='seca'?'#7a6450':'#5a3d27';c.lineWidth=2.6*s;c.lineCap='round';
    c.beginPath();c.moveTo(x,y+4);c.quadraticCurveTo(x-6*s,y-6*s,x-2*s,y-14*s);c.quadraticCurveTo(x+2*s,y-18*s,x+8*s,y-20*s);c.moveTo(x-2*s,y-12*s);c.quadraticCurveTo(x-8*s,y-16*s,x-12*s,y-17*s);c.stroke();
    if(tipo==='retorcida'){c.fillStyle=col;disc(c,x+8*s,y-22*s,6*s);disc(c,x-12*s,y-19*s,5*s);disc(c,x-1*s,y-18*s,4.5*s)}
  }else if(tipo==='ipe'){
    c.fillStyle='#5a3d27';c.fillRect(x-1.5*s,y-8*s,3*s,12*s);
    const f=V.ipe||'#f2c12e';c.fillStyle=f;disc(c,x,y-14*s,9*s);disc(c,x-7*s,y-9*s,6*s);disc(c,x+7*s,y-9*s,6*s);
    c.fillStyle='#ffffff66';disc(c,x-3*s,y-17*s,3*s);
    c.fillStyle=f;for(let i=0;i<5;i++)disc(c,x+(i-2)*4*s,y+5+(i%2)*2,1.4*s);
  }else{
    /* copa redonda (copaOutono = folhas alaranjadas) */
    c.fillStyle='#5a3d27';c.fillRect(x-1.5*s,y-5*s,3*s,9*s);
    c.fillStyle=col;disc(c,x,y-10*s,9*s);disc(c,x-7*s,y-6*s,6*s);disc(c,x+7*s,y-6*s,6*s);
    c.fillStyle='#ffffff22';disc(c,x-3*s,y-13*s,4*s);
  }
}
/* chão: capim, flores, pedrinhas, trilhas e o detalhe de cada bioma (desenhado antes da avenida, que fica por cima) */
function texturaChao(c,M,r,V){
  /* trilhas de terra serpenteando pelo mapa */
  for(let k=0;k<2;k++){
    const x0=r()<.5?-10:W+10,y0=60+r()*(H-120),x1=W-x0,y1=60+r()*(H-120);
    c.strokeStyle=M.visual==='geada'?'rgba(255,255,255,.45)':'rgba(150,110,60,.32)';c.lineWidth=13;c.lineCap='round';
    c.beginPath();c.moveTo(x0,y0);c.bezierCurveTo(W*.3,r()*H,W*.7,r()*H,x1,y1);c.stroke();
    c.strokeStyle='rgba(0,0,0,.08)';c.lineWidth=1.5;c.setLineDash([3,6]);c.stroke();c.setLineDash([]);
  }
  /* capim: tufinhos em dois tons */
  for(let i=0;i<650;i++){const x=r()*W,y=r()*H;c.strokeStyle=r()<.5?'rgba(0,0,0,.13)':'rgba(255,255,255,.14)';c.lineWidth=1;c.beginPath();for(const a of[-.45,0,.45]){c.moveTo(x,y);c.lineTo(x+Math.sin(a)*4,y-5)}c.stroke()}
  /* moitas de flores */
  for(let i=0;i<24;i++){const x=r()*W,y=r()*H,cor=V.flores?V.flores[Math.floor(r()*V.flores.length)]:'#fff';for(let j=0;j<8;j++){c.fillStyle=cor;disc(c,x+(r()-.5)*22,y+(r()-.5)*12,1.6+r())}}
  /* pedrinhas */
  for(let i=0;i<28;i++){const x=r()*W,y=r()*H,t=2+r()*4;c.fillStyle='#00000026';c.beginPath();c.ellipse(x+1,y+1.5,t,t*.6,0,0,7);c.fill();c.fillStyle=r()<.5?'#9aa0a8':'#b8bcc4';c.beginPath();c.ellipse(x,y,t,t*.6,0,0,7);c.fill()}
  /* detalhes do bioma no chão */
  if(V.extra==='folhas')for(let i=0;i<380;i++){c.fillStyle=['#e0a94f','#d98b2b','#c96a24','#f2c12e'][Math.floor(r()*4)];c.save();c.translate(r()*W,r()*H);c.rotate(r()*6);c.beginPath();c.ellipse(0,0,3,1.5,0,0,7);c.fill();c.restore()}
  if(V.extra==='neve'){for(let i=0;i<40;i++){c.fillStyle='rgba(255,255,255,.55)';c.beginPath();c.ellipse(r()*W,r()*H,20+r()*50,10+r()*20,r()*3,0,7);c.fill()}
    for(let i=0;i<160;i++){c.fillStyle='#fff';disc(c,r()*W,r()*H,.8+r()*.8)}}
  if(V.extra==='poca')for(let i=0;i<9;i++){const x=r()*W,y=r()*H,w=14+r()*20;c.fillStyle='#5aa0c8aa';c.beginPath();c.ellipse(x,y,w,w*.45,0,0,7);c.fill();c.strokeStyle='#4c7a3a';c.lineWidth=1.4;for(let j=0;j<4;j++){c.beginPath();c.moveTo(x-w+j*5,y);c.lineTo(x-w+j*5+2,y-9);c.stroke()}}
  if(V.extra==='cupim'||ESTADOS[M.i][2]==='cerrado')for(let i=0;i<14;i++){c.fillStyle='rgba(181,101,63,.28)';c.beginPath();c.ellipse(r()*W,r()*H,18+r()*40,10+r()*18,r()*3,0,7);c.fill()}
}
/* borda: uma parede de árvores (e pedras) em volta do mapa, aberta onde a avenida passa */
function bordaMapa(c,M,r,V){
  const tipos=V.borda||['copa'],cores=V.cores||['#3f7a32','#4c8a3a'];
  const livre=(x,y)=>!(distPath(x,y)<48||inStage(x,y)||Math.hypot(x-M.lm.x,y-M.lm.y)<60||Math.hypot(x-M.stall.x,y-M.stall.y)<60);
  const itens=[];
  for(let x=-6;x<W+10;x+=17){for(const y of[6+r()*10,H+2-r()*6])if(livre(x,y))itens.push([x+(r()-.5)*6,y,1+r()*.45])}
  for(let y=20;y<H;y+=17){for(const x of[4+r()*8,W-4-r()*8])if(livre(x,y))itens.push([x,y+(r()-.5)*6,1+r()*.45])}
  /* sombra da mata atrás das árvores */
  c.fillStyle='rgba(0,0,0,.18)';for(const[x,y,s]of itens){c.beginPath();c.ellipse(x,y-6*s,14*s,12*s,0,0,7);c.fill()}
  itens.sort((a,b)=>a[1]-b[1]);
  for(const[x,y,s]of itens){const t=tipos[Math.floor(r()*tipos.length)];arvoreTipo(c,t,x,y,s,cores[Math.floor(r()*cores.length)],V)}
  /* fileira de pedras na parte de dentro da borda */
  for(let i=0;i<60;i++){
    const lado=Math.floor(r()*4),u=r();const x=lado<2?u*W:lado===2?26:W-26,y=lado===0?30:lado===1?H-20:u*H;
    if(!livre(x,y))continue;const t=4+r()*5;c.fillStyle='#00000030';c.beginPath();c.ellipse(x+1.5,y+2,t,t*.65,0,0,7);c.fill();
    c.fillStyle=r()<.5?'#9aa0a8':'#b3b8bf';c.beginPath();c.ellipse(x,y,t,t*.65,0,0,7);c.fill();c.fillStyle='#ffffff40';disc(c,x-t*.3,y-t*.25,t*.3);
  }
}
/* bichos e detalhes do bioma, espalhados pelo meio do mapa */
function detalhesBioma(c,M,r,V,livre){
  const n=10;
  for(let i=0;i<60;i++){const x=40+r()*(W-80),y=40+r()*(H-70);if(!livre(x,y))continue;
    if(V.extra==='ovelha'&&i<n){c.fillStyle='#0002';c.beginPath();c.ellipse(x,y+4,9,3,0,0,7);c.fill();c.fillStyle='#f4f1e8';for(const[dx,dy]of[[-4,0],[0,-2],[4,0],[0,1]])disc(c,x+dx,y+dy,4);c.fillStyle='#3a3530';disc(c,x+7,y-1,2.6);c.fillRect(x-4,y+3,1.5,3);c.fillRect(x+3,y+3,1.5,3)}
    else if(V.extra==='cupim'&&i<n){c.fillStyle='#0002';c.beginPath();c.ellipse(x,y+3,8,3,0,0,7);c.fill();c.fillStyle='#b5653f';c.beginPath();c.moveTo(x-7,y+3);c.quadraticCurveTo(x-6,y-14,x,y-16);c.quadraticCurveTo(x+6,y-14,x+7,y+3);c.closePath();c.fill();c.fillStyle='#8a4a2e';disc(c,x-2,y-6,1.4);disc(c,x+2,y-10,1.2)}
    else if(V.extra==='borboleta'&&i<n){c.fillStyle=['#f3c11f','#e2679b','#5aa0c8'][i%3];c.beginPath();c.ellipse(x-2.5,y,3,2,.5,0,7);c.ellipse(x+2.5,y,3,2,-.5,0,7);c.fill();c.fillStyle='#1d1a16';c.fillRect(x-.5,y-2,1,4)}
    else if(V.extra==='samambaia'&&i<n*2){c.strokeStyle='#2f7a3a';c.lineWidth=1.6;for(const a of[-1.1,-.5,0,.5,1.1]){c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+Math.sin(a)*8,y-8,x+Math.sin(a)*12,y-6);c.stroke()}}
    else if(V.extra==='poca'&&i<4){/* tuiuiú */c.fillStyle='#0002';c.beginPath();c.ellipse(x,y+2,6,2,0,0,7);c.fill();c.strokeStyle='#1d1a16';c.lineWidth=1.2;c.beginPath();c.moveTo(x-1,y);c.lineTo(x-1,y-6);c.moveTo(x+1,y);c.lineTo(x+1,y-6);c.stroke();c.fillStyle='#fff';c.beginPath();c.ellipse(x,y-9,5,3.5,0,0,7);c.fill();c.fillStyle='#1d1a16';c.fillRect(x+2,y-17,2,8);c.fillStyle='#c8102e';c.fillRect(x+2,y-11,2,2);c.fillStyle='#1d1a16';c.beginPath();c.moveTo(x+4,y-16);c.lineTo(x+11,y-14);c.lineTo(x+4,y-14);c.fill()}
    else if(V.extra==='neve'&&i<2){/* boneco de neve */c.fillStyle='#0002';c.beginPath();c.ellipse(x,y+3,8,3,0,0,7);c.fill();c.fillStyle='#fff';disc(c,x,y-4,7);disc(c,x,y-14,5);c.fillStyle='#1d1a16';disc(c,x-2,y-15,.9);disc(c,x+2,y-15,.9);c.fillStyle='#ff7a1c';c.beginPath();c.moveTo(x,y-13.5);c.lineTo(x+5,y-13);c.lineTo(x,y-12.5);c.fill();c.fillStyle='#c8102e';c.fillRect(x-5,y-10.5,10,2)}
  }
}
/* ---------- elementos regionais ----------
   Cada estado ganha coisas típicas dele espalhadas pelo mapa (só cenário), além do monumento e da barraca típica.
   Nos estados com lago, alguns ficam na água (vitórias-régias, barcos). */
const REGIONAL={
  /* o 4º item só entra quando um dos três primeiros não cabe (barco sem lago, por exemplo) */
  AC:['seringueira','castanha','barco','acai'],AL:['jangada','coqueiro','renda'],AM:['vitoria','barco','acai','bumba','castanha'],AP:['equador','acai','barco','castanha'],
  BA:['tabuleiro','fitas','berimbau'],CE:['jangada','renda','cajueiro'],DF:['ipeRoxo','pequi','bicicleta'],ES:['panela','coqueiro','congo'],
  GO:['pequi','pamonha','viola'],MA:['bumba','azulejo','coqueiro'],MG:['queijo','fogao','viola'],MS:['chalana','boi','tuiuiuR','capivara'],
  MT:['chalana','boi','pequi','tuiuiuR'],PA:['acai','marajoara','vitoria','barco','castanha'],PB:['sanfona','fitas','cajueiro'],PE:['sombrinha','boneco','sanfona'],
  PI:['cajuina','renda','cajueiro'],PR:['pinhao','capivara','chimarrao'],RJ:['guardasol','sombrinha','pandeiro'],RN:['buggy','jangada','cajueiro'],
  RO:['castanha','seringueira','barco','acai'],RR:['acai','castanha','seringueira'],RS:['chimarrao','espeto','boi'],SC:['barril','pinhao','capivara'],
  SE:['caranguejoR','jangada','renda'],SP:['pandeiro','bicicleta','grafite'],TO:['capim','buggy','pequi'],
};
const NA_AGUA=new Set(['vitoria','barco','chalana','jangada']);
function propRegional(c,t,x,y){
  c.save();c.translate(x,y);
  const sombra=(w)=>{c.fillStyle='#0003';c.beginPath();c.ellipse(0,3,w,w*.35,0,0,7);c.fill()};
  const ink='#1d1a16';
  if(t==='jangada'){c.fillStyle='#8a5a30';for(let i=0;i<5;i++)c.fillRect(-14+i*6,-2,5,8);c.fillStyle=ink;c.fillRect(-1,-28,2,28);c.fillStyle='#f4ead5';c.beginPath();c.moveTo(1,-27);c.lineTo(15,-6);c.lineTo(1,-4);c.closePath();c.fill();c.strokeStyle='#c8102e';c.lineWidth=1.5;c.beginPath();c.moveTo(3,-18);c.lineTo(10,-10);c.stroke()}
  else if(t==='barco'||t==='chalana'){sombra(18);c.fillStyle=ink;c.beginPath();c.moveTo(-20,-4);c.lineTo(20,-4);c.lineTo(14,6);c.lineTo(-14,6);c.closePath();c.fill();c.fillStyle=t==='barco'?'#2f6fd0':'#c8102e';c.beginPath();c.moveTo(-18,-3);c.lineTo(18,-3);c.lineTo(13,5);c.lineTo(-13,5);c.closePath();c.fill();
    c.fillStyle='#f4ead5';c.fillRect(-10,-14,18,10);c.fillStyle=ink;c.fillRect(-11,-16,20,2);c.fillStyle='#5aa0c8';for(const wx of[-7,-1,5])c.fillRect(wx,-11,4,4)}
  else if(t==='vitoria'){for(const[dx,dy,r]of[[0,0,9],[14,4,7],[-12,6,6]]){c.fillStyle='#3f8a3e';c.beginPath();c.arc(dx,dy,r,.3,Math.PI*2-.1);c.lineTo(dx,dy);c.fill();c.strokeStyle='#2f6b2c';c.lineWidth=1.2;c.beginPath();c.arc(dx,dy,r,0,7);c.stroke()}c.fillStyle='#f6c3d5';disc(c,2,-2,3);c.fillStyle='#fff';disc(c,2,-2,1.5)}
  else if(t==='coqueiro'){arvoreTipo(c,'palmeira',0,0,1,'#3f8a3e',{});c.fillStyle='#7a5a36';disc(c,2,-26,2.4);disc(c,5,-25,2.4)}
  else if(t==='seringueira'){arvoreTipo(c,'copa',0,0,1.1,'#2f6b2c',{});c.fillStyle='#f4f1e8';c.fillRect(2,-6,5,5);c.strokeStyle='#f4f1e8';c.lineWidth=1;c.beginPath();c.moveTo(-1,-8);c.lineTo(4,-6);c.stroke()}
  else if(t==='castanha'){sombra(9);c.fillStyle='#6a4326';disc(c,0,-4,7);c.fillStyle='#8a5a30';for(const[dx,dy]of[[-3,-6],[2,-7],[3,-2],[-2,-1]])c.fillRect(dx-1.5,dy-1.5,3,3)}
  else if(t==='acai'){sombra(8);c.fillStyle='#8a5a30';c.beginPath();c.moveTo(-8,-10);c.lineTo(8,-10);c.lineTo(6,2);c.lineTo(-6,2);c.closePath();c.fill();c.fillStyle='#4a1a4a';for(let i=0;i<9;i++)disc(c,-6+(i%5)*3,-12+Math.floor(i/5)*2.5,1.8)}
  else if(t==='equador'){c.strokeStyle='#c8102e';c.lineWidth=3;c.setLineDash([6,4]);c.beginPath();c.moveTo(-26,0);c.lineTo(26,0);c.stroke();c.setLineDash([]);c.fillStyle='#f4ead5';c.fillRect(-2,-16,4,16);c.fillStyle='#f2b705';disc(c,0,-18,4)}
  else if(t==='tabuleiro'){sombra(12);c.fillStyle='#fff';c.beginPath();c.moveTo(0,-30);c.lineTo(15,-18);c.lineTo(-15,-18);c.closePath();c.fill();c.fillStyle=ink;c.fillRect(-.7,-18,1.4,16);c.fillStyle='#8a5a30';c.fillRect(-11,-4,22,4);c.fillStyle='#e8a51c';for(const dx of[-7,-2,3,8])disc(c,dx,-5,2.4)}
  else if(t==='fitas'){c.fillStyle='#8a5a30';c.fillRect(-14,-14,28,3);for(let i=0;i<7;i++){c.strokeStyle=['#c8102e','#f2b705','#2f6fd0','#35a35f','#e2679b','#fff','#9b7fd0'][i];c.lineWidth=2;c.beginPath();c.moveTo(-12+i*4,-12);c.quadraticCurveTo(-11+i*4,-4,-13+i*4,2);c.stroke()}}
  else if(t==='berimbau'){c.strokeStyle='#8a5a30';c.lineWidth=2.4;c.beginPath();c.arc(14,-14,22,2.4,3.9);c.stroke();c.strokeStyle='#ddd';c.lineWidth=.8;c.beginPath();c.moveTo(-1,-1);c.lineTo(-2,-28);c.stroke();c.fillStyle='#c9a46a';disc(c,0,-5,5)}
  else if(t==='renda'){sombra(10);c.fillStyle='#e2679b';c.beginPath();c.ellipse(0,-5,12,7,0,0,7);c.fill();c.strokeStyle='#fff';c.lineWidth=1;for(let i=0;i<6;i++){c.beginPath();c.arc(-6+i*2.4,-7,2,0,7);c.stroke()}c.fillStyle='#8a5a30';for(let i=0;i<5;i++)c.fillRect(-8+i*4,-1,1.5,6)}
  else if(t==='cajueiro'){arvoreTipo(c,'copa',0,0,1,'#4c8a3a',{});c.fillStyle='#e8402a';for(const[dx,dy]of[[-5,-12],[4,-9],[0,-15],[7,-14]])disc(c,dx,dy,2.2);c.fillStyle='#6a4326';for(const[dx,dy]of[[-5,-10],[4,-7]])disc(c,dx,dy,1)}
  else if(t==='ipeRoxo'){arvoreTipo(c,'ipe',0,0,1,'#9b59b6',{ipe:'#9b59b6'})}
  else if(t==='pequi'){arvoreTipo(c,'retorcida',0,0,1,'#6f8a3a',{});c.fillStyle='#d9c22e';for(const[dx,dy]of[[8,-20],[-11,-17],[0,-17]])disc(c,dx,dy,2.4)}
  else if(t==='bicicleta'){c.strokeStyle=ink;c.lineWidth=1.8;for(const dx of[-8,8]){c.beginPath();c.arc(dx,-5,5,0,7);c.stroke()}c.strokeStyle='#c8102e';c.beginPath();c.moveTo(-8,-5);c.lineTo(-2,-12);c.lineTo(6,-12);c.lineTo(8,-5);c.moveTo(-2,-12);c.lineTo(0,-5);c.stroke()}
  else if(t==='panela'){sombra(10);c.fillStyle='#4a3a2e';c.beginPath();c.ellipse(0,-4,12,7,0,0,Math.PI);c.fill();c.fillStyle='#e8a51c';c.beginPath();c.ellipse(0,-4,11,3.5,0,0,7);c.fill();c.fillStyle='#c8402a';disc(c,-3,-4,1.6);disc(c,3,-5,1.6);c.fillStyle='#3f8a3e';disc(c,0,-3,1.2)}
  else if(t==='congo'){sombra(9);c.fillStyle='#8a5a30';rr(c,-6,-18,12,18,2);c.fillStyle='#f4ead5';c.beginPath();c.ellipse(0,-18,6,2.2,0,0,7);c.fill();c.strokeStyle='#c8102e';c.lineWidth=1.5;c.beginPath();c.moveTo(-6,-12);c.lineTo(6,-6);c.moveTo(6,-12);c.lineTo(-6,-6);c.stroke()}
  else if(t==='pamonha'){sombra(10);c.fillStyle='#d9c22e';for(const dx of[-8,0,8]){c.beginPath();c.ellipse(dx,-4,4,7,.2,0,7);c.fill();c.strokeStyle='#8a8a2e';c.lineWidth=1;c.stroke()}}
  else if(t==='viola'){c.fillStyle='#8a5a30';c.beginPath();c.ellipse(0,-6,7,6,0,0,7);c.fill();c.beginPath();c.ellipse(0,-14,5,4.5,0,0,7);c.fill();c.fillStyle=ink;disc(c,0,-8,2);c.fillRect(-1,-30,2,14)}
  else if(t==='bumba'){sombra(12);c.fillStyle='#2f6fd0';c.beginPath();c.ellipse(0,-10,14,9,0,0,7);c.fill();c.fillStyle='#f2b705';for(let i=0;i<6;i++)disc(c,-10+i*4,-10+(i%2)*4,1.6);c.fillStyle='#fff';c.beginPath();c.ellipse(14,-16,5,4,0,0,7);c.fill();c.strokeStyle='#fff';c.lineWidth=1.5;c.beginPath();c.moveTo(16,-20);c.lineTo(20,-25);c.moveTo(12,-20);c.lineTo(10,-25);c.stroke();c.fillStyle='#c8102e';for(let i=0;i<5;i++)c.fillRect(-12+i*6,-2,3,6)}
  else if(t==='azulejo'){for(let i=0;i<3;i++)for(let j=0;j<2;j++){c.fillStyle='#fff';c.fillRect(-12+i*8,-16+j*8,7,7);c.strokeStyle='#2456a6';c.lineWidth=1.2;c.strokeRect(-12+i*8,-16+j*8,7,7);c.beginPath();c.arc(-8.5+i*8,-12.5+j*8,2,0,7);c.stroke()}}
  else if(t==='queijo'){sombra(10);c.fillStyle='#f6e7a8';c.beginPath();c.ellipse(0,-6,11,5,0,0,7);c.fill();c.fillRect(-11,-11,22,5);c.fillStyle='#fff3c4';c.beginPath();c.ellipse(0,-11,11,5,0,0,7);c.fill();c.fillStyle='#e8d48a';c.beginPath();c.moveTo(0,-11);c.lineTo(11,-11);c.lineTo(9,-14);c.closePath();c.fill()}
  else if(t==='fogao'){sombra(12);c.fillStyle='#d8d2c4';rr(c,-14,-14,28,14,2);c.fillStyle=ink;c.fillRect(-10,-8,6,6);c.fillStyle='#ff8a2c';c.fillRect(-9,-6,4,3);c.fillStyle='#3a3530';disc(c,4,-15,4);disc(c,-4,-15,3);c.fillStyle='#8a8f98';c.fillRect(10,-30,4,16);c.fillStyle='#ccc8';disc(c,12,-34,3)}
  else if(t==='boi'){sombra(12);c.fillStyle='#f4f1e8';c.beginPath();c.ellipse(0,-7,11,6,0,0,7);c.fill();c.fillStyle='#3a3530';disc(c,-3,-8,2.5);c.fillStyle='#f4f1e8';disc(c,11,-10,4);c.strokeStyle='#e8dcc0';c.lineWidth=1.5;c.beginPath();c.moveTo(10,-13);c.lineTo(8,-17);c.moveTo(13,-13);c.lineTo(15,-17);c.stroke();c.fillStyle='#3a3530';for(const dx of[-7,-3,4,7])c.fillRect(dx,-2,1.6,5)}
  else if(t==='tuiuiuR'){c.strokeStyle=ink;c.lineWidth=1.2;c.beginPath();c.moveTo(-1,0);c.lineTo(-1,-7);c.moveTo(1,0);c.lineTo(1,-7);c.stroke();c.fillStyle='#fff';c.beginPath();c.ellipse(0,-10,6,4,0,0,7);c.fill();c.fillStyle=ink;c.fillRect(2,-19,2,9);c.fillStyle='#c8102e';c.fillRect(2,-12,2,2);c.fillStyle=ink;c.beginPath();c.moveTo(4,-18);c.lineTo(12,-16);c.lineTo(4,-16);c.fill()}
  else if(t==='marajoara'){sombra(9);c.fillStyle='#e8d4b0';c.beginPath();c.ellipse(0,-8,9,10,0,0,7);c.fill();c.strokeStyle='#8a3a1e';c.lineWidth=1.2;for(let i=0;i<3;i++){c.beginPath();c.moveTo(-8,-12+i*5);c.lineTo(-4,-14+i*5);c.lineTo(0,-12+i*5);c.lineTo(4,-14+i*5);c.lineTo(8,-12+i*5);c.stroke()}}
  else if(t==='sanfona'){sombra(10);c.fillStyle='#c8102e';c.fillRect(-12,-14,6,14);c.fillRect(6,-14,6,14);c.fillStyle='#f4ead5';for(let i=0;i<6;i++)c.fillRect(-6+i*2,-13,1.4,12);c.fillStyle='#fff';for(let i=0;i<3;i++)disc(c,-9,-11+i*4,1)}
  else if(t==='sombrinha'){const cs=['#c8102e','#f2b705','#2456a6','#35a35f'];for(let i=0;i<8;i++){c.fillStyle=cs[i%4];c.beginPath();c.moveTo(0,-14);c.arc(0,-14,11,Math.PI+i*Math.PI/8,Math.PI+(i+1)*Math.PI/8);c.fill()}c.strokeStyle=ink;c.lineWidth=1.4;c.beginPath();c.moveTo(0,-14);c.lineTo(0,0);c.stroke()}
  else if(t==='boneco'){sombra(10);c.fillStyle='#2456a6';c.beginPath();c.moveTo(-10,0);c.lineTo(10,0);c.lineTo(6,-20);c.lineTo(-6,-20);c.closePath();c.fill();c.fillStyle='#e8b48f';disc(c,0,-28,9);c.fillStyle=ink;disc(c,-3,-29,1.3);disc(c,3,-29,1.3);c.fillStyle='#c8102e';c.fillRect(-3,-24,6,1.6);c.fillStyle='#5a3d27';c.beginPath();c.arc(0,-31,9,Math.PI,0);c.fill()}
  else if(t==='cajuina'){sombra(6);c.fillStyle='#e8a51c99';rr(c,-4,-16,8,16,2);c.fillStyle='#e8a51c';c.fillRect(-4,-9,8,9);c.fillStyle=ink;c.fillRect(-2,-20,4,4)}
  else if(t==='pinhao'){sombra(8);c.fillStyle='#6a4326';for(const[dx,dy]of[[-5,-3],[0,-5],[5,-3],[-2,0],[3,0]]){c.beginPath();c.ellipse(dx,dy,2,4,.3,0,7);c.fill()}}
  else if(t==='capivara'){sombra(11);c.fillStyle='#8a6a48';c.beginPath();c.ellipse(0,-6,11,6,0,0,7);c.fill();c.beginPath();c.ellipse(10,-8,5,4,0,0,7);c.fill();c.fillStyle=ink;disc(c,12,-9,1);c.fillStyle='#6a4a30';for(const dx of[-6,-2,3,6])c.fillRect(dx,-1,2,3)}
  else if(t==='chimarrao'){sombra(7);c.fillStyle='#8a5a30';c.beginPath();c.ellipse(0,-6,6,8,0,0,7);c.fill();c.fillStyle='#4c8a3a';c.beginPath();c.ellipse(0,-13,5,2,0,0,7);c.fill();c.strokeStyle='#c9ced6';c.lineWidth=1.6;c.beginPath();c.moveTo(1,-13);c.lineTo(5,-24);c.stroke()}
  else if(t==='espeto'){c.fillStyle='#3a3530';c.fillRect(-12,-2,24,3);c.fillStyle='#ff8a2c';for(let i=0;i<5;i++)disc(c,-9+i*4.5,-2,2);c.strokeStyle='#c9ced6';c.lineWidth=1.4;for(const dx of[-6,4]){c.beginPath();c.moveTo(dx,0);c.lineTo(dx+3,-20);c.stroke()}c.fillStyle='#a62f2a';for(const dx of[-5,5])c.fillRect(dx-1.5,-14,5,7)}
  else if(t==='barril'){sombra(9);c.fillStyle='#8a5a30';c.beginPath();c.ellipse(0,-9,8,10,0,0,7);c.fill();c.fillStyle='#5a3d27';c.fillRect(-8,-14,16,2);c.fillRect(-8,-5,16,2);c.fillStyle='#f2b705';rr(c,10,-14,6,12,1.5);c.fillStyle='#fff';c.fillRect(10,-15,6,3)}
  else if(t==='caranguejoR'){sombra(9);c.fillStyle='#d9653b';c.beginPath();c.ellipse(0,-5,8,5,0,0,7);c.fill();c.strokeStyle='#d9653b';c.lineWidth=1.6;for(const s of[-1,1]){c.beginPath();c.moveTo(s*7,-5);c.lineTo(s*12,-11);c.stroke();for(let i=0;i<3;i++){c.beginPath();c.moveTo(s*5,-3+i*1.5);c.lineTo(s*11,0+i*2);c.stroke()}}c.fillStyle=ink;disc(c,-2,-9,1);disc(c,2,-9,1)}
  else if(t==='guardasol'){c.fillStyle='#f4ead5';c.fillRect(4,-6,12,4);for(let i=0;i<6;i++){c.fillStyle=i%2?'#fff':'#ff7a1c';c.beginPath();c.moveTo(0,-22);c.arc(0,-22,14,Math.PI+i*Math.PI/6,Math.PI+(i+1)*Math.PI/6);c.fill()}c.strokeStyle=ink;c.lineWidth=1.2;c.beginPath();c.moveTo(0,-22);c.lineTo(0,0);c.stroke()}
  else if(t==='pandeiro'){sombra(8);c.fillStyle='#c9a46a';c.beginPath();c.arc(0,-6,9,0,7);c.fill();c.fillStyle='#f4ead5';c.beginPath();c.arc(0,-6,7,0,7);c.fill();c.fillStyle='#c9ced6';for(let i=0;i<6;i++){const a=i*Math.PI/3;disc(c,Math.cos(a)*8,-6+Math.sin(a)*8,1.4)}}
  else if(t==='buggy'){sombra(13);c.fillStyle='#f2b705';rr(c,-13,-10,26,8,3);c.strokeStyle=ink;c.lineWidth=1.5;c.beginPath();c.moveTo(-6,-10);c.lineTo(-2,-18);c.lineTo(6,-18);c.lineTo(8,-10);c.stroke();c.fillStyle=ink;disc(c,-9,-2,4);disc(c,9,-2,4)}
  else if(t==='grafite'){c.fillStyle='#9aa0a8';c.fillRect(-16,-20,32,18);c.fillStyle='#e2679b';c.beginPath();c.ellipse(-6,-12,7,5,.3,0,7);c.fill();c.fillStyle='#35c46b';c.beginPath();c.ellipse(5,-11,6,6,0,0,7);c.fill();c.fillStyle='#f2b705';star(c,9,-15,3);c.strokeStyle=ink;c.lineWidth=1.2;c.strokeRect(-16,-20,32,18)}
  else if(t==='capim'){sombra(9);c.strokeStyle='#e0b23a';c.lineWidth=1.4;for(let i=0;i<9;i++){c.beginPath();c.moveTo(-4+i,0);c.quadraticCurveTo(-6+i*1.5,-10,-10+i*2.4,-16);c.stroke()}c.fillStyle='#c48a2a';c.fillRect(-5,-4,10,3)}
  c.restore();
}
function desenhaRegionais(c,M,r,livre){
  /* barco, chalana e vitória-régia só existem com lago; a jangada, sem lago, fica na areia */
  const cabe=t=>!(NA_AGUA.has(t)&&!M.lake&&t!=='jangada');
  const lista=(REGIONAL[M.uf]||[]).filter(cabe).slice(0,3);if(!lista.length)return;
  const postos=[],casas=M.tema==='sertao'?(M.casasSertao||[]):[];
  for(const t of lista){
    const naAgua=NA_AGUA.has(t)&&M.lake,quantos=t==='vitoria'?3:2;
    for(let q=0;q<quantos;q++)for(let i=0;i<80;i++){
      let x,y;
      if(naAgua){const L=M.lake,a=r()*6.28,k=Math.sqrt(r())*.55;x=L.x+Math.cos(a)*L.rx*k;y=L.y+Math.sin(a)*L.ry*k;if(distPath(x,y)<40)continue}
      else{x=40+r()*(W-80);y=50+r()*(H-80);if(!livre(x,y)||distPath(x,y)<52)continue;
        if(casas.some(k=>Math.abs(k.x-x)<k.w&&y<k.y+20&&y>k.y-k.h-30))continue}
      if(postos.some(p=>Math.hypot(p[0]-x,p[1]-y)<55))continue;
      postos.push([x,y,t]);break;
    }
  }
  postos.sort((a,b)=>a[1]-b[1]);for(const[x,y,t]of postos)propRegional(c,t,x,y);
}
/* ---------- cenários próprios de alguns estados ----------
   SP vira a Avenida Paulista (prédios vistos de cima, ciclovia vermelha, antenas, tipuanas na calçada).
   RS, RR e RO ganham chão próprio (lavouras, lavrado, igarapé, Monte Roraima) e coisas típicas espalhadas.
   Tudo é cenário: dá para pôr personagem por cima, como nas árvores. M.campos guarda o que já ocupa o chão,
   para árvores e enfeites não caírem em cima. */
const longeDaAvenida=(x,y,w,h,f)=>{for(const[px,py]of[[x,y],[x+w,y],[x,y+h],[x+w,y+h],[x+w/2,y+h/2],[x+w/2,y],[x+w/2,y+h],[x,y+h/2],[x+w,y+h/2]])if(distPath(px,py)<f)return false;return true};
const noCampo=(M,x,y,m=6)=>(M.campos||[]).some(f=>x>f.x-m&&x<f.x+f.w+m&&y>f.y-m&&y<f.y+f.h+m);
function lugarLivre(M,w,h,r,f,tentativas){
  for(let i=0;i<(tentativas||60);i++){const x=20+r()*(W-40-w),y=24+r()*(H-44-h);
    if(!longeDaAvenida(x,y,w,h,f))continue;
    if(inLake(x+w/2,y+h/2)||inStage(x+w/2,y+h/2)||Math.hypot(x+w/2-M.lm.x,y+h/2-M.lm.y)<70+w/2||Math.hypot(x+w/2-M.stall.x,y+h/2-M.stall.y)<60+w/2)continue;
    if((M.campos||[]).some(o=>x<o.x+o.w+8&&x+w>o.x-8&&y<o.y+o.h+8&&y+h>o.y-8))continue;
    return{x,y,w,h}}
  return null;
}
/* lavoura vista de cima, com cerca de arame em volta */
function campo(c,t,R,r){
  const{x,y,w,h}=R;c.save();c.beginPath();c.rect(x,y,w,h);c.clip();
  if(t==='arroz'){c.fillStyle='#8fc46a';c.fillRect(x,y,w,h);c.strokeStyle='rgba(90,160,200,.55)';c.lineWidth=2;for(let yy=y+6;yy<y+h;yy+=9){c.beginPath();c.moveTo(x,yy);c.lineTo(x+w,yy);c.stroke()}
    c.strokeStyle='#6f9a4a';c.lineWidth=2.4;for(let k=0;k<3;k++){const yy=y+h*(k+1)/4;c.beginPath();c.moveTo(x,yy);for(let xx=x;xx<=x+w;xx+=12)c.lineTo(xx,yy+Math.sin(xx*.08+k)*5);c.stroke()}}
  else if(t==='soja'){c.fillStyle='#8a6a42';c.fillRect(x,y,w,h);c.strokeStyle='#4f8a2e';c.lineWidth=3.6;for(let xx=x+4;xx<x+w;xx+=7){c.beginPath();c.moveTo(xx,y);c.lineTo(xx,y+h);c.stroke()}c.strokeStyle='#6aa83e';c.lineWidth=1.2;for(let xx=x+4;xx<x+w;xx+=7){c.beginPath();c.moveTo(xx-1,y);c.lineTo(xx-1,y+h);c.stroke()}}
  else if(t==='milho'){c.fillStyle='#9a7a4a';c.fillRect(x,y,w,h);for(let xx=x+4;xx<x+w;xx+=8)for(let yy=y+4;yy<y+h;yy+=6){c.fillStyle='#5f9a3a';c.beginPath();c.ellipse(xx,yy,3.4,2,(xx+yy)%3,0,7);c.fill();if((xx*7+yy)%5<1){c.fillStyle='#f2c12e';disc(c,xx+1,yy-1,1.2)}}}
  else if(t==='trigo'){c.fillStyle='#d9b54a';c.fillRect(x,y,w,h);c.strokeStyle='rgba(255,240,180,.55)';c.lineWidth=1.4;for(let k=-h;k<w;k+=6){c.beginPath();c.moveTo(x+k,y+h);c.lineTo(x+k+h,y);c.stroke()}c.strokeStyle='rgba(150,110,40,.35)';for(let k=-h+3;k<w;k+=11){c.beginPath();c.moveTo(x+k,y+h);c.lineTo(x+k+h,y);c.stroke()}}
  else if(t==='vinhedo'||t==='cafe'){c.fillStyle=t==='cafe'?'#7a4e30':'#9aa860';c.fillRect(x,y,w,h);
    for(let yy=y+5;yy<y+h;yy+=9){c.strokeStyle=t==='cafe'?'#2f5a26':'#3f7a2e';c.lineWidth=5;c.beginPath();c.moveTo(x,yy);c.lineTo(x+w,yy);c.stroke();
      c.fillStyle=t==='cafe'?'#3f7a32':'#4f8a3a';for(let xx=x+3;xx<x+w;xx+=6)disc(c,xx,yy+(xx%2?-1:1),2.6);
      c.fillStyle=t==='cafe'?'#c8102e':'#5a2a5a';for(let xx=x+5;xx<x+w;xx+=t==='cafe'?7:9)disc(c,xx,yy+2.4,1.3);
      if(t==='vinhedo'){c.fillStyle='#6a4326';for(let xx=x+2;xx<x+w;xx+=18)c.fillRect(xx,yy-4,1.6,8)}}}
  else if(t==='pasto'){c.fillStyle='#7fb556';c.fillRect(x,y,w,h);for(let i=0;i<w*h/90;i++){c.strokeStyle=r()<.5?'rgba(0,0,0,.12)':'rgba(255,255,255,.18)';c.lineWidth=1;const px=x+r()*w,py=y+r()*h;c.beginPath();c.moveTo(px,py);c.lineTo(px+1,py-4);c.stroke()}}
  c.restore();
  /* cerca de arame */
  c.strokeStyle='rgba(120,120,120,.8)';c.lineWidth=.8;c.strokeRect(x-3,y-3,w+6,h+6);
  c.fillStyle='#6a4326';for(let xx=x-3;xx<=x+w+3;xx+=11){c.fillRect(xx-1,y-4.5,2,3);c.fillRect(xx-1,y+h+1.5,2,3)}for(let yy=y-3;yy<=y+h+3;yy+=11){c.fillRect(x-4.5,yy-1,3,2);c.fillRect(x+w+1.5,yy-1,3,2)}
}
/* coxilhas: o chão do pampa ondulado, em faixas de luz e sombra */
function coxilhas(c,r,cl,cs){
  for(let i=0;i<9;i++){const x=r()*W,y=r()*H,rx=140+r()*160,ry=60+r()*60;
    for(const[dy,cor]of[[-ry*.35,cl],[ry*.35,cs]]){const g=c.createRadialGradient(x,y+dy,0,x,y+dy,rx);g.addColorStop(0,cor);g.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=g;c.beginPath();c.ellipse(x,y+dy,rx,ry,0,0,7);c.fill()}}
}
/* rio ou igarapé serpenteando de um lado ao outro; devolve pontos da margem */
function igarape(c,r,larg,cor){
  const y0=80+r()*(H-160),y1=80+r()*(H-160),pts=[];const cx1=W*.33,cy1=r()*H,cx2=W*.66,cy2=r()*H;
  for(let t=0;t<=1.0001;t+=.02){const u=1-t;pts.push([u*u*u*-20+3*u*u*t*cx1+3*u*t*t*cx2+t*t*t*(W+20),u*u*u*y0+3*u*u*t*cy1+3*u*t*t*cy2+t*t*t*y1])}
  const linha=(lw,col)=>{c.strokeStyle=col;c.lineWidth=lw;c.lineCap='round';c.lineJoin='round';c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke()};
  linha(larg+10,'#c9b07a');linha(larg,cor);linha(larg*.45,'rgba(255,255,255,.18)');
  c.strokeStyle='rgba(255,255,255,.5)';c.lineWidth=1.2;for(let i=3;i<pts.length;i+=6){const[x,y]=pts[i];c.beginPath();c.moveTo(x-5,y);c.quadraticCurveTo(x,y-2,x+5,y);c.stroke()}
  return pts;
}
/* ---- peças de cada cenário ---- */
function casaEnxaimel(c,x,y){c.fillStyle='#0003';c.fillRect(x-17,y-2,38,6);c.fillStyle='#f4efe4';c.fillRect(x-17,y-22,34,22);
  c.strokeStyle='#4a2f1e';c.lineWidth=2;c.strokeRect(x-17,y-22,34,22);c.beginPath();c.moveTo(x-17,y-11);c.lineTo(x+17,y-11);c.moveTo(x-17,y-22);c.lineTo(x-6,y-11);c.moveTo(x-6,y-22);c.lineTo(x-17,y-11);c.moveTo(x+6,y-22);c.lineTo(x+17,y-11);c.moveTo(x+17,y-22);c.lineTo(x+6,y-11);c.moveTo(x,y-22);c.lineTo(x,y);c.stroke();
  c.fillStyle='#8a2a22';c.beginPath();c.moveTo(x-21,y-21);c.lineTo(x,y-44);c.lineTo(x+21,y-21);c.closePath();c.fill();c.fillStyle='#6a1e18';c.fillRect(x-21,y-23,42,3);
  c.fillStyle='#5aa0c8';c.fillRect(x-12,y-8,6,6);c.fillRect(x+6,y-8,6,6);c.fillStyle='#e2679b';c.fillRect(x-13,y-2,8,2);c.fillRect(x+5,y-2,8,2)}
function galpao(c,x,y){c.fillStyle='#0003';c.fillRect(x-26,y-2,56,6);c.fillStyle='#b5653f';c.fillRect(x-26,y-18,52,18);c.strokeStyle='#8a4a2e';c.lineWidth=1;for(let xx=x-24;xx<x+26;xx+=4){c.beginPath();c.moveTo(xx,y-18);c.lineTo(xx,y);c.stroke()}
  c.fillStyle='#3a3530';c.fillRect(x-7,y-13,14,13);c.fillStyle='#7a2a1e';c.beginPath();c.moveTo(x-30,y-17);c.lineTo(x,y-34);c.lineTo(x+30,y-17);c.closePath();c.fill()}
function gauchoCavalo(c,x,y,cor){c.fillStyle='#0003';c.beginPath();c.ellipse(x,y+3,15,4,0,0,7);c.fill();c.fillStyle='#6a4326';
  for(const dx of[-9,-5,6,10])c.fillRect(x+dx,y-6,2.2,9);c.beginPath();c.ellipse(x,y-9,13,6,0,0,7);c.fill();c.beginPath();c.moveTo(x+9,y-12);c.lineTo(x+16,y-22);c.lineTo(x+20,y-20);c.lineTo(x+13,y-9);c.closePath();c.fill();
  c.fillStyle='#3a2a1e';c.beginPath();c.moveTo(x+14,y-22);c.lineTo(x+9,y-12);c.lineTo(x+7,y-13);c.lineTo(x+12,y-23);c.fill();c.fillRect(x-15,y-11,3,8);
  c.fillStyle=cor;c.beginPath();c.moveTo(x-6,y-12);c.lineTo(x+6,y-12);c.lineTo(x+2,y-26);c.lineTo(x-2,y-26);c.closePath();c.fill();c.fillStyle='#e8b48f';disc(c,x,y-29,3);
  c.fillStyle='#1d1a16';c.beginPath();c.ellipse(x,y-31,7,1.8,0,0,7);c.fill();c.fillRect(x-3,y-35,6,4);c.fillStyle='#fff';c.fillRect(x-2,y-26,4,2)}
function bandeiraFarrapos(c,x,y){c.fillStyle='#0003';c.beginPath();c.ellipse(x,y+2,6,2,0,0,7);c.fill();c.fillStyle='#d8d2c4';c.fillRect(x-1,y-44,2,46);
  c.save();c.beginPath();c.rect(x+1,y-43,26,17);c.clip();c.fillStyle='#2e8b3e';c.fillRect(x+1,y-43,26,17);c.fillStyle='#f2c12e';c.beginPath();c.moveTo(x+27,y-43);c.lineTo(x+27,y-26);c.lineTo(x+10,y-26);c.closePath();c.fill();
  c.strokeStyle='#c8102e';c.lineWidth=6;c.beginPath();c.moveTo(x+1,y-26);c.lineTo(x+27,y-43);c.stroke();c.restore()}
function fogoDeChao(c,x,y){c.fillStyle='#0003';c.beginPath();c.ellipse(x,y+2,16,5,0,0,7);c.fill();c.fillStyle='#4a3a2e';c.beginPath();c.ellipse(x,y,12,4.5,0,0,7);c.fill();
  c.fillStyle='#ff8a2c';c.beginPath();c.moveTo(x-6,y);c.quadraticCurveTo(x-3,y-14,x,y-6);c.quadraticCurveTo(x+3,y-16,x+6,y);c.closePath();c.fill();c.fillStyle='#ffd23f';c.beginPath();c.moveTo(x-3,y);c.quadraticCurveTo(x,y-9,x+3,y);c.fill();
  c.strokeStyle='#9aa0a8';c.lineWidth=1.4;for(const[a,b]of[[-14,-20],[14,-20],[-2,-24]]){c.beginPath();c.moveTo(x+a*.6,y+3);c.lineTo(x+a,y+b);c.stroke();c.fillStyle='#a62f2a';c.fillRect(x+a*.8-2,y+b*.75,4,6)}}
function ovelhas(c,x,y,r){for(let i=0;i<6;i++){const sx=x+(r()-.5)*40,sy=y+(r()-.5)*22;c.fillStyle='#0002';c.beginPath();c.ellipse(sx,sy+4,8,2.6,0,0,7);c.fill();c.fillStyle='#f4f1e8';for(const[dx,dy]of[[-3,0],[0,-2],[3,0],[0,1]])disc(c,sx+dx,sy+dy,3.4);c.fillStyle='#3a3530';disc(c,sx+6,sy-1,2.2)}}
function nelore(c,x,y,r){for(let i=0;i<5;i++){const sx=x+(r()-.5)*50,sy=y+(r()-.5)*26,f=r()<.5?1:-1;c.fillStyle='#0002';c.beginPath();c.ellipse(sx,sy+4,11,3,0,0,7);c.fill();c.fillStyle='#ece6da';c.beginPath();c.ellipse(sx,sy-3,9,5,0,0,7);c.fill();c.fillStyle='#d8d0c0';disc(c,sx-2*f,sy-8,3);disc(c,sx+9*f,sy-5,3.4);c.fillStyle='#3a3530';disc(c,sx+11*f,sy-5,1);c.fillStyle='#8a8070';for(const dx of[-6,-3,3,6])c.fillRect(sx+dx,sy,1.4,4)}}
function umbu(c,x,y){c.fillStyle='#0003';c.beginPath();c.ellipse(x,y+4,26,7,0,0,7);c.fill();c.fillStyle='#5a3d27';c.fillRect(x-4,y-14,8,18);c.fillStyle='#2f5a26';disc(c,x,y-24,18);disc(c,x-15,y-16,12);disc(c,x+15,y-16,12);c.fillStyle='#3f7a32';disc(c,x-5,y-28,10);disc(c,x+8,y-22,9);c.fillStyle='#ffffff18';disc(c,x-8,y-32,6)}
function monteRoraima(c,R){const{x,y,w,h}=R;
  c.fillStyle='#2f5a26';c.beginPath();c.moveTo(x,y+h);c.lineTo(x+w*.12,y+h*.55);c.lineTo(x+w*.88,y+h*.55);c.lineTo(x+w,y+h);c.closePath();c.fill();
  for(let i=0;i<14;i++){c.fillStyle=i%2?'#3f7a32':'#2a4f22';disc(c,x+w*.08+i*w*.065,y+h*.85,7)}
  const g=c.createLinearGradient(x,y,x,y+h*.6);g.addColorStop(0,'#9a6a50');g.addColorStop(1,'#6a4636');c.fillStyle=g;c.beginPath();c.moveTo(x+w*.14,y+h*.6);c.lineTo(x+w*.18,y+h*.16);c.lineTo(x+w*.82,y+h*.16);c.lineTo(x+w*.86,y+h*.6);c.closePath();c.fill();
  c.strokeStyle='rgba(40,20,10,.35)';c.lineWidth=2;for(let xx=x+w*.2;xx<x+w*.8;xx+=7){c.beginPath();c.moveTo(xx,y+h*.18);c.lineTo(xx+(xx%3)-1,y+h*.58);c.stroke()}
  c.fillStyle='#5f7a4a';c.beginPath();c.ellipse(x+w/2,y+h*.16,w*.33,h*.07,0,0,7);c.fill();c.fillStyle='#7a9a5a';for(let i=0;i<6;i++)disc(c,x+w*.25+i*w*.1,y+h*.15,3);
  c.strokeStyle='rgba(255,255,255,.85)';c.lineWidth=1.6;for(const fx of[.4,.63]){c.beginPath();c.moveTo(x+w*fx,y+h*.18);c.lineTo(x+w*fx+1,y+h*.58);c.stroke()}
  c.fillStyle='rgba(255,255,255,.75)';for(const[fx,fy,s]of[[.22,.1,14],[.35,.06,18],[.7,.08,16],[.82,.12,12]]){c.beginPath();c.ellipse(x+w*fx,y+h*fy,s,s*.4,0,0,7);c.fill()}}
function maloca(c,x,y){c.fillStyle='rgba(176,138,90,.55)';c.beginPath();c.ellipse(x,y,36,22,0,0,7);c.fill();c.fillStyle='#0003';c.beginPath();c.ellipse(x+2,y+4,25,9,0,0,7);c.fill();
  const g=c.createRadialGradient(x-4,y-10,2,x,y-6,26);g.addColorStop(0,'#e0bf72');g.addColorStop(1,'#a8823a');c.fillStyle=g;c.beginPath();c.ellipse(x,y-6,24,18,0,0,7);c.fill();
  c.strokeStyle='#8a6a2e';c.lineWidth=1;for(let a=0;a<6.28;a+=.35){c.beginPath();c.moveTo(x+Math.cos(a)*6,y-8+Math.sin(a)*5);c.lineTo(x+Math.cos(a)*23,y-6+Math.sin(a)*17);c.stroke()}
  c.fillStyle='#3a2a1e';disc(c,x,y-9,3);c.fillStyle='#3a2a1e';c.fillRect(x-3,y+6,6,6)}
function buriti(c,x,y,s){c.fillStyle='#0003';c.beginPath();c.ellipse(x,y+3,10*s,3*s,0,0,7);c.fill();c.strokeStyle='#8a7a5a';c.lineWidth=3*s;c.beginPath();c.moveTo(x,y+3);c.lineTo(x,y-30*s);c.stroke();
  c.fillStyle='#3f7a32';for(let a=-2.9;a<=-.2;a+=.36){c.save();c.translate(x,y-30*s);c.rotate(a);c.beginPath();c.moveTo(0,0);c.lineTo(15*s,-4*s);c.lineTo(16*s,3*s);c.closePath();c.fill();c.restore()}
  c.fillStyle='#a0522d';disc(c,x-2*s,y-27*s,2*s);disc(c,x+2*s,y-27*s,2*s)}
function cavaloLavradeiro(c,x,y,cor){c.fillStyle='#0002';c.beginPath();c.ellipse(x,y+3,11,3,0,0,7);c.fill();c.fillStyle=cor;for(const dx of[-7,-4,4,7])c.fillRect(x+dx,y-4,1.8,7);c.beginPath();c.ellipse(x,y-6,9,4.5,0,0,7);c.fill();c.beginPath();c.moveTo(x+6,y-8);c.lineTo(x+11,y-16);c.lineTo(x+14,y-14);c.lineTo(x+9,y-6);c.fill();c.fillStyle='#2a1e14';c.fillRect(x-11,y-8,2,6)}
function arara(c,x,y){c.fillStyle='#2456a6';c.beginPath();c.ellipse(x,y,3,5,.3,0,7);c.fill();c.fillStyle='#f2c12e';c.beginPath();c.ellipse(x+1,y+1,1.6,3.4,.3,0,7);c.fill();c.strokeStyle='#2456a6';c.lineWidth=1.4;c.beginPath();c.moveTo(x-1,y+4);c.lineTo(x-4,y+11);c.stroke();c.fillStyle='#fff';disc(c,x+1,y-4,1.3);c.fillStyle='#1d1a16';c.fillRect(x+2,y-4,2,1.4)}
function cacaueiro(c,x,y){arvoreTipo(c,'copa',x,y,.8,'#2f6b2c',{});c.fillStyle='#e8a51c';for(const[dx,dy]of[[-2,-2],[2,-4],[0,0]]){c.beginPath();c.ellipse(x+dx,y+dy,1.6,3,0,0,7);c.fill()}c.fillStyle='#a8401e';c.beginPath();c.ellipse(x+3,y-1,1.6,3,0,0,7);c.fill()}
function mariaFumaca(c,x,y){c.fillStyle='#0003';c.fillRect(x-34,y+2,70,5);c.fillStyle='#6a4a2a';for(let k=-36;k<=36;k+=6)c.fillRect(x+k,y+2,3,4);c.fillStyle='#9aa0a8';c.fillRect(x-38,y+3,76,1.5);
  c.fillStyle='#2a2a2e';rr(c,x-20,y-14,26,12,3);c.fillRect(x+4,y-20,12,18);c.fillStyle='#c8102e';c.fillRect(x-20,y-6,36,3);c.fillStyle='#2a2a2e';c.fillRect(x-14,y-22,5,9);
  c.fillStyle='#1d1a16';for(const dx of[-14,-4,10])disc(c,x+dx,y,4);c.fillStyle='#c9a46a';c.fillRect(x+6,y-17,8,5);c.fillStyle='#ccc9';for(const[dx,dy,s]of[[-12,-28,4],[-9,-34,5],[-4,-40,6]])disc(c,x+dx,y+dy,s);
  c.fillStyle='#7a4a2a';rr(c,x+20,y-12,16,10,2);c.fillStyle='#1d1a16';disc(c,x+24,y,3);disc(c,x+32,y,3)}
function caixasPVH(c,x,y){c.fillStyle='#0003';c.beginPath();c.ellipse(x,y+3,28,6,0,0,7);c.fill();for(const[dx,h]of[[-16,44],[0,52],[16,40]]){c.fillStyle='#d8d2c4';c.fillRect(x+dx-2,y-h+12,4,h-12);c.fillStyle='#8a8f98';c.fillRect(x+dx-1,y-h+12,1,h-12);c.fillStyle='#e8e4da';c.beginPath();c.ellipse(x+dx,y-h+8,8,9,0,0,7);c.fill();c.fillStyle='#c9c2b0';c.beginPath();c.ellipse(x+dx,y-h+4,8,3,0,0,7);c.fill()}}
function telegrafo(c,pts){c.strokeStyle='rgba(40,30,20,.6)';c.lineWidth=.8;c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y-22):c.moveTo(x,y-22));c.stroke();for(const[x,y]of pts){c.fillStyle='#0002';c.fillRect(x,y,6,2);c.fillStyle='#6a4326';c.fillRect(x-1.2,y-24,2.4,25);c.fillRect(x-5,y-23,10,2)}}
function carreta(c,x,y,cor){c.fillStyle='#0003';c.fillRect(x-30,y,62,5);c.fillStyle=cor;rr(c,x+16,y-14,14,13,2);c.fillStyle='#9ad0e8';c.fillRect(x+24,y-12,5,5);c.fillStyle='#d9c22e';c.fillRect(x-30,y-12,44,10);c.fillStyle='#e8d45a';for(let k=-28;k<12;k+=5)disc(c,x+k,y-12,2.6);c.fillStyle='#1d1a16';for(const dx of[-24,-16,4,24])disc(c,x+dx,y,3.4)}
/* ---- Avenida Paulista ---- */
const CORES_PREDIO=['#8d949c','#a9b0b8','#c9c2b0','#7d8a96','#5e7a94','#b8a58a','#6f8faa','#d8d2c4'];
function predioTopo(c,x,y,w,h,r){
  const cor=CORES_PREDIO[Math.floor(r()*CORES_PREDIO.length)],vidro=r()<.35;
  c.fillStyle='rgba(0,0,0,.35)';c.fillRect(x+5,y+5,w,h);
  c.fillStyle=cor;c.fillRect(x,y,w,h);
  if(vidro){c.save();c.beginPath();c.rect(x,y,w,h);c.clip();c.strokeStyle='rgba(255,255,255,.22)';c.lineWidth=5;for(let k=-h;k<w;k+=16){c.beginPath();c.moveTo(x+k,y+h);c.lineTo(x+k+h,y);c.stroke()}c.restore();
    c.strokeStyle='rgba(20,40,60,.35)';c.lineWidth=1;for(let xx=x+6;xx<x+w;xx+=6){c.beginPath();c.moveTo(xx,y);c.lineTo(xx,y+h);c.stroke()}}
  else{c.fillStyle='rgba(0,0,0,.12)';c.fillRect(x+3,y+3,w-6,h-6);c.fillStyle=cor;c.fillRect(x+4,y+4,w-8,h-8)}
  c.strokeStyle='rgba(0,0,0,.45)';c.lineWidth=1;c.strokeRect(x+.5,y+.5,w-1,h-1);
  if(!vidro){
    const t=r();
    if(t<.22&&w>46&&h>46){const cx=x+w/2,cy=y+h/2,R=Math.min(w,h)*.34;c.fillStyle='#3a3d42';disc(c,cx,cy,R);c.strokeStyle='#f2c12e';c.lineWidth=2;c.beginPath();c.arc(cx,cy,R-3,0,7);c.stroke();c.fillStyle='#fff';c.fillRect(cx-R*.45,cy-1.5,R*.9,3);c.fillRect(cx-1.5,cy-R*.45,3,R*.9)}
    else if(t<.4&&w>34&&h>26){c.fillStyle='#3f8a3e';c.fillRect(x+6,y+6,w-12,h-12);c.fillStyle='#5aa04a';for(let i=0;i<6;i++)disc(c,x+8+r()*(w-16),y+8+r()*(h-16),3+r()*2);if(r()<.5){c.fillStyle='#5ec8e8';c.fillRect(x+w/2-6,y+h/2-4,12,8)}}
    else{for(let i=0;i<Math.min(5,Math.floor(w*h/300));i++){const ax=x+5+r()*(w-16),ay=y+5+r()*(h-14);c.fillStyle='#d8dce2';c.fillRect(ax,ay,9,7);c.fillStyle='#8a8f98';disc(c,ax+4.5,ay+3.5,2.4)}
      if(r()<.5){c.fillStyle='#5a6470';c.fillRect(x+w-16,y+5,10,8)}}
  }
  /* mastro com luz vermelha */
  if(r()<.3){const mx=x+4+r()*(w-8),my=y+4+r()*(h-8);c.strokeStyle='rgba(0,0,0,.3)';c.lineWidth=1.5;c.beginPath();c.moveTo(mx,my);c.lineTo(mx+12,my+8);c.stroke();c.strokeStyle='#e8e8e8';c.lineWidth=1.4;c.beginPath();c.moveTo(mx,my);c.lineTo(mx,my-10);c.stroke();c.fillStyle='#ff3b3b';disc(c,mx,my-11,1.8)}
}
function desenhaPaulistaChao(c,M,r,mini){
  c.fillStyle='#8f8c86';c.fillRect(0,0,W,H);
  /* ruas transversais e calçadas, numa grade levemente torta; prédios dentro de cada quadra */
  const xs=[-20];while(xs[xs.length-1]<W)xs.push(xs[xs.length-1]+120+r()*60);
  const ys=[-20];while(ys[ys.length-1]<H)ys.push(ys[ys.length-1]+95+r()*45);
  c.fillStyle='#55555c';for(const x of xs)c.fillRect(x-7,0,14,H);for(const y of ys)c.fillRect(0,y-7,W,14);
  c.strokeStyle='rgba(255,255,255,.5)';c.lineWidth=1;c.setLineDash([6,8]);for(const x of xs){c.beginPath();c.moveTo(x,0);c.lineTo(x,H);c.stroke()}for(const y of ys){c.beginPath();c.moveTo(0,y);c.lineTo(W,y);c.stroke()}c.setLineDash([]);
  for(let i=0;i<xs.length-1;i++)for(let j=0;j<ys.length-1;j++){
    const bx=xs[i]+10,by=ys[j]+10,bw=xs[i+1]-xs[i]-20,bh=ys[j+1]-ys[j]-20;
    c.fillStyle='#bdb8ae';c.fillRect(bx-3,by-3,bw+6,bh+6);
    /* cada quadra vira 1 a 4 prédios */
    const partes=[];const corta=(x,y,w,h,n)=>{if(n<=0||(w<70&&h<60)){partes.push([x,y,w,h]);return}if(w>h){const s=w*(.35+r()*.3);corta(x,y,s-3,h,n-1);corta(x+s+3,y,w-s-3,h,n-1)}else{const s=h*(.35+r()*.3);corta(x,y,w,s-3,n-1);corta(x,y+s+3,w,h-s-3,n-1)}};
    corta(bx,by,bw,bh,1+Math.floor(r()*2));
    for(const[x,y,w,h]of partes){if(w<16||h<16)continue;
      if(!longeDaAvenida(x,y,w,h,30)){/* onde a avenida corta a quadra fica uma praça de concreto com canteiros */
        if(!mini){c.fillStyle='#a9a49a';c.fillRect(x,y,w,h);c.fillStyle='#6f9a4a';for(let k=0;k<3;k++){const px=x+r()*w,py=y+r()*h;if(distPath(px,py)>32){c.beginPath();c.ellipse(px,py,6,4,0,0,7);c.fill()}}}continue}
      predioTopo(c,x,y,w,h,r)}
  }
}
/* por cima do asfalto: ciclovia vermelha no canteiro central, faixas de pedestre e bicicletas pintadas */
function desenhaCiclovia(c){
  for(const P of [PATH,PATH2,PATH3].filter(Boolean)){
    c.lineJoin='round';c.lineCap='round';c.setLineDash([]);
    c.strokeStyle='#e8e4da';c.lineWidth=10;c.beginPath();P.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();
    c.strokeStyle='#b8202a';c.lineWidth=7;c.stroke();
    c.strokeStyle='rgba(255,255,255,.7)';c.lineWidth=1;c.setLineDash([4,6]);c.stroke();c.setLineDash([]);
  }
  for(const v of VIAS())for(let d=140;d<LEN-60;d+=230){const p=posAt(d,v);if(p.x<0||p.x>W||p.y<0||p.y>H)continue;
    c.save();c.translate(p.x,p.y);c.rotate(Math.atan2(p.dy,p.dx));c.fillStyle='rgba(255,255,255,.85)';for(let k=-20;k<=16;k+=6)if(Math.abs(k+1.5)>5)c.fillRect(-6,k,12,3.2);c.restore()}
  for(const v of VIAS())for(let d=255;d<LEN-60;d+=230){const p=posAt(d,v);if(p.x<0||p.x>W||p.y<0||p.y>H)continue;c.strokeStyle='rgba(255,255,255,.9)';c.lineWidth=1;for(const dx of[-3,3]){c.beginPath();c.arc(p.x+dx,p.y,2.2,0,7);c.stroke()}}
}
function torreTV(c,x,y,h){c.fillStyle='rgba(0,0,0,.25)';c.beginPath();c.moveTo(x-6,y);c.lineTo(x+h*.45,y+h*.18);c.lineTo(x+h*.45+3,y+h*.18-3);c.lineTo(x+6,y-2);c.fill();
  for(let i=0;i<8;i++){const y0=y-i*h/8,y1=y-(i+1)*h/8,w0=7-i*.7,w1=7-(i+1)*.7;c.fillStyle=i%2?'#f4f1e8':'#d8302a';c.beginPath();c.moveTo(x-w0,y0);c.lineTo(x-w1,y1);c.lineTo(x+w1,y1);c.lineTo(x+w0,y0);c.closePath();c.fill();
    c.strokeStyle='rgba(0,0,0,.35)';c.lineWidth=.6;c.beginPath();c.moveTo(x-w0,y0);c.lineTo(x+w1,y1);c.moveTo(x+w0,y0);c.lineTo(x-w1,y1);c.stroke()}
  c.fillStyle='#d8302a';c.fillRect(x-.8,y-h-12,1.6,12);c.fillStyle='#ff5a4a';disc(c,x,y-h-13,2.2)}
function desenhaPaulistaDecor(c,M,r){
  /* tipuanas e postes nas calçadas dos dois lados da avenida */
  const pos=[];
  for(const v of VIAS())for(let d=40;d<LEN;d+=46){const p=posAt(d,v);for(const s of[-1,1]){const x=p.x-p.dy*s*37,y=p.y+p.dx*s*37;
    if(x<6||x>W-6||y<10||y>H-4||distPath(x,y)<33||inLake(x,y)||inStage(x,y)||Math.hypot(x-M.lm.x,y-M.lm.y)<58||Math.hypot(x-M.stall.x,y-M.stall.y)<50)continue;
    if(pos.some(q=>Math.hypot(q[0]-x,q[1]-y)<26))continue;pos.push([x,y,(d/46|0)%3===0])}}
  pos.sort((a,b)=>a[1]-b[1]);
  for(const[x,y,poste]of pos){if(poste){c.fillStyle='#0003';c.fillRect(x,y,8,2);c.fillStyle='#4a4f58';c.fillRect(x-1,y-26,2,27);c.fillStyle='#fff6c8';disc(c,x,y-27,3)}
    else{c.fillStyle='#0003';c.beginPath();c.ellipse(x+3,y+3,11,5,0,0,7);c.fill();c.fillStyle='#3f7a32';disc(c,x,y-6,10);c.fillStyle='#5a9a42';disc(c,x-3,y-9,6);c.fillStyle='#f2c12e';for(let i=0;i<3;i++)disc(c,x-5+i*5,y-6+(i%2)*3,1.3)}}
  /* antenas de TV no alto dos prédios */
  let n=0;for(let i=0;i<80&&n<3;i++){const x=40+r()*(W-80),y=90+r()*(H-120);if(distPath(x,y)<60||inStage(x,y)||Math.hypot(x-M.lm.x,y-M.lm.y)<90||Math.hypot(x-M.stall.x,y-M.stall.y)<70)continue;torreTV(c,x,y,62+r()*20);n++}
}
/* pampa gaúcho */
function rsChao(c,M,r){
  coxilhas(c,r,'rgba(255,255,230,.22)','rgba(30,60,20,.16)');
  /* sanga com taquaral */
  M.rio=igarape(c,r,7,'#4f8fb0');
  for(const t of['arroz','soja','vinhedo','trigo','pasto']){const R=lugarLivre(M,90+r()*50,56+r()*30,r,62);if(R){campo(c,t,R,r);M.campos.push(R)}}
}
function rsDecor(c,M,r,livre){
  const est=lugarLivre(M,100,50,r,50);if(est){casaEnxaimel(c,est.x+24,est.y+46);galpao(c,est.x+72,est.y+46);M.campos.push(est)}
  const itens=[];const poe=(n,f,dist)=>{for(let k=0;k<n;k++)for(let i=0;i<60;i++){const x=40+r()*(W-80),y=50+r()*(H-80);if(!livre(x,y)||noCampo(M,x,y)||distPath(x,y)<(dist||50))continue;if(itens.some(o=>Math.hypot(o.x-x,o.y-y)<60))continue;itens.push({x,y,f});break}};
  poe(2,(x,y)=>gauchoCavalo(c,x,y,r()<.5?'#a62f2a':'#c9a46a'));poe(2,(x,y)=>ovelhas(c,x,y,r));poe(1,(x,y)=>bandeiraFarrapos(c,x,y));poe(1,(x,y)=>fogoDeChao(c,x,y));poe(2,(x,y)=>umbu(c,x,y),60);
  poe(3,(x,y)=>arvoreTipo(c,'araucaria',x,y,.9,'#2f5a26',{}));
  itens.sort((a,b)=>a.y-b.y);for(const o of itens)o.f(o.x,o.y);
}
/* lavrado de Roraima, igarapé com buritis, Monte Roraima e maloca */
function rrChao(c,M,r){
  for(let i=0;i<70;i++){c.fillStyle=['rgba(214,190,110,.4)','rgba(190,170,90,.35)','rgba(230,210,140,.3)'][i%3];c.beginPath();c.ellipse(r()*W,r()*H,30+r()*80,14+r()*30,r()*3,0,7);c.fill()}
  c.strokeStyle='rgba(200,160,60,.55)';c.lineWidth=1.1;for(let i=0;i<500;i++){const x=r()*W,y=r()*H;c.beginPath();for(const a of[-.5,0,.5]){c.moveTo(x,y);c.lineTo(x+Math.sin(a)*4,y-6)}c.stroke()}
  M.rio=igarape(c,r,9,'#3f8fb5');
  /* Monte Roraima: o tepui no alto do mapa (ou embaixo, se a avenida ocupar o topo) */
  let R=null;for(let i=0;i<80&&!R;i++){const w=i<50?250:200,h=i<50?120:96,x=20+r()*(W-40-w),y=i<40?6:H-h-6;if(longeDaAvenida(x,y,w,h,40)&&!inStage(x+w/2,y+h/2)&&Math.hypot(x+w/2-M.lm.x,y+h/2-M.lm.y)>140&&Math.hypot(x+w/2-M.stall.x,y+h/2-M.stall.y)>120)R={x,y,w,h}}
  if(R){monteRoraima(c,R);M.campos.push(R)}
  const roca=lugarLivre(M,70,40,r,60);if(roca){campo(c,'milho',roca,r);M.campos.push(roca)}
}
function rrDecor(c,M,r,livre){
  const itens=[];
  for(let i=2;i<(M.rio||[]).length;i+=3){const[x0,y0]=M.rio[i];for(const s of[-1,1]){const x=x0+s*(14+r()*8),y=y0+(r()-.5)*10;if(!livre(x,y)||noCampo(M,x,y)||distPath(x,y)<46)continue;itens.push({x,y,f:()=>{buriti(c,x,y,.9+r()*.3);if(r()<.15)arara(c,x+6,y-30)}})}}
  const mal=lugarLivre(M,80,52,r,56);if(mal){itens.push({x:mal.x+40,y:mal.y+30,f:()=>maloca(c,mal.x+40,mal.y+30)});M.campos.push(mal)}
  for(let k=0;k<5;k++)for(let i=0;i<40;i++){const x=40+r()*(W-80),y=60+r()*(H-90);if(!livre(x,y)||noCampo(M,x,y)||distPath(x,y)<50)continue;const cor=['#8a5a30','#f4f1e8','#4a3a2e'][k%3];itens.push({x,y,f:()=>cavaloLavradeiro(c,x,y,cor)});break}
  itens.sort((a,b)=>a.y-b.y);for(const o of itens)o.f();
}
/* Rondônia: cafezal, cacau, soja e milho, nelore no pasto, BR-364 com carretas, Madeira-Mamoré, as três caixas d'água e o telégrafo de Rondon */
function roChao(c,M,r){
  M.rio=igarape(c,r,14,'#7f9a96');
  for(const t of['cafe','soja','milho','pasto','cafe']){const R=lugarLivre(M,90+r()*40,54+r()*26,r,62);if(R){campo(c,t,R,r);M.campos.push(R)}}
  /* estrada de terra vermelha cortando o mapa (a BR-364 de antigamente) */
  const y0=60+r()*(H-120),y1=60+r()*(H-120);c.strokeStyle='#b5653f';c.lineWidth=16;c.lineCap='round';c.beginPath();c.moveTo(-10,y0);c.bezierCurveTo(W*.35,y0+(r()-.5)*200,W*.65,y1+(r()-.5)*200,W+10,y1);c.stroke();
  c.strokeStyle='rgba(255,255,255,.15)';c.lineWidth=1;c.setLineDash([5,7]);c.stroke();c.setLineDash([]);
  M.estrada=[];for(let t=.1;t<.95;t+=.2)M.estrada.push(t);M.estradaY=[y0,y1];
}
function roDecor(c,M,r,livre){
  const itens=[];const poe=(n,f,dist,sep)=>{for(let k=0;k<n;k++)for(let i=0;i<60;i++){const x=40+r()*(W-80),y=50+r()*(H-80);if(!livre(x,y)||noCampo(M,x,y)||distPath(x,y)<(dist||50))continue;if(itens.some(o=>Math.hypot(o.x-x,o.y-y)<(sep||60)))continue;itens.push({x,y,f});break}};
  poe(2,(x,y)=>nelore(c,x,y,r),56,80);poe(1,(x,y)=>mariaFumaca(c,x,y),60,90);poe(1,(x,y)=>caixasPVH(c,x,y),56,90);poe(2,(x,y)=>carreta(c,x,y,r()<.5?'#c8102e':'#2456a6'),52,70);
  poe(4,(x,y)=>cacaueiro(c,x,y),46,40);
  itens.sort((a,b)=>a.y-b.y);for(const o of itens)o.f(o.x,o.y);
  /* postes do telégrafo de Rondon numa linha reta atravessando o mapa */
  const y=80+r()*(H-160),pts=[];for(let x=30;x<W-20;x+=58){const yy=y+(x/W)*40;if(distPath(x,yy)>34&&!noCampo(M,x,yy,2)&&!inStage(x,yy)&&Math.hypot(x-M.lm.x,yy-M.lm.y)>50)pts.push([x,yy])}
  if(pts.length>3)telegrafo(c,pts);
}
/* ---- peças do Pará, Mato Grosso, Mato Grosso do Sul e Goiás ---- */
function acaizeiro(c,x,y){c.fillStyle='#0003';c.beginPath();c.ellipse(x,y+3,12,3.5,0,0,7);c.fill();
  for(const[dx,h,inc]of[[-4,34,-.12],[1,40,.04],[5,30,.16]]){const tx=x+dx+Math.sin(inc)*h,ty=y-h;c.strokeStyle='#7a6a4a';c.lineWidth=1.8;c.beginPath();c.moveTo(x+dx,y+2);c.lineTo(tx,ty);c.stroke();
    c.fillStyle='#3f7a32';for(let a=-2.8;a<=-.3;a+=.5){c.save();c.translate(tx,ty);c.rotate(a);c.beginPath();c.ellipse(9,0,10,1.8,.25,0,7);c.fill();c.restore()}c.fillStyle='#3a1640';for(let i=0;i<4;i++)disc(c,tx+1+(i%2)*2,ty+4+i*1.6,1.4)}}
function verOPeso(c,x,y){c.fillStyle='#0003';c.fillRect(x-40,y,84,6);c.fillStyle='#e8e4da';c.fillRect(x-40,y-22,80,22);c.fillStyle='#2f6fd0';for(let xx=x-36;xx<x+38;xx+=8){c.fillRect(xx,y-18,4,14)}
  c.fillStyle='#9aa8b8';c.fillRect(x-42,y-26,84,5);for(const tx of[x-40,x-14,x+14,x+40]){c.fillStyle='#e8e4da';c.fillRect(tx-4,y-36,8,12);c.fillStyle='#4a5a70';c.beginPath();c.moveTo(tx-5,y-36);c.lineTo(tx,y-48);c.lineTo(tx+5,y-36);c.closePath();c.fill();c.fillStyle='#f2c12e';disc(c,tx,y-49,1.4)}
  /* barracas da feira em volta */
  for(let i=0;i<5;i++){const bx=x-44+i*22,by=y+16,cor=['#c8102e','#f2b705','#35a35f','#2456a6','#e2679b'][i];c.fillStyle='#0002';c.fillRect(bx-8,by+1,18,3);c.fillStyle=cor;c.beginPath();c.moveTo(bx-9,by-6);c.lineTo(bx+1,by-12);c.lineTo(bx+11,by-6);c.closePath();c.fill();c.fillStyle='#8a5a30';c.fillRect(bx-7,by-6,16,6);c.fillStyle='#4a1a4a';disc(c,bx-2,by-7,1.6);c.fillStyle='#e8a51c';disc(c,bx+4,by-7,1.6)}}
function cirio(c,pts,r){c.strokeStyle='#d8c7a0';c.lineWidth=2.2;c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();
  for(const[x,y]of pts)for(let k=0;k<3;k++){const px=x+(r()-.5)*10,py=y+(r()-.5)*8;c.fillStyle=['#fff','#f2e1b0','#c8e0f0','#f4ead5'][k%4];disc(c,px,py-3,2.6);c.fillStyle='#5a3d27';disc(c,px,py-6,1.6)}
  const[bx,by]=pts[pts.length-1];c.fillStyle='#0003';c.fillRect(bx-9,by+2,20,3);c.fillStyle='#c9a227';c.fillRect(bx-8,by-10,16,10);c.fillStyle='#f2d36b';c.beginPath();c.moveTo(bx-10,by-10);c.lineTo(bx,by-20);c.lineTo(bx+10,by-10);c.closePath();c.fill();c.fillStyle='#fff';for(let i=0;i<5;i++)disc(c,bx-8+i*4,by-1,1.8);c.fillStyle='#e2679b';disc(c,bx-4,by-12,1.6);disc(c,bx+4,by-12,1.6)}
function carimbo(c,x,y){for(let i=0;i<4;i++){const a=i*Math.PI/2+.4,px=x+Math.cos(a)*14,py=y+Math.sin(a)*7;const cor=['#c8102e','#f2b705','#35a35f','#e2679b'][i];c.fillStyle='#0002';c.beginPath();c.ellipse(px,py+3,8,2.5,0,0,7);c.fill();
  c.fillStyle=cor;c.beginPath();c.ellipse(px,py-2,8,4,0,0,7);c.fill();c.fillStyle='#fff';c.fillRect(px-2,py-12,4,8);c.fillStyle='#8a5a3a';disc(c,px,py-14,2.6);c.fillStyle=cor;disc(c,px+2,py-16,1.4)}
  c.fillStyle='#8a5a30';rr(c,x-4,y-10,8,12,2);c.fillStyle='#d9c3a0';c.beginPath();c.ellipse(x,y-10,4,1.5,0,0,7);c.fill()}
function minaCarajas(c,R){const{x,y,w,h}=R,cx=x+w/2,cy=y+h/2;for(let i=0;i<6;i++){const k=1-i*.15;c.fillStyle=i%2?'#b5552a':'#9a4422';c.beginPath();c.ellipse(cx,cy,w/2*k,h/2*k,0,0,7);c.fill();c.strokeStyle='rgba(255,220,180,.35)';c.lineWidth=1;c.stroke()}
  c.fillStyle='#5a7a8a';c.beginPath();c.ellipse(cx,cy,w*.07,h*.07,0,0,7);c.fill();c.strokeStyle='#d9a070';c.lineWidth=3;c.beginPath();c.moveTo(x+w,cy-h*.1);c.quadraticCurveTo(cx+w*.25,cy-h*.45,cx,cy-h*.12);c.stroke();
  c.fillStyle='#f2c12e';rr(c,cx+w*.18,cy-h*.3,10,6,1.5);c.fillStyle='#1d1a16';disc(c,cx+w*.18+2,cy-h*.3+6,1.6);disc(c,cx+w*.18+8,cy-h*.3+6,1.6)}
function pivo(c,R,r){const{x,y,w}=R,cx=x+w/2,cy=y+w/2,rad=w/2;c.fillStyle='rgba(0,0,0,.12)';c.beginPath();c.arc(cx+2,cy+3,rad,0,7);c.fill();
  const cor=r()<.5?['#5f9a3a','#7ab04a']:['#c9b46a','#8fb84e'];for(let i=0;i<8;i++){c.fillStyle=cor[i%2];c.beginPath();c.moveTo(cx,cy);c.arc(cx,cy,rad,i*Math.PI/4,(i+1)*Math.PI/4);c.closePath();c.fill()}
  c.strokeStyle='rgba(0,0,0,.12)';c.lineWidth=1;for(let k=.2;k<1;k+=.2){c.beginPath();c.arc(cx,cy,rad*k,0,7);c.stroke()}
  const a=r()*6.28;c.strokeStyle='#d8dce2';c.lineWidth=2.4;c.beginPath();c.moveTo(cx,cy);c.lineTo(cx+Math.cos(a)*rad,cy+Math.sin(a)*rad);c.stroke();c.fillStyle='#8a8f98';for(let k=.25;k<=1;k+=.25)disc(c,cx+Math.cos(a)*rad*k,cy+Math.sin(a)*rad*k,2);c.fillStyle='#d8dce2';disc(c,cx,cy,3.4)}
function algodao(c,R,r){const{x,y,w,h}=R;c.save();c.beginPath();c.rect(x,y,w,h);c.clip();c.fillStyle='#7a6a48';c.fillRect(x,y,w,h);for(let yy=y+4;yy<y+h;yy+=7){c.strokeStyle='#4f7a32';c.lineWidth=4;c.beginPath();c.moveTo(x,yy);c.lineTo(x+w,yy);c.stroke();c.fillStyle='#fff';for(let xx=x+2+r()*4;xx<x+w;xx+=4+r()*3)disc(c,xx,yy+(r()-.5)*2,1.5)}c.restore()}
function colheitadeira(c,x,y){c.fillStyle='#0003';c.fillRect(x-20,y,44,6);c.fillStyle='#d9c22e';c.fillRect(x-24,y-6,10,8);c.strokeStyle='#8a8030';c.lineWidth=1;for(let yy=y-5;yy<y+2;yy+=2){c.beginPath();c.moveTo(x-24,yy);c.lineTo(x-14,yy);c.stroke()}
  c.fillStyle='#2e8b3e';rr(c,x-14,y-16,30,16,3);c.fillStyle='#246b30';c.fillRect(x+6,y-24,10,9);c.fillStyle='#9ad0e8';c.fillRect(x+8,y-22,6,5);c.fillStyle='#d9c22e';c.fillRect(x-10,y-22,14,4);c.fillStyle='#1d1a16';disc(c,x-6,y+1,5);disc(c,x+12,y+2,3.4)}
function chapada(c,R,r){const{x,y,w,h}=R;c.fillStyle='#2f5a26';c.beginPath();c.moveTo(x,y+h);c.lineTo(x+w*.08,y+h*.5);c.lineTo(x+w*.92,y+h*.5);c.lineTo(x+w,y+h);c.closePath();c.fill();
  c.fillStyle='#b5552a';c.beginPath();c.moveTo(x+w*.06,y+h*.55);c.lineTo(x+w*.1,y+h*.1);c.lineTo(x+w*.9,y+h*.12);c.lineTo(x+w*.94,y+h*.55);c.closePath();c.fill();
  c.strokeStyle='rgba(255,200,150,.35)';c.lineWidth=1.4;for(let yy=y+h*.2;yy<y+h*.52;yy+=6){c.beginPath();c.moveTo(x+w*.08,yy);c.lineTo(x+w*.92,yy+(r()-.5)*3);c.stroke()}
  c.fillStyle='#6f9a4a';c.beginPath();c.ellipse(x+w/2,y+h*.1,w*.42,h*.07,0,0,7);c.fill();for(let i=0;i<7;i++){c.fillStyle='#4f7a32';disc(c,x+w*.15+i*w*.11,y+h*.08,3.5)}
  /* cachoeira (Véu de Noiva) caindo no poço */
  const fx=x+w*(.3+r()*.4);c.fillStyle='rgba(255,255,255,.9)';c.fillRect(fx-3,y+h*.12,6,h*.45);c.fillStyle='#5ec8e8';c.beginPath();c.ellipse(fx,y+h*.68,16,6,0,0,7);c.fill();c.fillStyle='rgba(255,255,255,.7)';disc(c,fx-4,y+h*.62,4);disc(c,fx+4,y+h*.63,3.5)}
function vaqueiroBerrante(c,x,y){gauchoCavalo(c,x,y,'#8a5a30');c.strokeStyle='#e8dcc0';c.lineWidth=2;c.beginPath();c.moveTo(x+4,y-24);c.quadraticCurveTo(x+12,y-30,x+16,y-24);c.stroke()}
function siriri(c,x,y){for(let i=0;i<3;i++){const px=x-12+i*12,py=y+(i%2)*3,cor=['#c8102e','#f2b705','#2f6fd0'][i];c.fillStyle='#0002';c.beginPath();c.ellipse(px,py+3,7,2,0,0,7);c.fill();c.fillStyle=cor;c.beginPath();c.moveTo(px-7,py);c.lineTo(px+7,py);c.lineTo(px+2,py-10);c.lineTo(px-2,py-10);c.closePath();c.fill();c.fillStyle='#8a5a3a';disc(c,px,py-13,2.6);c.fillStyle='#fff';disc(c,px+2,py-15,1.2)}
  c.fillStyle='#8a5a30';c.beginPath();c.ellipse(x+20,y-6,4,6,.4,0,7);c.fill();c.fillRect(x+21,y-20,2,10)}
function alagado(c,R,r){const{x,y,w,h}=R;for(let i=0;i<6;i++){const px=x+r()*w,py=y+r()*h,rx=16+r()*24;c.fillStyle='#5a9ec0aa';c.beginPath();c.ellipse(px,py,rx,rx*.45,r(),0,7);c.fill();c.strokeStyle='#4c8a3a';c.lineWidth=1.3;for(let j=0;j<5;j++){const gx=px-rx+r()*rx*2;c.beginPath();c.moveTo(gx,py+2);c.lineTo(gx+1,py-6);c.stroke()}
  c.fillStyle='#3f8a3e';if(r()<.6){c.beginPath();c.arc(px+rx*.3,py,4,.3,6);c.lineTo(px+rx*.3,py);c.fill()}}}
function jacare(c,x,y){c.fillStyle='#4a5a32';c.beginPath();c.ellipse(x,y,14,3.4,0,0,7);c.fill();c.beginPath();c.moveTo(x+12,y-2);c.lineTo(x+22,y);c.lineTo(x+12,y+2);c.fill();c.beginPath();c.moveTo(x-12,y-1.5);c.lineTo(x-24,y);c.lineTo(x-12,y+1.5);c.fill();c.fillStyle='#f2e86a';disc(c,x+12,y-2,1);c.fillStyle='#3a4a26';for(let i=-8;i<10;i+=4)disc(c,x+i,y,1.1)}
function rioBonito(c,R,r){const{x,y,w,h}=R;c.fillStyle='#c9b07a';c.beginPath();c.ellipse(x+w/2,y+h/2,w/2+6,h/2+6,0,0,7);c.fill();const g=c.createRadialGradient(x+w/2,y+h/2,4,x+w/2,y+h/2,w/2);g.addColorStop(0,'#7fe0e8');g.addColorStop(1,'#2aa8b8');c.fillStyle=g;c.beginPath();c.ellipse(x+w/2,y+h/2,w/2,h/2,0,0,7);c.fill();
  c.fillStyle='#3f8a5a88';for(let i=0;i<6;i++){c.beginPath();c.ellipse(x+w*.2+r()*w*.6,y+h*.25+r()*h*.5,6,2,r()*3,0,7);c.fill()}
  for(let i=0;i<8;i++){const px=x+w*.2+r()*w*.6,py=y+h*.25+r()*h*.5;c.fillStyle=['#f2b705','#ff7a1c','#c0c8d0'][i%3];c.beginPath();c.ellipse(px,py,3.4,1.4,0,0,7);c.fill();c.beginPath();c.moveTo(px-3,py);c.lineTo(px-6,py-2);c.lineTo(px-6,py+2);c.fill()}
  for(let i=0;i<2;i++){const px=x+w*.3+i*w*.35,py=y+h*.45;c.fillStyle='#1d1a16';c.beginPath();c.ellipse(px,py,6,2.4,.2,0,7);c.fill();c.fillStyle='#f2c12e';c.fillRect(px-2,py-3,4,2);c.fillStyle='#e8b48f';disc(c,px+6,py-1,2)}}
function terere(c,x,y){c.fillStyle='#0003';c.beginPath();c.ellipse(x,y+3,12,3.5,0,0,7);c.fill();c.fillStyle='#c8102e';rr(c,x+2,y-18,9,18,2);c.fillStyle='#e8e4da';c.fillRect(x+3,y-14,7,2);c.fillStyle='#8a5a30';c.beginPath();c.moveTo(x-9,y-12);c.lineTo(x-1,y-12);c.lineTo(x-2,y);c.lineTo(x-8,y);c.closePath();c.fill();
  c.fillStyle='#4c8a3a';c.beginPath();c.ellipse(x-5,y-12,4,1.6,0,0,7);c.fill();c.fillStyle='#bfe8f0';disc(c,x-4,y-12,1);c.strokeStyle='#c9ced6';c.lineWidth=1.4;c.beginPath();c.moveTo(x-4,y-12);c.lineTo(x-1,y-22);c.stroke()}
function eucaliptal(c,R,r){const{x,y,w,h}=R;c.fillStyle='#6f8a4a';c.fillRect(x,y,w,h);for(let yy=y+6;yy<y+h;yy+=10)for(let xx=x+5;xx<x+w;xx+=9){c.fillStyle='#0002';disc(c,xx+2,yy+2,4.4);c.fillStyle=(xx+yy)%3?'#4f7a3a':'#5f8a48';disc(c,xx,yy,4.2);c.fillStyle='#ffffff22';disc(c,xx-1,yy-1.5,1.6)}}
function canavial(c,R,r){const{x,y,w,h}=R;c.save();c.beginPath();c.rect(x,y,w,h);c.clip();c.fillStyle='#6fa83e';c.fillRect(x,y,w,h);c.strokeStyle='#4f8a2e';c.lineWidth=1.2;for(let i=0;i<w*h/30;i++){const px=x+r()*w,py=y+r()*h;c.beginPath();c.moveTo(px,py);c.lineTo(px+(r()-.5)*6,py-7);c.stroke()}
  c.fillStyle='rgba(255,255,200,.18)';for(let yy=y;yy<y+h;yy+=12)c.fillRect(x,yy,w,2);c.restore()}
function usina(c,x,y){c.fillStyle='#0003';c.fillRect(x-28,y,60,6);c.fillStyle='#c9c2b0';c.fillRect(x-28,y-18,34,18);c.fillStyle='#9aa0a8';for(const dx of[10,22]){c.beginPath();c.ellipse(x+dx,y-12,6,12,0,0,7);c.fill();c.fillStyle='#c9ced6';c.beginPath();c.ellipse(x+dx,y-23,6,2.4,0,0,7);c.fill();c.fillStyle='#9aa0a8'}
  c.fillStyle='#8a8f98';c.fillRect(x-22,y-40,5,22);c.fillStyle='rgba(230,230,230,.7)';for(const[dx,dy,s]of[[-19,-44,4],[-16,-50,5],[-12,-57,6]])disc(c,x+dx,y+dy,s)}
function rodeio(c,x,y){c.fillStyle='rgba(0,0,0,.15)';c.beginPath();c.ellipse(x+2,y+3,34,20,0,0,7);c.fill();c.fillStyle='#c9a46a';c.beginPath();c.ellipse(x,y,32,18,0,0,7);c.fill();c.strokeStyle='#8a5a30';c.lineWidth=2.4;c.stroke();
  c.fillStyle='#6a4326';for(let a=0;a<6.28;a+=.4)c.fillRect(x+Math.cos(a)*32-1,y+Math.sin(a)*18-4,2,5);
  c.fillStyle='#3a3530';c.beginPath();c.ellipse(x+4,y-2,9,4.5,0,0,7);c.fill();c.fillStyle='#e8dcc0';c.beginPath();c.moveTo(x+11,y-5);c.lineTo(x+16,y-9);c.moveTo(x+11,y-3);c.lineTo(x+16,y-6);c.strokeStyle='#e8dcc0';c.lineWidth=1.4;c.stroke();
  c.fillStyle='#2456a6';c.fillRect(x+1,y-13,4,7);c.fillStyle='#e8b48f';disc(c,x+3,y-15,2.4);c.fillStyle='#c9a46a';c.beginPath();c.ellipse(x+3,y-17,5,1.4,0,0,7);c.fill()}
function palcoSertanejo(c,x,y){c.fillStyle='#0003';c.fillRect(x-30,y,64,6);c.fillStyle='#2a2a30';c.fillRect(x-30,y-12,60,12);c.fillStyle='#3a3a42';c.fillRect(x-30,y-40,4,28);c.fillRect(x+26,y-40,4,28);c.fillRect(x-30,y-42,60,4);
  for(let i=0;i<5;i++){c.fillStyle=['#ff5a4a','#f2c12e','#5ac8f0','#e2679b','#7fe07a'][i];disc(c,x-22+i*11,y-36,2.4);c.fillStyle=['#ff5a4a33','#f2c12e33','#5ac8f033','#e2679b33','#7fe07a33'][i];c.beginPath();c.moveTo(x-22+i*11,y-36);c.lineTo(x-30+i*11,y-12);c.lineTo(x-14+i*11,y-12);c.closePath();c.fill()}
  for(const dx of[-8,8]){c.fillStyle='#c9a46a';c.beginPath();c.ellipse(x+dx,y-28,5,1.4,0,0,7);c.fill();c.fillStyle='#e8b48f';disc(c,x+dx,y-25,2.4);c.fillStyle=dx<0?'#c8102e':'#1d1a16';c.fillRect(x+dx-3,y-22,6,9);c.fillStyle='#8a5a30';c.fillRect(x+dx-1,y-19,7,3)}}
function casarioColonial(c,x,y,r){for(let i=0;i<3;i++){const hx=x-30+i*22,cor=['#f4efe4','#f2e1b0','#f4efe4'][i];c.fillStyle='#0003';c.fillRect(hx-10,y,22,4);c.fillStyle=cor;c.fillRect(hx-10,y-18,20,18);c.fillStyle='#b5653f';c.fillRect(hx-12,y-22,24,5);
  c.fillStyle=['#2456a6','#35a35f','#c8102e'][i];c.fillRect(hx-3,y-11,6,11);c.fillRect(hx-8,y-15,4,5);c.fillRect(hx+4,y-15,4,5)}
  const ix=x+38;c.fillStyle='#0003';c.fillRect(ix-10,y,22,4);c.fillStyle='#f4efe4';c.fillRect(ix-10,y-24,20,24);c.beginPath();c.moveTo(ix-10,y-24);c.lineTo(ix,y-32);c.lineTo(ix+10,y-24);c.fill();c.fillRect(ix-3,y-40,6,10);c.fillStyle='#c9a227';c.fillRect(ix-.6,y-46,1.2,6);c.fillRect(ix-2.4,y-44,4.8,1.2);c.fillStyle='#2456a6';c.fillRect(ix-3,y-12,6,12)}
function termas(c,R,r){const{x,y,w,h}=R;c.fillStyle='#e8e4da';rr(c,x,y,w,h,8);for(const[px,py,pw,ph]of[[x+6,y+6,w*.55,h-12],[x+w*.62,y+8,w*.32,h*.5]]){c.fillStyle='#2a9db8';rr(c,px,py,pw,ph,6);c.fillStyle='#7fe0e8';rr(c,px+2,py+2,pw-4,ph-4,5);
  c.strokeStyle='rgba(255,255,255,.6)';c.lineWidth=1;for(let i=0;i<3;i++){const sx=px+pw*(.25+i*.25);c.beginPath();c.moveTo(sx,py+ph*.4);c.quadraticCurveTo(sx+3,py+ph*.25,sx,py+ph*.1);c.stroke()}}
  for(let i=0;i<2;i++){const ux=x+w*.7+i*14,uy=y+h*.8;c.fillStyle=i?'#ff7a1c':'#2456a6';c.beginPath();c.arc(ux,uy,6,Math.PI,0);c.fill();c.fillStyle='#fff';c.fillRect(ux-.6,uy,1.2,6)}
  c.fillStyle='rgba(255,255,255,.45)';for(let i=0;i<5;i++)disc(c,x+10+r()*w*.5,y+4+r()*8,3+r()*3)}
/* Pará: rio largo com barcos, açaizais, Ver-o-Peso, Círio, carimbó e a mina de Carajás */
function paChao(c,M,r){
  for(let i=0;i<60;i++){c.fillStyle=['rgba(30,80,30,.22)','rgba(80,130,50,.2)'][i%2];c.beginPath();c.ellipse(r()*W,r()*H,30+r()*70,14+r()*30,r()*3,0,7);c.fill()}
  M.rio=igarape(c,r,22,'#6f9aa0');
  const mina=lugarLivre(M,120,74,r,56);if(mina){minaCarajas(c,mina);M.campos.push(mina)}
}
function paDecor(c,M,r,livre){
  const itens=[];
  for(let i=4;i<(M.rio||[]).length;i+=14){const[x,y]=M.rio[i];if(distPath(x,y)>46&&x>30&&x<W-30)itens.push({x,y,f:()=>propRegional(c,'barco',x,y)})}
  for(let i=2;i<(M.rio||[]).length;i+=3){const[x0,y0]=M.rio[i];const x=x0+(r()<.5?-1:1)*(22+r()*8),y=y0+(r()-.5)*8;if(livre(x,y)&&!noCampo(M,x,y)&&distPath(x,y)>46)itens.push({x,y,f:()=>acaizeiro(c,x,y)})}
  const vp=lugarLivre(M,100,72,r,50);if(vp){M.campos.push(vp);itens.push({x:vp.x+50,y:vp.y+44,f:()=>verOPeso(c,vp.x+50,vp.y+44)})}
  for(let i=0;i<60;i++){const x=60+r()*(W-200),y=60+r()*(H-120);const pts=[];for(let k=0;k<7;k++)pts.push([x+k*18,y+Math.sin(k*.8)*6]);if(pts.every(([px,py])=>livre(px,py)&&!noCampo(M,px,py)&&distPath(px,py)>40)){itens.push({x,y,f:()=>cirio(c,pts,r)});break}}
  for(let i=0;i<60;i++){const x=40+r()*(W-80),y=50+r()*(H-80);if(livre(x,y)&&!noCampo(M,x,y)&&distPath(x,y)>52){itens.push({x,y,f:()=>carimbo(c,x,y)});break}}
  itens.sort((a,b)=>a.y-b.y);for(const o of itens)o.f();
}
/* Mato Grosso: pivôs de irrigação, soja, milho e algodão, colheitadeiras, Chapada dos Guimarães, nelore e siriri */
function mtChao(c,M,r){
  for(let i=0;i<50;i++){c.fillStyle=['rgba(200,180,100,.25)','rgba(90,140,60,.2)'][i%2];c.beginPath();c.ellipse(r()*W,r()*H,40+r()*80,16+r()*30,r()*3,0,7);c.fill()}
  const ch=(()=>{for(let i=0;i<60;i++){const w=200,h=84,x=20+r()*(W-40-w),y=i<40?6:H-h-6;if(longeDaAvenida(x,y,w,h,40)&&!inStage(x+w/2,y+h/2)&&Math.hypot(x+w/2-M.lm.x,y+h/2-M.lm.y)>140&&Math.hypot(x+w/2-M.stall.x,y+h/2-M.stall.y)>120)return{x,y,w,h}}return null})();
  if(ch){chapada(c,ch,r);M.campos.push(ch)}
  for(let k=0;k<3;k++){const d=90+r()*30,R=lugarLivre(M,d,d,r,60);if(R){pivo(c,R,r);M.campos.push(R)}}
  for(const t of['algodao','soja','milho']){const R=lugarLivre(M,96+r()*40,56+r()*24,r,62);if(R){if(t==='algodao')algodao(c,R,r);else campo(c,t,R,r);M.campos.push(R)}}
}
function mtDecor(c,M,r,livre){
  const itens=[];const poe=(n,f,dist,sep)=>{for(let k=0;k<n;k++)for(let i=0;i<60;i++){const x=40+r()*(W-80),y=50+r()*(H-80);if(!livre(x,y)||noCampo(M,x,y)||distPath(x,y)<(dist||50))continue;if(itens.some(o=>Math.hypot(o.x-x,o.y-y)<(sep||60)))continue;itens.push({x,y,f});break}};
  poe(2,(x,y)=>colheitadeira(c,x,y),52,70);poe(2,(x,y)=>nelore(c,x,y,r),56,80);poe(1,(x,y)=>siriri(c,x,y),52,60);poe(1,(x,y)=>propRegional(c,'viola',x,y),46,40);
  itens.sort((a,b)=>a.y-b.y);for(const o of itens)o.f(o.x,o.y);
}
/* Mato Grosso do Sul: Pantanal alagado com jacarés e tuiuiús, rio cristalino de Bonito, comitiva com berrante, eucaliptal e tereré */
function msChao(c,M,r){
  for(let i=0;i<55;i++){c.fillStyle=['rgba(120,170,80,.22)','rgba(70,120,60,.2)'][i%2];c.beginPath();c.ellipse(r()*W,r()*H,30+r()*80,14+r()*30,r()*3,0,7);c.fill()}
  for(let k=0;k<2;k++){const R=lugarLivre(M,150,80,r,54);if(R){alagado(c,R,r);M.campos.push(R);M.alagados=(M.alagados||[]).concat([R])}}
  const b=lugarLivre(M,110,60,r,56);if(b){rioBonito(c,b,r);M.campos.push(b)}
  const e=lugarLivre(M,100,60,r,62);if(e){eucaliptal(c,e,r);M.campos.push(e)}
}
function msDecor(c,M,r,livre){
  const itens=[];
  for(const A of M.alagados||[])for(let k=0;k<2;k++){const x=A.x+20+r()*(A.w-40),y=A.y+15+r()*(A.h-30);if(distPath(x,y)>40)itens.push({x,y,f:()=>k?jacare(c,x,y):propRegional(c,'tuiuiuR',x,y)})}
  const poe=(n,f,dist,sep)=>{for(let k=0;k<n;k++)for(let i=0;i<60;i++){const x=40+r()*(W-80),y=50+r()*(H-80);if(!livre(x,y)||noCampo(M,x,y)||distPath(x,y)<(dist||50))continue;if(itens.some(o=>Math.hypot(o.x-x,o.y-y)<(sep||60)))continue;itens.push({x,y,f:()=>f(x,y)});break}};
  poe(1,(x,y)=>{vaqueiroBerrante(c,x,y);nelore(c,x+36,y+6,r)},56,90);poe(1,(x,y)=>terere(c,x,y),46,50);poe(2,(x,y)=>jacare(c,x,y),46,50);poe(3,(x,y)=>arvoreTipo(c,'ipe',x,y,1,'#e2679b',{ipe:'#e2679b'}),46,50);
  itens.sort((a,b)=>a.y-b.y);for(const o of itens)o.f();
}
/* Goiás: canavial e usina de etanol, rodeio, palco sertanejo, casario da Cidade de Goiás, Chapada dos Veadeiros e as termas de Caldas Novas */
function goChao(c,M,r){
  for(let i=0;i<14;i++){c.fillStyle='rgba(181,101,63,.25)';c.beginPath();c.ellipse(r()*W,r()*H,18+r()*40,10+r()*18,r()*3,0,7);c.fill()}
  const ch=(()=>{for(let i=0;i<60;i++){const w=180,h=80,x=20+r()*(W-40-w),y=i<40?6:H-h-6;if(longeDaAvenida(x,y,w,h,40)&&!inStage(x+w/2,y+h/2)&&Math.hypot(x+w/2-M.lm.x,y+h/2-M.lm.y)>140&&Math.hypot(x+w/2-M.stall.x,y+h/2-M.stall.y)>120)return{x,y,w,h}}return null})();
  if(ch){chapada(c,ch,r);M.campos.push(ch)}
  for(let k=0;k<2;k++){const R=lugarLivre(M,100+r()*30,60+r()*20,r,62);if(R){canavial(c,R,r);M.campos.push(R)}}
  const t=lugarLivre(M,90,56,r,56);if(t){termas(c,t,r);M.campos.push(t)}
}
function goDecor(c,M,r,livre){
  const itens=[];const poe=(n,f,dist,sep)=>{for(let k=0;k<n;k++)for(let i=0;i<60;i++){const x=50+r()*(W-100),y=60+r()*(H-90);if(!livre(x,y)||noCampo(M,x,y)||distPath(x,y)<(dist||50))continue;if(itens.some(o=>Math.hypot(o.x-x,o.y-y)<(sep||60)))continue;itens.push({x,y,f:()=>f(x,y)});break}};
  poe(1,(x,y)=>usina(c,x,y),56,90);poe(1,(x,y)=>rodeio(c,x,y),66,90);poe(1,(x,y)=>palcoSertanejo(c,x,y),56,90);poe(1,(x,y)=>casarioColonial(c,x,y,r),66,110);
  itens.sort((a,b)=>a.y-b.y);for(const o of itens)o.f();
}
const CENARIO={RS:{chao:rsChao,decor:rsDecor},RR:{chao:rrChao,decor:rrDecor},RO:{chao:roChao,decor:roDecor},PA:{chao:paChao,decor:paDecor},MT:{chao:mtChao,decor:mtDecor},MS:{chao:msChao,decor:msDecor},GO:{chao:goChao,decor:goDecor}};
function paintBg(){
  BG=document.createElement('canvas');BG.width=W*K;BG.height=H*K;
  const c=BG.getContext('2d');c.scale(K,K);
  const M=MAPAS[S.uf],B=M.b;
  let seed=S.uf==='DF'?7:M.i*97+11;const r=()=>(seed=(seed*16807)%2147483647)/2147483647;
  /* favela: chão de terra batida; sertão: areia; nos outros, a grama do bioma */
  const fav=M.tema==='favela',ser=M.tema==='sertao',V=visualDe(M);
  const CHAO={geada:['#dce8ee',['#c9dae3','#eef5f8','#d4e2ea']],outono:['#cf9a3e',['#d98b2b','#e0a94f','#b8822f','#c98a35']]}[M.visual];
  const chao=fav?'#b29c74':ser?'#e3b873':CHAO?CHAO[0]:B.g,manchas=fav?['#a08a62','#c4ae84','#7e9a58','#9a845e']:ser?['#d9a862','#ecc98d','#cf9d58','#e8be7a']:CHAO?CHAO[1]:B.p;
  c.fillStyle=chao;c.fillRect(0,0,W,H);
  for(let i=0;i<90;i++){c.fillStyle=pick2(manchas,r);c.globalAlpha=.34;c.beginPath();c.ellipse(r()*W,r()*H,40+r()*90,22+r()*40,r()*3,0,7);c.fill()}
  c.globalAlpha=1;
  M.campos=[];M.rio=null;M.alagados=[];
  const pau=M.tema==='paulista',CEN=CENARIO[M.uf];
  /* capim, flores, pedrinhas, trilhas e o detalhe do bioma */
  if(!fav&&!ser&&!pau)texturaChao(c,M,r,V);
  /* SP: quadras de prédios vistos de cima; RS, RR, RO, PA, MT, MS e GO: lavouras, rios e o relevo de cada um */
  if(pau)desenhaPaulistaChao(c,M,r);
  if(CEN)CEN.chao(c,M,r);
  /* favela: telhados vistos de cima cobrindo o chão; avenida, lago e o resto vêm por cima */
  if(fav)desenhaFavela(c,M,r);
  if(ser)desenhaSertaoChao(c,r);
  /* lago */
  if(M.lake){
    const L=M.lake;
    c.fillStyle='#d7c88f';c.beginPath();c.ellipse(L.x,L.y,L.rx+10,L.ry+10,0,0,7);c.fill();
    c.fillStyle='#3f8fb5';c.beginPath();c.ellipse(L.x,L.y+2,L.rx,L.ry,0,0,7);c.fill();
    c.strokeStyle='#ffffff55';c.lineWidth=2;for(let i=0;i<14;i++){const x=L.x+(r()-.5)*L.rx*1.5,y=L.y+(r()-.5)*L.ry*1.1;c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+10,y-4,x+22,y);c.stroke()}
  }
  /* morros (terreno alto) */
  for(const m of M.morros||[])desenhaMorro(c,m);
  /* rio da balsa (por baixo das avenidas, que passam por cima como pontes) */
  desenhaRioBalsa(c,M);
  /* avenida */
  c.lineJoin='round';c.lineCap='round';
  const road=(w,col,dash)=>{c.strokeStyle=col;c.lineWidth=w;c.setLineDash(dash||[]);for(const P of [PATH,PATH2,PATH3].filter(Boolean)){c.beginPath();P.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke()}c.setLineDash([])};
  road(56,M.visual==='geada'?'#eef3f6':pau?'#c9c4ba':'#d9cfb4');road(46,'#45454d');road(2.5,'#f3d76b',[14,14]);
  if(pau)desenhaCiclovia(c);
  /* trechos especiais da avenida: ladeira, subida, lama, areia, geada */
  desenhaTrechos(c,M);
  /* setas no começo do desvio: a marcha se divide ali */
  if(M.desvio)for(const v of[0,1]){const p=posAt(M.desvio.d1+34,v),q=posAt(M.desvio.d1+44,v),a=Math.atan2(q.y-p.y,q.x-p.x);c.save();c.translate(p.x,p.y);c.rotate(a);c.fillStyle='#f3d76b';c.beginPath();c.moveTo(9,0);c.lineTo(-5,-7);c.lineTo(-5,7);c.closePath();c.fill();c.restore()}
  /* trilhos do trem atravessando a avenida */
  if(M.trem){const p=posAt(M.trem.d),nx=-p.dy,ny=p.dx;c.save();c.translate(p.x,p.y);c.rotate(Math.atan2(ny,nx));
    c.fillStyle='#6a4a2a';for(let k=-70;k<=70;k+=11)c.fillRect(k-2.5,-11,5,22);c.fillStyle='#9aa0a8';c.fillRect(-80,-8,160,3);c.fillRect(-80,5,160,3);c.restore()}
  /* prédios: tapam a visão de quem está atrás deles */
  for(const b of M.predios||[])desenhaPredio(c,b);
  /* obstáculos que ainda não foram tirados */
  for(const o of obstAtivos())desenhaObst(c,o);
  /* monumento do estado */
  c.save();c.translate(M.lm.x,M.lm.y);c.lineCap='butt';MONUMENTOS[M.ic](c);c.restore();
  label(c,M.leg,M.lm.x,M.lm.y+33,12,'#fff');
  c.lineCap='round';
  /* algo típico do estado, no lugar da antiga banca de pastel */
  c.save();c.translate(M.stall.x,M.stall.y);c.lineCap='butt';(TIPICO[S.uf]||TIPICO.SP)(c);c.restore();
  /* mapas Expert: obras onde não dá para colocar personagem */
  for(const z of M.bloq||[])desenhaObra(c,z);
  /* favela (RJ): pipas no céu no lugar das árvores; nos outros mapas, as árvores do bioma */
  const livreArv=(x,y)=>!(distPath(x,y)<44||inLake(x,y)||inStage(x,y)||obraEm(x,y)||predioEm(x,y)||noMorro(x,y)||(M.obst||[]).some(o=>Math.hypot(o.x-x,o.y-y)<o.r+12)||Math.hypot(x-M.lm.x,y-M.lm.y)<62||Math.hypot(x-M.stall.x,y-M.stall.y)<60)||noCampo(M,x,y)||rioBalsaDe(M,x,y);
  if(fav)desenhaPipas(c,r);
  else if(ser){desenhaSertao(c,M,r);bordaMapa(c,M,r,V)}
  else if(pau)desenhaPaulistaDecor(c,M,r);
  else{
    if(CEN)CEN.decor(c,M,r,livreArv);
    /* bosques no meio do mapa (menos árvores soltas que antes) e a borda de mata em volta */
    const arvs=[];
    for(let i=0;i<B.n*(CEN?.3:.55);i++){const x=r()*W,y=r()*H,s=.6+r()*.7;if(!livreArv(x,y))continue;arvs.push([x,y,s,V.arv[Math.floor(r()*V.arv.length)],V.cores[Math.floor(r()*V.cores.length)]])}
    arvs.sort((a,b)=>a[1]-b[1]);for(const[x,y,s,t,cor]of arvs)arvoreTipo(c,t,x,y,s,cor,V);
    detalhesBioma(c,M,r,V,livreArv);
    bordaMapa(c,M,r,V);
  }
  /* coisas típicas do estado (acarajé, frevo, chimarrão, vitória-régia...) */
  desenhaRegionais(c,M,r,livreArv);
  if(S.side==='br')paintRally(c);else paintPlanalto(c);
}
/* ---------- favela do Rio ----------
   Vista de cima: quarteirões de telhados colados, vielas, uma quadra, varais e pipas.
   Os personagens ficam em cima das lajes, como em qualquer lugar fora da avenida. */
const CORES_FAVELA=['#e8b04a','#d9653b','#5aa0c8','#7fbf6a','#e27aa0','#c9c2b0','#f2e1b0','#9b7fd0','#f08a4b'];
/* um telhado visto de cima: laje com caixa d'água, telha de fibrocimento, telha de barro ou tijolo sem acabamento.
   Embaixo, uma faixa da parede pintada (vista de leve, de frente) dá a cor de cada casa */
function telhado(c,x,y,w,h,r){
  const t=r(),cor=CORES_FAVELA[Math.floor(r()*CORES_FAVELA.length)];
  c.fillStyle='#00000040';c.fillRect(x+2,y+2,w,h);
  c.fillStyle=cor;c.fillRect(x,y+h-4,w,4);
  const hh=h-4;
  if(t<.42){
    /* laje de concreto */
    c.fillStyle=r()<.5?'#cfc9bc':'#bdb7a9';c.fillRect(x,y,w,hh);
    c.fillStyle='#00000018';c.fillRect(x,y,w,1.5);c.fillRect(x,y,1.5,hh);
    if(r()<.6&&w>16&&hh>14){const cx=x+3+r()*(w-15),cy=y+2+r()*(hh-12);c.fillStyle='#1d1a16';rr(c,cx-.6,cy-.6,11.2,11.2,2.4);c.fillStyle='#2f6fd0';rr(c,cx,cy,10,10,2);c.fillStyle='#5a8fe0';disc(c,cx+5,cy+5,3)}
    if(r()<.18){const ax=x+w-7,ay=y+5;c.fillStyle='#e8e8e8';disc(c,ax,ay,3.6);c.fillStyle='#9aa0a8';disc(c,ax,ay,1.2)}
    if(r()<.25){c.fillStyle='#3f8a3e';disc(c,x+4,y+hh-4,2.6);disc(c,x+8,y+hh-4,2.2)}
  }else if(t<.67){
    /* telha de fibrocimento ondulada */
    c.fillStyle='#9aa3a8';c.fillRect(x,y,w,hh);c.strokeStyle='#7e878d';c.lineWidth=1;
    for(let xx=x+2;xx<x+w;xx+=3){c.beginPath();c.moveTo(xx,y);c.lineTo(xx,y+hh);c.stroke()}
  }else if(t<.82){
    /* telha de barro */
    c.fillStyle='#c4683f';c.fillRect(x,y,w,hh);c.strokeStyle='#a2512f';c.lineWidth=1;
    for(let yy=y+3;yy<y+hh;yy+=3.5){c.beginPath();c.moveTo(x,yy);c.lineTo(x+w,yy);c.stroke()}
    c.fillStyle='#d98458';c.fillRect(x,y+hh/2-1,w,2);
  }else{
    /* tijolo sem reboco, com os ferros da laje de cima esperando */
    c.fillStyle='#b5653f';c.fillRect(x,y,w,hh);c.strokeStyle='#8a4a2e';c.lineWidth=.7;
    for(let yy=y+3;yy<y+hh;yy+=3){c.beginPath();c.moveTo(x,yy);c.lineTo(x+w,yy);c.stroke()}
    c.fillStyle='#6a6f78';for(const[px,py]of[[x+2,y+2],[x+w-3,y+2],[x+2,y+hh-3],[x+w-3,y+hh-3]])c.fillRect(px,py,1.6,1.6);
  }
  c.strokeStyle='#1d1a1655';c.lineWidth=1;c.strokeRect(x+.5,y+.5,w-1,h-1);
}
/* favela vista de cima: o mapa inteiro vira quarteirões de telhados colados, cortados por vielas.
   É desenhada antes da avenida, do lago e do resto, que ficam por cima. Os personagens ficam em cima das lajes. */
function desenhaFavela(c,M,r,mini){
  c.fillStyle='#8e877c';c.fillRect(0,0,W,H);
  /* vielas: uma grade torta; dentro de cada quarteirão, as casas são divididas em pedaços até ficarem do tamanho de um barraco */
  const xs=[-10];while(xs[xs.length-1]<W)xs.push(xs[xs.length-1]+95+r()*70);
  const ys=[-10];while(ys[ys.length-1]<H)ys.push(ys[ys.length-1]+80+r()*55);
  const casas=[];
  const parte=(x,y,w,h)=>{
    if((w<44&&h<38)||w<20||h<18){casas.push([x,y,w,h]);return}
    if(w/h>1.1||(w>44&&r()<.5)){const s=w*(.32+r()*.36);parte(x,y,s,h);parte(x+s,y,w-s,h)}
    else{const s=h*(.32+r()*.36);parte(x,y,w,s);parte(x,y+s,w,h-s)}
  };
  /* uma quadra de futebol de salão num quarteirão grande, longe da avenida */
  let quadra=null;
  for(let i=0;i<xs.length-1;i++)for(let j=0;j<ys.length-1;j++){
    const x=xs[i]+5,y=ys[j]+5,w=xs[i+1]-xs[i]-10,h=ys[j+1]-ys[j]-10;
    if(!mini&&!quadra&&w>110&&h>80&&r()<.5){const qx=x+w/2,qy=y+h/2;let ok=distPath(qx,qy)>90&&!inLake(qx,qy)&&!inStage(qx,qy)&&Math.hypot(qx-M.lm.x,qy-M.lm.y)>110&&Math.hypot(qx-M.stall.x,qy-M.stall.y)>110;
      if(ok){quadra={x:qx-50,y:qy-32,w:100,h:64};parte(x,y,w,quadra.y-y-3);parte(x,quadra.y+quadra.h+3,w,y+h-quadra.y-quadra.h-3);parte(x,quadra.y,quadra.x-x-3,quadra.h);parte(quadra.x+quadra.w+3,quadra.y,x+w-quadra.x-quadra.w-3,quadra.h);continue}}
    parte(x,y,w,h);
  }
  for(const[x,y,w,h]of casas)if(w>8&&h>8)telhado(c,x+1,y+1,w-2,h-2,r);
  if(quadra){const q=quadra;c.fillStyle='#1d1a16';c.fillRect(q.x-2,q.y-2,q.w+4,q.h+4);c.fillStyle='#2f7a5a';c.fillRect(q.x,q.y,q.w,q.h);
    c.strokeStyle='#ffffffcc';c.lineWidth=1.5;c.strokeRect(q.x+4,q.y+4,q.w-8,q.h-8);c.beginPath();c.moveTo(q.x+q.w/2,q.y+4);c.lineTo(q.x+q.w/2,q.y+q.h-4);c.stroke();
    c.beginPath();c.arc(q.x+q.w/2,q.y+q.h/2,9,0,7);c.stroke();c.strokeRect(q.x+4,q.y+q.h/2-12,10,24);c.strokeRect(q.x+q.w-14,q.y+q.h/2-12,10,24);
    c.fillStyle='#fff';disc(c,q.x+q.w/2+18,q.y+q.h/2+6,2.4)}
  /* varais de um telhado ao outro */
  if(!mini)for(let i=0;i<casas.length;i+=9){const[x,y,w,h]=casas[i];if(w<20)continue;const x2=x+w+20+r()*30,yy=y+h*.4;
    c.strokeStyle='#4a4038';c.lineWidth=.7;c.beginPath();c.moveTo(x+w/2,yy);c.quadraticCurveTo((x+w/2+x2)/2,yy+6,x2,yy+2);c.stroke();
    for(let j=1;j<4;j++){const t=j/4,px=x+w/2+(x2-x-w/2)*t;c.fillStyle=CORES_FAVELA[(i+j)%CORES_FAVELA.length];c.fillRect(px-2,yy+Math.sin(t*Math.PI)*5,4,5)}}
}
/* pipas no céu da favela: por cima de tudo, no fim do cenário */
function desenhaPipas(c,r){
  for(let i=0;i<6;i++){
    const x=60+r()*(W-200),y=30+r()*140;if(inStage(x,y))continue;
    c.save();c.translate(x,y);c.rotate(r()*.6-.3);
    c.fillStyle='#1d1a16';c.beginPath();c.moveTo(0,-9);c.lineTo(7,0);c.lineTo(0,10);c.lineTo(-7,0);c.closePath();c.fill();
    c.fillStyle=CORES_FAVELA[i%CORES_FAVELA.length];c.beginPath();c.moveTo(0,-7.5);c.lineTo(5.6,0);c.lineTo(0,8.5);c.lineTo(-5.6,0);c.closePath();c.fill();
    c.strokeStyle='#4a4038';c.lineWidth=.7;c.beginPath();c.moveTo(0,10);c.quadraticCurveTo(6,20,-2,30);c.stroke();
    c.restore();
  }
}
/* ---------- sertão (mapas do Nordeste) ----------
   Cidadezinha no chão de areia: casas coloridas com telha de barro e toldo, mandacarus, cata-vento, caixa d'água no suporte,
   cerca de madeira nas bordas e bandeirinhas de São João. Tudo é cenário, como as árvores dos outros mapas. */
const CORES_SERTAO=['#e9c46a','#f4a261','#e76f51','#2a9d8f','#efe6d2','#c86b85','#8ab17d','#5aa0c8'];
function desenhaSertaoChao(c,r){
  /* capim seco e pedrinhas espalhados */
  for(let i=0;i<130;i++){const x=r()*W,y=r()*H;c.strokeStyle=r()<.5?'#b8903f':'#9c7a34';c.lineWidth=1;c.beginPath();
    for(const a of[-.5,0,.5]){c.moveTo(x,y);c.lineTo(x+Math.sin(a)*5,y-6)}c.stroke()}
  for(let i=0;i<40;i++){c.fillStyle=r()<.5?'#c9a46a':'#b08a52';disc(c,r()*W,r()*H,1.5+r()*1.5)}
}
function casaSertao(c,x,y,w,h,cor,toldo){
  const x0=x-w/2,top=y-h;
  c.fillStyle='#0003';c.beginPath();c.ellipse(x+3,y+2,w*.6,5,0,0,7);c.fill();
  /* telhado de barro visto de cima e de frente */
  c.fillStyle='#1d1a16';c.fillRect(x0-4,top-15,w+8,17);
  c.fillStyle='#b5582e';c.fillRect(x0-3,top-14,w+6,15);c.strokeStyle='#8a4122';c.lineWidth=1;
  for(let xx=x0;xx<x0+w+3;xx+=4){c.beginPath();c.moveTo(xx,top-14);c.lineTo(xx,top+1);c.stroke()}
  c.fillStyle='#d4733f';c.fillRect(x0-3,top-14,w+6,3);
  /* fachada */
  c.fillStyle='#1d1a16';c.fillRect(x0-1,top,w+2,h+1);c.fillStyle=cor;c.fillRect(x0,top+1,w,h-1);
  c.fillStyle='#00000018';c.fillRect(x0,y-5,w,5);
  /* toldo listrado */
  for(let i=0;i<Math.floor(w/6);i++){c.fillStyle=i%2?'#fff':toldo;c.fillRect(x0+i*6,top+5,6,6)}
  c.fillStyle='#00000030';c.fillRect(x0,top+11,w,2);
  /* porta e janelas com venezianas */
  c.fillStyle='#5a3d27';c.fillRect(x-4,y-12,8,12);c.fillStyle='#3a2a1c';c.fillRect(x-.5,y-12,1,12);
  for(const s of[-1,1]){const jx=x+s*w*.3-3;c.fillStyle='#2b2f3a';c.fillRect(jx,top+15,6,6);c.fillStyle=toldo;c.fillRect(jx-2,top+15,2,6);c.fillRect(jx+6,top+15,2,6)}
}
function cacto(c,x,y,s){
  c.fillStyle='#0002';c.beginPath();c.ellipse(x,y+2,8*s,3*s,0,0,7);c.fill();
  c.fillStyle='#1d1a16';rr(c,x-4*s,y-26*s,8*s,27*s,3*s);
  c.fillStyle='#4f8a46';rr(c,x-3*s,y-25*s,6*s,25*s,3*s);
  c.fillStyle='#4f8a46';rr(c,x-10*s,y-18*s,4*s,10*s,2*s);rr(c,x-10*s,y-10*s,8*s,3.5*s,1.5*s);rr(c,x+6*s,y-22*s,4*s,10*s,2*s);rr(c,x+2*s,y-14*s,8*s,3.5*s,1.5*s);
  c.fillStyle='#6aa85e';c.fillRect(x-1*s,y-24*s,1.2*s,22*s);
}
function cataVento(c,x,y){
  c.strokeStyle='#5a3d27';c.lineWidth=2;c.beginPath();c.moveTo(x-10,y);c.lineTo(x,y-46);c.lineTo(x+10,y);c.moveTo(x-7,y-14);c.lineTo(x+7,y-14);c.moveTo(x-4,y-30);c.lineTo(x+4,y-30);c.stroke();
  c.save();c.translate(x,y-48);
  for(let i=0;i<8;i++){c.rotate(Math.PI/4);c.fillStyle=i%2?'#efe6d2':'#d9cdb0';c.beginPath();c.moveTo(0,0);c.lineTo(16,-3);c.lineTo(16,3);c.closePath();c.fill()}
  c.fillStyle='#5a3d27';disc(c,0,0,3);c.restore();
  c.fillStyle='#efe6d2';c.beginPath();c.moveTo(x+2,y-48);c.lineTo(x+22,y-52);c.lineTo(x+22,y-42);c.closePath();c.fill();
}
function caixaSuporte(c,x,y){
  c.strokeStyle='#5a3d27';c.lineWidth=2;c.beginPath();for(const dx of[-9,9]){c.moveTo(x+dx,y);c.lineTo(x+dx*.6,y-22)}c.moveTo(x-8,y-10);c.lineTo(x+8,y-10);c.stroke();
  c.fillStyle='#1d1a16';rr(c,x-13,y-40,26,20,4);c.fillStyle='#8a5a3a';rr(c,x-12,y-39,24,18,4);
  c.fillStyle='#5a3d27';c.fillRect(x-12,y-33,24,2);c.fillRect(x-12,y-26,24,2);c.fillStyle='#a8774f';c.beginPath();c.ellipse(x,y-39,12,3.5,0,0,7);c.fill();
}
function desenhaSertao(c,M,r){
  const livre=(x,y,f)=>!(distPath(x,y)<f||inLake(x,y)||inStage(x,y)||obraEm(x,y)||predioEm(x,y)||noMorro(x,y)||(M.obst||[]).some(o=>Math.hypot(o.x-x,o.y-y)<o.r+16)||Math.hypot(x-M.lm.x,y-M.lm.y)<70||Math.hypot(x-M.stall.x,y-M.stall.y)<65);
  const itens=[];
  /* casas perto da avenida, como numa rua de cidade pequena */
  const casas=[];
  for(let i=0;i<300&&casas.length<11;i++){const x=40+r()*(W-80),y=50+r()*(H-70);
    if(!livre(x,y,52)||!livre(x-24,y,46)||!livre(x+24,y,46)||!livre(x,y-40,40)||distPath(x,y)>130)continue;
    if(casas.some(k=>Math.hypot(k.x-x,k.y-y)<80))continue;
    casas.push({x,y,w:38+r()*14,h:28+r()*8,cor:CORES_SERTAO[Math.floor(r()*CORES_SERTAO.length)],toldo:['#2a9d8f','#c8102e','#e76f51','#2456a6'][Math.floor(r()*4)]})}
  M.casasSertao=casas;
  for(const k of casas)itens.push({y:k.y,f:()=>casaSertao(c,k.x,k.y,k.w,k.h,k.cor,k.toldo)});
  /* mandacarus espalhados */
  for(let i=0;i<120&&itens.length<casas.length+24;i++){const x=r()*W,y=20+r()*(H-20),s=.7+r()*.6;if(!livre(x,y,40))continue;
    if(casas.some(k=>Math.abs(k.x-x)<k.w&&y<k.y+10&&y>k.y-k.h-20))continue;itens.push({y,f:()=>cacto(c,x,y,s)})}
  /* cata-vento e caixa d'água, mais longe da avenida */
  let extras=0;for(let i=0;i<120&&extras<3;i++){const x=40+r()*(W-80),y=70+r()*(H-90);if(!livre(x,y,70)||casas.some(k=>Math.hypot(k.x-x,k.y-y)<70))continue;
    const tipo=extras%2;itens.push({y,f:()=>tipo?caixaSuporte(c,x,y):cataVento(c,x,y)});extras++}
  itens.sort((a,b)=>a.y-b.y);for(const it of itens)it.f();
  /* bandeirinhas de São João entre casas vizinhas */
  for(const a of casas){const b=casas.find(k=>k!==a&&Math.hypot(k.x-a.x,k.y-a.y)<170&&k.x>a.x);if(!b)continue;
    const y1=a.y-a.h-12,y2=b.y-b.h-12,n=Math.floor(Math.hypot(b.x-a.x,y2-y1)/9);
    c.strokeStyle='#5a3d27';c.lineWidth=.8;c.beginPath();c.moveTo(a.x,y1);c.quadraticCurveTo((a.x+b.x)/2,(y1+y2)/2+14,b.x,y2);c.stroke();
    for(let i=1;i<n;i++){const t=i/n,px=a.x+(b.x-a.x)*t,py=y1+(y2-y1)*t+Math.sin(t*Math.PI)*7;c.fillStyle=['#c8102e','#f2b705','#2456a6','#35a35f','#e2679b'][i%5];c.beginPath();c.moveTo(px-3,py);c.lineTo(px+3,py);c.lineTo(px,py+6);c.closePath();c.fill()}}
  /* cerca de madeira nas bordas de cima e de baixo (aberta onde a avenida passa) */
  for(const yb of[10,H-8])for(let x=6;x<W;x+=16){if(distPath(x,yb)<34||inStage(x,yb))continue;
    c.fillStyle='#7a5434';c.fillRect(x-1.5,yb-12,3,13);c.fillStyle='#9a6e45';c.fillRect(x-1.5,yb-9,16,2);c.fillRect(x-1.5,yb-4,16,2)}
}
function paintPlanalto(c){
  c.fillStyle='#d9d3c2';c.fillRect(826,74,134,122);
  c.fillStyle='#6fb3cf';c.fillRect(838,176,122,18);
  c.fillStyle='#3b5a6b';c.fillRect(856,100,100,54);
  c.strokeStyle='#8fb4c6';c.lineWidth=1;for(let i=1;i<10;i++){c.beginPath();c.moveTo(856+i*10,100);c.lineTo(856+i*10,154);c.stroke()}
  c.beginPath();c.moveTo(856,126);c.lineTo(956,126);c.stroke();
  c.fillStyle='#f7f5ee';c.fillRect(846,92,112,9);c.fillRect(846,152,112,8);
  for(let i=0;i<7;i++){const x=852+i*17;c.beginPath();c.moveTo(x,100);c.quadraticCurveTo(x+9,140,x+1,177);c.quadraticCurveTo(x-5,140,x,100);c.fill()}
  c.fillStyle='#efeadb';c.beginPath();c.moveTo(826,108);c.lineTo(850,108);c.lineTo(850,152);c.lineTo(826,152);c.fill();
  c.fillStyle='#55473a';c.fillRect(932,50,2.5,43);brFlag(c,934.5,50,24,16);
  /* sem placa escrita: o prédio com as colunas e a bandeira já diz o que é; no lugar do letreiro, a faixa presidencial */
  for(let i=0;i<3;i++){c.fillStyle=['#1f7a4d','#f2b705','#1f7a4d'][i];c.fillRect(862+i*18,81,18,6)}
}
function paintRally(c){
  c.fillStyle='#b7a578';c.fillRect(826,74,134,122);
  c.fillStyle='#1f7a4d';rr(c,846,104,112,72,6);
  c.fillStyle='#f6cf1d';c.fillRect(846,104,112,24);
  /* sem placa escrita: um megafone no meio da faixa e estrelas dos dois lados */
  c.fillStyle='#1d1a16';c.beginPath();c.moveTo(892,112);c.lineTo(910,106);c.lineTo(910,126);c.lineTo(892,120);c.closePath();c.fill();c.fillRect(886,112,7,8);
  c.strokeStyle='#1d1a16';c.lineWidth=1.6;for(const k of[0,1]){c.beginPath();c.arc(911,116,5+k*4,-.7,.7);c.stroke()}
  c.fillStyle='#1f7a4d';star(c,862,116,6);star(c,942,116,6);
  for(let i=0;i<4;i++){c.fillStyle='#17181d';rr(c,852+i*26,134,22,32,3);c.fillStyle='#5b5f68';disc(c,863+i*26,143,6);disc(c,863+i*26,157,5)}
  c.fillStyle='#22242a';disc(c,868,178,9);disc(c,936,178,9);c.fillStyle='#b9bec7';disc(c,868,178,3.4);disc(c,936,178,3.4);
  c.fillStyle='#55473a';c.fillRect(900,62,2.5,42);brFlag(c,902.5,62,28,19);
}
function pick2(a,r){return a[Math.floor(r()*a.length)]}
function resize(){
  const st=$('stage'),mob=matchMedia('(max-width:820px) and (orientation:portrait)').matches;
  const aw=st.clientWidth||innerWidth,ah=mob?aw*H/W:st.clientHeight;
  const q=Math.min(aw/W,ah/H);
  cv.style.width=Math.floor(W*q)+'px';cv.style.height=Math.floor(H*q)+'px';
  K=q*Math.min(devicePixelRatio||1,2);
  cv.width=Math.round(W*K);cv.height=Math.round(H*K);
  paintBg();
  /* os botões de poder ficam no canto de baixo do mapa, não na faixa vazia em volta dele */
  requestAnimationFrame(()=>{const pd=$('poderes');if(!pd)return;const s=st.getBoundingClientRect(),r=cv.getBoundingClientRect();pd.style.left=(r.left-s.left+6)+'px';pd.style.bottom=(s.bottom-r.bottom+6)+'px'});
}
addEventListener('resize',resize);

/* ---------- desenho ---------- */
function label(c,str,x,y,size,col,font){
  c.font=font||`700 ${size}px "Archivo Narrow",Arial,sans-serif`;c.textAlign='center';c.lineJoin='round';
  c.lineWidth=Math.max(3,size/4);c.strokeStyle='#1d1a16';c.strokeText(str,x,y);c.fillStyle=col;c.fillText(str,x,y);
}
function bar(c,x,y,w,h,k,col){c.fillStyle='#1d1a16';c.fillRect(x-1,y-1,w+2,h+2);c.fillStyle=col;c.fillRect(x,y,w*clamp(k,0,1),h)}
/* prédio do Sindicato: cada melhoria do primeiro caminho acrescenta um andar */
/* tanque visto de cima: o canhão gira para o alvo e o miliciano fica na escotilha */
function drawTank(c,x,y,a,A,kick,v){
  c.save();c.translate(x,y);
  c.fillStyle='#0003';c.beginPath();c.ellipse(4,22,34,6,0,0,7);c.fill();
  c.fillStyle='#23271f';rr(c,-33,-23,66,12,3);rr(c,-33,11,66,12,3);
  c.fillStyle='#4a5040';for(let i=0;i<8;i++){c.fillRect(-30+i*8,-22,3,10);c.fillRect(-30+i*8,12,3,10)}
  c.fillStyle=A>=3?'#b89a3a':v===2?'#8a3a30':'#5f6f3f';rr(c,-29,-15,58,30,5);
  c.fillStyle=A>=3?'#8f7426':v===2?'#6a2a24':'#4a5a30';c.beginPath();c.ellipse(-16,-6,9,5,.3,0,7);c.fill();c.beginPath();c.ellipse(15,8,10,4.6,-.2,0,7);c.fill();c.beginPath();c.ellipse(19,-9,5,3.4,0,0,7);c.fill();
  if(A>=1){c.fillStyle='#3a4628';c.fillRect(-29,-15,58,3);c.fillRect(-29,12,58,3)}
  if(v===2){c.fillStyle='#f2b705';star(c,-20,0,6)}
  c.save();c.rotate(a);
  const puxa=kick?5:0,canos=A>=3?[-5,5]:[0];
  c.fillStyle='#3a4628';for(const q of canos){c.fillRect(8-puxa,q-3,(A>=2?40:34),6);c.fillStyle='#23271f';c.fillRect(38-puxa+(A>=2?6:0),q-4,6,8);c.fillStyle='#3a4628'}
  c.fillStyle=A>=3?'#c9ab48':v===2?'#a8483c':'#6f8049';disc(c,0,0,15);
  c.strokeStyle='#23271f';c.lineWidth=1.2;c.beginPath();c.arc(0,0,15,0,7);c.stroke();
  c.restore();
  c.fillStyle='#23271f';disc(c,0,0,8.6);
  c.fillStyle='#d9a47e';disc(c,0,-2,6.4);
  c.fillStyle='#17181d';c.beginPath();c.arc(0,-3.6,6.6,Math.PI,0);c.fill();rr(c,-1,-5,9,2,1);
  if(v===2){disc(c,-2.4,-1.8,1.1);disc(c,2.4,-1.8,1.1);rr(c,-3.4,.6,6.8,1.5,.7)}
  else{c.fillRect(-4.8,-3,4.2,2.4);c.fillRect(.6,-3,4.2,2.4);c.fillRect(-.8,-2.6,1.6,1)}
  c.restore();
}
function predio(c,x,y,t,extra,tipo){
  const andares=2+extra,h=20+andares*12,w=42;
  c.save();c.translate(x,y);
  if(tipo==='emp'||tipo==='coop'){
    c.fillStyle=tipo==='coop'?'#7a2a24':'#2f4a6a';c.fillRect(-w/2,-h,w,h+2);
    c.fillStyle='#9fd6ee';for(let f=0;f<andares;f++)for(let i=0;i<3;i++)c.fillRect(-16+i*12,-h+8+f*12,8,8);
    c.fillStyle='#ffffff55';c.beginPath();c.moveTo(-w/2,-h);c.lineTo(-w/2+14,-h);c.lineTo(-w/2,-h+30);c.closePath();c.fill();
    c.fillStyle='#17181d';c.fillRect(-8,-16,16,18);c.fillStyle='#e0b020';c.fillRect(-.6,-16,1.2,18);
    c.fillStyle='#e0b020';c.fillRect(-w/2-2,-h-6,w+4,11);
    c.fillStyle='#17181d';c.font='700 6.8px Arial';c.textAlign='center';c.fillText(tipo==='coop'?'COOPERATIVA':'EMPRESA S/A',0,-h+1.6);
    c.fillStyle='#8a909c';c.fillRect(-1,-h-22,2,16);c.fillStyle='#35c46b';disc(c,0,-h-23,3.4);c.fillStyle='#fff';c.font='700 5px Arial';c.fillText('$',0,-h-21.2);
    c.restore();
    return;
  }
  c.fillStyle='#a6342c';c.fillRect(-w/2,-h,w,h+2);
  c.strokeStyle='#8a2a24';c.lineWidth=.6;c.beginPath();for(let q=-h+6;q<0;q+=6){c.moveTo(-w/2,q);c.lineTo(w/2,q)}c.stroke();
  c.fillStyle='#bfe3f5';for(let f=0;f<andares;f++)for(let i=0;i<3;i++)c.fillRect(-15+i*11,-h+8+f*12,8,7);
  c.fillStyle='#f4ead5';c.fillRect(-7,-16,14,18);c.fillStyle='#5a3a22';c.fillRect(-5,-14,10,16);c.fillStyle='#f2b705';disc(c,3,-6,1);
  c.fillStyle='#6d1712';c.fillRect(-w/2-2,-h-6,w+4,11);
  /* fachada sem texto: punho erguido entre duas estrelas */
  c.fillStyle='#fff';star(c,-14,-h-.6,3.2);star(c,14,-h-.6,3.2);rr(c,-3.6,-h-4.6,7.2,5.4,1.6);c.fillRect(-2.2,-h+.4,4.4,3.4);
  c.fillStyle='#6d1712';c.fillRect(-1.8,-h-4.4,.6,3);c.fillRect(.2,-h-4.4,.6,3);
  c.fillStyle='#6a4a2a';c.fillRect(13,-h-26,2,20);redFlag(c,15,-h-26,15+Math.sin(t*5),10);
  c.restore();
}
/* desenha exatamente a área usada no jogo, a mesma conta que escolhe os alvos */
function reachArea(c,x,y,T,s,rm,ok){
  c.save();
  /* lugar proibido: além da cor, a borda fica tracejada (dá para ver mesmo sem distinguir vermelho) */
  c.fillStyle=ok?'#ffffff30':OPC.daltonico?'#ff8a0055':'#d0202055';c.strokeStyle=ok?'#ffffffc8':OPC.daltonico?'#ffb04a':'#ff6060';c.lineWidth=2;
  if(!ok)c.setLineDash([8,6]);
  if(T.atk==='plane'){
    const[cx,cy]=planeCenter(x,y,s.orbit),reach=s.reach*rm;
    c.beginPath();
    for(let i=0;i<=72;i++){
      const a=i/72*Math.PI*2,nx=Math.cos(a)*.72,ny=Math.sin(a),q=Math.hypot(nx,ny);
      c.lineTo(cx+Math.cos(a)*s.orbit+nx/q*reach,cy+Math.sin(a)*s.orbit*.72+ny/q*reach);
    }
    c.closePath();c.fill();c.stroke();
  }else if(s.range){
    c.beginPath();c.arc(x,y,s.range*(T.atk==='none'?1:rm),0,7);c.fill();c.stroke();
  }
  if(s.auraR&&s.auraR!==s.range){
    c.setLineDash([9,7]);c.strokeStyle='#ffe27a';c.lineWidth=2.4;c.beginPath();c.arc(x,y,s.auraR,0,7);c.stroke();c.setLineDash([]);
  }
  if(s.pet){c.setLineDash([6,5]);c.strokeStyle='#f28a1e';c.lineWidth=2.4;c.beginPath();c.arc(x+petOff(x,y),y,s.petR,0,7);c.stroke();c.setLineDash([])}
  if(s.wallRate){const p=posAt(nearestD(x,y));c.fillStyle='#d9744e';c.fillRect(p.x-9,p.y-9,18,18)}
  if(T.atk==='runner'||s.robots){
    const d0=Math.min(LEN,nearestD(x,y)+(s.robots?0:(s.count-1)*26)),d1=Math.max(0,d0-(s.robots?(s.drone?DRONE_SPD:ROBOT_SPD)*s.robotLife:s.len));
    c.strokeStyle=s.robots?'#7fd4ff60':'#ffd24a70';c.lineWidth=22;c.lineCap='round';c.lineJoin='round';c.beginPath();
    for(let d=d0;d>d1;d-=10){const p=posAt(d);c.lineTo(p.x,p.y)}
    const p=posAt(d1);c.lineTo(p.x,p.y);c.stroke();
  }
  c.restore();
}
function drawTower(t){
  const c=g,col=t.T.atk==='none'?'#7a3b3b':'#f4ead5';
  /* selo de nível do herói */
  if(t.T.only&&!S.menu){const n=t.nivel||1,x=t.x-17,y=t.y-56;c.fillStyle='#1d1a16';disc(c,x,y,9);c.fillStyle=n>=10?'#ffe27a':'#f2b705';disc(c,x,y,7.6);c.fillStyle='#1d1a16';c.font='700 10px "Archivo Narrow",Arial';c.textAlign='center';c.fillText(n,x,y+3.6)}
  /* poder ligado: brilho dourado pulsando no chão */
  if(t.podT>0){const q=.5+.5*Math.sin(S.time*12);c.fillStyle=`rgba(255,226,122,${.35+q*.35})`;c.beginPath();c.ellipse(t.x,t.y+3,27+q*4,11+q*2,0,0,7);c.fill()}
  c.fillStyle='#1d1a16';c.beginPath();c.ellipse(t.x,t.y+3,19,8,0,0,7);c.fill();
  c.fillStyle=col;c.beginPath();c.ellipse(t.x,t.y+1,17,6.6,0,0,7);c.fill();
  const scale=LOOKS[t.key].hs?1.28:1.05;
  if(t.T.building)predio(c,t.x,t.y+1,S.time,t.a,t.T.building);
  c.save();c.translate(t.x,t.y+1);gear(c,t.look,'b',S.time);c.restore();
  if(t.T.atk==='plane'){
    if(t.key==='musk'){
      c.fillStyle='#3a3f48';rr(c,t.x-22,t.y-6,44,14,3);c.fillStyle='#f2b705';c.fillRect(t.x-18,t.y-3,36,2);c.fillRect(t.x-18,t.y+3,36,2);
      c.fillStyle='#8a909c';c.fillRect(t.x+16,t.y-40,4,36);c.fillRect(t.x+4,t.y-36,14,3);c.fillRect(t.x+4,t.y-24,14,3);
      c.fillStyle='#ff4040';disc(c,t.x+18,t.y-42,2.2);
    }else{
      c.fillStyle='#45454d';rr(c,t.x-20,t.y-5,40,12,3);c.fillStyle='#f3d76b';for(let i=0;i<3;i++)c.fillRect(t.x-14+i*11,t.y,7,2);
      c.fillStyle='#6a4a2a';c.fillRect(t.x+15,t.y-24,2,20);c.fillStyle='#ff8a3c';c.beginPath();c.moveTo(t.x+17,t.y-24);c.lineTo(t.x+31,t.y-20);c.lineTo(t.x+17,t.y-16);c.fill();
    }
  }else if(t.T.tank){
    drawTank(c,t.x,t.y-8,t.aim,t.a,t.kick>0,t.T.tank);
  }else if(!t.T.building){
    /* dancinha: o corpo inteiro balança no lugar enquanto ataca */
    const danca=t.dance>0?Math.sin(S.time*24):0;
    if(danca){c.save();c.translate(t.x,t.y+1);c.rotate(danca*.16);c.translate(danca*3,0);c.translate(-t.x,-t.y-1)}
    /* pulinho de alegria logo depois de comprar uma evolução */
    const agora=performance.now(),pulo=t.puloAte>agora?Math.sin((1-(t.puloAte-agora)/350)*Math.PI)*9:0;
    char(c,t.look,t.x,t.y+1-(t.kick>0?2:0)-pulo,scale,S.time,{aim:t.T.atk==='none'||t.T.atk==='aura'?-1.15:t.aim,shadow:false});
    if(danca)c.restore();
  }
  if(t.s.pet)drawXuxucao(t);
  if(t.s.teto&&t.caixa)label(c,t.caixa>=t.s.teto?'COFRE CHEIO':'R$ '+t.caixa.toLocaleString('pt-BR'),t.x,t.y-(20+(2+t.a)*12)-32,12,t.caixa>=t.s.teto?'#ffe27a':'#b6ffb0');
  if(t.T.atk==='none'&&t.s.auraR<1000){
    const f=(S.time*.7+t.id*.13)%1;c.strokeStyle=t.s.dmgB?'#f2b705':'#7fd4ff';c.globalAlpha=(1-f)*.45;c.lineWidth=2;c.beginPath();c.arc(t.x,t.y,t.s.auraR*f,0,7);c.stroke();c.globalAlpha=1;
  }
  if(t.T.atk!=='none'&&(t.auraMul>1||t.dmgMul>1||t.rangeMul>1)){c.fillStyle='#ffe27a';c.strokeStyle='#1d1a16';c.lineWidth=1.2;c.beginPath();c.moveTo(t.x+14,t.y-30);c.lineTo(t.x+19,t.y-22);c.lineTo(t.x+9,t.y-22);c.closePath();c.fill();c.stroke()}
  const n=t.a+t.b;
  for(let i=0;i<n;i++){c.fillStyle=i<t.a?'#f2b705':'#c8102e';disc(c,t.x-(n-1)*3.5+i*7,t.y+11,2.6)}
  if(t.stun>0){c.fillStyle='#14151a';rr(c,t.x-8,t.y-58,16,13,2.5);c.fillStyle='#7fd4ff';c.fillRect(t.x-6,t.y-56,12,9);label(c,cfg().stun,t.x,t.y-62,11,'#fff')}
  if(t.T.atk==='aura'){
    const f=(S.time*2+t.id)%1;c.fillStyle=t.s.cold?`rgba(200,235,250,${.8-f*.8})`:`rgba(255,160,70,${.5-f*.5})`;disc(c,t.x+11,t.y-20-f*18,3+f*4);
  }
}
/* adversários comuns: cada tipo, cor de pele e passo da caminhada é desenhado uma vez numa imagem e depois só copiado.
   Nas rodadas cheias isso tira muito peso do celular; chefões continuam desenhados ao vivo porque mexem mais. */
const SPR={},SPR_F=8;let sprK=0,sprN=0;
function andando(c,e,x,y){
  const T=e.T,s=T.s,L=LOOKOF(e.type),v=L.skin?-1:(e.ph*13|0)%4;
  const f=e.stun>0?SPR_F:Math.floor((((S.time*11+e.ph)/(2*Math.PI))%1+1)%1*SPR_F)%SPR_F;
  if(sprK!==K){for(const k in SPR)delete SPR[k];sprK=K;sprN=0}
  const key=e.type+'|'+v+'|'+f;let oc=SPR[key];
  if(!oc){
    if(sprN>600){char(c,L,x,y,s,S.time,{walk:e.stun<=0,ph:e.ph,aim:-1.2});return}
    const bw=56*s,bh=78*s,ox=28*s,oy=70*s,d=K;
    oc=document.createElement('canvas');oc.width=Math.ceil(bw*d);oc.height=Math.ceil(bh*d);
    const o=oc.getContext('2d');o.scale(d,d);o.translate(ox,oy);
    /* o passo f vira o mesmo balanço de pernas que a caminhada ao vivo teria */
    const tf=f===SPR_F?0:(f+.5)/SPR_F*2*Math.PI/11;
    char(o,v<0?L:{...L,skin:SK[v]},0,0,s,tf,{walk:f<SPR_F,ph:0,aim:-1.2});
    SPR[key]=oc;sprN++;
  }
  c.drawImage(oc,x-28*s,y-70*s,56*s,78*s);
}
function drawEnemy(e){
  const c=g,T=e.T,p=posAt(e.d,e.via);if(p.dx)e.face=p.dx>0?1:-1;
  /* a pose do veículo vem de um eixo dianteiro e um traseiro, então ele faz a curva em vez de virar de uma vez */
  const half=(T.w||30)*.5,fr=T.veh?posAt(e.d+half,e.via):p,bk=T.veh?posAt(e.d-half,e.via):p,ang=Math.atan2(fr.y-bk.y,fr.x-bk.x);
  const y=T.veh?(fr.y+bk.y)/2:p.y+9,x=T.veh?(fr.x+bk.x)/2:p.x+e.off*.7;
  c.save();
  if(e.pushLeft>0){c.translate(x,y);c.rotate(-.38*e.face);c.translate(-x,-y)}
  /* cores fáceis: contorno escuro no chão de cada adversário e círculo tracejado no Isentão */
  if(OPC.daltonico&&!T.veh){c.strokeStyle='#000000aa';c.lineWidth=2;c.beginPath();c.ellipse(x,y+1,11*T.s,4.4*T.s,0,0,7);c.stroke();if(T.camo){c.strokeStyle='#fff';c.setLineDash([4,3]);c.beginPath();c.arc(x,y-T.s*20,T.s*24,0,7);c.stroke();c.setLineDash([])}}
  if(ehCamo(e))c.globalAlpha=e.someT>0?.4:.62;
  /* chefão blindado: anel cinza em volta enquanto dura */
  if(e.blindT>0){c.strokeStyle='#9aa6b2';c.lineWidth=3;c.beginPath();c.arc(x,y-T.s*20,T.s*22,0,7);c.stroke()}
  if(T.veh==='moto')moto(c,x,y,T.s,S.time+e.ph,e.face,e.ph,T.red,Math.abs(Math.cos(ang))<.6);
  else if(T.veh)truck(c,x,y,T.w,ang,T.veh,T.red);
  else if(T.boss||window.__semCache)char(c,LOOKOF(e.type),x,y,T.s,S.time,{walk:e.stun<=0,ph:e.ph,aim:T.boss?-1.4+Math.sin(S.time*2)*.3:-1.2});
  else andando(c,e,x,y);
  c.restore();
  if(e.shield>0){c.strokeStyle='#7fd4ff';c.lineWidth=3;c.globalAlpha=.75;c.beginPath();c.arc(x,y-T.r,T.r+6,0,7);c.stroke();c.globalAlpha=1}
  if(!T.boss&&e.hp<e.max)bar(c,x-13,y-(T.veh?46:T.s*44),26,3,e.hp/e.max,OPC.daltonico?'#4aa8ff':'#35c46b');
  if(T.boss)label(c,T.nome,x,y-T.s*50,14,'#ffe27a');
  if(e.pushLeft>0){c.strokeStyle='#eef9ff';c.lineWidth=2.4;for(const q of[-18,-8,2]){c.beginPath();c.moveTo(x+e.face*14,y+q);c.bezierCurveTo(x+e.face*24,y+q-5,x+e.face*30,y+q+5,x+e.face*40,y+q);c.stroke()}}
  if(e.censorT>0){
    const by=T.veh?y-22:y-T.s*31,bw=Math.max(58,T.r*2.4);
    c.fillStyle='#0b0b0d';c.fillRect(x-bw/2,by-8,bw,15);label(c,'CENSURADO',x,by+3.5,11,'#fff');
  }else if(e.jailT>0){
    const top=T.veh?y-32:y-T.s*48,bot=T.veh?y+16:y+3,w=Math.max(34,T.r*2.3);
    c.fillStyle='rgba(20,22,28,.2)';c.fillRect(x-w/2,top,w,bot-top);
    c.strokeStyle='#3a3f48';c.lineWidth=2.4;c.strokeRect(x-w/2,top,w,bot-top);
    c.beginPath();for(let i=1;i<5;i++){const bx=x-w/2+w*i/5;c.moveTo(bx,top);c.lineTo(bx,bot)}c.stroke();
    label(c,'PRESO',x,top-5,12,'#ffd9a0');
  }else if(e.chairT>0)label(c,'CADEIRADA!',x,y-T.s*44,12,'#ffe27a');
  else if(e.sleepT>0)label(c,'zzz',x,y-T.s*44,13,'#cfe6ff');
  else if(e.slipT>0)label(c,'ESCORREGOU!',x,y-T.s*44,12,'#ffe27a');
  else if(e.tripT>0)label(c,'viajando',x,y-T.s*44,12,`hsl(${(S.time*240)%360},90%,75%)`);
  else if(e.danceT>0)label(c,'dançando',x+Math.sin(S.time*14+e.ph)*4,y-T.s*44,12,'#ffb6d9');
  else if(e.rotT>0)label(c,e.rot,x,y-T.s*44,12,'#ffe27a');
  else if(e.stun>0)label(c,cfg().stunE,x,y-T.s*44,12,'#ffd9a0');
}
function planeShape(c,tank){
  c.beginPath();c.moveTo(6,-4);c.lineTo(-11,-34);c.lineTo(-21,-34);c.lineTo(-9,-4);c.lineTo(-9,4);c.lineTo(-21,34);c.lineTo(-11,34);c.lineTo(6,4);c.closePath();c.fill();
  c.beginPath();c.moveTo(-25,-4);c.lineTo(-36,-15);c.lineTo(-42,-15);c.lineTo(-33,-4);c.lineTo(-33,4);c.lineTo(-42,15);c.lineTo(-36,15);c.lineTo(-25,4);c.closePath();c.fill();
  c.beginPath();c.moveTo(-38,-5);c.lineTo(24,-6.5);c.quadraticCurveTo(44,-3,44,0);c.quadraticCurveTo(44,3,24,6.5);c.lineTo(-38,5);c.closePath();c.fill();
  if(tank){rr(c,-22,-39,20,6,3);rr(c,-22,33,20,6,3)}
}
/* avião visto de cima, com o nariz apontando para onde voa e Janja na janela sempre em pé */
function rocketShape(c){
  c.beginPath();c.moveTo(-30,-11);c.lineTo(16,-12);c.quadraticCurveTo(40,-9,48,0);c.quadraticCurveTo(40,9,16,12);c.lineTo(-30,11);c.closePath();c.fill();
  c.beginPath();c.moveTo(-12,-11);c.lineTo(-34,-27);c.lineTo(-39,-24);c.lineTo(-30,-10);c.closePath();c.fill();
  c.beginPath();c.moveTo(-12,11);c.lineTo(-34,27);c.lineTo(-39,24);c.lineTo(-30,10);c.closePath();c.fill();
}
/* foguete visto de cima, com o nariz para onde voa e o Musk na janela sempre em pé */
function drawRocket(p,t){
  const c=g,A=t.a,B=t.b,body=A>=3?'#e9c55a':'#dfe3e8',fl=.8+Math.sin(S.time*40+p.x)*.2,fogo=A>=2?1.5:1;
  c.save();c.translate(p.x+7,p.y+26);c.rotate(p.h);c.scale(.85,.85);c.fillStyle='#0003';rocketShape(c);c.restore();
  c.save();c.translate(p.x,p.y);c.rotate(p.h);
  for(const[k,w,l]of[['#ff7a1a',8,30],['#ffd24a',4.6,18]]){c.fillStyle=k;c.beginPath();c.moveTo(-29,-w);c.lineTo(-29-l*fl*fogo,0);c.lineTo(-29,w);c.fill()}
  if(A>=2){c.fillStyle='#8a909c';for(const q of[-16,16])rr(c,-26,q-3.4,26,6.8,3)}
  c.fillStyle=body;rocketShape(c);c.strokeStyle='#1d1a16';c.lineWidth=1.2;c.stroke();
  c.fillStyle=B>=1?'#c8102e':'#2a2f38';c.fillRect(-24,-11.4,5,22.8);
  c.beginPath();c.moveTo(30,-8.6);c.quadraticCurveTo(44,-5,48,0);c.quadraticCurveTo(44,5,30,8.6);c.closePath();c.fill();
  if(A>=1){c.save();c.translate(-10,0);c.rotate(-p.h);c.fillStyle='#17181d';c.font='700 13px Arial';c.textAlign='center';c.fillText('X',0,4.6);c.restore()}
  c.save();c.translate(12,0);c.rotate(-p.h);c.beginPath();c.arc(0,0,11,0,7);c.clip();c.fillStyle='#bfe3f5';c.fillRect(-12,-12,24,24);char(c,LOOKS.musk,0,17,.62,S.time,{aim:-1.2,shadow:false});c.restore();
  c.strokeStyle='#1d1a16';c.lineWidth=1.6;c.beginPath();c.arc(12,0,11,0,7);c.stroke();
  c.restore();
}
function drawPlane(p,t){
  if(t.key==='musk'){drawRocket(p,t);return}
  const c=g,s=.92,A=t.a,B=t.b,body=A>=3?'#e9c55a':'#f7f5ee',accent=A>=1?'#2456a6':'#c8102e';
  c.save();c.translate(p.x+7,p.y+26);c.rotate(p.h);c.scale(s*.9,s*.9);c.fillStyle='#0003';planeShape(c,B>=2);c.restore();
  c.save();c.translate(p.x,p.y);c.rotate(p.h);c.scale(s,s);
  c.strokeStyle='#ffffff66';c.lineWidth=2;c.beginPath();c.moveTo(-20,-34);c.lineTo(-62,-34);c.moveTo(-20,34);c.lineTo(-62,34);c.stroke();
  if(A>=2){c.fillStyle='#3a3a40';for(const q of[-20,20])rr(c,-6,q-3.4,20,6.8,3)}
  c.fillStyle=body;planeShape(c,B>=2);
  c.strokeStyle='#1d1a16';c.lineWidth=1.2;c.stroke();
  c.fillStyle=accent;c.fillRect(-38,-1.4,62,2.8);
  c.beginPath();c.moveTo(-36,-15);c.lineTo(-42,-15);c.lineTo(-37,-8);c.fill();c.beginPath();c.moveTo(-36,15);c.lineTo(-42,15);c.lineTo(-37,8);c.fill();
  c.fillStyle='#c8102e';star(c,-14,-24,4);star(c,-14,24,4);
  if(A>=1){c.fillStyle='#f2b705';c.fillRect(-21,-35,10,2.4);c.fillRect(-21,32.6,10,2.4)}
  if(B>=1){for(const[x,y,k]of[[-11,-15,'#2456a6'],[-16,-29,'#1f7a4d'],[-11,15,'#e2679b'],[-16,29,'#f2b705']]){c.fillStyle=k;c.fillRect(x-3,y-2.4,6,4.8)}}
  c.fillStyle='#9fd6ee';c.beginPath();c.moveTo(34,-4);c.quadraticCurveTo(42,-2,42,0);c.quadraticCurveTo(42,2,34,4);c.fill();
  c.save();c.translate(12,0);c.rotate(-p.h);c.beginPath();c.arc(0,0,11,0,7);c.clip();c.fillStyle='#bfe3f5';c.fillRect(-12,-12,24,24);char(c,LOOKS.janja,0,17,.62,S.time,{aim:-1.2,shadow:false});c.restore();
  c.strokeStyle='#1d1a16';c.lineWidth=1.6;c.beginPath();c.arc(12,0,11,0,7);c.stroke();
  c.restore();
}
function drawPlanta(f){
  const c=g,cresce=Math.min(1,(f.max-f.life)/.35),fade=Math.min(1,f.life/.5),maior=f.r>42?1.3:1;
  c.save();c.translate(f.x,f.y);c.globalAlpha=fade;
  c.fillStyle='rgba(90,200,90,.16)';disc(c,0,0,f.r);
  c.strokeStyle='rgba(120,220,120,.6)';c.lineWidth=1.6;c.beginPath();c.arc(0,0,f.r,0,7);c.stroke();
  c.fillStyle='#0003';c.beginPath();c.ellipse(0,5,13,4.4,0,0,7);c.fill();
  c.translate(0,5);c.scale(cresce*maior,cresce*maior);c.rotate(Math.sin(S.time*3+f.ph)*.07);
  c.fillStyle='#fff';
  if(f.tipo===0){
    c.fillStyle='#3f8a34';c.fillRect(-1.8,-40,3.6,40);
    c.strokeStyle='#5fae48';c.lineWidth=3.4;c.lineCap='round';c.beginPath();c.moveTo(0,-12);c.quadraticCurveTo(-14,-20,-17,-10);c.moveTo(0,-20);c.quadraticCurveTo(14,-30,18,-19);c.moveTo(0,-30);c.quadraticCurveTo(-12,-40,-15,-31);c.stroke();
    c.fillStyle='#f2c83a';c.beginPath();c.ellipse(5,-24,4.2,9.6,.12,0,7);c.fill();
    c.fillStyle='#d9a400';for(let i=0;i<4;i++)c.fillRect(3,-31+i*4.2,4.6,1);
  }else if(f.tipo===1){
    c.fillStyle='#3f8a34';c.fillRect(-1.6,-30,3.2,30);
    c.strokeStyle='#5fae48';c.lineWidth=3.4;c.lineCap='round';c.beginPath();c.moveTo(0,-10);c.quadraticCurveTo(12,-18,16,-9);c.moveTo(0,-16);c.quadraticCurveTo(-12,-24,-16,-15);c.stroke();
    c.fillStyle='#f6cf1d';for(let i=0;i<10;i++){const a=i*Math.PI/5;disc(c,Math.cos(a)*9,-36+Math.sin(a)*9,4)}
    c.fillStyle='#6a4326';disc(c,0,-36,6.6);
  }else{
    c.fillStyle='#2f7a3e';disc(c,0,-13,13);disc(c,-10,-8,8.6);disc(c,10,-8,8.6);
    c.fillStyle='#5fae48';disc(c,-4,-17,5.4);disc(c,6,-12,5);
    c.strokeStyle='#d9c060';c.lineWidth=2.6;c.lineCap='round';c.beginPath();for(const[x,y]of[[-9,-10],[4,-20],[10,-6]]){c.moveTo(x,y);c.lineTo(x+4,y+3)}c.stroke();
  }
  c.restore();
}
function drawFire(f){
  if(f.planta){drawPlanta(f);return}
  if(f.lama){
    /* piquete (cones e faixa no chão) ou trecho de mata (moitas) */
    const c=g;c.save();c.translate(f.x,f.y);c.globalAlpha=Math.min(1,f.life/.5);
    c.fillStyle=f.mata?'rgba(53,140,70,.28)':'rgba(200,16,46,.2)';c.beginPath();c.ellipse(0,0,f.r,f.r*.55,0,0,7);c.fill();
    for(let i=0;i<5;i++){const a=i/5*6.28+f.ph,x=Math.cos(a)*f.r*.62,y=Math.sin(a)*f.r*.32;
      if(f.mata){c.fillStyle='#2f7d3c';disc(c,x,y-4,6);c.fillStyle='#4aa356';disc(c,x-2,y-7,4)}
      else{c.fillStyle='#f28a1e';c.beginPath();c.moveTo(x-5,y+3);c.lineTo(x,y-11);c.lineTo(x+5,y+3);c.closePath();c.fill();c.fillStyle='#fff';c.fillRect(x-3,y-5,6,2)}}
    c.restore();return;
  }
  const c=g,fade=Math.min(1,f.life/.5),t=S.time*9+f.ph,burn=f.life/f.max;
  c.save();c.translate(f.x,f.y);c.globalAlpha=fade;
  c.fillStyle='rgba(255,130,40,.16)';disc(c,0,0,f.r);
  c.strokeStyle='rgba(255,150,60,.55)';c.lineWidth=1.6;c.beginPath();c.arc(0,0,f.r,0,7);c.stroke();
  c.fillStyle='#0003';c.beginPath();c.ellipse(0,5,15,5,0,0,7);c.fill();
  c.fillStyle='#3a2616';c.fillRect(-3,-16,6,22);
  c.fillStyle=burn>.35?'#3f6a2c':'#2a2420';disc(c,0,-26,13);disc(c,-10,-20,9);disc(c,10,-20,9);
  for(const[x,y,w,h]of[[-11,-16,6,17],[0,-30,8,24],[11,-16,6,17],[-5,-24,5,15],[6,-24,5,15]]){
    const q=h*(1+Math.sin(t+x)*.22);
    c.fillStyle='#ff7a1c';c.beginPath();c.moveTo(x-w,y+4);c.quadraticCurveTo(x+Math.sin(t+y)*2,y-q*1.2,x+w,y+4);c.fill();
    c.fillStyle='#ffd24a';c.beginPath();c.moveTo(x-w*.55,y+4);c.quadraticCurveTo(x,y-q*.55,x+w*.55,y+4);c.fill();
  }
  c.restore();
}
/* o muro vale para as duas avenidas: no trecho do desvio, aparece nas duas */
function drawWall(w){
  drawWallEm(w,0);
  for(const v of VIAS().slice(1)){const a=posAt(w.d,0),b=posAt(w.d,v);if(Math.hypot(a.x-b.x,a.y-b.y)>5)drawWallEm(w,v)}
}
function drawWallEm(w,v){
  const c=g,p=posAt(w.d,v),q=posAt(w.d+6,v);
  c.save();c.translate(p.x,p.y);c.rotate(Math.atan2(q.y-p.y,q.x-p.x));c.globalAlpha=Math.min(1,w.life/.3);
  if(w.truck){
    /* caminhão atravessado, visto de cima */
    c.fillStyle='#0004';rr(c,-7,-27,20,58,3);
    c.fillStyle='#17181d';for(const y of[-24,-8,8,22])for(const x of[-11.5,8.5])c.fillRect(x,y-4,3,8);
    c.fillStyle='#1f7a4d';rr(c,-9.5,-15,19,44,2);
    c.fillStyle='#f6cf1d';c.fillRect(-2.2,-13,4.4,40);
    c.fillStyle='#2456a6';rr(c,-9,-31,18,14,3);
    c.fillStyle='#9fd6ee';rr(c,-6.8,-29.6,13.6,4.4,1);
    c.strokeStyle='#17181d';c.lineWidth=1;c.strokeRect(-9.5,-15,19,44);
    c.restore();
    label(c,'BLOQUEIO',p.x,p.y-38,11,'#ffe27a');
    if(w.hpMax)bar(g,p.x-16,p.y-32,32,4,Math.max(0,w.hp/w.hpMax),'#f2b705');
    return;
  }
  c.fillStyle='#0004';c.fillRect(-5,-25,16,50);
  c.fillStyle='#a8583c';c.fillRect(-7,-26,14,52);
  c.strokeStyle='#6f3524';c.lineWidth=1;c.beginPath();for(let y=-26;y<26;y+=6.5){c.moveTo(-7,y);c.lineTo(7,y)}c.moveTo(0,-26);c.lineTo(0,26);c.stroke();
  c.restore();
  /* vida do bloqueio */
  if(w.hpMax)bar(g,p.x-14,p.y-34,28,4,Math.max(0,w.hp/w.hpMax),'#f2b705');
}
function drawDrone(a){
  const c=g,hy=a.y-24+Math.sin(S.time*5+a.ph)*2.4;
  c.fillStyle='#0003';c.beginPath();c.ellipse(a.x,a.y+6,13,4,0,0,7);c.fill();
  c.fillStyle='#2e3440';rr(c,a.x-7,hy-3,14,7,3);
  c.strokeStyle='#2e3440';c.lineWidth=1.8;c.beginPath();c.moveTo(a.x-14,hy-4);c.lineTo(a.x+14,hy-4);c.stroke();
  const w=6*Math.abs(Math.sin(S.time*30+a.ph));
  c.strokeStyle='#cfd6df';c.lineWidth=1.6;c.beginPath();for(const sx of[-14,14]){c.moveTo(a.x+sx-w-1,hy-6);c.lineTo(a.x+sx+w+1,hy-6)}c.stroke();
  c.fillStyle='#7fd4ff';disc(c,a.x,hy+1,2);c.fillStyle='#ff4040';disc(c,a.x-5,hy+1,1);
  if(a.beam>0){c.strokeStyle='#7fd4ff';c.lineWidth=2.4;c.beginPath();c.moveTo(a.x,hy+3);c.lineTo(a.bx,a.by);c.stroke()}
}
/* dinossauros da Marina: desenhados olhando para a direita, a.face espelha */
function drawDino(a){
  const c=g,st=a.walk?Math.sin(S.time*10+a.ph)*2.6:0,bite=a.beam>0,[cor,esc]=a.cor;
  if(a.view==='front'||a.view==='back'){
    const front=a.view==='front';
    c.save();c.translate(a.x,a.y+10);c.scale(a.scale,a.scale);
    c.fillStyle='#0003';c.beginPath();c.ellipse(0,1,13,3.6,0,0,7);c.fill();
    c.fillStyle=esc;c.fillRect(-9,-13+st*.5,6,13-st*.5);c.fillRect(3,-13-st*.5,6,13+st*.5);
    c.fillStyle=cor;c.beginPath();c.ellipse(0,-20,11.5,10.5,0,0,7);c.fill();
    c.strokeStyle=esc;c.lineWidth=2.4;c.lineCap='round';c.beginPath();c.moveTo(-10,-23);c.lineTo(-13,-17);c.moveTo(10,-23);c.lineTo(13,-17);c.stroke();
    c.fillStyle=cor;c.fillRect(-5.5,-35,11,12);rr(c,-10,-46,20,15,5);
    if(front){
      c.fillStyle='#ffffff40';c.beginPath();c.ellipse(0,-18,6.6,7.6,0,0,7);c.fill();
      c.fillStyle=esc;rr(c,-7.5,-38,15,9,3);
      if(bite){c.fillStyle='#5a1a1a';rr(c,-5.6,-34.4,11.2,6.4,2)}
      c.fillStyle='#fff';for(let i=0;i<4;i++){c.beginPath();c.moveTo(-5.6+i*2.8,-34.4);c.lineTo(-4.2+i*2.8,-31.6);c.lineTo(-2.8+i*2.8,-34.4);c.fill()}
      disc(c,-5.4,-42,2.4);disc(c,5.4,-42,2.4);
      c.fillStyle='#17181d';disc(c,-5.4,-41.6,1.25);disc(c,5.4,-41.6,1.25);
    }else{
      c.fillStyle=cor;c.beginPath();c.moveTo(-6,-16);c.quadraticCurveTo(0,-6,0,-1);c.quadraticCurveTo(0,-6,6,-16);c.closePath();c.fill();
      c.fillStyle=esc;for(const y of[-44,-36,-28,-20]){c.beginPath();c.moveTo(-3.2,y+6);c.lineTo(0,y);c.lineTo(3.2,y+6);c.fill()}
    }
    c.restore();
    return;
  }
  c.save();c.translate(a.x,a.y+10);c.scale(a.face*a.scale,a.scale);
  c.fillStyle='#0003';c.beginPath();c.ellipse(-2,1,17,3.6,0,0,7);c.fill();
  c.fillStyle=cor;c.beginPath();c.moveTo(-5,-22);c.quadraticCurveTo(-20,-23,-31,-13);c.quadraticCurveTo(-18,-12,-5,-11);c.fill();
  c.fillStyle=esc;c.fillRect(-7,-13+st*.5,5.4,13-st*.5);c.fillRect(1,-13-st*.5,5.4,13+st*.5);
  c.fillStyle=esc;for(const x of[-13,-8,-3,2]){c.beginPath();c.moveTo(x-3,-24.5);c.lineTo(x,-31);c.lineTo(x+3,-25.5);c.fill()}
  c.fillStyle=cor;c.beginPath();c.ellipse(0,-19,11.5,9,-.25,0,7);c.fill();
  c.beginPath();c.moveTo(2,-25);c.lineTo(9,-37);c.lineTo(16,-31);c.lineTo(10,-15);c.fill();
  c.save();c.translate(9,-33);c.rotate(bite?.55:.08);c.fillStyle=esc;rr(c,0,0,15,3.6,1.4);c.restore();
  c.fillStyle='#fff';for(let i=0;i<5;i++){c.beginPath();c.moveTo(12+i*2.8,-33.2);c.lineTo(13.4+i*2.8,-30.2);c.lineTo(14.8+i*2.8,-33.2);c.fill()}
  c.fillStyle=cor;rr(c,7,-42,20,9.4,3.4);
  c.fillStyle='#fff';disc(c,14,-38.4,2.3);c.fillStyle='#17181d';disc(c,14.7,-38.4,1.2);
  c.strokeStyle=esc;c.lineWidth=2.2;c.lineCap='round';c.beginPath();c.moveTo(8,-20);c.lineTo(13,-17);c.stroke();
  c.restore();
}
/* Xuxucão: cachorro laranja de barriga amarela; desenhado olhando para a direita, petFace espelha */
function drawXuxucao(t){
  const c=g,f=t.petFace||(t.petO<0?-1:1),bite=t.petBite>0,b=Math.sin(S.time*5+t.id)*.8,or=t.s.petOr||'#f28a1e',esc=t.s.petEsc||'#c96a10',am=t.s.petAm||'#f6cf1d';
  c.save();c.translate(t.x+(t.petO||32)+(bite?f*9:0),t.y+3);c.scale(f*.85,.85);
  c.fillStyle='#0003';c.beginPath();c.ellipse(0,1,14,3.6,0,0,7);c.fill();
  c.fillStyle=or;rr(c,-9,-12,7.4,12,2);rr(c,1.6,-12,7.4,12,2);
  c.fillStyle=esc;rr(c,-10,-3,9.6,4,1.6);rr(c,.6,-3,9.6,4,1.6);
  c.strokeStyle=or;c.lineWidth=4.8;c.lineCap='round';c.beginPath();c.moveTo(-10,-24);c.lineTo(-14,-13);c.moveTo(10,-24);c.lineTo(bite?18:14,bite?-22:-13);c.stroke();
  c.fillStyle=or;c.beginPath();c.ellipse(0,-20,12,12.5,0,0,7);c.fill();
  c.fillStyle=am;c.beginPath();c.ellipse(0,-18.5,7.2,9.4,0,0,7);c.fill();
  c.fillStyle='#3a2a20';rr(c,-7,-32,14,3.2,1.2);
  c.save();c.translate(0,b);
  c.fillStyle=or;c.beginPath();c.ellipse(-8.4,-54,4.2,7,-.28,0,7);c.fill();c.beginPath();c.ellipse(10.4,-54,4.2,7,.28,0,7);c.fill();
  c.fillStyle=am;c.beginPath();c.ellipse(-8.4,-53,2,4,-.28,0,7);c.fill();c.beginPath();c.ellipse(10.4,-53,2,4,.28,0,7);c.fill();
  c.fillStyle=or;c.beginPath();c.ellipse(1,-42,12.5,11.5,0,0,7);c.fill();
  c.fillStyle='#f6a24a';c.beginPath();c.ellipse(5.4,-37.5,8,6.2,0,0,7);c.fill();
  if(bite){c.fillStyle='#5a1a1a';c.beginPath();c.ellipse(6.4,-33.5,6,4.2,0,0,7);c.fill();c.fillStyle='#fff';for(let i=0;i<4;i++){c.beginPath();c.moveTo(1.6+i*2.8,-36.6);c.lineTo(3+i*2.8,-33.8);c.lineTo(4.4+i*2.8,-36.6);c.fill()}}
  else{c.strokeStyle='#5a2a10';c.lineWidth=1.2;c.beginPath();c.arc(5.4,-36.4,5,.25,Math.PI-.25);c.stroke()}
  c.fillStyle='#14110f';c.beginPath();c.ellipse(9.4,-41,4,3.2,0,0,7);c.fill();c.fillStyle='#ffffff90';disc(c,8.2,-42,.9);
  c.fillStyle='#fff';disc(c,-2.4,-47,3);disc(c,5.4,-47.4,2.8);
  c.fillStyle='#14110f';disc(c,-1.4,-47,1.7);disc(c,6.4,-47.4,1.6);
  c.fillStyle=am;c.fillRect(-5.4,-51.6,5.4,1.4);c.fillRect(3,-52,5.4,1.4);
  c.restore();
  c.restore();
}
/* ratos do Ratinho: mesma lógica de direção dos dinossauros */
function drawRato(a){
  const c=g,st=a.walk?Math.sin(S.time*16+a.ph)*1.8:0,bite=a.beam>0,pelo='#c2bdb4',rosa='#e39aa8';
  c.save();c.translate(a.x,a.y+10);
  if(a.view==='front'||a.view==='back'){
    const front=a.view==='front';
    c.scale(a.scale,a.scale);
    c.fillStyle='#0003';c.beginPath();c.ellipse(0,1,10,3,0,0,7);c.fill();
    if(!front){c.strokeStyle=rosa;c.lineWidth=2;c.lineCap='round';c.beginPath();c.moveTo(0,-4);c.quadraticCurveTo(7+st,0,2,7);c.stroke()}
    c.fillStyle=rosa;disc(c,-5,-1+st*.4,2.2);disc(c,5,-1-st*.4,2.2);
    c.fillStyle=pelo;c.beginPath();c.ellipse(0,-9,9.5,8.5,0,0,7);c.fill();
    disc(c,-7,-20,4);disc(c,7,-20,4);disc(c,0,-15,7.4);
    c.fillStyle=rosa;disc(c,-7,-20,2.3);disc(c,7,-20,2.3);
    if(front){
      c.fillStyle='#17181d';disc(c,-3,-16.4,1.4);disc(c,3,-16.4,1.4);
      c.fillStyle=rosa;disc(c,0,-13,1.7);
      c.fillStyle='#fff';c.fillRect(-1.5,-11.4,1.3,bite?4:2.6);c.fillRect(.2,-11.4,1.3,bite?4:2.6);
    }
    c.restore();
    return;
  }
  c.scale(a.face*a.scale,a.scale);
  c.fillStyle='#0003';c.beginPath();c.ellipse(0,1,14,3,0,0,7);c.fill();
  c.strokeStyle=rosa;c.lineWidth=2;c.lineCap='round';c.beginPath();c.moveTo(-11,-6);c.quadraticCurveTo(-21,-11+st,-25,-3);c.stroke();
  c.fillStyle=rosa;disc(c,-6,-1+st*.5,2.2);disc(c,5,-1-st*.5,2.2);
  c.fillStyle=pelo;c.beginPath();c.ellipse(-1,-8,12,7.6,0,0,7);c.fill();
  c.beginPath();c.ellipse(10,-10,7.4,5.6,.15,0,7);c.fill();disc(c,6,-16,3.8);
  c.fillStyle=rosa;disc(c,6,-16,2.2);disc(c,17.4,-9.4,1.6);
  c.fillStyle='#17181d';disc(c,12,-11.6,1.3);
  c.fillStyle='#fff';c.fillRect(13.6,-6,2.4,bite?4.4:2.6);
  c.restore();
}
function drawAlly(a){
  if(a.drone){drawDrone(a);return}
  if(a.rato){drawRato(a);return}
  if(a.dino){drawDino(a);return}
  const c=g,st=a.walk?Math.sin(S.time*12+a.ph)*2:0;
  c.save();c.translate(a.x,a.y+10);c.scale(a.face,1);
  c.fillStyle='#0003';c.beginPath();c.ellipse(0,1,10,3.2,0,0,7);c.fill();
  c.fillStyle='#6a707c';c.fillRect(-6,-7+st*.5,4.4,8);c.fillRect(1.6,-7-st*.5,4.4,8);
  c.fillStyle='#c4cad4';rr(c,-9,-21,18,15,3);
  c.fillStyle='#c8102e';star(c,0,-13.5,4.2);
  c.fillStyle='#8a909c';c.fillRect(-12.4,-19,3.6,10);c.fillRect(8.8,-19,3.6,10);
  c.fillStyle='#dfe4ec';rr(c,-7,-33,14,12,3);
  c.fillStyle='#17222b';rr(c,-5.4,-30,10.8,4.8,1.5);
  c.fillStyle='#ff4040';disc(c,-2.6,-27.6,1.3);disc(c,2.6,-27.6,1.3);
  c.fillStyle='#8a909c';c.fillRect(-.7,-39,1.4,6);c.fillStyle='#ffd24a';disc(c,0,-40,1.8);
  c.restore();
  if(a.beam>0){c.strokeStyle='#ff5a5a';c.lineWidth=2.6;c.beginPath();c.moveTo(a.x,a.y-16);c.lineTo(a.bx,a.by);c.stroke()}
}
function drawShot(p){
  const c=g;c.save();c.translate(p.x,p.y);
  /* poderes do segundo caminho: quem deu meia-volta e os veículos que varrem a avenida */
  if(p.shot==='fiel'){c.scale(p.face||1,1);char(c,p.look,0,12,.8,S.time*1.5,{shadow:false});c.fillStyle='#35c46b';disc(c,0,-40,4);c.restore();return}
  if(p.shot==='trem'||p.shot==='onibus'){
    c.scale(p.face||1,1);const cor=p.shot==='trem'?'#3b3f4a':'#f2b705';
    c.fillStyle='#1d1a16';rr(c,-30,-24,60,26,5);c.fillStyle=cor;rr(c,-28,-22,56,22,4);
    c.fillStyle='#cfe6ff';for(const x of[-20,-8,4])c.fillRect(x,-18,9,8);c.fillStyle='#1d1a16';disc(c,-18,3,5);disc(c,18,3,5);
    if(p.shot==='trem'){c.fillStyle='#c8102e';c.fillRect(-28,-5,56,3);c.fillStyle='#ccc';disc(c,-24,-30+Math.sin(S.time*9)*2,4)}
    c.restore();return;
  }
  if(p.shot==='nave'){c.fillStyle='#1d1a16';c.beginPath();c.ellipse(0,0,28,9,0,0,7);c.fill();c.fillStyle='#ff8fc8';c.beginPath();c.ellipse(0,-1,26,7,0,0,7);c.fill();
    c.fillStyle='#cfe6ff';c.beginPath();c.arc(0,-5,10,Math.PI,0);c.fill();c.fillStyle='#ffe27a';for(const x of[-16,0,16])disc(c,x+Math.sin(S.time*8)*2,2,2.2);c.restore();return}
  if(p.shot==='onda'){c.globalAlpha=.85;c.strokeStyle='#7fd4ff';c.lineWidth=4;for(let i=0;i<3;i++){c.beginPath();c.arc(0,0,12+i*9+Math.sin(S.time*10)*2,-1.2,1.2);c.stroke()}c.globalAlpha=1;c.restore();return}
  if(p.shot==='panfleto'){c.rotate(S.time*16);c.fillStyle='#fff';c.fillRect(-5,-3.5,10,7);c.fillStyle='#c8102e';c.fillRect(-4,-2.2,8,1.6)}
  else if(p.shot==='vento'){c.rotate(p.a);c.strokeStyle='#eef9ff';c.lineWidth=3;c.globalAlpha=.85;for(const q of[-8,0,8]){c.beginPath();c.moveTo(-16,q);c.bezierCurveTo(-6,q-7,2,q+7,14,q);c.stroke()}c.globalAlpha=1}
  else if(p.shot==='imposto'){c.rotate(S.time*12);c.fillStyle='#fff';c.fillRect(-7,-9,14,18);c.fillStyle='#c8102e';c.font='700 13px Arial';c.textAlign='center';c.fillText('%',0,5)}
  else if(p.shot==='picanha'){c.rotate(S.time*10);c.fillStyle='#a62f2a';c.beginPath();c.ellipse(0,0,11,7.5,0,0,7);c.fill();c.fillStyle='#f4e7c8';c.beginPath();c.ellipse(0,-5.5,10,2.6,0,0,7);c.fill()}
  else if(p.shot==='cerveja'){c.rotate(S.time*10);c.fillStyle='#e8a51c';rr(c,-6,-8,12,16,2);c.fillStyle='#fff';disc(c,-3.5,-8,3.2);disc(c,1,-9,3.4);disc(c,4.5,-8,2.6);c.strokeStyle='#e8a51c';c.lineWidth=2.2;c.beginPath();c.arc(7,0,4,-1.4,1.4);c.stroke()}
  else if(p.shot==='mala'){
    const ux=Math.cos(p.a),uy=Math.sin(p.a);
    c.strokeStyle='#ffffffd0';c.lineWidth=3;c.lineCap='round';
    for(const q of[-9,0,9]){c.beginPath();c.moveTo(-ux*18-uy*q,-uy*18+ux*q);c.lineTo(-ux*42-uy*q,-uy*42+ux*q);c.stroke()}
    c.rotate(Math.sin(S.time*9)*.35);
    c.fillStyle='#fff';rr(c,-18,-13,36,28,6);c.beginPath();c.lineWidth=7;c.strokeStyle='#fff';c.arc(0,-14,6,Math.PI,0);c.stroke();
    c.lineWidth=3.2;c.strokeStyle='#4a2c16';c.beginPath();c.arc(0,-14,6,Math.PI,0);c.stroke();
    c.fillStyle='#8a4f24';rr(c,-16,-11,32,24,4);
    c.fillStyle='#f2b705';c.fillRect(-16,-2,32,4.4);c.fillRect(-11,-11,3.4,24);c.fillRect(7.6,-11,3.4,24);
    c.fillStyle='#c8102e';c.fillRect(-4,5,9,5);
  }
  else if(p.shot==='tarja'){c.rotate(p.a);c.fillStyle='#0b0b0d';c.fillRect(-15,-5,30,10);c.fillStyle='#fff';c.fillRect(-11,-1,22,2)}
  else if(p.shot==='morcego'){
    const fl=Math.sin(S.time*26+p.ph);
    c.scale(1.25,1.25);
    for(const sd of[-1,1]){
      c.beginPath();c.moveTo(sd*2,-2);c.quadraticCurveTo(sd*9,-9-fl*5,sd*15,-3-fl*7);c.quadraticCurveTo(sd*11,-2-fl*3,sd*10,2-fl*2);c.quadraticCurveTo(sd*6,0,sd*2,4);c.closePath();
      c.fillStyle='#17141f';c.fill();c.strokeStyle='#e9dcff';c.lineWidth=.8;c.stroke();
    }
    c.fillStyle='#17141f';c.beginPath();c.ellipse(0,1,3.6,5,0,0,7);c.fill();c.strokeStyle='#e9dcff';c.lineWidth=.8;c.stroke();
    c.fillStyle='#17141f';c.beginPath();c.moveTo(-3,-3);c.lineTo(-3.4,-8);c.lineTo(-.8,-5);c.lineTo(.8,-5);c.lineTo(3.4,-8);c.lineTo(3,-3);c.fill();
    c.fillStyle='#ff4040';disc(c,-1.4,-2,.8);disc(c,1.4,-2,.8);
  }
  else if(p.shot==='cruz'){c.rotate(S.time*9);c.fillStyle='#fff';c.fillRect(-4.6,-16,9.2,32);c.fillRect(-12,-8.6,24,9.2);c.fillStyle='#d9a400';c.fillRect(-3,-14.4,6,28.8);c.fillRect(-10.4,-7,20.8,6);c.fillStyle='#fff2b0';c.fillRect(-1,-13,1.6,26)}
  else if(p.shot==='suspenso'){c.rotate(Math.sin(S.time*12)*.4);c.fillStyle='#fff';c.fillRect(-27,-11,54,22);c.fillStyle='#c8102e';c.fillRect(-25.4,-9.4,50.8,18.8);c.fillStyle='#fff';rr(c,-7,-6,4.6,12,1.2);rr(c,2.4,-6,4.6,12,1.2)}
  else if(p.shot==='bibliaSTF'){c.rotate(S.time*9);c.fillStyle='#fff';c.fillRect(-11,-14,22,28);c.fillStyle='#17181d';c.fillRect(-9.4,-12.4,18.8,24.8);c.fillStyle='#d9a400';c.fillRect(-1.2,-9,2.4,18);c.fillRect(-5.6,-4.4,11.2,2.4)}
  else if(p.shot==='vista'){c.rotate(S.time*8);c.fillStyle='#fff';c.fillRect(-14,-11,28,22);c.fillStyle='#d9b873';c.fillRect(-12.4,-9.4,24.8,18.8);c.save();c.scale(.62,.62);ICON.lupa(c);c.restore()}
  else if(p.shot==='infux'){c.rotate(Math.sin(S.time*12)*.35);c.fillStyle='#fff';c.fillRect(-24,-14,48,28);c.fillStyle='#6fa36a';c.fillRect(-22.4,-12.4,44.8,24.8);c.strokeStyle='#e8f0d8';c.lineWidth=1.2;c.strokeRect(-19.6,-9.6,39.2,19.2);c.fillStyle='#e8f0d8';c.beginPath();c.ellipse(0,0,7,8,0,0,7);c.fill();c.fillStyle='#2e5a30';disc(c,0,-2,3);c.beginPath();c.ellipse(0,5,4.4,2.6,0,Math.PI,0);c.fill();for(const x of[-14,14])disc(c,x,0,3.2)}
  else if(p.shot==='autos'){c.rotate(S.time*7);c.fillStyle='#fff';c.fillRect(-16,-13,32,26);for(let i=0;i<3;i++){c.fillStyle=i%2?'#c9a86a':'#d9b873';c.fillRect(-14.4,-11.4+i*7.6,28.8,7)}c.fillStyle='#8a3a2a';c.fillRect(-1.2,-11.4,2.4,22.8)}
  else if(p.shot==='habeas'){c.rotate(S.time*14);c.fillStyle='#fff';c.fillRect(-10,-12,20,24);c.strokeStyle='#17181d';c.lineWidth=.8;c.strokeRect(-10,-12,20,24);c.save();c.translate(0,-3);c.scale(.62,.62);ICON.chave(c);c.restore();c.fillStyle='#9aa0a8';c.fillRect(-7,4,14,1.4);c.fillRect(-7,7.4,10,1.4)}
  else if(p.shot==='calaboca'){c.rotate(Math.sin(S.time*12)*.3);for(const[k,g2]of[['#17181d',1.5],['#fff',0]]){c.fillStyle=k;rr(c,-27-g2,-13-g2,54+g2*2,24+g2*2,6);c.beginPath();c.moveTo(-8,10);c.lineTo(-13,19+g2);c.lineTo(1,10);c.fill()}/* boca fechada com fita: a frase vira imagem */
    c.fillStyle='#c8102e';c.beginPath();c.ellipse(0,-1,11,5,0,0,7);c.fill();c.fillStyle='#8f0b20';c.fillRect(-10,-1.4,20,1);
    c.fillStyle='#bdb6a2';c.save();c.translate(0,-1);c.rotate(.42);c.fillRect(-13,-1.8,26,3.6);c.restore();c.save();c.translate(0,-1);c.rotate(-.42);c.fillRect(-13,-1.8,26,3.6);c.restore()}
  else if(p.shot==='dnaR'){c.rotate(Math.sin(S.time*12)*.4);c.fillStyle='#fff';c.fillRect(-20,-13,40,26);c.fillStyle='#f4e2b8';c.fillRect(-18.4,-11.4,36.8,22.8);c.strokeStyle='#b89a60';c.lineWidth=1;c.beginPath();c.moveTo(-18.4,-11.4);c.lineTo(0,1);c.lineTo(18.4,-11.4);c.stroke();c.save();c.translate(0,5);c.rotate(Math.PI/2);c.scale(.5,.9);ICON.dna(c);c.restore()}
  else if(p.shot==='bolaN'){c.rotate(S.time*12);c.fillStyle='#17181d';disc(c,0,0,13.4);c.fillStyle='#fff';disc(c,0,0,12);c.fillStyle='#17181d';disc(c,0,0,4);for(let i=0;i<5;i++){const a=i*Math.PI*.4;disc(c,Math.cos(a)*9.4,Math.sin(a)*9.4,2.6)}}
  else if(p.shot==='discoG'){c.rotate(S.time*12);c.fillStyle='#fff';disc(c,0,0,15);c.fillStyle='#e0b020';disc(c,0,0,13.4);c.strokeStyle='#b58a10';c.lineWidth=1;for(const r of[10.6,8])  {c.beginPath();c.arc(0,0,r,0,7);c.stroke()}c.fillStyle='#c8102e';disc(c,0,0,5);c.fillStyle='#fff';disc(c,0,0,1.5);c.fillStyle='#fff6';c.fillRect(-1.4,-13,2.8,6)}
  else if(p.shot==='moedaF'){c.rotate(S.time*11);c.fillStyle='#fff';disc(c,0,0,13.5);c.fillStyle='#e0b020';disc(c,0,0,12);c.fillStyle='#8a6a10';c.font='700 15px Arial';c.textAlign='center';c.fillText('$',0,5.4)}
  else if(p.shot==='jujuba'){c.rotate(S.time*9);c.fillStyle='#fff';rr(c,-14,-8.4,28,16.8,8.4);c.fillStyle=['#e2234e','#2bb5e0','#f2b705','#35c46b'][Math.abs(Math.floor(p.a*10))%4];rr(c,-12.4,-6.8,24.8,13.6,6.8);c.fillStyle='#ffffff90';c.fillRect(-7,-4.2,10,2)}
  else if(p.shot==='fita'){c.rotate(S.time*10);c.fillStyle='#fff';rr(c,-16,-11,32,22,3);c.fillStyle='#17181d';rr(c,-14.4,-9.4,28.8,18.8,2);c.fillStyle='#d8d4c8';disc(c,-6.6,0,4.2);disc(c,6.6,0,4.2);c.fillStyle='#17181d';disc(c,-6.6,0,1.6);disc(c,6.6,0,1.6)}
  else if(p.shot==='naoF'){c.rotate(Math.sin(S.time*12)*.35);c.fillStyle='#fff';c.fillRect(-23,-12,46,24);c.fillStyle='#c8102e';c.fillRect(-21.4,-10.4,42.8,20.8);c.strokeStyle='#fff';c.lineWidth=2.6;c.beginPath();c.arc(0,0,7.4,0,7);c.moveTo(-5.2,5.2);c.lineTo(5.2,-5.2);c.stroke()}
  else if(p.shot==='vacinaM'){c.rotate(p.a);c.fillStyle='#fff';c.fillRect(-15,-6.6,24,13.2);c.fillStyle='#bfe3f5';c.fillRect(-13.6,-5,21,10);c.fillStyle='#8a8f98';c.fillRect(-18,-6,4,12);c.fillRect(7,-1.2,12,2.4)}
  else if(p.shot==='pandeiroM'){c.rotate(S.time*11);c.fillStyle='#fff';disc(c,0,0,15);c.fillStyle='#a8583c';disc(c,0,0,13.4);c.fillStyle='#f4ead5';disc(c,0,0,10.2);c.fillStyle='#d9a400';for(let i=0;i<6;i++){const a=i*Math.PI/3;disc(c,Math.cos(a)*11.8,Math.sin(a)*11.8,1.8)}}
  else if(p.shot==='spitfire'){c.fillStyle='#fff';rr(c,-16,-3.6,32,7.2,3);rr(c,-4,-14,8,28,3);c.fillStyle='#5a6a4a';rr(c,-14.6,-2.4,29.2,4.8,2);rr(c,-2.8,-12.8,5.6,25.6,2);c.fillStyle='#c8102e';disc(c,0,-8,1.8);disc(c,0,8,1.8)}
  else if(p.shot==='estrelaS'){c.rotate(S.time*9);c.fillStyle='#fff';star(c,0,0,17);c.fillStyle='#c8102e';star(c,0,0,13.5)}
  else if(p.shot==='chaveP'){c.rotate(S.time*11);c.lineCap='round';for(const[k,w]of[['#fff',7],['#e0b020',3.6]]){c.strokeStyle=k;c.lineWidth=w;c.beginPath();c.arc(0,-10,6,0,7);c.moveTo(0,-4);c.lineTo(0,13);c.moveTo(0,8);c.lineTo(6,8);c.moveTo(0,12.6);c.lineTo(5,12.6);c.stroke()}}
  else if(p.shot==='resolP'){c.rotate(Math.sin(S.time*12)*.4);c.fillStyle='#fff';c.fillRect(-20,-12,40,24);c.fillStyle='#4a90d9';c.fillRect(-18.4,-10.4,36.8,20.8);c.save();c.scale(.82,.82);ICON.globoONU(c);c.restore()}
  else if(p.shot==='bonecaX'){c.rotate(S.time*10);c.fillStyle='#fff';disc(c,0,-10,10);rr(c,-10.4,-5,20.8,21,6);disc(c,-9,-9,4);disc(c,9,-9,4);c.fillStyle='#f2d04a';disc(c,-9,-9,2.8);disc(c,9,-9,2.8);c.fillStyle='#e2679b';rr(c,-9,-3.4,18,18,5);c.fillStyle='#f0c8a8';disc(c,0,-10,8);c.fillStyle='#f2d04a';c.beginPath();c.arc(0,-11,8.4,Math.PI,0);c.fill();c.fillStyle='#17181d';disc(c,-3,-9,1.2);disc(c,3,-9,1.2);c.fillStyle='#c8102e';disc(c,0,-5.8,1.2)}
  else if(p.shot==='chapeu'){c.rotate(S.time*14);c.fillStyle='#fff';c.beginPath();c.ellipse(0,4,22,8,0,0,7);c.fill();rr(c,-11.6,-15,23.2,18,6);c.fillStyle='#6a4a2a';c.beginPath();c.ellipse(0,4,20.4,6.4,0,0,7);c.fill();rr(c,-10,-13.4,20,16,5);c.fillStyle='#e8dcc4';c.fillRect(-10,-.6,20,3.2);c.beginPath();c.ellipse(-16,3.4,3.2,2,.2,0,7);c.fill();c.beginPath();c.ellipse(16,3.4,3.2,2,-.2,0,7);c.fill()}
  else if(p.shot==='carro'){const cor=['#c8102e','#dfe3e8','#2456a6','#17181d'][Math.abs(Math.floor(p.a*10))%4];c.rotate(S.time*8);c.fillStyle='#fff';rr(c,-22,-7,44,17,5);rr(c,-13,-16,26,12,4);c.fillStyle=cor;rr(c,-20.4,-5.4,40.8,13.8,4);rr(c,-11.4,-14.4,22.8,10,3);c.fillStyle='#9fd6ee';c.fillRect(-9,-12.4,8,7);c.fillRect(1,-12.4,8,7);c.fillStyle='#17181d';disc(c,-11,9,5);disc(c,11,9,5);c.fillStyle='#c9ced6';disc(c,-11,9,2);disc(c,11,9,2)}
  else if(p.shot==='obus'){c.rotate(p.a);c.fillStyle='#fff';rr(c,-14,-7.6,29,15.2,7);c.fillStyle='#3a4628';rr(c,-12.4,-6,25.6,12,6);c.fillStyle='#c8102e';c.beginPath();c.arc(8,0,5.4,-1.5,1.5);c.fill()}
  else if(p.shot==='folhaV'){c.rotate(S.time*9);c.fillStyle='#fff';c.beginPath();c.ellipse(0,0,8.6,14.6,.3,0,7);c.fill();c.fillStyle='#3f9e5c';c.beginPath();c.ellipse(0,0,7,13,.3,0,7);c.fill();c.strokeStyle='#1f6a3a';c.lineWidth=1.2;c.beginPath();c.moveTo(-3.4,11);c.lineTo(3.4,-11);c.stroke()}
  else if(p.shot==='lisboa'){c.rotate(Math.sin(S.time*12)*.35);c.fillStyle='#fff';c.fillRect(-23,-11,46,22);c.fillStyle='#2456a6';c.fillRect(-21.4,-9.4,42.8,18.8);c.save();c.translate(0,-1);c.scale(.62,.62);ICON.bonde(c);c.restore()}
  else if(p.shot==='anulado'){c.rotate(Math.sin(S.time*12)*.4);c.strokeStyle='#fff';c.lineWidth=7;c.strokeRect(-25,-10,50,20);c.strokeStyle='#c8102e';c.lineWidth=3.4;c.strokeRect(-25,-10,50,20);c.fillStyle='#fff';c.fillRect(-23,-8,46,16);c.fillStyle='#9aa0a8';for(let i=0;i<3;i++)c.fillRect(-18,-4.6+i*4,36,1.4);c.strokeStyle='#c8102e';c.lineWidth=3;c.beginPath();c.moveTo(-9,-6);c.lineTo(9,6);c.moveTo(9,-6);c.lineTo(-9,6);c.stroke()}
  else if(p.shot==='cajuina'){c.rotate(S.time*10);c.fillStyle='#fff';rr(c,-7.6,-13,15.2,26,3);c.fillRect(-3.8,-19,7.6,8);c.fillStyle='#d9a441';rr(c,-6,-11.4,12,23,2.4);c.fillRect(-2.2,-17.4,4.4,7);c.fillStyle='#fff';c.fillRect(-6,-3,12,7)}
  else if(p.shot==='algema'){c.rotate(S.time*11);for(const[k,w]of[['#fff',6],['#8a8f98',3.2]]){c.strokeStyle=k;c.lineWidth=w;c.beginPath();c.arc(-8,0,6,0,7);c.moveTo(14,0);c.arc(8,0,6,0,7);c.moveTo(-2,0);c.lineTo(2,0);c.stroke()}}
  else if(p.shot==='pravda'){c.rotate(S.time*10);c.fillStyle='#fff';c.fillRect(-13,-15,26,30);c.fillStyle='#f4f1e8';c.fillRect(-11.6,-13.6,23.2,27.2);c.fillStyle='#c8102e';c.fillRect(-11.6,-13.6,23.2,8);c.fillStyle='#f6cf1d';star(c,0,-9.6,3.4);c.fillStyle='#8a8f98';c.fillRect(-9,-2.6,18,1.8);c.fillRect(-9,1.4,18,1.8);c.fillRect(-9,5.4,12,1.8)}
  else if(p.shot==='sushi'){c.rotate(S.time*10);c.fillStyle='#fff';disc(c,0,0,12.6);c.fillStyle='#1f2a24';disc(c,0,0,11.2);c.fillStyle='#f4f1e8';disc(c,0,0,8.2);c.fillStyle='#f2703a';disc(c,0,0,4);c.fillStyle='#6fa36a';disc(c,2.2,-1.6,1.4)}
  else if(p.shot==='cogumelo'){c.rotate(S.time*9);c.fillStyle='#fff';c.fillRect(-5.4,-3,10.8,14);c.beginPath();c.arc(0,-3,13.4,Math.PI,0);c.fill();c.fillStyle='#f4f1e8';c.fillRect(-4,-3,8,12.6);c.fillStyle='#d0162a';c.beginPath();c.arc(0,-3,12,Math.PI,0);c.fill();c.fillStyle='#fff';disc(c,-6,-7,2.2);disc(c,0,-11,2.4);disc(c,6,-7,2)}
  else if(p.shot==='manga'){c.rotate(S.time*10);c.fillStyle='#fff';c.beginPath();c.ellipse(0,0,10.6,13.6,.3,0,7);c.fill();c.fillStyle='#f2a02c';c.beginPath();c.ellipse(0,0,9,12,.3,0,7);c.fill();c.fillStyle='#d0432a';c.beginPath();c.ellipse(3.4,-4,4.6,6,.3,0,7);c.fill();c.fillStyle='#3f7a32';c.fillRect(2,-15,2.4,5)}
  else if(p.shot==='eneas'){c.fillStyle='#17181d';rr(c,-22,-9,44,18,6);c.fillStyle='#fff';rr(c,-20,-7,40,14,5);
    /* a marca do Enéas no balão: barba preta e óculos grossos */
    c.fillStyle='#17181d';c.beginPath();c.ellipse(0,2,6,5,0,0,Math.PI);c.fill();c.fillRect(-6,0,12,2);c.strokeStyle='#17181d';c.lineWidth=1.4;c.beginPath();c.arc(-3.4,-2.4,2.4,0,7);c.moveTo(5.8,-2.4);c.arc(3.4,-2.4,2.4,0,7);c.stroke();c.fillStyle='#2140b8';for(const x of[-15,13]){c.fillRect(x,-4,2,8)}}
  else if(p.shot==='voto'){c.rotate(S.time*11);c.fillStyle='#fff';c.fillRect(-7,-9,14,18);c.strokeStyle='#17181d';c.lineWidth=.8;c.strokeRect(-7,-9,14,18);c.fillStyle='#1f7a4d';c.font='700 12px Arial';c.textAlign='center';c.fillText('X',0,4)}
  else if(p.shot==='pequi'){c.rotate(S.time*9);c.fillStyle='#fff';disc(c,0,0,11.4);c.fillStyle='#5f8a3e';disc(c,0,0,10);c.fillStyle='#f2b705';disc(c,0,0,5.6);c.strokeStyle='#8a6a2a';c.lineWidth=1;c.beginPath();for(let i=0;i<8;i++){const a=i*.785;c.moveTo(Math.cos(a)*2,Math.sin(a)*2);c.lineTo(Math.cos(a)*5.2,Math.sin(a)*5.2)}c.stroke()}
  else if(p.shot==='paoqueijo'){c.rotate(S.time*9);c.fillStyle='#fff';disc(c,0,0,11);c.fillStyle='#e8c070';disc(c,0,0,9.6);c.fillStyle='#d09a4a';for(const[a,b]of[[-4,-3],[3,-5],[4,3],[-3,4]])disc(c,a,b,1.5)}
  else if(p.shot==='banana'){c.rotate(S.time*13);c.lineCap='round';c.strokeStyle='#fff';c.lineWidth=9;c.beginPath();c.arc(0,-8,13,.5,2.6);c.stroke();c.strokeStyle='#f6cf1d';c.lineWidth=6;c.beginPath();c.arc(0,-8,13,.5,2.6);c.stroke();c.fillStyle='#6a4a2a';disc(c,11.4,-1.8,1.8)}
  else if(p.shot==='rivotril'){c.rotate(S.time*11);c.fillStyle='#fff';rr(c,-11,-7,22,14,7);c.fillStyle='#2f6fd0';rr(c,-9.6,-5.6,9.6,11.2,5.6);c.fillStyle='#dcecff';rr(c,0,-5.6,9.6,11.2,5.6)}
  else if(p.shot==='cadeira'){c.rotate(S.time*12);c.lineCap='round';c.strokeStyle='#fff';c.lineWidth=7;for(let i=0;i<2;i++){c.beginPath();c.moveTo(-9,12);c.lineTo(-9,-16);c.moveTo(-9,0);c.lineTo(9,0);c.lineTo(9,12);c.stroke();c.strokeStyle='#7a4a26';c.lineWidth=3.6}}
  else if(p.shot==='curso'){c.rotate(S.time*10);c.fillStyle='#fff';rr(c,-11,-13,22,26,2);c.fillStyle='#17366e';rr(c,-9.6,-11.6,19.2,23.2,1.5);c.fillStyle='#f2b705';c.beginPath();c.moveTo(0,-8);c.lineTo(8,-4);c.lineTo(0,0);c.lineTo(-8,-4);c.fill();c.fillRect(-4,-3,8,4);c.fillRect(6.4,-4,1.2,6);c.fillStyle='#35c46b';c.beginPath();c.moveTo(-6,9);c.lineTo(-1,5);c.lineTo(2,7);c.lineTo(6,3);c.lineTo(6,9);c.fill()}
  else if(p.shot==='tarifa'){c.rotate(S.time*12);c.fillStyle='#fff';c.fillRect(-9,-11,18,22);c.fillStyle='#d0162a';c.fillRect(-9,-11,18,6);c.beginPath();c.moveTo(0,-3);c.lineTo(6,3);c.lineTo(2,3);c.lineTo(2,9);c.lineTo(-2,9);c.lineTo(-2,3);c.lineTo(-6,3);c.fill()}
  else if(p.shot==='bolivar'){c.rotate(S.time*13);c.fillStyle='#fff';c.fillRect(-11,-6.5,22,13);c.fillStyle='#6fa36a';c.fillRect(-10,-5.5,20,11);c.fillStyle='#e8f0d8';c.fillRect(-6,-3.6,12,7.2);c.fillStyle='#2e5a30';disc(c,0,-.8,1.8);c.beginPath();c.ellipse(0,3.6,2.8,1.8,0,Math.PI,0);c.fill()}
  else if(p.shot==='caixa'){c.rotate(S.time*11);c.fillStyle='#b98a4a';rr(c,-7,-7,14,14,1.5);c.fillStyle='#e6d0a0';c.fillRect(-1.5,-7,3,14);c.strokeStyle='#7a5a2e';c.lineWidth=.8;c.strokeRect(-7,-7,14,14)}
  else if(p.shot==='camiseta'){c.rotate(S.time*7);c.fillStyle='#f4f1e8';rr(c,-7,-8,14,17,1.5);c.fillRect(-12,-8,24,6);c.fillStyle='#17140f';disc(c,0,0,3.6);c.fillStyle='#c8102e';star(c,0,-3,1.9)}
  else if(p.shot==='sacola'){c.rotate(S.time*8);c.fillStyle='#2456a6';rr(c,-8,-8,16,17,2);c.fillStyle='#f6cf1d';c.fillRect(-8,-2,16,4);c.strokeStyle='#17366e';c.lineWidth=1.8;c.beginPath();c.arc(0,-8,4,Math.PI,0);c.stroke()}
  else if(p.shot==='pao'){c.rotate(S.time*10);c.fillStyle='#d9a25c';c.beginPath();c.ellipse(0,0,11,6.5,0,0,7);c.fill();c.strokeStyle='#a8743a';c.lineWidth=1.6;for(const q of[-4,1,6]){c.beginPath();c.moveTo(q,-4);c.lineTo(q-2,4);c.stroke()}c.fillStyle='#fff6df';c.beginPath();c.ellipse(0,-5,7,2,0,0,7);c.fill()}
  else if(p.shot==='leite'){c.rotate(S.time*10);c.fillStyle='#2456a6';rr(c,-6.5,-8,13,16,2);c.fillStyle='#fff';c.fillRect(-6.5,-3.5,13,7);c.fillStyle='#2456a6';c.fillRect(-4,-1,8,2)}
  else if(p.shot==='boi'){
    c.scale(p.face,1);const b=Math.sin(S.time*22)*1.8;
    c.fillStyle='#0003';c.beginPath();c.ellipse(0,9,15,3.5,0,0,7);c.fill();
    c.fillStyle='#5a3d27';c.fillRect(-10,3+b*.4,3.4,6);c.fillRect(6,3-b*.4,3.4,6);
    c.fillStyle='#f0e8d8';rr(c,-13,-8,23,13,5);c.fillStyle='#6a4a2a';disc(c,-6,-3,3.2);disc(c,3,-5,2.2);
    c.fillStyle='#f0e8d8';disc(c,12,-8,6.2);c.fillStyle='#d98a8a';rr(c,13,-6.5,6,4,2);c.fillStyle='#1b1712';disc(c,13,-10,1.1);
    c.strokeStyle='#d9c7a0';c.lineWidth=2;c.beginPath();c.moveTo(10,-13);c.lineTo(7,-18);c.moveTo(15,-13);c.lineTo(18,-18);c.stroke();
  }
  else if(p.shot==='santinho'){c.rotate(S.time*16);c.fillStyle='#f6cf1d';c.fillRect(-5,-3.5,10,7);c.fillStyle='#1f7a4d';c.fillRect(-4,-2.2,8,1.6)}
  else if(p.shot==='lei'){c.rotate(S.time*9);c.fillStyle='#2456a6';rr(c,-8,-10,16,20,2);c.fillStyle='#fff';c.fillRect(-5,-6,10,2);c.fillRect(-5,-2,10,2);c.fillRect(-5,2,7,2)}
  else if(p.shot==='celular'){c.rotate(S.time*20);c.fillStyle='#14151a';rr(c,-5,-10,10,20,2);c.fillStyle='#7fd4ff';c.fillRect(-3.6,-8,7.2,15)}
  else if(p.shot==='meme'){c.fillStyle='#fff';rr(c,-7,-5,14,10,3);c.fillStyle='#2456a6';disc(c,-3,0,1.4);disc(c,0,0,1.4);disc(c,3,0,1.4)}
  else if(p.shot==='livro'){c.rotate(S.time*9);c.fillStyle='#7d1420';rr(c,-8,-10,16,20,2);c.fillStyle='#f2b705';c.fillRect(-5,-6,10,2.5);c.fillRect(-5,-1,7,1.6)}
  else if(p.shot==='mandioca'){c.rotate(S.time*20);c.fillStyle='#8a5a30';c.beginPath();c.ellipse(0,0,4.5,12,0,0,7);c.fill();c.fillStyle='#f4e7c8';c.beginPath();c.ellipse(0,-11,3,1.8,0,0,7);c.fill()}
  c.restore();
}
function drawFx(f){
  const c=g,k=f.t/f.d;
  if(f.k==='ring'){c.globalAlpha=(1-k)*.55;c.strokeStyle=f.c;c.lineWidth=4;c.beginPath();c.arc(f.x,f.y,f.r*Math.min(1,k*1.5),0,7);c.stroke();c.globalAlpha=1}
  /* ricochete: um raio amarelo de um adversário para o outro */
  else if(f.k==='linha'){c.globalAlpha=1-k;c.strokeStyle='#ffe27a';c.lineWidth=3;c.beginPath();c.moveTo(f.x,f.y);c.lineTo((f.x+f.x2)/2+rand(-6,6),(f.y+f.y2)/2+rand(-6,6));c.lineTo(f.x2,f.y2);c.stroke();c.globalAlpha=1}
  /* habilidade de evolução disparou: raio dourado e o nome do efeito subindo */
  else if(f.k==='habIco'){c.globalAlpha=Math.min(1,(1-k)*2);label(c,'⚡'+f.txt,f.x,f.y-k*14,11,'#ffe27a');c.globalAlpha=1}
  /* ---------- efeitos visuais dos poderes e da entrada dos chefões ---------- */
  else if(f.k==='chefeCard'){
    /* cartão que entra pela esquerda com o nome do chefão */
    const e=k<.18?k/.18:k>.82?(1-k)/.18:1,x=W/2-(1-e)*W*.7;
    c.save();c.globalAlpha=Math.min(1,e*1.4);c.translate(x,150);c.rotate(-.04);
    c.fillStyle='#1d1a16';c.fillRect(-214,-44,428,88);c.fillStyle=S.side==='br'?'#c8102e':'#1f7a4d';c.fillRect(-208,-38,416,76);
    c.fillStyle='#f2b705';c.fillRect(-208,-38,416,8);c.fillRect(-208,30,416,8);
    label(c,'CHEFÃO',0,-12,16,'#ffe27a','700 16px "Archivo Narrow",Arial');label(c,f.nome,0,24,30,'#fff','400 30px "Bowlby One",Impact,sans-serif');
    c.restore();
  }
  else if(f.k==='ventania'){
    c.globalAlpha=(1-k)*.75;c.strokeStyle='#eef9ff';c.lineWidth=3;
    for(let i=0;i<10;i++){const y=40+i*62,x0=W*(1.25-k*1.7)+(i%3)*60;c.beginPath();c.moveTo(x0,y);c.bezierCurveTo(x0-60,y-14,x0-110,y+14,x0-190,y);c.stroke()}
    c.globalAlpha=1;
  }
  else if(f.k==='neve'){
    c.fillStyle=`rgba(190,225,255,${.2*(1-k)})`;c.fillRect(0,0,W,H);c.fillStyle=`rgba(255,255,255,${.9*(1-k)})`;
    for(let i=0;i<46;i++)disc(c,(i*97+Math.sin(i+k*6)*20)%W,(i*53+k*260)%H,2+(i%3));
  }
  else if(f.k==='portal'){
    c.save();c.translate(f.x,f.y);c.globalAlpha=1-k;
    for(let i=0;i<3;i++){c.strokeStyle=['#b06bff','#7fd4ff','#ffe27a'][i];c.lineWidth=4;c.beginPath();c.ellipse(0,0,(20+i*12)*(.4+k),(8+i*5)*(.4+k),0,S.time*6+i,S.time*6+i+4.4);c.stroke()}
    c.restore();
  }
  else if(f.k==='moedas'){
    for(let i=0;i<9;i++){const a=-Math.PI/2+(i-4)*.32,x=f.x+Math.cos(a)*k*70,y=f.y+Math.sin(a)*k*70+k*k*60;c.globalAlpha=1-k;c.fillStyle='#b8860b';disc(c,x,y,6);c.fillStyle='#f2c81e';disc(c,x,y,4.6)}
    c.globalAlpha=1;
  }
  else if(f.k==='coracoes'){
    for(let i=0;i<5;i++){const q=Math.min(1,k*1.3-i*.06);if(q<=0)continue;const x=f.x+(40-f.x)*q+Math.sin(q*9+i)*14,y=f.y+(16-f.y)*q;c.globalAlpha=1-q*.6;c.fillStyle='#e23c5a';disc(c,x-3,y,3.6);disc(c,x+3,y,3.6);c.beginPath();c.moveTo(x-6.4,y+1);c.lineTo(x+6.4,y+1);c.lineTo(x,y+8);c.fill()}
    c.globalAlpha=1;
  }
  else if(f.k==='bandeira'){
    const a=Math.min(1,(1-k)*6);c.globalAlpha=a;c.fillStyle='#6a4a2a';c.fillRect(f.x+20,f.y-58,3,58);
    c.fillStyle='#fff';c.beginPath();c.moveTo(f.x+23,f.y-58);for(let i=0;i<=8;i++)c.lineTo(f.x+23+i*4,f.y-58+Math.sin(S.time*8+i)*2.4);c.lineTo(f.x+55,f.y-38);for(let i=8;i>=0;i--)c.lineTo(f.x+23+i*4,f.y-38+Math.sin(S.time*8+i)*2.4);c.fill();c.globalAlpha=1;
  }
  else if(f.k==='olho'){
    const s=1+Math.sin(k*Math.PI)*.4;c.save();c.translate(f.x,f.y);c.scale(s,s);c.globalAlpha=1-k*.7;
    c.fillStyle='#fff';c.beginPath();c.ellipse(0,0,20,11,0,0,7);c.fill();c.fillStyle='#2f6fd0';disc(c,0,0,7);c.fillStyle='#111';disc(c,0,0,3.4);c.strokeStyle='#1d1a16';c.lineWidth=2;c.beginPath();c.ellipse(0,0,20,11,0,0,7);c.stroke();c.restore();
  }
  else if(f.k==='queda'){
    /* o objeto do próprio personagem caindo do céu sobre o alvo */
    c.save();c.globalAlpha=Math.min(1,(1-k)*3);drawShot({shot:f.shot,x:f.x,y:f.y-220*(1-k),a:Math.PI/2,face:1});c.restore();
  }
  else if(f.k==='corte'){c.globalAlpha=1-k;c.strokeStyle='#ff4040';c.lineWidth=3;c.beginPath();c.moveTo(f.x-11,f.y-30);c.lineTo(f.x+11,f.y-6);c.stroke();c.globalAlpha=1}
  else if(f.k==='espiral'){
    c.save();c.translate(f.x,f.y);c.globalAlpha=1-k;c.lineWidth=3;
    for(let i=0;i<4;i++){c.strokeStyle=`hsl(${(i*90+S.time*300)%360},90%,70%)`;c.beginPath();c.arc(0,0,f.r*(.3+i*.2)*(.6+k*.4),S.time*5+i,S.time*5+i+2.4);c.stroke()}
    c.restore();
  }
  else if(f.k==='brilho'){
    /* brilho de evolução comprada: anda pelo relógio real, porque dá para comprar com o jogo pausado */
    const q=Math.min(1,(performance.now()-f.t0)/600);if(q>=1)return;
    c.globalAlpha=1-q;c.fillStyle='#ffe27a';
    for(let i=0;i<8;i++){const a=i*Math.PI/4+q*2;star(c,f.x+Math.cos(a)*(10+q*30),f.y+Math.sin(a)*(10+q*20)-q*20,4*(1-q)+2)}
    c.globalAlpha=1;
  }
  else if(f.k==='rebolado'){
    c.globalAlpha=Math.min(1,(1-k)*1.5)*.85;c.lineCap='round';
    ['#ff4fa0','#f2b705','#2bb5e0'].forEach((cor,i)=>{c.strokeStyle=cor;c.lineWidth=5;c.beginPath();c.arc(f.x,f.y,f.r*(.34+i*.26+k*.14),f.a-f.arc,f.a+f.arc);c.stroke()});
    c.fillStyle='#fff';c.font='700 18px Arial';c.textAlign='center';
    for(let i=0;i<4;i++){const q=f.a-f.arc*.75+f.arc*.5*i,ra=f.r*(.5+k*.42+(i%2)*.14);c.fillText(i%2?'♫':'♪',f.x+Math.cos(q)*ra,f.y+Math.sin(q)*ra-k*10)}
    c.globalAlpha=1;
  }
  else if(f.k==='fogoC'){
    const len=f.r*(.5+.5*Math.min(1,k*3));
    c.globalAlpha=Math.min(1,(1-k)*1.6)*.9;
    for(const[cor,w,l]of[['#d0281a',1,1],['#ff8a1e',.72,.84],['#ffe27a',.4,.6]]){
      c.fillStyle=cor;c.beginPath();c.moveTo(f.x,f.y);
      for(let i=0;i<=10;i++){const q=f.a-f.arc*w+f.arc*w*2*i/10,ra=len*l*(i%2?1.08:.9)*(1+Math.sin(S.time*42+i*2.1)*.07);c.lineTo(f.x+Math.cos(q)*ra,f.y+Math.sin(q)*ra)}
      c.closePath();c.fill();
    }
    c.fillStyle='#ffe27a';for(let i=0;i<6;i++){const q=f.a+Math.sin(i*7.3)*f.arc,ra=len*(.55+k*.55)*(.75+i*.05);c.fillRect(f.x+Math.cos(q)*ra-1.5,f.y+Math.sin(q)*ra-1.5-k*10,3,3)}
    c.globalAlpha=1;
  }
  else if(f.k==='saw'){c.globalAlpha=(1-k)*.7;c.fillStyle='#ffe27a';c.beginPath();c.moveTo(f.x,f.y);c.arc(f.x,f.y,f.r,f.a-f.arc,f.a+f.arc);c.closePath();c.fill();c.strokeStyle='#fff';c.lineWidth=2.6;c.beginPath();c.arc(f.x,f.y,f.r*(.72+k*.28),f.a-f.arc,f.a+f.arc);c.stroke();c.fillStyle='#ff9a2a';for(let i=0;i<7;i++){const q=f.a-f.arc+f.arc*2*i/6;c.fillRect(f.x+Math.cos(q)*f.r*.86-1.6,f.y+Math.sin(q)*f.r*.86-1.6,3.2,3.2)}c.globalAlpha=1}
  else if(f.k==='conf'){c.fillStyle=f.c;c.fillRect(f.x,f.y,5,5)}
  else if(f.k==='beam'){c.globalAlpha=1-k;c.strokeStyle='#ff2a4a';c.lineWidth=4;c.lineCap='round';c.beginPath();c.moveTo(f.x,f.y);c.lineTo(f.x2,f.y2);c.stroke();c.strokeStyle='#ffd0d8';c.lineWidth=1.4;c.stroke();c.globalAlpha=1}
  else if(f.k==='nuke'){
    const g2=Math.min(1,k*2.2),h=f.r*.95*g2;
    c.globalAlpha=Math.min(1,(1-k)*1.8);
    c.strokeStyle='#fff3c0';c.lineWidth=5;c.beginPath();c.ellipse(f.x,f.y,f.r*Math.min(1,k*1.6),f.r*.5*Math.min(1,k*1.6),0,0,7);c.stroke();
    c.fillStyle='#b5683a';c.beginPath();c.moveTo(f.x-13,f.y);c.quadraticCurveTo(f.x-7,f.y-h*.5,f.x-15,f.y-h);c.lineTo(f.x+15,f.y-h);c.quadraticCurveTo(f.x+7,f.y-h*.5,f.x+13,f.y);c.fill();
    for(const[a,b,r,k2]of[[-30,0,24,'#8a5a3a'],[30,0,24,'#8a5a3a'],[0,-16,30,'#c0703a'],[-16,8,20,'#e8a040'],[16,8,20,'#e8a040'],[0,4,16,'#ffe08a']]){c.fillStyle=k2;disc(c,f.x+a*g2,f.y-h+b*g2,r*g2)}
    c.globalAlpha=1;
  }
  else if(f.k==='flash'){c.globalAlpha=(1-k)*.6;c.fillStyle='#fff3c0';disc(c,f.x,f.y,f.r*(.5+k*.6));c.globalAlpha=1}
  else if(f.k==='conv'){
    const off={sash:0,flag:0,flagR:0,suit:0,apron:0,hold:null};
    const L=S.side==='br'?{...f.L,...BR,star:0,...off}:{...f.L,shirt:'#c8102e',collar:null,star:1,...off};
    c.globalAlpha=1-k;char(c,L,f.x,f.y-k*20,f.s,S.time,{ph:f.ph,aim:-1.5});c.globalAlpha=1;
  }
}
function render(){
  const c=g;c.setTransform(K,0,0,K,0,0);
  if(S.shake>0&&!OPC.calmo)c.translate(rand(-4,4),rand(-4,4));
  c.drawImage(BG,0,0,W,H);
  const sel=S.sel;
  desenhaChaoDinamico(c);
  desenhaMascara(c);
  if(sel)reachArea(c,sel.x,sel.y,sel.T,sel.s,sel.rangeMul,true);
  /* obstáculo escolhido: contorno pulsando */
  if(S.selObst){const o=S.selObst;c.strokeStyle='#ffe27a';c.lineWidth=3;c.setLineDash([6,5]);c.beginPath();c.arc(o.x,o.y-4,o.r+8+Math.sin(S.time*6)*2,0,7);c.stroke();c.setLineDash([])}
  desenhaSetasCaminho(c);
  for(const w of S.walls)drawWall(w);
  const list=[...S.towers.map(t=>({y:t.y,t})),...S.enemies.filter(e=>!e.voo).map(e=>({y:posAt(e.d,e.via).y+9,e})),...S.allies.map(a=>({y:a.y+10,a})),...S.fires.map(f=>({y:f.y+6,f}))].sort((a,b)=>a.y-b.y);
  for(const o of list)o.t?drawTower(o.t):o.a?drawAlly(o.a):o.f?drawFire(o.f):drawEnemy(o.e);
  desenhaTopoDinamico(c);
  for(const t of S.towers)if(t.molhado){c.fillStyle='#2f6fd0';label(c,'💧',t.x,t.y-62,14,'#9fd6ee')}
  /* seta verde sobre quem já pode evoluir com a verba que você tem */
  if(!S.menu&&!S.over)for(const t of S.towers)if(podeEvoluir(t))setaEvo(c,t);
  for(const f of S.fx)drawFx(f);
  for(const t of S.towers)if(t.pl)for(const p of t.pl)drawPlane(p,t);
  for(const p of S.shots)drawShot(p);
  for(const n of S.nukes){
    const y=n.y-n.t*420;
    c.save();c.translate(n.x,y);c.fillStyle='#fff';c.beginPath();c.ellipse(0,0,14,23,0,0,7);c.fill();c.fillStyle='#3a3f48';c.beginPath();c.ellipse(0,0,12,21,0,0,7);c.fill();
    c.fillStyle='#d0162a';c.fillRect(-11,-27,22,6);c.fillStyle='#f2b705';disc(c,0,0,5.2);c.fillStyle='#1a1612';for(let i=0;i<3;i++){c.beginPath();c.moveTo(0,0);c.arc(0,0,5.2,i*2.09,i*2.09+1.05);c.fill()}c.restore();
    c.strokeStyle='#ff4040';c.lineWidth=2.4;c.setLineDash([8,6]);c.beginPath();c.ellipse(n.x,n.y,n.r,n.r*.5,0,0,7);c.stroke();c.setLineDash([]);
  }
  desenhaClima(c);
  for(const f of S.texts){
    const al=clamp((f.bubble?1.9:1.05)-f.t,0,.4)/.4;c.globalAlpha=al;
    if(f.bubble){
      c.font='700 15px "Archivo Narrow",Arial';const w=c.measureText(f.str).width+16;
      const x=clamp(f.x,w/2+4,W-w/2-4),y=Math.max(30,f.y);
      c.fillStyle='#1d1a16';rr(c,x-w/2-2,y-20,w+4,28,8);c.fillStyle='#fff';rr(c,x-w/2,y-18,w,24,7);
      c.fillStyle='#1d1a16';c.textAlign='center';c.fillText(f.str,x,y-1);
    }else label(c,f.str,f.x,f.y,14,f.col);
    c.globalAlpha=1;
  }
  if(S.placing){
    const{ x,y,on }=S.hover;
    if(on){
      const T=TOWERS[S.placing],ok=validSpot(x,y)&&S.cash>=price(T.cost);
      reachArea(c,x,y,T,T.base,1,ok);
      c.globalAlpha=.85;char(c,LOOKOF(S.placing),x,y,1,S.time,{shadow:false});c.globalAlpha=1;
      if(!ok){c.strokeStyle='#ff3b3b';c.lineWidth=4;c.beginPath();c.moveTo(x-14,y-30);c.lineTo(x+14,y);c.moveTo(x+14,y-30);c.lineTo(x-14,y);c.stroke()}
    }
  }
  const boss=S.enemies.find(e=>e.T.boss);
  if(boss){
    label(c,boss.T.nome,W/2-40,27,18,'#ffe27a');
    bar(c,W/2-240,34,400,12,boss.hp/boss.max,'#c8102e');
    if(boss.shield>0)bar(c,W/2-240,47,400*Math.min(1,boss.shield/(boss.max*.12)),4,1,'#7fd4ff');
  }
  if(S.bannerT>0&&S.banner){
    c.globalAlpha=clamp(S.bannerT,0,.5)/.5;label(c,S.banner,W/2,H/2-120,34,'#fff','400 34px "Bowlby One",Impact,sans-serif');c.globalAlpha=1;
  }
  /* destaque do mouse: anel amarelo pulsando em volta do ponteiro sobre o mapa (desliga em Opções) */
  if(OPC.mouseGrande!==false&&S.hover&&S.hover.on&&S.hoverMouse&&!S.menu){
    /* anel pequeno (o cursor grande já chama atenção): só um aro em volta da ponta, pulsando de leve */
    const q=.5+.5*Math.sin(performance.now()/160),x=S.hover.x,y=S.hover.y,R=12+q*2;
    c.save();c.lineWidth=5;c.strokeStyle='rgba(29,26,22,.55)';c.beginPath();c.arc(x,y,R,0,7);c.stroke();
    c.lineWidth=2.4;c.strokeStyle='#ffd23f';c.stroke();
    c.lineWidth=1.2;c.strokeStyle='rgba(255,255,255,.9)';c.beginPath();c.arc(x,y,R+3,0,7);c.stroke();c.restore();
  }
  if(S.flash>0&&!OPC.calmo){c.fillStyle=`rgba(255,240,180,${S.flash*.75})`;c.fillRect(0,0,W,H)}
  if(S.bigL>0){
    const a=Math.min(1,S.bigL);c.globalAlpha=a;
    label(c,cfg().mark,W/2,H/2+90,260,S.side==='br'?'#f6cf1d':'#c8102e','400 260px "Bowlby One",Impact,sans-serif');c.globalAlpha=1;
  }
  if(S.paused&&!S.menu&&!S.over){
    c.fillStyle='rgba(20,18,15,.38)';c.fillRect(0,0,W,H);
    label(c,'PAUSADO',W/2,H/2+10,64,'#fff','400 64px "Bowlby One",Impact,sans-serif');
    label(c,'Dá para colocar e evoluir personagens enquanto está pausado',W/2,H/2+50,22,'#fff');
  }
}

/* ---------- laço ---------- */
let last=0,acc=0,hudT=0;
/* o próximo quadro é pedido antes de tudo e cada parte roda protegida: um erro num desenho
   não pode mais parar o jogo inteiro (foi o que congelava a tela quando uma avenida fechava) */
let erroQuadro=0,cursorMira=false;
function frame(now){
  requestAnimationFrame(frame);
  const dt=Math.min(.05,(now-last)/1000||0);last=now;
  if(!S)return;
  try{
    if(S.slowmo>0)S.slowmo-=dt;
    acc+=dt*S.speed*(S.slowmo>0?.3:1);let n=0;
    while(acc>=1/60&&n<14){step(1/60);acc-=1/60;n++}
    if(n>=14)acc=0;
    if(S.bigL>0)S.bigL-=dt;
  }catch(e){if(erroQuadro++<5)console.error('passo do jogo:',e)}
  try{render()}catch(e){if(erroQuadro++<5)console.error('desenho:',e);try{g.setTransform(1,0,0,1,0,0);g.restore()}catch(_){}}
  try{
    /* cursor de mira enquanto escolhe onde colocar (ou para onde andar na Passeata) */
    {const mira=!!(S.placing||(S.sel&&S.sel.marchaT>0));if(mira!==cursorMira){cursorMira=mira;$('c').classList.toggle('mira',mira)}}
    /* botões de especial a cada quadro, para o carregamento andar suave */
    if(!S.menu&&!S.over&&S.towers.length)renderPoderes();
    hudT+=dt;if(hudT>.2){hudT=0;syncHud();if(S.sel&&S.inRound){const k=$('info').querySelector('p b');if(k)k.textContent=S.sel.kills}}
  }catch(e){if(erroQuadro++<5)console.error('painel:',e)}
}

/* ---------- entrada ---------- */
function ptr(ev){const r=cv.getBoundingClientRect();return{x:(ev.clientX-r.left)*W/r.width,y:(ev.clientY-r.top)*H/r.height}}
cv.addEventListener('pointermove',ev=>{if(!S)return;const p=ptr(ev);S.hover={x:p.x,y:p.y,on:true};S.hoverMouse=ev.pointerType==='mouse';S.teclado=false});
cv.addEventListener('pointerleave',ev=>{if(S&&ev.pointerType!=='touch'&&!S.teclado)S.hover.on=false});
cv.addEventListener('pointerdown',ev=>{
  if(!S||S.menu||S.over)return;
  const p=ptr(ev);S.hover={x:p.x,y:p.y,on:true};
  if(S.placing){
    /* no toque não existe mouse em cima: o primeiro toque mostra onde fica e o alcance, o segundo confirma */
    if(ev.pointerType==='touch'){
      const a=S.toque;
      if(!a||a.k!==S.placing||Math.hypot(a.x-p.x,a.y-p.y)>26){S.toque={k:S.placing,x:p.x,y:p.y};float(p.x,p.y-58,'Toque de novo para colocar','#ffe27a');return}
      S.toque=null;
    }
    const k=S.placing,t=place(k,p.x,p.y);
    if(t){if(!ev.shiftKey||TOWERS[k].only){S.placing=null;S.sel=t}renderPanel()}
    return;
  }
  /* no dedo a área de toque é maior, porque o personagem fica pequeno na tela do celular */
  let best=null,bd=ev.pointerType==='touch'?46:30;
  for(const t of S.towers){const d=Math.hypot(t.x-p.x,t.y-14-p.y);if(d<bd){bd=d;best=t}}
  /* Passeata ativa: tocar num lugar vazio leva o personagem andando até lá */
  const anda=S.sel&&S.sel.marchaT>0?S.sel:null;
  if(anda&&(!best||best===anda)&&Math.hypot(anda.x-p.x,anda.y-14-p.y)>20){
    if(validSpot(p.x,p.y,anda)){anda.destino={x:p.x,y:p.y};S.fx.push({k:'ring',x:p.x,y:p.y,r:20,c:'#ffe27a',t:0,d:.5});beep(600,.06,'triangle',.05)}
    else float(p.x,p.y-30,'Aí não dá','#ffb3b3');
    return;
  }
  /* obstáculo: abre a janela com o preço para tirar */
  S.selObst=best?null:obstEm(p.x,p.y)||null;
  S.sel=best;renderPanel();
});
function removeObst(o){
  const c=price(TIPOS_OBST[o.tipo].custo);
  if(S.cash<c||!obstAtivos().includes(o))return;
  S.cash-=c;S.removidos=[...(S.removidos||[]),o.id];S.selObst=null;medalhaNoJogo({});
  regEv('tirarObstaculo',{tipo:o.tipo,custo:c,x:Math.round(o.x),y:Math.round(o.y)});
  for(let i=0;i<10;i++)S.fx.push({k:'conf',x:o.x,y:o.y-6,vx:rand(-120,120),vy:rand(-180,-40),c:pick(['#b5895a','#8a7a62','#d9cfb4']),t:0,d:rand(.4,.7)});
  float(o.x,o.y-30,'Liberado!','#b6ffb0');beep(300,.15,'triangle',.08);
  paintBg();renderPanel();syncHud();
}
addEventListener('keydown',ev=>{
  if($('ficha')){if(ev.key==='Escape')fechaFicha();return}
  if(!S||S.menu)return;
  if($('confirma')){if(ev.key==='Escape')fechaConfirma();return}
  /* jogar só pelo teclado: com um personagem escolhido na loja, as setas movem o lugar no mapa e Enter coloca */
  if(S.placing&&ev.key.startsWith('Arrow')){
    ev.preventDefault();
    const h=S.hover,passo=ev.shiftKey?4:14;
    if(!h.on||!S.teclado){h.x=W/2;h.y=H/2}
    h.on=true;S.teclado=true;
    if(ev.key==='ArrowLeft')h.x-=passo;else if(ev.key==='ArrowRight')h.x+=passo;else if(ev.key==='ArrowUp')h.y-=passo;else h.y+=passo;
    h.x=clamp(h.x,10,W-10);h.y=clamp(h.y,20,H-10);
    return;
  }
  if(S.placing&&ev.key==='Enter'){
    ev.preventDefault();const h=S.hover;if(!h.on)return;
    const k=S.placing,t=place(k,h.x,h.y);
    if(t){if(!ev.shiftKey||TOWERS[k].only){S.placing=null;S.sel=t}renderPanel()}else float(h.x,h.y-30,'Aí não dá','#ffb3b3');
    return;
  }
  /* Tab passa pelos personagens já colocados (Shift+Tab volta) */
  if(ev.key==='Tab'&&S.towers.length&&!S.placing){
    ev.preventDefault();
    const l=S.towers.slice().sort((a,b)=>a.x-b.x||a.y-b.y),i=l.indexOf(S.sel);
    S.sel=l[(i+(ev.shiftKey?-1:1)+l.length)%l.length];S.selObst=null;renderPanel();return;
  }
  if((ev.key==='z'||ev.key==='Z')&&!ev.altKey){ev.preventDefault();desfazCompra();return}
  if(ev.key>='0'&&ev.key<='9'){const k=ordemLoja()[ev.key==='0'?9:+ev.key-1];if(k)choose(k)}
  else if(ev.key==='p'||ev.key==='P')alternaPausa();
  /* com alguém selecionado: vírgula e ponto evoluem cada caminho, Q usa o poder, Delete/Backspace vende */
  else if(S.sel&&(ev.key===','||ev.key==='<'))buyUp(S.sel,0);
  else if(S.sel&&(ev.key==='.'||ev.key==='>'))buyUp(S.sel,1);
  else if(S.sel&&(ev.key==='q'||ev.key==='Q'))usaPoder(S.sel);
  else if(S.sel&&(ev.key==='Delete'||ev.key==='Backspace')){ev.preventDefault();sell(S.sel)}
  else if(ev.key==='Escape'){S.placing=null;S.sel=null;renderPanel()}
  else if(ev.code==='Space'){ev.preventDefault();startRound()}
  else if(ev.key==='f'||ev.key==='F')fazOL();
});
$('go').onclick=ev=>{ev.currentTarget.blur();if(S&&S.inRound)alternaPausa();else startRound()};
$('ability').onclick=fazOL;
$('speed').onclick=()=>{S.speed=S.speed>=3?1:S.speed+1;syncHud()};
$('auto').onclick=()=>{S.auto=!S.auto;syncHud();if(S.auto&&!S.inRound)startRound()};
/* o botão de som desliga efeitos e música juntos, e a escolha fica salva para a próxima visita */
function pintaSom(){const b=$('sound'),t=mute?'Som desligado':'Som ligado';b.textContent=mute?'🔇':'🔊';b.title=t;b.setAttribute('aria-label',t)}
$('sound').onclick=()=>{mute=!mute;OPC.mute=mute;salvaOpc();pintaSom()};
pintaSom();
/* ---------- pausa e volta ao menu ---------- */
function alternaPausa(){
  if(!S||S.menu||S.over)return;
  S.paused=!S.paused;S.toque=null;syncHud();
}
$('pause').onclick=ev=>{ev.currentTarget.blur();alternaPausa()};
/* trocou de aba, de app ou chegou ligação: a partida pausa sozinha e espera você voltar */
document.addEventListener('visibilitychange',()=>{
  if(document.hidden&&S&&!S.menu&&!S.over&&!S.paused){S.paused=true;S.toque=null;syncHud()}
  /* aba escondida ou fechando no meio da partida: o registro até aqui vai para o servidor */
  if(document.hidden)regParcial();
});
let pausaAntes=false;
function fechaConfirma(){
  const d=$('confirma');if(!d)return;
  d.remove();if(S){S.paused=pausaAntes;syncHud()}
}
function voltaMenu(){
  const d=$('confirma');if(d)d.remove();
  if(S&&!S.over&&S.round>0)salvaPartida();
  regParcial(); // a partida em andamento também vai para o servidor
  menuSide=S.side;menuUF=S.uf;lojaLado=null;
  newGame('normal',true,S.side,S.uf);
  showOverlay('<p>Partida encerrada. Escolha o lado, o estado e a dificuldade para jogar de novo.</p>');
}
$('menuBtn').onclick=ev=>{
  ev.currentTarget.blur();
  if(!S||S.menu||S.over||$('confirma'))return;
  /* sem nada em jogo, volta direto; com partida rolando, pergunta antes */
  if(S.round===0&&!S.towers.length){voltaMenu();return}
  pausaAntes=!!S.paused;S.paused=true;S.placing=null;syncHud();
  const d=document.createElement('div');d.id='confirma';
  d.innerHTML=`<div class="sheet" role="dialog" aria-modal="true" aria-labelledby="confTit"><h2 id="confTit">Voltar ao menu?</h2>
    ${S.round>0?`<p>A partida fica salva do jeito que está agora${S.inRound?', no meio da rodada':''}. Para voltar a ela, toque em <b>Continuar</b> no menu.</p>`
      :`<p>A partida em ${MAPAS[S.uf].nome} ainda não começou nenhuma rodada, então vai ser perdida. Nada do que você comprou na loja é perdido.</p>`}
    <div class="row"><button class="hb" id="confFica">Continuar jogando</button><button class="hb sair" id="confSai">Voltar ao menu</button></div></div>`;
  $('stage').appendChild(d);
  $('confFica').onclick=fechaConfirma;$('confSai').onclick=voltaMenu;
  d.onclick=e=>{if(e.target===d)fechaConfirma()};
  $('confFica').focus();
};

/* ---------- progresso entre partidas: fundo, personagens comprados e faixas ---------- */
var INICIAIS={pt:[['militante',1],['haddad',4],['janones',8],['artista',13],['lula',18]],br:[['patriota',1],['nikolas',4],['flavio',8],['pavanato',13],['bolsonaro',18]]};
/* PREMIO_ESTADO: faixa nova (primeira vitória num estado). Era 300; as conquistas passaram a render a metade (2026-11-17) */
var PREMIO={facil:300,normal:500,dificil:900},PREMIO_ESTADO=150;
/* progresso entre partidas: fundo, personagens comprados, faixas, medalhas, lados vencidos e recorde do modo livre */
function progValido(p){return p&&typeof p.fundo==='number'&&p.fundo>=0}
function progDe(p){return{fundo:Math.floor(p.fundo),donos:p.donos||{},faixas:p.faixas||{},difs:difsDe(p.difs,p.faixas),medalhas:p.medalhas||{},lados:p.lados||{},recorde:p.recorde|0,est:estDe(p.est)}}
/* dificuldades vencidas em cada estado (Fácil, Normal, Difícil). Progresso antigo só guardava a maior:
   nesse caso, marca só aquela, que é a única que dá para ter certeza */
function difsDe(d,faixas){
  const r={},ok=['facil','normal','dificil'];
  if(d&&typeof d==='object')for(const[uf,v]of Object.entries(d)){if(!/^[A-Z]{2}$/.test(uf)||!v||typeof v!=='object')continue;r[uf]={};for(const k of ok)if(v[k])r[uf][k]=1}
  for(const[uf,n]of Object.entries(faixas||{})){if(!/^[A-Z]{2}$/.test(uf))continue;const k=ok[(n|0)-1];if(k&&!r[uf]){r[uf]={[k]:1}}}
  return r;
}
/* estatísticas guardadas junto com o progresso: só números e contagens por chave (o que vier estranho de um código importado é descartado) */
function estDe(e){
  e=e&&typeof e==='object'?e:{};
  const n=v=>Number.isFinite(+v)&&+v>=0?+v:0,mapa=o=>{const r={};if(o&&typeof o==='object')for(const[k,v]of Object.entries(o))if(/^[a-zA-Z]{1,20}$/.test(k))r[k]=n(v);return r};
  return{partidas:n(e.partidas),vitorias:n(e.vitorias),derrotas:n(e.derrotas),conv:n(e.conv),tempo:n(e.tempo),
    porPers:mapa(e.porPers),colocados:mapa(e.colocados),porMapa:mapa(e.porMapa),porLado:mapa(e.porLado)};
}
const somaEst=(campo,k,v)=>{const o=PROG.est[campo];o[k]=(o[k]||0)+(v||1)};
var PROG=(()=>{try{const p=JSON.parse(localStorage.getItem('gn_prog'));if(progValido(p))return progDe(p)}catch(e){}return progDe({fundo:0})})();
function salvaProg(){try{localStorage.setItem('gn_prog',JSON.stringify(PROG))}catch(e){}try{window.GN_PONTE&&GN_PONTE.progSalvo&&GN_PONTE.progSalvo(PROG)}catch(e){}}
/* ---------- registro das partidas (para ajustar o equilíbrio) ----------
   Cada partida guarda tudo o que o jogador fez: onde e quando colocou cada personagem, cada evolução, venda, desfazer,
   especial e poder do herói, obstáculos tirados, e uma foto de cada rodada (apoio, verba, quem escapou, dano e convencidos
   de cada personagem). No fim (vitória, derrota ou partida abandonada) o registro vai para o servidor (POST /api/partidas);
   sem servidor (site estático, sem internet), fica guardado neste navegador e é reenviado depois, e dá para baixar em Opções.
   Nada pessoal é enviado: só as jogadas, um código aleatório da partida e o tamanho da tela. Desliga em Opções. */
const REG_URL=((window.GN_PONTE&&GN_PONTE.api)||'')+'/api/partidas',REG_FILA='gn_registros',REG_MAX=40,REG_VERSAO=1;
/* abas de teste (robô e testes automáticos) marcam window.__semRegistro: partida de teste não vira registro */
const regAtivo=()=>OPC.registro!==false&&!window.Robo&&!window.__semRegistro;
function regNovo(){
  const M=MAPAS[S.uf];
  S.reg={v:REG_VERSAO,id:Date.now().toString(36)+Math.random().toString(36).slice(2,8),inicio:new Date().toISOString(),
    uf:S.uf,mapa:M.nome,nivelMapa:NOMES_TIER[M.tier]||M.tier,tamanhoAvenida:Math.round(M.len),avenidas:VIAS().length,
    lado:S.side,dificuldade:S.diff,modo:S.modo||'classico',desafioDia:S.desafioDia||null,...(S.livre?{modoLivreDesde:S.round}:{}),
    personagensComprados:Object.keys(PROG.donos).length,tela:[innerWidth,innerHeight],toque:!!(window.matchMedia&&matchMedia('(pointer:coarse)').matches),
    ajustes:{limitePorPersonagem:null,limiteHerois:1,custoHeroiPresidente:HEROI_CUSTO,rendaEvolucoes:RENDA_EVO,apertoDificil:APERTO_DIF,pressaoDesafio:[PRESSAO_PASSO,PRESSAO_MAX,PRESSAO_SEQ,PRESSAO_DESDE,PRESSAO_ALIVIO,PRESSAO_VEIC,PRESSAO_VEL]},ev:[],rodadas:[]};
}
/* um acontecimento da partida (tipo + dados), com a rodada, o tempo de jogo e a verba naquela hora */
function regEv(tipo,dados){
  if(!S||S.menu||S.restaurando||!regAtivo())return;
  if(!S.reg)regNovo();
  S.reg.ev.push({t:tipo,r:S.round,s:+(S.time||0).toFixed(1),verba:Math.floor(S.cash),...dados});
}
const regTorre=t=>({id:t.id,k:t.key,a:t.a,b:t.b,conv:t.kills|0,dano:Math.round(t.dano||0),...(t.T.only?{nivel:t.nivel||1,xp:Math.floor(t.xp||0)}:{}),...(t.caixa?{cofre:t.caixa}:{})});
/* foto do fim de cada rodada */
function regRodada(inc){
  if(!S.reg||!regAtivo())return;
  const R=S.reg,ant=R._convAnt|0;
  R.rodadas.push({r:S.round,apoio:Math.ceil(S.lives),perdeu:Math.max(0,Math.round((S.vidaIni||S.lives)-S.lives)),verba:Math.floor(S.cash),rendaFimRodada:inc,
    convencidos:S.conv-ant,escaparam:S.escRod||{},duracao:+((S.time||0)-(S.inicioRodadaT||0)).toFixed(1),
    eventos:[S.chuva&&'chuva',S.enche&&'enchente',S.viaFechada>=0&&'avenidaFechada'].filter(Boolean),
    ...(S.modo==='voto'&&S.votos?{votos:+pctVotos().toFixed(1)}:{}),...(S.modo==='desafio'?{pressao:+(S.pressao||0).toFixed(2)}:{}),torres:S.towers.map(regTorre)});
  R._convAnt=S.conv;S.escRod={};
}
function regFim(resultado,extra){
  if(!S.reg||!regAtivo())return;
  const R=S.reg;delete R._convAnt;
  R.fim={resultado,rodada:S.round,apoio:Math.ceil(S.lives),verba:Math.floor(S.cash),convencidos:S.conv,verbaGanha:Math.round(S.ganho||0),
    rodadasSemPerder:S.limpas,motivo:S.motivo||null,quando:new Date().toISOString(),...(extra||{}),
    torres:S.towers.map(t=>({...regTorre(t),x:Math.round(t.x),y:Math.round(t.y),habilidades:t.habCont||{},gasto:Math.round(t.spent||0)}))};
  regEnvia(R);S.reg=null;
}
/* partida em andamento (2026-11-17): ao sair para o menu, ao esconder ou fechar a aba, manda uma cópia do registro até
   aqui, sem "fim" (no banco fica sem resultado). A partida continua com o mesmo id: quando terminar, o registro final
   substitui este no servidor, e um envio atrasado em andamento não apaga um resultado (veja backend/src/partidas.ts) */
function regParcial(){
  if(!S||!S.reg||S.over||S.menu||!regAtivo())return;
  const R=JSON.parse(JSON.stringify(S.reg));delete R._convAnt;
  R.andamento={rodada:S.round,emRodada:!!S.inRound,apoio:Math.ceil(S.lives),verba:Math.floor(S.cash),convencidos:S.conv,quando:new Date().toISOString(),torres:S.towers.map(regTorre)};
  regEnvia(R);
}
function regFila(){try{const f=JSON.parse(localStorage.getItem(REG_FILA));return Array.isArray(f)?f:[]}catch(e){return[]}}
function regGuardaFila(f){try{localStorage.setItem(REG_FILA,JSON.stringify(f.slice(-REG_MAX)))}catch(e){}}
/* envia um registro; se não der, guarda na fila e tenta de novo depois */
function regEnvia(reg){
  const f=regFila().filter(x=>x.id!==reg.id);f.push(reg);regGuardaFila(f);regTentaFila();
}
let regEnviando=false;
async function regTentaFila(){
  if(regEnviando||!regAtivo()||!window.fetch)return;regEnviando=true;
  try{
    for(const reg of regFila()){
      const r=await fetch(REG_URL,{method:'POST',headers:{'Content-Type':'application/json',...(window.GN_PONTE&&GN_PONTE.token&&GN_PONTE.token()?{Authorization:'Bearer '+GN_PONTE.token()}:{})},body:JSON.stringify(reg),keepalive:true}).catch(()=>null);
      if(!r||!r.ok)break;
      regGuardaFila(regFila().filter(x=>x.id!==reg.id));
    }
  }finally{regEnviando=false}
}
/* partida salva que foi trocada por outra: vai como "abandonada" */
function regAbandonada(d){if(d&&d.reg&&!d.reg.fim&&regAtivo()){d.reg.fim={resultado:'abandonada',rodada:d.round,apoio:Math.ceil(d.lives),quando:new Date().toISOString()};regEnvia(d.reg)}}
/* baixar os registros que ainda estão guardados neste navegador */
function regBaixa(){
  const f=regFila(),b=new Blob([f.map(x=>JSON.stringify(x)).join('\n')+'\n'],{type:'application/x-ndjson'}),a=document.createElement('a');
  a.href=URL.createObjectURL(b);a.download='guerra-de-narrativas-partidas.jsonl';document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500);
}
/* partida salva no fim de cada rodada: fechar a página ou voltar ao menu não perde o jogo */
function salvaPartida(){
  if(!S||S.menu||S.over)return;
  const d={v:1,diff:S.diff,side:S.side,uf:S.uf,round:S.round,lives:S.lives,cash:Math.floor(S.cash),abilCd:S.abilCd,speed:S.speed,
    livre:S.livre,modo:S.modo||'classico',permitidos:S.permitidos||null,desafioDia:S.desafioDia||null,
    est:{perdeu:S.perdeu,usouLoja:!!S.usouLoja,conv:S.conv,ganho:S.ganho,limpas:S.limpas,vidaIni:S.vidaIni,poderesN:S.poderesN|0,votos:S.votos||null,votoMin:S.votoMin??null,pressao:S.pressao||0,seqLimpa:S.seqLimpa|0},
    towers:S.towers.map(t=>({k:t.key,x:t.x,y:t.y,a:t.a,b:t.b,m:t.mode,sp:t.spent,ki:t.kills,cx:t.caixa||0,lv:t.nivel||1,xp:t.xp||0,pc:Math.max(0,t.podCd||0),tr:[t.trD||0,t.trA||0,t.trV||0]})),
    poder:{esc:S.escudoN||0,inv:S.investe||0,rx:S.rodadaX||0,eco:S.ecoN||0},removidos:S.removidos||[],reg:S.reg||null};
  /* no meio da rodada: quem está na avenida, quem ainda vai chegar e o relógio da rodada */
  if(S.inRound)d.em={fila:S.queue.map(q=>[+q.t.toFixed(2),q.type]),spawnT:+S.spawnT.toFixed(2),hpMul:S.hpMul,cessarT:S.cessarT||0,
    inimigos:S.enemies.filter(e=>!e.dead).map(e=>[e.type,Math.round(e.d),+e.hp.toFixed(2),+e.max.toFixed(2),e.via|0])};
  try{localStorage.setItem('gn_partida',JSON.stringify(d))}catch(e){}
}
/* durante a rodada, salva a cada 5 segundos de jogo, e sempre que você sai do app ou fecha a página */
addEventListener('pagehide',()=>{if(S&&!S.menu&&!S.over&&S.round>0)salvaPartida()});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&S&&!S.menu&&!S.over&&S.round>0)salvaPartida()});
function lePartida(){
  try{const d=JSON.parse(localStorage.getItem('gn_partida'));if(d&&d.v===1&&DIFFS[d.diff]&&SIDES[d.side]&&ESTADOS.some(e=>e[0]===d.uf)&&d.round>0)return d}catch(e){}
  return null;
}
function apagaPartida(){
  /* começar outra partida por cima de uma salva: a salva vai para o registro como abandonada (não quando a própria partida acabou) */
  const d=lePartida();if(d&&d.reg&&!(S&&S.reg&&S.reg.id===d.reg.id))regAbandonada(d);
  try{localStorage.removeItem('gn_partida')}catch(e){}
}
function continuaPartida(){
  const d=lePartida();if(!d)return;
  $('overlay').classList.add('hide');
  newGame(d.diff,false,d.side,d.uf);
  /* recoloca cada personagem com as evoluções que tinha, sem cobrar de novo */
  S.round=d.round;S.cash=1e9;
  /* recolocar os personagens não conta como compra nas estatísticas, e a partida já foi contada quando começou */
  S.restaurando=true;S.contada=true;
  /* obstáculos já tirados: some antes de recolocar os personagens, que podem estar no lugar deles */
  if(Array.isArray(d.removidos)){S.removidos=d.removidos.filter(n=>Number.isInteger(n));paintBg()}
  S.modo=d.modo||'classico';S.permitidos=d.permitidos||null;S.desafioDia=d.desafioDia||null;
  for(const o of d.towers){
    if(!TOWERS[o.k])continue;
    const t=place(o.k,o.x,o.y);if(!t)continue;
    t.a=Math.min(3,o.a|0);t.b=Math.min(3,o.b|0);t.nivel=o.lv||1;t.xp=o.xp||0;calcStats(t);
    t.mode=o.m||'first';t.spent=o.sp||t.spent;t.kills=o.ki|0;if(o.cx)t.caixa=o.cx;if(o.pc)t.podCd=o.pc;
    if(o.tr){t.trD=+o.tr[0]||0;t.trA=+o.tr[1]||0;t.trV=+o.tr[2]||0}
  }
  if(d.poder){S.escudoN=d.poder.esc|0;S.investe=d.poder.inv|0;S.rodadaX=+d.poder.rx||0;S.ecoN=d.poder.eco|0}
  S.restaurando=false;
  /* o registro da partida continua de onde parou */
  S.reg=d.reg&&typeof d.reg==='object'&&Array.isArray(d.reg.ev)?d.reg:null;
  S.cash=d.cash;S.lives=d.lives;S.abilCd=d.abilCd||0;S.speed=d.speed||1;S.auto=false;S.paused=false;S.sel=null;S.placing=null;
  S.livre=!!d.livre;if(d.est)Object.assign(S,{perdeu:!!d.est.perdeu,usouLoja:!!d.est.usouLoja,conv:d.est.conv|0,ganho:+d.est.ganho||0,limpas:d.est.limpas|0,vidaIni:d.est.vidaIni||S.lives,poderesN:d.est.poderesN|0,pressao:Math.min(PRESSAO_MAX,Math.max(0,+d.est.pressao||0)),seqLimpa:d.est.seqLimpa|0});
  if(d.est&&d.est.votos&&typeof d.est.votos==='object')S.votos={nos:+d.est.votos.nos||0,eles:+d.est.votos.eles||0};
  if(d.est&&Number.isFinite(d.est.votoMin))S.votoMin=d.est.votoMin;
  regEv('continuou',{noMeioDaRodada:!!d.em,torres:S.towers.map(t=>({id:t.id,k:t.key,a:t.a,b:t.b,x:Math.round(t.x),y:Math.round(t.y)}))});
  if(d.em){
    /* volta para o meio da rodada, pausada, para você se situar antes de continuar */
    S.inRound=true;S.queue=d.em.fila.map(([t,type])=>({t,type}));S.spawnT=d.em.spawnT;S.hpMul=d.em.hpMul;S.cessarT=d.em.cessarT||0;
    for(const[type,dd,hp,max,via]of d.em.inimigos){if(!ENEMY[type])continue;const e=spawn(type,dd,S.hpMul,Math.min(via|0,VIAS().length-1));e.hp=hp;e.max=max}
    S.paused=true;
  }
  buildShop();renderPanel();syncHud();
  banner(d.em?'Partida retomada no meio da rodada '+d.round+' (pausada)':'Partida retomada: rodada '+(d.round+1)+(S.livre?'':' de 40'));
  dicaGiro();
}
/* os personagens iniciais vão sendo liberados por rodada (1, 4, 8, 13, 18) só até o jogador vencer o primeiro mapa;
   depois disso, todos ficam liberados desde a rodada 1 (2026-11-17). Retorna 0 para quem não é inicial */
const liberaTudo=()=>!!(PROG&&PROG.faixas&&Object.keys(PROG.faixas).length);
function rodadaLibera(side,k){const q=INICIAIS[side].find(x=>x[0]===k);return q?(liberaTudo()?1:q[1]):0}
function shopKeys(side){
  /* no desafio do dia, só os 5 sorteados; em "Só gratuitos", só os iniciais */
  if(S&&S.permitidos&&!S.menu)return S.permitidos.slice();
  const ini=INICIAIS[side].map(x=>x[0]);
  if(S&&S.modo==='gratis'&&!S.menu)return ini;
  return [...ini,...SIDES[side].order.filter(k=>PROG.donos[k]&&!ini.includes(k))];
}
function disponivel(k){
  if(S&&S.permitidos)return S.permitidos.includes(k);
  if(S&&S.modo==='gratis'&&!INICIAIS[S.side].some(x=>x[0]===k))return false;
  if(PROG.donos[k])return true;
  const r=rodadaLibera(S.side,k);
  return r>0&&S.round+(S.inRound?0:1)>=r;
}
/* presidentes (heróis) ficam no Palácio, bem mais caros que o resto da loja; o custo de partida já foi multiplicado
   por HEROI_CUSTO, então a faixa de preço comum é calculada com o custo original */
/* preço de cada presidente no Palácio (2026-11-17, já com os poderes próprios): cada um jogou no lugar do herói gratuito, com a
   equipe gratuita, no Difícil em 8 mapas. Preço = F$ 3.000 + F$ 500 por rodada média acima (ou abaixo) da mediana (34,7),
   arredondado a 50. Rodada média: Dilma 31,9; Nixon 33,5; Abbas 33,7; Trump 34,1; Bukele 34,2; Maduro 34,6; de Gaulle 34,8;
   Milei 35,4; Temer 35,5; Putin 36,4; Reagan 36,5; Xi 37,4 */
const PRECO_HEROI=3000,PRECO_HEROI_FORCA={dilma:1600,nixon:2400,abbas:2500,trump:2700,bukele:2750,maduro:2950,gaulle:3050,milei:3350,vampirao:3400,putin:3850,reagan:3900,xi:4350};
/* personagens comuns (2026-11-17): cada um tem um preço próprio, PRECO_LOJA_X vezes o preço dele na partida (no Normal),
   arredondado a F$ 50. Antes eram só 4 faixas (400, 600, 900 e 1.500); como o preço da partida já segue a força medida
   pelo robô (AJUSTE_FORCA), a loja acompanha */
const PRECO_LOJA_X=1.5;
function precoLoja(k){const T=TOWERS[k];if(T.presidente)return PRECO_HEROI_FORCA[k]||PRECO_HEROI;if(T.only)return 1500;return Math.max(250,Math.round(T.cost*DIFFS.normal.cost*PRECO_LOJA_X/50)*50)}
function iconeDe(k){const T=TOWERS[k];return T.building||(T.tank&&(T.tank===2?'tank2':'tank'))}
/* bandeiras simplificadas: h/v listras, r retângulo, t triângulo, l faixa, d disco, s estrela, m losango (medidas de 0 a 1) */
var BANDEIRAS={
  AC:[['t','#f2c83a',0,0,1,0,0,1],['t','#1f8a4d',1,0,1,1,0,1],['s','#c8102e',.2,.25,.16]],
  AL:[['v','#c8102e','#fff','#2456a6'],['d','#d9a400',.5,.5,.22]],
  AM:[['h','#fff','#c8102e','#fff'],['r','#2456a6',0,0,.4,.45],['s','#fff',.2,.22,.12]],
  AP:[['h','#2456a6','#1f8a4d','#f2c83a','#17181d'],['t','#f4f4f0',0,0,.35,.5,0,1]],
  BA:[['h','#fff','#c8102e','#fff','#c8102e','#fff'],['r','#2456a6',0,0,.38,.6],['t','#fff',.19,.12,.31,.46,.07,.46]],
  CE:[['h','#1f8a4d'],['m','#f2c83a',.5,.5,.42,.42],['d','#fff',.5,.5,.2]],
  DF:[['h','#fff','#1f8a4d','#fff'],['s','#f2c83a',.5,.5,.2]],
  ES:[['h','#2456a6','#fff','#e8a0b8']],
  GO:[['h','#1f8a4d','#f2c83a','#1f8a4d','#f2c83a','#1f8a4d'],['r','#2456a6',0,0,.38,.6],['s','#fff',.19,.3,.12]],
  MA:[['h','#c8102e','#fff','#17181d','#fff','#c8102e','#fff','#17181d','#fff','#c8102e'],['r','#2456a6',0,0,.35,.55],['s','#fff',.175,.27,.14]],
  MG:[['h','#fff'],['t','#c8102e',.5,.2,.7,.75,.3,.75]],
  MT:[['h','#2456a6'],['m','#fff',.5,.5,.42,.42],['d','#1f8a4d',.5,.5,.2],['s','#f2c83a',.5,.5,.14]],
  MS:[['h','#1f8a4d'],['t','#2456a6',0,0,1,0,1,.8],['l','#fff',0,.05,1,.85,.14],['s','#f2c83a',.72,.22,.16]],
  PA:[['h','#c8102e'],['l','#fff',0,.5,1,.5,.28],['s','#2456a6',.5,.5,.16]],
  PB:[['v','#c8102e','#17181d','#17181d']],
  PR:[['h','#1f8a4d'],['l','#fff',0,.85,1,.15,.28],['d','#2456a6',.5,.5,.2]],
  PE:[['h','#2456a6','#fff'],['d','#f2c83a',.5,.5,.18],['s','#c8102e',.5,.2,.12],['r','#c8102e',.47,.5,.06,.45],['r','#c8102e',.3,.72,.4,.05]],
  PI:[['h','#1f8a4d','#f2c83a','#1f8a4d','#f2c83a','#1f8a4d'],['r','#2456a6',0,0,.4,.6],['s','#fff',.2,.3,.14]],
  RJ:[['r','#2456a6',0,0,.5,.5],['r','#2456a6',.5,.5,.5,.5],['r','#fff',.5,0,.5,.5],['r','#fff',0,.5,.5,.5],['d','#f2c83a',.5,.5,.16]],
  RN:[['h','#1f8a4d','#fff'],['d','#f2c83a',.5,.5,.2]],
  RS:[['h','#f2c83a'],['t','#1f8a4d',0,0,1,0,0,1],['l','#c8102e',0,1,1,0,.24],['d','#fff',.5,.5,.16]],
  RO:[['h','#2456a6','#f2c83a'],['t','#1f8a4d',.5,.6,1,1,0,1],['s','#fff',.5,.28,.2]],
  RR:[['h','#2456a6','#1f8a4d'],['t','#f2c83a',.5,.25,.95,1,.05,1],['s','#fff',.5,.15,.12],['r','#c8102e',0,.93,1,.07]],
  SC:[['h','#c8102e','#fff','#c8102e'],['m','#1f8a4d',.5,.5,.28,.3]],
  SP:[['h','#fff','#17181d','#fff','#17181d','#fff','#17181d','#fff','#17181d','#fff','#17181d','#fff','#17181d','#fff'],['r','#c8102e',0,0,.38,.54],['d','#fff',.19,.27,.16],['s','#2456a6',.19,.27,.1]],
  SE:[['h','#1f8a4d','#f2c83a','#1f8a4d','#f2c83a','#1f8a4d'],['r','#2456a6',0,0,.35,.55],['s','#fff',.17,.27,.1]],
  TO:[['h','#2456a6','#fff'],['l','#f2c83a',0,1,1,0,.34],['d','#f2c83a',.72,.3,.13]]
};
function pintaBandeira(c,uf,w,h){
  for(const[k,...a]of BANDEIRAS[uf]){
    if(k==='h'||k==='v')a.forEach((cor,i)=>{c.fillStyle=cor;if(k==='h')c.fillRect(0,i*h/a.length,w,h/a.length+1);else c.fillRect(i*w/a.length,0,w/a.length+1,h)});
    else if(k==='r'){c.fillStyle=a[0];c.fillRect(a[1]*w,a[2]*h,a[3]*w,a[4]*h)}
    else if(k==='t'){c.fillStyle=a[0];c.beginPath();c.moveTo(a[1]*w,a[2]*h);c.lineTo(a[3]*w,a[4]*h);c.lineTo(a[5]*w,a[6]*h);c.closePath();c.fill()}
    else if(k==='l'){c.strokeStyle=a[0];c.lineWidth=a[5]*h;c.lineCap='butt';c.beginPath();c.moveTo(a[1]*w,a[2]*h);c.lineTo(a[3]*w,a[4]*h);c.stroke()}
    else if(k==='d'){c.fillStyle=a[0];disc(c,a[1]*w,a[2]*h,a[3]*h)}
    else if(k==='s'){c.fillStyle=a[0];star(c,a[1]*w,a[2]*h,a[3]*h)}
    else if(k==='m'){c.fillStyle=a[0];c.beginPath();c.moveTo(a[1]*w,(a[2]-a[4])*h);c.lineTo((a[1]+a[3])*w,a[2]*h);c.lineTo(a[1]*w,(a[2]+a[4])*h);c.lineTo((a[1]-a[3])*w,a[2]*h);c.closePath();c.fill()}
  }
}
/* desenha a faixa: a bandeira do estado recortada numa fita com a ponta em V */
function pintaFaixas(root){
  root.querySelectorAll('canvas[data-fx]').forEach(cn=>{
    const w=cn.width=120,h=cn.height=56,c=cn.getContext('2d'),m=4;
    const fita=()=>{c.beginPath();c.moveTo(m,m);c.lineTo(w-m,m);c.lineTo(w-m-14,h/2);c.lineTo(w-m,h-m);c.lineTo(m,h-m);c.closePath()};
    c.save();fita();c.clip();pintaBandeira(c,cn.dataset.fx,w,h);c.restore();
    fita();c.strokeStyle='#1d1a16';c.lineWidth=2.4;c.stroke();
  });
}
/* miniatura do mapa, desenhada com o mesmo chão, lago, avenida e monumento do jogo */
function garanteMapas(){const atual=S.uf;for(const e of ESTADOS)if(!MAPAS[e[0]])buildMap(e[0]);setMap(atual)}
/* as miniaturas ficam guardadas depois da primeira vez: abrir o menu de novo só copia a imagem */
const MINI={};
function pintaMiniatura(cn,uf){
  const chave=uf+'|'+cn.width+'x'+cn.height,pronta=MINI[chave];
  if(pronta){const c=cn.getContext('2d');c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,cn.width,cn.height);c.drawImage(pronta,0,0);return}
  const img=document.createElement('canvas');img.width=cn.width;img.height=cn.height;desenhaMiniatura(img,uf);MINI[chave]=img;
  const c=cn.getContext('2d');c.setTransform(1,0,0,1,0,0);c.drawImage(img,0,0);
}
function desenhaMiniatura(cn,uf){
  const M=MAPAS[uf],B=M.b,k=cn.width/W,c=cn.getContext('2d');
  c.setTransform(k,0,0,k,0,0);
  const fav=M.tema==='favela';
  c.fillStyle=fav?'#b29c74':M.tema==='sertao'?'#e3b873':M.visual==='geada'?'#dce8ee':M.visual==='outono'?'#cf9a3e':B.g;c.fillRect(0,0,W,H);
  let seed=M.i*97+11;const r=()=>(seed=(seed*16807)%2147483647)/2147483647;
  c.globalAlpha=.34;
  for(let i=0;i<40;i++){c.fillStyle=B.p[Math.floor(r()*B.p.length)];c.beginPath();c.ellipse(r()*W,r()*H,40+r()*90,22+r()*40,r()*3,0,7);c.fill()}
  /* favela e sertão: o mesmo desenho do jogo, por baixo da avenida (que vem por cima) */
  c.globalAlpha=1;
  if(fav)desenhaFavela(c,M,r,true);
  if(M.tema==='paulista')desenhaPaulistaChao(c,M,r,true);
  if(M.tema==='sertao')desenhaSertaoChao(c,r);
  c.globalAlpha=1;
  if(M.lake){const L=M.lake;c.fillStyle='#d7c88f';c.beginPath();c.ellipse(L.x,L.y,L.rx+10,L.ry+10,0,0,7);c.fill();c.fillStyle='#3f8fb5';c.beginPath();c.ellipse(L.x,L.y+2,L.rx,L.ry,0,0,7);c.fill()}
  for(const m of M.morros||[])desenhaMorro(c,m);
  c.lineJoin='round';c.lineCap='butt';
  for(const[w,cor]of[[56,'#d9cfb4'],[46,'#45454d']]){c.strokeStyle=cor;c.lineWidth=w;for(const P of [M.path,M.path2,M.path3].filter(Boolean)){c.beginPath();P.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke()}}
  /* túnel na miniatura: a cobertura cinza sobre o trecho */
  if(M.tunel){const sg=segsDe(M.path).seg,pa=d=>{for(const s of sg)if(d<=s.s+s.l){const k=d-s.s;return[s.x+s.dx*k,s.y+s.dy*k]}return[0,0]};
    const[a,b]=[pa(M.tunel.d1),pa(M.tunel.d2)];c.strokeStyle='#7d7a72';c.lineWidth=64;c.beginPath();c.moveTo(a[0],a[1]);c.lineTo(b[0],b[1]);c.stroke()}
  c.save();c.translate(M.lm.x,M.lm.y);c.lineCap='butt';MONUMENTOS[M.ic](c);c.restore();
  for(const z of M.bloq||[])desenhaObra(c,z);
  for(const b of M.predios||[])desenhaPredio(c,b);
  for(const o of M.obst||[])desenhaObst(c,o);
  const[fx,fy]=M.path[M.path.length-1];
  marcaDestino(c,fx,fy,24);
  c.setTransform(1,0,0,1,0,0);
}
const fmtF=v=>v.toLocaleString('pt-BR');
function menuLoja(){
  const lado=lojaLado||menuSide,ini=INICIAIS[lado].map(x=>x[0]);
  const passa=k=>lojaFiltro==='todos'||(lojaFiltro==='tenho'?(ini.includes(k)||PROG.donos[k]):(!ini.includes(k)&&!PROG.donos[k]&&PROG.fundo>=precoLoja(k)));
  const card=k=>{const T=TOWERS[k],r=rodadaLibera(lado,k),dono=PROG.donos[k],p=precoLoja(k);
    return `<div class="lojaCard ${r||dono?'tem':''}"><canvas data-ico="${k}"></canvas><b>${T.nome}</b><small title="${T.desc.replace(/"/g,'&quot;')}">${T.desc}</small><button class="mini verEvo" data-ficha="${k}">Ver evoluções</button><div class="lojaAcao">${r?`<em>${r>1?'Inicial, libera na rodada '+r:'Inicial, liberado'}</em>`:dono?'<em>Liberado</em>':`<button class="hb" data-buy="${k}" ${PROG.fundo<p?'disabled':''}>F$ ${fmtF(p)}</button>`}</div></div>`};
  const resto=SIDES[lado].order.filter(k=>!ini.includes(k)&&!TOWERS[k].presidente&&!TOWERS[k].exclusivo);
  const pres=SIDES[lado].order.filter(k=>TOWERS[k].presidente),presTem=pres.filter(k=>PROG.donos[k]).length;
  const atalho=`<div class="palLink"><span><b>★ Palácio dos Heróis</b><br><small>Os presidentes agora são heróis: sobem de nível e cada um tem um poder próprio. ${presTem} de ${pres.length} liberados.</small></span><button class="hb" data-aba-ir="herois">Ver heróis</button></div>`;
  /* faixas de preço só para organizar a lista; dentro de cada uma, do mais barato ao mais caro */
  const faixasLoja=[[0,500,'Até F$ 500'],[500,800,'De F$ 550 a 800'],[800,1200,'De F$ 850 a 1.200'],[1200,1e9,'Acima de F$ 1.200']];
  const grupos=[['Personagens iniciais',ini],...faixasLoja.map(([a,b,n])=>[n,resto.filter(k=>precoLoja(k)>a&&precoLoja(k)<=b).sort((x,y)=>precoLoja(x)-precoLoja(y))])].map(([t,l])=>[t,l.filter(passa)]).filter(([,l])=>l.length);
  return `<div class="lojaTopo"><div class="seg">${Object.keys(SIDES).map(k=>`<button class="${lado===k?'on':''}" data-l="${k}">${k==='pt'?'Esquerda':'Direita'}</button>`).join('')}</div>
    <div class="seg">${[['todos','Todos'],['comprar','Posso comprar'],['tenho','Já tenho']].map(([k,n])=>`<button class="${lojaFiltro===k?'on':''}" data-f="${k}">${n}</button>`).join('')}</div></div>
    <div class="lojaResumo"><span>Você tem <b>F$ ${fmtF(PROG.fundo)}</b></span><span><b>${SIDES[lado].order.filter(k=>!TOWERS[k].presidente&&(ini.includes(k)||PROG.donos[k])).length} de ${SIDES[lado].order.filter(k=>!TOWERS[k].presidente).length}</b> personagens liberados deste lado</span><span title="Mais F$ ${PREMIO_ESTADO} na primeira vitória em cada estado">Cada vitória vale <b>F$ ${PREMIO.facil}</b> (Fácil), <b>${PREMIO.normal}</b> (Normal) ou <b>${PREMIO.dificil}</b> (Difícil)</span></div>
    ${atalho}${ctaFs()}
    ${grupos.length?grupos.map(([t,l])=>`<h3 class="fxTit">${t}</h3><div class="lojaGrid">${l.map(card).join('')}</div>`).join(''):'<p class="lojaVazia">Nenhum personagem aqui ainda.</p>'}`;
}
function ligaLoja(o){
  const corpo=o.querySelector('.abaCorpo'),denovo=()=>{const y=o.querySelector('.abaCorpo').scrollTop;renderMenu('loja');o.querySelector('.abaCorpo').scrollTop=y};
  /* na loja, o personagem aparece de corpo inteiro, como fica no mapa */
  o.querySelectorAll('canvas[data-ico]').forEach(cn=>{pintaEvo(cn,cn.dataset.ico,0,0,100);cn.title='Ver evoluções';cn.onclick=()=>abreFicha(cn.dataset.ico)});
  o.querySelectorAll('[data-ficha]').forEach(b=>b.onclick=()=>abreFicha(b.dataset.ficha));
  o.querySelectorAll('[data-l]').forEach(b=>b.onclick=()=>{lojaLado=b.dataset.l;renderMenu('loja')});
  o.querySelectorAll('[data-f]').forEach(b=>b.onclick=()=>{lojaFiltro=b.dataset.f;renderMenu('loja')});
  o.querySelectorAll('[data-buy]').forEach(b=>b.onclick=()=>{const k=b.dataset.buy,p=precoLoja(k);if(PROG.fundo<p||PROG.donos[k])return;PROG.fundo-=p;PROG.donos[k]=1;salvaProg();avisoMedalhas=checaMedalhas({});beep(760,.1,'triangle',.06);denovo()});
  o.querySelectorAll('[data-aba-ir]').forEach(b=>b.onclick=()=>renderMenu(b.dataset.abaIr));
  corpo.scrollTop=0;
}
/* Palácio dos Heróis: a loja dos heróis (o inicial do lado e os presidentes), separada e mais cara que a comum */
function menuHerois(){
  const lado=lojaLado||menuSide,C=SIDES[lado],ini=INICIAIS[lado].map(x=>x[0]);
  /* o herói gratuito primeiro; depois os presidentes, do mais barato ao mais caro */
  const lista=C.order.filter(k=>TOWERS[k].only&&!TOWERS[k].exclusivo).sort((a,b)=>(rodadaLibera(lado,b)?1:0)-(rodadaLibera(lado,a)?1:0)||precoLoja(a)-precoLoja(b));
  const card=k=>{const T=TOWERS[k],r=rodadaLibera(lado,k),dono=PROG.donos[k],p=precoLoja(k),tem=r||dono;
    const perks=['Sobe até o nível 10','2 especiais próprios','R$ '+Math.round(T.cost*DIFFS.normal.cost/5)*5+' na partida'];
    return `<div class="heroiCard${tem?' dono':''}"><div class="faixa"></div><span class="heroiSelo">${T.presidente?'PRESIDENTE':'HERÓI DO LADO'}</span>
      <canvas data-ico="${k}"></canvas><b>${T.nome}</b><div class="perks">${perks.map(x=>`<span>${x}</span>`).join('')}</div>
      <div class="poderH"><b>★ ${nomePoderHeroi(k)}</b> ${(HEROI_PODER[k]||[,''])[1]}</div>
      <small>${T.desc}</small><button class="mini verEvo" data-ficha="${k}">Ver evoluções</button>
      <div class="lojaAcao">${r?`<em>${r>1?'Inicial: libera na rodada '+r:'✓ Inicial, liberado'}</em>`:dono?'<em>✓ Liberado</em>':`<button class="hb" data-buy="${k}" ${PROG.fundo<p?'disabled':''}>Liberar por F$ ${fmtF(p)}</button>`}</div></div>`};
  const pres=lista.filter(k=>TOWERS[k].presidente),tem=pres.filter(k=>PROG.donos[k]).length;
  return `<div class="lojaTopo"><div class="seg">${Object.keys(SIDES).map(k=>`<button class="${lado===k?'on':''}" data-l="${k}">${k==='pt'?'Esquerda':'Direita'}</button>`).join('')}</div></div>
    <div class="palTopo"><b>★ Palácio dos Heróis</b>
      <ul><li>Só cabe <strong>1 herói em campo</strong> por vez. Para trocar, venda o que está no mapa.</li>
      <li>O herói ganha experiência, sobe até o nível 10 e fica mais forte a cada nível.</li>
      <li>Cada herói tem um <strong>poder próprio</strong>, liberado quando ele chega ao nível 10 (o máximo). Ele aparece entre os especiais do canto do mapa, com uma ★.</li>
      <li>Como todo personagem, cada herói tem um especial próprio em cada caminho de evolução, com botão próprio.</li>
      <li>Presidentes liberados deste lado: ${tem} de ${pres.length}.</li></ul></div>
    ${ctaFs()}
    <div class="heroiGrid">${lista.map(card).join('')}</div>`;
}
/* Como jogar: escolhe qual parte do tutorial ver */
function menuComo(){
  return `<div class="tutoPartes">${TUTO_PARTES.map(([,n,d],i)=>`<button class="tutoParteBt" data-tuto="${i}"><b>${n}</b><small>${d}</small><em>${tutoParteVista(i)?'✓ vista':'ainda não vista'}</em></button>`).join('')}</div>`;
}
function ligaHerois(o){
  const denovo=()=>{const y=o.querySelector('.abaCorpo').scrollTop;renderMenu('herois');o.querySelector('.abaCorpo').scrollTop=y};
  o.querySelectorAll('canvas[data-ico]').forEach(cn=>{pintaEvo(cn,cn.dataset.ico,0,0,100);cn.title='Ver evoluções';cn.onclick=()=>abreFicha(cn.dataset.ico)});
  o.querySelectorAll('[data-ficha]').forEach(b=>b.onclick=()=>abreFicha(b.dataset.ficha));
  o.querySelectorAll('[data-l]').forEach(b=>b.onclick=()=>{lojaLado=b.dataset.l;renderMenu('herois')});
  o.querySelectorAll('[data-buy]').forEach(b=>b.onclick=()=>{const k=b.dataset.buy,p=precoLoja(k);if(PROG.fundo<p||PROG.donos[k])return;PROG.fundo-=p;PROG.donos[k]=1;salvaProg();avisoMedalhas=checaMedalhas({});beep(880,.14,'triangle',.08);denovo()});
}

/* ---------- opções: som, tela e levar o progresso para outro aparelho ---------- */
const codigoDe=p=>'GN1:'+btoa(unescape(encodeURIComponent(JSON.stringify(p))));
function progDoCodigo(txt){
  try{const s=txt.trim().replace(/\s+/g,'');if(!s.startsWith('GN1:'))return null;const p=JSON.parse(decodeURIComponent(escape(atob(s.slice(4)))));return progValido(p)?progDe(p):null}catch(e){return null}
}
const resumoProg=p=>`F$ ${fmtF(p.fundo)}, ${Object.keys(p.donos).length} personagens comprados, ${Object.keys(p.faixas).length} faixas e ${Object.keys(p.medalhas).length} medalhas`;
function menuOpc(){
  const caixa=(k,txt,on)=>`<label class="opc"><input type="checkbox" data-o="${k}" ${on?'checked':''}><span>${txt}</span></label>`;
  return `<h3 class="fxTit">Som</h3>
    ${caixa('som','Efeitos sonoros',!OPC.mute)}
    <label class="opc opcVol"><span>Volume dos efeitos</span><input type="range" min="0" max="100" step="5" data-vol="volFx" value="${Math.round(OPC.volFx*100)}" aria-label="Volume dos efeitos"><b>${Math.round(OPC.volFx*100)}%</b></label>
    ${caixa('musica','Música de fundo durante a partida (cada lado tem a sua)',OPC.musica)}
    <label class="opc opcVol"><span>Volume da música</span><input type="range" min="0" max="100" step="5" data-vol="volMus" value="${Math.round(OPC.volMus*100)}" aria-label="Volume da música"><b>${Math.round(OPC.volMus*100)}%</b></label>
    <h3 class="fxTit">Tela</h3>
    ${caixa('calmo','Tela calma: sem tremor, sem clarões e sem câmera lenta',OPC.calmo)}
    ${caixa('daltonico','Cores fáceis: cores seguras para daltônicos, contorno nos adversários e bordas tracejadas',OPC.daltonico)}
    ${caixa('mouseGrande','Mouse em destaque: cursor grande e amarelo, com um anel em volta dele no mapa',OPC.mouseGrande!==false)}
    <div class="opc opcTam"><span>Tamanho do texto</span><div class="seg" role="group" aria-label="Tamanho do texto">${[[1,'Normal'],[2,'Grande'],[3,'Maior']].map(([v,n])=>`<button class="${OPC.texto===v?'on':''}" data-tam="${v}">${n}</button>`).join('')}</div></div>
    <h3 class="fxTit">Registro das partidas</h3>
    ${caixa('registro','Registrar como cada partida foi jogada (personagens, posições, evoluções e resultado) para ajudar a ajustar o equilíbrio do jogo. Não guarda nada pessoal.',OPC.registro!==false)}
    <p class="opcTxt">Registros guardados neste navegador, esperando para ser enviados: <b id="regQtd">${regFila().length}</b>.</p>
    <div class="row"><button class="hb" id="regBaixa">Baixar registros (.jsonl)</button><button class="hb" id="regEnvia">Tentar enviar agora</button></div>
    <h3 class="fxTit">Levar o progresso para outro aparelho</h3>
    <p class="opcTxt">Seu progresso (${resumoProg(PROG)}) fica guardado só neste navegador e neste endereço. Se você abrir o jogo em outro aparelho ou em outro endereço (por exemplo, depois de publicar na internet), ele começa do zero lá. Gere um código aqui, copie e cole no outro lugar.</p>
    <div class="row"><button class="hb" id="geraCod">Gerar código</button><button class="hb" id="copiaCod" hidden>Copiar</button></div>
    <textarea id="codExp" class="codigo" readonly hidden aria-label="Código do seu progresso"></textarea>
    <p class="opcTxt">Para trazer o progresso de outro aparelho, cole o código aqui:</p>
    <textarea id="codImp" class="codigo" placeholder="Cole aqui o código que começa com GN1:" aria-label="Código para importar"></textarea>
    <div class="row"><button class="hb" id="leCod">Importar</button></div>
    <div id="impMsg" role="status"></div>`;
}
function ligaOpc(o){
  if($('regBaixa'))$('regBaixa').onclick=regBaixa;
  if($('regEnvia'))$('regEnvia').onclick=async()=>{await regTentaFila();if($('regQtd'))$('regQtd').textContent=regFila().length};
  o.querySelectorAll('input[data-o]').forEach(i=>i.onchange=()=>{
    const k=i.dataset.o;
    if(k==='som'){mute=!i.checked;OPC.mute=mute;pintaSom()}else OPC[k]=i.checked;
    if(k==='daltonico'||k==='mouseGrande')aplicaTexto();
    salvaOpc();
  });
  o.querySelectorAll('input[data-vol]').forEach(i=>{
    i.oninput=()=>{OPC[i.dataset.vol]=+i.value/100;i.nextElementSibling.textContent=i.value+'%';if(AC)saidas()};
    /* ao soltar, toca um bipe de exemplo no volume novo dos efeitos */
    i.onchange=()=>{salvaOpc();if(i.dataset.vol==='volFx'){ligaSom();lastB=0;beep(660,.12,'triangle',.08)}};
  });
  o.querySelectorAll('[data-tam]').forEach(b=>b.onclick=()=>{OPC.texto=+b.dataset.tam;salvaOpc();aplicaTexto();renderMenu('opc')});
  $('geraCod').onclick=()=>{const t=$('codExp');t.value=codigoDe(PROG);t.hidden=false;$('copiaCod').hidden=false;t.select()};
  $('copiaCod').onclick=()=>{const t=$('codExp');t.select();const ok=()=>{$('copiaCod').textContent='Copiado!'};if(navigator.clipboard)navigator.clipboard.writeText(t.value).then(ok,()=>{document.execCommand('copy');ok()});else{document.execCommand('copy');ok()}};
  $('leCod').onclick=()=>{
    const m=$('impMsg'),p=progDoCodigo($('codImp').value);
    if(!p){m.className='impErro';m.textContent='Código inválido. Confira se copiou o código inteiro, começando com GN1:.';return}
    m.className='impOk';
    m.innerHTML=`<p>O código tem ${resumoProg(p)}. Importar <b>substitui</b> o progresso deste navegador (${resumoProg(PROG)}).</p><button class="hb sair" id="confImp">Substituir meu progresso</button>`;
    $('confImp').onclick=()=>{Object.assign(PROG,p);salvaProg();renderMenu('opc');const r=$('impMsg');r.className='impOk';r.textContent='Progresso importado.'};
  };
}
/* página de adversários: como cada um aparece na avenida e o que tem de especial */
let advLado=null;
function menuAdv(){
  const lado=advLado||menuSide,C=SIDES[lado];
  const card=k=>`<div class="advCard ${ENEMY[k].boss?'boss':''}"><canvas data-foe="${k}"></canvas><div><b>${ENEMY[k].nome.replace(/ \(.*\)/,'')}</b><small>${especialDe(k)}</small></div></div>`;
  /* chefões: os originais (Sudeste e rodada 40) e os de cada região, em ordem de rodada */
  const comuns=[...new Set(Object.values(C.foes))],regs=CHEFES_REGIAO[lado]||{};
  const chefes=[10,20,30,40].flatMap(r=>[C.boss[r][0],...(r<40?Object.values(regs).map(t=>t[r]):[])]);
  return `<div class="lojaTopo"><div class="seg">${Object.keys(SIDES).map(k=>`<button class="${lado===k?'on':''}" data-al="${k}">Defendendo a ${k==='pt'?'Esquerda':'Direita'}</button>`).join('')}</div></div>
    <small>Quem vem pela avenida quando você defende ${C.goal}. Durante a partida, a lista da próxima rodada também mostra o desenho de cada um.</small>
    <h3 class="fxTit">Marcha</h3><div class="advGrid">${comuns.map(card).join('')}</div>
    <h3 class="fxTit">Chefões (mudam conforme a região do mapa)</h3><div class="advGrid">${chefes.map(card).join('')}</div>`;
}
function ligaAdv(o){
  o.querySelectorAll('canvas[data-foe]').forEach(cn=>pintaInimigo(cn,cn.dataset.foe,68));
  o.querySelectorAll('[data-al]').forEach(b=>b.onclick=()=>{advLado=b.dataset.al;renderMenu('adv')});
  o.querySelector('.abaCorpo').scrollTop=0;
}
/* página de conquistas: as faixas de cada estado, por região */
var REGIOES=[['Norte',['AC','AM','AP','PA','RO','RR','TO']],['Nordeste',['AL','BA','CE','MA','PB','PE','PI','RN','SE']],['Centro-Oeste',['DF','GO','MS','MT']],['Sudeste',['ES','MG','RJ','SP']],['Sul',['PR','RS','SC']]];
var NIVEIS=['','Fácil','Normal','Difícil'];
/* medalha de cada dificuldade: fita e disco de bronze (1 estrela), prata (2) ou ouro (3); cinza quando ainda não venceu */
function seloSvg(k,on){
  const n={facil:1,normal:2,dificil:3}[k],c=on?{facil:['#e3a86b','#8a5a2b'],normal:['#dfe4ea','#6f7884'],dificil:['#f6cf4e','#9a7212']}[k]:['#e4dccb','#b9ae98'];
  const fita=on?{facil:'#c8102e',normal:'#2456a6',dificil:'#35a35f'}[k]:'#d3c9b4';
  const est=[[12],[8.6,15.4],[6.4,12,17.6]][n-1].map(x=>`<path transform="translate(${x} 17.5) scale(${n===3?.62:.75})" d="M0-4.2L1.2-1.3L4.2-1.2L1.9.8L2.6,3.9L0,2.2L-2.6,3.9L-1.9.8L-4.2-1.2L-1.2-1.3Z" fill="${on?'#fff':'#f4efe4'}" stroke="${c[1]}" stroke-width=".7"/>`).join('');
  return `<svg class="medSvg${on?'':' off'}" viewBox="0 0 24 28" width="27" height="31" aria-hidden="true"><path d="M5 0h6l3 8H8z M13 0h6l-3 8h-6z" fill="${fita}" stroke="#1d1a16" stroke-width=".8"/><circle cx="12" cy="17.5" r="9.5" fill="${c[0]}" stroke="${c[1]}" stroke-width="1.6"/><circle cx="12" cy="17.5" r="7" fill="none" stroke="${on?'#ffffff66':'#ffffff44'}" stroke-width="1"/>${est}</svg>`;
}
function menuConq(){
  const nome=uf=>ESTADOS.find(e=>e[0]===uf)[1],tem=ESTADOS.filter(e=>PROG.faixas[e[0]]).length;
  const med=MEDALHAS.filter(m=>PROG.medalhas[m.id]).length;
  return `<h3 class="fxTit">Medalhas <span>${med} de ${MEDALHAS.length}</span></h3>
    <div class="medalhas">${MEDALHAS.map(m=>{const ok=PROG.medalhas[m.id];return `<div class="medalha ${ok?'':'nao'}"><i aria-hidden="true">${ok?'🏅':'🔒'}</i><div><b>${m.nome}</b><small>${m.desc}</small><em>${ok?'Conquistada':'Prêmio: F$ '+m.premio.toLocaleString('pt-BR')}</em>${!ok&&m.prog?(()=>{const[a,b]=m.prog();const v=Math.min(a,b);return `<div class="barraConq"><i style="width:${Math.round(v/b*100)}%"></i></div><small>${Math.floor(v).toLocaleString('pt-BR')} de ${b.toLocaleString('pt-BR')}</small>`})():''}</div></div>`}).join('')}</div>
    ${PROG.recorde?`<p class="fundo">Recorde no modo livre: <b>rodada ${PROG.recorde}</b></p>`:''}
    <h3 class="fxTit">Faixas dos estados</h3>
    <p class="fundo">Faixas conquistadas: <b>${tem} de ${ESTADOS.length}</b></p>
    <div class="barraConq"><i style="width:${Math.round(tem/ESTADOS.length*100)}%"></i></div>
    <small>Vença um mapa para ganhar a faixa com a bandeira daquele estado. Embaixo de cada bandeira, as medalhas mostram em quais dificuldades você já venceu: ${['facil','normal','dificil'].map(k=>`${seloSvg(k,true)} ${DIFFS[k].nome}`).join(', ')}. Apagada é a que ainda falta.</small>
    <p class="fundo resumoSelos">${['facil','normal','dificil'].map(k=>`<span title="${DIFFS[k].nome}">${seloSvg(k,true)} <b>${ESTADOS.filter(e=>(PROG.difs[e[0]]||{})[k]).length}</b></span>`).join('')} <small>de ${ESTADOS.length} estados</small></p>
    ${REGIOES.map(([r,ufs])=>`<h3 class="fxTit">${r} <span>${ufs.filter(u=>PROG.faixas[u]).length} de ${ufs.length}</span></h3>
      <div class="faixas conq">${ufs.map(u=>{const v=PROG.faixas[u],d=PROG.difs[u]||{},n=['facil','normal','dificil'].filter(k=>d[k]).length;
        return `<div class="faixaItem ${v?'':'nao'} ${n===3?'completo':''}"><canvas data-fx="${u}"></canvas><b>${nome(u)}</b>
          <span class="selos" aria-label="${n?'Vencido no '+['facil','normal','dificil'].filter(k=>d[k]).map(k=>DIFFS[k].nome).join(', '):'Ainda não vencido'}">${['facil','normal','dificil'].map(k=>`<i class="selo ${d[k]?'on':''}" title="${DIFFS[k].nome}: ${d[k]?'vencido':'ainda não'}">${seloSvg(k,!!d[k])}</i>`).join('')}</span>
          ${n===3?'<em class="todas">Todas as dificuldades!</em>':''}</div>`}).join('')}</div>`).join('')}`;
}

/* ---------- tutorial ---------- */
var tutoI=-1;
let tutoDoMenu=false,tutoMenuAntes=false;
/* depois de terminar ou pular, o tutorial não abre mais sozinho: fica salvo no navegador e, se o navegador
   não deixar salvar (janela anônima, por exemplo), pelo menos não volta enquanto a página estiver aberta */
let tutoNaSessao=false;
function tutoVisto(){if(tutoNaSessao)return true;try{return localStorage.getItem('gn_tuto')==='1'}catch(e){return false}}
/* quem vê o tutorial já com os passos novos não precisa do aviso "o tutorial ganhou passos novos" */
function tutoMarca(){tutoNaSessao=true;try{localStorage.setItem('gn_tuto','1')}catch(e){}if(!DICAS.tutoNovo||!DICAS.tutoPartes){DICAS.tutoNovo=1;DICAS.tutoPartes=1;try{localStorage.setItem('gn_dicas',JSON.stringify(DICAS))}catch(e){}}}
/* o tutorial é dividido em 3 partes (2026-11-17): a 1ª abre na primeira partida, a 2ª no fim da rodada 3 da partida
   seguinte e a 3ª depois do primeiro mapa vencido; todas podem ser abertas em Menu → Como jogar */
const TUTO_PARTES=[['basico','1. O básico','Tela, verba, apoio, colocar e evoluir'],['herois','2. Heróis, especiais e controles','Herói, especiais, Isentões, chefões e botões'],['mapas','3. Mapas, modos e loja','Mapas vivos, trechos, transportes, modos, loja e Palácio']];
let tutoParte=0;
function tutoPassos(){
  const C=cfg();
  if(tutoParte===1)return [
    {t:'Parte 2: heróis e especiais',d:'Agora que você já sabe o básico, veja como tirar mais dos seus personagens e do herói.'},
    {t:'Habilidades e especiais',d:'Cada evolução traz uma habilidade ⚡ que dispara sozinha, como prender, dar verba ou pôr fogo. Quando ela dispara, aparece um ⚡ em cima do personagem. Na 3ª evolução de um caminho, todo personagem (heróis também) ganha um especial próprio daquele caminho: use pelo botão ⚡ no canto do mapa ou pela tecla Q. Especiais iguais ficam num botão só, com um número de quantos você tem, e o botão vai se enchendo enquanto recarrega.'},
    {s:'#poderes',t:'Heróis e o poder próprio',d:`${C.hero} e todo personagem que é ou foi presidente de um país são heróis, e só cabe 1 herói em campo por vez. Cada herói tem um poder próprio, liberado só quando ele chega ao nível 10 (o máximo): aí aparece entre os especiais do canto do mapa, com uma ★ (tecla F): o do ${C.hero} é ${nomePoderHeroi(S&&S.side==='br'?'bolsonaro':'lula')}. Depois de usado, ele recarrega. O herói ganha experiência e sobe até o nível 10, mas cada nível pede o dobro do anterior, então chegar ao 10 é difícil.`},
    {t:'Isentões e chefões',foes:[C.foes.isentao,C.foes.fone,C.boss[10][0]],d:'O Isentão fica invisível para quem não detecta Isentões, então tenha alguém com detecção. O de fone ignora ataques de som. A cada 10 rodadas chega um chefão, que muda conforme a região do Brasil, e cada um atrapalha de um jeito: some, cura os outros, chama reforço ou fica blindado. A aba Adversários do menu mostra todos.'},
    {s:'#go',t:'Começar e pausar',d:'O mesmo botão começa a rodada e, durante ela, vira Pausar e Continuar (atalho: tecla P). Pausado, você ainda pode colocar e evoluir personagens.'},
    {s:'#speed',t:'Velocidade',d:'Acelera o jogo em até 3 vezes.'},
    {s:'#auto',t:'Automático',d:'Quando ligado (fica verde), a próxima rodada começa sozinha um instante depois que a anterior termina.'},
    {s:'#sound',t:'Som',d:'Liga ou desliga os efeitos sonoros.'},
    {s:'#menuBtn',t:'Menu',d:'Volta para o menu. A partida fica salva: use Continuar no menu para voltar a ela. Em Menu → Como jogar você revê qualquer parte deste tutorial.'}
  ];
  if(tutoParte===2)return [
    {t:'Parte 3: mapas, modos e loja',d:(liberaTudo()?'Você já venceu um mapa, então todos os personagens iniciais ficam liberados desde a rodada 1. ':'Quando você vencer o primeiro mapa, todos os personagens iniciais ficam liberados desde a rodada 1. ')+'Veja o que muda de um mapa para outro e o que dá para conquistar.'},
    {t:'Mapas vivos',d:'Cada estado tem as suas surpresas. Em alguns, a avenida se divide em duas ou a marcha entra por dois ou três caminhos: as entradas extras abrem aos poucos (a segunda na rodada 11 e a terceira na 21, com aviso na rodada anterior), e às vezes um caminho fecha por uma rodada. Dentro do túnel ninguém consegue mirar, e os prédios tapam a visão de quem está atrás; em alguns mapas, um dirigível e nuvens de fumaça passam e tapam a visão enquanto passam. Há mapas lotados de obstáculos e eventos, como chuva, trem, apagão e enchente. O menu mostra o que cada mapa tem.'},
    {t:'Trechos da avenida',d:'Partes da avenida mudam o passo da marcha. Na ladeira, na geada, no corredor de ônibus (faixa vermelha) e na rodovia (asfalto escuro com faixa dupla amarela) ela acelera. Na subida, na lama e na areia ela anda devagar. No mato alto ela some, e só quem detecta Isentões consegue acertar. Os chefões sentem só metade.'},
    {t:'Metrô, balão, balsa e teleférico',d:'Cada mapa tem um jeito de a marcha pular parte do caminho. No metrô, quem entra numa estação sai na outra, mais adiante. O balão, a balsa e o teleférico levam um grupo de um ponto a outro, e lá dentro ninguém alcança: espere todo mundo descer e defenda bem o ponto de chegada. Chefões e veículos não usam nenhum deles.'},
    {t:'Modos de jogo',d:'No menu você escolhe o modo: Clássico; Só gratuitos; Sem vender; Turbo (marcha mais rápida); Voto Popular (o apoio não acaba a partida, o que conta são os votos: convença a marcha antes do trecho final da avenida e passe nas apurações das rodadas 10, 20 e 30); Teto de Gastos (no máximo 10 personagens); e Tolerância Zero (se um só passar, acabou). Há também o Desafio do dia. Os modos mais difíceis dão mais prêmio e têm medalhas próprias.'},
    {t:'Mapas e salvar',d:'Os mapas vão de Iniciante a Expert: os mais difíceis dão mais prêmio, e o Expert tem obras onde não se pode colocar ninguém. A partida é salva sozinha: se fechar o jogo, use Continuar no menu. Depois de vencer, dá para seguir no modo livre e tentar um recorde.'},
    {t:'Loja e Palácio dos Heróis',d:'Cada vitória dá Fundo Partidário. Na Loja do menu você libera novos personagens; no Palácio dos Heróis, os presidentes, que custam mais e sobem de nível. Lembre: só 1 herói em campo por vez.'},
    {t:'Conquistas',d:'Vencer um mapa dá a faixa com a bandeira daquele estado, na página Conquistas. Embaixo de cada bandeira, uma medalha mostra em que dificuldade você venceu: bronze com 1 estrela no Fácil, prata com 2 no Normal e ouro com 3 no Difícil. A mesma página tem medalhas por feitos, como vencer sem perder apoio ou em cada modo, e as Estatísticas mostram os seus números.'}
  ];
  return [
    {t:'Bem-vindo!',d:`Você defende ${C.goal}. Coloque personagens perto da avenida para convencer quem vem em marcha antes que chegue ao fim. Este é o básico; as outras partes do tutorial aparecem mais tarde, quando fizerem sentido.`},
    {s:'.s-vida',t:'Apoio popular',d:'São as suas vidas. Cada adversário que chega ao fim da avenida tira apoio. Se chegar a zero, você perde.'},
    {s:'.s-verba',t:'Verba',d:'É o seu dinheiro. Você ganha convencendo adversários e no fim de cada rodada. Serve para comprar e evoluir personagens.'},
    {s:'.s-rod',t:'Rodada',d:'Mostra em qual das 40 rodadas você está. Vença a última para ganhar o jogo.'},
    {s:'#stage',t:'Mapa e avenida',d:'Os adversários andam pela avenida até o fim. As setas mostram por onde a marcha entra e onde fica o destino; em alguns mapas ela chega por mais de um lado.'},
    {s:'#shop',t:'Seus personagens',d:`${liberaTudo()?'Todos os personagens iniciais já estão liberados.':'Você começa com 1 personagem, e outros são liberados ao longo das rodadas, até você vencer o primeiro mapa; depois, todos ficam liberados desde a rodada 1.'} Clique num deles para ver o que faz e depois escolha um lugar no mapa. Pode colocar quantos quiser de cada um; só o herói é 1 por vez. Errou? A tecla Z desfaz a última compra na mesma rodada, devolvendo tudo.`},
    {s:'#stage',t:'Onde dá para colocar',d:'Ao escolher um personagem, o mapa mostra onde pode: o que fica listrado de vermelho é proibido, e o resto ganha um tom verde. Não dá na avenida, na água, nos prédios, nas obras e nas áreas bloqueadas. Carros, pedras e árvores podem ser tirados pagando: toque neles. No morro, o personagem enxerga 15% mais longe.'},
    {t:'Evoluções',evo:1,d:'Clique num personagem já colocado: abre uma janela ao lado dele com as evoluções, e cada uma mostra o desenho de como ele fica. São dois caminhos de três níveis, e só um deles pode ir até o fim. Na mesma janela você pode vendê-lo.'},
    {s:'#info',t:'Próxima rodada',d:'Aqui aparece quem vem na próxima rodada, para você se preparar.'},
    {s:'#go',t:'Começar rodada',d:'Quando estiver pronto, clique aqui para a marcha começar. Boa sorte!'}
  ];
}
/* parte já vista: a 1ª usa gn_tuto (como antes); a 2ª e a 3ª ficam em gn_dicas. Quem viu o tutorial antigo, inteiro, já viu tudo */
const tutoParteVista=i=>i===0?tutoVisto():!!DICAS['tutoP'+i];
function tutoMarcaParte(i){if(i===0)return tutoMarca();DICAS['tutoP'+i]=1;try{localStorage.setItem('gn_dicas',JSON.stringify(DICAS))}catch(e){}}
/* abre sozinha a parte que ainda falta, no momento certo (nunca nas abas de teste nem com o robô) */
function tutoAuto(i){if(window.Robo||window.__semRegistro||!S||S.menu||S.over||S.inRound||$('tuto')||tutoParteVista(i)||!tutoVisto())return false;abreTuto(false,i);return true}
function tutoShow(){
  const ps=tutoPassos(),p=ps[tutoI],spot=$('tutoSpot'),card=$('tutoCard'),ult=tutoI===ps.length-1;
  card.innerHTML=`<small>${TUTO_PARTES[tutoParte][1]} · passo ${tutoI+1} de ${ps.length}</small><h3>${p.t}</h3><p>${p.d}</p>${p.foes?`<div class="tutoFoes">${p.foes.map(k=>`<figure><canvas data-foe="${k}"></canvas><figcaption>${ENEMY[k].nome.replace(/ \(.*\)/,'')}</figcaption></figure>`).join('')}</div>`:''}${p.evo?`<div class="tutoFoes">${[[0,0,'Sem evolução'],[2,1,'Caminho 1'],[1,2,'Caminho 2']].map(([a,b,n])=>`<figure><canvas data-ev="${a},${b}"></canvas><figcaption>${n}</figcaption></figure>`).join('')}</div>`:''}<div class="tutoBts"><button class="hb" id="tutoPula">${tutoParte?'Fechar':'Pular tutorial'}</button><span>${tutoI?'<button class="hb" id="tutoVolta">Voltar</button>':''}<button class="hb" id="tutoProx">${ult?(tutoDoMenu?'Fechar':'Jogar'):'Próximo'}</button></span></div>`;
  card.querySelectorAll('canvas[data-foe]').forEach(cn=>pintaInimigo(cn,cn.dataset.foe,64));
  card.querySelectorAll('canvas[data-ev]').forEach(cn=>{const[a,b]=cn.dataset.ev.split(',').map(Number);pintaEvo(cn,INICIAIS[S.side][0][0],a,b,84)});
  $('tutoPula').onclick=tutoFecha;
  if(tutoI)$('tutoVolta').onclick=()=>{tutoI--;tutoShow()};
  $('tutoProx').onclick=()=>{if(ult)tutoFecha();else{tutoI++;tutoShow()}};
  const el=p.s?document.querySelector(p.s):null;
  if(p.s==='#shop')$('panel').scrollTop=0;
  if(p.s==='#info')el.scrollIntoView({block:'nearest'});
  const vw=innerWidth,vh=innerHeight,cw=card.offsetWidth,ch=card.offsetHeight;
  let x=(vw-cw)/2,y=(vh-ch)/2;
  const box=el&&el.getBoundingClientRect();
  if(box&&box.width&&box.height){
    const l=Math.max(4,box.left-4),t=Math.max(4,box.top-4),r=Math.min(vw-4,box.right+4),b=Math.min(vh-4,box.bottom+4);
    spot.classList.remove('nenhum');
    spot.style.left=l+'px';spot.style.top=t+'px';spot.style.width=(r-l)+'px';spot.style.height=(b-t)+'px';
    if(b+12+ch<=vh-8){y=b+12;x=(l+r-cw)/2}
    else if(t-12-ch>=8){y=t-12-ch;x=(l+r-cw)/2}
    else if(l-12-cw>=8){x=l-12-cw;y=(t+b-ch)/2}
    else if(r+12+cw<=vw-8){x=r+12;y=(t+b-ch)/2}
  }else{
    spot.classList.add('nenhum');spot.style.left=spot.style.top=spot.style.width=spot.style.height='';
  }
  card.style.left=clamp(x,8,Math.max(8,vw-cw-8))+'px';
  card.style.top=clamp(y,8,Math.max(8,vh-ch-8))+'px';
}
function abreTuto(doMenu,parte){
  tutoParte=parte|0;tutoDoMenu=doMenu;tutoMenuAntes=S.menu;S.menu=true;tutoI=0;
  if(doMenu)$('overlay').classList.add('hide');
  updateBalao();
  const d=document.createElement('div');d.id='tuto';d.innerHTML='<div id="tutoSpot" class="nenhum"></div><div id="tutoCard"></div>';
  document.body.appendChild(d);
  tutoShow();
}
/* dicas rápidas: cada uma aparece uma vez só, na primeira vez que a coisa acontece (fica guardado em gn_dicas) */
let DICAS={};try{DICAS=JSON.parse(localStorage.getItem('gn_dicas')||'{}')||{}}catch(e){}
/* quem viu o tutorial antigo (tudo numa vez só) já viu o que hoje é a parte 3; a parte 2 ganhou os heróis, então ainda aparece */
try{if(localStorage.getItem('gn_tuto')==='1'&&!DICAS.tutoPartes){DICAS.tutoPartes=1;DICAS.tutoP2=1;localStorage.setItem('gn_dicas',JSON.stringify(DICAS))}}catch(e){}
function dica(id,txt){
  if(DICAS[id]||!S||S.menu||S.over||!tutoVisto())return;
  DICAS[id]=1;try{localStorage.setItem('gn_dicas',JSON.stringify(DICAS))}catch(e){}
  const velha=$('dicaCtx');if(velha)velha.remove();
  const d=document.createElement('div');d.id='dicaCtx';d.setAttribute('role','status');
  d.innerHTML=`<span>💡 ${txt}</span><button aria-label="Fechar dica">×</button>`;
  $('stage').appendChild(d);
  const fecha=()=>d.remove();d.querySelector('button').onclick=fecha;setTimeout(fecha,9000);
}
/* celular em pé deixa o mapa pequeno: uma vez por visita, sugere deitar o aparelho */
let dicaGiroVista=false;
const emPe=()=>matchMedia('(max-width:820px) and (orientation:portrait)').matches;
function dicaGiro(){
  if(dicaGiroVista||!emPe()||!S||S.menu)return;
  dicaGiroVista=true;
  const d=document.createElement('div');d.id='dicaGiro';d.setAttribute('role','status');
  d.innerHTML='<span>📱↻ Deite o celular para ver o mapa maior.</span><button aria-label="Fechar dica">×</button>';
  $('stage').appendChild(d);
  const fecha=()=>d.remove();d.querySelector('button').onclick=fecha;setTimeout(fecha,8000);
}
addEventListener('resize',()=>{const d=$('dicaGiro');if(d&&!emPe())d.remove()});
function tutoFecha(){
  tutoMarcaParte(tutoParte);tutoI=-1;
  const d=$('tuto');if(d)d.remove();
  S.menu=tutoMenuAntes;
  if(tutoDoMenu){if(window.GN_PONTE&&GN_PONTE.abreMenu)renderMenu('como');else $('overlay').classList.remove('hide')}
  $('panel').scrollTop=0;
  renderPanel();
  if(!tutoDoMenu)dicaGiro();
}

let menuSide='pt',menuUF=null,menuMsg='',lojaLado=null,lojaFiltro='todos',menuModo='classico';
/* ---------- modos de jogo ---------- */
const MODOS=[
  ['classico','Clássico','Do jeito normal.'],
  ['gratis','Só gratuitos','Só os personagens gratuitos do seu lado, mesmo que você tenha comprado outros.'],
  ['semvender','Sem vender','Ninguém pode ser vendido depois de colocado.'],
  ['turbo','Turbo','A marcha anda 35% mais rápido. Prêmio ×1,5.'],
  ['voto','Voto Popular','O apoio não acaba a partida: o que conta são os votos. Quem você convence antes dos últimos 40% da avenida vota em você; dali em diante, quanto mais perto do destino, mais o voto vai para o outro lado; e quem chega ao fim vale 2 votos para eles (chefões valem muito mais). Nas rodadas 10, 20 e 30 há apuração: com menos de 50%, você perde. Na rodada 40, vence com mais da metade. Prêmio ×1,2.'],
  ['teto','Teto de Gastos','No máximo 10 personagens no mapa ao mesmo tempo. Prêmio ×1,3.'],
  ['zero','Tolerância Zero','Se um único adversário chegar ao fim, você perde. Prêmio ×2.'],
];
const PREMIO_MODO={turbo:1.5,voto:1.2,teto:1.3,zero:2};
const nomeModo=k=>k==='desafio'?'Desafio do dia':(MODOS.find(m=>m[0]===k)||[,'Clássico'])[1];
const premioPartida=(diff,uf,modo)=>Math.round(PREMIO[diff]*PREMIO_TIER[MAPAS[uf].tier||1]*(PREMIO_MODO[modo]||1)/10)*10;
/* Voto Popular: placar de votos (convencido = votos do tamanho dele; quem passa = 4× isso para o outro lado) */
/* ZONA_VOTO: o voto só começa a se dividir depois de 60% da avenida (medido na parte visível). Dividindo desde o começo,
   os mapas com avenidas extras (que só se juntam perto do fim) perdiam todos na rodada 10, e os de uma avenida passavam de 97% (2026-11-12) */
const TETO_PERS=10,PESO_VOTO_ELES=2,ZONA_VOTO=.6;
const pctVotos=()=>{const v=S.votos||{nos:0,eles:0},t=v.nos+v.eles;return t?v.nos/t*100:50};
const votoDe=T=>Math.min(T.leak,100);
const fmtPct=p=>String(Math.round(p*10)/10).replace('.',',')+'%';
/* quanto da avenida o adversário já andou, contando só a parte que aparece na tela
   (as avenidas extras começam fora da tela, e isso não pode virar voto do outro lado) */
function progressoVisivel(e){
  const M=MAPAS[S.uf];if(!M._ini||M._iniLen!==LEN){M._ini={};M._iniLen=LEN}
  let a=M._ini[e.via|0];
  if(a===undefined){a=0;for(let d=0;d<LEN;d+=8){const p=posAt(d,e.via|0);if(p.x>=0&&p.x<=W&&p.y>=0&&p.y<=H){a=d;break}}M._ini[e.via|0]=a}
  return Math.max(0,Math.min(1,(e.d-a)/Math.max(1,LEN-a)));
}
/* desafio do dia: lado, estado e 5 personagens sorteados pela data (o mesmo para todo mundo no mesmo dia).
   Muda sozinho à meia-noite (pelo relógio do aparelho). */
/* sorteio bem misturado (mulberry32): com o gerador simples de antes, datas vizinhas davam sorteios parecidos,
   e o lado saía viciado (217 dias da esquerda contra 148 da direita num ano, com até 9 dias seguidos do mesmo lado) */
function sorteioDoDia(d){
  const dia=d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();let s=hashStr('gn'+dia)>>>0;
  const r=()=>{s=(s+0x6D2B79F5)>>>0;let t=s;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296};
  r();const base=Math.floor(r()*ESTADOS.length),alt=r();return{dia,r,base,alt};
}
/* estado do dia, sem repetir o de ontem (que também pode ter sido trocado, por isso olha alguns dias para trás) */
function ufDoDia(d,fundo=4){
  const{base,alt}=sorteioDoDia(d);
  if(fundo>0&&ESTADOS[base][0]===ufDoDia(new Date(d.getFullYear(),d.getMonth(),d.getDate()-1,12),fundo-1))
    return ESTADOS[(base+1+Math.floor(alt*(ESTADOS.length-1)))%ESTADOS.length][0];
  return ESTADOS[base][0];
}
function desafioDoDia(){
  const d=new Date(),{dia,r}=sorteioDoDia(d),uf=ufDoDia(d);
  /* o lado alterna a cada dia (um dia de cada lado) */
  const nDia=Math.floor(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())/864e5),side=nDia%2?'pt':'br';
  /* os presidentes viraram heróis em 2026-11-13, mas continuam no sorteio (senão os desafios dos próximos dias mudariam) */
  const pool=SIDES[side].order.filter(k=>!TOWERS[k].only||TOWERS[k].presidente),keys=[];
  /* pelo menos 3 que atacam, para o desafio ser possível */
  while(keys.length<5){const k=pool[Math.floor(r()*pool.length)];if(keys.includes(k))continue;if(TOWERS[k].atk==='none'&&keys.filter(x=>TOWERS[x].atk==='none').length>=2)continue;keys.push(k)}
  return {dia,side,uf,keys};
}
function aplicaModo(modo,dd){
  S.modo=modo;S.permitidos=dd?dd.keys:null;S.desafioDia=dd?dd.dia:null;
  if(modo==='voto'){S.votos=S.votos||{nos:0,eles:0}}
  buildShop();renderPanel();syncHud();
  if(modo!=='classico')banner('Modo '+nomeModo(modo));
}
function showOverlay(html){menuMsg=html;renderMenu('jogar')}
/* filtros da lista de estados na tela Jogar (2026-11-17): por região, ou só os que você ainda não venceu */
const FILTROS_MAPA=[['todos','Todos'],...REGIOES.map(([r])=>[r,r]),['falta','Ainda não vencidos']];
let filtroMapa='todos';
const mapaNoFiltro=u=>filtroMapa==='todos'?true:filtroMapa==='falta'?!PROG.faixas[u]:(REGIOES.find(r=>r[0]===filtroMapa)||[,[]])[1].includes(u);
function menuJogar(){
  const uf=menuUF||S.uf,M=MAPAS[uf];
  const sv=lePartida();
  const quando=sv?(sv.em?'no meio da rodada '+sv.round:sv.livre?'modo livre, rodada '+sv.round+' concluída':'rodada '+sv.round+' de 40 concluída'):'';
  const cont=sv?`<div class="continuar"><div><b>Partida salva</b><small>${SIDES[sv.side].nome} em ${MAPAS[sv.uf]?MAPAS[sv.uf].nome:sv.uf}, ${DIFFS[sv.diff].nome}${sv.modo&&sv.modo!=='classico'?', '+nomeModo(sv.modo):''}: ${quando}, ${Math.ceil(sv.lives)} de apoio. Começar outra partida apaga esta.</small></div><button class="hb" id="btContinua">Continuar</button></div>`:'';
  const dd=desafioDoDia(),feito=PROG.desafio===dd.dia;
  /* desafio do dia compacto: o essencial numa linha, os personagens embaixo em letra menor */
  const desafio=`<div class="desafio"><div><b>Desafio do dia ${feito?'<em class="feito">✓ vencido hoje</em>':''}</b><small><strong>${dd.side==='pt'?'Esquerda':'Direita'} em ${MAPAS[dd.uf].nome}</strong> · Normal · ${feito?'já valeu o prêmio de hoje':'vale F$ 300'}</small><small class="desafioPers">Só com ${dd.keys.map(k=>TOWERS[k].nome).join(', ')}</small></div><button class="hb" id="btDesafio">Jogar desafio</button></div>`;
  const passo=(n,t)=>`<h3 class="passo"><span>${n}</span>${t}</h3>`;
  /* nos cartões, os pontinhos dizem em que dificuldades você já venceu o estado (bronze, prata, ouro) */
  const venceu=u=>{const d=PROG.difs[u]||{};return['facil','normal','dificil'].map(k=>`<i class="vd ${k} ${d[k]?'on':''}"></i>`).join('')};
  return `${cont}${menuMsg}${desafio}<div class="jogarGrid">
    <div>
      ${passo(1,'Quem você defende')}
      <div class="row lados">${Object.keys(SIDES).map(k=>`<button class="side ${menuSide===k?'on':''}" data-s="${k}"><b>${SIDES[k].nome}</b>${SIDES[k].pitch}</button>`).join('')}</div>
      ${passo(2,'Escolha o estado')}
      <div class="filtroMapas" role="group" aria-label="Filtrar estados">${FILTROS_MAPA.map(([k,n])=>`<button class="${filtroMapa===k?'on':''}" data-fm="${k}">${n}</button>`).join('')}<button class="sorteia" id="sorteiaMapa" title="Escolher um estado ao acaso entre os que aparecem">🎲 Sortear</button></div>
      <div class="mapas">${ESTADOS.map(e=>`<button class="mapaCard ${uf===e[0]?'on':''}" data-uf="${e[0]}" ${mapaNoFiltro(e[0])?'':'hidden'} title="${e[1]}, mapa ${NOMES_TIER[MAPAS[e[0]].tier]}" aria-label="${e[1]}, mapa ${NOMES_TIER[MAPAS[e[0]].tier]}${PROG.faixas[e[0]]?', já vencido':''}"><canvas data-mini="${e[0]}" width="184" height="123"></canvas><span>${e[0]} <i class="tier t${MAPAS[e[0]].tier}" aria-hidden="true">${'●'.repeat(MAPAS[e[0]].tier)}</i></span><small class="mapaNome">${e[1]}</small><span class="vds" aria-hidden="true">${venceu(e[0])}</span></button>`).join('')}</div>
      <p class="semMapas" id="semMapas" ${ESTADOS.some(e=>mapaNoFiltro(e[0]))?'hidden':''}>Você já venceu todos os estados deste filtro. 🎉</p>
      <p class="tierLeg"><i class="tier t1">●</i> Iniciante · <i class="tier t2">●●</i> Intermediário · <i class="tier t3">●●●</i> Avançado · <i class="tier t4">●●●●</i> Expert. Quanto mais difícil, mais F$. Pontinhos: vitórias no Fácil, Normal e Difícil.</p>
    </div>
    <div class="detalhe"><canvas id="miniGrande" width="640" height="427"></canvas>
      <div class="ufTopo"><h3 class="fxTit" id="ufnome">${M.nome}</h3><span class="nivel" id="ufnivel"></span></div>
      <p class="ufleg" id="ufleg">${M.leg}</p>
      <div class="chips" id="uftier"></div>
      ${passo(3,'Modo de jogo')}
      <div class="seg modos" role="group" aria-label="Modo de jogo">${MODOS.map(([k,n,d])=>`<button class="${menuModo===k?'on':''}" data-modo="${k}" title="${d}">${n}</button>`).join('')}</div>
      <small class="modoDesc" id="modoDesc">${MODOS.find(m=>m[0]===menuModo)[2]}</small>
      ${passo(4,'Dificuldade e jogar')}
      <div class="row jogarBts">${Object.keys(DIFFS).map(k=>`<button class="big" data-d="${k}">▶ ${DIFFS[k].nome}<small>vale F$ <span data-premio="${k}">${PREMIO[k]}</span></small></button>`).join('')}</div>
    </div></div>
    <small class="aviso">Paródia de humor, sem vínculo com partidos ou com as pessoas citadas. As falas e situações são inventadas, e ninguém se machuca: todo mundo só muda de ideia e vai embora.</small>`;
}
function ligaJogar(o){
  o.querySelectorAll('canvas[data-mini]').forEach(cn=>pintaMiniatura(cn,cn.dataset.mini));
  const grande=$('miniGrande'),mostra=uf=>{
    pintaMiniatura(grande,uf);
    o.querySelectorAll('.mapaCard').forEach(x=>x.classList.toggle('on',x.dataset.uf===uf));
    /* na fileira deslizante do celular, o mapa escolhido fica à vista */
    const on=o.querySelector('.mapaCard.on'),fila=on&&on.parentElement;
    if(fila&&fila.scrollWidth>fila.clientWidth+4)fila.scrollLeft=Math.max(0,on.offsetLeft-fila.offsetLeft-(fila.clientWidth-on.offsetWidth)/2);
    $('ufnome').textContent=MAPAS[uf].nome;$('ufleg').textContent=MAPAS[uf].leg;
    /* nível do mapa num selo colorido, e o que o mapa tem em etiquetas curtas (a explicação inteira aparece ao parar o mouse) */
    const tr=MAPAS[uf].tier,esc=s=>s.replace(/[&<>"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
    $('ufnivel').className='nivel t'+tr;$('ufnivel').textContent=NOMES_TIER[tr]+(tr>1?' · prêmio ×'+String(PREMIO_TIER[tr]).replace('.',','):'');
    const itens=(resumoDinamico(uf)||'').split(' · ').filter(Boolean);
    if(tr===4)itens.unshift('obras (4 lugares onde não se pode colocar ninguém; a marcha anda 5% mais rápido)');
    const C=MAPAS[uf].comp;if(C)itens.push(`${C.livre}% livre para personagens (${C.avenida}% é avenida e ${C.ocupado}% está ocupado)`);
    $('uftier').innerHTML=itens.map(t=>{const i=t.indexOf(' (');const curto=i>0?t.slice(0,i):t;return `<span class="chip" title="${esc(t)}">${esc(curto)}</span>`}).join('');
    atualizaPremios(uf);
  };
  const atualizaPremios=uf=>o.querySelectorAll('[data-premio]').forEach(sp=>{sp.textContent=premioPartida(sp.dataset.premio,uf,menuModo)});
  mostra(menuUF||S.uf);
  /* filtros e sorteio: só mostram ou escondem os cartões (sem redesenhar as miniaturas) */
  const aplicaFiltro=()=>{o.querySelectorAll('.mapaCard').forEach(c=>{c.hidden=!mapaNoFiltro(c.dataset.uf)});
    o.querySelectorAll('[data-fm]').forEach(b=>b.classList.toggle('on',b.dataset.fm===filtroMapa));
    $('semMapas').hidden=ESTADOS.some(e=>mapaNoFiltro(e[0]))};
  o.querySelectorAll('[data-fm]').forEach(b=>b.onclick=()=>{filtroMapa=b.dataset.fm;aplicaFiltro()});
  $('sorteiaMapa').onclick=()=>{const l=ESTADOS.map(e=>e[0]).filter(mapaNoFiltro);if(!l.length)return;
    const u=l.length>1?pick(l.filter(x=>x!==(menuUF||S.uf))):l[0];menuUF=u;mostra(u);beep(520,.06,'triangle',.05)};
  o.querySelectorAll('[data-modo]').forEach(b=>b.onclick=()=>{menuModo=b.dataset.modo;o.querySelectorAll('[data-modo]').forEach(x=>x.classList.toggle('on',x===b));$('modoDesc').textContent=MODOS.find(m=>m[0]===menuModo)[2];atualizaPremios(menuUF||S.uf)});
  o.querySelectorAll('.big').forEach(b=>b.onclick=()=>{apagaPartida();o.classList.add('hide');newGame(b.dataset.d,false,menuSide,menuUF||S.uf);aplicaModo(menuModo);if(!tutoVisto())abreTuto(false,0);else if(!(liberaTudo()&&tutoAuto(2)))dicaGiro()});
  $('btDesafio').onclick=()=>{const dd=desafioDoDia();apagaPartida();o.classList.add('hide');menuSide=dd.side;menuUF=dd.uf;newGame('normal',false,dd.side,dd.uf);aplicaModo('desafio',dd);dicaGiro()};
  if($('btContinua'))$('btContinua').onclick=continuaPartida;
  if($('btLivre')){if(S&&S.over&&S.won&&!S.livre)$('btLivre').onclick=continuaLivre;else $('btLivre').closest('.livreBox').remove()}
  o.querySelectorAll('.side').forEach(b=>b.onclick=()=>{
    menuSide=b.dataset.s;lojaLado=null;
    o.querySelectorAll('.side').forEach(x=>x.classList.toggle('on',x===b));
    /* sem estado escolhido, cada lado começa no seu mapa: Planalto no DF, ato na Paulista em SP */
    const uf=menuUF||(menuSide==='br'?'SP':'DF');
    newGame('normal',true,menuSide,uf);mostra(uf);
  });
  o.querySelectorAll('.mapaCard').forEach(b=>b.onclick=()=>{
    menuUF=b.dataset.uf;
    newGame('normal',true,menuSide,menuUF);mostra(menuUF);
  });
}
/* título e uma frase explicando cada página do menu (Jogar e Palácio têm a abertura própria) */
const PAGINAS={
  loja:['Loja','Libere novos personagens com o F$ (Fundo Partidário) que você ganha vencendo mapas.'],
  adv:['Adversários','Quem vem na marcha de cada lado e os chefões de cada região do Brasil.'],
  conq:['Conquistas','Faixas dos estados e medalhas por feitos. Cada conquista rende F$.'],
  est:['Estatísticas','Os seus números em todas as partidas.'],
  como:['Como jogar','O tutorial tem 3 partes curtas. Cada uma abre sozinha uma vez, na hora certa, e aqui você revê qualquer uma.'],
  opc:['Opções','Som, tela, acessibilidade e os seus dados.'],
};
/* botão para comprar F$ com dinheiro: só existe na versão com servidor (o React abre a loja de F$ ao clicar) */
const ctaFs=()=>window.GN_PONTE?`<div class="ctaFs"><span><b>Quer mais F$ agora?</b><small>Pacotes de Fundo Partidário a partir de R$ 4,90, pagos pelo Mercado Pago.</small></span><button class="hb abreLojaFs">💰 Comprar F$</button></div>`:'';
function renderMenu(aba){
  /* versão com servidor: o menu é do React (frontend/src/menu); o motor só avisa qual página abrir */
  if(window.GN_PONTE&&GN_PONTE.abreMenu){$('overlay').classList.add('hide');GN_PONTE.abreMenu(aba);return}
  const o=$('overlay');o.classList.remove('hide');
  garanteMapas();
  /* abas com ícone e nome; no celular a barra rola para o lado e a aba aberta fica sempre à vista (2026-11-17) */
  const abas=[['jogar','🎮','Jogar'],['loja','🛒','Loja'],['herois','★','Heróis'],['adv','👥','Adversários'],['conq','🏅','Conquistas'],['est','📊','Estatísticas'],['como','❓','Como jogar']];
  /* medalhas ganhas fora da partida (comprar o último personagem da loja, por exemplo) aparecem no topo da aba aberta */
  const aviso=medalhasHtml(avisoMedalhas);avisoMedalhas=[];
  const cab=PAGINAS[aba]?`<header class="pagCab"><h2>${PAGINAS[aba][0]}</h2><p>${PAGINAS[aba][1]}</p></header>`:'';
  const corpo=aviso+cab+(aba==='loja'?menuLoja():aba==='herois'?menuHerois():aba==='como'?menuComo():aba==='conq'?menuConq():aba==='adv'?menuAdv():aba==='opc'?menuOpc():aba==='est'?menuEst():menuJogar());
  o.innerHTML=`<div class="sheet menu"><div class="menuTopo"><b>Guerra de Narrativas</b><span class="topoDir"><span class="saldo" title="Seu Fundo Partidário">F$ ${fmtF(PROG.fundo)}</span><button class="opcBt ${aba==='opc'?'on':''}" id="abreOpc" aria-label="Opções" title="Opções">⚙</button></span></div>
    <nav class="abas" aria-label="Menu">${abas.map(([k,ic,n])=>`<button class="aba ${aba===k?'on':''}" data-aba="${k}" ${aba===k?'aria-current="page"':''}><i aria-hidden="true">${ic}</i><span>${n}</span></button>`).join('')}</nav>
    <div class="abaCorpo">${corpo}</div></div>`;
  o.querySelectorAll('.aba').forEach(b=>b.onclick=()=>renderMenu(b.dataset.aba));
  {const on=o.querySelector('.aba.on');if(on)on.scrollIntoView({block:'nearest',inline:'center'})}
  /* atalhos entre páginas (botões "Jogar agora", "Ver heróis"...) */
  o.querySelectorAll('[data-aba-ir]').forEach(b=>b.onclick=()=>renderMenu(b.dataset.abaIr));
  o.querySelectorAll('[data-tuto]').forEach(b=>b.onclick=()=>abreTuto(true,+b.dataset.tuto));
  pintaFaixas(o);
  $('abreOpc').onclick=()=>renderMenu(aba==='opc'?'jogar':'opc');
  if(aba==='loja')ligaLoja(o);else if(aba==='herois')ligaHerois(o);else if(aba==='jogar')ligaJogar(o);else if(aba==='adv')ligaAdv(o);else if(aba==='opc')ligaOpc(o);
  else if(aba==='est')o.querySelectorAll('canvas[data-pers]').forEach(cn=>portrait(cn,LOOKOF(cn.dataset.pers),'#0002',iconeDe(cn.dataset.pers)));
}
/* página de estatísticas: números gerais, personagens favoritos e mapas mais jogados */
function menuEst(){
  const E=PROG.est,br=v=>Math.round(v).toLocaleString('pt-BR');
  const h=Math.floor(E.tempo/3600),m=Math.floor(E.tempo%3600/60),tempo=h?`${h} h ${m} min`:`${m} min`;
  const fim=E.vitorias+E.derrotas,taxa=fim?Math.round(E.vitorias/fim*100)+'%':'—';
  const top=(o,n)=>Object.entries(o).filter(([k])=>TOWERS[k]||MAPAS[k]).sort((a,b)=>b[1]-a[1]).slice(0,n);
  const card=(v,l)=>`<div><b>${v}</b><small>${l}</small></div>`;
  const pers=(lista,rot)=>lista.length?`<div class="estPers">${lista.map(([k,v])=>`<div><canvas data-pers="${k}"></canvas><span><b>${TOWERS[k].nome}</b><small>${br(v)} ${v===1?rot[0]:rot[1]}</small></span></div>`).join('')}</div>`:'<p class="opcTxt">Ainda não há dados. Jogue uma partida!</p>';
  const mapas=top(E.porMapa,5);
  /* ainda sem partidas: um convite em vez de uma página cheia de zeros */
  if(!E.partidas)return `<div class="vazio"><i aria-hidden="true">📊</i><b>Você ainda não jogou nenhuma partida.</b><p>Aqui vão aparecer as suas vitórias, quem mais convenceu e os mapas que você mais joga.</p><button class="hb" data-aba-ir="jogar">🎮 Jogar agora</button></div>`;
  return `<div class="resumo estNum">${card(br(E.partidas),'partidas começadas')}${card(br(E.vitorias),'vitórias')}${card(taxa,'das partidas terminadas')}${card(br(E.conv),'adversários convencidos')}${card(tempo,'de jogo')}${card(PROG.recorde||'—','recorde no modo livre')}</div>
    <h3 class="fxTit">Quem mais convenceu</h3>${pers(top(E.porPers,5),['convencido','convencidos'])}
    <h3 class="fxTit">Personagens mais colocados</h3>${pers(top(E.colocados,5),['vez','vezes'])}
    <h3 class="fxTit">Mapas mais jogados</h3>${mapas.length?`<div class="estMapas">${mapas.map(([u,v],i)=>{const t=MAPAS[u].tier||1,d=PROG.difs[u]||{},max=mapas[0][1];
      return `<div class="mapaLinha"><span class="pos p${i+1}" aria-label="${i+1}º lugar">${i+1}º</span><canvas data-fx="${u}"></canvas>
        <span class="info"><b>${MAPAS[u].nome}</b><small><i class="tier t${t}" aria-hidden="true">${'●'.repeat(t)}</i> Mapa ${NOMES_TIER[t]}</small>
          <span class="barraJog" aria-hidden="true"><i style="width:${Math.max(8,Math.round(v/max*100))}%"></i></span></span>
        <span class="selos" title="Dificuldades em que você já venceu este mapa">${['facil','normal','dificil'].map(k=>`<i class="selo ${d[k]?'on':''}" title="${DIFFS[k].nome}: ${d[k]?'vencido':'ainda não'}">${seloSvg(k,!!d[k])}</i>`).join('')}</span>
        <span class="qtd"><b>${br(v)}</b><small>${v>1?'partidas':'partida'}</small></span></div>`}).join('')}</div>`:'<p class="opcTxt">Ainda não há dados. Jogue uma partida!</p>'}
    <p class="opcTxt">Lado mais jogado: ${(E.porLado.pt||0)>=(E.porLado.br||0)?'esquerda':'direita'} (esquerda ${br(E.porLado.pt||0)}, direita ${br(E.porLado.br||0)}).</p>`;
}
/* textos das evoluções com a renda passiva já reduzida (verba por rodada, aporte e tamanho do cofre) */
function ajustaTextosRenda(){
  const num=s=>+s.replace(/\./g,''),fmt=v=>v.toLocaleString('pt-BR');
  const troca=d=>d.replace(/R\$ ([\d.]+)(?=[^.;,()]{0,45}?(?:por rodada|de aporte))/g,(_,v)=>'R$ '+fmt(rendaRedonda(num(v))))
    .replace(/(cofre até R\$ )([\d.]+)/gi,(_,a,v)=>a+fmt(Math.max(500,Math.round(num(v)*RENDA_EVO/100)*100)));
  for(const k of Object.keys(TOWERS)){const T=TOWERS[k];if(T.desc)T.desc=troca(T.desc);for(const p of T.up)for(const u of p)if(u.d)u.d=troca(u.d)}
}
/* ---------- interface para o menu em React (versão com servidor; veja frontend/src/motor.ts) ----------
   Dados do jogo e as ações que o menu precisa. O motor continua dono do estado: o React só lê e chama estas funções. */
/* descrição curta de cada personagem, para a loja mostrar inteira sem abrir a ficha (2026-11-17). A longa continua em T.desc */
const DESC_CURTA={
  militante:'Panfleta quem passa. Barato e confiável.',dilma:'Vento empurra a fila de volta. Não convence.',churras:'Cheiro de picanha deixa todos mais lentos.',
  haddad:'Imposto em quem passa; convencido rende verba.',janones:'Não ataca. Acelera quem está perto.',marx:'Joga O Capital em área. Lento.',
  lenin:'O Pravda atravessa a fila.',stalin:'Estrelas e, às vezes, bomba atômica.',sindicato:'Não ataca. Dá argumento a quem está perto.',
  janja:'Voa jogando malas para todo lado.',xandao:'Tarja preta paralisa. Vê Isentões.',dino:'"SUSPENSO" para o alvo um instante.',
  fux:'Plaquinha de muito longe, forte e lenta.',fachin:'Pilhas de autos numa área grande.',zanin:'Habeas corpus em ritmo rápido.',
  carmen:'Balões que calam o alvo um instante.',gilmar:'Passagem para Lisboa: o alvo volta.',toffoli:'"ANULADO": tira escudo e segura o alvo.',
  lula:'Picanha e cervejinha deixam lentos.',che:'Camisetas para todas as direções.',mussolini:'Discurso cansa todos ao redor.',
  putin:'Morcegos e inverno que deixa lento.',xi:'Caixas e robôs que marcham na avenida.',maduro:'Bolívares: o dano cresce no mesmo alvo.',
  abbas:'Resoluções da ONU em área.',artista:'Árvores em chamas na avenida.',marina:'Folhas e dinossauros na avenida.',
  pabllo:'Fogo em cone à frente.',anitta:'Rebola e acerta vários de perto.',xuxa:'Bonecas e o Xuxucão ao lado.',
  datena:'Cadeirada em área; deixa tonto.',renan:'Cogumelos fazem andar para trás.',kim:'Projetos de lei e sushi em área pequena.',
  zapata:'Solta um boi na contramão.',owen:'Não ataca. Cofre com juros; toque para sacar.',prestes:'Tanque de longe, explosão em área.',
  arouca:'Vacinas atravessam a fila; recupera apoio.',rosa:'Leque de panfletos à frente.',goldman:'Pandeiros; às vezes todos param para dançar.',
  helder:'Bíblias e pedidos de vista que deixam lento.',vampirao:'Suga argumento e transforma em verba.',
  patriota:'Santinho verde e amarelo. Barato e confiável.',nikolas:'Vídeo no celular: o alvo para para assistir.',agro:'Solta um boi na contramão.',
  pavanato:'Não ataca. Acelera quem está perto.',flavio:'Projetos de lei em área; forte em veículos.',caminhoneiro:'Caminhão segura a fila; buzina dá argumento.',
  empresario:'Plantas que seguram a fila; rende verba.',empresarios:'Não ataca. Cofre com juros; toque para sacar.',miliciano:'Tanque de longe, explosão em área.',
  veio:'Sacolas deixam lento; convencido rende verba.',bolsonaro:'Pão e leite condensado deixam lentos.',trump:'Tarifas e muros que seguram a fila.',
  milei:'Motosserra em quem está na frente.',bukele:'Algemas prendem o alvo por um tempo.',musk:'Voa de foguete jogando carros.',
  marcal:'Vende curso: cada acerto vira verba.',cury:'Rivotril dá sono; drones atiram.',zema:'Pão de queijo e banana que derruba.',
  caiado:'Pequi atravessa a fila; recupera apoio.',eduarda:'Leque de votos à frente.',eneas:'Grita o nome e, às vezes, bomba atômica.',
  manga:'Mangas; às vezes todos param para dançar.',ana:'Chapéu que vai e volta pela fila.',neymar:'Bolas que atravessam a fila.',
  gusttavo:'Discos de ouro atravessam a fila.',ratinho:'Ratos na avenida; DNA revela Isentões.',kelmon:'Cruzes em área. Vê Isentões.',
  mendonca:'Bíblias e pedidos de vista que deixam lento.',nunes:'Cajuína em área pequena; deixa lento.',churchill:'Charuto deixa lento; aviõezinhos perseguem.',
  thatcher:'Olhar de ferro deixa todos mais lentos.',friedman:'Moedas: o dano cresce no mesmo alvo.',reagan:'Jujubas para todas as direções.',
  clacerda:'Discurso cansa todos ao redor.',nixon:'Fitas gravadas e o cão Checkers ao lado.',gaulle:'"NON!": o alvo volta um pedaço.',
  eneaspres:'Faixa presidencial e bomba atômica.',flaviohip:'Projetos de lei em área. Talvez.',bolsomito:'Capa de mito; pão e leite deixam lentos.',
  lularobo:'Picanha a laser; braço mecânico.',dilmapoderosa:'Capa e vento que empurra a fila.',erika:'Leque de projetos de lei à frente.',
};
for(const k in TOWERS)TOWERS[k].curta=DESC_CURTA[k]||TOWERS[k].desc;
window.GN_MOTOR={
  get PROG(){return PROG},get OPC(){return OPC},get S(){return S},
  MAPAS,ESTADOS,REGIOES,TOWERS,SIDES,ENEMY,DIFFS,MODOS,MEDALHAS,INICIAIS,PREMIO,PREMIO_ESTADO,NOMES_TIER,PREMIO_TIER,HEROI_PODER,CHEFES_REGIAO,TUTO_PARTES,
  menu:()=>({lado:menuSide,uf:menuUF||S.uf,modo:menuModo,msg:menuMsg}),
  defineMenu(o){if(o.lado)menuSide=o.lado;if(o.uf)menuUF=o.uf;if(o.modo)menuModo=o.modo},
  limpaMsg(){menuMsg=''},
  jogar(diff){apagaPartida();newGame(diff,false,menuSide,menuUF||S.uf);aplicaModo(menuModo);if(!tutoVisto())abreTuto(false,0);else if(!(liberaTudo()&&tutoAuto(2)))dicaGiro()},
  jogarDesafio(){const dd=desafioDoDia();apagaPartida();newGame('normal',false,dd.side,dd.uf);aplicaModo('desafio',dd);dicaGiro()},
  desafioDoDia,partidaSalva:lePartida,continuar:continuaPartida,
  podeLivre:()=>!!(S&&S.over&&S.won&&!S.livre&&S.round>=40),continuarLivre:continuaLivre,
  premio:premioPartida,precoLoja,rodadaLibera,liberaTudo,nomePoderHeroi,especialDe,resumoDinamico,nomeModo,seloSvg,
  /* heróis exclusivos: lista por lado, e a entrega de um pacote pago (o React chama quando o servidor confirma) */
  EXCLUSIVOS:Object.fromEntries(Object.entries(EXCLUSIVOS).map(([l,x])=>[l,x.map(e=>e[0])])),
  entregaHerois(ks){let n=0;for(const k of ks)if(TOWERS[k]&&!PROG.donos[k]){PROG.donos[k]=1;n++}if(n){salvaProg();avisoMedalhas=avisoMedalhas.concat(checaMedalhas({}))}return n},
  compra(k){const p=precoLoja(k);if(TOWERS[k].exclusivo||PROG.fundo<p||PROG.donos[k])return false;PROG.fundo-=p;PROG.donos[k]=1;salvaProg();avisoMedalhas=avisoMedalhas.concat(checaMedalhas({}));return true},
  medalhasNovas(){const a=avisoMedalhas;avisoMedalhas=[];return a.map(m=>({id:m.id,nome:m.nome,premio:m.premio}))},
  medalhaProg(id){const m=MEDALHAS.find(x=>x.id===id);return m&&m.prog?m.prog():null},
  pinta:{
    miniatura(cn,uf){garanteMapas();pintaMiniatura(cn,uf)},
    evo:pintaEvo,inimigo:pintaInimigo,
    retrato(cn,k){portrait(cn,LOOKOF(k),'#0000',iconeDe(k))},
    faixa(cn,uf){cn.dataset.fx=uf;pintaFaixas(cn.parentElement||document)},
  },
  abreFicha,abreTuto(i){abreTuto(true,i)},tutoParteVista,
  opcao(k,v){if(k==='som'){mute=!v;OPC.mute=mute;pintaSom()}else OPC[k]=v;if(k==='daltonico'||k==='mouseGrande')aplicaTexto();salvaOpc()},
  volume(k,v,solto){OPC[k]=v;if(AC)saidas();if(solto){salvaOpc();if(k==='volFx'){ligaSom();lastB=0;beep(660,.12,'triangle',.08)}}},
  tamanhoTexto(n){OPC.texto=n;salvaOpc();aplicaTexto()},
  registro:{fila:()=>regFila().length,baixa:regBaixa,envia:regTentaFila},
  codigo:{gera:()=>codigoDe(PROG),le:progDoCodigo,resumo:resumoProg,importa(p){Object.assign(PROG,p);salvaProg()}},
};
ajustaTextosRenda();
montaHabilidades();
garanteTiers();
aplicaTexto();
/* funciona sem internet depois da primeira visita (quando servido por um endereço http, não abrindo o arquivo direto) */
if('serviceWorker' in navigator&&/^https?:$/.test(location.protocol)&&!(window.GN_PONTE&&GN_PONTE.dev))navigator.serviceWorker.register('sw.js').catch(()=>{});
newGame('normal',true,'pt','DF');
resize();
/* boas-vindas curtas: os passos numerados da tela já dizem o que fazer */
showOverlay(`<p class="boasVindas">Monte sua militância e convença a marcha antes que ela chegue ao fim da avenida. Siga os 4 passos abaixo.</p>`);
/* registros de partidas que não conseguiram ser enviados antes: tenta de novo uns segundos depois de abrir */
setTimeout(()=>{try{regTentaFila()}catch(e){}},3000);
/* medalhas que já estavam cumpridas antes de existirem (faixas, vitórias, convencidos...) chegam ao abrir o jogo */
try{const ja=checaMedalhas({});if(ja.length)setTimeout(()=>S&&banner(ja.length===1?'Medalha: '+ja[0].nome:ja.length+' medalhas novas! Veja em Medalhas.'),600)}catch(e){}
requestAnimationFrame(frame);
