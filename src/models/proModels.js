const pool = require("../config/db");

async function listarTodosProdutos() {
  const result = await pool.query(`
        select distinct
        procod,
        prodes,
        marcasdes,
        (
          SELECT string_agg(m.moddes, ', ' ORDER BY m.moddes)
          FROM promod pm
          JOIN modelo m ON pm.promodmodcod = m.modcod
          WHERE pm.promodprocod = pro.procod
        ) as moddes,
        tipodes,
        coalesce(cornome, 'Sem Cor') as cordes,
        case when procorcorescod is null then proqtde else procorqtde end as qtde,
        procorcorescod
        from pro
        join marcas on marcascod = promarcascod 
        join tipo on tipocod = protipocod
        left join procor on procod = procorprocod
        left join cores on corcod = procorcorescod
        where prosit = 'A'`);
  return result.rows;
}

async function listarProdutosComEstoque() {
  const result = await pool.query(`
        select distinct
        procod,
        prodes,
        marcasdes,
        (
          SELECT string_agg(m.moddes, ', ' ORDER BY m.moddes)
          FROM promod pm
          JOIN modelo m ON pm.promodmodcod = m.modcod
          WHERE pm.promodprocod = pro.procod
        ) as moddes,
        tipodes,
        coalesce(cornome, 'Sem Cor') as cordes,
        case when procorcorescod is null then proqtde else procorqtde end as qtde,
        procorcorescod
        from pro
        join marcas on marcascod = promarcascod 
        join tipo on tipocod = protipocod
        left join procor on procod = procorprocod
        left join cores on corcod = procorcorescod
        where case when procorcorescod is null then proqtde else procorqtde end > 0
        and prosit = 'A'`);
  return result.rows;
}

async function listarProdutosSemEstoque() {
  const result = await pool.query(`
        select distinct
        procod,
        prodes,
        marcasdes,
        (
          SELECT string_agg(m.moddes, ', ' ORDER BY m.moddes)
          FROM promod pm
          JOIN modelo m ON pm.promodmodcod = m.modcod
          WHERE pm.promodprocod = pro.procod
        ) as moddes,
        tipodes,
        coalesce(cornome, 'Sem Cor') as cordes,
        case when procorcorescod is null then proqtde else procorqtde end as qtde,
        procorcorescod
        from pro
        join marcas on marcascod = promarcascod 
        join tipo on tipocod = protipocod
        left join procor on procod = procorprocod
        left join cores on corcod = procorcorescod
        where case when procorcorescod is null then proqtde else coalesce(procorqtde,0) end <= 0
        and prosit = 'A'`);
  return result.rows;
}

async function listarProdutosComEstoqueItem(marca, modelo) {
  const params = [];
  const filtros = [];

  // Aceita 'todos', 'todas', null, undefined ou ''
  const marcaValida =
    marca && !["todos", "todas"].includes(String(marca).toLowerCase());
  const modeloValido =
    modelo && !["todos", "todas"].includes(String(modelo).toLowerCase());

  if (marcaValida) {
    params.push(marca);
    filtros.push(`promarcascod = $${params.length}`);
  }
  if (modeloValido) {
    params.push(modelo);
    filtros.push(
      `(promodcod = $${params.length} OR EXISTS (SELECT 1 FROM promod WHERE promodprocod = pro.procod AND promodmodcod = $${params.length}))`
    );
  }

  const filtrosExtras = filtros.length ? ` and ${filtros.join(" and ")}` : "";

  const query = `
                select distinct
                        procod,
                        prodes,
                        marcasdes,
                        (
                          SELECT string_agg(m.moddes, ', ' ORDER BY m.moddes)
                          FROM promod pm
                          JOIN modelo m ON pm.promodmodcod = m.modcod
                          WHERE pm.promodprocod = pro.procod
                        ) as moddes,
                        tipodes,
                        coalesce(cornome, 'Sem Cor') as cordes,
                        case when procorcorescod is null then proqtde else procorqtde end as qtde,
                        procorcorescod
                from pro
                join marcas on marcascod = promarcascod 
                join tipo on tipocod = protipocod
                left join procor on procod = procorprocod
                left join cores on corcod = procorcorescod
                where case when procorcorescod is null then proqtde else procorqtde end > 0
                        and prosit = 'A'
                        ${filtrosExtras}
        `;
  const result = await pool.query(query, params);
  return result.rows;
}

