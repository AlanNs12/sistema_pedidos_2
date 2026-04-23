const express = require("express");
const router = express.Router();
const cliController = require("../controllers/cliController");
const autenticarToken = require("../middlewares/middlewares");
const requireAdmin = require("../middlewares/adminMiddleware");

router.post('/cli', cliController.create);
router.get('/cli', cliController.list);
router.get('/cli/:id', cliController.getById);
router.put('/cli/:id', cliController.update);
router.delete('/cli/:id', cliController.remove);

module.exports = router;
