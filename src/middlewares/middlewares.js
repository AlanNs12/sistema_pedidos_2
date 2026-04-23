const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

function autenticarToken(req, res, next) {
    const token = req.cookies.token;

    if (!token) {
        return res.status(401).redirect('/login');
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);

        const novoToken = jwt.sign({
            usuemail:  decoded.usuemail,
            usucod:    decoded.usucod,
            usunome:   decoded.usunome,
            usuadm:    decoded.usuadm,
            usupv:     decoded.usupv,
            usuest:    decoded.usuest,
            empusaest: decoded.empusaest,
            empusapv:  decoded.empusapv,
        }, JWT_SECRET, { expiresIn: '60m' });

        res.cookie('token', novoToken, {
            httpOnly: true,
            sameSite: 'Strict',
            secure: process.env.NODE_ENV === 'production',
        });
        // Remove os outros cookies inseguros, se ainda existirem
        res.clearCookie('usucod');
        res.clearCookie('usunome');
        res.clearCookie('usuemail');
        res.clearCookie('usuadm');
        res.clearCookie('usupv');
        res.clearCookie('usuest');

        req.token = decoded; // Armazena dados decodificados para uso futuro

        next();
    } catch (err) {
        return res.status(500).redirect('/login');
    }
}

module.exports = autenticarToken;
