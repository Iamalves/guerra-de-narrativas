/* Primeira entrada: o jogador escolhe o lado que defende. Fica no perfil e dá para trocar depois em Mais › Perfil. */
import { useState } from 'react';
import type { Lado } from '../api';

const LADOS: [Lado, string, string][] = [
  ['pt', 'Esquerda', 'Proteja o Palácio do Planalto da marcha verde e amarela.'],
  ['br', 'Direita', 'Proteja o ato na Paulista da marcha vermelha.'],
];

export function EscolhaLado({ aoEscolher }: { aoEscolher: (l: Lado) => void }) {
  const [salvando, setSalvando] = useState<Lado | null>(null);
  return (
    <div className="telaCheia escolha" role="dialog" aria-modal="true" aria-labelledby="escTit">
      <div className="escolhaCaixa">
        <p className="marca">Guerra de Narrativas</p>
        <h1 id="escTit">De que lado você está?</h1>
        <p className="escolhaSub">Monte a sua militância e convença a marcha antes que ela chegue ao fim da avenida.</p>
        <div className="escolhaLados">
          {LADOS.map(([l, n, d]) => (
            <button key={l} type="button" className={'cartaoLado grande ' + l} disabled={!!salvando} onClick={() => { setSalvando(l); aoEscolher(l); }}>
              <b>{n}</b>
              <small>{d}</small>
              <span className="cartaoLadoCta">{salvando === l ? 'Entrando…' : 'Defender a ' + n}</span>
            </button>
          ))}
        </div>
        <p className="legenda">Dá para trocar quando quiser em Mais › Perfil.</p>
      </div>
    </div>
  );
}
