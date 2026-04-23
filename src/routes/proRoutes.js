const express = require("express");
const router = express.Router();
const proController = require("../controllers/proController");
const proControllerV2 = require("../controllers/proControllerV2");
const autenticarToken = require("../middlewares/middlewares");
const requireAdmin = require("../middlewares/adminMiddleware");

// ==================  GET

router.get("/total/produto/acabando", proController.totalProdutoAcabando);
router.get("/total/produto/emfalta", proController.totalProdutoEmFalta);

router.get("/pro/:id", proController.listarProduto);
router.get("/proCores", proController.listarProCor);
router.get("/pro/painel/:id", proController.listarProdutosPainelId);
router.get("/pro/modelos/:id", proController.listarModelosProduto);
router.get("/pros", proController.listarProdutos);
router.get("/pro/carrinho/:id", proController.listarProdutoCarrinho);
router.get(
  "/proCoresDisponiveis/:id",
  proController.listarProdutoCoresDisponiveis
);
router.get(
  "/proComEstoque",
  autenticarToken,
  proController.listarProdutosComEstoque
);
router.get(
  "/proSemEstoque",
  autenticarToken,
  proController.listarProdutosSemEstoque
);
// V2 Routes com models
router.get("/v2/pros", autenticarToken, proControllerV2.listarTodosProdutos);
router.get(
  "/v2/proComEstoque",
  autenticarToken,
  proControllerV2.listarProdutosComEstoque
);
router.get(
  "/v2/proSemEstoque",
  autenticarToken,
  proControllerV2.listarProdutosSemEstoque
);
router.get(
  "/v2/proEstoqueAcabando",
  autenticarToken,
  proControllerV2.listarProdutosComEstoqueAcabando
);
router.get(
  "/v2/proComEstoque/:marca/:modelo",
  autenticarToken,
  proControllerV2.listarProdutosComEstoqueItem
);
router.get(
  "/v2/proSemEstoque/:marca/:modelo",
  autenticarToken,
  proControllerV2.listarProdutosSemEstoqueItem
);
router.get(
  "/v2/proEstoqueAcabando/:marca/:modelo",
  autenticarToken,
  proControllerV2.listarProdutosComEstoqueAcabandoItem
);
router.get(
  "/v2/proEstoqueEmFalta",
  autenticarToken,
  proControllerV2.listarProdutosEmFalta
);
router.get(
  "/v2/proEstoqueEmFalta/:marca/:modelo",
  autenticarToken,
  proControllerV2.listarProdutosEmFaltaItem
);
// Fim V2 Routes com models

// ==================  PUT
router.put("/pro/:id", requireAdmin, proController.editarProduto);
router.put(
  "/proCoresDisponiveis/:id",
  autenticarToken,
  proController.alterarProdutoCoresDisponiveis
);

// ==================  POST
router.post("/pro", requireAdmin, proController.inserirProduto);
router.post(
  "/pro/ordem",
  autenticarToken,
  proController.atualizarOrdemProdutos
);
router.post(
  "/proCoresDisponiveis/:id",
  autenticarToken,
  proController.inserirProdutoCoresDisponiveis
);

// ==================  DELETE
router.delete("/pro/:id", requireAdmin, proController.excluirProduto);
router.delete(
  "/proCoresDisponiveis/:id",
  autenticarToken,
  proController.deletarProdutoCoresDisponiveis
);
router.put(
  "/pro/estoque/:id",
  autenticarToken,
  proController.gravarEstoqueProduto
);

module.exports = router;
