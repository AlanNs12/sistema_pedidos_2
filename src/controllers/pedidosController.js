const pool = require("../config/db");
const partGroupModels = require("../models/partGroupModels");

exports.sequencia = async (req, res) => {
  try {
    const result = await pool.query("SELECT nextval('pv_seq')");
    res.status(200).json({ nextval: result.rows[0].nextval });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao gerar sequência" });
  }
};

/**
 * Middleware que valida e decrementa o estoque antes de criar o pedido.
 * 
 * Esta função implementa a sincronização de estoque entre grupos:
 * - Para peças sem grupo: decrementa apenas o estoque individual
 * - Para peças com grupo: sincroniza o estoque entre todas as peças do grupo
 * 
 * IMPORTANTE: O decremento ocorre ANTES do pedido ser criado, garantindo que:
 * - A validação de estoque é atômica (com locks FOR UPDATE)
 * - O WhatsApp só é enviado após o commit bem-sucedido
 * - Em caso de falha, nenhuma alteração é persistida
 */
exports.validarEDecrementarEstoque = async (req, res, next) => {
  const { cart, pvcod } = req.body;

  if (!Array.isArray(cart) || cart.length === 0) {
    return res.status(400).json({ error: "Carrinho vazio ou inválido" });
  }

  try {
    // Prepara a lista de itens para venda
    const itensParaVenda = [];
    for (const item of cart) {
      const procod = item.id;
      // O ID pode vir no formato "123-cor" ou apenas "123"
      const codigoInteiro = parseInt(String(procod).split("-")[0], 10);
      const quantidade = parseInt(item.qt, 10) || 1;

      // Valida que o ID da peça é um número válido
      if (isNaN(codigoInteiro) || codigoInteiro <= 0) {
        return res.status(400).json({
          error: `ID de peça inválido: ${procod}`,
          tipo: "item_invalido",
        });
      }

      itensParaVenda.push({
        partId: codigoInteiro,
        quantidade: quantidade,
      });
    }

    // Tenta decrementar o estoque de todos os itens em uma única transação
    const resultado = await partGroupModels.venderItens(
      itensParaVenda,
      pvcod ? String(pvcod) : null
    );

    // Armazena o resultado para uso posterior (opcional, para logging)
    req.estoqueResultado = resultado;

    console.log(
      `Estoque decrementado com sucesso para pedido ${pvcod}:`,
      resultado.itensProcessados.length,
      "itens processados"
    );

    // Continua para a criação do pedido
    next();
  } catch (error) {
    console.error("Erro ao validar/decrementar estoque:", error);

    // Retorna erro amigável para o frontend
    const mensagemErro = error.message.includes("insuficiente")
      ? error.message
      : "Erro ao processar estoque. Por favor, tente novamente.";

    return res.status(400).json({
      error: mensagemErro,
      tipo: "estoque_insuficiente",
    });
  }
};

exports.inserirPv = async (req, res, next) => {
  const { pvcod, total, obs, canal, status, confirmado, codigoVendedor } =
    req.body;

  try {
    const result = await pool.query(
      "INSERT INTO pv (pvcod, pvvl, pvobs, pvcanal, pvsta, pvconfirmado, pvrcacod) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
      [pvcod, total, obs, canal, status, confirmado, codigoVendedor]
    );

    // guarda o pvcod e o total para o próximo passo
    req.pvcod = pvcod;
    req.cart = req.body.cart;

    next(); // 👈 vai para inserirPvi
  } catch (error) {
    console.error("Erro ao inserir pedido:", error);
    res.status(500).json({ error: "Erro ao criar pedido" });
  }
};

