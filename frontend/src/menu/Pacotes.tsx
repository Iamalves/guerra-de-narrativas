/* Pacotes pagos com dinheiro: Boas-vindas (F$ + 1 herói exclusivo) e os pacotes de heróis exclusivos de cada lado.
   Os heróis exclusivos não se compram com F$. */
import { useState } from 'react';
import type { Lado, PacoteHerois, Sessao } from '../api';
import { reais, vaiPagar, type DadosLoja } from '../compras';
import { fs, motor, nomeLadoCurto } from '../motor';
import { Icone, Tela } from './comum';

/** botão de compra com dinheiro: sempre o mesmo visual "premium", em todo o jogo */
export function BotaoPagar({ sessao, pacote, centavos, entrar, onErro, rotulo, grande, soPreco }: {
  sessao: Sessao | null; pacote: string; centavos: number; entrar: () => void; onErro: (m: string) => void; rotulo: string; grande?: boolean;
  /** botão compacto: só o preço (o nome do pacote fica no rótulo para leitores de tela) */
  soPreco?: boolean;
}) {
  const [indo, setIndo] = useState(false);
  const clica = async () => {
    if (!sessao) { entrar(); return; }
    setIndo(true);
    const e = await vaiPagar(sessao, pacote);
    if (e) { onErro(e); setIndo(false); }
  };
  return (
    <button type="button" className={'bt premium' + (grande ? ' grande' : '') + (soPreco ? ' pkPreco' : '')} disabled={indo} onClick={clica} aria-label={`${rotulo} por ${reais(centavos)}`}>
      {indo ? (soPreco ? '…' : 'Abrindo o pagamento…') : soPreco ? <b>{reais(centavos)}</b> : sessao ? <><span>{rotulo}</span><b>{reais(centavos)}</b></> : <span>Entrar para comprar · {reais(centavos)}</span>}
    </button>
  );
}

/** os heróis de um pacote, desenhados, com o nome e o poder de cada um */
export function HeroisDoPacote({ ks, px = 84 }: { ks: string[]; px?: number }) {
  const m = motor()!;
  return (
    <ul className="heroisPacote">
      {ks.filter(k => m.TOWERS[k]).map(k => (
        <li key={k}>
          <button type="button" className="heroiPacoteFig" onClick={() => m.abreFicha(k)} aria-label={`Ver evoluções de ${m.TOWERS[k].nome}`}>
            <Tela chave={k} pinta={cn => m.pinta.evo(cn, k, 0, 0, px)} />
          </button>
          <b>{m.TOWERS[k].nome}</b>
          <small><Icone n="estrela" tam={12} /> {m.nomePoderHeroi(k)}</small>
        </li>
      ))}
    </ul>
  );
}

/** cartão da oferta de boas-vindas (aparece na loja e logo depois de escolher o lado) */
export function CartaoBoasVindas({ p, sessao, entrar, onErro }: { p: PacoteHerois; sessao: Sessao | null; entrar: () => void; onErro: (m: string) => void }) {
  return (
    <section className="cartao ofertaBoas" aria-labelledby={'of' + p.id}>
      <span className="etiqueta ouro">Só uma vez por conta</span>
      <h2 id={'of' + p.id}>{p.nome}</h2>
      <p className="ofertaLinha"><strong>{fs(p.fs)}</strong><span>+</span><strong>1 herói exclusivo</strong></p>
      <HeroisDoPacote ks={p.herois} px={110} />
      <p className="legenda">O herói não sai na loja com F$: só vem em pacote. O F$ libera outros personagens na hora.</p>
      <BotaoPagar sessao={sessao} pacote={p.id} centavos={p.centavos} entrar={entrar} onErro={onErro} rotulo="Quero o pacote" grande />
    </section>
  );
}

