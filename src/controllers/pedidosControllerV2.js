const pedidoModels = require("../models/pedidoModels");

exports.totalVendas = async (req, res) => {
  try {
    const { dataInicio, dataFim } = req.query || {};
    const result = await pedidoModels.totalVendas(dataInicio, dataFim);
    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro buscar total vendas" });
  }
}
exports.totalVendasDia = async (req, res) => {
  try {
    const { dataInicio, dataFim } = req.query || {};
    const result = await pedidoModels.totalVendasDia(dataInicio, dataFim);
    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro buscar total vendas dia" });
  }
}
exports.totalVendasAnual = async (req, res) => {
  try {
    const { dataInicio, dataFim } = req.query || {};
    const result = await pedidoModels.totalVendasAnual(dataInicio, dataFim);
    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro buscar total vendas anual" });
  }
}
exports.topMarcasMes = async (req, res) => {
  try {
    const { dataInicio, dataFim } = req.query || {};
    const result = await pedidoModels.topMarcasMes(dataInicio, dataFim);
    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro buscar top marcas do mês" });
  }
}
exports.topProdutosMes = async (req, res) => {
  try {
    const { dataInicio, dataFim } = req.query || {};
    const result = await pedidoModels.topProdutosMes(dataInicio, dataFim);
    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro buscar top produtos do mês" });
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