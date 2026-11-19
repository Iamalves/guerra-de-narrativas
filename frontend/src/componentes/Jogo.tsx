import { memo, useEffect } from 'react';
import marcacao from '../jogo/marcacao.html?raw';
import '../jogo/jogo.css';

/* O motor do jogo é o mesmo de antes (JavaScript comum, com funções globais): este componente só põe o HTML do jogo na
   página e carrega public/jogo/motor.js uma vez. O motor procura os elementos pelo id (#hud, #c, #panel...), por isso o
   HTML precisa estar na página antes do script. Depois de carregado, o jogo vive até a página fechar. */
/* a marca fica na página (window), não no módulo: no modo de desenvolvimento o Vite recarrega este módulo ao salvar um
   arquivo, e uma variável do módulo voltaria a false, carregando o motor de novo (erro "Identifier ... already declared") */
const marca = window as unknown as { __motorCarregado?: boolean };

export const Jogo = memo(function Jogo() {
  useEffect(() => {
    if (marca.__motorCarregado) return;
    marca.__motorCarregado = true;
    const s = document.createElement('script');
    s.src = '/jogo/motor.js';
    s.async = false;
    document.body.appendChild(s);
  }, []);
  return <div className="jogoRaiz" dangerouslySetInnerHTML={{ __html: marcacao }} />;
});
