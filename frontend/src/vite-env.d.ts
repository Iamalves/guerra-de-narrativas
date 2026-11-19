/// <reference types="vite/client" />

/** ponte entre o motor do jogo (public/jogo/motor.js, JavaScript comum) e o React */
interface PonteJogo {
  api: string;
  dev: boolean;
  token: () => string | null;
  progSalvo: (prog: unknown) => void;
  /** o motor pede para mostrar o menu (o menu é do React) */
  abreMenu?: (aba: string) => void;
}
interface Window { GN_PONTE?: PonteJogo }

interface ImportMetaEnv { readonly VITE_API_URL?: string }
