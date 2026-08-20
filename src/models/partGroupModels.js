const pool = require("../config/db");

/**
 * Modelo de Grupos de Compatibilidade (Part Groups)
 *
 * Gerencia os grupos de compatibilidade para estoque compartilhado.
 * Peças no mesmo grupo compartilham a mesma quantidade de estoque.
 *
 * Estrutura das tabelas:
 * - part_groups: Tabela principal dos grupos (id INTEGER, name, stock_quantity)
 * - part_group_items: Vínculo entre grupo e variação de cor (group_id, procorid)
 * - part_group_audit: Histórico de movimentações de estoque
 *
 * IMPORTANTE: O campo id usa INTEGER simples (auto increment), não UUID.
 * O vínculo entre peça e grupo é feito via part_group_items (procorid), não via pro.part_group_id.
 */

/**
 * Lista todos os grupos de compatibilidade com contagem de peças
 * @returns {Array} Lista de grupos com informações resumidas
 */
async function listAllGroups() {
  const result = await pool.query(`
    SELECT 
      pg.id,
      pg.name,
      COALESCE(pg.stock_quantity, 0) AS stock_quantity,
      pg.grpcusto,
      pg.created_at,
      pg.updated_at,
      pg.color_id,
      COALESCE(co.cornome, '') AS color_name,
      COALESCE(co.corhex, '') AS color_hex,
      COUNT(pgi.id) AS parts_count
    FROM part_groups pg
    LEFT JOIN part_group_items pgi ON pgi.group_id = pg.id
    LEFT JOIN cores co ON co.corcod = pg.color_id
    GROUP BY pg.id, pg.name, pg.stock_quantity, pg.grpcusto, pg.created_at, pg.updated_at, pg.color_id, co.cornome, co.corhex
    ORDER BY pg.created_at desc
  `);
  return result.rows;
}

/**
 * Busca um grupo específico pelo ID, incluindo suas peças
 * @param {number} groupId - ID do grupo (INTEGER)
 * @returns {Object|null} Dados do grupo com lista de peças ou null se não encontrado
 */
async function getGroupById(groupId) {
  const groupResult = await pool.query(
    `
    SELECT 
      pg.id,
      pg.name,
      pg.stock_quantity,
      pg.grpcusto,
      pg.created_at,
      pg.updated_at,
      pg.color_id,
      COALESCE(co.cornome, '') AS color_name,
      COALESCE(co.corhex, '') AS color_hex
    FROM part_groups pg
    LEFT JOIN cores co ON co.corcod = pg.color_id
    WHERE pg.id = $1
  `,
    [groupId],
  );

  if (groupResult.rows.length === 0) {
    return null;
  }

  const partsResult = await pool.query(
    `
    SELECT
      pgi.id AS item_id,
      pgi.procorid,
      pc.procorprocod AS procod,
      p.prodes,
      p.provl,
      COALESCE(co.cornome, '') AS cornome,
      COALESCE(co.corhex, '') AS corhex,
      COALESCE(pc.procorqtde, 0) AS procorqtde,
      m.marcasdes,
      t.tipodes
    FROM part_group_items pgi
    JOIN procor pc ON pc.procorid = pgi.procorid
    JOIN pro p ON p.procod = pc.procorprocod
    LEFT JOIN cores co ON co.corcod = pc.procorcorescod
    LEFT JOIN marcas m ON m.marcascod = p.promarcascod
    LEFT JOIN tipo t ON t.tipocod = p.protipocod
    WHERE pgi.group_id = $1
    ORDER BY p.prodes, co.cornome
  `,
    [groupId],
  );

  return {
    ...groupResult.rows[0],
    parts: partsResult.rows,
  };
}

/**
 * Busca o grupo de uma peça específica
 * @param {number} partId - ID da peça (procod)
 * @returns {Object|null} Dados do grupo ou null se a peça não pertence a nenhum grupo
 */
async function getGroupByPartId(partId) {
  const result = await pool.query(
    `
    SELECT 
      pg.id,
      pg.name,
      pg.stock_quantity,
      pg.grpcusto,
      pg.created_at,
      pg.updated_at
    FROM part_groups pg
    JOIN part_group_items pgi ON pgi.group_id = pg.id
    JOIN procor pc ON pc.procorid = pgi.procorid
    WHERE pc.procorprocod = $1
    ORDER BY pg.id
    LIMIT 1
  `,
    [partId],
  );
  return result.rows[0] || null;
}

/**
 * Obtém a quantidade de estoque para uma peça
 * Se a peça pertence a um grupo (via part_group_items), retorna o estoque do grupo
 * Caso contrário, retorna o estoque individual da peça (proqtde)
 * @param {number} partId - ID da peça (procod)
 * @returns {Object|null} Informações de estoque ou null se peça não encontrada
 */
async function getGroupStock(partId) {
  const result = await pool.query(
    `
    SELECT 
      CASE 
        WHEN pg.id IS NOT NULL THEN pg.stock_quantity
        ELSE p.proqtde
      END as stock_quantity,
      pg.id as group_id,
      pg.name as group_name
    FROM pro p
    LEFT JOIN procor pc ON pc.procorprocod = p.procod
    LEFT JOIN part_group_items pgi ON pgi.procorid = pc.procorid
    LEFT JOIN part_groups pg ON pg.id = pgi.group_id
    WHERE p.procod = $1
    ORDER BY pg.id NULLS LAST
    LIMIT 1
  `,
    [partId],
  );

  if (result.rows.length === 0) {
    return null;
  }
  return result.rows[0];
}