async function listarProdutosSemEstoqueItem(marca, modelo) {
  const params = [];
  const filtros = [];

  const marcaValida =
    marca && !["todos", "todas"].includes(String(marca).toLowerCase());
  const modeloValido =
    modelo && !["todos", "todas"].includes(String(modelo).toLowerCase());

  if (marcaValida) {
    params.push(marca);
    filtros.push(`promarcascod = $${params.length}`);
  }
  if (modeloValido) {
    params.push(modelo);
    filtros.push(
      `(promodcod = $${params.length} OR EXISTS (SELECT 1 FROM promod WHERE promodprocod = pro.procod AND promodmodcod = $${params.length}))`
    );
  }

  const filtrosExtras = filtros.length ? ` and ${filtros.join(" and ")}` : "";

  const query = `
                select distinct
                        procod,
                        prodes,
                        marcasdes,
                        (
                          SELECT string_agg(m.moddes, ', ' ORDER BY m.moddes)
                          FROM promod pm
                          JOIN modelo m ON pm.promodmodcod = m.modcod
                          WHERE pm.promodprocod = pro.procod
                        ) as moddes,
                        tipodes,
                        coalesce(cornome, 'Sem Cor') as cordes,
                        case when procorcorescod is null then proqtde else coalesce(procorqtde,0) end as qtde,
                        procorcorescod
                from pro
                join marcas on marcascod = promarcascod 
                join tipo on tipocod = protipocod
                left join procor on procod = procorprocod
                left join cores on corcod = procorcorescod
                where case when procorcorescod is null then proqtde else coalesce(procorqtde,0) end <= 0
                        and prosit = 'A'
                        ${filtrosExtras}
        `;
  const result = await pool.query(query, params);
  return result.rows;
}

async function listarProdutosComEstoqueAcabando() {
  const result = await pool.query(`
        select distinct
        procod,
        prodes,
        marcasdes,
        (
          SELECT string_agg(m.moddes, ', ' ORDER BY m.moddes)
          FROM promod pm
          JOIN modelo m ON pm.promodmodcod = m.modcod
          WHERE pm.promodprocod = pro.procod
        ) as moddes,
        tipodes,
        coalesce(cornome, 'Sem Cor') as cordes,
        case when procorcorescod is null then proqtde else procorqtde end as qtde,
        procorcorescod
        from pro
        join marcas on marcascod = promarcascod 
        join tipo on tipocod = protipocod
        left join procor on procod = procorprocod
        left join cores on corcod = procorcorescod
        where case when procorcorescod is null then proqtde else procorqtde end = 5
        and prosit = 'A' or proacabando = 'S'`);
  return result.rows;
}

