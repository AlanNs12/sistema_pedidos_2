const express = require("express");
const router = express.Router();
const pedidosControllerV2 = require("../controllers/pedidosControllerV2");
const autenticarToken = require("../middlewares/middlewares");

router.get("/v2/top/marcas/mes",autenticarToken, pedidosControllerV2.topMarcasMes);
router.get("/v2/top/produtos/mes",autenticarToken, pedidosControllerV2.topProdutosMes);
router.get("/v2/pedidos/total/anual",autenticarToken, pedidosControllerV2.totalVendasAnual);
router.get("/v2/pedidos/total/dia",autenticarToken, pedidosControllerV2.totalVendasDia);
router.get("/v2/pedidos/total",autenticarToken, pedidosControllerV2.totalVendas);
router.get("/v2/pedidos/listar",autenticarToken, pedidosControllerV2.listarPv);
router.put("/v2/pedidos/cancelar/:pvcod", autenticarToken,pedidosControllerV2.cancelarPedido);

module.exports = router;