/**
 * Decrementa o estoque do grupo de uma peça com bloqueio de transação
 * Usa SELECT ... FOR UPDATE para evitar condições de corrida (race conditions)
 * Se a peça não pertence a um grupo, decrementa o estoque individual
 * @param {number} partId - ID da peça (procod)
 * @param {number} qty - Quantidade a decrementar
 * @param {object} client - Cliente de transação (opcional, cria nova transação se não fornecido)
 * @returns {object} Resultado com status de sucesso e estoque atualizado
 * @throws {Error} Se estoque insuficiente ou peça não encontrada
 */
async function decrementGroupStock(partId, qty, client = null) {
  const shouldCommit = !client;
  const txClient = client || (await pool.connect());

  try {
    if (shouldCommit) await txClient.query("BEGIN");

    // Busca a peça com bloqueio para atualização
    const partResult = await txClient.query(
      `
      SELECT p.procod, p.prodes
      FROM pro p
      WHERE p.procod = $1
      FOR UPDATE
    `,
      [partId],
    );

    if (partResult.rows.length === 0) {
      throw new Error(`Peça com ID ${partId} não encontrada`);
    }

    const part = partResult.rows[0];

    // Busca o grupo via part_group_items (fonte de verdade da vinculação)
    const groupLookup = await txClient.query(
      `
      SELECT pgi.group_id
      FROM part_group_items pgi
      JOIN procor pc ON pc.procorid = pgi.procorid
      WHERE pc.procorprocod = $1
      LIMIT 1
    `,
      [partId],
    );

    const groupId = groupLookup.rows.length > 0 ? groupLookup.rows[0].group_id : null;

    if (!groupId) {
      // Peça não pertence a nenhum grupo, decrementa estoque individual
      const updateResult = await txClient.query(
        `
        UPDATE pro 
        SET proqtde = proqtde - $1
        WHERE procod = $2 AND proqtde >= $1
        RETURNING proqtde
      `,
        [qty, partId],
      );

      if (updateResult.rows.length === 0) {
        throw new Error("Estoque insuficiente");
      }

      if (shouldCommit) await txClient.query("COMMIT");
      return {
        success: true,
        newStock: updateResult.rows[0].proqtde,
        groupId: null,
      };
    }

    // Bloqueia e atualiza o estoque do grupo
    const groupResult = await txClient.query(
      `
      SELECT id, stock_quantity, name
      FROM part_groups
      WHERE id = $1
      FOR UPDATE
    `,
      [groupId],
    );

    if (groupResult.rows.length === 0) {
      throw new Error("Grupo de compatibilidade não encontrado");
    }

    const group = groupResult.rows[0];

    if (group.stock_quantity < qty) {
      throw new Error("Estoque do grupo insuficiente");
    }

    // Decrementa o estoque do grupo
    const updateResult = await txClient.query(
      `
      UPDATE part_groups 
      SET stock_quantity = stock_quantity - $1, updated_at = NOW()
      WHERE id = $2 AND stock_quantity >= $1
      RETURNING stock_quantity
    `,
      [qty, groupId],
    );

    if (updateResult.rows.length === 0) {
      throw new Error("Estoque do grupo insuficiente");
    }

    // Cria registro de auditoria
    await txClient.query(
      `
      INSERT INTO part_group_audit (part_group_id, change, reason, reference_id)
      VALUES ($1, $2, $3, $4)
    `,
      [groupId, -qty, "sale", partId.toString()],
    );

    if (shouldCommit) await txClient.query("COMMIT");

    return {
      success: true,
      newStock: updateResult.rows[0].stock_quantity,
      groupId: groupId,
      groupName: group.name,
    };
  } catch (error) {
    if (shouldCommit) await txClient.query("ROLLBACK");
    throw error;
  } finally {
    if (shouldCommit) txClient.release();
  }
}

/**
 * Incrementa o estoque do grupo de uma peça com bloqueio de transação
 * Se a peça não pertence a um grupo, incrementa o estoque individual
 * @param {number} partId - ID da peça (procod)
 * @param {number} qty - Quantidade a incrementar
 * @param {string} reason - Motivo do incremento (ex: 'manual', 'devolução')
 * @param {object} client - Cliente de transação (opcional)
 * @returns {object} Resultado com status de sucesso e estoque atualizado
 */
async function incrementGroupStock(
  partId,
  qty,
  reason = "manual",
  client = null,
) {
  const shouldCommit = !client;
  const txClient = client || (await pool.connect());

  try {
    if (shouldCommit) await txClient.query("BEGIN");

    // Busca a peça
    const partResult = await txClient.query(
      `
      SELECT p.procod, p.prodes
      FROM pro p
      WHERE p.procod = $1
    `,
      [partId],
    );

    if (partResult.rows.length === 0) {
      throw new Error(`Peça com ID ${partId} não encontrada`);
    }

    // Busca o grupo via part_group_items (fonte de verdade da vinculação)
    const groupLookup = await txClient.query(
      `
      SELECT pgi.group_id
      FROM part_group_items pgi
      JOIN procor pc ON pc.procorid = pgi.procorid
      WHERE pc.procorprocod = $1
      LIMIT 1
    `,
      [partId],
    );

    const groupId = groupLookup.rows.length > 0 ? groupLookup.rows[0].group_id : null;

    if (!groupId) {
      // Peça não pertence a nenhum grupo, incrementa estoque individual
      const updateResult = await txClient.query(
        `
        UPDATE pro 
        SET proqtde = proqtde + $1
        WHERE procod = $2
        RETURNING proqtde
      `,
        [qty, partId],
      );

      if (shouldCommit) await txClient.query("COMMIT");
      return {
        success: true,
        newStock: updateResult.rows[0].proqtde,
        groupId: null,
      };
    }

    // Atualiza o estoque do grupo
    const updateResult = await txClient.query(
      `
      UPDATE part_groups 
      SET stock_quantity = stock_quantity + $1, updated_at = NOW()
      WHERE id = $2
      RETURNING stock_quantity
    `,
      [qty, groupId],
    );

    // Cria registro de auditoria
    await txClient.query(
      `
      INSERT INTO part_group_audit (part_group_id, change, reason, reference_id)
      VALUES ($1, $2, $3, $4)
    `,
      [groupId, qty, reason, partId.toString()],
    );

    if (shouldCommit) await txClient.query("COMMIT");

    return {
      success: true,
      newStock: updateResult.rows[0].stock_quantity,
      groupId: groupId,
    };
  } catch (error) {
    if (shouldCommit) await txClient.query("ROLLBACK");
    throw error;
  } finally {
    if (shouldCommit) txClient.release();
  }
}

