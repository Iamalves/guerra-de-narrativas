/* Compras com dinheiro (Mercado Pago): ir para o pagamento e os dados dos pacotes à venda. */
import { useCallback, useEffect, useState } from 'react';
import { api, ErroApi, type Pacote, type PacoteHerois, type Sessao } from './api';

export const reais = (c: number) => (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/** cria a compra e vai para a página de pagamento; devolve a mensagem de erro, se der errado */
export async function vaiPagar(sessao: Sessao, pacote: string): Promise<string | null> {
  try {
    const { url } = await api.compra(sessao.token, pacote);
    location.assign(url); // página do Mercado Pago (ou o simulador, em desenvolvimento)
    return null;
  } catch (e) {
    return e instanceof ErroApi ? e.message : 'Não consegui iniciar o pagamento. Tente de novo.';
  }
}

export interface DadosLoja { ligado: boolean; simulado: boolean; bonusPrimeira: number; pacotes: Pacote[]; herois: PacoteHerois[] }

/** pacotes à venda (com a conta: bônus da primeira compra e pacotes de heróis já comprados) */
export function usePacotes(sessao: Sessao | null) {
  const [dados, setDados] = useState<DadosLoja | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const carrega = useCallback(() => {
    api.pacotes(sessao?.token).then(d => { setDados(d); setErro(null); })
      .catch(e => setErro(e instanceof ErroApi ? e.message : 'Não consegui abrir a loja.'));
  }, [sessao]);
  useEffect(() => { carrega(); }, [carrega]);
  return { dados, erro, carrega };
}

/* a oferta de boas-vindas aparece uma vez sozinha, logo depois de escolher o lado (depois fica só na loja) */
const K_BOAS = 'gn_boasvindas_visto';
export const boasVindasVista = () => { try { return localStorage.getItem(K_BOAS) === '1'; } catch { return true; } };
export const marcaBoasVindasVista = () => { try { localStorage.setItem(K_BOAS, '1'); } catch { /* sem armazenamento */ } };
