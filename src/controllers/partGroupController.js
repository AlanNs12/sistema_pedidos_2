const partGroupModels = require("../models/partGroupModels");

/**
 * Controlador de Grupos de Compatibilidade
 * 
 * Gerencia os endpoints da API para administração dos grupos de compatibilidade.
 * Todos os endpoints requerem autenticação de administrador.
 * 
 * Estrutura JSON de resposta dos grupos:
 * { id: number, name: string, stock_quantity: number, parts: [...], ... }
 */

// Lista todos os grupos de compatibilidade
exports.listGroups = async (req, res) => {
  try {
    const groups = await partGroupModels.listAllGroups();
    res.status(200).json(groups);
  } catch (error) {
    console.error("Erro ao listar grupos de compatibilidade:", error);
    res.status(500).json({ error: "Erro ao listar grupos de peças" });
  }
};

// Busca um grupo específico pelo ID, incluindo suas peças
exports.getGroup = async (req, res) => {
  const { id } = req.params;

  try {
    const group = await partGroupModels.getGroupById(id);
    if (!group) {
      return res.status(404).json({ error: "Grupo não encontrado" });
    }
    res.status(200).json(group);
  } catch (error) {
    console.error("Erro ao buscar grupo de compatibilidade:", error);
    res.status(500).json({ error: "Erro ao buscar grupo de peças" });
  }
};

// Busca o estoque de um grupo através do ID da peça
exports.getPartGroupStock = async (req, res) => {
  const { partId } = req.params;

  try {
    const stockInfo = await partGroupModels.getGroupStock(partId);
    if (!stockInfo) {
      return res.status(404).json({ error: "Peça não encontrada" });
    }
    res.status(200).json(stockInfo);
  } catch (error) {
    console.error("Erro ao buscar estoque do grupo:", error);
    res.status(500).json({ error: "Erro ao buscar estoque do grupo" });
  }
};

// Cria um novo grupo de compatibilidade
// Grupos são sempre criados com stock_quantity = 0
// O estoque só pode ser definido após adicionar peças ao grupo
exports.createGroup = async (req, res) => {
  const { name, colorId } = req.body;

  if (!name || name.trim() === "") {
    return res.status(400).json({ error: "Nome do grupo é obrigatório" });
  }

  try {
    // Sempre cria grupos com estoque inicial de 0
    const group = await partGroupModels.createGroup(name.trim(), 0, colorId || null);
    res.status(201).json(group);
  } catch (error) {
    console.error("Erro ao criar grupo de compatibilidade:", error);
    res.status(500).json({ error: "Erro ao criar grupo de peças" });
  }
};

// Atualiza um grupo de compatibilidade
exports.updateGroup = async (req, res) => {
  const { id } = req.params;
  const { name, stock_quantity, colorId } = req.body;

  if (!name || name.trim() === "") {
    return res.status(400).json({ error: "Nome do grupo é obrigatório" });
  }

  try {
    const group = await partGroupModels.updateGroup(
      id,
      name.trim(),
      stock_quantity,
      colorId !== undefined ? colorId : undefined
    );
    if (!group) {
      return res.status(404).json({ error: "Grupo não encontrado" });
    }
    res.status(200).json(group);
  } catch (error) {
    console.error("Erro ao atualizar grupo de compatibilidade:", error);
    res.status(500).json({ error: "Erro ao atualizar grupo de peças" });
  }
};

// Atualiza o estoque de um grupo diretamente
// A quantidade definida será aplicada automaticamente para todas as peças do grupo
exports.updateGroupStock = async (req, res) => {
  const { id } = req.params;
  const { stock_quantity, reason = "manual_adjustment", cost } = req.body;

  if (stock_quantity === undefined || stock_quantity === null) {
    return res.status(400).json({ error: "Quantidade é obrigatória" });
  }

  if (stock_quantity < 0) {
    return res.status(400).json({ error: "Quantidade não pode ser negativa" });
  }

  // Validação do custo se fornecido
  if (cost !== undefined && cost !== null) {
    const costNum = parseFloat(cost);
    if (isNaN(costNum) || costNum < 0) {
      return res.status(400).json({ error: "Custo inválido" });
    }
  }

  try {
    // Atualiza o estoque do grupo
    const group = await partGroupModels.updateGroupStock(
      id,
      stock_quantity,
      reason,
      cost
    );
    if (!group) {
      return res.status(404).json({ error: "Grupo não encontrado" });
    }

    // Distribui a quantidade para todas as peças do grupo
    const partsResult = await partGroupModels.updateAllPartsStockInGroup(
      id,
      stock_quantity
    );

    res.status(200).json({
      ...group,
      partsUpdated: partsResult.partsUpdated,
      message: `Estoque do grupo atualizado e distribuído para ${partsResult.partsUpdated} peça(s)`,
    });
  } catch (error) {
    console.error("Erro ao atualizar estoque do grupo:", error);
    res.status(500).json({ error: "Erro ao atualizar estoque do grupo" });
  }
};