/**
 * Cria um novo grupo de compatibilidade
 * @param {string} name - Nome do grupo
 * @param {number} stockQuantity - Quantidade inicial de estoque (padrão: 0)
 * @returns {Object} Grupo criado
 */
async function createGroup(name, stockQuantity = 0, colorId = null) {
  const result = await pool.query(
    `
    INSERT INTO part_groups (name, stock_quantity, color_id)
    VALUES ($1, $2, $3)
    RETURNING *
  `,
    [name, stockQuantity, colorId || null],
  );
  return result.rows[0];
}

/**
 * Atualiza um grupo de compatibilidade
 * @param {number} groupId - ID do grupo (INTEGER)
 * @param {string} name - Novo nome do grupo
 * @param {number|null} stockQuantity - Nova quantidade de estoque (opcional)
 * @returns {Object|null} Grupo atualizado ou null se não encontrado
 */
async function updateGroup(groupId, name, stockQuantity = null, colorId = undefined) {
  let setClauses = ["name = $1", "updated_at = NOW()"];
  let params = [name];
  let paramIndex = 2;

  if (stockQuantity !== null) {
    setClauses.push(`stock_quantity = $${paramIndex}`);
    params.push(stockQuantity);
    paramIndex++;
  }

  if (colorId !== undefined) {
    setClauses.push(`color_id = $${paramIndex}`);
    params.push(colorId || null);
    paramIndex++;
  }

  params.push(groupId);
  const query = `
    UPDATE part_groups 
    SET ${setClauses.join(", ")}
    WHERE id = $${paramIndex}
    RETURNING *
  `;

  const result = await pool.query(query, params);
  return result.rows[0] || null;
}

/**
 * Exclui um grupo de compatibilidade
 * As peças vinculadas terão part_group_id definido como NULL (ON DELETE SET NULL)
 * @param {number} groupId - ID do grupo (INTEGER)
 * @returns {Object|null} Grupo excluído ou null se não encontrado
 */
async function deleteGroup(groupId) {
  const result = await pool.query(
    `
    DELETE FROM part_groups WHERE id = $1 RETURNING *
  `,
    [groupId],
  );
  return result.rows[0] || null;
}

/**
 * Adiciona uma variação de cor (procor) a um grupo de compatibilidade.
 * O vínculo é feito via tabela part_group_items, usando procorid como chave.
 * Isso permite que o mesmo produto (procod) apareça em múltiplos grupos
 * desde que com cores (procorid) diferentes.
 *
 * Quando o grupo já possui estoque definido (stock_quantity > 0), o campo
 * procorqtde da variação recém-adicionada é atualizado para herdar esse
 * estoque imediatamente, garantindo sincronização instantânea.
 *
 * @param {number} procorid - ID da variação (PK de procor)
 * @param {number} groupId - ID do grupo (INTEGER)
 * @returns {Object|null} Dados da variação adicionada (com procorqtde atualizado) ou null se não encontrada
 */
async function addProcorToGroup(procorid, groupId) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Verifica se o grupo existe
    const groupResult = await client.query(
      `SELECT id, grpcusto, stock_quantity FROM part_groups WHERE id = $1`,
      [groupId],
    );

    if (groupResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return null;
    }

    const group = groupResult.rows[0];

    // Verifica se o procorid existe e busca seus dados
    const procorResult = await client.query(
      `SELECT pc.procorid, pc.procorprocod, pc.procorcorescod, pc.procorqtde,
              p.prodes, COALESCE(co.cornome, '') AS cornome, COALESCE(co.corhex, '') AS corhex
       FROM procor pc
       JOIN pro p ON p.procod = pc.procorprocod
       LEFT JOIN cores co ON co.corcod = pc.procorcorescod
       WHERE pc.procorid = $1`,
      [procorid],
    );

    if (procorResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return null;
    }

    const procor = procorResult.rows[0];

    // Insere na tabela de itens do grupo (ignora conflito se já existe)
    const insertResult = await client.query(
      `INSERT INTO part_group_items (group_id, procorid)
       VALUES ($1, $2)
       ON CONFLICT ON CONSTRAINT uq_part_group_item DO NOTHING
       RETURNING id`,
      [groupId, procorid],
    );

    const alreadyInGroup = insertResult.rowCount === 0;

    // Atualiza custo do produto se o grupo tiver custo definido
    if (group.grpcusto !== null && group.grpcusto !== undefined) {
      await client.query(
        `UPDATE pro SET procusto = $1 WHERE procod = $2`,
        [group.grpcusto, procor.procorprocod],
      );
    }

    // Herda o estoque do grupo: atualiza procorqtde da variação recém-adicionada
    // para refletir o estoque atual do grupo, garantindo sincronização imediata.
    let finalQtde = procor.procorqtde;
    if (!alreadyInGroup && group.stock_quantity != null) {
      await client.query(
        `UPDATE procor SET procorqtde = $1 WHERE procorid = $2`,
        [group.stock_quantity, procorid],
      );
      finalQtde = group.stock_quantity;
    }

    await client.query("COMMIT");
    return { ...procor, procorqtde: finalQtde, alreadyInGroup };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Adiciona uma peça sem cor a um grupo de compatibilidade.
 * Localiza ou cria um registro procor com procorcorescod = NULL para a peça
 * e então adiciona esse procorid ao grupo — tudo em uma única transação atômica.
 *
 * @param {number} procod - ID da peça (PK de pro)
 * @param {number} groupId - ID do grupo (INTEGER)
 * @returns {Object|null} Dados da variação adicionada ou null se peça/grupo não encontrado
 */
