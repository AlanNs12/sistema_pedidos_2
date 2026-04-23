require("dotenv").config();
const jwt = require("jsonwebtoken");
const express = require("express");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const sharp = require("sharp");
const { atualizarDB } = require("./config/atualizardb");
const { requestTimingMiddleware } = require("./middlewares/performanceMiddleware");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para servir arquivos estáticos (inclui uploads)
app.use(express.static(path.join(__dirname, "../public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads"))); // <-- pasta onde salva imagens

// Middlewares
const autenticarToken = require("./middlewares/middlewares");
const requireAdmin = require("./middlewares/adminMiddleware");
const requireAdminPv = require("./middlewares/adminPvMiddleware");
const requireAdminEst = require("./middlewares/adminEstMiddleware");
const requireAdminPages = require("./middlewares/adminPagesMiddleware");
app.set("views", path.join(__dirname, "views"));
app.use(helmet());
app.use(compression());
app.use(requestTimingMiddleware);
app.use(morgan("dev"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

const corsOptions = {
  origin: [
    "https://jppecashop.com.br",
    "https://www.jppecashop.com.br",
    "https://utidoscelulares.com.br",
    "https://www.utidoscelulares.com.br",
  ],
  credentials: true,
};

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

const cliRoute = require("./routes/cliRoutes");
app.use(cliRoute);

const munRoute = require("./routes/munRoutes");
app.use(munRoute);

const partGroupRoutes = require("./routes/partGroupRoutes");
app.use(partGroupRoutes);

app.get("/me/usuario", autenticarToken, (req, res) => {
  // o middleware colocou o payload em req.token
  return res.json({ usunome: req.token.usunome });
});

// Adicionando a nova rota usuarioRoute2 para testar MODELS
const usuarioRoute2 = require("./routes/usuarioRoute2");
app.use(usuarioRoute2);

const pedidoRoutesV2 = require("./routes/pedidosRoutesV2");
app.use(pedidoRoutesV2);

const relatoriosRoutes = require("./routes/relatoriosRoutes");
app.use(relatoriosRoutes);

// Rotas de páginas

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/html/index.html"));
});

app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/html/auth/login.html"));
});

