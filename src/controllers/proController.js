const pool = require("../config/db");

exports.listarProduto = async (req, res) => {
  const { id } = req.params;
  const { marca, modelo } = req.query;

  try {
    // Busca produtos que estão vinculados ao modelo pela nova tabela promod
    // ou pelo campo legado promodcod (para compatibilidade)
    const result = await pool.query(
      `select distinct procod, prodes, provl,procusto, tipodes, prosemest, proordem from pro 
        join tipo on tipocod = protipocod
        left join promod on promodprocod = procod
        where promarcascod = $1 
          and (promodmodcod = $2 OR promodcod = $2)
          and protipocod = $3
        order by proordem`,
      [marca, modelo, id],
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao buscar produtos" });
  }
};

exports.listarProdutos = async (req, res) => {
  try {
    const result = await pool.query(`
      select 
      procod,
      tipodes,
      marcasdes, 
      case when prodes is null then '' else prodes end as prodes, 
      case when provl is null then 0 else provl end as provl,
      case when procusto is null then 0 else procusto end as procusto,
      (
        SELECT string_agg(m.moddes, ', ' ORDER BY m.moddes)
        FROM promod pm
        JOIN modelo m ON pm.promodmodcod = m.modcod
        WHERE pm.promodprocod = pro.procod
      ) as modelos
      from pro
      join tipo on tipocod = protipocod
      join marcas on promarcascod = marcascod and marcassit = 'A'
      order by procod desc`);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao buscar produtos" });
  }
};

exports.listarProdutosPainelId = async (req, res) => {
  try {
    const result = await pool.query(
      `select         
       procod,
       promarcascod,
       case when prodes is null then '' else prodes end as prodes,
       case when provl is null then 0 else provl end as provl, 
       case when procusto is null then 0 else procusto end as procusto, 
       case when prosemest is null then 'N' else prosemest end as prosemest,
       case when proacabando is null then 'N' else proacabando end as proacabando from pro where procod = $1`,
      [req.params.id],
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao buscar produtos" });
  }
};

exports.totalProdutoAcabando = async (req, res) => {
  try {
    const result = await pool.query(
      `select count(procod)  from pro where proacabando = 'S'`,
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "Erro ao buscar total de produtos acabando" });
  }
};

exports.totalProdutoEmFalta = async (req, res) => {
  try {
    const result = await pool.query(
      `select count(procod)  from pro where prosemest  = 'S'`,
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "Erro ao buscar total de produtos acabando" });
  }
};

exports.listarProdutoCarrinho = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      "select procod, prodes, provl,tipodes from pro join tipo on tipocod = protipocod  where procod = $1",
      [id],
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao buscar produtos" });
  }
};

exports.inserirProduto = async (req, res) => {
  const { prodes, promarcascod, promodcod, protipocod, provl, procusto } =
    req.body;

  console.log(req.body);
  // Validar modelo único
  const modeloId = parseInt(promodcod);
  if (isNaN(modeloId)) {
    return res.status(400).json({ error: "Modelo inválido ou não informado" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Inserção simples do produto
    const result = await client.query(
      `
        INSERT INTO pro (prodes, promarcascod, promodcod, protipocod, provl, procusto, prosemest)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `,
      [prodes, promarcascod, modeloId, protipocod, provl, procusto, "N"],
    );

    const procod = result.rows[0].procod;

    // inserir tabela promod (relacionamento)
    if (promodcod && !isNaN(parseInt(promodcod))) {
      // Insere o novo modelo
      await client.query(
        `INSERT INTO promod (promodprocod, promodmodcod)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [procod, promodcod],
      );
    }

    await client.query("COMMIT");

    res.status(200).json(result.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    res.status(500).json({ error: "Erro ao inserir produto" });
  } finally {
    client.release();
  }
};

// excluir produto
exports.excluirProduto = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query("delete from pro where procod = $1", [id]);
    if (result.rowCount > 0) {
      res.status(200).json({ message: "Produto excluído com sucesso" });
    } else {
      res.status(404).json({ error: "Produto não encontrado" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao excluir produto" });
  }
};

exports.editarProduto = async (req, res) => {
  const { id } = req.params;
  const { prodes, provl, procusto, prosemest, promodcod, proacabando } =
    req.body;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Atualizar dados do produto, incluindo o modelo principal
    const result = await client.query(
      `UPDATE pro 
         SET prodes = $1, 
             provl = $2, 
             procusto = $3,
             prosemest = $4, 
             proacabando = $5,
             promodcod = $6
       WHERE procod = $7
       RETURNING *`,
      [prodes, provl, procusto, prosemest, proacabando, promodcod, id],
    );

    // Atualizar tabela promod (relacionamento)
    if (promodcod && !isNaN(parseInt(promodcod))) {
      // Remove qualquer modelo antigo
      await client.query(`DELETE FROM promod WHERE promodprocod = $1`, [id]);

      // Insere o novo modelo
      await client.query(
        `INSERT INTO promod (promodprocod, promodmodcod)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [id, promodcod],
      );
    }

    await client.query("COMMIT");
    res.status(200).json(result.rows);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    res.status(500).json({ error: "Erro ao editar produto" });
  } finally {
    client.release();
  }
};

// Listar modelos vinculados a um produto
exports.listarModelosProduto = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `SELECT m.modcod, m.moddes, m.modmarcascod
         FROM pro
         JOIN modelo m ON m.modcod = pro.promodcod
         WHERE modmarcascod = $1`,
      [id],
    );

    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao buscar modelos do produto" });
  }
};

