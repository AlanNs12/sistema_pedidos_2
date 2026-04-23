const pool = require("../config/db");

exports.listarModelo = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `select * from vw_modelos where modmarcascod = $1 order by ordem`,
      [id]
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao buscar modelos" });
  }
};

exports.buscarModelo = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `select * from vw_modelos WHERE modcod = $1;`,
      [id]
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao buscar modelo" });
  }
};

exports.inserirModelo = async (req, res) => {
  const { moddes, modmarcascod } = req.body;

  try {
    const result = await pool.query(
      `insert into modelo (moddes,modmarcascod) values ($1,$2) returning *`,
      [moddes, modmarcascod]
    );
    res.status(200).json(result.rows);
  } catch {
    console.error(error);
    res.status(500).json({ error: "Erro ao criar modelo" });
  }
};

exports.atualizarModelo = async (req, res) => {
  const { id } = req.params;
  const { moddes, modmarcascod } = req.body;

  try {
    const result = await pool.query(
      `update modelo set moddes = $1, modmarcascod = $2 where modcod = $3 returning *`,
      [moddes, modmarcascod, id]
    );
    res.status(200).json(result.rows);
  } catch {
    console.error(error);
    res.status(500).json({ error: "Erro ao alterar modelo" });
  }
};

exports.deletarModelo = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `delete from modelo where modcod = $1 returning *`,
      [id]
    );
    res.status(200).json(result.rows);
  } catch (error){
    console.error(error);

    if (error.code === '23503') {
      return res.status(409).json({
        error: 'Não é permitido excluir este modelo, pois está vinculado a outros registros.'
      });
    }
    res.status(500).json({ error: "Erro ao excluir modelo" });
  }
};

exports.listarTodosModelos = async (req, res) => {
  try {
    const result = await pool.query(`select * from vw_modelos `);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao buscar modelos" });
  }
};

exports.atualizarOrdemModelos = async (req, res) => {
  try {
    const { ordem } = req.body; // array: [{id, descricao}, ...]

    if (!Array.isArray(ordem)) {
      return res.status(400).json({ message: "Ordem inválida" });
    }

    const ids    = ordem.map((item) => item.id);
    const ordens = ordem.map((_, i) => i + 1);

    await pool.query(
      `UPDATE modelo SET ordem = v.ordem
       FROM (SELECT UNNEST($1::int[]) AS id, UNNEST($2::int[]) AS ordem) AS v
       WHERE modcod = v.id`,
      [ids, ordens]
    );

    return res.status(200).json({ message: "Ordem atualizada com sucesso!" });
  } catch (error) {
    console.error("Erro ao atualizar ordem:", error);
    return res.status(500).json({ message: "Erro interno ao atualizar ordem" });
  }
};
