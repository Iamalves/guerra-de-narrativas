import { useState, type FormEvent } from 'react';
import { api, ErroApi, type Sessao } from '../api';
import { ladoAtual } from '../perfil';
import { Segmentos } from '../menu/comum';

interface Props {
  aviso?: string | null;
  aoEntrar: (s: Sessao) => void;
  aoJogarSemConta: () => void;
}

/* mesma regra do servidor (backend/src/seguranca.ts): nome@dominio.ext, sem espaços nem pontos repetidos */
const EMAIL_OK = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i;
export const emailValido = (e: string) => e.trim().length <= 254 && EMAIL_OK.test(e.trim());

/** campo de senha com o botão de olho para mostrar ou ocultar o que foi digitado */
function CampoSenha({ valor, muda, novo }: { valor: string; muda: (v: string) => void; novo: boolean }) {
  const [mostra, setMostra] = useState(false);
  return (
    <label className="campo">
      <span>Senha</span>
      <span className="campoSenha">
        <input type={mostra ? 'text' : 'password'} value={valor} onChange={e => muda(e.target.value)}
          autoComplete={novo ? 'new-password' : 'current-password'} minLength={6} required autoCapitalize="off" autoCorrect="off" spellCheck={false} />
        <button type="button" className="olho" onClick={() => setMostra(m => !m)} aria-pressed={mostra}
          aria-label={mostra ? 'Ocultar senha' : 'Mostrar senha'} title={mostra ? 'Ocultar senha' : 'Mostrar senha'}>
          {mostra ? (
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18M10.6 5.1A10.9 10.9 0 0 1 12 5c5 0 9 4.5 10 7a12.7 12.7 0 0 1-3.2 4.3M6.6 6.6C4.4 8 2.8 10.2 2 12c1 2.5 5 7 10 7a10.6 10.6 0 0 0 5.4-1.5M9.9 9.9a3 3 0 0 0 4.2 4.2" /></svg>
          ) : (
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12c1-2.5 5-7 10-7s9 4.5 10 7c-1 2.5-5 7-10 7S3 14.5 2 12z" /><circle cx="12" cy="12" r="3" /></svg>
          )}
        </button>
      </span>
    </label>
  );
}

/** entrar, criar conta ou jogar sem conta */
export function TelaEntrada({ aviso, aoEntrar, aoJogarSemConta }: Props) {
  const [modo, setModo] = useState<'entrar' | 'criar'>('entrar');
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(aviso ?? null);
  const [emailTocado, setEmailTocado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const emailRuim = modo === 'criar' && emailTocado && email.trim() !== '' && !emailValido(email);

  async function envia(ev: FormEvent) {
    ev.preventDefault();
    setErro(null);
    if (modo === 'criar' && !emailValido(email)) { setEmailTocado(true); setErro('Digite um e-mail válido, como nome@exemplo.com.'); return; }
    setEnviando(true);
    try {
      /* conta nova leva junto o lado já escolhido neste navegador */
      aoEntrar(modo === 'entrar' ? await api.entra(nome.trim(), senha) : await api.criaConta(nome.trim(), email.trim(), senha, ladoAtual(null)));
    } catch (e) {
      setErro(e instanceof ErroApi ? e.message : 'Algo deu errado. Tente de novo.');
      setEnviando(false);
    }
  }
  const trocaModo = (m: 'entrar' | 'criar') => { setModo(m); setErro(null); setEmailTocado(false); };

  return (
    <main className="telaCheia entrada">
      <div className="entradaCaixa">
        <p className="marca">Guerra de Narrativas</p>
        <h1>{modo === 'entrar' ? 'Entre para jogar' : 'Crie sua conta'}</h1>
        <p className="legenda">Com conta, o seu progresso fica guardado e vai junto para qualquer aparelho.</p>
        <Segmentos rotulo="Entrar ou criar conta" valor={modo} muda={trocaModo} className="segLargo" opcoes={[['entrar', 'Entrar'], ['criar', 'Criar conta']]} />
        <form onSubmit={envia} noValidate={modo === 'criar'} className="formulario">
          <label className="campo"><span>{modo === 'entrar' ? 'Apelido ou e-mail' : 'Apelido'}</span>
            <input value={nome} onChange={e => setNome(e.target.value)} autoComplete="username" minLength={3} maxLength={modo === 'entrar' ? 254 : 20} required autoCapitalize="off" />
          </label>
          {modo === 'criar' && (
            <label className="campo"><span>E-mail</span>
              <input type="email" inputMode="email" value={email} onChange={e => setEmail(e.target.value)} onBlur={() => setEmailTocado(true)}
                autoComplete="email" maxLength={254} required aria-invalid={emailRuim} aria-describedby={emailRuim ? 'emailErro' : undefined} autoCapitalize="off" spellCheck={false} />
              {emailRuim && <small id="emailErro" className="erroTxt">Esse e-mail não parece válido. Confira, por exemplo: nome@exemplo.com</small>}
            </label>
          )}
          <CampoSenha valor={senha} muda={setSenha} novo={modo === 'criar'} />
          {modo === 'criar' && <small className="legenda">Apelido de 3 a 20 letras ou números; senha com pelo menos 6 caracteres. O e-mail não aparece no jogo.</small>}
          {erro && <p className="erroTxt" role="alert">{erro}</p>}
          <button className="bt pri grande" disabled={enviando}>{enviando ? 'Aguarde…' : modo === 'entrar' ? 'Entrar' : 'Criar conta e jogar'}</button>
        </form>
        <div className="ou" aria-hidden="true"><span>ou</span></div>
        <button type="button" className="bt sec largo" onClick={aoJogarSemConta}>Jogar sem conta</button>
        <p className="legenda centro">Sem conta, o progresso fica só neste navegador.</p>
        <p className="rodapeAviso">Com conta, o servidor guarda o seu apelido, o seu e-mail, o seu progresso e as jogadas das partidas, que servem para ajustar o equilíbrio do jogo.</p>
      </div>
    </main>
  );
}
