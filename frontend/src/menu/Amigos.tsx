/* Amigos: convidar pelo apelido, aceitar ou recusar convites e o ranking entre você e seus amigos.
   A amizade só vale depois que o convidado aceita; aí os dois aparecem na lista um do outro. */
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api, ErroApi, type Amigo, type Pessoa } from '../api';
import { atualizaMenu, motor } from '../motor';
import { Cabecalho, Icone, Segmentos, useConfirma } from './comum';
import type { PropsMenu } from './Menu';

type Criterio = 'vitorias' | 'faixas' | 'medalhas' | 'recorde';
const CRITERIOS: [Criterio, string, string, string][] = [
  ['vitorias', 'Vitórias', 'vitória', 'vitórias'],
  ['faixas', 'Faixas', 'faixa', 'faixas'],
  ['medalhas', 'Medalhas', 'medalha', 'medalhas'],
  ['recorde', 'Recorde', 'rodada', 'rodadas'],
];
const br = (n: number) => n.toLocaleString('pt-BR');
const Avatar = ({ p }: { p: Pessoa }) => <span className={'avatar ' + (p.lado ?? '')} aria-hidden="true">{p.nome.slice(0, 1).toUpperCase()}</span>;

export function Amigos({ sessao, entrar, avisa }: PropsMenu) {
  const [dados, setDados] = useState<{ amigos: Amigo[]; recebidos: Pessoa[]; enviados: Pessoa[] } | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [crit, setCrit] = useState<Criterio>('vitorias');
  const [pergunta, janela] = useConfirma();

  const carrega = useCallback(async () => {
    if (!sessao) return;
    try { setDados(await api.amigos(sessao.token)); setErro(null); atualizaMenu(); }
    catch (e) { setErro(e instanceof ErroApi ? e.message : 'Não consegui carregar seus amigos.'); }
  }, [sessao]);
  useEffect(() => { void carrega(); }, [carrega]);

  if (!sessao) return (
    <>
      <Cabecalho titulo="Amigos" sub="Convide amigos pelo apelido e veja quem está na frente." />
      <div className="cartao semDados">
        <Icone n="amigos" tam={40} />
        <b>Amigos e ranking precisam de uma conta.</b>
        <p>Com conta, seus amigos encontram você pelo apelido e o ranking compara o progresso de todos.</p>
        <button type="button" className="bt pri" onClick={entrar}>Entrar ou criar conta</button>
      </div>
    </>
  );

  async function convida(ev: FormEvent) {
    ev.preventDefault();
    if (!sessao || !nome.trim()) return;
    setEnviando(true); setMsg(null);
    try {
      const r = await api.convida(sessao.token, nome.trim());
      setMsg({ ok: true, t: r.aceito ? `${r.amigo!.nome} já tinha convidado você: agora vocês são amigos.` : `Convite enviado para ${r.convite!.nome}. Ele entra na lista quando aceitar.` });
      setNome('');
      await carrega();
    } catch (e) {
      setMsg({ ok: false, t: e instanceof ErroApi ? e.message : 'Não consegui convidar agora. Tente de novo.' });
    } finally { setEnviando(false); }
  }
  /* aceitar, recusar, cancelar e desfazer amizade */
  async function faz(id: string, f: () => Promise<unknown>, ok: string) {
    setOcupado(id);
    try { await f(); avisa(ok); await carrega(); }
    catch (e) { avisa(e instanceof ErroApi ? e.message : 'Não deu certo agora. Tente de novo.'); }
    finally { setOcupado(null); }
  }
  const t = sessao.token;
  const aceita = (p: Pessoa) => faz(p.id, () => api.aceita(t, p.id), `Você e ${p.nome} agora são amigos.`);
  const recusa = (p: Pessoa) => faz(p.id, () => api.tiraConvite(t, p.id), `Convite de ${p.nome} recusado.`);
  const cancela = (p: Pessoa) => faz(p.id, () => api.tiraConvite(t, p.id), `Convite para ${p.nome} cancelado.`);
  const desfaz = async (p: Pessoa) => {
    if (await pergunta(`Desfazer a amizade com ${p.nome}? Vocês saem da lista um do outro.`, 'Desfazer amizade'))
      await faz(p.id, () => api.tiraAmigo(t, p.id), `${p.nome} saiu da sua lista.`);
  };

  /* a sua linha usa o progresso deste aparelho (o do servidor pode estar alguns segundos atrás) */
  const P = motor()?.PROG;
  const linhas = (dados?.amigos ?? []).map(a => a.eu && P ? {
    ...a, vitorias: P.est.vitorias, partidas: P.est.partidas, faixas: Object.keys(P.faixas).length,
    ouro: Object.values(P.faixas).filter(v => v >= 3).length, medalhas: Object.keys(P.medalhas).length, recorde: P.recorde || 0,
  } : a);
  const [, rotulo, um, varios] = CRITERIOS.find(c => c[0] === crit)!;
  const ordem = [...linhas].sort((a, b) => b[crit] - a[crit] || b.vitorias - a.vitorias || a.nome.localeCompare(b.nome));

  return (
    <>
      {janela}
      <Cabecalho titulo="Amigos" sub="Convide pelo apelido. Quando a pessoa aceitar, vocês entram na lista um do outro." />

      <form className="cartao addAmigo" onSubmit={convida}>
        <label className="rotuloCampo" htmlFor="apelidoAmigo">Apelido do amigo</label>
        <div className="addAmigoLinha">
          <input id="apelidoAmigo" className="campoTexto" value={nome} onChange={e => { setNome(e.target.value); setMsg(null); }} maxLength={20}
            autoCapitalize="off" autoCorrect="off" spellCheck={false} aria-describedby="amigoDica" placeholder="Ex.: Militante22" />
          <button className="bt pri" disabled={enviando || nome.trim().length < 3}>{enviando ? 'Enviando…' : 'Convidar'}</button>
        </div>
        {msg && <p className={msg.ok ? 'okTxt' : 'erroTxt'} role={msg.ok ? 'status' : 'alert'}>{msg.t}</p>}
        <p id="amigoDica" className="legenda">Seu apelido é <b>{sessao.jogador.nome}</b>: passe para os amigos convidarem você.</p>
      </form>

      {erro && <p className="erroTxt" role="alert">{erro}</p>}

      {dados && dados.recebidos.length > 0 && (
        <section className="blocoAmigos" aria-labelledby="recTit">
          <h2 id="recTit" className="rotulo">Convites recebidos <span>{dados.recebidos.length}</span></h2>
          <ul className="listaPessoas">
            {dados.recebidos.map(p => (
              <li key={p.id}>
                <Avatar p={p} />
                <span className="pessoaTxt"><b>{p.nome}</b><small>quer ser seu amigo</small></span>
                <span className="pessoaAcoes">
                  <button type="button" className="bt sec" disabled={ocupado === p.id} onClick={() => recusa(p)}>Recusar</button>
                  <button type="button" className="bt pri" disabled={ocupado === p.id} onClick={() => aceita(p)}>Aceitar</button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {dados && dados.enviados.length > 0 && (
        <section className="blocoAmigos" aria-labelledby="envTit">
          <h2 id="envTit" className="rotulo">Esperando resposta <span>{dados.enviados.length}</span></h2>
          <ul className="listaPessoas">
            {dados.enviados.map(p => (
              <li key={p.id}>
                <Avatar p={p} />
                <span className="pessoaTxt"><b>{p.nome}</b><small>convite enviado</small></span>
                <span className="pessoaAcoes">
                  <button type="button" className="bt sec" disabled={ocupado === p.id} onClick={() => cancela(p)}>Cancelar</button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="blocoAmigos" aria-labelledby="rankTit">
        <h2 id="rankTit" className="rotulo">Ranking</h2>
        <Segmentos rotulo="Ordenar o ranking por" valor={crit} muda={setCrit} className="segLargo" opcoes={CRITERIOS.map(([k, n]) => [k, n])} />
        {!dados ? (!erro && <p className="legenda">Carregando…</p>) : (
          <ol className="rankAmigos" aria-label={`Ranking por ${rotulo.toLowerCase()}`}>
            {ordem.map((a, i) => (
              <li key={a.id} className={a.eu ? 'eu' : ''}>
                <span className={'posRank p' + (i + 1)}>{i + 1}º</span>
                <Avatar p={a} />
                <span className="pessoaTxt">
                  <b><span className="nomeP">{a.nome}</span>{a.eu && <span className="etiqueta">você</span>}</b>
                  <small>{br(a.vitorias)} {a.vitorias === 1 ? 'vitória' : 'vitórias'} · {a.faixas} faixas · {a.medalhas} medalhas{a.recorde ? ` · recorde ${a.recorde}` : ''}</small>
                </span>
                <span className="rankValor"><strong>{br(a[crit])}</strong><small>{a[crit] === 1 ? um : varios}</small></span>
                {/* a sua linha tem um espaço vazio no lugar do botão, para as colunas ficarem alinhadas */}
                {a.eu ? <span className="rankAcao" aria-hidden="true" /> : (
                  <button type="button" className="btIcone rankAcao" disabled={ocupado === a.id} onClick={() => desfaz(a)} aria-label={`Desfazer a amizade com ${a.nome}`} title="Desfazer amizade"><Icone n="x" tam={18} /></button>
                )}
              </li>
            ))}
          </ol>
        )}
        {dados && ordem.length <= 1 && <p className="legenda">Ainda não tem ninguém aqui além de você. Convide um amigo pelo apelido.</p>}
      </section>
    </>
  );
}
