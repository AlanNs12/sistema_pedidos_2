const pool = require("../config/db");

exports.listarTipo = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      "select tipocod,tipodes, promarcascod,promodcod from vw_tipo_pecas where promodcod = $1 order by tipoordem ",
      [id]
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao buscar tipo" });
  }
};

exports.buscarTipo = async (req, res) => {
  const { id } = req.params;
  const { modelo } = req.query;

  try {
    const result = await pool.query(
      "select  tipocod,tipodes, promarcascod,promodcod from vw_tipo_pecas  where promodcod = $1 AND tipocod = $2",
      [modelo, id]
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao buscar tipo" });
  }
};

exports.listarTodosTipos = async (req, res) => {
  try {
    const result = await pool.query("select  tipocod,tipodes from tipo");
    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao buscar tipo" });
  }
};

exports.inserirTipo = async (req, res) => {
  const { tipodes } = req.body;

  try {
    const result = await pool.query(
      "insert into tipo (tipodes) values ($1) returning *",
      [tipodes]
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao criar novo tipo" });
  }
};

exports.atualizarTipo = async (req, res) => {
  const { id } = req.params;
  const { tipodes } = req.body;

  try {
    const result = await pool.query(
      "update tipo set tipodes = $1 where tipocod = $2 returning *",
      [tipodes, id]
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao alterar tipo" });
  }
};

exports.deleteTipo = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      "delete from tipo where tipocod = $1 returning *",
      [id]
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    if (error.code === "23503") {
      return res
        .status(409)
        .json({
          error:
            "Não é possível excluir este tipo pois existem produtos vinculados a ele.",
        });
    }
    res.status(500).json({ error: "Erro ao excluir tipo" });
  }
};

exports.atualizarOrdemTipos = async (req, res) => {
  try {
    const { ordem } = req.body; // array: [{id, descricao}, ...]

    if (!Array.isArray(ordem)) {
      return res.status(400).json({ message: "Ordem inválida" });
    }

    const ids    = ordem.map((item) => item.id);
    const ordens = ordem.map((_, i) => i + 1);

    await pool.query(
      `UPDATE tipo SET tipoordem = v.ordem
       FROM (SELECT UNNEST($1::int[]) AS id, UNNEST($2::int[]) AS ordem) AS v
       WHERE tipocod = v.id`,
      [ids, ordens]
    );

    return res.status(200).json({ message: "Ordem atualizada com sucesso!" });
  } catch (error) {
    console.error("Erro ao atualizar ordem:", error);
    return res.status(500).json({ message: "Erro interno ao atualizar ordem" });
  }
};