/** pacotes da loja numa tela só, sem rolar: linhas compactas para os pacotes de heróis e quadradinhos para os de F$ */
export function Pacotes({ dados, erro, lado, sessao, entrar, avisa }: {
  dados: DadosLoja | null; erro: string | null; lado: Lado; sessao: Sessao | null; entrar: () => void; comprarFs: (m?: string) => void; avisa: (t: string) => void;
}) {
  const m = motor()!;
  if (erro) return <p className="erroTxt" role="alert">{erro}</p>;
  if (!dados) return <p className="legenda">Carregando pacotes…</p>;
  if (!dados.ligado) return <p className="legenda">As compras ainda não estão disponíveis.</p>;
  const doLado = dados.herois.filter(p => p.lado === lado);
  const boas = doLado.find(p => p.boasVindas && !p.comprado);
  const completo = doLado.find(p => p.todos);
  const lendas = doLado.filter(p => !p.boasVindas && !p.todos);
  /* quanto o pacote completo ainda libera (personagens comuns e heróis, incluindo exclusivos) */
  const ini = m.INICIAIS[lado].map(x => x[0]);
  const faltam = m.SIDES[lado].order.filter(k => !ini.includes(k) && !m.PROG.donos[k]);
  const faltamHerois = faltam.filter(k => m.TOWERS[k].only).length, faltamPers = faltam.length - faltamHerois;
  const exclusivos = m.EXCLUSIVOS[lado] ?? [];
  const bonus = dados.bonusPrimeira;
  const nomes = (ks: string[]) => ks.map(k => m.TOWERS[k]?.nome ?? k).join(", ");
  const linha = (p: PacoteHerois, figs: string[], conteudo: string, tem: boolean, extra?: string) => (
    <li key={p.id} className={"pkLinha" + (p.boasVindas ? " boas" : p.todos ? " completo" : "")}>
      <span className="pkFigs" aria-hidden="true">{figs.slice(0, 3).map(k => <Tela key={k} chave={k} pinta={cn => m.pinta.retrato(cn, k)} />)}</span>
      <span className="pkTxt">
        <b>{p.nome}{extra && <span className="etiqueta ouro">{extra}</span>}</b>
        <small>{conteudo}</small>
      </span>
      {tem ? <span className="etiqueta ok"><Icone n="check" tam={14} />Na conta</span>
        : <BotaoPagar sessao={sessao} pacote={p.id} centavos={p.centavos} entrar={entrar} onErro={avisa} rotulo={p.nome} soPreco />}
    </li>
  );
  return (
    <div className="pacotesTela">
      {dados.simulado && <p className="etiqueta atencao bloco">Modo de teste: o pagamento é simulado e nada é cobrado.</p>}
      <section aria-labelledby="pkHer">
        <h2 id="pkHer" className="rotulo">Heróis exclusivos <span>só com dinheiro</span></h2>
        <ul className="pkLista">
          {boas && linha(boas, boas.herois, `${fs(boas.fs)} + ${nomes(boas.herois)}`, false, "1 vez")}
          {completo && linha(completo, exclusivos,
            faltam.length ? `Tudo da ${nomeLadoCurto(lado)}: libera ${faltamPers} personagens e ${faltamHerois} heróis` : `Você já tem tudo da ${nomeLadoCurto(lado)}`,
            completo.comprado || !faltam.length)}
          {lendas.map(p => linha(p, p.herois, nomes(p.herois), p.comprado || p.herois.every(k => m.PROG.donos[k])))}
        </ul>
      </section>
      <section aria-labelledby="pkFs">
        <h2 id="pkFs" className="rotulo">F$ <span>{bonus > 0 && sessao ? `primeira compra: +${Math.round(bonus * 100)}%` : "libera personagens na hora"}</span></h2>
        <ul className="pkFs">
          {dados.pacotes.map(p => (
            <li key={p.id} className={p.destaque ? "destaque" : ""}>
              {p.destaque && <span className="pkFsTag">{p.destaque}</span>}
              <strong>{fs(bonus > 0 && sessao ? Math.round(p.fs * (1 + bonus)) : p.fs)}</strong>
              <BotaoPagar sessao={sessao} pacote={p.id} centavos={p.centavos} entrar={entrar} onErro={avisa} rotulo={p.nome} soPreco />
            </li>
          ))}
        </ul>
      </section>
      <p className="rodapeAviso">Pagamento pelo Mercado Pago (PIX, cartão ou boleto). Entra na conta quando o pagamento é aprovado.</p>
    </div>
  );
}