exports.listarProCor = async (req, res) => {
  try {
    const result = await pool.query(
      "select corcod, cornome from cores order by corcod",
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao buscar cores" });
  }
};

exports.listarProdutoCoresDisponiveis = async (req, res) => {
  const { id } = req.params;
  //const { marca, modelo } = req.query;

  try {
    const result = await pool.query(
      `select procod, prodes, provl, tipodes, corcod, case when cornome is null then '' else cornome end as cornome, procorsemest from pro
        join tipo on tipocod = protipocod
        left join procor on procorprocod = procod
        left join cores on corcod = procorcorescod 
        where procod  = $1 `,
      [id],
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao buscar cores" });
  }
};

/**
 * Insere uma cor disponível para um produto.
 *
 * NOTA: Esta validação depende da coluna `procor.procorqtde` que é adicionada
 * automaticamente via `src/config/atualizardb.js`. Caso a coluna não exista
 * em produção, a validação de quantidade por cor não funcionará corretamente.
 *
 * Regra de negócio: Só permite adicionar cor se pro.proqtde = 0
 */
exports.inserirProdutoCoresDisponiveis = async (req, res) => {
  const { id } = req.params;
  const procorsemest = req.query.procorsemest || "N"; // Default to 'N' if not provided

  try {
    // Verificar se o produto tem estoque geral > 0
    const produtoResult = await pool.query(
      `SELECT proqtde FROM pro WHERE procod = $1`,
      [id],
    );

    if (produtoResult.rows.length === 0) {
      return res.status(404).json({ erro: "Produto não encontrado" });
    }

    const proqtde = produtoResult.rows[0].proqtde || 0;
    if (proqtde > 0) {
      return res.status(400).json({
        erro: "Não é permitido adicionar cor enquanto o produto possuir quantidade (proqtde) maior que zero",
      });
    }

    const result = await pool.query(
      `insert into procor (procorprocod,procorcorescod,procorsemest) values($1,$2,$3) RETURNING *`,
      [id, req.query.corescod, procorsemest],
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: "Erro ao inserir cores" });
  }
};

/**
 * Deleta (desvincula) uma cor de um produto.
 *
 * NOTA: Esta validação depende da coluna `procor.procorqtde` que é adicionada
 * automaticamente via `src/config/atualizardb.js`. Caso a coluna não exista
 * em produção, a validação utilizará apenas `pro.proqtde` como fallback.
 *
 * Regras de negócio:
 * - Se procor.procorqtde não é null e > 0: recusar
 * - Se procor.procorqtde é null, verificar pro.proqtde; se > 0: recusar
 * - Só permite deletar quando quantidade efetiva = 0
 */
exports.deletarProdutoCoresDisponiveis = async (req, res) => {
  const { id } = req.params;
  const corescod = req.query.corescod;

  try {
    // Buscar procor.procorqtde para a combinação (procorprocod = id, procorcorescod = corescod)
    const procorResult = await pool.query(
      `SELECT procorqtde FROM procor WHERE procorprocod = $1 AND procorcorescod = $2`,
      [id, corescod],
    );

    if (procorResult.rows.length === 0) {
      return res
        .status(404)
        .json({ erro: "Vínculo cor-produto não encontrado" });
    }

    const procorqtde = procorResult.rows[0].procorqtde;

    // Se procor.procorqtde não é null e > 0, recusar
    if (procorqtde !== null && procorqtde > 0) {
      return res.status(400).json({
        erro: "Não é permitido desvincular cor enquanto a quantidade desta cor for maior que zero",
      });
    }

    // Se procor.procorqtde é null, verificar pro.proqtde como fallback
    if (procorqtde === null) {
      const produtoResult = await pool.query(
        `SELECT proqtde FROM pro WHERE procod = $1`,
        [id],
      );

      if (produtoResult.rows.length === 0) {
        return res.status(404).json({ erro: "Produto não encontrado" });
      }

      const proqtde = produtoResult.rows[0].proqtde || 0;
      if (proqtde > 0) {
        return res.status(400).json({
          erro: "Não é permitido desvincular cor enquanto o produto possuir quantidade (proqtde) maior que zero",
        });
      }
    }

    const result = await pool.query(
      `delete from procor where procorprocod = $1 and procorcorescod = $2 RETURNING *`,
      [id, corescod],
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: "Erro ao remover cor" });
  }
};

