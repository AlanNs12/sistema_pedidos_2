/**
 * Performance Middleware
 *
 * Instrumentação leve de performance por request.
 * Controle via variáveis de ambiente:
 *   REQUEST_LOGGING=true   — loga método, rota, status e tempo de cada request
 *   LOG_SLOW_QUERIES_MS=200 — loga queries que demoram mais que o valor (ms)
 *                             0 desabilita (padrão)
 */

const REQUEST_LOGGING = process.env.REQUEST_LOGGING === "true";

/**
 * Middleware Express que registra o tempo total de cada request.
 * Habilitado quando REQUEST_LOGGING=true no .env
 */
function requestTimingMiddleware(req, res, next) {
  if (!REQUEST_LOGGING) return next();

  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(
      `[PERF] ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`
    );
  });

  next();
}

module.exports = { requestTimingMiddleware };
