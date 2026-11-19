import express, { type Request, type Response, type NextFunction } from 'express';
import { pool } from './db.ts';
import { identifica, rotasContas } from './contas.ts';
import { rotasJogo } from './partidas.ts';
import { rotasPagamentos } from './pagamentos.ts';
import { rotasAmigos } from './amigos.ts';

export function criaApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 'loopback');

  /* CORS só para os endereços de CORS_ORIGENS (em desenvolvimento o Vite encaminha /api, então nem precisa) */
  const origens = (process.env.CORS_ORIGENS || '').split(',').map(s => s.trim()).filter(Boolean);
  app.use((req, res, next) => {
    const o = req.get('origin');
    if (o && origens.includes(o)) {
      res.set({ 'Access-Control-Allow-Origin': o, 'Vary': 'Origin', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE' });
      if (req.method === 'OPTIONS') { res.status(204).end(); return; }
    }
    next();
  });

  /* registro de partida pode ser grande (partida longa); o resto é pequeno */
  app.use('/api/partidas', express.json({ limit: '5mb' }));
  app.use(express.json({ limit: '300kb' }));
  /* o simulador de pagamento (só desenvolvimento) recebe um formulário HTML comum */
  app.use('/api/pagamentos/simulador', express.urlencoded({ extended: false, limit: '10kb' }));

  const api = express.Router();
  api.get('/saude', async (_req, res) => { await pool.query('SELECT 1'); res.json({ ok: true }); });
  api.use(identifica);
  api.use(rotasContas);
  api.use(rotasJogo);
  api.use(rotasPagamentos);
  api.use(rotasAmigos);
  app.use('/api', api);
  app.use('/api', (_req, res) => { res.status(404).json({ erro: 'rota não existe' }); });

  /* erro inesperado: registra no console e responde sem detalhes internos */
  app.use((err: Error & { type?: string; status?: number }, _req: Request, res: Response, _next: NextFunction) => {
    if (err.type === 'entity.too.large') { res.status(413).json({ erro: 'envio grande demais' }); return; }
    if (err.type === 'entity.parse.failed') { res.status(400).json({ erro: 'JSON inválido' }); return; }
    console.error(err);
    res.status(500).json({ erro: 'erro no servidor' });
  });
  return app;
}
