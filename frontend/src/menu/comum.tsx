/* Peças pequenas usadas em todas as páginas do menu: desenho do motor num canvas, folha (diálogo), ícones e controles. */
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

/** canvas desenhado pelo motor; redesenha quando a chave muda */
export function Tela({ pinta, chave, largura, altura, rotulo, className }: {
  pinta: (cn: HTMLCanvasElement) => void; chave: string; largura?: number; altura?: number; rotulo?: string; className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => { if (ref.current) { try { pinta(ref.current); } catch { /* desenho é enfeite: se falhar, segue sem */ } } }, [chave]); // eslint-disable-line react-hooks/exhaustive-deps
  return <canvas ref={ref} width={largura} height={altura} className={className} role={rotulo ? 'img' : undefined} aria-label={rotulo} aria-hidden={rotulo ? undefined : true} />;
}

/** folha: sobe de baixo no celular e vira janela no meio da tela no computador. Usa <dialog> (Esc fecha, o foco fica dentro) */
export function Folha({ titulo, aberta, aoFechar, children, rodape }: { titulo: string; aberta: boolean; aoFechar: () => void; children: ReactNode; rodape?: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (aberta && !d.open) d.showModal();
    if (!aberta && d.open) d.close();
  }, [aberta]);
  return (
    <dialog ref={ref} className="folha" aria-labelledby={id} onClose={aoFechar} onCancel={e => { e.preventDefault(); aoFechar(); }}
      onClick={e => { if (e.target === ref.current) aoFechar(); }}>
      {aberta && <div className="folhaCaixa">
        <header className="folhaTopo">
          <h2 id={id}>{titulo}</h2>
          <button type="button" className="btIcone" onClick={aoFechar} aria-label="Fechar"><Icone n="x" /></button>
        </header>
        <div className="folhaCorpo">{children}</div>
        {rodape && <footer className="folhaRodape">{rodape}</footer>}
      </div>}
    </dialog>
  );
}

/** confirmação dentro do jogo. O confirm() do navegador é bloqueado em alguns lugares (no navegador embutido do app, por
    exemplo, ele volta "não" sem mostrar nada), então o botão parecia não funcionar. Uso:
    const [pergunta, janela] = useConfirma(); ... if (await pergunta('Sair?', 'Sair')) ...; e pôr {janela} na página */
export function useConfirma() {
  const [pedido, setPedido] = useState<{ texto: string; sim: string; resolve: (v: boolean) => void } | null>(null);
  const pergunta = (texto: string, sim = 'Confirmar') => new Promise<boolean>(resolve => setPedido({ texto, sim, resolve }));
  const responde = (v: boolean) => { if (pedido) { pedido.resolve(v); setPedido(null); } };
  const janela = (
    <Folha titulo="Confirme" aberta={!!pedido} aoFechar={() => responde(false)}
      rodape={<div className="linhaBts"><button type="button" className="bt sec" onClick={() => responde(false)}>Cancelar</button>
        <button type="button" className="bt perigo" onClick={() => responde(true)}>{pedido?.sim}</button></div>}>
      <p>{pedido?.texto}</p>
    </Folha>
  );
  return [pergunta, janela] as const;
}

/** controle segmentado (uma opção entre poucas) */
export function Segmentos<T extends string>({ opcoes, valor, muda, rotulo, className }: { opcoes: [T, ReactNode][]; valor: T; muda: (v: T) => void; rotulo: string; className?: string }) {
  return (
    <div className={'segm' + (className ? ' ' + className : '')} role="radiogroup" aria-label={rotulo}>
      {opcoes.map(([k, n]) => (
        <button key={k} type="button" role="radio" aria-checked={valor === k} className={valor === k ? 'on' : ''} onClick={() => muda(k)}>{n}</button>
      ))}
    </div>
  );
}

/** cabeçalho das páginas, com o botão de voltar nas subpáginas */
export function Cabecalho({ titulo, sub, voltar, acao }: { titulo: string; sub?: string; voltar?: () => void; acao?: ReactNode }) {
  return (
    <header className="cabPagina">
      {voltar && <button type="button" className="btIcone voltar" onClick={voltar} aria-label="Voltar"><Icone n="voltar" /></button>}
      <div className="pagCabTxt"><h1 tabIndex={-1}>{titulo}</h1>{sub && <p>{sub}</p>}</div>
      {acao}
    </header>
  );
}

