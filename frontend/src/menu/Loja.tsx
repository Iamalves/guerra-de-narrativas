/* Loja: personagens e heróis (com F$ do jogo) e pacotes (com dinheiro). Os presidentes ficam na aba Heróis, mais caros;
   os heróis exclusivos aparecem lá também, mas só vêm nos pacotes pagos. */
import { useState } from 'react';
import { usePacotes } from '../compras';
import { atualizaMenu, fs, motor, vaiPara, type AbaLoja } from '../motor';
import { Pacotes } from './Pacotes';
import { Cabecalho, Icone, Segmentos, Tela } from './comum';
import type { PropsMenu } from './Menu';

type Filtro = 'todos' | 'comprar' | 'tenho';

export function Loja({ lado: ladoPerfil, aba, comprarFs, avisa, sessao, entrar }: PropsMenu & { aba: AbaLoja }) {
  const herois = aba === 'herois';
  /* no computador (tela larga) os desenhos ficam maiores, para os cartões ocuparem melhor a tela */
  const larga = window.matchMedia('(min-width: 900px)').matches, enorme = window.matchMedia('(min-width: 1500px) and (min-height: 900px)').matches;
  const pxPers = enorme ? 150 : larga ? 124 : 92, pxHeroi = enorme ? 180 : larga ? 150 : 104;
  const pacotes = usePacotes(sessao);
  const m = motor()!;
  /* a loja mostra só o lado do perfil (trocar de lado é em Mais › Perfil) */
  const lado = ladoPerfil;
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const P = m.PROG, C = m.SIDES[lado];
  const ini = m.INICIAIS[lado].map(x => x[0]);
  const tem = (k: string) => ini.includes(k) || !!P.donos[k];

  /* personagens comuns: os gratuitos primeiro, depois do mais barato ao mais caro */
  const comuns = C.order.filter(k => !m.TOWERS[k].only)
    .sort((a, b) => Number(ini.includes(b)) - Number(ini.includes(a)) || m.precoLoja(a) - m.precoLoja(b))
    .filter(k => filtro === 'todos' || (filtro === 'tenho' ? tem(k) : !tem(k) && P.fundo >= m.precoLoja(k)));
  /* heróis: o gratuito do lado primeiro, depois os presidentes por preço */
  const listaHerois = C.order.filter(k => m.TOWERS[k].only)
    .sort((a, b) => Number(ini.includes(b)) - Number(ini.includes(a)) || m.precoLoja(a) - m.precoLoja(b));
  const totalComuns = C.order.filter(k => !m.TOWERS[k].only), donos = totalComuns.filter(tem).length;
  const pres = listaHerois.filter(k => m.TOWERS[k].presidente), presDonos = pres.filter(k => P.donos[k]).length;

  const compra = (k: string) => {
    if (m.compra(k)) { avisa(`${m.TOWERS[k].nome} liberado! Já aparece nas suas partidas.`); atualizaMenu(); }
  };

  const acao = (k: string) => {
    const r = m.rodadaLibera(lado, k), preco = m.precoLoja(k), nome = m.TOWERS[k].nome;
    if (r) return <span className="etiqueta gratis">{r > 1 ? `Grátis · rodada ${r}` : 'Grátis'}</span>;
    if (P.donos[k]) return <span className="etiqueta ok"><Icone n="check" tam={14} />Liberado</span>;
    /* herói exclusivo: não se compra com F$, só no pacote pago */
    if (m.TOWERS[k].exclusivo) return (
      <button type="button" className="bt premium mini" onClick={() => vaiPara('loja', { lojaAba: 'pacotes' })} aria-label={`${nome}: só nos pacotes. Ver pacotes`}><span>Ver pacote</span></button>
    );
    const falta = P.fundo < preco;
    /* sem F$ suficiente: o botão leva à loja de F$, já dizendo quanto falta */
    return (
      <button type="button" className={'bt preco' + (falta ? ' falta' : '')}
        onClick={() => { if (!falta) compra(k); else comprarFs(`Faltam ${fs(preco - P.fundo)} para liberar ${nome}.`); }}
        aria-label={falta ? `${nome}: custa ${fs(preco)}, faltam ${fs(preco - P.fundo)}. Comprar F$` : `Liberar ${nome} por ${fs(preco)}`}>
        {falta && <Icone n="cadeado" tam={15} />}{fs(preco)}
      </button>
    );
  };

  return (
    <>
      {/* na aba Pacotes tudo cabe numa tela: sem a frase do topo e sem o cartão do saldo (o saldo fica no topo da página) */}
      <Cabecalho titulo="Loja" sub={aba === "pacotes" ? undefined : "Libere personagens com o F$ que você ganha vencendo mapas."} />

      {aba !== "pacotes" && (
        <section className="cartao saldoCartao" aria-label="Seu saldo">
          <div><small>Seu saldo</small><strong>{fs(P.fundo)}</strong></div>
          <button type="button" className="bt premium" onClick={() => comprarFs()}><Icone n="moeda" tam={18} /><span>Comprar F$</span></button>
        </section>
      )}

      <div className="lojaControles">
        <Segmentos rotulo="O que ver" valor={aba} muda={v => vaiPara('loja', { lojaAba: v })} className="segLargo segLoja"
          opcoes={[['pers', 'Personagens'], ['herois', <><Icone n="estrela" tam={16} />Heróis</>], ['pacotes', <span className="segPacotes">Pacotes</span>]]} />
      </div>

      {aba === 'pacotes' ? (
        <Pacotes dados={pacotes.dados} erro={pacotes.erro} lado={ladoPerfil} sessao={sessao} entrar={entrar} comprarFs={comprarFs} avisa={avisa} />
      ) : !herois ? (
        <>
          <div className="filtros" role="group" aria-label="Filtrar personagens">
            {([['todos', 'Todos'], ['comprar', 'Posso comprar'], ['tenho', 'Já tenho']] as [Filtro, string][]).map(([k, n]) => (
              <button key={k} type="button" className={'filtro' + (filtro === k ? ' on' : '')} aria-pressed={filtro === k} onClick={() => setFiltro(k)}>{n}</button>
            ))}
            <span className="contagem">{donos} de {totalComuns.length} liberados</span>
          </div>
          {comuns.length ? (
            <div className="gradeLoja">
              {comuns.map(k => {
                const T = m.TOWERS[k];
                return (
                  <article key={k} className={'itemLoja' + (tem(k) ? ' meu' : '')}>
                    <button type="button" className="itemLojaFig" onClick={() => m.abreFicha(k)} aria-label={`Ver evoluções de ${T.nome}`}>
                      <Tela chave={k + pxPers} pinta={cn => m.pinta.evo(cn, k, 0, 0, pxPers)} />
                    </button>
                    <h2>{T.nome}</h2>
                    <p className="curta">{T.curta ?? T.desc}</p>
                    <div className="itemLojaRodape">
                      <button type="button" className="link" onClick={() => m.abreFicha(k)}>Evoluções</button>
                      {acao(k)}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : <p className="vazioTxt">{filtro === 'comprar' ? 'Nenhum personagem cabe no seu saldo agora. Vença mapas para ganhar F$.' : 'Nada aqui ainda.'}</p>}
        </>
      ) : (
        <>
          <ul className="regras">
            <li>Só cabe <b>1 herói em campo</b>. Para trocar, venda o que está no mapa.</li>
            <li>O herói sobe até o nível 10. Ao chegar no 10 (o máximo), libera o <b>poder próprio</b> (o botão com ★).</li>
            <li>Presidentes liberados deste lado: <b>{presDonos} de {pres.length}</b>.</li>
          </ul>
          <div className="gradeHerois">
            {listaHerois.map(k => {
              const T = m.TOWERS[k], poder = m.HEROI_PODER[k];
              return (
                <article key={k} className={'itemLoja itemHeroi' + (tem(k) ? ' meu' : '')}>
                  <span className={'heroiTipo' + (T.exclusivo ? ' exclusivo' : '')}>{T.exclusivo ? 'Exclusivo · só em pacote' : T.presidente ? 'Presidente' : 'Herói do lado'}</span>
                  <button type="button" className="itemLojaFig" onClick={() => m.abreFicha(k)} aria-label={`Ver evoluções de ${T.nome}`}>
                    <Tela chave={k + pxHeroi} pinta={cn => m.pinta.evo(cn, k, 0, 0, pxHeroi)} />
                  </button>
                  <h2>{T.nome}</h2>
                  {poder && <p className="poderLinha"><Icone n="estrela" tam={15} /><span><b>{m.nomePoderHeroi(k)}</b> {poder[1]}</span></p>}
                  <p className="curta">{T.curta ?? T.desc}</p>
                  <div className="itemLojaRodape">
                    <button type="button" className="link" onClick={() => m.abreFicha(k)}>Evoluções</button>
                    {acao(k)}
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