async function addProcorToGroupByProcod(procod, groupId) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Verifica se a peça existe e está ativa
    const partResult = await client.query(
      `SELECT procod FROM pro WHERE procod = $1 AND prosit = 'A'`,
      [procod],
    );

    if (partResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return null;
    }

    // Verifica se o grupo existe
    const groupResult = await client.query(
      `SELECT id, grpcusto, stock_quantity FROM part_groups WHERE id = $1`,
      [groupId],
    );

    if (groupResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return null;
    }

    const group = groupResult.rows[0];

    // Busca ou cria registro procor com cor nula para esta peça
    let procorSelectResult = await client.query(
      `SELECT pc.procorid, pc.procorprocod, pc.procorcorescod, pc.procorqtde,
              p.prodes, COALESCE(co.cornome, '') AS cornome, COALESCE(co.corhex, '') AS corhex
       FROM procor pc
       JOIN pro p ON p.procod = pc.procorprocod
       LEFT JOIN cores co ON co.corcod = pc.procorcorescod
       WHERE pc.procorprocod = $1 AND pc.procorcorescod IS NULL`,
      [procod],
    );

    let procor;
    if (procorSelectResult.rows.length > 0) {
      procor = procorSelectResult.rows[0];
    } else {
      const insertProcor = await client.query(
        `INSERT INTO procor (procorprocod, procorcorescod) VALUES ($1, NULL)
         ON CONFLICT DO NOTHING
         RETURNING procorid, procorprocod, procorcorescod, procorqtde`,
        [procod],
      );
      // Busca também prodes para completar o objeto
      const proResult = await client.query(
        `SELECT prodes FROM pro WHERE procod = $1`,
        [procod],
      );
      // Se ON CONFLICT DO NOTHING impediu o insert (raro), busca o registro existente
      let inserted = insertProcor.rows[0];
      if (!inserted) {
        const refetch = await client.query(
          `SELECT pc.procorid, pc.procorprocod, pc.procorcorescod, pc.procorqtde
           FROM procor pc
           WHERE pc.procorprocod = $1 AND pc.procorcorescod IS NULL`,
          [procod],
        );
        inserted = refetch.rows[0];
        if (!inserted) {
          await client.query("ROLLBACK");
          return null;
        }
      }
      procor = { ...inserted, prodes: proResult.rows[0].prodes, cornome: "", corhex: "" };
    }

    const procorid = procor.procorid;

    // Insere na tabela de itens do grupo (ignora conflito se já existe)
    const insertResult = await client.query(
      `INSERT INTO part_group_items (group_id, procorid)
       VALUES ($1, $2)
       ON CONFLICT ON CONSTRAINT uq_part_group_item DO NOTHING
       RETURNING id`,
      [groupId, procorid],
    );

    const alreadyInGroup = insertResult.rowCount === 0;

    // Atualiza custo do produto se o grupo tiver custo definido
    if (group.grpcusto !== null && group.grpcusto !== undefined) {
      await client.query(
        `UPDATE pro SET procusto = $1 WHERE procod = $2`,
        [group.grpcusto, procod],
      );
    }

    // Herda o estoque do grupo: atualiza procorqtde da variação recém-adicionada
    let finalQtde = procor.procorqtde;
    if (!alreadyInGroup && group.stock_quantity != null) {
      await client.query(
        `UPDATE procor SET procorqtde = $1 WHERE procorid = $2`,
        [group.stock_quantity, procorid],
      );
      finalQtde = group.stock_quantity;
    }

    await client.query("COMMIT");
    return { ...procor, procorqtde: finalQtde, alreadyInGroup };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Remove uma variação de cor (procorid) de um grupo via tabela part_group_items.
 * @param {number} procorid - ID da variação (PK de procor)
 * @returns {Object|null} Registro removido ou null se não encontrado
 */
async function removeProcorFromGroup(procorid) {
  const result = await pool.query(
    `DELETE FROM part_group_items WHERE procorid = $1 RETURNING *`,
    [procorid],
  );
  return result.rows[0] || null;
}

/**
 * Busca peças disponíveis para agrupamento
 * Retorna peças que não estão em nenhum grupo ou que estão no grupo especificado
 * @param {number|null} currentGroupId - ID do grupo atual (opcional)
 * @returns {Array} Lista de peças disponíveis
 */