async function listarProdutosComEstoqueAcabandoItem(marca, modelo) {
  const params = [];
  const filtros = [];

  // Aceita 'todos', 'todas', null, undefined ou ''
  const marcaValida =
    marca && !["todos", "todas"].includes(String(marca).toLowerCase());
  const modeloValido =
    modelo && !["todos", "todas"].includes(String(modelo).toLowerCase());

  if (marcaValida) {
    params.push(marca);
    filtros.push(`promarcascod = $${params.length}`);
  }
  if (modeloValido) {
    params.push(modelo);
    filtros.push(
      `(promodcod = $${params.length} OR EXISTS (SELECT 1 FROM promod WHERE promodprocod = pro.procod AND promodmodcod = $${params.length}))`
    );
  }

  const filtrosExtras = filtros.length ? ` and ${filtros.join(" and ")}` : "";

  const query = `
                select distinct
                        procod,
                        prodes,
                        marcasdes,
                        (
                          SELECT string_agg(m.moddes, ', ' ORDER BY m.moddes)
                          FROM promod pm
                          JOIN modelo m ON pm.promodmodcod = m.modcod
                          WHERE pm.promodprocod = pro.procod
                        ) as moddes,
                        tipodes,
                        coalesce(cornome, 'Sem Cor') as cordes,
                        case when procorcorescod is null then proqtde else procorqtde end as qtde,
                        procorcorescod
                from pro
                join marcas on marcascod = promarcascod 
                join tipo on tipocod = protipocod
                left join procor on procod = procorprocod
                left join cores on corcod = procorcorescod
                where case when procorcorescod is null then proqtde else procorqtde end = 5
                        and prosit = 'A' or proacabando = 'S'
                        ${filtrosExtras}
        `;
  const result = await pool.query(query, params);
  return result.rows;
}

async function listarProdutosEmFalta() {
  const result = await pool.query(`
        select distinct
        procod,
        prodes,
        marcasdes,
        (
          SELECT string_agg(m.moddes, ', ' ORDER BY m.moddes)
          FROM promod pm
          JOIN modelo m ON pm.promodmodcod = m.modcod
          WHERE pm.promodprocod = pro.procod
        ) as moddes,
        tipodes,
        coalesce(cornome, 'Sem Cor') as cordes,
        case when procorcorescod is null then proqtde else procorqtde end as qtde,
        procorcorescod
        from pro
        join marcas on marcascod = promarcascod 
        join tipo on tipocod = protipocod
        left join procor on procod = procorprocod
        left join cores on corcod = procorcorescod
        where prosit = 'A' and prosemest = 'S'`);
  return result.rows;
}

async function listarProdutosEmFaltaItem(marca, modelo) {
  const params = [];
  const filtros = [];

  // Aceita 'todos', 'todas', null, undefined ou ''
  const marcaValida =
    marca && !["todos", "todas"].includes(String(marca).toLowerCase());
  const modeloValido =
    modelo && !["todos", "todas"].includes(String(modelo).toLowerCase());

  if (marcaValida) {
    params.push(marca);
    filtros.push(`promarcascod = $${params.length}`);
  }
  if (modeloValido) {
    params.push(modelo);
    filtros.push(
      `(promodcod = $${params.length} OR EXISTS (SELECT 1 FROM promod WHERE promodprocod = pro.procod AND promodmodcod = $${params.length}))`
    );
  }

  const filtrosExtras = filtros.length ? ` and ${filtros.join(" and ")}` : "";

  const query = `
                select distinct
                        procod,
                        prodes,
                        marcasdes,
                        (
                          SELECT string_agg(m.moddes, ', ' ORDER BY m.moddes)
                          FROM promod pm
                          JOIN modelo m ON pm.promodmodcod = m.modcod
                          WHERE pm.promodprocod = pro.procod
                        ) as moddes,
                        tipodes,
                        coalesce(cornome, 'Sem Cor') as cordes,
                        case when procorcorescod is null then proqtde else procorqtde end as qtde,
                        procorcorescod
                from pro
                join marcas on marcascod = promarcascod 
                join tipo on tipocod = protipocod
                left join procor on procod = procorprocod
                left join cores on corcod = procorcorescod
                where prosit = 'A' and prosemest = 'S'
                        ${filtrosExtras}
        `;
  const result = await pool.query(query, params);
  return result.rows;
}

module.exports = {
  listarTodosProdutos,
  listarProdutosComEstoque,
  listarProdutosSemEstoque,
  listarProdutosComEstoqueAcabando,
  listarProdutosComEstoqueItem,
  listarProdutosSemEstoqueItem,
  listarProdutosComEstoqueAcabandoItem,
  listarProdutosEmFalta,
  listarProdutosEmFaltaItem,
};
