const express = require("express");
const router = express.Router();
const pedidosControllerV2 = require("../controllers/pedidosControllerV2");
//const autenticarToken = require("../middlewares/middlewares");

router.get("/v2/pedidos/total", pedidosControllerV2.totalVendas);
router.get("/v2/pedidos/listar", pedidosControllerV2.listarPv);
router.put("/v2/pedidos/cancelar/:pvcod", pedidosControllerV2.cancelarPedido);

module.exports = router;
