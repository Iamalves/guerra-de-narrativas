/* Conquistas: medalhas (feitos que rendem F$) e faixas dos estados (com as vitórias em cada dificuldade). */
import { useState } from 'react';
import { fs, motor, type Dificuldade } from '../motor';
import { Cabecalho, Icone, Segmentos, Tela } from './comum';

const DIFS: Dificuldade[] = ['facil', 'normal', 'dificil'];

export function Conquistas() {
  const m = motor()!;
  const [aba, setAba] = useState<'med' | 'fx'>('med');
  const P = m.PROG;
  const nMed = m.MEDALHAS.filter(x => P.medalhas[x.id]).length;
  const nFx = m.ESTADOS.filter(e => P.faixas[e[0]]).length;
  /* medalhas que faltam primeiro, das mais perto de sair; as ganhas no fim */
  const medalhas = [...m.MEDALHAS].sort((a, b) => Number(!!P.medalhas[a.id]) - Number(!!P.medalhas[b.id]));

  return (
    <>
      <Cabecalho titulo="Conquistas" sub="Cada medalha e cada faixa nova rende F$." />

      <div className="placar">
        <div><strong>{nMed}<small>/{m.MEDALHAS.length}</small></strong><span>medalhas</span></div>
        <div><strong>{nFx}<small>/{m.ESTADOS.length}</small></strong><span>faixas de estados</span></div>
        {P.recorde ? <div><strong>{P.recorde}</strong><span>recorde no modo livre</span></div> : null}
      </div>

      <Segmentos rotulo="O que ver" valor={aba} muda={setAba} className="segLargo" opcoes={[['med', 'Medalhas'], ['fx', 'Faixas']]} />

      {aba === 'med' ? (
        <ul className="listaMedalhas">
          {medalhas.map(x => {
            const ok = !!P.medalhas[x.id], pr = !ok ? m.medalhaProg(x.id) : null, v = pr ? Math.min(pr[0], pr[1]) : 0;
            return (
              <li key={x.id} className={'medCartao' + (ok ? ' ok' : '')}>
                <span className="medalhaIc" aria-hidden="true">{ok ? '🏅' : <Icone n="cadeado" tam={20} />}</span>
                <div className="medalhaTxt">
                  <b>{x.nome}</b>
                  <small>{x.desc}</small>
                  {pr && <>
                    <span className="barra" role="progressbar" aria-valuemin={0} aria-valuemax={pr[1]} aria-valuenow={Math.floor(v)} aria-label={`Progresso de ${x.nome}`}><i style={{ width: Math.round(v / pr[1] * 100) + '%' }} /></span>
                    <small className="barraTxt">{Math.floor(v).toLocaleString('pt-BR')} de {pr[1].toLocaleString('pt-BR')}</small>
                  </>}
                </div>
                <span className={'etiqueta' + (ok ? ' ok' : '')}>{ok ? 'Ganha' : '+' + fs(x.premio)}</span>
              </li>
            );
          })}
        </ul>
      ) : (
        <>
          <p className="legenda">Vença um mapa para ganhar a faixa com a bandeira do estado. Embaixo, as medalhas de bronze, prata e ouro mostram as vitórias no Fácil, no Normal e no Difícil.</p>
          <div className="totaisSelos">
            {DIFS.map(k => (
              <span key={k}><span dangerouslySetInnerHTML={{ __html: m.seloSvg(k, true) }} /><b>{m.ESTADOS.filter(e => (P.difs[e[0]] ?? {})[k]).length}</b> no {m.DIFFS[k].nome}</span>
            ))}
          </div>
          {m.REGIOES.map(([reg, ufs]) => (
            <section key={reg} className="regiao" aria-labelledby={'reg' + reg}>
              <h2 id={'reg' + reg} className="rotulo">{reg} <span>{ufs.filter(u => P.faixas[u]).length} de {ufs.length}</span></h2>
              <div className="gradeFaixas">
                {ufs.map(u => {
                  const d = P.difs[u] ?? {}, nome = m.ESTADOS.find(e => e[0] === u)?.[1] ?? u, venc = DIFS.filter(k => d[k]);
                  return (
                    <div key={u} className={'fxCartao' + (P.faixas[u] ? ' ok' : '') + (venc.length === 3 ? ' completa' : '')}>
                      <span className="faixaFig"><Tela chave={u} pinta={cn => m.pinta.faixa(cn, u)} /></span>
                      <b>{nome}</b>
                      <span className="selosDif" role="img" aria-label={venc.length ? 'Vencido no ' + venc.map(k => m.DIFFS[k].nome).join(', ') : 'Ainda não vencido'}
                        dangerouslySetInnerHTML={{ __html: DIFS.map(k => m.seloSvg(k, !!d[k])).join('') }} />
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </>
      )}
    </>
  );
}
