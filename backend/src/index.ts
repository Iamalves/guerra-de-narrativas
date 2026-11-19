import { criaApp } from './app.ts';
import { aplicaMigracoes, pool } from './db.ts';

const porta = Number(process.env.PORT || 3001);

try {
  const novas = await aplicaMigracoes();
  if (novas.length) console.log('migrações aplicadas:', novas.join(', '));
} catch (e) {
  console.error('Não consegui preparar o banco. O Postgres está no ar? (docker compose -f banco/docker-compose.yml up -d)');
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
}

const servidor = criaApp().listen(porta, () => console.log(`API do Guerra de Narrativas em http://localhost:${porta}/api`));

const fecha = () => { servidor.close(() => pool.end().then(() => process.exit(0))); };
process.on('SIGINT', fecha);
process.on('SIGTERM', fecha);
