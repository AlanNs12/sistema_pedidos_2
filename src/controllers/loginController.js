const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

exports.validarLogin = async (req, res) => {
    const { usuemail, ususenha } = req.body;

    try {
        const result = await pool.query(
            `SELECT u.usucod, u.usunome, u.usuemail, u.ususenha, u.usuadm, u.ususta, u.usuest, u.usupv,
                    e.empusapv, e.empusaest
             FROM usu u, emp e
             WHERE u.usuemail = $1 AND e.empcod = 1`,
            [usuemail]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ mensagem: 'Usuário não encontrado' });
        }

        const usuario = result.rows[0];

        if (usuario.ususta === 'I') {
            return res.status(403).json({ mensagem: 'Usuário inativo. Contate o administrador.' });
        }

        if (usuario.ususta === 'X') {
            return res.status(403).json({ mensagem: 'Usuário excluído. Contate o administrador.' });
        }

        const senhaValida = await bcrypt.compare(ususenha, usuario.ususenha);
        if (!senhaValida) {
            return res.status(401).json({ mensagem: 'Senha incorreta' });
        }

        const token = jwt.sign({
            usuemail:  usuario.usuemail,
            usucod:    usuario.usucod,
            usunome:   usuario.usunome,
            usuadm:    usuario.usuadm,
            ususta:    usuario.ususta,
            usuest:    usuario.usuest,
            usupv:     usuario.usupv,
            empusapv:  usuario.empusapv,
            empusaest: usuario.empusaest,
        }, JWT_SECRET, { expiresIn: '60m' });

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Strict',
        });

        res.status(200).json({
            mensagem:  'Login bem-sucedido',
            usunome:   usuario.usunome,
            usuemail:  usuario.usuemail,
            usuadm:    usuario.usuadm,
            ususta:    usuario.ususta,
            usuest:    usuario.usuest,
            usupv:     usuario.usupv,
            empusapv:  usuario.empusapv,
            empusaest: usuario.empusaest,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao validar login' });
    }
};

exports.atualizarCadastro = async (req, res) => {
    const { id } = req.params;

    if (parseInt(id) !== req.token.usucod) {
        return res.status(403).json({ error: 'Sem permissão para alterar este cadastro' });
    }

    const { usunome, ususenha } = req.body;

    try {
        const senhaHash = await bcrypt.hash(ususenha, 12);
        await pool.query(
            'UPDATE usu SET usunome = $1, ususenha = $2 WHERE usucod = $3',
            [usunome, senhaHash, id]
        );
        res.status(200).json({ mensagem: 'Cadastro atualizado com sucesso' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao atualizar cadastro' });
    }
};

exports.cadastrarlogin = async (req, res) => {
    const { usunome, usuemail, ususenha } = req.body;

    try {
        const { rowCount } = await pool.query(
            'SELECT 1 FROM usu WHERE usuemail = $1',
            [usuemail]
        );
        if (rowCount > 0) {
            return res.status(409).json({ error: 'Email já existe na base de dados, Faça o Login!' });
        }

        const senhaHash = await bcrypt.hash(ususenha, 12);
        await pool.query(
            'INSERT INTO usu (usunome, usuemail, ususenha) VALUES ($1, $2, $3)',
            [usunome, usuemail, senhaHash]
        );
        return res.status(201).json({ message: 'Usuário cadastrado com sucesso' });
    } catch (error) {
        console.error('Erro ao cadastrar usuário:', error);
        return res.status(500).json({ error: 'Erro ao cadastrar usuário' });
    }
};

exports.listarlogin = async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT usucod, usunome, usuemail FROM usu WHERE usucod = $1',
            [req.token.usucod]
        );
        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao listar documentos' });
    }
};