const CAMINHOS: Record<string, string> = {
  jogar: 'M8 5.5v13l10.5-6.5z',
  loja: 'M5 8h14l-1.2 11.2a1 1 0 0 1-1 .8H7.2a1 1 0 0 1-1-.8zM9 8V6.5a3 3 0 0 1 6 0V8',
  conq: 'M12 14.5a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11zM8.5 13.5 7 21l5-2.5 5 2.5-1.5-7.5',
  mais: 'M5 12h.01M12 12h.01M19 12h.01',
  x: 'M6 6l12 12M18 6 6 18',
  voltar: 'M15 5l-7 7 7 7',
  seta: 'M9 5l7 7-7 7',
  amigos: 'M8.5 11a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4zM2.5 20a6 6 0 0 1 12 0M16 11.2a2.8 2.8 0 1 0 0-5.6M16.5 14.3A5.5 5.5 0 0 1 21.5 20',
  recolhe:'M11 6l-6 6 6 6M19 6l-6 6 6 6',
  expande: 'M13 6l6 6-6 6M5 6l6 6-6 6',
  troca: 'M7 7h11l-3-3M17 17H6l3 3',
  perfil: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20a7.5 7.5 0 0 1 15 0',
  adv: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20a6.5 6.5 0 0 1 13 0M16 4.3a3.5 3.5 0 0 1 0 6.4M18 14a6.5 6.5 0 0 1 3.5 6',
  est: 'M5 20V11M12 20V5M19 20v-6',
  como: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.5 9.2a2.6 2.6 0 0 1 5 .9c0 1.7-2.5 2.4-2.5 4M12 17.2h.01',
  opc: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z',
  dado: 'M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zM8.5 8.5h.01M15.5 15.5h.01M12 12h.01',
  mapa: 'M9 4 3 6.5v13.5l6-2.5 6 2.5 6-2.5V4l-6 2.5zM9 4v13.5M15 6.5V20',
  modo: 'M4 7h10M18 7h2M4 17h4M12 17h8M16 5v4M10 15v4',
  moeda: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM14.8 8.6c-.5-.9-1.6-1.4-2.8-1.4-1.6 0-2.8.8-2.8 2.1 0 3 5.8 1.7 5.8 4.8 0 1.3-1.3 2.2-3 2.2-1.3 0-2.5-.6-3-1.6M12 5.5v1.7M12 16.8v1.7',
  nuvem: 'M7 18a4 4 0 0 1-.6-8 5.5 5.5 0 0 1 10.6 1.5A3.3 3.3 0 0 1 17 18z',
  alerta: 'M12 4 2.5 20h19zM12 10v4.5M12 17.5h.01',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  estrela: 'M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 17l-5.2 2.7 1-5.9-4.3-4.1 5.9-.8z',
  cadeado: 'M6.5 11h11a1 1 0 0 1 1 1v7.5a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1V12a1 1 0 0 1 1-1zM8.5 11V8a3.5 3.5 0 0 1 7 0v3',
  calendario: 'M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1zM4 10h16M8.5 3.5v4M15.5 3.5v4',
  sair: 'M14 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M9.5 16.5 5 12l4.5-4.5M5 12h10',
};

/** ícones de traço (desenhados aqui para não depender de biblioteca) */
export function Icone({ n, tam = 22 }: { n: keyof typeof CAMINHOS | string; tam?: number }) {
  const cheio = n === 'jogar';
  return (
    <svg className="icn" viewBox="0 0 24 24" width={tam} height={tam} aria-hidden="true" focusable="false"
      fill={cheio ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={n === 'mais' ? 3.2 : 1.9} strokeLinecap="round" strokeLinejoin="round">
      <path d={CAMINHOS[n] ?? ''} />
    </svg>
  );
}

/** interruptor acessível (é um checkbox por baixo) */
export function Interruptor({ rotulo, dica, ligado, muda }: { rotulo: string; dica?: string; ligado: boolean; muda: (v: boolean) => void }) {
  return (
    <label className="interruptor">
      <span className="interruptorTxt"><b>{rotulo}</b>{dica && <small>{dica}</small>}</span>
      <input type="checkbox" role="switch" checked={ligado} onChange={e => muda(e.target.checked)} />
      <span className="interruptorTrilho" aria-hidden="true" />
    </label>
  );
}