app.get("/users", requireAdminPages, (req, res) => {
  res.sendFile(
    path.join(__dirname, "../public/html/auth/admin/html/painel-usuarios.html")
  );
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
app.get("/perfil", autenticarToken, (req, res) => {
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
app.get("/estoque", requireAdminEst, (req, res) => {
  res.sendFile(
    path.join(__dirname, "../public/html/auth/admin/html/painel-estoque.html")
  );
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

app.get("/clientes", autenticarToken, (req, res) => {
  res.sendFile(
    path.join(__dirname, "../public/html/auth/admin/html/painel-clientes.html")
  );
});

app.get("/part", requireAdmin, (req, res) => {
  res.sendFile(
    path.join(
      __dirname,
      "../public/html/auth/admin/html/painel-part-groups.html"
    )
  );
});

app.get("/dash", autenticarToken, (req, res) => {
  res.sendFile(
    path.join(__dirname, "../public/html/auth/admin/html/painel-dashboard.html")
  );
});

app.get("/backup", autenticarToken, (req, res) => {
  res.sendFile(
    path.join(__dirname, "../public/html/auth/admin/html/painel-backups.html")
  );
});

app.get("/relatorios", autenticarToken, (req, res) => {
  res.sendFile(
    path.join(__dirname, "../public/html/auth/admin/html/painel-relatorios.html")
  );
});

app.get("/estoque-grupos", autenticarToken, (req, res) => {
  res.sendFile(
    path.join(__dirname, "../public/html/auth/admin/html/painel-estoque-grupos.html")
  );
});

// Caminho onde ficam os backups
const dirPathBackups = "/home/backup";

// 🔹 LISTAR ARQUIVOS E PASTAS
// 🔹 LISTAR APENAS AS PASTAS DE DIAS DA SEMANA
app.get("/backups", requireAdminPages, async (req, res) => {
  try {
    const entries = await fs.promises.readdir(dirPathBackups, {
      withFileTypes: true,
    });

    // nomes válidos de pastas de dias da semana
    const diasSemana = [
      "1_domingo",
      "2_segunda",
      "3_terca",
      "4_quarta",
      "5_quinta",
      "6_sexta",
      "7_sabado",
    ];

    const backups = await Promise.all(
      entries
        .filter(
          (entry) => entry.isDirectory() && diasSemana.includes(entry.name)
        )
        .map(async (entry) => ({
          nome: entry.name,
          tipo: "pasta",
          tamanhoKB: "-",
          url: `/backups/folder/${encodeURIComponent(entry.name)}`,
        }))
    );

    res.json({ backups });
  } catch (err) {
    console.error("Erro ao listar backups:", err.message);
    res
      .status(500)
      .json({ erro: "Erro ao listar backups", detalhe: err.message });
  }
});

// 🔹 LISTAR CONTEÚDO DE UMA PASTA ESPECÍFICA
app.get("/backups/folder/:folder", requireAdminPages, async (req, res) => {
  try {
    const folderName = path.basename(decodeURIComponent(req.params.folder));
    const folderPath = path.join(dirPathBackups, folderName);

    const resolvedBase = path.resolve(dirPathBackups) + path.sep;
    const resolvedTarget = path.resolve(folderPath);
    if (!resolvedTarget.startsWith(resolvedBase)) {
      return res.status(400).json({ erro: "Nome de pasta inválido." });
    }

    const entries = await fs.promises.readdir(folderPath, { withFileTypes: true });

    const backups = await Promise.all(
      entries.map(async (entry) => {
        const fullPath = path.join(folderPath, entry.name);
        const stats = await fs.promises.stat(fullPath);

        return {
          nome: entry.name,
          tipo: entry.isDirectory() ? "pasta" : "arquivo",
          tamanhoKB: entry.isDirectory() ? "-" : (stats.size / 1024).toFixed(2),

          // ✅ NADA de path.join em URLs
          url: entry.isDirectory()
            ? `/backups/folder/${encodeURIComponent(entry.name)}`
            : `/backups/download/${encodeURIComponent(folderName)}/${encodeURIComponent(entry.name)}`
        };
      })
    );

    res.json({ backups });
  } catch (err) {
    console.error("Erro ao listar pasta:", err.message);
    res.status(500).json({ erro: "Erro ao listar pasta", detalhe: err.message });
  }
});


// 🔹 DOWNLOAD DE ARQUIVO ESPECÍFICO
app.get("/backups/download/:folder/:file", requireAdminPages, async (req, res) => {
  try {
    const folder = path.basename(decodeURIComponent(req.params.folder));
    const file = path.basename(decodeURIComponent(req.params.file));
    const filePath = path.join(dirPathBackups, folder, file);

    // segurança
    const resolvedBase = path.resolve(dirPathBackups) + path.sep;
    const resolvedTarget = path.resolve(filePath);
    if (!resolvedTarget.startsWith(resolvedBase)) {
      return res.status(400).json({ erro: "Nome de arquivo inválido." });
    }

    await fs.promises.access(filePath, fs.constants.F_OK);

    // nome para o download
    const fileName = path.basename(filePath);

    res.download(filePath, fileName, (err) => {
      if (err) {
        console.error("Erro no download:", err.message);
        if (!res.headersSent) return res.status(500).json({ erro: "Falha ao realizar download." });
      }
    });
  } catch (err) {
    console.error("Erro ao baixar arquivo:", err.message);
    if (!res.headersSent) return res.status(404).json({ erro: "Arquivo não encontrado." });
  }
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

//  Rota para upload de logo Empresa
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, "logo.jpg"),
});
const upload = multer({ storage });

app.post(
  "/upload-logo",
  requireAdmin,
  upload.single("logo"),
  async (req, res) => {
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

// diretório de uploads Imagens
const uploadsDirMarca = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDirMarca)) {
  fs.mkdirSync(uploadsDirMarca, { recursive: true });
}

// storage: salva com nome temporário (timestamp + original) para depois renomear
const storageMarca = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDirMarca),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || ".tmp";
    cb(null, `${Date.now()}${ext}`);
  },
});
const uploadMarca = multer({
  storage: storageMarca,
  limits: { fileSize: 5 * 1024 * 1024 },
}); // limite 5MB

// helper: cria slug seguro a partir da descrição
function slugify(text) {
  return String(text)
    .normalize("NFKD") // remove acentos
    .replace(/[\u0300-\u036f]/g, "") // remove marcas diacríticas
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "") // remove chars inválidos
    .replace(/\s+/g, "-") // espaços -> hífen
    .replace(/-+/g, "-"); // elimina hífens duplicados
}

