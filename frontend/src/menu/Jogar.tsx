/* Jogar: só o essencial numa tela (o mapa escolhido, a dificuldade e o botão Jogar).
   Trocar o estado e o modo abre uma folha à parte. O lado vem do perfil. */
import { useEffect, useRef, useState } from 'react';
import { atualizaMenu, fechaMenu, fs, motor, nomeLadoCurto, vaiPara, type Dificuldade } from '../motor';
import { Folha, Icone, Segmentos, Tela } from './comum';
import type { PropsMenu } from './Menu';

const K_DIF = 'gn_dif';
const leDif = (): Dificuldade => { try { const v = localStorage.getItem(K_DIF); return v === 'facil' || v === 'dificil' ? v : 'normal'; } catch { return 'normal'; } };
const DIFS: Dificuldade[] = ['facil', 'normal', 'dificil'];
/* o motor manda a tela de fim de partida em HTML; a caixa do modo livre vira um botão do React */
const semCaixaLivre = (h: string) => h.replace(/<div class="livreBox">[\s\S]*$/, '');

export function Jogar({ lado }: PropsMenu) {
  const m = motor()!;
  const [dif, setDif] = useState<Dificuldade>(leDif);
  const [folha, setFolha] = useState<null | 'estado' | 'modo'>(null);
  const [filtro, setFiltro] = useState('todos');
  const [fimFechado, setFimFechado] = useState(false);
  const res = useRef<HTMLDivElement>(null);

  /* o lado do perfil é o lado das partidas */
  useEffect(() => { m.defineMenu({ lado }); }, [lado, m]);

  const { uf, modo, msg } = m.menu();
  const M = m.MAPAS[uf], nomeUf = m.ESTADOS.find(e => e[0] === uf)?.[1] ?? uf;
  const fim = !!(m.S?.over && msg) && !fimFechado;
  useEffect(() => { res.current?.querySelectorAll<HTMLCanvasElement>('canvas[data-fx]').forEach(cn => m.pinta.faixa(cn, cn.dataset.fx!)); }, [fim, msg, m]);

  const sv = fim ? null : m.partidaSalva();
  const dd = m.desafioDoDia(), feito = m.PROG.desafio === dd.dia;
  const premio = m.premio(dif, uf, modo);
  const itens = [...(M.tier === 4 ? ['obras (4 lugares onde não se pode colocar ninguém; a marcha anda 5% mais rápido)'] : []),
    ...(m.resumoDinamico(uf) || '').split(' · ').filter(Boolean)];

  const mudaDif = (d: Dificuldade) => { setDif(d); try { localStorage.setItem(K_DIF, d); } catch { /* sem armazenamento */ } };
  const define = (o: { uf?: string; modo?: string }) => { m.defineMenu(o); setFolha(null); atualizaMenu(); };
  const joga = (f: () => void) => { m.limpaMsg(); fechaMenu(); f(); };

  /* lista de estados da folha, com filtro por região ou "ainda não vencidos" */
  const noFiltro = (u: string) => filtro === 'todos' ? true : filtro === 'falta' ? !m.PROG.faixas[u] : !!m.REGIOES.find(r => r[0] === filtro)?.[1].includes(u);
  const lista = m.ESTADOS.filter(e => noFiltro(e[0]));
  const sorteia = () => {
    const op = lista.map(e => e[0]).filter(u => u !== uf);
    if (op.length) define({ uf: op[Math.floor(Math.random() * op.length)] });
  };
  const dots = (n: number) => '●'.repeat(n);
  const modoAtual = m.MODOS.find(x => x[0] === modo) ?? m.MODOS[0];

  return (
    <>
      <h1 className="someVisual" tabIndex={-1}>Jogar</h1>

      {fim && (
        <section className={'cartao resultado ' + (m.S?.won ? 'vitoria' : 'derrota')} aria-label="Resultado da partida">
          <button type="button" className="btIcone resultadoX" onClick={() => { m.limpaMsg(); setFimFechado(true); }} aria-label="Fechar resultado"><Icone n="x" /></button>
          <div className="resultadoHtml" ref={res} dangerouslySetInnerHTML={{ __html: semCaixaLivre(msg) }} />
          {m.podeLivre() && (
            <div className="livre">
              <p>No modo livre as rodadas continuam, cada vez mais difíceis, e vale recorde{m.PROG.recorde ? ` (o seu é a rodada ${m.PROG.recorde})` : ''}.</p>
              <button type="button" className="bt sec" onClick={() => joga(m.continuarLivre)}>Continuar no modo livre</button>
            </div>
          )}
          {/* fim de partida: lembrete discreto dos heróis exclusivos do seu lado (só se ainda faltar algum) */}
          {m.EXCLUSIVOS[lado]?.some(k => !m.PROG.donos[k]) && (
            <button type="button" className="lembretePacote" onClick={() => vaiPara('loja', { lojaAba: 'pacotes' })}>
              <span className="lembreteIc" aria-hidden="true"><Icone n="estrela" tam={18} /></span>
              <span><b>Reforço para a próxima?</b><small>Heróis exclusivos da {nomeLadoCurto(lado)}, com poder próprio. Ver pacotes</small></span>
              <Icone n="seta" tam={18} />
            </button>
          )}
        </section>
      )}

      {sv && (
        <section className="cartao cartaoContinuar">
          <div>
            <h2>Partida salva</h2>
            <p>{nomeLadoCurto(sv.side)} em {m.MAPAS[sv.uf]?.nome ?? sv.uf} · {m.DIFFS[sv.diff as Dificuldade]?.nome}
              {sv.modo && sv.modo !== 'classico' ? ' · ' + m.nomeModo(sv.modo) : ''} · {sv.em ? 'no meio da rodada ' + sv.round : 'rodada ' + sv.round + (sv.livre ? '' : ' de 40')}</p>
          </div>
          <button type="button" className="bt sec" onClick={() => joga(m.continuar)}>Continuar</button>
        </section>
      )}

      <section className="cartao mapaHero" aria-labelledby="mapaNome">
        <button type="button" className="mapaHeroImg" onClick={() => setFolha('estado')} aria-label={`Mapa: ${M.nome}. Trocar estado`}>
          <Tela chave={uf} largura={640} altura={427} pinta={cn => m.pinta.miniatura(cn, uf)} />
          <span className={'nivelMapa t' + M.tier}><span aria-hidden="true">{dots(M.tier)}</span> {m.NOMES_TIER[M.tier]}</span>
        </button>
        <div className="mapaHeroInfo">
          <p className="ladoLinha"><span className={'ladoPonto ' + lado} aria-hidden="true" />Você defende a <b>{nomeLadoCurto(lado)}</b></p>
          <h2 id="mapaNome">{M.nome}</h2>
          <p className="mapaUf">{nomeUf !== M.nome ? nomeUf + ' · ' : ''}{M.leg}{M.tier > 1 ? ` · prêmio ×${String(m.PREMIO_TIER[M.tier]).replace('.', ',')}` : ''}</p>
          {itens.length > 0 && (
            <details className="mapaDetalhes">
              <summary>O que tem neste mapa</summary>
              <ul>{itens.map(t => <li key={t}>{t}</li>)}</ul>
            </details>
          )}
          <div className="linhaBts">
            <button type="button" className="bt sec" onClick={() => setFolha('estado')}><Icone n="mapa" tam={18} />Trocar estado</button>
            <button type="button" className="bt sec" onClick={() => setFolha('modo')}><Icone n="modo" tam={18} />{modoAtual[1]}</button>
          </div>
        </div>
      </section>

      <section className="dificuldade" aria-labelledby="difTit">
        <h2 id="difTit" className="rotulo">Dificuldade</h2>
        <Segmentos rotulo="Dificuldade" valor={dif} muda={mudaDif} className="segDif"
          opcoes={DIFS.map(d => [d, <><b>{m.DIFFS[d].nome}</b><small>{fs(m.premio(d, uf, modo))}</small></>])} />
      </section>

      <div className="jogarBarra">
        <button type="button" className="bt pri grande" onClick={() => joga(() => m.jogar(dif))}>
          <Icone n="jogar" tam={26} /><span className="jogarTxt">Jogar</span><small>vale {fs(premio)}</small>
        </button>
      </div>

      <section className="cartao cartaoDesafio" aria-labelledby="desTit">
        <span className="desafioIc" aria-hidden="true"><Icone n="calendario" /></span>
        <div className="desafioTxt">
          <h2 id="desTit">Desafio do dia {feito && <span className="etiqueta ok"><Icone n="check" tam={14} />vencido</span>}</h2>
          <p>{nomeLadoCurto(dd.side)} em {m.MAPAS[dd.uf].nome} · Normal · {feito ? 'o prêmio de hoje já foi' : 'vale F$ 300 a mais'}</p>
          <p className="miuda">Só com {dd.keys.map(k => m.TOWERS[k].nome).join(', ')}</p>
        </div>
        <button type="button" className="bt sec" onClick={() => joga(m.jogarDesafio)}>Jogar desafio</button>
      </section>

      <p className="rodapeAviso">Paródia de humor, sem vínculo com partidos ou com as pessoas citadas. As falas e situações são inventadas, e ninguém se machuca: todo mundo só muda de ideia e vai embora.</p>

      <Folha titulo="Escolha o estado" aberta={folha === 'estado'} aoFechar={() => setFolha(null)}>
        <div className="filtros" role="group" aria-label="Filtrar estados">
          {[['todos', 'Todos'], ...m.REGIOES.map(([r]) => [r, r]), ['falta', 'Não vencidos']].map(([k, n]) => (
            <button key={k} type="button" className={'filtro' + (filtro === k ? ' on' : '')} aria-pressed={filtro === k} onClick={() => setFiltro(k)}>{n}</button>
          ))}
          <button type="button" className="filtro filtroSorteia" onClick={sorteia} disabled={!lista.length}><Icone n="dado" tam={16} />Sortear</button>
        </div>
        {lista.length ? (
          <div className="gradeMapas">
            {lista.map(([u, nome]) => {
              const T = m.MAPAS[u].tier, d = m.PROG.difs[u] ?? {}, on = u === uf;
              return (
                <button key={u} type="button" className={'mapaItem' + (on ? ' on' : '')} aria-pressed={on} onClick={() => define({ uf: u })}
                  aria-label={`${nome}, mapa ${m.NOMES_TIER[T]}${m.PROG.faixas[u] ? ', já vencido' : ''}`}>
                  <Tela chave={u} largura={184} altura={123} pinta={cn => m.pinta.miniatura(cn, u)} />
                  <span className="mapaItemTxt"><b>{nome}</b><small><span className={'pontos t' + T}>{dots(T)}</span> {m.NOMES_TIER[T]}</small></span>
                  <span className="vits" aria-hidden="true">{DIFS.map(k => <i key={k} className={k + (d[k] ? ' on' : '')} />)}</span>
                </button>
              );
            })}
          </div>
        ) : <p className="vazioTxt">Você já venceu todos os estados deste filtro. 🎉</p>}
        <p className="legenda"><span className="pontos t1">●</span> Iniciante · <span className="pontos t2">●●</span> Intermediário · <span className="pontos t3">●●●</span> Avançado · <span className="pontos t4">●●●●</span> Expert. Quanto mais difícil, mais F$. As três bolinhas embaixo: vitórias no Fácil, Normal e Difícil.</p>
      </Folha>

      <Folha titulo="Modo de jogo" aberta={folha === 'modo'} aoFechar={() => setFolha(null)}>
        <div className="listaOpcoes" role="radiogroup" aria-label="Modo de jogo">
          {m.MODOS.map(([k, n, d]) => (
            <button key={k} type="button" role="radio" aria-checked={modo === k} className={'opcaoLinha' + (modo === k ? ' on' : '')} onClick={() => define({ modo: k })}>
              <span className="radio" aria-hidden="true" />
              <span><b>{n}</b><small>{d}</small></span>
            </button>
          ))}
        </div>
      </Folha>
    </>
  );
}
