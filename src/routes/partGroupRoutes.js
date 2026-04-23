const express = require("express");
const router = express.Router();
const partGroupController = require("../controllers/partGroupController");
const requireAdmin = require("../middlewares/adminMiddleware");

/**
 * Rotas de Grupos de Compatibilidade
 * 
 * Todas as rotas requerem autenticação de administrador.
 * O ID dos grupos é INTEGER simples (auto increment), não criptografado.
 * 
 * Endpoints disponíveis:
 * GET    /part-groups                     - Lista todos os grupos
 * GET    /part-groups/available-parts     - Peças disponíveis (com filtro)
 * GET    /part-groups/available-part      - Todas as peças
 * GET    /part-groups/:id                 - Busca grupo por ID
 * GET    /part-groups/:id/audit           - Histórico de movimentações
 * GET    /part-groups/part/:partId/stock  - Estoque por ID da peça
 * POST   /part-groups                     - Cria novo grupo
 * PUT    /part-groups/:id                 - Atualiza grupo
 * PUT    /part-groups/:id/stock           - Atualiza estoque
 * POST   /part-groups/:id/parts           - Adiciona variação (procorid) ao grupo
 * DELETE /part-groups/parts/:procorid     - Remove variação do grupo
 * DELETE /part-groups/:id                 - Exclui grupo
 */

// Lista todos os grupos de compatibilidade
router.get("/part-groups", requireAdmin, partGroupController.listGroups);

// Busca peças disponíveis para agrupamento (com filtro opcional por grupo)
router.get(
  "/part-groups/available-parts",
  requireAdmin,
  partGroupController.getAvailableParts
);

// Busca todas as peças disponíveis (lista completa)
router.get(
  "/part-groups/available-part",
  requireAdmin,
  partGroupController.getAvailablePart
);

// Busca grupo por ID (inclui lista de peças do grupo)
router.get("/part-groups/:id", requireAdmin, partGroupController.getGroup);

// Busca histórico de movimentações (auditoria) de um grupo
router.get(
  "/part-groups/:id/audit",
  requireAdmin,
  partGroupController.getGroupAuditHistory
);

// Busca estoque através do ID da peça
router.get(
  "/part-groups/part/:partId/stock",
  requireAdmin,
  partGroupController.getPartGroupStock
);

// Cria novo grupo de compatibilidade
router.post("/part-groups", requireAdmin, partGroupController.createGroup);

// Atualiza grupo de compatibilidade
router.put("/part-groups/:id", requireAdmin, partGroupController.updateGroup);

// Atualiza estoque do grupo diretamente
router.put(
  "/part-groups/:id/stock",
  requireAdmin,
  partGroupController.updateGroupStock
);

// Adiciona peça ao grupo
router.post(
  "/part-groups/:id/parts",
  requireAdmin,
  partGroupController.addPartToGroup
);

// Remove peça do grupo (por procorid)
router.delete(
  "/part-groups/parts/:procorid",
  requireAdmin,
  partGroupController.removePartFromGroup
);

// Atualiza quantidade ideal de um grupo
router.put(
  "/part-groups/:id/ideal",
  requireAdmin,
  partGroupController.updateGroupIdealQty
);

// Ajusta estoque do grupo por delta (adicionar ou reduzir)
router.post(
  "/part-groups/:id/adjust-stock",
  requireAdmin,
  partGroupController.adjustGroupStock
);

// Exclui grupo de compatibilidade
router.delete(
  "/part-groups/:id",
  requireAdmin,
  partGroupController.deleteGroup
);

module.exports = router;
