/**
 * Testes de edição de itens de pedido confirmado
 *
 * Valida que editarItensPedidoConfirmado ajusta corretamente:
 * - procorqtde (tabela procor) para itens com cor
 * - proqtde    (tabela pro)   para itens sem cor
 * - Dois itens do mesmo procod com cores diferentes são tratados separadamente
 *
 * PRÉ-REQUISITOS:
 * - Banco de dados PostgreSQL rodando com o schema criado
 * - Variáveis de ambiente configuradas (arquivo .env)
 * - Executar a migração primeiro: node -e "require('./src/config/atualizardb').atualizarDB()"
 *
 * COMO EXECUTAR:
 * node tests/editarPedidoConfirmado.test.js
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

let testsRun = 0;
let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (!condition) throw new Error(message || "Assertiva falhou");
}
function assertEqual(actual, expected, message) {
  if (actual !== expected)
    throw new Error(
      `${message || "assertEqual falhou"}: esperado ${expected}, obtido ${actual}`
    );
}
async function test(name, fn) {
  testsRun++;
  try {
    await fn();
    console.log(`✅ PASSOU: ${name}`);
    testsPassed++;
  } catch (error) {
    console.log(`❌ FALHOU: ${name}`);
    console.log(`   Erro: ${error.message}`);
    testsFailed++;
  }
}

let pool;
try {
  pool = require("../src/config/db");
} catch (error) {
  console.error("Falha ao carregar dependências:", error.message);
  process.exit(1);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function criarProdutoSemCor(proqtde = 10) {
  const r = await pool.query(
    `INSERT INTO pro (prodes, promarcascod, protipocod, provl, proqtde)
     SELECT 'Produto Teste Sem Cor',
            (SELECT marcascod FROM marcas LIMIT 1),
            (SELECT tipocod  FROM tipo   LIMIT 1),
            50, $1
     RETURNING procod`,
    [proqtde]
  );
  return r.rows[0].procod;
}

async function criarProdutoComCor(corcod, procorqtde = 10) {
  const r = await pool.query(
    `INSERT INTO pro (prodes, promarcascod, protipocod, provl, proqtde)
     SELECT 'Produto Teste Com Cor',
            (SELECT marcascod FROM marcas LIMIT 1),
            (SELECT tipocod  FROM tipo   LIMIT 1),
            50, 0
     RETURNING procod`
  );
  const procod = r.rows[0].procod;
  await pool.query(
    `INSERT INTO procor (procorprocod, procorcorescod, procorqtde) VALUES ($1, $2, $3)`,
    [procod, corcod, procorqtde]
  );
  return procod;
}

async function obterOuCriarCor(nome) {
  const existing = await pool.query(
    "SELECT corcod FROM cores WHERE cornome = $1",
    [nome]
  );
  if (existing.rows.length > 0) return existing.rows[0].corcod;
  const r = await pool.query(
    "INSERT INTO cores (cornome) VALUES ($1) RETURNING corcod",
    [nome]
  );
  return r.rows[0].corcod;
}

async function criarPedidoConfirmado() {
  const r = await pool.query(
    `INSERT INTO pv (pvcod, pvvl, pvobs, pvcanal, pvsta, pvconfirmado)
     SELECT nextval('pv_seq'), 100, 'Teste', 'BALCAO', 'A', 'S'
     RETURNING pvcod`
  );
  return r.rows[0].pvcod;
}

async function inserirItem(pvcod, procod, pviqtde, pviprocorid = null) {
  await pool.query(
    `INSERT INTO pvi (pvipvcod, pviprocod, pviqtde, pvivl, pviprocorid)
     VALUES ($1, $2, $3, 50, $4)`,
    [pvcod, procod, pviqtde, pviprocorid]
  );
}

async function cleanup(pvcod, procods = []) {
  try {
    if (pvcod) {
      await pool.query("DELETE FROM pvi WHERE pvipvcod = $1", [pvcod]);
      await pool.query("DELETE FROM pv  WHERE pvcod    = $1", [pvcod]);
    }
    for (const procod of procods) {
      await pool.query("DELETE FROM procor WHERE procorprocod = $1", [procod]);
      await pool.query("DELETE FROM pro    WHERE procod       = $1", [procod]);
    }
  } catch (e) {
    console.log("Aviso limpeza:", e.message);
  }
}

// Chama o controller diretamente (sem HTTP) para simplificar os testes
async function chamarEditarItens(pvcod, itens) {
  const controller = require("../src/controllers/pedidosController");
  return new Promise((resolve) => {
    const req = { params: { pvcod: String(pvcod) }, body: { itens } };
    const res = {
      _status: 200,
      _body: null,
      status(code) { this._status = code; return this; },
      json(body)   { this._body  = body; resolve({ status: this._status, body }); },
    };
    controller.editarItensPedidoConfirmado(req, res);
  });
}

// ─── Testes ───────────────────────────────────────────────────────────────────

async function runTests() {
  console.log("\n🧪 Testes de Edição de Pedido Confirmado\n");
  console.log("=".repeat(50));

  // ── Teste 1: item SEM cor – reduzir quantidade devolve proqtde ───────────
  await test("Item sem cor: reduzir qtde devolve proqtde", async () => {
    const procod = await criarProdutoSemCor(10);
    const pvcod  = await criarPedidoConfirmado();
    await inserirItem(pvcod, procod, 3, null);

    const resp = await chamarEditarItens(pvcod, [
      { procod, pviqtde: 1, pviprocorid: null },
    ]);
    assertEqual(resp.status, 200, "Status deve ser 200");

    const r = await pool.query("SELECT proqtde FROM pro WHERE procod = $1", [procod]);
    // delta = 1 - 3 = -2  →  proqtde = 10 - (-2) = 12
    assertEqual(Number(r.rows[0].proqtde), 12, "proqtde deve ser 12");

    await cleanup(pvcod, [procod]);
  });

  // ── Teste 2: item SEM cor – aumentar quantidade deduz proqtde ────────────
  await test("Item sem cor: aumentar qtde deduz proqtde", async () => {
    const procod = await criarProdutoSemCor(10);
    const pvcod  = await criarPedidoConfirmado();
    await inserirItem(pvcod, procod, 2, null);

    const resp = await chamarEditarItens(pvcod, [
      { procod, pviqtde: 5, pviprocorid: null },
    ]);
    assertEqual(resp.status, 200, "Status deve ser 200");

    const r = await pool.query("SELECT proqtde FROM pro WHERE procod = $1", [procod]);
    // delta = 5 - 2 = 3  →  proqtde = 10 - 3 = 7
    assertEqual(Number(r.rows[0].proqtde), 7, "proqtde deve ser 7");

    await cleanup(pvcod, [procod]);
  });

  // ── Teste 3: item SEM cor – estoque insuficiente retorna 400 ─────────────
  await test("Item sem cor: estoque insuficiente retorna 400", async () => {
    const procod = await criarProdutoSemCor(2);
    const pvcod  = await criarPedidoConfirmado();
    await inserirItem(pvcod, procod, 1, null);

    const resp = await chamarEditarItens(pvcod, [
      { procod, pviqtde: 10, pviprocorid: null }, // delta = 9, estoque = 2
    ]);
    assertEqual(resp.status, 400, "Status deve ser 400");
    assert(resp.body.tipo === "estoque_insuficiente", "tipo deve ser estoque_insuficiente");

    await cleanup(pvcod, [procod]);
  });

  // ── Teste 4: item COM cor – reduzir quantidade devolve procorqtde ─────────
  await test("Item com cor: reduzir qtde devolve procorqtde", async () => {
    const corcod = await obterOuCriarCor("Azul Teste");
    const procod  = await criarProdutoComCor(corcod, 5);
    const pvcod   = await criarPedidoConfirmado();
    await inserirItem(pvcod, procod, 3, corcod);

    const resp = await chamarEditarItens(pvcod, [
      { procod, pviqtde: 1, pviprocorid: corcod },
    ]);
    assertEqual(resp.status, 200, "Status deve ser 200");

    const r = await pool.query(
      "SELECT procorqtde FROM procor WHERE procorprocod = $1 AND procorcorescod = $2",
      [procod, corcod]
    );
    // delta = 1 - 3 = -2  →  procorqtde = 5 - (-2) = 7
    assertEqual(Number(r.rows[0].procorqtde), 7, "procorqtde deve ser 7");

    await cleanup(pvcod, [procod]);
  });

  // ── Teste 5: item COM cor – aumentar quantidade deduz procorqtde ──────────
  await test("Item com cor: aumentar qtde deduz procorqtde", async () => {
    const corcod = await obterOuCriarCor("Vermelho Teste");
    const procod  = await criarProdutoComCor(corcod, 8);
    const pvcod   = await criarPedidoConfirmado();
    await inserirItem(pvcod, procod, 2, corcod);

    const resp = await chamarEditarItens(pvcod, [
      { procod, pviqtde: 5, pviprocorid: corcod },
    ]);
    assertEqual(resp.status, 200, "Status deve ser 200");

    const r = await pool.query(
      "SELECT procorqtde FROM procor WHERE procorprocod = $1 AND procorcorescod = $2",
      [procod, corcod]
    );
    // delta = 5 - 2 = 3  →  procorqtde = 8 - 3 = 5
    assertEqual(Number(r.rows[0].procorqtde), 5, "procorqtde deve ser 5");

    await cleanup(pvcod, [procod]);
  });

  // ── Teste 6: duas cores para mesmo procod – editar uma não afeta a outra ──
  await test("Dois itens com cores diferentes: editar uma cor não afeta a outra", async () => {
    const corAzul      = await obterOuCriarCor("Azul Indep");
    const corVermelho  = await obterOuCriarCor("Vermelho Indep");

    // Cria o produto com as duas cores
    const r = await pool.query(
      `INSERT INTO pro (prodes, promarcascod, protipocod, provl, proqtde)
       SELECT 'Produto Dupla Cor',
              (SELECT marcascod FROM marcas LIMIT 1),
              (SELECT tipocod  FROM tipo   LIMIT 1),
              50, 0
       RETURNING procod`
    );
    const procod = r.rows[0].procod;
    await pool.query(
      `INSERT INTO procor (procorprocod, procorcorescod, procorqtde) VALUES ($1, $2, 10), ($1, $3, 10)`,
      [procod, corAzul, corVermelho]
    );

    const pvcod = await criarPedidoConfirmado();
    await inserirItem(pvcod, procod, 3, corAzul);
    await inserirItem(pvcod, procod, 2, corVermelho);

    // Edita somente a cor Azul (reduz de 3 para 1)
    const resp = await chamarEditarItens(pvcod, [
      { procod, pviqtde: 1, pviprocorid: corAzul },
    ]);
    assertEqual(resp.status, 200, "Status deve ser 200");

    // Azul: delta = 1 - 3 = -2  →  procorqtde = 10 - (-2) = 12
    const rAzul = await pool.query(
      "SELECT procorqtde FROM procor WHERE procorprocod = $1 AND procorcorescod = $2",
      [procod, corAzul]
    );
    assertEqual(Number(rAzul.rows[0].procorqtde), 12, "procorqtde Azul deve ser 12");

    // Vermelho: não foi editado, deve permanecer 10
    const rVermelho = await pool.query(
      "SELECT procorqtde FROM procor WHERE procorprocod = $1 AND procorcorescod = $2",
      [procod, corVermelho]
    );
    assertEqual(Number(rVermelho.rows[0].procorqtde), 10, "procorqtde Vermelho deve permanecer 10");

    await cleanup(pvcod, [procod]);
  });

  // ── Teste 7: pedido cancelado (pvsta='X') não pode ser editado ────────────
  await test("Pedido cancelado não pode ser editado", async () => {
    const procod = await criarProdutoSemCor(10);
    const pvcodR = await pool.query(
      `INSERT INTO pv (pvcod, pvvl, pvobs, pvcanal, pvsta, pvconfirmado)
       SELECT nextval('pv_seq'), 100, 'Teste', 'BALCAO', 'X', 'S'
       RETURNING pvcod`
    );
    const pvcod = pvcodR.rows[0].pvcod;
    await inserirItem(pvcod, procod, 2, null);

    const resp = await chamarEditarItens(pvcod, [
      { procod, pviqtde: 1, pviprocorid: null },
    ]);
    assertEqual(resp.status, 400, "Status deve ser 400");

    await cleanup(pvcod, [procod]);
  });

  // ── Teste 8: pedido não confirmado (pvconfirmado='N') não pode ser editado
  await test("Pedido não confirmado não pode ser editado nesta rota", async () => {
    const procod = await criarProdutoSemCor(10);
    const pvcodR = await pool.query(
      `INSERT INTO pv (pvcod, pvvl, pvobs, pvcanal, pvsta, pvconfirmado)
       SELECT nextval('pv_seq'), 100, 'Teste', 'BALCAO', 'A', 'N'
       RETURNING pvcod`
    );
    const pvcod = pvcodR.rows[0].pvcod;
    await inserirItem(pvcod, procod, 2, null);

    const resp = await chamarEditarItens(pvcod, [
      { procod, pviqtde: 1, pviprocorid: null },
    ]);
    assertEqual(resp.status, 400, "Status deve ser 400");

    await cleanup(pvcod, [procod]);
  });

  // ── Resumo ────────────────────────────────────────────────────────────────
  console.log("\n" + "=".repeat(50));
  console.log(`\n📊 Resultado: ${testsPassed}/${testsRun} passaram`);
  if (testsFailed > 0) {
    console.log(`❌ ${testsFailed} teste(s) falharam\n`);
    process.exit(1);
  } else {
    console.log("✅ Todos os testes passaram!\n");
    process.exit(0);
  }
}

runTests()
  .catch((error) => {
    console.error("Erro no executor de testes:", error);
    process.exit(1);
  })
  .finally(() => {
    setTimeout(() => pool.end(), 1000);
  });