async function getAvailableParts(currentGroupId = null) {
  let query, params;

  if (currentGroupId) {
    query = `
      SELECT 
        p.procod,
        p.prodes,
        p.provl,
        p.proqtde,
        p.part_group_id,
        m.marcasdes,
        t.tipodes
      FROM pro p
      LEFT JOIN marcas m ON m.marcascod = p.promarcascod
      LEFT JOIN tipo t ON t.tipocod = p.protipocod
      WHERE NOT EXISTS (
        SELECT 1 FROM part_group_items pgi
        JOIN procor pc ON pc.procorid = pgi.procorid
        WHERE pc.procorprocod = p.procod
      ) OR EXISTS (
        SELECT 1 FROM part_group_items pgi
        JOIN procor pc ON pc.procorid = pgi.procorid
        WHERE pc.procorprocod = p.procod AND pgi.group_id = $1
      )
      ORDER BY p.prodes
    `;
    params = [currentGroupId];
  } else {
    query = `
      SELECT 
        p.procod,
        p.prodes,
        p.provl,
        p.proqtde,
        p.part_group_id,
        m.marcasdes,
        t.tipodes
      FROM pro p
      LEFT JOIN marcas m ON m.marcascod = p.promarcascod
      LEFT JOIN tipo t ON t.tipocod = p.protipocod
      WHERE NOT EXISTS (
        SELECT 1 FROM part_group_items pgi
        JOIN procor pc ON pc.procorid = pgi.procorid
        WHERE pc.procorprocod = p.procod
      )
      ORDER BY p.prodes
    `;
    params = [];
  }

  const result = await pool.query(query, params);
  return result.rows;
}

/**
 * Busca todas as peças disponíveis para agrupamento com paginação e informações de cor
 * @param {number} page - Número da página (padrão: 1)
 * @param {number} limit - Quantidade de itens por página (padrão: 20)
 * @param {string} search - Termo de busca (opcional)
 * @returns {Object} Objeto com dados paginados e informações de cores
 */
async function getAvailablePart(page = 1, limit = 20, search = "") {
  const offset = (page - 1) * limit;

  // Preparar termo de busca
  const searchTerm =
    search && search.trim() !== "" ? `%${search.trim()}%` : null;

  // Construir filtro de busca se fornecido
  let searchFilter = "";
  const params = [];

  if (searchTerm) {
    searchFilter = `AND (
      p.prodes ILIKE $${params.length + 1} OR 
      m.marcasdes ILIKE $${params.length + 1} OR 
      t.tipodes ILIKE $${params.length + 1} OR
      p.procod::text ILIKE $${params.length + 1}
    )`;
    params.push(searchTerm);
  }

  // Query para obter as peças com informações de cores
  const query = `
    SELECT 
      p.procod,
      p.prodes,
      p.provl,
      p.proqtde,
      p.part_group_id,
      m.marcasdes,
      t.tipodes,
      CASE 
        WHEN COUNT(pc.procorcorescod) > 0 THEN true 
        ELSE false 
      END as has_colors,
      COALESCE(
        json_agg(
          json_build_object(
            'corcod', c.corcod,
            'cornome', c.cornome,
            'procorqtde', pc.procorqtde,
            'procorid', pc.procorid
          ) ORDER BY c.cornome
        ) FILTER (WHERE pc.procorcorescod IS NOT NULL),
        '[]'::json
      ) as colors
    FROM pro p
    LEFT JOIN marcas m ON m.marcascod = p.promarcascod
    LEFT JOIN tipo t ON t.tipocod = p.protipocod
    LEFT JOIN procor pc ON pc.procorprocod = p.procod
    LEFT JOIN cores c ON c.corcod = pc.procorcorescod
    WHERE p.prosit = 'A' ${searchFilter}
    GROUP BY p.procod, p.prodes, p.provl, p.proqtde, p.part_group_id, m.marcasdes, t.tipodes
    ORDER BY p.prodes
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
  `;

  params.push(limit, offset);

  // Query para contar o total de peças
  const countQuery = `
    SELECT COUNT(DISTINCT p.procod) as total
    FROM pro p
    LEFT JOIN marcas m ON m.marcascod = p.promarcascod
    LEFT JOIN tipo t ON t.tipocod = p.protipocod
    WHERE p.prosit = 'A' ${searchFilter}
  `;

  const countParams = searchTerm ? [searchTerm] : [];

  const [dataResult, countResult] = await Promise.all([
    pool.query(query, params),
    pool.query(countQuery, countParams),
  ]);

  const total = parseInt(countResult.rows[0].total, 10);
  const totalPages = Math.ceil(total / limit);

  return {
    data: dataResult.rows,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasMore: page < totalPages,
    },
  };
}

/**
 * Busca o histórico de auditoria (movimentações) de um grupo
 * @param {number} groupId - ID do grupo (INTEGER)
 * @param {number} limit - Quantidade máxima de registros (padrão: 50)
 * @returns {Array} Lista de registros de auditoria
 */
async function getGroupAuditHistory(groupId, limit = 50) {
  const result = await pool.query(
    `
    SELECT 
      a.id,
      a.change,
      a.reason,
      a.reference_id,
      a.created_at,
      p.prodes as part_name
    FROM part_group_audit a
    LEFT JOIN pro p ON p.procod::text = a.reference_id
    WHERE a.part_group_id = $1
    ORDER BY a.created_at DESC
    LIMIT $2
  `,
    [groupId, limit],
  );
  return result.rows;
}

/**
 * Atualiza o estoque de um grupo diretamente (para ajustes manuais)
 * Cria registro de auditoria automaticamente
 * @param {number} groupId - ID do grupo (INTEGER)
 * @param {number} newQuantity - Nova quantidade de estoque
 * @param {string} reason - Motivo do ajuste (padrão: 'manual_adjustment')
 * @returns {Object} Grupo atualizado
 */
