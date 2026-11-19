import { useCallback, useEffect, useState } from 'react';
import { api, ErroApi, type Lado, type Sessao } from './api';
import { guardaSessao, leSessao, ligaPonte, preparaProgresso, recebeEntregas, saiDaConta } from './conta';
import { defineLado, ladoAtual, levaLadoParaConta } from './perfil';
import { atualizaMenu, motor, useMenu } from './motor';
import { Jogo } from './componentes/Jogo';
import { TelaEntrada } from './componentes/TelaEntrada';
import { LojaFS } from './componentes/LojaFS';
import { EscolhaLado } from './componentes/EscolhaLado';
import { OfertaBoasVindas } from './componentes/OfertaBoasVindas';
import { boasVindasVista, marcaBoasVindasVista } from './compras';
import { Menu } from './menu/Menu';

type Fase =
  | { k: 'carregando' }
  | { k: 'entrada'; aviso?: string }
  | { k: 'jogo'; sessao: Sessao | null };

/* quem escolheu jogar sem conta não vê a tela de entrar de novo a cada visita (o Perfil tem "Entrar") */
const SEM_CONTA = 'gn_sem_conta';
const marcaSemConta = (sim: boolean) => { try { if (sim) localStorage.setItem(SEM_CONTA, '1'); else localStorage.removeItem(SEM_CONTA); } catch { /* sem armazenamento */ } };
const escolheuSemConta = () => { try { return localStorage.getItem(SEM_CONTA) === '1'; } catch { return false; } };
const fs = (n: number) => 'F$ ' + n.toLocaleString('pt-BR');

/* volta do pagamento: o Mercado Pago (ou o simulador) devolve o jogador para /?compra=<id> */
const compraNaVolta = new URLSearchParams(location.search).get('compra');
if (compraNaVolta) history.replaceState(null, '', location.pathname);