exports.inserirPvi = async (req, res) => {
  const { pvcod, cart } = req.body;

  if (!Array.isArray(cart) || cart.length === 0) {
    return res.status(400).json({ error: "Carrinho vazio ou inválido" });
  }

  try {
    // Prepara arrays para INSERT em lote via unnest (elimina N+1)
    const pvcods      = [];
    const procods     = [];
    const qtdes       = [];
    const precos      = [];
    const procorids   = [];

    for (const item of cart) {
      const { id: procod, qt, preco, idCorSelecionada } = item;
      const codigoInteiro = parseInt(String(procod).split("-")[0], 10);
      if (isNaN(codigoInteiro) || codigoInteiro <= 0) {
        return res.status(400).json({ error: `Código de produto inválido: ${procod}` });
      }
      pvcods.push(pvcod);
      procods.push(codigoInteiro);
      qtdes.push(qt);
      precos.push(preco);
      const raw = idCorSelecionada;
      const normalized = (raw === null || raw === undefined || raw === "") ? null : Number(raw);
      procorids.push(Number.isFinite(normalized) ? normalized : null);
    }

    const result = await pool.query(
      `INSERT INTO pvi (pvipvcod, pviprocod, pviqtde, pvivl, pviprocorid)
       SELECT * FROM unnest(
         $1::int[], $2::int[], $3::numeric[], $4::numeric[], $5::int[]
       ) AS t(pvipvcod, pviprocod, pviqtde, pvivl, pviprocorid)
       RETURNING *`,
      [pvcods, procods, qtdes, precos, procorids]
    );

    res.status(200).json({
      message: "Pedido e itens inseridos com sucesso!",
      pvcod,
      itens: result.rows,
    });
  } catch (error) {
    console.error("Erro ao inserir itens:", error);
    res.status(500).json({ error: "Erro ao inserir itens do pedido" });
  }
};

