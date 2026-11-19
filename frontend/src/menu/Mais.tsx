/* Mais: Perfil, Adversários, Estatísticas, Como jogar e Opções. A lista leva a cada subpágina. */
import { useState } from 'react';
import type { Lado } from '../api';
import { atualizaMenu, fechaMenu, motor, nomeLadoCurto, vaiPara, type Progresso, type SubMais } from '../motor';
import { Cabecalho, Icone, Interruptor, Segmentos, Tela, useConfirma } from './comum';
import type { PropsMenu } from './Menu';

const ITENS: [Exclude<SubMais, null>, string, string, string][] = [
  ['perfil', 'perfil', 'Perfil', 'Seu lado e sua conta'],
  ['adv', 'adv', 'Adversários', 'Quem vem na marcha e os chefões'],
  /* no computador Estatísticas fica na coluna do menu; no celular, aqui */
  ['est', 'est', 'Estatísticas', 'Seus números em todas as partidas'],
  ['como', 'como', 'Como jogar', 'O tutorial, em 3 partes curtas'],
  ['opc', 'opc', 'Opções', 'Som, tela, acessibilidade e dados'],
];
const volta = () => vaiPara('mais', { mais: null });

export function Mais(p: PropsMenu & { sub: SubMais }) {
  if (p.sub === 'perfil') return <Perfil {...p} />;
  if (p.sub === 'adv') return <Adversarios lado={p.lado} />;
  if (p.sub === 'est') return <Estatisticas />;
  if (p.sub === 'como') return <ComoJogar />;
  if (p.sub === 'opc') return <Opcoes />;
  return (
    <>
      <Cabecalho titulo="Mais" />
      <ul className="listaLinks">
        {ITENS.map(([k, ic, n, d]) => (
          <li key={k} className={k === 'est' ? 'soCelular' : undefined}>
            <button type="button" className="linkLinha" onClick={() => vaiPara('mais', { mais: k })}>
              <span className="linkIc"><Icone n={ic} /></span>
              <span className="linkTxt"><b>{n}</b><small>{d}</small></span>
              <Icone n="seta" tam={18} />
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}

/* ---------- Perfil: o lado que você defende e a sua conta ---------- */
function Perfil({ sessao, lado, trocaLado, entrar, sair, comprarFs }: PropsMenu) {
  const m = motor()!;
  const [pergunta, janela] = useConfirma();
  const [saindo, setSaindo] = useState(false);
  const pedeSair = async () => { if (await pergunta('Sair da conta? O progresso dela fica guardado no servidor.', 'Sair da conta')) { setSaindo(true); sair(); } };
  return (
    <>
      {janela}
      <Cabecalho titulo="Perfil" voltar={volta} />
      <section aria-labelledby="ladoTit">
        <h2 id="ladoTit" className="rotulo">Você defende</h2>
        <div className="escolhaLados" role="radiogroup" aria-label="Lado que você defende">
          {(['pt', 'br'] as Lado[]).map(l => (
            <button key={l} type="button" role="radio" aria-checked={lado === l} className={'cartaoLado ' + l + (lado === l ? ' on' : '')} onClick={() => trocaLado(l)}>
              <b>{nomeLadoCurto(l)}</b>
              <small>{m.SIDES[l].pitch}</small>
              {lado === l && <span className="etiqueta ok"><Icone n="check" tam={14} />Seu lado</span>}
            </button>
          ))}
        </div>
        <p className="legenda">O lado vale para as partidas que você começar. O desafio do dia tem o lado dele, que muda a cada dia.</p>
      </section>

      <section className="cartao contaCartao" aria-labelledby="contaTit">
        <h2 id="contaTit" className="rotulo">Conta</h2>
        {sessao ? (
          <>
            <p className="contaNome"><span className="avatar grande" aria-hidden="true">{sessao.jogador.nome.slice(0, 1).toUpperCase()}</span><span><b>{sessao.jogador.nome}</b><small>Seu progresso fica guardado no servidor e vai junto para qualquer aparelho.</small></span></p>
            <div className="linhaBts">
              <button type="button" className="bt premium" onClick={() => comprarFs()}><Icone n="moeda" tam={18} /><span>Comprar F$</span></button>
              <button type="button" className="bt fantasma" onClick={pedeSair} disabled={saindo}><Icone n="sair" tam={18} />{saindo ? 'Saindo…' : 'Sair da conta'}</button>
            </div>
          </>
        ) : (
          <>
            <p>Você está jogando sem conta: o progresso fica só neste navegador. Com uma conta, ele fica guardado e vai junto para qualquer aparelho.</p>
            <button type="button" className="bt pri" onClick={entrar}>Entrar ou criar conta</button>
          </>
        )}
      </section>
    </>
  );
}

/* ---------- Adversários ---------- */
function Adversarios({ lado }: { lado: Lado }) {
  const m = motor()!;
  const C = m.SIDES[lado], regs = m.CHEFES_REGIAO[lado] ?? {};
  const comuns = [...new Set(Object.values(C.foes))];
  const chefes = [...new Set([10, 20, 30, 40].flatMap(r => [C.boss[r][0], ...(r < 40 ? Object.values(regs).map(t => t[r]) : [])]))];
  const nome = (k: string) => m.ENEMY[k].nome.replace(/ \(.*\)/, '');
  const card = (k: string) => (
    <li key={k} className={'adv' + (m.ENEMY[k].boss ? ' chefe' : '')}>
      <Tela chave={k} pinta={cn => m.pinta.inimigo(cn, k, 64)} />
      <div><b>{nome(k)}</b><small>{m.especialDe(k)}</small></div>
    </li>
  );
  return (
    <>
      <Cabecalho titulo="Adversários" voltar={volta} />
      <p className="legenda">Quem vem pela avenida quando você defende {C.goal}.</p>
      <h2 className="rotulo">Marcha</h2>
      <ul className="listaAdv">{comuns.map(card)}</ul>
      <h2 className="rotulo">Chefões <span>mudam conforme a região do mapa</span></h2>
      <ul className="listaAdv">{chefes.map(card)}</ul>
    </>
  );
}

/* ---------- Estatísticas ---------- */
function Estatisticas() {
  const m = motor()!;
  const E = m.PROG.est, br = (v: number) => Math.round(v).toLocaleString('pt-BR');
  const top = (o: Record<string, number>, n: number) => Object.entries(o).filter(([k]) => m.TOWERS[k] || m.MAPAS[k]).sort((a, b) => b[1] - a[1]).slice(0, n);
  if (!E.partidas) return (
    <>
      <Cabecalho titulo="Estatísticas" voltar={volta} />
      <div className="semDados">
        <Icone n="est" tam={40} />
        <b>Você ainda não jogou nenhuma partida.</b>
        <p>Aqui vão aparecer as suas vitórias, quem mais convenceu e os mapas que você mais joga.</p>
        <button type="button" className="bt pri" onClick={() => vaiPara('jogar')}>Jogar agora</button>
      </div>
    </>
  );
  const h = Math.floor(E.tempo / 3600), mi = Math.floor(E.tempo % 3600 / 60);
  const fim = E.vitorias + E.derrotas;
  const pers = (lista: [string, number][], rot: [string, string]) => lista.length ? (
    <ol className="ranking">
      {lista.map(([k, v], i) => (
        <li key={k}><span className="posRank">{i + 1}º</span><span className="retrato"><Tela chave={k} pinta={cn => m.pinta.retrato(cn, k)} /></span>
          <span className="rankTxt"><b>{m.TOWERS[k].nome}</b><small>{br(v)} {v === 1 ? rot[0] : rot[1]}</small></span></li>
      ))}
    </ol>
  ) : <p className="legenda">Ainda não há dados.</p>;
  const mapas = top(E.porMapa, 5);
  return (
    <>
      <Cabecalho titulo="Estatísticas" voltar={volta} />
      <div className="placar">
        <div><strong>{br(E.partidas)}</strong><span>partidas</span></div>
        <div><strong>{br(E.vitorias)}</strong><span>vitórias{fim ? ` (${Math.round(E.vitorias / fim * 100)}%)` : ''}</span></div>
        <div><strong>{br(E.conv)}</strong><span>convencidos</span></div>
        <div><strong>{h ? `${h}h ${mi}min` : `${mi}min`}</strong><span>de jogo</span></div>
      </div>
      <h2 className="rotulo">Quem mais convenceu</h2>
      {pers(top(E.porPers, 5), ['convencido', 'convencidos'])}
      <h2 className="rotulo">Mais colocados</h2>
      {pers(top(E.colocados, 5), ['vez', 'vezes'])}
      <h2 className="rotulo">Mapas mais jogados</h2>
      {mapas.length ? (
        <ol className="ranking">
          {mapas.map(([u, v], i) => (
            <li key={u}><span className="posRank">{i + 1}º</span><span className="faixaFig"><Tela chave={u} pinta={cn => m.pinta.faixa(cn, u)} /></span>
              <span className="rankTxt"><b>{m.MAPAS[u].nome}</b><small>{br(v)} {v > 1 ? 'partidas' : 'partida'}</small></span></li>
          ))}
        </ol>
      ) : <p className="legenda">Ainda não há dados.</p>}
      <p className="legenda">Lado mais jogado: {(E.porLado.pt || 0) >= (E.porLado.br || 0) ? 'Esquerda' : 'Direita'} (Esquerda {br(E.porLado.pt || 0)}, Direita {br(E.porLado.br || 0)}).</p>
    </>
  );
}

/* ---------- Como jogar ---------- */
function ComoJogar() {
  const m = motor()!;
  return (
    <>
      <Cabecalho titulo="Como jogar" sub="Cada parte abre sozinha uma vez, na hora certa. Aqui você revê qualquer uma." voltar={volta} />
      <ul className="listaLinks">
        {m.TUTO_PARTES.map(([, n, d], i) => (
          <li key={i}>
            <button type="button" className="linkLinha" onClick={() => { fechaMenu(); m.abreTuto(i); }}>
              <span className="linkIc num" aria-hidden="true">{i + 1}</span>
              <span className="linkTxt"><b>{n.replace(/^\d+\.\s*/, '')}</b><small>{d}</small></span>
              <span className={'etiqueta' + (m.tutoParteVista(i) ? ' ok' : '')}>{m.tutoParteVista(i) ? 'Vista' : 'Nova'}</span>
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}

/* ---------- Opções ---------- */
function Opcoes() {
  const m = motor()!;
  const O = m.OPC;
  const [, re] = useState(0);
  const opc = (k: string, v: boolean) => { m.opcao(k, v); re(x => x + 1); };
  const [fila, setFila] = useState(m.registro.fila());
  const [codigo, setCodigo] = useState('');
  const [copiado, setCopiado] = useState(false);
  const [entrada, setEntrada] = useState('');
  const [lido, setLido] = useState<Progresso | null | 'ruim'>(null);
  const [importou, setImportou] = useState(false);
  const vol = (k: 'volFx' | 'volMus', rot: string) => (
    <label className="volume">
      <span>{rot}</span>
      <input type="range" min={0} max={100} step={5} defaultValue={Math.round(O[k] * 100)}
        onInput={e => { const v = +(e.target as HTMLInputElement).value; m.volume(k, v / 100); (e.target as HTMLInputElement).nextElementSibling!.textContent = v + '%'; }}
        onChange={e => m.volume(k, +e.target.value / 100, true)} />
      <b>{Math.round(O[k] * 100)}%</b>
    </label>
  );
  const copia = async () => { try { await navigator.clipboard.writeText(codigo); setCopiado(true); } catch { /* sem área de transferência: o texto fica selecionável */ } };

  return (
    <>
      <Cabecalho titulo="Opções" voltar={volta} />

      <section className="grupoOpc" aria-labelledby="opSom">
        <h2 id="opSom" className="rotulo">Som</h2>
        <Interruptor rotulo="Efeitos sonoros" ligado={!O.mute} muda={v => opc('som', v)} />
        {vol('volFx', 'Volume dos efeitos')}
        <Interruptor rotulo="Música de fundo" dica="Durante a partida; cada lado tem a sua." ligado={!!O.musica} muda={v => opc('musica', v)} />
        {vol('volMus', 'Volume da música')}
      </section>

      <section className="grupoOpc" aria-labelledby="opTela">
        <h2 id="opTela" className="rotulo">Tela e acessibilidade</h2>
        <Interruptor rotulo="Tela calma" dica="Sem tremor, sem clarões e sem câmera lenta." ligado={!!O.calmo} muda={v => opc('calmo', v)} />
        <Interruptor rotulo="Cores fáceis" dica="Cores seguras para daltônicos, contorno nos adversários e bordas tracejadas." ligado={!!O.daltonico} muda={v => opc('daltonico', v)} />
        <Interruptor rotulo="Mouse em destaque" dica="Cursor grande e amarelo, com um anel em volta no mapa." ligado={O.mouseGrande !== false} muda={v => opc('mouseGrande', v)} />
        <div className="opcLinha">
          <span>Tamanho do texto</span>
          <Segmentos rotulo="Tamanho do texto" valor={String(O.texto || 1)} muda={v => { m.tamanhoTexto(+v); re(x => x + 1); }}
            opcoes={[['1', 'Normal'], ['2', 'Grande'], ['3', 'Maior']]} />
        </div>
      </section>

      <section className="grupoOpc" aria-labelledby="opReg">
        <h2 id="opReg" className="rotulo">Registro das partidas</h2>
        <Interruptor rotulo="Registrar como cada partida foi jogada" dica="Personagens, posições, evoluções e resultado, para ajustar o equilíbrio do jogo. Nada pessoal." ligado={O.registro !== false} muda={v => opc('registro', v)} />
        <p className="legenda">Esperando para enviar: <b>{fila}</b>.</p>
        <div className="linhaBts">
          <button type="button" className="bt sec" onClick={() => m.registro.baixa()}>Baixar registros</button>
          <button type="button" className="bt sec" onClick={async () => { await m.registro.envia(); setFila(m.registro.fila()); }}>Enviar agora</button>
        </div>
      </section>

      <section className="grupoOpc" aria-labelledby="opCod">
        <h2 id="opCod" className="rotulo">Levar o progresso sem conta</h2>
        <p className="legenda">Sem conta, o progresso ({m.codigo.resumo(m.PROG)}) fica só neste navegador. Gere um código, copie e cole no outro aparelho. Com conta, isso é automático.</p>
        <div className="linhaBts">
          <button type="button" className="bt sec" onClick={() => { setCodigo(m.codigo.gera()); setCopiado(false); }}>Gerar código</button>
          {codigo && <button type="button" className="bt sec" onClick={copia}>{copiado ? 'Copiado!' : 'Copiar'}</button>}
        </div>
        {codigo && <textarea className="caixaCodigo" readOnly value={codigo} aria-label="Código do seu progresso" onFocus={e => e.target.select()} />}
        <label className="campo">
          <span>Trazer de outro aparelho</span>
          <textarea className="caixaCodigo" value={entrada} onChange={e => { setEntrada(e.target.value); setLido(null); setImportou(false); }} placeholder="Cole aqui o código que começa com GN1:" />
        </label>
        <button type="button" className="bt sec" disabled={!entrada.trim()} onClick={() => setLido(m.codigo.le(entrada) ?? 'ruim')}>Conferir código</button>
        {lido === 'ruim' && <p className="erroTxt" role="alert">Código inválido. Confira se copiou o código inteiro, começando com GN1:.</p>}
        {lido && lido !== 'ruim' && !importou && (
          <div className="cartao alertaCartao" role="status">
            <p>O código tem {m.codigo.resumo(lido)}. Importar <b>substitui</b> o progresso atual ({m.codigo.resumo(m.PROG)}).</p>
            <button type="button" className="bt perigo" onClick={() => { m.codigo.importa(lido); setImportou(true); atualizaMenu(); }}>Substituir meu progresso</button>
          </div>
        )}
        {importou && <p className="okTxt" role="status">Progresso importado.</p>}
      </section>
    </>
  );
}