async function updateGroupStock(
  groupId,
  newQuantity,
  reason = "Ajuste_Manual",
  newCost = null,
) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Busca o estoque atual fixo do grupo (stock_quantity) para calcular a diferença
    const groupExists = await client.query(
      `SELECT id, COALESCE(stock_quantity, 0) AS stock_quantity FROM part_groups WHERE id = $1 FOR UPDATE`,
      [groupId],
    );

    if (groupExists.rows.length === 0) {
      throw new Error("Grupo não encontrado");
    }

    const currentStock = Number(groupExists.rows[0].stock_quantity);
    const change = newQuantity - currentStock;

    // Atualiza stock_quantity e custo na tabela part_groups
    let updateResult;
    if (newCost !== null && newCost !== undefined) {
      updateResult = await client.query(
        `
        UPDATE part_groups 
        SET stock_quantity = $1, grpcusto = $2, updated_at = NOW()
        WHERE id = $3
        RETURNING *
      `,
        [newQuantity, newCost, groupId],
      );

      // Atualiza o custo dos produtos vinculados via part_group_items
      await client.query(
        `
        UPDATE pro 
        SET procusto = $1
        WHERE procod IN (
          SELECT DISTINCT pc.procorprocod
          FROM part_group_items pgi
          JOIN procor pc ON pc.procorid = pgi.procorid
          WHERE pgi.group_id = $2
        )
      `,
        [newCost, groupId],
      );
    } else {
      updateResult = await client.query(
        `
        UPDATE part_groups 
        SET stock_quantity = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING *
      `,
        [newQuantity, groupId],
      );
    }

    // Atualiza procorqtde para todas as variações vinculadas ao grupo
    await client.query(
      `
      UPDATE procor pc
      SET procorqtde = $1
      FROM part_group_items pgi
      WHERE pgi.group_id = $2 AND pgi.procorid = pc.procorid
    `,
      [newQuantity, groupId],
    );

    // Sincroniza pro.proqtde para peças ainda ligadas por part_group_id legado
    await client.query(
      `
      UPDATE pro
      SET proqtde = $1
      WHERE part_group_id = $2
    `,
      [newQuantity, groupId],
    );

    // Cria registro de auditoria se houve alteração
    if (change !== 0) {
      await client.query(
        `
        INSERT INTO part_group_audit (part_group_id, change, reason)
        VALUES ($1, $2, $3)
      `,
        [groupId, change, reason],
      );
    }

    await client.query("COMMIT");
    return updateResult.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Atualiza o estoque de TODAS as variações procor vinculadas a um grupo via part_group_items.
 * Também atualiza proqtde dos produtos correspondentes.
 *
 * @param {number} groupId - ID do grupo
 * @param {number} quantity - Nova quantidade para todas as variações
 * @returns {Object} Resultado da atualização com quantidade de variações atualizadas
 */
async function updateAllPartsStockInGroup(groupId, quantity) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Atualiza procorqtde de todas as variações vinculadas ao grupo
    const updateResult = await client.query(
      `
      UPDATE procor pc
      SET procorqtde = $1
      FROM part_group_items pgi
      WHERE pgi.group_id = $2 AND pgi.procorid = pc.procorid
    `,
      [quantity, groupId],
    );

    await client.query("COMMIT");

    return {
      success: true,
      partsUpdated: updateResult.rowCount,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Valida e decrementa estoque para múltiplos itens de venda em uma única transação atômica.
 *
 * Esta função implementa a lógica de sincronização de estoque entre grupos:
 * - Para peças sem grupo: decrementa apenas o estoque individual (proqtde)
 * - Para peças com grupo:
 *   a) Se o grupo tem stock_quantity definido (não nulo): usa esse campo como fonte da verdade
 *      e sincroniza todas as peças do grupo para o mesmo valor
 *   b) Se o grupo NÃO tem stock_quantity definido: valida e decrementa cada peça individualmente
 *
 * @param {Array<{partId: number, quantidade: number}>} itens - Lista de itens a vender
 * @param {string} referenceId - ID de referência para auditoria (ex: pvcod)
 * @returns {Object} Resultado com status de sucesso e detalhes
 * @throws {Error} Se estoque insuficiente ou qualquer erro de validação
 */