// Atualiza a quantidade ideal (qtde_ideal) de um grupo de compatibilidade
exports.updateGroupIdealQty = async (req, res) => {
  const { id } = req.params;
  const { qtde_ideal } = req.body;

  if (qtde_ideal !== null && qtde_ideal !== undefined) {
    const val = parseInt(qtde_ideal, 10);
    if (isNaN(val) || val < 0) {
      return res.status(400).json({ error: "Quantidade ideal inválida" });
    }
  }

  try {
    const group = await partGroupModels.updateGroupIdealQty(
      id,
      qtde_ideal !== null && qtde_ideal !== undefined
        ? parseInt(qtde_ideal, 10)
        : null,
    );
    if (!group) {
      return res.status(404).json({ error: "Grupo não encontrado" });
    }
    res.status(200).json(group);
  } catch (error) {
    console.error("Erro ao atualizar quantidade ideal do grupo:", error);
    res.status(500).json({ error: "Erro ao atualizar quantidade ideal" });
  }
};

// Ajusta estoque do grupo por delta (adicionar ou reduzir)
exports.adjustGroupStock = async (req, res) => {
  const { id } = req.params;
  const { delta, reason = "Ajuste_Manual" } = req.body;

  if (delta === undefined || delta === null) {
    return res.status(400).json({ error: "Campo delta é obrigatório" });
  }

  const deltaNum = parseInt(delta, 10);
  if (isNaN(deltaNum) || deltaNum === 0) {
    return res.status(400).json({ error: "Delta deve ser um numero inteiro diferente de zero" });
  }

  try {
    const group = await partGroupModels.adjustGroupStock(id, deltaNum, reason);
    if (!group) {
      return res.status(404).json({ error: "Grupo não encontrado" });
    }

    const partsResult = await partGroupModels.updateAllPartsStockInGroup(
      id,
      group.stock_quantity,
    );

    res.status(200).json({
      ...group,
      partsUpdated: partsResult.partsUpdated,
      message: `Estoque do grupo ajustado (${deltaNum > 0 ? "+" : ""}${deltaNum}) e distribuído para ${partsResult.partsUpdated} peça(s)`,
    });
  } catch (error) {
    console.error("Erro ao ajustar estoque do grupo:", error);
    if (error.message && error.message.includes("insuficiente")) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: "Erro ao ajustar estoque do grupo" });
  }
};

// Exclui um grupo de compatibilidade
exports.deleteGroup = async (req, res) => {
  const { id } = req.params;

  try {
    const group = await partGroupModels.deleteGroup(id);
    if (!group) {
      return res.status(404).json({ error: "Grupo não encontrado" });
    }
    res.status(200).json({ message: "Grupo excluído com sucesso", group });
  } catch (error) {
    console.error("Erro ao excluir grupo de compatibilidade:", error);
    res.status(500).json({ error: "Erro ao excluir grupo de peças" });
  }
};

// Adiciona uma variação de cor (procor) a um grupo de compatibilidade.
// Aceita procorid (variação com cor) ou procod (peça sem cor).
exports.addPartToGroup = async (req, res) => {
  const { id } = req.params;
  const { procorid, procod } = req.body;

  if (!procorid && !procod) {
    return res.status(400).json({ error: "ID da variação (procorid) ou ID da peça (procod) é obrigatório" });
  }

  try {
    let result;
    if (procorid) {
      result = await partGroupModels.addProcorToGroup(procorid, id);
    } else {
      result = await partGroupModels.addProcorToGroupByProcod(procod, id);
    }
    if (!result) {
      return res.status(404).json({ error: "Variação não encontrada ou grupo inválido" });
    }
    if (result.alreadyInGroup) {
      return res.status(200).json({ ...result, message: "Variação já pertence a este grupo" });
    }
    res.status(200).json(result);
  } catch (error) {
    console.error("Erro ao adicionar peça ao grupo:", error);
    res.status(500).json({ error: "Erro ao adicionar peça ao grupo" });
  }
};

// Remove uma variação de cor do grupo de compatibilidade
exports.removePartFromGroup = async (req, res) => {
  const { procorid } = req.params;

  try {
    const result = await partGroupModels.removeProcorFromGroup(procorid);
    if (!result) {
      return res.status(404).json({ error: "Variação não encontrada no grupo" });
    }
    res.status(200).json(result);
  } catch (error) {
    console.error("Erro ao remover peça do grupo:", error);
    res.status(500).json({ error: "Erro ao remover peça do grupo" });
  }
};

// Busca peças disponíveis para agrupamento (com filtro opcional por grupo)
exports.getAvailableParts = async (req, res) => {
  const { groupId } = req.query;

  try {
    const parts = await partGroupModels.getAvailableParts(groupId || null);
    res.status(200).json(parts);
  } catch (error) {
    console.error("Erro ao buscar peças disponíveis:", error);
    res.status(500).json({ error: "Erro ao buscar peças disponíveis" });
  }
};

// Busca todas as peças disponíveis com paginação
exports.getAvailablePart = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const search = req.query.search || "";
    
    const result = await partGroupModels.getAvailablePart(page, limit, search);
    res.status(200).json(result);
  } catch (error) {
    console.error("Erro ao buscar peças disponíveis:", error);
    res.status(500).json({ error: "Erro ao buscar peças disponíveis" });
  }
};

// Busca histórico de auditoria (movimentações) de um grupo
exports.getGroupAuditHistory = async (req, res) => {
  const { id } = req.params;
  const { limit = 50 } = req.query;

  try {
    const history = await partGroupModels.getGroupAuditHistory(
      id,
      parseInt(limit, 10)
    );
    res.status(200).json(history);
  } catch (error) {
    console.error("Erro ao buscar histórico do grupo:", error);
    res.status(500).json({ error: "Erro ao buscar histórico do grupo" });
  }
};
