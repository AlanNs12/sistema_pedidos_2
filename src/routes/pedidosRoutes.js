const express = require("express");
const router = express.Router();
const pedidosController = require("../controllers/pedidosController");
const autenticarToken = require("../middlewares/middlewares");

router.get("/pedidos/sequencia", pedidosController.sequencia);
// Stock decrement happens only on order confirmation via database trigger (atualizar_saldo)
router.post(
  "/pedidos/enviar",
  pedidosController.inserirPv,
  pedidosController.inserirPvi
);
router.get("/pedidos/listar", autenticarToken, pedidosController.listarPv);
router.get(
  "/pedidos/pendentescount",
  autenticarToken,
  pedidosController.listarPvPendentesCount
);
router.get(
  "/pedidos/pendentescountNow",
  autenticarToken,
  pedidosController.listarPvPendentesCountNow
);
router.get(
  "/pedidos/balcao",
  autenticarToken,
  pedidosController.listarPvBalcao
);
router.get(
  "/pedidos/entrega",
  autenticarToken,
  pedidosController.listarPvEntrega
);

router.get(
  "/pedidos/balcaoNow",
  autenticarToken,
  pedidosController.listarPvBalcaoNow
);
router.get(
  "/pedidos/entregaNow",
  autenticarToken,
  pedidosController.listarPvEntregaNow
);
router.get(
  "/pedidos/total/confirmados",
  autenticarToken,
  pedidosController.listarTotalPvConfirmados
);
router.get(
  "/pedidos/total/confirmadosNow",
  autenticarToken,
  pedidosController.listarTotalPvConfirmadosNow
);
router.get(
  "/pedidos/pendentes",
  autenticarToken,
  pedidosController.listarPvPendentes
);
router.get(
  "/pedidos/confirmados",
  autenticarToken,
  pedidosController.listarPvConfirmados
);
router.put(
  "/pedidos/confirmar/:pvcod",
  autenticarToken,
  pedidosController.confirmarPedido
);
router.put(
  "/pedidos/cancelar/:pvcod",
  autenticarToken,
  pedidosController.cancelarPedido
);
router.get(
  "/pedido/detalhe/:pvcod",
  autenticarToken,
  pedidosController.listarPedidosPendentesDetalhe
);
router.put(
  "/pedidos/itens/cancelar/:pvcod",
  autenticarToken,
  pedidosController.cancelarItemPv
);
router.put(
  "/pedidos/itens/confirmar/:pvcod",
  autenticarToken,
  pedidosController.confirmarItemPv
);
router.put(
  "/pedidos/confirmados/:pvcod/itens",
  autenticarToken,
  pedidosController.editarItensPedidoConfirmado
);

module.exports = router;
