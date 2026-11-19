import { useState } from 'react';
import type { Sessao } from '../api';
import { reais, usePacotes, vaiPagar } from '../compras';
import { Folha } from '../menu/comum';

const fs = (n: number) => 'F$ ' + n.toLocaleString('pt-BR');

/** loja de F$ com dinheiro de verdade: escolhe o pacote e vai para o pagamento do Mercado Pago.
    motivo: por que abriu (ex.: "Faltam F$ 300 para liberar o Fulano"), mostrado no topo */
export function LojaFS({ sessao, motivo, aoFechar, aoCriarConta }: { sessao: Sessao | null; motivo?: string; aoFechar: () => void; aoCriarConta: () => void }) {
  const { dados, erro: erroLoja } = usePacotes(sessao);
  const [erro, setErro] = useState<string | null>(null);
  const [indo, setIndo] = useState<string | null>(null);

  async function compra(id: string) {
    if (!sessao) return;
    setErro(null); setIndo(id);
    const e = await vaiPagar(sessao, id);
    if (e) { setErro(e); setIndo(null); }
  }
  /* quanto F$ cada real rende, para mostrar a vantagem dos pacotes maiores (conta de verdade, a partir dos preços) */
  const base = dados?.pacotes[0] ? dados.pacotes[0].fs / dados.pacotes[0].centavos : 0;
  const bonus = dados?.bonusPrimeira ?? 0;

  return (
    <Folha titulo="Comprar F$" aberta aoFechar={aoFechar}
      rodape={<p className="legenda">Pagamento pelo Mercado Pago: PIX, cartão ou boleto. O F$ entra na sua conta assim que o pagamento é aprovado (no PIX, em instantes; no boleto, em até 3 dias úteis).</p>}>
      {motivo && <p className="motivoCompra" role="status">{motivo}</p>}
      {bonus > 0 && sessao && (
        <p className="bonusPrimeira"><b>Primeira compra: +{Math.round(bonus * 100)}% de F$</b><span>Vale para qualquer pacote abaixo, uma vez por conta.</span></p>
      )}
      {dados?.simulado && <p className="etiqueta atencao bloco">Modo de teste: o pagamento é simulado e nada é cobrado.</p>}
      {!sessao ? (
        <div className="cartao">
          <p>Para comprar F$ é preciso ter uma conta: o F$ comprado fica guardado nela, em qualquer aparelho.</p>
          <button type="button" className="bt premium" onClick={aoCriarConta}><span>Entrar ou criar conta</span></button>
        </div>
      ) : !dados ? (
        !erroLoja && <p className="legenda">Carregando pacotes…</p>
      ) : !dados.ligado ? (
        <p className="legenda">As compras ainda não estão disponíveis.</p>
      ) : (
        <ul className="pacotes">
          {dados.pacotes.map(p => {
            const mais = base ? Math.round((p.fs / p.centavos / base - 1) * 100) : 0;
            const recebe = bonus > 0 ? Math.round(p.fs * (1 + bonus)) : p.fs;
            return (
              <li key={p.id} className={'pacote' + (p.destaque ? ' destaque' : '')}>
                <div className="pacoteTxt">
                  {p.destaque && <span className="etiqueta ouro">{p.destaque}</span>}
                  <b>{p.nome}</b>
                  <strong>{fs(recebe)}</strong>
                  {bonus > 0 && <small className="riscado">sem o bônus: {fs(p.fs)}</small>}
                  {mais > 0 && <small>{mais}% a mais de F$ por real que o menor</small>}
                </div>
                <button type="button" className="bt premium" disabled={!!indo} onClick={() => compra(p.id)}
                  aria-label={`Comprar ${p.nome}, ${fs(recebe)}, por ${reais(p.centavos)}`}>
                  {indo === p.id ? 'Abrindo…' : <b>{reais(p.centavos)}</b>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {(erro || erroLoja) && <p className="erroTxt" role="alert">{erro || erroLoja}</p>}
    </Folha>
  );
}
