/* Casca do menu: barra de navegação embaixo no celular (coluna à esquerda no computador), saldo de F$ e a página aberta. */
import { useEffect, useRef, useState } from 'react';
import { api, type Lado, type Sessao } from '../api';
import { estadoEnvio, ouveEnvio } from '../conta';
import { fs, motor, useMenu, vaiPara, type Pagina } from '../motor';
import { Icone } from './comum';
import { Jogar } from './Jogar';
import { Loja } from './Loja';
import { Conquistas } from './Conquistas';
import { Amigos } from './Amigos';
import { Mais } from './Mais';

export interface PropsMenu {
  sessao: Sessao | null;
  lado: Lado;
  trocaLado: (l: Lado) => void;
  /** abre a loja de F$ (com um motivo opcional, como "faltam F$ 300 para liberar o Fulano") */
  comprarFs: (motivo?: string) => void;
  entrar: () => void;
  sair: () => void;
  avisa: (t: string) => void;
}

const K_MINI = 'gn_nav_mini';
/* Estatísticas é uma subpágina de Mais, mas tem lugar próprio na navegação */
type ItemNav = Pagina | 'est';
const ABAS: [ItemNav, string, string][] = [['jogar', 'jogar', 'Jogar'], ['loja', 'loja', 'Loja'], ['amigos', 'amigos', 'Amigos'], ['conq', 'conq', 'Conquistas'], ['est', 'est', 'Estatísticas'], ['mais', 'mais', 'Mais']];

export function Menu(p: PropsMenu) {
  const menu = useMenu();
  const m = motor();
  const corpo = useRef<HTMLElement>(null);
  const [envio, setEnvio] = useState(estadoEnvio());
  /* coluna do menu recolhida (só ícones) no computador; fica lembrado neste navegador */
  const [mini, setMini] = useState(() => { try { return localStorage.getItem(K_MINI) === '1'; } catch { return false; } });
  const trocaMini = () => setMini(v => { try { localStorage.setItem(K_MINI, v ? '0' : '1'); } catch { /* sem armazenamento */ } return !v; });
  useEffect(() => ouveEnvio(setEnvio), []);
  /* convites de amizade esperando resposta: número no item Amigos (confere ao abrir o menu e ao trocar de página) */
  const [convites, setConvites] = useState(0);
  useEffect(() => {
    if (!p.sessao) return;
    let vivo = true;
    api.amigos(p.sessao.token).then(d => { if (vivo) setConvites(d.recebidos.length); }).catch(() => {});
    return () => { vivo = false; };
  }, [p.sessao, menu.pagina]);
  /* trocou de página: volta ao topo e leva o foco para o título (leitor de tela anuncia a página nova) */
  const chavePag = menu.pagina + (menu.mais ?? '');
  useEffect(() => {
    corpo.current?.scrollTo(0, 0);
    corpo.current?.querySelector<HTMLElement>('h1')?.focus({ preventScroll: true });
  }, [chavePag]);
  /* medalhas ganhas fora da partida (comprando, por exemplo) */
  useEffect(() => {
    if (!m) return;
    for (const md of m.medalhasNovas()) p.avisa(`🏅 Medalha nova: ${md.nome} (+${fs(md.premio)})`);
  }, [menu.versao]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!m) return null;
  const nuvem = !p.sessao ? null : envio === 'erro' ? 'Progresso não salvou: tento de novo sozinho' : envio === 'salvando' ? 'Salvando o progresso' : 'Progresso salvo na conta';

  return (
    <div className={'gnMenu' + (mini ? ' navMini' : '')} data-lado={p.lado}>
      <header className="gnTopo">
        <span className="marca" aria-hidden="true">Guerra de<br />Narrativas</span>
        <div className="menuTopoDir">
          <button type="button" className="saldoBt" onClick={() => p.comprarFs()} aria-label={`Seu saldo: ${fs(m.PROG.fundo)}. Comprar mais F$`}>
            <Icone n="moeda" tam={18} /><span>{fs(m.PROG.fundo)}</span><b aria-hidden="true">+</b>
          </button>
          <button type="button" className={'contaBt' + (envio === 'erro' ? ' erro' : '')} onClick={() => vaiPara('mais', { mais: 'perfil' })}
            aria-label={p.sessao ? `Perfil de ${p.sessao.jogador.nome}. ${nuvem}` : 'Perfil: jogando sem conta'} title={nuvem ?? 'Jogando sem conta'}>
            <span className="avatar" aria-hidden="true">{p.sessao ? p.sessao.jogador.nome.slice(0, 1).toUpperCase() : <Icone n="perfil" tam={18} />}</span>
            {p.sessao && <i className={'pontoEnvio ' + envio} aria-hidden="true" />}
          </button>
        </div>
      </header>

      <nav className="menuNav" aria-label="Menu principal">
        <span className="marca navMarca" aria-hidden="true">Guerra de Narrativas</span>
        {ABAS.map(([k, ic, n]) => {
          const on = k === 'est' ? menu.pagina === 'mais' && menu.mais === 'est' : k === 'mais' ? menu.pagina === 'mais' && menu.mais !== 'est' : menu.pagina === k;
          return (
          <button key={k} type="button" className={'navItem' + (on ? ' on' : '') + (k === 'est' ? ' soPc' : '')} aria-current={on ? 'page' : undefined}
            onClick={() => k === 'est' ? vaiPara('mais', { mais: 'est' }) : vaiPara(k, k === 'mais' ? { mais: null } : {})} title={mini ? n : undefined}>
            <span className="navIc"><Icone n={ic} tam={24} />{k === 'amigos' && convites > 0 && <b className="navSelo">{convites}</b>}</span><span className="navTxt">{n}{k === 'amigos' && convites > 0 && <span className="someVisual">, {convites} {convites === 1 ? 'convite' : 'convites'}</span>}</span>
          </button>
          );
        })}
        {/* só no computador: recolhe a coluna para ficar só com os ícones */}
        <button type="button" className="navRecolhe" onClick={trocaMini} aria-expanded={!mini}
          aria-label={mini ? 'Expandir menu' : 'Recolher menu'} title={mini ? 'Expandir menu' : 'Recolher menu'}>
          <Icone n={mini ? 'expande' : 'recolhe'} tam={20} /><span className="navTxt">Recolher</span>
        </button>
      </nav>

      <main className="menuCorpo" ref={corpo}>
        <div className="menuConteudo" key={chavePag}>
          {menu.pagina === 'jogar' && <Jogar {...p} />}
          {menu.pagina === 'loja' && <Loja {...p} aba={menu.lojaAba} />}
          {menu.pagina === 'amigos' && <Amigos {...p} />}
          {menu.pagina === 'conq' && <Conquistas />}
          {menu.pagina === 'mais' && <Mais {...p} sub={menu.mais} />}
        </div>
      </main>
    </div>
  );
}
