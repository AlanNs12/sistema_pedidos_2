const { Pool } = require('pg');
require('dotenv').config({path: '../.env'});

// Pool de conexões configurável via env para ambientes com pouco recurso
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  // Número máximo de clientes no pool (padrão 10; reduzir em Docker com pouca RAM)
  max: parseInt(process.env.DB_POOL_MAX || '10', 10),
  // Tempo (ms) que um cliente inativo fica no pool antes de ser fechado
  idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE_TIMEOUT_MS || '30000', 10),
  // Tempo (ms) máximo para obter uma conexão do pool
  connectionTimeoutMillis: parseInt(process.env.DB_POOL_CONNECTION_TIMEOUT_MS || '5000', 10),
});

// Define statement_timeout para evitar queries travadas em cada conexão nova
pool.on('connect', (client) => {
  const timeout = parseInt(process.env.DB_STATEMENT_TIMEOUT_MS || '30000', 10);
  // Validate before interpolating (parseInt returns NaN for invalid input)
  const safeTimeout = Number.isFinite(timeout) && timeout >= 0 ? timeout : 30000;
  client.query(`SET statement_timeout = ${safeTimeout}`).catch(() => {});
});

// Log de queries lentas — habilitado quando LOG_SLOW_QUERIES_MS > 0
const slowMs = parseInt(process.env.LOG_SLOW_QUERIES_MS || '0', 10);
if (slowMs > 0) {
  const _query = pool.query.bind(pool);
  pool.query = function (...args) {
    const start = Date.now();
    const result = _query(...args);
    if (result && typeof result.then === 'function') {
      return result.then((res) => {
        const duration = Date.now() - start;
        if (duration >= slowMs) {
          const text = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].text) || '';
          console.warn(
            `[SLOW QUERY] ${duration}ms | ${text.replace(/\s+/g, ' ').trim().slice(0, 250)}`
          );
        }
        return res;
      });
    }
    return result;
  };
}

module.exports = pool;