async function venderItens(itens, referenceId = null) {
  if (!Array.isArray(itens) || itens.length === 0) {
    throw new Error("Lista de itens vazia ou inválida");
  }

  // Sanitiza o referenceId - apenas caracteres alfanuméricos, hífen e underscore são permitidos
  let sanitizedReferenceId = null;
  if (referenceId !== null && referenceId !== undefined) {
    sanitizedReferenceId = String(referenceId).replace(/[^a-zA-Z0-9_-]/g, "");
    if (sanitizedReferenceId.length > 100) {
      sanitizedReferenceId = sanitizedReferenceId.substring(0, 100);
    }
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const resultados = [];
    const gruposProcessados = new Map(); // Para evitar processar o mesmo grupo múltiplas vezes

    for (const item of itens) {
      const { partId, quantidade } = item;

      if (!partId || !quantidade || quantidade <= 0) {
        throw new Error(
          `Item inválido: partId=${partId}, quantidade=${quantidade}`,
        );
      }

      // Busca a peça com bloqueio para atualização
      const partResult = await client.query(
        `
        SELECT p.procod, p.prodes, p.proqtde
        FROM pro p
        WHERE p.procod = $1
        FOR UPDATE
      `,
        [partId],
      );

      if (partResult.rows.length === 0) {
        throw new Error(`Peça com ID ${partId} não encontrada`);
      }

      const part = partResult.rows[0];

      // Busca o grupo via part_group_items (fonte de verdade da vinculação)
      const groupLookup = await client.query(
        `
        SELECT pgi.group_id
        FROM part_group_items pgi
        JOIN procor pc ON pc.procorid = pgi.procorid
        WHERE pc.procorprocod = $1
        LIMIT 1
      `,
        [partId],
      );

      const groupId = groupLookup.rows.length > 0 ? groupLookup.rows[0].group_id : null;

      // CASO 1: Peça não pertence a nenhum grupo
      if (!groupId) {
        // Verifica estoque individual
        if (part.proqtde < quantidade) {
          throw new Error(
            `Estoque insuficiente para a peça "${part.prodes}" (ID: ${partId}). ` +
              `Disponível: ${part.proqtde}, Solicitado: ${quantidade}`,
          );
        }

        // Decrementa estoque individual
        const updateResult = await client.query(
          `
          UPDATE pro 
          SET proqtde = proqtde - $1
          WHERE procod = $2
          RETURNING proqtde
        `,
          [quantidade, partId],
        );

        resultados.push({
          partId,
          partName: part.prodes,
          quantidadeVendida: quantidade,
          novoEstoque: updateResult.rows[0].proqtde,
          grupoPertence: false,
        });

        continue;
      }

      // CASO 2: Peça pertence a um grupo

      // Verifica se já processamos este grupo (para itens do mesmo grupo no carrinho)
      if (gruposProcessados.has(groupId)) {
        // Acumula a quantidade adicional para o mesmo grupo
        gruposProcessados.get(groupId).quantidadeTotal += quantidade;
        gruposProcessados
          .get(groupId)
          .itens.push({ partId, partName: part.prodes, quantidade });
        continue;
      }

      // Marca o grupo como em processamento
      gruposProcessados.set(groupId, {
        quantidadeTotal: quantidade,
        itens: [{ partId, partName: part.prodes, quantidade }],
      });
    }

    // Processa cada grupo acumulado
    for (const [groupId, grupoInfo] of gruposProcessados) {
      const { quantidadeTotal, itens: itensDoGrupo } = grupoInfo;

      // Busca e bloqueia o grupo para atualização
      const groupResult = await client.query(
        `
        SELECT id, name, stock_quantity
        FROM part_groups
        WHERE id = $1
        FOR UPDATE
      `,
        [groupId],
      );

      if (groupResult.rows.length === 0) {
        throw new Error(
          `Grupo de compatibilidade (ID: ${groupId}) não encontrado`,
        );
      }

      const group = groupResult.rows[0];

      // CASO 2a: Grupo TEM stock_quantity definido (não nulo)
      // Neste caso, todas as peças do grupo compartilham o mesmo estoque conceitual.
      // Ao vender, decrementamos todas as peças simultaneamente.
      if (group.stock_quantity !== null) {
        // Busca todas as peças do grupo com bloqueio para validação e atualização
        const pecasGrupoResult = await client.query(
          `
          SELECT p.procod, p.prodes, p.proqtde
          FROM pro p
          JOIN part_group_items pgi ON pgi.group_id = $1
          JOIN procor pc ON pc.procorid = pgi.procorid AND pc.procorprocod = p.procod
          GROUP BY p.procod, p.prodes, p.proqtde
          ORDER BY p.proqtde DESC, p.procod ASC
          FOR UPDATE OF p
        `,
          [groupId],
        );

        // Calcula o estoque mínimo disponível no grupo (todas as peças devem poder decrementar)
        const estoqueMinimo = Math.min(
          ...pecasGrupoResult.rows.map((p) => p.proqtde || 0),
        );

        // Valida que o estoque mínimo é suficiente para a quantidade solicitada
        if (estoqueMinimo < quantidadeTotal) {
          throw new Error(
            `Estoque insuficiente no grupo "${group.name}". ` +
              `Disponível: ${estoqueMinimo}, Solicitado: ${quantidadeTotal}`,
          );
        }

        // Decrementa o estoque de TODAS as peças do grupo (compartilham estoque)
        await client.query(
          `
          UPDATE pro 
          SET proqtde = proqtde - $1
          WHERE procod IN (
            SELECT pc.procorprocod
            FROM part_group_items pgi
            JOIN procor pc ON pc.procorid = pgi.procorid
            WHERE pgi.group_id = $2
          )
        `,
          [quantidadeTotal, groupId],
        );

        // Atualiza o estoque do grupo para MIN(estoque das peças)
        const minEstoqueResult = await client.query(
          `
          SELECT COALESCE(MIN(p.proqtde), 0) as min_estoque
          FROM pro p
          JOIN part_group_items pgi ON pgi.group_id = $1
          JOIN procor pc ON pc.procorid = pgi.procorid AND pc.procorprocod = p.procod
        `,
          [groupId],
        );

        const novoEstoqueGrupo = minEstoqueResult.rows[0].min_estoque;

        // Atualiza o estoque do grupo
        await client.query(
          `
          UPDATE part_groups 
          SET stock_quantity = $1, updated_at = NOW()
          WHERE id = $2
        `,
          [novoEstoqueGrupo, groupId],
        );

        // Cria registros de auditoria para cada peça vendida
        // reference_id é o código do produto (procod) para identificar a peça no histórico
        for (const itemGrupo of itensDoGrupo) {
          await client.query(
            `
            INSERT INTO part_group_audit (part_group_id, change, reason, reference_id)
            VALUES ($1, $2, $3, $4)
          `,
            [groupId, -itemGrupo.quantidade, "Venda", String(itemGrupo.partId)],
          );

          resultados.push({
            partId: itemGrupo.partId,
            partName: itemGrupo.partName,
            quantidadeVendida: itemGrupo.quantidade,
            novoEstoque: novoEstoqueGrupo,
            grupoPertence: true,
            grupoId: groupId,
            grupoNome: group.name,
            estoqueGrupoUsado: true,
          });
        }
      } else {
        // CASO 2b: Grupo NÃO tem stock_quantity definido (nulo)
        // Distribui a retirada entre as peças do grupo, preferindo peças com maior estoque

        // Busca todas as peças do grupo com bloqueio, ordenadas por estoque DESC, id ASC
        const pecasGrupoResult = await client.query(
          `
          SELECT p.procod, p.prodes, p.proqtde
          FROM pro p
          JOIN part_group_items pgi ON pgi.group_id = $1
          JOIN procor pc ON pc.procorid = pgi.procorid AND pc.procorprocod = p.procod
          GROUP BY p.procod, p.prodes, p.proqtde
          ORDER BY p.proqtde DESC, p.procod ASC
          FOR UPDATE OF p
        `,
          [groupId],
        );

        // Calcula o estoque total disponível no grupo
        const estoqueTotal = pecasGrupoResult.rows.reduce(
          (sum, p) => sum + (p.proqtde || 0),
          0,
        );

        // Valida que o estoque total do grupo é suficiente
        if (estoqueTotal < quantidadeTotal) {
          throw new Error(
            `Estoque insuficiente no grupo "${group.name}". ` +
              `Disponível (soma das peças): ${estoqueTotal}, Solicitado: ${quantidadeTotal}`,
          );
        }

        // Distribui a retirada entre as peças, começando pelas de maior estoque
        let restanteATirar = quantidadeTotal;
        const pecasAfetadas = [];

        for (const pecaGrupo of pecasGrupoResult.rows) {
          if (restanteATirar <= 0) break;

          const estoqueAtual = pecaGrupo.proqtde || 0;
          const tirarDestaPeca = Math.min(estoqueAtual, restanteATirar);

          if (tirarDestaPeca > 0) {
            // Atualiza o estoque desta peça
            await client.query(
              `
              UPDATE pro 
              SET proqtde = proqtde - $1
              WHERE procod = $2
            `,
              [tirarDestaPeca, pecaGrupo.procod],
            );

            pecasAfetadas.push({
              procod: pecaGrupo.procod,
              prodes: pecaGrupo.prodes,
              quantidadeRetirada: tirarDestaPeca,
              novoEstoque: estoqueAtual - tirarDestaPeca,
            });

            restanteATirar -= tirarDestaPeca;
          }
        }

        // Cria registros de auditoria para cada peça afetada
        // reference_id é o código do produto (procod) para identificar a peça no histórico
        for (const pecaAfetada of pecasAfetadas) {
          await client.query(
            `
            INSERT INTO part_group_audit (part_group_id, change, reason, reference_id)
            VALUES ($1, $2, $3, $4)
          `,
            [
              groupId,
              -pecaAfetada.quantidadeRetirada,
              "Venda",
              String(pecaAfetada.procod),
            ],
          );
        }

        for (const itemGrupo of itensDoGrupo) {
          resultados.push({
            partId: itemGrupo.partId,
            partName: itemGrupo.partName,
            quantidadeVendida: itemGrupo.quantidade,
            novoEstoque: null, // Cada peça pode ter estoque diferente após a distribuição
            grupoPertence: true,
            grupoId: groupId,
            grupoNome: group.name,
            estoqueGrupoUsado: false,
            pecasAfetadas: pecasAfetadas,
          });
        }
      }
    }

    await client.query("COMMIT");

    return {
      success: true,
      itensProcessados: resultados,
      totalItens: itens.length,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Atualiza a quantidade ideal (qtde_ideal) de um grupo de compatibilidade
 * @param {number} groupId - ID do grupo (INTEGER)
 * @param {number|null} qtdeIdeal - Quantidade ideal de estoque (null para remover)
 * @returns {Object|null} Grupo atualizado ou null se não encontrado
 */
async function updateGroupIdealQty(groupId, qtdeIdeal) {
  const result = await pool.query(
    `
    UPDATE part_groups
    SET qtde_ideal = $1, updated_at = NOW()
    WHERE id = $2
    RETURNING id, name, stock_quantity, qtde_ideal
  `,
    [qtdeIdeal, groupId],
  );
  return result.rows[0] || null;
}

/**
 * Ajusta o estoque de um grupo por delta (adicionar ou reduzir)
 * Delega para updateGroupStock após calcular o novo valor absoluto.
 * @param {number} groupId - ID do grupo (INTEGER)
 * @param {number} delta - Quantidade a adicionar (positivo) ou reduzir (negativo)
 * @param {string} reason - Motivo do ajuste
 * @param {number|null} newCost - Novo custo do grupo (opcional)
 * @returns {Object} Grupo atualizado com novo estoque
 * @throws {Error} Se o novo estoque ficar negativo
 */
async function adjustGroupStock(groupId, delta, reason = "Ajuste_Manual", newCost = null) {
  const groupResult = await pool.query(
    `SELECT id, COALESCE(stock_quantity, 0) AS stock_quantity FROM part_groups WHERE id = $1`,
    [groupId],
  );

  if (groupResult.rows.length === 0) {
    throw new Error("Grupo não encontrado");
  }

  const currentStock = Number(groupResult.rows[0].stock_quantity);
  const newStock = currentStock + delta;

  if (newStock < 0) {
    throw new Error(
      `Estoque insuficiente. Estoque atual: ${currentStock}, Redução solicitada: ${Math.abs(delta)}`,
    );
  }

  return updateGroupStock(groupId, newStock, reason, newCost);
}

module.exports = {
  listAllGroups,
  getGroupById,
  getGroupByPartId,
  getGroupStock,
  decrementGroupStock,
  incrementGroupStock,
  createGroup,
  updateGroup,
  deleteGroup,
  addProcorToGroup,
  addProcorToGroupByProcod,
  removeProcorFromGroup,
  getAvailableParts,
  getAvailablePart,
  getGroupAuditHistory,
  updateGroupStock,
  updateAllPartsStockInGroup,
  venderItens,
  updateGroupIdealQty,
  adjustGroupStock,
};
