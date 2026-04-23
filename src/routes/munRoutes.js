const express = require("express");
const router = express.Router();
const munController = require("../controllers/munController");
const autenticarToken = require("../middlewares/middlewares");
const requireAdmin = require("../middlewares/adminMiddleware");

router.get('/municipios', munController.listarMunicipios);
module.exports = router;
