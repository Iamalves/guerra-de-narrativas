/* Oferta de boas-vindas: aparece uma vez, logo depois de escolher o lado. A mesma oferta fica na Loja › Pacotes.
   "Agora não" fica bem à vista: a oferta não volta sozinha. */
import type { Lado, Sessao } from '../api';
import { usePacotes } from '../compras';
import { Folha } from '../menu/comum';
import { CartaoBoasVindas } from '../menu/Pacotes';

export function OfertaBoasVindas({ sessao, lado, aoFechar, entrar, avisa }: { sessao: Sessao | null; lado: Lado; aoFechar: () => void; entrar: () => void; avisa: (t: string) => void }) {
  const { dados } = usePacotes(sessao);
  const p = dados?.ligado ? dados.herois.find(x => x.boasVindas && x.lado === lado && !x.comprado) : undefined;
  /* sem oferta para mostrar (compras desligadas ou já comprada): não abre nada */
  if (dados && !p) { queueMicrotask(aoFechar); return null; }
  return (
    <Folha titulo="Boas-vindas à Guerra de Narrativas" aberta={!!p} aoFechar={aoFechar}
      rodape={<button type="button" className="bt fantasma largo" onClick={aoFechar}>Agora não. A oferta continua na Loja › Pacotes.</button>}>
      {p && <CartaoBoasVindas p={p} sessao={sessao} entrar={entrar} onErro={avisa} />}
    </Folha>
  );
}
