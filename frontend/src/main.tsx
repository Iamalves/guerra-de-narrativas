import { createRoot } from 'react-dom/client';
import { App } from './App';
import './estilos.css';

/* sem StrictMode: em desenvolvimento ele monta os componentes duas vezes, e o motor do jogo (global) só pode ser carregado uma */
createRoot(document.getElementById('raiz')!).render(<App />);