app.post(
  "/save-marca",
  uploadMarca.single("logo-marca"), // file optional: se não enviar, req.file será undefined
  async (req, res) => {
    try {
      const { descricaoMarca } = req.body;
      if (!descricaoMarca || descricaoMarca.trim() === "") {
        // se quiser obrigar descrição:
        // limpa arquivo temporário enviado (se houver)
        if (req.file)
          try {
            fs.unlinkSync(req.file.path);
          } catch (e) {}
        return res.status(400).send("Descrição da marca é obrigatória.");
      }

      // slug para nome de arquivo
      const slug = slugify(descricaoMarca);
      if (!slug) {
        if (req.file)
          try {
            fs.unlinkSync(req.file.path);
          } catch (e) {}
        return res
          .status(400)
          .send("Descrição inválida para gerar nome de arquivo.");
      }

      // se não enviou arquivo, só salva os dados da marca (faça sua lógica aqui)
      if (!req.file) {
        // Exemplo: salvar descrição no banco (implemente conforme seu fluxo)
        // await db.saveMarca({ descricao: descricaoMarca, logo: null, ... });

        return res.redirect("/painel"); // ou onde for
      }

      // valida mimetype
      const allowed = ["image/jpeg", "image/jpg", "image/png"];
      if (!allowed.includes(req.file.mimetype)) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (e) {}
        return res
          .status(400)
          .send("Formato de arquivo não suportado. Envie JPG ou PNG.");
      }

      // caminhos finais
      const jpegFilename = `${slug}.jpg`;

      const pngFilename = `${slug}.png`;
      const jpegPath = path.join(uploadsDirMarca, jpegFilename);
      const pngPath = path.join(uploadsDirMarca, pngFilename);

      // converte com sharp: gera ambos JPG e PNG (substitui se já existirem)
      // ler do arquivo temporário salvo por multer
      await sharp(req.file.path).jpeg({ quality: 90 }).toFile(jpegPath);
      await sharp(req.file.path).png().toFile(pngPath);

      // remove arquivo temporário
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {
        /* ignore */
      }

      // aqui você integra a persistência (exemplo: gravar no banco o nome da logo)
      // await db.updateMarca({ descricao: descricaoMarca, logo_jpg: jpegFilename, logo_png: pngFilename, ... });

      return res.redirect("/painel");
    } catch (err) {
      console.error("Erro ao salvar marca/logo:", err);
      // cleanup de segurança
      if (req.file)
        try {
          fs.unlinkSync(req.file.path);
        } catch (e) {}
      return res.status(500).send("Erro ao processar marca e logo.");
    }
  }
);

// cache simples em memória
let cache = { data: null, expiresAt: 0 };
const CACHE_TTL_MS = 1000 * 60; // 1 minuto (ajuste conforme precisar)

const OWNER = "CaioRodrigoCEVDEV";
const REPO = "sistema_pedidos";

app.get("/api/releases", async (req, res) => {
  try {
    if (Date.now() < cache.expiresAt && cache.data) {
      return res.json({ ok: true, fromCache: true, releases: cache.data });
    }

    const token = process.env.GITHUB_TOKEN;
    const url = `https://api.github.com/repos/${OWNER}/${REPO}/releases`;
    const headers = token
      ? { Authorization: `token ${token}`, "User-Agent": "orderup" }
      : { "User-Agent": "orderup" };

    const resp = await fetch(url, { headers });
    if (!resp.ok) {
      const body = await resp.text();
      return res
        .status(resp.status)
        .json({ ok: false, status: resp.status, body });
    }

    const full = await resp.json();

    // filtre apenas os campos que o front realmente precisa (evita enviar dados desnecessários)
    const releases = full.map((r) => ({
      id: r.id,
      tag_name: r.tag_name,
      name: r.name,
      body: r.body,
      published_at: r.published_at,
    }));

    cache = { data: releases, expiresAt: Date.now() + CACHE_TTL_MS };

    res.json({ ok: true, fromCache: false, releases });
  } catch (err) {
    console.error("Erro /api/releases", err);
    res.status(500).json({ ok: false, error: "Erro interno" });
  }
});

// Inicia o servidor
(async () => {
  await atualizarDB();
  app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${process.env.BASE_URL}/index`);
  });
})();
