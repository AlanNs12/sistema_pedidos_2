const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const loginController = require('../controllers/loginController');
const autenticarToken = require('../middlewares/middlewares');

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: 'Muitas tentativas de login. Tente novamente em 15 minutos.' },
    standardHeaders: true,
    legacyHeaders: false,
});

router.post('/auth/login', loginLimiter, loginController.validarLogin);
router.put('/auth/atualizarCadastro/:id', autenticarToken, loginController.atualizarCadastro);
router.get('/auth/listarlogin', autenticarToken, loginController.listarlogin);

module.exports = router;