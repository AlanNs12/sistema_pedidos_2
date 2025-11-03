require("dotenv").config();
const jwt = require("jsonwebtoken");
const express = require("express");
const morgan = require("morgan");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const sharp = require("sharp");
const { atualizarDB } = require("./config/atualizardb");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para servir arquivos estáticos (inclui uploads)
app.use(express.static(path.join(__dirname, "../public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads"))); // <-- pasta onde salva imagens

// Middlewares
const autenticarToken = require("./middlewares/middlewares");
const requireAdmin = require("./middlewares/adminMiddleware");
const requireAdminPv= require("./middlewares/adminPvMiddleware");
const requireAdminEst= require("./middlewares/adminEstMiddleware");
const requireAdminPages = require("./middlewares/adminPagesMiddleware");
app.set("views", path.join(__dirname, "views"));
app.use(morgan("dev"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

const corsOptions = {
  origin: [
    "http://jppecashop.com.br",
    "http://www.jppecashop.com.br",
    "http://utidoscelulares.com.br",
    "http://www.utidoscelulares.com.br",
  ],
  credentials: true,
};

// Configuração do CORS
app.use(cors(corsOptions));

// Rotas
const mainRoutes = require("./routes");
app.use("/", mainRoutes);

const loginRoute = require("./routes/loginRoute");
app.use(loginRoute);

const marcasRoutes = require("./routes/marcasRoutes");
app.use(marcasRoutes);

const modeloRoutes = require("./routes/modeloRoutes");
app.use(modeloRoutes);

const proRoutes = require("./routes/proRoutes");
app.use(proRoutes);

const tipoRoutes = require("./routes/tipoRoutes");
app.use(tipoRoutes);

const empRoutes = require("./routes/empRoutes");
app.use(empRoutes);

const coresRoutes = require("./routes/coresRoutes");
app.use(coresRoutes);

const pedidosRoutes = require("./routes/pedidosRoutes");
app.use(pedidosRoutes);

const estoqueRoutes = require("./routes/estoqueRoutes");
app.use(estoqueRoutes);

const usuarioRoute = require("./routes/usuarioRoute");
app.use(usuarioRoute);

// Adicionando a nova rota usuarioRoute2 para testar MODELS
const usuarioRoute2 = require("./routes/usuarioRoute2");
app.use(usuarioRoute2);

const pedidoRoutesV2 = require("./routes/pedidosRoutesV2");
app.use(pedidoRoutesV2);


// Rotas de páginas

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/html/index.html"));
});

app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/html/auth/login.html"));
});

app.get("/users",requireAdminPages, (req, res) => {
  res.sendFile(path.join(__dirname, "../public/html/auth/admin/html/painel-usuarios.html"));
});

app.get("/index", (req, res) => {
  //res.sendFile(path.join(__dirname, "../public/html/index.html"));
  res.redirect("/");
});
app.get("/modelo", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/html/modelo.html"));
});
app.get("/pecas", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/html/pecas.html"));
});
app.get("/lista-pecas", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/html/lista-pecas.html"));
});
app.get("/carrinho", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/html/carrinho.html"));
});
app.get("/perfil", autenticarToken,(req, res) => {
  res.sendFile(path.join(__dirname, "../public/html/auth/perfil.html"));
});
app.get("/configuracoes", requireAdminPages, (req, res) => {
  res.sendFile(path.join(__dirname, "../public/html/configuracoes.html"));
});
app.get("/painel", autenticarToken, (req, res) => {
  res.sendFile(
    path.join(__dirname, "../public/html/auth/admin/html/painel.html")
  );
});

app.get("/pedidos", requireAdminPv, (req, res) => {
  res.sendFile(
    path.join(__dirname, "../public/html/auth/admin/html/painel-pedidos.html")
  );
});
app.get("/estoque", requireAdminEst,(req, res) => {
  res.sendFile(path.join(__dirname, "../public/html/auth/admin/html/painel-estoque.html"));
});



app.get("/dashboard", autenticarToken, (req, res) => {
  res.sendFile(
    path.join(__dirname, "../public/html/auth/admin/html/index.html")
  );
});
app.get("/dashboard/modelo", autenticarToken, (req, res) => {
  res.sendFile(
    path.join(__dirname, "../public/html/auth/admin/html/modelo.html")
  );
});
app.get("/dashboard/modelo/pecas", autenticarToken, (req, res) => {
  res.sendFile(
    path.join(__dirname, "../public/html/auth/admin/html/pecas.html")
  );
});
app.get("/dashboard/modelo/pecas/lista", autenticarToken, (req, res) => {
  res.sendFile(
    path.join(__dirname, "../public/html/auth/admin/html/lista-pecas.html")
  );
});

app.get("/config.js", (req, res) => {
  res.type("application/javascript");
  res.send(`const BASE_URL = '${process.env.BASE_URL}';`);
});

app.get("/auth/sair", (req, res) => {
  const token_session = req.cookies.token;
  if (token_session) {
    res.clearCookie("usunome", { path: "/" });
    res.clearCookie("token", { path: "/" });
    res.json({ message: "Logout realizado com sucesso." });
  } else {
    res.status(401).json({ error: "erro ao sair" });
  }
});

// Rota para servir o manifest.json dinamicamente com nome da empresa PARA PWA BANNER INSTALL APP
app.get("/manifest.json", async (req, res) => {
  console.log("[manifest] HIT", new Date().toISOString());

  // Pega a empresa (ex: do seu controller ou de /emp)
  let empresa = "Sistema Pedidos";
  try {
    const base = `${req.protocol}://${req.get("host")}`;
    const r = await fetch(`${base}/emp`);
    if (r.ok) {
      const j = await r.json();
      if (j.emprazao) empresa = j.emprazao;
    } else {
      console.error("EMP status:", r.status);
    }
  } catch (e) {
    console.error("EMP erro:", e);
  }

  const manifest = {
    name: `${empresa} - App`,
    short_name: empresa.slice(0, 12) || "Pedidos",
    start_url: "/index",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#008000",
    icons: [
      {
        src: "/uploads/logo.jpg",
        sizes: "192x192",
        type: "image/jpg",
        purpose: "any maskable",
      },
      {
        src: "/uploads/logo.jpg",
        sizes: "512x512",
        type: "image/jpg",
        purpose: "any maskable",
      },
    ],
  };

  res.set("Content-Type", "application/manifest+json");
  res.set("Cache-Control", "no-store");
  res.json(manifest);
});

//  Rota para upload de logo
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, "logo.jpg"),
});
const upload = multer({ storage });

app.post(  "/upload-logo",  requireAdmin,  upload.single("logo"),  async (req, res) => {
    try {
      const jpegPath = path.join(uploadsDir, "logo.jpg");
      const pngPath = path.join(uploadsDir, "apple-touch-icon.png");

      // Converte logo.jpg em logo.png
      await sharp(jpegPath).png().toFile(pngPath);

      res.redirect("/configuracoes");
    } catch (err) {
      console.error("Erro ao salvar logo:", err);
      res.status(500).send("Erro ao processar logo");
    }
  }
);

// Inicia o servidor
(async () => {
  await atualizarDB();
  app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${process.env.BASE_URL}/index`);
  });
})();
