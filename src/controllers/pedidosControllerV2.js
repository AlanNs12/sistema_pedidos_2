const pedidoModels = require("../models/pedidoModels");

exports.totalVendas = async (req, res) => {
  try {
    const result = await pedidoModels.totalVendas();
    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro buscar total vendas" });
  }
}
exports.listarPv = async (req, res) => {
  try {
    const result = await pedidoModels.listarPv();
    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro buscar pedidos" });
  }
};

exports.cancelarPedido = async (req, res) => {

  try {
    const result = await pedidoModels.cancelarPedido(req, res);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "erro ao cancelar pedido" });
  }
};