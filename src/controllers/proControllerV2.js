const proModels = require("../models/proModels");

exports.listarTodosProdutos = async (req, res) => {
  try {
    const result = await proModels.listarTodosProdutos();
    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao buscar produtos" });
  }
};

exports.listarProdutosComEstoque = async (req, res) => {
  try {
    const result = await proModels.listarProdutosComEstoque();
    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao buscar produtos estoque" });
  }
};

exports.listarProdutosComEstoqueItem = async (req, res) => {
  const { marca, modelo } = req.params;
  try {
    const result = await proModels.listarProdutosComEstoqueItem(marca, modelo);
    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao buscar produto com estoque" });
  }
};

exports.listarProdutosSemEstoque = async (req, res) => {
  try {
    const result = await proModels.listarProdutosSemEstoque();
    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao buscar produtos estoque" });
  }
};

exports.listarProdutosSemEstoqueItem = async (req, res) => {
  const { marca, modelo } = req.params;
  try {
    const result = await proModels.listarProdutosSemEstoqueItem(marca, modelo);
    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao buscar produto sem estoque" });
  }
};

exports.listarProdutosComEstoqueAcabando = async (req, res) => {
  const { marca, modelo } = req.params;
  try {
    const result = await proModels.listarProdutosComEstoqueAcabando(
      marca,
      modelo
    );
    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "Erro ao buscar produto com estoque acabando" });
  }
};

exports.listarProdutosComEstoqueAcabandoItem = async (req, res) => {
  const { marca, modelo } = req.params;
  try {
    const result = await proModels.listarProdutosComEstoqueAcabandoItem(
      marca,
      modelo
    );
    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "Erro ao buscar produto com estoque acabando item" });
  }
};

exports.listarProdutosEmFalta = async (req, res) => {
  const { marca, modelo } = req.params;
  try {
    const result = await proModels.listarProdutosEmFalta(marca, modelo);
    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "Erro ao buscar produto com estoque em falta" });
  }
};

exports.listarProdutosEmFaltaItem = async (req, res) => {
  const { marca, modelo } = req.params;
  try {
    const result = await proModels.listarProdutosEmFaltaItem(marca, modelo);
    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "Erro ao buscar produto com estoque em falta item" });
  }
};