export function App() {
  const [fase, setFase] = useState<Fase>({ k: 'carregando' });
  const [lado, setLado] = useState<Lado | null>(null);
  const [loja, setLoja] = useState<{ motivo?: string } | null>(null);
  const [oferta, setOferta] = useState(false);
  const [aviso, setAviso] = useState<{ texto: string; n: number } | null>(null);
  const avisa = useCallback((texto: string) => setAviso({ texto, n: Date.now() }), []);
  const menu = useMenu();

  const comeca = (sessao: Sessao | null, msg?: string) => {
    ligaPonte(sessao);
    setLado(ladoAtual(sessao));
    setFase({ k: 'jogo', sessao });
    if (msg) avisa(msg);
  };

  /* ao abrir: conta guardada → confere e traz o progresso; sem conta → tela de entrar (ou direto ao jogo, se já escolheu) */
  useEffect(() => {
    const s = leSessao();
    if (!s) { if (escolheuSemConta() && !compraNaVolta) comeca(null); else setFase({ k: 'entrada' }); return; }
    (async () => {
      try {
        const { jogador } = await api.eu(s.token);
        s.jogador = jogador; guardaSessao(s);
        await levaLadoParaConta(s);
        await preparaProgresso(s);
        comeca(s);
      } catch (e) {
        if (e instanceof ErroApi && e.status === 401) {
          await saiDaConta(null);
          setFase({ k: 'entrada', aviso: 'Sua sessão venceu. Entre de novo.' });
        } else {
          /* servidor fora do ar: joga com o progresso deste navegador; o que mudar sobe quando o servidor voltar */
          comeca(s, 'Sem conexão com o servidor: jogando com o progresso guardado neste navegador.');
        }
      }
    })();
  }, []);

  const sessao = fase.k === 'jogo' ? fase.sessao : null;

  /* compras: entrega o F$ aprovado (ao abrir, a cada minuto e ao voltar para a aba) e confere a compra da volta do pagamento */
  useEffect(() => {
    if (!sessao) return;
    let vivo = true;
    const entrega = async () => {
      const r = await recebeEntregas();
      if (!vivo || (!r.fs && !r.herois.length && !r.lados.length)) return;
      atualizaMenu();
      const nomes = r.herois.map(k => motor()?.TOWERS[k]?.nome ?? k);
      const partes = [r.fs ? `${fs(r.fs)}${r.bonus ? ' (com o bônus da primeira compra)' : ''}` : '', nomes.length ? `${nomes.length === 1 ? 'o herói' : 'os heróis'} ${nomes.join(', ')}` : '',
        ...r.lados.map(l => `todos os personagens e heróis da ${l === 'pt' ? 'Esquerda' : 'Direita'}`)].filter(Boolean);
      avisa(`🎉 Chegou na sua conta: ${partes.join(' e ')}. Obrigado pela compra!`);
    };
    /* o motor do jogo carrega logo depois do primeiro desenho: espera ele existir */
    const espera = setTimeout(async () => {
      if (compraNaVolta) {
        let tentativas = 0;
        const confere = async () => {
          try {
            const c = await api.situacaoCompra(sessao.token, compraNaVolta);
            if (!vivo) return;
            if (c.status === 'aprovada') { await entrega(); if (c.entregue) avisa(c.fs ? `Pagamento aprovado: ${fs(c.fs)} já está na sua conta. Obrigado!` : 'Pagamento aprovado: o pacote já está na sua conta. Obrigado!'); }
            else if (c.status === 'pendente' || c.status === 'criada') {
              if (tentativas++ === 0) avisa('Pagamento em análise (PIX ou boleto): a compra entra sozinha assim que o Mercado Pago confirmar.');
              if (tentativas < 24) setTimeout(confere, 10000);
            } else avisa('O pagamento não foi aprovado e nada foi cobrado. Você pode tentar de novo na loja.');
          } catch { if (vivo) avisa('Não consegui conferir o pagamento agora. Se foi aprovado, a compra entra sozinha em instantes.'); }
        };
        await confere();
      } else await entrega();
    }, 1200);
    const vez = setInterval(entrega, 60000);
    const volta = () => { if (document.visibilityState === 'visible') void entrega(); };
    document.addEventListener('visibilitychange', volta);
    return () => { vivo = false; clearTimeout(espera); clearInterval(vez); document.removeEventListener('visibilitychange', volta); };
  }, [sessao, avisa]);

  async function aoEntrar(s: Sessao) {
    guardaSessao(s);
    marcaSemConta(false);
    setFase({ k: 'carregando' });
    await levaLadoParaConta(s);
    try {
      const r = await preparaProgresso(s);
      comeca(s, r === 'levadoParaConta' ? 'O progresso que já existia neste navegador foi guardado na sua conta.' : undefined);
    } catch {
      comeca(s, 'Não consegui trazer o progresso do servidor agora: jogando com o deste navegador.');
    }
  }

  function trocaLado(l: Lado) {
    setLado(l);
    motor()?.defineMenu({ lado: l });
    atualizaMenu();
    defineLado(sessao, l).catch(() => avisa('Não consegui salvar o lado na sua conta agora. Neste aparelho ele já vale.'));
  }
  const irParaEntrada = () => { marcaSemConta(false); location.reload(); };

  if (fase.k === 'carregando') return <main className="telaCheia carregando" aria-busy="true"><p className="marca">Guerra de Narrativas</p><p>Carregando…</p></main>;
  if (fase.k === 'entrada') return <TelaEntrada aviso={fase.aviso} aoEntrar={aoEntrar} aoJogarSemConta={() => { marcaSemConta(true); comeca(null); }} />;
  return (
    <>
      <Jogo />
      {menu.aberto && lado && (
        <Menu sessao={fase.sessao} lado={lado} trocaLado={trocaLado} comprarFs={motivo => setLoja({ motivo })} avisa={avisa}
          entrar={irParaEntrada} sair={() => { void saiDaConta(fase.sessao).then(() => location.reload()); }} />
      )}
      {!lado && <EscolhaLado aoEscolher={l => { trocaLado(l); if (!boasVindasVista()) { marcaBoasVindasVista(); setOferta(true); } }} />}
      {oferta && lado && <OfertaBoasVindas sessao={fase.sessao} lado={lado} aoFechar={() => setOferta(false)} entrar={irParaEntrada} avisa={avisa} />}
      {loja && <LojaFS sessao={fase.sessao} motivo={loja.motivo} aoFechar={() => setLoja(null)} aoCriarConta={irParaEntrada} />}
      {aviso && <Aviso key={aviso.n} texto={aviso.texto} />}
    </>
  );
}

function Aviso({ texto }: { texto: string }) {
  const [visivel, setVisivel] = useState(true);
  useEffect(() => { const t = setTimeout(() => setVisivel(false), 6000); return () => clearTimeout(t); }, []);
  return visivel ? (
    <div className="toast" role="status">
      <span>{texto}</span>
      <button type="button" onClick={() => setVisivel(false)} aria-label="Fechar aviso">×</button>
    </div>
  ) : null;
}