exports.listarPv = async (req, res) => {
  const usucod = req.token.usucod;
  try {
    const result = await pool.query(
      `       
        select 
            pvcod,
            pvvl,
            pvobs,
            pvcanal,
            pvconfirmado,
            pvsta,
            pvipvcod,
            pvrcacod,
            sum(pvivl) as pvvltotal,
            usunome
            from pv 
            left join pvi on pvipvcod = pvcod
            left join usu on usucod = pvrcacod
            where pvconfirmado = 'N' 
            and (pvrcacod = $1 or pvrcacod is null )
            and pvsta = 'A' 
            and pviprocod is not null 
            group by 
            pvcod,
            pvvl,
            pvobs,
            pvcanal,
            pvconfirmado,
            pvsta,
            pvipvcod,
            usunome
            order by pvcod desc`,
      [usucod]
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro buscar pedidos" });
  }
};

exports.listarPvPendentesCount = async (req, res) => {
  try {
    const result = await pool.query(
      "select count(*) from pv where pvconfirmado = 'N' and pvsta = 'A' "
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro buscar pedidos" });
  }
};

exports.listarPvPendentesCountNow = async (req, res) => {
  try {
    const result = await pool.query(
      "select count(*) from pv where pvconfirmado = 'N' and pvsta = 'A' and pvdtcad = 'now()'"
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro buscar pedidos hoje" });
  }
};

exports.listarPvBalcao = async (req, res) => {
  try {
    const result = await pool.query(
      "select count(*) from pv where pvcanal = 'BALCAO' and pvsta = 'A' "
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro buscar pedidos" });
  }
};

exports.listarPvEntregaNow = async (req, res) => {
  try {
    const result = await pool.query(
      "select count(*) from pv where pvcanal = 'ENTREGA' and pvsta = 'A' and pvdtcad = 'now()'"
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro buscar pedidos" });
  }
};


exports.listarPvBalcaoNow = async (req, res) => {
  try {
    const result = await pool.query(
      "select count(*) from pv where pvcanal = 'BALCAO' and pvsta = 'A' and pvdtcad = 'now()'"
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro buscar pedidos" });
  }
};

exports.listarPvEntrega = async (req, res) => {
  try {
    const result = await pool.query(
      "select count(*) from pv where pvcanal = 'ENTREGA' and pvsta = 'A' "
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro buscar pedidos" });
  }
};

exports.listarTotalPvConfirmados = async (req, res) => {
  try {
    const result = await pool.query(
      "select count(*) from pv where pvconfirmado = 'S' and pvsta = 'A' "
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro buscar pedidos" });
  }
};

exports.listarTotalPvConfirmadosNow = async (req, res) => {
  try {
    const result = await pool.query(
      "select count(*) from pv where pvconfirmado = 'S' and pvsta = 'A' and pvdtcad = 'now()'"
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro buscar pedidos" });
  }
};

exports.listarPvConfirmados = async (req, res) => {
  const usucod = req.token.usucod;
  const usuadm = req.token.usuadm;
  let { dataInicio, dataFim } = req.query || {};

  if (!dataInicio) dataInicio = "1900-01-01";
  if (!dataFim) dataFim = "2999-12-31";

  try {
    const result = await pool.query(
      ` SELECT 
        pv.pvcod,
        pv.pvvl,
        pv.pvobs,
        pv.pvcanal,
        pv.pvconfirmado,
        pv.pvsta,
        pvipvcod,
        pv.pvrcacod,
        SUM(pvi.pvivl) AS pvvltotal,
        usu.usunome
    FROM pv
    LEFT JOIN pvi ON pvipvcod = pvcod
    LEFT JOIN usu ON usu.usucod = pv.pvrcacod
    WHERE pv.pvconfirmado = 'S'
    AND (
          -- se for admin, vê tudo
          ($1 = 'S')
          -- caso contrário, só vê registros do usuário ou NULL
          OR (pv.pvrcacod = $2 OR pv.pvrcacod IS NULL)
        )
    AND pv.pvsta = 'A'
    AND pviprocod IS NOT NULL
    AND pv.pvdtcad BETWEEN $3 AND $4
    GROUP BY 
    pv.pvcod,
    pv.pvvl,
    pv.pvobs,
    pv.pvcanal,
    pv.pvconfirmado,
    pv.pvsta,
    pvipvcod,
    pv.pvrcacod,
    usu.usunome
    ORDER BY pv.pvcod DESC;
      
        `,
      [usuadm, usucod, dataInicio, dataFim]
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro buscar pedidos" });
  }
};

exports.listarPvPendentes = async (req, res) => {
  const usucod = req.token.usucod;
  const usuadm = req.token.usuadm;
  let { dataInicio, dataFim } = req.query || {};

  if (!dataInicio) dataInicio = "1900-01-01";
  if (!dataFim) dataFim = "2999-12-31";

  try {
    const result = await pool.query(
      ` SELECT 
        pv.pvcod,
        pv.pvvl,
        pv.pvobs,
        pv.pvcanal,
        pv.pvconfirmado,
        pv.pvsta,
        pvipvcod,
        pv.pvrcacod,
        SUM(pvi.pvivl) AS pvvltotal,
        usu.usunome
    FROM pv
    LEFT JOIN pvi ON pvipvcod = pvcod
    LEFT JOIN usu ON usu.usucod = pv.pvrcacod
    WHERE pv.pvconfirmado = 'N'
    AND (
          -- se for admin, vê tudo
          ($1 = 'S')
          -- caso contrário, só vê registros do usuário ou NULL
          OR (pv.pvrcacod = $2 OR pv.pvrcacod IS NULL)
        )
    AND pv.pvsta = 'A'
    AND pviprocod IS NOT NULL
    AND pv.pvdtcad BETWEEN $3 AND $4
    GROUP BY 
    pv.pvcod,
    pv.pvvl,
    pv.pvobs,
    pv.pvcanal,
    pv.pvconfirmado,
    pv.pvsta,
    pvipvcod,
    pv.pvrcacod,
    usu.usunome
    ORDER BY pv.pvcod DESC;
      
        `,
      [usuadm, usucod, dataInicio, dataFim]
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro buscar pedidos" });
  }
};

exports.confirmarPedido = async (req, res) => {
  const pvcod = req.params.pvcod;

  console.log(pvcod);

  try {
    // Check if the order is already confirmed to prevent re-confirmation
    // and avoid triggering the stock deduction again
    const checkResult = await pool.query(
      "SELECT pvconfirmado FROM pv WHERE pvcod = $1",
      [pvcod]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: "Pedido não encontrado." });
    }

    if (checkResult.rows[0].pvconfirmado === 'S') {
      // Order already confirmed - return success without modifying
      return res.status(200).json({ 
        message: "Pedido já confirmado.",
        alreadyConfirmed: true 
      });
    }

    const result = await pool.query(
      "UPDATE pv SET pvconfirmado = 'S', pvrcacod = $2 WHERE pvcod = $1 AND pvconfirmado = 'N' RETURNING *",
      [pvcod, req.body.pvrcacod]
    );
    
    if (result.rows.length === 0) {
      return res.status(200).json({ 
        message: "Pedido já confirmado.",
        alreadyConfirmed: true 
      });
    }
    
    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "erro ao confirmar pedido" });
  }
};

exports.cancelarPedido = async (req, res) => {
  const pvcod = req.params.pvcod;

  console.log(pvcod);

  try {
    const result = await pool.query(
      "update pv set pvsta = 'X' where pvcod = $1 RETURNING *",
      [pvcod]
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "erro ao cancelar pedido" });
  }
};

exports.listarPedidosPendentesDetalhe = async (req, res) => {
  const pvcod = req.params.pvcod;

  try {
    const result = await pool.query(
      `select 
       pvcod,
       prodes,
       pvvl,
       pviprocod,
       pvivl,
       pviqtde,
       pvobs,
       pvi.pviprocorid,
       COALESCE(c.cornome, 'Sem Cor') as cornome
       from pv
       join pvi on pvipvcod = pvcod
       join pro on procod = pviprocod
       left join cores c on c.corcod = pvi.pviprocorid
       where pvcod = $1 and pvsta = 'A'`,
      [pvcod]
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro buscar pedidos pendentes" });
  }
};

exports.cancelarItemPv = async (req, res) => {
  const { procod, pviprocorid } = req.body;
  const pvcod = req.params.pvcod;

  try {
    let result;
    if (pviprocorid !== null && pviprocorid !== undefined) {
      result = await pool.query(
        "update pvi set pviqtde = 0 where pviprocod = $1 and pvipvcod = $2 and pviprocorid = $3 RETURNING *",
        [procod, pvcod, pviprocorid]
      );
    } else {
      result = await pool.query(
        "update pvi set pviqtde = 0 where pviprocod = $1 and pvipvcod = $2 and pviprocorid IS NULL RETURNING *",
        [procod, pvcod]
      );
    }
    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "erro ao cancelar pedido" });
  }
};

exports.confirmarItemPv = async (req, res) => {
  const { procod, pviqtde, pviprocorid } = req.body;
  const pvcod = req.params.pvcod;

  console.log({ procod, pviqtde, pvcod, pviprocorid });

  try {
    let result;
    if (pviprocorid !== null && pviprocorid !== undefined) {
      result = await pool.query(
        "update pvi set pviqtde = $1 where pviprocod = $2 and pvipvcod = $3 and pviprocorid = $4 RETURNING *",
        [pviqtde, procod, pvcod, pviprocorid]
      );
    } else {
      result = await pool.query(
        "update pvi set pviqtde = $1 where pviprocod = $2 and pvipvcod = $3 and pviprocorid IS NULL RETURNING *",
        [pviqtde, procod, pvcod]
      );
    }
    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "erro ao confirmar itens pedidos pedido" });
  }
};

/**
 * Edita itens de um pedido já aprovado, ajustando o estoque conforme a diferença de quantidade.
 * Aceita body: { itens: [{ procod, pviqtde, pviprocorid? }] }
 *
 * Regras de estoque:
 * - Item com cor (pviprocorid): ajusta procor.procorqtde
 * - Item sem cor: ajusta pro.proqtde
 */
exports.editarItensPedidoConfirmado = async (req, res) => {
  const pvcod = req.params.pvcod;
  const { itens } = req.body;

  if (!Array.isArray(itens) || itens.length === 0) {
    return res.status(400).json({ error: "Lista de itens é obrigatória" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Verifica se o pedido existe e está aprovado (aceita bpchar com espaços)
    const pedidoResult = await client.query(
      "SELECT pvconfirmado, pvsta FROM pv WHERE pvcod = $1",
      [pvcod]
    );

    if (pedidoResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Pedido não encontrado" });
    }

    const pedido = pedidoResult.rows[0];
    const pvsta = String(pedido.pvsta || "").trim();
    const pvconfirmado = String(pedido.pvconfirmado || "").trim();
    console.log("Pedido encontrado para edição:", pedido);

    if (pvconfirmado !== "S" || pvsta !== "A") {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Pedido deve estar aprovado e confirmado para ser editado" });
    }

    const resultadoItens = [];

    for (const item of itens) {
      const { procod, pviqtde } = item;
      // Normaliza pviprocorid: null/undefined/""/0/"0"/"null" → null
      const rawCor = item.pviprocorid;
      const pviprocorid = (rawCor === null || rawCor === undefined || rawCor === "" || rawCor === 0 || rawCor === "0" || rawCor === "null")
        ? null
        : Number(rawCor);
      const novaQtde = Number(pviqtde);

      if (isNaN(novaQtde) || novaQtde < 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: `Quantidade inválida para procod ${procod}` });
      }

      // Busca a quantidade atual do item no pedido identificando também pela cor
      let itemAtual;
      if (pviprocorid !== null) {
        itemAtual = await client.query(
          "SELECT pviqtde FROM pvi WHERE pviprocod = $1 AND pvipvcod = $2 AND pviprocorid = $3",
          [procod, pvcod, pviprocorid]
        );
      } else {
        itemAtual = await client.query(
          "SELECT pviqtde FROM pvi WHERE pviprocod = $1 AND pvipvcod = $2 AND pviprocorid IS NULL",
          [procod, pvcod]
        );
      }

      if (itemAtual.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: `Item procod ${procod} não encontrado no pedido` });
      }

      const qtdeAnterior = Number(itemAtual.rows[0].pviqtde);
      const delta = novaQtde - qtdeAnterior;

      // Ajusta o estoque: delta > 0 deduz mais; delta < 0 devolve
      if (delta !== 0) {
        if (pviprocorid !== null) {
          // Item com cor: opera em procor.procorqtde
          const estoqueResult = await client.query(
            "SELECT COALESCE(procorqtde, 0) AS procorqtde FROM procor WHERE procorprocod = $1 AND procorcorescod = $2 FOR UPDATE",
            [procod, pviprocorid]
          );
          if (estoqueResult.rows.length === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({ error: `Cor ${pviprocorid} não encontrada para a peça ${procod}` });
          }
          if (delta > 0) {
            const estoqueAtual = Number(estoqueResult.rows[0].procorqtde);
            if (estoqueAtual < delta) {
              await client.query("ROLLBACK");
              return res.status(400).json({
                error: `Estoque insuficiente para a peça ${procod} cor ${pviprocorid}. Disponível: ${estoqueAtual}`,
                tipo: "estoque_insuficiente"
              });
            }
          }
          await client.query(
            "UPDATE procor SET procorqtde = COALESCE(procorqtde, 0) - $1 WHERE procorprocod = $2 AND procorcorescod = $3",
            [delta, procod, pviprocorid]
          );
        } else {
          // Item sem cor: opera em pro.proqtde
          const estoqueResult = await client.query(
            "SELECT COALESCE(proqtde, 0) AS proqtde FROM pro WHERE procod = $1 FOR UPDATE",
            [procod]
          );
          if (delta > 0) {
            const estoqueAtual = Number(estoqueResult.rows[0]?.proqtde ?? 0);
            if (estoqueAtual < delta) {
              await client.query("ROLLBACK");
              return res.status(400).json({
                error: `Estoque insuficiente para a peça ${procod}. Disponível: ${estoqueAtual}`,
                tipo: "estoque_insuficiente"
              });
            }
          }
          await client.query(
            "UPDATE pro SET proqtde = COALESCE(proqtde, 0) - $1 WHERE procod = $2",
            [delta, procod]
          );
        }
      }

      // Atualiza a quantidade no pedido usando a mesma chave (com/sem cor)
      let updateResult;
      if (pviprocorid !== null) {
        updateResult = await client.query(
          "UPDATE pvi SET pviqtde = $1 WHERE pviprocod = $2 AND pvipvcod = $3 AND pviprocorid = $4 RETURNING *",
          [novaQtde, procod, pvcod, pviprocorid]
        );
      } else {
        updateResult = await client.query(
          "UPDATE pvi SET pviqtde = $1 WHERE pviprocod = $2 AND pvipvcod = $3 AND pviprocorid IS NULL RETURNING *",
          [novaQtde, procod, pvcod]
        );
      }

      resultadoItens.push(updateResult.rows[0]);
    }

    await client.query("COMMIT");
    res.status(200).json({ message: "Pedido editado com sucesso", itens: resultadoItens });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Erro ao editar pedido confirmado:", error);
    res.status(500).json({ error: "Erro ao editar pedido" });
  } finally {
    client.release();
  }
};
