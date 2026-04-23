const pool = require("../config/db");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

exports.validarLogin = async (req, res) => {
  const { usucod, usunome, usuemail, ususenha } = req.body;

  try {
    const result = await pool.query(
      "SELECT usucod,usunome,usuemail, ususenha FROM usu WHERE usuemail = $1",
      [usuemail]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ mensagem: "Usuário não encontrado" });
    }

    const usuario = result.rows[0];

    // Gera o hash MD5 da senha recebida
    const senhaHash = crypto.createHash("md5").update(ususenha).digest("hex");

    if (usuario.ususenha !== senhaHash) {
      return res.status(401).json({ mensagem: "Senha incorreta" });
    }

    // Se tudo ok, retorna sucesso

    const token = jwt.sign(
      {
        usuemail: usuario.usuemail,
        usucod: usuario.usucod,
        usunome: usuario.usunome,
      },
      "chave-secreta",
      { expiresIn: "60m" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.HTTPS,
      sameSite: "Strict",
    });

    res.status(200).json({
      mensagem: "Login bem-sucedido",
      token,
      usunome: usuario.usunome,
      usuemail: usuario.usuemail,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao validar login" });
  }
};

exports.atualizarCadastro = async (req, res) => {
  const { id } = req.params;
  const { usunome, ususenha, usuadm, ususta, usupv, usuest,usurca } = req.body;

  try {
    if (ususenha === undefined || ususenha.trim() === "") {
      // Atualiza sem alterar a senha
      await pool.query(
        "UPDATE usu SET usunome = $1, usuadm = $2, ususta = $3,usupv = $4 ,usuest = $5, usurca = $6 WHERE usuemail = $7",
        [usunome, usuadm, ususta, usupv, usuest,usurca, id]
      );
      return res
        .status(200)
        .json({ mensagem: "Usuario atualizado com sucesso" });
    }

    // Gera o hash MD5 da nova senha
    const newSenhaHash = crypto
      .createHash("md5")
      .update(ususenha)
      .digest("hex");

    await pool.query(
      "UPDATE usu SET  usunome = $1, ususenha = $2,usuadm = $3, ususta = $4 ,usupv = $5 ,usuest = $6, usurca = $7 WHERE usuemail = $8",
      [usunome, newSenhaHash, usuadm, ususta, usupv, usuest, usurca, id]
    );

    res.status(200).json({ mensagem: "Usuario atualizado com sucesso" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao atualizar usuario" });
  }
};

exports.cadastrarlogin = async (req, res) => {
  const { usunome, usuemail, ususenha, usuadm, ususta, usupv, usuest,usurca } =
    req.body;
  const senhaHash = crypto.createHash("md5").update(ususenha).digest("hex");

  try {
    const { rowCount } = await pool.query(
      "SELECT 1 FROM usu WHERE usuemail = $1",
      [usuemail]
    );
    if (rowCount > 0) {
      return res
        .status(409)
        .json({ error: "Email já existe na base de dados, Faça o Login!" });
    }
    await pool.query(
      "INSERT INTO usu (usunome, usuemail, ususenha,usuadm,ususta,usupv,usuest,usurca) VALUES ($1, $2, $3,$4,$5,$6,$7,$8)",
      [usunome, usuemail, senhaHash, usuadm, ususta, usupv, usuest,usurca]
    );
    return res.status(201).json({ message: "Usuário cadastrado com sucesso" });
  } catch (error) {
    console.error("Erro ao cadastrar usuário:", error);
    return res.status(500).json({ error: "Erro ao cadastrar usuário" });
  }
};

// Trás somente o usuario logado
exports.listarlogin = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT usucod, usunome, usuemail FROM usu WHERE usucod = $1",
      [req.token.usucod]
    );
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao listar documentos" });
  }
};
// Trás todos os usuarios, utilizado apenos pelo adm
exports.listarUsuarios = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM usu WHERE ususta in ('A','I') and usuemail <> 'admin@orderup.com.br' ORDER BY ususta,usucod DESC`
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao listar usuarios" });
  }
};

exports.excluirCadastro = async (req, res) => {
  const { id } = req.params;
  //const  ususta  = "X";

  try {
    //await pool.query(`UPDATE usu SET ususta = $1 , usuemail = usuemail || 'EX' WHERE usucod = $2`, [ususta,id]);
    await pool.query(`delete from usu  WHERE usucod = $1`, [id]);

    res.status(200).json({ mensagem: "Usuario Excluido com sucesso" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao Excluir usuario" });
  }
};

exports.listarVendedores = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT usucod,usunome,usuemail,usurca FROM usu WHERE ususta in ('A','I') and usurca = 'S' and usuemail <> 'admin@orderup.com.br' ORDER BY ususta,usucod DESC`
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao listar usuarios" });
  }
};

exports.viuVersao = async (req, res) => {
  const { usucod,viuversao } = req.body;

  try {
    await pool.query(`UPDATE usu SET usuviuversao = $1 WHERE usucod = $2`, [
      viuversao,
      usucod,
    ]);

    res.status(200).json({ mensagem: "Versão visualizada com sucesso" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao visualizar versão" });
  }
};

exports.usuViuVersao = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT usucod,usuviuversao FROM usu WHERE usucod = $1`,
      [req.token.usucod]
    );
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao obter viuversao" });
  }
};