exports.alterarProdutoCoresDisponiveis = async (req, res) => {
  const { id } = req.params;
  //const { marca, modelo } = req.query;

  try {
    const result = await pool.query(
      `update procor set procorcorescod = $1, procorsemest = $2 where procorprocod = $3 and procorcorescod = $4 RETURNING *`,
      [
        req.query.corescodnovo,
        req.query.procorsemestnovo,
        id,
        req.query.corescod,
      ],
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao inserir cores" });
  }
};

exports.atualizarOrdemProdutos = async (req, res) => {
  try {
    const { ordem } = req.body; // array: [{id, descricao}, ...]

    if (!Array.isArray(ordem)) {
      return res.status(400).json({ message: "Ordem inválida" });
    }

    const ids    = ordem.map((item) => item.id);
    const ordens = ordem.map((_, i) => i + 1);

    await pool.query(
      `UPDATE pro SET proordem = v.ordem
       FROM (SELECT UNNEST($1::int[]) AS id, UNNEST($2::int[]) AS ordem) AS v
       WHERE procod = v.id`,
      [ids, ordens]
    );

    return res.status(200).json({ message: "Ordem atualizada com sucesso!" });
  } catch (error) {
    console.error("Erro ao atualizar ordem:", error);
    return res.status(500).json({ message: "Erro interno ao atualizar ordem" });
  }
};

exports.listarProdutosComEstoque = async (req, res) => {
  try {
    const result = await pool.query(
      `select distinct
        procod,
        prodes,
        marcasdes,
        (
          SELECT string_agg(m.moddes, ', ' ORDER BY m.moddes)
          FROM promod pm
          JOIN modelo m ON pm.promodmodcod = m.modcod
          WHERE pm.promodprocod = pro.procod
        ) as moddes,
        tipodes,
        coalesce(cornome, 'Sem Cor') as cordes,
        case when procorcorescod is null then proqtde else procorqtde end as qtde,
        procorcorescod
        from pro
        join marcas on marcascod = promarcascod 
        join tipo on tipocod = protipocod
        left join procor on procod = procorprocod
        left join cores on corcod = procorcorescod
        where case when procorcorescod is null then proqtde else procorqtde end > 0
        and prosit = 'A'`,
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao buscar produtos estoque" });
  }
};

exports.listarProdutosSemEstoque = async (req, res) => {
  try {
    const result = await pool.query(
      `select distinct
        procod,
        prodes,
        marcasdes,
        (
          SELECT string_agg(m.moddes, ', ' ORDER BY m.moddes)
          FROM promod pm
          JOIN modelo m ON pm.promodmodcod = m.modcod
          WHERE pm.promodprocod = pro.procod
        ) as moddes,
        tipodes,
        coalesce(cornome, 'Sem Cor') as cordes,
        case when procorcorescod is null then proqtde else procorqtde end as qtde,
        procorcorescod
        from pro
        join marcas on marcascod = promarcascod 
        join tipo on tipocod = protipocod
        left join procor on procod = procorprocod
        left join cores on corcod = procorcorescod
        where case when procorcorescod is null then proqtde else coalesce(procorqtde,0) end <= 0
        and prosit = 'A'`,
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao buscar produtos estoque" });
  }
};

exports.gravarEstoqueProduto = async (req, res) => {
  const { id } = req.params;
  const { quantidade, cor = null } = req.body;

  //console.log("Recebido no backend:", { id, quantidade, cor });
  try {
    const produto = await pool.query(
      "SELECT procorprocod FROM procor WHERE procorprocod = $1 group by procorprocod",
      [id],
    );

    if (
      produto.rows.length > 0 &&
      produto.rows[0].procorprocod &&
      cor !== null
    ) {
      await pool.query(
        "UPDATE procor SET procorqtde = $1 WHERE procorprocod = $2 and procorcorescod = $3",
        [quantidade, id, cor],
      );
    } else {
      await pool.query("UPDATE pro SET proqtde = $1 WHERE procod = $2", [
        quantidade,
        id,
      ]);
    }

    res.json({ sucesso: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao atualizar estoque" });
  }
};
